/**
 * 主线结算恢复专项：以真实Protobuf信封和隔离Model核对原 battleId 回执与统一快照。
 * 受控交付模拟丢包、同步鉴权重入及身份结束；不连接服务器、不读写数据库、不开放挂机领取入口。
 */
import { strict as assert } from "node:assert";
import { GameLog } from "../assets/scripts/core/GameLog";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import type { AccountGateway } from "../assets/scripts/features/account/AccountApi";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import type { ChapterCommand } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterState } from "../assets/scripts/features/battle/MainChapterModel";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import type { ProtocolName } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";

/** 同一应用内需要恢复的服务器战斗编号，不与请求信封id混用。 */
const BATTLE_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
/** 另一场合法战斗，用于验证错误回执、并发结算及较新快照边界。 */
const BATTLE_B = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

/** 请求发送后由测试决定何时交付，避免用睡眠猜测提交顺序。 */
interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
    reject(error: unknown): void;
}

/** 模拟应用已经隔离身份的业务发送口；回调可同步触发，用于检查重入。 */
type SendHandler = (
    name: ChapterCommand,
    body: Record<string, unknown>,
    received: (frame: GameFrame) => void,
    failed: (error: unknown) => void,
) => Promise<void>;

/** 仅补统一快照；成功回调本身不能代表资产已经接纳。 */

/** 创建可单独释放或拒绝的Promise，调用者负责在案例结束前完成它。 */
function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

/** 使用真实编码往返构造信封，字段方向和整数约束不能被测试绕过。 */
function frame(name: string, body: unknown, kind = "response"): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1,
        name,
        kind,
        ...(kind === "response" ? { ok: true } : {}),
        body,
    }));
}

/** 构造主线权威状态；revision属于服务端资产版本，不是本地展示版本。 */
function state(revision: number, pendingBattleId: string | null, maxCleared = 1): MainChapterState {
    return { maxCleared, pendingBattleId, assetRevision: revision, challengeLimit: 3 };
}

/** 返回包含历史经验的结算回执，当前资产只能通过单独的统一快照提交。 */
function settled(battleId = BATTLE_A, revision = 4, maxCleared = 1): object {
    return {
        action: "SETTLED",
        battleId,
        state: state(revision, null, maxCleared),
        rewards: [{ itemId: 900001, quantity: 4000 }],
        experience: {
            beforeLevel: 1,
            beforeExp: 0,
            beforeThreshold: 120,
            afterLevel: 2,
            afterExp: 20,
            afterThreshold: 360,
        },
    };
}

/** 等待真实Promise续段，超过有界轮次即失败，不能长期轮询掩盖恢复停滞。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 100; index++) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    assert.fail(message);
}

/** 让已经安排的业务续段执行完，用于断言普通事件不会产生额外命令。 */
async function drain(): Promise<void> {
    for (let index = 0; index < 12; index++) {
        await Promise.resolve();
    }
}

/** 隔离模块夹具：只记录真实编码后的请求，统一状态与历史回执分别交付。 */
class Fixture {
    /** 每个案例独享唯一主线状态，dispose时清空，避免单例互相污染。 */
    public readonly model = new MainChapterModel();
    /** 实际生产控制器，所有断言通过公开业务入口与Model观察。 */
    public readonly controller = new MainChapterController(this.model);
    /** 已发业务请求，按发送顺序记录，用于核实原编号和命令总数。 */
    public readonly requests: GameFrame[] = [];
    /** 应用实际交付的失败，用于确认坏回执没有被当成成功。 */
    public readonly failures: unknown[] = [];
    /** 案例注入的业务响应行为；未配置时出现命令直接失败。 */
    public sendHandler: SendHandler = async () => {
        assert.fail("案例发出了未预期的主线命令");
    };

    /** 初始化实际协议登记与发送口；初始状态可覆盖到未收到挑战推送的版本。 */
    public constructor(initial = state(3, BATTLE_A)) {
        this.controller.initialize();
        this.controller.configure({
            deliver: async (name, body, received, failed) => {
                const request = frame(name, body, "request");
                this.requests.push(request);
                try {
                    await this.sendHandler(name, request.body as Record<string, unknown>, received, error => {
                        this.failures.push(error);
                        failed(error);
                    });
                } catch (error) {
                    // 和AccountController交付一致：协议处理异常交给当前身份的失败边界。
                    this.failures.push(error);
                    failed(error);
                }
            },
        });
        this.accept(initial);
    }

