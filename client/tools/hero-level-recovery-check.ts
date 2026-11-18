/**
 * 普通升级的真实控制器与二进制回包专项。
 * 用内存日志和受控快照检验双确认、原编号恢复和换号清理，完全隔离玩家数据。
 */
import { strict as assert } from "node:assert";
import { HeroLevelController } from "../assets/scripts/features/hero/HeroLevelController";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { HeroLevelData } from "../assets/scripts/features/hero/data/HeroLevelData";
import type { HeroLevelRequest, HeroLevelReceipt } from "../assets/scripts/features/hero/data/HeroLevelData";
import { HeroLevelEvent } from "../assets/scripts/features/hero/utils/HeroLevelEvent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import type { OperationJournalPort } from "../assets/scripts/framework/PersistentOperationJournal";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

const HERO = { id: "11111111-1111-4111-8111-111111111111", templateId: 10304012, level: 1, star: 4, stage: 0 };
const OTHER_HERO_ID = "22222222-2222-4222-8222-222222222222";
const ROLE_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL = {
    requestId: "44444444-4444-4444-8444-444444444444", heroId: HERO.id, expectedLevel: 1, levels: 5,
};
type LevelMessage = typeof Protocol.HERO_LEVEL_UPGRADE | typeof Protocol.HERO_LEVEL_UPGRADE_STATUS;

/** 用真实 Protobuf 解码成功回包与失败前的原命令；传输关联由模拟端口施加。 */
function roundTrip(name: LevelMessage, kind: "request" | "response", body: unknown): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1, kind, name, ...(kind === "response" ? { ok: true } : {}), body,
    }));
}

/** 服务端回执保留原等级和真实提交版本；客户端不能拿它写余额或英雄。 */
function receipt(request: HeroLevelRequest): HeroLevelReceipt {
    return {
        requestId: request.requestId, heroId: request.heroId, roleId: ROLE_ID,
        fromLevel: request.expectedLevel, toLevel: request.expectedLevel + request.levels,
        configVersion: "hero-growth-test", assetRevision: 8,
    };
}

/** 受控完成一个挂起的刷新或回包，避免依赖实际网络时间。 */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(accept => { resolve = accept; });
    return { promise, resolve };
}

/** 在有限微任务内等候预期结果，遇到恢复停滞明确失败。 */
async function until(predicate: () => boolean, message: string): Promise<void> {
    for (let i = 0; i < 60; i++) {
        if (predicate()) {
            return;
        }
        await Promise.resolve();
    }
    assert.fail(message);
}

/** 测试中的条件删除遵守真实日志语义，只接受完整匹配的原参数。 */
class Journal implements OperationJournalPort<HeroLevelRequest> {
    /** 当前持有的原操作；null 表示已确认或从未提交。 */
    public pending: HeroLevelRequest | null = null;
    /** 实际删除成功次数，用于确认没有重复清理。 */
    public clears = 0;

    /** 模拟页面重开前已持久保存的操作。 */
    public constructor(initial: HeroLevelRequest | null = null) {
        this.pending = initial;
    }

    /** 按身份读原操作，供新会话优先查询回执。 */
    public async read(): Promise<HeroLevelRequest | null> {
        return this.pending;
    }

    /** 一旦保存原意图，后续尝试不能覆盖。 */
    public async create(candidate: HeroLevelRequest): Promise<HeroLevelRequest> {
        return this.pending ??= HeroLevelData.readRequest(candidate);
    }

    /** 同一原参数确认后，才从当前身份中删除。 */
    public async clear(expected: HeroLevelRequest): Promise<boolean> {
        if (!this.pending || !HeroLevelData.sameRequest(this.pending, expected)) {
            return false;
        }
        this.pending = null;
        this.clears++;
        return true;
    }
}

/** 每个场景独立持有真实控制器及名册，只有测试提交统一快照。 */
class Fixture {
    /** 角色权威名册的隔离实例。 */
    public readonly roster = new HeroRosterModel();
    /** 接入真实事件和协议路由的业务控制器。 */
    public readonly controller = new HeroLevelController(this.roster);
    /** 经过真实编码的请求，保留顺序以验证原编号与重放次数。 */
    public readonly sent: GameFrame[] = [];
    /** 已向界面报告的真实手动升级，忽略单纯状态刷新。 */
    public readonly completed: { heroId: string; fromLevel: number; toLevel: number }[] = [];
    /** 包含进度刷新在内的界面通知总数，用于核对旧任务静默退出。 */
    public updates = 0;
    /** 最近统一快照的已接纳版本，由案例显式推进。 */
    private revision = 7;
    /** 测试中请求统一状态的次数，普通回执到达不自动修改。 */
    public refreshes = 0;
    /** 每个用例按顺序模拟成功、失败或迟到回包。 */
    public send: (frame: GameFrame) => Promise<GameFrame> = async () => assert.fail("发生未预期的升级请求");
    /** 默认重新鉴权完成但没推进快照，用例须明确接纳权威状态。 */
    public refresh: () => Promise<void> = async () => {};

