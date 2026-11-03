/** 英雄领域查询，保留归属校验供后续重做；当前不发布任何网络端点。 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@org.springframework.stereotype.Service
public class HeroQueries {
    private final SessionService sessions;
    private final HeroRepository heroes;
    public HeroQueries(SessionService sessions, HeroRepository heroes) {
        this.sessions = sessions; this.heroes = heroes;
    }
    public List<HeroProfile> list(String authorization) {
        return heroes.list(sessions.requireRole(authorization));
    }
    public HeroProfile detail(String authorization,
        String heroId) {
        return heroes.find(sessions.requireRole(authorization), heroId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hero not found"));
    }
}
