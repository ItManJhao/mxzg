/**
 * 挂机领取恢复控制器：持久保存原意图、查询历史回执，并等待统一资产快照双向确认。
 * 应用注入身份隔离后的通信及持久记录口；本模块不接收凭证/角色键，不修改角色或背包。
 * 玩家入口继续关闭；begin只供未来显式入口及独立测试调用。
 */
import { BaseController } from "../../framework/BaseController";
import { GameLog } from "../../core/GameLog";
import { GameProtocolCodecUtils, GameFrame } from "../../platform/GameProtocolCodecUtils";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { RewardUtils } from "../reward/utils/RewardUtils";
import { MainChapterModel } from "./MainChapterModel";
import type {
    IdleClaimCommand, IdleClaimConfirmation, IdleClaimJournalPort, IdleClaimPending, IdleClaimProgress,
    IdleClaimReceipt, IdleClaimSend,
} from "./data/MainChapterIdleClaimData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads { "main-chapter.updated": undefined; }
}

/** 一次有界恢复使用的局部能力；对象身份只隔离持久IO与本流程迟到，不承担账号判断。 */
interface ClaimFlow {
    /** 新点击在确认时冻结的操作版本；历史恢复不覆盖原持久版本，未指定时沿现有快照。 */
    readonly expectedOperationVersion?: number;
    /** 激活时应用提供的不可透明持久记录口。 */
    readonly port: IdleClaimJournalPort;
    /** 本轮完成Promise；并发恢复复用，不同时发送第二份意图。 */
    promise: Promise<void>;
    /** 本次begin提供的不透明显示引用；只在原子create真正接纳新请求时转为现场归属。 */
    readonly presentationContext: object | null;
}

/** 原请求在当前应用中的显示来源，只有生命周期引用，不保存页面、账号或第二份资产。 */
interface ClaimPresentation {
    /** 原子保存后接纳的同一请求引用，后续恢复仅核对其业务指纹。 */
    readonly pending: IdleClaimPending;
    /** 应用传入的现场引用；模块不解引用其中内容，成功交付/过时/解除激活时释放。 */
    readonly context: object;
}

export class MainChapterIdleClaimController extends BaseController {
    /** 应用交付当前身份的真实WS响应；未装配时禁止发送。 */
    private send: IdleClaimSend | null = null;
    /** 缺少确认状态时强制重新鉴权取统一首包；每次恢复至多调用一次。 */
    private synchronize: (() => Promise<void>) | null = null;
    /** 当前身份绑定口；重置只解除内存引用，不删除持久记录。 */
    private port: IdleClaimJournalPort | null = null;
    /** 当前有界恢复任务；解除激活后旧IO不能提交新内存状态。 */
    private flow: ClaimFlow | null = null;
    /** 忙时收到统一快照则合并为一次本地复核；流程结束清空，不触发额外网络恢复。 */
    private observationQueued = false;
    /** 原意图及统一快照均确认后交付完整显示信号，零到账也交付；模块不持有奖励窗口。 */
    private onConfirmed: ((confirmation: IdleClaimConfirmation) => void) | null = null;
    /** 当前应用真正新建请求的显示来源；跨流程恢复保留，冷日志或后来请求不能借用。 */
    private presentation: ClaimPresentation | null = null;

    /** @param model 应用已有的唯一主线Model，领取回执不替换其权威快照。 */
    public constructor(private readonly model: MainChapterModel) {
        super();
    }

    /** 注入身份隔离的通信、重新鉴权及同步显示信号；零到账仍报告成功，不等待页面或奖励窗。 */
    public configure(
        send: IdleClaimSend,
        synchronize: () => Promise<void>,
        onConfirmed?: (confirmation: IdleClaimConfirmation) => void,
    ): void {
        this.send = send;
        this.synchronize = synchronize;
        this.onConfirmed = onConfirmed || null;
    }

    /** 仅登记两条已实现领取协议；状态快照仍归原主线Controller。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.CHAPTER_IDLE_CLAIM, Protocol.CHAPTER_IDLE_CLAIM_STATUS]));
    }

    /** 应用认证后激活持久记录，读原请求再恢复；同一口重复激活不重置进行中的流程。 */
    public activate(port: IdleClaimJournalPort): Promise<void> {
        if (this.port !== port) {
            this.deactivate();
            this.port = port;
        }
        return this.recover();
    }

    /** 换号只清理内存；原身份记录留待再次认证时恢复。 */
    public deactivate(): void {
        this.port = null;
        this.flow = null;
        this.presentation = null;
        this.observationQueued = false;
        this.update("idle", null, null, "");
    }

