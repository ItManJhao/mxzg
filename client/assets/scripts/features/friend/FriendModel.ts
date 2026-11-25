/** 当前玩家好友关系及最近查询的唯一客户端状态，换号时随应用清空。 */
import type { FriendSearchResult, FriendState } from "./data/FriendData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "friend.updated": undefined;
        "friend.search.updated": undefined;
    }
}

export class FriendModel {
    /** 供主窗口、搜索和主城红点读取的唯一实例。 */
    public static readonly instance = new FriendModel();
    /** 首包未到或退出登录时为 null。 */
    private snapshot: FriendState | null = null;
    /** 当前搜索窗口最近一次完成的查询；打开新搜索或换号时清空。 */
    private result: FriendSearchResult | null = null;

    /** 最近提交的好友快照。 */
    public get state(): FriendState | null {
        return this.snapshot;
    }

    /** 搜索或推荐的最新匹配。 */
    public get searchResult(): FriendSearchResult | null {
        return this.result;
    }

    /** 以权威完整快照替换四个关系列表。 */
    public setState(state: FriendState | null): void {
        this.snapshot = state;
    }

    /** 提交当前搜索结果或清除上一次显示。 */
    public setSearch(result: FriendSearchResult | null): void {
        this.result = result;
    }
}
