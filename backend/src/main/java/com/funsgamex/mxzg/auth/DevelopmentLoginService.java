package com.funsgamex.mxzg.auth;

import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.server.ServerCatalog;
import java.util.Locale;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.server.ResponseStatusException;

/** Explicit local-only identity provider, to be replaced by verified channel credentials. */
@Service
@Profile("local & !production")
public class DevelopmentLoginService {
    public record LoginResult(SessionService.IssuedSession session, RoleProfile role) {}
    private final RoleRepository roles;
    private final SessionService sessions;
    private final ServerCatalog servers;

    public DevelopmentLoginService(RoleRepository roles, SessionService sessions, ServerCatalog servers) {
        this.roles = roles;
        this.sessions = sessions;
        this.servers = servers;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LoginResult login(String rawAccount) {
        return login(rawAccount, null);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LoginResult login(String rawAccount, String serverId) {
        String account = rawAccount == null ? "" : rawAccount.trim().toLowerCase(Locale.ROOT);
        if (!account.matches("[a-z0-9_-]{3,32}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account must have 3-32 letters, digits, underscores or hyphens");
        }
        String selected = servers.require(serverId);
        RoleProfile role = roles.findByAccount(account, selected).orElseGet(() -> createOrFind(account, selected));
        return new LoginResult(sessions.issue(role.id()), role);
    }

    private RoleProfile createOrFind(String account, String serverId) {
        try { return roles.create(account, serverId); }
        catch (DuplicateKeyException conflict) { return roles.findByAccount(account, serverId).orElseThrow(() -> conflict); }
    }
}
