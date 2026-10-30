import type { AccountModel } from "../account/AccountModel";
import { SessionChanged } from "../account/AccountService";
import type { AccountAuthorization } from "../account/AccountService";
import { BaseController } from "../../framework/BaseController";
import type { ControllerSession } from "../../framework/BaseController";
import { batchNotifications, publishNotification } from "../../framework/EventDispatcher";
import { BagModel } from "./BagModel";
import { BagEvent } from "./BagEvent";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData, BagItemDelta } from "./data/BagItemData";
import type { BagChangeReason } from "./data/BagEventData";
import type { BagChangeSet } from "./data/BagChangeSet";
import type { BagState } from "./data/BagState";

export interface BagGateway { list(token: string): Promise<readonly BagItemData[]>; }
export interface BagDependencies {
    readonly account: AccountModel;
    readonly authorization: AccountAuthorization;
    readonly api: BagGateway;
}

/** Role-session module. Opening or closing a BagView never owns this Controller. */
export class BagController extends BaseController {
    static readonly instance = new BagController(BagModel.instance);
    private account: AccountModel | null = null;
    private authorization: AccountAuthorization | null = null;
    private api: BagGateway | null = null;
    private readEpoch = 0;
    private pendingRead: Promise<boolean> | null = null;
    private writeCount = 0;
    private writeTail: Promise<void> = Promise.resolve();
    private inFlight = new Map<string, Promise<unknown>>();
    private receipts = new Set<string>();
    private notifying = false;
    private deferredMutations: Array<() => void> = [];

    constructor(private readonly model: BagModel) { super(); }

    /** Application supplies dependencies explicitly. A repeated call cannot register twice. */
    initialize(dependencies?: BagDependencies): void {
        if (this.isInitialized) {
            if (dependencies && (dependencies.account !== this.account || dependencies.authorization !== this.authorization || dependencies.api !== this.api)) {
                throw new Error("BagController 已初始化，请先 dispose 后重设依赖");
            }
            return;
        }
        if (!dependencies) throw new Error("BagController.initialize 缺少 account/authorization/api");
        this.account = dependencies.account;
        this.authorization = dependencies.authorization;
        this.api = dependencies.api;
        super.initialize();
    }

    protected onInitialize(): void {
        this.ownListener(this.account!.subscribe(() => this.syncSession()));
        this.resetSession(null);
        this.syncSession();
    }

    resetSession(roleKey: string | null): void {
        if (this.notifying) { this.deferredMutations.push(() => this.resetSession(roleKey)); return; }
        super.resetSession(roleKey);
    }

    dispose(): void {
        if (this.notifying) { this.deferredMutations.push(() => this.dispose()); return; }
        super.dispose();
    }

    protected onResetSession(roleKey: string | null): void {
        const previous = this.model.snapshot;
        this.invalidateRead();
        this.writeCount = 0;
        this.writeTail = Promise.resolve();
        this.inFlight.clear();
        this.receipts.clear();
        const changes = this.isInitialized ? this.model.reset(roleKey) : this.model.dispose();
        this.notify(changes, "session-reset", previous);
    }

    protected onDispose(): void {
        this.account = null;
        this.authorization = null;
        this.api = null;
    }

    /** Full query. Force invalidates an earlier read, e.g. after server starter initialization. */
    refresh(force = false): Promise<boolean> {
        if (!this.model.snapshot.roleKey || !this.authorization || !this.api) return Promise.resolve(false);
        const session = this.captureSession();
        if (this.pendingRead && !force) return this.pendingRead;
        if (this.notifying) return this.afterBatch(() => this.isCurrent(session) ? this.refresh(force) : false);
        if (this.writeCount) return this.writeTail.then(() => this.isCurrent(session) ? this.refresh(force) : false);
        if (this.pendingRead && !force) return this.pendingRead;
        const epoch = ++this.readEpoch;
        const authorization = this.authorization;
        const api = this.api;
        // Record deduplication before notifying observers, including synchronous callers of refresh().
        const request = Promise.resolve().then(() => this.read(session, epoch, authorization, api));
        this.pendingRead = request;
        void request.then(() => { if (this.pendingRead === request) this.pendingRead = null; });
        this.beginSync();
        return request;
    }

    /**
     * Inventory-affecting operations are serialized. Reads wait for them; older reads are invalidated.
     * Other Controllers supply the existing request/result and synchronous related-Model commit.
     * A closed window does not cancel this role-session operation.
     */
    runInventoryUpdate<T>(responseId: string, request: () => Promise<T>, inventory: (result: T) => readonly BagItemData[],
        commitRelated: (result: T) => void, reason: BagChangeReason = "unknown"): Promise<T> {
        if (!responseId) return Promise.reject(new Error("库存操作缺少唯一响应标识"));
        const current = this.inFlight.get(responseId);
        if (current) return current as Promise<T>;
        if (!this.model.roleKey || !this.authorization) return Promise.reject(new SessionChanged());
        const session = this.captureSession();
        if (this.notifying) return this.afterBatch(() => {
            if (!this.isCurrent(session)) throw new SessionChanged();
            return this.runInventoryUpdate(responseId, request, inventory, commitRelated, reason);
        });
        const previous = this.writeTail;
        const duplicate = this.receipts.has(responseId);
        if (!duplicate) {
            this.invalidateRead();
            this.writeCount++;
        }
        const operation = (async () => {
            await previous;
            try {
                if (!this.isCurrent(session)) throw new SessionChanged();
                const result = await request();
                if (!this.isCurrent(session)) throw new SessionChanged();
                const items = readBagItems(inventory(result));
                await this.afterBatch(() => {
                    if (!this.isCurrent(session)) throw new SessionChanged();
                    if (this.receipts.has(responseId)) return;
                    batchNotifications(() => {
                        const previous = this.model.snapshot;
                        commitRelated(result);
                        const changes = this.model.replaceAll(items);
                        this.receipts.add(responseId);
                        this.notify(changes, reason, previous);
                    });
                });
                return result;
            } catch (error) {
                if (!duplicate && this.isCurrent(session) && !(error instanceof SessionChanged)) {
                    await this.afterBatch(() => { if (this.isCurrent(session)) this.fail(error, "背包更新失败"); });
                }
                throw error;
            } finally {
                if (!duplicate && this.isCurrent(session)) this.writeCount--;
            }
        })();
        this.inFlight.set(responseId, operation);
        this.writeTail = operation.then(() => {}, () => {});
        const release = () => { if (this.inFlight.get(responseId) === operation) this.inFlight.delete(responseId); };
        void operation.then(release, release);
        if (!duplicate) {
            this.beginSync();
        }
        return operation;
    }

