/** 调用方事件清理作用域及活动订阅计数；不保存业务状态，不清空其他拥有者。 */
import { GameLog } from "../core/GameLog";
export type Unsubscribe = () => void;

/** 只管理本调用方订阅；clear后可复用，不清空全局事件。 */
export class EventScope {
    /** 全部作用域尚未解除的订阅数，仅用于开发验收。 */
    private static activeSubscriptions = 0;

    /** 返回被作用域管理的订阅数，不代表所有引擎事件。 */
    public static snapshot(): number { return this.activeSubscriptions; }

    /** 本拥有者的解除函数集合，逐项移除防止重复注销。 */
    private readonly subscriptions = new Set<Unsubscribe>();

    /** 记录拥有者名称，清理异常时用于定位。 */
    constructor(private readonly owner: string) {}

    /** 登记一次解除函数，返回可提前取消且重复安全的句柄。 */
    add(unsubscribe: Unsubscribe): Unsubscribe {
        let active = true;
        const stop = () => {
            if (!active) return;
            active = false;
            EventScope.activeSubscriptions--;
            this.subscriptions.delete(stop);
            unsubscribe();
        };
        this.subscriptions.add(stop);
        EventScope.activeSubscriptions++;
        return stop;
    }

    /** 清理全部登记，即使单个解除失败仍继续清理其他项。 */
    clear(): void {
        for (const stop of Array.from(this.subscriptions)) {
            try { stop(); }
            catch (error) { GameLog.shared.classified("FRAMEWORK", "error", "EventScope", this.owner + " 清理失败：" + String(error)); }
        }
    }
}
