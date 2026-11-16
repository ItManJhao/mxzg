/**
 * 阵容保存恢复专项：使用真实Protobuf回执与隔离Model核对原保存意图、ACK及权威阵容双确认。
 * 受控交付覆盖丢状态、同步重入、关页和身份结束；不连接服务器，不读写日常数据库。
 */
import { strict as assert } from "node:assert";
import { GameLog } from "../assets/scripts/core/GameLog";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import type { AccountGateway } from "../assets/scripts/features/account/AccountApi";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import type { FormationSaveRequest } from "../assets/scripts/features/hero/data/FormationData";
import { FormationEvent } from "../assets/scripts/features/hero/utils/FormationEvent";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 当前角色真实实例格式的英雄编号，所有阵容参数都沿用这一实例。 */
const HERO_ID = "11111111-1111-4111-8111-111111111111";
/** 合法但不属于当前保存的编号，用于拒绝错误关联回执。 */
const OTHER_REQUEST_ID = "22222222-2222-4222-8222-222222222222";
/** 当前案例的已校验英雄数据，不包含账号、令牌或页面引用。 */
const HERO = { id: HERO_ID, templateId: 10105008, level: 1, star: 5 };

/** 延迟结果由案例显式交付，不使用真实网络或不确定的等待时间。 */
interface Deferred<T> {
    /** 等待当前受控发送或刷新结果。 */
    promise: Promise<T>;
    /** 完成本次受控操作，不代表资产已经被同步。 */
    resolve(value: T): void;
    /** 拒绝当前受控操作，用于交付网络或身份失败。 */
    reject(error: unknown): void;
}

/** 应用已隔离身份的原保存发送口；回调允许同步触发。 */
type SendHandler = (
    body: FormationSaveRequest,
    received: (frame: GameFrame) => void,
    failed: (error: unknown) => void,
) => Promise<void>;

/** 只刷新统一快照；成功回调本身不能确认阵容版本。 */
type RefreshHandler = (
    received: () => void,
    failed: (error: unknown) => void,
) => Promise<void>;

/** 创建单次可控结果，案例负责在结束前释放在途操作。 */
function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

/** 构造待提交草稿；版本是权威阵容版本，不是本地Model修订号。 */
function draft(expectedVersion = 3): Omit<FormationSaveRequest, "requestId"> {
    return { expectedVersion, formationId: 1, slots: [{ position: 3, heroId: HERO_ID }] };
}

/** 请求与回执均经过真实二进制往返，避免绕过协议字段约束。 */
function frame(body: unknown, kind: "request" | "response" = "response"): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1,
        kind,
        name: Protocol.FORMATION_SAVE,
        ...(kind === "response" ? { ok: true } : {}),
        body,
    }));
}

/** 返回与原请求关联的成功ACK，阵容只能由单独快照写入。 */
function receipt(body: FormationSaveRequest, version = body.expectedVersion + 1): GameFrame {
    return frame({ requestId: body.requestId, version });
}

/** 等待有限微任务续段；未发生预期动作即失败，不掩盖恢复停滞。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 100; index++) {
        if (check()) {
            return;
        }
        await Promise.resolve();
    }
    assert.fail(message);
}

/** 排空已安排的续段，便于断言重复状态事件没有引发隐藏请求。 */
async function drain(): Promise<void> {
    for (let index = 0; index < 16; index++) {
        await Promise.resolve();
    }
}

/** 单案例持有一组生产Controller及Model，发送和刷新分别交付。 */
class Fixture {
    /** 当前角色唯一权威名册和阵容，由accept模拟已经校验的同步提交。 */
    public readonly heroes = new HeroRosterModel();
    /** 保存过程的唯一Model，不保存独立权威阵容。 */
    public readonly saves = new FormationSaveModel();
    /** 实际生产控制器，案例只调用公开业务入口。 */
    public readonly controller = new FormationController(this.saves, this.heroes);
    /** 真实编码往返后的原保存参数，按发送顺序保留以核对幂等编号。 */
    public readonly requests: FormationSaveRequest[] = [];
    /** 本案例开始的鉴权刷新次数，每轮确认至多一次。 */
    public refreshes = 0;
    /** 应用失败边界接收到的异常，用于核对坏回执未被当成成功。 */
    public readonly failures: unknown[] = [];
    /** 案例注入原保存行为，默认出现未预期写请求即失败。 */
    public sendHandler: SendHandler = async () => {
        assert.fail("案例发出了未预期的阵容保存");
    };
    /** 案例注入快照行为，默认成功完成但不伪造已同步资产。 */
    public refreshHandler: RefreshHandler = async received => {
        received();
    };

