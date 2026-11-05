/**
 * 独立环境的旧主线第一章第1至3关战斗验收器：读取真实敌方、成长和技能，驱动完整选定场景到胜负。
 * 默认使用固定无装备单英雄阵容，另提供明确标识的独立双单位/多单位审计入口；不接玩家库、业务协议、关卡进度或奖励。
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

    /** 初始单位信息与原始属性；faction明确为1攻方/2守方，id为本场身份，模板可重复。 */
    public record Unit(int id, int faction, int template, int level, int star, int stage, int position,
                       Map<Integer, Long> attributes, HeroBattleAttributeUtils.Opening opening,
                       List<HeroBattleSkillUtils.Skill> skills) {
        /** 不允许测试结束后反写输入或技能计划。 */
        public Unit {
            attributes = Map.copyOf(attributes);
            skills = List.copyOf(skills);
        }
    }
    /** 一次出手结束后的完整单位生命，包含死亡单位，不按阵营合并。 */
    public record Turn(int round, int sourceId, long skillEnergy, Map<Integer, Long> hp) {
        /** 冻结本次出手生命，后续行动不能改写历史记录。 */
        public Turn {
            hp = Map.copyOf(hp);
        }
    }
    /** 一个回合开始或出手阶段；完整快照便于拒绝丢单位、未知单位和半帧记录。 */
    public record Frame(int round, int sourceId, Map<Integer, Long> before, Map<Integer, Long> after,
                        List<HeroBattleHealingExecutor.Damage> damages,
                        List<HeroBattleHealingExecutor.Trace> trace) {
        /** 冻结前后生命与本阶段事件，防止事务外修改。 */
        public Frame {
            before = Map.copyOf(before);
            after = Map.copyOf(after);
            damages = List.copyOf(damages);
            trace = List.copyOf(trace);
        }
    }
    /** 本场结果与逐单位最终生命；审计来源不能冒充真实主线，无奖励和持久状态。 */
    public record Result(String scenario, HeroBattleRoundUtils.Outcome outcome, int rounds, List<Unit> initial,
                         List<Turn> turns, List<HeroBattleHealingExecutor.Damage> damages, List<Frame> frames,
                         Map<Integer, Long> finalHp) {
        /** 冻结完整名册、轨迹与最终逐单位生命。 */
        public Result {
            initial = List.copyOf(initial);
            turns = List.copyOf(turns);
            damages = List.copyOf(damages);
            frames = List.copyOf(frames);
            finalHp = Map.copyOf(finalHp);
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

    /** 只允许已核对的第一章前三关输入；第3关包含两个真实敌人，页面是否可播放另行验收。 */
    public List<Unit> initial(int mission) {
        if (mission < 1 || mission > 3) {
            throw new IllegalArgumentException("该主线关卡尚未接入");
        }
        var enemies = new ArrayList<JsonNode>();
        for (var row : rows("chapter")) {
            if (row.path("mode_id").asInt() == 1 && row.path("chapter_id").asInt() == 1
                && row.path("mission_id").asInt() == mission && row.path("hero_type").asInt() != 0) {
                enemies.add(row);
            }
        }
        int[] templates = mission == 3 ? new int[]{10101001, 10104004}
            : new int[]{mission == 1 ? 10101001 : 10505005};
        int[] stars = mission == 3 ? new int[]{1, 4} : new int[]{mission == 1 ? 1 : 5};
        if (enemies.size() != templates.length) {
            throw new IllegalStateException("选定关卡敌方数量变化，需重新核对依赖");
        }
        var result = new ArrayList<Unit>();
        result.add(unit(1, 0, null));
        for (int index = 0; index < enemies.size(); index++) {
            var enemy = enemies.get(index);
            if (enemy.path("hero_type").asInt() != templates[index]
                || enemy.path("hero_level").asInt() != (mission == 1 ? 1 : 2)
                || enemy.path("hero_star").asInt() != stars[index]
                || enemy.path("pos").asInt() != index + 2
                || !mapper.readTree(enemy.path("equipment").asString()).isEmpty()
                || !mapper.readTree(enemy.path("runes").asString()).isEmpty()) {
                throw new IllegalStateException("选定关卡内容变化，需扩展验收范围");
            }
            result.add(unit(index + 2, growth.npcStage(enemy.path("hero_level").asInt()), enemy));
        }
        for (var row : rows("battleroundaddition")) {
            if (row.path("battleType").asInt() == 1) {
                throw new IllegalStateException("主线出现回合加成，需接入后再验收");
            }
        }
        return applyElementHalo(result);
    }

    /**
     * 沿旧HeroBaseCommand入场光环：按阵营统计元素，按表顺序保留每类最后命中的档位。
     * 每类只加一次且作用于该阵营全部单位，叠加原始属性后重新折算入场面板。
     */
    private List<Unit> applyElementHalo(List<Unit> input) {
        var result = new ArrayList<Unit>();
        for (int faction : List.of(1, 2)) {
            var team = input.stream().filter(unit -> unit.faction() == faction).toList();
            var elements = team.stream().map(unit -> skills.battleIdentity(unit.template()).element()).toList();
            var selected = new LinkedHashMap<Integer, JsonNode>();
            for (var row : rows("elementaddition")) {
                var remaining = new ArrayList<>(elements);
                boolean matches = true;
                for (var element : mapper.readTree(row.path("elements").asString())) {
                    if (!remaining.remove(Integer.valueOf(element.asInt()))) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    selected.put(row.path("type").asInt(), row);
                }
            }
            for (var unit : team) {
                var attributes = new HashMap<>(unit.attributes());
                for (var row : selected.values()) {
                    for (var ability : mapper.readTree(row.path("ability").asString())) {
                        for (var property : ability.properties()) {
                            attributes.merge(Integer.parseInt(property.getKey()), property.getValue().asLong(), Math::addExact);
                        }
                    }
                }
                result.add(new Unit(unit.id(), unit.faction(), unit.template(), unit.level(), unit.star(),
                    unit.stage(), unit.position(), attributes, HeroBattleAttributeUtils.opening(attributes), unit.skills()));
            }
        }
        return List.copyOf(result);
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
            validateSkill(skill);
        }
        return new Unit(id, enemy == null ? 1 : 2, template, level, star, stage,
            enemy == null ? 2 : enemy.path("pos").asInt(), attributes,
            HeroBattleAttributeUtils.opening(attributes), plan);
    }

    /** 在独立内存战场执行到真实胜负或15回合上限；调用方提供判定，不引入新随机推定。 */
    public Result run(DoublePredicate decision) {
        return runBattle("main:1:1:1", initial(), decision);
    }

    /** 读取已核对的真实前三关敌方并完成只读整场，不允许从调用方提交怪物属性。 */
    public Result runMission(int mission, DoublePredicate decision) {
        return runBattle("main:1:1:" + mission, initial(mission), decision);
    }

    /**
     * 独立双单位规则验收入口；输入来自同源配置或明确标识的边界夹具，不读取玩家数据。
     * 不代表新主线关卡已开放；调用方不得把互换攻守等测试输入标成原关卡战报。
     */
    public Result runIndependentDuel(List<Unit> input, DoublePredicate decision) {
        if (input.size() != 2) throw new IllegalArgumentException("独立双单位输入无效");
        return runBattle("audit:duel", input, decision);
    }

    /** 第3关敌方对两名一级测试英雄的独立演出夹具；双方光环各算一次，不冒充玩家阵容或真实关卡结果。 */
    public Result runIndependentControlTeam(DoublePredicate decision) {
        var chapter = initial(3);
        var first = chapter.getFirst();
        var second = new Unit(4, 1, first.template(), first.level(), first.star(), first.stage(), 1,
            first.attributes(), first.opening(), first.skills());
        var input = new ArrayList<>(applyElementHalo(List.of(first, second)));
        input.addAll(chapter.subList(1, chapter.size()));
        return runBattle("audit:control-teams", input, decision);
    }

    /** 独立冰冻表现夹具：第1回合显式安装真实2234801，非关卡技能或玩家阵容。 */
    public Result runIndependentFrozen(DoublePredicate decision) {
        return runBattle("audit:frozen", initial(3), decision);
    }

    /** 双方均为真实七星100级强化5奈奈子，完整技能及配置属性；固定判定仅用于独立演出验收。 */
    public Result runIndependentNanako(DoublePredicate decision) {
        var input = new ArrayList<Unit>();
        for (int id : List.of(1, 2)) {
            var enemy = mapper.createObjectNode();
            enemy.put("hero_type", 10205023);
            enemy.put("hero_star", 7);
            enemy.put("hero_level", 100);
            enemy.put("pos", 2);
            enemy.put("attr", "[]");
            var built = unit(id, 5, enemy);
            input.add(new Unit(id, id, built.template(), built.level(), built.star(), built.stage(),
                built.position(), built.attributes(), built.opening(), built.skills()));
        }
        return runBattle("audit:nanako", applyElementHalo(input), decision);
    }

    /** 仅允许已核对的奈奈子静态被动与控制被动，未知先手或其他被动在开场前拒绝。 */
    private void validateSkill(HeroBattleSkillUtils.Skill skill) {
        if (skill.first()) {
            throw new IllegalArgumentException("独立战场尚未接入先手技能");
        }
        if (skill.activeType() == 1 || skill.activeType() == 2) {
            skills.damageSkillArts(skill);
        } else if (skill.skillId() == 102050234) {
            skills.controlPassiveArts(skill.skillId(), skill.level());
        } else if (skill.skillId() != 102050232 || !skill.countStats()) {
            throw new IllegalArgumentException("独立战场被动技能未核对");
        }
    }

    /** 独立多单位审计，只接受已支持技能；不能借此宣称真实主线画面已验收。 */
    public Result runIndependentTeams(List<Unit> input, DoublePredicate decision) {
        return runBattle("audit:teams", input, decision);
    }

    /** 校验本场身份/站位/生命并规范为攻方在前；同模板不同单位合法，同侧站位不得重叠。 */
    public static List<Unit> roster(List<Unit> input) {
        if (input.size() < 2 || input.size() > 16) throw new IllegalArgumentException("战斗单位数量无效");
        var ids = new HashSet<Integer>();
        var seats = new HashSet<String>();
        var factions = new HashSet<Integer>();
        for (var unit : input) {
            if (unit.id() <= 0 || !ids.add(unit.id()) || (unit.faction() != 1 && unit.faction() != 2)
                || unit.position() < 1 || unit.position() > 8
                || !seats.add(unit.faction() + ":" + unit.position())
                || unit.opening().hp() <= 0 || unit.opening().hp() > unit.opening().maxHp()) {
                throw new IllegalArgumentException("战斗单位身份、站位或生命无效");
            }
            factions.add(unit.faction());
        }
        if (factions.size() != 2) throw new IllegalArgumentException("战斗缺少对战阵营");
        return input.stream().sorted(Comparator.comparingInt(Unit::faction)).toList();
    }

    /** 每个阶段前后记录全部单位；按阵营存活判胜负，不在首个敌人死亡时提前结束。 */
    private Result runBattle(String scenario, List<Unit> input, DoublePredicate decision) {
        var initial = roster(input);
        for (var unit : initial) {
            for (var skill : unit.skills()) {
                validateSkill(skill);
            }
        }
        var states = initial.stream().map(unit -> new HeroBattleHealingExecutor.State(
            new HeroBattleEventProcessor.Actor(unit.id(), unit.skills()), unit.faction(), unit.position(),
            unit.opening().hp(), unit.opening().maxHp(), unit.opening().attack(), 0, 0, 0)).toList();
        var engine = new HeroBattleHealingExecutor(skills, states);
        initial.forEach(unit -> engine.bindCombatData(unit.id(), unit.template(), unit.attributes()));
        for (var unit : initial) {
            for (var skill : unit.skills()) {
                if (skill.skillId() == 102050234) {
                    engine.initializePassive(unit.id(), skill.skillId(), skill.level());
                }
            }
        }
        var turns = new ArrayList<Turn>();
        var frames = new ArrayList<Frame>();
        var outcome = HeroBattleRoundUtils.Outcome.ONGOING;
        int completed = 0;
        for (int round = 1; round <= HeroBattleRoundUtils.MAX_ROUNDS; round++) {
            // 当前技能子集没有速度增减；每轮仍重建全体排序，不把上一轮存活名单当完整输入。
            var order = HeroBattleRoundUtils.order(initial.stream()
                .map(unit -> new HeroBattleRoundUtils.Unit(unit.id(), unit.opening().speed())).toList());
            var before = snapshot(engine, initial);
            int damageStart = engine.damages().size();
            int traceStart = round == 1 ? 0 : engine.trace().size();
            engine.beginRound(round, order, elements, decision);
            if (scenario.equals("audit:frozen") && round == 1) {
                engine.applyFrozen(2234801, 1, 2, rate -> true);
            }
            frames.add(frame(engine, initial, round, 0, before, damageStart, traceStart));
            outcome = outcome(initial, snapshot(engine, initial), 0);
            if (outcome == HeroBattleRoundUtils.Outcome.ONGOING) {
                for (int id : order) {
                    if (engine.state(id).hp() <= 0) continue;
                    int faction = engine.state(id).faction();
                    int target = initial.stream().filter(unit -> unit.faction() != faction && engine.state(unit.id()).hp() > 0)
                        .findFirst().orElseThrow().id();
                    before = snapshot(engine, initial);
                    damageStart = engine.damages().size();
                    traceStart = engine.trace().size();
                    // context仅提供合法存活对手，真实动作的目标仍由各自配置选择器决定。
                    engine.act(id, target, HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, elements, decision);
                    var after = snapshot(engine, initial);
                    frames.add(frame(engine, initial, round, id, before, damageStart, traceStart));
                    turns.add(new Turn(round, id, HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, after));
                    outcome = outcome(initial, after, 0);
                    if (outcome != HeroBattleRoundUtils.Outcome.ONGOING) break;
                }
            }
            completed = round;
            outcome = outcome(initial, snapshot(engine, initial), completed);
            if (outcome != HeroBattleRoundUtils.Outcome.ONGOING) break;
        }
        return new Result(scenario, outcome, completed, initial, turns, engine.damages(), frames, snapshot(engine, initial));
    }

    /** 完整生命快照严格匹配名册；双方同时全灭仍由旧规则先判攻方失败。 */
    public static HeroBattleRoundUtils.Outcome outcome(List<Unit> units, Map<Integer, Long> hp, int rounds) {
        var ids = new HashSet<Integer>();
        for (var unit : units) {
            ids.add(unit.id());
            var value = hp.get(unit.id());
            if (value == null || value < 0 || value > unit.opening().maxHp()) {
                throw new IllegalArgumentException("战斗单位生命快照无效");
            }
        }
        if (!ids.equals(hp.keySet())) throw new IllegalArgumentException("战斗单位生命快照不完整");
        return HeroBattleRoundUtils.outcome(
            units.stream().anyMatch(unit -> unit.faction() == 1 && hp.get(unit.id()) > 0),
            units.stream().anyMatch(unit -> unit.faction() == 2 && hp.get(unit.id()) > 0), rounds);
    }

    /** 捕获引擎中所有单位生命，死亡单位保留0，避免改变名册身份。 */
    private static Map<Integer, Long> snapshot(HeroBattleHealingExecutor engine, List<Unit> units) {
        var result = new LinkedHashMap<Integer, Long>();
        units.forEach(unit -> result.put(unit.id(), engine.state(unit.id()).hp()));
        return Map.copyOf(result);
    }

    /** 成功阶段截取新增伤害与事件，异常事务不会生成半帧。 */
    private Frame frame(HeroBattleHealingExecutor engine, List<Unit> units, int round, int source,
                        Map<Integer, Long> before, int start, int traceStart) {
        var damages = engine.damages();
        return new Frame(round, source, before, snapshot(engine, units),
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
