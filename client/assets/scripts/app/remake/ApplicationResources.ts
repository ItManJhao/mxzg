/** 应用三段资源调度：启动小表、登录后一个完整配置包，其余美术按LoadingPlan或实际使用加载。
 * 类型化资源池拥有引用与在途请求，页面前台加载复用同一池；应用销毁释放持有。
 * 预加载不实例化页面、不调用View.prepare、不开放玩法；前两段失败交启动重试，后台失败记录后继续。
 */
import { ResourceAssetsUtils } from "../../framework/assets/ResourceAssetsUtils";
import {ResourceDescriptor} from "../../framework/assets/ResourceTypes";
import {GameConfig} from "../../config/GameConfig";
import {ConfigName} from "../../config/GConfig";
import { RemakeConfigUtils } from "../../config/RemakeConfigUtils";
import { ConfigPackageCancelled } from "../../config/ConfigPackageUtils";
import {LOADING_PLAN, LoadingTarget} from "./LoadingPlan";
import { StartupCancelled } from "./StartupFlowUtils";
import { GameLog } from "../../core/GameLog";
import { UIRegistry } from "../../framework/ui/UIRegistry";

export class ApplicationResources {
    /** 所有已准备图片、动画、音频等持有至应用销毁；不保存玩家业务数据。 */
    private readonly assets = ResourceAssetsUtils.createAssetScope();
    /** 已成功完成的语义目标键；配置提交和普通资源就绪分别记录，不替代资源池缓存。 */
    private readonly completed = new Set<string>();
    /** 后台代次，退出登录或重新开始时递增，阻止旧循环继续。 */
    private backgroundEpoch = 0;
    /** 应用关闭后拒绝新的准备与迟到完成。 */
    private closed = false;
    /** 本轮后台实际完成/失败数量；停止后保留统计，开始新一轮时重置。 */
    private progress = {total: 0, completed: 0, failed: 0, running: false};

    /** 应用建立时装配启动读取器；配置不会因导入页面脚本而自动读取。 */
    public constructor() {
        RemakeConfigUtils.initialize();
    }

    /** 返回后台真实任务统计副本；failed不算成功，统计不是下载字节或内存。 */
    public backgroundStatus(): Readonly<typeof this.progress> {
        return {...this.progress};
    }

    /** 页面引用只读取@UIRegistry.view的唯一Prefab地址；其他目标保留显式路径，不执行prepare或补入同模块资源。 */
    private resolve(target: LoadingTarget): ResourceDescriptor | { config: ConfigName } | { configPackage: true } {
        if ("page" in target) {
            const spec = UIRegistry.viewSpecOf(target.page);
            if (!spec) {
                throw new Error("LoadingPlan页面未通过@UIRegistry.view登记：" + target.page.name);
            }
            const address = ResourceAssetsUtils.address(spec.prefab, "Prefab");
            return ResourceAssetsUtils.describe(address.bundle, address.loadPath, "Prefab", spec.prefab);
        }
        if ("configPackage" in target || "config" in target || "loadPath" in target) {
            return target;
        }
        if (!target.bundle || !target.path) {
            throw new Error("LoadingPlan必须指定Bundle与加载路径");
        }
        return {
            bundle: target.bundle,
            path: target.path,
            assetPath: target.bundle + "/" + target.path,
            loadPath: target.path,
            type: target.type,
            uuid: "",
        };
    }

    /** 配置提交与原始JSON就绪使用不同完成键；实际下载仍由资源池按同一资源地址去重。 */
    private key(target: ResourceDescriptor | { config: ConfigName } | { configPackage: true }): string {
        if ("configPackage" in target) {
            return "game-config-package";
        }
        return "config" in target ? "game-config-table:" + target.config
            : JSON.stringify([target.bundle, target.loadPath || target.uuid, target.type]);
    }

