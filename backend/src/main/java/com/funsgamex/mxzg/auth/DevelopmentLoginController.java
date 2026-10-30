package com.funsgamex.mxzg.auth;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/development")
@Profile("local & !production")
public class DevelopmentLoginController {
    public record LoginRequest(String account, String serverId) {}
    private final DevelopmentLoginService login;
    public DevelopmentLoginController(DevelopmentLoginService login) { this.login = login; }

    @PostMapping("/login")
    public DevelopmentLoginService.LoginResult login(@RequestBody LoginRequest request) {
        return login.login(request.account(), request.serverId());
    }
}
