/**
 * 早期成长奖励的原意图装配，供独立通关领奖与碎片合成共用。
 * 只管理当前身份的持久意图和通用反馈，模块仍负责确认回执及读取权威状态。
 */
import { GameLog } from "../../core/GameLog";
import type { AccountModel } from "../../features/account/AccountModel";
import { PersistentOperationJournal } from "../../framework/PersistentOperationJournal";
import type { OperationJournalPort } from "../../framework/PersistentOperationJournal";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";

/** 通用反馈所需的原真实结果，具体业务键由各模块保留。 */
export interface ProgressRewardReceipt {
    readonly receiptId: string;
    readonly roleId: string;
    readonly assetRevision: number;
    readonly actual: unknown;
}

/** 当前认证身份的日志和反馈上下文，换号后旧对象失效。 */
interface ProgressRewardScope<T> {
    /** 同身份持久端口，打开失败时下次重试。 */
    port: OperationJournalPort<T> | null;
    /** 正在恢复或提交的这一轮，重复点击共享结果。 */
    task: Promise<void> | null;
    /** true 表示正在处理玩家点击，false 表示只在恢复。 */
    manual: boolean;
    /** 当前持久参数，晚到的回执也必须匹配它。 */
    pending: T | null;
    /** 已排队的原回执，展示后只补日志清理。 */
    feedback: { receiptId: string; shown: boolean } | null;
    /** 实际展示后原记录的单次条件删除任务。 */
    cleanup: Promise<void> | null;
    /** 每次已接纳的登录或鉴权首包递增，用于恢复中途断线的原任务。 */
    authentication: number;
}

/** 模块只报告实际确认结果，应用统一保留原意图和反馈。 */
export class ProgressRewardBinding<T> {
    /** 当前认证身份唯一引用，登出与销毁清空。 */
    private scope: ProgressRewardScope<T> | null = null;
    /** 销毁后停止恢复，保留原持久记录。 */
    private disposed = false;

    /** 注入原操作能力、稳定参数匹配和通用反馈队列。 */
    public constructor(
        /** 用应用已认证角色校验回执归属。 */
        private readonly account: AccountModel,
        /** 当前动作的隔离日志。 */
        private readonly journal: PersistentOperationJournal<T>,
        /** 恢复时先查原回执，收到确定结果后向本绑定交付。 */
        private readonly execute: (intent: T, recover: boolean) => Promise<void>,
        /** 回执是否属于当前持久原参数。 */
        private readonly matches: (intent: T, receipt: ProgressRewardReceipt) => boolean,
        /** 明确未发生资产修改的业务拒绝，可结束原意图。 */
        private readonly rejectedCodes: ReadonlySet<string>,
        /** 等权威快照后由模块交付原结果，复用通用反馈。 */
        private readonly enqueue: (receipt: ProgressRewardReceipt) => "queued" | "empty",
        /** 显示失败沿已有通用队列重试。 */
        private readonly retryFeedback: () => void,
    ) {}

    /** 首包恢复当前身份原意图，普通状态推送不创建或重发命令。 */
    public afterSnapshot(protocol: string): void {
        const state = this.account.snapshot;
        if (this.disposed || state.busy || !state.role?.serverId
                || (protocol !== Protocol.SESSION_LOGIN && protocol !== Protocol.SESSION_AUTHENTICATE)) {
            return;
        }
        const scope = this.scope ??= {
            port: null, task: null, manual: false, pending: null, feedback: null, cleanup: null, authentication: 0,
        };
        scope.authentication++;
        if (!scope.task) {
            void this.start(scope);
        }
    }

    /** 玩家点击先持久保存原参数；有未完成操作时恢复原笔。 */
    public begin(intent: T): Promise<void> {
        const scope = this.scope;
        if (!scope || this.disposed || this.account.snapshot.busy) {
            UIManager.instance.toast("角色状态正在同步，请稍后重试");
            return Promise.resolve();
        }
        return this.start(scope, intent);
    }

    /** 接纳模块已完成双确认的结果，补全真实展示与日志清理关联。 */
    public deliver(receipt: ProgressRewardReceipt): void {
        const scope = this.scope;
        if (!scope?.pending || this.disposed || this.account.snapshot.role?.id !== receipt.roleId
                || !this.matches(scope.pending, receipt)) {
            throw new Error("奖励回执与当前角色原操作不符");
        }
        if (scope.feedback) {
            if (scope.feedback.receiptId !== receipt.receiptId) {
                throw new Error("同一原操作收到不同奖励回执");
            }
            return;
        }
        scope.feedback = { receiptId: receipt.receiptId, shown: false };
        try {
            if (this.enqueue(receipt) === "empty") {
                this.presented(receipt.receiptId);
            }
        } catch (error) {
            scope.feedback = null;
            throw error;
        }
    }

