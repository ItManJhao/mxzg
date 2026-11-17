/**
 * 挂机领取恢复专项：隔离持久记录口与真实协议往返，覆盖丢回执/丢状态、原键重试和条件清理。
 * 不启动玩家服务器，不接通按钮；应用身份绑定及原生IndexedDB事务另有独立检查。
 */
import { strict as assert } from "node:assert";
import { webcrypto } from "node:crypto";
import { MainChapterIdleClaimController } from "../assets/scripts/features/battle/MainChapterIdleClaimController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { GameProtocolCodecUtils, GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameLog } from "../assets/scripts/core/GameLog";
import { Protocol } from "../assets/scripts/platform/Protocol";
import type {
    IdleClaimConfirmation, IdleClaimJournalPort, IdleClaimPending, IdleClaimSend,
} from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";

/** 本机测试提供浏览器密码学能力，不替换运行时请求编号实现。 */
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
GameLog.shared.mirrorConsole = false;
/** 所有恢复均使用同一原请求，验证重试不会改expected或编号。 */
const original: IdleClaimPending = Object.freeze({ schemaVersion: 1,
    requestId: "12345678-1234-4234-8234-123456789abc", expectedOperationVersion: 3 });

/** 原子端口替身仅用于控制器用例；不把它当成原生IndexedDB验证。 */
class MemoryJournal implements IdleClaimJournalPort {
    /** 当前未确认记录；create/clear同步比较后完成Promise，模拟原子语义。 */
    public value: IdleClaimPending | null;
    /** 记录发送前持久化是否实际完成。 */
    public created = 0;
    /** 用于证明未达到双确认时绝不清理。 */
    public cleared = 0;
    /** 可注入持久化失败，不影响原记录。 */
    public failCreate = false;
    /** 可注入记录损坏，读取必须拒绝而非当成无记录。 */
    public failRead = false;
    /** 接收一个独立测试意图，null表示首次尚未建单。 */
    public constructor(value: IdleClaimPending | null = original) {
        this.value = value;
    }
    /** 返回原请求；损坏明确拒绝。 */
    public async read(): Promise<IdleClaimPending | null> {
        if (this.failRead) {
            throw new Error("unknown journal schema");
        }
        return this.value;
    }
    /** 已有原请求时不能覆盖成新请求。 */
    public async create(request: IdleClaimPending): Promise<IdleClaimPending> {
        if (this.failCreate) {
            throw new Error("storage write failed");
        }
        this.created++;
        return this.value || (this.value = request);
    }
    /** 完整指纹匹配才删除，旧A不能清掉新B。 */
    public async clear(request: IdleClaimPending): Promise<boolean> {
        this.cleared++;
        if (JSON.stringify(this.value) !== JSON.stringify(request)) {
            return false;
        }
        this.value = null;
        return true;
    }
}

/** 历史回执完整字段通过实际Protobuf编解码，业务摘要不伪造当前资产。 */
function receipt(request: IdleClaimPending = original): object {
    return { schemaVersion: 1, requestId: request.requestId,
        receiptId: "22345678-1234-4234-8234-123456789abc",
        expectedOperationVersion: request.expectedOperationVersion,
        beforeOperationVersion: request.expectedOperationVersion,
        afterOperationVersion: request.expectedOperationVersion + 1,
        committedAtSeconds: 160, previousStartedAtSeconds: 100, seconds: 60,
        maxSeconds: 43200, rewardStage: 1, assetRevision: 7,
        theoreticalRewards: [], actual: { roleId: "isolated-role",
            items: [{ itemId: 900001, requested: 2, credited: 2, ignored: 0, reason: "NONE" }],
            wallet: { goldBefore: 1, diamondsBefore: 0, goldAfter: 1, diamondsAfter: 0 },
            stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [],
            spirits: { schemaVersion: 1, items: [] } } };
}

/** 真实成功信封往返，与Controller路由校验共同覆盖发送方向。 */
function frame(name: string, body: unknown): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1, kind: "response", name, ok: true, body,
    }));
}

