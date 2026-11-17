/**
 * 主线里程碑稳定键确认：接收原领取/查询回执，等待唯一主线快照的已领集合与版本双确认。
 * 应用持有持久意图和身份交付，模块不持凭证、不写已领集合，也不直接打开奖励窗。
 * 关闭页面不取消事务，重置撤销旧流程；原回执交通用反馈失败时保留，重试不重新发奖。
 */
import { BaseController } from "../../framework/BaseController";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import { GameProtocolCodecUtils } from "../../platform/GameProtocolCodecUtils";
import { MainChapterController } from "./MainChapterController";
import { MainChapterModel } from "./MainChapterModel";
import type { MainChapterRewardActual } from "./MainChapterModel";
import type { MainChapterMilestoneReceipt, MainChapterMilestoneSend } from "./data/MainChapterMilestoneData";
import { RewardUtils } from "../reward/utils/RewardUtils";
import type { RewardExperienceGain } from "../reward/data/RewardData";
import { GameLog } from "../../core/GameLog";

/** 一轮有界恢复任务，不透明引用仅撤销旧续段，不保存账号或资源状态。 */
interface MilestoneFlow {
    /** 本轮稳定配置ID，重复点击和恢复共用。 */
    readonly rewardId: number;
    /** 本轮异步完成，不代表已发奖；实际结果读模块阶段。 */
    promise: Promise<void>;
}

export class MainChapterMilestoneController extends BaseController {
    /** 应用提供的两条身份隔离请求，未装配时拒绝意图。 */
    private send: MainChapterMilestoneSend | null = null;
    /** 缺统一状态时有界重新鉴权，不另查库存或里程碑集合。 */
    private synchronize: (() => Promise<void>) | null = null;
    /** 原回执与快照双确认后交付，Promise允许应用等原反馈开始再清持久意图。 */
    private onConfirmed: ((receipt: MainChapterMilestoneReceipt) => void | Promise<void>) | null = null;
    /** 在途请求引用；身份重置失效，关页保留。 */
    private flow: MilestoneFlow | null = null;
    /** 当前异步反馈交付，重复快照不创建第二份反馈。 */
    private delivery: { readonly receiptId: string; promise: Promise<void> } | null = null;
    /** 本次交付失败的原回执；普通状态推送不自动循环重试，显式claim/recover才解除。 */
    private blockedReceipt: string | null = null;

    /** 注入应用原有唯一主线Model，不创建第二份已领集合。 */
    public constructor(private readonly model: MainChapterModel = MainChapterModel.instance) {
        super();
    }

    /** 注入身份隔离网络、原快照恢复和原反馈交付，不持View或账号。 */
    public configure(send: MainChapterMilestoneSend, synchronize: () => Promise<void>,
        onConfirmed?: (receipt: MainChapterMilestoneReceipt) => void | Promise<void>): void {
        this.send = send;
        this.synchronize = synchronize;
        this.onConfirmed = onConfirmed || null;
    }

    /** 只登记两条实际里程碑协议，状态快照仍由原主线Controller提交。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.CHAPTER_MILESTONE_CLAIM, Protocol.CHAPTER_MILESTONE_STATUS]));
    }

    /** 新点击由应用先持久化稳定键，再调用此入口；已存在结果优先确认，不重复发奖。 */
    public claim(rewardId: number): Promise<void> {
        return this.start(rewardId, false);
    }

    /** 原持久键恢复先查回执，未找到才按同一稳定键发送幂等领取。 */
    public recover(rewardId: number): Promise<void> {
        return this.start(rewardId, true);
    }

    /** 统一快照已被应用整包接纳后，仅做本地双确认，不创建新领取或补造集合。 */
    public afterSnapshot(): void {
        void this.confirm().catch(error => this.report(error));
    }

    /** 校验真实回包并只保存历史结果；空查询不写权威已领集合。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        const pending = this.model.milestoneClaim.rewardId;
        if (protocol === Protocol.CHAPTER_MILESTONE_STATUS) {
            const status = value as { rewardId?: unknown; found?: unknown; receipt?: unknown };
            if (!status || status.rewardId !== pending || typeof status.found !== "boolean"
                    || (status.found ? status.receipt === undefined : status.receipt !== undefined)) {
                throw new Error("里程碑查询与原稳定业务键不一致");
            }
            if (status.found) {
                this.accept(status.receipt);
            }
        } else if (protocol === Protocol.CHAPTER_MILESTONE_CLAIM) {
            this.accept(value);
        } else {
            throw new Error("非里程碑协议");
        }
        this.notify();
    }

    /** 撤销旧在途续段和反馈交付引用，不删除应用持久意图或修改资产。 */
    protected onResetSession(): void {
        this.flow = null;
        this.delivery = null;
        this.blockedReceipt = null;
        this.model.milestoneClaim = Object.freeze({ phase: "idle", rewardId: null, receipt: null, message: "" });
        this.notify();
    }

