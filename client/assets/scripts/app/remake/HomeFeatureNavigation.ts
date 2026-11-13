/**
 * 主城功能入口协调：把底栏意图交给UIManager，处理加载取消、重试和返回主城。
 * 由RemakeApp持有，登录确认与账号状态仍归应用和账号模块，不复制玩家数据。
 */
import { UIManager } from "../../framework/ui/UIManager";
import { GameLog } from "../../core/GameLog";

/** 导航需要的页面操作；不包含资源获取或业务协议。 */
interface FeatureUi {
    /** 保留最新打开意图，取消被新意图替代的在途页面。 */
    keepOnly(id: string): void;

    /** 等待页面完成自身准备；失败和取消保持Promise拒绝。 */
    openById(id: string): Promise<unknown>;

    /** 将当前功能页交还主城，返回是否处理成功。 */
    back(): boolean;
}

/** 应用提供的当前页面、准入和提示入口，不向导航暴露账号凭证。 */
interface FeatureHost {
    /** 当前已显示页面；尚未显示时返回null。 */
    current(): string | null;

    /** 应用仍存活、身份已就绪且玩家已确认进入时返回true。 */
    authorized(): boolean;

    /** 将加载与失败提示交给现有主城显示。 */
    notice(text: string): void;
}

/** 当前主城功能与页面ID对应关系；资源地址仍由各View独立注册。 */
export const REMAKE_FEATURE_ROUTES: Readonly<Record<string, string>> = {
    "hero-info": "hero-info",
    hero: "hero",
    bag: "bag",
    battle: "remake-campaign"
};

/** 管理最新功能打开意图，加载失败时保留已显示的主城或功能页。 */
export class HomeFeatureNavigation {
    /** 功能打开意图代次；新点击、身份重置和销毁时递增，拒绝旧提示与重开。 */
    private epoch = 0;
    /** true表示所属应用已退出，不再处理页面打开或迟到结果。 */
    private disposed = false;

    /**
     * 保存应用注入的页面操作与状态读取口，不订阅账号或自行加载资源。
     * @param ui 当前应用使用的统一页面管理器。
     * @param host 应用提供的准入、当前页面和主城提示。
     */
    constructor(private readonly ui: FeatureUi, private readonly host: FeatureHost) {
    }

    /** 处理已实现入口并返回true；未知入口返回false，由原调用方说明未开放。 */
    open(id: string): boolean {
        if (id === "mainline") {
            id = "battle";
        }
        const pages = REMAKE_FEATURE_ROUTES;
        const titles: Record<string, string> = {hero: "英雄", "hero-info": "英雄详情", bag: "背包", battle: "战斗"};
        if (id !== "city" && !pages[id]) {
            return false;
        }
        if (this.disposed || !this.host.authorized()) {
            return true;
        }
        if (id === "city") {
            this.reset();
            this.ui.keepOnly("remake-home");
            this.ui.back();
            this.host.notice("");
            return true;
        }
        const page = pages[id];
        if (this.host.current() === page) {
            this.reset();
            this.ui.keepOnly(page);
            this.host.notice("");
            return true;
        }
        const epoch = ++this.epoch;
        this.host.notice("正在准备" + titles[id] + "界面…");
        this.ui.keepOnly(page);
        void this.ui.openById(page).then(() => {
            if (this.accepts(epoch)) {
                this.host.notice("");
            }
        }).catch(error => {
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
            this.host.notice(titles[id] + "界面加载失败，请再次点击重试");
        });
        return true;
    }

    /** 身份变化或返回时使旧意图失效，不清除业务Model或直接销毁页面。 */
    reset(): void {
        this.epoch++;
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
}