    /** 应用模块生命周期重置复用解除激活，不主动取消服务端命令。 */
    protected onResetSession(): void {
        this.deactivate();
    }

    /** 应用销毁解除注入能力；持久记录的连接归应用持有。 */
    protected onDispose(): void {
        this.send = null;
        this.synchronize = null;
        this.onConfirmed = null;
    }

    /** 重登或显式重试只恢复同一原请求；本轮最多查询、原样发送和补一次统一首包。 */
    public recover(): Promise<void> {
        return this.run("recover");
    }

    /**
     * 未来领取入口：仅已知ENABLED快照允许建立意图，保存成功后才发送。
     * 当前没有View调用；已有待确认记录时原子create返回原记录，不能创建第二笔。
     * @param expectedOperationVersion 应用确认时冻结的操作版本；读日志期间变化则停止新建，旧意图仍按自身版本恢复。
     * @param presentationContext 应用提供的本次现场显示引用，仅真正新建的请求可携带；模块不读取其内容。
     */
    public begin(expectedOperationVersion?: number, presentationContext: object | null = null): Promise<void> {
        if (expectedOperationVersion !== undefined
            && (!Number.isSafeInteger(expectedOperationVersion) || expectedOperationVersion <= 0)) {
            throw new Error("挂机点击的操作版本无效");
        }
        return this.run("begin", expectedOperationVersion, presentationContext);
    }

    /** 统一快照仅触发本地双确认；忙时合并到结束后复核，不查询或重发新读到的其他意图。 */
    public observeSnapshot(): void {
        if (this.flow && this.port) {
            this.observationQueued = true;
            return;
        }
        if (this.port && this.model.idleClaim.pending && this.model.idleClaim.receipt) {
            void this.run("confirm");
        }
    }

    /** 两条已登记协议明确分流，失败帧仍由通信失败边界处理。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        const pending = this.model.idleClaim.pending;
        if (!pending) {
            throw new Error("挂机领取响应缺少原始意图");
        }
        switch (protocol) {
            case Protocol.CHAPTER_IDLE_CLAIM:
                this.onReceipt(value, pending);
                break;
            case Protocol.CHAPTER_IDLE_CLAIM_STATUS:
                this.onStatus(value, pending);
                break;
            default:
                throw new Error("非挂机领取恢复协议");
        }
    }

    /** 状态查询核对原编号；NOT_FOUND不等同取消，COMMITTED继续校验同一回执指纹。 */
    private onStatus(value: unknown, pending: IdleClaimPending): void {
        const status = value as { requestId?: string; status?: string; receipt?: unknown } | null;
        if (!status || status.requestId !== pending.requestId) {
            throw new Error("挂机状态响应与原请求不一致");
        }
        if (status.status === "NOT_FOUND" && status.receipt == null) {
            return;
        }
        if (status.status !== "COMMITTED") {
            throw new Error("挂机查询状态无效");
        }
        this.onReceipt(status.receipt, pending);
    }

    /** 直接成功与查询恢复共用完整回执校验；只从匹配原意图的actual生成通用反馈，不写当前资产。 */
    private onReceipt(value: unknown, pending: IdleClaimPending): void {
        const valueObject = GameProtocolCodecUtils.validateIdleReceipt(value);
        if (valueObject.requestId !== pending.requestId
            || valueObject.expectedOperationVersion !== pending.expectedOperationVersion) {
            throw new Error("挂机历史回执与原请求指纹不一致");
        }
        const receipt = Object.freeze({
            requestId: valueObject.requestId,
            receiptId: valueObject.receiptId,
            expectedOperationVersion: valueObject.expectedOperationVersion,
            beforeOperationVersion: valueObject.beforeOperationVersion,
            afterOperationVersion: valueObject.afterOperationVersion,
            assetRevision: valueObject.assetRevision,
            committedAtSeconds: valueObject.committedAtSeconds,
            previousStartedAtSeconds: valueObject.previousStartedAtSeconds,
            seconds: valueObject.seconds,
            maxSeconds: valueObject.maxSeconds,
            rewardStage: valueObject.rewardStage,
            feedback: RewardUtils.fromActual(
                valueObject.receiptId as string,
                valueObject.assetRevision as number,
                valueObject.actual,
                "POPUP",
            ),
        }) as IdleClaimReceipt;
        this.update("waiting-state", pending, receipt, "历史回执已确认，等待最新状态");
    }