    /** 初始化实际监听及注入口；缺少刷新能力的案例仍装配原保存口。 */
    public constructor(withRefresh = true) {
        this.controller.initialize();
        this.controller.resetSession();
        this.controller.configure(async (body, received, failed) => {
            const sent = frame(body, "request").body as FormationSaveRequest;
            this.requests.push(sent);
            try {
                await this.sendHandler(sent, received, error => {
                    this.failures.push(error);
                    failed(error);
                });
            } catch (error) {
                // 与应用交付一致：协议处理失败只交给当前操作的失败边界。
                this.failures.push(error);
                failed(error);
            }
        }, withRefresh ? async (received, failed) => {
            this.refreshes++;
            try {
                await this.refreshHandler(received, error => {
                    this.failures.push(error);
                    failed(error);
                });
            } catch (error) {
                this.failures.push(error);
                failed(error);
            }
        } : null);
        this.accept(3);
    }

    /** 只模拟已通过完整快照校验的模块提交，并按生产事件路径触发确认。 */
    public accept(version: number): void {
        this.heroes.replace({
            status: "ready",
            heroes: [HERO],
            error: "",
            mainFormation: {
                version,
                formationId: 1,
                slots: version > 3 ? draft(version).slots : [],
                unlockedIds: [1],
                assistanceUnlocked: false,
                options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
            },
        });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: this.heroes.version });
    }

    /** 核对ACK和原参数仍保留，但本轮已经结束，可由玩家明确重试同步。 */
    public assertAwaiting(version = 4): void {
        const state = this.saves.snapshot;
        assert.equal(state.busy, false);
        assert.equal(state.acknowledged, version);
        assert.deepEqual(state.pending, this.requests[0]);
        assert.equal(state.confirmedRequestId, this.requests[0].requestId);
        assert.match(state.message, /状态待确认/);
    }

    /** 权威状态达到ACK后才清原请求，同时保留成功编号供当前页面完成确认。 */
    public assertConfirmed(): void {
        const state = this.saves.snapshot;
        assert.equal(state.busy, false);
        assert.equal(state.pending, null);
        assert.equal(state.acknowledged, null);
        assert.equal(state.confirmedRequestId, this.requests[this.requests.length - 1].requestId);
        assert.equal(state.message, "阵容已保存");
    }

    /** 释放模块协议、监听和业务任务，不触碰任何持久数据。 */
    public dispose(): void {
        this.controller.dispose();
    }
}

/** 每个案例结束都销毁隔离模块，断言失败也不会留下跨案例监听。 */
async function withFixture(check: (fixture: Fixture) => Promise<void>, withRefresh = true): Promise<void> {
    const fixture = new Fixture(withRefresh);
    try {
        await check(fixture);
    } finally {
        fixture.dispose();
    }
}

/** ACK先到不能写权威阵容，等待中的独立状态达到版本后才完成。 */
async function checkReceiptBeforeState(): Promise<void> {
    await withFixture(async fixture => {
        const refreshed = deferred<void>();
        fixture.sendHandler = async (body, received) => received(receipt(body));
        fixture.refreshHandler = async received => {
            await refreshed.promise;
            received();
        };
        const attempt = fixture.controller.save(draft());
        await until(() => fixture.refreshes === 1, "ACK缺状态时未补一次鉴权");
        assert.equal(fixture.heroes.snapshot.mainFormation!.version, 3, "ACK不能反写权威阵容");
        assert.equal(fixture.saves.snapshot.acknowledged, 4);
        assert.deepEqual(fixture.saves.snapshot.pending, fixture.requests[0]);
        assert.equal(fixture.saves.snapshot.busy, true);
        fixture.accept(4);
        fixture.assertConfirmed();
        refreshed.resolve();
        await attempt;
        fixture.assertConfirmed();
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.refreshes, 1);
    });
}

