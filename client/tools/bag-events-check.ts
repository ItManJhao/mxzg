import { strict as assert } from "node:assert";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { BagEvent } from "../assets/scripts/features/Bag/BagEvent";
import type { BagItemData } from "../assets/scripts/features/Bag/data/BagItemData";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { EventDispatcher, batchNotifications } from "../assets/scripts/framework/EventDispatcher";

const bus = EventDispatcher.instance;
const inventoryEvents = [BagEvent.BagAdd, BagEvent.BagRemove, BagEvent.BagQuantityChanged, BagEvent.BagUpdate];
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const rows = (...values: number[][]): readonly BagItemData[] => values.map(([itemId, quantity]) => ({ itemId, quantity }));
function deferred<T>() {
    let resolve!: (value: T) => void, reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function fixture() {
    const model = new BagModel(), account = new AccountModel(), c = new BagController(model);
    const requests: ReturnType<typeof deferred<readonly BagItemData[]>>[] = [];
    const service = new AccountService(account, {
        developmentLogin: async (name, world) => ({ role: { id: name, nickname: name, serverId: world || "one", level: 1, gold: 0, diamonds: 0 },
            session: { accessToken: name[0].repeat(43), expiresAt: "2099-01-01T00:00:00Z" } }),
        currentRole: async () => account.snapshot.role!,
    }, { read: () => null, write: () => {}, clear: () => {} });
    c.initialize({ account, authorization: service, api: { list: () => { const request = deferred<readonly BagItemData[]>(); requests.push(request); return request.promise; } } });
    const events: { name: string; data: any; items: readonly BagItemData[] }[] = [];
    const stops = Object.values(BagEvent).map(name => bus.on(name, data => {
        if (name !== BagEvent.BagSyncStateChanged) {
            assert.equal(data.revision, model.version, "every inventory callback reads this completed batch's revision");
            assert.equal(data.roleKey, model.roleKey);
        }
        events.push({ name, data, items: model.items });
    }));
    const inventory = () => events.filter(event => event.name !== BagEvent.BagSyncStateChanged);
    const clear = () => { events.length = 0; };
    const update = (id: string, items: readonly BagItemData[], reason: "reward" | "consume" | "unknown" = "unknown") =>
        c.runInventoryUpdate(id, async () => items, value => value, () => {}, reason);
    const login = async (items: readonly BagItemData[]) => {
        await service.login("player_one", "one");
        requests[requests.length - 1].resolve(items); await c.refresh();
    };
    return { model, account, service, c, events, requests, inventory, clear, update, login,
        stop: () => { stops.forEach(stop => stop()); c.dispose(); } };
}

async function checkChanges(): Promise<void> {
    const f = fixture();
    try {
        await f.login(rows([1, 10], [2, 20]));
        const initial = f.inventory();
        assert.equal(initial.filter(event => event.data.reason === "initial-sync").length, 1);
        assert(initial.every(event => event.name === BagEvent.BagUpdate), "initial/reset snapshots are not acquired or consumed items");
        assert.deepEqual(initial[initial.length - 1].data.added, []);
        f.clear();

        await f.update("add", rows([1, 10], [2, 20], [3, 4], [4, 6]), "reward");
        assert.deepEqual(f.inventory().map(event => event.name), [BagEvent.BagAdd, BagEvent.BagUpdate]);
        assert.equal(f.inventory()[0].data.added.length, 2, "one aggregated Add for multiple new entries");
        assert.equal(f.inventory()[1].data.reason, "reward"); f.clear();

        await f.update("quantity-up", rows([1, 13], [2, 20], [3, 4], [4, 6]));
        assert.deepEqual(f.inventory().map(event => event.name), [BagEvent.BagQuantityChanged, BagEvent.BagUpdate]);
        assert.deepEqual(f.inventory()[0].data.quantityChanged, [{ itemId: 1, oldQuantity: 10, newQuantity: 13, delta: 3 }]);
        assert.equal(f.inventory()[1].data.reason, "unknown", "do not infer reason from positive amounts or response ID"); f.clear();

        await f.c.applyDelta(f.c.captureSession(), "decrease", [{ itemId: 1, delta: -5 }], "consume");
        assert.deepEqual(f.inventory()[0].data.quantityChanged, [{ itemId: 1, oldQuantity: 13, newQuantity: 8, delta: -5 }]); f.clear();
        await f.c.applyDelta(f.c.captureSession(), "zero", [{ itemId: 3, delta: -4 }], "consume");
        assert.deepEqual(f.inventory().map(event => event.name), [BagEvent.BagRemove, BagEvent.BagUpdate]);
        assert.deepEqual(f.inventory()[0].data.removed, [{ itemId: 3, quantity: 4 }]);
        assert(Object.isFrozen(f.inventory()[0].data.removed[0]));
        assert.equal(Reflect.set(f.inventory()[0].data.removed[0], "quantity", 100), false); f.clear();

        const expected = rows([1, 9], [5, 7], [6, 8]);
        await f.update("mixed", expected);
        assert.deepEqual(f.inventory().map(event => event.name), inventoryEvents);
        const summary = f.inventory()[3].data;
        assert.equal(summary.added.length, 2); assert.equal(summary.removed.length, 2); assert.equal(summary.quantityChanged.length, 1);
        for (const event of f.inventory()) {
            assert.deepEqual(event.items, expected);
            assert(Object.isFrozen(event.data));
            for (const field of ["added", "quantityChanged", "removed"]) if (event.data[field]) assert(Object.isFrozen(event.data[field]));
        }
        f.clear();
        await f.update("identical", expected); assert.equal(f.inventory().length, 0);
        const query = f.c.refresh(true); await tick(); f.requests[f.requests.length - 1].resolve(expected); await query;
        assert.equal(f.inventory().length, 0, "identical full query has no inventory events");
        assert(f.events.some(event => event.name === BagEvent.BagSyncStateChanged)); f.clear();

        const before = f.model.items;
        await assert.rejects(f.update("invalid", rows([1, 999], [1, 1])), /无效/);
        assert.equal(f.model.items, before); assert.equal(f.model.snapshot.status, "error"); assert.equal(f.inventory().length, 0);
        assert(f.events.some(event => event.name === BagEvent.BagSyncStateChanged && event.data.status === "error" && event.data.error));
        const revision = f.model.version;
        await assert.rejects(f.c.applyDelta(f.c.captureSession(), "invalid-delta", [{ itemId: 1, delta: 1 }, { itemId: 5, delta: -100 }]), /无效/);
        assert.equal(f.model.items, before); assert.equal(f.model.version, revision); assert.equal(f.inventory().length, 0);
        const recover = f.c.refresh(true); await tick(); f.requests[f.requests.length - 1].resolve(expected); await recover;
        assert.equal(f.model.snapshot.status, "ready"); assert.equal(f.inventory().length, 0); f.clear();

        const oldScope = f.c.captureSession();
        const late = f.c.refresh(true); await tick(); const oldRequest = f.requests[f.requests.length - 1];
        await f.service.login("player_two", "two");
        f.requests[f.requests.length - 1].resolve(rows([8, 1])); await f.c.refresh(); f.clear();
        oldRequest.resolve(rows([999, 100])); assert.equal(await late, false);
        assert.equal(await f.c.applyDelta(oldScope, "late-delta", [{ itemId: 8, delta: 99 }]), false);
        assert.deepEqual(f.model.items, rows([8, 1])); assert.equal(f.inventory().length, 0);
        f.service.logout();
        const reset = f.inventory(); assert.equal(reset.length, 1); assert.equal(reset[0].name, BagEvent.BagUpdate);
        assert.equal(reset[0].data.reason, "session-reset"); assert.deepEqual(reset[0].data.removed, []); assert.equal(reset[0].items.length, 0);
    } finally { f.stop(); }
}

async function checkReentrantBatch(outerBatch: boolean): Promise<void> {
    const f = fixture();
    try {
        await f.login(rows([1, 10], [2, 20])); f.clear();
        let next: Promise<boolean> | undefined;
        const stop = bus.once(BagEvent.BagAdd, () => {
            next = f.c.applyDelta(f.c.captureSession(), "next-batch", [{ itemId: 1, delta: -2 }], "consume");
            assert.equal(f.model.quantity(1), 12, "a reentrant submission must wait until all current notifications finish");
        });
        // Delta commits synchronously when idle; exercise both normal and already-flushing dispatch.
        const submit = () => f.c.applyDelta(f.c.captureSession(), "mixed-reentrant", [{ itemId: 1, delta: 2 }, { itemId: 2, delta: -20 }, { itemId: 3, delta: 4 }]);
        let first!: Promise<boolean>;
        if (outerBatch) batchNotifications(() => { first = submit(); }); else first = submit();
        await first; await next; stop();
        assert.deepEqual(f.inventory().map(event => event.name), [...inventoryEvents, BagEvent.BagQuantityChanged, BagEvent.BagUpdate]);
        for (const event of f.inventory().slice(0, 4)) assert.deepEqual(event.items, rows([1, 12], [3, 4]));
        for (const event of f.inventory().slice(4)) assert.deepEqual(event.items, rows([1, 10], [3, 4]));
        assert(f.inventory()[3].data.revision < f.inventory()[4].data.revision);
    } finally { f.stop(); }
}

async function checkReentrantSession(): Promise<void> {
    const f = fixture();
    try {
        await f.login(rows([1, 10])); f.clear();
        const stop = bus.once(BagEvent.BagAdd, () => f.c.resetSession("new/role"));
        await f.c.applyDelta(f.c.captureSession(), "new-item", [{ itemId: 2, delta: 1 }]); stop();
        assert.deepEqual(f.inventory().map(event => event.name), [BagEvent.BagAdd, BagEvent.BagUpdate, BagEvent.BagUpdate]);
        assert.equal(f.inventory()[1].data.roleKey, "one/player_one");
        assert.equal(f.inventory()[2].data.roleKey, "new/role");
        assert.equal(f.inventory()[2].data.reason, "session-reset");
    } finally { f.stop(); }
}

const errors: unknown[][] = [], original = console.error;
console.error = (...args) => { errors.push(args); original(...args); };
(async () => {
    await checkChanges(); await checkReentrantBatch(false); await checkReentrantBatch(true); await checkReentrantSession();
    assert.equal(errors.length, 0, "event handler assertions must not be swallowed by dispatcher isolation");
    console.log("bag-events-check passed: initial/reset, add/remove/quantity/mixed/noop, immutable payloads, invalid atomic updates, stale sessions, status recovery and reentrant ordered batches");
})().catch(error => { original(error); process.exitCode = 1; });