    /** 同时只运行一个流程；对象引用隔离读写迟到，不使用角色/账号比较。 */
    private run(mode: "begin" | "recover" | "confirm", expectedOperationVersion?: number,
        presentationContext: object | null = null): Promise<void> {
        if (this.flow) {
            return this.flow.promise;
        }
        if (!this.isInitialized || !this.port || !this.send) {
            return Promise.resolve();
        }
        if (this.model.idleClaim.phase === "blocked") {
            return Promise.resolve();
        }
        const flow: ClaimFlow = {
            port: this.port,
            promise: Promise.resolve(),
            expectedOperationVersion,
            presentationContext,
        };
        this.flow = flow;
        flow.promise = this.execute(flow, mode).then(() => {
            this.completeFlow(flow);
        }, error => {
            if (this.current(flow)) {
                this.stop(error, "blocked");
                this.completeFlow(flow);
            }
        });
        return flow.promise;
    }

    /** 读取持久意图后一次有界恢复，状态不明/暂时拒绝保留原body，不循环领新奖励。 */
    private async execute(flow: ClaimFlow, mode: "begin" | "recover" | "confirm"): Promise<void> {
        this.update("restoring", this.model.idleClaim.pending, this.model.idleClaim.receipt, "恢复原领取请求");
        let pending = await flow.port.read();
        if (!this.current(flow)) {
            return;
        }
        if (mode === "confirm") {
            await this.confirmObserved(flow, pending);
            return;
        }
        if (!pending && mode === "begin") {
            const claim = this.model.idle?.claimState;
            if (!claim || claim.requestMode !== "ENABLED") {
                this.update("idle", null, null, "领取入口尚未开放");
                return;
            }
            if (flow.expectedOperationVersion !== undefined && claim.operationVersion !== flow.expectedOperationVersion) {
                this.update("idle", null, null, "挂机状态已更新，请重新操作");
                return;
            }
            const request: IdleClaimPending = Object.freeze({ schemaVersion: 1,
                requestId: this.newRequestId(), expectedOperationVersion: claim.operationVersion });
            pending = await flow.port.create(request);
            if (!this.current(flow)) {
                return;
            }
            if (flow.presentationContext && this.sameRequest(pending, request)) {
                this.presentation = { pending, context: flow.presentationContext };
            }
        }
        if (this.presentation && (!pending || !this.sameRequest(this.presentation.pending, pending))) {
            this.presentation = null;
        }
        if (!pending) {
            this.update("idle", null, null, "");
            return;
        }
        const old = this.model.idleClaim;
        const receipt = old.pending && this.sameRequest(old.pending, pending) ? old.receipt : null;
        this.update(receipt ? "waiting-state" : "checking", pending, receipt, "核对原领取结果");
        if (receipt) {
            await this.confirm(flow, true);
            return;
        }
        let versionBeforeStatus = this.model.idle?.claimState?.operationVersion || 0;
        let result = await this.request(flow, Protocol.CHAPTER_IDLE_CLAIM_STATUS, { requestId: pending.requestId });
        if (!this.current(flow)) {
            return;
        }
        if (result.error) {
            this.stop(result.error, result.invalid || this.blocksRecovery(result.error)
                ? "blocked" : "paused");
            return;
        }
        if (!result.frame) {
            return;
        }
        if (this.model.idleClaim.receipt) {
            await this.confirm(flow, true);
            return;
        }
        if (await this.rejectObsolete(flow, pending, versionBeforeStatus)) {
            return;
        }
        const claim = this.model.idle?.claimState;
        if (!claim || claim.requestMode !== "ENABLED") {
            this.update("paused", pending, null, "原请求尚未提交，领取入口保持关闭");
            return;
        }
        this.update("sending", pending, null, "原样重试领取请求");
        result = await this.request(flow, Protocol.CHAPTER_IDLE_CLAIM, {
            requestId: pending.requestId, expectedOperationVersion: pending.expectedOperationVersion,
        });
        if (!this.current(flow)) {
            return;
        }
        if (result.frame) {
            await this.confirm(flow, true);
            return;
        }
        if (result.invalid || this.blocksRecovery(result.error)) {
            this.stop(result.error, "blocked");
            return;
        }
        const code = this.errorCode(result.error);
        // 单次失败可能是响应丢失：只再查询一次，不再次发奖；版本冲突先重新鉴权再查。
        if (code === "IDLE_VERSION_CONFLICT") {
            if (!await this.refresh(flow)) {
                return;
            }
        }
        versionBeforeStatus = this.model.idle?.claimState?.operationVersion || 0;
        const status = await this.request(flow, Protocol.CHAPTER_IDLE_CLAIM_STATUS, { requestId: pending.requestId });
        if (!this.current(flow)) {
            return;
        }
        if (status.frame && this.model.idleClaim.receipt) {
            await this.confirm(flow, code !== "IDLE_VERSION_CONFLICT");
        } else if (status.frame && await this.rejectObsolete(flow, pending, versionBeforeStatus)) {
            return;
        } else {
            this.stop(status.error || result.error || new Error("原领取结果尚未确定"),
                status.invalid || this.blocksRecovery(status.error) ? "blocked" : "paused");
        }
    }

