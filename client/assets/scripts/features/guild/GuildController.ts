/** 公会协议入口，提交玩家操作、接收公会状态，并通知当前页面。 */
import { BaseController } from "../../framework/BaseController";
import { RedDotManager } from "../../framework/ui/RedDotManager";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { GameRedDotKey } from "../common/utils/GameRedDotKey";
import { GuildModel, type GuildDonationState, type GuildShopState, type GuildState } from "./GuildModel";
import type { GuildRankingState } from "./data/GuildRankingData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "guild.updated": undefined;
        "guild.shop.updated": undefined;
        "guild.donation.updated": undefined;
        "guild.ranking.updated": undefined;
    }
}

/** 服务端校验的公会变更意图，模板字段只随实际操作发送。 */
export type GuildChange =
    | { readonly action: "CREATE"; readonly name: string; readonly description?: string; readonly badgeId?: number }
    | { readonly action: "UPDATE_NOTICE"; readonly guildId: string; readonly description: string }
    | { readonly action: "APPLY"; readonly guildId: string }
    | { readonly action: "APPROVE" | "REJECT"; readonly guildId: string; readonly applicantId: string }
    | { readonly action: "LEAVE"; readonly guildId: string };

/** 入会大厅打开的三个独立窗口。 */
type GuildFeature = "shop" | "donation" | "ranking";

/** 只读协议与界面通知按公会功能对应，服务端推送仍使用 guild.updated。 */
const FEATURE = {
    shop: { read: Protocol.GUILD_SHOP_LIST, event: "guild.shop.updated" },
    donation: { read: Protocol.GUILD_DONATION_INFO, event: "guild.donation.updated" },
    ranking: { read: Protocol.GUILD_RANKING, event: "guild.ranking.updated" },
} as const;

export class GuildController extends BaseController {
    /** 由应用装配的公会模块入口。 */
    public static readonly instance = new GuildController();

    /** 账号层认证操作，应用卸载时释放。 */
    private operations: AccountOperations | null = null;
    /** 统一角色快照，用来限定大厅外的审批提醒查询。 */
    private account: Pick<AccountModel, "snapshot"> | null = null;
    /** 主城打开后为 true，允许已加入公会的角色在大厅外查询审批状态。 */
    private homeReady = false;
    /** 公会大厅可见时为 true，允许查看目录和当前搜索。 */
    private visible = false;
    /** 保存本次在途操作。空值表示界面可操作，申请成功时按原版给出飘字。 */
    private pending: "LIST" | GuildChange["action"] | null = null;
    /** 请求期间收到变化后，在原操作结束时补看服务器一次。 */
    private refreshQueued = false;
    /** 目录当前的查找条件，仅在显示期用于恢复目录。 */
    private query = "";
    /** 目录当前请求的页码，从 1 开始。 */
    private page = 1;
    /** 上次服务端确认的公会 ID，成员变更时清除子窗数据。 */
    private activeGuildId: string | undefined;
    /** 当前打开的公会子窗，用于重连补查和失败提示。 */
    private readonly visibleFeatures = new Set<GuildFeature>();
    /** 各子系统独立跟踪一个在途请求，旧公会回包只结束自己的请求。 */
    private readonly featureRequests = new Map<GuildFeature, object>();
    /** 捐献查询期间又收到全会贡献变化时，在当前请求后补读一次。 */
    private donationRefreshQueued = false;

    /** 由应用注入统一发包入口和成员身份来源。 */
    public configure(operations: AccountOperations, account: Pick<AccountModel, "snapshot">): void {
        this.operations = operations;
        this.account = account;
    }

    /** 返回按钮与输入当前是否应等待回包。 */
    public get busy(): boolean {
        return this.pending !== null;
    }

    /** 商店在查货架或兑换期间锁定操作。 */
    public get shopBusy(): boolean {
        return this.featureRequests.has("shop");
    }

    /** 捐献在读取、捐献或开箱期间锁定操作。 */
    public get donationBusy(): boolean {
        return this.featureRequests.has("donation");
    }

    /** 排行正在等待本区榜单。 */
    public get rankingBusy(): boolean {
        return this.featureRequests.has("ranking");
    }

