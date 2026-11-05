/** 按旧 BattleTemplate/SkillInfo/CBuff 解析英雄技能面板加成；不执行战斗触发效果或技能升级。 */
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
        return new HeroBattleEventProcessor.Definition(buffId, type, skillFilter, arts);
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
        return new HeroBattleTargetUtils.Plan(artId, selectors, art.path("target_num").asInt());
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
                    battleHealing(next.id());
                }
                definitions.add(definition);
            }
        }
        if (definitions.isEmpty()) {
            throw new IllegalArgumentException("被动技能没有可安装监听");
        }
        return List.copyOf(definitions);
    }

    /** 解析当前已支持的治疗/通用监听元数据；属性Buff等有移除副作用的类型尚不接入。 */
    public HeroBattleBuffState.Spec battleBuff(int buffId) {
        var buff = row("buff", buffId);
        int type = buff.path("type").asInt();
        if (!Set.of(130, 1008, 171, 186, 206, 197, 172, 173, 170, 199, 200, 311, 1009, 1251).contains(type)) {
            throw new IllegalArgumentException("Buff生命周期处理尚未支持：" + buffId);
        }
        return new HeroBattleBuffState.Spec(buffId, type, buff.path("round").asInt(),
            buff.path("dispelled").asInt() == 1, buff.path("effecttype").asInt(),
            buff.path("conflict_type").asInt(), buff.path("stacking_max").asInt(), false);
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

    /** 解析不触发反击、必中安装且无后续动作的100号伤害子集；未恢复的反击链明确拒绝。 */
    public int battleOrdinaryDamageRate(int buffId) {
        var buff = row("buff", buffId);
        var values = buff.path("value").asString().split("\\|", -1);
        if (buff.path("type").asInt() != 100 || buff.path("attach_percent").asInt() != 10000
            || values.length < 2 || !values[1].equals("1")
            || !mapper.readTree(buff.path("art_list").asString()).isEmpty()) {
            throw new IllegalArgumentException("普通伤害配置的反击或后续动作尚未支持：" + buffId);
        }
        return Integer.parseInt(values[0]);
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
