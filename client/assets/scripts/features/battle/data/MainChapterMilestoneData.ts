/**
 * 主线里程碑领取的稳定业务键与冻结回执，只描述操作确认，不保存第二份资产。
 * 应用持久化rewardId，模块在统一快照确认已领及revision后交付同一原回执给通用反馈。
 */
import type { GameFrame } from "../../../platform/GameProtocolCodecUtils";
import type { Protocol } from "../../../platform/Protocol";
import type { MainChapterRewardActual, MainChapterState } from "../MainChapterModel";
import type { HeroGrantItem } from "../../reward/data/RewardData";

/** 已在原角色锁事务提交的历史结果；state和actual只供校验与展示，不回写权威Model。 */
export interface MainChapterMilestoneReceipt {
    /** 当前回执格式固定1，不接受未知格式猜测。 */
    readonly schemaVersion: 1;
    /** chapterextrareward的原配置ID，同时是每角色稳定业务键。 */
    readonly rewardId: number;
    /** 服务端首次成功冻结的UUID，重试和反馈共用，不生成第二份奖励身份。 */
    readonly receiptId: string;
    /** 原发放所属角色，仅应用绑定负责与当前已认证身份核对。 */
    readonly roleId: string;
    /** 领取提交后的原统一资产版本。 */
    readonly assetRevision: number;
    /** 领取时的历史进度，不能覆盖最新主线快照。 */
    readonly state: MainChapterState;
    /** 同笔实际到账及原新英雄实例，不按当前名册差量猜测。 */
    readonly actual: MainChapterRewardActual & { readonly heroes: readonly HeroGrantItem[] };
    /** 当时规则要求的绝对通关idx。 */
    readonly targetChapter: number;
    /** 当时配置完整内容版本，恢复不按新配置重算。 */
    readonly rulesVersion: string;
}

/** 同模块操作进度；换号清内存，应用持久意图独立保留。 */
export interface MilestoneClaimProgress {
    /** idle无意图，pending待回执/快照，delivering反馈确认中，confirmed已交付原反馈。 */
    readonly phase: "idle" | "pending" | "delivering" | "confirmed";
    /** 该角色原稳定键，null表示没有本地待恢复意图。 */
    readonly rewardId: number | null;
    /** 已校验的原回执；未找到时为null，不补造奖励。 */
    readonly receipt: MainChapterMilestoneReceipt | null;
    /** 操作等待或失败原因，由页面统一飘字，不作为玩法正文。 */
    readonly message: string;
}

/** 应用提供身份隔离后的两条已实现请求，不允许模块直接操作连接或凭证。 */
export type MainChapterMilestoneSend = (name: typeof Protocol.CHAPTER_MILESTONE_CLAIM | typeof Protocol.CHAPTER_MILESTONE_STATUS,
    body: { readonly rewardId: number }, received: (frame: GameFrame) => void,
    failed: (error: unknown) => void) => Promise<void>;
