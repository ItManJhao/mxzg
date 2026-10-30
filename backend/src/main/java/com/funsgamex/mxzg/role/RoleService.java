package com.funsgamex.mxzg.role;

import com.funsgamex.mxzg.auth.SessionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoleService {
    private final SessionService sessions;
    private final RoleRepository roles;
    public RoleService(SessionService sessions, RoleRepository roles) {
        this.sessions = sessions;
        this.roles = roles;
    }

    public RoleProfile current(String authorization) {
        String id = sessions.requireRole(authorization);
        return roles.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Role no longer exists"));
    }
}
