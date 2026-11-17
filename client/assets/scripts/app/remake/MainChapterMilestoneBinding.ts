/**
 * 主线里程碑的应用装配：持久保存原稳定键，再用当前认证连接和统一快照完成双确认。
 * 服务端发奖和模块状态不归本类；原意图直到通用反馈真实展示后才条件删除，换号保留以供原角色恢复。
 */
import { GameLog } from "../../core/GameLog";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountService } from "../../features/account/AccountService";
import { MainChapterMilestoneController } from "../../features/battle/MainChapterMilestoneController";
import { MainChapterModel } from "../../features/battle/MainChapterModel";
import type { MainChapterMilestoneReceipt } from "../../features/battle/data/MainChapterMilestoneData";
import type { OperationJournalPort } from "../../framework/PersistentOperationJournal";
import { UIManager } from "../../framework/ui/UIManager";
import { GameSocketClient, SocketFailure } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";
import { MilestoneClaimJournal } from "./MilestoneClaimJournal";
import type { MilestoneClaimPending } from "./MilestoneClaimJournal";

/** 同一认证激活期的原反馈等待，撤销只结束旧续段，不删除持久意图。 */
interface MilestonePresentation {
    /** 已被快照双确认的原回执，排队与重试共用其真实身份。 */
    readonly receipt: MainChapterMilestoneReceipt;
    /** 原意图的持久端口，不能误清后来身份的记录。 */
    readonly port: OperationJournalPort<MilestoneClaimPending>;
    /** 创建反馈的应用激活代次，换号后不再删除或显示。 */
    readonly activation: number;
    /** 实际展示并完成条件删除后才完成，失败保留原意图。 */
    resolve(): void;
    /** 展示清理失败交还模块保留反馈，不伪装成已交付。 */
    reject(error: unknown): void;
    /** 同回执重复确认复用的等待结果。 */
    promise: Promise<void>;
}

export class MainChapterMilestoneBinding {
    /** 模块唯一确认器；读取原主线Model，不持View或认证身份。 */
    private readonly controller: MainChapterMilestoneController;
    /** 当前已认证区服/角色键，只在应用层作异步激活隔离。 */
    private identity: string | null = null;
    /** 换号/销毁时递增，旧存储完成和迟到反馈失效。 */
    private activation = 0;
    /** 当前角色已经激活的不可变存储口；激活失败或退出时清空。 */
    private port: OperationJournalPort<MilestoneClaimPending> | null = null;
    /** 本次认证激活与恢复；完成后释放，不因每次状态推送重复创建。 */
    private activating: Promise<void> | null = null;
    /** 激活失败普通推送不重试，下一次认证允许重试。 */
    private activationFailed = false;
    /** 本次点击创建/恢复流程，重复点击合并；结束后释放。 */
    private intent: Promise<void> | null = null;
    /** 原反馈等待真实通用窗口展示；换号只取消等待，不清持久记录。 */
    private presentation: MilestonePresentation | null = null;
    /** 本激活期已真实显示的原回执；条件删除失败后只重试清理，不能等待已被共享队列去重的第二次展示。 */
    private presentedReceiptId: string | null = null;
    /** 应用销毁后所有迟到完成停止。 */
    private disposed = false;
    /** 账号退出订阅，应用销毁解除。 */
    private readonly stop: () => void;

    /** 注入应用原有认证、连接、存储及通用反馈，不建立第二份奖励队列或资产。 */
    public constructor(
        /** 应用唯一账号，只在装配边界检查原回执归属。 */
        private readonly account: AccountModel,
        service: AccountService,
        socket: GameSocketClient,
        /** 应用拥有的持久日志；独立测试可注入隔离原生存储。 */
        private readonly journal: Pick<MilestoneClaimJournal, "forRole" | "dispose">,
        /** 双确认结果交同一通用反馈队列；empty只用于确实没有正奖励。 */
        private readonly enqueue: (receipt: MainChapterMilestoneReceipt) => "queued" | "empty",
        model = MainChapterModel.instance,
    ) {
        this.controller = new MainChapterMilestoneController(model);
        this.controller.configure((name, body, received, failed) => service.deliverAuthenticated(
            token => socket.chapter(token, name, body),
            frame => {
                if (this.disposed) {
                    return;
                }
                const receipt = name === Protocol.CHAPTER_MILESTONE_STATUS
                    ? (frame.body as { receipt?: unknown }).receipt : frame.body;
                if (receipt && (receipt as { roleId?: unknown }).roleId !== account.snapshot.role?.id) {
                    throw new SocketFailure("INVALID_MESSAGE", "通关奖励回执不属于当前角色");
                }
                received(frame);
            },
            error => { if (!this.disposed) { failed(error); } },
        ), () => service.authenticated(token => socket.refreshSnapshot(token)), receipt => this.deliver(receipt));
        this.controller.initialize();
        this.stop = account.subscribe(state => { if (!state.role) { this.deactivate(); } });
    }

