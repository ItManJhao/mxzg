package com.funsgamex.mxzg.role;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {
    private final RoleService roles;
    public RoleController(RoleService roles) { this.roles = roles; }

    @GetMapping("/me")
    public RoleProfile current(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return roles.current(authorization);
    }
}
