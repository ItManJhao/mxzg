/** 背包提交后的增删改类型，用于界面刷新，首次同步与奖励表现分离。 */
import type { BagItemData } from "./BagItemData";

/** 已有物品的数量变化，当前按配置 ID 聚合，尚不支持旧版装备实例。 */
export interface BagQuantityChange {
    /** 当前协议的物品配置 ID，尚非旧版独立装备实例 ID。 */
    readonly itemId: BagItemData["itemId"];
    /** 提交前数量。 */
    readonly oldQuantity: number;
    /** 提交后的绝对数量。 */
    readonly newQuantity: number;
    /** 数量差值，正数增加、负数扣除。 */
    readonly delta: number;
}

/** Model 整批校验并提交后生成的界面差异，不是服务端奖励凭证。 */
export interface BagChangeSet {
    /** 应用传入的角色归属键，退出后为 null；不用于向服务端指定资产所有者。 */
    readonly roleKey: string | null;
    /** Model 本地提交序号，用于界面通知，不是服务端持久资产版本。 */
    readonly revision: number;
    /** 本角色首次完整同步时为 true，不能据此播放奖励演出。 */
    readonly initialSync: boolean;
    /** 此前不存在的新条目；首次同步为空。 */
    readonly added: readonly BagItemData[];
    /** 前后都存在且数量变化的条目；首次同步为空。 */
    readonly quantityChanged: readonly BagQuantityChange[];
    /** 此次消失的旧条目，保留删除前数量；首次同步为空。 */
    readonly removed: readonly BagItemData[];
}