    /** 唯一资产入口提交成功后调用；认证恢复原键，普通推送只推进原回执双确认。 */
    public afterSnapshot(protocol: string): void {
        const role = this.account.snapshot.role;
        if (this.disposed || this.account.snapshot.busy || !role?.serverId) {
            return;
        }
        const authenticated = protocol === Protocol.SESSION_LOGIN || protocol === Protocol.SESSION_AUTHENTICATE;
        const identity = JSON.stringify([role.serverId, role.id]);
        if (identity !== this.identity || (authenticated && this.activationFailed)) {
            this.deactivate();
            this.identity = identity;
            const activation = this.activation;
            const task = this.activate(role.serverId, role.id, activation);
            this.activating = task;
            void task.then(() => { if (this.activating === task) { this.activating = null; } });
        } else if (authenticated && this.port && !this.intent && !this.activating) {
            void this.recover(this.port, this.activation).catch(error => this.report(error));
        } else {
            this.controller.afterSnapshot();
        }
    }

    /** 页面只转交稳定目标ID；存储提交前不发请求，已有未完成原键优先恢复。 */
    public begin(rewardId: number): Promise<void> {
        if (this.intent) {
            return this.intent;
        }
        const port = this.port;
        const activation = this.activation;
        if (this.disposed || !port || this.account.snapshot.busy || !this.account.snapshot.role) {
            UIManager.instance.toast("通关奖励正在恢复，请稍后重试");
            return Promise.resolve();
        }
        const task = port.create({ schemaVersion: 1, rewardId }).then(pending => {
            if (this.current(activation)) {
                return pending.rewardId === rewardId ? this.controller.claim(pending.rewardId)
                    : this.controller.recover(pending.rewardId);
            }
        }).catch(error => {
            if (this.current(activation)) {
                this.report(error);
                UIManager.instance.toast("通关奖励尚待确认，请重试");
            }
        }).then(() => { if (this.intent === task) { this.intent = null; } });
        this.intent = task;
        return task;
    }

    /** 通用队列真实显示原批次后条件删除原意图，排队本身不等于已经显示。 */
    public presented(receiptId: string): void {
        const presentation = this.presentation;
        if (!presentation || presentation.receipt.receiptId !== receiptId || !this.current(presentation.activation)) {
            return;
        }
        this.presentedReceiptId = receiptId;
        void presentation.port.clear({ schemaVersion: 1, rewardId: presentation.receipt.rewardId }).then(() => {
            if (this.presentation === presentation && this.current(presentation.activation)) {
                this.presentation = null;
                presentation.resolve();
            }
        }, error => {
            if (this.presentation === presentation) {
                this.presentation = null;
                presentation.reject(error);
                this.report(error);
            }
        });
    }

    /** 先使旧续段失效再撤模块进度，原角色持久记录保留供下次登录。 */
    public deactivate(): void {
        this.activation++;
        this.identity = null;
        this.port = null;
        this.activating = null;
        this.activationFailed = false;
        this.intent = null;
        const old = this.presentation;
        this.presentation = null;
        this.presentedReceiptId = null;
        this.controller.resetSession();
        old?.resolve();
    }

    /** 应用销毁关闭原日志和监听，迟到结果不能重开反馈。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.deactivate();
        this.disposed = true;
        this.stop();
        this.controller.dispose();
        this.journal.dispose();
    }

    /** 激活仅在当前认证代次有效；存储失败不清记录、不降级到内存。 */
    private async activate(serverId: string, roleId: string, activation: number): Promise<void> {
        try {
            const port = await this.journal.forRole(serverId, roleId);
            if (this.current(activation)) {
                this.port = port;
                await this.recover(port, activation);
            }
        } catch (error) {
            if (this.current(activation)) {
                this.activationFailed = true;
                this.report(error);
            }
        }
    }

    /** 读取真实原意图后先查服务端回执，不能因为快照已领就跳过丢失的奖励反馈。 */
    private async recover(port: OperationJournalPort<MilestoneClaimPending>, activation: number): Promise<void> {
        const pending = await port.read();
        if (pending && this.current(activation)) {
            await this.controller.recover(pending.rewardId);
        }
    }

    /** 双确认结果只交共享队列；原等待在真实展示或身份撤销时结束。 */
    private deliver(receipt: MainChapterMilestoneReceipt): Promise<void> {
        if (this.disposed || !this.port || receipt.roleId !== this.account.snapshot.role?.id) {
            return Promise.reject(new Error("通关奖励反馈身份已失效"));
        }
        if (this.presentation) {
            return this.presentation.receipt.receiptId === receipt.receiptId ? this.presentation.promise
                : Promise.reject(new Error("上一通关奖励反馈尚未完成"));
        }
        let resolve!: () => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<void>((success, failure) => { resolve = success; reject = failure; });
        const presentation: MilestonePresentation = { receipt, port: this.port, activation: this.activation,
            promise, resolve, reject };
        this.presentation = presentation;
        try {
            if (this.presentedReceiptId === receipt.receiptId || this.enqueue(receipt) === "empty") {
                this.presented(receipt.receiptId);
            }
        } catch (error) {
            this.presentation = null;
            reject(error);
        }
        return promise;
    }

    /** 本地装配异步代次只在应用比较，模块仍不保存账号键。 */
    private current(activation: number): boolean {
        return !this.disposed && this.activation === activation;
    }

    /** 原回执保留，失败只在应用边界记录一次，不从日志推断资产或补造成功。 */
    private report(error: unknown): void {
        GameLog.shared.classified("APP", "warn", "MainChapterMilestoneBinding",
            "通关奖励确认尚未完成：" + (error instanceof Error ? error.stack || error.message : String(error)));
    }
}