    /** 装配与实际应用一致的已认证网络及快照能力。 */
    public constructor() {
        this.apply(7, 1);
        this.controller.configure({
            send: async (name, body) => {
                const frame = roundTrip(name, "request", body);
                this.sent.push(frame);
                return this.send(frame);
            },
            refresh: async () => {
                this.refreshes++;
                await this.refresh();
            },
            revision: () => this.revision,
            balances: () => ({ gold: 4000, heroExp: 500 }),
        });
        this.controller.initialize();
        EventDispatcher.instance.on(HeroLevelEvent.Updated, this, ({ heroId, fromLevel, toLevel }) => {
            this.updates++;
            if (heroId && fromLevel !== undefined && toLevel !== undefined) {
                this.completed.push({ heroId, fromLevel, toLevel });
            }
        });
    }

    /** 模拟统一状态入口已经实际提交快照，改变版本和名册。 */
    public apply(revision: number, level: number, heroId = HERO.id): void {
        this.revision = revision;
        this.roster.replace({ status: "ready", heroes: [{ ...HERO, id: heroId, level }], error: "" });
    }

    /** 已鉴权首包提交后开启当前身份日志，控制器自行查回执或恢复原请求。 */
    public async authenticate(journal: Journal, heroId = HERO.id): Promise<void> {
        this.controller.afterAuthentication(async () => journal);
        await until(() => this.controller.describe(heroId).status !== "pending", "鉴权后的升级恢复没有完成");
    }

    /** 清理本场景的模块协议与界面订阅，防止事件跨场景串联。 */
    public dispose(): void {
        this.controller.dispose();
        EventDispatcher.instance.offTarget(this);
    }
}

/** 成功 ACK 早于资产时只查统一快照；版本和真实等级确认前不清日志。 */
async function waitForSnapshot(fixture: Fixture): Promise<void> {
    const journal = new Journal();
    await fixture.authenticate(journal);
    const refresh = deferred<void>();
    fixture.refresh = () => refresh.promise;
    fixture.send = async frame => {
        assert.equal(frame.name, Protocol.HERO_LEVEL_UPGRADE);
        assert.deepEqual(journal.pending, frame.body);
        return roundTrip(Protocol.HERO_LEVEL_UPGRADE, "response", receipt(frame.body as HeroLevelRequest));
    };
    const upgrade = fixture.controller.upgrade(HERO.id);
    assert.strictEqual(fixture.controller.upgrade(HERO.id), upgrade);
    await until(() => fixture.refreshes === 1, "缺快照未触发统一刷新");
    assert.equal(fixture.roster.snapshot.heroes[0].level, 1);
    assert.equal(journal.clears, 0);
    assert.deepEqual(fixture.completed, []);
    fixture.apply(8, 6);
    refresh.resolve();
    await upgrade;
    assert.equal(journal.clears, 1);
    assert.equal(journal.pending, null);
    assert.deepEqual(fixture.completed, [{ heroId: HERO.id, fromLevel: 1, toLevel: 6 }]);
    await fixture.authenticate(journal);
    assert.equal(fixture.sent.length, 1);
}

/** 冷重登已有原回执时只查状态，真实等级已达到则静默结束。 */
async function restoreKnownReceipt(fixture: Fixture): Promise<void> {
    fixture.apply(10, 6);
    fixture.send = async frame => {
        assert.equal(frame.name, Protocol.HERO_LEVEL_UPGRADE_STATUS);
        assert.deepEqual(frame.body, { requestId: ORIGINAL.requestId });
        return roundTrip(Protocol.HERO_LEVEL_UPGRADE_STATUS, "response", {
            requestId: ORIGINAL.requestId, found: true, receipt: receipt(ORIGINAL),
        });
    };
    const journal = new Journal(ORIGINAL);
    await fixture.authenticate(journal);
    assert.equal(fixture.sent.length, 1);
    assert.equal(journal.clears, 1);
    assert.equal(fixture.refreshes, 0);
    assert.deepEqual(fixture.completed, []);
}