    /** 应用销毁后撤去注入能力，迟到续段不能再次请求或展示。 */
    protected onDispose(): void {
        this.send = null;
        this.synchronize = null;
        this.onConfirmed = null;
    }

    /** 同键合并，另一个未收口键明确拒绝；完成Promise不等同于服务端成功。 */
    private start(rewardId: number, recovery: boolean): Promise<void> {
        if (!Number.isSafeInteger(rewardId) || rewardId <= 0 || rewardId > 0xffffffff || !this.isInitialized || !this.send) {
            return Promise.reject(new Error("里程碑领取尚未准备好或编号无效"));
        }
        if (this.flow) {
            return this.flow.rewardId === rewardId ? this.flow.promise
                : Promise.reject(new Error("另一项通关奖励正在确认"));
        }
        const previous = this.model.milestoneClaim;
        if (previous.rewardId !== null && previous.rewardId !== rewardId && previous.phase !== "confirmed") {
            return Promise.reject(new Error("上一项通关奖励尚待确认"));
        }
        if (previous.rewardId !== rewardId) {
            this.model.milestoneClaim = Object.freeze({ phase: "pending", rewardId, receipt: null, message: "" });
        }
        const flow: MilestoneFlow = { rewardId, promise: Promise.resolve() };
        this.blockedReceipt = null;
        this.flow = flow;
        const finished = (): void => {
            if (this.flow === flow) {
                this.flow = null;
            }
        };
        flow.promise = Promise.resolve().then(() => this.execute(flow, recovery)).then(() => {
            finished();
        }, error => {
            finished();
            throw error;
        });
        return flow.promise;
    }

    /** 一轮最多查询一次、发送同键一次、鉴权一次；缺状态保留原意图，下一轮显式恢复。 */
    private async execute(flow: MilestoneFlow, recovery: boolean): Promise<void> {
        try {
            if (this.model.milestoneClaim.phase === "confirmed") {
                return;
            }
            if (!this.model.milestoneClaim.receipt && recovery) {
                await this.request(flow, Protocol.CHAPTER_MILESTONE_STATUS);
            }
            if (this.flow !== flow) {
                return;
            }
            if (!this.model.milestoneClaim.receipt) {
                await this.request(flow, Protocol.CHAPTER_MILESTONE_CLAIM);
            }
            if (this.flow !== flow) {
                return;
            }
            if (!this.ready() && this.synchronize) {
                await this.synchronize();
            }
            if (this.flow === flow) {
                await this.confirm();
            }
        } catch (error) {
            if (this.flow === flow) {
                const current = this.model.milestoneClaim;
                this.model.milestoneClaim = Object.freeze({ ...current, phase: "pending",
                    message: error instanceof Error ? error.message : "通关奖励确认失败" });
                this.notify();
            }
            throw error;
        }
    }

