/**
 * 永恒梦境认证协议入口。接收最新进度与已冻结战报，提交 DreamlandModel 后通知页面。
 * 断线操作使用同一请求键补读。实际奖励交应用统一展示，库存和角色由统一资产快照维护。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import {
    Protocol, type DreamlandAction, type DreamlandActData, type DreamlandActRequest, type DreamlandStateData, type ProtocolName,
} from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { FormationSaveRequest } from "../hero/data/FormationData";
import type { RewardBinding } from "../reward/RewardBinding";
import { DreamlandModel } from "./DreamlandModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "dreamland.updated": void;
    }
}

export class DreamlandController extends BaseController {
    /** 应用装配的唯一永恒梦境控制器。 */
    public static readonly instance = new DreamlandController();

    /** 所有请求经应用注入的账号通道发送，应用销毁时释放。 */
    private operations: AccountOperations | null = null;

    /** 已提交资产变更的通用奖励展示入口，销毁时释放。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;

    /** 梦境主页显示时主动补读，关页仍接收已经发出的确认结果。 */
    private visible = false;

    /** 当前正在等待回包，完成后允许下一次点击或自然查询。 */
    private inFlight = false;

    /** 认证中断时保留原操作，恢复时以原键读取持久结果。 */
    private pending: DreamlandActRequest | null = null;

    /** 阵容编辑窗等待当前保存结果的回调。明确失败或收到确认时释放。 */
    private saved: ((success: boolean) => void) | null = null;

    /** 页面禁用重复操作，允许用刷新按钮恢复断线未知结果。 */
    public get busy(): boolean {
        return this.inFlight;
    }

    /** 服务端处理明确前，禁止从同一界面提交另一项写入。 */
    public get awaitingResult(): boolean {
        return this.pending !== null;
    }

    /** 注入当前应用的认证通道及真实奖励展示。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 页面打开立刻读取权威状态，关闭仅停止主动查询。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 打开、到达服务器时间或认证恢复后，优先补读结果未知的同一操作。 */
    public refreshVisible(): void {
        if (this.visible) {
            this.send(this.pending);
        }
    }

    /** 用当前进度版本提交挑战、选增益、推进、退出或领奖。 */
    public act(action: Exclude<DreamlandAction, "SAVE_FORMATION">, choice?: number): void {
        const state = DreamlandModel.instance.snapshot?.state;
        if (state && !this.pending && !this.inFlight) {
            this.execute({ action, expectedVersion: state.version, ...(choice === undefined ? {} : { choice }) });
        }
    }

    /** 以阵容编辑窗的原版本保存梦境阵容，成功时才允许其关闭。 */
    public saveFormation(draft: Omit<FormationSaveRequest, "requestId">, saved: (success: boolean) => void): void {
        if (!this.operations || this.pending || this.inFlight) {
            saved(false);
            return;
        }
        this.saved = saved;
        this.execute({ ...draft, action: "SAVE_FORMATION" });
    }

    /** 按真实回包提交状态，实际奖励通过现有队列消费。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.DREAMLAND_STATE:
                this.acceptState(data as DreamlandStateData);
                break;
            case Protocol.DREAMLAND_ACT: {
                const receipt = data as DreamlandActData;
                this.acceptState(receipt.state);
                if (receipt.actual) {
                    this.rewards?.restoreActual(receipt.requestId, receipt.assetRevision, receipt.actual);
                }
                break;
            }
            default:
                return;
        }
        this.pending = null;
        this.inFlight = false;
        const saved = this.saved;
        this.saved = null;
        saved?.(true);
        this.emit("dreamland.updated", undefined);
    }

    /** 模块初始化时登记实际开放的两个协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.DREAMLAND_STATE, Protocol.DREAMLAND_ACT]));
    }

    /** 由应用层在换号时统一清理操作和玩法状态。 */
    protected onResetSession(): void {
        this.visible = false;
        this.inFlight = false;
        this.pending = null;
        this.saved = null;
        DreamlandModel.instance.reset();
    }

    /** 应用销毁后撤销对认证通道和奖励队列的引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 生成一次性持久请求编号，重复补读沿用完整请求。 */
    private execute(fields: Omit<DreamlandActRequest, "requestId">): void {
        this.pending = { ...fields, requestId: RequestIdUtils.create() };
        this.send(this.pending);
    }

    /** 交付前核对同一个写入请求和动作，防止错误回包引发领奖或推进。 */
    private send(command: DreamlandActRequest | null): void {
        if (!this.operations || this.inFlight) {
            return;
        }
        const protocol = command ? Protocol.DREAMLAND_ACT : Protocol.DREAMLAND_STATE;
        this.inFlight = true;
        this.emit("dreamland.updated", undefined);
        void this.operations.deliver(protocol, command ?? {}, frame => {
            if (command) {
                const receipt = frame.body as DreamlandActData;
                if (receipt.requestId !== command.requestId || receipt.action !== command.action) {
                    throw new Error("永恒梦境回包与本次操作不符");
                }
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.failed(command, error));
    }

    /** 先核验附带战报，再一次性提交进度和可恢复演出。 */
    private acceptState(state: DreamlandStateData): void {
        const battle = state.battle;
        if ((state.phase === "RESULT") !== Boolean(battle)) {
            throw new Error("永恒梦境状态与战报不符");
        }
        if (battle && (battle.floor !== state.currentFloor + 1
            || (battle.replay as { scenario?: unknown }).scenario !== `dreamland:${battle.floor}`)) {
            throw new Error("永恒梦境战报与当前层不符");
        }
        const replay = battle ? BattleReplayUtils.encodeVerified(battle.replay) : null;
        DreamlandModel.instance.commit(state, replay);
    }

    /** 断线后保留请求和保存回调，明确失败时释放两者并读取最新进度。 */
    private failed(command: DreamlandActRequest | null, error: unknown): void {
        const interrupted = error instanceof SocketFailure && error.interrupted;
        this.inFlight = false;
        if (!interrupted) {
            this.pending = null;
            const saved = this.saved;
            this.saved = null;
            saved?.(false);
        }
        this.emit("dreamland.updated", undefined);
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "永恒梦境请求失败");
            if (!interrupted && command) {
                this.refreshVisible();
            }
        }
    }
}
