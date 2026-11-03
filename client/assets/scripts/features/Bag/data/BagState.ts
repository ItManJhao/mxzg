/** 背包只读状态契约，区分未同步与空背包，角色归属由应用层协调。 */
import type { BagItemData } from "./BagItemData";

/** 本地展示同步状态；不表示 WebSocket 连接是否在线。 */
export type BagStatus = "idle" | "ready";

/** 对外冻结的完整背包快照，页面只能读取。 */
export interface BagState {
    /** 应用传入的角色归属键，退出后为 null；不用于向服务端指定资产所有者。 */
    readonly roleKey: string | null;
    /** Model 本地提交序号，用于界面通知，不是服务端持久资产版本。 */
    readonly revision: number;
    /** idle 未初始化、ready 已同步；断线提示由应用层负责，保留上次库存。 */
    readonly status: BagStatus;
    /** 是否收到过本角色完整库存；空数组也算成功，重置后为 false。 */
    readonly synced: boolean;
    /** 完整只读库存，不因 UI 筛选而删除隐藏条目。 */
    readonly items: readonly BagItemData[];
}
