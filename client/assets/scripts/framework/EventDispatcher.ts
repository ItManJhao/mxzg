/**
 * 全局有类型事件派发器，负责通知批次及目标作用域的监听归属。
 * View 关闭时按目标解除；模块监听由模块生命周期清理，事件不保存业务状态。
 */
type Stop = () => void;
let batchDepth = 0;
const notifications = new Set<() => void>();

/** 同步提交相关 Model 后再交付通知；提交回调中不能执行异步工作。 */
export function batchNotifications<T>(commit: () => T): T {
    batchDepth++;
    try { return commit(); }
    finally { batchDepth--; if (!batchDepth) flush(); }
}

/** 将通知排入当前批次；没有外层提交时立即按队列交付。 */
export function publishNotification(notify: () => void): void {
    notifications.add(notify);
    if (!batchDepth) flush();
}

let flushing = false;
/** 依次交付已提交通知；监听异常不阻断其他通知，重入通知进入后续批次。 */
function flush(): void {
    if (flushing) return;
    flushing = true;
    try {
        while (notifications.size) {
            const pending = Array.from(notifications);
            notifications.clear();
            for (const notify of pending) {
                try { notify(); } catch (error) { console.error("[Events] subscriber failed", error); }
            }
        }
    } finally { flushing = false; }
}

/** 功能模块通过类型扩展声明事件名和负载，框架不反向导入功能代码。 */
export interface EventPayloads {}

/** 全局唯一派发器；仅按监听归属解除，不提供全局清空。 */
export class EventDispatcher {
    static readonly instance = new EventDispatcher();
    private readonly listeners = new Map<keyof EventPayloads, Set<(payload: any) => void>>();
    private readonly targets = new Map<object, Map<keyof EventPayloads, Map<Function, Stop>>>();

    private constructor() {}

    on<K extends keyof EventPayloads>(event: K, target: object, handler: (payload: EventPayloads[K]) => void): Stop;
    on<K extends keyof EventPayloads>(event: K, handler: (payload: EventPayloads[K]) => void): Stop;
    /** 登记事件监听；提供目标时按事件、目标、原函数去重并绑定 this。返回重复安全的解除方法。 */
    on<K extends keyof EventPayloads>(event: K, targetOrHandler: object | ((payload: EventPayloads[K]) => void), callback?: (payload: EventPayloads[K]) => void): Stop {
        if (callback) return this.subscribeTarget(event, targetOrHandler, callback, false);
        const handler = targetOrHandler as (payload: EventPayloads[K]) => void;
        let group = this.listeners.get(event);
        if (!group) {
            group = new Set();
            this.listeners.set(event, group);
        }
        const subscription = (payload: EventPayloads[K]) => handler(payload);
        group.add(subscription);
        let active = true;
        return () => {
            if (!active) return;
            active = false;
            group!.delete(subscription);
            if (!group!.size && this.listeners.get(event) === group) this.listeners.delete(event);
        };
    }

    once<K extends keyof EventPayloads>(event: K, target: object, handler: (payload: EventPayloads[K]) => void): Stop;
    once<K extends keyof EventPayloads>(event: K, handler: (payload: EventPayloads[K]) => void): Stop;
    /** 登记一次性监听，在回调执行前解除；同一三元组以首次注册语义为准。 */
    once<K extends keyof EventPayloads>(event: K, targetOrHandler: object | ((payload: EventPayloads[K]) => void), callback?: (payload: EventPayloads[K]) => void): Stop {
        if (callback) return this.subscribeTarget(event, targetOrHandler, callback, true);
        const handler = targetOrHandler as (payload: EventPayloads[K]) => void;
        const stop = this.on(event, payload => {
            stop();
            handler(payload);
        });
        return stop;
    }

    /** 为目标建立可去重的监听记录；解除后同步回收空索引，避免持有已关闭界面。 */
    private subscribeTarget<K extends keyof EventPayloads>(event: K, target: object, handler: (payload: EventPayloads[K]) => void, once: boolean): Stop {
        let events = this.targets.get(target);
        if (!events) this.targets.set(target, events = new Map());
        let handlers = events.get(event);
        if (!handlers) events.set(event, handlers = new Map());
        const existing = handlers.get(handler);
        if (existing) return existing; // 同一三元组保留首次注册的 on/once 语义。
        const unsubscribe = this.on(event, payload => {
            if (once) stop();
            handler.call(target, payload);
        });
        let active = true;
        const stop = () => {
            if (!active) return;
            active = false;
            unsubscribe();
            handlers!.delete(handler);
            if (!handlers!.size) events!.delete(event);
            if (!events!.size) this.targets.delete(target);
        };
        handlers.set(handler, stop);
        return stop;
    }

    /** 移除指定事件、目标、原函数对应的监听；不存在时不产生副作用。 */
    off<K extends keyof EventPayloads>(event: K, target: object, handler: (payload: EventPayloads[K]) => void): void {
        this.targets.get(target)?.get(event)?.get(handler)?.();
    }

    /** 移除该目标在全部事件中的监听，不影响其他界面或模块。 */
    offTarget(target: object): void {
        const events = this.targets.get(target);
        if (!events) return;
        for (const handlers of Array.from(events.values())) {
            for (const stop of Array.from(handlers.values())) stop();
        }
    }

    /** 返回指定目标的监听数量，供生命周期检查使用。 */
    targetListenerCount(target: object): number {
        let count = 0;
        for (const handlers of this.targets.get(target)?.values() || []) count += handlers.size;
        return count;
    }

    /** 将事件交付排入通知批次；已解除的监听不会继续执行。 */
    emit<K extends keyof EventPayloads>(event: K, payload: EventPayloads[K]): void {
        publishNotification(() => {
            for (const handler of Array.from(this.listeners.get(event) || [])) {
                // 本轮交付中已被其他回调移除的监听不再执行。
                if (!this.listeners.get(event)?.has(handler)) continue;
                try { handler(payload); }
                catch (error) { console.error("[EventDispatcher] " + String(event) + " handler " + (handler.name || "anonymous"), error); }
            }
        });
    }

    /** 返回指定事件当前有效监听数量。 */
    listenerCount<K extends keyof EventPayloads>(event: K): number { return this.listeners.get(event)?.size || 0; }
}
