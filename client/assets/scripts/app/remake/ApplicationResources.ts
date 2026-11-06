/** 应用资源所有者：集中管理启动、主城、背包和英雄的常驻预热作用域，页面动态资源另归节点。 */
import { Asset, Prefab } from "cc";
import { ResourceScope, ResourceScopeClosed } from "../../framework/assets/ResourcePool";
import { createFeatureResourceScope, loadFeaturePage } from "./FeatureResources";
import { createHeroResourceScope, loadHeroDetailPage, loadHeroPage } from "./HeroResources";
import { createHomeResourceScope } from "./HomeResources";
import { createStartupResourceScope, STARTUP_RESOURCE_KEYS } from "./StartupResources";

export class ApplicationResources {
    /** 应用结束后拒绝迟到页面重新创建预热作用域。 */
    private closed = false;
    /** 应用启动资源，第一次预热创建，应用关闭释放。 */
    private startup: ResourceScope<Asset> | null = null;
    /** 主城预制体及依赖，应用内重复登录复用。 */
    private home: ResourceScope<Prefab> | null = null;
    /** 英雄预热资源，首次进入英雄模块创建。 */
    private hero: ResourceScope<Prefab> | null = null;
    /** 背包、选服和阵容预热资源，不含角色业务数据。 */
    private features: ResourceScope<Prefab> | null = null;

    /** 预热启动所需资源并报告完成份数；失败由启动流程决定重试。 */
    public async prepareStartup(progress: (done: number, total: number) => void): Promise<void> {
        if (this.closed) return Promise.reject(new ResourceScopeClosed("应用资源已关闭"));
        if(!this.startup) this.startup = createStartupResourceScope();
        let done = 0;
        await Promise.all(STARTUP_RESOURCE_KEYS.map(async key => {
            await this.startup!.load(key);
            progress(++done, STARTUP_RESOURCE_KEYS.length);
        }));
    }

    /** 按需取得主城预制体，准备配置的顺序由HomeResources保持。 */
    public homePage(): Promise<Prefab> {
        if (this.closed) return Promise.reject(new ResourceScopeClosed("应用资源已关闭"));
        if(!this.home) this.home = createHomeResourceScope();
        return this.home.load("home");
    }

    /** 按模块预热并返回入口预制体，未登记组无法传入。 */
    public featurePage(group: "bag" | "campaign" | "formation" | "servers"): Promise<Prefab> {
        if (this.closed) return Promise.reject(new ResourceScopeClosed("应用资源已关闭"));
        if(!this.features) this.features = createFeatureResourceScope();
        return loadFeaturePage(this.features, group);
    }

    /** 英雄列表与详情共享应用预热范围，不创建第二套资源缓存。 */
    public heroPage(detail = false): Promise<Prefab> {
        if (this.closed) return Promise.reject(new ResourceScopeClosed("应用资源已关闭"));
        if(!this.hero) this.hero = createHeroResourceScope();
        return detail ? loadHeroDetailPage(this.hero) : loadHeroPage(this.hero);
    }

    /** 调用前先关闭页面，撤回各预热作用域持有；重复销毁安全。 */
    public dispose(): void {
        this.closed = true;
        this.startup?.dispose(); this.startup = null;
        this.home?.dispose(); this.home = null;
        this.hero?.dispose(); this.hero = null;
        this.features?.dispose(); this.features = null;
    }
}