/** 独立Model模拟应用已校验提交的统一快照，不由receipt写入它。 */
function snapshot(model: MainChapterModel, revision = 7, operation = 4,
    requestMode: "ENABLED" | "READ_ONLY" = "READ_ONLY"): void {
    model.state = Object.freeze({ maxCleared: 1, pendingBattleId: null, assetRevision: revision });
    model.idle = Object.freeze({ serverTime: 200, startedAt: 160, maxSeconds: 43200,
        frequency: 60, rewardStage: 1, rates: [],
        claimState: { schemaVersion: 1, operationVersion: operation, requestMode } });
}

/** 默认回复历史成功；每个用例可覆盖通信和重新鉴权行为。 */
function setup(port = new MemoryJournal(), send?: IdleClaimSend, refresh: (model: MainChapterModel) => Promise<void> = async () => {}): {
    model: MainChapterModel; controller: MainChapterIdleClaimController; port: MemoryJournal;
    calls: { name: string; body: object }[]; refreshed: () => number;
    feedbacks: RewardNotice[]; confirmations: IdleClaimConfirmation[];
} {
    const model = new MainChapterModel();
    snapshot(model);
    const calls: { name: string; body: object }[] = [];
    let refreshes = 0;
    const feedbacks: RewardNotice[] = [];
    const confirmations: IdleClaimConfirmation[] = [];
    const controller = new MainChapterIdleClaimController(model);
    controller.configure(async (name, body, received, failed) => {
        calls.push({ name, body });
        if (send) {
            await send(name, body, received, failed);
        } else {
            received(frame(name, { requestId: original.requestId, status: "COMMITTED", receipt: receipt() }));
        }
    }, async () => {
        refreshes++;
        await refresh(model);
    }, confirmation => {
        confirmations.push(confirmation);
        if (confirmation.receipt.feedback) {
            feedbacks.push(confirmation.receipt.feedback);
        }
    });
    controller.initialize();
    return { model, controller, port, calls, refreshed: () => refreshes, feedbacks, confirmations };
}

/** 等待局部存储微任务，不使用计时器掩盖未结束流程。 */
async function settle(): Promise<void> {
    for (let index = 0; index < 20; index++) {
        await Promise.resolve();
    }
}

