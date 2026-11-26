/**
 * 彩虹圣殿协议入口。通过认证通道请求同服状态、独立阵容与战报，
 * 将匹配回执交唯一模型，断线按原请求编号补读且不重复挑战。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol, type ProtocolName, type RainbowChallengeRequest,
    type RainbowHistory, type RainbowLineup, type RainbowSettlement, type RainbowState } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { FormationSaveRequest } from "../hero/data/FormationData";
import { RainbowModel } from "./RainbowModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "rainbow.updated": void;
    }
}

type Pending =
    | { name: typeof Protocol.RAINBOW_LINEUP_SAVE; body: FormationSaveRequest; done: (success: boolean) => void }
    | { name: typeof Protocol.RAINBOW_CHALLENGE; body: RainbowChallengeRequest;
        done: (result: RainbowSettlement, replay: Uint8Array) => void };

export class RainbowController extends BaseController {
    /** 应用创建和清理的模块实例。 */
    public static readonly instance = new RainbowController();

    /** 当前应用认证请求入口，销毁时清理。 */
    private operations: AccountOperations | null = null;
    /** 主场打开才主动同步，关闭后保留在途写请求以备补读。 */
    private visible = false;
    /** 主进度或写命令正在等待回包时为 true。 */
    private inFlight = false;
    /** 尚未确认的写操作和回调，网络中断时复用请求号。 */
    private pending: Pending | null = null;
    /** 公开记录收到后，只回调仍在等待同次查询的窗口。 */
    private historyReady: ((result: RainbowHistory) => void) | null = null;
    /** 公开回放检查后通知等待窗口。 */
    private replayReady: ((replay: Uint8Array) => void) | null = null;

    /** 等待查询或操作期间避免连续提交。 */
    public get busy(): boolean {
        return this.inFlight || this.pending !== null;
    }

    /** 超时等中断后允许页面恢复同一笔操作，即使连接尚未重新鉴权。 */
    public get needsRetry(): boolean {
        return !this.inFlight && this.pending !== null;
    }

    /** 装配应用共用的认证协议通道。 */
    public configure(operations: AccountOperations): void {
        this.operations = operations;
    }

    /** 进入主场后读取神位，关闭时停止后续主动查询。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        this.refreshVisible();
    }

    /** 可见时刷新本服进度，优先恢复上一次提交的阵容或挑战。 */
    public refreshVisible(): void {
        if (this.visible) {
            this.sendPending();
        }
    }

    /** 独立草稿由服务端按原版本保存，成功后允许当前布阵页出战。 */
    public saveFormation(draft: Omit<FormationSaveRequest, "requestId">, done: (success: boolean) => void): void {
        if (this.busy || !this.operations || !RainbowModel.instance.state) {
            done(false);
            return;
        }
        this.pending = { name: Protocol.RAINBOW_LINEUP_SAVE, body: { ...draft, requestId: RequestIdUtils.create() }, done };
        this.sendPending();
    }

    /** 提交本次神位和进化选择，仅使用已确认的独立阵容。 */
    public challenge(seatId: number, evolution: number,
        done: (result: RainbowSettlement, replay: Uint8Array) => void): void {
        const lineup = RainbowModel.instance.state?.lineup;
        if (!lineup || !this.operations || this.busy) {
            return;
        }
        const body = { requestId: RequestIdUtils.create(), seatId, evolution, expectedLineupVersion: lineup.version };
        this.pending = { name: Protocol.RAINBOW_CHALLENGE, body, done };
        this.sendPending();
    }

    /** 读取所选神位的近期公开记录，响应必须对应同一个神位。 */
    public loadHistory(seatId: number, done: (history: RainbowHistory) => void): void {
        if (!this.operations || !this.isInitialized) {
            return;
        }
        this.historyReady = done;
        void this.operations.deliver(Protocol.RAINBOW_HISTORY, { seatId }, frame => {
            if (this.historyReady !== done) {
                return;
            }
            const history = frame.body as RainbowHistory;
            if (history.seatId !== seatId || history.records.length > 5) {
                throw new Error("彩虹圣殿历史与请求不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.onReadFailure(Protocol.RAINBOW_HISTORY, done, error));
    }

    /** 打开一场已显示的公开胜场战报，不触发占位和奖励。 */
    public loadReplay(seatId: number, battleId: string, done: (replay: Uint8Array) => void): void {
        if (!this.operations || !this.isInitialized) {
            return;
        }
        this.replayReady = done;
        void this.operations.deliver(Protocol.RAINBOW_REPLAY, { seatId, battleId }, frame => {
            if (this.replayReady === done) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => this.onReadFailure(Protocol.RAINBOW_REPLAY, done, error));
    }

    /** 直接按协议分发到该业务的状态、写回执和只读回放。 */
    public onNotify(name: ProtocolName, data: unknown): void {
        switch (name) {
            case Protocol.RAINBOW_STATE:
                RainbowModel.instance.commit(data as RainbowState);
                this.finish();
                break;
            case Protocol.RAINBOW_LINEUP_SAVE:
                this.acceptFormation(data as { requestId: string; formation: RainbowLineup });
                break;
            case Protocol.RAINBOW_CHALLENGE:
                this.acceptChallenge(data as RainbowSettlement);
                break;
            case Protocol.RAINBOW_HISTORY: {
                const value = data as RainbowHistory;
                RainbowModel.instance.commitHistory(value);
                const done = this.historyReady;
                this.historyReady = null;
                done?.(value);
                break;
            }
            case Protocol.RAINBOW_REPLAY: {
                const replay = BattleReplayUtils.encodeVerified(data as object);
                const done = this.replayReady;
                this.replayReady = null;
                done?.(replay);
                break;
            }
        }
    }

    /** 登记已实装的五条通用认证消息。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.RAINBOW_STATE, Protocol.RAINBOW_LINEUP_SAVE,
            Protocol.RAINBOW_CHALLENGE, Protocol.RAINBOW_HISTORY, Protocol.RAINBOW_REPLAY]));
    }

    /** 账号改变时清理当前角色数据和仍在等待的页面回调。 */
    protected onResetSession(): void {
        this.visible = false;
        this.inFlight = false;
        this.pending = null;
        this.historyReady = null;
        this.replayReady = null;
        RainbowModel.instance.reset();
    }

    /** 释放应用级通道引用。 */
    protected onDispose(): void {
        this.operations = null;
    }

    /** 同一时刻仅发一个神位状态或写请求，抛给共用路由处理。 */
    private sendPending(): void {
        if (!this.operations || !this.isInitialized || this.inFlight) {
            return;
        }
        this.inFlight = true;
        this.emit("rainbow.updated", undefined);
        const pending = this.pending;
        void this.operations.deliver(pending?.name ?? Protocol.RAINBOW_STATE, pending?.body ?? {},
            frame => ProtocolRouter.instance.dispatch(this, frame), error => this.onFailure(error));
    }

    /** 校验保存回执的请求号后才替换独立阵容，解除出战等待。 */
    private acceptFormation(result: { requestId: string; formation: RainbowLineup }): void {
        const pending = this.pending;
        if (pending?.name !== Protocol.RAINBOW_LINEUP_SAVE || pending.body.requestId !== result.requestId
            || result.formation.formationId !== pending.body.formationId
            || result.formation.version < pending.body.expectedVersion) {
            throw new Error("彩虹圣殿阵容回执与请求不符");
        }
        RainbowModel.instance.commitLineup(result.formation);
        this.finish();
        pending.done(true);
    }

    /** 确认同一神位、进化档位和真实战斗结果后交付表现。 */
    private acceptChallenge(result: RainbowSettlement): void {
        const pending = this.pending;
        const replayInfo = result.replay as { scenario?: string; outcome?: string };
        const seat = result.state.seats.find(row => row.id === result.seatId);
        if (pending?.name !== Protocol.RAINBOW_CHALLENGE || pending.body.requestId !== result.requestId
            || pending.body.seatId !== result.seatId || pending.body.evolution !== result.evolution || !seat
            || !replayInfo.scenario?.startsWith(`rainbow:${seat.type}:`)
            || result.won !== (replayInfo.outcome === "ATTACKER_WIN")) {
            throw new Error("彩虹圣殿挑战回执与请求不符");
        }
        const replay = BattleReplayUtils.encodeVerified(result.replay);
        RainbowModel.instance.commit(result.state);
        this.finish();
        pending.done(result, replay);
    }

    /** 清理已确认的等待，通知各窗口读取同一次快照。 */
    private finish(): void {
        this.inFlight = false;
        this.pending = null;
        this.emit("rainbow.updated", undefined);
    }

    /** 中断时保留原请求，业务拒绝时解锁并补读可能更新的资格或阵容。 */
    private onFailure(error: unknown): void {
        const pending = this.pending;
        if (error instanceof SocketFailure && error.interrupted) {
            this.inFlight = false;
            this.emit("rainbow.updated", undefined);
        } else {
            this.finish();
            if (pending?.name === Protocol.RAINBOW_LINEUP_SAVE) {
                pending.done(false);
            }
            if (pending) {
                this.refreshVisible();
            }
        }
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "彩虹圣殿请求失败");
        }
    }

    /** 仅当仍等待同一只读请求时清理该回调和显示反馈。 */
    private onReadFailure(name: AuthenticatedGameProtocol, done: unknown, error: unknown): void {
        if (name === Protocol.RAINBOW_HISTORY && this.historyReady === done) {
            this.historyReady = null;
        } else if (name === Protocol.RAINBOW_REPLAY && this.replayReady === done) {
            this.replayReady = null;
        } else {
            return;
        }
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "彩虹圣殿记录读取失败");
        }
    }
}