    /** 真正完成目标才登记成功；配置内部进度来自实际读取/整理任务，失败和取消不留下成功标记。 */
    private async prepare(target: LoadingTarget, update?: (label: string, ratio: number) => void,
        active: () => boolean = () => !this.closed): Promise<void> {
        this.checkOpen();
        const resolved = await this.resolve(target);
        const key = this.key(resolved);
        if (this.completed.has(key) && (!("configPackage" in resolved) || GameConfig.instance.getPackageVersion())) {
            return;
        }
        if ("configPackage" in resolved) {
            try {
                await RemakeConfigUtils.prepareGameConfig(update || (() => {}), () => !this.closed && active());
            } catch (error) {
                if (error instanceof ConfigPackageCancelled) {
                    throw new StartupCancelled("配置准备阶段已取消");
                }
                throw error;
            }
        } else if ("config" in resolved) {
            await GameConfig.instance.prepare([resolved.config]);
        } else {
            await this.assets.load(resolved);
        }
        this.checkOpen();
        this.completed.add(key);
    }

    /** 前两段只执行用户配置目标，按实际完成项报告进度；空阶段立即完成。 */
    public async prepareStage(stage: "login" | "enterGame", update: (label: string, ratio: number) => void, active: () => boolean): Promise<void> {
        const targets = LOADING_PLAN[stage];
        update("准备资源", 0);
        for (let index = 0; index < targets.length; index++) {
            if (!active()) {
                throw new StartupCancelled("阶段准备已取消");
            }
            await this.prepare(targets[index], (label, ratio) => {
                if (active()) {
                    update(label, (index + ratio) / targets.length);
                }
            }, active);
            if (!active()) {
                throw new StartupCancelled("阶段准备已取消");
            }
            update("准备资源 " + (index + 1) + "/" + targets.length, (index + 1) / targets.length);
        }
        if (!targets.length) {
            update("准备完成", 1);
        }
    }

    /** 主城后逐项准备background配置目标；每项让帧，取消立即停止排队，失败继续且不假报完成。 */
    public async prepareBackground(yieldFrame: () => Promise<void>, active: () => boolean): Promise<void> {
        const epoch = ++this.backgroundEpoch;
        const valid = () => !this.closed && epoch === this.backgroundEpoch && active();
        const rows = LOADING_PLAN.background.map(target => this.resolve(target));
        if (!valid()) {
            return;
        }
        const pending = rows.filter(row => !this.completed.has(this.key(row)));
        const progress: {
            total: number;
            completed: number;
            failed: number;
            running: boolean
        } = this.progress = {total: pending.length, completed: 0, failed: 0, running: true};
        try {
            for (const row of pending) {
                await yieldFrame();
                if (!valid()) {
                    return;
                }
                try {
                    await this.prepare(row);
                    if (!valid()) {
                        return;
                    }
                    progress.completed++;
                } catch (error) {
                    if (!valid()) {
                        return;
                    }
                    progress.failed++;
                    if (progress.failed <= 5) {
                        const targetName = "configPackage" in row ? "游戏数据" : "config" in row ? row.config : row.assetPath;
                        GameLog.shared.classified("APP", "warn", "ApplicationResources", "后台资源失败，可再次加载：" + targetName + " " + String(error));
                    }
                }
            }
            GameLog.shared.classified("APP", progress.failed ? "warn" : "info", "ApplicationResources",
                "后台资源处理结束：成功" + progress.completed + "，失败" + progress.failed + "，总数" + progress.total);
        } finally {
            progress.running = false;
        }
    }

    /** 身份变化停止后续后台队列；静态资源仍可复用，不写入旧角色状态。 */
    public stopBackground(): void {
        this.backgroundEpoch++;
        this.progress.running = false;
    }

    /** 已销毁的拥有者不能继续排队或交付完成状态。 */
    private checkOpen(): void {
        if (this.closed) {
            throw new StartupCancelled("应用资源已关闭");
        }
    }

    /** 应用销毁时释放计划目标的资源持有；迟到加载由资源池拒绝交付。 */
    public dispose(): void {
        this.closed = true;
        this.stopBackground();
        this.assets.dispose();
        this.completed.clear();
    }
}
