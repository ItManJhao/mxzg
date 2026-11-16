/**
 * 主线首次进入恢复专项：通过真实Protobuf信封核对首包候选、原战斗双确认和反馈归属。
 * 驱动实际Controller及最小View路由；重复入口模拟页面关闭重开，不代替Creator页面与弱网验收。
 * 身份迟到由夹具中的应用交付作用域隔离，不让模块保存账号键或另建资产状态。
 */
import { strict as assert } from "node:assert";
import { Node } from "cc";
import { GameLog } from "../assets/scripts/core/GameLog";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import type { ChapterCommand } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterReceipt, MainChapterState } from "../assets/scripts/features/battle/MainChapterModel";
import { MainChapterBattleView } from "../assets/scripts/features/battle/ui/MainChapterBattleView";
import { MainChapterView } from "../assets/scripts/features/battle/ui/MainChapterView";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import type { ProtocolName } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";

/** 冷首包定位的服务器战斗编号；不使用新挑战编号替代。 */
const BATTLE_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
/** 新身份或后续推送中的另一场战斗，用于核对候选不会被替换。 */
const BATTLE_B = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

/** 案例控制请求与刷新续段；释放前不交付结果，不用实际断网或长时间等待。 */
interface Gate {
    /** 等待案例明确释放的Promise，每个门闩只用于一个异步边界。 */
    readonly promise: Promise<void>;
    /** 完成等待，允许原请求继续交付。 */
    release(): void;
}

/** 由案例独立交付回执和统一状态，避免同步替身掩盖双确认缺口。 */
type SendHandler = (
    name: ChapterCommand,
    body: Record<string, unknown>,
    received: (frame: GameFrame) => void,
    failed: (error: unknown) => void,
) => Promise<void>;

/** 创建只需完成、不需拒绝的异步门闩。 */
function gate(): Gate {
    let release!: () => void;
    const promise = new Promise<void>(resolve => {
        release = resolve;
    });
    return { promise, release };
}

/** 使用生产编码器往返，确保请求和回执没有绕过协议字段约束。 */
function frame(name: string, body: unknown, kind = "response"): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1,
        name,
        kind,
        ...(kind === "response" ? { ok: true } : {}),
        body,
    }));
}

/** 创建服务端权威状态，版本用于独立确认资产，不使用本地展示revision。 */
function state(revision = 3, pendingBattleId: string | null = BATTLE_A, maxCleared = 1): MainChapterState {
    return { maxCleared, pendingBattleId, assetRevision: revision };
}

/** 创建历史结算回执；调用方必须另行交付当前统一状态才能双确认。 */
function receipt(battleId = BATTLE_A, revision = 4, maxCleared = 1): MainChapterReceipt {
    return {
        action: "SETTLED",
        battleId,
        state: state(revision, null, maxCleared),
        rewards: [{ itemId: 900001, quantity: 4000 }],
    };
}

/** 完成已安排的Promise续段，检查没有因普通状态事件再次发命令或投影。 */
async function drain(): Promise<void> {
    for (let index = 0; index < 16; index++) {
        await Promise.resolve();
    }
}

/** 有界等待异步入口真正开始；条件不满足即失败，不以无限轮询掩盖停滞。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 100; index++) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    assert.fail(message);
}

/** 只含本专项必要装配的夹具；实际状态、结算和候选都归生产Model持有。 */
class EntryFixture {
    /** 每个案例独享的数据所有者，退出时由Controller统一清理。 */
    public readonly model = new MainChapterModel();
    /** 实际生产控制器，不替换恢复、双确认或反馈去重逻辑。 */
    public readonly controller = new MainChapterController(this.model);
    /** 按发送顺序保存真实编码后的请求，核对只使用原battleId。 */
    public readonly requests: GameFrame[] = [];
    /** 已尝试交付通用链的历史回执；记录投影失败尝试，区别于实际展示完成。 */
    public readonly restored: MainChapterReceipt[] = [];
    /** 已交给当前应用边界的网络或协议失败，旧身份失败不计入。 */
    public readonly failures: unknown[] = [];
    /** 每次缺状态刷新递增，确认单轮最多只重新鉴权一次。 */
    public refreshes = 0;
    /** 通用队列的显示重试次数，不代表发送结算或已经打开窗口。 */
    public displayRetries = 0;
    /** 案例指定请求顺序；默认成功结算，并分别提交状态和回执。 */
    public sendHandler: SendHandler;
    /** 案例指定刷新行为；默认只结束刷新，不伪造新的统一状态。 */
    public refreshHandler: () => Promise<void> = async () => {};
    /** 通用反馈投影结果；可抛错模拟配置投影失败，或返回empty避免空奖励窗。 */
    public restoreHandler: (value: MainChapterReceipt) => "queued" | "empty" = () => "queued";
    /** 应用交付作用域；重置后旧成功和失败回调均丢弃，不交给模块。 */
    private deliveryScope: object = {};

