/** 主线阵容模块控制器：负责保存协议、幂等重试和回执确认；不持有View或页面草稿。 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import type { GameFrame } from "../../platform/GameProtocolCodec";
import { GameLog } from "../../core/GameLog";
import { HeroRosterEvent } from "./utils/HeroRosterEvent";
import { FormationEvent } from "./utils/FormationEvent";
import { HeroRosterModel } from "./HeroRosterModel";
import { FormationSaveModel, FormationSaveState } from "./FormationSaveModel";
import type { FormationSaveRequest } from "./data/FormationData";

export class FormationController extends BaseController {
    /** 应用唯一模块，窗口开关不创建或销毁。 */
    public static readonly instance = new FormationController(FormationSaveModel.instance, HeroRosterModel.instance);
    /** 应用注入的业务请求交付口；只回调当前身份的结果，模块不持有token，未装配时拒绝请求。 */
    private send: ((body: FormationSaveRequest, received: (frame: GameFrame) => void,
        failed: (error: unknown) => void) => Promise<void>) | null = null;

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

    /** 应用启动时注入现有长连接写入口，不建立第二条通道。 */
    public configure(send: NonNullable<FormationController["send"]>): void { this.send = send; }

    /** 按模块生命周期登记回执和统一状态通知，页面关闭不解除。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.FORMATION_SAVE]));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.synchronized));
    }

    /** 应用通知清空业务过程状态；请求结果的身份隔离已在应用交付口完成。 */
    protected onResetSession(roleKey: string | null): void {
        this.model.reset(roleKey);
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

    /** 校验请求关联和版本，再等待HeroRosterController提交统一快照。 */
    private onSaved(value: unknown): void {
        const pending = this.model.snapshot.pending;
        if (!pending) return;
        const body = value as { requestId?: unknown; version?: unknown };
        if (!body || body.requestId !== pending.requestId || !Number.isSafeInteger(body.version) || Number(body.version) < pending.expectedVersion) {
            throw new Error("阵容保存回执无效");
        }
        this.model.replace({ busy: true, pending: null, acknowledged: Number(body.version), message: "已保存，等待服务器同步…" });
        this.synchronized();
        if (this.model.snapshot.acknowledged !== null) this.notify();
    }

    /** 只检查权威快照是否已达到回执版本；从不反向写入资产。 */
    private synchronized = (): void => {
        const state = this.model.snapshot;
        if (state.acknowledged === null) return;
        const current = this.heroes.snapshot.mainFormation;
        if (current && current.version >= state.acknowledged) {
            this.model.replace({ busy: false, pending: null, acknowledged: null, message: "阵容已保存" });
            this.notify();
        }
    };

    /** 显式保存；结果不明时只重试原请求，关窗不丢幂等键；只处理应用交付的业务结果。 */
    public async save(draft: Omit<FormationSaveRequest, "requestId">): Promise<void> {
        if (!this.isInitialized || this.model.snapshot.busy || !this.send) return;
        const pending = this.model.snapshot.pending || { ...draft,
            slots: draft.slots.map(slot => ({ ...slot })),
            requestId: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                const n = Math.floor(Math.random() * 16); return (c === "x" ? n : (n & 3) | 8).toString(16);
            }),
        };
        this.update({ busy: true, pending, acknowledged: null, message: "正在保存阵容…" });
        await this.send(pending, frame => ProtocolRouter.instance.dispatch(this, frame), error => this.onSaveFailed(error, pending));
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
    private notify(): void { this.emit(FormationEvent.SaveChanged, { roleKey: this.model.roleKey, revision: this.model.version }); }

    /** 应用销毁后释放请求入口，禁止复用旧鉴权闭包。 */
    protected onDispose(): void { this.send = null; }
}
