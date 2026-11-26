/**
 * 主城功能入口协调：把底栏意图交给UIManager，处理真实慢开提示、加载取消、重试和返回主城。
 * 由当前场景的 ApplicationPages 持有，复用账号准入和页面宿主，不复制玩家数据。
 */
import "../../features/hero/ui/HeroCreationView";
import { UIManager } from "../../framework/ui/UIManager";
import { GameLog } from "../../core/GameLog";
import { CityNavigationUtils } from "../../config/CityNavigationUtils";
import { EntryGateUtils } from "../../config/EntryGateUtils";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import type { AccountModel } from "../../features/account/AccountModel";
import type { ChatNoticeDestination } from "../../features/chat/data/ChatData";
import type { ChatWorldViewArgs } from "../../features/chat/ui/ChatWorldView";
import type { FriendEntry } from "../../features/friend/data/FriendData";
import type { QuestTab } from "../../features/quest/data/QuestState";

/** 导航需要的页面操作；不包含资源获取或业务协议。 */
interface FeatureUi {
    /** 保留最新打开意图，取消被新意图替代的在途页面。 */
    keepOnly(id: string): void;

    /** 等待页面完成自身准备；失败和取消保持Promise拒绝。 */
    openById(id: string, args?: unknown): Promise<unknown>;

    /** 将当前功能页交还主城，返回是否处理成功。 */
    back(): boolean;
}

/** 应用提供的当前页面、准入和提示入口，不向导航暴露账号凭证。 */
interface FeatureHost {
    /** 提供副本大厅需要的实时角色等级，独立导航测试可以省略。 */
    readonly account?: AccountModel;
    /** 当前已显示页面；尚未显示时返回null。 */
    current(): string | null;

    /** 应用仍存活、身份已就绪且玩家已确认进入时返回true。 */
    authorized(): boolean;

    /** 将加载与失败提示交给现有主城显示。 */
    notice(text: string): void;
    /** 竞技场关闭时恢复原内容页持有的音乐。 */
    resumeMusic?(): void;
}

/** 功能页占用主城的内容区域；地图进入的玩法仍点亮主城导航。 */
type FeatureTab = "hero" | "bag" | "battle" | "summon" | "market" | "dungeon" | "clan" | "fetter" | "arena" | "tower";

/** 主城点击目标、页面和内容区域对应关系。 */
const routes: Readonly<Record<string, { page: string; title: string; tab: FeatureTab }>> = {
    "hero-info": {page: "hero-info", title: "英雄详情", tab: "hero"},
    "hero-illustration": {page: "hero-illustration", title: "英雄图鉴", tab: "hero"},
    hero: {page: "hero", title: "英雄", tab: "hero"},
    bag: {page: "bag", title: "背包", tab: "bag"},
    battle: {page: "remake-campaign", title: "战斗", tab: "battle"},
    main_summon: {page: "first-summon", title: "召唤", tab: "summon"},
    main_hero_make: {page: "hero-creation", title: "创造法阵", tab: "summon"},
    main_shop: {page: "market", title: "市场", tab: "market"},
    main_black_market: {page: "black-market", title: "黑市", tab: "market"},
    smith: {page: "smith", title: "铁匠铺", tab: "market"},
    dungeon: {page: "dungeon-hall", title: "副本大厅", tab: "dungeon"},
    "gold-dungeon": {page: "gold-dungeon", title: "日常副本", tab: "dungeon"},
    dreamland: {page: "dreamland", title: "永恒梦境", tab: "dungeon"},
    trial: {page: "trial", title: "勇者试炼", tab: "dungeon"},
    arena: {page: "arena", title: "竞技场", tab: "arena"},
    tower: {page: "tower", title: "幻境之塔", tab: "tower"},
    clan: {page: "guild", title: "公会", tab: "clan"},
    fetter: {page: "vip", title: "VIP", tab: "fetter"},
};