/** 状态先到仍需原ACK，双确认已满足时不多发鉴权。 */
async function checkStateBeforeReceipt(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (body, received) => {
            fixture.accept(4);
            assert.equal(fixture.saves.snapshot.busy, true);
            assert.equal(fixture.saves.snapshot.acknowledged, null);
            assert(fixture.saves.snapshot.pending);
            received(receipt(body));
        };
        await fixture.controller.save(draft());
        fixture.assertConfirmed();
        assert.equal(fixture.refreshes, 0);
        assert.equal(fixture.requests.length, 1);
    });
}

/** 刷新成功及旧版事件不能代替权威版本，显式重试只再补快照并接受较新阵容。 */
async function checkInsufficientSnapshotAndExplicitRetry(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (body, received) => received(receipt(body));
        fixture.refreshHandler = async received => {
            fixture.accept(3);
            received();
        };
        await fixture.controller.save(draft());
        fixture.assertAwaiting();
        const original = fixture.saves.snapshot.pending;
        for (let index = 0; index < 5; index++) {
            fixture.accept(3);
            EventDispatcher.instance.emit(FormationEvent.SaveChanged, { revision: fixture.saves.version });
        }
        await drain();
        assert.equal(fixture.refreshes, 1, "重复事件不能自动循环鉴权");
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.saves.snapshot.pending, original);
        fixture.refreshHandler = async received => {
            fixture.accept(6);
            received();
        };
        await fixture.controller.save({ expectedVersion: 999, formationId: 2, slots: [] });
        fixture.assertConfirmed();
        assert.equal(fixture.heroes.snapshot.mainFormation!.version, 6);
        assert.equal(fixture.requests.length, 1, "有ACK的显式确认不能再次保存");
        assert.equal(fixture.refreshes, 2);
    });
}

/** 刷新回调同步触发资产及保存事件时复用现有任务，不能递归发起新轮次。 */
async function checkSynchronousRefreshReentry(): Promise<void> {
    await withFixture(async fixture => {
        const page = {};
        const reentered: Promise<void>[] = [];
        let attempt!: Promise<void>;
        fixture.sendHandler = async (body, received) => received(receipt(body));
        const stop = EventDispatcher.instance.on(FormationEvent.SaveChanged, page, () => {
            if (fixture.saves.snapshot.busy) {
                reentered.push(fixture.controller.save({ ...draft(), slots: [] }));
            }
        });
        fixture.refreshHandler = async received => {
            fixture.accept(3);
            received();
            reentered.push(fixture.controller.save(draft()));
        };
        try {
            attempt = fixture.controller.save(draft());
            await attempt;
            assert(reentered.length >= 3, "案例应覆盖发送、ACK和刷新内部重入");
            assert(reentered.every(promise => promise === attempt), "同步重入必须复用同一Promise");
            fixture.assertAwaiting();
            assert.equal(fixture.requests.length, 1);
            assert.equal(fixture.refreshes, 1);
        } finally {
            stop();
        }
    });
}

/** 刷新失败保留ACK与冻结参数，下一轮明确同步不重发写请求。 */
async function checkRefreshFailureRetainsIntent(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (body, received) => received(receipt(body));
        fixture.refreshHandler = async (_received, failed) => {
            failed(new Error("模拟鉴权超时"));
        };
        await fixture.controller.save(draft());
        fixture.assertAwaiting();
        assert(Object.isFrozen(fixture.saves.snapshot.pending));
        assert(Object.isFrozen(fixture.saves.snapshot.pending!.slots));
        assert.equal(fixture.failures.length, 1);
        fixture.refreshHandler = async received => {
            fixture.accept(4);
            received();
        };
        await fixture.controller.save({ ...draft(), slots: [] });
        fixture.assertConfirmed();
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.refreshes, 2);
    });
}

