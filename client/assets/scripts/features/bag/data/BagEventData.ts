/** 背包本地事件载荷及类型映射，不替代服务端协议。 */
import { BagEvent } from "../utils/BagEvent";
import type { BagChangeSet } from "./BagChangeSet";
import type { BagState } from "./BagState";

/** 当前使用 initial-sync、session-reset、unknown；reward/consume 为历史预留，不能冒充真实协议原因。 */
export type BagChangeReason = "initial-sync" | "reward" | "consume" | "session-reset" | "unknown";
/** 汇总差异附带本地刷新原因。 */
export interface BagUpdateData extends BagChangeSet {
    /** 刷新原因；当前快照无法推断奖励或消耗，使用 unknown。 */
    readonly reason: BagChangeReason;
}
/** 新增条目的事件载荷。 */
export type BagAddData = Pick<BagUpdateData, "revision" | "reason" | "added">;
/** 删除条目的事件载荷。 */
export type BagRemoveData = Pick<BagUpdateData, "revision" | "reason" | "removed">;
/** 已有条目数量变化的事件载荷。 */
export type BagQuantityChangedData = Pick<BagUpdateData, "revision" | "reason" | "quantityChanged">;
/** 不携带库存列表的同步状态通知。 */
export type BagSyncStateChangedData = Pick<BagState, "revision" | "status" | "synced">;

declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 整批库存提交完成的汇总通知。 */
        [BagEvent.BagUpdate]: Readonly<BagUpdateData>;
        /** 新增种类通知，不是服务端奖励演出指令。 */
        [BagEvent.BagAdd]: Readonly<BagAddData>;
        /** 库存条目消失通知。 */
        [BagEvent.BagRemove]: Readonly<BagRemoveData>;
        /** 已有条目的数量变化通知。 */
        [BagEvent.BagQuantityChanged]: Readonly<BagQuantityChangedData>;
        /** 应用清空数据或完成同步后的状态通知。 */
        [BagEvent.BagSyncStateChanged]: Readonly<BagSyncStateChangedData>;
    }
}
