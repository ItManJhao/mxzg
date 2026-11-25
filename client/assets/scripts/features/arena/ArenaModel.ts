/**
 * 竞技场 Model 保存对手、攻防记录、积分榜、赛季和专用防守阵容。
 * ArenaController 提交服务端结果，页面读取同一份状态，切换角色时整体清空。
 */
import type { SettledBattle } from "../battle/ui/SettledBattlePlayback";
import type { FormationSaveRequest } from "../hero/data/FormationData";

/** 当前候选对手。机器人使用配置 ID，真人使用持久角色编号。 */
export interface ArenaOpponent {
    readonly id: number;
    readonly name: string;
    readonly level: number;
    readonly score: number;
    readonly power: number;
    readonly avatarId: number;
    readonly roleId?: string;
    readonly borderId?: number;
}

/** 已结算挑战的冻结历史，点击后按 battleId 请求原战报。 */
export interface ArenaHistory {
    readonly battleId: string;
    readonly opponentId: number;
    readonly opponentName: string;
    readonly won: boolean;
    readonly scoreDelta: number;
    readonly settledAtSeconds: number;
    readonly opponentRoleId?: string;
    readonly defense?: boolean;
}

/** 竞技场权威状态。胜场计数只控制新手段，参与次数包含失败。 */
export interface ArenaState {
    readonly score: number;
    readonly freeRemaining: number;
    readonly ticketBalance: number;
    readonly ticketPriceDiamonds: number;
    readonly robotWins: number;
    readonly settledChallenges: number;
    readonly resetAtSeconds: number;
    readonly newcomerActive: boolean;
    readonly opponents: readonly ArenaOpponent[];
    readonly history: readonly ArenaHistory[];
}

/** 本服积分榜公开资料。rank 为 0 时是尚未上榜的本人。 */
export interface ArenaRanking {
    readonly rank: number;
    readonly roleId: string;
    readonly name: string;
    readonly level: number;
    readonly score: number;
    readonly power: number;
    readonly headId: number;
    readonly borderId: number;
    readonly receivedLikes: number;
    readonly liked: boolean;
}

/** 服务端给定榜单、本人位置和当天的点赞次数。 */
export interface ArenaRankings {
    readonly entries: readonly ArenaRanking[];
    readonly own: ArenaRanking;
    readonly likesRemaining: number;
    readonly dailyEndsAt: number;
}

/** 原策划表中的道具及数量，供奖励和兑换预览。 */
export interface ArenaReward {
    readonly itemId: number;
    readonly quantity: number;
}

/** 单个名次区间适用的结算邮件奖励。 */
export interface ArenaRewardTier {
    readonly minRank: number;
    readonly maxRank: number;
    readonly rewards: readonly ArenaReward[];
}

/** 周宝箱的挑战门槛、原图标、奖励和当前领取状态。 */
export interface ArenaChest {
    readonly id: number;
    readonly requiredChallenges: number;
    readonly boxPic: number;
    readonly rewards: readonly ArenaReward[];
    readonly claimed: boolean;
}

/** 挑战与结算截止秒、周宝箱进度及两类名次奖励。 */
export interface ArenaSeason {
    readonly seasonEndsAt: number;
    readonly dailyEndsAt: number;
    readonly challengeEndsAt?: number;
    readonly seasonChallenges: number;
    readonly chests: readonly ArenaChest[];
    readonly dailyTiers: readonly ArenaRewardTier[];
    readonly seasonTiers: readonly ArenaRewardTier[];
}

/** 赛季专用防守队，未编辑时读取主阵容作为初始草稿。 */
export interface ArenaDefense {
    readonly version: number;
    readonly formationId: number;
    readonly slots: FormationSaveRequest["slots"];
    readonly fallback: boolean;
}

/** 当周可购买的竞技商店商品和真实兑换次数。 */
export interface ArenaShopOffer {
    readonly id: number;
    readonly requiredLevel: number;
    readonly purchaseLimit: number;
    readonly purchased: number;
    readonly price: number;
    readonly rewards: readonly ArenaReward[];
}

/** 当前商店目录及上海周一的刷新时刻。 */
export interface ArenaShopState {
    readonly currencyBalance: number;
    readonly refreshAt: number;
    readonly offers: readonly ArenaShopOffer[];
}

export class ArenaModel {
    /** 当前应用的唯一竞技场状态。 */
    public static readonly instance = new ArenaModel();
    /** 上次服务器交付的对手和历史，换号时清空。 */
    public state: ArenaState | null = null;
    /** 最近提交的本服积分榜，换号重置。 */
    public ranking: ArenaRankings | null = null;
    /** 最近提交的赛季和周箱状态，换号重置。 */
    public season: ArenaSeason | null = null;
    /** 读写专用防守阵容的权威视图，换号重置。 */
    public defense: ArenaDefense | null = null;
    /** 当前竞技商店目录，换号重置。 */
    public shop: ArenaShopState | null = null;
    /** 本次结算或点选历史交给当前竞技场页播放，取走或换号后清空。 */
    private battle: SettledBattle | null = null;

    /** 接收已冻结的原战报和对应展示参数。 */
    public setBattle(battle: SettledBattle): void {
        this.battle = battle;
    }

    /** 取走一次待展示战报，不改变服务器结果。 */
    public takeBattle(): SettledBattle | null {
        const battle = this.battle;
        this.battle = null;
        return battle;
    }

    /** 当前角色离开时释放竞技场状态和残留演出。 */
    public reset(): void {
        this.state = null;
        this.ranking = null;
        this.season = null;
        this.defense = null;
        this.shop = null;
        this.battle = null;
    }
}
