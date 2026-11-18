/** 独立通关奖励协议和过程状态：原键是绝对关卡号，和里程碑配置ID无关。 */
import type { GameFrame } from "../../../platform/GameProtocolCodecUtils";
import type { Protocol } from "../../../platform/Protocol";
import type { HeroGrantItem } from "../../reward/data/RewardData";
import type { MainChapterRewardActual } from "../MainChapterModel";

/** 服务器统一快照里的独立通关奖励进度。 */
export interface MainChapterFirstRewardProgress {
    /** 首版进度格式，缺扩展时保持未同步。 */
    readonly schemaVersion: 1;
    /** 本角色独立通关奖励已领取的绝对关卡，不含战斗结果或里程碑。 */
    readonly claimedChapters: readonly number[];
    /** 当前服务器确认可领取、已达成但尚未领取的关卡。 */
    readonly eligibleChapters: readonly number[];
}

/** 原事务已提交的冻结实际结果，不能写回当前权威状态。 */
export interface MainChapterFirstRewardReceipt {
    /** 首版回执，未知格式拒绝处理。 */
    readonly schemaVersion: 1;
    /** 领取的是旧策划 firstrewardchapter.chapter 指定的绝对关卡。 */
    readonly chapter: number;
    /** 同一事务重试和反馈使用的持久UUID。 */
    readonly receiptId: string;
    /** 归属角色只在应用边界核对。 */
    readonly roleId: string;
    /** 事务提交后的资产版本，必须用统一快照确认。 */
    readonly assetRevision: number;
    /** 原事务实际资产与英雄归属，供通用奖励反馈。 */
    readonly actual: MainChapterRewardActual & { readonly heroes: readonly HeroGrantItem[] };
}

/** 当前原关卡的确认进度，应用换号时清空。 */
export interface FirstRewardClaimProgress {
    /** pending表示原回执或快照待确认，delivering表示原反馈排队等待展示。 */
    readonly phase: "idle" | "pending" | "delivering" | "confirmed";
    /** 仍待完成操作的绝对关卡；null表示无原操作。 */
    readonly chapter: number | null;
    /** 已匹配原键的冻结实际回执；null表示尚未获取。 */
    readonly receipt: MainChapterFirstRewardReceipt | null;
    /** 当前轮网络或反馈确认是否仍在执行；失败后的原键仍可重试。 */
    readonly busy: boolean;
}

/** 与里程碑一样，模块只经应用提供的已认证定向交付发送真实请求。 */
export type FirstRewardSend = (
    name: typeof Protocol.CHAPTER_FIRST_REWARD_CLAIM | typeof Protocol.CHAPTER_FIRST_REWARD_STATUS,
    body: { readonly chapter: number },
    received: (frame: GameFrame) => void,
    failed: (error: unknown) => void,
) => Promise<void>;