/** 旧策划任务的跳转目标与现已开放的页面入口。 */
const questDestinations: Readonly<Record<string, string | undefined>> = {
    main_battle: "battle",
    main_chapter: "battle",
    main_hero: "hero",
    main_summon: "main_summon",
    main_pvp: "arena",
    main_fantasy_tower: "tower",
    main_clan: "clan",
    main_shop: "main_shop",
    main_black_market: "main_black_market",
    main_smith_shop: "smith",
    main_mission: "gold-dungeon",
    main_infinite: "dreamland",
    main_proving_lang: "trial",
    main_friend: "main_friend",
};

/** 管理最新功能打开意图，加载失败时保留已显示的主城或功能页。 */
export class HomeFeatureNavigation {
    /** 从已登记的页面导出底栏开放状态；英雄详情与英雄列表只点亮同一个页签。 */
    public static readonly tabs = Object.freeze(
        Array.from(new Set(Object.values(routes).map(route => route.tab)))
            .filter(tab => tab !== "summon" && tab !== "market" && tab !== "arena" && tab !== "tower"),
    );

    /** 同次打开仍在等待350毫秒后才提示；缓存瞬开不把资源复用误报成重新准备。 */
    private static readonly loadingNoticeDelayMs = 350;
    /** 功能打开意图代次；新点击、身份重置和销毁时递增，拒绝旧提示与重开。 */
    private epoch = 0;
    /** true表示所属应用已退出，不再处理页面打开或迟到结果。 */
    private disposed = false;
    /** 当前开页意图的慢开计时器；完成、失败、替换、返回、身份重置或销毁时撤销，触发后清空。 */
    private loadingNoticeTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * 保存应用注入的页面操作与状态读取口，不订阅账号或自行加载资源。
     * @param ui 当前应用使用的统一页面管理器。
     * @param host 应用提供的准入、当前页面和主城提示。
     */
    constructor(private readonly ui: FeatureUi, private readonly host: FeatureHost) {
    }

    /** 返回功能页占用的主城内容区域，登录和主城地图返回 null。 */
    public static tabForPage(page: string | null): FeatureTab | null {
        return Object.values(routes).find(route => route.page === page)?.tab ?? null;
    }

    /** 转交主城建筑、底栏和任务跳转，地图玩法通过同一入口保留返回路径。 */
    open(id: string): boolean {
        if (id === "quest") {
            return this.openQuest("daily");
        }
        if (id === "main_rank") {
            return this.openRanking();
        }
        if (id === "chat") {
            return this.openChat();
        }
        if (id === "main_friend" || id === "mail" || id === "main_mail") {
            return this.openSocial(id === "main_friend" ? "friend" : "mail");
        }
        if (id === "mainline") {
            id = "battle";
        }
        if (id === "main_fetter") {
            id = "fetter";
        }
        if (id === "main_pvp") {
            id = "arena";
        }
        if (id === "main_fantasy_tower") {
            id = "tower";
        }
        if (id === "main_smith_shop") {
            id = "smith";
        }
        const route = Object.prototype.hasOwnProperty.call(routes, id) ? routes[id] : undefined;
        if (id !== "city" && !route) {
            return false;
        }
        if (this.disposed || !this.host.authorized()) {
            return true;
        }
        if ((id === "dungeon" || id === "clan") && !this.canOpenGatedTab(id)) {
            return true;
        }
        if ((id === "gold-dungeon" || id === "dreamland" || id === "trial" || id === "arena" || id === "tower"
            || id === "main_black_market" || id === "smith")
            && !this.canOpenPlay(id)) {
            return true;
        }
        if (id === "arena") {
            return this.openArena();
        }
        if (!route) {
            this.reset();
            this.ui.keepOnly("remake-home");
            this.ui.back();
            this.host.notice("");
            return true;
        }
        const {page, title} = route;
        if (this.host.current() === page) {
            this.reset();
            this.ui.keepOnly(page);
            this.host.notice("");
            return true;
        }
        this.clearLoadingNotice();
        const epoch = ++this.epoch;
        this.loadingNoticeTimer = setTimeout(() => {
            this.loadingNoticeTimer = null;
            if (this.accepts(epoch) && this.host.current() !== page) {
                this.host.notice("正在准备" + title + "界面…");
            }
        }, HomeFeatureNavigation.loadingNoticeDelayMs);
        this.ui.keepOnly(page);
        let args: unknown;
        if (id === "dungeon") {
            args = { account: this.host.account, openDailyDungeon: () => this.open("gold-dungeon"),
                openDreamland: () => this.open("dreamland"), openTrial: () => this.open("trial") };
        } else if (id === "gold-dungeon") {
            args = { account: this.host.account, backToHall: () => this.open("dungeon") };
        } else if (id === "dreamland") {
            args = { backToHall: () => this.open("dungeon") };
        } else if (id === "trial") {
            args = { backToHall: () => this.open("dungeon"), openShop: () => this.openTrialShop() };
        } else if (id === "main_black_market") {
            args = { account: this.host.account, backToCity: () => this.open("city") };
        } else if (id === "smith") {
            args = { account: this.host.account, backToCity: () => this.open("city"),
                openFeature: (featureId: string) => this.open(featureId) };
        } else if (id === "clan") {
            args = { account: this.host.account };
        } else if (id === "fetter") {
            args = { openFeature: (featureId: string) => this.open(featureId) };
        } else if (id === "battle") {
            args = { openQuest: () => this.openQuest("daily") };
        }
        void this.ui.openById(page, args).then(() => {
            this.clearLoadingNotice(epoch);
            if (this.accepts(epoch)) {
                this.host.notice("");
            }
        }).catch(error => {
            this.clearLoadingNotice(epoch);
            if (!this.accepts(epoch)) {
                return;
            }
            if (UIManager.isOpenCancelled(error)) {
                // 快速切回同一功能可能仍共享上一份已取消任务，只为最新有效意图重试。
                this.open(id);
                return;
            }
            const reason = error instanceof Error ? error.stack || error.message : String(error);
            GameLog.shared.classified("APP", "warn", "HomeFeatureNavigation", page + "打开失败：" + reason);
            if (!UIManager.isFailureReported(error)) {
                this.host.notice(title + "界面加载失败，请再次点击重试");
            }
        });
        return true;
    }

