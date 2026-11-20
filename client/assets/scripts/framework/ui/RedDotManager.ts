/**
 * 汇总红点显示状态。业务模块提交已经计算好的布尔值，页面订阅自己的显示路径。
 * 路径按点号分层，任一后代亮起时祖先也亮起。会话结束时由应用重置显示状态。
 */
import { GameLog } from "../../core/GameLog";
import { EventDispatcher } from "../EventDispatcher";

/** 单次页面绑定记录，解除后不再参与任何尚未交付的通知。 */
interface RedDotSubscription {
    /** 页面用于更新节点显示的回调。 */
    readonly notify: (visible: boolean) => void;
    /** 上次交付的值，用于合并同批重复变化。 */
    visible: boolean;
}

export class RedDotManager {
    /** 应用和页面共用同一份显示状态，换号时由应用调用 reset。 */
    public static readonly instance = new RedDotManager();

    /** 当前被业务显式点亮的完整路径，关闭后即移除。 */
    private readonly sources = new Set<string>();

    /** 路径到当前点亮的自身及后代数，计数为零时不占用索引。 */
    private readonly counts = new Map<string, number>();

    /** 路径到当前页面绑定，最后一项解绑后同步清除。 */
    private readonly listeners = new Map<string, Set<RedDotSubscription>>();

    /** 从更新到通知交付之间跨过亮灭边界的路径，同批仅保留一次。 */
    private readonly changedPaths = new Set<string>();

    /** 交付各路径的最终值。稳定的函数引用可在全局事件批次内去重。 */
    private readonly publish = (): void => {
        const paths = [...this.changedPaths];
        this.changedPaths.clear();
        for (const path of paths) {
            const group = this.listeners.get(path);
            if (!group) {
                continue;
            }
            for (const subscription of [...group]) {
                const visible = this.isVisible(path);
                if (group.has(subscription) && subscription.visible !== visible) {
                    subscription.visible = visible;
                    this.notify(path, subscription);
                }
            }
        }
    };

    /** 由共享实例统一持有运行状态。 */
    private constructor() {
    }

    /** 读取路径的当前显示值，自身或任一后代亮起时返回 true。 */
    public isVisible(path: string): boolean {
        return this.counts.has(path);
    }

    /** 立即交付当前值并订阅后续变化，返回可重复调用的解除方法。 */
    public watch(path: string, listener: (visible: boolean) => void): () => void {
        this.requirePath(path);
        const group = this.listeners.get(path) ?? new Set<RedDotSubscription>();
        const subscription = { notify: listener, visible: this.isVisible(path) };
        group.add(subscription);
        this.listeners.set(path, group);
        this.notify(path, subscription);
        return () => {
            if (group.delete(subscription) && group.size === 0) {
                this.listeners.delete(path);
            }
        };
    }

    /** 写入一个业务条件，相同值重复提交不会派发通知。 */
    public set(path: string, visible: boolean): void {
        this.requirePath(path);
        this.updatePath(path, visible);
        this.schedulePublish();
    }

    /** 批量写入指定条件，先校验全部路径，整批生效后再通知页面。 */
    public setMany(values: Readonly<Record<string, boolean>>): void {
        const entries = Object.entries(values);
        for (const [path] of entries) {
            this.requirePath(path);
        }
        for (const [path, visible] of entries) {
            this.updatePath(path, visible);
        }
        this.schedulePublish();
    }

    /**
     * 用传入的真值完整替换分支来源，省略或传 false 的旧来源同时熄灭。
     * @param path 分支路径，仅处理它自身及以它为祖先的来源。
     * @param leaves 归属于此分支的完整路径和值，传空对象清空分支。
     */
    public replaceBranch(path: string, leaves: Readonly<Record<string, boolean>>): void {
        this.requirePath(path);
        const next = new Map(Object.entries(leaves));
        const prefix = path + ".";
        for (const key of next.keys()) {
            this.requirePath(key);
            if (key !== path && !key.startsWith(prefix)) {
                throw new Error("红点路径不属于指定分支：" + key);
            }
        }
        for (const key of this.sources) {
            if ((key === path || key.startsWith(prefix)) && !next.get(key)) {
                this.updatePath(key, false);
            }
        }
        for (const [key, visible] of next) {
            this.updatePath(key, visible);
        }
        this.schedulePublish();
    }

    /** 清空角色条件，通知仍然挂载的订阅者熄灭，保留页面绑定。 */
    public reset(): void {
        for (const path of this.counts.keys()) {
            this.changedPaths.add(path);
        }
        this.sources.clear();
        this.counts.clear();
        this.schedulePublish();
    }

    /** 禁止空段和空白，防止拼写错误意外创建一个无效祖先。 */
    private requirePath(path: string): void {
        if (!/^[^.\s]+(?:\.[^.\s]+)*$/.test(path)) {
            throw new Error("红点路径格式无效：" + path);
        }
    }

    /** 更新单条来源及各级汇总计数，只记录会影响亮灭的边界。 */
    private updatePath(path: string, visible: boolean): void {
        if (visible === this.sources.has(path)) {
            return;
        }
        if (visible) {
            this.sources.add(path);
        } else {
            this.sources.delete(path);
        }
        const delta = visible ? 1 : -1;
        let current = path;
        while (current) {
            const oldCount = this.counts.get(current) ?? 0;
            const count = oldCount + delta;
            if (count > 0) {
                this.counts.set(current, count);
            } else {
                this.counts.delete(current);
            }
            if ((oldCount === 0) !== (count === 0)) {
                this.changedPaths.add(current);
            }
            const parentEnd = current.lastIndexOf(".");
            current = parentEnd > 0 ? current.slice(0, parentEnd) : "";
        }
    }

    /** 复用全局事件批次，资产或子条件尚未全部提交时暂缓交付。 */
    private schedulePublish(): void {
        if (this.changedPaths.size > 0) {
            EventDispatcher.publishNotification(this.publish);
        }
    }

    /** 单个页面显示失败时记录来源，继续刷新其他页面。 */
    private notify(path: string, subscription: RedDotSubscription): void {
        try {
            subscription.notify(subscription.visible);
        } catch (error) {
            GameLog.shared.classified("FRAMEWORK", "error", "RedDotManager", "刷新红点失败 " + path + "：" + String(error));
        }
    }
}
