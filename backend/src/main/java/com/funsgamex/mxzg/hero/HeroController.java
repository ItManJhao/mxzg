package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/heroes")
public class HeroController {
    private final SessionService sessions;
    private final HeroRepository heroes;
    public HeroController(SessionService sessions, HeroRepository heroes) {
        this.sessions = sessions; this.heroes = heroes;
    }
    @GetMapping
    public List<HeroProfile> list(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return heroes.list(sessions.requireRole(authorization));
    }
    @GetMapping("/{heroId}")
    public HeroProfile detail(@RequestHeader(value = "Authorization", required = false) String authorization,
        @PathVariable String heroId) {
        return heroes.find(sessions.requireRole(authorization), heroId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hero not found"));
    }
}