    /** 模拟应用接纳完整首包后按生产顺序提交模块，由控制器处理。 */
    public accept(chapter: MainChapterState, protocol: ProtocolName = Protocol.STATE_CHANGED): void {
        const snapshot = {
            revision: chapter.assetRevision,
            role: { id: "role-player", nickname: "player", serverId: "local-1", level: 2, gold: 50, diamonds: 7 },
            inventory: [],
            heroes: [],
            mainChapter: chapter,
        };
        const accepted = protocol === Protocol.STATE_CHANGED
            ? frame(protocol, snapshot, "event")
            : frame(protocol, {
                connectionId: "settlement-connection",
                roleId: snapshot.role.id,
                serverTimeMs: 200000,
                initial: snapshot,
            });
        ProtocolRouter.instance.dispatch(this.controller, accepted);
    }

    /** 请求记录只读投影，用于核实没有challenge重发或其他协议查询。 */
    public names(): string[] {
        return this.requests.map(request => request.name);
    }

    /** 释放协议监听和业务进度，案例不会留下跨测试的模块任务。 */
    public dispose(): void {
        this.controller.dispose();
    }
}

/** 每个案例自动释放独立模块，异常不会污染后面的结果。 */
async function withFixture(check: (fixture: Fixture) => Promise<void>, initial?: MainChapterState): Promise<void> {
    const fixture = new Fixture(initial);
    try {
        await check(fixture);
    } finally {
        fixture.dispose();
    }
}

/** 回执先到时只等待正常服务器推送，回执不更新资产。 */
async function checkReceiptBeforeState(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, _body, received) => received(frame(name, settled()));
        await fixture.controller.claim(BATTLE_A);
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null);
        assert.equal(fixture.model.state!.assetRevision, 3);
        assert.equal(fixture.model.settlement!.phase, "pending");
        fixture.accept(state(4, null));
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A)!.rewards[0].quantity, 4000);
        assert.deepEqual(fixture.names(), [Protocol.CHAPTER_CLAIM]);
    });
}

/** 状态先到且pending已清空仍不能猜成功，随后原回执到达才完成确认。 */
async function checkStateBeforeReceipt(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, _body, received) => {
            fixture.accept(state(4, null));
            assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null);
            received(frame(name, settled()));
        };
        await fixture.controller.claim(BATTLE_A);
        assert(fixture.controller.confirmedSettlement(BATTLE_A));
    });
}

/** 挑战回执到但推送丢失时，旧快照pending为空不能把当场胜利误判为历史重播。 */
async function checkChallengeStateLost(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, body, received) => {
            if (name === Protocol.CHAPTER_CHALLENGE) {
                received(frame(name, {
                    action: "BATTLE", battleId: BATTLE_A, state: state(3, BATTLE_A), rewards: [],
                }));
                return;
            }
            assert.equal(name, Protocol.CHAPTER_CLAIM);
            assert.equal(body.battleId, BATTLE_A);
            received(frame(name, settled()));
        };
        await fixture.controller.challenge();
        assert.equal(fixture.model.state!.assetRevision, 2);
        assert.equal(fixture.model.state!.pendingBattleId, null);
        assert.equal(fixture.model.receipt!.battleId, BATTLE_A);
        await fixture.controller.claim(BATTLE_A);
        fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
        assert(fixture.controller.confirmedSettlement(BATTLE_A));
        assert.deepEqual(fixture.names(), [Protocol.CHAPTER_CHALLENGE, Protocol.CHAPTER_CLAIM]);
    }, state(2, null, 0));
}

/** 回执丢失后直接接纳鉴权快照，需要查看结算时由玩家使用原战斗编号。 */
async function checkReceiptLostThenAuthenticated(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, body, received, failed) => {
            assert.equal(body.battleId, BATTLE_A);
            if (fixture.requests.length === 1) {
                failed(new Error("模拟提交后回执丢失"));
                return;
            }
            received(frame(name, settled()));
        };
        await fixture.controller.claim(BATTLE_A);
        fixture.accept(state(5, null), Protocol.SESSION_AUTHENTICATE);
        await drain();
        assert.equal(fixture.model.state!.pendingBattleId, null);
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null);
        assert.deepEqual(fixture.names(), [Protocol.CHAPTER_CLAIM]);
        await fixture.controller.claim(BATTLE_A);
        assert(fixture.controller.confirmedSettlement(BATTLE_A));
        assert.deepEqual(fixture.names(), [Protocol.CHAPTER_CLAIM, Protocol.CHAPTER_CLAIM]);
    });
}