    /** 安装真实协议路由和应用交付口，首包本身只捕获候选，不调用进入页面意图。 */
    public constructor(initial: MainChapterState | null = state(), protocol: ProtocolName = Protocol.SESSION_AUTHENTICATE) {
        this.sendHandler = async (name, body, received) => {
            const id = body.battleId as string;
            this.accept(state(4, null));
            received(frame(name, receipt(id)));
        };
        this.controller.initialize();
        this.controller.configure(async (name, body, received, failed) => {
            const scope = this.deliveryScope;
            const request = frame(name, body, "request");
            this.requests.push(request);
            const deliverFailure = (error: unknown): void => {
                if (scope === this.deliveryScope) {
                    this.failures.push(error);
                    failed(error);
                }
            };
            try {
                await this.sendHandler(name, request.body as Record<string, unknown>, value => {
                    if (scope === this.deliveryScope) {
                        received(value);
                    }
                }, deliverFailure);
            } catch (error) {
                deliverFailure(error);
            }
        }, undefined, undefined, async (received, failed) => {
            const scope = this.deliveryScope;
            this.refreshes++;
            try {
                await this.refreshHandler();
                if (scope === this.deliveryScope) {
                    received();
                }
            } catch (error) {
                if (scope === this.deliveryScope) {
                    this.failures.push(error);
                    failed(error);
                }
            }
        });
        this.controller.configureRecoveryFeedback(value => {
            this.restored.push(value);
            return this.restoreHandler(value);
        }, () => {
            this.displayRetries++;
        });
        if (initial) {
            this.accept(initial, protocol);
        }
    }

    /** 模拟应用已接纳整包后的生产顺序；状态事件不会自行调用首次进入入口。 */
    public accept(chapter: MainChapterState, protocol: ProtocolName = Protocol.STATE_CHANGED): void {
        const snapshot = {
            revision: chapter.assetRevision,
            role: { id: "role-entry", nickname: "entry", serverId: "local-1", level: 2, gold: 50, diamonds: 7 },
            inventory: [],
            heroes: [],
            mainChapter: chapter,
        };
        const value = protocol === Protocol.STATE_CHANGED
            ? frame(protocol, snapshot, "event")
            : frame(protocol, {
                connectionId: "entry-recovery-connection",
                roleId: snapshot.role.id,
                serverTimeMs: 200000,
                initial: snapshot,
            });
        ProtocolRouter.instance.dispatch(this.controller, value);
        this.controller.afterSnapshot(protocol);
    }

    /** 应用身份结束先废弃交付作用域，再清理模块；不代表普通页面关闭。 */
    public reset(): void {
        this.deliveryScope = {};
        this.controller.resetSession();
    }

    /** 核对所有发送均为原战斗领取，且没有新挑战、战报或其他查询。 */
    public assertClaims(count: number, battleId = BATTLE_A): void {
        assert.equal(this.requests.length, count);
        for (const request of this.requests) {
            assert.equal(request.name, Protocol.CHAPTER_CLAIM);
            assert.equal((request.body as { battleId: string }).battleId, battleId);
        }
    }

    /** 结束案例并解除实际协议订阅，不遗留业务状态到下一案。 */
    public dispose(): void {
        this.controller.dispose();
    }
}

