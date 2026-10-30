package com.funsgamex.mxzg.lineup;

import java.util.List;

public record Lineup(long version, List<Slot> slots) {
    public record Slot(Integer position, String heroId) {}
    public record Save(Long expectedVersion, List<Slot> slots) {}
    public Lineup { slots = List.copyOf(slots); }
}
