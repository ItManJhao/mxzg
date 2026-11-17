/**
 * 通用发奖反馈的数据契约：保存服务端已提交结果及客户端展示进度。
 * 通知与已确认历史回执共用同一编号；这里只描述展示，不代表当前资产或发奖命令。
 */
import type { RewardItem, RoleUpgradeData, HeroGrantItem } from "./RewardData";

/** 实时通知按服务端指定模式；已确认历史回执按原业务交互恢复，静默也参与去重，不反推背包变化。 */
export type RewardNoticeMode = "SILENT" | "POPUP" | "TIPS";

/** 已通过通信与应用归属校验的实际发奖结果。 */
export interface RewardNotice {
    /** 冻结的新英雄实例；不作为当前资产增量，和本回执实际数量严格对应。 */
    readonly heroes?: readonly HeroGrantItem[];
    /** 当前支持的反馈格式，未知格式由协议边界拒绝。 */
    readonly schemaVersion: 1;
    /** 原业务成功回执的UUID，通知与恢复必须保持一致。 */
    readonly receiptId: string;
    /** 可选原业务请求UUID，只用于应用协调本地待确认意图；不改变回执去重身份或奖励内容。 */
    readonly requestId?: string;
    /** 原事务角色；归属由应用校验，模块不比较账号或角色键。 */
    readonly roleId: string;
    /** 原事务提交后的持久资产版本，展示必须等待统一快照达到此值。 */
    readonly assetRevision: number;
    /** 静默、通用奖励窗或全局飘字，由服务端明确指定。 */
    readonly mode: RewardNoticeMode;
    /** 已合并同配置ID的实际正到账量，不接受理论收益或当前库存。 */
    readonly items: readonly RewardItem[];
    /** 原事务发生真实升级时提供；允许无正物品的升级反馈，不用当前角色等级补猜。 */
    readonly roleUpgrade?: RoleUpgradeData;
}

/** 展示等待、执行与失败状态，失败只能由显式重试恢复。 */
export type RewardPhase = "idle" | "waiting-ready" | "waiting-state" | "queued" | "showing" | "failed";

/** 当前会话的只读反馈进度，不保存另一份资产快照。 */
export interface RewardProgress {
    /** 队首当前所处的展示阶段。 */
    readonly phase: RewardPhase;
    /** 主城展示宿主是否可用，false时不启动后续反馈。 */
    readonly ready: boolean;
    /** 应用已接纳的最高持久资产版本，0表示尚未接纳首包。 */
    readonly assetRevision: number;
    /** 按到达顺序保留的待展示批次，正在展示的批次仍在队首。 */
    readonly pending: readonly RewardNotice[];
    /** 正在等待窗口关闭或飘字提交完成的回执编号。 */
    readonly activeReceiptId: string | null;
    /** 最近一次队首展示失败的说明；重试或重置后清空。 */
    readonly message: string;
    /** 本会话已接纳的唯一回执数，含静默和已完成批次。 */
    readonly acceptedCount: number;
}