/** 独立创建及释放夹具，失败案例也不会污染其他测试。 */
async function run(check: (fixture: EntryFixture) => Promise<void>, initial?: MainChapterState | null,
    protocol?: ProtocolName): Promise<void> {
    const fixture = new EntryFixture(initial, protocol);
    try {
        await check(fixture);
    } finally {
        fixture.dispose();
    }
}

/** 首包只记录候选；停在主城零请求，真实进入才双确认并排队，入队不等于实际展示。 */
async function checkFirstEntry(protocol: ProtocolName): Promise<void> {
    await run(async fixture => {
        assert.deepEqual(fixture.model.entryRecovery, { battleId: BATTLE_A, consumed: false });
        await drain();
        fixture.assertClaims(0);
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(1);
        assert.equal(fixture.model.entryRecovery!.consumed, true);
        assert.equal(fixture.model.settlement!.presentation, "reward");
        assert.equal(fixture.model.settlement!.phase, "confirmed");
        assert.equal(fixture.model.settlement!.feedbackQueued, true);
        assert.equal(fixture.model.settlement!.presented, false);
        assert.equal(fixture.restored.length, 1);
    }, state(), protocol);
}

/** 空首包及后续状态不能变成新的冷候选，后续鉴权也不能重新抓取pending。 */
async function checkCandidateDoesNotFollowPush(): Promise<void> {
    await run(async fixture => {
        assert.equal(fixture.model.entryRecovery!.battleId, null);
        fixture.accept(state(3, BATTLE_A));
        fixture.accept(state(3, BATTLE_A), Protocol.SESSION_AUTHENTICATE);
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(0);
        assert.deepEqual(fixture.model.entryRecovery, { battleId: null, consumed: true });
        assert.equal(fixture.model.settlement, null);
    }, state(2, null, 0));
    await run(async fixture => {
        fixture.accept(state());
        assert.equal(fixture.model.entryRecovery, null, "普通推送不能捕获身份首包候选");
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(0);
    }, null);
}

/** 首包候选已不属于当前pending时拒绝接纳，不领取旧编号或追踪新编号。 */
async function checkCandidateChanged(): Promise<void> {
    await run(async fixture => {
        fixture.accept(state(5, BATTLE_B, 2));
        await fixture.controller.recoverPendingOnEntry();
        fixture.accept(state(6, BATTLE_A), Protocol.SESSION_AUTHENTICATE);
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(0);
        assert.equal(fixture.model.settlement, null);
    });
}

/** 已有本地流程优先，暖重连和页面重建不会抢走当前挑战、战报或结算的归属。 */
async function checkWarmGuard(kind: "request" | "receipt" | "replay" | "settlement" | "busy"): Promise<void> {
    await run(async fixture => {
        if (kind === "request") {
            fixture.model.requestId = BATTLE_B;
        } else if (kind === "receipt") {
            ProtocolRouter.instance.dispatch(fixture.controller, frame(Protocol.CHAPTER_CHALLENGE, {
                ...receipt(), action: "BATTLE", state: state(), rewards: [],
            }));
        } else if (kind === "replay") {
            fixture.model.replay = { battleId: BATTLE_A, mission: 1, pending: [], bytes: new Uint8Array() };
        } else if (kind === "settlement") {
            fixture.model.settlement = {
                battleId: BATTLE_A, phase: "pending", presentation: "battle", feedbackQueued: false, presented: false,
            };
        } else {
            fixture.model.busy = true;
        }
        const settlement = fixture.model.settlement;
        await fixture.controller.recoverPendingOnEntry();
        fixture.accept(state());
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(0);
        assert.equal(fixture.model.settlement, settlement);
        assert.equal(fixture.restored.length, 0);
    });
}

