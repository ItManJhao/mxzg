/**
 * 独立通关奖励确认：以原绝对关卡查询或领取，回执与已接纳的统一快照双确认后交付通用反馈。
 * 原意图持久化和旧账号回包隔离由应用负责，本模块只更新主线Model。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { GameProtocolCodecUtils } from "../../platform/GameProtocolCodecUtils";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { RewardUtils } from "../reward/utils/RewardUtils";
import type { MainChapterFirstRewardReceipt, FirstRewardSend } from "./data/MainChapterFirstRewardData";
import { MainChapterController } from "./MainChapterController";
import { MainChapterModel } from "./MainChapterModel";
import { ChapterClearRewardUtils } from "./utils/ChapterClearRewardUtils";

/** 一轮应用确认引用；换号时撤销，关页不影响事务。 */
interface ConfirmFlow {
    /** 重复点击按原绝对关卡合并。 */
    readonly chapter: number;
    /** 等待本轮查询、领取及反馈；不代表资产新增数量。 */
    promise: Promise<void>;
}

export class MainChapterFirstRewardController extends BaseController {
    /** 应用提供的真实回包交付，模块不保存连接或令牌。 */
    private send: FirstRewardSend | null = null;
    /** 缺状态时重做统一鉴权，不查询另一份库存。 */
    private synchronize: (() => Promise<void>) | null = null;
    /** 双确认后由应用交共享通用队列，不由本模块创建窗口。 */
    private onConfirmed: ((receipt: MainChapterFirstRewardReceipt) => void | Promise<void>) | null = null;
    /** 同一身份正在进行的一轮；完成或角色重置后置空。 */
    private flow: ConfirmFlow | null = null;
    /** 展示失败的原回执编号；普通快照不循环重试，玩家或重连可重新确认。 */
    private blockedDelivery: string | null = null;

    /** 注入唯一模型，组件页面切换不会重建业务状态。 */
    public constructor(
        /** 统一主线模型，持有权威资格和本地过程。 */
        private readonly model: MainChapterModel = MainChapterModel.instance,
    ) {
        super();
    }

    /** 复用应用认证交付、统一快照和通用发奖反馈。 */
    public configure(send: FirstRewardSend, synchronize: () => Promise<void>,
        onConfirmed?: (receipt: MainChapterFirstRewardReceipt) => void | Promise<void>): void {
        this.send = send;
        this.synchronize = synchronize;
        this.onConfirmed = onConfirmed ?? null;
    }

    /** 只接收原绝对关卡的独立领取和查询回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.CHAPTER_FIRST_REWARD_CLAIM, Protocol.CHAPTER_FIRST_REWARD_STATUS]));
    }

    /** 应用已持久化新意图，按当前权威可领集合进入本轮。 */
    public claim(chapter: number): Promise<void> {
        return this.start(chapter, false);
    }

    /** 恢复原关卡先查回执，服务端确认没有结果且仍可领时才重发同一关卡。 */
    public recover(chapter: number): Promise<void> {
        return this.start(chapter, true);
    }

    /** 普通状态推送只在模块已有真实回执且足够新后补反馈，不追加领取请求。 */
    public afterSnapshot(): void {
        const current = this.model.firstRewardClaim;
        if (!this.flow && current.phase === "pending" && current.receipt && this.ready(current.receipt)
            && this.blockedDelivery !== current.receipt.receiptId) {
            void this.start(current.receipt.chapter, true).catch(error => {
                GameLog.shared.classified("MODULE", "warn", "MainChapterFirstRewardController",
                    "通关奖励反馈待恢复：" + (error instanceof Error ? error.message : String(error)));
            });
        }
    }

