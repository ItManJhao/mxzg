/**
 * 普通首抽的应用装配：按当前认证区服、角色保存原请求键，接纳快照后恢复未完成领取。
 * 回执经业务Controller双确认后交通用奖励，实际展示才清日志；不复制资产或写角色名册。
 */
import { GameLog } from "../../core/GameLog";
import type { AccountModel } from "../../features/account/AccountModel";
import type { AccountService } from "../../features/account/AccountService";
import { FirstSummonController } from "../../features/hero/FirstSummonController";
import type { FirstSummonIntent, FirstSummonProtocol } from "../../features/hero/data/FirstSummonData";
import { FirstSummonData } from "../../features/hero/data/FirstSummonData";
import { FirstSummonModel } from "../../features/hero/FirstSummonModel";
import type { RewardNotice } from "../../features/reward/data/RewardNoticeData";
import { PersistentOperationJournal } from "../../framework/PersistentOperationJournal";
import type { OperationJournalPort } from "../../framework/PersistentOperationJournal";
import { UIManager } from "../../framework/ui/UIManager";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { GameSocketClient, SocketFailure } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";

/** 每次认证角色独享一份引用；换号使全部旧日志和反馈异步续段失效。 */
interface SummonScope {
    /** 当前区服和角色，只在应用层作为持久日志键。 */
    readonly identity: readonly string[];
    /** 当前认证角色独有的日志端口；打开失败后仍允许下次认证重试。 */
    port: OperationJournalPort<FirstSummonIntent> | null;
    /** 查询、提交及清日志之间最多运行一轮；完成后释放。 */
    task: Promise<void> | null;
    /** 仍在处理上一连接结果时收到新认证；仅在同一轮网络失败后重试。 */
    authenticatedDuringTask: boolean;
    /** 已双确认且交给通用窗口的原回执与意图。 */
    presentation: { readonly receiptId: string; readonly intent: FirstSummonIntent; shown: boolean } | null;
}

export class FirstSummonBinding {
    /** 应用唯一首抽Controller；只读Model可注入首抽窗口。 */
    public readonly controller: FirstSummonController;
    /** 原意图日志；应用销毁关闭连接，不删除未确认记录。 */
    private readonly journal: Pick<PersistentOperationJournal<FirstSummonIntent>, "forScope" | "dispose">;
    /** 当前角色的异步装配引用；登出或销毁时清空。 */
    private scope: SummonScope | null = null;
    /** 销毁后拒绝新认证、点击及迟到反馈。 */
    private disposed = false;

    /** 使用原应用账号、连接、存储命名空间和通用反馈队列。 */
    public constructor(
        /** 只在应用边界比对回执与认证角色归属。 */
        private readonly account: AccountModel,
        service: AccountService,
        socket: GameSocketClient,
        namespace: string,
        /** 交给通用队列显示原真实新英雄；允许内部按回执编号去重。 */
        private readonly enqueue: (notice: RewardNotice) => void,
        /** 展示失败由已有奖励队列重试，不另开专用反馈。 */
        private readonly retryPresentation: () => void,
        journal?: Pick<PersistentOperationJournal<FirstSummonIntent>, "forScope" | "dispose">,
    ) {
        this.journal = journal ?? new PersistentOperationJournal("mxzg.remake.first-summon.v1." + namespace,
            FirstSummonBinding.readIntent, (left, right) => left.requestId === right.requestId);
        this.controller = new FirstSummonController(new FirstSummonModel(),
            (name, requestId) => service.authenticated(token => socket.firstSummon(token, name, requestId))
                .then(frame => this.confirmOwner(name, frame)),
            () => service.authenticated(token => socket.refreshSnapshot(token)));
        this.controller.initialize();
    }

    /** 登录及重连后的接纳快照可以恢复原请求；普通资产推送已由Controller提交状态。 */
    public afterSnapshot(protocol: string): void {
        const role = this.account.snapshot.role;
        if (this.disposed || !role?.serverId || this.account.snapshot.busy
            || (protocol !== Protocol.SESSION_LOGIN && protocol !== Protocol.SESSION_AUTHENTICATE)) {
            return;
        }
        if (!this.scope) {
            this.scope = { identity: [role.serverId, role.id], port: null, task: null,
                authenticatedDuringTask: false, presentation: null };
        } else if (this.scope.task) {
            this.scope.authenticatedDuringTask = true;
            return;
        }
        void this.start(this.scope, false);
    }

    /** 只接收玩家一次免费提交或恢复原意图；无资格时不创建新键。 */
    public begin(): void {
        if (!this.scope || this.disposed || this.account.snapshot.busy || !this.account.snapshot.role) {
            UIManager.instance.toast("普通召唤尚未同步，请稍后重试");
            return;
        }
        void this.start(this.scope, true);
    }

    /** 奖励真实展示后再条件清除原请求；关首抽页面本身不删除日志。 */
    public presented(receiptId: string): void {
        const scope = this.scope;
        if (scope?.presentation?.receiptId !== receiptId || scope.presentation.shown) {
            return;
        }
        scope.presentation.shown = true;
        const task = scope.task ?? Promise.resolve();
        void task.then(() => {
            if (this.current(scope) && scope.presentation?.shown) {
                void this.start(scope, false);
            }
        });
    }

