/** 访问令牌的签发、校验与撤销；HTTP 和长连接共享持久化会话，数据库只保存令牌摘要。 */
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

    /** 注入唯一会话存储，不在进程内复制有效令牌列表。 */
    public SessionService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** 签发一小时令牌；连接接管时再撤销该角色的其他令牌。 */
    public IssuedSession issue(String roleId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = Instant.now().plusSeconds(3600);
        jdbc.update("INSERT INTO game_session(token_hash, role_id, expires_at) VALUES (?, ?, ?)",
            hash(token), roleId, Timestamp.from(expiresAt));
        return new IssuedSession(token, expiresAt);
    }

    /** 校验 Bearer 格式、持久记录和有效期，失败统一拒绝。 */
    public String requireRole(String authorization) {
        if (authorization == null || !authorization.matches("Bearer [A-Za-z0-9_-]{43}")) throw unauthorized();
        return jdbc.query("SELECT role_id FROM game_session WHERE token_hash = ? AND expires_at > ?",
            (row, index) -> row.getString("role_id"), hash(authorization.substring(7)), Timestamp.from(Instant.now()))
            .stream().findFirst().orElseThrow(SessionService::unauthorized);
    }

    /** 调用者须在事务中持有角色锁；仅保留已再次鉴权的接管令牌，旧令牌不可抢回连接。 */
    public void revokeOthers(String roleId, String authorization) {
        if (!roleId.equals(requireRole(authorization))) throw unauthorized();
        jdbc.update("DELETE FROM game_session WHERE role_id=? AND token_hash<>?", roleId, hash(authorization.substring(7)));
    }

    /** 返回不暴露令牌是否存在的统一身份错误。 */
    private static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session missing, expired or invalid");
    }

    /** 将令牌转换成不可逆查询键，不记录原始凭证。 */
    private static String hash(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }
}
