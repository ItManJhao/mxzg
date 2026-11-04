/** 背包界面事件名称表：由 Controller 在 Model 提交后派发，View 按目标订阅和释放。 */
export const BagEvent = {
    /** 完整提交后的汇总刷新，包括首次同步及会话清空。 */
    BagUpdate: "bag.update",
    /** 新增库存种类，不能据此判断奖励演出。 */
    BagAdd: "bag.add",
    /** 整个库存条目消失。 */
    BagRemove: "bag.remove",
    /** 已有条目的数量变化，既可能增加也可能扣除。 */
    BagQuantityChanged: "bag.quantity-changed",
    /** 角色归属或同步状态变化，与数量差异分开通知。 */
    BagSyncStateChanged: "bag.sync-state-changed",
} as const;
