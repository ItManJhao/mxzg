/** 日常副本的数据入口，保存服务端金币首关状态和一份待展示的已结算战报。 */

/** 关卡奖励预览或结算确认的物品条目。 */
export interface DailyDungeonItem {
    readonly itemId: number;
    readonly quantity: number;
}

/** 服务端校验的关卡状态；wins 为当日已用的成功次数，resetAtSeconds 为 Unix 秒。 */
export interface DailyDungeonState {
    readonly stageId: number;
    readonly titleLanguageId: number;
    readonly wins: number;
    readonly freeLimit: number;
    readonly totalLimit: number;
    readonly nextCostDiamonds: number;
    readonly resetAtSeconds: number;
    readonly power: number;
    readonly requiredPower: number;
    readonly cleared: boolean;
    readonly unlocked: boolean;
    readonly canChallenge: boolean;
    readonly rewardPreview: readonly DailyDungeonItem[];
}

/** 真实战报和实际到账数量，播放结束只消费展示，无须再发结算协议。 */
export interface DailyDungeonBattle {
    readonly bytes: Uint8Array;
    readonly won: boolean;
    readonly rewards: readonly DailyDungeonItem[];
}

export class DailyDungeonModel {
    /** 单个应用只维护一份副本状态。 */
    public static readonly instance = new DailyDungeonModel();

    /** 最近一次服务端确认的状态，登录后首次访问前为 null。 */
    public state: DailyDungeonState | null = null;
    /** 尚未开始播放的已结算战报；接管显示或换号后清空。 */
    private battle: DailyDungeonBattle | null = null;

    /** 同步提交本次战报与胜利后的次数，回包已经过协议校验。 */
    public applyBattle(state: DailyDungeonState, battle: DailyDungeonBattle): void {
        this.state = state;
        this.battle = battle;
    }

    /** 页面拿走一次展示用战报；不存在未播放结果时返回 null。 */
    public takeBattle(): DailyDungeonBattle | null {
        const battle = this.battle;
        this.battle = null;
        return battle;
    }

    /** 身份变化由应用通知，清空原角色的副本状态和待播放结果。 */
    public reset(): void {
        this.state = null;
        this.battle = null;
    }
}
