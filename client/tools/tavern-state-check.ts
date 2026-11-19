/**
 * 冒险点权威快照专项：校验角色投影、唯一Model深冻结和角色/背包的原子提交。
 * 全部使用内存状态及受控账号入口，不连接服务器、不从900401库存推断点数，也不打开玩家入口。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel, type RoleProfile } from "../assets/scripts/features/account/AccountModel";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { BagEvent } from "../assets/scripts/features/bag/utils/BagEvent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";

/** 提供合法角色身份；冒险点只在统一快照顶层出现，不混入基础角色或钱包。 */
function role(id = "tavern-owner", gold = 1): RoleProfile {
    return { id, nickname: "冒险点测试", serverId: "local-1", level: 1, gold, diamonds: 0 };
}

/** 创建可省略冒险点的完整资产夹具；普通库存仅保存与金币一致的测试道具数量。 */
function snapshot(revision: number, gold: number, tavernPoints?: unknown,
    owner = "tavern-owner"): Record<string, unknown> {
    return {
        revision,
        role: role(owner, gold),
        heroes: [],
        inventory: gold > 0 ? [{ itemId: 900102, quantity: gold }] : [],
        ...(tavernPoints === undefined ? {} : { tavernPoints }),
    };
}

/** 封装服务端提交后状态；登录与恢复帧由各专项显式指定。 */
function changed(body: unknown): GameFrame {
    return { version: 1, kind: "event", name: "state.changed", body };
}

/** 已提供的冒险点必须完整合法；旧库存保持原义，不能填补未同步扩展。 */
function checkProjection(): void {
    for (const points of [
        { schemaVersion: 1, adventureCount: 0, limit: 0 },
        { schemaVersion: 1, adventureCount: 11000, limit: 11000 },
        { schemaVersion: 1, adventureCount: 12000, limit: 11000 },
        { schemaVersion: 1, adventureCount: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER },
    ]) {
        const source = snapshot(1, 1, points);
        const before = JSON.stringify(source);
        const projected = AccountApi.readSnapshotRole(source);
        assert.deepEqual(projected.tavernPoints, points);
        assert(Object.isFrozen(projected.tavernPoints));
        assert.notEqual(projected.tavernPoints, points, "不能保留解码树的可变引用");
        assert.equal(JSON.stringify(source), before);
    }
    const old = snapshot(1, 1);
    old.inventory = [{ itemId: 900401, quantity: 7 }];
    assert.equal(AccountApi.readSnapshotRole(old).tavernPoints, undefined);
    assert.deepEqual(old.inventory, [{ itemId: 900401, quantity: 7 }], "旧库存不能被静默清空或变成点数");
    const known = { schemaVersion: 1, adventureCount: 1, limit: 11000 };
    assert.throws(() => AccountApi.readSnapshotRole({ ...old, tavernPoints: known }), /900401/);
    const invalid: unknown[] = [
        null, [], 0, "points", {},
        { adventureCount: 0, limit: 1 },
        { schemaVersion: 0, adventureCount: 0, limit: 1 },
        { schemaVersion: 2, adventureCount: 0, limit: 1 },
        { schemaVersion: "1", adventureCount: 0, limit: 1 },
        ...["adventureCount", "limit"].flatMap(key => [
            ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "0", null].map(value => ({
                ...known, [key]: value,
            })),
            Object.fromEntries(Object.entries(known).filter(([field]) => field !== key)),
        ]),
    ];
    for (const value of invalid) {
        assert.throws(() => AccountApi.readSnapshotRole(snapshot(2, 99, value)));
    }
    assert.throws(() => AccountApi.readSnapshotRole(null));
    assert.throws(() => AccountApi.readSnapshotRole([]));
}