/** 断线丢回包后先查原编号。服务端尚无记录时才按原参数重发，不展示重复特效。 */
async function replayUnknownReceipt(fixture: Fixture): Promise<void> {
    const journal = new Journal();
    await fixture.authenticate(journal);
    fixture.send = async () => { throw new SocketFailure("DISCONNECTED"); };
    await fixture.controller.upgrade(HERO.id);
    const request = journal.pending;
    assert(request);
    fixture.send = async frame => {
        if (frame.name === Protocol.HERO_LEVEL_UPGRADE_STATUS) {
            assert.deepEqual(frame.body, { requestId: request.requestId });
            return roundTrip(Protocol.HERO_LEVEL_UPGRADE_STATUS, "response", { requestId: request.requestId, found: false });
        }
        assert.deepEqual(frame.body, request);
        fixture.apply(8, 6);
        return roundTrip(Protocol.HERO_LEVEL_UPGRADE, "response", receipt(request));
    };
    await fixture.authenticate(journal);
    assert.deepEqual(fixture.sent.map(frame => frame.name), [Protocol.HERO_LEVEL_UPGRADE,
        Protocol.HERO_LEVEL_UPGRADE_STATUS, Protocol.HERO_LEVEL_UPGRADE]);
    assert.equal(journal.clears, 1);
    assert.deepEqual(fixture.completed, []);
}

/** 明确拒绝结束原操作，旧等级错误会刷新统一状态，无成功事件。 */
async function rejectStaleLevel(fixture: Fixture): Promise<void> {
    const journal = new Journal();
    await fixture.authenticate(journal);
    fixture.send = async () => { throw new SocketFailure("HERO_LEVEL_CHANGED", "英雄等级已变化"); };
    await fixture.controller.upgrade(HERO.id);
    assert.equal(journal.pending, null);
    assert.equal(journal.clears, 1);
    assert.equal(fixture.sent.length, 1);
    assert.equal(fixture.refreshes, 1);
    assert.deepEqual(fixture.completed, []);
}

/** 旧身份迟到的回执不能刷新新名册、播特效或清理旧角色的日志。 */
async function ignoreAfterReset(fixture: Fixture): Promise<void> {
    const oldJournal = new Journal();
    await fixture.authenticate(oldJournal);
    const response = deferred<GameFrame>();
    fixture.send = async () => response.promise;
    const upgrade = fixture.controller.upgrade(HERO.id);
    await until(() => fixture.sent.length === 1, "换号用例未发出升级命令");
    fixture.controller.resetSession();
    fixture.apply(2, 1, OTHER_HERO_ID);
    const newJournal = new Journal();
    await fixture.authenticate(newJournal, OTHER_HERO_ID);
    const updates = fixture.updates;
    response.resolve(roundTrip(Protocol.HERO_LEVEL_UPGRADE, "response", receipt(fixture.sent[0].body as HeroLevelRequest)));
    await upgrade;
    assert.equal(fixture.roster.snapshot.heroes[0].id, OTHER_HERO_ID);
    assert.equal(fixture.roster.snapshot.heroes[0].level, 1);
    assert(oldJournal.pending);
    assert.equal(oldJournal.clears, 0);
    assert.equal(newJournal.clears, 0);
    assert.equal(fixture.refreshes, 0);
    assert.equal(fixture.updates, updates);
    assert.deepEqual(fixture.completed, []);
}

/** 安装真实配置，一个用例结束后彻底清理隔离控制器，再测试下一种时序。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    const toast = UIManager.instance.toast;
    const messages: string[] = [];
    UIManager.instance.toast = text => { messages.push(text); };
    try {
        for (const check of [waitForSnapshot, restoreKnownReceipt, replayUnknownReceipt, rejectStaleLevel, ignoreAfterReset]) {
            const fixture = new Fixture();
            try {
                await check(fixture);
            } finally {
                fixture.dispose();
            }
        }
        assert.deepEqual(messages, ["升级结果尚待确认，请稍后重试", "英雄等级已变化"]);
    } finally {
        UIManager.instance.toast = toast;
    }
    console.log("PASS hero level recovery: snapshot confirmation, original receipt lookup and replay, terminal rejection, stale session");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
