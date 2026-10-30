export type Unsubscribe = () => void;

/** Owns only this caller's subscriptions. Reusable after clear; no global event reset. */
export class EventScope {
    private readonly subscriptions = new Set<Unsubscribe>();

    constructor(private readonly owner: string) {}

    add(unsubscribe: Unsubscribe): Unsubscribe {
        let active = true;
        const stop = () => {
            if (!active) return;
            active = false;
            this.subscriptions.delete(stop);
            unsubscribe();
        };
        this.subscriptions.add(stop);
        return stop;
    }

    clear(): void {
        for (const stop of Array.from(this.subscriptions)) {
            try { stop(); }
            catch (error) { console.error("[EventScope] " + this.owner + " cleanup failed", error); }
        }
    }
}
