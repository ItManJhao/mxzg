/**
 * 勇者试炼匹配与开战协作。真人和原配置机器人都在匹配时冻结守方名册，
 * 成功结算前可重复挑战同一对手，战斗数值沿用共用引擎。
 */
package com.funsgamex.mxzg.trial;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Unit;
import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleInputService;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroPowerRules;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.role.RoleNameRules;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class TrialCombat {
    /** 同服对手匹配索引和当前角色既有阵容。 */
    private final TrialRepository repository;
    /** 读取候选角色的公开名称及头像等基本信息。 */
    private final RoleRepository roles;
    /** 读取已保存的普通主线阵容，过滤其非试炼的支援位。 */
    private final MainFormationStateService formations;
    /** 把服务端确认的双方站位转换为共用战斗输入。 */
    private final HeroBattleInputService battleInputs;
    /** 共用战斗和回放校验，不复制技能和伤害算法。 */
    private final HeroLineupBattleService battles;
    /** 与主线战力和所有守方预览共同使用的计算规则。 */
    private final HeroPowerRules powers;
    /** 元素显示从英雄原模板推导。 */
    private final HeroBattleElementRules elements;
    /** 使用新服已接入的原随机姓氏与名字数据。 */
    private final RoleNameRules names;
    /** 战斗回合和匹配倍率来自原表。 */
    private final TrialRules rules;

    /** 保存当日对手及当前血量。真人拥有角色 ID，机器人无角色 ID。 */
    record Defense(String roleId, String name, long power, int level, int avatarId, int formationId,
                   List<Unit> units, Map<Integer, Long> health) {
        /** 保留已匹配对手的开战属性，下一次只覆盖剩余生命。 */
        Defense withHealth(Map<Integer, Long> next) {
            return new Defense(roleId, name, power, level, avatarId, formationId, units, next);
        }
    }

    /** 返回原战报及按真实身份重映射的双方生命。 */
    record Result(boolean won, BattleReplay replay, Map<String, TrialService.HeroHealth> attacker,
                  Map<Integer, Long> defender) {}

    /** 注入既有角色、规则、战斗和名称配置。 */
    TrialCombat(TrialRepository repository, RoleRepository roles, MainFormationStateService formations,
                HeroBattleInputService battleInputs, HeroLineupBattleService battles, HeroPowerRules powers,
                HeroBattleElementRules elements, RoleNameRules names, TrialRules rules) {
        this.repository = repository;
        this.roles = roles;
        this.formations = formations;
        this.battleInputs = battleInputs;
        this.battles = battles;
        this.powers = powers;
        this.elements = elements;
        this.names = names;
        this.rules = rules;
    }

    /** 新角色当天只遇机器人，后续优先按原区间挑选本服未出现的真实对手。 */
    Defense match(RoleProfile role, long newDayStart, long maximum, TrialRules.Stage stage,
                  List<Defense> previous) {
        var random = ThreadLocalRandom.current();
        int rateMin = stage.enemyPowerLow();
        int rateMax = stage.enemyPowerHigh();
        if (role.basics().createdAtSeconds() < newDayStart) {
            var excluded = new ArrayList<String>();
            excluded.add(role.id());
            previous.stream().map(Defense::roleId).filter(id -> id != null).forEach(excluded::add);
            while (true) {
                var candidates = repository.realCandidates(role.serverId(), excluded,
                        powerAtRate(maximum, rateMin), powerAtRate(maximum, rateMax));
                if (!candidates.isEmpty()) {
                    String candidate = candidates.get(random.nextInt(candidates.size()));
                    var defense = fromRole(candidate);
                    if (defense != null) {
                        return defense;
                    }
                    excluded.add(candidate);
                    continue;
                }
                if (rateMin == 0 && rateMax >= 100) {
                    break;
                }
                rateMin = Math.max(0, rateMin - 10);
                rateMax = Math.max(rateMax, Math.min(100, rateMax + 10));
            }
        }
        var robot = rules.pickRobot(powerAtRate(maximum, stage.enemyPowerLow()),
                powerAtRate(maximum, stage.enemyPowerHigh()), random);
        var units = battles.freezeTrialDefense(null, robot.enemies());
        long power = battles.trialDefensePanel(units, Map.of()).stream().mapToLong(unit ->
                powers.score(unit.attributes())).sum();
        return new Defense(null, robotName(previous), power, robot.level(), robot.avatarId(), 1, units, Map.of());
    }

    /** 匹配展示值使用旧整百分比战力上限，计算中间值使用长整数。 */
    private static long powerAtRate(long power, int rate) {
        return power * rate / 100;
    }

    /** 按现有姓氏和名字资源生成当天未重复的机器人名称。 */
    private String robotName(List<Defense> previous) {
        String name;
        do {
            name = names.randomCandidate();
        } while (containsName(previous, name));
        return name;
    }

    /** 判断名称是否已出现在当日的匹配记录中。 */
    private static boolean containsName(List<Defense> previous, String name) {
        return previous.stream().anyMatch(defense -> name.equals(defense.name()));
    }

    /** 捕获匹配时的持久主阵容。空阵容不参加试炼匹配。 */
    private Defense fromRole(String target) {
        var role = roles.findById(target).orElse(null);
        if (role == null) {
            return null;
        }
        var chosen = formations.current(target);
        var slots = chosen.slots().stream().filter(slot -> slot.position() <= 8).toList();
        if (slots.isEmpty()) {
            return null;
        }
        var team = battleInputs.forFormation(target, chosen.version(), chosen.formationId(), slots);
        var units = battles.freezeTrialDefense(team, List.of());
        return new Defense(target, role.nickname(), role.power() == null ? 0 : role.power(), role.level(),
                role.basics().headId(), chosen.formationId(), units, Map.of());
    }

    /** 将冻结守方与已保存的攻方匹配，使用双方上场时的生命生成一次真实战报。 */
    Result battle(RoleProfile profile, int difficulty, int node, HeroBattleInputService.Input input,
                  Map<String, TrialService.HeroHealth> heroHealth, Defense defense) {
        var entryHealth = new LinkedHashMap<>(defense.health());
        var byPosition = new LinkedHashMap<Integer, String>();
        for (var unit : input.units()) {
            var id = unit.hero().id();
            byPosition.put(unit.position(), id);
            var health = heroHealth.get(id);
            if (health != null) {
                entryHealth.put(unit.position(), health.hp());
            }
        }
        if (byPosition.keySet().stream().noneMatch(position -> entryHealth.getOrDefault(position, 1L) > 0)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "TRIAL_NO_LIVING_HERO");
        }
        var random = ThreadLocalRandom.current();
        var scenario = "trial:" + difficulty + ":" + node;
        try {
            var result = battles.trial(scenario, input, defense.units(), entryHealth, rules.config().battleRounds(),
                    chance -> random.nextDouble() < chance);
            var attacker = new LinkedHashMap<String, TrialService.HeroHealth>();
            var defender = new LinkedHashMap<Integer, Long>();
            for (var unit : result.initial()) {
                long hp = result.finalHp().get(unit.id());
                if (unit.faction() == 1) {
                    String id = byPosition.get(unit.position());
                    attacker.put(id, new TrialService.HeroHealth(id, hp, unit.opening().maxHp()));
                } else {
                    defender.put(unit.id(), hp);
                }
            }
            var replay = HeroBattleReplayProtocolUtils.encode(result).toBuilder()
                    .setAttackerName(profile.nickname()).setDefenderName(defense.name()).build();
            return new Result(result.outcome() == HeroBattleRoundUtils.Outcome.ATTACKER_WIN, replay, attacker, defender);
        } catch (IllegalArgumentException | UnsupportedOperationException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "TRIAL_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 只下发守方头像、星级、元素及经过真实入场规则计算的当前生命。 */
    TrialService.Opponent opponent(Defense defense) {
        var heroes = battles.trialDefensePanel(defense.units(), defense.health()).stream()
                .map(unit -> new TrialService.OpponentHero(unit.position(), unit.template(), unit.level(), unit.star(),
                        elements.element(unit.template()), unit.opening().hp(), unit.opening().maxHp())).toList();
        return new TrialService.Opponent(defense.name(), defense.power(), defense.level(), defense.avatarId(),
                defense.formationId(), heroes);
    }

    /** 地图可以显示已冻结的真实守军，能否作战取决于引擎对该阵容的实际能力。 */
    boolean ready(Defense defense) {
        return battles.trialDefenseReady(defense.units());
    }
}