    /** 底栏就绪后首次校准审批提醒，重复通知主城就绪时复用当前结果。 */
    public setHomeReady(ready: boolean): void {
        if (this.homeReady === ready) {
            return;
        }
        this.homeReady = ready;
        if (ready && !this.visible) {
            this.refreshGuild();
        }
    }

    /** 重连后重新确认审批，公会身份变更时先熄灭旧提醒。 */
    public refreshRoleState(authenticated: boolean, membershipChanged: boolean): void {
        if (membershipChanged) {
            this.updateApplicationDot(null);
            this.setMembership(undefined);
        }
        if (authenticated || (membershipChanged && !this.visible)) {
            this.refreshGuild();
        }
        if (authenticated) {
            for (const feature of this.visibleFeatures) {
                this.readFeature(feature);
            }
        }
    }

    /** 开页读取大厅或目录；关闭后只有公会成员可继续刷新审批。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.query = "";
            this.page = 1;
            GuildModel.instance.replace(null);
            this.refreshGuild();
        } else if (!this.canRefreshReminder()) {
            this.refreshQueued = false;
        }
    }

    /** 提交新搜索或翻页，目录以服务端结果为准。 */
    public list(query: string, page: number): void {
        if (this.pending) {
            return;
        }
        this.query = query.trim();
        this.page = page;
        this.refreshGuild();
    }

    /** 大厅外只为已入会、能看到底栏的角色读取公会状态。 */
    private canRefreshReminder(): boolean {
        return this.homeReady && !!this.account?.snapshot.role?.guildName;
    }

    /** 复用公会列表协议，按当前页面状态读取目录或公会待审名单。 */
    private refreshGuild(): void {
        if (!this.operations || (!this.visible && !this.canRefreshReminder())) {
            return;
        }
        if (this.pending) {
            this.refreshQueued = true;
            return;
        }
        this.begin("LIST");
        const query = this.visible ? { query: this.query, page: this.page } : { query: "", page: 1 };
        void this.operations.deliver(Protocol.GUILD_LIST, query,
            frame => ProtocolRouter.instance.dispatch(this, frame), this.visible ? this.onFailed : () => this.finish());
    }

    /** 使用统一认证通道发送创建、编辑公告、申请、审批或退出。 */
    public change(command: GuildChange): void {
        if (!this.operations || this.pending) {
            return;
        }
        this.begin(command.action);
        this.operations.send(this, Protocol.GUILD_CHANGE, command, this.onFailed);
    }

    /** 标记子窗显示期；打开时读取最新服务器状态，关闭后保留已到达的权威结果。 */
    public setFeatureVisible(feature: GuildFeature, visible: boolean): void {
        if (visible) {
            this.visibleFeatures.add(feature);
            this.readFeature(feature);
        } else {
            this.visibleFeatures.delete(feature);
        }
    }

    /** 周刷新后重新查询可兑换商品。 */
    public refreshShop(): void {
        this.readFeature("shop");
    }

    /** 日刷新或全会捐献变化后重新查询公会状态。 */
    public refreshDonation(): void {
        this.readFeature("donation");
    }

    /** 刷新本服排行榜及本人公会名次。 */
    public refreshRanking(): void {
        this.readFeature("ranking");
    }

    /** 用玩家当前看到的周报价提交兑换，过期时不把旧金额用于新报价。 */
    public buyShop(productId: number, count: number, resetAtSeconds: number): void {
        const shop = GuildModel.instance.shop;
        if (shop && shop.resetAtSeconds === resetAtSeconds) {
            this.writeFeature("shop", Protocol.GUILD_SHOP_BUY, shop.guildId, { productId, count, resetAtSeconds });
        }
    }

    /** 提交今日所选捐献档位。 */
    public donate(optionId: number): void {
        this.writeDonation(Protocol.GUILD_DONATION_DONATE, optionId);
    }

    /** 提交今日所选贡献宝箱。 */
    public claimDonation(optionId: number): void {
        this.writeDonation(Protocol.GUILD_DONATION_CLAIM, optionId);
    }

    /** 将页面已读取的日期和公会附在写操作上，最终由服务端核验。 */
    private writeDonation(protocol: typeof Protocol.GUILD_DONATION_DONATE | typeof Protocol.GUILD_DONATION_CLAIM,
            optionId: number): void {
        const donation = GuildModel.instance.donation;
        if (donation) {
            this.writeFeature("donation", protocol, donation.guildId, { optionId, resetAt: donation.resetAt });
        }
    }