/** 未装配刷新能力时仍保存ACK和原意图，后续真实状态可以独立完成确认。 */
async function checkRefreshUnavailable(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (body, received) => received(receipt(body));
        await fixture.controller.save(draft());
        fixture.assertAwaiting();
        await fixture.controller.save({ ...draft(), slots: [] });
        fixture.assertAwaiting();
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.refreshes, 0);
        fixture.accept(4);
        fixture.assertConfirmed();
    }, false);
}

/** 两次显式点击和异步在途点击合并，微任务发送前就登记同一任务。 */
async function checkConcurrentSaves(): Promise<void> {
    await withFixture(async fixture => {
        const response = deferred<void>();
        fixture.sendHandler = async (body, received) => {
            await response.promise;
            fixture.accept(4);
            received(receipt(body));
        };
        const first = fixture.controller.save(draft());
        const second = fixture.controller.save({ ...draft(), slots: [] });
        assert.equal(first, second);
        assert.equal(fixture.requests.length, 0, "任务先登记，发送在微任务执行");
        await until(() => fixture.requests.length === 1, "原保存未开始");
        assert.equal(fixture.controller.save(draft()), first);
        response.resolve();
        await Promise.all([first, second]);
        fixture.assertConfirmed();
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.refreshes, 0);
    });
}

/** 无ACK的未知结果只重试冻结原参数和原编号，不能使用后续页面新草稿。 */
async function checkUnknownResultRetriesOriginal(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (_body, _received, failed) => failed(new Error("模拟ACK丢失"));
        const input = draft();
        await fixture.controller.save(input);
        const pending = fixture.saves.snapshot.pending;
        assert(pending);
        assert.equal(fixture.saves.snapshot.acknowledged, null);
        assert.equal(fixture.saves.snapshot.busy, false);
        input.slots[0].position = 2;
        assert.equal(pending.slots[0].position, 3, "页面参数变化不能污染模块原意图");
        fixture.accept(4);
        await drain();
        assert.equal(fixture.requests.length, 1, "普通状态不能自动重发未确认写请求");
        fixture.sendHandler = async (body, received) => received(receipt(body));
        await fixture.controller.save({ expectedVersion: 99, formationId: 2, slots: [] });
        assert.deepEqual(fixture.requests[1], fixture.requests[0]);
        fixture.assertConfirmed();
        assert.equal(fixture.refreshes, 0);
    });
}

/** 服务器明确拒绝属于失败，不能残留ACK或把新快照当作保存成功。 */
async function checkBusinessRejection(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (_body, _received, failed) => failed(new SocketFailure("FORMATION_CHANGED"));
        await fixture.controller.save(draft());
        assert.equal(fixture.saves.snapshot.pending, null);
        assert.equal(fixture.saves.snapshot.acknowledged, null);
        assert.equal(fixture.saves.snapshot.confirmedRequestId, undefined);
        assert.equal(fixture.saves.snapshot.busy, false);
        fixture.accept(9);
        assert.notEqual(fixture.saves.snapshot.message, "阵容已保存");
        assert.equal(fixture.refreshes, 0);
    });
}

/** 错误关联ACK被失败边界接纳，不启动鉴权，保留原请求供显式重试。 */
async function checkWrongReceipt(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (_body, received) => received(frame({ requestId: OTHER_REQUEST_ID, version: 4 }));
        await fixture.controller.save(draft());
        assert.equal(fixture.failures.length, 1);
        assert.match(String(fixture.failures[0]), /回执无效/);
        assert.equal(fixture.saves.snapshot.acknowledged, null);
        assert.equal(fixture.saves.snapshot.confirmedRequestId, undefined);
        assert.deepEqual(fixture.saves.snapshot.pending, fixture.requests[0]);
        assert.equal(fixture.saves.snapshot.busy, false);
        assert.equal(fixture.refreshes, 0);
        fixture.accept(9);
        assert(fixture.saves.snapshot.pending, "较新状态不能替代错误关联ACK");
    });
}

