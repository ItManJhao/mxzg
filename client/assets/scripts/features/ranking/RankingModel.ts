/** 保存当前角色唯一的排行总览及已读详情。数据由 RankingController 提交，换号时清空。 */
import type { RankingBoardKind, RankingDetail, RankingOverview } from "./data/RankingData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "ranking.updated": undefined;
    }
}

export class RankingModel {
    /** 同一场景的总览和详情共用该实例。 */
    public static readonly instance = new RankingModel();
    /** 最近一次提交的总览，首次读取前和换号后为 null。 */
    private overview: RankingOverview | null = null;
    /** 当前会话读取过的榜单，按五种榜单类型索引。 */
    private readonly details = new Map<RankingBoardKind, RankingDetail>();

    /** 获取已提交的榜首与点赞状态。 */
    public get state(): RankingOverview | null {
        return this.overview;
    }

    /** 切换榜单时返回同榜最近一次已提交的详情。 */
    public detailFor(kind: RankingBoardKind): RankingDetail | null {
        return this.details.get(kind) ?? null;
    }

    /** 整体替换总览，通知由控制器在提交后发送。 */
    public setOverview(overview: RankingOverview): void {
        this.overview = overview;
    }

    /** 替换对应榜单的详情。 */
    public setDetail(detail: RankingDetail): void {
        this.details.set(detail.kind, detail);
    }

    /** 角色离开时清空所有排行榜状态。 */
    public reset(): void {
        this.overview = null;
        this.details.clear();
    }
}
