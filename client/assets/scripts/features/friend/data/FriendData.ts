/** 好友认证协议的展示数据，礼物资格按服务端自然日判断。 */

/** 好友主窗口的四个列表。 */
export type FriendTab = "friends" | "gifts" | "applications" | "blocked";

/** 对真实好友关系或友情点礼物执行的操作。 */
export type FriendAction = "APPLY" | "ACCEPT" | "REJECT" | "REMOVE" | "BLOCK" | "UNBLOCK"
    | "SEND" | "SEND_ALL" | "CLAIM" | "CLAIM_ALL";

/** 同服好友模块使用的角色公开资料及当前玩家与该角色的关系。 */
export interface FriendEntry {
    readonly roleId: string;
    readonly serverId: string;
    readonly name: string;
    readonly level: number;
    readonly headId: number;
    readonly borderId: number;
    readonly power: number;
    readonly lastLoginAt: number;
    readonly giftState: 0 | 1 | 2;
    readonly sentToday: boolean;
    readonly requested: boolean;
}

/** 独立好友业务快照。resetAt 为该日结束的 Unix 秒。 */
export interface FriendState {
    readonly resetAt: number;
    readonly friendLimit: number;
    readonly blockLimit: number;
    readonly sentToday: number;
    readonly sendLimit: number;
    readonly friendship: number;
    readonly friends: readonly FriendEntry[];
    readonly gifts: readonly FriendEntry[];
    readonly applications: readonly FriendEntry[];
    readonly blocked: readonly FriendEntry[];
}

/** 服务器规范化查询和匹配的角色，空查询返回推荐。 */
export interface FriendSearchResult {
    readonly query: string;
    readonly entries: readonly FriendEntry[];
}