    /** 真实协议定向分发后核对原关卡；查询无结果不改玩家资格或已领集合。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.CHAPTER_FIRST_REWARD_CLAIM:
                this.acceptReceipt(value);
                return;
            case Protocol.CHAPTER_FIRST_REWARD_STATUS: {
                const result = value as { chapter?: unknown; found?: unknown; receipt?: unknown } | null;
                if (!result || result.chapter !== this.model.firstRewardClaim.chapter || typeof result.found !== "boolean"
                    || (result.found ? result.receipt === undefined : result.receipt !== undefined)) {
                    throw new Error("独立通关奖励查询与原关卡不一致");
                }
                if (result.found) {
                    this.acceptReceipt(result.receipt);
                }
                return;
            }
            default:
                throw new Error("非独立通关奖励协议");
        }
    }

    /** 角色变更时立即清空本轮；原日志由应用保留。 */
    protected onResetSession(): void {
        this.flow = null;
        this.blockedDelivery = null;
        this.update("idle", null, null, false);
    }

    /** 应用退出解除注入能力，旧续段不再发送或展示。 */
    protected onDispose(): void {
        this.send = null;
        this.synchronize = null;
        this.onConfirmed = null;
    }

    /** 同关卡的在途任务复用，另一个原操作仍待确认时不能覆盖。 */
    private start(chapter: number, recover: boolean): Promise<void> {
        ChapterClearRewardUtils.id(chapter);
        if (!this.send || !this.isInitialized) {
            return Promise.reject(new Error("通关奖励尚未准备好"));
        }
        if (this.flow) {
            return this.flow.chapter === chapter ? this.flow.promise : Promise.reject(new Error("另一项通关奖励正在确认"));
        }
        const previous = this.model.firstRewardClaim;
        if (previous.phase === "confirmed" && previous.chapter === chapter) {
            return Promise.resolve();
        }
        if (previous.phase === "pending" && previous.chapter !== chapter) {
            return Promise.reject(new Error("请先恢复上一项通关奖励"));
        }
        this.blockedDelivery = null;
        const flow: ConfirmFlow = { chapter, promise: Promise.resolve() };
        this.flow = flow;
        flow.promise = Promise.resolve().then(() => this.execute(flow, recover)).then(() => {
            this.finish(flow);
        }, error => {
            this.finish(flow, error);
            throw error;
        });
        this.update("pending", chapter, previous.chapter === chapter ? previous.receipt : null, true);
        return flow.promise;
    }

    /** 一轮最多一次查询、同键提交和重新鉴权；缺状态原键保留。 */
    private async execute(flow: ConfirmFlow, recover: boolean): Promise<void> {
        if (this.flow !== flow) {
            return;
        }
        if (recover && !this.model.firstRewardClaim.receipt) {
            await this.request(flow, Protocol.CHAPTER_FIRST_REWARD_STATUS);
        }
        if (this.flow !== flow) {
            return;
        }
        if (!this.model.firstRewardClaim.receipt) {
            if (!this.model.state?.firstRewardProgress) {
                throw new Error("该关卡奖励的领取资格尚待服务器确认");
            }
            // 持久原意图送回服务端裁定，期间资格变化不能从本地快照当作最终失败。
            await this.request(flow, Protocol.CHAPTER_FIRST_REWARD_CLAIM);
        }
        if (this.flow !== flow) {
            return;
        }
        const receipt = this.model.firstRewardClaim.receipt;
        if (!receipt) {
            throw new Error("通关奖励原回执尚未到达");
        }
        if (!this.ready(receipt) && this.synchronize) {
            await this.synchronize();
        }
        if (this.flow !== flow) {
            return;
        }
        if (!this.ready(receipt)) {
            throw new Error("通关奖励已提交，等待统一状态确认");
        }
        this.update("delivering", flow.chapter, receipt, true);
        try {
            await this.onConfirmed?.(receipt);
        } catch (error) {
            if (this.flow === flow) {
                this.blockedDelivery = receipt.receiptId;
            }
            throw error;
        }
        if (this.flow === flow) {
            this.update("confirmed", flow.chapter, receipt, false);
        }
    }

