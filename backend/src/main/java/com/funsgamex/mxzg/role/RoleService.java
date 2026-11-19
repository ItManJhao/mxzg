/**
 * 角色资料读取与首次命名事务，由已鉴权的连接调用。
 * 昵称及命名状态进入同一角色版本，在提交后由统一快照下发。
 */
package com.funsgamex.mxzg.role;

import com.funsgamex.mxzg.auth.SessionService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoleService {
    /** 用当前会话绑定角色，客户端不得指定要命名的角色。 */
    private final SessionService sessions;
    /** 统一读取角色及在角色锁内持久化首次命名。 */
    private final RoleRepository roles;
    /** 读取名称格式与随机名配置。 */
    private final RoleNameRules names;

    /** 注入现有账号、角色仓库及服务端命名配置。 */
    RoleService(SessionService sessions, RoleRepository roles, RoleNameRules names) {
        this.sessions = sessions;
        this.roles = roles;
        this.names = names;
    }

    /** 查询当前鉴权角色资料，角色已不存在时由连接结束会话。 */
    public RoleProfile current(String authorization) {
        String id = sessions.requireRole(authorization);
        return roles.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Role no longer exists"));
    }

    /** 为尚待命名的角色提供一个服务器校验过的候选，不占用名字。 */
    public String randomName(String authorization) {
        var role = current(authorization);
        if (role.firstNamed()) {
            throw rejected("ROLE_NAME_ALREADY_CONFIRMED");
        }
        for (int attempt = 0; attempt < 100; attempt++) {
            var name = names.validate(names.randomCandidate());
            if (name.isPresent() && !roles.hasNickname(role.serverId(), name.get())) {
                return name.get();
            }
        }
        throw rejected("ROLE_NAME_UNAVAILABLE");
    }

    /** 只接受首次命名，同名重试直接确认，其他提交由事务和唯一索引保证同服无新重名。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void setName(String authorization, String input) {
        String id = sessions.requireRole(authorization);
        roles.lock(id);
        var role = current(authorization);
        if (!id.equals(role.id())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        String nickname = names.validate(input).orElseThrow(() -> rejected("ROLE_NAME_INVALID"));
        if (role.firstNamed()) {
            if (!nickname.equals(role.nickname())) {
                throw rejected("ROLE_NAME_ALREADY_CONFIRMED");
            }
            return;
        }
        if (roles.hasNickname(role.serverId(), nickname)) {
            throw rejected("ROLE_NAME_EXISTS");
        }
        try {
            roles.setFirstName(id, nickname);
        } catch (DuplicateKeyException conflict) {
            throw rejected("ROLE_NAME_EXISTS");
        }
    }

    /** 仅交付定义过的业务拒绝码，原昵称和 DB 异常不进入回包。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
}
