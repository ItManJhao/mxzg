/** 日常副本协议控制器。查看、挑战与扫荡经认证通道发送，服务器在挑战回包前完成结算。 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { RedDotManager } from "../../framework/ui/RedDotManager";
import { UIManager } from "../../framework/ui/UIManager";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { SocketFailure } from "../../platform/GameSocketClient";
import { DAILY_DUNGEON_PROTOCOLS, Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import { GameRedDotKey } from "../common/utils/GameRedDotKey";
import type { RewardBinding } from "../reward/RewardBinding";
import { RewardUtils } from "../reward/utils/RewardUtils";
import { DailyDungeonModel, type DailyDungeonKind, type DailyDungeonState } from "./DailyDungeonModel";

/** 各副本的入口门槛、协议和对应免费次数红点。 */
export const DAILY_DUNGEON_ENTRIES = {
    gold: {
        gate: "main_mission_gold",
        ...DAILY_DUNGEON_PROTOCOLS.gold,
        reminder: GameRedDotKey.GOLD_DUNGEON,
    },
    experience: {
        gate: "main_mission_exp",
        ...DAILY_DUNGEON_PROTOCOLS.experience,
        reminder: GameRedDotKey.EXPERIENCE_DUNGEON,
    },
    hero: {
        gate: "main_mission_hero",
        ...DAILY_DUNGEON_PROTOCOLS.hero,
        reminder: GameRedDotKey.HERO_DUNGEON,
    },
    fetter: {
        gate: "main_mission_fetter",
        ...DAILY_DUNGEON_PROTOCOLS.fetter,
        reminder: GameRedDotKey.FETTER_DUNGEON,
    },
    spirit: {
        gate: "main_mission_runes",
        ...DAILY_DUNGEON_PROTOCOLS.spirit,
        reminder: GameRedDotKey.SPIRIT_DUNGEON,
    },
} as const;

/** 一次在途挑战或扫荡意图，重连沿用发送时的编号、关卡、模式和报价。 */
interface DungeonCommand {
    readonly requestId: string;
    /** 本次提交的实际配置关卡，恢复时保持不变。 */
    readonly stageId: number;
    readonly sweep: boolean;
    readonly maxDiamonds: number;
}

/** 后台只读请求及其等待期间收到的后续资格刷新。 */
interface DungeonReminderRequest {
    /** 有更新的资格触发时为 true，当前回包让位给下一次权威读取。 */
    refreshAgain: boolean;
}

/** 每个副本类型独立等待前台操作、后台资格和断线恢复。 */
interface DungeonRequests {
    /** 发出本类型的前台请求后置为 true，收到回包或失败后恢复。 */
    pending: boolean;
    /** 正在读取的后台资格，前台读取同类型时失效。 */
    reminder: DungeonReminderRequest | null;
    /** 需要取得结果的写操作，成功或明确拒绝后清除。 */
    command: DungeonCommand | null;
}

/** 已认证的副本结算回包，失败战报和扫荡各自按协议校验。 */
interface DungeonReceipt {
    readonly requestId: string;
    readonly battleId: string;
    readonly assetRevision: number;
    readonly won: boolean;
    readonly sweep: boolean;
    readonly state: DailyDungeonState;
    readonly actual?: unknown;
    readonly replay?: object;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "daily-dungeon.updated": DailyDungeonKind;
    }
}

export class DailyDungeonController extends BaseController {
    /** 应用装配的副本协议接收者，界面只调用公开操作。 */
    public static readonly instance = new DailyDungeonController();

    /** 当前应用共享的账号操作入口，卸载时释放。 */
    private operations: AccountOperations | null = null;
    /** 扫荡无战报，真实回执交给应用的通用奖励窗。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;
    /** 当前关卡页选中的副本类型，关页后为 null。 */
    private visible: DailyDungeonKind | null = null;
    /** 同类型复用在途记录，换号时清空每个副本。 */
    private readonly requests: Record<DailyDungeonKind, DungeonRequests> = {
        gold: { pending: false, reminder: null, command: null },
        experience: { pending: false, reminder: null, command: null },
        hero: { pending: false, reminder: null, command: null },
        fetter: { pending: false, reminder: null, command: null },
        spirit: { pending: false, reminder: null, command: null },
    };