/** 唯一账号Model隔离调用方对象；缺失快照覆盖为未同步，不保存第二份当前点数。 */
function checkModelOwnership(): void {
    const account = new AccountModel();
    const points = { schemaVersion: 1 as const, adventureCount: 50, limit: 11 };
    account.replace({ busy: false, role: { ...role(), tavernPoints: points }, error: "" });
    points.adventureCount = 999;
    assert.equal(account.snapshot.role!.tavernPoints!.adventureCount, 50);
    assert(Object.isFrozen(account.snapshot.role!.tavernPoints));
    account.replace({ busy: false, role: AccountApi.readSnapshotRole(snapshot(2, 1)), error: "" });
    assert.equal(account.snapshot.role!.tavernPoints, undefined);
    account.replace({ busy: false, role: null, error: "" });
    assert.equal(account.snapshot.role, null);
}

/** 登录、推送和同版本恢复共用投影；非法扩展或重复900401不能部分更新角色/背包及通知。 */
function checkAtomicDelivery(): void {
    const account = new AccountModel();
    const inventory = new BagModel();
    const bag = new BagController(inventory);
    let commits = 0;
    let notifications = 0;
    let expectedPoints: number | undefined = 10;
    account.replace({ busy: false, role: role(), error: "" });
    bag.initialize();
    const assets = new AssetStateBinding(account, bag, new RoleController(account));
    const verify = (): void => {
        if (account.snapshot.role && inventory.snapshot.synced) {
            notifications++;
            assert.equal(account.snapshot.role.gold, inventory.quantity(900102));
            assert.equal(account.snapshot.role.tavernPoints?.adventureCount, expectedPoints);
        }
    };
    const target = {};
    const stopBag = EventDispatcher.instance.on(BagEvent.BagUpdate, target, verify);
    const stopAccount = account.subscribe(() => {
        commits++;
        verify();
    });
    try {
        const initial = snapshot(1, 1, { schemaVersion: 1, adventureCount: 10, limit: 11 });
        assert(assets.apply({ version: 1, kind: "response", name: "session.login", ok: true,
            body: { initial } }));
        assert.equal(commits, 1, "角色与点数只经同一RoleController提交一次");
        const accountBefore = account.snapshot;
        const bagBefore = inventory.snapshot;
        const notifiedBefore = notifications;
        for (const invalid of [
            snapshot(2, 99, { schemaVersion: 1, adventureCount: -1, limit: 11 }),
            snapshot(2, 99, null),
            { ...snapshot(2, 99, { schemaVersion: 1, adventureCount: 20, limit: 11 }),
                inventory: [{ itemId: 900401, quantity: 99 }] },
            { ...snapshot(2, 99, { schemaVersion: 1, adventureCount: 20, limit: 11 }),
                inventory: [{ itemId: 900102, quantity: -1 }] },
        ]) {
            assert.throws(() => assets.apply(changed(invalid)));
            assert.equal(account.snapshot, accountBefore);
            assert.equal(inventory.snapshot, bagBefore);
            assert.equal(commits, 1);
            assert.equal(notifications, notifiedBefore);
        }
        assert(!assets.apply(changed(snapshot(1, 99, { schemaVersion: 1, adventureCount: 99, limit: 11 }))));
        assert(!assets.apply(changed(snapshot(0, 99, { schemaVersion: 1, adventureCount: 99, limit: 11 }))));
        assert.equal(account.snapshot, accountBefore, "同版推送和低版快照不能覆盖当前点数");
        expectedPoints = 15;
        assert(assets.apply({ version: 1, kind: "response", name: "session.authenticate", ok: true,
            body: { initial: snapshot(1, 1, { schemaVersion: 1, adventureCount: 15, limit: 11 }) } }));
        assert.equal(account.snapshot.role!.tavernPoints!.adventureCount, 15, "同版鉴权首包重新接纳扩展");
        expectedPoints = undefined;
        assert(assets.apply(changed(snapshot(2, 2))));
        assert.equal(account.snapshot.role!.tavernPoints, undefined, "旧快照缺字段必须清除上份点数");
        expectedPoints = 30;
        assert(assets.apply(changed(snapshot(3, 3, { schemaVersion: 1, adventureCount: 30, limit: 11 }))));
        expectedPoints = undefined;
        assert(assets.apply({ version: 1, kind: "response", name: "session.authenticate", ok: true,
            body: { initial: snapshot(3, 3) } }));
        assert.equal(account.snapshot.role!.tavernPoints, undefined, "同版恢复缺扩展也不能沿用旧值");
        account.replace({ busy: false, role: null, error: "" });
        assert.equal(inventory.snapshot.synced, false);
        expectedPoints = 0;
        EventDispatcher.batchNotifications(() => {
            account.replace({ busy: false, role: role("other-owner", 0), error: "" });
            assert(assets.apply({ version: 1, kind: "response", name: "session.login", ok: true,
                body: { initial: snapshot(0, 0, { schemaVersion: 1, adventureCount: 0, limit: 0 }, "other-owner") } }));
        });
        const switched = account.snapshot;
        assert.throws(() => assets.apply(changed(snapshot(999, 999,
            { schemaVersion: 1, adventureCount: 999, limit: 11 }))));
        assert.equal(account.snapshot, switched, "旧角色高版本不能覆盖新角色点数");
    } finally {
        stopBag();
        stopAccount();
        assets.dispose();
        bag.dispose();
        EventDispatcher.instance.offTarget(target);
    }
}

