/** 公会目录、成员和审批列表的唯一客户端状态，由查询与变更回包整份替换。 */

/** 服务端给出的公会列表或当前公会资料。 */
export interface GuildSummary {
    /** 区服内公会的持久 ID。 */
    readonly id: string;
    /** 公会显示名。 */
    readonly name: string;
    /** 实际已加入的成员数与容量。 */
    readonly memberCount: number;
    readonly capacity: number;
    /** 会长在创建时填写的说明。 */
    readonly description?: string;
    /** 公会选定的原徽章编号。旧资料未同步时缺失。 */
    readonly badgeId?: number;
}

/** 成员与待审批申请人共用的角色公开资料。 */
export interface GuildMember {
    /** 审批与成员行使用的服务器角色 ID。 */
    readonly id: string;
    readonly nickname: string;
    readonly level: number;
    readonly leader: boolean;
    /** 角色当前头像与佩戴框，旧回包可能尚未同步。 */
    readonly headId?: number;
    readonly borderId?: number;
}

/** 当前玩家能读取的公会数据，未加入时提供目录与本人待审批的申请。 */
export interface GuildState {
    readonly levelRequired: number;
    readonly createCostDiamonds: number;
    readonly nameLimit: number;
    readonly guild?: GuildSummary;
    readonly members: readonly GuildMember[];
    readonly applications: readonly GuildMember[];
    readonly guilds: readonly GuildSummary[];
    readonly page: number;
    readonly hasMore: boolean;
    readonly appliedGuildIds: readonly string[];
    /** 冷却截止时间为 Unix 秒，0 表示没有冷却。 */
    readonly rejoinAtSeconds: number;
}

export class GuildModel {
    /** 应用与公会页面共用的状态实例。 */
    public static readonly instance = new GuildModel();

    /** 最近一次通过协议校验的公会数据，换角色时释放。 */
    private state: GuildState | null = null;

    /** 返回一次服务端读写产生的完整公会状态。 */
    public get snapshot(): GuildState | null {
        return this.state;
    }

    /** 按服务端名单判断当前角色是否是现任会长。 */
    public static canApprove(state: GuildState | null, roleId: string | undefined): boolean {
        return !!state?.guild && state.members.some(member => member.leader && member.id === roleId);
    }

    /** 提交已校验的回包，或在离开账号时清空。 */
    public replace(state: GuildState | null): void {
        this.state = state;
    }
}
