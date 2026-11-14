/** 背包只读状态契约，区分未同步与空背包，角色归属由应用层协调。 */
import type { BagItemData, BagSpiritItem, BagTimedItem } from "./BagItemDataUtils";

/** 本地展示同步状态；不表示 WebSocket 连接是否在线。 */
export type BagStatus = "idle" | "ready";

/** 对外冻结的完整背包快照，页面只能读取。 */
export interface BagState {
    /** Model 本地提交序号，用于界面通知，不是服务端持久资产版本。 */
    readonly revision: number;
    /** idle 未初始化、ready 已同步；断线提示由应用层负责，保留上次库存。 */
    readonly status: BagStatus;
    /** 是否收到过本角色完整库存；空数组也算成功，重置后为 false。 */
    readonly synced: boolean;
    /** 完整只读库存，不因 UI 筛选而删除隐藏条目。 */
    readonly items: readonly BagItemData[];
    /** 服务端确认的逐件期限库存，当前与普通格子分开保存，后续接入倒计时展示。 */
    readonly timedItems: readonly BagTimedItem[];
    /** 期限列表对应的服务器 Unix 秒；旧快照未携带时为 null，不以本机时间代替。 */
    readonly timedServerTimeSeconds: number | null;
    /** 服务端确认的独立精灵实例；同物品ID的多件实例保持各自特性和技能，不合并数量。 */
    readonly spiritItems: readonly BagSpiritItem[];
    /** true表示完整精灵快照已提供（包括真实空列表）；false表示旧快照未提供，不能当作已知空库存。 */
    readonly spiritSynced: boolean;
}
