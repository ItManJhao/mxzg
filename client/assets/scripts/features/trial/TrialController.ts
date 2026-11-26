/**
 * 勇者试炼的认证模块入口。提交服务端状态、冻结战报和实际发奖回执，
 * 断线时保留原请求编号以补读，窗口关闭不影响已提交的操作。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName, type TrialAssistance, type TrialCommand, type TrialSettlement, type TrialState } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BattleReplayUtils } from "../battle/utils/BattleReplayUtils";
import type { FormationSaveRequest } from "../hero/data/FormationData";
import type { RewardBinding } from "../reward/RewardBinding";
import { TrialModel } from "./TrialModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "trial.updated": void;
    }
}

export class TrialController extends BaseController {
    /** 由应用装配和管理会话生命周期的试炼控制器。 */
    public static readonly instance = new TrialController();

    /** 游戏服认证通道，应用销毁时释放。 */
    private operations: AccountOperations | null = null;

    /** 将已发放奖品交由统一奖励队列，在会话内消费。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;

    /** 主页面显示时在重连后自动补读，关闭后不额外查询。 */
    private visible = false;

    /** 正在等主进度或写入回包，防止并发提交同一个版本。 */
    private inFlight = false;

    /** 当前助战列表的查询中标记，和主进度请求互相独立。 */
    private loadingAssistance = false;

    /** 发送后等待结果的原命令，遇到网络中断时按同一个请求键补查。 */
    private pending: TrialCommand | null = null;

    /** 阵容页等待确认的回调，成功、拒绝或切换账号时清理。 */
    private formationSaved: ((success: boolean) => void) | null = null;

    /** 等待请求时禁用写操作；断线未确认时允许玩家按原键重试。 */
    public get busy(): boolean {
        return this.inFlight;
    }

    /** 存在未确认的写操作时阻止另开新命令。 */
    public get awaitingResult(): boolean {
        return !!this.pending;
    }

    /** 绑定应用认证通道和玩家奖励展示。 */
    public configure(operations: AccountOperations, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 打开玩家入口时读取试炼进度；关闭仅停止主动刷新。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        }
    }

    /** 跨日、认证恢复和手动刷新优先补读尚未确认的写操作。 */
    public refreshVisible(): void {
        if (this.visible) {
            this.send(this.pending);
        }
    }

    /** 只读取好友支援名单，账户层会在换号时丢弃在途结果。 */
    public loadAssistance(): void {
        if (!this.operations || !this.isInitialized || this.loadingAssistance) {
            return;
        }
        const startingVersion = TrialModel.instance.snapshot?.state.version ?? 0;
        this.loadingAssistance = true;
        void this.operations.deliver(Protocol.TRIAL_ASSISTANCE, {}, frame => {
            this.loadingAssistance = false;
            ProtocolRouter.instance.dispatch(this, frame);
            const model = TrialModel.instance;
            const currentVersion = model.snapshot?.state.version ?? 0;
            // 主进度写入与好友查询可并行，若旧查询跨过本次写入则补读新版本。
            if (this.visible && currentVersion > startingVersion && model.assistance?.version !== currentVersion) {
                this.loadAssistance();
            }
        }, error => {
            this.loadingAssistance = false;
            if (this.visible && !(error instanceof SocketFailure && error.interrupted)) {
                UIManager.instance.toast(error instanceof Error ? error.message : "试炼助战读取失败");
            }
        });
    }

    /** 以当前确认版本提交试炼状态操作；操作结果由服务器校验。 */
    public act(action: TrialCommand["action"], fields: Pick<TrialCommand, "choice" | "targetId" | "heroIds"> = {}): void {
        const state = TrialModel.instance.snapshot?.state;
        if (state && !this.pending && !this.inFlight) {
            this.execute({ ...fields, action, expectedVersion: state.version });
        }
    }

    /** 提交阵容页的原版本，只有收到同一请求回执才允许出战。 */
    public saveFormation(draft: Omit<FormationSaveRequest, "requestId">, done: (success: boolean) => void): void {
        if (!this.operations || this.pending || this.inFlight || !TrialModel.instance.snapshot) {
            done(false);
            return;
        }
        this.formationSaved = done;
        this.execute({ ...draft, action: "saveFormation" });
    }

    /** 战报退出后确认本场已展示，同一会话回到试炼不重复播放或弹奖。 */
    public closeBattle(battleId: string): void {
        TrialModel.instance.closeBattle(battleId);
    }

    /** 按路由交付权威进度，更新唯一 Model 再通知各页。 */
    public onNotify(name: ProtocolName, data: unknown): void {
        switch (name) {
            case Protocol.TRIAL_STATE:
                this.acceptState(data as TrialState);
                this.finishRequest();
                break;
            case Protocol.TRIAL_ASSISTANCE:
                TrialModel.instance.commitAssistance(data as TrialAssistance);
                this.emit("trial.updated", undefined);
                break;
            case Protocol.TRIAL_ACT:
                this.acceptSettlement(data as TrialSettlement);
                break;
            default:
                break;
        }
    }

    /** 登记三条当前服务端已处理的认证协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.TRIAL_STATE, Protocol.TRIAL_ACT, Protocol.TRIAL_ASSISTANCE]));
    }

    /** 由应用层发起换号清理，连接和旧回包隔离仍归账号通道。 */
    protected onResetSession(): void {
        this.visible = false;
        this.inFlight = false;
        this.loadingAssistance = false;
        this.pending = null;
        this.formationSaved = null;
        TrialModel.instance.reset();
    }

    /** 应用销毁后释放认证和奖励展示引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 为一次玩家操作生成持久编号，重连沿用全部原字段。 */
    private execute(command: Omit<TrialCommand, "requestId">): void {
        this.pending = { ...command, requestId: RequestIdUtils.create() };
        this.send(this.pending);
    }

    /** 提交或查询，通过编号和动作校验同一个原始回执。 */
    private send(command: TrialCommand | null): void {
        if (!this.operations || !this.isInitialized || this.inFlight) {
            return;
        }
        this.inFlight = true;
        this.emit("trial.updated", undefined);
        void this.operations.deliver(command ? Protocol.TRIAL_ACT : Protocol.TRIAL_STATE, command ?? {}, frame => {
            if (command) {
                const result = frame.body as TrialSettlement;
                if (result.requestId !== command.requestId || result.action !== command.action) {
                    throw new Error("试炼回执与本次请求不符");
                }
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.onFailure(command, error));
    }

    /** 先核验附带战报，再原子更新进度。战报解析失败不标记业务成功。 */
    private acceptState(state: TrialState): void {
        const battle = state.battle;
        if (battle && (!state.nodes.some(node => node.node === battle.node && node.type === "battle")
            || (battle.replay as { scenario?: unknown }).scenario !== `trial:${state.difficulty}:${battle.node}`)) {
            throw new Error("试炼战报关卡与本次进度不符");
        }
        const replay = battle ? BattleReplayUtils.encodeVerified(battle.replay) : null;
        TrialModel.instance.commit(state, replay);
    }

    /** 结算和进度已经确认后才展示资产变化，普通战斗等战报关闭。 */
    private acceptSettlement(result: TrialSettlement): void {
        this.acceptState(result.state);
        if (result.actual) {
            if (result.action === "fight") {
                TrialModel.instance.rememberFightReward(result);
            } else {
                this.rewards?.restoreActual(result.requestId, result.assetRevision, result.actual);
            }
        }
        this.finishRequest();
    }

    /** 释放等待中的写请求，同时在需要时更新助战资格和已使用状态。 */
    private finishRequest(): void {
        this.pending = null;
        this.inFlight = false;
        const done = this.formationSaved;
        this.formationSaved = null;
        done?.(true);
        this.emit("trial.updated", undefined);
        const state = TrialModel.instance.snapshot?.state;
        if (this.visible && state?.difficulty && state.version !== TrialModel.instance.assistance?.version) {
            this.loadAssistance();
        }
    }

    /** 断线保留原请求等补读，明确业务拒绝则回到最新服务器进度。 */
    private onFailure(command: TrialCommand | null, error: unknown): void {
        this.inFlight = false;
        const interrupted = error instanceof SocketFailure && error.interrupted;
        if (!interrupted) {
            this.pending = null;
            const done = this.formationSaved;
            this.formationSaved = null;
            done?.(false);
        }
        this.emit("trial.updated", undefined);
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "试炼请求失败");
            if (command && !interrupted) {
                this.refreshVisible();
            }
        }
    }
}
