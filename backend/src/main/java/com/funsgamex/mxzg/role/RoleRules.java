/**
 * 角色初始规则与等级经验门槛，直接读取旧策划表的共享导出，不引用英雄升级消耗。
 * 由角色创建与可信经验发放调用，只计算配置和经验结果，不持有玩家状态或写入资产。
 * 经验结果区分跨级实际接纳、满级忽略与升级附赠，供外层事务冻结真实发放明细。
 */
package com.funsgamex.mxzg.role;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public class RoleRules {
    /** 按初始化键读取的非负数值，只存配置，不保存玩家状态。 */
    private final Map<String,Long> initial=new HashMap<>();
    /** 角色等级对应本级经验门槛；不是英雄等级表。 */
    private final Map<Integer,Long> thresholds=new HashMap<>();
    /** 离开每一级时发放的钻石；旧mainlevel当前只配置900002，其他类型须先扩展发奖规则。 */
    private final Map<Integer,Long> levelDiamonds = new HashMap<>();
    /** 角色最高等级，由 mainlevel 连续等级范围确定。 */
    private final int maxLevel;
    /** 旧规则以首抽英雄星级与类型 ID 拼接的初始形象。 */
    private final int imageId;
    /** 启动读取可信配置；缺键、重复或非整数直接报错，不默认为零。 */
    public RoleRules(ObjectMapper mapper) {
        for(var row:rows(mapper,"inituser")) {
            String key=row.path("key").asString();
            if(Set.of("level","exp","cup","gold","gem").contains(key) && initial.put(key,number(row,"value"))!=null)throw new IllegalStateException("重复角色初始化键");
        }
        for(String key:List.of("level","exp","cup","gold","gem"))initial(key);
        for(var row:rows(mapper,"mainlevel")) {
            int level=Math.toIntExact(number(row,"level"));long exp=number(row,"exp");
            if(level<1 || exp<1 || thresholds.put(level,exp)!=null)throw new IllegalStateException("角色等级表无效");
            long diamonds = 0;
            var rewards = mapper.readTree(row.path("reward").asString());
            if (rewards == null || !rewards.isArray()) {
                throw new IllegalStateException("角色升级奖励无效");
            }
            for (var reward : rewards) {
                if (number(reward, "item_type") != 900002 || number(reward, "item_num") <= 0) {
                    throw new IllegalStateException("尚未支持的角色升级奖励");
                }
                diamonds = Math.addExact(diamonds, number(reward, "item_num"));
            }
            levelDiamonds.put(level, diamonds);
        }
        maxLevel=thresholds.size();
        for(int level=1;level<=maxLevel;level++)if(!thresholds.containsKey(level))throw new IllegalStateException("角色等级不连续");
        int level=Math.toIntExact(initial("level"));
        if(level<1 || level>maxLevel || (level<maxLevel && initial("exp")>=threshold(level)))throw new IllegalStateException("初始角色经验无效");
        Math.toIntExact(initial("cup"));
        long first=0;
        for(var row:rows(mapper,"system"))if(row.path("key").asString().equals("first_ordinary_lottery"))first=number(row,"value");
        int image=0;
        for(var row:rows(mapper,"herotype"))if(number(row,"type")==first)image=Integer.parseInt(number(row,"star")+""+first);
        if(first<=0 || image<=0)throw new IllegalStateException("初始角色形象配置缺失");
        imageId=image;
    }
    /**
     * 本次经验发放的不可变计算结果；实际接纳量包含用于跨级的经验，不能以本级经验差推算。
     * @param beforeLevel 发放前的角色等级
     * @param beforeExperience 发放前保留的本级经验，已满级时允许保留历史非零值
     * @param requested 本次可信奖励申请的正经验数量
     * @param accepted 本次用于跨级或保留为本级经验的数量，不包含发放前经验
     * @param ignored 因发放前已满级或本次到达满级而忽略的数量，requested等于accepted加ignored
     * @param level 发放后的角色等级
     * @param experience 发放后保留的本级经验；本次到达满级时清零，原已满级则保持历史值
     * @param diamonds 本次跨越各级附赠的钻石总数，不包含调用方其他钻石奖励
     */
    public record ExperienceGain(int beforeLevel, long beforeExperience, long requested, long accepted,
                                 long ignored, int level, long experience, long diamonds) {}

    /**
     * 复现旧RoleService.addExp：逐级扣除当前级门槛，领取离开等级的奖励，到满级清零。
     * 已满级保持原经验且不再奖励；本次到顶多出的经验作为忽略量，不计入实际接纳量。
     * @param level 服务端持久角色等级，必须存在于当前等级配置
     * @param experience 非负本级经验；未满级时必须低于当前级门槛
     * @param amount 本次可信奖励申请的正经验数量
     * @return 经验前后、申请及实际数量与升级附赠；本方法不修改任何持久状态
     * @throws IllegalArgumentException 等级、经验或发放数量非法时拒绝
     * @throws ArithmeticException 经验相加或升级赠钻累计溢出时拒绝，由调用方整体回滚
     */
    public ExperienceGain addExperience(int level, long experience, long amount) {
        threshold(level);
        if (experience < 0 || amount <= 0 || (level < maxLevel && experience >= threshold(level))) {
            throw new IllegalArgumentException("角色经验或发放数量无效");
        }
        int beforeLevel = level;
        if (level == maxLevel) {
            return new ExperienceGain(beforeLevel, experience, amount, 0, amount, level, experience, 0);
        }
        long remaining = Math.addExact(experience, amount);
        long diamonds = 0;
        long ignored = 0;
        while (level < maxLevel && remaining >= threshold(level)) {
            remaining -= threshold(level);
            diamonds = Math.addExact(diamonds, levelDiamonds.get(level));
            level++;
            if (level == maxLevel) {
                // 扣完进入满级所需门槛后，余量只来自本次新增经验，旧经验不会被计为忽略。
                ignored = remaining;
                remaining = 0;
            }
        }
        return new ExperienceGain(beforeLevel, experience, amount, amount - ignored, ignored,
            level, remaining, diamonds);
    }

    /** 返回指定初始属性；不存在即配置错误。 */
    public long initial(String key) {var value=initial.get(key);if(value==null)throw new IllegalStateException("角色初始化键缺失："+key);return value;}
    /** 读取当前角色等级门槛；最高级没有下一级，返回 0。 */
    public long threshold(int level) {var exp=thresholds.get(level);if(exp==null)throw new IllegalArgumentException("未知角色等级");return level==maxLevel?0:exp;}
    /** 返回由旧首抽配置计算的形象 ID，不创建英雄或开启抽卡。 */
    public int imageId(){return imageId;}
    /** 读取随构建打包的原始导出表，缺失或空表阻止启动。 */
    private static JsonNode rows(ObjectMapper mapper,String table) {
        try(var input=RoleRules.class.getResourceAsStream("/gameplay/"+table+".json")) {
            if(input==null)throw new IllegalStateException("角色配置缺失："+table);
            var rows=mapper.readTree(input).path("rows");if(!rows.isArray()||rows.isEmpty())throw new IllegalStateException("角色配置为空："+table);return rows;
        }catch(java.io.IOException error){throw new IllegalStateException("读取角色配置失败",error);}
    }
    /** 严格读取非负整数，避免配置文本被静默转换成零。 */
    private static long number(JsonNode row,String field) {var value=row.path(field);if(!value.isIntegralNumber()||!value.canConvertToLong()||value.asLong()<0)throw new IllegalStateException("角色数值无效："+field);return value.asLong();}
}