/** 同编号在途任务与反复开关共用原意图，反馈只入队一次，后续状态不会再次投影。 */
async function checkReentryAndDedupe(): Promise<void> {
    await run(async fixture => {
        const response = gate();
        fixture.sendHandler = async (name, _body, received) => {
            await response.promise;
            fixture.accept(state(4, null));
            received(frame(name, receipt()));
        };
        const first = fixture.controller.recoverPendingOnEntry();
        assert.equal(first, fixture.controller.claim(BATTLE_A), "同编号任务必须复用Promise");
        await until(() => fixture.requests.length === 1, "首次进入没有开始原编号结算");
        const pending = fixture.model.settlement;
        await fixture.controller.recoverPendingOnEntry();
        fixture.accept(state());
        assert.equal(fixture.model.settlement, pending, "重复开页不能重置模块意图");
        response.release();
        await first;
        fixture.accept(state(4, null));
        fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
        await fixture.controller.recoverPendingOnEntry();
        await fixture.controller.claim(BATTLE_A);
        fixture.assertClaims(1);
        assert.equal(fixture.restored.length, 1);
        assert.equal(fixture.model.settlement!.presentation, "reward");
    });
}

/** pending先清但回执丢失时保持未确认，普通推送不重发，鉴权恢复仍领取原编号。 */
async function checkReceiptLost(): Promise<void> {
    await run(async fixture => {
        fixture.sendHandler = async (_name, _body, _received, failed) => {
            fixture.accept(state(4, null));
            failed(new Error("模拟SETTLED回执丢失"));
        };
        await fixture.controller.recoverPendingOnEntry();
        assert.equal(fixture.model.settlement!.phase, "pending");
        assert.equal(fixture.restored.length, 0);
        fixture.accept(state(4, null));
        await drain();
        fixture.assertClaims(1);
        fixture.sendHandler = async (name, _body, received) => received(frame(name, receipt()));
        fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
        await until(() => fixture.restored.length === 1, "鉴权没有恢复原编号回执");
        fixture.assertClaims(2);
        assert.equal(fixture.model.settlement!.presentation, "reward");
    });
}

/** 只有回执时每轮最多补一次状态；关页重开不隐式开启下一轮，显式恢复才再补快照。 */
async function checkBoundedRefresh(): Promise<void> {
    await run(async fixture => {
        fixture.sendHandler = async (name, _body, received) => received(frame(name, receipt()));
        fixture.refreshHandler = async () => {
            fixture.accept(state(), Protocol.SESSION_AUTHENTICATE);
        };
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(1);
        assert.equal(fixture.refreshes, 1);
        assert.equal(fixture.model.settlement!.phase, "pending");
        assert.equal(fixture.restored.length, 0);
        fixture.accept(state());
        await fixture.controller.recoverPendingOnEntry();
        assert.equal(fixture.refreshes, 1);
        fixture.refreshHandler = async () => fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
        await fixture.controller.retryRecoveredSettlement();
        fixture.assertClaims(1);
        assert.equal(fixture.refreshes, 2);
        assert.equal(fixture.restored.length, 1);
        assert.equal(fixture.model.settlement!.presentation, "reward");
    });
}

/** 已入队只重试显示，不再次投影或发协议，只有匹配归属的实际展示通知才能消费反馈。 */
async function checkQueuedRetryAndOwnership(): Promise<void> {
    await run(async fixture => {
        await fixture.controller.recoverPendingOnEntry();
        fixture.controller.markSettlementPresented(BATTLE_A);
        assert.equal(fixture.model.settlement!.presented, false, "胜利页不能消费恢复奖励");
        fixture.controller.markSettlementPresented(BATTLE_B, "reward");
        assert.equal(fixture.model.settlement!.presented, false, "另一场战斗不能消费反馈");
        await fixture.controller.retryRecoveredSettlement();
        await fixture.controller.retryRecoveredSettlement();
        assert.equal(fixture.displayRetries, 2);
        fixture.assertClaims(1);
        assert.equal(fixture.restored.length, 1);
        fixture.controller.markSettlementPresented(BATTLE_A, "reward");
        assert.equal(fixture.model.settlement!.presented, true);
        await fixture.controller.retryRecoveredSettlement();
        await fixture.controller.recoverPendingOnEntry();
        fixture.accept(state(5, null));
        assert.equal(fixture.displayRetries, 2);
        assert.equal(fixture.restored.length, 1);
    });
}