    /** 装配认证发包和共用奖励队列，不保存身份凭证。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 页面以此禁用重复发送；断线待确认时下次点击只重新交付原命令。 */
    public busy(kind: DailyDungeonKind): boolean {
        return this.requests[kind].pending;
    }

    /** 已发出真实挑战且仍在等回包时显示战场背景，扫荡、查询和断线待重试均保留列表。 */
    public awaitingBattle(kind: DailyDungeonKind): boolean {
        const request = this.requests[kind];
        return request.pending && request.command?.sweep === false;
    }

    /** 等待服务端确认的原关卡，切换到其他关卡时不替换该次操作。 */
    public pendingStageId(kind: DailyDungeonKind): number | null {
        return this.requests[kind].command?.stageId ?? null;
    }

    /** 打开或切换页签时读其进度，离开时保留服务端可能已受理的操作。 */
    public setVisible(kind: DailyDungeonKind | null): void {
        this.visible = kind;
        if (kind) {
            this.refreshVisible();
        }
    }

    /** 页面打开、跨日及重新鉴权查询副本状态；原结算未知时先确认原请求。 */
    public refreshVisible(): void {
        const kind = this.visible;
        if (!kind || !this.operations) {
            return;
        }
        const request = this.requests[kind];
        if (request.pending) {
            return;
        }
        if (request.command) {
            this.send(kind, request.command);
        } else {
            this.send(kind);
        }
    }

    /**
     * 只读刷新指定副本的红点资格，未确认挑战由原入口处理。
     * @param queueLatestInputs 资格变化时允许合并一次跟读，计时重试只在空闲时发送。
     * @returns 本次是否直接发起读取。
     */
    public refreshReminder(kind: DailyDungeonKind, queueLatestInputs = true): boolean {
        const state = this.requests[kind];
        if (!this.operations || state.pending || state.command) {
            return false;
        }
        if (state.reminder) {
            if (queueLatestInputs) {
                state.reminder.refreshAgain = true;
            }
            return false;
        }
        const request: DungeonReminderRequest = { refreshAgain: false };
        state.reminder = request;
        void this.operations.deliver(DAILY_DUNGEON_ENTRIES[kind].list, {},
            frame => this.finishReminder(kind, request, frame), () => this.finishReminder(kind, request));
        return true;
    }

    /** 提交指定类型和关卡的操作与报价；结算未知时仅允许重发同类型同一关。 */
    public challenge(kind: DailyDungeonKind, stageId: number): void {
        const request = this.requests[kind];
        if (!this.operations || request.pending) {
            return;
        }
        if (request.command) {
            if (request.command.stageId === stageId) {
                this.send(kind, request.command);
            }
            return;
        }
        const model = DailyDungeonModel.instance;
        const state = model.stateFor(kind);
        const stage = model.stagesFor(kind).find(value => value.stageId === stageId);
        if (!state || !stage?.canChallenge) {
            return;
        }
        this.send(kind, {
            requestId: RequestIdUtils.create(),
            stageId,
            sweep: stage.cleared,
            maxDiamonds: state.nextCostDiamonds,
        });
    }

