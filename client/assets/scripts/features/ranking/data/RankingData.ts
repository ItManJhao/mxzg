/** 排行榜的展示数据，由真实榜单和点赞回执更新。 */

/** 当前大厅展示的五个榜单标识。 */
export type RankingBoardKind = "CHAPTER" | "GUILD" | "POWER" | "CROSS_GUILD" | "CROSS_POWER";

/** 角色或公会的公开展示资料。自己的名次为零时表示未上榜。 */
export interface RankingEntry {
    readonly rank: number;
    readonly id: string;
    readonly serverId: string;
    readonly name: string;
    readonly score: number;
    readonly level: number;
    readonly headId: number;
    readonly borderId: number;
    readonly badgeId: number;
    readonly leaderName: string;
}

/** 总览卡片只携带榜首和本角色当天的点赞状态。 */
export interface RankingBoard {
    readonly kind: RankingBoardKind;
    readonly leader?: RankingEntry;
    readonly liked: boolean;
}

/** 日界以 Unix 秒提供，跨服解锁与是否有上榜者相互独立。 */
export interface RankingOverview {
    readonly crossLevel: number;
    readonly resetAt: number;
    readonly crossUnlocked: boolean;
    readonly boards: readonly RankingBoard[];
}

/** 指定榜单的前五十与本人行，未入会时无本人公会行。 */
export interface RankingDetail {
    readonly kind: RankingBoardKind;
    readonly entries: readonly RankingEntry[];
    readonly own?: RankingEntry;
}
