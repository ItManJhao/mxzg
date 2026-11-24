/** 幻境之塔的认证协议入口。保存专用阵容和结算后提交塔状态，背包与角色仍使用统一资产快照。 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { FormationSaveRequest } from "../hero/data/FormationData";
import type { RewardBinding } from "../reward/RewardBinding";
import { RewardUtils } from "../reward/utils/RewardUtils";
import { TowerModel, type TowerState } from "./TowerModel";

/** 在同一次登录内保留结果未知的幂等请求，重连后沿用原编号与预期报价。 */
interface TowerCommand {
    /** 原写请求的协议。 */
    readonly protocol: AuthenticatedGameProtocol;
    /** 与首发一致的操作参数。 */
    readonly body: { requestId: string; floor?: number; milestoneId?: number; maxDiamonds?: number };
    /** 结算用途决定展示战报或通用奖励反馈。 */
    readonly action: "CHALLENGE" | "SWEEP" | "MILESTONE";
}

/** 服务端冻结的挑战、扫荡或里程碑结果。 */
interface TowerReceipt {
    readonly requestId: string;
    readonly assetRevision: number;
    readonly action: TowerCommand["action"];
    readonly floor: number;
    readonly won: boolean;
    readonly replay?: object;
    readonly actual?: unknown;
    readonly state: TowerState;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "tower.updated": void;
    }
}

export class TowerController extends BaseController {
    /** 应用装配的唯一幻境之塔控制器。 */
    public static readonly instance = new TowerController();
    /** 认证通道由应用注入，离开场景时清理。 */
    private operations: AccountOperations | null = null;
    /** 扫荡和里程碑进入应用唯一的奖励展示。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;
    /** 塔页面显示时可以主动刷新并接管当前挑战结果。 */
    private visible = false;
    /** 等待当前操作回包时为 true，完成或失败后允许新操作。 */
    public busy = false;
    /** 断线未知结果保持不变，收到明确结果或切换身份后清空。 */
    private command: TowerCommand | null = null;
    /** 当前编辑窗口的专用阵容保存回调，收到结果后释放。 */
    private saved: ((success: boolean) => void) | null = null;

    /** 注入现有的认证通道和奖励展示。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 进入塔时取得当前进度，离开时阻止后来打开旧战斗。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 进页、自然恢复或重连发起查询；结果不明时先安全重发原操作。 */
    public refreshVisible(): void {
        if (!this.visible || this.busy) {
            return;
        }
        const command = this.command;
        this.send(command?.protocol ?? Protocol.TOWER_STATE, command?.body ?? {});
    }

    /** 向服务端保存独立塔阵容；当前状态随响应一起返回。 */
    public saveFormation(draft: Omit<FormationSaveRequest, "requestId">, saved: (success: boolean) => void): void {
        if (this.busy || this.command) {
            saved(false);
            return;
        }
        this.saved = saved;
        this.send(Protocol.TOWER_FORMATION_SAVE, draft);
    }

    /** 提交当前塔层挑战，结算后交给当前页面播放原战报。 */
    public challenge(floor: number): void {
        this.execute(Protocol.TOWER_CHALLENGE, "CHALLENGE", { floor });
    }

    /** 扫荡当前最高通关层，服务器确认报价后发奖。 */
    public sweep(floor: number, maxDiamonds: number): void {
        this.execute(Protocol.TOWER_SWEEP, "SWEEP", { floor, maxDiamonds });
    }

    /** 领取达到指定层数的独立里程碑。 */
    public claimMilestone(milestoneId: number): void {
        this.execute(Protocol.TOWER_MILESTONE_CLAIM, "MILESTONE", { milestoneId });
    }

    /** 根据真回包提交塔状态和相应反馈；不修改背包。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        const model = TowerModel.instance;
        if (protocol === Protocol.TOWER_STATE || protocol === Protocol.TOWER_FORMATION_SAVE) {
            model.state = data as TowerState;
        } else {
            this.acceptSettlement(data as TowerReceipt);
        }
        const saved = this.saved;
        this.saved = null;
        this.command = null;
        this.busy = false;
        saved?.(true);
        this.emit("tower.updated", undefined);
    }

    /** 模块初始化时登记本玩法的状态、保存及结算回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.TOWER_STATE, Protocol.TOWER_FORMATION_SAVE, Protocol.TOWER_CHALLENGE,
            Protocol.TOWER_SWEEP, Protocol.TOWER_MILESTONE_CLAIM,
        ]));
    }

    /** 账号切换由应用统一通知，清理旧操作和塔进度。 */
    protected onResetSession(): void {
        this.visible = false;
        this.busy = false;
        this.command = null;
        this.saved = null;
        TowerModel.instance.reset();
    }

    /** 随应用回收结束注入引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 只接受一个在途幂等操作，下一步须等待原服务端结算。 */
    private execute(
        protocol: AuthenticatedGameProtocol,
        action: TowerCommand["action"],
        fields: Omit<TowerCommand["body"], "requestId">,
    ): void {
        if (!this.operations || this.busy || this.command) {
            return;
        }
        const body = { ...fields, requestId: RequestIdUtils.create() };
        this.command = { protocol, action, body };
        this.send(protocol, body);
    }

    /** 认证交付前先检查对应用途及原请求号。 */
    private send(protocol: AuthenticatedGameProtocol, body: object): void {
        const operations = this.operations;
        if (!operations || this.busy) {
            return;
        }
        this.busy = true;
        this.emit("tower.updated", undefined);
        void operations.deliver(protocol, body, frame => {
            const command = this.command;
            if (command) {
                const receipt = frame.body as TowerReceipt;
                if (receipt.requestId !== command.body.requestId || receipt.action !== command.action
                    || (command.body.floor !== undefined && receipt.floor !== command.body.floor)) {
                    throw new Error("幻境之塔回包与本次操作不符");
                }
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failed(protocol, error));
    }

    /** 战场和通用奖励窗互斥，同一真实奖励只展示一次。 */
    private acceptSettlement(result: TowerReceipt): void {
        const model = TowerModel.instance;
        if (result.action === "CHALLENGE" && this.visible) {
            if (!result.replay) {
                throw new Error("幻境之塔挑战缺少原始战报");
            }
            const bytes = BattleReplayUtils.encodeVerified(result.replay);
            const rewards = result.actual
                ? RewardUtils.fromActual(result.requestId, result.assetRevision, result.actual)?.items ?? [] : [];
            model.setBattle({ bytes, won: result.won, notice: `幻境之塔第 ${result.floor} 层`,
                rewards: rewards.map(item => ({ itemId: item.itemId, quantity: item.credited })) });
        } else if (result.actual) {
            this.rewards?.restoreActual(result.requestId, result.assetRevision, result.actual);
        }
        model.state = result.state;
    }

    /** 确定失败后重新查询，断线等待统一认证恢复或玩家主动确认结果。 */
    private failed(protocol: AuthenticatedGameProtocol, error: unknown): void {
        const interrupted = error instanceof SocketFailure && error.interrupted;
        if (!interrupted) {
            this.command = null;
        }
        this.busy = false;
        const saved = this.saved;
        this.saved = null;
        saved?.(false);
        this.emit("tower.updated", undefined);
        if (!this.visible) {
            return;
        }
        UIManager.instance.toast(error instanceof Error ? error.message : "幻境之塔请求失败");
        if (!interrupted && protocol !== Protocol.TOWER_STATE) {
            this.refreshVisible();
        }
    }
}
