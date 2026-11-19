/** 主线控制器接收快照并发送挑战、战报、结算和领取请求。进度与资产采用服务端统一快照。 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { STATE_PROTOCOLS, ProtocolStateUtils } from "../../platform/ProtocolStateUtils";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { GameLog } from "../../core/GameLog";
import type { RewardBinding } from "../reward/RewardBinding";
import { MainChapterModel, type MainChapterReplay, type MainChapterExperience, type MainChapterReceipt } from "./MainChapterModel";
import type { IdleClaimConfirmation, IdleClaimReceipt } from "./data/MainChapterIdleClaimData";
import { BattleReplayUtils } from "./utils/BattleReplayUtils";
import { ChapterSettlementUtils } from "./utils/ChapterSettlementUtils";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "main-chapter.updated": undefined;
        "main-chapter.idle-collection": IdleClaimConfirmation;
    }
}

/** 挑战、结算及战报的命令类型。 */
export type ChapterCommand = typeof Protocol.CHAPTER_CHALLENGE | typeof Protocol.CHAPTER_CLAIM | typeof Protocol.CHAPTER_REPLAY | typeof Protocol.CHAPTER_IDLE_ENCOUNTER;
/** 独立首通与里程碑按各自配置编号领取。 */
type ChapterRewardCommand = typeof Protocol.CHAPTER_MILESTONE_CLAIM | typeof Protocol.CHAPTER_FIRST_REWARD_CLAIM;
/** 通关奖励即时回包，库存和已领资格仍由快照提交。 */
interface ChapterRewardReceipt {
    readonly rewardId?: number;
    readonly chapter?: number;
    readonly receiptId: string;
    readonly assetRevision: number;
    readonly actual: unknown;
}
/** 主线使用账号通道交付请求，不自行建立连接。 */
interface ChapterOperations {
    /** 向发起操作的会话交付主线请求结果。 */
    deliver(name: ChapterCommand | ChapterRewardCommand | typeof Protocol.CHAPTER_IDLE_CLAIM, body: object, received: (frame: GameFrame) => void,
        failed: (error: unknown) => void): Promise<void>;
}

/** 一次结算确认任务；引用只用于合并业务操作及撤销重置后的异步续段，不承担身份判断。 */
interface SettlementTask {
    /** 当前任务始终使用同一个服务器战斗编号。 */
    battleId: string;
    /** 在途确认任务，结束后释放。 */
    promise: Promise<void>;
}
export class MainChapterController extends BaseController {
    /** 应用装配一次，页面只读Model并调用业务意图。 */
    public static readonly instance = new MainChapterController(MainChapterModel.instance);
    /** 数据或操作状态变化后刷新页面；监听由页面作用域清理。 */
    public static readonly Updated = "main-chapter.updated";
    /** 账号层提供的主线请求与快照通道，模块销毁时解除。 */
    private operations: ChapterOperations | null = null;
    /** 应用走通用奖励队列展示即时到账，模块销毁时解除。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;
    /** 当前在途结算任务；关页保留，身份重置或任务完成解除，旧续段不能改新任务。 */
    private settlementTask: SettlementTask | null = null;
    /** 应用将双确认回执按固定归属交给通用队列：reward为全部，battle仅为胜利页关闭后的升级附赠。 */
    private restoreFeedback: ((receipt: MainChapterReceipt, presentation: "battle" | "reward") => "queued" | "empty") | null = null;
    /** 应用只重试通用队列显示，不重新发送结算、挑战或战报读取。 */
    private retryFeedback: (() => void) | null = null;

    /** 注入唯一数据所有者，独立测试可传入隔离Model。 */
    constructor(private readonly model: MainChapterModel) { super(); }

    /** 注入账号连接和共用的即时奖励展示入口。 */
    public configure(operations: ChapterOperations, rewards: Pick<RewardBinding, "restoreActual"> | null = null): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 应用装配正常附赠与冷恢复共用反馈；归属固定，模块不持有RewardView或当前账号资料。 */
    public configureSettlementFeedback(
        restore: NonNullable<MainChapterController["restoreFeedback"]>,
        retry: () => void,
    ): void {
        this.restoreFeedback = restore;
        this.retryFeedback = retry;
    }

