/** 日常副本的数据入口，按副本类型保存权威关卡、每日次数与待展示的已结算战报。 */
import { DAILY_DUNGEON_PROTOCOLS, type DailyDungeonKind } from "../../platform/Protocol";
export type { DailyDungeonKind } from "../../platform/Protocol";

/** 已接通的副本类型及原页签顺序。 */
export const DAILY_DUNGEON_KINDS: readonly DailyDungeonKind[] =
    Object.keys(DAILY_DUNGEON_PROTOCOLS) as DailyDungeonKind[];

/** 关卡奖励预览或结算确认的物品条目。 */
export interface DailyDungeonItem {
    readonly itemId: number;
    readonly quantity: number;
}

/** 服务端校验的单关进度、门槛和产物；ribbon 为原关卡牌匾图编号。 */
export interface DailyDungeonStage {
    readonly stageId: number;
    readonly titleLanguageId: number;
    readonly minimumLevel: number;
    readonly requiredPower: number;
    readonly cleared: boolean;
    readonly unlocked: boolean;
    readonly canChallenge: boolean;
    readonly ribbon: number;
    readonly rewardPreview: readonly DailyDungeonItem[];
}

/** 同一类型的关卡共用当日胜场和报价，resetAtSeconds 是服务器 Unix 秒。 */
export interface DailyDungeonState extends Omit<DailyDungeonStage, "minimumLevel" | "ribbon"> {
    readonly wins: number;
    readonly freeLimit: number;
    readonly totalLimit: number;
    readonly nextCostDiamonds: number;
    readonly resetAtSeconds: number;
    readonly power: number;
    /** 新回包包含完整列表；兼容已有首关冻结回执只保存其单关状态。 */
    readonly stages?: readonly DailyDungeonStage[];
}

/** 真实战报和实际到账数量，播放结束只消费展示，无须再发结算协议。 */
export interface DailyDungeonBattle {
    readonly bytes: Uint8Array;
    readonly won: boolean;
    readonly rewards: readonly DailyDungeonItem[];
}

export class DailyDungeonModel {
    /** 单个应用只维护一份按类型索引的副本状态。 */
    public static readonly instance = new DailyDungeonModel();

    /** 各类型最近一次服务端确认的状态，第一次读取完成前无条目。 */
    private readonly states = new Map<DailyDungeonKind, DailyDungeonState>();
    /** 各类型尚未开始播放的已结算战报，接管显示或换号后移除。 */
    private readonly battles = new Map<DailyDungeonKind, DailyDungeonBattle>();

    /** 返回指定副本的权威状态，尚未同步时返回 null。 */
    public stateFor(kind: DailyDungeonKind): DailyDungeonState | null {
        return this.states.get(kind) ?? null;
    }

    /** 刷新指定副本的关卡列表和当日次数。 */
    public applyState(kind: DailyDungeonKind, state: DailyDungeonState): void {
        this.states.set(kind, state);
    }

    /** 返回服务器交付的可见关卡，历史首关回执只投影已有状态。 */
    public stagesFor(kind: DailyDungeonKind): readonly DailyDungeonStage[] {
        const state = this.stateFor(kind);
        if (!state) {
            return [];
        }
        if (state.stages?.length) {
            return state.stages;
        }
        return [{
            stageId: state.stageId,
            titleLanguageId: state.titleLanguageId,
            minimumLevel: 0,
            requiredPower: state.requiredPower,
            cleared: state.cleared,
            unlocked: state.unlocked,
            canChallenge: state.canChallenge,
            ribbon: 1,
            rewardPreview: state.rewardPreview,
        }];
    }

    /** 同步提交本次战报与胜利后的次数，回包已经过协议校验。 */
    public applyBattle(kind: DailyDungeonKind, state: DailyDungeonState, battle: DailyDungeonBattle): void {
        this.applyState(kind, state);
        this.battles.set(kind, battle);
    }

    /** 页面拿走一次展示用战报；不存在未播放结果时返回 null。 */
    public takeBattle(kind: DailyDungeonKind): DailyDungeonBattle | null {
        const battle = this.battles.get(kind) ?? null;
        this.battles.delete(kind);
        return battle;
    }

    /** 身份变化由应用通知，清空原角色的副本状态和待播放结果。 */
    public reset(): void {
        this.states.clear();
        this.battles.clear();
    }
}