/** ACK版本不能早于原请求的预期版本，非法业务回执不触发同步恢复。 */
async function checkStaleReceiptVersion(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (body, received) => received(receipt(body, 2));
        await fixture.controller.save(draft());
        assert.equal(fixture.failures.length, 1);
        assert.equal(fixture.saves.snapshot.acknowledged, null);
        assert(fixture.saves.snapshot.pending);
        assert.equal(fixture.refreshes, 0);
    });
}

/** 阵容不变允许ACK与预期同版本，已有对应权威状态时无需多建鉴权。 */
async function checkUnchangedVersion(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (body, received) => received(receipt(body, 3));
        await fixture.controller.save(draft());
        fixture.assertConfirmed();
        assert.equal(fixture.refreshes, 0);
        assert.equal(fixture.heroes.snapshot.mainFormation!.version, 3);
    });
}

/** 页面关闭等效于解除页面监听，模块及ACK继续确认且不会重放旧页面反馈。 */
async function checkPageClosureKeepsRecovery(): Promise<void> {
    await withFixture(async fixture => {
        const refreshed = deferred<void>();
        const page = {};
        let notices = 0;
        fixture.sendHandler = async (body, received) => received(receipt(body));
        fixture.refreshHandler = async received => {
            await refreshed.promise;
            fixture.accept(4);
            received();
        };
        EventDispatcher.instance.on(FormationEvent.SaveChanged, page, () => notices++);
        const attempt = fixture.controller.save(draft());
        await until(() => fixture.refreshes === 1, "关页案例的ACK刷新未开始");
        EventDispatcher.instance.offTarget(page);
        const beforeClose = notices;
        assert.equal(EventDispatcher.instance.targetListenerCount(page), 0);
        assert(EventDispatcher.instance.targetListenerCount(fixture.controller) > 0);
        refreshed.resolve();
        await attempt;
        fixture.assertConfirmed();
        assert.equal(notices, beforeClose, "关闭页面不能继续收到结果事件");
        const stop = EventDispatcher.instance.on(FormationEvent.SaveChanged, page, () => notices++);
        try {
            await drain();
            assert.equal(notices, beforeClose, "重开只读取Model，不重播旧反馈");
            assert.equal(fixture.requests.length, 1);
            assert.equal(fixture.refreshes, 1);
        } finally {
            stop();
        }
    });
}

/** 重置发生在发送微任务前会撤销任务，不把旧草稿交给发送口。 */
async function checkResetBeforeSend(): Promise<void> {
    await withFixture(async fixture => {
        const original = fixture.controller.save(draft());
        fixture.controller.resetSession();
        const reset = fixture.saves.snapshot;
        await original;
        assert.equal(fixture.saves.snapshot, reset);
        assert.equal(fixture.requests.length, 0);
        assert.equal(fixture.refreshes, 0);
    });
}

/** 重置后旧保存成功或失败都不能覆盖新任务，旧finally不得清除新任务合并入口。 */
async function checkResetDuringSave(failOldRequest: boolean): Promise<void> {
    await withFixture(async fixture => {
        const oldResponse = deferred<GameFrame>();
        const newResponse = deferred<GameFrame>();
        fixture.sendHandler = async (_body, received) => received(await oldResponse.promise);
        const original = fixture.controller.save(draft());
        await until(() => fixture.requests.length === 1, "旧保存未开始");
        fixture.controller.resetSession();
        fixture.accept(10);
        fixture.sendHandler = async (_body, received) => received(await newResponse.promise);
        const current = fixture.controller.save(draft(10));
        await until(() => fixture.requests.length === 2, "新任务没有独立开始");
        const newState = fixture.saves.snapshot;
        if (failOldRequest) {
            oldResponse.reject(new Error("模拟旧保存迟到失败"));
        } else {
            oldResponse.resolve(receipt(fixture.requests[0]));
        }
        await original;
        assert.equal(fixture.saves.snapshot, newState);
        assert.equal(fixture.saves.snapshot.busy, true);
        assert.equal(fixture.controller.save(draft(10)), current, "旧finally不能清除新任务");
        fixture.accept(11);
        newResponse.resolve(receipt(fixture.requests[1]));
        await current;
        fixture.assertConfirmed();
        assert.equal(fixture.refreshes, 0);
    });
}