    /** 应用完成身份验证后，才将同一轮真实成功回包交模块，失败只保留原键。 */
    private async request(flow: ConfirmFlow, name: Parameters<FirstRewardSend>[0]): Promise<void> {
        let failure: unknown;
        await this.send!(name, { chapter: flow.chapter }, frame => {
            if (this.flow === flow) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => { failure = error; });
        if (failure && this.flow === flow) {
            throw failure;
        }
    }

    /** 回执历史明细只留反馈投影，不将回执状态写入当前玩家资产。 */
    private acceptReceipt(value: unknown): void {
        const raw = value as MainChapterFirstRewardReceipt | null;
        const current = this.model.firstRewardClaim;
        if (!raw || raw.schemaVersion !== 1 || ChapterClearRewardUtils.id(raw.chapter) !== current.chapter
            || raw.actual?.roleId !== raw.roleId || !Array.isArray(raw.actual.heroes) || !Array.isArray(raw.actual.experience)) {
            throw new Error("通关奖励历史回执归属或关卡无效");
        }
        RewardUtils.fromActual(raw.receiptId, raw.assetRevision, raw.actual);
        const items = raw.actual.items.map(item => {
            if (!item || ![item.requested, item.credited, item.ignored].every(n => Number.isSafeInteger(n) && n >= 0)
                || item.requested <= 0 || item.requested - item.credited !== item.ignored
                || !["NONE", "ROLE_MAX_LEVEL", "TAVERN_CAP"].includes(item.reason)
                || (item.ignored === 0) !== (item.reason === "NONE")) {
                throw new Error("通关奖励实际到账明细无效");
            }
            return Object.freeze({ ...item });
        });
        const receipt: MainChapterFirstRewardReceipt = Object.freeze({
            schemaVersion: 1, chapter: raw.chapter, receiptId: raw.receiptId, roleId: raw.roleId, assetRevision: raw.assetRevision,
            actual: Object.freeze({ roleId: raw.roleId, items: Object.freeze(items),
                heroes: GameProtocolCodecUtils.validateHeroGrants(raw.actual.heroes, items),
                bonuses: Object.freeze(raw.actual.bonuses.map(item => Object.freeze({ ...item }))),
                experience: Object.freeze(raw.actual.experience.map(item => Object.freeze({ ...item }))),
            }),
        });
        if (current.receipt && JSON.stringify(current.receipt) !== JSON.stringify(receipt)) {
            throw new Error("同一关卡通关奖励出现冲突回执");
        }
        this.update("pending", current.chapter, receipt, true);
    }

    /** 仅由足够新的统一快照及真实已领集合确认回执，里程碑无关。 */
    private ready(receipt: MainChapterFirstRewardReceipt): boolean {
        const state = this.model.state;
        return !!state && state.assetRevision >= receipt.assetRevision
            && !!state.firstRewardProgress?.claimedChapters.includes(receipt.chapter);
    }

    /** 双确认完成则保留结果；服务端明确未发奖时结束本轮，否则保留原键查询。 */
    private finish(flow: ConfirmFlow, error?: unknown): void {
        if (this.flow === flow) {
            this.flow = null;
            const current = this.model.firstRewardClaim;
            if (!current.receipt && error instanceof SocketFailure
                && ["FIRST_REWARD_INVALID", "FIRST_REWARD_UNKNOWN", "FIRST_REWARD_NOT_REACHED"].includes(error.code)) {
                this.update("idle", null, null, false);
            } else if (current.phase !== "confirmed") {
                this.update("pending", flow.chapter, current.receipt, false);
            }
        }
    }

    /** 更新唯一Model后发原主线事件，窗口生命周期由View自身负责。 */
    private update(phase: MainChapterModel["firstRewardClaim"]["phase"], chapter: number | null,
        receipt: MainChapterFirstRewardReceipt | null, busy: boolean): void {
        this.model.firstRewardClaim = Object.freeze({ phase, chapter, receipt, busy });
        this.emit(MainChapterController.Updated, undefined);
    }
}
