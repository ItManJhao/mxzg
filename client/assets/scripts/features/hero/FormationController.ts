/** 主线阵容模块控制器：组织原保存回执与统一快照确认，缺状态时有界鉴权；不持有View或未保存草稿。 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { GameLog } from "../../core/GameLog";
import { HeroRosterEvent } from "./utils/HeroRosterEvent";
import { FormationEvent } from "./utils/FormationEvent";
import { HeroRosterModel } from "./HeroRosterModel";
import { FormationSaveModel, FormationSaveState } from "./FormationSaveModel";
import type { FormationSaveRequest } from "./data/FormationData";

/** 一轮原保存或ACK同步确认任务；只合并业务操作，身份隔离仍归应用交付口。 */
interface FormationSaveTask {
    /** 本轮等待原请求交付及至多一次鉴权确认，结束或重置后释放。 */
    promise: Promise<void>;
}

export class FormationController extends BaseController {
    /** 应用唯一模块，窗口开关不创建或销毁。 */
    public static readonly instance = new FormationController(FormationSaveModel.instance, HeroRosterModel.instance);
    /** 应用注入的业务请求交付口；只回调当前身份的结果，模块不持有token，未装配时拒绝请求。 */
    private send: ((body: FormationSaveRequest, received: (frame: GameFrame) => void,
        failed: (error: unknown) => void) => Promise<void>) | null = null;
    /** 应用复用现有重新鉴权首包，成功/失败均已隔离旧身份；未装配时保留显式同步重试。 */
    private refreshSnapshot: ((received: () => void, failed: (error: unknown) => void) => Promise<void>) | null = null;
    /** 当前业务任务先于通知登记；页面关闭保留，身份重置撤销，旧续段不能覆盖新任务。 */
    private saveTask: FormationSaveTask | null = null;

    /**
     * 注入数据所有者，不注入界面。
     * @param model 应用持有的唯一请求/回执过程状态。
     * @param heroes 已由统一同步提交的权威英雄和阵容，仅读取确认版本。
     */
    constructor(
        private readonly model: FormationSaveModel,
        private readonly heroes: HeroRosterModel,
    ) {
        super();
    }

    /** 注入原保存交付及一次重新鉴权能力，不建立新通道或额外资产查询。 */
    public configure(
        send: NonNullable<FormationController["send"]>,
        refreshSnapshot: FormationController["refreshSnapshot"] = null,
    ): void {
        this.send = send;
        this.refreshSnapshot = refreshSnapshot;
    }

    /** 按模块生命周期登记回执和统一状态通知，页面关闭不解除。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.FORMATION_SAVE]));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.synchronized));
    }

    /** 应用通知清空业务过程状态；请求结果的身份隔离已在应用交付口完成。 */
    protected onResetSession(): void {
        this.saveTask = null;
        this.model.reset();
        this.notify();
    }

    /** 明确列出本模块接收的协议；回执不提交权威阵容。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.FORMATION_SAVE: this.onSaved(value); break;
            default:
                GameLog.shared.warnOnce("MODULE", "FormationController", "UNHANDLED:" + protocol, "忽略非阵容保存协议：" + protocol);
        }
    }

    /** 校验ACK关联并保留原意图，只有HeroRosterController提交足够新阵容才完成。 */
    private onSaved(value: unknown): void {
        const pending = this.model.snapshot.pending;
        if (!pending) {
            return;
        }
        const body = value as { requestId?: unknown; version?: unknown };
        if (!body || body.requestId !== pending.requestId
            || !Number.isSafeInteger(body.version)
            || Number(body.version) < pending.expectedVersion) {
            throw new Error("阵容保存回执无效");
        }
        this.model.replace({
            busy: true,
            pending,
            acknowledged: Number(body.version),
            confirmedRequestId: pending.requestId,
            message: "已收到保存回执，正在确认服务器状态…",
        });
        this.synchronized();
        if (this.model.snapshot.acknowledged !== null) {
            this.notify();
        }
    }

    /** 只检查权威快照是否已达到回执版本；从不反向写入资产。 */
    private synchronized = (): void => {
        const state = this.model.snapshot;
        if (state.acknowledged === null) {
            return;
        }
        const current = this.heroes.snapshot.mainFormation;
        if (current && current.version >= state.acknowledged) {
            this.model.replace({
                busy: false,
                pending: null,
                acknowledged: null,
                confirmedRequestId: state.confirmedRequestId,
                message: "阵容已保存",
            });
            this.notify();
        }
    };

