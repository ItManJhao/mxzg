/** 日常副本协议控制器。查看、挑战与扫荡经认证通道发送，服务器在挑战回包前完成结算。 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { RewardBinding } from "../reward/RewardBinding";
import { RewardUtils } from "../reward/utils/RewardUtils";
import { DailyDungeonModel, type DailyDungeonState } from "./DailyDungeonModel";

/** 一次在途挑战或扫荡意图，重连沿用发送时的编号、模式和报价。 */
interface DungeonCommand {
    readonly requestId: string;
    readonly sweep: boolean;
    readonly maxDiamonds: number;
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
        "daily-dungeon.updated": undefined;
    }
}

export class DailyDungeonController extends BaseController {
    /** 应用装配的副本协议接收者，界面只调用公开操作。 */
    public static readonly instance = new DailyDungeonController();

    /** 当前应用共享的账号操作入口，卸载时释放。 */
    private operations: AccountOperations | null = null;
    /** 扫荡无战报，真实回执交给应用的通用奖励窗。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;
    /** 页面可见时开放重连后的状态刷新或原操作确认。 */
    private visible = false;
    /** true 表示只允许等待在途请求，禁止重复点击。 */
    private pending = false;
    /** 回包未确认时保留原操作，明确拒绝、交付成功或换号后清空。 */
    private command: DungeonCommand | null = null;

    /** 装配认证发包和共用奖励队列，不保存身份凭证。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 页面以此禁用重复发送；断线待确认时下次点击只重新交付原命令。 */
    public get busy(): boolean {
        return this.pending;
    }

    /** 页面出现时读取副本进度，离开时不取消已发送的业务操作。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 页面打开、跨日及重新鉴权查询副本状态；原结算未知时先确认原请求。 */
    public refreshVisible(): void {
        if (!this.visible || this.pending || !this.operations) {
            return;
        }
        if (this.command) {
            this.sendChallenge(this.command);
            return;
        }
        this.send(Protocol.DAILY_DUNGEON_LIST, {});
    }

    /** 以已显示的模式和价格提交一次，服务器核定次数、资格和最终扣款。 */
    public challenge(): void {
        if (!this.operations || this.pending) {
            return;
        }
        if (this.command) {
            this.sendChallenge(this.command);
            return;
        }
        const state = DailyDungeonModel.instance.state;
        if (!state?.canChallenge) {
            return;
        }
        this.sendChallenge({ requestId: RequestIdUtils.create(), sweep: state.cleared,
            maxDiamonds: state.nextCostDiamonds });
    }

    /** 接收已验名和匹配的协议数据，先更新模块状态再发界面刷新事件。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        if (protocol === Protocol.DAILY_DUNGEON_LIST) {
            DailyDungeonModel.instance.state = value as DailyDungeonState;
        } else if (protocol === Protocol.DAILY_DUNGEON_CHALLENGE) {
            this.acceptBattle(value as DungeonReceipt);
            this.command = null;
        } else {
            return;
        }
        this.pending = false;
        this.emit("daily-dungeon.updated", undefined);
    }

    /** 只登记当前已实现的日常副本查看、挑战与扫荡消息。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.DAILY_DUNGEON_LIST, Protocol.DAILY_DUNGEON_CHALLENGE]));
    }

    /** 换号时断开旧页面和旧意图，统一账号层负责拦截迟到回包。 */
    protected onResetSession(): void {
        this.visible = false;
        this.pending = false;
        this.command = null;
        DailyDungeonModel.instance.reset();
    }

    /** 随应用卸载释放注入的通道。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 为同一操作冻结请求编号，连接重建后按原参数查询服务端回执。 */
    private sendChallenge(command: DungeonCommand): void {
        this.command = command;
        this.send(Protocol.DAILY_DUNGEON_CHALLENGE, command);
    }

    /** 同一时刻只交付一个已认证请求，挑战回包必须匹配本次编号和模式。 */
    private send(name: typeof Protocol.DAILY_DUNGEON_LIST | typeof Protocol.DAILY_DUNGEON_CHALLENGE,
        data: object): void {
        this.pending = true;
        this.emit("daily-dungeon.updated", undefined);
        void this.operations!.deliver(name, data, frame => {
            if (name === Protocol.DAILY_DUNGEON_CHALLENGE) {
                const result = frame.body as DungeonReceipt;
                if (result.requestId !== this.command?.requestId || result.sweep !== this.command.sweep) {
                    throw new Error("副本回包与本次操作不符");
                }
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failed(name, error));
    }

    /** 挑战交给既有战报播放器，扫荡直接交给通用奖励提示，库存始终来自统一快照。 */
    private acceptBattle(result: DungeonReceipt): void {
        const model = DailyDungeonModel.instance;
        if (result.sweep) {
            model.state = result.state;
            this.rewards?.restoreActual(result.battleId, result.assetRevision, result.actual);
            return;
        }
        if (!result.replay) {
            throw new Error("金币副本挑战回包缺少战报");
        }
        const notice = result.won ? RewardUtils.fromActual(result.battleId, result.assetRevision, result.actual) : null;
        model.applyBattle(result.state, {
            bytes: BattleReplayUtils.encodeVerified(result.replay),
            won: result.won,
            rewards: notice?.items.map(item => ({ itemId: item.itemId, quantity: item.credited })) ?? [],
        });
    }

    /** 确定失败刷新权威次数与价格，连接中断保留原操作等待同会话恢复。 */
    private failed(protocol: ProtocolName, error: unknown): void {
        this.pending = false;
        const interrupted = error instanceof SocketFailure && error.interrupted;
        if (!interrupted) {
            this.command = null;
        }
        this.emit("daily-dungeon.updated", undefined);
        if (!this.visible) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "副本请求失败");
        if (!interrupted && protocol === Protocol.DAILY_DUNGEON_CHALLENGE) {
            this.refreshVisible();
        }
    }
}
