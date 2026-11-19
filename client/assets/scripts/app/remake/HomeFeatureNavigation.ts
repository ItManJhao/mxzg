/**
 * 主城功能入口协调：把底栏意图交给UIManager，处理真实慢开提示、加载取消、重试和返回主城。
 * 由当前场景的 ApplicationPages 持有，复用账号准入和页面宿主，不复制玩家数据。
 */
import { UIManager } from "../../framework/ui/UIManager";
import { GameLog } from "../../core/GameLog";
import { CityNavigationUtils } from "../../config/CityNavigationUtils";
import { EntryGateUtils } from "../../config/EntryGateUtils";
import type { AccountModel } from "../../features/account/AccountModel";

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
}

/** 功能页占用主城的内容区域；召唤与市场仍点亮主城导航。 */
type FeatureTab = "hero" | "bag" | "battle" | "summon" | "market" | "dungeon";

/** 主城点击目标、页面和内容区域对应关系。 */
const routes: Readonly<Record<string, { page: string; title: string; tab: FeatureTab }>> = {
    "hero-info": {page: "hero-info", title: "英雄详情", tab: "hero"},
    hero: {page: "hero", title: "英雄", tab: "hero"},
    bag: {page: "bag", title: "背包", tab: "bag"},
    battle: {page: "remake-campaign", title: "战斗", tab: "battle"},
    main_summon: {page: "first-summon", title: "召唤", tab: "summon"},
    main_shop: {page: "market", title: "市场", tab: "market"},
    dungeon: {page: "dungeon-hall", title: "副本大厅", tab: "dungeon"},
    "gold-dungeon": {page: "gold-dungeon", title: "金币副本", tab: "dungeon"},
};

/** 管理最新功能打开意图，加载失败时保留已显示的主城或功能页。 */
export class HomeFeatureNavigation {
    /** 从已登记的页面导出底栏开放状态；英雄详情与英雄列表只点亮同一个页签。 */
    public static readonly tabs = Object.freeze(
        Array.from(new Set(Object.values(routes).map(route => route.tab)))
            .filter(tab => tab !== "summon" && tab !== "market"),
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

    /** 处理已实现入口并返回true；仅有效打开持续等待才提示，未知入口返回false交原调用方说明未开放。 */
    open(id: string): boolean {
        if (id === "mainline") {
            id = "battle";
        }
        const route = Object.prototype.hasOwnProperty.call(routes, id) ? routes[id] : undefined;
        if (id !== "city" && !route) {
            return false;
        }
        if (this.disposed || !this.host.authorized()) {
            return true;
        }
        if (route?.tab === "dungeon" && !this.canOpenDungeon()) {
            return true;
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
        const args = id === "dungeon" ? { account: this.host.account, openGoldDungeon: () => this.open("gold-dungeon") }
            : id === "gold-dungeon" ? { backToHall: () => this.open("dungeon") } : undefined;
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

    /** 按当前角色资料和旧副本大厅门槛放行，锁定时显示实际等级。 */
    private canOpenDungeon(): boolean {
        const gate = CityNavigationUtils.bottomGate("dungeon");
        const role = this.host.account?.snapshot.role;
        if (!gate || !role) {
            this.host.notice("副本大厅条件尚未同步");
            return false;
        }
        if (!EntryGateUtils.isEntryOpen(gate, role.level, 0)) {
            this.host.notice(`角色达到 ${gate.level} 级开启副本大厅`);
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
