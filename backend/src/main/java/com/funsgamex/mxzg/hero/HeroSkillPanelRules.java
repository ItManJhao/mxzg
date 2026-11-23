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
        if (buff.path("round").asInt() != 999 || buff.path("attach_percent").asInt() != 10000
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
        if (type == 180 && !isCharmDeathListener(buffId) && !isEveDeathListener(buffId)) {
            throw new IllegalArgumentException("死亡监听下游尚未核对：" + buffId);
        }
        if (type == 177) {
            battleHpThreshold(buffId);
        }
        if (type == 171 && Integer.parseInt(buff.path("value").asString().split("\\|", -1)[0]) != 0) {
            throw new IllegalArgumentException("受击事件的前置Buff条件尚未支持：" + buffId);
        }
        if (type == 199 || type == 200 || type == 311) {
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
        if (!Set.of(130, 1005, 1008, 171, 186, 206, 197, 172, 173, 170, 199, 200, 311, 1009, 1251,
                174, 175, 177, 178, 179, 181, 182, 184, 190, 194, 201, 185, 207, 208, 209, 1004,
                160, 166, 167, 1203, 1205, 1001, 1006, 1014, 234).contains(type)
                && !(type == 180 && (isCharmDeathListener(buffId) || isEveDeathListener(buffId))) && type != 163) {
            throw new IllegalArgumentException("Buff生命周期处理尚未支持：" + buffId);
        }
        if (type == 160) {
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
            type == 160 || type == 166 || type == 167);
    }

    /** 当前模板真实职业和元素，用于装配战场，不从UI面板或调用方猜测。 */
    public record BattleIdentity(int element, int jobBonus) {}

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

    /** 预检已接入的必中固定属性动作，包括技能伤害、攻击、护甲、穿甲、暴击、命中和速度。 */
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

    /** 按寒冰战姬三档旧166配置读取偷取攻击的万分比；0表示其他效果，转移与恢复交给执行器。 */
    public int battleAttackStealRate(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 166) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int rate = Integer.parseInt(values[0]);
        if ((buffId < 2075301 || buffId > 2075303) || values.length != 4 || rate <= 0 || rate > 10000
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("round").asInt() != 3 || buff.path("attach_percent").asInt() != 10000
                || buff.path("copy_target").asInt() != 0 || buff.path("effecttype").asInt() != 0
                || buff.path("conflict_type").asInt() != 2075
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

    /** 按旧130号动作读取攻击比例治疗，概率和治疗量采用万分比。 */
    public record AttackHealing(int rate, double chance) {}

    /** 读取无附加子链的攻击比例治疗；非130号返回null，未核对的扩展形式拒绝。 */
    public AttackHealing attackHealing(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 130) {
            return null;
        }
        var value = buff.path("value").asString().split("\\|", -1);
        var arts = mapper.readTree(buff.path("art_list").asString());
        int chance = buff.path("attach_percent").asInt();
        if (value.length != 4 || !value[1].equals("0") || !value[2].equals("0") || !value[3].equals("0")
                || Integer.parseInt(value[0]) <= 0 || chance < 0 || chance > 10000
                || buff.path("copy_target").asInt() != 0 || arts == null || !arts.isArray() || !arts.isEmpty()) {
            throw new IllegalArgumentException("130号攻击比例治疗含未支持形式：" + buffId);
        }
        return new AttackHealing(Integer.parseInt(value[0]), chance / 10000D);
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

    /** 预检真实技能的伤害、控制、监听、属性、攻击偷取、治疗、驱散及现有表现；未知效果拒绝。 */
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
                if (!battleProjectile(buff.asInt())) {
                    if (row("buff", buff.asInt()).path("type").asInt() < 100) {
                        throw new IllegalArgumentException("技能表现动作尚未支持：" + buff.asInt());
                    }
                    if (battleDirectHealing(buff.asInt())) {
                        battleHealing(buff.asInt() - 100);
                    } else if (battleRoundListener(buff.asInt())) {
                        battleTrigger(buff.asInt());
                    } else if (!battleDizzy(buff.asInt()) && !battleFrozen(buff.asInt()) && attackDamageOverTime(buff.asInt()) == null && !battleDirectAttribute(buff.asInt()) && !battleSimpleControl(buff.asInt())
                            && !battleJobCondition(buff.asInt()) && !battleStatusCondition(buff.asInt())
                            && !battleBlockShield(buff.asInt())
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
            || progressionPassiveMaxLevel(skillId) > 0;
    }

    /** 返回通过通用安装链的入场被动最高等级，包含已核对的圣器和神装套装。 */
    private static int progressionPassiveMaxLevel(int skillId) {
        return switch (skillId) {
            case 101050062, 101050063, 101050093, 101050094, 102040132,
                102050063, 102050072, 102050074, 102050083, 102050084, 102050114, 102050153, 102050154,
                103050063, 103050082, 103050084, 103050092, 103050104, 103050113 -> 3;
            case 105040032, 500010001, 500020001 -> 1;
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
                12001101, 12002101).contains(artId)) {
            return List.of();
        }
        var art = row("buffart", artId);
        var effects = new ArrayList<Integer>();
        for (var id : mapper.readTree(art.path("buff_list").asString())) {
            int buffId = id.asInt();
            if (attackHealing(buffId) == null && attackDamageOverTime(buffId) == null
                    && !battleDizzy(buffId) && !battleSimpleControl(buffId)
                    && !battleDirectAttribute(buffId) && !battleRoundListener(buffId)
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
        if (!Set.of(1094101, 1094102, 1094103, 2084101, 2084102, 2084103).contains(buffId)
                || buff.path("type").asInt() != 177 || values.length != 4 || rate <= 0 || rate >= 10000
                || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")) {
            throw new IllegalArgumentException("受击生命阈值含未支持参数：" + buffId);
        }
        return rate;
    }

    /** 读取烈焰之印和决胜令牌三档210的触发上限，非210返回0；本场次数区分携带者与配置。 */
    public int battleUseLimit(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 210) {
            return 0;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int limit = Integer.parseInt(values[0]);
        if (!Set.of(1094201, 1094202, 1094203, 2084201, 2084202, 2084203).contains(buffId)
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
                    || !battleDirectAttribute(effects.get(0).asInt())) {
                throw new IllegalArgumentException("自身次数条件只使用一项固定属性：" + artId);
            }
            battleTargets(artId);
            result.add(artId);
        }
        if (result.size() != (buffId < 2000000 ? 1 : 2)) {
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
        return buff.path("type").asInt() == 160
            && (value.startsWith("101|") || value.startsWith("200|") || value.startsWith("201|")
                || value.startsWith("202|") || value.startsWith("203|") || value.startsWith("207|")
                || value.startsWith("226|") || value.startsWith("291|")
                || (isGodEquipmentDamageBonus(buff.path("idx").asInt()) && value.startsWith("270|"))
                || value.startsWith("301|") || value.startsWith("306|"));
    }

    /** 识别已核对的强蓄力五级动作及同编号的属性效果。 */
    private static boolean isGodEquipmentDamageBonus(int id) {
        return id >= 10031201 && id <= 10031205;
    }

    /**
     * 旧 AbilityAdd/AbstractAttributeBuffHandler 按属性池规定的整数单位加减固定属性。
     * 固定属性默认必中，两个已核对的圣器效果沿旧表20%抽样；其他概率和条件效果继续拒绝。
     */
    private ControlAttributeDefinition fixedBattleAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        var children = mapper.readTree(buff.path("art_list").asString());
        if (!isFixedBattleAttribute(buff) || values.length != 4
                || !values[1].matches("-?(0|[1-9][0-9]*)") || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("attach_percent").asInt() != (isArtifactAttribute(buffId) ? 2000 : 10000) || children == null
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

    /** 两种完整圣器套装的出手后属性，其他固定属性沿用原必中行为。 */
    public double directAttributeChance(int buffId) {
        return isArtifactAttribute(buffId) ? row("buff", buffId).path("attach_percent").asInt() / 10000D : 1D;
    }

    /** 概率例外只准入已对照原表的进攻、免伤两条子效果。 */
    private static boolean isArtifactAttribute(int buffId) {
        return buffId == 12001101 || buffId == 12002101;
    }

    /** 已核实控制的基础概率、专属抗性与深睡受击唤醒率；0抗性编号表示没有专属抗性。 */
    public record SimpleControl(int buffId, int type, double rate, int resistance, List<Integer> wakeRates) {}

    /** 预检无下游的沉默、石化和深睡；命中、免控与动态抗性由实际执行器处理。 */
    public boolean battleSimpleControl(int buffId) {
        if (!Set.of(1001, 1006, 1014).contains(row("buff", buffId).path("type").asInt())) {
            return false;
        }
        simpleControl(buffId);
        return true;
    }

    /** 沉默专属抗性213、石化218；深睡没有专属抗性，并保留受击整数抽醒率。 */
    public SimpleControl simpleControl(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        if (!Set.of(1001, 1006, 1014).contains(type) || values.length != 4
                || chance < 0 || chance > 10000 || !mapper.readTree(buff.path("art_list").asString()).isEmpty()
                || !values[2].equals("0") || !values[3].equals("0")
                || buff.path("effecttype").asInt() != (type == 1001 ? 2 : 3)) {
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

    /** 预检职业条件的自选一次性属性，以及继承命中目标的固定属性或直接追击。 */
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
                    && art.buffs().stream().allMatch(id -> battleDirectAttribute(id) || battleJobConditionDamage(id)))) {
                throw new IllegalArgumentException("职业条件子动作超出已核对的属性或追击形式：" + buffId);
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

    /** 仅接受旧表明确为零概率且零恢复的攻击转治疗子动作。 */
    private boolean dormantDamageHealing(int buffId) {
        var buff = row("buff", buffId);
        return buff.path("type").asInt() == 132 && buff.path("attach_percent").asInt() == 0
            && buff.path("value").asString().equals("0|0|0|0")
            && mapper.readTree(buff.path("art_list").asString()).isEmpty();
    }

    /** 判断实际没有状态变化的已核对旧效果，用于执行预检通过的子链。 */
    public boolean inertBattleEffect(int buffId) {
        return inertLegacyAngerAdd(buffId) || dormantDamageHealing(buffId);
    }

    /** 预检219状态条件继承原目标，后续仅使用已核对的自身加成与该次伤害比例治疗。 */
    public boolean battleStatusCondition(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 219) {
            return false;
        }
        statusConditionValues(buffId);
        var children = immediateArts(buffId);
        if (children.isEmpty() || children.stream().anyMatch(art -> !art.targets().selectors().equals(List.of(1)))) {
            throw new IllegalArgumentException("状态条件后续目前只接施法者自身：" + buffId);
        }
        for (var art : children) {
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
            if (type != 0 && type != 1203 && type != 1206) {
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

    /** 读取167号伤害、暴击及暴伤的一次性属性，由下一次实际读取消费。 */
    public ControlAttributeDefinition onceDamageAttribute(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 167 || buff.path("attach_percent").asInt() != 10000
                || values.length != 4 || !Set.of("207", "222", "270").contains(values[0]) || !values[2].equals("0")
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

    /** 解析立即子动作的原选目标与Buff顺序；只供完成具体类型预检的执行路径使用。 */
    public List<DamageArt> immediateArts(int buffId) {
        var result = new ArrayList<DamageArt>();
        for (var child : mapper.readTree(row("buff", buffId).path("art_list").asString())) {
            var art = row("buffart", child.asInt());
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
            result.add(new DamageArt(battleTargets(child.asInt()), List.copyOf(ids)));
        }
        return List.copyOf(result);
    }

    /** 校验100号伤害的即时子动作，伤害未命中仍按旧规则进入独立后续判定。 */
    public boolean battleDamageFollowup(int buffId) {
        if (row("buff", buffId).path("type").asInt() != 100) {
            return false;
        }
        var children = immediateArts(buffId);
        if (children.isEmpty()) {
            return false;
        }
        for (var child : children) {
            for (int id : child.buffs()) {
                var selectors = child.targets().selectors();
                if (selectors.equals(List.of(1)) && battleDirectAttribute(id)) {
                    continue;
                }
                if (!selectors.isEmpty() || !(battleSimpleControl(id) || battleDizzy(id) || battleRoundListener(id)
                        || inertLegacyAngerAdd(id) || battleStatusCondition(id))) {
                    return false;
                }
            }
        }
        return true;
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

    /** 攻击比例回合伤害，包含真实Buff类型、攻击万分比及对应抗性属性。 */
    public record AttackDamageOverTime(int type, int rate, double chance, int resistance) {}

    /** 解析旧中毒1203和流血1205；两者沿相同回合处理器，但各自读取抗性。 */
    public AttackDamageOverTime attackDamageOverTime(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (type != 1203 && type != 1205) {
            return null;
        }
        var values = buff.path("value").asString().split("\\|", -1);
        int chance = buff.path("attach_percent").asInt();
        if (buff.path("effecttype").asInt() != 2 || values.length != 4
            || !values[1].equals("0") || !values[2].equals("0") || !values[3].equals("0")
            || Integer.parseInt(values[0]) < 0 || chance < 0 || chance > 10000
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("扩展攻击比例回合伤害尚未支持：" + buffId);
        }
        battleBuff(buffId);
        return new AttackDamageOverTime(type, Integer.parseInt(values[0]), chance / 10000D,
            type == 1203 ? 323 : 325);
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
     * 1号仅接空资源/空动画的占位；type10读取场地双轴和原投掷序列。未知概率或下游动作拒绝。
     */
    public boolean battleProjectile(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (!Set.of(1, 2, 3, 5, 8, 10, 11).contains(type)) {
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
                    || !buff.path("dimly").isIntegralNumber() || buff.path("dimly").asInt() != 0) {
                throw new IllegalArgumentException("非空1号客户端动画尚未支持：" + buffId);
            }
        } else if (type == 10) {
            var animation = mapper.readTree(buff.path("ani_base").asString());
            var files = mapper.readTree(buff.path("file").asString());
            if (animation == null || !animation.isObject() || !isBattlefieldRatio(animation.path("offset_x"))
                    || !isBattlefieldRatio(animation.path("offset_y"))
                    || files == null || !files.isArray() || !files.isEmpty()
                    || !animation.path("format").asString().equals("skill-102040041/arrow-%d.png")) {
                throw new IllegalArgumentException("10号战场投掷尚未核对该资源或坐标：" + buffId);
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

    /** 201回合开始监听保留施加者与携带者，只允许已核对的回合下游。 */
    public boolean battleRoundListener(int buffId) {
        var buff = row("buff", buffId);
        if (buff.path("type").asInt() != 201) return false;
        if (buff.path("attach_percent").asInt() != 10000) throw new IllegalArgumentException("回合监听概率尚未接入");
        for (var art : immediateArts(buffId)) {
            for (int childId : art.buffs()) {
                if (attackHealing(childId) == null && !battleJobCondition(childId)) {
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
