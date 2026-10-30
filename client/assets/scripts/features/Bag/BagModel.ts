import { BaseModel } from "../../framework/BaseModel";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData, BagItemDelta } from "./data/BagItemData";
import type { BagChangeSet, BagQuantityChange } from "./data/BagChangeSet";
import type { BagState } from "./data/BagState";

type BagContents = Omit<BagState, "roleKey" | "revision">;

/** The role's only inventory state. Controller owns requests and notifications. */
export class BagModel extends BaseModel {
    static readonly instance = new BagModel();
    private data: BagContents = this.emptyData();
    private cachedSnapshot: BagState | null = null;

    get snapshot(): BagState {
        if (!this.cachedSnapshot) {
            this.cachedSnapshot = Object.freeze({ ...this.data, roleKey: this.roleKey, revision: this.version });
        }
        return this.cachedSnapshot;
    }
    get items(): readonly BagItemData[] { return this.data.items; }
    getItem(itemId: number): Readonly<BagItemData> | undefined { return this.items.find(item => item.itemId === itemId); }
    quantity(itemId: number): number { return this.getItem(itemId)?.quantity || 0; }

    reset(roleKey: string | null): BagChangeSet {
        super.reset(roleKey);
        return this.changeSet(false, [], [], []);
    }

    dispose(): BagChangeSet {
        super.dispose();
        return this.changeSet(false, [], [], []);
    }

    beginSync(): void {
        this.requireRole();
        this.commit({ ...this.data, status: "loading", error: "" });
    }

    fail(error: string): void {
        this.requireRole();
        this.commit({ ...this.data, status: "error", error });
    }

    replaceAll(items: readonly BagItemData[]): BagChangeSet {
        this.requireRole();
        const rows = readBagItems(items);
        const initialSync = !this.data.synced;
        const added: BagItemData[] = [], removed: BagItemData[] = [], quantityChanged: BagQuantityChange[] = [];
        if (!initialSync) {
            const previous = new Map(this.items.map(item => [item.itemId, item] as const));
            for (const item of rows) {
                const old = previous.get(item.itemId);
                if (!old) added.push(item);
                else if (old.quantity !== item.quantity) quantityChanged.push(Object.freeze({ itemId: item.itemId,
                    oldQuantity: old.quantity, newQuantity: item.quantity, delta: item.quantity - old.quantity }));
                previous.delete(item.itemId);
            }
            removed.push(...Array.from(previous.values()));
        }
        this.commit({ status: "ready", synced: true, items: rows, error: "" });
        return this.changeSet(initialSync, added, quantityChanged, removed);
    }

    /** Signed changes are separate from snapshots. Validate every change before committing. */
    applyDelta(changes: readonly BagItemDelta[]): BagChangeSet {
        this.requireRole();
        if (!this.data.synced) throw new Error("背包尚未同步，不能应用增量");
        const next = new Map(this.items.map(item => [item.itemId, item.quantity] as [number, number]));
        const seen = new Set<number>();
        for (const change of changes) {
            if (!Number.isSafeInteger(change.itemId) || change.itemId <= 0 || !Number.isSafeInteger(change.delta) || seen.has(change.itemId)) {
                throw new Error("背包增量无效");
            }
            seen.add(change.itemId);
            const quantity = (next.get(change.itemId) || 0) + change.delta;
            if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("背包增量数量无效");
            if (quantity) next.set(change.itemId, quantity);
            else next.delete(change.itemId);
        }
        return this.replaceAll(Array.from(next, ([itemId, quantity]) => ({ itemId, quantity })));
    }

    protected onReset(): void {
        this.data = this.emptyData();
        this.cachedSnapshot = null;
    }

    private changeSet(initialSync: boolean, added: BagItemData[], quantityChanged: BagQuantityChange[], removed: BagItemData[]): BagChangeSet {
        return Object.freeze({ roleKey: this.roleKey, revision: this.version, initialSync,
            added: Object.freeze(added), quantityChanged: Object.freeze(quantityChanged), removed: Object.freeze(removed) });
    }

    private emptyData(): BagContents {
        return Object.freeze({ status: "idle", synced: false, items: Object.freeze([]), error: "" });
    }

    private requireRole(): void { if (!this.roleKey) throw new Error("背包没有当前角色"); }

    private commit(data: BagContents): void {
        this.data = Object.freeze(data);
        this.incrementVersion();
        this.cachedSnapshot = null;
    }
}