    /** Explicit delta entry; no invented server push is connected this batch. */
    applyDelta(session: ControllerSession, responseId: string, changes: readonly BagItemDelta[], reason: BagChangeReason = "unknown"): Promise<boolean> {
        if (!this.isCurrent(session) || this.receipts.has(responseId)) return Promise.resolve(false);
        if (!responseId) return Promise.reject(new Error("增量缺少唯一响应标识"));
        const input = changes.map(change => Object.freeze({ ...change }));
        if (this.writeCount) return this.writeTail.then(() => this.applyDelta(session, responseId, input, reason));
        return this.afterBatch(() => {
            if (!this.isCurrent(session) || this.receipts.has(responseId)) return false;
            if (this.writeCount) return this.writeTail.then(() => this.applyDelta(session, responseId, input, reason));
            const previous = this.model.snapshot;
            const result = this.model.applyDelta(input);
            this.invalidateRead();
            this.receipts.add(responseId);
            this.notify(result, reason, previous);
            return true;
        });
    }

    private async read(session: ControllerSession, epoch: number, authorization: AccountAuthorization, api: BagGateway): Promise<boolean> {
        try {
            const items = await authorization.authenticated(token => api.list(token));
            return await this.afterBatch(() => {
                if (!this.isCurrent(session) || epoch !== this.readEpoch) return false;
                const previous = this.model.snapshot;
                const changes = this.model.replaceAll(items);
                this.notify(changes, "query", previous);
                return true;
            });
        } catch (error) {
            return this.afterBatch(() => {
                if (!this.isCurrent(session) || epoch !== this.readEpoch || error instanceof SessionChanged) return false;
                this.fail(error, "背包读取失败");
                return false;
            });
        }
    }

    private syncSession(): void {
        if (this.notifying) { this.deferredMutations.push(() => this.syncSession()); return; }
        const state = this.account?.snapshot;
        const key = state?.role && !state.busy ? (state.role.serverId || "") + "/" + state.role.id : null;
        if (key === this.model.roleKey) return;
        this.resetSession(key);
        if (key) void this.refresh();
    }

    private invalidateRead(): void {
        this.readEpoch++;
        this.pendingRead = null;
    }

    private beginSync(): void {
        const previous = this.model.snapshot;
        this.model.beginSync();
        this.notify(null, "unknown", previous);
    }

    private fail(error: unknown, fallback: string): void {
        const previous = this.model.snapshot;
        this.model.fail(error instanceof Error ? error.message : fallback);
        this.notify(null, "unknown", previous);
    }

    /** Keep every callback of this batch on the same committed Model, even under the global flush. */
    private notify(changes: BagChangeSet | null, reason: BagChangeReason, previous: BagState): void {
        this.notifying = true;
        batchNotifications(() => {
            const state = this.model.snapshot;
            if (previous.roleKey !== state.roleKey || previous.status !== state.status || previous.synced !== state.synced || previous.error !== state.error) {
                this.emit(BagEvent.BagSyncStateChanged, Object.freeze({ roleKey: state.roleKey, revision: state.revision,
                    status: state.status, synced: state.synced, error: state.error }));
            }
            if (changes && (changes.initialSync || reason === "session-reset" || changes.added.length || changes.quantityChanged.length || changes.removed.length)) {
                const effectiveReason = changes.initialSync ? "initial-sync" : reason;
                const update = Object.freeze({ ...changes, reason: effectiveReason });
                const header = { roleKey: update.roleKey, revision: update.revision, reason: update.reason };
                if (update.added.length) this.emit(BagEvent.BagAdd, Object.freeze({ ...header, added: update.added }));
                if (update.removed.length) this.emit(BagEvent.BagRemove, Object.freeze({ ...header, removed: update.removed }));
                if (update.quantityChanged.length) this.emit(BagEvent.BagQuantityChanged, Object.freeze({ ...header, quantityChanged: update.quantityChanged }));
                this.emit(BagEvent.BagUpdate, update);
            }
            // Queued after the summary, not merely after enqueueing emit(). This also works in an outer batch.
            publishNotification(this.finishNotifications);
        });
    }

    private finishNotifications = (): void => {
        this.notifying = false;
        while (!this.notifying && this.deferredMutations.length) this.deferredMutations.shift()!();
    };

    private afterBatch<T>(action: () => T | PromiseLike<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = () => { try { resolve(action()); } catch (error) { reject(error); } };
            if (this.notifying) this.deferredMutations.push(run);
            else run();
        });
    }
}