    /** 流程结束后只补一次忙时合并的本地观察；不能因普通推送再启网络查询或重发。 */
    private completeFlow(flow: ClaimFlow): void {
        if (this.flow !== flow) {
            return;
        }
        this.flow = null;
        const queued = this.observationQueued;
        this.observationQueued = false;
        if (queued) {
            this.observeSnapshot();
        }
    }

    /**
     * 普通状态推送只确认已有回执；多标签页已替换原记录时保留新意图并等待重新鉴权恢复。
     * 原记录已清且双版本达到时仅收口本地旧确认；未达到时保留历史摘要等待后续快照。
     */
    private async confirmObserved(flow: ClaimFlow, stored: IdleClaimPending | null): Promise<void> {
        const { pending, receipt } = this.model.idleClaim;
        if (!pending || !receipt) {
            return;
        }
        if (!stored) {
            const confirmed = this.hasConfirmation(receipt);
            this.update(confirmed ? "confirmed" : "waiting-state", confirmed ? null : pending, receipt,
                confirmed ? "原领取请求及最新状态已确认" : "历史回执仍待最新状态确认");
            if (confirmed) {
                this.deliverFeedback(flow, receipt);
            }
            return;
        }
        if (!this.sameRequest(pending, stored)) {
            this.presentation = null;
            this.update("paused", stored, null, "发现新的待确认记录，等待重新鉴权恢复");
            return;
        }
        await this.confirm(flow, false);
    }

    /** 只有回执及两种持久版本都达到确认才条件清理；清理已被其他标签页替换时保留新意图，不交付旧展示。 */
    private async confirm(flow: ClaimFlow, allowRefresh: boolean): Promise<void> {
        if (!this.current(flow)) {
            return;
        }
        const { pending, receipt } = this.model.idleClaim;
        if (!pending || !receipt) {
            return;
        }
        if (!this.hasConfirmation(receipt) && allowRefresh) {
            if (!await this.refresh(flow)) {
                return;
            }
        }
        if (!this.current(flow)) {
            return;
        }
        if (!this.hasConfirmation(receipt)) {
            this.update("waiting-state", pending, receipt, "回执已提交，最新状态尚未同步");
            return;
        }
        // clear由持久实现原子核对完整请求，旧A无法删除另一个标签页刚建立的B。
        const cleared = await flow.port.clear(pending);
        if (!this.current(flow)) {
            return;
        }
        if (!cleared) {
            const stored = await flow.port.read();
            if (!this.current(flow)) {
                return;
            }
            if (stored) {
                if (this.sameRequest(stored, pending)) {
                    throw new Error("挂机原请求条件清理未完成，保留待确认记录");
                }
                this.presentation = null;
                this.update("paused", stored, null, "发现新的待确认记录，等待重新鉴权恢复");
                return;
            }
        }
        if (this.current(flow)) {
            this.update("confirmed", null, receipt, "原领取请求及最新状态已确认");
            this.deliverFeedback(flow, receipt);
        }
    }

    /** 双确认及持久条件清理后交付单次完整信号；零到账仍收口，显示异常不撤销资产或重发。 */
    private deliverFeedback(flow: ClaimFlow, receipt: IdleClaimReceipt): void {
        if (!this.current(flow)) {
            return;
        }
        const origin = this.presentation;
        const presentationContext = origin && origin.pending.requestId === receipt.requestId
            && origin.pending.expectedOperationVersion === receipt.expectedOperationVersion ? origin.context : null;
        // 显示回调可以同步换页或抛错；先释放来源，避免重入后同一请求再借用旧现场。
        this.presentation = null;
        if (!this.onConfirmed) {
            return;
        }
        try {
            this.onConfirmed(Object.freeze({ receipt, presentationContext }));
        } catch (error) {
            const detail = error instanceof Error ? error.stack || error.message : String(error);
            GameLog.shared.classified("MODULE", "warn", "MainChapterIdleClaimController",
                "挂机结果已确认，显示信号交付失败：" + receipt.receiptId + "\n" + detail);
        }
    }

