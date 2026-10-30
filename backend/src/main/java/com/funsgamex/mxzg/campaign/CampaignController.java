package com.funsgamex.mxzg.campaign;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/campaign")
public class CampaignController {
    public record Challenge(String requestId) {}
    private final CampaignService campaign;
    public CampaignController(CampaignService campaign) { this.campaign=campaign; }
    @GetMapping public CampaignService.State current(@RequestHeader(value="Authorization",required=false) String token) { return campaign.current(token); }
    @PostMapping("/initialize") public CampaignService.State initialize(@RequestHeader(value="Authorization",required=false) String token) { return campaign.initialize(token); }
    @PostMapping("/battles") public CampaignBattle.Report challenge(@RequestHeader(value="Authorization",required=false) String token,@RequestBody Challenge request) {
        return campaign.challenge(token,request.requestId());
    }
    @PostMapping("/battles/{id}/claim") public CampaignService.Settlement claim(@RequestHeader(value="Authorization",required=false) String token,@PathVariable String id) {
        return campaign.claim(token,id);
    }
}