/** 正常演出结算只归胜利页，进入恢复入口及通用展示通知不能将它改成恢复奖励。 */
async function checkNormalSettlementOwnership(): Promise<void> {
    await run(async fixture => {
        await fixture.controller.claim(BATTLE_A);
        await fixture.controller.recoverPendingOnEntry();
        assert.equal(fixture.model.settlement!.presentation, "battle");
        assert.equal(fixture.restored.length, 0);
        fixture.controller.markSettlementPresented(BATTLE_A, "reward");
        assert.equal(fixture.model.settlement!.presented, false);
        await fixture.controller.retryRecoveredSettlement();
        assert.equal(fixture.displayRetries, 0);
        fixture.controller.markSettlementPresented(BATTLE_A);
        assert.equal(fixture.model.settlement!.presented, true);
        fixture.assertClaims(1);
    });
}

/** 历史回执投影失败仅保留手动入口；普通更新和鉴权不循环，显式重试不再发奖。 */
async function checkProjectionFailure(): Promise<void> {
    await run(async fixture => {
        fixture.restoreHandler = () => {
            throw new Error("模拟奖励配置投影失败");
        };
        await fixture.controller.recoverPendingOnEntry();
        assert.equal(fixture.model.settlement!.phase, "confirmed");
        assert.equal(fixture.model.settlement!.feedbackQueued, false);
        assert.equal(fixture.model.settlement!.presented, false);
        assert.equal(fixture.restored.length, 1);
        for (let index = 0; index < 3; index++) {
            fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
            await fixture.controller.recoverPendingOnEntry();
        }
        await drain();
        assert.equal(fixture.restored.length, 1, "投影失败不能由事件自动循环");
        fixture.restoreHandler = () => "queued";
        await fixture.controller.retryRecoveredSettlement();
        assert.equal(fixture.restored.length, 2);
        assert.equal(fixture.model.settlement!.feedbackQueued, true);
        assert.equal(fixture.displayRetries, 0);
        fixture.assertClaims(1);
    });
}

/** 无正奖励明确消费反馈而不开空窗，后续开页或重试不再交付。 */
async function checkEmptyFeedback(): Promise<void> {
    await run(async fixture => {
        fixture.restoreHandler = value => {
            assert.deepEqual(value.rewards, []);
            return "empty";
        };
        fixture.sendHandler = async (name, _body, received) => {
            fixture.accept(state(4, null));
            received(frame(name, { ...receipt(), rewards: [] }));
        };
        await fixture.controller.recoverPendingOnEntry();
        assert.equal(fixture.model.settlement!.presented, true);
        assert.equal(fixture.model.settlement!.feedbackQueued, true);
        await fixture.controller.retryRecoveredSettlement();
        await fixture.controller.recoverPendingOnEntry();
        fixture.assertClaims(1);
        assert.equal(fixture.displayRetries, 0);
        assert.equal(fixture.restored.length, 1);
    });
}

/** 通用链同步通知实际打开或同步重入状态时，预留归属仍只投影一次且不覆盖展示完成。 */
async function checkSynchronousFeedback(): Promise<void> {
    await run(async fixture => {
        fixture.restoreHandler = value => {
            fixture.accept(state(4, null), Protocol.SESSION_AUTHENTICATE);
            fixture.controller.markSettlementPresented(value.battleId, "reward");
            return "queued";
        };
        await fixture.controller.recoverPendingOnEntry();
        assert.equal(fixture.model.settlement!.presented, true);
        assert.equal(fixture.restored.length, 1);
        fixture.assertClaims(1);
    });
}