    /** 登记明确协议清单，页面打开不再查询主线状态。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            ...STATE_PROTOCOLS,
            Protocol.CHAPTER_CHALLENGE,
            Protocol.CHAPTER_CLAIM,
            Protocol.CHAPTER_REPLAY,
            Protocol.CHAPTER_IDLE_ENCOUNTER,
            Protocol.CHAPTER_IDLE_CLAIM,
            Protocol.CHAPTER_FIRST_REWARD_CLAIM,
            Protocol.CHAPTER_MILESTONE_CLAIM,
        ]));
    }

    /** 按协议交给对应的主线处理方法，完成后一次通知界面读取 Model。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onChapterState(protocol, value);
                break;
            case Protocol.CHAPTER_CHALLENGE:
            case Protocol.CHAPTER_CLAIM:
                this.onReceipt(protocol, value);
                break;
            case Protocol.CHAPTER_REPLAY:
                this.onReplay(value);
                break;
            case Protocol.CHAPTER_IDLE_ENCOUNTER:
                this.onIdleEncounter(value);
                break;
            case Protocol.CHAPTER_IDLE_CLAIM:
            case Protocol.CHAPTER_FIRST_REWARD_CLAIM:
            case Protocol.CHAPTER_MILESTONE_CLAIM:
                this.showActualReward(value as ChapterRewardReceipt);
                return;
            default:
                throw new Error("非主线协议");
        }
        this.notify();
    }

    /** 提交主线和挂机快照。首次鉴权记下待结算的战斗，玩家进入主线页时再恢复。 */
    private onChapterState(protocol: ProtocolName, value: unknown): void {
        const state = ProtocolStateUtils.statePayload(protocol, value);
        this.model.applySnapshot(state, protocol !== Protocol.STATE_CHANGED);
        this.observeSettlement();
    }