    /** 子窗按需查询，响应只接受与发起时同一公会的投影。 */
    private readFeature(feature: GuildFeature): void {
        const guildId = this.activeGuildId;
        const pending = this.beginFeature(feature);
        if (!guildId || !pending) {
            return;
        }
        void this.operations!.deliver(FEATURE[feature].read, {}, frame => {
            if (this.featureRequests.get(feature) !== pending) {
                return;
            }
            if (feature !== "ranking" && (frame.body as { guildId: string }).guildId !== guildId) {
                throw new Error("公会查询回包与当前公会不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failFeature(feature, pending, error));
    }

    /** 写操作复用认证层的请求编号匹配，再校验服务端回显的公会。 */
    private writeFeature(feature: "shop" | "donation", protocol: typeof Protocol.GUILD_SHOP_BUY
            | typeof Protocol.GUILD_DONATION_DONATE | typeof Protocol.GUILD_DONATION_CLAIM,
            guildId: string, fields: object): void {
        if (guildId !== this.activeGuildId || !this.visibleFeatures.has(feature)) {
            return;
        }
        const pending = this.beginFeature(feature);
        if (pending) {
            this.operations!.send(this, protocol, { guildId, ...fields }, error => this.failFeature(feature, pending, error), result => {
                if (this.featureRequests.get(feature) !== pending || (result as { guildId: string }).guildId !== guildId) {
                    throw new Error("公会操作回包与当前请求不符");
                }
            });
        }
    }

    /** 为同一公会功能保留一个在途槽位，忙态通知对应子窗。 */
    private beginFeature(feature: GuildFeature): object | null {
        if (!this.operations || !this.activeGuildId || this.featureRequests.has(feature)) {
            return null;
        }
        const pending = {};
        this.featureRequests.set(feature, pending);
        this.emit(FEATURE[feature].event, undefined);
        return pending;
    }

    /** 释放请求并发布最新状态；多个捐献推送合并成一次补查。 */
    private finishFeature(feature: GuildFeature): void {
        this.featureRequests.delete(feature);
        this.emit(FEATURE[feature].event, undefined);
        if (feature === "donation" && this.donationRefreshQueued) {
            this.donationRefreshQueued = false;
            this.refreshDonation();
        }
    }

    /** 过期报价或结果不明时让可见窗口重新读取，避免直接重复扣费。 */
    private failFeature(feature: GuildFeature, pending: object, error: unknown): void {
        if (this.featureRequests.get(feature) !== pending) {
            return;
        }
        this.finishFeature(feature);
        if (this.visibleFeatures.has(feature)) {
            UIManager.instance.toast(error instanceof Error ? error.message : "公会请求失败，请重试");
            if (error instanceof SocketFailure && /_RESET$/.test(error.code)) {
                this.readFeature(feature);
            }
        }
    }

    /** 公会身份变化时撤销旧请求和子窗数据，避免霎时显示前公会的货架或宝箱。 */
    private setMembership(guildId: string | undefined): void {
        if (guildId === this.activeGuildId) {
            return;
        }
        this.activeGuildId = guildId;
        this.featureRequests.clear();
        this.donationRefreshQueued = false;
        GuildModel.instance.replaceShop(null);
        GuildModel.instance.replaceDonation(null);
        GuildModel.instance.replaceRanking(null);
        RedDotManager.instance.set(GameRedDotKey.GUILD_DONATION, false);
    }

    /** 提交服务端公会状态并反馈已完成的申请或公告编辑，推送只触发刷新。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.GUILD_UPDATED:
                if (this.visible || this.visibleFeatures.has("donation")) {
                    if (this.donationBusy) {
                        this.donationRefreshQueued = true;
                    } else {
                        this.refreshDonation();
                    }
                }
                this.refreshGuild();
                return;
            case Protocol.GUILD_LIST: {
                const state = data as GuildState;
                this.setMembership(state.guild?.id);
                GuildModel.instance.replace(state);
                this.page = state.page;
                if (state.guild) {
                    this.query = "";
                }
                this.updateApplicationDot(state);
                this.finish();
                if (state.guild && this.visible && !GuildModel.instance.donation) {
                    this.refreshDonation();
                }
                return;
            }
            case Protocol.GUILD_CHANGE: {
                const applied = this.pending === "APPLY";
                const updatedNotice = this.pending === "UPDATE_NOTICE";
                const state = data as GuildState;
                this.setMembership(state.guild?.id);
                const previous = GuildModel.instance.snapshot;
                if (!state.guild && !previous?.guild && this.visible && (this.query || this.page > 1)) {
                    // 变更回包的默认目录没有当前搜索条件，保留本页并重新读取命中的公会。
                    GuildModel.instance.replace({
                        ...state,
                        guilds: previous?.guilds ?? [],
                        page: this.page,
                        hasMore: previous?.hasMore ?? false,
                    });
                    this.refreshQueued = true;
                } else {
                    GuildModel.instance.replace(state);
                    this.page = state.page;
                    if (state.guild || previous?.guild) {
                        this.query = "";
                    }
                }
                this.updateApplicationDot(state);
                this.finish();
                if (applied && this.visible) {
                    UIManager.instance.toast("入会申请已发送");
                }
                if (updatedNotice && this.visible) {
                    UIManager.instance.toast("公会公告已更新");
                }
                if (state.guild && this.visible && !GuildModel.instance.donation) {
                    this.refreshDonation();
                }
                return;
            }
            case Protocol.GUILD_SHOP_LIST:
            case Protocol.GUILD_SHOP_BUY:
                GuildModel.instance.replaceShop(data as GuildShopState);
                this.finishFeature("shop");
                return;
            case Protocol.GUILD_DONATION_INFO:
            case Protocol.GUILD_DONATION_DONATE:
            case Protocol.GUILD_DONATION_CLAIM: {
                const state = data as GuildDonationState;
                GuildModel.instance.replaceDonation(state);
                RedDotManager.instance.set(GameRedDotKey.GUILD_DONATION, state.donatedTier === 0
                    || state.chests.some(chest => !chest.claimed && chest.points <= state.dailyPoints));
                this.finishFeature("donation");
                return;
            }
            case Protocol.GUILD_RANKING:
                GuildModel.instance.replaceRanking(data as GuildRankingState);
                this.finishFeature("ranking");
                return;
        }
    }

    /** 使用当前公会的实际审批名单点亮底栏，退会后即使收到原查询回复也不恢复旧提醒。 */
    private updateApplicationDot(state: GuildState | null): void {
        const role = this.account?.snapshot.role;
        const sameGuild = !!state?.guild && role?.guildName === state.guild.name;
        RedDotManager.instance.set(GameRedDotKey.GUILD_APPLICATIONS,
            sameGuild && GuildModel.canApprove(state, role?.id) && state.applications.length > 0);
    }

    /** 按一次应用生命周期登记公会回包和变化推送。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.GUILD_LIST, Protocol.GUILD_CHANGE, Protocol.GUILD_UPDATED,
                Protocol.GUILD_SHOP_LIST, Protocol.GUILD_SHOP_BUY, Protocol.GUILD_DONATION_INFO,
                Protocol.GUILD_DONATION_DONATE, Protocol.GUILD_DONATION_CLAIM, Protocol.GUILD_RANKING]));
    }

    /** 换号后清除审批提醒、目录和在途界面进度，旧回包由连接层隔离。 */
    protected onResetSession(): void {
        this.visible = false;
        this.homeReady = false;
        this.pending = null;
        this.refreshQueued = false;
        this.query = "";
        this.page = 1;
        this.setMembership(undefined);
        this.visibleFeatures.clear();
        GuildModel.instance.replace(null);
        this.updateApplicationDot(null);
    }

    /** 场景退出时释放发包依赖。 */
    protected onDispose(): void {
        this.operations = null;
        this.account = null;
    }

    /** 记录已发送的操作，然后通知页面暂时阻止重复点击。 */
    private begin(action: NonNullable<GuildController["pending"]>): void {
        this.pending = action;
        this.emit("guild.updated", undefined);
    }

    /** 恢复可点击状态，合并请求期间的多个刷新触发。 */
    private finish(): void {
        this.pending = null;
        this.emit("guild.updated", undefined);
        if (this.refreshQueued) {
            this.refreshQueued = false;
            this.refreshGuild();
        }
    }

    /** 失败交给全局提示，本页面关闭后只释放在途状态。 */
    private readonly onFailed = (error: unknown): void => {
        this.finish();
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "公会请求失败，请重试");
        }
    };
}