    /** 仅当前流程交付真实成功/失败，身份隔离仍归应用；业务拒绝保留原键以便查成功回执。 */
    private async request(flow: MilestoneFlow,
        name: typeof Protocol.CHAPTER_MILESTONE_CLAIM | typeof Protocol.CHAPTER_MILESTONE_STATUS): Promise<void> {
        let failure: unknown;
        await this.send!(name, { rewardId: flow.rewardId }, frame => {
            if (this.flow === flow) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => { failure = error; });
        if (this.flow === flow && failure) {
            throw failure;
        }
    }

    /** 原回执与同一稳定键相符，重复内容必须完全一致，不能替换原成功身份或奖励。 */
    private accept(value: unknown): void {
        const receipt = MainChapterMilestoneController.readReceipt(value);
        const current = this.model.milestoneClaim;
        if (receipt.rewardId !== current.rewardId
                || (current.receipt && JSON.stringify(current.receipt) !== JSON.stringify(receipt))) {
            throw new Error("里程碑回执与原稳定键或已确认内容冲突");
        }
        this.model.milestoneClaim = Object.freeze({ ...current, receipt, message: "" });
    }

    /** 最新集合及统一revision都确认后才可显示；历史receipt.state不写回当前Model。 */
    private ready(): boolean {
        const receipt = this.model.milestoneClaim.receipt;
        const state = this.model.state;
        return !!receipt && !!state && state.assetRevision >= receipt.assetRevision
            && !!state.milestoneProgress?.claimedIds.includes(receipt.rewardId);
    }

    /** 同回执只允许一个异步交付，成功后标已交付；失败保留原结果，显式恢复可只重试反馈。 */
    private confirm(): Promise<void> {
        const current = this.model.milestoneClaim;
        if (current.phase === "confirmed" || !this.ready() || !this.onConfirmed || !current.receipt
                || this.blockedReceipt === current.receipt.receiptId) {
            return Promise.resolve();
        }
        if (this.delivery) {
            return this.delivery.promise;
        }
        const receipt = current.receipt;
        const delivery = { receiptId: receipt.receiptId, promise: Promise.resolve() };
        this.delivery = delivery;
        this.model.milestoneClaim = Object.freeze({ ...current, phase: "delivering", message: "" });
        this.notify();
        delivery.promise = Promise.resolve().then(() => {
            if (this.delivery === delivery && this.isInitialized) {
                return this.onConfirmed?.(receipt);
            }
        }).then(() => {
            if (this.delivery === delivery && this.model.milestoneClaim.receipt === receipt) {
                this.model.milestoneClaim = Object.freeze({ ...this.model.milestoneClaim, phase: "confirmed", message: "" });
                this.notify();
            }
        }).catch(error => {
            if (this.delivery === delivery) {
                this.blockedReceipt = receipt.receiptId;
                this.model.milestoneClaim = Object.freeze({ ...this.model.milestoneClaim,
                    phase: "pending", message: error instanceof Error ? error.message : "奖励反馈仍待恢复" });
                this.notify();
            }
            throw error;
        }).then(() => {
            if (this.delivery === delivery) {
                this.delivery = null;
            }
        }, error => {
            if (this.delivery === delivery) {
                this.delivery = null;
            }
            throw error;
        });
        return delivery.promise;
    }

    /** 静态校验冻结回执及实例对应，不依赖当前资产或把历史已领集合覆盖最新状态。 */
    public static readReceipt(value: unknown): MainChapterMilestoneReceipt {
        const v = value as MainChapterMilestoneReceipt;
        if (!v || v.schemaVersion !== 1 || !Number.isSafeInteger(v.rewardId) || v.rewardId <= 0
                || v.rewardId > 0xffffffff || !Number.isSafeInteger(v.targetChapter) || v.targetChapter <= 0
                || typeof v.receiptId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(v.receiptId)
                || typeof v.roleId !== "string" || !v.roleId || v.roleId.length > 128
                || typeof v.rulesVersion !== "string" || !v.rulesVersion.startsWith("chapter-milestone-v1:")
                || !Number.isSafeInteger(v.assetRevision) || v.assetRevision <= 0) {
            throw new Error("里程碑成功回执身份或版本无效");
        }
        const state = MainChapterController.readState(v.state, v.assetRevision);
        if (!state || !state.milestoneProgress?.claimedIds.includes(v.rewardId) || state.maxCleared < v.targetChapter
                || !v.actual || v.actual.roleId !== v.roleId || !Array.isArray(v.actual.items)
                || !Array.isArray(v.actual.bonuses) || !Array.isArray(v.actual.experience) || !Array.isArray(v.actual.heroes)) {
            throw new Error("里程碑回执缺少对应集合或真实结果");
        }
        RewardUtils.fromActual(v.receiptId, v.assetRevision, v.actual);
        const seen = new Set<number>();
        const items = v.actual.items.map(item => {
            if (!item || !Number.isSafeInteger(item.itemId) || item.itemId <= 0 || seen.has(item.itemId)
                    || ![item.requested, item.credited, item.ignored].every(number => Number.isSafeInteger(number) && number >= 0)
                    || item.requested <= 0 || item.requested - item.credited !== item.ignored
                    || !["NONE", "ROLE_MAX_LEVEL", "TAVERN_CAP"].includes(item.reason)
                    || (item.ignored === 0) !== (item.reason === "NONE")) {
                throw new Error("里程碑实际到账明细损坏");
            }
            seen.add(item.itemId);
            return Object.freeze({ ...item });
        });
        const heroes = GameProtocolCodecUtils.validateHeroGrants(v.actual.heroes, items);
        const actual: MainChapterRewardActual & { heroes: typeof heroes } = Object.freeze({ roleId: v.roleId,
            items: Object.freeze(items), heroes,
            bonuses: Object.freeze(v.actual.bonuses.map(item => Object.freeze({ ...item }))),
            experience: Object.freeze(v.actual.experience.map(item => Object.freeze({ ...item } as RewardExperienceGain))) });
        return Object.freeze({ schemaVersion: 1, rewardId: v.rewardId, receiptId: v.receiptId,
            roleId: v.roleId, assetRevision: v.assetRevision, state, actual,
            targetChapter: v.targetChapter, rulesVersion: v.rulesVersion });
    }

    /** 模块操作状态变化只走原主线事件，页面负责清理自身监听。 */
    private notify(): void {
        this.emit(MainChapterController.Updated, undefined);
    }

    /** 异步本地双确认失败统一记录，保留原结果，不重复写服务端资产。 */
    private report(error: unknown): void {
        GameLog.shared.classified("MODULE", "warn", "MainChapterMilestoneController",
            "里程碑反馈仍待恢复：" + (error instanceof Error ? error.stack || error.message : String(error)));
    }
}