/** 每个用例关闭Controller，避免路由及事件监听残留影响下一组。 */
async function main(): Promise<void> {
    let checks = 0;
    {
        const test = setup(new MemoryJournal(null));
        await test.controller.activate(test.port);
        snapshot(test.model, 7, 3, "ENABLED");
        let release: ((value: IdleClaimPending | null) => void) | null = null;
        test.port.read = () => new Promise(resolve => { release = resolve; });
        const beginning = test.controller.begin(3);
        await settle();
        snapshot(test.model, 8, 4, "ENABLED");
        release!(null);
        await beginning;
        assert.equal(test.port.created, 0, "读取原生日志期间操作版本变化，旧确认不能创建新一轮意图");
        assert.equal(test.calls.length, 0);
        assert.equal(test.model.idleClaim.phase, "idle");
        assert.match(test.model.idleClaim.message, /状态已更新/);
        assert.throws(() => test.controller.begin(0), /操作版本无效/);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup();
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.port.value, null);
        assert.equal(test.refreshed(), 0);
        assert.equal(test.calls.length, 1);
        assert.equal(test.feedbacks.length, 1);
        assert.equal(test.feedbacks[0].receiptId, "22345678-1234-4234-8234-123456789abc");
        assert.deepEqual(test.feedbacks[0].items, [{ itemId: 900001, credited: 2 }]);
        assert.equal(test.model.idleClaim.receipt?.feedback, test.feedbacks[0]);
        test.controller.dispose(); checks++;
    }
    for (const [revision, operation] of [[6, 4], [7, 3]]) {
        const test = setup();
        snapshot(test.model, revision, operation);
        const state = test.model.state;
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "waiting-state");
        assert.equal(test.port.cleared, 0);
        assert.equal(test.model.state, state);
        assert.equal(test.feedbacks.length, 0);
        assert.equal(test.refreshed(), 1);
        snapshot(test.model);
        test.controller.observeSnapshot();
        await settle();
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.refreshed(), 1);
        assert.equal(test.feedbacks.length, 1);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, undefined, async model => { snapshot(model); });
        snapshot(test.model, 6, 3);
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.refreshed(), 1);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received) => {
            received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
        });
        snapshot(test.model, 6, 3, "READ_ONLY");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.port.value, original);
        assert.equal(test.calls.length, 1);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received) => {
            if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
                received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
            } else {
                assert.deepEqual(body, { requestId: original.requestId, expectedOperationVersion: 3 });
                snapshot(test.model, 9, 5, "ENABLED");
                received(frame(name, receipt()));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.calls.length, 2);
        assert.equal(test.model.state?.assetRevision, 9);
        test.controller.dispose(); checks++;
    }
    for (const code of ["IDLE_TOO_SOON", "IDLE_NOT_AVAILABLE", "UNAVAILABLE"]) {
        const test = setup(undefined, async (name, body, received, failed) => {
            if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
                received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
            } else {
                failed(Object.assign(new Error(code), { code, retryable: false }));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.port.value, original);
        assert.equal(test.calls.length, 3);
        test.controller.dispose(); checks++;
    }
    {
        let probes = 0;
        const test = setup(undefined, async (name, body, received, failed) => {
            if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS && ++probes === 1) {
                received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
            } else if (name === Protocol.CHAPTER_IDLE_CLAIM) {
                snapshot(test.model);
                failed(new Error("response lost"));
            } else {
                received(frame(name, { requestId: original.requestId, status: "COMMITTED", receipt: receipt() }));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.calls.filter(call => call.name === Protocol.CHAPTER_IDLE_CLAIM).length, 1);
        test.controller.dispose(); checks++;
    }
    for (const statusFails of [false, true]) {
        const test = setup(undefined, async (name, body, received, failed) => {
            if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS && !statusFails) {
                received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
            } else {
                failed(Object.assign(new Error("fingerprint conflict"), { code: "IDLE_REQUEST_CONFLICT" }));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        const sent = test.calls.length;
        await test.controller.recover();
        assert.equal(test.model.idleClaim.phase, "blocked");
        assert.equal(test.port.value, original);
        assert.equal(test.calls.length, sent);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received) => {
            received({ version: 1, kind: "response", ok: true, name,
                body: { requestId: original.requestId, status: "COMMITTED", receipt: { ...receipt(), expectedOperationVersion: 5 } } });
        });
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "blocked");
        assert.equal(test.port.value, original);
        assert.equal(test.calls.length, 1);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received) => {
            received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
        });
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "rejected");
        assert.equal(test.calls.length, 1);
        assert.equal(test.port.value, null);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received, failed) => {
            if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
                received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
            } else {
                failed(Object.assign(new Error("version conflict"), { code: "IDLE_VERSION_CONFLICT" }));
            }
        }, async model => { snapshot(model, 8, 5); });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "rejected");
        assert.equal(test.calls.length, 3);
        assert.equal(test.refreshed(), 1);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal(null);
        const test = setup(port);
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(port);
        port.failCreate = true;
        await test.controller.begin();
        assert.equal(test.calls.length, 0);
        assert.equal(test.model.idleClaim.phase, "blocked");
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal(null);
        const test = setup(port);
        await test.controller.activate(port);
        await test.controller.begin();
        assert.equal(port.created, 0);
        assert.equal(test.calls.length, 0);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal();
        port.failRead = true;
        const test = setup(port);
        await test.controller.activate(port);
        assert.equal(test.model.idleClaim.phase, "blocked");
        assert.equal(port.value, original);
        assert.equal(test.calls.length, 0);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal();
        const replacement = Object.freeze({ ...original, requestId: "32345678-1234-4234-8234-123456789abc" });
        const test = setup(port, async (name, body, received) => {
            port.value = replacement;
            received(frame(name, { requestId: original.requestId, status: "COMMITTED", receipt: receipt() }));
        });
        await test.controller.activate(port);
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.model.idleClaim.pending, replacement);
        assert.equal(test.feedbacks.length, 0);
        assert.equal(port.value, replacement);
        test.controller.dispose(); checks++;
    }
    {
        let finish: (() => void) | undefined;
        const test = setup(undefined, async (name, body, received) => {
            await new Promise<void>(resolve => { finish = resolve; });
            received(frame(name, { requestId: original.requestId, status: "COMMITTED", receipt: receipt() }));
        });
        const active = test.controller.activate(test.port);
        await settle();
        assert.equal(test.controller.recover(), active);
        test.controller.deactivate();
        finish!();
        await active;
        assert.equal(test.model.idleClaim.phase, "idle");
        assert.equal(test.port.cleared, 0);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal(null);
        const test = setup(port, async (name, body, received) => {
            assert.equal(port.created, 1);
            assert(port.value);
            assert.equal((body as { requestId: string }).requestId, port.value.requestId);
            if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
                received(frame(name, { requestId: port.value.requestId, status: "NOT_FOUND" }));
            } else {
                assert.equal((body as { expectedOperationVersion: number }).expectedOperationVersion, 3);
                snapshot(test.model);
                received(frame(name, receipt(port.value)));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(port);
        const context = Object.freeze({ source: "fresh-request" });
        await test.controller.begin(3, context);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(port.created, 1);
        assert.equal(test.calls.length, 2);
        assert.equal(test.confirmations.length, 1);
        assert.equal(test.confirmations[0].presentationContext, context);
        assert.equal(test.confirmations[0].receipt.seconds, 60);
        assert.equal(test.confirmations[0].receipt.maxSeconds, 43200);
        assert.equal(test.confirmations[0].receipt.previousStartedAtSeconds, 100);
        assert.equal(test.confirmations[0].receipt.rewardStage, 1);
        assert(Object.isFrozen(test.confirmations[0]));
        assert(Object.isFrozen(test.confirmations[0].receipt));
        test.controller.observeSnapshot();
        await test.controller.recover();
        assert.equal(test.confirmations.length, 1, "确认后重复快照及恢复不再次交付显示");
        assert.equal(test.calls.length, 2);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup();
        snapshot(test.model, 6, 3);
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "waiting-state");
        snapshot(test.model);
        await test.controller.begin(3, Object.freeze({ source: "later-click" }));
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.confirmations.length, 1);
        assert.equal(test.confirmations[0].presentationContext, null,
            "begin读到历史原请求时不得借用此次点击的现场引用");
        assert.equal(test.calls.length, 1);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal(null);
        let recovered = false;
        const test = setup(port, async (name, body, received, failed) => {
            assert(port.value);
            if (recovered) {
                received(frame(name, { requestId: port.value.requestId, status: "COMMITTED", receipt: receipt(port.value) }));
            } else if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS && test.calls.length === 1) {
                received(frame(name, { requestId: port.value.requestId, status: "NOT_FOUND" }));
            } else {
                failed(new Error("connection lost"));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(port);
        const context = Object.freeze({ source: "same-app-request" });
        await test.controller.begin(3, context);
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.confirmations.length, 0);
        assert.equal(test.calls.length, 3);
        recovered = true;
        snapshot(test.model);
        await test.controller.recover();
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.confirmations.length, 1);
        assert.equal(test.confirmations[0].presentationContext, context,
            "同一应用断线恢复仍可交付原请求现场引用，由应用核实页面是否仍在");
        assert.equal(test.calls.filter(call => call.name === Protocol.CHAPTER_IDLE_CLAIM).length, 1);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal(null);
        port.create = async () => {
            port.created++;
            port.value = original;
            return original;
        };
        const test = setup(port);
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(port);
        snapshot(test.model, 7, 4, "ENABLED");
        await test.controller.begin(4, Object.freeze({ source: "racing-click" }));
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.confirmations.length, 1);
        assert.equal(test.confirmations[0].presentationContext, null,
            "原子建单返回其他标签页意图时不能携带此次现场");
        assert.equal(test.confirmations[0].receipt.requestId, original.requestId);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal(null);
        let recovered = false;
        const test = setup(port, async (name, body, received, failed) => {
            assert(port.value);
            if (recovered) {
                received(frame(name, { requestId: port.value.requestId, status: "COMMITTED", receipt: receipt(port.value) }));
            } else {
                failed(new Error("connection lost"));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(port);
        await test.controller.begin(3, Object.freeze({ source: "closed-session" }));
        assert.equal(test.model.idleClaim.phase, "paused");
        test.controller.deactivate();
        recovered = true;
        snapshot(test.model);
        await test.controller.activate(port);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.confirmations.length, 1);
        assert.equal(test.confirmations[0].presentationContext, null,
            "解除激活后仅恢复持久原意图，不恢复旧会话现场引用");
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal();
        port.clear = async () => { throw new Error("atomic clear failed"); };
        const test = setup(port);
        await test.controller.activate(port);
        assert.equal(test.model.idleClaim.phase, "blocked");
        assert.equal(port.value, original);
        assert(test.model.idleClaim.receipt);
        assert.equal(test.feedbacks.length, 0);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal();
        const replacement: IdleClaimPending = Object.freeze({ ...original,
            requestId: "32345678-1234-4234-8234-123456789abc", expectedOperationVersion: 4 });
        port.clear = async () => {
            port.value = replacement;
            return false;
        };
        const test = setup(port);
        await test.controller.activate(port);
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.model.idleClaim.pending, replacement);
        assert.equal(test.model.idleClaim.receipt, null);
        assert.equal(port.value, replacement);
        assert.equal(test.feedbacks.length, 0);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received) => {
            const actual = receipt() as { actual: { items: object[]; bonuses: object[] } };
            actual.actual.items = [];
            actual.actual.bonuses = [];
            received(frame(name, { requestId: original.requestId, status: "COMMITTED", receipt: actual }));
        });
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.model.idleClaim.receipt?.feedback, null);
        assert.equal(test.feedbacks.length, 0);
        assert.equal(test.port.value, null);
        assert.equal(test.confirmations.length, 1, "零到账也必须交付成功确认供宝箱收取表现收口");
        assert.equal(test.confirmations[0].receipt.seconds, 60);
        assert.equal(test.confirmations[0].receipt.maxSeconds, 43200);
        assert.equal(test.confirmations[0].receipt.feedback, null);
        assert.equal(test.confirmations[0].presentationContext, null);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup();
        const stop = EventDispatcher.instance.on("main-chapter.updated", () => {
            if (test.model.idleClaim.phase === "confirmed") {
                test.controller.deactivate();
            }
        });
        await test.controller.activate(test.port);
        stop();
        assert.equal(test.port.value, null);
        assert.equal(test.model.idleClaim.phase, "idle");
        assert.equal(test.feedbacks.length, 0);
        assert.equal(test.confirmations.length, 0, "确认事件内解除激活后不能向旧显示现场交付");
        test.controller.dispose(); checks++;
    }
    {
        const model = new MainChapterModel();
        snapshot(model);
        const controller = new MainChapterIdleClaimController(model);
        const port = new MemoryJournal();
        controller.configure(async (name, body, received) => {
            received(frame(name, { requestId: original.requestId, status: "COMMITTED", receipt: receipt() }));
        }, async () => undefined, () => { throw new Error("测试展示失败"); });
        controller.initialize();
        await controller.activate(port);
        assert.equal(model.idleClaim.phase, "confirmed");
        assert.equal(port.value, null);
        controller.dispose(); checks++;
    }
    {
        const test = setup(undefined, async (name, body, received, failed) => { failed(new Error("disconnected")); });
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.port.value, original);
        assert.equal(test.calls.length, 1);
        test.controller.dispose(); checks++;
    }
    {
        const port = new MemoryJournal();
        const before = setup(port, async (name, body, received, failed) => { failed(new Error("process ended")); });
        await before.controller.activate(port);
        before.controller.dispose();
        assert.equal(port.value, original);
        const after = setup(port);
        await after.controller.activate(port);
        assert.equal(after.model.idleClaim.phase, "confirmed");
        assert.equal(port.value, null);
        assert.equal(after.calls.length, 1);
        after.controller.dispose(); checks++;
    }
    for (const [failedAt, code] of [[1, "INVALID_MESSAGE"], [2, "INVALID_MESSAGE"],
        [3, "INVALID_MESSAGE"], [3, "IDLE_REQUEST_CONFLICT"]] as const) {
        let response = 0;
        const test = setup(undefined, async (name, body, received, failed) => {
            response++;
            if (response === failedAt) {
                failed(Object.assign(new Error("invalid authenticated response"), { code }));
            } else if (name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
                received(frame(name, { requestId: original.requestId, status: "NOT_FOUND" }));
            } else {
                failed(new Error("claim response lost"));
            }
        });
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "blocked");
        assert.equal(test.port.value, original);
        assert.equal(test.calls.length, failedAt);
        await test.controller.recover();
        assert.equal(test.calls.length, failedAt);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup();
        snapshot(test.model, 6, 3, "ENABLED");
        await test.controller.activate(test.port);
        assert.equal(test.model.idleClaim.phase, "waiting-state");
        const replacement = Object.freeze({ ...original,
            requestId: "32345678-1234-4234-8234-123456789abc", expectedOperationVersion: 4 });
        test.port.value = replacement;
        snapshot(test.model, 7, 4, "ENABLED");
        test.controller.observeSnapshot();
        await settle();
        assert.equal(test.model.idleClaim.phase, "paused");
        assert.equal(test.model.idleClaim.pending, replacement);
        assert.equal(test.model.idleClaim.receipt, null);
        assert.equal(test.port.value, replacement);
        assert.equal(test.port.cleared, 0);
        assert.equal(test.calls.length, 1);
        assert.equal(test.refreshed(), 1);
        assert.equal(test.feedbacks.length, 0);
        test.controller.dispose(); checks++;
    }
    for (const confirmed of [false, true]) {
        const test = setup();
        snapshot(test.model, 6, 3);
        await test.controller.activate(test.port);
        test.port.value = null;
        if (confirmed) {
            snapshot(test.model);
        }
        test.controller.observeSnapshot();
        await settle();
        assert.equal(test.model.idleClaim.phase, confirmed ? "confirmed" : "waiting-state");
        assert.equal(test.feedbacks.length, confirmed ? 1 : 0);
        assert.equal(test.model.idleClaim.pending, confirmed ? null : original);
        assert.equal(test.port.cleared, 0);
        assert.equal(test.calls.length, 1);
        assert.equal(test.refreshed(), 1);
        test.controller.dispose(); checks++;
    }
    {
        const test = setup();
        snapshot(test.model, 6, 3);
        let queued = 0;
        const stop = EventDispatcher.instance.on("main-chapter.updated", () => {
            if (test.model.idleClaim.message === "回执已提交，最新状态尚未同步") {
                queued++;
                snapshot(test.model);
                test.controller.observeSnapshot();
                test.controller.observeSnapshot();
            }
        });
        await test.controller.activate(test.port);
        await settle();
        stop();
        assert.equal(queued, 1);
        assert.equal(test.model.idleClaim.phase, "confirmed");
        assert.equal(test.port.value, null);
        assert.equal(test.calls.length, 1);
        assert.equal(test.refreshed(), 1);
        assert.equal(test.port.cleared, 1);
        test.controller.dispose(); checks++;
    }
    console.log("PASS " + checks + " idle claim recovery cases: immutable intent, bounded status retry, dual confirmation and late-result isolation");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
