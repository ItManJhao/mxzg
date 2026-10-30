package com.funsgamex.mxzg.lineup;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LineupService {
    // Current main-formation UI positions. Other modes/formation policies are not enabled.
    public static final Set<Integer> POSITIONS = Set.of(2, 3, 5, 6, 7, 8, 9);
    private final SessionService sessions;
    private final HeroRepository heroes;
    private final LineupRepository lineups;
    public LineupService(SessionService sessions, HeroRepository heroes, LineupRepository lineups) {
        this.sessions = sessions; this.heroes = heroes; this.lineups = lineups;
    }
    public Lineup current(String authorization) { return lineups.read(sessions.requireRole(authorization)); }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Lineup save(String authorization, Lineup.Save request) {
        String roleId = sessions.requireRole(authorization);
        if (request == null || request.expectedVersion() == null || request.expectedVersion() < 0 ||
            request.slots() == null || request.slots().size() > POSITIONS.size()) throw invalid();
        var positions = new HashSet<Integer>(); var ids = new HashSet<String>();
        for (var slot : request.slots()) {
            if (slot == null || slot.position() == null || !POSITIONS.contains(slot.position()) ||
                slot.heroId() == null || !slot.heroId().matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}") ||
                !positions.add(slot.position()) || !ids.add(slot.heroId())) throw invalid();
        }
        long version = lineups.lockVersion(roleId);
        if (version != request.expectedVersion()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Lineup version changed; reload before saving");
        for (var slot : request.slots()) {
            if (heroes.find(roleId, slot.heroId()).isEmpty()) throw invalid();
        }
        var slots = request.slots().stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
        var current = lineups.read(roleId);
        if (current.slots().equals(slots)) return current;
        lineups.replace(roleId, slots);
        return lineups.read(roleId);
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or unowned lineup slots");
    }
}