/** 两个按钮和鉴权同时触发时共用任务；已展示反馈不会在重复事件后重新变为未展示。 */
async function checkConcurrentClaimsAndPresentation(): Promise<void> {
    await withFixture(async fixture => {
        const response = deferred<void>();
        fixture.sendHandler = async (name, _body, received) => {
            await response.promise;
            fixture.accept(state(4, null));
            received(frame(name, settled()));
        };
        const first = fixture.controller.claim(BATTLE_A);
        const second = fixture.controller.claim(BATTLE_A);
        assert.equal(first, second, "同battleId并发确认复用同一Promise");
        await until(() => fixture.requests.length === 1, "并发确认未开始请求");
        fixture.accept(state(3, BATTLE_A), Protocol.SESSION_AUTHENTICATE);
        response.resolve();
        await Promise.all([first, second]);
        fixture.controller.markSettlementPresented(BATTLE_A);
        fixture.controller.markSettlementPresented(BATTLE_A);
        fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
        fixture.accept(state(5, null));
        await fixture.controller.claim(BATTLE_A);
        assert.equal(fixture.requests.length, 1);
        assert.equal(fixture.model.settlement!.presented, true);
    });
}

/** 回执版本达到仍需核对pending与通关范围，较新另一场pending则允许确认原历史结果。 */
async function checkSnapshotConfirmationConditions(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, _body, received) => received(frame(name, settled()));
        await fixture.controller.claim(BATTLE_A);
        fixture.accept(state(3, null));
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null, "pending清空不能替代版本");
        fixture.accept(state(5, BATTLE_A));
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null, "同battleId仍待领奖不能双确认");
        fixture.accept(state(6, null, 0));
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null, "通关范围不足不能确认历史回执");
        fixture.accept(state(8, BATTLE_B, 2));
        assert(fixture.controller.confirmedSettlement(BATTLE_A), "较新状态可以确认较早历史结算");
        assert.equal(fixture.model.state!.pendingBattleId, BATTLE_B, "历史回执不能覆盖当前待领奖战斗");
        assert.equal(fixture.model.state!.assetRevision, 8);
    });
}

/** 错战斗回执整体拒绝，合法高版本当前状态也不能把另一战奖励补作本场成功。 */
async function checkWrongReceiptId(): Promise<void> {
    await withFixture(async fixture => {
        const accepted = fixture.model.receipt;
        fixture.sendHandler = async (name, _body, received) => received(frame(name, settled(BATTLE_B)));
        await fixture.controller.claim(BATTLE_A);
        fixture.accept(state(8, null, 2));
        assert.equal(fixture.model.receipt, accepted);
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null);
        assert.equal(fixture.model.settlement!.battleId, BATTLE_A);
        assert.equal(fixture.model.settlement!.phase, "pending");
        assert.equal(fixture.model.busy, false);
        assert.equal(fixture.failures.length, 1);
        assert.match(String(fixture.failures[0]), /编号不匹配/);
        assert.throws(() => fixture.controller.claim(BATTLE_B), /上一场/);
        assert.throws(() => fixture.controller.claim("bad"), /编号无效/);
    });
}

/** 旧挑战重试可合法返回SETTLED；已有原回执时等待统一快照，不误出战或重复claim。 */
async function checkChallengeReturnsSettled(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, _body, received) => {
            assert.equal(name, Protocol.CHAPTER_CHALLENGE);
            received(frame(name, settled()));
        };
        await fixture.controller.challenge();
        assert.equal(fixture.model.requestId, null);
        fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
        assert(fixture.controller.confirmedSettlement(BATTLE_A));
        assert.deepEqual(fixture.names(), [Protocol.CHAPTER_CHALLENGE]);
    });
}