    /** 竞技场覆盖主城和其他任务来源，关闭后恢复原内容页音乐。 */
    private openArena(): boolean {
        void this.ui.openById("arena", {
            account: this.host.account,
            resumeHomeMusic: () => this.host.resumeMusic?.(),
        }).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                this.host.notice("竞技场加载失败，请再次点击重试");
            }
        });
        return true;
    }

    /** 打开聊天弹窗；好友入口可以预选会话，未入会入口沿用主城导航。 */
    private openChat(peer?: FriendEntry): boolean {
        const account = this.host.account;
        if (!this.disposed && this.host.authorized() && account?.snapshot.role) {
            const args: ChatWorldViewArgs = {
                account,
                onJoinGuild: () => this.open("clan"),
                onDestination: (destination: ChatNoticeDestination) => this.open(destination),
                ...(peer ? { initialScope: { channel: "private", peerRoleId: peer.roleId }, initialPeer: peer } : {}),
            };
            void this.ui.openById("chat-world", args).catch(error => {
                if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    this.host.notice("聊天加载失败，请重试");
                }
            });
        }
        return true;
    }

    /** 打开好友或邮件窗口；好友行可沿同一导航进入对应私聊。 */
    private openSocial(page: "friend" | "mail"): boolean {
        if (!this.disposed && this.host.authorized()) {
            const args = page === "friend" ? { onOpenChat: (peer: FriendEntry) => this.openChat(peer) } : undefined;
            void this.ui.openById(page, args).catch(error => {
                if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    this.host.notice(page === "mail" ? "邮件加载失败，请重试" : "好友加载失败，请重试");
                }
            });
        }
        return true;
    }

    /** 按原入口门槛从主城打开排行榜，弹窗独立于底栏页面堆栈。 */
    private openRanking(): boolean {
        const role = this.host.account?.snapshot.role;
        if (this.disposed || !this.host.authorized() || !role) {
            return true;
        }
        const gate = GameConfig.instance.getConfig(GConfig.OpenCondition, "main_rank");
        if (!gate) {
            this.host.notice("排行榜开放条件尚未同步");
        } else if (!EntryGateUtils.isEntryOpen(gate, role.level, 0)) {
            this.host.notice(`角色达到 ${gate.level} 级开启排行榜`);
        } else {
            void this.ui.openById("ranking").catch(error => {
                if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    this.host.notice("排行榜加载失败，请再次点击重试");
                }
            });
        }
        return true;
    }

    /** 主城、战斗入口和顶部提示统一打开任务窗，并可指定页签。 */
    public openQuest(tab: QuestTab): boolean {
        const role = this.host.account?.snapshot.role;
        if (this.disposed || !this.host.authorized() || !role) {
            return false;
        }
        const gate = GameConfig.instance.getConfig(GConfig.OpenCondition, "act_achievement");
        if (gate && !EntryGateUtils.isEntryOpen(gate, role.level, 0)) {
            this.host.notice(`角色达到 ${gate.level} 级开启每日任务`);
            return true;
        }
        void this.ui.openById("quest", {
            tab,
            canNavigate: (destination: string) => !!questDestinations[destination],
            navigate: (destination: string) => {
                const route = questDestinations[destination];
                return route ? this.open(route) : false;
            },
        }).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                this.host.notice("任务界面加载失败，请再次点击重试");
            }
        });
        return true;
    }

    /** 玩法与任务入口共用等级读取，梦境和试炼按副本策划的功能编号准入。 */
    private canOpenPlay(id: "gold-dungeon" | "dreamland" | "trial" | "arena" | "tower" | "main_black_market" | "smith"): boolean {
        const entry = CityNavigationUtils.findNavEntry(id === "gold-dungeon" ? "daily" : id);
        const role = this.host.account?.snapshot.role;
        const dungeonGates: Readonly<Record<string, string | undefined>> = {
            dreamland: "main_infinite", trial: "main_proving_lang",
        };
        const gateId = dungeonGates[id] ?? entry?.gateId;
        const gate = gateId && GameConfig.instance.getConfig(GConfig.OpenCondition, gateId);
        if (!role || !gate) {
            this.host.notice(routes[id].title + "条件尚未同步");
            return false;
        }
        if (!EntryGateUtils.isEntryOpen(gate, role.level, 0)) {
            this.host.notice(`角色达到 ${gate.level} 级开启${routes[id].title}`);
            return false;
        }
        return true;
    }

    /** 在试炼地图上打开周货架，保留地图的进度和当前展示。 */
    private openTrialShop(): void {
        void this.ui.openById("trial-shop").catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("试炼商店打开失败，请重试");
            }
        });
    }

    /** 副本和公会共用底栏的实际等级门槛。 */
    private canOpenGatedTab(tab: "dungeon" | "clan"): boolean {
        const gate = CityNavigationUtils.bottomGate(tab);
        const role = this.host.account?.snapshot.role;
        const title = routes[tab].title;
        if (!gate || !role) {
            this.host.notice(title + "条件尚未同步");
            return false;
        }
        if (!EntryGateUtils.isEntryOpen(gate, role.level, 0)) {
            this.host.notice(`角色达到 ${gate.level} 级开启${title}`);
            return false;
        }
        return true;
    }

    /** 身份变化或返回时撤销等待提示并使旧意图失效，不清除业务Model或直接销毁页面。 */
    reset(): void {
        this.epoch++;
        this.clearLoadingNotice();
    }

    /** 应用销毁后拒绝后续点击和迟到失败，页面释放仍由统一导航负责。 */
    dispose(): void {
        this.disposed = true;
        this.reset();
    }

    /** 判断某次打开结果是否仍属于当前有效意图。 */
    private accepts(epoch: number): boolean {
        return !this.disposed && epoch === this.epoch && this.host.authorized();
    }

    /** 撤销未触发的等待提示；旧异步完成只清理自己的意图，不能撤掉后来页面的计时器。 */
    private clearLoadingNotice(expectedEpoch?: number): void {
        if (expectedEpoch !== undefined && expectedEpoch !== this.epoch) {
            return;
        }
        if (this.loadingNoticeTimer !== null) {
            clearTimeout(this.loadingNoticeTimer);
            this.loadingNoticeTimer = null;
        }
    }
}