    /** 换号先废弃旧续段；模块任务重置由统一资产装配执行。 */
    public deactivate(): void {
        this.scope = null;
    }

    /** 关闭应用日志与模块协议注册，保留旧角色未完成的原意图。 */
    public dispose(): void {
        this.disposed = true;
        this.deactivate();
        this.controller.dispose();
        this.journal.dispose();
    }

    /** 合并同轮点击/认证触发；本轮失败不循环发送，原意图保留给下次明确恢复。 */
    private start(scope: SummonScope, manual: boolean): Promise<void> {
        if (scope.task) {
            return scope.task;
        }
        let resumeAfterFailure = false;
        const task = Promise.resolve().then(() => this.run(scope, manual)).catch(error => {
            if (!this.current(scope)) {
                return;
            }
            resumeAfterFailure = error instanceof SocketFailure
                && ["DISCONNECTED", "NOT_READY", "SESSION_CHANGED", "SUSPENDED", "TIMEOUT", "STATE_REFRESH"].includes(error.code);
            const reason = error instanceof Error ? error.message : String(error);
            GameLog.shared.classified("APP", "warn", "FirstSummonBinding", "首抽确认：" + reason);
            if (manual) {
                UIManager.instance.toast(reason);
            }
        }).then(() => {
            if (this.current(scope)) {
                scope.task = null;
                const shouldResume = resumeAfterFailure && scope.authenticatedDuringTask;
                scope.authenticatedDuringTask = false;
                this.controller.setPending(this.controller.model.snapshot.requestId, false);
                if (shouldResume) {
                    void this.start(scope, false);
                }
            }
        });
        scope.task = task;
        this.controller.setPending(this.controller.model.snapshot.requestId, true);
        return task;
    }

    /** 先读旧号待恢复键；只有显式点击且服务端有资格，才用原子日志创建新意图。 */
    private async run(scope: SummonScope, manual: boolean): Promise<void> {
        if (!this.current(scope)) {
            return;
        }
        const port = scope.port ?? await this.journal.forScope(scope.identity);
        if (!this.current(scope)) {
            return;
        }
        scope.port = port;
        let intent = await port.read();
        if (!this.current(scope)) {
            return;
        }
        const previous = scope.presentation;
        if (previous) {
            if (previous.shown) {
                await this.clear(scope, port, previous.intent);
            } else if (manual) {
                this.retryPresentation();
            }
            return;
        }
        let recovery = true;
        const state = this.controller.model.snapshot.state;
        if (!intent && manual && state && !state.firstNormalCompleted) {
            const candidate = { schemaVersion: 1 as const, requestId: PersistentOperationJournal.createId() };
            intent = await port.create(candidate);
            recovery = intent.requestId !== candidate.requestId;
        }
        if (!intent || !this.current(scope)) {
            return;
        }
        this.controller.setPending(intent.requestId, true);
        let result;
        try {
            result = await this.controller.run(intent.requestId, recovery);
        } catch (error) {
            if (this.current(scope) && error instanceof SocketFailure && error.code === "SUMMON_CAPACITY_FULL") {
                await this.clear(scope, port, intent);
            }
            throw error;
        }
        if (!this.current(scope)) {
            return;
        }
        if (result === "completed-elsewhere") {
            await this.clear(scope, port, intent);
            return;
        }
        scope.presentation = { receiptId: result.receiptId, intent, shown: false };
        try {
            this.enqueue(result);
        } catch (error) {
            scope.presentation = null;
            throw error;
        }
        // 同步打开也可立即回调 presented，统一由当前任务完成日志清理。
        if (scope.presentation.shown) {
            await this.clear(scope, port, intent);
        }
    }

    /** 只删除本次记录；跨标签页已清除时依然接受实时统一状态。 */
    private async clear(scope: SummonScope, port: OperationJournalPort<FirstSummonIntent>,
        intent: FirstSummonIntent): Promise<void> {
        await port.clear(intent);
        if (this.current(scope)) {
            scope.presentation = null;
            this.controller.setPending(null, true);
        }
    }

    /** 核对真实回执角色；status未找到时不含回执，仍由Controller校验原键。 */
    private confirmOwner(name: FirstSummonProtocol, frame: GameFrame): GameFrame {
        const response = frame.body as { receipt?: unknown } | null;
        const receipt = name === Protocol.HERO_FIRST_SUMMON_STATUS ? response?.receipt : response;
        if (receipt && (receipt as { roleId?: unknown }).roleId !== this.account.snapshot.role?.id) {
            throw new SocketFailure("INVALID_MESSAGE", "首抽回执不属于当前角色");
        }
        return frame;
    }

    /** 本地异步结果只对创建它的当前角色日志端口有效。 */
    private current(scope: SummonScope): boolean {
        return !this.disposed && this.scope === scope;
    }

    /** 只保存完整原请求UUID，拒绝损坏记录或把本地数据当作奖励。 */
    private static readIntent(value: unknown): FirstSummonIntent {
        const data = value as Partial<FirstSummonIntent> | null;
        if (!data || typeof data !== "object" || data.schemaVersion !== 1
            || !FirstSummonData.isId(data.requestId) || Object.keys(data).sort().join(",") !== "requestId,schemaVersion") {
            throw new Error("普通首抽原意图损坏或格式未支持，已停止恢复");
        }
        return Object.freeze({ schemaVersion: 1, requestId: data.requestId });
    }
}
