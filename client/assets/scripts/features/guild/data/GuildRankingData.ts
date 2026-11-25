/** 公会本服战力榜读取结果，供协议校验、唯一公会模型和排行预制体共用。 */

/** 同一公会的公开排行资料。 */
export interface GuildRankEntry {
    /** 正整数为服务端名次，0 表示本人公会未上榜。 */
    readonly rank: number;
    /** 公会持久标识，用于将本人行与主榜中的同一公会关联。 */
    readonly guildId: string;
    /** 公会所属的实际区服。 */
    readonly serverId: string;
    /** 公会显示名称。 */
    readonly name: string;
    /** 公会徽章编号，0 为可用默认徽章。 */
    readonly badgeId: number;
    /** 查询时的现任会长名称。 */
    readonly leaderName: string;
    /** 在会成员的历史最高主阵容战力之和。 */
    readonly power: number;
}

/** 区服前一百名和请求者的公会数据。 */
export interface GuildRankingState {
    /** 按服务端名次已排序的完整榜单。 */
    readonly entries: readonly GuildRankEntry[];
    /** 未入会时缺省；入会但未上榜时保留真实公会资料。 */
    readonly own?: GuildRankEntry | null;
}
