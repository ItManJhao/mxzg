type Stop = () => void;
let batchDepth = 0;
const notifications = new Set<() => void>();

/** Commit related Models synchronously, then publish their notifications. No async work inside. */
export function batchNotifications<T>(commit: () => T): T {
    batchDepth++;
    try { return commit(); }
    finally { batchDepth--; if (!batchDepth) flush(); }
}

export function publishNotification(notify: () => void): void {
    notifications.add(notify);
    if (!batchDepth) flush();
}

let flushing = false;
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

/** Features augment this interface with their event names and payloads. */
export interface EventPayloads {}

/** One global dispatcher. There is no per-module emitter or global clear operation. */
export class EventDispatcher {
    static readonly instance = new EventDispatcher();
    private readonly listeners = new Map<keyof EventPayloads, Set<(payload: any) => void>>();

    private constructor() {}

    on<K extends keyof EventPayloads>(event: K, handler: (payload: EventPayloads[K]) => void): Stop {
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

    once<K extends keyof EventPayloads>(event: K, handler: (payload: EventPayloads[K]) => void): Stop {
        const stop = this.on(event, payload => {
            stop();
            handler(payload);
        });
        return stop;
    }

    emit<K extends keyof EventPayloads>(event: K, payload: EventPayloads[K]): void {
        publishNotification(() => {
            for (const handler of Array.from(this.listeners.get(event) || [])) {
                // A handler removed by an earlier handler must not run later in this delivery.
                if (!this.listeners.get(event)?.has(handler)) continue;
                try { handler(payload); }
                catch (error) { console.error("[EventDispatcher] " + String(event) + " handler " + (handler.name || "anonymous"), error); }
            }
        });
    }

    listenerCount<K extends keyof EventPayloads>(event: K): number { return this.listeners.get(event)?.size || 0; }
}
