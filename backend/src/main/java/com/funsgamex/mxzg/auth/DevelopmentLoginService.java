/** 开发身份服务：按旧初始化配置创建角色，显式登录记录服务器时间并签发会话；正式渠道仍未开放。 */
package com.funsgamex.mxzg.auth;

import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.server.ServerCatalog;
import java.util.Locale;
import org.springframework.context.ApplicationEventPublisher;
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
    /** 显式登录完成后刷新本角色自然日任务。 */
    private final ApplicationEventPublisher events;

    /** 装配开发账号的角色、会话和显式登录事务通知。 */
    public DevelopmentLoginService(RoleRepository roles, SessionService sessions, ServerCatalog servers,
                                   ApplicationEventPublisher events) {
        this.roles = roles;
        this.sessions = sessions;
        this.servers = servers;
        this.events = events;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LoginResult login(String rawAccount) {
        return login(rawAccount, null);
    }

    /** 校验账号及区服，在角色锁事务内记录登录、建立会话并刷新每日登录任务。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LoginResult login(String rawAccount, String serverId) {
        String account = rawAccount == null ? "" : rawAccount.trim().toLowerCase(Locale.ROOT);
        if (!account.matches("[a-z0-9_-]{3,32}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account must have 3-32 letters, digits, underscores or hyphens");
        }
        String selected = servers.require(serverId);
        RoleProfile role = roles.findByAccount(account, selected).orElseGet(() -> createOrFind(account, selected));
        roles.lock(role.id());
        roles.recordLogin(role.id(), java.time.Instant.now().getEpochSecond());
        var session = sessions.issue(role.id());
        events.publishEvent(new QuestProgressEvent(role.id(), QuestMetric.LOGIN, 0, 1));
        return new LoginResult(session, roles.findById(role.id()).orElseThrow());
    }

    private RoleProfile createOrFind(String account, String serverId) {
        try { return roles.create(account, serverId); }
        catch (DuplicateKeyException conflict) { return roles.findByAccount(account, serverId).orElseThrow(() -> conflict); }
    }
}