    /**
     * 显式保存或同步确认；ACK已到只重取统一快照，无ACK才按原编号和参数重试保存。
     * 重复点击共用同一任务；Promise完成不代表已同步，调用方仍读取Model确认状态。
     */
    public save(draft: Omit<FormationSaveRequest, "requestId">): Promise<void> {
        if (this.saveTask) {
            return this.saveTask.promise;
        }
        const state = this.model.snapshot;
        if (!this.isInitialized || !this.send || (state.busy && state.acknowledged === null)) {
            return Promise.resolve();
        }
        if (state.acknowledged !== null && !state.pending) {
            throw new Error("阵容确认进度缺少原保存意图");
        }
        const pending = state.pending || {
            ...draft,
            slots: draft.slots.map(slot => ({ ...slot })),
            requestId: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                const n = Math.floor(Math.random() * 16);
                return (c === "x" ? n : (n & 3) | 8).toString(16);
            }),
        };
        const task: FormationSaveTask = { promise: Promise.resolve() };
        this.saveTask = task;
        task.promise = Promise.resolve().then(() => this.confirmSave(task, pending));
        this.update({
            ...state,
            busy: true,
            pending,
            confirmedRequestId: state.acknowledged !== null ? state.confirmedRequestId : undefined,
            message: state.acknowledged === null ? "正在保存阵容…" : "正在重新确认服务器阵容…",
        });
        return task.promise;
    }

    /** 本轮至多补一次鉴权；同步回调只观察，失败或旧快照均保留ACK及原参数供明确重试。 */
    private async confirmSave(task: FormationSaveTask, pending: FormationSaveRequest): Promise<void> {
        if (this.saveTask !== task) {
            return;
        }
        try {
            if (this.model.snapshot.acknowledged === null) {
                await this.send!(pending, frame => {
                    if (this.saveTask === task) {
                        ProtocolRouter.instance.dispatch(this, frame);
                    }
                }, error => {
                    if (this.saveTask === task) {
                        this.onSaveFailed(error, pending);
                    }
                });
            }
            if (this.saveTask !== task) {
                return;
            }
            this.synchronized();
            if (this.model.snapshot.acknowledged !== null && this.refreshSnapshot) {
                await this.refreshSnapshot(() => {}, error => {
                    if (this.saveTask === task) {
                        this.reportSyncFailure(error);
                    }
                });
                if (this.saveTask === task) {
                    this.synchronized();
                }
            }
        } catch (error) {
            if (this.saveTask === task) {
                if (this.model.snapshot.acknowledged !== null) {
                    this.reportSyncFailure(error);
                } else {
                    this.onSaveFailed(error, pending);
                }
            }
        } finally {
            if (this.saveTask === task) {
                this.saveTask = null;
                const state = this.model.snapshot;
                if (state.acknowledged !== null) {
                    this.update({
                        ...state,
                        busy: false,
                        message: "保存已受理，状态待确认，请点击重试同步",
                    });
                }
            }
        }
    }

    /** 仅记录当前确认失败，原ACK和意图保留；玩家说明由Model事件交全局飘字。 */
    private reportSyncFailure(error: unknown): void {
        GameLog.shared.classified("MODULE", "warn", "FormationController", "阵容状态确认待恢复：" + String(error));
    }

    /** 当前业务失败才更新重试提示；网络失败保留原请求，服务器明确拒绝则清除。 */
    private onSaveFailed(error: unknown, pending: FormationSaveRequest): void {
        const code = (error as { code?: string })?.code;
        GameLog.shared.classified("MODULE", "warn", "FormationController", String(error));
        this.update({
            busy: false,
            pending: code?.startsWith("FORMATION_") ? null : pending,
            acknowledged: null,
            message: code === "FORMATION_CHANGED" ? "阵容版本已变化，恢复同步后重新选择"
                : code?.startsWith("FORMATION_") ? "服务器拒绝保存，请检查阵型和站位" : "保存结果未确认，点击确认重试原请求",
        });
    }

    /** 状态提交后通知，不直接调用任何页面。 */
    private update(state: FormationSaveState): void { this.model.replace(state); this.notify(); }

    /** 页面按目标监听本事件，关闭时只清理自身监听。 */
    private notify(): void {
        this.emit(FormationEvent.SaveChanged, { revision: this.model.version });
    }

    /** 应用销毁后释放请求入口，禁止复用旧鉴权闭包。 */
    protected onDispose(): void {
        this.send = null;
        this.refreshSnapshot = null;
    }
}
