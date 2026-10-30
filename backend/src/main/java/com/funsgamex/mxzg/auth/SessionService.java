package com.funsgamex.mxzg.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessionService {
    public record IssuedSession(String accessToken, Instant expiresAt) {}
    private final JdbcTemplate jdbc;
    private final SecureRandom random = new SecureRandom();

    public SessionService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public IssuedSession issue(String roleId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = Instant.now().plusSeconds(3600);
        jdbc.update("INSERT INTO game_session(token_hash, role_id, expires_at) VALUES (?, ?, ?)",
            hash(token), roleId, Timestamp.from(expiresAt));
        return new IssuedSession(token, expiresAt);
    }

    public String requireRole(String authorization) {
        if (authorization == null || !authorization.matches("Bearer [A-Za-z0-9_-]{43}")) throw unauthorized();
        return jdbc.query("SELECT role_id FROM game_session WHERE token_hash = ? AND expires_at > ?",
            (row, index) -> row.getString("role_id"), hash(authorization.substring(7)), Timestamp.from(Instant.now()))
            .stream().findFirst().orElseThrow(SessionService::unauthorized);
    }

    private static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session missing, expired or invalid");
    }

    private static String hash(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }
}