/** 身份结束后原请求或刷新迟到都不能解锁新任务、恢复旧候选或投递旧奖励。 */
async function checkResetDuringDelivery(duringRefresh: boolean, oldFails = false): Promise<void> {
    await run(async fixture => {
        const old = gate();
        if (duringRefresh) {
            fixture.sendHandler = async (name, _body, received) => received(frame(name, receipt()));
            fixture.refreshHandler = async () => old.promise;
        } else {
            fixture.sendHandler = async (name, _body, received, failed) => {
                await old.promise;
                if (oldFails) {
                    failed(new Error("旧身份失败迟到"));
                } else {
                    received(frame(name, receipt()));
                }
            };
        }
        const original = fixture.controller.recoverPendingOnEntry();
        await until(() => duringRefresh ? fixture.refreshes === 1 : fixture.requests.length === 1,
            "旧恢复任务没有到达受控边界");
        fixture.reset();
        assert.equal(fixture.model.entryRecovery, null);
        fixture.accept(state(8, BATTLE_B, 2), Protocol.SESSION_AUTHENTICATE);
        const currentResponse = gate();
        fixture.sendHandler = async (name, body, received) => {
            assert.equal(body.battleId, BATTLE_B);
            await currentResponse.promise;
            fixture.accept(state(9, null, 2));
            received(frame(name, receipt(BATTLE_B, 9, 2)));
        };
        const current = fixture.controller.recoverPendingOnEntry();
        await until(() => fixture.requests.length === 2, "新身份原编号没有开始结算");
        const currentSettlement = fixture.model.settlement;
        const currentState = fixture.model.state;
        old.release();
        await original;
        assert.equal(fixture.model.settlement, currentSettlement, "旧任务续段不能改新身份结算");
        assert.equal(fixture.model.state, currentState);
        assert.equal(fixture.model.busy, true, "旧任务结束不能解锁新请求");
        assert.equal(fixture.model.receipt, null);
        assert.equal(fixture.restored.length, 0);
        assert.equal(fixture.failures.length, 0, "旧失败不能进入新身份边界");
        currentResponse.release();
        await current;
        assert.equal(fixture.restored.length, 1);
        assert.equal(fixture.restored[0].battleId, BATTLE_B);
        assert.equal(fixture.controller.confirmedSettlement(BATTLE_A), null);
        assert.equal(fixture.model.settlement!.presentation, "reward");
    });
}

/** 暂存单例中实际涉及的字段，供View私有入口读取；结束后恢复原引用，不重置其他测试状态。 */
async function withRewardViewState(check: () => Promise<void>): Promise<void> {
    const model = MainChapterModel.instance;
    const previous = {
        state: model.state,
        busy: model.busy,
        requestId: model.requestId,
        receipt: model.receipt,
        replay: model.replay,
        settlement: model.settlement,
    };
    try {
        model.state = state(4, null);
        model.busy = false;
        model.requestId = null;
        model.receipt = receipt();
        model.replay = null;
        model.settlement = {
            battleId: BATTLE_A, phase: "confirmed", presentation: "reward", feedbackQueued: true, presented: false,
        };
        await check();
    } finally {
        Object.assign(model, previous);
    }
}

/** 主线按钮遇恢复归属只提交显示重试；实际challenge分派不得转入播放、胜利页或新挑战。 */
async function checkMainViewRecoveryRoute(): Promise<void> {
    await withRewardViewState(async () => {
        const node = new Node("EntryRecoveryMainView");
        const page: any = node.addComponent(MainChapterView);
        const controller = MainChapterController.instance;
        const ui = UIManager.instance;
        const originalRetry = controller.retryRecoveredSettlement;
        const originalChallenge = controller.challenge;
        const originalClaim = controller.claim;
        const originalOpen = ui.open;
        const originalOpenById = ui.openById;
        const originalToast = ui.toast;
        let retries = 0;
        let commands = 0;
        let plays = 0;
        let windows = 0;
        let notices = 0;
        try {
            controller.retryRecoveredSettlement = async () => {
                retries++;
            };
            controller.challenge = async () => {
                commands++;
            };
            controller.claim = async () => {
                commands++;
            };
            page.play = async () => {
                plays++;
            };
            ui.open = (async () => {
                windows++;
            }) as typeof ui.open;
            ui.openById = (async () => {
                windows++;
            }) as typeof ui.openById;
            ui.toast = () => {
                notices++;
            };
            const settlement = MainChapterModel.instance.settlement;
            await page.challenge();
            assert.equal(retries, 1, "恢复奖励按钮必须交给retryRecoveredSettlement");
            assert.equal(commands, 0, "View不能直接重发领取或生成新挑战");
            assert.equal(plays, 0, "恢复奖励不能转入play或settlementOnly战场");
            assert.equal(windows, 0, "恢复按钮不能直接打开胜利页或其他窗口");
            assert.equal(notices, 0, "路由不能用捕获异常掩盖误入旧流程");
            assert.equal(MainChapterModel.instance.settlement, settlement);
        } finally {
            controller.retryRecoveredSettlement = originalRetry;
            controller.challenge = originalChallenge;
            controller.claim = originalClaim;
            ui.open = originalOpen;
            ui.openById = originalOpenById;
            ui.toast = originalToast;
            node.destroy();
        }
    });
}