    /** 提交一次独立通关领奖，结果交由通用反馈展示。 */
    public claimFirstReward(chapter: number): Promise<void> {
        return this.claimReward(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter });
    }

    /** 按当前卡片的配置编号提交一次里程碑领奖。 */
    public claimMilestone(rewardId: number): Promise<void> {
        return this.claimReward(Protocol.CHAPTER_MILESTONE_CLAIM, { rewardId });
    }

    /** 提交通关奖励领取，校验回包对应本次操作后交给主线协议入口。 */
    private claimReward(protocol: ChapterRewardCommand, body: { rewardId: number } | { chapter: number }): Promise<void> {
        if (!this.operations) {
            UIManager.instance.toast("通关奖励尚未准备好，请稍后重试");
            return Promise.resolve();
        }
        return this.operations.deliver(protocol, body, frame => {
            const receipt = frame.body as ChapterRewardReceipt;
            const matches = "rewardId" in body ? receipt.rewardId === body.rewardId : receipt.chapter === body.chapter;
            if (!matches) {
                throw new Error("通关奖励回执与请求不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.showClaimFailure(error, "通关奖励"));
    }

    /** 将确认后的累计操作版本发送给服务器。即时成功关联原页面演出，到账沿用通用奖励。 */
    public claimIdle(expectedOperationVersion: number, presentationContext: object | null): Promise<void> {
        if (!this.operations) {
            UIManager.instance.toast("挂机领取正在准备，请稍后重试");
            return Promise.resolve();
        }
        const requestId = RequestIdUtils.create();
        return this.operations.deliver(Protocol.CHAPTER_IDLE_CLAIM, { requestId, expectedOperationVersion }, frame => {
            const receipt = frame.body as IdleClaimReceipt;
            if (receipt.requestId !== requestId || receipt.expectedOperationVersion !== expectedOperationVersion) {
                throw new Error("挂机领取回执与请求不符");
            }
            EventDispatcher.instance.emit("main-chapter.idle-collection", { receipt, presentationContext });
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.showClaimFailure(error, "挂机"));
    }

    /** 将真实发放交给通用奖励队列，等待对应的资产版本再展示。 */
    private showActualReward(receipt: Pick<ChapterRewardReceipt, "receiptId" | "assetRevision" | "actual">): void {
        this.rewards?.restoreActual(receipt.receiptId, receipt.assetRevision, receipt.actual);
    }

    /** 连接中断时提示查看恢复后的状态，其余拒绝沿用服务端原因。 */
    private showClaimFailure(error: unknown, source: "通关奖励" | "挂机"): void {
        const message = error instanceof SocketFailure && error.interrupted
            ? "领取结果待同步，恢复连接后请查看" + (source === "挂机" ? "挂机状态" : source)
            : error instanceof Error ? error.message : source + "领取失败";
        UIManager.instance.toast(message);
    }

    /** 进入遇敌点后读取本次请求的演出战报；请求未交付或阵容、进度已改变时返回 null。 */
    public async encounter(): Promise<Uint8Array | null> {
        if (!this.operations || this.model.idleLoading || !this.model.idle?.slots?.length) {
            return null;
        }
        this.model.idleLoading = true;
        this.model.idleReplay = null;
        let delivered: Uint8Array | undefined;
        let failure: unknown = null;
        await this.operations.deliver(Protocol.CHAPTER_IDLE_ENCOUNTER, {}, frame => {
            ProtocolRouter.instance.dispatch(this, frame);
            delivered = this.model.idleReplay?.bytes;
            this.model.idleLoading = false;
        }, error => {
            this.model.idleLoading = false;
            failure = error;
        });
        if (failure) {
            throw failure;
        }
        const replay = this.model.idleReplay as MainChapterModel["idleReplay"];
        if (!replay || replay.bytes !== delivered || replay.lineupVersion !== this.model.idle?.lineupVersion
                || replay.stage !== this.model.idle?.rewardStage || replay.assetRevision !== this.model.state?.assetRevision) {
            return null;
        }
        return replay.bytes;
    }

    /** 校验只读挂机场景和完整事件链，旧阵容版本只丢弃演出，不覆盖权威快照。 */
    private onIdleEncounter(value: unknown): void {
        const v = value as { stage: number; assetRevision: number; lineupVersion: number; replay: { scenario: string } };
        if (!v || !MainChapterModel.isChapterIndex(v.stage) || !Number.isSafeInteger(v.assetRevision) || v.assetRevision < 0
            || !Number.isSafeInteger(v.lineupVersion) || v.lineupVersion < 0
            || v.replay?.scenario !== "idle:chapter:" + v.stage) throw new Error("挂机战报无效");
        const bytes = BattleReplayUtils.encodeVerified(v.replay);
        if (v.stage !== this.model.idle?.rewardStage || v.lineupVersion !== this.model.idle?.lineupVersion
            || v.assetRevision !== this.model.state?.assetRevision) return;
        this.model.idleReplay = Object.freeze({ stage: v.stage, assetRevision: v.assetRevision,
            lineupVersion: v.lineupVersion, bytes });
    }

    /** 首次生成编号前检查最新服务端范围；旧请求和未收口结算按原编号恢复，不受降范围或旧字段缺失影响。 */
    public async challenge(): Promise<void> {
        if (this.model.busy || !this.model.state) {
            return;
        }
        const settlement = this.model.settlement;
        if (settlement?.presentation === "battle" && settlement.presented && settlement.feedbackReady) {
            await this.retrySettlementFeedback();
            return;
        }
        if (settlement && !settlement.presented) {
            await this.claim(settlement.battleId);
            return;
        }
        if (!this.model.requestId && !this.model.state.pendingBattleId) {
            const state = this.model.state;
            if (state.challengeLimit === undefined || state.maxCleared >= state.challengeLimit) {
                this.model.message = state.challengeLimit === undefined ? "挑战范围尚未同步"
                    : "当前开放的" + state.challengeLimit + "关已全部通关";
                this.notify();
                return;
            }
        }
        if (!this.model.requestId) {
            this.model.requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => {
                const n = Math.floor(Math.random() * 16);
                return (ch === "x" ? n : (n & 3) | 8).toString(16);
            });
        }
        const battleId = await this.execute(Protocol.CHAPTER_CHALLENGE, { requestId: this.model.requestId });
        const receipt = this.model.receipt;
        if (receipt?.action === "SETTLED" && receipt.battleId === battleId && !this.model.requestId) {
            await this.claim(receipt.battleId);
        }
    }

    /**
     * 记录演出结束后的原战斗意图并合并重复请求；仅回执与当前统一快照同时满足才确认。
     * Promise结束也可能仍待恢复，调用者必须读取confirmedSettlement，不能据返回当作成功。
     */
    public claim(battleId: string): Promise<void> {
        if (!MainChapterModel.isBattleId(battleId)) {
            throw new Error("结算战报编号无效");
        }
        if (this.settlementTask) {
            if (this.settlementTask.battleId !== battleId) {
                throw new Error("另一场主线结算正在确认");
            }
            return this.settlementTask.promise;
        }
        if (this.model.busy || !this.operations) {
            return Promise.resolve();
        }
        const before = this.model.settlement;
        if (before && before.battleId !== battleId && !before.presented) {
            throw new Error("上一场主线结算尚未确认");
        }
        if (!before || before.battleId !== battleId) {
            this.model.settlement = Object.freeze({
                battleId, phase: "pending", presentation: "battle", feedbackReady: false, feedbackQueued: false, presented: false,
            });
        }
        if (this.observeSettlement()) {
            return Promise.resolve();
        }
        const task: SettlementTask = { battleId, promise: Promise.resolve() };
        this.settlementTask = task;
        // 先登记任务再进入交付，避免同步夹具或鉴权事件重入产生第二次写请求。
        task.promise = Promise.resolve().then(() => this.confirmSettlement(task));
        return task.promise;
    }

    /**
     * 首次进入主线页才消费身份首包候选；已有本地挑战、战报或结算仍走其原流程。
     * 登录主城和后续推送不会调用此入口创建意图，关页也不取消已经接纳的结算。
     */
    public recoverPendingOnEntry(): Promise<void> {
        const entry = this.model.entryRecovery;
        if (!entry || entry.consumed || !this.restoreFeedback) {
            return Promise.resolve();
        }
        this.model.entryRecovery = Object.freeze({ ...entry, consumed: true });
        const battleId = entry.battleId;
        if (!battleId || this.model.state?.pendingBattleId !== battleId || this.model.busy
            || this.model.requestId || this.model.receipt || this.model.replay || this.model.settlement || this.settlementTask) {
            return Promise.resolve();
        }
        this.model.settlement = Object.freeze({
            battleId, phase: "pending", presentation: "reward", feedbackReady: true, feedbackQueued: false, presented: false,
        });
        return this.claim(battleId);
    }

    /** 既有主线按钮重试原反馈：未确认恢复原结算，已入队只重试显示；正常附赠不重播胜利页。 */
    public async retrySettlementFeedback(): Promise<void> {
        const settlement = this.model.settlement;
        if (!settlement || !settlement.feedbackReady
            || (settlement.presentation === "reward" && settlement.presented)) {
            return;
        }
        if (settlement.phase !== "confirmed") {
            await this.claim(settlement.battleId);
        } else if (settlement.feedbackQueued) {
            this.retryFeedback?.();
        } else {
            this.offerSettlementFeedback(settlement.presentation);
        }
    }

    /** 返回已双确认的原回执，未达版本或编号不匹配时返回null；历史回执从不写资产。 */
    public confirmedSettlement(battleId: string): MainChapterReceipt | null {
        const settlement = this.model.settlement;
        return settlement?.battleId === battleId && settlement.phase === "confirmed"
            ? this.settlementReceipt(battleId) : null;
    }

    /** 只由已固定归属的窗口实际打开通知；另一种展示入口不能消费本场反馈。 */
    public markSettlementPresented(battleId: string, presentation: "battle" | "reward" = "battle"): void {
        if (this.confirmedSettlement(battleId) && this.model.settlement
            && this.model.settlement.presentation === presentation && !this.model.settlement.presented) {
            this.model.settlement = Object.freeze({ ...this.model.settlement, presented: true,
                feedbackReady: presentation === "reward" ? false : this.model.settlement.feedbackReady });
            this.notify();
        }
    }

    /** 通用窗口真实打开后结束原反馈等待；battle只完成附赠展示，不改胜利页已展示事实。 */
    public markSettlementFeedbackPresented(battleId: string): void {
        const settlement = this.model.settlement;
        if (!settlement || settlement.battleId !== battleId || settlement.phase !== "confirmed"
            || !settlement.feedbackReady || !settlement.feedbackQueued) {
            return;
        }
        this.model.settlement = Object.freeze({ ...settlement, feedbackReady: false,
            presented: settlement.presentation === "reward" ? true : settlement.presented });
        this.notify();
    }

    /**
     * 正常胜利页实际展示后关闭，才把原回执的升级附赠交通用队列；关页不再发结算请求。
     * 被接管、准备失败或原战斗已结束身份的旧关闭回调不能创建新反馈；重复关闭共用feedbackQueued去重。
     */
    public afterBattleResultClosed(battleId: string): void {
        const settlement = this.model.settlement;
        if (!settlement || settlement.battleId !== battleId || settlement.presentation !== "battle"
            || settlement.phase !== "confirmed" || !settlement.presented || settlement.feedbackQueued) {
            return;
        }
        this.model.settlement = Object.freeze({ ...settlement, feedbackReady: true });
        this.offerSettlementFeedback("battle");
    }

    /** 一次提交当前战斗编号；等待后续推送，缺回执时由玩家从主线重试。 */
    private async confirmSettlement(task: SettlementTask): Promise<void> {
        if (this.settlementTask !== task) {
            return;
        }
        this.model.settlement = Object.freeze({ ...this.model.settlement!, phase: "confirming" });
        this.notify();
        try {
            if (!this.settlementReceipt(task.battleId)) {
                await this.execute(Protocol.CHAPTER_CLAIM, { battleId: task.battleId });
            }
        } catch (error) {
            if (this.settlementTask === task) {
                this.reportSettlement(error);
            }
        } finally {
            if (this.settlementTask === task) {
                this.settlementTask = null;
                if (!this.observeSettlement()) {
                    this.model.settlement = Object.freeze({ ...this.model.settlement!, phase: "pending" });
                    this.model.message = this.settlementReceipt(task.battleId)
                        ? "结算已返回，等待服务器同步"
                        : "战斗结算待确认，可返回主线重试";
                    this.notify();
                }
            }
        }
    }

    /** 当前唯一历史回执必须属于原战斗且为SETTLED，不能以其他战斗或挑战回执补位。 */
    private settlementReceipt(battleId: string): MainChapterReceipt | null {
        const receipt = this.model.receipt;
        return receipt?.battleId === battleId && receipt.action === "SETTLED" ? receipt : null;
    }

    /** 两个版本独立核对；pending为空本身不证明发奖，较新快照可确认较早历史结果。 */
    private observeSettlement(): boolean {
        const settlement = this.model.settlement;
        if (!settlement) {
            return false;
        }
        const receipt = this.settlementReceipt(settlement.battleId);
        const state = this.model.state;
        if (!receipt || !state || state.assetRevision < receipt.state.assetRevision
            || state.pendingBattleId === settlement.battleId || state.maxCleared < receipt.state.maxCleared) {
            return false;
        }
        if (settlement.phase !== "confirmed") {
            this.model.settlement = Object.freeze({ ...settlement, phase: "confirmed" });
            this.model.message = "战斗结算已确认";
            this.notify();
            this.offerSettlementFeedback("reward");
        }
        return true;
    }

    /** 按原固定归属交付一次通用反馈；恢复为完整实际量，正常页关闭后仅附赠，失败交既有重试口。 */
    private offerSettlementFeedback(presentation: "battle" | "reward"): void {
        const settlement = this.model.settlement;
        if (!settlement || !settlement.feedbackReady || settlement.presentation !== presentation || settlement.phase !== "confirmed"
            || settlement.feedbackQueued || (presentation === "reward" && settlement.presented)
            || (presentation === "battle" && !settlement.presented) || !this.restoreFeedback) {
            return;
        }
        const receipt = this.confirmedSettlement(settlement.battleId);
        if (!receipt) {
            return;
        }
        const reservation = Object.freeze({ ...settlement, feedbackQueued: true });
        this.model.settlement = reservation;
        try {
            const result = this.restoreFeedback(receipt, presentation);
            if (result === "empty" && this.model.settlement === reservation) {
                this.markSettlementFeedbackPresented(settlement.battleId);
            }
        } catch (error) {
            if (this.model.settlement === reservation) {
                this.model.settlement = Object.freeze({ ...reservation, feedbackQueued: false });
                this.model.message = "奖励已结算，显示未交付，请重试显示";
                this.reportSettlement(error);
            }
        }
        this.notify();
    }

    /** 统一记录恢复失败，玩家反馈仍由页面消费Model后交全局飘字。 */
    private reportSettlement(error: unknown): void {
        GameLog.shared.classified("MODULE", "warn", "MainChapterController", "主线结算待恢复：" + String(error));
    }

    /** 读取持久战报供玩家继续观看；读取失败不重新挑战。 */
    public async replay(battleId: string): Promise<MainChapterReplay | null> {
        if (this.model.busy) {
            return null;
        }
        if (!MainChapterModel.isBattleId(battleId)) {
            throw new Error("战报编号无效");
        }
        this.model.replay = null;
        const restoredId = await this.execute(Protocol.CHAPTER_REPLAY, { battleId });
        const result = this.model.replay as MainChapterReplay | null;
        return result?.battleId === restoredId ? result : null;
    }

    /** 派发主线命令并返回此次交付的战斗编号。请求未交付时返回 null，不复用其他操作的结果。 */
    private async execute(name: ChapterCommand, body: object): Promise<string | null> {
        if (this.model.busy || !this.operations) {
            return null;
        }
        let battleId: string | null = null;
        this.model.busy = true;
        this.model.message = "正在处理…";
        this.notify();
        await this.operations.deliver(name, body, frame => {
            const id = (frame.body as { battleId?: string })?.battleId;
            if ((name === Protocol.CHAPTER_CLAIM || name === Protocol.CHAPTER_REPLAY)
                    && id !== (body as { battleId: string }).battleId) {
                throw new Error("主线回包与请求的战斗编号不匹配");
            }
            ProtocolRouter.instance.dispatch(this, frame);
            battleId = id ?? null;
            this.model.busy = false;
            this.notify();
        }, error => {
            this.model.busy = false;
            this.model.message = String(error);
            this.notify();
        });
        return battleId;
    }

    /** 校验奖励及历史经验整包后提交；仅挑战成功清空挑战编号，结算展示不改变资产Model。 */
    private onReceipt(protocol: ProtocolName, value: unknown): void {
        const v = value as { action: string; battleId: string; state: unknown; rewards: { itemId: number; quantity: number }[];
            experience?: MainChapterExperience; actual?: unknown };
        const state = MainChapterModel.readState(v?.state);
        if (!v || !state || (v.action !== "BATTLE" && v.action !== "SETTLED")
            || (protocol === Protocol.CHAPTER_CLAIM && v.action !== "SETTLED")
            || !MainChapterModel.isBattleId(v.battleId) || !Array.isArray(v.rewards)
            || !v.rewards.every(row => Number.isInteger(row.itemId) && row.itemId > 0
                && Number.isSafeInteger(row.quantity) && row.quantity >= 0)) throw new Error("主线回执无效");
        const experience = v.experience;
        if (experience !== undefined && (v.action !== "SETTLED" || !experience
            || ![experience.beforeLevel, experience.afterLevel].every(level => Number.isSafeInteger(level) && level > 0)
            || experience.afterLevel < experience.beforeLevel
            || ![experience.beforeExp, experience.afterExp, experience.beforeThreshold, experience.afterThreshold]
                .every(amount => Number.isSafeInteger(amount) && amount >= 0)
            || (experience.beforeThreshold > 0 && experience.beforeExp >= experience.beforeThreshold)
            || (experience.afterThreshold > 0 && experience.afterExp >= experience.afterThreshold))) {
            throw new Error("主线历史经验快照无效");
        }
        const actual = v.actual === undefined ? undefined
            : ChapterSettlementUtils.readActual(v.actual, v.rewards, experience);
        if (actual && v.action !== "SETTLED") {
            throw new Error("未结算主线回执不能包含实际发奖");
        }
        this.model.receipt = Object.freeze({ action: v.action, battleId: v.battleId, state,
            ...(experience ? { experience: Object.freeze({ ...experience }) } : {}),
            ...(actual ? { actual } : {}),
            rewards: Object.freeze(v.rewards.map(row => Object.freeze({ ...row }))) });
        if (protocol === Protocol.CHAPTER_CHALLENGE) this.model.requestId = null;
        this.model.message = v.action === "BATTLE" ? "战报已保存，可观看" : "已收到结算回执，等待服务器同步";
        this.observeSettlement();
    }

    /** 强类型战报先校验场景及完整事件链，之后才交付播放器。 */
    private onReplay(value: unknown): void {
        const v = value as { battleId: string; mission: number; pending: string[]; replay: { scenario: string } };
        if (!v || !MainChapterModel.isBattleId(v.battleId) || !MainChapterModel.isChapterIndex(v.mission)
            || !Array.isArray(v.pending) || !v.pending.every(item => typeof item === "string")
            || v.replay?.scenario !== "chapter:lineup:" + v.mission) throw new Error("主线战报无效");
        const bytes = BattleReplayUtils.encodeVerified(v.replay);
        this.model.replay = Object.freeze({ battleId: v.battleId, mission: v.mission,
            pending: Object.freeze(v.pending.slice()), bytes });
        this.model.message = "战报已恢复";
    }

    /** 应用销毁解除通信注入，避免保留失效服务闭包。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
        this.restoreFeedback = null;
        this.retryFeedback = null;
    }

    /** 仅应用身份协调调用，页面关闭不丢失待确认请求。 */
    protected onResetSession(): void {
        this.settlementTask = null;
        this.model.reset();
        this.notify();
    }

    /** 通知页面读取唯一Model，不把状态副本塞入事件。 */
    private notify(): void { EventDispatcher.publishNotification(() => EventDispatcher.instance.emit(MainChapterController.Updated, undefined)); }
}
