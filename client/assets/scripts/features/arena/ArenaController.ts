/** 竞技场的认证协议入口。服务器决定选敌、积分及发奖，页面只使用冻结的结算和战报。 */
import { GameConfig } from "../../config/GameConfig";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { ServerClock } from "../../core/ServerClock";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { RewardBinding } from "../reward/RewardBinding";
import { RewardUtils } from "../reward/utils/RewardUtils";
import { ArenaModel, type ArenaHistory, type ArenaState } from "./ArenaModel";

/** 客户端只暂存同角色结果未知的写请求，重连沿用原编号。 */
interface ArenaCommand {
    readonly protocol: AuthenticatedGameProtocol;
    readonly body: { requestId: string; opponentId?: number; quantity?: number };
}

/** 服务器冻结的本次挑战记录、实际奖励及提交后的积分状态。 */
interface ArenaReceipt {
    readonly requestId: string;
    readonly assetRevision: number;
    readonly record: ArenaHistory;
    readonly replay: object;
    readonly state: ArenaState;
    readonly actual?: unknown;
}

/** 服务器确认购买的票数及真实到账。 */
interface ArenaTicketReceipt {
    readonly requestId: string;
    readonly assetRevision: number;
    readonly quantity: number;
    readonly actual: unknown;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "arena.updated": void;
    }
}

export class ArenaController extends BaseController {
    /** 当前应用的唯一竞技场控制器。 */
    public static readonly instance = new ArenaController();
    /** 应用注入的账号认证发包通道。 */
    private operations: AccountOperations | null = null;
    /** 供应统一通用反馈，避免背包重复提示。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;
    /** 竞技场显示时才能主动查询并接管战报。 */
    private visible = false;
    /** 任一本玩法请求在途期间为 true。 */
    public busy = false;
    /** 结果未知的原写请求，明确回复或账号重置后清空。 */
    private command: ArenaCommand | null = null;
    /** 本次查看的冻结历史条目，只持续到原战报查询完成。 */
    private replaying: ArenaHistory | null = null;
    /** 换对手的旧版界面冷却截止秒；换号重置，不决定服务端对手资格。 */
    private refreshAvailableAt = 0;

    /** 装配共享认证请求及通用发奖展示途径。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 打开竞技场时读权威状态，离开后不弹本页战报。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 打开、跨日及重连后的状态刷新；先解决未确认的原写请求。 */
    public refreshVisible(): void {
        if (this.visible) {
            this.send(this.command?.protocol ?? Protocol.ARENA_STATE, this.command?.body ?? {});
        }
    }

    /** 刷新服务端为当前角色选出的旧版对手。 */
    public refreshOpponents(): void {
        if (this.command) {
            this.refreshVisible();
        } else if (!this.busy && this.refreshCooldown() === 0) {
            const now = ServerClock.instance.nowSeconds();
            const system = GameConfig.instance.getFileByPath("config/system") as { rows: readonly { key: string; value: unknown }[] };
            const seconds = system.rows.find(row => row.key === "pvp_refresh_time")?.value;
            if (now !== null && typeof seconds === "number") {
                this.refreshAvailableAt = now + seconds;
            }
            this.send(Protocol.ARENA_REFRESH, {});
        }
    }

    /** 返回旧版界面换对手的剩余冷却秒，连接尚未校准时等待状态查询。 */
    public refreshCooldown(): number {
        const now = ServerClock.instance.nowSeconds();
        return this.command || now === null ? 0 : Math.max(0, this.refreshAvailableAt - now);
    }

    /** 选定一个当前对手发起挑战，服务端判断免费次数或消耗门票。 */
    public challenge(opponentId: number): void {
        this.execute(Protocol.ARENA_CHALLENGE, { opponentId });
    }

    /** 提交明确确认过的门票数量。 */
    public buyTicket(quantity: number): void {
        this.execute(Protocol.ARENA_TICKET_BUY, { quantity });
    }

    /** 读取历史中的同一份战报；播放不发生新扣费或领奖。 */
    public replay(record: ArenaHistory): void {
        if (this.busy || this.command) {
            return;
        }
        this.replaying = record;
        this.send(Protocol.ARENA_REPLAY, { battleId: record.battleId });
    }

