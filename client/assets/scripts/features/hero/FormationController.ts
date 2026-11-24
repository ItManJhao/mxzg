/** 阵容协议入口：保存等待权威快照；草稿战力仅处理当前预览回包，不写资产。 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { UIManager } from "../../framework/ui/UIManager";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { SocketFailure } from "../../platform/GameSocketClient";
import type { AccountOperations } from "../account/AccountOperations";
import { HeroRosterEvent } from "./utils/HeroRosterEvent";
import { FormationEvent } from "./utils/FormationEvent";
import { HeroRosterModel } from "./HeroRosterModel";
import { FormationSaveModel, type FormationSaveState } from "./FormationSaveModel";
import type { FormationSaveRequest } from "./data/FormationData";

/** 连接层解码的即时保存结果。 */
interface FormationSaved {
    readonly requestId: string;
    readonly version: number;
}

/** 服务器回显本次只读战力请求及参与计算的普通队员。 */
interface FormationPower {
    readonly requestId: string;
    readonly heroIds: readonly string[];
    readonly power: number;
}

export class FormationController extends BaseController {
    /** 应用唯一阵容协议入口。 */
    public static readonly instance = new FormationController(FormationSaveModel.instance, HeroRosterModel.instance);

    /** 当前账号提供的单次请求入口，模块销毁时释放。 */
    private operations: Pick<AccountOperations, "deliver"> | null = null;
    /** 正在发送的保存请求，完成或切换角色后释放。 */
    private task: Promise<void> | null = null;

    /**
     * @param model 保存按钮进度和服务器确认的版本。
     * @param heroes 唯一权威名册，供确认当前阵容可出战。
     */
    public constructor(
        private readonly model: FormationSaveModel,
        private readonly heroes: HeroRosterModel,
    ) {
        super();
    }

    /** 使用应用的账号通道发起普通保存。 */
    public configure(operations: Pick<AccountOperations, "deliver">): void {
        this.operations = operations;
    }

    /** 登记保存、预览回包和权威名册更新。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.FORMATION_SAVE, Protocol.FORMATION_POWER]));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.synchronized));
    }

    /** 换号清空保存进度，账号层会撤销旧角色回复。 */
    protected onResetSession(): void {
        this.task = null;
        this.model.reset();
        this.notify();
    }

    /** 保存回包只记录版本；预览回包只通知发起窗口，不进入名册。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        if (protocol === Protocol.FORMATION_SAVE) {
            const { version } = data as FormationSaved;
            this.model.replace({ busy: true, savedVersion: version });
            if (!this.synchronized()) {
                this.notify();
            }
        } else if (protocol === Protocol.FORMATION_POWER) {
            const { requestId, power } = data as FormationPower;
            this.emit(FormationEvent.PowerPreviewed, { requestId, power });
        }
    }

    /**
     * 查询当前草稿的只读战力，回显实例列表必须和请求一致。
     * @returns 本次窗口可订阅的请求编号；无已初始化的通道时返回 null。
     */
    public previewPower(heroIds: readonly string[]): string | null {
        const operations = this.operations;
        if (!this.isInitialized || !operations) {
            return null;
        }
        const requestId = RequestIdUtils.create();
        void operations.deliver(Protocol.FORMATION_POWER, { requestId, heroIds }, frame => {
            const result = frame.body as FormationPower;
            if (result.requestId !== requestId || result.heroIds.length !== heroIds.length
                || result.heroIds.some((id, index) => id !== heroIds[index])) {
                throw new Error("阵容战力回包与请求不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, () => this.emit(FormationEvent.PowerPreviewed, { requestId, power: null }));
        return requestId;
    }

    /** 服务端阵容已达到本次保存版本时，解除等待并通知出战页。 */
    private synchronized(): boolean {
        const { busy, savedVersion } = this.model.snapshot;
        const current = this.heroes.snapshot.mainFormation;
        if (busy && savedVersion !== null && current && current.version >= savedVersion) {
            UIManager.instance.toast("阵容已保存");
            this.update({ busy: false, savedVersion });
            return true;
        }
        return false;
    }

    /** 每次确认只发一次保存，服务器检查草稿和版本。 */
    public save(draft: Omit<FormationSaveRequest, "requestId">): Promise<void> {
        if (this.task) {
            return this.task;
        }
        const operations = this.operations;
        if (!this.isInitialized || !operations || this.model.snapshot.busy) {
            return Promise.resolve();
        }
        const request = { ...draft, requestId: RequestIdUtils.create() };
        // 先登记任务再发送，页面刷新可能同步触发注销。
        const response: Promise<void> = Promise.resolve().then(() => {
            if (this.task !== task) {
                return;
            }
            return operations.deliver(Protocol.FORMATION_SAVE, request, frame => {
                const result = frame.body as FormationSaved;
                if (result.requestId !== request.requestId || !Number.isSafeInteger(result.version)
                    || result.version < request.expectedVersion) {
                    throw new Error("阵容保存回包与请求不符");
                }
                ProtocolRouter.instance.dispatch(this, frame);
            }, error => {
                this.update({ busy: false, savedVersion: null });
                if (error instanceof SocketFailure && error.interrupted) {
                    UIManager.instance.toast("保存结果待同步，恢复连接后请查看阵容");
                } else if (error instanceof SocketFailure && error.code === "FORMATION_CHANGED") {
                    UIManager.instance.toast("阵容版本已变化，请按最新阵容重新选择");
                } else if (error instanceof SocketFailure && error.code.startsWith("FORMATION_")) {
                    UIManager.instance.toast("服务器拒绝保存，请检查阵型和站位");
                } else {
                    UIManager.instance.toast(error instanceof Error ? error.message : "阵容保存失败");
                }
            });
        });
        const finish = () => {
            if (this.task === task) {
                this.task = null;
            }
        };
        const task = response.then(finish, error => {
            finish();
            throw error;
        });
        this.task = task;
        this.update({ busy: true, savedVersion: null });
        return task;
    }

    /** 提交当前按钮状态并发事件，由页面读取。 */
    private update(state: FormationSaveState): void {
        this.model.replace(state);
        this.notify();
    }

    /** 通知当前页面刷新服务器阵容与保存进度。 */
    private notify(): void {
        this.emit(FormationEvent.SaveChanged, { revision: this.model.version });
    }

    /** 应用结束时释放账号请求入口。 */
    protected onDispose(): void {
        this.operations = null;
    }
}