/** 账号登录和当前角色读取必须使用同一Snapshot投影，缺失扩展与坏扩展不能被角色单独读取绕过。 */
async function checkAccountGateway(): Promise<void> {
    const points = { schemaVersion: 1, adventureCount: 12000, limit: 11000 };
    let current: GameFrame = { version: 1, kind: "response", name: "session.login", ok: true,
        body: { initial: snapshot(1, 1, points),
            session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" } } };
    const calls: string[] = [];
    const socket = {
        login: async () => { calls.push("session.login"); return current; },
        connect: async () => { calls.push("connect"); },
        get latestState(): GameFrame { return current; },
    } as unknown as GameSocketClient;
    const api = new AccountApi(socket);
    const login = await api.developmentLogin("player", "local-1");
    assert.deepEqual(login.role.tavernPoints, points);
    assert.deepEqual((await api.currentRole("a".repeat(43))).tavernPoints, points);
    current = changed(snapshot(2, 2));
    assert.equal((await api.currentRole("a".repeat(43))).tavernPoints, undefined);
    current = { ...current, body: snapshot(3, 99, { ...points, limit: -1 }) };
    await assert.rejects(api.currentRole("a".repeat(43)));
    current = { version: 1, kind: "response", name: "session.login", ok: true,
        body: { initial: snapshot(3, 99, { ...points, adventureCount: -1 }),
            session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" } } };
    await assert.rejects(api.developmentLogin("player", "local-1"));
    assert.deepEqual(calls, ["session.login", "connect", "connect", "connect", "session.login"]);
}

/** 执行纯客户端权威状态专项，全部检查完成才报告通过。 */
async function main(): Promise<void> {
    checkProjection();
    checkModelOwnership();
    checkAtomicDelivery();
    await checkAccountGateway();
    const javaPath = process.argv.find(value => value.startsWith("--java="))?.slice(7);
    if (javaPath) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync(javaPath));
        const body = frame.body as Record<string, unknown>;
        const state = frame.kind === "event" ? body : body.initial;
        const current = AccountApi.readSnapshotRole(state);
        assert(current.tavernPoints, "本轮Java真实帧必须携带独立冒险点");
        assert(Object.isFrozen(current.tavernPoints));
        console.log("Java冒险点真实帧互通通过：" + JSON.stringify(current.tavernPoints));
    }
    console.log("PASS authoritative tavern snapshot, old-field absence, overflow balance, frozen role state and atomic/session-isolated delivery");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