/** 重置后旧刷新失败不能解锁新保存；新身份原参数独立等待自己的回执。 */
async function checkResetDuringRefresh(): Promise<void> {
    await withFixture(async fixture => {
        const refreshed = deferred<void>();
        const response = deferred<GameFrame>();
        fixture.sendHandler = async (body, received) => received(receipt(body));
        fixture.refreshHandler = async (_received, failed) => {
            await refreshed.promise;
            failed(new Error("模拟旧刷新迟到失败"));
        };
        const original = fixture.controller.save(draft());
        await until(() => fixture.refreshes === 1, "旧刷新未开始");
        fixture.controller.resetSession();
        fixture.accept(10);
        fixture.sendHandler = async (_body, received) => received(await response.promise);
        const current = fixture.controller.save(draft(10));
        await until(() => fixture.requests.length === 2, "刷新重置后的新保存未开始");
        const newState = fixture.saves.snapshot;
        refreshed.resolve();
        await original;
        assert.equal(fixture.saves.snapshot, newState);
        assert.equal(fixture.controller.save(draft(10)), current);
        fixture.accept(11);
        response.resolve(receipt(fixture.requests[1]));
        await current;
        fixture.assertConfirmed();
        assert.equal(fixture.requests.length, 2);
        assert.equal(fixture.refreshes, 1);
    });
}

/** 应用销毁清理监听与任务，迟到刷新失败和后续保存都不能重建进度。 */
async function checkDisposeDuringRefresh(): Promise<void> {
    await withFixture(async fixture => {
        const refreshed = deferred<void>();
        fixture.sendHandler = async (body, received) => received(receipt(body));
        fixture.refreshHandler = async (_received, failed) => {
            await refreshed.promise;
            failed(new Error("模拟销毁后刷新失败"));
        };
        const original = fixture.controller.save(draft());
        await until(() => fixture.refreshes === 1, "销毁案例的刷新未开始");
        fixture.controller.dispose();
        const disposed = fixture.saves.snapshot;
        const revision = fixture.saves.version;
        assert.equal(EventDispatcher.instance.targetListenerCount(fixture.controller), 0);
        refreshed.resolve();
        await original;
        await fixture.controller.save(draft());
        assert.equal(fixture.saves.snapshot, disposed);
        assert.equal(fixture.saves.version, revision);
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.refreshes, 1);
    });
}

/** 实际账号交付分别隔离原保存及ACK后刷新，两种身份切换均丢弃旧成功和旧失败。 */
async function checkAccountDelivery(sameRole: boolean, failOldRequest: boolean, duringRefresh: boolean): Promise<void> {
    await withFixture(async fixture => {
        const account = new AccountModel();
        const gateway: AccountGateway = {
            /** 仅提供合法登录身份，原保存与刷新仍经过实际账号交付方法。 */
            async developmentLogin(name, serverId = "local-1") {
                return {
                    session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" },
                    role: { id: "role-" + name, nickname: name, serverId, level: 2, gold: 50, diamonds: 7 },
                };
            },
            /** 本案例只显式登录，不调用凭证恢复。 */
            async currentRole() {
                assert.fail("身份隔离案例不应调用currentRole");
            },
        };
        const service = new AccountService(account, gateway, {
            read: () => null,
            write: () => {},
            clear: () => {},
        });
        const stop = account.subscribe(value => {
            if (!value.role) {
                fixture.controller.resetSession();
            }
        });
        const response = deferred<GameFrame>();
        let deliveries = 0;
        try {
            assert(await service.login("player", "local-1"));
            fixture.accept(3);
            if (duringRefresh) {
                fixture.sendHandler = async (body, received) => received(receipt(body));
                fixture.refreshHandler = (received, failed) => service.deliverAuthenticated(
                    () => response.promise,
                    () => {
                        deliveries++;
                        fixture.accept(4);
                        received();
                    },
                    error => {
                        deliveries++;
                        failed(error);
                    },
                );
            } else {
                fixture.sendHandler = (_body, received, failed) => service.deliverAuthenticated(
                    () => response.promise,
                    result => {
                        deliveries++;
                        received(result);
                    },
                    error => {
                        deliveries++;
                        failed(error);
                    },
                );
            }
            const original = fixture.controller.save(draft());
            await until(() => duringRefresh ? fixture.refreshes === 1 : fixture.requests.length === 1,
                "旧身份原保存或刷新未开始");
            if (sameRole) {
                service.logout();
            }
            const name = sameRole ? "player" : "other";
            assert(await service.login(name, sameRole ? "local-1" : "local-2"));
            fixture.accept(10);
            const current = fixture.saves.snapshot;
            const roster = fixture.heroes.snapshot.mainFormation;
            const revision = fixture.saves.version;
            if (failOldRequest) {
                response.reject(new SocketFailure("UNAUTHENTICATED"));
            } else {
                response.resolve(receipt(fixture.requests[0]));
            }
            await original;
            assert.equal(deliveries, 0, "实际AccountService不能交付旧身份成功或失败");
            assert.equal(account.snapshot.role!.id, "role-" + name);
            assert.equal(service.hasSession, true, "旧未授权错误不能结束新身份");
            assert.equal(fixture.saves.snapshot, current);
            assert.equal(fixture.saves.version, revision);
            assert.equal(fixture.heroes.snapshot.mainFormation, roster, "旧刷新不能回写旧权威阵容");
            assert.equal(current.pending, null);
            assert.equal(current.acknowledged, null);
            assert.equal(current.busy, false);
            assert.equal(fixture.requests.length, 1);
            assert.equal(fixture.refreshes, duringRefresh ? 1 : 0);
        } finally {
            stop();
            service.logout();
        }
    });
}