    /** 从协议确定所属副本，提交回包和免费次数红点后通知相应页签。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        const route = Protocol.dailyDungeonRoute(protocol);
        if (!route) {
            return;
        }
        const { kind, operation } = route;
        const entry = DAILY_DUNGEON_ENTRIES[kind];
        const request = this.requests[kind];
        const model = DailyDungeonModel.instance;
        if (operation === "list") {
            model.applyState(kind, value as DailyDungeonState);
        } else {
            this.acceptBattle(kind, value as DungeonReceipt);
            request.command = null;
        }
        request.pending = false;
        const state = model.stateFor(kind)!;
        RedDotManager.instance.set(entry.reminder,
            state.wins < state.freeLimit && model.stagesFor(kind).some(stage => stage.canChallenge));
        this.emit("daily-dungeon.updated", kind);
        if (kind === this.visible && operation === "challenge" && !state.stages?.length) {
            this.refreshVisible();
        }
    }

    /** 已被前台取代的后台回包不提交，背景查询失败不打断页面。 */
    private finishReminder(kind: DailyDungeonKind, request: DungeonReminderRequest, frame?: GameFrame): void {
        if (this.requests[kind].reminder !== request) {
            return;
        }
        this.requests[kind].reminder = null;
        if (request.refreshAgain) {
            this.refreshReminder(kind);
        } else if (frame) {
            ProtocolRouter.instance.dispatch(this, frame);
        }
    }

    /** 只登记当前已实现的日常副本查看、挑战与扫荡消息。 */
    protected onInitialize(): void {
        const accepted: ProtocolName[] = [];
        for (const entry of Object.values(DAILY_DUNGEON_ENTRIES)) {
            accepted.push(entry.list, entry.challenge);
        }
        this.ownListener(ProtocolRouter.instance.register(this, accepted));
    }

    /** 换号时断开旧页面、旧意图及只读查询，账号层负责隔离回包。 */
    protected onResetSession(): void {
        this.visible = null;
        for (const request of Object.values(this.requests)) {
            request.pending = false;
            request.reminder = null;
            request.command = null;
        }
        DailyDungeonModel.instance.reset();
    }

    /** 随应用卸载释放注入的通道。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 同类型前台优先于后台读取，挑战保留原请求并校验响应的编号、关卡和模式。 */
    private send(kind: DailyDungeonKind, command?: DungeonCommand): void {
        const entry = DAILY_DUNGEON_ENTRIES[kind];
        const request = this.requests[kind];
        request.reminder = null;
        request.pending = true;
        request.command = command ?? null;
        this.emit("daily-dungeon.updated", kind);
        void this.operations!.deliver(command ? entry.challenge : entry.list, command ?? {}, frame => {
            if (command) {
                const result = frame.body as DungeonReceipt;
                if (result.requestId !== command.requestId || result.sweep !== command.sweep
                        || result.state.stageId !== command.stageId) {
                    throw new Error("副本回包与本次操作不符");
                }
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failed(kind, !!command, error));
    }

    /** 挑战交给既有战报播放器，扫荡直接交给通用奖励提示，库存始终来自统一快照。 */
    private acceptBattle(kind: DailyDungeonKind, result: DungeonReceipt): void {
        const model = DailyDungeonModel.instance;
        if (result.sweep) {
            model.applyState(kind, result.state);
            this.rewards?.restoreActual(result.battleId, result.assetRevision, result.actual);
            return;
        }
        if (!result.replay) {
            throw new Error("日常副本挑战回包缺少战报");
        }
        const notice = result.won ? RewardUtils.fromActual(result.battleId, result.assetRevision, result.actual) : null;
        model.applyBattle(kind, result.state, {
            bytes: BattleReplayUtils.encodeVerified(result.replay),
            won: result.won,
            rewards: notice?.items.map(item => ({ itemId: item.itemId, quantity: item.credited })) ?? [],
        });
    }

    /** 确定失败刷新权威次数与价格，连接中断保留原操作等待同会话恢复。 */
    private failed(kind: DailyDungeonKind, challenge: boolean, error: unknown): void {
        const request = this.requests[kind];
        request.pending = false;
        const interrupted = error instanceof SocketFailure && error.interrupted;
        if (!interrupted) {
            request.command = null;
        }
        this.emit("daily-dungeon.updated", kind);
        if (kind !== this.visible) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "副本请求失败");
        if (!interrupted && challenge) {
            this.refreshVisible();
        }
    }
}
