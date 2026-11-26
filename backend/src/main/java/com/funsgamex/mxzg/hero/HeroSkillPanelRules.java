/**
 * 按旧 BattleTemplate/SkillInfo/CBuff 解析面板加成、技能排期及已支持战斗动作的配置。
 * 面板输入、战场和只读依赖审计共用此规则；只校验与转换，不执行战斗、升级或资产写入。
 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import java.util.function.BiConsumer;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public class HeroSkillPanelRules {
    /** 同源配置解析器，只在启动读取表与属性列表。 */
    private final ObjectMapper mapper;
    /** 模板、强化、星级、动作和 buff 的真实配置索引。 */
    private final Map<String,Map<Integer,JsonNode>> tables=new HashMap<>();
    /** 技能按 type/level 复合键查找，禁止混用行号 idx。 */
    private final Map<String,JsonNode> skills=new HashMap<>();
    /** 启动读取同源表，缺表或重复键明确失败。 */
    public HeroSkillPanelRules(ObjectMapper mapper){
        this.mapper=mapper;
        for(String name:List.of("herotype","heroupgrade","herostar","buffart","buff","heroskill")){
            String key=switch(name){case "herotype"->"type";case "heroupgrade"->"grade";case "herostar"->"star";default->"idx";};
            Map<Integer,JsonNode> rows=new HashMap<>();
            try(var input=getClass().getResourceAsStream("/gameplay/"+name+".json")){
                if(input==null)throw new IllegalStateException("技能面板表缺失："+name);
                for(var row:mapper.readTree(input).path("rows")){
                    if(rows.put(row.path(key).asInt(),row)!=null)throw new IllegalStateException("技能面板配置重复");
                    if(name.equals("heroskill")&&skills.put(row.path("type").asInt()+":"+row.path("level").asInt(),row)!=null)throw new IllegalStateException("技能等级重复");
                }
                if(rows.isEmpty())throw new IllegalStateException("技能面板表为空");tables.put(name,Map.copyOf(rows));
            }catch(java.io.IOException error){throw new IllegalStateException("技能面板表读取失败",error);}
        }
    }
    /** 名册面板与战斗输入共用技能选择；普攻等级为0，其余受强化解锁和真实星级控制。 */
    public List<HeroEvolutionRules.Skill> select(int template,int star,int stage){
        var hero=row("herotype",template);var rank=row("herostar",star);var upgrade=row("heroupgrade",stage);
        var selected=new ArrayList<HeroEvolutionRules.Skill>();
        for(int slot=1;slot<=5;slot++){
            int id=hero.path("skill_"+slot).asInt();if(id==0||(slot<5&&upgrade.path("skill"+slot).asInt()!=1))continue;
            int level=slot==5?0:rank.path("skill"+slot).asInt();var skill=skills.get(id+":"+level);
            if(skill==null)throw new IllegalStateException("面板技能等级缺失："+id+":"+level);
            selected.add(new HeroEvolutionRules.Skill(id,level));
        }
        return List.copyOf(selected);
    }
    /** 为已完成进化覆盖的技能解析排期元数据；保留原顺序，不按ID重排或执行被动。 */
    public List<HeroBattleSkillUtils.Skill> battleSchedule(List<HeroEvolutionRules.Skill> selected) {
        return selected.stream().map(reference -> {
            var row = skills.get(reference.skillId() + ":" + reference.level());
            if (row == null) {
                throw new IllegalStateException("战斗技能等级缺失：" + reference.skillId() + ":" + reference.level());
            }
            for (String key : List.of("active_type", "initial_round", "cool_round", "count_stats")) {
                if (!row.path(key).isIntegralNumber() || !row.path(key).canConvertToInt()) {
                    throw new IllegalStateException("战斗技能字段无效：" + key);
                }
            }
            int count = row.path("count_stats").asInt();
            if (count != 0 && count != 1) {
                throw new IllegalStateException("战斗技能面板标志无效");
            }
            return new HeroBattleSkillUtils.Skill(reference.skillId(), reference.level(),
                row.path("active_type").asInt(), row.path("initial_round").asInt(),
                row.path("cool_round").asInt(), count == 1, firstSkill(row));
        }).toList();
    }

    /** 解析旧 CommonChange 的本场普攻替换，按触发它的被动等级读取新技能并完整预检。 */
    public HeroBattleSkillUtils.Skill battleOrdinaryReplacement(int buffId, int passiveLevel) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 162) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        // 旧随机分支将大于百分百的配置视为必定成功。爱德华使用该特殊值。
        int chance = openingLevelVariant(buffId, 5042101) ? 100000 : 10000;
        if (buff.path("round").asInt() != 999 || buff.path("attach_percent").asInt() != chance
                || buff.path("effecttype").asInt() != 0 || buff.path("copy_target").asInt() != 0
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || values.length != 4 || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")) {
            throw new IllegalArgumentException("普通攻击替换包含未支持条件：" + buffId);
        }
        var replacement = battleSchedule(List.of(new HeroEvolutionRules.Skill(Integer.parseInt(values[0]), passiveLevel)))
                .getFirst();
        if (replacement.activeType() != 2 || replacement.first()) {
            throw new IllegalArgumentException("普通攻击替换目标类型无效：" + buffId);
        }
        damageSkillArts(replacement);
        return replacement;
    }

    /** 沿旧HeroSkillSysCache.checkFirstSkill扫描动作内的260号Buff，不把先手当作排期字段。 */
    private boolean firstSkill(JsonNode skill) {
        for (var artId : mapper.readTree(skill.path("art_list").asString())) {
            for (var buffId : mapper.readTree(row("buffart", artId.asInt()).path("buff_list").asString())) {
                if (row("buff", buffId.asInt()).path("type").asInt() == 260) {
                    return true;
                }
            }
        }
        return false;
    }

    /** 解析已核对的触发监听，预检受击分档等专用监听的原动作和配置。 */
    public HeroBattleEventProcessor.Definition battleTrigger(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (type == 180 && !isCharmDeathListener(buffId) && !isEveDeathListener(buffId)
                && !openingLevelVariant(buffId, 4054101) && !sixLevelVariant(buffId, 5104101)
                && !isDreamlandDeathListener(buffId)) {
            throw new IllegalArgumentException("死亡监听下游尚未核对：" + buffId);
        }
        if (type == 177) {
            battleHpThreshold(buffId);
        }
        if (type == 176) {
            battleDamageThreshold(buffId);
        }
        if (type == 171 && Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]) != 0) {
            throw new IllegalArgumentException("受击事件的前置Buff条件尚未支持：" + buffId);
        }
        if (type == 199 || type == 200 || type == 311 || towerDamageLimitRate(buffId) > 0
                || battleReactiveProtection(buffId) != null || battleFlameShieldRate(buffId) > 0) {
            // 旧专用处理器覆盖trigger，并不执行配置里的art_list。
            return new HeroBattleEventProcessor.Definition(buffId, type, 0, List.of());
        }
        int skillFilter = type == 173 ? Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]) : 0;
        var arts = new ArrayList<HeroBattleEventProcessor.Art>();
        for (var id : mapper.readTree(buff.path("art_list").asString())) {
            var art = row("buffart", id.asInt());
            var targets = mapper.readTree(art.path("target").asString());
            if (!targets.isArray()) {
                throw new IllegalStateException("触发动作目标配置无效");
            }
            arts.add(new HeroBattleEventProcessor.Art(id.asInt(), art.path("source_type").asInt(), !targets.isEmpty()));
        }
        var limits = buff.path("value").asString().split("\\|", -1);
        int first = Integer.parseInt(limits[0]);
        if (type == 175 && first != 0 && first != 1) throw new IllegalArgumentException("被暴击来源条件无效");
        return new HeroBattleEventProcessor.Definition(buffId, type, skillFilter, arts,
            type == 174 ? first : 0, type == 175 && first == 1,
            type == 175 && limits.length > 1 ? Integer.parseInt(limits[1]) : 0);
    }

    /** 185/207只匹配value中的控制类型；空列表不代表全部控制。 */
    public boolean matchesControlTrigger(int buffId, int controlType) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 185 && buff.path("type").asInt() != 207 && buff.path("type").asInt() != 208) {
            throw new IllegalArgumentException("不是控制监听配置：" + buffId);
        }
        for (String value : buff.path("value").asString().split("\\|", -1)) {
            if (Integer.parseInt(value) == controlType) {
                return true;
            }
        }
        return false;
    }

    /** 209按目标最近移除的Buff配置ID过滤，不按类型、不把0当通配符。 */
    public boolean matchesExpiredTrigger(int listenerId, int expiredBuffId) {
        var buff = row("buff", listenerId);
        if (buff.path("type").asInt() != 209) {
            throw new IllegalArgumentException("不是到期监听：" + listenerId);
        }
        for (String value : buff.path("value").asString().split("\\|", -1)) {
            if (Integer.parseInt(value) == expiredBuffId) return true;
        }
        return false;
    }

    /** 从同源动作表解析已支持的目标选择计划；未知选择器拒绝，不猜默认目标。 */
    public HeroBattleTargetUtils.Plan battleTargets(int artId) {
        var art = row("buffart", artId);
        var raw = mapper.readTree(art.path("target").asString());
        if (!raw.isArray() || !art.path("target_num").isIntegralNumber()
            || !art.path("target_num").canConvertToInt()) {
            throw new IllegalStateException("动作目标配置无效：" + artId);
        }
        var selectors = new ArrayList<Integer>();
        for (var value : raw) {
            if (!value.isIntegralNumber() || !value.canConvertToInt()) {
                throw new IllegalStateException("动作目标类型无效：" + artId);
            }
            selectors.add(value.asInt());
        }
        var values = new ArrayList<Integer>();
        var rawValues = mapper.readTree(art.path("target_value").asString());
        if (!rawValues.isArray()) {
            throw new IllegalStateException("动作目标参数配置无效：" + artId);
        }
        for (var value : rawValues) {
            if (!value.isIntegralNumber() || !value.canConvertToInt()) {
                throw new IllegalStateException("动作目标参数类型无效：" + artId);
            }
            values.add(value.asInt());
        }
        return new HeroBattleTargetUtils.Plan(artId, selectors, art.path("target_num").asInt(), values);
    }

    /** 解析旧218号血量条件的前三个参数；后续art_list由动作层负责，不在此伪执行。 */
    public HeroBattleConditionUtils.HpCondition battleHpCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 218) {
            throw new IllegalArgumentException("不是血量条件Buff：" + buffId);
        }
        String[] values = buff.path("value").asString().split("\\|", -1);
        if (values.length < 3) {
            throw new IllegalStateException("血量条件参数不足：" + buffId);
        }
        return new HeroBattleConditionUtils.HpCondition(buffId, Integer.parseInt(values[0]),
            Integer.parseInt(values[1]), Integer.parseInt(values[2]));
    }

    /** 血量条件只放行已实现的一次性属性、定时属性和原零概率子动作；死亡条件另行校验。 */
    public boolean dailyDungeonCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() == 218 && buff.path("attach_percent").asInt() == 10000) {
            var condition = battleHpCondition(buffId);
            var children = immediateArts(buffId);
            return (condition.subject() == 0 || condition.subject() == 1) && children.size() == 1
                && (children.getFirst().targets().selectors().isEmpty()
                    || children.getFirst().targets().selectors().equals(List.of(1)))
                && children.getFirst().buffs().size() == 1
                && ((buffId == 1154401 && children.getFirst().buffs().equals(List.of(1154601))
                        && dailyDungeonDormant(1154601))
                    || battleOnceAttribute(children.getFirst().buffs().getFirst())
                    || battleDirectAttribute(children.getFirst().buffs().getFirst()));
        }
        if (buffId >= 1083501 && buffId <= 1083503) {
            if (buff.path("type").asInt() != 222 || buff.path("attach_percent").asInt() != 10000
                    || buff.path("copy_target").asInt() != 0) {
                throw new IllegalArgumentException("毁灭之烬死亡检查配置变化：" + buffId);
            }
            var children = immediateArts(buffId);
            int healingId = buffId + 100;
            return children.size() == 1 && children.getFirst().buffs().equals(List.of(healingId))
                && children.getFirst().targets().selectors().equals(List.of(1))
                && children.getFirst().targets().count() == 0 && children.getFirst().targets().values().isEmpty()
                && attackHealing(healingId) != null;
        }
        if (openingLevelVariant(buffId, 5053701)) {
            var children = immediateArts(buffId);
            int attackId = buffId + 100;
            return buff.path("type").asInt() == 222 && buff.path("attach_percent").asInt() == 10000
                && buff.path("copy_target").asInt() == 1 && buff.path("round").asInt() == 0
                && children.size() == 1 && children.getFirst().buffs().equals(List.of(attackId))
                && children.getFirst().targets().selectors().equals(List.of(3, 4, 10))
                && children.getFirst().targets().count() == 1 && children.getFirst().targets().values().isEmpty()
                && dailyAssignedSkill(attackId) != null;
        }
        return false;
    }

    /** 读取已核对的三档指定攻击，按各档的原技能等级与附加率进入行动队列。 */
    public HeroBattleSkillUtils.Skill dailyAssignedSkill(int buffId) {
        int level = buffId % 100;
        if (level < 1 || level > 3) {
            return null;
        }
        int first = buffId - level + 1;
        int skillId = switch (first) {
            case 1074601 -> 101050075;
            case 2094201 -> 102050095;
            case 4093301 -> 104050096;
            case 4094201 -> 104050095;
            case 5053801 -> 105050055;
            default -> 0;
        };
        if (skillId == 0) {
            return null;
        }
        var buff = row("buff", buffId);
        int chance = switch (first) {
            case 1074601 -> 4000 + (level - 1) * 3000;
            case 4093301 -> 4000 + (level - 1) * 1000;
            case 4094201 -> 6000 + (level - 1) * 2000;
            default -> 10000;
        };
        if (buff.path("type").asInt() != 1303 || buff.path("attach_percent").asInt() != chance
                || !buff.path("value").asString().equals(skillId + "|" + level + "|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("指定反击配置变化：" + buffId);
        }
        var skill = battleSchedule(List.of(new HeroEvolutionRules.Skill(skillId, level))).getFirst();
        damageSkillArts(skill);
        return skill;
    }

    /** 读取指定反击的原附加率，受击时进行一次判定。 */
    public double assignedSkillChance(int buffId) {
        if (dailyAssignedSkill(buffId) == null) {
            throw new IllegalArgumentException("不是已核对的指定反击：" + buffId);
        }
        return row("buff", buffId).path("attach_percent").asInt() / 10000D;
    }

    /** 244 先手条件选中的两个原动作，以及需要比较速度的阵营。 */
    public record SpeedBranches(int leadingArt, int trailingArt, boolean compareEnemies) {}

    /** 毁灭之烬与迦娜按原阵营的最快实时速度选择动作，速度相等归入领先。 */
    public SpeedBranches battleSpeedBranches(int buffId) {
        boolean compareEnemies = openingLevelVariant(buffId, 1224201);
        if (!compareEnemies && !openingLevelVariant(buffId, 1084201)) {
            return null;
        }
        var buff = row("buff", buffId);
        int fastest = buffId + 100;
        int slower = buffId + (compareEnemies ? 200 : 300);
        int camp = compareEnemies ? 1 : 0;
        if (buff.path("type").asInt() != 244 || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals(fastest + "|" + slower + "|" + camp + "|0")) {
            throw new IllegalArgumentException("先手检查配置变化：" + buffId);
        }
        passiveTriggerEffects(fastest);
        passiveTriggerEffects(slower);
        return new SpeedBranches(fastest, slower, compareEnemies);
    }

    /** 非速度第一时有概率增加下次技能目标数，三档保留数量和各自的附加率。 */
    public int dailyExtraTargets(int buffId) {
        if (!openingLevelVariant(buffId, 1084501)) {
            return 0;
        }
        var buff = row("buff", buffId);
        int chance = switch (buffId) {
            case 1084501 -> 4000;
            case 1084502 -> 6000;
            default -> 10000;
        };
        if (buff.path("type").asInt() != 155 || buff.path("attach_percent").asInt() != chance
                || !buff.path("value").asString().equals("1|0|0|0")) {
            throw new IllegalArgumentException("临时目标数配置变化：" + buffId);
        }
        return 1;
    }

    /** 读取额外目标的基础命中概率，不在伤害动作内重抽。 */
    public double dailyExtraTargetChance(int buffId) {
        return row("buff", buffId).path("attach_percent").asInt() / 10000D;
    }

    /** 143 灵魂结界消失时，施加者自身的结界按技能等级触发原群体治疗。 */
    public int dailySoulWard(int buffId) {
        if (!openingLevelVariant(buffId, 4053301)) {
            return 0;
        }
        var buff = row("buff", buffId);
        int healingId = buffId + 100;
        if (buff.path("type").asInt() != 143 || buff.path("attach_percent").asInt() != 10000
                || buff.path("round").asInt() != 2 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals(healingId + "|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("灵魂结界配置变化：" + buffId);
        }
        var targets = battleTargets(healingId);
        if (!targets.selectors().equals(List.of(2, 4)) || targets.count() != 6 || !targets.values().isEmpty()) {
            throw new IllegalArgumentException("灵魂结界治疗目标配置变化：" + buffId);
        }
        battleHealing(healingId);
        return healingId;
    }

    /** 读取旧引爆的计算比例、攻击上限和状态类型，执行器使用原有符号计算。 */
    public record Detonation(int rate, int attackLimit, int type) {}

    /** 末日使者三档均只引爆目标现有诅咒，消耗状态后作为受攻击上限约束的固定伤害。 */
    public Detonation dailyDetonate(int buffId) {
        if (!openingLevelVariant(buffId, 5063401)) {
            return null;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 106 || buff.path("attach_percent").asInt() != 10000
                || buff.path("round").asInt() != 0 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals("10000|40000|1207|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("引爆配置变化：" + buffId);
        }
        return new Detonation(10000, 40000, 1207);
    }

    /** 感电技能施放后按等级附带封印，命中时禁止被动并执行本档降暴击。 */
    public boolean dailySeal(int buffId) {
        if (!openingLevelVariant(buffId, 4064201)) {
            return false;
        }
        var buff = row("buff", buffId);
        int child = buffId + 100;
        int chance = 3000 + (buffId - 4064201) * 1000;
        if (buff.path("type").asInt() != 1007 || buff.path("attach_percent").asInt() != chance
                || !immediateArts(buffId).stream().map(DamageArt::buffs).toList().equals(List.of(List.of(child)))
                || !battleDirectAttribute(child)) {
            throw new IllegalArgumentException("封印状态配置变化：" + buffId);
        }
        return true;
    }

    /** 预检整个治疗动作；仅接受必中的130号治疗和按治疗量生成的1008护盾，无后续动作，未知效果整组拒绝。 */
    public HeroBattleHealingExecutor.Plan battleHealing(int artId) {
        var art = row("buffart", artId);
        var effects = new ArrayList<HeroBattleHealingExecutor.Effect>();
        for (var id : mapper.readTree(art.path("buff_list").asString())) {
            var buff = row("buff", id.asInt());
            int type = buff.path("type").asInt();
            if ((type != 130 && type != 1008) || buff.path("attach_percent").asInt() != 10000
                || buff.path("effecttype").asInt() != 0
                || (type == 130 && buff.path("round").asInt() != 0)
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
                throw new IllegalArgumentException("治疗动作包含未支持效果：" + artId + "/" + id.asInt());
            }
            int rate = Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]);
            if (type == 1008 && rate == 0) {
                throw new IllegalArgumentException("当前护盾仅支持治疗量转换：" + id.asInt());
            }
            battleBuff(id.asInt());
            effects.add(new HeroBattleHealingExecutor.Effect(id.asInt(), rate));
        }
        if (effects.isEmpty()) {
            throw new IllegalArgumentException("治疗动作没有效果：" + artId);
        }
        return new HeroBattleHealingExecutor.Plan(battleTargets(artId), effects);
    }

    /**
     * 预检入场被动技能的自身监听安装链；当前只接受长期、必中的无冲突监听。
     * 整链效果必须为已支持治疗动作，护盾、清心或契约等不得按空效果安装。
     */
    public List<HeroBattleEventProcessor.Definition> battleHealingPassive(int skillId, int level) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || skill.path("active_type").asInt() != 0
            || skill.path("count_stats").asInt() != 0) {
            throw new IllegalArgumentException("不是已支持的治疗被动技能：" + skillId + ":" + level);
        }
        var definitions = new ArrayList<HeroBattleEventProcessor.Definition>();
        for (var id : mapper.readTree(skill.path("art_list").asString())) {
            var art = row("buffart", id.asInt());
            if (!battleTargets(id.asInt()).selectors().equals(List.of(1))
                || art.path("source_type").asInt() != 0) {
                throw new IllegalArgumentException("被动技能安装目标尚未支持");
            }
            for (var buffId : mapper.readTree(art.path("buff_list").asString())) {
                var buff = row("buff", buffId.asInt());
                if (buff.path("round").asInt() != 999 || buff.path("attach_percent").asInt() != 10000
                    || buff.path("conflict_type").asInt() != 0 || buff.path("effecttype").asInt() != 0) {
                    throw new IllegalArgumentException("被动监听持续/概率/冲突规则尚未支持");
                }
                var definition = battleTrigger(buffId.asInt());
                for (var next : definition.arts()) {
                    if (!isControlAttributeArt(next.id())) battleHealing(next.id());
                }
                definitions.add(definition);
            }
        }
        if (definitions.isEmpty()) {
            throw new IllegalArgumentException("被动技能没有可安装监听");
        }
        return List.copyOf(definitions);
    }

    /** 解析战斗效果的生命周期，包括怒气、免疫和死亡监听；移除副作用由执行器统一处理。 */
    public HeroBattleBuffState.Spec battleBuff(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (!Set.of(130, 1005, 1008, 171, 186, 206, 197, 172, 173, 170, 199, 200, 303, 304, 311, 1009, 1251,
                143, 145, 174, 175, 176, 177, 178, 179, 181, 182, 184, 187, 190, 194, 201, 185, 207, 208, 209, 1004,
                160, 166, 167, 1201, 1202, 1203, 1204, 1205, 1207, 1001, 1006, 1007, 1010, 1012, 1013, 1014, 234).contains(type)
                && !(type == 180 && (isCharmDeathListener(buffId) || isEveDeathListener(buffId)
                    || openingLevelVariant(buffId, 4054101) || sixLevelVariant(buffId, 5104101)
                    || isDreamlandDeathListener(buffId)))
                && !(type == 1206 && (openingLevelVariant(buffId, 3071701) || openingLevelVariant(buffId, 3234201)))
                && !(type == 1011 && openingLevelVariant(buffId, 3143401))
                && !untickedPlague(buffId)
                && !((type == 140 || type == 141 || type == 501) && isFixedBattleAttribute(buff))
                && !battleDebuffDamageMarker(buffId) && battleSoulMark(buffId).isEmpty()
                && !battleAngerStack(buffId) && !battleStatusImmunity(buffId)
                && towerDamageLimitRate(buffId) == 0 && !towerFixedRoundListener(buffId)
                && !((type == 231 || type == 235) && battleReactiveProtection(buffId) != null)
                && battleFlameShieldRate(buffId) == 0 && type != 163) {
            throw new IllegalArgumentException("Buff生命周期处理尚未支持：" + buffId);
        }
        if (type == 140 || type == 141 || type == 151 || type == 160 || type == 501) {
            controlAttribute(buffId);
        }
        if (type == 163) {
            openingHpPenalty(buffId);
        }
        if (type == 166) {
            battleAttackStealRate(buffId);
        }
        if (type == 1202) {
            frostSlowAmount(buffId);
        }
        if (type == 145) {
            forestMark(buffId);
        }
        return new HeroBattleBuffState.Spec(buffId, type, buff.path("round").asInt(),
            buff.path("dispelled").asInt() == 1, buff.path("effecttype").asInt(),
            buff.path("conflict_type").asInt(), buff.path("stacking_max").asInt(),
            type == 140 || type == 151 || type == 160 || type == 166 || type == 167 || type == 501 || type == 1202);
    }

    /** 当前模板真实职业和元素，用于装配战场，不从UI面板或调用方猜测。 */
    public record BattleIdentity(int element, int jobBonus) {
        /** 从职业伤害属性编号还原原模板职业，用于选择器和职业条件。 */
        public int job() {
            return jobBonus - 280;
        }
    }

    /** 根据旧herotype occupation/elem生成普通伤害所需身份。 */
    public BattleIdentity battleIdentity(int templateId) {
        var hero = row("herotype", templateId);
        int job = hero.path("occupation").asInt();
        int element = hero.path("elem").asInt();
        if (job < 1 || job > 5 || element < 1 || element > 5) {
            throw new IllegalArgumentException("战斗英雄身份配置无效");
        }
        return new BattleIdentity(element, 280 + job);
    }

    /** 解析禁止反击入口的100号伤害；只允许已核对的即时控制等子链，其他下游拒绝。 */
    public int battleOrdinaryDamageRate(int buffId) {
        return battleOrdinaryDamageRate(buffId, false);
    }

    /** 完整后置入口可允许反击和旧版分段概率；独立扣血仍禁止绕过动作生命周期。 */
    public int battleOrdinaryDamageRate(int buffId, boolean allowCounterattack) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        boolean supportedChance = chance == 10000 || (allowCounterattack
            && ((buffId == 2072301 && chance == 5000) || (buffId == 2072302 && chance == 7000)
                || (isJannaOptionalStrike(buffId) && chance == 5000 && values.length == 4
                    && values[1].equals("1") && values[2].equals("0") && values[3].equals("0"))));
        if (buff.path("type").asInt() != 100 || !supportedChance
            || values.length < 2 || (!values[1].equals("1") && !allowCounterattack)
            || (!mapper.readTree(buff.path("art_list").asString()).isEmpty() && !nanakoDamageChain(buffId)
                && !nanakoCriticalChain(buffId) && !battleDamageFollowup(buffId))) {
            throw new IllegalArgumentException("普通伤害配置的反击或后续动作尚未支持：" + buffId);
        }
        return Integer.parseInt(values[0]);
    }

    /** 仅允许已核对奈奈子223320x的降攻→职业筛选→额外伤害子链，其他子动作仍拒绝。 */
    public boolean nanakoDamageChain(int buffId) {
        if (buffId < 2233201 || buffId > 2233203) return false;
        int level = buffId - 2233200;
        for (int stage : List.of(2233200, 2233300, 2233400)) {
            int expected = stage + 100 + level;
            var children = mapper.readTree(row("buff", stage + level).path("art_list").asString());
            var effects = mapper.readTree(row("buffart", expected).path("buff_list").asString());
            if (children.size() != 1 || children.get(0).asInt() != expected
                || effects.size() != 1 || effects.get(0).asInt() != expected
                || !battleTargets(expected).selectors().isEmpty()) {
                throw new IllegalArgumentException("奈奈子子链配置变化");
            }
        }
        if (row("buff", 2233400 + level).path("type").asInt() != 212
            || !row("buff", 2233400 + level).path("value").asString().equals("1|0|0|0")) {
            throw new IllegalArgumentException("奈奈子职业条件变化");
        }
        controlAttribute(2233300 + level);
        battleOrdinaryDamageRate(2233500 + level, true);
        return true;
    }

    /** 奈奈子一技能前两级追加概率为零，第三级暴击后重选最高攻击目标并追加自身普攻。 */
    public boolean nanakoCriticalChain(int buffId) {
        if (buffId < 2231301 || buffId > 2231303) {
            return false;
        }
        int childId = buffId + 100;
        var children = mapper.readTree(row("buff", buffId).path("art_list").asString());
        var effects = mapper.readTree(row("buffart", childId).path("buff_list").asString());
        var child = row("buff", childId);
        if (children.size() != 1 || children.get(0).asInt() != childId
            || effects.size() != 1 || effects.get(0).asInt() != childId
            || !battleTargets(childId).selectors().isEmpty()
            || child.path("type").asInt() != 224 || child.path("attach_percent").asInt() != (buffId == 2231303 ? 10000 : 0)) {
            throw new IllegalArgumentException("奈奈子暴击子链配置变化：" + buffId);
        }
        var next = mapper.readTree(child.path("art_list").asString());
        if (next.size() != 1 || next.get(0).asInt() != childId + 100
            || !isGeneralCounterattackArt(childId + 100)) {
            throw new IllegalArgumentException("奈奈子暴击追加动作变化");
        }
        battleTargets(childId + 100);
        return true;
    }

    /** 一技能已核对的先降护甲效果，保持与后续伤害的原配置顺序。 */
    public boolean nanakoArmorDebuff(int buffId) {
        if (buffId < 2231201 || buffId > 2231203) {
            return false;
        }
        controlAttribute(buffId);
        var buff = row("buff", buffId);
        if (buff.path("attach_percent").asInt() != 10000
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("奈奈子降护甲配置变化：" + buffId);
        }
        return true;
    }

    /** 预检已接入的固定属性动作，包括技能伤害、攻击、护甲、穿甲、暴击、命中和速度。 */
    public boolean battleDirectAttribute(int buffId) {
        if (nanakoArmorDebuff(buffId)) {
            return true;
        }
        if (buffId >= 1111401 && buffId <= 1111403) {
            charmArmorAttribute(buffId);
            return true;
        }
        var buff = row("buff", buffId);
        if (isFixedBattleAttribute(buff)) {
            controlAttribute(buffId);
            return true;
        }
        return false;
    }

    /** 读取旧 166 固定攻击偷取比例；返回万分比，由执行器折算实际数值并在移除时归还。 */
    public int battleAttackStealRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 166) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int rate = Integer.parseInt(values[0]);
        if (values.length != 4 || rate <= 0 || rate > 10000
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("round").asInt() <= 0 || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != 0 || buff.path("effecttype").asInt() != 0
                || buff.path("conflict_type").asInt() <= 0 || buff.path("stacking_max").asInt() != 10
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("攻击偷取含未核对参数：" + buffId);
        }
        return rate;
    }

    /** 按旧111140x配置读取203破甲万分比；不泛化为任意160号增益或条件属性。 */
    private ControlAttributeDefinition charmArmorAttribute(int buffId) {
        var buff = row("buff", buffId);
        var art = row("buffart", buffId);
        if (buff.path("type").asInt() != 160 || buff.path("round").asInt() != 2
            || buff.path("attach_percent").asInt() != 10000
            || !buff.path("value").asString().equals("203|2500|0|0")
            || buff.path("effecttype").asInt() != 1
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
            || !art.path("target").asString().equals("[1]")
            || art.path("source_type").asInt() != 0
            || !art.path("buff_list").asString().equals("[" + buffId + "]")) {
            throw new IllegalArgumentException("魅惑之拥破甲增益配置变化：" + buffId);
        }
        return new ControlAttributeDefinition(buffId, 203, 2500, 2);
    }

    /** 已核对降攻自身概率，单位为0至1的小数，不与主伤害命中率合并。 */
    public double nanakoDebuffRate(int level) {
        if (level < 1 || level > 3) throw new IllegalArgumentException("奈奈子技能等级无效");
        return row("buff", 2233300 + level).path("attach_percent").asInt() / 10000D;
    }

    /** 读取旧value[1]反击资格；仅在伤害配置已经校验后使用。 */
    public boolean damageAllowsCounterattack(int buffId) {
        if (battleExecutionDamage(buffId) != null) {
            return true;
        }
        return !row("buff", buffId).path("value").asString().split("\\|", -1)[1].equals("1");
    }

    /** 缚魂者的两段斩杀。伤害倍率、已损生命倍率、血量下限与攻击封顶均为万分比。 */
    public record ExecutionDamage(int attackRate, int missingHpRate, int minimumHpRate, int attackLimit) {}

    /** 读取旧 type 110 的两段伤害，校验各自的触发、继承与后续动作配置。 */
    public ExecutionDamage battleExecutionDamage(int buffId) {
        if (!sixLevelVariant(buffId, 5103201) && !sixLevelVariant(buffId, 5103301)) {
            return null;
        }
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        if (values.length != 4 || buff.path("type").asInt() != 110 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("斩杀配置变化：" + buffId);
        }
        var damage = new ExecutionDamage(Integer.parseInt(values[0]), Integer.parseInt(values[1]),
                Integer.parseInt(values[2]), Integer.parseInt(values[3]));
        if (damage.attackRate() <= 0 || damage.missingHpRate() < 0 || damage.minimumHpRate() < 0
                || damage.minimumHpRate() > 10000 || damage.attackLimit() <= 0) {
            throw new IllegalArgumentException("斩杀倍率无效：" + buffId);
        }
        return damage;
    }

    /** 旧 type 242 会记录临时实例，但其处理器的属性与触发回调为空，原关联子动作不执行。 */
    public boolean battleDebuffDamageMarker(int buffId) {
        if (!openingLevelVariant(buffId, 5101201)) {
            return false;
        }
        var buff = row("buff", buffId);
        var children = immediateArts(buffId);
        int child = buffId + 100;
        if (buff.path("type").asInt() != 242 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals("0|0|0|0") || children.size() != 1
                || children.getFirst().targets().artId() != child
                || !children.getFirst().targets().selectors().equals(List.of(1))
                || !children.getFirst().buffs().equals(List.of(child)) || onceDamageAttribute(child).attribute() != 270) {
            throw new IllegalArgumentException("缚魂者临时标记配置变化：" + buffId);
        }
        return true;
    }

    /** 配置附加概率先于伤害命中；仅在当前伤害类型已预检后读取。 */
    public double ordinaryDamageChance(int buffId) {
        return row("buff", buffId).path("attach_percent").asInt() / 10000D;
    }

    /** 本批只开放冰晶女巫已核对的直接治疗，其他英雄治疗链仍按原边界拒绝。 */
    public boolean battleDirectHealing(int buffId) {
        return buffId >= 2031301 && buffId <= 2031303;
    }

    /** 按旧130和131号动作读取治疗比例；最大生命与攻击分别使用施加者实时值。 */
    public record AttackHealing(int rate, double chance, boolean followup, boolean maximumHp) {}

    /** 读取攻击或自身生命上限比例治疗，以及圣光精灵各档治疗后的独立选目标。 */
    public AttackHealing attackHealing(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (type != 130 && type != 131) {
            return null;
        }
        var value = buff.path("value").asString().split("\\|", -1);
        var arts = mapper.readTree(buff.path("art_list").asString());
        int chance = buff.path("attach_percent").asInt();
        if (value.length != 4 || !value[1].equals("0") || !value[2].equals("0") || !value[3].equals("0")
                || Integer.parseInt(value[0]) <= 0 || chance < 0 || chance > 10000
                || buff.path("copy_target").asInt() != 0 || arts == null || !arts.isArray()
                || (!arts.isEmpty() && (type != 130 || !isLightSpiritHealingFollowup(buffId)))) {
            throw new IllegalArgumentException("比例治疗含未支持形式：" + buffId);
        }
        return new AttackHealing(Integer.parseInt(value[0]), chance / 10000D, !arts.isEmpty(), type == 131);
    }

    /** 读取 1008 的伤害换盾比例，治疗比例优先；生命和攻击比例只在无伤害比例时生效。 */
    public int battleDamageShieldRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1008) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        if (values.length != 4) {
            throw new IllegalArgumentException("护盾缺少原换算参数：" + buffId);
        }
        int rate = Integer.parseInt(values[1]);
        if (!values[0].equals("0") || rate == 0) {
            // 治疗、生命和攻击换盾由各自入口负责，避免重复装盾。
            return 0;
        }
        if (rate < 0 || buff.path("round").asInt() < 1 || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != 0 || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("伤害换盾的期限或附加规则尚未支持：" + buffId);
        }
        battleBuff(buffId);
        return rate;
    }

    /** 圣光精灵治疗后重新选择血量比例最低的一或两名队友，保留各档护甲、抗暴与火灵守护。 */
    private boolean isLightSpiritHealingFollowup(int buffId) {
        if (buffId < 3071201 || buffId > 3071203) {
            return false;
        }
        var actions = immediateArts(buffId);
        if (actions.size() != 1) {
            return false;
        }
        var action = actions.getFirst();
        var targets = action.targets();
        int armor = buffId + 200;
        int criticalResistance = buffId + 300;
        int protection = buffId + 400;
        return targets.artId() == armor && targets.selectors().equals(List.of(2, 4, 11))
            && targets.count() == (buffId == 3071201 ? 1 : 2) && targets.values().isEmpty()
            && action.buffs().equals(List.of(armor, criticalResistance, protection))
            && battleDirectAttribute(armor)
            && (dormantGoldStageThreeEffect(criticalResistance) || battleDirectAttribute(criticalResistance))
            && battleReactiveProtection(protection) != null;
    }

    /** 已核对的庇护转移比例或火灵反击概率，比例均为万分比，后者保存施加烈火的配置编号。 */
    public record ReactiveProtection(int type, int rate, int retaliationId) {}

    /** 萝莫拉三档护盾在有效受击后按万分比反弹原始伤害，其他配置返回 0。 */
    public int battleFlameShieldRate(int buffId) {
        if (!openingLevelVariant(buffId, 3203201)) {
            return 0;
        }
        var buff = row("buff", buffId);
        int rate = 1000 + (buffId - 3203201) * 500;
        if (buff.path("type").asInt() != 232 || buff.path("round").asInt() != 3
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || buff.path("effecttype").asInt() != 0 || !buff.path("value").asString().equals(rate + "|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("萝莫拉烈焰护盾配置变化：" + buffId);
        }
        return rate;
    }

    /** 乃音 237 按本档攻击比例治疗，超出原目标缺失生命的部分转换为对应 1008 护盾。 */
    public record OverflowHealing(int attackRate, int shieldId) {}

    /** 逐档预检溢出治疗及对应护盾配置，其他编号由各自规则处理。 */
    public OverflowHealing battleOverflowHealing(int buffId) {
        if (!openingLevelVariant(buffId, 2143301)) {
            return null;
        }
        int attackRate = switch (buffId) {
            case 2143301 -> 9000;
            case 2143302 -> 10800;
            default -> 13000;
        };
        int shieldId = buffId + 300;
        var buff = row("buff", buffId);
        var shield = row("buff", shieldId);
        if (buff.path("type").asInt() != 237 || buff.path("round").asInt() != 2
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals(attackRate + "|" + shieldId + "|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || shield.path("type").asInt() != 1008 || shield.path("round").asInt() != 2
                || shield.path("attach_percent").asInt() != 10000 || shield.path("copy_target").asInt() != 0
                || !shield.path("value").asString().equals("0|0|0|0")
                || !mapper.readTree(shield.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("乃音溢出治疗配置变化：" + buffId);
        }
        battleBuff(shieldId);
        return new OverflowHealing(attackRate, shieldId);
    }

    /** 金妮三档223均要求目标实时速度较低，任一目标符合时按该档执行一次自身伤害增益。 */
    public boolean battleLowerSpeedCondition(int buffId) {
        if (!openingLevelVariant(buffId, 1153201)) {
            return false;
        }
        var buff = row("buff", buffId);
        var arts = immediateArts(buffId);
        int bonusId = buffId + 100;
        if (buff.path("type").asInt() != 223 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals("101|0|0|0")
                || arts.size() != 1 || arts.getFirst().targets().artId() != bonusId
                || !arts.getFirst().targets().selectors().equals(List.of(1))
                || arts.getFirst().targets().count() != 0 || !arts.getFirst().targets().values().isEmpty()
                || !arts.getFirst().buffs().equals(List.of(bonusId)) || onceDamageAttribute(bonusId).attribute() != 270) {
            throw new IllegalArgumentException("金妮速度条件配置变化：" + buffId);
        }
        return true;
    }

    /** 核对烈焰骑士、亚瑟的各级分伤，以及火灵守护的反击概率与烈火编号。 */
    public ReactiveProtection battleReactiveProtection(int buffId) {
        boolean flameGuard = openingLevelVariant(buffId, 3071601);
        if (!flameGuard && !openingLevelVariant(buffId, 1071201) && !openingLevelVariant(buffId, 2093201)) {
            return null;
        }
        var buff = row("buff", buffId);
        int type = flameGuard ? 235 : 231;
        int rate = switch (buffId) {
            case 1071201, 1071202 -> 4000;
            case 3071603 -> 8000;
            default -> 5000;
        };
        int retaliationId = flameGuard ? buffId + 100 : 0;
        String values = rate + "|" + retaliationId + "|0|0";
        if (buff.path("type").asInt() != type || buff.path("round").asInt() != (flameGuard ? 1 : 2)
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || buff.path("effecttype").asInt() != (flameGuard ? 1 : 0)
                || !buff.path("value").asString().equals(values)
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("已核对的庇护或火灵守护配置变化：" + buffId);
        }
        if (flameGuard) {
            var retaliation = row("buffart", retaliationId);
            var targets = battleTargets(retaliationId);
            if (retaliation.path("source_type").asInt() != 0 || !targets.selectors().isEmpty()
                    || targets.count() != 0 || !targets.values().isEmpty()
                    || !mapper.readTree(retaliation.path("buff_list").asString())
                        .equals(mapper.createArrayNode().add(retaliationId))
                    || attackDamageOverTime(retaliationId) == null) {
                throw new IllegalArgumentException("火灵守护的烈火后续配置变化：" + buffId);
            }
        }
        return new ReactiveProtection(type, rate, retaliationId);
    }

    /** 读取 132 号已核对的伤害转疗比例，保留各配置的实际时效及施加方式。 */
    public int battleDamageHealingRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 132) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        boolean criticalHealing = openingLevelVariant(buffId, 3204201);
        int duration = buffId == 3083903 || criticalHealing || buffId == 4091603 || buffId == 1135403 ? 0 : 1;
        if (buff.path("round").asInt() != duration || buff.path("attach_percent").asInt() != 10000
                || buff.path("effecttype").asInt() != 0 || buff.path("life").asInt() != (criticalHealing ? 1 : 0)
                || buff.path("copy_target").asInt() != 0 || buff.path("conflict_type").asInt() != 0
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || values.length != 4 || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")) {
            throw new IllegalArgumentException("伤害转治疗包含未支持形式：" + buffId);
        }
        int rate = Integer.parseInt(values[0]);
        if (rate <= 0) {
            throw new IllegalArgumentException("伤害转治疗比例必须为正：" + buffId);
        }
        return rate;
    }

    /** 一个已预检的伤害/控制/属性动作，保留选目标、参数和Buff顺序。 */
    public record DamageArt(HeroBattleTargetUtils.Plan targets, List<Integer> buffs) {}

    /** 原 154 的复活攻击倍率与目标仍存活时触发的低血量队友治疗。 */
    public record Resurrection(int attackRate, DamageArt onLiving) {}

    /** 已核对的150号自体重生为最大生命百分比；非此类型返回0。 */
    public int battleSelfRebirthRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 150) {
            return 0;
        }
        int rate = switch (buffId) {
            case 3233301 -> 2500;
            case 3233302 -> 3500;
            case 3233303 -> 5500;
            case 5074301 -> 2000;
            case 5074302 -> 3000;
            case 5074303 -> 3500;
            default -> 0;
        };
        if (rate == 0 || !buff.path("value").asString().equals(rate + "|0|0|0")
                || buff.path("attach_percent").asInt() != 10000 || buff.path("round").asInt() != 0
                || buff.path("copy_target").asInt() != 0 || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("自体重生配置尚未核对：" + buffId);
        }
        return rate;
    }

    /** 森林之主和莫露可各档在死亡监听中消费自身重生次数，允许在生命归零时执行。 */
    public static boolean isDreamlandRebirthLimit(int buffId) {
        return openingLevelVariant(buffId, 3233201) || openingLevelVariant(buffId, 5074201);
    }

    /** 预检琪亚娜旧复活分支及其实际治疗子动作。其他类型返回 null。 */
    public Resurrection battleResurrection(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 154) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("round").asInt() != 0 || buff.path("attach_percent").asInt() != 10000
                || buff.path("effecttype").asInt() != 0 || buff.path("copy_target").asInt() != 0
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || values.length != 4 || !values[2].equals("0") || !values[3].equals("0")) {
            throw new IllegalArgumentException("复活配置含未接通效果：" + buffId);
        }
        int rate = Integer.parseInt(values[0]);
        int artId = Integer.parseInt(values[1]);
        var fallback = row("buffart", artId);
        var plan = battleTargets(artId);
        var child = mapper.readTree(fallback.path("buff_list").asString());
        if (rate <= 0 || fallback.path("source_type").asInt() != 0 || !plan.selectors().equals(List.of(2, 4, 11))
                || plan.count() != 1 || !child.isArray() || child.size() != 1
                || attackHealing(child.get(0).asInt()) == null) {
            throw new IllegalArgumentException("复活的存活治疗分支尚未核对：" + buffId);
        }
        return new Resurrection(rate, new DamageArt(plan, List.of(child.get(0).asInt())));
    }

    /** 预检真实技能的效果和演出，包括怒气追加、先手标记及一次性属性。 */
    public List<DamageArt> damageSkillArts(HeroBattleSkillUtils.Skill skill) {
        var config = skills.get(skill.skillId() + ":" + skill.level());
        if (config == null || !Set.of(1, 2).contains(config.path("active_type").asInt())) {
            throw new IllegalArgumentException("当前只接入真实普通或主动伤害技能");
        }
        var result = new ArrayList<DamageArt>();
        for (var id : mapper.readTree(config.path("art_list").asString())) {
            var art = row("buffart", id.asInt());
            var ids = new ArrayList<Integer>();
            for (var buff : mapper.readTree(art.path("buff_list").asString())) {
                if (inertBattleEffect(buff.asInt()) || battleFirstSkillMarker(buff.asInt())) {
                    continue;
                }
                if (!battleProjectile(buff.asInt())) {
                    if (row("buff", buff.asInt()).path("type").asInt() < 100) {
                        throw new IllegalArgumentException("技能表现动作尚未支持：" + buff.asInt());
                    }
                    if (battleDirectHealing(buff.asInt())) {
                        battleHealing(buff.asInt() - 100);
                    } else if (battleRoundListener(buff.asInt())) {
                        battleTrigger(buff.asInt());
                    } else if (!battleDizzy(buff.asInt()) && !battleFrozen(buff.asInt()) && attackDamageOverTime(buff.asInt()) == null && !battleDirectAttribute(buff.asInt()) && !battleSimpleControl(buff.asInt())
                            && battleDispelDamage(buff.asInt()) == null && battleSoulMark(buff.asInt()).isEmpty()
                            && !battleSoulMarkDeathListener(buff.asInt())
                            && !battleJobCondition(buff.asInt()) && !battleStatusCondition(buff.asInt()) && !dailyDungeonCondition(buff.asInt())
                            && !battleLowerSpeedCondition(buff.asInt()) && battleOverflowHealing(buff.asInt()) == null
                            && battleFlameShieldRate(buff.asInt()) == 0
                            && !battleOnceAttribute(buff.asInt()) && battleRandomArt(buff.asInt()) == null
                            && battleArtSelection(buff.asInt()) == null && !towerFixedRoundListener(buff.asInt())
                            && dailySoulWard(buff.asInt()) == 0 && dailyDetonate(buff.asInt()) == null
                            && !battleBlockShield(buff.asInt())
                            && battleReactiveProtection(buff.asInt()) == null
                            && battleDebuffRemovalCount(buff.asInt()) < 0 && battleGainRemovalChance(buff.asInt()) == 0D
                            && jannaGainStealLimit(buff.asInt()) == 0
                            && battleDamageHealingRate(buff.asInt()) == 0
                            && attackHealing(buff.asInt()) == null && battleResurrection(buff.asInt()) == null
                            && battleAttackStealRate(buff.asInt()) == 0 && battleExecutionDamage(buff.asInt()) == null
                            && !battleDebuffDamageMarker(buff.asInt()) && !battleStatusImmunity(buff.asInt())
                            && !battleControlDispel(buff.asInt()) && battleAngerStrike(buff.asInt()) == null) {
                        battleOrdinaryDamageRate(buff.asInt(), true);
                    }
                }
                ids.add(buff.asInt());
            }
            if (ids.isEmpty()) throw new IllegalArgumentException("普通攻击动作没有效果");
            result.add(new DamageArt(battleTargets(id.asInt()), List.copyOf(ids)));
        }
        if (result.isEmpty()) throw new IllegalArgumentException("普通攻击技能没有动作");
        return List.copyOf(result);
    }

    /** 已核实的奈奈子控制增益动作白名单，不放开其他属性动作。 */
    public boolean isControlAttributeArt(int artId) {
        return artId >= 2234301 && artId <= 2234303;
    }

    /** 识别必须在开场安装的实际战斗被动，包括提米的团队死亡监听。 */
    public static boolean usesOpeningBattlePassive(int skillId) {
        return skillId == 102050234 || skillId == 102050214 || skillId == 101050224
            || skillId == 101050113 || skillId == 103050094
            || skillId == 103050154 || skillId == 104050074 || skillId == 105050104
            || usesPositionPassive(skillId)
            || isDailyDungeonPassive(skillId)
            || isTowerPassive(skillId)
            || dreamlandReactionListener(skillId) != 0
            || progressionPassiveMaxLevel(skillId) > 0;
    }

    /** 识别同一技能族的连续六档编号。具体效果和下游由调用处预检。 */
    private static boolean sixLevelVariant(int id, int firstId) {
        return id >= firstId && id < firstId + 6;
    }

    /** 缚魂者四技能安装敌方死亡监听和自身普攻、技能伤害监听。 */
    private List<DamageArt> soulBinderPassiveArts(int level) {
        var skill = skills.get("105050104:" + level);
        int death = 5104100 + level;
        int attack = 5104400 + level;
        int active = 5104500 + level;
        int mark = 5104600 + level;
        if (!sixLevelVariant(death, 5104101) || skill == null || skill.path("active_type").asInt() != 0
                || !mapper.readTree(skill.path("art_list").asString()).equals(mapper.createArrayNode().add(death).add(attack))) {
            throw new IllegalArgumentException("缚魂者被动配置变化：" + level);
        }
        var deathArt = immediateArt(death, death);
        var attackArt = immediateArt(attack, attack);
        if (!deathArt.targets().selectors().equals(List.of(3, 4)) || deathArt.targets().count() != 6
                || !deathArt.buffs().equals(List.of(death)) || !attackArt.targets().selectors().equals(List.of(1))
                || !attackArt.buffs().equals(List.of(attack, active))) {
            throw new IllegalArgumentException("缚魂者被动目标变化：" + level);
        }
        validateSoulBinderListener(death, 180, death + 100);
        validateSoulBinderListener(attack, 181, mark);
        validateSoulBinderListener(active, 182, mark);
        if (soulBinderDeathHealing(death + 100).isEmpty() || !passiveTriggerEffects(mark).equals(List.of(mark))
                || !battleTargets(mark).selectors().isEmpty()) {
            throw new IllegalArgumentException("缚魂者被动缺少实际效果：" + level);
        }
        return List.of(deathArt, attackArt);
    }

    /** 被动监听以原施加者执行子动作，空选择器沿用事件携带者或受击者。 */
    private void validateSoulBinderListener(int buffId, int type, int child) {
        var spec = battleBuff(buffId);
        var buff = row("buff", buffId);
        if (spec.type() != type || spec.duration() != 999 || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != 1 || !buff.path("value").asString().equals("0|0|0|0")
                || !battleTrigger(buffId).arts().equals(List.of(new HeroBattleEventProcessor.Art(child, 0, false)))) {
            throw new IllegalArgumentException("缚魂者监听下游变化：" + buffId);
        }
    }

    /** 读取死亡印记条件的团队治疗动作，其他监听不走这一分支。 */
    public List<DamageArt> soulBinderDeathHealing(int artId) {
        if (!sixLevelVariant(artId, 5104201)) {
            return List.of();
        }
        var condition = immediateArt(artId, artId);
        var buff = row("buff", artId);
        var healing = immediateArts(artId);
        if (!condition.targets().selectors().isEmpty() || !condition.buffs().equals(List.of(artId))
                || buff.path("type").asInt() != 215 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || !buff.path("value").asString().equals("140|0|0|0")
                || healing.size() != 1 || !healing.getFirst().targets().selectors().equals(List.of(2, 4))
                || healing.getFirst().targets().count() != 6 || !healing.getFirst().buffs().equals(List.of(artId + 100))
                || attackHealing(artId + 100) == null) {
            throw new IllegalArgumentException("死亡印记治疗动作变化：" + artId);
        }
        return healing;
    }

    /** 塔守军本批需要的三个入场被动，其中利姆同时含已计入面板的永久属性。 */
    private static boolean isTowerPassive(int skillId) {
        return skillId == 104050092 || skillId == 105050072 || skillId == 105050143;
    }

    /** 核验塔、梦境和试炼共用的三档入场被动，按等级保留原安装对象和下游效果。 */
    private List<DamageArt> openingTowerPassiveArts(int skillId, int level) {
        var skill = skills.get(skillId + ":" + level);
        int activeType = skillId == 105050143 ? 3 : 0;
        int countStats = skillId == 104050092 ? 1 : 0;
        if (skill == null || level < 1 || level > 3 || skill.path("active_type").asInt() != activeType
                || skill.path("count_stats").asInt() != countStats) {
            throw new IllegalArgumentException("幻境之塔入场被动等级或类型未核对：" + skillId + ":" + level);
        }
        var arts = mapper.readTree(skill.path("art_list").asString());
        if (arts.size() != 1) {
            throw new IllegalArgumentException("幻境之塔入场被动应有一个安装动作：" + skillId);
        }
        int artId = arts.get(0).asInt();
        var art = row("buffart", artId);
        var targets = battleTargets(artId);
        var expectedTargets = activeType == 3 ? List.of(2, 4) : List.of(1);
        if (!targets.selectors().equals(expectedTargets) || art.path("source_type").asInt() != 0) {
            throw new IllegalArgumentException("幻境之塔入场被动安装目标变更：" + artId);
        }
        var listeners = new ArrayList<Integer>();
        for (var id : mapper.readTree(art.path("buff_list").asString())) {
            int buffId = id.asInt();
            var buff = row("buff", buffId);
            int type = buff.path("type").asInt();
            if (countStats == 1 && type == 160) {
                validatePanelAttribute(buffId);
                continue;
            }
            int expectedType = switch (skillId) {
                case 104050092 -> 240;
                case 105050072 -> 181;
                case 105050143 -> 174;
                default -> throw new IllegalArgumentException("未知塔入场被动：" + skillId);
            };
            if (type != expectedType || buff.path("round").asInt() != 999 || openingBuffChance(buffId) != 1D) {
                throw new IllegalArgumentException("幻境之塔入场被动监听配置变更：" + buffId);
            }
            battleBuff(buffId);
            battleTrigger(buffId).arts().forEach(child -> {
                if (passiveTriggerEffects(child.id()).isEmpty()) {
                    throw new IllegalArgumentException("幻境之塔入场被动下游未接入：" + child.id());
                }
            });
            listeners.add(buffId);
        }
        if (listeners.size() != 1) {
            throw new IllegalArgumentException("幻境之塔入场被动应有一个监听：" + skillId);
        }
        return List.of(new DamageArt(targets, List.copyOf(listeners)));
    }

    /** 日常副本先接入的战斗被动，梦境和试炼的同名技能沿同一处理规则。 */
    private static boolean isDailyDungeonPassive(int skillId) {
        return switch (skillId) {
            case 101040043, 101040053, 101050074, 101050084, 102030032, 102040043, 102040053, 103020022,
                103030033, 103040042, 103040043, 103040053, 103050074, 104040023, 104040033,
                104050042, 104050044, 104050054, 104050064, 105030013, 105040023, 105050044, 105050064 -> true;
            default -> false;
        };
    }

    /** 核验三档已恢复的入场技能，外来监听仍由旧表指定的敌方英雄携带。 */
    private List<DamageArt> dailyDungeonPassiveArts(int skillId, int level) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level < 1 || level > 3 || skill.path("active_type").asInt() != (skillId == 103050074 ? 3 : 0)) {
            throw new IllegalArgumentException("未核对的日常副本被动等级：" + skillId + ":" + level);
        }
        var result = new ArrayList<DamageArt>();
        for (var art : mapper.readTree(skill.path("art_list").asString())) {
            int artId = art.asInt();
            var selectors = battleTargets(artId);
            var buffs = new ArrayList<Integer>();
            if (row("buffart", artId).path("source_type").asInt() != 0 || !selectors.values().isEmpty()
                    || (!selectors.selectors().equals(List.of(1)) && !selectors.selectors().equals(List.of(3, 4)))) {
                throw new IllegalArgumentException("日常副本被动目标尚未核对：" + artId);
            }
            for (var id : mapper.readTree(row("buffart", artId).path("buff_list").asString())) {
                int buffId = id.asInt();
                if (battleOrdinaryReplacement(buffId, level) != null) {
                    buffs.add(buffId);
                    continue;
                }
                battleBuff(buffId);
                if (battlePeriodicRecovery(buffId) != null || battleDirectAttribute(buffId)) {
                    buffs.add(buffId);
                    continue;
                }
                var trigger = battleTrigger(buffId);
                if (trigger.arts().isEmpty()) {
                    throw new IllegalArgumentException("日常副本被动无触发动作：" + buffId);
                }
                for (var child : trigger.arts()) {
                    if (passiveTriggerEffects(child.id()).isEmpty()) {
                        throw new IllegalArgumentException("日常副本被动子动作尚未支持：" + child.id());
                    }
                }
                buffs.add(buffId);
            }
            result.add(new DamageArt(selectors, List.copyOf(buffs)));
        }
        return List.copyOf(result);
    }

    /** 303按累计持续伤害的万分比治疗己方，304在敌方记录伤害；其他效果不读取此配置。 */
    public record PeriodicRecovery(int type, int rate) {}

    /** 核对圣光精灵各等级的独立记录与治疗状态；旧处理器只读取值首项。 */
    public PeriodicRecovery battlePeriodicRecovery(int buffId) {
        boolean heal = openingLevelVariant(buffId, 3074201);
        if (!heal && !openingLevelVariant(buffId, 3074101)) {
            return null;
        }
        var buff = row("buff", buffId);
        int type = heal ? 303 : 304;
        int rate = heal ? switch (buffId) {
            case 3074201 -> 1800;
            case 3074202 -> 2300;
            default -> 3300;
        } : 0;
        String expected = heal ? rate + "|20000|0|0" : "0|0|0|0";
        if (buff.path("type").asInt() != type || buff.path("round").asInt() != 100
                || buff.path("attach_percent").asInt() != 10000 || !buff.path("value").asString().equals(expected)
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("持续伤害治疗配置变化：" + buffId);
        }
        return new PeriodicRecovery(type, rate);
    }

    /** 返回入场效果的原安装概率；普攻监听在安装时一次性判定。 */
    public double openingBuffChance(int buffId) {
        int rate = row("buff", buffId).path("attach_percent").asInt();
        if (rate <= 0) {
            throw new IllegalArgumentException("入场效果概率无效：" + buffId);
        }
        return Math.min(1D, rate / 10000D);
    }

    /** 返回已核对的入场被动最高等级，包括晓的受击怒气监听，下游仍须单独预检。 */
    private static int progressionPassiveMaxLevel(int skillId) {
        return switch (skillId) {
            case 101050062, 101050063, 101050093, 101050094, 102040132,
                102050063, 102050072, 102050074, 102050083, 102050084, 102050114, 102050153, 102050154,
                103040122, 103050063, 103050082, 103050084, 103050092, 103050104, 103050113, 103050182,
                101050134, 101050143, 101050144, 101050154, 101050182, 101050183, 101050192, 101050193,
                101050204, 102050094, 102050103, 102050104, 102050144, 102050183, 102050184, 102050193,
                102050194, 102050204, 102050224, 103050132, 103050134, 103050144, 103050152, 103050183, 103050192,
                103050214, 103050224, 103050234, 104050083, 104050093, 104050094, 104050104, 104050144, 105040032,
                105040033, 105050042, 105050054, 105050073, 105050094, 105050114, 105050144 -> 3;
            case 101040123, 101040163, 101040173, 102040123, 102040163,
                103040123, 103040163, 103040173, 104040123,
                105040123, 105040133, 105050083,
                500010001, 500020001 -> 1;
            case 300100001, 300200001, 300300001, 300400001 -> 5;
            case 101050214 -> 6;
            default -> 0;
        };
    }

    /** 识别同族连续三档的配置编号，参数必须为该族一级编号，不能跨到下一组动作。 */
    private static boolean openingLevelVariant(int id, int firstLevelId) {
        return id >= firstLevelId && id <= firstLevelId + 2;
    }

    /** 已核对的站位被动共享同一种213条件，其他开场条件需要单独核对下游。 */
    private static boolean usesPositionPassive(int skillId) {
        return skillId == 103040052 || skillId == 103040162 || skillId == 103040172;
    }

    /** 解析并预检开场被动的安装及触发动作，保持配置顺序。 */
    public List<DamageArt> openingPassiveArts(int skillId, int level) {
        if (skillId == 105050104) {
            return soulBinderPassiveArts(level);
        }
        if (skillId == 103050154 || skillId == 104050074) {
            return openingDeathOrAttackListenerArts(skillId, level);
        }
        if (skillId == 102050214 || skillId == 101050224) {
            return openingRoundPassiveArts(skillId, level);
        }
        if (isTowerPassive(skillId)) {
            return openingTowerPassiveArts(skillId, level);
        }
        if (isDailyDungeonPassive(skillId)) {
            return dailyDungeonPassiveArts(skillId, level);
        }
        if (skillId == 101050113) {
            return charmDeathPassiveArts(level);
        }
        if (skillId == 103050094) {
            return eveDeathPassiveArts(level);
        }
        int reaction = dreamlandReactionListener(skillId);
        if (reaction != 0) {
            return dreamlandReactionArts(skillId, level, reaction);
        }
        int progressionMaxLevel = progressionPassiveMaxLevel(skillId);
        if (progressionMaxLevel > 0) {
            return openingProgressionPassiveArts(skillId, level, progressionMaxLevel);
        }
        if (usesPositionPassive(skillId)) {
            var skill = skills.get(skillId + ":" + level);
            if (skill == null || skill.path("active_type").asInt() != 0 || skill.path("count_stats").asInt() != 0) {
                throw new IllegalArgumentException("站位入场被动配置变化：" + skillId);
            }
            var arts = mapper.readTree(skill.path("art_list").asString());
            if (arts.size() != 1) {
                throw new IllegalArgumentException("站位入场被动必须只有一个动作：" + skillId);
            }
            int artId = arts.get(0).asInt();
            var plan = battleTargets(artId);
            var ids = openingSelfBuffs(artId);
            if (ids.size() != 1 || openingPositionPassive(ids.getFirst()) == null) {
                throw new IllegalArgumentException("站位入场被动缺少213条件：" + skillId);
            }
            return List.of(new DamageArt(plan, ids));
        }
        if (skillId != 102050234 || level < 1 || level > 3) {
            throw new IllegalArgumentException("未核对的控制被动");
        }
        var skill = skills.get(skillId + ":" + level);
        var result = new ArrayList<DamageArt>();
        for (var artId : mapper.readTree(skill.path("art_list").asString())) {
            var art = row("buffart", artId.asInt());
            var ids = new ArrayList<Integer>();
            if (art.path("source_type").asInt() != 0) throw new IllegalArgumentException("控制被动来源变化");
            for (var id : mapper.readTree(art.path("buff_list").asString())) {
                var buff = row("buff", id.asInt());
                if (buff.path("attach_percent").asInt() != 10000 || buff.path("round").asInt() != 999) {
                    throw new IllegalArgumentException("控制被动期限或概率变化");
                }
                battleBuff(id.asInt());
                if (buff.path("type").asInt() == 160) controlAttribute(id.asInt());
                else {
                    var listener = battleTrigger(id.asInt());
                    for (var next : listener.arts()) {
                        if (isControlAttributeArt(next.id()) || isExpiryFrozenArt(next.id())) continue;
                        if (!isDamageArt(next.id())) throw new IllegalArgumentException("控制被动下游未实现");
                    }
                }
                ids.add(id.asInt());
            }
            result.add(new DamageArt(battleTargets(artId.asInt()), List.copyOf(ids)));
        }
        return List.copyOf(result);
    }

    /** 安装占星师和迦娜的回合首监听，按原配置执行血量和先手分支。 */
    private List<DamageArt> openingRoundPassiveArts(int skillId, int level) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level < 1 || level > 3 || skill.path("active_type").asInt() != 0
                || skill.path("count_stats").asInt() != 0) {
            throw new IllegalArgumentException("回合首被动配置无效：" + skillId + ":" + level);
        }
        var arts = mapper.readTree(skill.path("art_list").asString());
        if (arts.size() != 1) {
            throw new IllegalArgumentException("回合首入场被动必须只有一个安装动作：" + skillId);
        }
        int artId = arts.get(0).asInt();
        var buffs = openingSelfBuffs(artId);
        if (buffs.size() != 1 || !battleRoundListener(buffs.getFirst())) {
            throw new IllegalArgumentException("回合首入场被动缺少有效监听：" + artId);
        }
        return List.of(new DamageArt(battleTargets(artId), buffs));
    }

    /** 预检入场属性和监听；敌方效果沿原选择器安装，监听按原概率在安装时抽样。 */
    private List<DamageArt> openingProgressionPassiveArts(int skillId, int level, int maxLevel) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level < 1 || level > maxLevel || skill.path("active_type").asInt() != 0) {
            throw new IllegalArgumentException("未核对的入场被动等级：" + skillId + ":" + level);
        }
        var result = new ArrayList<DamageArt>();
        for (var art : mapper.readTree(skill.path("art_list").asString())) {
            int artId = art.asInt();
            var targets = battleTargets(artId);
            boolean targetsEnemies = openingLevelVariant(artId, 2224101) || openingLevelVariant(artId, 5114101)
                    || Set.of(3123101, 3163101, 3173101).contains(artId);
            List<Integer> buffIds = targetsEnemies ? openingEnemyBuffs(artId, targets) : openingSelfBuffs(artId);
            var listeners = new ArrayList<Integer>();
            for (int buffId : buffIds) {
                var buff = row("buff", buffId);
                int type = buff.path("type").asInt();
                if ((type == 160 || type == 163) && skill.path("count_stats").asInt() == 1) {
                    validatePanelAttribute(buffId);
                    continue;
                }
                if (type == 160 && battleDirectAttribute(buffId)) {
                    int duration = openingLevelVariant(buffId, 5114101) ? 2 : 999;
                    if (buff.path("round").asInt() != duration) {
                        throw new IllegalArgumentException("战斗入场属性持续回合配置变化：" + buffId);
                    }
                    listeners.add(buffId);
                    continue;
                }
                if (battleOrdinaryReplacement(buffId, level) != null) {
                    listeners.add(buffId);
                    continue;
                }
                if (type == 1202) {
                    frostSlowAmount(buffId);
                    listeners.add(buffId);
                    continue;
                }
                boolean artifactAttack = type == 170 && (skillId == 500010001 || skillId == 500020001);
                boolean godEquipmentTrigger = (skillId == 300100001 && type == 186)
                        || (skillId == 300200001 && type == 174) || (skillId == 300300001 && type == 201);
                boolean roundHealing = openingLevelVariant(buffId, 2144101) && battleRoundListener(buffId);
                int duration = skillId == 300300001 ? 99 : roundHealing ? 100 : 999;
                int conflict = openingLevelVariant(buffId, 4083101) ? 171 : buffId == 5123101 ? 5123 : 0;
                if ((!Set.of(171, 172, 173, 175, 177, 178, 179, 181, 182, 184, 187).contains(type)
                        && !artifactAttack && !godEquipmentTrigger && !roundHealing)
                        || buff.path("round").asInt() != duration
                        || buff.path("conflict_type").asInt() != conflict
                        || buff.path("effecttype").asInt() != (roundHealing ? 1 : 0)
                        || buff.path("life").asInt() != 0) {
                    throw new IllegalArgumentException("入场嵌套监听配置尚未核对：" + buffId);
                }
                openingBuffChance(buffId);
                battleBuff(buffId);
                var trigger = battleTrigger(buffId);
                if (trigger.arts().isEmpty()) {
                    throw new IllegalArgumentException("入场监听缺少子动作：" + buffId);
                }
                for (var next : trigger.arts()) {
                    if (skillId == 300100001 || next.id() == 1063201 || next.id() == 1063202) {
                        battleHealing(next.id());
                    } else if (!isGodEquipmentDamageArt(next.id()) && !isGeneralCounterattackArt(next.id())
                            && !(openingLevelVariant(next.id(), 4104201) && isDamageArt(next.id())
                                && damageArtBuffs(next.id()).stream().allMatch(id -> battleOrdinaryDamageRate(id) > 0))
                            && !isInertAngerArt(next.id())
                            && passiveTriggerEffects(next.id()).isEmpty()) {
                        throw new IllegalArgumentException("入场监听含未支持子动作：" + next.id());
                    }
                    battleTargets(next.id());
                }
                listeners.add(buffId);
            }
            result.add(new DamageArt(targets, List.copyOf(listeners)));
        }
        if (!result.isEmpty() && result.stream().allMatch(art -> art.buffs().isEmpty())
                && skill.path("count_stats").asInt() == 1) {
            // 部分高等级被动已全部计入面板。沿原静态校验，不安装空监听或叠加属性。
            validateStaticPanelSkill(battleSchedule(List.of(new HeroEvolutionRules.Skill(skillId, level))).getFirst());
            return List.of();
        }
        if (result.isEmpty() || result.stream().allMatch(art -> art.buffs().isEmpty())) {
            throw new IllegalArgumentException("入场被动无战斗效果：" + skillId);
        }
        return List.copyOf(result);
    }

    /** 识别已核对的多档监听子动作，包括一次性血量门槛后的自身减伤和全队护甲。 */
    private static boolean isLeveledOpeningFollowup(int artId) {
        int level = artId % 100;
        return level >= 1 && level <= 3 && switch (artId - level + 1) {
            case 1074401, 1074601, 1084201, 1084301, 1084501, 1143201, 1182201, 1183201,
                1154301, 1204301, 2094201, 2094301, 2104201, 2104301, 2144201, 2184201, 2184301,
                2193301, 2194201, 1224301, 1224401,
                1133201, 1184201, 1194201, 2204301, 3132301, 3144301, 3144701, 3144801, 3192201,
                3194201, 3204201, 3213201, 3214201, 3223201, 3224201, 3233201, 3233301, 3234201,
                4042201, 4044201, 4054201, 4054301, 4064201, 4083201, 4093301, 4094201, 4144201,
                5032301, 5033301, 5044201, 5054301, 5064201, 5064301, 5072201, 5073201, 5074201, 5074301,
                5094201, 5143201, 5143301, 5144201 -> true;
            default -> false;
        };
    }

    /** 预检通用监听子动作，包括受击怒气、死亡治疗及普攻减甲。 */
    public List<Integer> passiveTriggerEffects(int artId) {
        if (!isGodEquipmentDamageBonus(artId) && !isLeveledOpeningFollowup(artId)
                && !sixLevelVariant(artId, 5104601) && !sixLevelVariant(artId, 1214201)
                && !(artId >= 3154201 && artId <= 3154206) && !openingLevelVariant(artId, 4074201)
                && !Set.of(1062201, 1062202, 1062203, 1063203, 1094201, 1094202, 1094203, 1094301, 1094302, 1094303,
                2063201, 2063202, 2063203, 2072201, 2072202, 2072203,
                2084201, 2084202, 2084203, 2084301, 2084302, 2084303, 2084401, 2084402, 2084403,
                2114201, 2114202, 2114203,
                2132301, 2132302, 2132303, 2153201, 2153202, 2153203, 3063201, 3063202, 3063203,
                3082501, 3082502, 3082503, 3084301, 3084302, 3084303,
                3092201, 3092202, 3092203, 3092301, 3092302, 3092303, 3122301, 3122302, 3122303,
                3182201, 3182202, 3182203, 5032301,
                12001101, 12002101, 1043201, 1053201, 2032201, 2043201, 2043301,
                2053201, 3022201, 3033201, 3042201, 3043201, 3053201, 4023301, 4033201,
                4042201, 4044201, 5013201, 5013301, 5023201, 1074401, 1074601, 1084201, 1084301,
                1084501, 4053401, 4054201, 4054301, 4064201, 4064301, 5044201, 5064201, 5064301,
                5072201, 5143201, 5143301, 1143201, 1133201, 1184201, 1194201, 3194201, 3204201,
                3213201, 3223201, 3233201, 3233301, 5073201, 5074201, 5074301,
                1123201, 1154301, 1163201, 1173201, 1182201, 1183201, 1192201, 1204301,
                2094201, 2094301, 2104201, 2104301, 2123201, 2123301, 2144201, 2163201, 2184201, 2184301,
                2193301, 2194201, 2204301, 3123201, 3132301, 3144301, 3144701, 3144801,
                3163201, 3173201, 3192201,
                3214201, 3224201, 3234201, 4083201, 4093301, 4094201, 4123201, 4144201,
                5033301, 5054301, 5083201, 5094201, 5123201, 5133201, 5144201).contains(artId)) {
            return List.of();
        }
        var art = row("buffart", artId);
        var effects = new ArrayList<Integer>();
        for (var id : mapper.readTree(art.path("buff_list").asString())) {
            int buffId = id.asInt();
            if (inertBattleEffect(buffId)) {
                continue;
            }
            if (attackHealing(buffId) == null && attackDamageOverTime(buffId) == null
                    && !battleDizzy(buffId) && !battleFrozen(buffId) && !battleSimpleControl(buffId)
                    && !battleDirectAttribute(buffId) && !battleRoundListener(buffId) && !towerFixedRoundListener(buffId)
                    && dailyAssignedSkill(buffId) == null && battleSpeedBranches(buffId) == null
                    && dailyExtraTargets(buffId) == 0 && !dailySeal(buffId)
                    && !battleOnceAttribute(buffId) && battleUseLimitFollowup(buffId).isEmpty()
                    && !battleStatusCondition(buffId) && !dailyDungeonCondition(buffId) && !battleJobCondition(buffId)
                    && forestMark(buffId) == null
                    && battleSelfRebirthRate(buffId) == 0 && battleDamageHealingRate(buffId) == 0) {
                throw new IllegalArgumentException("监听动作后续效果尚未核对：" + buffId);
            }
            effects.add(buffId);
        }
        battleTargets(artId);
        if (effects.isEmpty() || art.path("source_type").asInt() != (openingLevelVariant(artId, 3204201) ? 1 : 0)) {
            throw new IllegalArgumentException("监听动作来源或效果无效：" + artId);
        }
        return List.copyOf(effects);
    }

    /** 读取177受击生命阈值，返回万分比；210子动作另按施法者限制生效次数。 */
    public int battleHpThreshold(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        int rate = Integer.parseInt(values[0]);
        if ((!Set.of(1094101, 1094102, 1094103, 2043101, 2084101, 2084102, 2084103, 2123101).contains(buffId)
                && !openingLevelVariant(buffId, 2104101) && !openingLevelVariant(buffId, 2184101))
                || buff.path("type").asInt() != 177 || values.length != 4 || rate <= 0 || rate >= 10000
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")) {
            throw new IllegalArgumentException("受击生命阈值含未支持参数：" + buffId);
        }
        return rate;
    }

    /** 记录每档占最大生命的万分比、监听实例的触发上限，以及每档执行的原动作。 */
    public record DamageThreshold(int hpRate, int triggerLimit, int artId) {}

    /** 爱德华三档被动均按每 10% 原始伤害触发对应级的技能伤害与攻击增益。 */
    public DamageThreshold battleDamageThreshold(int buffId) {
        var buff = row("buff", buffId);
        int artId = buffId + 100;
        if (!openingLevelVariant(buffId, 5044101) || buff.path("type").asInt() != 176
                || buff.path("round").asInt() != 999 || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != 0 || buff.path("effecttype").asInt() != 0
                || !buff.path("value").asString().equals("1000|100000|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).equals(mapper.createArrayNode().add(artId))
                || battleTargets(artId).count() != 0
                || !openingSelfBuffs(artId).equals(List.of(artId, artId + 100, artId + 200))
                || !passiveTriggerEffects(artId).equals(List.of(artId, artId + 100))) {
            throw new IllegalArgumentException("受击分档配置变化：" + buffId);
        }
        return new DamageThreshold(1000, 100_000, artId);
    }

    /** 读取210本场触发上限；条件不挂Buff，旧表的round不参与计数，非210返回0。 */
    public int battleUseLimit(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 210) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int limit = Integer.parseInt(values[0]);
        if ((!Set.of(1094201, 1094202, 1094203, 2043201, 2084201, 2084202, 2084203,
                2123201).contains(buffId) && !isDreamlandRebirthLimit(buffId)
                && !openingLevelVariant(buffId, 2104201) && !openingLevelVariant(buffId, 2184201)
                && !openingLevelVariant(buffId, 4054201))
                || values.length != 4 || limit != 1
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("round").asInt() != (openingLevelVariant(buffId, 2104201) ? 999 : 0)
                || buff.path("attach_percent").asInt() != 10000) {
            throw new IllegalArgumentException("自身次数条件含未核对参数：" + buffId);
        }
        return limit;
    }

    /** 校验210消费次数后执行的属性、治疗或自体重生子链；非210返回空。 */
    public List<Integer> battleUseLimitFollowup(int buffId) {
        if (battleUseLimit(buffId) == 0) {
            return List.of();
        }
        if (isDreamlandRebirthLimit(buffId)) {
            int artId = buffId + 100;
            var arts = mapper.readTree(row("buff", buffId).path("art_list").asString());
            var expected = openingLevelVariant(buffId, 3233201) ? List.of(artId, artId + 100) : List.of(artId);
            if (!arts.equals(mapper.createArrayNode().add(artId))
                    || !openingSelfBuffs(artId).equals(expected) || passiveTriggerEffects(artId).isEmpty()) {
                throw new IllegalArgumentException("梦境重生限次动作变化：" + buffId);
            }
            return List.of(artId);
        }
        var result = new ArrayList<Integer>();
        for (var child : mapper.readTree(row("buff", buffId).path("art_list").asString())) {
            int artId = child.asInt();
            boolean known = buffId < 2000000 ? artId == buffId + 100
                : artId == buffId + 100 || artId == buffId + 200;
            if (!known) {
                throw new IllegalArgumentException("自身次数条件子动作尚未核对：" + artId);
            }
            var art = row("buffart", artId);
            var effects = mapper.readTree(art.path("buff_list").asString());
            if (art.path("source_type").asInt() != 0 || effects.size() != 1
                    || (!battleDirectAttribute(effects.get(0).asInt()) && attackHealing(effects.get(0).asInt()) == null)) {
                throw new IllegalArgumentException("自身次数条件只使用一项固定属性：" + artId);
            }
            battleTargets(artId);
            result.add(artId);
        }
        boolean hasTwoFollowups = buffId >= 2084201 && buffId <= 2084203;
        if (result.size() != (hasTwoFollowups ? 2 : 1)) {
            throw new IllegalArgumentException("自身次数条件子动作数量变化：" + buffId);
        }
        return List.copyOf(result);
    }

    /** 读取只选自己的入场动作。返回配置顺序，遇到空动作或改选目标明确拒绝。 */
    private List<Integer> openingSelfBuffs(int artId) {
        var art = row("buffart", artId);
        var targets = battleTargets(artId);
        var ids = mapper.readTree(art.path("buff_list").asString());
        if (art.path("source_type").asInt() != 0 || !targets.selectors().equals(List.of(1))
                || !targets.values().isEmpty() || !ids.isArray() || ids.isEmpty()) {
            throw new IllegalArgumentException("入场被动的自身动作无效：" + artId);
        }
        var result = new ArrayList<Integer>();
        ids.forEach(id -> result.add(id.asInt()));
        return List.copyOf(result);
    }

    /** 校验开战时覆盖所有在场敌方的动作，返回原顺序的效果编号。 */
    private List<Integer> openingEnemyBuffs(int artId, HeroBattleTargetUtils.Plan targets) {
        var art = row("buffart", artId);
        var buffs = mapper.readTree(art.path("buff_list").asString());
        if (art.path("source_type").asInt() != 0 || !targets.selectors().equals(List.of(3, 4))
                || !targets.values().isEmpty() || !buffs.isArray() || buffs.size() != 1) {
            throw new IllegalArgumentException("入场敌方动作配置变化：" + artId);
        }
        return List.of(buffs.get(0).asInt());
    }

    /** 柯莱普攻后对原受击者执行旧164。原 AngerAddBuffHandler 为空体，此动作不产生状态或战报。 */
    public boolean isInertAngerArt(int artId) {
        if (!openingLevelVariant(artId, 3132201)) {
            return false;
        }
        var art = row("buffart", artId);
        if (art.path("source_type").asInt() != 0 || !battleTargets(artId).selectors().isEmpty()
                || !mapper.readTree(art.path("buff_list").asString()).equals(mapper.createArrayNode().add(artId))
                || !inertLegacyAngerAdd(artId)) {
            throw new IllegalArgumentException("柯莱能量动作配置变化：" + artId);
        }
        return true;
    }

    /** 森林印记记录原附加率、本来源层数门槛、单次动作和达层动作。 */
    public record ForestMark(double chance, int layers, DamageArt onApply, DamageArt onThreshold) {}

    /** 校验尼罗三档145印记，达到原层数才对携带者施加对应等级的第二项效果。 */
    public ForestMark forestMark(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 145) {
            return null;
        }
        if (!openingLevelVariant(buffId, 1204301)) {
            throw new IllegalArgumentException("森林印记配置变化：" + buffId);
        }
        int applyId = buffId + 100;
        int thresholdId = buffId + 200;
        int chance = 6000 + (buffId - 1204301) * 2000;
        var onApply = immediateArt(buffId, applyId);
        var onThreshold = immediateArt(buffId, thresholdId);
        if (buff.path("round").asInt() != 100 || buff.path("effecttype").asInt() != 1
                || buff.path("attach_percent").asInt() != chance
                || !buff.path("value").asString().equals(applyId + "|3|" + thresholdId + "|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || !onApply.targets().selectors().equals(List.of(1)) || !onApply.buffs().equals(List.of(applyId))
                || !onThreshold.targets().selectors().isEmpty() || !onThreshold.buffs().equals(List.of(thresholdId))
                || !battleDirectAttribute(applyId) || !battleDirectAttribute(thresholdId)) {
            throw new IllegalArgumentException("森林印记配置变化：" + buffId);
        }
        return new ForestMark(chance / 10000D, 3, onApply, onThreshold);
    }

    /** 原常驻站位条件的有效位置与子动作，位置使用框架原1～8格编号。 */
    public record PositionPassive(List<Integer> positions, List<Integer> buffs) {}

    /** 预检 213 只包含常驻暴击和负生命比例，返回条件与原序子Buff。 */
    public PositionPassive openingPositionPassive(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 213) {
            return null;
        }
        var arts = mapper.readTree(buff.path("art_list").asString());
        if (buff.path("round").asInt() != 0 || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != 1 || arts.size() != 1) {
            throw new IllegalArgumentException("入场站位条件配置无效：" + buffId);
        }
        var positions = new ArrayList<Integer>();
        for (String entry : buff.path("value").asString().split("\\|", -1)) {
            int position = Integer.parseInt(entry);
            if (position < 1 || position > 8) {
                throw new IllegalArgumentException("入场站位条件位置无效：" + buffId);
            }
            positions.add(position);
        }
        var children = openingSelfBuffs(arts.get(0).asInt());
        for (int child : children) {
            var row = row("buff", child);
            if (row.path("round").asInt() != 999 || row.path("attach_percent").asInt() != 10000
                    || !mapper.readTree(row.path("art_list").asString()).isEmpty()) {
                throw new IllegalArgumentException("入场站位子效果必须永久且必中：" + child);
            }
            if (row.path("type").asInt() == 163) {
                openingHpPenalty(child);
            } else if (controlAttribute(child).attribute() != 207) {
                throw new IllegalArgumentException("入场站位子效果只能调整暴击或生命比例：" + child);
            }
        }
        return new PositionPassive(List.copyOf(positions), children);
    }

    /** 已初始化单位的163负比例只改变HP_PERCENT，旧最大生命和当前生命均保留。 */
    public long openingHpPenalty(int buffId) {
        var buff = row("buff", buffId);
        var value = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 163 || value.length != 4 || !value[0].matches("-[1-9][0-9]*")
                || !value[1].equals("0") || !value[2].equals("0") || !value[3].equals("0")) {
            throw new IllegalArgumentException("开场生命比例仅支持负向固定值：" + buffId);
        }
        return Long.parseLong(value[0]);
    }
    /** 只放行已核对下游动作的恶魔魅影监听，保留其他死亡Buff的拒绝边界。 */
    private static boolean isCharmDeathListener(int buffId) {
        return buffId >= 1113101 && buffId <= 1113103;
    }

    /** 放行伊芙百花庇护的三档敌方死亡监听，其他180仍由各自的后续规则预检。 */
    private static boolean isEveDeathListener(int buffId) {
        return buffId >= 3094101 && buffId <= 3094103;
    }

    /** 梦境已核对的分档死亡监听，包含夏亚灵魂印记与提米六档团队监听。 */
    private static boolean isDreamlandDeathListener(int buffId) {
        if (buffId >= 3154101 && buffId <= 3154106) {
            return true;
        }
        int level = buffId % 100;
        return level >= 1 && level <= 3 && switch (buffId - level + 1) {
            case 1133101, 1184101, 1194101, 3194101, 3223101, 3233101, 4141401, 5074101 -> true;
            default -> false;
        };
    }

    /** 夏亚三档灵魂印记在安装时增加最终免伤和施疗，移除时按同一数值归还。 */
    public List<ControlAttributeDefinition> battleSoulMark(int buffId) {
        if (!openingLevelVariant(buffId, 4141301)) {
            return List.of();
        }
        var buff = row("buff", buffId);
        int rounds = buff.path("round").asInt();
        int damageReduction = buffId == 4141301 ? 1000 : 1500;
        int treatmentBonus = buffId == 4141301 ? 2000 : 2500;
        if (buff.path("type").asInt() != 142 || buff.path("attach_percent").asInt() != 10000
                || rounds != 2 || !buff.path("value").asString().equals(damageReduction + "|" + treatmentBonus + "|0|0")
                || buff.path("copy_target").asInt() != 0
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("夏亚灵魂印记配置变化：" + buffId);
        }
        return List.of(new ControlAttributeDefinition(buffId, 291, damageReduction, rounds),
                new ControlAttributeDefinition(buffId, 205, treatmentBonus, rounds));
    }

    /** 解析夏亚主动安装的死亡监听，保留每档动作的原施加者和继承目标。 */
    public boolean battleSoulMarkDeathListener(int buffId) {
        if (!openingLevelVariant(buffId, 4141401)) {
            return false;
        }
        var buff = row("buff", buffId);
        int artId = buffId + 100;
        if (buff.path("type").asInt() != 180 || buff.path("round").asInt() != 999
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 1
                || !buff.path("value").asString().equals("0|0|0|0")
                || !battleTrigger(buffId).arts().equals(List.of(new HeroBattleEventProcessor.Art(artId, 0, false)))
                || soulMarkDeathEffect(artId) == 0) {
            throw new IllegalArgumentException("夏亚死亡监听配置变化：" + buffId);
        }
        return true;
    }

    /** 预检夏亚死亡后继承目标的印记条件，返回该档给施加者的属性动作。 */
    public int soulMarkDeathEffect(int artId) {
        if (!openingLevelVariant(artId, 4141501)) {
            return 0;
        }
        var art = row("buffart", artId);
        if (!battleTargets(artId).selectors().isEmpty() || art.path("source_type").asInt() != 0
                || !mapper.readTree(art.path("buff_list").asString()).equals(mapper.createArrayNode().add(artId))
                || !battleStatusCondition(artId)) {
            throw new IllegalArgumentException("夏亚死亡后置动作配置变化：" + artId);
        }
        return artId + 100;
    }

    /** 旧驱散追加伤害的施加概率、当前生命系数和攻击伤害上限，比例均为万分比。 */
    public record DispelDamage(int chance, int hpRate, int attackLimit) {}

    /** 核对兔兔大小姐 1104 的各档驱散率及附伤，零生命比例仍实际移除增益。 */
    public DispelDamage battleDispelDamage(int buffId) {
        if (!openingLevelVariant(buffId, 4103301)) {
            return null;
        }
        int chance = buffId == 4103301 ? 5000 : 6000;
        int hpRate = buffId == 4103303 ? 500 : 0;
        int attackLimit = 35000;
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1104 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != chance || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals(hpRate + "|" + attackLimit + "|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("兔兔大小姐驱散附伤配置变化：" + buffId);
        }
        return new DispelDamage(chance, hpRate, attackLimit);
    }

    /** 将已核对的梦境技能映射到实际开场监听，返回0表示走其他技能入口。 */
    private static int dreamlandReactionListener(int skillId) {
        return switch (skillId) {
            case 101050133 -> 1133101;
            case 101050184 -> 1184101;
            case 101050194 -> 1194101;
            case 103050194 -> 3194101;
            case 103050204 -> 3204101;
            case 103050213 -> 3213101;
            case 103050223 -> 3223101;
            case 103050233 -> 3233101;
            case 105050074 -> 5074101;
            default -> 0;
        };
    }

    /** 逐档预检梦境监听的安装目标、触发事件、动作来源及对应后续效果。 */
    private List<DamageArt> dreamlandReactionArts(int skillId, int level, int firstListenerId) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level < 1 || level > 3) {
            throw new IllegalArgumentException("梦境战斗被动等级无效：" + skillId + ":" + level);
        }
        int listenerId = firstListenerId + level - 1;
        var art = row("buffart", listenerId);
        var buff = row("buff", listenerId);
        var targets = battleTargets(listenerId);
        var definition = battleTrigger(listenerId);
        boolean installedOnEnemy = Set.of(1133101, 3213101, 3223101).contains(firstListenerId);
        boolean sharedCritical = firstListenerId == 3204101;
        var expectedTargets = installedOnEnemy ? List.of(3, 4) : sharedCritical ? List.of(2, 4) : List.of(1);
        int expectedType = sharedCritical ? 174 : firstListenerId == 3213101 ? 184 : 180;
        boolean carriesOriginalTarget = sharedCritical || firstListenerId == 3233101 || firstListenerId == 5074101;
        int expectedActiveType = Set.of(1133101, 3204101, 3213101).contains(firstListenerId) ? 3 : 0;
        int followup = listenerId + 100;
        var childTargets = battleTargets(followup);
        var expectedChildTargets = switch (firstListenerId) {
            case 1184101 -> List.of(3, 4);
            case 1194101, 3194101, 3204101 -> List.of(2, 4);
            default -> List.of(1);
        };
        if (skill.path("active_type").asInt() != expectedActiveType
                || skill.path("count_stats").asInt() != 0
                || !mapper.readTree(skill.path("art_list").asString()).equals(mapper.createArrayNode().add(listenerId))
                || !targets.selectors().equals(expectedTargets) || targets.count() != (expectedTargets.size() == 1 ? 0 : 6)
                || !targets.values().isEmpty() || art.path("source_type").asInt() != 0
                || !mapper.readTree(art.path("buff_list").asString()).equals(mapper.createArrayNode().add(listenerId))
                || definition.event() != expectedType || buff.path("round").asInt() != 999
                || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != (carriesOriginalTarget ? 1 : 0)
                || !buff.path("value").asString().equals("0|0|0|0")
                || !definition.arts().equals(List.of(new HeroBattleEventProcessor.Art(followup, sharedCritical ? 1 : 0, true)))
                || !childTargets.selectors().equals(expectedChildTargets)
                || childTargets.count() != (expectedChildTargets.size() == 1 ? 0 : 6) || !childTargets.values().isEmpty()
                || passiveTriggerEffects(followup).isEmpty()) {
            throw new IllegalArgumentException("梦境战斗被动配置变化：" + skillId + ":" + level);
        }
        battleBuff(listenerId);
        return List.of(new DamageArt(targets, List.of(listenerId)));
    }

    /** 校验伊芙给敌方安装的死亡监听，触发时由原施法者治疗自身。 */
    private List<DamageArt> eveDeathPassiveArts(int level) {
        var skill = skills.get("103050094:" + level);
        int listenerId = 3094100 + level;
        int healId = 3094200 + level;
        if (skill == null || !isEveDeathListener(listenerId) || skill.path("active_type").asInt() != 3
                || skill.path("count_stats").asInt() != 0
                || !mapper.readTree(skill.path("art_list").asString()).equals(mapper.createArrayNode().add(listenerId))) {
            throw new IllegalArgumentException("伊芙死亡监听技能配置变化：" + level);
        }
        var targets = battleTargets(listenerId);
        var fixedTargets = row("buffart", listenerId);
        var spec = battleBuff(listenerId);
        var listener = battleTrigger(listenerId);
        var healing = battleHealing(healId);
        if (!targets.selectors().equals(List.of(3, 4)) || targets.count() != 6 || !targets.values().isEmpty()
                || fixedTargets.path("source_type").asInt() != 0
                || !mapper.readTree(fixedTargets.path("buff_list").asString()).equals(mapper.createArrayNode().add(listenerId))
                || spec.type() != 180 || spec.duration() != 999
                || row("buff", listenerId).path("attach_percent").asInt() != 10000
                || !listener.arts().equals(List.of(new HeroBattleEventProcessor.Art(healId, 0, true)))
                || !healing.targets().selectors().equals(List.of(1)) || healing.effects().size() != 1) {
            throw new IllegalArgumentException("伊芙死亡治疗链配置变化：" + listenerId);
        }
        return List.of(new DamageArt(targets, List.of(listenerId)));
    }

    /** 预检提米的他人离场增益与圣殿骑士的普攻减甲，保留相同来源、目标和执行顺序。 */
    private List<DamageArt> openingDeathOrAttackListenerArts(int skillId, int level) {
        boolean timi = skillId == 103050154;
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level < 1 || level > (timi ? 6 : 3)) {
            throw new IllegalArgumentException("死亡或普攻被动等级无效：" + skillId + ":" + level);
        }
        int listenerId = (timi ? 3154100 : 4074100) + level;
        int followupId = listenerId + 100;
        var art = row("buffart", listenerId);
        var buff = row("buff", listenerId);
        var targets = battleTargets(listenerId);
        var followupTargets = battleTargets(followupId);
        var definition = battleTrigger(listenerId);
        var effects = passiveTriggerEffects(followupId);
        if (skill.path("active_type").asInt() != (timi ? 3 : 0) || skill.path("count_stats").asInt() != 0
                || !mapper.readTree(skill.path("art_list").asString()).equals(mapper.createArrayNode().add(listenerId))
                || art.path("source_type").asInt() != 0
                || !mapper.readTree(art.path("buff_list").asString()).equals(mapper.createArrayNode().add(listenerId))
                || !targets.selectors().equals(timi ? List.of(2, 3, 4, 0) : List.of(1))
                || targets.count() != 0 || !targets.values().isEmpty()
                || definition.event() != (timi ? 180 : 181) || buff.path("round").asInt() != 999
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals("0|0|0|0")
                || !definition.arts().equals(List.of(new HeroBattleEventProcessor.Art(followupId, 0, true)))
                || !followupTargets.selectors().equals(timi ? List.of(1) : List.of(3, 4, 10))
                || followupTargets.count() != (timi ? 0 : 1) || !followupTargets.values().isEmpty()) {
            throw new IllegalArgumentException("死亡或普攻被动配置变化：" + skillId + ":" + level);
        }
        if (timi) {
            verifyTimiDeathEffects(followupId, level, effects);
        } else if (!effects.equals(List.of(followupId)) || !battleDirectAttribute(followupId)
                || !controlAttribute(followupId).equals(new ControlAttributeDefinition(followupId, 202, -3000, 3))
                || directAttributeChance(followupId) != (level == 1 ? 0.5D : 0.6D)) {
            throw new IllegalArgumentException("圣殿骑士普攻减甲配置变化：" + followupId);
        }
        battleBuff(listenerId);
        return List.of(new DamageArt(targets, List.of(listenerId)));
    }

    /** 校验提米死亡治疗量和属性上限，第四档起额外叠加暴击率。 */
    private void verifyTimiDeathEffects(int healId, int level, List<Integer> effects) {
        var expected = new ArrayList<>(List.of(healId, healId + 100, healId + 200));
        if (level >= 4) {
            expected.add(healId + 300);
        }
        var heal = attackHealing(healId);
        int healRate = level < 3 ? (level + 1) * 100 : 1000;
        if (!effects.equals(expected) || !new AttackHealing(healRate, 1D, false, true).equals(heal)) {
            throw new IllegalArgumentException("提米死亡治疗配置变化：" + healId);
        }
        var attributes = List.of(201, 222, 207);
        var rates = List.of(level < 3 ? (level + 1) * 100 : 400,
                level < 3 ? (level + 1) * 100 : level < 5 ? 500 : 600, level == 6 ? 300 : 200);
        for (int index = 1; index < expected.size(); index++) {
            int buffId = expected.get(index);
            var buff = row("buff", buffId);
            var expectedAttribute = new ControlAttributeDefinition(buffId, attributes.get(index - 1), rates.get(index - 1), 100);
            if (!battleDirectAttribute(buffId) || !controlAttribute(buffId).equals(expectedAttribute)
                    || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                    || buff.path("conflict_type").asInt() != 0 || buff.path("stacking_max").asInt() != (level == 6 ? 8 : 5)) {
                throw new IllegalArgumentException("提米死亡增益配置变化：" + buffId);
            }
        }
    }

    /** 预检恶魔魅影的敌方监听及死亡后施加给来源自身的暴击动作。 */
    private List<DamageArt> charmDeathPassiveArts(int level) {
        var skill = skills.get("101050113:" + level);
        int listenerId = 1113100 + level;
        if (level < 1 || level > 3 || skill == null || skill.path("active_type").asInt() != 3
            || skill.path("count_stats").asInt() != 0
            || !mapper.readTree(skill.path("art_list").asString()).equals(mapper.createArrayNode().add(listenerId))) {
            throw new IllegalArgumentException("恶魔魅影技能配置变化：" + level);
        }
        var targets = battleTargets(listenerId);
        var spec = battleBuff(listenerId);
        var listener = battleTrigger(listenerId);
        var art = row("buffart", listenerId);
        var buff = row("buff", listenerId);
        int bonusId = 1113200 + level;
        if (!targets.selectors().equals(List.of(3, 4)) || targets.count() != 6
            || art.path("source_type").asInt() != 0
            || !mapper.readTree(art.path("target_value").asString()).isEmpty()
            || !mapper.readTree(art.path("buff_list").asString()).equals(mapper.createArrayNode().add(listenerId))
            || spec.type() != 180 || spec.duration() != 999 || spec.conflict() != 0 || spec.stacking() != 10
            || buff.path("attach_percent").asInt() != 10000 || !buff.path("value").asString().equals("0|0|0|0")
            || !listener.arts().equals(List.of(new HeroBattleEventProcessor.Art(bonusId, 0, true)))) {
            throw new IllegalArgumentException("恶魔魅影死亡监听配置变化：" + listenerId);
        }
        charmDeathCriticalAttribute(bonusId);
        return List.of(new DamageArt(targets, List.of(listenerId)));
    }

    /** 恶魔魅影只接入已核对的三个暴击动作，目标必须是监听的原施加者。 */
    private ControlAttributeDefinition charmDeathCriticalAttribute(int buffId) {
        var art = row("buffart", buffId);
        var buff = row("buff", buffId);
        var targets = battleTargets(buffId);
        long amount = 2000L + (buffId - 1113201) * 500L;
        if (!targets.selectors().equals(List.of(1)) || targets.count() != 0 || art.path("source_type").asInt() != 0
            || !mapper.readTree(art.path("target_value").asString()).isEmpty()
            || !mapper.readTree(art.path("buff_list").asString()).equals(mapper.createArrayNode().add(buffId))
            || buff.path("type").asInt() != 160 || buff.path("round").asInt() != 999
            || buff.path("attach_percent").asInt() != 10000 || buff.path("stacking_max").asInt() != 10
            || buff.path("conflict_type").asInt() != 0
            || !buff.path("value").asString().equals("207|" + amount + "|0|0")
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("恶魔魅影暴击属性配置变化：" + buffId);
        }
        return new ControlAttributeDefinition(buffId, 207, amount, 999);
    }

    /** 209下游已核对的单目标冰冻动作，目标沿到期Buff携带者上下文继承。 */
    public boolean isExpiryFrozenArt(int artId) {
        if (artId < 2234801 || artId > 2234803) return false;
        var buffs = mapper.readTree(row("buffart", artId).path("buff_list").asString());
        if (buffs.size() != 1 || buffs.get(0).asInt() != artId) throw new IllegalArgumentException("到期冰冻配置变化");
        battleFrozenDefinition(artId);
        return true;
    }

    /** 查询已核对的固定属性效果，供安装和移除使用同一数值。 */
    public ControlAttributeDefinition controlAttribute(int buffId) {
        if (buffId >= 1113201 && buffId <= 1113203) {
            return charmDeathCriticalAttribute(buffId);
        }
        if (buffId >= 1111401 && buffId <= 1111403) {
            return charmArmorAttribute(buffId);
        }
        if ((buffId >= 2233301 && buffId <= 2233303)
            || (buffId >= 2231201 && buffId <= 2231203)) {
            var buff = row("buff", buffId);
            var values = buff.path("value").asString().split("\\|", -1);
            if (buff.path("type").asInt() != 160) throw new IllegalArgumentException("奈奈子降攻配置变化");
            return new ControlAttributeDefinition(buffId, Integer.parseInt(values[0]),
                Long.parseLong(values[1]), buff.path("round").asInt());
        }
        if (buffId >= 2234101 && buffId <= 2234103) {
            var buff = row("buff", buffId);
            var values = buff.path("value").asString().split("\\|", -1);
            if (buff.path("type").asInt() != 160 || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
                throw new IllegalArgumentException("入场减抗配置变化");
            }
            return new ControlAttributeDefinition(buffId, Integer.parseInt(values[0]),
                Long.parseLong(values[1]), buff.path("round").asInt());
        }
        for (int id = 2234201; id <= 2234203; id++) {
            for (var entry : controllingAttributes(id)) {
                if (entry.buffId() == buffId) return entry;
            }
        }
        var buff = row("buff", buffId);
        if (isFixedBattleAttribute(buff)) {
            return fixedBattleAttribute(buffId);
        }
        throw new IllegalArgumentException("未核对的控制属性效果：" + buffId);
    }

    /** 识别原配置中的固定战斗属性，晓的每层怒气也通过同一属性池修改攻击。 */
    private static boolean isFixedBattleAttribute(JsonNode buff) {
        var value = buff.path("value").asString();
        int buffId = buff.path("idx").asInt();
        if (buff.path("type").asInt() == 151) {
            return sixLevelVariant(buffId, 1214201)
                    && value.equals("201|" + Math.min(4, buffId % 100) * 100 + "|0|0");
        }
        if (buff.path("type").asInt() == 140) {
            return (openingLevelVariant(buffId, 5101501) || sixLevelVariant(buffId, 5104601))
                && value.equals("291|-2000|0|0") && buff.path("round").asInt() == 2
                && buff.path("copy_target").asInt() == 0;
        }
        if (buff.path("type").asInt() == 141) {
            return buff.path("idx").asInt() == 5061403 && value.equals("293|1000|0|0")
                && buff.path("round").asInt() == 2 && buff.path("attach_percent").asInt() == 10000
                && buff.path("copy_target").asInt() == 0;
        }
        if (buff.path("type").asInt() == 501) {
            return buffId == 4151301 && value.equals("272|500|0|0");
        }
        return buff.path("type").asInt() == 160
            && (value.startsWith("101|") || value.startsWith("200|") || value.startsWith("201|")
                || value.startsWith("202|") || value.startsWith("203|") || value.startsWith("207|")
                || (buff.path("idx").asInt() == 4141603 && value.equals("205|1500|0|0")
                    && buff.path("round").asInt() == 100 && buff.path("attach_percent").asInt() == 10000
                    && buff.path("copy_target").asInt() == 0)
                || ((openingLevelVariant(buff.path("idx").asInt(), 2144301)
                    || buff.path("idx").asInt() == 3071502 || buff.path("idx").asInt() == 3071503)
                    && value.startsWith("208|"))
                || (openingLevelVariant(buffId, 1224301) && value.startsWith("227|"))
                || ((openingLevelVariant(buffId, 2094301) || openingLevelVariant(buffId, 1224401))
                    && value.startsWith("204|"))
                || (openingLevelVariant(buffId, 5113301) && value.equals("206|-3000|0|0"))
                || value.startsWith("222|") || value.startsWith("225|") || value.startsWith("226|")
                || ((openingLevelVariant(buffId, 2093501) || openingLevelVariant(buffId, 2093701))
                    && value.equals(buffId % 100 == 3 ? "228|2000|0|0" : "228|1500|0|0"))
                || value.startsWith("230|") || value.startsWith("240|") || value.startsWith("291|")
                || value.startsWith("263|") || value.startsWith("264|")
                || (openingLevelVariant(buff.path("idx").asInt(), 5054501) && value.startsWith("284|"))
                || ((openingLevelVariant(buffId, 1071401) || openingLevelVariant(buffId, 1071601))
                    && value.equals("212|" + (buffId % 100) * 500 + "|0|0"))
                || (buff.path("idx").asInt() == 3221903 && value.equals("212|10000|0|0")
                    && buff.path("round").asInt() == 2 && buff.path("attach_percent").asInt() == 10000)
                || ((isGodEquipmentDamageBonus(buff.path("idx").asInt()) || openingLevelVariant(buff.path("idx").asInt(), 1084301))
                    && value.startsWith("270|"))
                || value.startsWith("301|") || value.startsWith("306|"));
    }

    /** 识别已核对的强蓄力五级动作及同编号的属性效果。 */
    private static boolean isGodEquipmentDamageBonus(int id) {
        return id >= 10031201 && id <= 10031205;
    }

    /** 尼罗公主至少给一名队友施加加速后，旧动作重新选择其他队友并施加同档攻击增益。 */
    public boolean battleDirectAttributeFollowup(int buffId) {
        if (!openingLevelVariant(buffId, 1203301)) {
            return false;
        }
        var buff = row("buff", buffId);
        var arts = immediateArts(buffId);
        int bonusId = buffId + 100;
        var bonus = row("buff", bonusId);
        if (buff.path("round").asInt() != 2 || buff.path("effecttype").asInt() != 1
                || buff.path("copy_target").asInt() != 0 || !buff.path("value").asString().startsWith("101|")
                || arts.size() != 1 || arts.getFirst().targets().artId() != bonusId
                || !arts.getFirst().targets().selectors().equals(List.of(2, 4, 0))
                || arts.getFirst().targets().count() != 6 || !arts.getFirst().targets().values().isEmpty()
                || !arts.getFirst().buffs().equals(List.of(bonusId))
                || bonus.path("type").asInt() != 160 || bonus.path("effecttype").asInt() != 1
                || bonus.path("attach_percent").asInt() != 10000 || bonus.path("round").asInt() != 1
                || !bonus.path("value").asString().startsWith("201|") || !battleDirectAttribute(bonusId)) {
            throw new IllegalArgumentException("尼罗公主加速后续动作配置变化：" + buffId);
        }
        return true;
    }

    /**
     * 旧 AbilityAdd/AbstractAttributeBuffHandler 按属性池规定的整数单位加减固定属性。
     * 固定属性按旧表万分比逐目标抽样。尼罗公主的攻击子动作由旧 BattleService 按命中结果触发。
     * 其他配置仍拒绝动态系数和未核对的复制目标及下游形态。
     */
    private ControlAttributeDefinition fixedBattleAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        var children = mapper.readTree(buff.path("art_list").asString());
        var chance = buff.path("attach_percent");
        if (!isFixedBattleAttribute(buff) || values.length != 4
                || !values[1].matches("-?(0|[1-9][0-9]*)") || !values[2].equals("0") || !values[3].equals("0")
                || !chance.isIntegralNumber() || !chance.canConvertToInt()
                || chance.asInt() < (buffId == 5104601 ? 0 : 1) || chance.asInt() > 10000
                || (chance.asInt() < 10000 && buff.path("copy_target").asInt() != 0) || children == null
                || !children.isArray() || (!children.isEmpty() && !battleDirectAttributeFollowup(buffId))
                || !buff.path("round").isIntegralNumber() || !buff.path("round").canConvertToInt()
                || buff.path("round").asInt() < 0) {
            throw new IllegalArgumentException("固定属性动作含未支持形式：" + buffId);
        }
        int amount;
        try {
            amount = Integer.parseInt(values[1]);
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("固定属性量超出原整数范围：" + buffId, error);
        }
        return new ControlAttributeDefinition(buffId, Integer.parseInt(values[0]), amount, buff.path("round").asInt());
    }

    /** 返回已预检固定属性的附加概率，单位为 0 至 1。 */
    public double directAttributeChance(int buffId) {
        return row("buff", buffId).path("attach_percent").asInt() / 10000D;
    }

    /** 已核实控制的基础概率、专属抗性与深睡受击唤醒率；0抗性编号表示没有专属抗性。 */
    public record SimpleControl(int buffId, int type, double rate, int resistance, List<Integer> wakeRates) {}

    /** 预检无下游的直接控制；混乱和倒戈随原普攻改选，免控和动态抗性由执行器处理。 */
    public boolean battleSimpleControl(int buffId) {
        int type = row("buff", buffId).path("type").asInt();
        if (!Set.of(1001, 1006, 1009, 1010, 1012, 1013, 1014).contains(type)
                && !(type == 1011 && openingLevelVariant(buffId, 3143401))) {
            return false;
        }
        simpleControl(buffId);
        return true;
    }

    /** 沉默专属抗性 213、石化 218；已核对的混乱等控制沿原通用免控值判定。 */
    public SimpleControl simpleControl(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        boolean confusion = type == 1011 && openingLevelVariant(buffId, 3143401);
        if ((!Set.of(1001, 1006, 1009, 1010, 1012, 1013, 1014).contains(type) && !confusion) || values.length != 4
                || chance < 0 || chance > 10000 || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("effecttype").asInt() != (type == 1001 || type == 1009 || confusion ? 2 : 3)) {
            throw new IllegalArgumentException("未核实的直接控制形式：" + buffId);
        }
        var waking = new ArrayList<Integer>();
        if (type == 1014) {
            for (int i = 0; i < 2; i++) {
                int rate = Integer.parseInt(values[i]);
                if (rate < 0 || rate > 10000) {
                    throw new IllegalArgumentException("深睡唤醒率无效：" + buffId);
                }
                waking.add(rate);
            }
            if (waking.getLast() != 10000) {
                throw new IllegalArgumentException("深睡后续受击未保证终止：" + buffId);
            }
        } else if (!values[0].equals("0") || !values[1].equals("0")) {
            throw new IllegalArgumentException("控制包含未支持计数：" + buffId);
        }
        battleBuff(buffId);
        return new SimpleControl(buffId, type, chance / 10000D,
            type == 1001 ? 213 : type == 1006 ? 218 : 0, List.copyOf(waking));
    }

    /** 预检旧234：必中、无子动作的非固定攻击格挡次数，实际消耗在扣血前事件执行。 */
    public boolean battleBlockShield(int buffId) {
        if (row("buff", buffId).path("type").asInt() != 234) {
            return false;
        }
        blockShieldCount(buffId);
        return true;
    }

    /** 读取格挡盾正次数，拒绝概率和复合参数，不能将234当作1008吸收盾。 */
    public int blockShieldCount(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 234 || buff.path("attach_percent").asInt() != 10000
                || values.length != 4 || !values[1].equals("0") || !values[2].equals("0")
                || !values[3].equals("0") || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("格挡盾包含未支持形式：" + buffId);
        }
        int count = Integer.parseInt(values[0]);
        if (count < 1) {
            throw new IllegalArgumentException("格挡盾次数必须为正：" + buffId);
        }
        return count;
    }

    /** 预检职业条件的自身增益，以及继承原目标的追击、控制和回合监听。 */
    public boolean battleJobCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 212) {
            return false;
        }
        jobConditionValues(buffId);
        var children = immediateArts(buffId);
        if (children.isEmpty()) {
            throw new IllegalArgumentException("职业条件缺少实际子动作：" + buffId);
        }
        for (var art : children) {
            if (art.targets().selectors().equals(List.of(1))) {
                for (int id : art.buffs()) {
                    onceDamageAttribute(id);
                }
            } else if (!(buff.path("copy_target").asInt() == 1 && art.targets().selectors().isEmpty()
                    && art.buffs().stream().allMatch(id -> battleDirectAttribute(id) || battleJobConditionDamage(id)
                        || battleDizzy(id) || attackDamageOverTime(id) != null
                        || (openingLevelVariant(buffId, 3144801) && id == buffId + 100 && battleSimpleControl(id))
                        || (openingLevelVariant(buffId, 3131401) && id == buffId + 100 && battleRoundListener(id))))) {
                throw new IllegalArgumentException("职业条件子动作尚未接入：" + buffId);
            }
        }
        return true;
    }

    /** 接受职业条件子动作的即时无反击伤害；后续子链、概率和附加参数必须另行预检。 */
    public boolean battleJobConditionDamage(int buffId) {
        var buff = row("buff", buffId);
        if (maximumHpDamage(buffId) != null) {
            return true;
        }
        if (buff.path("type").asInt() != 100) {
            return false;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("round").asInt() < 0 || buff.path("effecttype").asInt() != 0
                || buff.path("copy_target").asInt() != 0 || values.length != 4
                || !values[2].equals("0") || !values[3].equals("0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || battleOrdinaryDamageRate(buffId) <= 0) {
            throw new IllegalArgumentException("职业条件伤害超出已核对的即时追击形式：" + buffId);
        }
        return true;
    }

    /** 102用目标最大生命并受攻击上限约束，103用来源最大生命；比例均为万分比。 */
    public record MaximumHpDamage(int hpRate, int attackLimit, boolean sourceHp) {}

    /** 读取已核对的最大生命即时伤害。两个神装追击使用旧表概率，且不再引发反击。 */
    public MaximumHpDamage maximumHpDamage(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        boolean criticalFollowup = buffId >= 10021201 && buffId <= 10021205;
        boolean retaliation = buffId >= 10041301 && buffId <= 10041305;
        if (type != 102 && !retaliation) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        if (type != (retaliation ? 103 : 102) || values.length != (criticalFollowup ? 5 : 4)
                || !values[1].equals("1") || !values[3].equals("0")
                || Integer.parseInt(values[0]) <= 0
                || (retaliation ? !values[2].equals("0") : Integer.parseInt(values[2]) <= 0)
                || (criticalFollowup && !values[4].equals("0"))
                || buff.path("copy_target").asInt() != 0 || buff.path("round").asInt() != 0
                || (criticalFollowup ? chance <= 0 || chance > 10000 : chance != 10000)
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("最大生命追击含未支持参数：" + buffId);
        }
        return new MaximumHpDamage(Integer.parseInt(values[0]), Integer.parseInt(values[2]), retaliation);
    }

    /** 旧164 AngerAddBuffHandler 对空子链没有状态或战报效果，保留原配置挂接行为。 */
    private boolean inertLegacyAngerAdd(int buffId) {
        var buff = row("buff", buffId);
        return buff.path("type").asInt() == 164 && buff.path("copy_target").asInt() == 0
            && buff.path("attach_percent").asInt() == 10000 && buff.path("round").asInt() == 0
            && mapper.readTree(buff.path("art_list").asString()).isEmpty();
    }

    /** 旧 132 附加率为零时不触发，即使配置仍有伤害转治疗比例。 */
    private boolean dormantDamageHealing(int buffId) {
        var buff = row("buff", buffId);
        return buff.path("type").asInt() == 132 && buff.path("attach_percent").asInt() == 0
            && buff.path("round").asInt() == 0
            && buff.path("value").asString().matches("[0-9]+\\|0\\|0\\|0")
            && mapper.readTree(buff.path("art_list").asString()).isEmpty();
    }

    /** 末日使者前两档的咒印和第二份诅咒附加率为零；第三档交由实际效果执行。 */
    private boolean dormantDoombringerEffect(int buffId) {
        boolean mantra = buffId == 5061401 || buffId == 5061402;
        if (!mantra && buffId != 5061601 && buffId != 5061602) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != (mantra ? 141 : 1207) || buff.path("attach_percent").asInt() != 0
                || buff.path("round").asInt() != 2 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals(mantra ? "293|1000|0|0" : "3000|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("末日使者零概率效果配置变化：" + buffId);
        }
        return true;
    }

    /** 校验圣光精灵前两档的零概率暴伤、一级抗暴及爱德华各档扣能量占位。 */
    private boolean dormantGoldStageThreeEffect(int buffId) {
        int attribute = switch (buffId) {
            case 3071301, 3071302 -> 222;
            case 3071501 -> 208;
            case 5041301, 5041302, 5041303, 5042601, 5042602, 5042603 -> 0;
            default -> -1;
        };
        if (attribute < 0) {
            return false;
        }
        var buff = row("buff", buffId);
        boolean energy = attribute == 0;
        String value = switch (buffId) {
            case 5041301, 5042601 -> "-15|0|0|0";
            case 5041302 -> "-20|0|0|0";
            case 5041303, 5042602 -> "-30|0|0|0";
            case 5042603 -> "-50|0|0|0";
            default -> attribute + "|0|0|0";
        };
        if (buff.path("type").asInt() != (energy ? 164 : 160)
                || buff.path("attach_percent").asInt() != 0 || buff.path("copy_target").asInt() != 0
                || buff.path("round").asInt() != (energy ? 0 : 1)
                || buff.path("effecttype").asInt() != (energy ? 0 : 1)
                || !buff.path("value").asString().equals(value)
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("已核对的零概率技能占位配置变化：" + buffId);
        }
        return true;
    }

    /** 识别旧运行器必定不发生附加的配置，预检形态以防概率调整后被误略过。 */
    public boolean inertBattleEffect(int buffId) {
        return inertLegacyAngerAdd(buffId) || dormantDamageHealing(buffId) || dormantGoldStageThreeEffect(buffId)
            || dormantDoombringerEffect(buffId)
            || dailyDungeonDormant(buffId) || dormantDreamlandStatusEffect(buffId) || dormantDreamlandSupportEffect(buffId);
    }

    /** 森林缴械者的混乱和乃音的每轮基础治疗概率为零，无条件子动作和实际状态写入。 */
    private boolean dormantDreamlandSupportEffect(int buffId) {
        if (buffId != 3143401 && buffId != 2143501) {
            return false;
        }
        var buff = row("buff", buffId);
        boolean confusion = buffId == 3143401;
        if (buff.path("attach_percent").asInt(-1) != 0 || buff.path("type").asInt() != (confusion ? 1011 : 130)
                || buff.path("effecttype").asInt() != (confusion ? 2 : 0)
                || buff.path("round").asInt() != (confusion ? 2 : 0)
                || !buff.path("value").asString().equals("0|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("梦境零概率混乱或基础治疗配置变化：" + buffId);
        }
        return true;
    }

    /** 露希安一级追加冰冻及夏亚前两档死亡施疗的附加率为零，执行中不写状态。 */
    private boolean dormantDreamlandStatusEffect(int buffId) {
        if (buffId != 2223501 && buffId != 4141601 && buffId != 4141602) {
            return false;
        }
        var buff = row("buff", buffId);
        boolean frost = buffId == 2223501;
        if (buff.path("attach_percent").asInt(-1) != 0 || buff.path("copy_target").asInt() != 0
                || buff.path("type").asInt() != (frost ? 1004 : 160)
                || buff.path("round").asInt() != (frost ? 2 : 100)
                || !buff.path("value").asString().equals(frost ? "3|0|0|0" : "205|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("梦境状态条件的零概率效果变化：" + buffId);
        }
        return true;
    }

    /** 核验旧表中不附加的零概率状态，包括爱德华三档能量占位。 */
    private boolean dailyDungeonDormant(int buffId) {
        int expectedType = switch (buffId) {
            case 3073401 -> 160;
            case 1154601 -> 160;
            case 5044401, 5044402, 5044403 -> 164;
            case 4063301 -> 1010;
            case 5063301, 5063302 -> 1005;
            case 3201401, 3201402 -> 1103;
            default -> 0;
        };
        if (expectedType == 0) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != expectedType || buff.path("attach_percent").asInt() != 0
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("零概率日常副本效果配置变化：" + buffId);
        }
        return true;
    }

    /** 预检219状态条件，包括三档霜寒追加冰冻、毒伤追加沉默及零概率子动作。 */
    public boolean battleStatusCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 219) {
            return false;
        }
        var statuses = statusConditionValues(buffId);
        var children = immediateArts(buffId);
        if (openingLevelVariant(buffId, 4141501)) {
            int child = buffId + 100;
            if (!statuses.equals(Set.of(142)) || children.size() != 1 || buff.path("copy_target").asInt() != 0
                    || !children.getFirst().targets().selectors().equals(List.of(1))
                    || !children.getFirst().buffs().equals(List.of(child))
                    || !(dormantDreamlandStatusEffect(child) || battleDirectAttribute(child))) {
                throw new IllegalArgumentException("梦境状态条件子动作配置变化：" + buffId);
            }
            return true;
        }
        boolean frost = openingLevelVariant(buffId, 2223401);
        if (frost || openingLevelVariant(buffId, 4063401)) {
            int child = buffId + 100;
            if (!statuses.equals(Set.of(frost ? 1202 : 1204)) || buff.path("copy_target").asInt() != 1
                    || children.size() != 1 || children.getFirst().targets().artId() != child
                    || !children.getFirst().targets().selectors().isEmpty()
                    || children.getFirst().targets().count() != 0 || !children.getFirst().targets().values().isEmpty()
                    || !children.getFirst().buffs().equals(List.of(child))
                    || !(frost ? dormantDreamlandStatusEffect(child) || battleFrozen(child)
                        : simpleControl(child).type() == 1010)) {
                throw new IllegalArgumentException("继承目标控制子动作配置变化：" + buffId);
            }
            return true;
        }
        if (children.isEmpty()) {
            throw new IllegalArgumentException("状态条件缺少后续动作：" + buffId);
        }
        for (var art : children) {
            var selectors = art.targets().selectors();
            if (selectors.isEmpty() && buff.path("copy_target").asInt() == 1
                    && art.buffs().stream().allMatch(childId -> battleOnceAttribute(childId)
                        && onceDamageAttribute(childId).attribute() == 230)) {
                continue;
            }
            if (!selectors.equals(List.of(1))) {
                throw new IllegalArgumentException("状态条件后续含未支持目标或效果：" + buffId);
            }
            for (int childId : art.buffs()) {
                if (!dormantDamageHealing(childId) && (childId != 3083903 || battleDamageHealingRate(childId) == 0)) {
                    onceDamageAttribute(childId);
                }
            }
        }
        return true;
    }

    /** 旧219状态条件匹配任一指定类型；仅对应技能组接受霜寒和灵魂印记，零值是占位。 */
    public Set<Integer> statusConditionValues(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 219 || buff.path("attach_percent").asInt() != 10000
                || buff.path("round").asInt() != 0) {
            throw new IllegalArgumentException("状态条件含未支持参数：" + buffId);
        }
        var statuses = new LinkedHashSet<Integer>();
        for (String raw : buff.path("value").asString().split("\\|", -1)) {
            int type = Integer.parseInt(raw);
            if (!Set.of(0, 1203, 1204, 1206).contains(type)
                    && !(type == 1202 && openingLevelVariant(buffId, 2223401))
                    && !(type == 142 && openingLevelVariant(buffId, 4141501))) {
                throw new IllegalArgumentException("状态条件类型尚未核对：" + buffId);
            }
            if (type != 0) {
                statuses.add(type);
            }
        }
        if (statuses.isEmpty()) {
            throw new IllegalArgumentException("状态条件没有有效类型：" + buffId);
        }
        return Set.copyOf(statuses);
    }

    /** 旧CBuff.getValues包含value各项；职业1至5参与判定，0为配置占位。 */
    public Set<Integer> jobConditionValues(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 212 || buff.path("attach_percent").asInt() != 10000) {
            throw new IllegalArgumentException("职业条件含未支持概率：" + buffId);
        }
        var jobs = new LinkedHashSet<Integer>();
        for (String part : buff.path("value").asString().split("\\|", -1)) {
            int job = Integer.parseInt(part);
            if (job < 0 || job > 5) {
                throw new IllegalArgumentException("职业条件值无效：" + buffId);
            }
            if (job != 0) {
                jobs.add(job);
            }
        }
        if (jobs.isEmpty()) {
            throw new IllegalArgumentException("职业条件没有有效职业：" + buffId);
        }
        return Set.copyOf(jobs);
    }

    /** 晓的 260 仅给旧技能排期标先手，执行时的原处理器不产生任何状态。 */
    private boolean battleFirstSkillMarker(int buffId) {
        if (!sixLevelVariant(buffId, 1211801)) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 260 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals("0|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("晓的先手标记配置变化：" + buffId);
        }
        return true;
    }

    /** 晓的 1101 驱散所有允许驱散的控制，随后独立执行 1102 负面驱散。 */
    public boolean battleControlDispel(int buffId) {
        if (!sixLevelVariant(buffId, 1211201)) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1101 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals("0|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("晓的控制驱散配置变化：" + buffId);
        }
        return true;
    }

    /** 识别晓的满额负面免疫与控制免疫，分别保留旧表的回合期限和状态类别。 */
    public boolean battleStatusImmunity(int buffId) {
        boolean negative = sixLevelVariant(buffId, 1211701);
        if (!negative && !sixLevelVariant(buffId, 1211601)) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != (negative ? 152 : 153) || buff.path("round").asInt() != (negative ? 1 : 2)
                || buff.path("effecttype").asInt() != 0 || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals("0|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("晓的免疫状态配置变化：" + buffId);
        }
        return true;
    }

    /** 核对由晓的受击监听写入、不可驱散且最多十层的 151 攻击加成。 */
    private boolean battleAngerStack(int buffId) {
        if (!sixLevelVariant(buffId, 1214201)) {
            return false;
        }
        var buff = row("buff", buffId);
        if (!isFixedBattleAttribute(buff) || buff.path("round").asInt() != 100
                || buff.path("dispelled").asInt() != 0 || buff.path("effecttype").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || buff.path("conflict_type").asInt() != 0
                || buff.path("stacking_max").asInt() != 10) {
            throw new IllegalArgumentException("晓的怒气属性配置变化：" + buffId);
        }
        return true;
    }

    /** 旧 243 每满 layers 层追加一段，并向 splashTargets 个其他敌人复制最后一击的伤害。 */
    public record AngerStrike(int layers, int splashTargets, int splashRate, List<DamageArt> followups) {}

    /** 预检晓三档的追加斩击、溅射比例及两个原动作。 */
    public AngerStrike battleAngerStrike(int buffId) {
        if (!openingLevelVariant(buffId, 1213601)) {
            return null;
        }
        var buff = row("buff", buffId);
        int fourth = buffId + 100;
        int fifth = buffId + 200;
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 243 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || values.length != 5
                || !values[0].equals("3") || !values[1].equals("2") || !values[2].equals("10000")
                || !values[3].equals(String.valueOf(fourth)) || !values[4].equals(String.valueOf(fifth))
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("晓的追加斩击配置变化：" + buffId);
        }
        var followups = new ArrayList<DamageArt>();
        for (int strike : List.of(fourth, fifth)) {
            var plan = battleTargets(strike);
            if (!plan.selectors().equals(List.of(3, 4, 10)) || plan.count() != 1 || !plan.values().isEmpty()
                    || !damageArtBuffs(strike).equals(List.of(strike)) || battleOrdinaryDamageRate(strike, true) <= 0) {
                throw new IllegalArgumentException("晓的怒气后续选敌或伤害配置变化：" + strike);
            }
            followups.add(new DamageArt(plan, List.of(strike)));
        }
        return new AngerStrike(3, 2, 10000, List.copyOf(followups));
    }

    /** 读取 167 一次性属性，包括晓的单次命中加成，由下一次实际读取消费。 */
    public ControlAttributeDefinition onceDamageAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 167 || buff.path("attach_percent").asInt() != 10000
                || values.length != 4 || (!Set.of("203", "207", "222", "230", "270").contains(values[0])
                    && !(openingLevelVariant(buffId, 2095201) && values[0].equals("226") && values[1].equals("99999"))
                    && !(openingLevelVariant(buffId, 1213201) && values[0].equals("226")
                        && values[1].equals(buffId == 1213201 ? "0" : "3000"))
                    && !(values[0].equals("202") && values[1].matches("-[1-9][0-9]*") && buff.path("round").asInt() == 0))
                || !values[2].equals("0")
                || !values[3].equals("0") || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("未核实的一次性属性动作：" + buffId);
        }
        return new ControlAttributeDefinition(buffId, Integer.parseInt(values[0]),
            Integer.parseInt(values[1]), buff.path("round").asInt());
    }

    /** 判断已核对的一次性属性；具体属性值由同一校验入口读取。 */
    public boolean battleOnceAttribute(int buffId) {
        if (row("buff", buffId).path("type").asInt() != 167) {
            return false;
        }
        onceDamageAttribute(buffId);
        return true;
    }

    /** 旧 221 的原概率和二选一子动作，概率使用万分比。 */
    public record RandomArt(int chance, DamageArt hit, DamageArt miss) {}

    /** 预检 221 随机分支，分支可附加伤害、治疗或按配置独立随机效果。 */
    public RandomArt battleRandomArt(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 221) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        if (values.length != 4 || !values[3].equals("0") || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("随机子动作含未支持参数：" + buffId);
        }
        int chance = Integer.parseInt(values[0]);
        var hit = immediateArt(buffId, Integer.parseInt(values[1]));
        var miss = immediateArt(buffId, Integer.parseInt(values[2]));
        if (chance < 0 || chance > 10000) {
            throw new IllegalArgumentException("随机子动作概率无效：" + buffId);
        }
        for (var branch : List.of(hit, miss)) {
            for (int child : branch.buffs()) {
                if (!battleProjectile(child) && attackDamageOverTime(child) == null
                        && battleArtSelection(child) == null && attackHealing(child) == null
                        && !battleDirectAttribute(child)) {
                    battleOrdinaryDamageRate(child, true);
                }
            }
        }
        return new RandomArt(chance, hit, miss);
    }

    /** 241 随机取得的动作数及候选动作。候选为原表顺序，每次按目标独立抽取。 */
    public record ArtSelection(int count, List<DamageArt> candidates) {}

    /** 解析沿原目标施加的 241 子动作，拒绝尚未接入的目标覆盖、未知效果和重复项。 */
    public ArtSelection battleArtSelection(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 241) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int count = Integer.parseInt(values[0]);
        if (count <= 0 || buff.path("round").asInt() != 0 || buff.path("attach_percent").asInt() != 10000
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("随机选取子动作参数尚未支持：" + buffId);
        }
        var artIds = new HashSet<Integer>();
        var candidates = new ArrayList<DamageArt>();
        for (int i = 1; i < values.length; i++) {
            int artId = Integer.parseInt(values[i]);
            if (artId == 0) {
                continue;
            }
            var art = immediateArt(buffId, artId);
            if (!artIds.add(artId) || !art.targets().selectors().isEmpty()
                    || art.buffs().stream().anyMatch(id -> !battleDirectAttribute(id) && !untickedPlague(id))) {
                throw new IllegalArgumentException("随机选取子动作包含未核对效果：" + artId);
            }
            candidates.add(art);
        }
        if (count > candidates.size()) {
            throw new IllegalArgumentException("随机选取子动作缺少候选：" + buffId);
        }
        return new ArtSelection(count, List.copyOf(candidates));
    }

    /** 原服和日服的 1208 没有登记回合阶段，三档均保留可驱散的瘟疫状态及期限。 */
    public boolean untickedPlague(int buffId) {
        if (!openingLevelVariant(buffId, 5113601)) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1208 || buff.path("effecttype").asInt() != 2
                || buff.path("attach_percent").asInt() != 10000 || buff.path("round").asInt() != 2
                || !buff.path("value").asString().equals("500|100000|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("旧瘟疫形态有变化，需核对回合阶段：" + buffId);
        }
        return true;
    }

    /** 解析立即子动作的原选目标与 Buff 顺序；只供完成具体类型预检的执行路径使用。 */
    public List<DamageArt> immediateArts(int buffId) {
        var result = new ArrayList<DamageArt>();
        for (var child : mapper.readTree(row("buff", buffId).path("art_list").asString())) {
            result.add(immediateArt(buffId, child.asInt()));
        }
        return List.copyOf(result);
    }

    /** 构建继续沿用原施法者的动作，保持子效果的原表顺序。 */
    private DamageArt immediateArt(int buffId, int artId) {
        var art = row("buffart", artId);
        if (art.path("source_type").asInt() != 0) {
            throw new IllegalArgumentException("立即子动作来源尚未支持：" + buffId);
        }
        var ids = new ArrayList<Integer>();
        for (var id : mapper.readTree(art.path("buff_list").asString())) {
            ids.add(id.asInt());
        }
        if (ids.isEmpty()) {
            throw new IllegalArgumentException("立即子动作无实际效果：" + buffId);
        }
        return new DamageArt(battleTargets(artId), List.copyOf(ids));
    }

    /** 校验 100 伤害的立即子动作，沿原选择器执行自疗、伤害换盾、倒戈追击等已实现效果。 */
    public boolean battleDamageFollowup(int buffId) {
        if (row("buff", buffId).path("type").asInt() != 100) {
            return false;
        }
        var children = immediateArts(buffId);
        if (children.isEmpty()) {
            return false;
        }
        if (isJannaChainStrike(buffId)) {
            return jannaDamageFollowup(buffId, children);
        }
        for (var child : children) {
            for (int id : child.buffs()) {
                var selectors = child.targets().selectors();
                if (selectors.equals(List.of(1)) && (battleDirectAttribute(id) || attackHealing(id) != null
                        || dormantDamageHealing(id) || battleDamageShieldRate(id) > 0
                        || battleDamageHealingRate(id) > 0 || zeroChanceBalancedNote(id) || battleRoundListener(id))) {
                    continue;
                }
                if ((selectors.equals(List.of(2, 4, 7)) && child.targets().count() == 6
                        || selectors.equals(List.of(2, 4, 8)) && child.targets().count() == 3)
                        && child.targets().values().isEmpty() && attackHealing(id) != null) {
                    continue;
                }
                if (selectors.equals(List.of(2, 4, 11)) && child.targets().count() > 0
                        && child.targets().values().isEmpty() && battleDamageShieldRate(id) > 0) {
                    continue;
                }
                if (!selectors.isEmpty() || !(battleSimpleControl(id) || battleDizzy(id) || battleRoundListener(id)
                        || inertLegacyAngerAdd(id) || battleStatusCondition(id) || dailyDungeonCondition(id))) {
                    return false;
                }
            }
        }
        return true;
    }

    /** 圣焰女巫每档的前三段递交后续动作，第四段还会按原表判定末段。 */
    private static boolean isJannaChainStrike(int buffId) {
        return buffId >= 1221201 && buffId <= 1221503 && buffId % 100 >= 1 && buffId % 100 <= 3;
    }

    /** 仅倒戈技能的末两段使用这组 50% 附加门槛，其余伤害逐项核对。 */
    private static boolean isJannaOptionalStrike(int buffId) {
        return buffId >= 1221501 && buffId <= 1221603 && buffId % 100 >= 1 && buffId % 100 <= 3;
    }

    /** 每段验证下一动作、独立随机敌人、伤害等级和同一档倒戈效果，直到没有后续动作。 */
    private boolean jannaDamageFollowup(int buffId, List<DamageArt> children) {
        int nextStrike = buffId + 100;
        int controlId = 1221700 + buffId % 100;
        var child = children.getFirst();
        return children.size() == 1 && child.buffs().equals(List.of(nextStrike, controlId))
            && child.targets().artId() == nextStrike && child.targets().selectors().equals(List.of(3, 4, 8))
            && child.targets().count() == 1 && child.targets().values().isEmpty()
            && battleOrdinaryDamageRate(nextStrike, true) > 0 && simpleControl(controlId).type() == 1013;
    }

    /** 创世一阶的 236 附加概率为零，运行时无可安装效果。 */
    public boolean zeroChanceBalancedNote(int buffId) {
        var buff = row("buff", buffId);
        return buff.path("type").asInt() == 236 && buff.path("attach_percent").asInt() == 0
            && mapper.readTree(buff.path("art_list").asString()).isEmpty();
    }

    /** 预检冰冻类型与真实配置；其他类型交由各自处理器。 */
    public boolean battleFrozen(int buffId) {
        if (row("buff", buffId).path("type").asInt() != 1004) return false;
        battleFrozenDefinition(buffId);
        return true;
    }

    /** 冰冻配置基础：基础概率、受击次数及抗性编号；尚不代表运行时已支持。 */
    public record FrozenDefinition(int buffId, double rate, int hitCount, int resistanceAttribute, int duration) {}

    /** 从旧1004配置读取冰冻，value首项0沿旧回调解释为999次，不解释为永久免破冰。 */
    public FrozenDefinition battleFrozenDefinition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1004 || buff.path("effecttype").asInt() != 3
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("不是已核对的冰冻配置：" + buffId);
        }
        int count = Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]);
        return new FrozenDefinition(buffId, buff.path("attach_percent").asInt() / 10000D,
            count == 0 ? 999 : count, 216, buff.path("round").asInt());
    }

    /** 207后续160属性增益的原始属性编号、整数增量与期限；禁止按百分比提前改写数值。 */
    public record ControlAttributeDefinition(int buffId, int attribute, long amount, int duration) {}

    /** 只解析已核对的奈奈子207下游配置；加成应用和移除回调需单独接入运行时。 */
    public List<ControlAttributeDefinition> controllingAttributes(int triggerId) {
        if (triggerId < 2234201 || triggerId > 2234203) {
            throw new IllegalArgumentException("未核对的控制属性链：" + triggerId);
        }
        var result = new ArrayList<ControlAttributeDefinition>();
        for (var art : battleTrigger(triggerId).arts()) {
            for (var buffId : mapper.readTree(row("buffart", art.id()).path("buff_list").asString())) {
                var buff = row("buff", buffId.asInt());
                if (buff.path("type").asInt() != 160) {
                    throw new IllegalArgumentException("控制后续不是固定属性增益");
                }
                var values = buff.path("value").asString().split("\\|", -1);
                result.add(new ControlAttributeDefinition(buffId.asInt(), Integer.parseInt(values[0]),
                    Long.parseLong(values[1]), buff.path("round").asInt()));
            }
        }
        return List.copyOf(result);
    }

    /** 预检已核对的眩晕；有下游时只允许继承成功控制目标的职业条件。 */
    public boolean battleDizzy(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1005) {
            return false;
        }
        if (buff.path("effecttype").asInt() != 3) {
            throw new IllegalArgumentException("扩展眩晕效果尚未支持：" + buffId);
        }
        for (var child : immediateArts(buffId)) {
            if (!child.targets().selectors().isEmpty() || !child.buffs().stream().allMatch(this::battleJobCondition)) {
                throw new IllegalArgumentException("眩晕后续只接原目标的职业条件：" + buffId);
            }
        }
        battleBuff(buffId);
        return true;
    }

    /** 返回已预检眩晕的基础附加率；抗性和一次性属性由执行器按旧顺序读取。 */
    public double battleDizzyRate(int buffId) {
        if (!battleDizzy(buffId)) {
            throw new IllegalArgumentException("不是眩晕配置：" + buffId);
        }
        return row("buff", buffId).path("attach_percent").asInt() / 10000D;
    }

    /** 回合伤害包含类型、万分比、附加概率及抗性属性（0为无专属抗性）；烈火使用施加者最大生命。 */
    public record AttackDamageOverTime(int type, int rate, double chance, int resistance) {}

    /** 读取露希安开场霜寒减速的比例万分值，安装和移除使用同一配置值。 */
    public int frostSlowAmount(int buffId) {
        var buff = row("buff", buffId);
        if (!openingLevelVariant(buffId, 2224101) || buff.path("type").asInt() != 1202 || buff.path("effecttype").asInt() != 2
                || buff.path("attach_percent").asInt() != 10000 || buff.path("round").asInt() != 2
                || buff.path("copy_target").asInt() != 0 || !buff.path("value").asString().equals("800|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("霜寒减速配置变化：" + buffId);
        }
        return 800;
    }

    /** 解析已核对的持续伤害，森林之主与火灵的 1206 烈火按施加者最大生命计算。 */
    public AttackDamageOverTime attackDamageOverTime(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        boolean curse = type == 1207;
        boolean fire = type == 1206 && (openingLevelVariant(buffId, 3071701) || openingLevelVariant(buffId, 3234201));
        if (!Set.of(1201, 1203, 1204, 1205).contains(type) && !curse && !fire) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        if (buff.path("effecttype").asInt() != 2 || values.length != 4
            || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")
            || Integer.parseInt(values[0]) < 0 || chance < 0 || chance > 10000
            || (curse && (buff.path("round").asInt() != 2 || buff.path("copy_target").asInt() != 0))
                || (fire && (buff.path("round").asInt() != 1 || buff.path("copy_target").asInt() != 0
                    || chance != switch (buffId) {
                        case 3234201 -> 5000;
                        case 3234202 -> 7000;
                        default -> 10000;
                    }
                    || !buff.path("value").asString().equals("700|0|0|0")))
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("扩展攻击比例回合伤害尚未支持：" + buffId);
        }
        battleBuff(buffId);
        return new AttackDamageOverTime(type, Integer.parseInt(values[0]), chance / 10000D,
            switch (type) {
                case 1201 -> 321;
                case 1203 -> 323;
                case 1204 -> 324;
                case 1205 -> 325;
                default -> 0;
            });
    }

    /** 判断原流血技能；中毒使用独立类型并共用回合伤害执行。 */
    public boolean battleBleed(int buffId) {
        var definition = attackDamageOverTime(buffId);
        return definition != null && definition.type() == 1205;
    }

    /** 返回流血附加万分率；执行器仍读取目标325抗性，包括零概率配置。 */
    public double battleBleedChance(int buffId) {
        if (!battleBleed(buffId)) {
            throw new IllegalArgumentException("不是流血配置：" + buffId);
        }
        return attackDamageOverTime(buffId).chance();
    }

    /** 每次回合伤害按施法者当时攻击乘此万分比，不在安装时快照攻击力。 */
    public int battleBleedDamageRate(int buffId) {
        if (!battleBleed(buffId)) {
            throw new IllegalArgumentException("不是流血配置：" + buffId);
        }
        return attackDamageOverTime(buffId).rate();
    }

    /**
     * 旧ClientBuffHandler只记录非逻辑表现；本规则校验服务端原字段，Lua覆盖由客户端解析。
     * 1号接受空占位和金妮旧覆盖所需的遮罩标记，4号记录普通动作时间，
     * 实际10号投掷要求显式战场坐标及已核对的图集。尼罗公主和冰晶骑士的原技能各级空声明由客户端动作表覆盖。
     */
    public boolean battleProjectile(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (!Set.of(1, 2, 3, 4, 5, 8, 10, 11).contains(type)) {
            return false;
        }
        var children = mapper.readTree(buff.path("art_list").asString());
        if (buff.path("attach_percent").asInt() != 10000 || children == null
                || !children.isArray() || !children.isEmpty()) {
            throw new IllegalArgumentException("客户端表现含未支持概率或后续动作：" + buffId);
        }
        if (type == 1) {
            var animation = mapper.readTree(buff.path("ani_base").asString());
            var files = mapper.readTree(buff.path("file").asString());
            var sounds = mapper.readTree(buff.path("sound").asString());
            if (animation == null || !animation.isObject() || !animation.isEmpty()
                    || files == null || !files.isArray() || !files.isEmpty()
                    || sounds == null || !sounds.isArray() || !sounds.isEmpty()
                    || !buff.path("shake").isIntegralNumber() || buff.path("shake").asInt() != 0
                    || !buff.path("dimly").isIntegralNumber()
                    || buff.path("dimly").asInt() != (buffId == 1150100 ? 1 : 0)) {
                throw new IllegalArgumentException("非空1号客户端动画尚未支持：" + buffId);
            }
        } else if (type == 4) {
            var animation = mapper.readTree(buff.path("ani_base").asString());
            var files = mapper.readTree(buff.path("file").asString());
            if (animation == null || !animation.isObject() || animation.size() != 1
                    || !animation.path("action_time").isNumber() || animation.path("action_time").asDouble() <= 0
                    || files == null || !files.isArray() || !files.isEmpty()) {
                throw new IllegalArgumentException("普通攻击动作时间或资源格式尚未核对：" + buffId);
            }
        } else if (type == 10) {
            var animation = mapper.readTree(buff.path("ani_base").asString());
            var files = mapper.readTree(buff.path("file").asString());
            // 旧动作表的三个等级保留各自的骨骼和场地特效，服务端只记录本次实际配置编号。
            if (((buffId >= 1203101 && buffId <= 1203103) || (buffId >= 2203101 && buffId <= 2203103))
                    && animation != null && animation.isObject()
                    && animation.isEmpty() && files != null && files.isArray() && files.isEmpty()) {
                var sounds = mapper.readTree(buff.path("sound").asString());
                if (sounds == null || !sounds.isArray() || !sounds.isEmpty()
                        || buff.path("delay").asInt(-1) != 0 || buff.path("shake").asInt(-1) != 0
                        || buff.path("dimly").asInt(-1) != 0) {
                    throw new IllegalArgumentException("10号空声明与原动作覆盖不符：" + buffId);
                }
                return true;
            }
            if (animation == null || !animation.isObject() || files == null || !files.isArray()
                    || !isBattlefieldRatio(animation.path("offset_x")) || !isBattlefieldRatio(animation.path("offset_y"))) {
                throw new IllegalArgumentException("10号战场投掷坐标或配置无效：" + buffId);
            }
            String format = animation.path("format").asString();
            boolean arrow = format.equals("skill-102040041/arrow-%d.png") && files.isEmpty();
            String atlas = files.size() == 1 ? files.get(0).asString() : "";
            boolean verifiedAtlas = Set.of("skill-102050201-1", "skill-101050201-1", "skill-103050191-1").contains(atlas)
                && format.equals(atlas + "/%d.png");
            if (!arrow && !verifiedAtlas) {
                throw new IllegalArgumentException("10号战场投掷尚未核对该资源：" + buffId);
            }
        }
        return true;
    }

    /** 确认投掷轴显式给出战场内比例，缺少坐标或类型不符时拒绝。 */
    private static boolean isBattlefieldRatio(JsonNode value) {
        return value.isNumber() && value.asDouble() >= 0 && value.asDouble() <= 1;
    }

    /** type1102 按数值移除允许驱散的负面或控制实例；0 为不限量，非此类型返回 -1。 */
    public int battleDebuffRemovalCount(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1102) {
            return -1;
        }
        var counts = buff.path("value").asString().split("\\|", -1);
        var children = mapper.readTree(buff.path("art_list").asString());
        if (counts.length != 4 || !counts[0].matches("0|[1-9][0-9]*") || !counts[1].equals("0")
                || !counts[2].equals("0") || !counts[3].equals("0") || buff.path("attach_percent").asInt() != 10000
                || children == null || !children.isArray() || !children.isEmpty()) {
            throw new IllegalArgumentException("1102驱散含未支持概率或后续动作：" + buffId);
        }
        return Integer.parseInt(counts[0]);
    }

    /** 3201403 逐目标以原 50% 概率移除一项可驱散增益，其他效果返回零。 */
    public double battleGainRemovalChance(int buffId) {
        if (buffId != 3201403) {
            return 0D;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1103 || buff.path("attach_percent").asInt() != 5000
                || buff.path("round").asInt() != 0 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals("1|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("三级逐目标驱散配置变化：" + buffId);
        }
        return 0.5D;
    }

    /** 迦娜三档 301 单独选敌方目标启动，再从最多三个存活敌方单位各偷一项增益。 */
    public int jannaGainStealLimit(int buffId) {
        if (!openingLevelVariant(buffId, 1223501)) {
            return 0;
        }
        var buff = row("buff", buffId);
        var targets = battleTargets(buffId);
        if (buff.path("type").asInt() != 301 || buff.path("round").asInt() != 0
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || !buff.path("value").asString().equals("3|1|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || !targets.selectors().equals(List.of(3, 4, 8)) || targets.count() != 1
                || !targets.values().isEmpty()) {
            throw new IllegalArgumentException("迦娜增益偷取配置变化：" + buffId);
        }
        return 3;
    }

    /** 240 按目标最大生命限制单次伤害。读取利姆三档的真实上限，其他效果返回 0。 */
    public int towerDamageLimitRate(int buffId) {
        if (!openingLevelVariant(buffId, 4092401)) {
            return 0;
        }
        var buff = row("buff", buffId);
        int rate = buffId == 4092403 ? 3000 : 10000;
        if (buff.path("type").asInt() != 240 || !buff.path("value").asString().equals("1|" + rate + "|0|0|0")
                || buff.path("attach_percent").asInt() != 10000
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("幻境之塔伤害上限配置变更：" + buffId);
        }
        return rate;
    }

    /** 核验莫露可203到期的原伤害、减伤或概率自疗，主动和被动都使用当前技能等级。 */
    public boolean towerFixedRoundListener(int buffId) {
        boolean guardedDamage = openingLevelVariant(buffId, 5072501);
        boolean counterAndHeal = openingLevelVariant(buffId, 5073201);
        boolean selfReduction = openingLevelVariant(buffId, 5071501);
        if (!openingLevelVariant(buffId, 5071301) && !selfReduction && !guardedDamage && !counterAndHeal) {
            return false;
        }
        var buff = row("buff", buffId);
        var children = immediateArts(buffId);
        int expectedChildren = counterAndHeal ? 2 : 1;
        if (buff.path("type").asInt() != 203 || buff.path("round").asInt() != 2
                || buff.path("attach_percent").asInt() != 10000 || children.size() != expectedChildren) {
            throw new IllegalArgumentException("幻境之塔固定回合追加伤害配置变更：" + buffId);
        }
        var child = children.getFirst();
        if (counterAndHeal) {
            int damageId = buffId + 100;
            int healingId = buffId + 200;
            int damageRate = 3000 + (buffId - 5073201) * 1000;
            int healingRate = switch (buffId) {
                case 5073201 -> 500;
                case 5073202 -> 700;
                default -> 1000;
            };
            var heal = children.getLast();
            if (buff.path("copy_target").asInt() != 1 || !child.targets().selectors().isEmpty()
                    || !child.buffs().equals(List.of(damageId)) || battleOrdinaryDamageRate(damageId) != damageRate
                    || damageAllowsCounterattack(damageId)
                    || !heal.targets().selectors().equals(List.of(1)) || heal.targets().count() != 0
                    || !heal.targets().values().isEmpty() || !heal.buffs().equals(List.of(healingId))
                    || !new AttackHealing(healingRate, 0.1D, false, true).equals(attackHealing(healingId))) {
                throw new IllegalArgumentException("莫露可梦境受击回合动作配置变化：" + buffId);
            }
            return true;
        }
        if (selfReduction && child.targets().selectors().equals(List.of(1))
                && child.buffs().equals(List.of(buffId + 100)) && battleDirectAttribute(buffId + 100)) {
            return true;
        }
        int damageId = buffId + 100;
        if (!selfReduction && child.targets().selectors().isEmpty() && child.buffs().equals(List.of(damageId))
                && battleOrdinaryDamageRate(damageId) > 0 && !damageAllowsCounterattack(damageId)) {
            return true;
        }
        throw new IllegalArgumentException("幻境之塔固定回合子动作变化：" + buffId);
    }

    /** 201 按原施加者和携带者触发，预检下游属性和血量条件等已有执行分支。 */
    public boolean battleRoundListener(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 201) {
            return false;
        }
        if (buff.path("attach_percent").asInt() != 10000) throw new IllegalArgumentException("回合监听概率尚未接入");
        for (var art : immediateArts(buffId)) {
            for (int childId : art.buffs()) {
                if (!inertBattleEffect(childId) && attackHealing(childId) == null && !battleSimpleControl(childId) && !battleDirectAttribute(childId)
                        && !battleJobCondition(childId) && !dailyDungeonCondition(childId)
                        && battleSpeedBranches(childId) == null) {
                    battleOrdinaryDamageRate(childId, true);
                }
            }
        }
        battleBuff(buffId);
        return true;
    }

    /** 判断纯伤害动作，包含神装的必中追击；其他动作交已有治疗或反击入口处理。 */
    public boolean isDamageArt(int artId) {
        if (isGodEquipmentDamageArt(artId)) {
            return true;
        }
        var buffs = mapper.readTree(row("buffart", artId).path("buff_list").asString());
        if (buffs.isEmpty()) return false;
        for (var buff : buffs) if (row("buff", buff.asInt()).path("type").asInt() != 100) return false;
        for (var buff : buffs) battleOrdinaryDamageRate(buff.asInt(), true);
        return true;
    }

    /** 预检致命伤和反噬，沿原目标触发单次伤害，不能改选目标或混入其他效果。 */
    private boolean isGodEquipmentDamageArt(int artId) {
        if ((artId < 10021201 || artId > 10021205) && (artId < 10041301 || artId > 10041305)) {
            return false;
        }
        var art = row("buffart", artId);
        var buffs = mapper.readTree(art.path("buff_list").asString());
        if (art.path("source_type").asInt() != 0 || !battleTargets(artId).selectors().isEmpty()
                || buffs.size() != 1 || buffs.get(0).asInt() != artId || maximumHpDamage(artId) == null) {
            throw new IllegalArgumentException("神装伤害动作配置变化：" + artId);
        }
        return true;
    }

    /** 返回预检纯伤害动作的效果顺序。 */
    public List<Integer> damageArtBuffs(int artId) {
        if (!isDamageArt(artId)) throw new IllegalArgumentException("不是纯伤害动作");
        var result = new ArrayList<Integer>();
        for (var buff : mapper.readTree(row("buffart", artId).path("buff_list").asString())) result.add(buff.asInt());
        return List.copyOf(result);
    }

    /** 仅识别纯1301动作；非1301返回false交由既有执行器处理，混合类型明确拒绝。 */
    public boolean isGeneralCounterattackArt(int artId) {
        var list = mapper.readTree(row("buffart", artId).path("buff_list").asString());
        boolean found = false;
        for (var id : list) found |= row("buff", id.asInt()).path("type").asInt() == 1301;
        if (!found) return false;
        for (var id : list) {
            var buff = row("buff", id.asInt());
            if (buff.path("type").asInt() != 1301 || buff.path("attach_percent").asInt() != 10000
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
                throw new IllegalArgumentException("反击动作混有未支持效果");
            }
        }
        if (list.size() != 1) throw new IllegalArgumentException("多重反击效果尚未支持");
        return true;
    }

    /** 核对独立抗暴状态；当前真实1251没有额外动作或属性移除副作用。 */
    public HeroBattleBuffState.Spec battleCounterCrit(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1251 || buff.path("attach_percent").asInt() != 10000
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("抗暴Buff配置尚未支持：" + buffId);
        }
        return battleBuff(buffId);
    }

    /** 清心/契约专用参数：rate保留原整数，count只用于清心随机目标数。 */
    public record TreatmentSpecial(int type, int rate, int count) {}

    /** 解析清心与反向契约，不能用普通art_list解释它们的真实行为。 */
    public TreatmentSpecial battleTreatmentSpecial(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (type != 311 && type != 200) {
            throw new IllegalArgumentException("不是已支持的治疗特殊Buff：" + buffId);
        }
        var values = buff.path("value").asString().split("\\|", -1);
        return new TreatmentSpecial(type, Integer.parseInt(values[0]), Integer.parseInt(values[1]));
    }

    /** 显式安装入口仅接收当前已命中且必中的配置，概率型附加不能默认命中。 */
    public HeroBattleBuffState.Spec battleTreatmentStatus(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (!Set.of(200, 311, 1009).contains(type) || buff.path("attach_percent").asInt() != 10000) {
            throw new IllegalArgumentException("特殊Buff安装尚未支持：" + buffId);
        }
        return battleBuff(buffId);
    }

    /** 199建约处理器所需配置；reverseBuff=0表示旧配置不建立反向契约。 */
    public record Contract(int buffId, int damageRate, int reverseBuff) {}

    /** 读取真实199配置；199为监听类型且覆盖trigger，配置art_list不由通用安装/专用触发自动执行。 */
    public Contract battleContract(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 199 || buff.path("attach_percent").asInt() != 10000) {
            throw new IllegalArgumentException("契约建约配置尚未支持：" + buffId);
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int reverse = Integer.parseInt(values[2]);
        if (reverse != 0 && battleTreatmentStatus(reverse).type() != 200) {
            throw new IllegalArgumentException("反向契约引用无效");
        }
        return new Contract(buffId, Integer.parseInt(values[0]), reverse);
    }

    /** 完整199动作入口的选目标与效果清单；不把Buff的art_list误当成安装后自动执行。 */
    public record ContractAction(HeroBattleTargetUtils.Plan targets, List<Integer> buffs) {
        /** 固定配置顺序，防止执行前清单被修改。 */
        public ContractAction {
            buffs = List.copyOf(buffs);
        }
    }

    /** 预检动作内全部Buff均为已支持199，未知混合效果在安装前拒绝。 */
    public ContractAction battleContractAction(int artId) {
        var art = row("buffart", artId);
        var buffIds = new ArrayList<Integer>();
        for (var id : mapper.readTree(art.path("buff_list").asString())) {
            battleContract(id.asInt());
            buffIds.add(id.asInt());
        }
        if (buffIds.isEmpty()) {
            throw new IllegalArgumentException("契约动作没有建约效果");
        }
        return new ContractAction(battleTargets(artId), buffIds);
    }

    /** 最小真实伤害采用旧105号处理器：必中、攻击比例、无后续动作，不冒充普通物理伤害。 */
    public int battleRealDamageRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 105 || buff.path("attach_percent").asInt() != 10000
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("真实伤害配置尚未支持：" + buffId);
        }
        int rate = Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]);
        if (rate < 0) {
            throw new IllegalArgumentException("负攻击伤害比例尚未支持");
        }
        return rate;
    }

    /**
     * 预检已计入初始属性的纯静态被动，不在入场时重复安装或累加。
     * 依据旧BattleTemplate.addSkillAttribute；仅接纳自身、永久、必中的160/163属性，
     * 混合监听、条件属性、后续动作及未核对类型仍拒绝，不能只凭count_stats放行。
     */
    public void validateStaticPanelSkill(HeroBattleSkillUtils.Skill reference) {
        var skill = skills.get(reference.skillId() + ":" + reference.level());
        if (skill == null || skill.path("active_type").asInt() != 0
            || skill.path("count_stats").asInt() != 1 || !reference.countStats()
            || reference.activeType() != 0 || reference.first()) {
            throw new IllegalArgumentException("不是已核对的静态属性被动：" + reference.skillId());
        }
        var arts = mapper.readTree(skill.path("art_list").asString());
        if (!arts.isArray() || arts.isEmpty()) {
            throw new IllegalArgumentException("静态属性被动没有动作");
        }
        for (var artId : arts) {
            var art = row("buffart", artId.asInt());
            var targets = mapper.readTree(art.path("target").asString());
            var buffs = mapper.readTree(art.path("buff_list").asString());
            if (art.path("source_type").asInt() != 0 || targets.size() != 1
                || targets.get(0).asInt() != 1
                || !mapper.readTree(art.path("target_value").asString()).isEmpty()
                || !buffs.isArray() || buffs.isEmpty()) {
                throw new IllegalArgumentException("静态被动目标或动作尚未核对：" + artId.asInt());
            }
            for (var buffId : buffs) {
                validatePanelAttribute(buffId.asInt());
            }
        }
    }

    /** 旧BattleTemplate直接把163万分比计入初始属性，包括round=0的静态形式。 */
    private void validatePanelAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        int type = buff.path("type").asInt();
        int rounds = buff.path("round").asInt();
        if (values.length != 4 || !values[2].equals("0") || !values[3].equals("0")
                || (type == 163 && !values[1].equals("0"))) {
            throw new IllegalArgumentException("静态被动包含条件属性：" + buffId);
        }
        if (!Set.of(160, 163).contains(type) || (rounds != 999 && !(type == 163 && rounds == 0))
                || buff.path("attach_percent").asInt() != 10000
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("静态被动包含未核对效果：" + buffId);
        }
    }

    /** 面板仅使用基础已解锁技能，进化替换在其后，不重复执行面板被动。 */
    public void contribute(int template,int star,int stage,BiConsumer<Integer,Long> add){
        for(var reference:select(template,star,stage)) {
            var skill=skills.get(reference.skillId()+":"+reference.level());
            int active=skill.path("active_type").asInt();if(active==1||active==2||skill.path("count_stats").asInt()!=1)continue;
            for(var artId:mapper.readTree(skill.path("art_list").asString())){
                var art=row("buffart",artId.asInt());
                for(var buffId:mapper.readTree(art.path("buff_list").asString())){
                    var buff=row("buff",buffId.asInt());int type=buff.path("type").asInt();
                    if(!Set.of(160,163,323,324,330,332).contains(type))continue;
                    String[] values=buff.path("value").asString().split("\\|",-1);
                    if(values.length<2)throw new IllegalStateException("面板 buff 参数缺失");
                    add.accept(type==163?102:Integer.parseInt(values[0]),Long.parseLong(values[type==163?0:1]));
                }
            }
        }
    }
    /** 引用缺失不能按无加成处理。 */
    private JsonNode row(String table,int id){var row=tables.get(table).get(id);if(row==null)throw new IllegalStateException("技能面板配置缺失："+table+":"+id);return row;}
}