    /** 通用窗口真实展示后清除匹配的原意图。 */
    public presented(receiptId: string): void {
        const scope = this.scope;
        const feedback = scope?.feedback;
        if (!scope || !feedback || feedback.receiptId !== receiptId) {
            return;
        }
        feedback.shown = true;
        void this.clearShown(scope).catch(error => this.report(error));
    }

    /** 换号使旧在途工作失效，原角色日志仍可恢复。 */
    public deactivate(): void {
        this.scope = null;
    }

    /** 应用结束后关闭存储和完成回调。 */
    public dispose(): void {
        this.disposed = true;
        this.deactivate();
        this.journal.dispose();
    }

    /** 单次提交或恢复。若断线后首包早于旧请求失败，补查一次同一原键。 */
    private start(scope: ProgressRewardScope<T>, intent?: T): Promise<void> {
        if (scope.task) {
            if (intent !== undefined && !scope.manual && !scope.pending) {
                return scope.task.then(() => {
                    if (this.scope === scope && !scope.pending && !scope.feedback) {
                        return this.start(scope, intent);
                    }
                });
            }
            return scope.task;
        }
        const authentication = scope.authentication;
        let interrupted = false;
        const finished = (): void => {
            if (this.scope === scope) {
                scope.task = null;
                scope.manual = false;
                if (interrupted && scope.authentication > authentication) {
                    void this.start(scope);
                }
            }
        };
        const task = this.run(scope, intent).catch(error => {
            if (this.scope !== scope) {
                return;
            }
            interrupted = error instanceof SocketFailure
                && ["DISCONNECTED", "NOT_READY", "TIMEOUT", "SUSPENDED", "STATE_REFRESH"].includes(error.code);
            if (error instanceof SocketFailure && this.rejectedCodes.has(error.code)) {
                if (intent !== undefined) {
                    UIManager.instance.toast(error.message);
                }
                return;
            }
            this.report(error);
            if (intent !== undefined) {
                UIManager.instance.toast("结果尚待确认，请稍后重试");
            }
        }).then(finished, error => {
            finished();
            throw error;
        });
        scope.manual = intent !== undefined;
        scope.task = task;
        return task;
    }

    /** 只在持久化完成后发送。同一身份存在未完成记录时，参数保持原样。 */
    private async run(scope: ProgressRewardScope<T>, intent?: T): Promise<void> {
        const role = this.account.snapshot.role;
        if (!role?.serverId) {
            return;
        }
        const port = scope.port ??= await this.journal.forScope([role.serverId, role.id]);
        const stored = await port.read();
        if (this.scope !== scope) {
            return;
        }
        if (scope.feedback) {
            if (scope.feedback.shown) {
                await this.clearShown(scope);
            } else if (intent !== undefined) {
                this.retryFeedback();
            }
            return;
        }
        const pending = stored ?? (intent === undefined ? null : await port.create(intent));
        if (!pending || this.scope !== scope) {
            return;
        }
        scope.pending = pending;
        try {
            await this.execute(pending, stored !== null || JSON.stringify(pending) !== JSON.stringify(intent));
        } catch (error) {
            if (this.scope === scope && !scope.feedback && error instanceof SocketFailure && this.rejectedCodes.has(error.code)) {
                await port.clear(pending);
                if (this.scope === scope) {
                    scope.pending = null;
                }
            }
            throw error;
        }
    }

    /** 实际展示后仅删除原记录，已有清理任务可供下次操作等待。 */
    private clearShown(scope: ProgressRewardScope<T>): Promise<void> {
        if (scope.cleanup) {
            return scope.cleanup;
        }
        const { pending, port, feedback } = scope;
        if (!port || !pending || !feedback?.shown) {
            return Promise.resolve();
        }
        const task = port.clear(pending).then(() => {
            if (this.scope === scope && scope.feedback === feedback) {
                scope.feedback = null;
                scope.pending = null;
            }
        }).then(() => { scope.cleanup = null; }, error => {
            scope.cleanup = null;
            throw error;
        });
        scope.cleanup = task;
        return task;
    }

    /** 统一处理恢复失败，保留原意图，便于随后再查。 */
    private report(error: unknown): void {
        GameLog.shared.classified("APP", "warn", "ProgressRewardBinding", "原操作确认失败：" + String(error));
    }
}
