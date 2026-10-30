package com.funsgamex.mxzg.inventory;

import com.funsgamex.mxzg.auth.SessionService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final SessionService sessions;
    private final InventoryService inventory;
    public InventoryController(SessionService sessions, InventoryService inventory) { this.sessions=sessions; this.inventory=inventory; }
    @GetMapping public List<InventoryService.Item> list(@RequestHeader(value="Authorization",required=false) String token) {
        return inventory.list(sessions.requireRole(token));
    }
}