/** 战场结束遇同编号恢复归属立即关闭自身，实际completeBattle不得再claim或打开胜利页。 */
async function checkBattleViewRecoveryRoute(): Promise<void> {
    await withRewardViewState(async () => {
        const node = new Node("EntryRecoveryBattleView");
        const battle: any = node.addComponent(MainChapterBattleView);
        const controller = MainChapterController.instance;
        const ui = UIManager.instance;
        const originalClaim = controller.claim;
        const originalOpen = ui.open;
        const originalOpenById = ui.openById;
        let claims = 0;
        let closed = 0;
        let results = 0;
        let windows = 0;
        try {
            controller.claim = async () => {
                claims++;
            };
            ui.open = (async () => {
                windows++;
            }) as typeof ui.open;
            ui.openById = (async () => {
                windows++;
            }) as typeof ui.openById;
            battle.args = {
                report: { battleId: BATTLE_A, mission: 1, pending: [], bytes: new Uint8Array() },
                onClosed: () => {},
            };
            battle.close = () => {
                closed++;
            };
            battle.showResult = async () => {
                results++;
            };
            const settlement = MainChapterModel.instance.settlement;
            await battle.completeBattle(true);
            await battle.completeBattle(true);
            assert.equal(closed, 1, "同编号恢复归属只关闭自身，重复结束不重复关闭");
            assert.equal(claims, 0, "恢复归属的战场结束不能再次领取");
            assert.equal(results, 0, "恢复归属不能进入showResult");
            assert.equal(windows, 0, "恢复归属不能打开ChapterEnd或其他窗口");
            assert.equal(MainChapterModel.instance.settlement, settlement);
        } finally {
            controller.claim = originalClaim;
            ui.open = originalOpen;
            ui.openById = originalOpenById;
            node.destroy();
        }
    });
}

/** 逐案输出精简结果，失败仍检查其余边界，全部通过才返回成功退出码。 */
async function main(): Promise<void> {
    const cases: [string, () => Promise<void>][] = [
        ["login captures without claiming; first entry claims original", () => checkFirstEntry(Protocol.SESSION_LOGIN)],
        ["authenticate captures without claiming; first entry claims original", () => checkFirstEntry(Protocol.SESSION_AUTHENTICATE)],
        ["later push and authenticate never replace candidate", checkCandidateDoesNotFollowPush],
        ["changed current pending rejects original cold candidate", checkCandidateChanged],
        ...(["request", "receipt", "replay", "settlement", "busy"] as const).map(kind =>
            ["warm " + kind + " retains original flow", () => checkWarmGuard(kind)] as [string, () => Promise<void>]),
        ["same task, repeated entry and feedback dedupe", checkReentryAndDedupe],
        ["lost receipt waits for authentication and original id", checkReceiptLost],
        ["receipt without state refreshes at most once per attempt", checkBoundedRefresh],
        ["queued retry only retries display; presentation is exclusive", checkQueuedRetryAndOwnership],
        ["normal settlement remains exclusive to battle result", checkNormalSettlementOwnership],
        ["projection failure waits for explicit retry", checkProjectionFailure],
        ["empty recovery feedback completes without a popup", checkEmptyFeedback],
        ["synchronous feedback delivery preserves completion", checkSynchronousFeedback],
        ["reset rejects old request success", () => checkResetDuringDelivery(false)],
        ["reset rejects old request failure", () => checkResetDuringDelivery(false, true)],
        ["reset rejects old refresh continuation", () => checkResetDuringDelivery(true)],
        ["main view recovery button never opens a battle result", checkMainViewRecoveryRoute],
        ["battle view closes when recovery owns the same id", checkBattleViewRecoveryRoute],
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
    console.log("主线首次进入恢复专项：" + passed + "/" + cases.length + " passed");
    assert.equal(passed, cases.length, "主线首次进入恢复反例矩阵未全部通过");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
