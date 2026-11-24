/** 公会根页。未入会时管理推荐、创建与查找页签，入会后展示公会大厅和独立弹窗入口。 */
import { _decorator, AudioSource, Button, EditBox, instantiate, Label, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";
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
import { GuildListCell, type GuildCellRow } from "./GuildListCell";
import { GuildMemberView } from "./GuildMemberView";

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
    /** 查找内容区及名称输入。 */
    @property(Node) private _searchPanel: Node | null = null;
    @property(EditBox) private _query: EditBox | null = null;
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
    @property(Label) private _memberCount: Label | null = null;
    @property(Label) private _notice: Label | null = null;
    @property(ScrollView) private _noticeScroll: ScrollView | null = null;
    @property(Button) private _members: Button | null = null;
    @property(Button) private _applications: Button | null = null;
    /** 审批提醒的可选定位节点，跟随原审批按钮层级。 */
    @property(Node) private _applicationDotAnchor: Node | null = null;

    /** 当前未入会页签。入会或离开页面时回到推荐。 */
    private tab: DirectoryTab = "recommend";
    /** 已提交的名称条件。null 表示查找页还未查询。 */
    private submittedQuery: string | null = null;
    /** 最后一次绘制的公告，用于保留玩家的滚动位置。 */
    private shownNotice: string | null = null;
    /** 当前大厅已请求的徽章编号，避免申请通知重复加载同一图。 */
    private shownBadge: number | undefined;

    /** 挂载创建表单和审批提醒，绑定当次会话并请求公会状态。 */
    public onOpen(args?: GuildViewArgs): void {
        super.onOpen(args);
        if (!args?.account.snapshot.role || !this._createPanel || !this._createHost
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
        const input = this._query!.node;
        input.on(EditBox.EventType.EDITING_RETURN, this.search, this);
        this.ownListener(() => {
            if (input.isValid) {
                input.off(EditBox.EventType.EDITING_RETURN, this.search, this);
            }
        });
        this.listen(this._refresh!, () => this.showRecommended());
        this.listen(this._previous!, () => this.turnPage(-1));
        this.listen(this._next!, () => this.turnPage(1));
        this.listen(this._members!, () => this.openMembers());
        this.listen(this._applications!, () => this.openApplications());
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

    /** 切到推荐立即刷新，查找保留已提交条件，创建留在当前大厅。 */
    private selectTab(tab: DirectoryTab): void {
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

    /** 搜索按钮和键盘确认共用入口。查询期间保留已提交条件。 */
    private search(): void {
        if (GuildController.instance.busy) {
            return;
        }
        const query = this._query!.string.trim();
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

    /** 成员页在公会大厅上独立打开，离开大厅时一同关闭。 */
    private openMembers(): void {
        const guild = GuildModel.instance.snapshot?.guild;
        const role = this.args?.account.snapshot.role;
        if (guild && role) {
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

    /** 在未入会三页签与已入会大厅之间切换，期间仍由同一控制器接收服务器状态。 */
    private readonly render = (): void => {
        this.unschedule(this.render);
        const state = GuildModel.instance.snapshot;
        const guild = state?.guild;
        this._tabs!.active = !guild;
        this._hall!.active = !!guild;
        this._recommend!.active = !guild && this.tab === "recommend";
        this._createHost!.active = !guild && this.tab === "create";
        this._searchPanel!.active = !guild && this.tab === "search";
        if (guild) {
            this.tab = "recommend";
            this.submittedQuery = null;
            this._query!.string = "";
            this.renderHall(guild, state!);
        } else {
            this.renderDirectory(state);
        }
    };

    /** 展示公会资料和会长的审批入口，审批红点缺失时仍可展示大厅。 */
    private renderHall(guild: GuildSummary, state: GuildState): void {
        const leader = state.members.find(member => member.leader);
        this._guildName!.string = guild.name;
        this._leader!.string = leader ? "会长  " + leader.nickname : "";
        this._memberCount!.string = `成员  ${guild.memberCount}/${guild.capacity}`;
        const badge = guild.badgeId ?? 0;
        if (badge !== this.shownBadge) {
            this.shownBadge = badge;
            ResManager.setSprite(this._badge?.node ?? null, GuildBadgeUtils.source(badge));
        }
        const notice = guild.description || "暂无公会公告";
        if (notice !== this.shownNotice) {
            this.shownNotice = notice;
            this._notice!.string = notice;
            this._notice!.updateRenderData(true);
            this._noticeScroll!.stopAutoScroll();
            this._noticeScroll!.scrollToTop(0);
        }
        const manager = GuildModel.canApprove(state, this.args?.account.snapshot.role?.id);
        this._applications!.node.active = manager;
    }

    /** 更新当前目录的分页、空态及退会冷却。 */
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
        this._status!.node.active = directory;
        this._status!.string = busy ? "正在读取公会" : remaining > 0 ? "退会冷却中"
            : !queried ? "输入公会名查找" : state?.guilds.length ? "" : "暂无公会";
        this._refresh!.interactable = !busy;
        this._search!.interactable = !busy;
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

    /** 以原版目录格显示徽章、等级和人数。点击加入直接发送申请。 */
    private directoryRow(guild: GuildSummary, state: GuildState, disabled: boolean): GuildCellRow {
        const applied = state.appliedGuildIds.includes(guild.id);
        const full = guild.memberCount >= guild.capacity;
        return {
            title: guild.name,
            detail: `成员  ${guild.memberCount}/${guild.capacity}`,
            levelText: "等级  1",
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
