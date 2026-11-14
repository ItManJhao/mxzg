/**
 * 可信发奖的事务内实际结果，供业务层保存历史回执，不是客户端可提交的奖励计划。
 * 理论量、实际量、丢弃原因和升级附赠分开保存；实例直接取自领域写入结果，不通过整包快照差分推测。
 * 本对象返回时外层事务可能尚未提交；业务幂等、回执持久化与最新资产快照仍归调用方。
 */
package com.funsgamex.mxzg.reward;

import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import java.util.List;

/**
 * 所有集合均为本次发放的冻结明细，后续资产变化不能改写它们。
 * @param roleId 外层已鉴权的角色归属，历史结果不能交给其他角色
 * @param items 按配置合并的理论、实际与忽略数量，包含零到账项
 * @param wallet 整笔发放前后的真实钱包余额，包含直接发放及升级附赠
 * @param stacks 本次真正写入的普通库存前后量及稳定记录身份
 * @param experience 本次角色经验计算结果，没有经验奖励时为空
 * @param tavern 本次酒馆点前后余额及冻结上限，没有此奖励时为空
 * @param bonuses 规则额外赠送的奖励，和理论基础清单分开
 * @param timedItems 本次真实新增的期限实例，不包含原有或过期回收实例
 * @param spirits 本次真实新增的精灵集合及实例格式版本，不是全部持有快照
 */
public record RewardGrantResult(
        String roleId,
        List<Outcome> items,
        RoleRepository.CurrencyCredit wallet,
        List<InventoryService.Credit> stacks,
        List<RoleRules.ExperienceGain> experience,
        List<TavernChange> tavern,
        List<Bonus> bonuses,
        List<TimedInventoryService.Item> timedItems,
        SpiritInventoryService.State spirits) {

    /** 少到账的真实规则原因；数量为0的结果仍保留，不能从明细中静默消失。 */
    public enum Reduction { NONE, ROLE_MAX_LEVEL, TAVERN_CAP }

    /** 升级赠钻单独标识来源，不混入直接奖励的理论量。 */
    public enum BonusSource { ROLE_LEVEL_UP }

    /**
     * 单配置理论量与实际量；requested始终等于credited加ignored。
     * @param itemId 真实物品配置ID
     * @param requested 加成取整并最终合并后的理论数量
     * @param credited 实际接纳数量，角色经验包含已消耗的跨级经验
     * @param ignored 因当前已核实上限而未接纳的数量
     * @param reason 明确减少原因，只有没有忽略量时为NONE
     */
    public record Outcome(int itemId, long requested, long credited, long ignored, Reduction reason) {
        /** 拒绝不自洽的实际结果，防止持久回执混入理论到账量。 */
        public Outcome {
            if (itemId <= 0 || requested <= 0 || credited < 0 || ignored < 0
                    || Math.addExact(credited, ignored) != requested || reason == null
                    || (ignored == 0) != (reason == Reduction.NONE)) {
                throw new IllegalArgumentException("发奖实际数量或减少原因无效");
            }
        }
    }

    /**
     * 本次规则额外赠送的数量，不包含玩家原有余额。
     * @param source 产生附赠的规则来源，当前只有角色升级
     * @param itemId 附赠奖励的真实配置ID，当前为钻石900002
     * @param quantity 本次附赠的正数量
     */
    public record Bonus(BonusSource source, int itemId, long quantity) {}

    /**
     * 酒馆900401的真实前后余额及本次冻结上限；包括没有库存且到账为0的情形。
     * @param beforeQuantity 原有余额，已超上限时不倒扣
     * @param limit 本次业务冻结的最高通关关卡上限
     * @param afterQuantity 本次入账后的真实余额，零到账时与原有相等
     */
    public record TavernChange(long beforeQuantity, long limit, long afterQuantity) {}

    /** 复制全部集合；精灵State自身也冻结列表及每只实例的技能。 */
    public RewardGrantResult {
        if (roleId == null || roleId.isBlank() || wallet == null || spirits == null) {
            throw new IllegalArgumentException("发奖结果缺少角色或领域结果");
        }
        items = List.copyOf(items);
        stacks = List.copyOf(stacks);
        experience = List.copyOf(experience);
        tavern = List.copyOf(tavern);
        bonuses = List.copyOf(bonuses);
        timedItems = List.copyOf(timedItems);
    }
}
