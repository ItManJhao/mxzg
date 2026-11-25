/** 公会目录、成员和审批列表的唯一客户端状态，由查询与变更回包整份替换。 */
import type { GuildRankingState } from "./data/GuildRankingData";

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
    /** 服务端当前公会等级，旧回包可能尚未同步。 */
    readonly level?: number;
    /** 当前等级累计的公会经验，零为真实初始值。 */
    readonly experience?: number;
    /** 旧公会等级表中本级经验门槛；和已累计经验一起显示。 */
    readonly nextLevelExperience?: number;
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
    /** 当前已保存主阵容的权威战力，缺失时不显示假数。 */
    readonly power?: number;
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

/** 周货架中的单个报价，cost 为一次兑换所需的公会勋章。 */
export interface GuildShopProduct {
    readonly productId: number;
    readonly itemId: number;
    readonly quantity: number;
    readonly cost: number;
    readonly limit: number;
    readonly purchased: number;
    readonly purchasable: boolean;
}

/** 当前公会周货架，余额继续读背包，由统一快照同步。 */
export interface GuildShopState {
    readonly requestId?: string;
    readonly guildId: string;
    readonly resetAtSeconds: number;
    readonly products: readonly GuildShopProduct[];
}

/** 单档捐献的实际扣除与个人勋章、公会经验。 */
export interface GuildDonationTier {
    readonly id: number;
    readonly costItemId: number;
    readonly costAmount: number;
    readonly medals: number;
    readonly experience: number;
}

/** 一档全会宝箱的门槛、个人领取状态和只读奖励预览。 */
export interface GuildDonationChest {
    readonly id: number;
    readonly points: number;
    readonly claimed: boolean;
    readonly rewards: readonly { readonly itemId: number; readonly quantity: number }[];
}

/** 今日捐献及公会等级状态；resetAt 为服务器 Unix 秒，0 档表示本人尚未捐献。 */
export interface GuildDonationState {
    readonly requestId?: string;
    readonly guildId: string;
    readonly resetAt: number;
    readonly level: number;
    readonly experience: number;
    readonly nextLevelExperience: number;
    readonly nextCapacity: number;
    readonly dailyPoints: number;
    readonly donatedTier: number;
    readonly tiers: readonly GuildDonationTier[];
    readonly chests: readonly GuildDonationChest[];
}

export class GuildModel {
    /** 应用与公会页面共用的状态实例。 */
    public static readonly instance = new GuildModel();

    /** 创建与入会后编辑共用的公告 UTF-16 长度上限，最终由服务端校验。 */
    public static readonly noticeLimit = 301;

    /** 最近一次通过协议校验的公会数据，换角色时释放。 */
    private state: GuildState | null = null;
    /** 通过服务端确认的周货架；离开当前公会或切换角色时清除。 */
    private shopState: GuildShopState | null = null;
    /** 通过服务端确认的日捐献投影；离开当前公会或切换角色时清除。 */
    private donationState: GuildDonationState | null = null;
    /** 当前区服排行与本人公会名次；公会身份变化时使本人行失效。 */
    private rankingState: GuildRankingState | null = null;

    /** 返回一次服务端读写产生的完整公会状态。 */
    public get snapshot(): GuildState | null {
        return this.state;
    }

    /** 返回已校验的周货架，空值表示还未取得有效结果。 */
    public get shop(): GuildShopState | null {
        return this.shopState;
    }

    /** 返回已校验的捐献投影，供大厅提醒和子窗读取。 */
    public get donation(): GuildDonationState | null {
        return this.donationState;
    }

    /** 返回已校验的本服排行榜，空值表示还未查询或已清理。 */
    public get ranking(): GuildRankingState | null {
        return this.rankingState;
    }

    /** 用查询或兑换回包替换当前周货架，清理时传 null。 */
    public replaceShop(state: GuildShopState | null): void {
        this.shopState = state;
    }

    /** 用查询或操作回包替换当前捐献状态，清理时传 null。 */
    public replaceDonation(state: GuildDonationState | null): void {
        this.donationState = state;
    }

    /** 提交本服排行榜与当前角色公会的名次，清理时传 null。 */
    public replaceRanking(state: GuildRankingState | null): void {
        this.rankingState = state;
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
