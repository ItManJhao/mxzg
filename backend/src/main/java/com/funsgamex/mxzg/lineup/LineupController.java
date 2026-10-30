package com.funsgamex.mxzg.lineup;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/lineups/main")
public class LineupController {
    private final LineupService lineups;
    public LineupController(LineupService lineups) { this.lineups = lineups; }
    @GetMapping
    public Lineup current(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return lineups.current(authorization);
    }
    @PutMapping
    public Lineup save(@RequestHeader(value = "Authorization", required = false) String authorization,
        @RequestBody Lineup.Save request) {
        return lineups.save(authorization, request);
    }
}
