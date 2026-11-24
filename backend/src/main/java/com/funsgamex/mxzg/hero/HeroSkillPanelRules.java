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
        // 旧随机分支将大于百分百的配置视为必定成功。只接入已核对的爱德华一级配置。
        int chance = buffId == 5042101 ? 100000 : 10000;
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

    /** 解析已支持的通用触发Buff；未知类型明确拒绝，动作的实际效果交给战斗执行器。 */
    public HeroBattleEventProcessor.Definition battleTrigger(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (type == 180 && !isCharmDeathListener(buffId) && !isEveDeathListener(buffId) && buffId != 4054101) {
            throw new IllegalArgumentException("死亡监听下游尚未核对：" + buffId);
        }
        if (type == 177) {
            battleHpThreshold(buffId);
        }
        if (type == 171 && Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]) != 0) {
            throw new IllegalArgumentException("受击事件的前置Buff条件尚未支持：" + buffId);
        }
        if (type == 199 || type == 200 || type == 311 || towerDamageLimitRate(buffId) > 0
                || battleReactiveProtection(buffId) != null) {
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

    /** 血量条件应用一次性属性，死亡条件触发已核对的治疗或指定追加动作。 */
    public boolean dailyDungeonCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() == 218 && buff.path("attach_percent").asInt() == 10000) {
            var condition = battleHpCondition(buffId);
            var children = immediateArts(buffId);
            return (condition.subject() == 0 || condition.subject() == 1) && children.size() == 1
                && (children.getFirst().targets().selectors().isEmpty()
                    || children.getFirst().targets().selectors().equals(List.of(1)))
                && children.getFirst().buffs().size() == 1
                && battleOnceAttribute(children.getFirst().buffs().getFirst());
        }
        if (buffId == 1083501) {
            if (buff.path("type").asInt() != 222 || buff.path("attach_percent").asInt() != 10000) {
                throw new IllegalArgumentException("毁灭之烬死亡检查配置变化：" + buffId);
            }
            return immediateArts(buffId).stream().map(DamageArt::buffs).toList().equals(List.of(List.of(1083601)))
                && attackHealing(1083601) != null;
        }
        if (buffId == 5053701) {
            var children = immediateArts(buffId);
            return buff.path("type").asInt() == 222 && buff.path("attach_percent").asInt() == 10000
                && children.size() == 1 && children.getFirst().buffs().equals(List.of(5053801))
                && children.getFirst().targets().selectors().equals(List.of(3, 4, 10))
                && children.getFirst().targets().count() == 1 && dailyAssignedSkill(5053801) != null;
        }
        return false;
    }

    /** 读取已核对的指定攻击，执行器将原技能和指定活目标交给行动队列。 */
    public HeroBattleSkillUtils.Skill dailyAssignedSkill(int buffId) {
        if (buffId != 1074601 && buffId != 5053801) {
            return null;
        }
        var buff = row("buff", buffId);
        int skillId = buffId == 1074601 ? 101050075 : 105050055;
        int chance = buffId == 1074601 ? 4000 : 10000;
        if (buff.path("type").asInt() != 1303 || buff.path("attach_percent").asInt() != chance
                || !buff.path("value").asString().equals(skillId + "|1|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("指定反击配置变化：" + buffId);
        }
        var skill = battleSchedule(List.of(new HeroEvolutionRules.Skill(skillId, 1))).getFirst();
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

    /** 毁灭之烬比较己方最高实时速度；前两项分别为领先与非领先的原动作。 */
    public List<Integer> dailySpeedBranches(int buffId) {
        if (buffId != 1084201) {
            return List.of();
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 244 || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals("1084301|1084501|0|0")) {
            throw new IllegalArgumentException("先手检查配置变化：" + buffId);
        }
        passiveTriggerEffects(1084301);
        passiveTriggerEffects(1084501);
        return List.of(1084301, 1084501);
    }

    /** 非速度第一时有概率增加下次技能选择目标数；只使用原一级数量。 */
    public int dailyExtraTargets(int buffId) {
        if (buffId != 1084501) {
            return 0;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 155 || buff.path("attach_percent").asInt() != 4000
                || !buff.path("value").asString().equals("1|0|0|0")) {
            throw new IllegalArgumentException("临时目标数配置变化：" + buffId);
        }
        return 1;
    }

    /** 读取额外目标的基础命中概率，不在伤害动作内重抽。 */
    public double dailyExtraTargetChance(int buffId) {
        return row("buff", buffId).path("attach_percent").asInt() / 10000D;
    }

    /** 143灵魂结界消失时，仅施加者自己的结界执行原治疗动作。 */
    public int dailySoulWard(int buffId) {
        if (buffId != 4053301) {
            return 0;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 143 || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals("4053401|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("灵魂结界配置变化：" + buffId);
        }
        battleTargets(4053401);
        Objects.requireNonNull(attackHealing(4053401));
        return 4053401;
    }

    /** 读取旧引爆的计算比例、攻击上限和状态类型，执行器使用原有符号计算。 */
    public record Detonation(int rate, int attackLimit, int type) {}

    /** 末日使者一级只引爆目标现有诅咒，消耗状态后作为固定伤害。 */
    public Detonation dailyDetonate(int buffId) {
        if (buffId != 5063401) {
            return null;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 106 || buff.path("attach_percent").asInt() != 10000
                || !buff.path("value").asString().equals("10000|40000|1207|0")) {
            throw new IllegalArgumentException("引爆配置变化：" + buffId);
        }
        return new Detonation(10000, 40000, 1207);
    }

    /** 感电技能施放后附带封印，命中会禁止被动并执行原降暴击子动作。 */
    public boolean dailySeal(int buffId) {
        if (buffId != 4064201) {
            return false;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 1007 || buff.path("attach_percent").asInt() != 3000
                || !immediateArts(buffId).stream().map(DamageArt::buffs).toList().equals(List.of(List.of(4064301)))
                || !battleDirectAttribute(4064301)) {
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

    /** 解析已支持效果的生命周期元数据；直接属性及控制的移除副作用由同一执行器处理。 */
    public HeroBattleBuffState.Spec battleBuff(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (!Set.of(130, 1005, 1008, 171, 186, 206, 197, 172, 173, 170, 199, 200, 303, 304, 311, 1009, 1251,
                143, 174, 175, 176, 177, 178, 179, 181, 182, 184, 190, 194, 201, 185, 207, 208, 209, 1004,
                160, 166, 167, 1201, 1203, 1204, 1205, 1207, 1001, 1006, 1007, 1010, 1012, 1014, 234).contains(type)
                && !(type == 180 && (isCharmDeathListener(buffId) || isEveDeathListener(buffId) || buffId == 4054101))
                && !(type == 1206 && buffId == 3071701) && !untickedPlague(buffId)
                && !(type == 501 && isFixedBattleAttribute(buff))
                && towerDamageLimitRate(buffId) == 0 && !towerFixedRoundListener(buffId)
                && !((type == 231 || type == 235) && battleReactiveProtection(buffId) != null) && type != 163) {
            throw new IllegalArgumentException("Buff生命周期处理尚未支持：" + buffId);
        }
        if (type == 160 || type == 501) {
            controlAttribute(buffId);
        }
        if (type == 163) {
            openingHpPenalty(buffId);
        }
        if (type == 166) {
            battleAttackStealRate(buffId);
        }
        return new HeroBattleBuffState.Spec(buffId, type, buff.path("round").asInt(),
            buff.path("dispelled").asInt() == 1, buff.path("effecttype").asInt(),
            buff.path("conflict_type").asInt(), buff.path("stacking_max").asInt(),
            type == 160 || type == 166 || type == 167 || type == 501);
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

    /** 完整后置入口可允许反击和旧回合伤害概率；单独扣血入口仍禁止，避免绕过动作生命周期。 */
    public int battleOrdinaryDamageRate(int buffId, boolean allowCounterattack) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        boolean supportedChance = chance == 10000
            || (allowCounterattack && ((buffId == 2072301 && chance == 5000) || (buffId == 2072302 && chance == 7000)));
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
        return !row("buff", buffId).path("value").asString().split("\\|", -1)[1].equals("1");
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

    /** 读取攻击或自身生命上限比例治疗，以及圣光精灵一级治疗后的独立选目标。 */
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

    /** 圣光精灵一级治疗结束后重新按血量比例选择一名队友，为其添加护甲及火灵守护。 */
    private boolean isLightSpiritHealingFollowup(int buffId) {
        if (buffId != 3071201) {
            return false;
        }
        var actions = immediateArts(buffId);
        if (actions.size() != 1) {
            return false;
        }
        var action = actions.getFirst();
        var targets = action.targets();
        return targets.artId() == 3071401 && targets.selectors().equals(List.of(2, 4, 11))
            && targets.count() == 1 && targets.values().isEmpty()
            && action.buffs().equals(List.of(3071401, 3071501, 3071601))
            && battleDirectAttribute(3071401) && dormantGoldStageThreeEffect(3071501)
            && battleReactiveProtection(3071601) != null;
    }

    /** 已核对的庇护转移比例或火灵反击概率，比例均为万分比，后者保存施加烈火的配置编号。 */
    public record ReactiveProtection(int type, int rate, int retaliationId) {}

    /** 仅接入烈焰骑士和圣光精灵一级的庇护与火灵守护，校验持续、概率和原后续配置。 */
    public ReactiveProtection battleReactiveProtection(int buffId) {
        if (buffId != 1071201 && buffId != 3071601) {
            return null;
        }
        var buff = row("buff", buffId);
        boolean shelter = buffId == 1071201;
        int type = shelter ? 231 : 235;
        String values = shelter ? "4000|0|0|0" : "5000|3071701|0|0";
        if (buff.path("type").asInt() != type || buff.path("round").asInt() != (shelter ? 2 : 1)
                || buff.path("attach_percent").asInt() != 10000 || buff.path("copy_target").asInt() != 0
                || buff.path("effecttype").asInt() != (shelter ? 0 : 1)
                || !buff.path("value").asString().equals(values)
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("已核对的庇护或火灵守护配置变化：" + buffId);
        }
        if (!shelter) {
            var retaliation = row("buffart", 3071701);
            var targets = battleTargets(3071701);
            if (retaliation.path("source_type").asInt() != 0 || !targets.selectors().isEmpty()
                    || targets.count() != 0 || !targets.values().isEmpty()
                    || !mapper.readTree(retaliation.path("buff_list").asString()).equals(mapper.createArrayNode().add(3071701))
                    || attackDamageOverTime(3071701) == null) {
                throw new IllegalArgumentException("火灵守护的烈火后续配置变化：" + buffId);
            }
        }
        return new ReactiveProtection(type, shelter ? 4000 : 5000, shelter ? 0 : 3071701);
    }

    /** 读取132号即时治疗的初始伤害比例，森镜的状态子动作沿原表零回合，其余已支持动作沿原一回合。 */
    public int battleDamageHealingRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 132) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int duration = buffId == 3083903 ? 0 : 1;
        if (buff.path("round").asInt() != duration || buff.path("attach_percent").asInt() != 10000
                || buff.path("effecttype").asInt() != 0 || buff.path("life").asInt() != 0
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

    /** 预检真实技能的战斗效果和表现，包括一次性属性和随机分支。 */
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
                if (dormantDoombringerEffect(buff.asInt()) || inertBattleEffect(buff.asInt())) {
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
                            && !battleJobCondition(buff.asInt()) && !battleStatusCondition(buff.asInt()) && !dailyDungeonCondition(buff.asInt())
                            && !battleOnceAttribute(buff.asInt()) && battleRandomArt(buff.asInt()) == null
                            && battleArtSelection(buff.asInt()) == null && !towerFixedRoundListener(buff.asInt())
                            && dailySoulWard(buff.asInt()) == 0 && dailyDetonate(buff.asInt()) == null
                            && !battleBlockShield(buff.asInt())
                            && battleReactiveProtection(buff.asInt()) == null
                            && battleDebuffRemovalCount(buff.asInt()) < 0 && battleDamageHealingRate(buff.asInt()) == 0
                            && attackHealing(buff.asInt()) == null && battleResurrection(buff.asInt()) == null
                            && battleAttackStealRate(buff.asInt()) == 0) {
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

    /** 识别必须在开场实际安装的已接入被动。静态面板被动已计入初始属性。 */
    public static boolean usesOpeningBattlePassive(int skillId) {
        return skillId == 102050234 || skillId == 101050113 || skillId == 103050094 || usesPositionPassive(skillId)
            || isDailyDungeonPassive(skillId)
            || isTowerPassive(skillId)
            || progressionPassiveMaxLevel(skillId) > 0;
    }

    /** 塔守军本批需要的三个入场被动，其中利姆同时含已计入面板的永久属性。 */
    private static boolean isTowerPassive(int skillId) {
        return skillId == 104050092 || skillId == 105050072 || skillId == 105050143;
    }

    /** 预检第 11～30 层实际选择的一级被动，沿用原安装对象和下游配置。 */
    private List<DamageArt> openingTowerPassiveArts(int skillId, int level) {
        var skill = skills.get(skillId + ":" + level);
        int activeType = skillId == 105050143 ? 3 : 0;
        int countStats = skillId == 104050092 ? 1 : 0;
        if (skill == null || level != 1 || skill.path("active_type").asInt() != activeType
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

    /** 日常副本守军的一级战斗被动，按实际入场目标与后续触发安装。 */
    private static boolean isDailyDungeonPassive(int skillId) {
        return switch (skillId) {
            case 101040043, 101040053, 101050074, 101050084, 102030032, 102040043, 102040053, 103020022,
                103030033, 103040042, 103040043, 103040053, 103050074, 104040023, 104040033,
                104050042, 104050044, 104050054, 104050064, 105030013, 105040023, 105050044, 105050064 -> true;
            default -> false;
        };
    }

    /** 预检已恢复的一级入场技能，外来监听允许运行于旧表指定的敌方携带者。 */
    private List<DamageArt> dailyDungeonPassiveArts(int skillId, int level) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level != 1 || skill.path("active_type").asInt() != (skillId == 103050074 ? 3 : 0)) {
            throw new IllegalArgumentException("未核对的日常副本被动等级：" + skillId + ":" + level);
        }
        var result = new ArrayList<DamageArt>();
        for (var art : mapper.readTree(skill.path("art_list").asString())) {
            int artId = art.asInt();
            var selectors = battleTargets(artId);
            var buffs = new ArrayList<Integer>();
            if (!selectors.selectors().equals(List.of(1)) && !selectors.selectors().equals(List.of(3, 4))) {
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

    /** 核对圣光精灵一级的独立记录与治疗状态；旧处理器只读取值首项。 */
    public PeriodicRecovery battlePeriodicRecovery(int buffId) {
        if (buffId != 3074101 && buffId != 3074201) {
            return null;
        }
        var buff = row("buff", buffId);
        int type = buffId == 3074101 ? 304 : 303;
        int rate = type == 303 ? 1800 : 0;
        String expected = type == 303 ? "1800|20000|0|0" : "0|0|0|0";
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

    /** 返回通过通用安装链的入场被动最高等级，包含已核对的圣器和神装套装。 */
    private static int progressionPassiveMaxLevel(int skillId) {
        return switch (skillId) {
            case 101050062, 101050063, 101050093, 101050094, 102040132,
                102050063, 102050072, 102050074, 102050083, 102050084, 102050114, 102050153, 102050154,
                103050063, 103050082, 103050084, 103050092, 103050104, 103050113 -> 3;
            case 105040032, 105050042, 500010001, 500020001 -> 1;
            case 300100001, 300200001, 300300001, 300400001 -> 5;
            default -> 0;
        };
    }

    /** 已核对的站位被动共享同一种213条件，其他开场条件需要单独核对下游。 */
    private static boolean usesPositionPassive(int skillId) {
        return skillId == 103040052 || skillId == 103040162 || skillId == 103040172;
    }

    /** 解析并预检开场被动的完整动作；保持配置的动作和Buff顺序。 */
    public List<DamageArt> openingPassiveArts(int skillId, int level) {
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

    /** 预检固定属性及入场监听，套装沿用原施疗、暴击、回合和出手后等触发条件。 */
    private List<DamageArt> openingProgressionPassiveArts(int skillId, int level, int maxLevel) {
        var skill = skills.get(skillId + ":" + level);
        if (skill == null || level < 1 || level > maxLevel || skill.path("active_type").asInt() != 0) {
            throw new IllegalArgumentException("未核对的入场被动等级：" + skillId + ":" + level);
        }
        var result = new ArrayList<DamageArt>();
        for (var art : mapper.readTree(skill.path("art_list").asString())) {
            int artId = art.asInt();
            var listeners = new ArrayList<Integer>();
            for (int buffId : openingSelfBuffs(artId)) {
                var buff = row("buff", buffId);
                int type = buff.path("type").asInt();
                if ((type == 160 || type == 163) && skill.path("count_stats").asInt() == 1) {
                    validatePanelAttribute(buffId);
                    continue;
                }
                if (skillId == 103050104 && battleDirectAttribute(buffId)) {
                    if (buff.path("round").asInt() != 999) {
                        throw new IllegalArgumentException("战斗初始属性必须常驻：" + buffId);
                    }
                    listeners.add(buffId);
                    continue;
                }
                if (battleOrdinaryReplacement(buffId, level) != null) {
                    listeners.add(buffId);
                    continue;
                }
                boolean artifactAttack = type == 170 && (skillId == 500010001 || skillId == 500020001);
                boolean godEquipmentTrigger = (skillId == 300100001 && type == 186)
                        || (skillId == 300200001 && type == 174) || (skillId == 300300001 && type == 201);
                int duration = skillId == 300300001 ? 99 : 999;
                if ((!Set.of(171, 172, 173, 175, 177, 178, 179, 181, 182).contains(type)
                        && !artifactAttack && !godEquipmentTrigger)
                        || buff.path("round").asInt() != duration || buff.path("attach_percent").asInt() != 10000
                        || buff.path("conflict_type").asInt() != 0 || buff.path("effecttype").asInt() != 0
                        || buff.path("life").asInt() != 0) {
                    throw new IllegalArgumentException("入场嵌套监听配置尚未核对：" + buffId);
                }
                var trigger = battleTrigger(buffId);
                if (trigger.arts().isEmpty()) {
                    throw new IllegalArgumentException("入场监听缺少子动作：" + buffId);
                }
                for (var next : trigger.arts()) {
                    if (skillId == 300100001 || next.id() == 1063201 || next.id() == 1063202) {
                        battleHealing(next.id());
                    } else if (!isGodEquipmentDamageArt(next.id()) && !isGeneralCounterattackArt(next.id())
                            && passiveTriggerEffects(next.id()).isEmpty()) {
                        throw new IllegalArgumentException("入场监听含未支持子动作：" + next.id());
                    }
                    battleTargets(next.id());
                }
                listeners.add(buffId);
            }
            result.add(new DamageArt(battleTargets(artId), List.copyOf(listeners)));
        }
        if (result.isEmpty() || result.stream().allMatch(art -> art.buffs().isEmpty())) {
            throw new IllegalArgumentException("入场被动无战斗效果：" + skillId);
        }
        return List.copyOf(result);
    }

    /** 按原配置编号校验已核对的监听子动作及目标，其他动作留给各自的执行入口。 */
    public List<Integer> passiveTriggerEffects(int artId) {
        if (!isGodEquipmentDamageBonus(artId)
                && !Set.of(1062201, 1062202, 1062203, 1063203, 1094201, 1094202, 1094203, 1094301, 1094302, 1094303,
                2063201, 2063202, 2063203, 2072201, 2072202, 2072203,
                2084201, 2084202, 2084203, 2084301, 2084302, 2084303, 2084401, 2084402, 2084403,
                2114201, 2114202, 2114203,
                2132301, 2132302, 2132303, 2153201, 2153202, 2153203, 3063201, 3063202, 3063203,
                3082501, 3082502, 3082503, 3084301, 3084302, 3084303,
                3092201, 3092202, 3092203, 3092301, 3092302, 3092303, 5032301,
                12001101, 12002101, 1043201, 1053201, 2032201, 2043201, 2043301,
                2053201, 3022201, 3033201, 3042201, 3043201, 3053201, 4023301, 4033201,
                4042201, 4044201, 5013201, 5013301, 5023201, 1074401, 1074601, 1084201, 1084301,
                1084501, 4053401, 4054201, 4054301, 4064201, 4064301, 5044201, 5064201, 5064301,
                5072201, 5143201, 5143301).contains(artId)) {
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
                    && dailyAssignedSkill(buffId) == null && dailySpeedBranches(buffId).isEmpty()
                    && dailyExtraTargets(buffId) == 0 && !dailySeal(buffId)
                    && !battleOnceAttribute(buffId) && battleUseLimitFollowup(buffId).isEmpty()) {
                throw new IllegalArgumentException("监听动作后续效果尚未核对：" + buffId);
            }
            effects.add(buffId);
        }
        battleTargets(artId);
        if (effects.isEmpty() || art.path("source_type").asInt() != 0) {
            throw new IllegalArgumentException("监听动作来源或效果无效：" + artId);
        }
        return List.copyOf(effects);
    }

    /** 读取烈焰之印和决胜令牌三档177的受击生命阈值，返回10000制整数，次数由210子动作维护。 */
    public int battleHpThreshold(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        int rate = Integer.parseInt(values[0]);
        if (!Set.of(1094101, 1094102, 1094103, 2043101, 2084101, 2084102, 2084103).contains(buffId)
                || buff.path("type").asInt() != 177 || values.length != 4 || rate <= 0 || rate >= 10000
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")) {
            throw new IllegalArgumentException("受击生命阈值含未支持参数：" + buffId);
        }
        return rate;
    }

    /** 爱德华受击按原始伤害占生命上限的每10%触发强化，旧第二参数限制场内次数。 */
    public int dailyDamageThreshold(int buffId) {
        var buff = row("buff", buffId);
        if (buffId != 5044101 || buff.path("type").asInt() != 176
                || !buff.path("value").asString().equals("1000|100000|0|0")) {
            throw new IllegalArgumentException("受击分档配置变化：" + buffId);
        }
        return 1000;
    }

    /** 读取烈焰之印和决胜令牌三档210的触发上限，非210返回0；本场次数区分携带者与配置。 */
    public int battleUseLimit(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 210) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int limit = Integer.parseInt(values[0]);
        if (!Set.of(1094201, 1094202, 1094203, 2043201, 2084201, 2084202, 2084203, 4054201).contains(buffId)
                || values.length != 4 || limit != 1
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("round").asInt() != 0 || buff.path("attach_percent").asInt() != 10000) {
            throw new IllegalArgumentException("自身次数条件含未核对参数：" + buffId);
        }
        return limit;
    }

    /** 校验210成功后按配置执行的属性动作；非210返回空，不让尚未接通的子链通过预检。 */
    public List<Integer> battleUseLimitFollowup(int buffId) {
        if (battleUseLimit(buffId) == 0) {
            return List.of();
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
        if (result.size() != (buffId < 2000000 || buffId == 2043201 || buffId == 4054201 ? 1 : 2)) {
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

    /** 识别已接通的160号固定战斗属性，包括强蓄力的最终伤害和其他常规加成。 */
    private static boolean isFixedBattleAttribute(JsonNode buff) {
        var value = buff.path("value").asString();
        if (buff.path("type").asInt() == 501) {
            return buff.path("idx").asInt() == 4151301 && value.equals("272|500|0|0");
        }
        return buff.path("type").asInt() == 160
            && (value.startsWith("101|") || value.startsWith("200|") || value.startsWith("201|")
                || value.startsWith("202|") || value.startsWith("203|") || value.startsWith("207|")
                || (buff.path("idx").asInt() == 5113301 && value.startsWith("206|"))
                || value.startsWith("222|") || value.startsWith("225|") || value.startsWith("226|")
                || value.startsWith("230|") || value.startsWith("240|") || value.startsWith("291|")
                || ((buff.path("idx").asInt() == 1071401 || buff.path("idx").asInt() == 1071601)
                    && value.startsWith("212|"))
                || ((isGodEquipmentDamageBonus(buff.path("idx").asInt()) || buff.path("idx").asInt() == 1084301)
                    && value.startsWith("270|"))
                || value.startsWith("301|") || value.startsWith("306|"));
    }

    /** 识别已核对的强蓄力五级动作及同编号的属性效果。 */
    private static boolean isGodEquipmentDamageBonus(int id) {
        return id >= 10031201 && id <= 10031205;
    }

    /**
     * 旧 AbilityAdd/AbstractAttributeBuffHandler 按属性池规定的整数单位加减固定属性。
     * 固定属性按旧表万分比逐目标抽样；拒绝动态系数、未核对的复制目标及下游形态。
     */
    private ControlAttributeDefinition fixedBattleAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        var children = mapper.readTree(buff.path("art_list").asString());
        var chance = buff.path("attach_percent");
        if (!isFixedBattleAttribute(buff) || values.length != 4
                || !values[1].matches("-?(0|[1-9][0-9]*)") || !values[2].equals("0") || !values[3].equals("0")
                || !chance.isIntegralNumber() || !chance.canConvertToInt()
                || chance.asInt() <= 0 || chance.asInt() > 10000
                || (chance.asInt() < 10000 && buff.path("copy_target").asInt() != 0) || children == null
                || !children.isArray() || !children.isEmpty()
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

    /** 预检无下游的直接控制，包括禁疗和虚弱；免控和动态抗性由实际执行器处理。 */
    public boolean battleSimpleControl(int buffId) {
        if (!Set.of(1001, 1006, 1009, 1010, 1012, 1014).contains(row("buff", buffId).path("type").asInt())) {
            return false;
        }
        simpleControl(buffId);
        return true;
    }

    /** 沉默专属抗性213、石化218；禁疗、麻痹、虚弱和深睡无专属抗性，深睡保留整数抽醒率。 */
    public SimpleControl simpleControl(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        if (!Set.of(1001, 1006, 1009, 1010, 1012, 1014).contains(type) || values.length != 4
                || chance < 0 || chance > 10000 || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("effecttype").asInt() != (type == 1001 || type == 1009 ? 2 : 3)) {
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

    /** 预检职业条件的自选一次性属性，以及原目标上的固定属性、追击、眩晕和回合伤害。 */
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
                        || battleDizzy(id) || attackDamageOverTime(id) != null))) {
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

    /** 旧末日使者一级的两个占位效果附加率为零，核对形态以避免漏掉启用后的逻辑。 */
    private boolean dormantDoombringerEffect(int buffId) {
        if (buffId != 5061401 && buffId != 5061601) {
            return false;
        }
        var buff = row("buff", buffId);
        int expectedType = buffId == 5061401 ? 141 : 1207;
        String expectedValue = buffId == 5061401 ? "293|1000|0|0" : "3000|0|0|0";
        return buff.path("type").asInt() == expectedType && buff.path("attach_percent").asInt() == 0
            && buff.path("round").asInt() == 2 && buff.path("copy_target").asInt() == 0
            && buff.path("value").asString().equals(expectedValue)
            && mapper.readTree(buff.path("art_list").asString()).isEmpty();
    }

    /** 金币第三关的零概率加成及扣能量占位；164旧处理器也不会写能量或战报。 */
    private boolean dormantGoldStageThreeEffect(int buffId) {
        int attribute = switch (buffId) {
            case 3071301 -> 222;
            case 3071501 -> 208;
            case 5041301, 5042601 -> 0;
            default -> -1;
        };
        if (attribute < 0) {
            return false;
        }
        var buff = row("buff", buffId);
        boolean energy = attribute == 0;
        if (buff.path("type").asInt() != (energy ? 164 : 160)
                || buff.path("attach_percent").asInt() != 0 || buff.path("copy_target").asInt() != 0
                || buff.path("round").asInt() != (energy ? 0 : 1)
                || buff.path("effecttype").asInt() != (energy ? 0 : 1)
                || !buff.path("value").asString().equals(energy ? "-15|0|0|0" : attribute + "|0|0|0")
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("已核对的零概率技能占位配置变化：" + buffId);
        }
        return true;
    }

    /** 判断实际没有状态变化的已核对旧效果，用于执行预检通过的子链。 */
    public boolean inertBattleEffect(int buffId) {
        return inertLegacyAngerAdd(buffId) || dormantDamageHealing(buffId) || dormantGoldStageThreeEffect(buffId)
            || dailyDungeonDormant(buffId);
    }

    /** 旧表中不附加的零概率状态，不写战报或触发下游。 */
    private boolean dailyDungeonDormant(int buffId) {
        int expectedType = switch (buffId) {
            case 3073401 -> 160;
            case 5044401 -> 164;
            case 4063301 -> 1010;
            case 5063301 -> 1005;
            case 3201401 -> 1103;
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

    /** 预检219状态条件，允许已核对的自身补偿和继承目标的一次性受伤加深。 */
    public boolean battleStatusCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 219) {
            return false;
        }
        statusConditionValues(buffId);
        var children = immediateArts(buffId);
        if (buffId == 4063401) {
            return children.size() == 1 && children.getFirst().targets().selectors().isEmpty()
                && children.getFirst().buffs().equals(List.of(4063501)) && battleSimpleControl(4063501);
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

    /** 旧219状态条件匹配任一指定类型；零值是占位，当前已核对中毒及烈火。 */
    public Set<Integer> statusConditionValues(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 219 || buff.path("attach_percent").asInt() != 10000
                || buff.path("round").asInt() != 0) {
            throw new IllegalArgumentException("状态条件含未支持参数：" + buffId);
        }
        var statuses = new LinkedHashSet<Integer>();
        for (String raw : buff.path("value").asString().split("\\|", -1)) {
            int type = Integer.parseInt(raw);
            if (!Set.of(0, 1203, 1204, 1206).contains(type)) {
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

    /** 读取 167 号一次性属性，包括穿甲、伤害、暴击和暴伤，由下一次实际读取消费。 */
    public ControlAttributeDefinition onceDamageAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 167 || buff.path("attach_percent").asInt() != 10000
                || values.length != 4 || (!Set.of("203", "207", "222", "230", "270").contains(values[0])
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

    /** 原服和日服的 1208 没有登记回合阶段，保留可驱散的瘟疫状态及期限。 */
    public boolean untickedPlague(int buffId) {
        if (buffId != 5113601) {
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

    /** 校验 100 伤害的立即子动作，按原选择器应用自疗、伤害换盾及其他已核对效果。 */
    public boolean battleDamageFollowup(int buffId) {
        if (row("buff", buffId).path("type").asInt() != 100) {
            return false;
        }
        var children = immediateArts(buffId);
        if (children.isEmpty()) {
            return false;
        }
        if (buffId == 4041201) {
            var child = children.getFirst();
            return children.size() == 1 && child.buffs().equals(List.of(4041301))
                && child.targets().selectors().equals(List.of(2, 4, 8)) && child.targets().count() == 3
                && child.targets().values().isEmpty() && attackHealing(4041301) != null;
        }
        for (var child : children) {
            for (int id : child.buffs()) {
                var selectors = child.targets().selectors();
                if (selectors.equals(List.of(1)) && (battleDirectAttribute(id) || attackHealing(id) != null
                        || dormantDamageHealing(id) || zeroChanceBalancedNote(id) || battleRoundListener(id))) {
                    continue;
                }
                if (selectors.equals(List.of(2, 4, 7)) && child.targets().count() == 6
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

    /** 解析已核对的中毒、流血、圣光精灵烈火和无自动引爆技能绑定的到期诅咒。 */
    public AttackDamageOverTime attackDamageOverTime(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        boolean curse = type == 1207;
        boolean fire = type == 1206 && buffId == 3071701;
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
                    || chance != 10000 || !buff.path("value").asString().equals("700|0|0|0")))
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
     * 10号要求显式战场坐标及已核对的单一投掷图集。
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

    /** 240 按目标最大生命限制单次伤害。仅接入塔守军一级，其他效果返回 0。 */
    public int towerDamageLimitRate(int buffId) {
        if (buffId != 4092401) {
            return 0;
        }
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 240 || !buff.path("value").asString().equals("1|10000|0|0|0")
                || buff.path("attach_percent").asInt() != 10000
                || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("幻境之塔伤害上限配置变更：" + buffId);
        }
        return 10000;
    }

    /** 莫露可一级的 203 到期时，对携带者追加伤害，或向原施加者添加减伤。 */
    public boolean towerFixedRoundListener(int buffId) {
        if (!Set.of(5071301, 5071501, 5072501).contains(buffId)) {
            return false;
        }
        var buff = row("buff", buffId);
        var children = immediateArts(buffId);
        if (buff.path("type").asInt() != 203 || buff.path("round").asInt() != 2
                || buff.path("attach_percent").asInt() != 10000 || children.size() != 1) {
            throw new IllegalArgumentException("幻境之塔固定回合追加伤害配置变更：" + buffId);
        }
        var child = children.getFirst();
        if (buffId == 5071501 && child.targets().selectors().equals(List.of(1))
                && child.buffs().equals(List.of(5071601)) && battleDirectAttribute(5071601)) {
            return true;
        }
        int damageId = buffId == 5071301 ? 5071401 : 5072601;
        if (buffId != 5071501 && child.targets().selectors().isEmpty() && child.buffs().equals(List.of(damageId))
                && battleOrdinaryDamageRate(damageId) > 0 && !damageAllowsCounterattack(damageId)) {
            return true;
        }
        throw new IllegalArgumentException("幻境之塔固定回合子动作变化：" + buffId);
    }

    /** 201 每轮开始执行，保存原施加者和携带者，并预检治疗、虚弱等已核对的下游。 */
    public boolean battleRoundListener(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 201) {
            return false;
        }
        if (buff.path("attach_percent").asInt() != 10000) throw new IllegalArgumentException("回合监听概率尚未接入");
        for (var art : immediateArts(buffId)) {
            for (int childId : art.buffs()) {
                if (attackHealing(childId) == null && !battleSimpleControl(childId)
                        && !battleJobCondition(childId) && dailySpeedBranches(childId).isEmpty()) {
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