    /** NOT_FOUND只有在查询前已接纳更新的消费版本时才可证实原意图不能再提交。 */
    private async rejectObsolete(flow: ClaimFlow, pending: IdleClaimPending, versionBeforeStatus: number): Promise<boolean> {
        if (versionBeforeStatus <= pending.expectedOperationVersion) {
            return false;
        }
        await flow.port.clear(pending);
        if (this.current(flow)) {
            this.presentation = null;
            this.update("rejected", null, null, "原请求未提交，累计版本已被其他操作消费");
        }
        return true;
    }

    /** 只通过重新鉴权刷新唯一权威状态；异常保留原请求，不从历史回执补资产。 */
    private async refresh(flow: ClaimFlow): Promise<boolean> {
        if (!this.synchronize) {
            this.update("waiting-state", this.model.idleClaim.pending, this.model.idleClaim.receipt, "等待重新鉴权同步状态");
            return false;
        }
        try {
            await this.synchronize();
            return this.current(flow);
        } catch (error) {
            if (this.current(flow)) {
                this.stop(error, "paused");
            }
            return false;
        }
    }

    /** 身份交付完成后才路由本条响应；旧身份回调不交付时返回空结果。 */
    private async request(flow: ClaimFlow, name: IdleClaimCommand, body: object): Promise<{
        frame?: GameFrame; error?: unknown; invalid?: boolean;
    }> {
        const result: { frame?: GameFrame; error?: unknown; invalid?: boolean } = {};
        try {
            await this.send!(name, body, frame => {
                if (!this.current(flow)) {
                    return;
                }
                try {
                    if (frame.name !== name) {
                        throw new Error("挂机响应协议与原命令不一致");
                    }
                    ProtocolRouter.instance.dispatch(this, frame);
                    result.frame = frame;
                } catch (error) {
                    result.error = error;
                    result.invalid = true;
                }
            }, error => {
                if (this.current(flow)) {
                    result.error = error;
                }
            });
        } catch (error) {
            result.error = error;
        }
        return result;
    }

    /** 两个独立持久版本都不得落后于历史回执；当前更高版本也可以完成确认。 */
    private hasConfirmation(receipt: IdleClaimReceipt): boolean {
        return (this.model.state?.assetRevision || 0) >= receipt.assetRevision
            && (this.model.idle?.claimState?.operationVersion || 0) >= receipt.afterOperationVersion;
    }

    /** 原始请求完整指纹比较只用于本地命令，不比较身份。 */
    private sameRequest(left: IdleClaimPending, right: IdleClaimPending): boolean {
        return left.schemaVersion === right.schemaVersion && left.requestId === right.requestId
            && left.expectedOperationVersion === right.expectedOperationVersion;
    }

    /** 流程必须仍持有当前激活口及任务对象，避免解除激活后的存储迟到污染内存。 */
    private current(flow: ClaimFlow): boolean {
        return this.isInitialized && this.flow === flow && this.port === flow.port;
    }

    /** 原请求编号使用密码学UUID，随机源不可用时拒绝建单而非保存不可靠编号。 */
    private newRequestId(): string {
        const crypto = globalThis.crypto;
        if (!crypto?.getRandomValues) {
            throw new Error("当前环境无法生成可靠领取请求编号");
        }
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
    }

    /** 只按稳定错误码识别指纹/版本冲突，不根据文案或retryable猜测是否可删除。 */
    private errorCode(error: unknown): string {
        return error && typeof error === "object" && "code" in error ? String(error.code) : "";
    }

    /** 指纹冲突与非法协议都不能继续自动发奖或探测；保留原请求等待明确处理。 */
    private blocksRecovery(error: unknown): boolean {
        const code = this.errorCode(error);
        return code === "IDLE_REQUEST_CONFLICT" || code === "INVALID_MESSAGE";
    }

    /** 在能够决定保留意图的边界记录一次；结果文字为操作进度，未来提示由统一toast消费。 */
    private stop(error: unknown, phase: "paused" | "blocked"): void {
        const message = error instanceof Error ? error.message : String(error || "领取恢复暂不可用");
        GameLog.shared.classified("MODULE", "warn", "MainChapterIdleClaimController",
            error instanceof Error ? error.stack || message : message);
        this.update(phase, this.model.idleClaim.pending, this.model.idleClaim.receipt, message);
    }

    /** 冻结命令展示快照并通知现有主线事件，不提交任何服务器资产字段。 */
    private update(phase: IdleClaimProgress["phase"], pending: IdleClaimPending | null,
        receipt: IdleClaimReceipt | null, message: string): void {
        this.model.idleClaim = Object.freeze({ phase, pending, receipt, message });
        this.emit("main-chapter.updated", undefined);
    }
}
