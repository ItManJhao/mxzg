package com.funsgamex.mxzg.campaign;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Pure deterministic combat. Clients replay these events; clients cannot submit a verdict. */
public final class CampaignBattle {
    public record Unit(String id, boolean ally, int position, int templateId, String name, int level,
        int maxHp, int attack, int defense, int speed) {}
    public record Hit(int round, String attackerId, String targetId, int damage, int remainingHp) {}
    public record Report(String id, String rulesVersion, int stageId, boolean won, List<Unit> units,
        List<Hit> hits, List<CampaignRules.Reward> rewards, boolean claimed) {
        public Report claimed(boolean value) { return new Report(id,rulesVersion,stageId,won,units,hits,rewards,value); }
    }
    private static final class Fighter {
        final Unit unit; int hp;
        Fighter(Unit unit) { this.unit=unit; this.hp=unit.maxHp(); }
    }
    private CampaignBattle() {}
    public static Report resolve(String id, String version, int stage, List<Unit> units, List<CampaignRules.Reward> rewards) {
        var fighters=units.stream().map(Fighter::new).sorted(Comparator
            .comparingInt((Fighter fighter)->fighter.unit.speed()).reversed()
            .thenComparing(fighter->fighter.unit.id())).toList();
        var hits=new ArrayList<Hit>();
        for(int round=1;round<=15;round++) {
            for(var attacker:fighters) {
                if(attacker.hp<=0) continue;
                var target=fighters.stream().filter(fighter->fighter.hp>0 && fighter.unit.ally()!=attacker.unit.ally())
                    .min(Comparator.comparingInt(fighter->fighter.unit.position())).orElse(null);
                if(target==null) break;
                int damage=Math.min(target.hp,Math.max(1,attacker.unit.attack()-target.unit.defense()));
                target.hp-=damage;
                hits.add(new Hit(round,attacker.unit.id(),target.unit.id(),damage,target.hp));
            }
            if(fighters.stream().noneMatch(fighter->fighter.hp>0 && fighter.unit.ally()) ||
                fighters.stream().noneMatch(fighter->fighter.hp>0 && !fighter.unit.ally())) break;
        }
        boolean won=fighters.stream().anyMatch(fighter->fighter.hp>0 && fighter.unit.ally()) &&
            fighters.stream().noneMatch(fighter->fighter.hp>0 && !fighter.unit.ally());
        return new Report(id,version,stage,won,List.copyOf(units),List.copyOf(hits),won?List.copyOf(rewards):List.of(),false);
    }
}
