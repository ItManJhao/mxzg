/**
 * 独立环境的旧主线第一章第1/2关战斗验收器：读取真实敌方、成长和技能，驱动完整选定场景到胜负。
 * 默认使用固定无装备单英雄阵容，另提供明确标识的独立双单位审计入口；不接玩家库、业务协议、关卡进度或奖励。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import java.util.function.DoublePredicate;
import com.funsgamex.mxzg.lineup.MainFormationRules;
import tools.jackson.databind.*;

public final class HeroBattleChapterScenario {
    /** 同源配置解析器，不从客户端提交数据创建敌方。 */
    private final ObjectMapper mapper;
    /** 真实英雄成长规则。 */
    private final HeroGrowthRules growth;
    /** 真实技能选择和事件规则。 */
    private final HeroSkillPanelRules skills;
    /** 星级防御系数。 */
    private final HeroBattleDefenseRules defense;
    /** 同源元素克制。 */
    private final HeroBattleElementRules elements;
    /** 我方已选阵型1的站位属性；怪物不走玩家FormationReceivers。 */
    private final MainFormationRules formations;

    /** 初始单位信息及原始战斗属性，冻结供验收对照。 */
    public record Unit(int id, int faction, int template, int level, int star, int stage, int position,
                       Map<Integer, Long> attributes, HeroBattleAttributeUtils.Opening opening,
                       List<HeroBattleSkillUtils.Skill> skills) {
        /** 不允许测试结束后反写输入或技能计划。 */
        public Unit {
            attributes = Map.copyOf(attributes);
            skills = List.copyOf(skills);
        }
    }
    /** 一次合法出手的输入/输出血量，能量明确保存旧默认0。 */
    public record Turn(int round, int sourceId, long skillEnergy, long attackerHp, long defenderHp) {}
    /** 单个回合开始阶段或一次出手；保留技能、表现、伤害和Buff变化的实际交错顺序。 */
    public record Frame(int round, int sourceId, long attackerBefore, long defenderBefore,
                        long attackerAfter, long defenderAfter,
                        List<HeroBattleHealingExecutor.Damage> damages,
                        List<HeroBattleHealingExecutor.Trace> trace) {
        /** sourceId为0表示回合开始持续效果，1/2表示双方出手。 */
        public Frame {
            damages = List.copyOf(damages);
            trace = List.copyOf(trace);
        }
    }
    /** 本场最终结果、来源与可核对伤害；scenario区分真实主线和独立审计，无奖励或持久版本。 */
    public record Result(String scenario, HeroBattleRoundUtils.Outcome outcome, int rounds, List<Unit> initial,
                         List<Turn> turns, List<HeroBattleHealingExecutor.Damage> damages, List<Frame> frames,
                         long attackerHp, long defenderHp) {
        /** 冻结验收结果，避免把显示修改当服务器结果。 */
        public Result {
            initial = List.copyOf(initial);
            turns = List.copyOf(turns);
            damages = List.copyOf(damages);
            frames = List.copyOf(frames);
        }
    }

    /** 注入现有规则；此验收器不注册业务接口。 */
    public HeroBattleChapterScenario(ObjectMapper mapper) {
        this.mapper = mapper;
        growth = new HeroGrowthRules(mapper);
        skills = new HeroSkillPanelRules(mapper);
        defense = new HeroBattleDefenseRules(mapper);
        elements = new HeroBattleElementRules(mapper);
        formations = new MainFormationRules(mapper);
    }

    /** 加载固定测试双方；配置变化超出验收范围时拒绝，不能继续假装原场景已覆盖。 */
    public List<Unit> initial() {
        return initial(1);
    }

    /** 只允许已核对的第一章第1/2关单敌方输入，其余关卡不得绕过依赖审计。 */
    public List<Unit> initial(int mission) {
        if (mission != 1 && mission != 2) throw new IllegalArgumentException("该主线关卡尚未接入");
        var enemies = new ArrayList<JsonNode>();
        for (var row : rows("chapter")) {
            if (row.path("mode_id").asInt() == 1 && row.path("chapter_id").asInt() == 1
                && row.path("mission_id").asInt() == mission && row.path("hero_type").asInt() != 0) {
                enemies.add(row);
            }
        }
        if (enemies.size() != 1) {
            throw new IllegalStateException("选定关卡不再是单敌方，需重新核对依赖");
        }
        var enemy = enemies.getFirst();
        if (enemy.path("hero_type").asInt() != (mission == 1 ? 10101001 : 10505005)
            || enemy.path("hero_level").asInt() != (mission == 1 ? 1 : 2)
            || enemy.path("hero_star").asInt() != (mission == 1 ? 1 : 5) || enemy.path("pos").asInt() != 2
            || !mapper.readTree(enemy.path("equipment").asString()).isEmpty()
            || !mapper.readTree(enemy.path("runes").asString()).isEmpty()) {
            throw new IllegalStateException("选定关卡内容变化，需扩展验收范围");
        }
        // 双方各单英雄，按实际元素拒绝新出现的单元素光环；主线回合加成也不能静默忽略。
        int enemyElement = skills.battleIdentity(enemy.path("hero_type").asInt()).element();
        for (var row : rows("elementaddition")) {
            var required = mapper.readTree(row.path("elements").asString());
            if (required.isEmpty() || (required.size() == 1
                && (required.get(0).asInt() == 1 || required.get(0).asInt() == enemyElement))) {
                throw new IllegalStateException("单英雄出现光环依赖，需接入后再验收");
            }
        }
        for (var row : rows("battleroundaddition")) {
            if (row.path("battleType").asInt() == 1) {
                throw new IllegalStateException("主线出现回合加成，需接入后再验收");
            }
        }
        return List.of(unit(1, 0, null), unit(2, growth.npcStage(enemy.path("hero_level").asInt()), enemy));
    }

    /** 按旧基础成长→怪物初始修正→技能加成→玩家阵型顺序创建本场原始属性。 */
    private Unit unit(int id, int stage, JsonNode enemy) {
        int template = enemy == null ? 10101001 : enemy.path("hero_type").asInt();
        int star = enemy == null ? 1 : enemy.path("hero_star").asInt();
        int level = enemy == null ? 1 : enemy.path("hero_level").asInt();
        var base = growth.stats(template, star, level, stage);
        var attributes = new HashMap<Integer, Long>();
        attributes.put(220, (long) base.atk());
        attributes.put(223, (long) base.hp());
        attributes.put(224, (long) base.def());
        attributes.put(101, (long) base.spd());
        attributes.put(150, defense.coefficient(star));
        if (enemy != null) {
            for (var modifier : mapper.readTree(enemy.path("attr").asString())) {
                int type = modifier.path("type").asInt();
                attributes.put(type, HeroBattleRoundUtils.initialAttribute(attributes.getOrDefault(type, 0L),
                    modifier.path("kind").asInt(), modifier.path("value").asLong()));
            }
        }
        skills.contribute(template, star, stage, (type, value) -> attributes.merge(type, value, Math::addExact));
        if (enemy == null) {
            formations.position(1, 2).attributes()
                .forEach((type, value) -> attributes.merge(type, value, Math::addExact));
        }
        var plan = skills.battleSchedule(skills.select(template, star, stage));
        for (var skill : plan) {
            if (skill.first() || (skill.activeType() != 1 && skill.activeType() != 2)) {
                throw new IllegalStateException("测试阵容新增先手/被动依赖，需重新核查");
            }
            skills.damageSkillArts(skill);
        }
        return new Unit(id, enemy == null ? 1 : 2, template, level, star, stage, 2, attributes, HeroBattleAttributeUtils.opening(attributes), plan);
    }

    /** 在独立内存战场执行到真实胜负或15回合上限；调用方提供判定，不引入新随机推定。 */
    public Result run(DoublePredicate decision) {
        return runDuel("main:1:1:1", initial(), decision);
    }

    /** 读取已核对的真实第1/2关敌方并完成只读整场，不允许从调用方提交怪物属性。 */
    public Result runMission(int mission, DoublePredicate decision) {
        return runDuel("main:1:1:" + mission, initial(mission), decision);
    }

    /**
     * 独立双单位规则验收入口；输入来自同源配置或明确标识的边界夹具，不读取玩家数据。
     * 不代表新主线关卡已开放；调用方不得把互换攻守等测试输入标成原关卡战报。
     */
    public Result runIndependentDuel(List<Unit> input, DoublePredicate decision) {
        return runDuel("audit:duel", input, decision);
    }

    /** 执行本场双单位输入；来源在执行前确定，审计结果不得冒充主线关卡。 */
    private Result runDuel(String scenario, List<Unit> input, DoublePredicate decision) {
        var initial = List.copyOf(input);
        if (initial.size() != 2 || initial.getFirst().id() != 1 || initial.getLast().id() != 2
            || initial.stream().anyMatch(unit -> unit.opening().hp() <= 0
                || unit.opening().hp() > unit.opening().maxHp() || unit.position() < 1 || unit.position() > 8)) {
            throw new IllegalArgumentException("独立双单位输入无效");
        }
        for (var unit : initial) {
            for (var skill : unit.skills()) {
                if (skill.first() || (skill.activeType() != 1 && skill.activeType() != 2)) {
                    throw new IllegalArgumentException("独立双单位未接入先手或被动技能");
                }
                skills.damageSkillArts(skill);
            }
        }
        var states = initial.stream().map(unit -> new HeroBattleHealingExecutor.State(
            new HeroBattleEventProcessor.Actor(unit.id(), unit.skills()), unit.id(), unit.position(),
            unit.opening().hp(), unit.opening().maxHp(), unit.opening().attack(), 0, 0, 0)).toList();
        var engine = new HeroBattleHealingExecutor(skills, states);
        initial.forEach(unit -> engine.bindCombatData(unit.id(), unit.template(), unit.attributes()));
        var order = HeroBattleRoundUtils.order(initial.stream()
            .map(unit -> new HeroBattleRoundUtils.Unit(unit.id(), unit.opening().speed())).toList());
        var turns = new ArrayList<Turn>();
        var frames = new ArrayList<Frame>();
        var outcome = HeroBattleRoundUtils.Outcome.ONGOING;
        int completed = 0;
        for (int round = 1; round <= HeroBattleRoundUtils.MAX_ROUNDS; round++) {
            long beforeA = engine.state(1).hp();
            long beforeD = engine.state(2).hp();
            int damageStart = engine.damages().size();
            int traceStart = engine.trace().size();
            engine.beginRound(round, order, elements, decision);
            frames.add(frame(engine, round, 0, beforeA, beforeD, damageStart, traceStart));
            outcome = HeroBattleRoundUtils.outcome(engine.state(1).hp() > 0, engine.state(2).hp() > 0, 0);
            if (outcome == HeroBattleRoundUtils.Outcome.ONGOING) {
                for (int id : order) {
                    if (engine.state(id).hp() <= 0) {
                        continue;
                    }
                    beforeA = engine.state(1).hp();
                    beforeD = engine.state(2).hp();
                    damageStart = engine.damages().size();
                    traceStart = engine.trace().size();
                    engine.act(id, id == 1 ? 2 : 1, HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, elements, decision);
                    frames.add(frame(engine, round, id, beforeA, beforeD, damageStart, traceStart));
                    turns.add(new Turn(round, id, HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, engine.state(1).hp(), engine.state(2).hp()));
                    outcome = HeroBattleRoundUtils.outcome(engine.state(1).hp() > 0, engine.state(2).hp() > 0, 0);
                    if (outcome != HeroBattleRoundUtils.Outcome.ONGOING) {
                        break;
                    }
                }
            }
            completed = round;
            outcome = HeroBattleRoundUtils.outcome(engine.state(1).hp() > 0, engine.state(2).hp() > 0, completed);
            if (outcome != HeroBattleRoundUtils.Outcome.ONGOING) {
                break;
            }
        }
        return new Result(scenario, outcome, completed, initial, turns, engine.damages(), frames, engine.state(1).hp(), engine.state(2).hp());
    }

    /** 根动作成功后截取新增伤害，失败不会生成半帧；回合持续伤害单独归档。 */
    private Frame frame(HeroBattleHealingExecutor engine, int round, int source,
                        long beforeA, long beforeD, int start, int traceStart) {
        var damages = engine.damages();
        return new Frame(round, source, beforeA, beforeD, engine.state(1).hp(), engine.state(2).hp(),
            damages.subList(start, damages.size()), engine.trace().subList(traceStart, engine.trace().size()));
    }

    /** 读取同源表，缺表或空表明确失败，不回退早期简化关卡投影。 */
    private JsonNode rows(String name) {
        try (var input = getClass().getResourceAsStream("/gameplay/" + name + ".json")) {
            if (input == null) {
                throw new IllegalStateException("关卡依赖表缺失：" + name);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("关卡依赖表无效：" + name);
            }
            return rows;
        } catch (java.io.IOException error) {
            throw new IllegalStateException("关卡依赖表读取失败：" + name, error);
        }
    }
}
