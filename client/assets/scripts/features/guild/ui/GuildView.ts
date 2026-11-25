/** 公会根页。未入会时管理推荐、创建与查找页签，入会后展示公会大厅和独立弹窗入口。 */
import { _decorator, AudioSource, Button, Color, instantiate, Label, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../../account/AccountModel";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { GuildController } from "../GuildController";
import { GuildModel, type GuildState, type GuildSummary } from "../GuildModel";
import { GuildApprovalView } from "./GuildApprovalView";
import { GuildBadgeUtils } from "./GuildBadgeUtils";
import { GuildCreateView } from "./GuildCreateView";
import { GuildDonationView } from "./GuildDonationView";
import { GuildListCell, type GuildCellRow } from "./GuildListCell";
import { GuildMemberView } from "./GuildMemberView";
import { GuildRankingView } from "./GuildRankingView";
import { GuildShopView } from "./GuildShopView";
import { GuildTextInputView } from "./GuildTextInputView";

/** 主城导航提供当前角色，用于大厅的会长入口和建会余额。 */
export interface GuildViewArgs {
    readonly account: AccountModel;
}

/** 与旧版页签顺序一致，未入会首次进入时展示推荐。 */
type DirectoryTab = "recommend" | "create" | "search";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "guild",
    prefab: "bundles/module/guild/prefabs/GuildView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("GuildView")
export class GuildView extends BaseView<GuildViewArgs> {
    /** 原公会地图，按旧版横纵独立铺满并各保留约十分之一张图的余量。 */
    @property(UITransform) private _backdrop: UITransform | null = null;
    /** 正式服 640×860 的内容坐标系。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 当前页退出时一并停播的公会配乐。 */
    @property(AudioSource) private _music: AudioSource | null = null;
    /** 未入会时显示的三页签及其选中底图。 */
    @property(Node) private _tabs: Node | null = null;
    /** 按推荐、创建、查找的顺序保存三个页签按钮。 */
    @property([Button]) private _tabButtons: Button[] = [];
    /** 随当前页签显隐的高亮底图。 */
    @property([Node]) private _tabHighlights: Node[] = [];
    /** 推荐内容区，包含独立列表和刷新按钮。 */
    @property(Node) private _recommend: Node | null = null;
    /** 创建表单的预制体与内嵌挂点，首次打开时实例化。 */
    @property(Prefab) private _createPanel: Prefab | null = null;
    @property(Node) private _createHost: Node | null = null;
    /** 查找内容区，只有点击查找按钮才发送名称条件。 */
    @property(Node) private _searchPanel: Node | null = null;
    /** 当前名称草稿或原版空值提示。 */
    @property(Label) private _query: Label | null = null;
    /** 点击名称框时打开共享输入窗。 */
    @property(Button) private _editQuery: Button | null = null;
    /** 用当前名称草稿重新查询第一页。 */
    @property(Button) private _search: Button | null = null;
    /** 推荐列表和查找结果各使用原版自己的视口高度。 */
    @property(SuperScroll) private _recommendList: SuperScroll | null = null;
    @property(SuperScroll) private _searchList: SuperScroll | null = null;
    /** 推荐刷新回第一页，后续页只在目录超过一页时出现。 */
    @property(Button) private _refresh: Button | null = null;
    @property(Button) private _previous: Button | null = null;
    @property(Button) private _next: Button | null = null;
    /** 目录空状态和退会冷却提示。 */
    @property(Label) private _status: Label | null = null;

    /** 入会后显示的公会概要及操作入口。 */
    @property(Node) private _hall: Node | null = null;
    @property(Sprite) private _badge: Sprite | null = null;
    @property(Label) private _guildName: Label | null = null;
    @property(Label) private _leader: Label | null = null;
    /** 服务器当前公会等级，不用角色等级或默认文案冒充。 */
    @property(Label) private _guildLevel: Label | null = null;
    /** 当前公会经验及对应等级的门槛。 */
    @property(Label) private _experience: Label | null = null;
    @property(Label) private _memberCount: Label | null = null;
    @property(Label) private _notice: Label | null = null;
    @property(ScrollView) private _noticeScroll: ScrollView | null = null;
    /** 公告卡右下编辑入口，由当前成员职务和请求状态约束。 */
    @property(Button) private _editNotice: Button | null = null;
    @property(Button) private _members: Button | null = null;
    @property(Button) private _applications: Button | null = null;
    /** 入会后可打开当前周的公会兑换窗口。 */
    @property(Button) private _shop: Button | null = null;
    /** 入会后可打开捐献和每日贡献宝箱窗口。 */
    @property(Button) private _donation: Button | null = null;
    /** 入会后可打开本服公会战力排行榜。 */
    @property(Button) private _ranking: Button | null = null;
    /** 大厅捐献图块右上角的公会提醒定位。 */
    @property(Node) private _donationDotAnchor: Node | null = null;
    /** 审批提醒的可选定位节点，跟随原审批按钮层级。 */
    @property(Node) private _applicationDotAnchor: Node | null = null;

    /** 当前未入会页签。入会或离开页面时回到推荐。 */
    private tab: DirectoryTab = "recommend";
    /** 输入窗已确认但不一定提交查找的公会名。 */
    private queryDraft = "";
    /** 已提交的名称条件。null 表示查找页还未查询。 */
    private submittedQuery: string | null = null;
    /** 最后一次绘制的公告，用于保留玩家的滚动位置。 */
    private shownNotice: string | null = null;
    /** 当前大厅已请求的徽章编号，避免申请通知重复加载同一图。 */
    private shownBadge: number | undefined;

    /** 挂载大厅、目录及入会后的子窗入口，读取公会状态。 */
    public onOpen(args?: GuildViewArgs): void {
        super.onOpen(args);
        if (!args?.account.snapshot.role || !this._createPanel || !this._createHost || !this._editQuery || !this._query
            || !this._guildLevel || !this._experience || !this._editNotice
            || !this._shop || !this._donation || !this._ranking || !this._donationDotAnchor
            || this._tabButtons.length !== 3 || this._tabHighlights.length !== 3) {
            throw new Error("公会资料或页面挂点缺失");
        }

        const create = instantiate(this._createPanel);
        create.getComponent(GuildCreateView)!.configure(this, args.account);
        this._createHost.addChild(create);
        this._tabButtons.forEach((button, index) => {
            this.listen(button, () => this.selectTab((["recommend", "create", "search"] as const)[index]!));
        });
        this.listen(this._search!, () => this.search());
        this.listen(this._editQuery, () => this.editQuery());
        this.listen(this._refresh!, () => this.showRecommended());
        this.listen(this._previous!, () => this.turnPage(-1));
        this.listen(this._next!, () => this.turnPage(1));
        this.listen(this._members!, () => this.openMembers());
        this.listen(this._applications!, () => this.openApplications());
        this.listen(this._shop, () => this.openMemberFeature("shop"));
        this.listen(this._donation, () => this.openMemberFeature("donation"));
        this.listen(this._ranking, () => this.openMemberFeature("ranking"));
        this.listen(this._editNotice, () => this.editNotice());
        const donationDot = RedDotBinding.atAnchor(this._donationDotAnchor, GameRedDotKey.GUILD_DONATION);
        this.ownListener(() => donationDot.dispose());
        if (this._applicationDotAnchor) {
            const binding = RedDotBinding.atAnchor(this._applicationDotAnchor, GameRedDotKey.GUILD_APPLICATIONS);
            this.ownListener(() => binding.dispose());
        }
        for (const list of [this._recommendList!, this._searchList!]) {
            const content = list.list.node;
            content.on(SuperContent.RENDER_ITEM, this.renderCell, this);
            this.ownListener(() => {
                if (content.isValid) {
                    content.off(SuperContent.RENDER_ITEM, this.renderCell, this);
                }
            });
        }
        this.ownListener(EventDispatcher.instance.on("guild.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        if (this._music) {
            AudioPreferences.playMusic(this._music);
        }
        GuildController.instance.setVisible(true);
    }

    /** 离开公会区域时停止主动查询、冷却刷新及当前音源。 */
    public onClose(): void {
        GuildController.instance.setVisible(false);
        this.unschedule(this.render);
        if (this._music) {
            AudioPreferences.stopMusic(this._music);
        }
    }

    /** 原场景背景沿各轴铺满，内部纸面按屏幕内容安全区等比缩放。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        this._backdrop!.setContentSize(box.width + 64, box.height + 96);
        const scale = Math.min(1, box.width / (panel.width + 20), Math.max(1, box.height - 210) / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 注册由当前显示生命周期持有的按钮操作。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => node.isValid && node.off(Button.EventType.CLICK, action));
    }

    /** 切页关闭关联弹窗，推荐重新读取，查找保留上次已提交条件。 */
    private selectTab(tab: DirectoryTab): void {
        UIManager.instance.closeChildren(this);
        this.tab = tab;
        if (tab === "recommend") {
            this.showRecommended();
        } else if (tab === "search" && this.submittedQuery !== null) {
            GuildController.instance.list(this.submittedQuery, 1);
        }
        this.render();
    }

    /** 查询推荐页并把该列表移回首行。 */
    private showRecommended(): void {
        GuildController.instance.list("", 1);
        this._recommendList!.scrollToTop(0);
    }

    /** 输入窗回填名称草稿，留到玩家点击查找后再发送协议。 */
    private editQuery(): void {
        const state = GuildModel.instance.snapshot;
        if (!state || state.guild) {
            return;
        }
        const panel = this._searchPanel!;
        void UIManager.instance.openChild(this, GuildTextInputView, {
            initialValue: this.queryDraft,
            maxLength: state.nameLimit,
            onConfirm: value => {
                if (panel.isValid && panel.activeInHierarchy) {
                    this.queryDraft = value.trim();
                    this.renderQuery();
                }
            },
        }).catch(() => {
            // 开窗失败已由 UIManager 提示。
        });
    }

    /** 名称为空时在原输入框内显示提示，不另在页底重复。 */
    private renderQuery(): void {
        const placeholder = GameConfig.instance.requireConfig(GConfig.Language, 41344).value ?? "";
        this._query!.string = this.queryDraft || placeholder;
        this._query!.color = this.queryDraft ? new Color(122, 71, 45) : new Color(156, 155, 151);
    }

    /** 搜索按钮提交已确认名称；查询期间继续保留已提交的条件。 */
    private search(): void {
        if (GuildController.instance.busy) {
            return;
        }
        const query = this.queryDraft;
        if (!query) {
            UIManager.instance.toast("请输入公会名称");
            return;
        }
        this.submittedQuery = query;
        GuildController.instance.list(query, 1);
        this._searchList!.scrollToTop(0);
    }

    /** 目录有后续数据时按原查询条件翻页。 */
    private turnPage(offset: -1 | 1): void {
        const state = GuildModel.instance.snapshot;
        if (state && (offset < 0 ? state.page > 1 : state.hasMore)) {
            const search = this.tab === "search";
            GuildController.instance.list(search ? this.submittedQuery ?? "" : "", state.page + offset);
            (search ? this._searchList! : this._recommendList!).scrollToTop(0);
        }
    }

    /** 打开成员窗并刷新同一份名单，显示其他成员最近保存的主阵容战力。 */
    private openMembers(): void {
        const guild = GuildModel.instance.snapshot?.guild;
        const role = this.args?.account.snapshot.role;
        if (guild && role) {
            GuildController.instance.list("", 1);
            void UIManager.instance.openChild(this, GuildMemberView, { guildId: guild.id, roleId: role.id }).catch(() => {});
        }
    }

    /** 审批只由大厅会长入口打开，实际权限仍由服务端校验。 */
    private openApplications(): void {
        const guild = GuildModel.instance.snapshot?.guild;
        const role = this.args?.account.snapshot.role;
        if (guild && role) {
            void UIManager.instance.openChild(this, GuildApprovalView, { guildId: guild.id, roleId: role.id }).catch(() => {});
        }
    }

    /** 仅在当前已入会时打开功能窗，离开大厅后统一清理子窗。 */
    private openMemberFeature(feature: "shop" | "donation" | "ranking"): void {
        const guildId = GuildModel.instance.snapshot?.guild?.id;
        if (!guildId) {
            return;
        }
        const ui = UIManager.instance;
        const opening = feature === "shop" ? ui.openChild(this, GuildShopView, { guildId })
            : feature === "donation" ? ui.openChild(this, GuildDonationView, { guildId })
            : ui.openChild(this, GuildRankingView);
        void opening.catch(() => {
            // UIManager 统一反馈资源或绑定失败。
        });
    }

    /** 只有当前公会会长能提交新公告；关闭输入窗不会改动大厅文字。 */
    private editNotice(): void {
        const state = GuildModel.instance.snapshot;
        const guild = state?.guild;
        if (!guild || GuildController.instance.busy) {
            return;
        }
        if (!GuildModel.canApprove(state, this.args?.account.snapshot.role?.id)) {
            UIManager.instance.toast("只有会长可以编辑公告");
            return;
        }
        void UIManager.instance.openChild(this, GuildTextInputView, {
            initialValue: guild.description ?? "",
            maxLength: GuildModel.noticeLimit,
            onConfirm: value => {
                const current = GuildModel.instance.snapshot;
                const description = value.trim();
                if (current?.guild?.id === guild.id && description !== (current.guild.description ?? "")) {
                    GuildController.instance.change({ action: "UPDATE_NOTICE", guildId: guild.id, description });
                }
            },
        }).catch(() => {
            // UIManager 负责开窗失败提示。
        });
    }

    /** 响应公会状态；跨越入会或退出边界时关闭旧子窗。 */
    private readonly render = (): void => {
        this.unschedule(this.render);
        const state = GuildModel.instance.snapshot;
        const guild = state?.guild;
        if ((guild && this._tabs!.active) || (state && !guild && this._hall!.active)) {
            UIManager.instance.closeChildren(this);
        }
        this._tabs!.active = !guild;
        this._hall!.active = !!guild;
        this._recommend!.active = !guild && this.tab === "recommend";
        this._createHost!.active = !guild && this.tab === "create";
        this._searchPanel!.active = !guild && this.tab === "search";
        if (guild) {
            this.tab = "recommend";
            this.submittedQuery = null;
            this.queryDraft = "";
            this.renderHall(guild, state!);
        } else {
            this.renderDirectory(state);
        }
    };

    /** 展示权威等级、经验、公告及会长的审批入口；回包未提供的数值不伪造。 */
    private renderHall(guild: GuildSummary, state: GuildState): void {
        const leader = state.members.find(member => member.leader);
        this._guildName!.string = guild.name;
        this._leader!.string = leader ? "会长  " + leader.nickname : "";
        this._guildLevel!.string = guild.level === undefined ? "" : `等级：Lv${guild.level}`;
        this._experience!.string = guild.experience === undefined || guild.nextLevelExperience === undefined
            ? "" : `EXP：${guild.experience}/${guild.nextLevelExperience}`;
        this._memberCount!.string = `成员  ${guild.memberCount}/${guild.capacity}`;
        const badge = guild.badgeId ?? 0;
        if (badge !== this.shownBadge) {
            this.shownBadge = badge;
            ResManager.setSprite(this._badge?.node ?? null, GuildBadgeUtils.source(badge));
        }
        const notice = guild.description ?? "";
        if (notice !== this.shownNotice) {
            this.shownNotice = notice;
            this._notice!.string = notice;
            this._notice!.updateRenderData(true);
            this._noticeScroll!.stopAutoScroll();
            this._noticeScroll!.scrollToTop(0);
        }
        const manager = GuildModel.canApprove(state, this.args?.account.snapshot.role?.id);
        this._applications!.node.active = manager;
        this._editNotice!.interactable = !GuildController.instance.busy;
    }

    /** 更新当前目录的查找草稿、分页状态及退会冷却。 */
    private renderDirectory(state: GuildState | null): void {
        const busy = GuildController.instance.busy;
        const tabIndex = this.tab === "recommend" ? 0 : this.tab === "create" ? 1 : 2;
        this._tabHighlights.forEach((node, index) => { node.active = index === tabIndex; });
        this._tabButtons.forEach((button, index) => { button.interactable = !busy && index !== tabIndex; });
        const searching = this.tab === "search";
        const directory = this.tab !== "create";
        const queried = !searching || this.submittedQuery !== null;
        const now = ServerClock.instance.nowSeconds();
        const rejoinAt = state?.rejoinAtSeconds ?? 0;
        const remaining = now === null || rejoinAt <= 0 ? 0 : rejoinAt - now + 1;
        if (remaining > 0) {
            this.scheduleOnce(this.render, remaining);
        }
        const status = busy ? "正在读取公会" : remaining > 0 ? "退会冷却中"
            : queried && !state?.guilds.length ? "暂无公会" : "";
        this._status!.node.active = directory && !!status;
        this._status!.string = status;
        this._refresh!.interactable = !busy;
        this._search!.interactable = !busy;
        this._editQuery!.interactable = !!state && !busy;
        if (searching) {
            this.renderQuery();
        }
        this._previous!.node.active = directory && queried && !!state && state.page > 1;
        this._next!.node.active = directory && queried && !!state?.hasMore;
        this._previous!.interactable = !busy;
        this._next!.interactable = !busy;
        if (directory) {
            const list = searching ? this._searchList! : this._recommendList!;
            list.list.setData(queried && state
                ? state.guilds.map(guild => this.directoryRow(guild, state, busy))
                : []);
        }
    }

    /** 显示服务端提供的公会徽章、等级和人数；点击加入直接提交申请。 */
    private directoryRow(guild: GuildSummary, state: GuildState, disabled: boolean): GuildCellRow {
        const applied = state.appliedGuildIds.includes(guild.id);
        const full = guild.memberCount >= guild.capacity;
        return {
            title: guild.name,
            detail: `成员  ${guild.memberCount}/${guild.capacity}`,
            levelText: guild.level === undefined ? "" : `等级  ${guild.level}`,
            badgeId: guild.badgeId ?? 0,
            actionText: applied ? "待审批" : full ? "已满" : "加入",
            action: applied || full || disabled ? undefined : () => this.joinGuild(guild.id),
        };
    }

    /** 冷却期间点击加入时显示剩余时间；其余情况直接交给服务端判定。 */
    private joinGuild(guildId: string): void {
        const rejoinAt = GuildModel.instance.snapshot?.rejoinAtSeconds ?? 0;
        const now = ServerClock.instance.nowSeconds();
        if (rejoinAt > 0 && now !== null && rejoinAt >= now) {
            UIManager.instance.toast(`离开公会后还需等待 ${Math.ceil((rejoinAt - now + 1) / 60)} 分钟`);
            return;
        }
        GuildController.instance.change({ action: "APPLY", guildId });
    }

    /** 绑定当前虚拟格，滚出视口时由列表回收。 */
    private renderCell(node: Node, row: GuildCellRow): void {
        node.getComponent(GuildListCell)!.render(row);
    }
}