/** 逐案报告独立反例矩阵，失败后继续运行其余案例并最终设置失败退出码。 */
async function main(): Promise<void> {
    const cases: [string, () => Promise<void>][] = [
        ["ACK before authoritative state", checkReceiptBeforeState],
        ["authoritative state before ACK", checkStateBeforeReceipt],
        ["old snapshot, bounded refresh and explicit sync retry", checkInsufficientSnapshotAndExplicitRetry],
        ["synchronous refresh and event reentry", checkSynchronousRefreshReentry],
        ["refresh failure retains ACK and original intent", checkRefreshFailureRetainsIntent],
        ["refresh unavailable retains ACK", checkRefreshUnavailable],
        ["concurrent saves share one task", checkConcurrentSaves],
        ["unknown result retries original request only", checkUnknownResultRetriesOriginal],
        ["business rejection clears original intent", checkBusinessRejection],
        ["wrong ACK requestId rejected", checkWrongReceipt],
        ["stale ACK version rejected", checkStaleReceiptVersion],
        ["unchanged formation version confirms", checkUnchangedVersion],
        ["page closure keeps module recovery", checkPageClosureKeepsRecovery],
        ["reset before send microtask", checkResetBeforeSend],
        ["reset during save, old success", () => checkResetDuringSave(false)],
        ["reset during save, old failure", () => checkResetDuringSave(true)],
        ["reset during refresh preserves new task", checkResetDuringRefresh],
        ["dispose during refresh", checkDisposeDuringRefresh],
    ];
    for (const duringRefresh of [false, true]) {
        for (const sameRole of [false, true]) {
            for (const failed of [false, true]) {
                cases.push([
                    (duringRefresh ? "refresh" : "save") + ", " + (sameRole ? "same role relogin" : "other identity")
                        + ", old " + (failed ? "failure" : "success"),
                    () => checkAccountDelivery(sameRole, failed, duringRefresh),
                ]);
            }
        }
    }
    const previousLog = GameLog.shared;
    const log = new GameLog();
    log.mirrorConsole = false;
    GameLog.shared = log;
    let passed = 0;
    try {
        for (const [name, check] of cases) {
            try {
                await check();
                passed++;
                console.log("PASS " + name);
            } catch (error) {
                console.error("FAIL " + name, error);
            }
        }
    } finally {
        GameLog.shared = previousLog;
    }
    console.log("阵容保存确认恢复专项：" + passed + "/" + cases.length + " passed");
    assert.equal(passed, cases.length, "阵容保存确认恢复反例矩阵未全部通过");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