/** 本地原请求未知时显式再次challenge优先恢复结算，不为恢复生成下一关请求。 */
async function checkChallengePrioritizesPendingSettlement(): Promise<void> {
    await withFixture(async fixture => {
        fixture.sendHandler = async (name, body, received, failed) => {
            assert.equal(name, Protocol.CHAPTER_CLAIM);
            assert.equal(body.battleId, BATTLE_A);
            if (fixture.requests.length === 1) {
                failed(new Error("模拟前台鉴权尚未就绪"));
                return;
            }
            fixture.accept(state(4, null));
            received(frame(name, settled()));
        };
        await fixture.controller.claim(BATTLE_A);
        await fixture.controller.challenge();
        assert(fixture.controller.confirmedSettlement(BATTLE_A));
        assert.deepEqual(fixture.names(), [Protocol.CHAPTER_CLAIM, Protocol.CHAPTER_CLAIM]);
        assert.equal(fixture.model.requestId, null);
    });
}

/** 真实账号交付负责换号及同角色重登隔离，模块既不保存身份键也不比较账号。 */
async function checkAccountDelivery(sameRole: boolean, failOldRequest: boolean): Promise<void> {
    await withFixture(async fixture => {
        const account = new AccountModel();
        const gateway: AccountGateway = {
            /** 登录只提供可信身份夹具，结算仍通过真实AccountController交付边界。 */
            async developmentLogin(name, serverId = "local-1") {
                return {
                    session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" },
                    role: { id: "role-" + name, nickname: name, serverId, level: 2, gold: 50, diamonds: 7 },
                };
            },
            /** 本案例显式登录，不使用持久凭证恢复。 */
            async currentRole() {
                assert.fail("身份隔离案例不应调用currentRole");
            },
        };
        const service = new AccountController(account, gateway, {
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
            fixture.accept(state(3, BATTLE_A));
            fixture.sendHandler = (name, _body, received, failed) => service.deliverAuthenticated(
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
            const original = fixture.controller.claim(BATTLE_A);
            await until(() => fixture.requests.length === 1, "旧身份结算未开始");
            if (sameRole) {
                service.logout();
            }
            const name = sameRole ? "player" : "other";
            assert(await service.login(name, sameRole ? "local-1" : "local-2"));
            fixture.accept(state(10, BATTLE_B, 2));
            const current = fixture.model.state;
            const message = fixture.model.message;
            if (failOldRequest) {
                response.reject(new SocketFailure("UNAUTHENTICATED"));
            } else {
                response.resolve(frame(Protocol.CHAPTER_CLAIM, settled()));
            }
            await original;
            assert.equal(deliveries, 0, "真实AccountController不能交付旧身份成功或失败");
            assert.equal(account.snapshot.role!.id, "role-" + name);
            assert.equal(service.hasSession, true, "旧未授权错误不能结束新身份");
            assert.equal(fixture.model.state, current);
            assert.equal(fixture.model.message, message);
            assert.equal(fixture.model.settlement, null);
            assert.equal(fixture.model.receipt, null);
            assert.equal(fixture.model.busy, false);
        } finally {
            stop();
            service.logout();
        }
    });
}

/** 逐案报告，单个失败仍执行其余矩阵；退出码只在所有案例通过时成功。 */
async function main(): Promise<void> {
    const cases: [string, () => Promise<void>][] = [
        ["receipt before state", checkReceiptBeforeState],
        ["state before receipt", checkStateBeforeReceipt],
        ["challenge state lost", checkChallengeStateLost],
        ["claim receipt lost waits for explicit retry", checkReceiptLostThenAuthenticated],
        ["concurrent claims and feedback dedupe", checkConcurrentClaimsAndPresentation],
        ["snapshot revision, pending and cleared-stage conditions", checkSnapshotConfirmationConditions],
        ["wrong receipt battleId rejected", checkWrongReceiptId],
        ["challenge legally returns SETTLED", checkChallengeReturnsSettled],
        ["challenge prioritizes original settlement", checkChallengePrioritizesPendingSettlement],
        ["other identity old success", () => checkAccountDelivery(false, false)],
        ["other identity old failure", () => checkAccountDelivery(false, true)],
        ["same role relogin old success", () => checkAccountDelivery(true, false)],
        ["same role relogin old failure", () => checkAccountDelivery(true, true)],
    ];
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
    console.log("主线结算双确认专项：" + passed + "/" + cases.length + " passed");
    assert.equal(passed, cases.length, "主线结算反例矩阵未全部通过");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