    /** 消费原竞技场回复，更新本模块 Model 后再发页面事件。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        const model = ArenaModel.instance;
        switch (protocol) {
            case Protocol.ARENA_STATE:
            case Protocol.ARENA_REFRESH:
                model.state = data as ArenaState;
                break;
            case Protocol.ARENA_CHALLENGE:
                this.acceptChallenge(data as ArenaReceipt);
                break;
            case Protocol.ARENA_REPLAY: {
                const record = this.replaying;
                if (this.visible && record) {
                    model.setBattle({ bytes: BattleReplayUtils.encodeVerified(data as object), won: record.won,
                        notice: `历史战报 · 积分 ${ArenaController.scoreDelta(record.scoreDelta)}`, rewards: [] });
                }
                this.replaying = null;
                break;
            }
            case Protocol.ARENA_TICKET_BUY: {
                const result = data as ArenaTicketReceipt;
                this.rewards?.restoreActual(result.requestId, result.assetRevision, result.actual);
                break;
            }
        }
        this.busy = false;
        this.command = null;
        this.emit("arena.updated", undefined);
        if (protocol === Protocol.ARENA_TICKET_BUY) {
            this.refreshVisible();
        }
    }

    /** 格式化服务端已冻结的本场积分增减。 */
    public static scoreDelta(points: number): string {
        return points >= 0 ? `+${points}` : String(points);
    }

    /** 登记本玩法已实现的配对、历史和结算协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.ARENA_STATE, Protocol.ARENA_REFRESH, Protocol.ARENA_CHALLENGE,
            Protocol.ARENA_REPLAY, Protocol.ARENA_TICKET_BUY,
        ]));
    }

    /** 账号退出后撤销旧页面关联，只保留服务端已经提交的记录。 */
    protected onResetSession(): void {
        this.visible = false;
        this.busy = false;
        this.command = null;
        this.replaying = null;
        this.refreshAvailableAt = 0;
        ArenaModel.instance.reset();
    }

    /** 随应用退出释放认证入口和奖励队列。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 竞技场写请求统一生成并保留原编号。 */
    private execute(protocol: AuthenticatedGameProtocol, fields: Omit<ArenaCommand["body"], "requestId">): void {
        if (!this.operations || this.busy || this.command) {
            return;
        }
        const body = { ...fields, requestId: RequestIdUtils.create() };
        this.command = { protocol, body };
        this.send(protocol, body);
    }

    /** 同一时刻只发送一个操作，校验本次回包对应所选对手或数量。 */
    private send(protocol: AuthenticatedGameProtocol, body: object): void {
        const operations = this.operations;
        if (!operations || this.busy) {
            return;
        }
        this.busy = true;
        this.emit("arena.updated", undefined);
        void operations.deliver(protocol, body, frame => {
            const command = this.command;
            if (command?.body.opponentId !== undefined) {
                const receipt = frame.body as ArenaReceipt;
                if (receipt.requestId !== command.body.requestId || receipt.record.opponentId !== command.body.opponentId) {
                    throw new Error("竞技场战斗回包与本次挑战不符");
                }
            } else if (command?.body.quantity !== undefined) {
                const receipt = frame.body as ArenaTicketReceipt;
                if (receipt.requestId !== command.body.requestId || receipt.quantity !== command.body.quantity) {
                    throw new Error("竞技场门票回包与本次购买不符");
                }
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failed(protocol, error));
    }

    /** 竞技场页播放当前结算；离开原页则只反馈实际奖励。 */
    private acceptChallenge(result: ArenaReceipt): void {
        const model = ArenaModel.instance;
        if (this.visible) {
            const bytes = BattleReplayUtils.encodeVerified(result.replay);
            const rewards = result.actual
                ? RewardUtils.fromActual(result.requestId, result.assetRevision, result.actual)?.items ?? [] : [];
            model.setBattle({ bytes, won: result.record.won,
                notice: `竞技场积分 ${ArenaController.scoreDelta(result.record.scoreDelta)}`,
                rewards: rewards.map(item => ({ itemId: item.itemId, quantity: item.credited })) });
        } else if (result.actual) {
            this.rewards?.restoreActual(result.requestId, result.assetRevision, result.actual);
        }
        model.state = result.state;
    }

    /** 已拒绝的操作刷新权威状态，模糊结果保持原请求等待重连。 */
    private failed(protocol: AuthenticatedGameProtocol, error: unknown): void {
        const interrupted = error instanceof SocketFailure && error.interrupted;
        if (!interrupted) {
            this.command = null;
        }
        this.replaying = null;
        this.busy = false;
        this.emit("arena.updated", undefined);
        if (!this.visible) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "竞技场请求失败");
        if (!interrupted && protocol !== Protocol.ARENA_STATE) {
            this.refreshVisible();
        }
    }
}
