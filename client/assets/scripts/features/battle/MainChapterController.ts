/** 主线控制器：协议提交唯一Model，组织原战斗回执与权威快照双确认；不持有View、token或账号。 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { STATE_PROTOCOLS, ProtocolStateUtils } from "../../platform/ProtocolStateUtils";
import { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { mxzg } from "../../platform/GameProtocol.generated";
import { GameLog } from "../../core/GameLog";
import { MainChapterModel, MainChapterState, MainChapterReplay, MainChapterIdleState, MainChapterExperience,
    MainChapterIdleClaimState, MainChapterReceipt } from "./MainChapterModel";
import { BattleReplayUtils } from "./utils/BattleReplayUtils";
import { ChapterSettlementUtils } from "./utils/ChapterSettlementUtils";
import { ChapterMilestoneUtils } from "./utils/ChapterMilestoneUtils";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads { "main-chapter.updated": undefined; }
}

/** 唯一主线命令类型，不能透传任意暂停玩法。 */
export type ChapterCommand = typeof Protocol.CHAPTER_CHALLENGE | typeof Protocol.CHAPTER_CLAIM | typeof Protocol.CHAPTER_REPLAY | typeof Protocol.CHAPTER_IDLE_ENCOUNTER;
/** 一次结算确认任务；引用只用于合并业务操作及撤销重置后的异步续段，不承担身份判断。 */
interface SettlementTask {
    /** 当前任务始终使用同一个服务器战斗编号。 */
    battleId: string;
    /** 重复按钮及鉴权触发共用的确认任务，结束后释放。 */
    promise: Promise<void>;
    /** 请求期间鉴权已恢复且尚无回执，任务结束后允许恢复一次原编号。 */
    resumeAfterAuthentication: boolean;
}
export class MainChapterController extends BaseController {
    /** 应用装配一次，页面只读Model并调用业务意图。 */
    public static readonly instance = new MainChapterController(MainChapterModel.instance);
    /** 数据或操作状态变化后刷新页面；监听由页面作用域清理。 */
    public static readonly Updated = "main-chapter.updated";
    /** 应用提供身份隔离后的交付口，模块不感知登录。 */
    private send: ((name: ChapterCommand, body: object, received: (frame: GameFrame) => void,
        failed: (error: unknown) => void) => Promise<void>) | null = null;
    /** 应用注入一次有界重新鉴权，成功/失败仍经过当前身份交付口；未装配时保持待确认。 */
    private refreshSnapshot: ((received: () => void, failed: (error: unknown) => void) => Promise<void>) | null = null;
    /** 当前在途结算任务；关页保留，身份重置或任务完成解除，旧续段不能改新任务。 */
    private settlementTask: SettlementTask | null = null;
    /** 应用将双确认回执按固定归属交给通用队列：reward为全部，battle仅为胜利页关闭后的升级附赠。 */
    private restoreFeedback: ((receipt: MainChapterReceipt, presentation: "battle" | "reward") => "queued" | "empty") | null = null;
    /** 应用只重试通用队列显示，不重新发送结算、挑战或战报读取。 */
    private retryFeedback: (() => void) | null = null;

    /** 注入唯一数据所有者，独立测试可传入隔离Model。 */
    constructor(private readonly model: MainChapterModel) { super(); }

    /** 应用注入的权威角色等级只读入口，不持有账号或复制角色数据。 */
    public readRoleLevel: () => number = () => 0;
    /** 应用提供当前角色头像只读入口；仅开结算时读取，不缓存账号或角色资料。 */
    public readRoleAppearance: () => { headId: number; borderId: number } | null = () => null;
    /** 应用注入的挂机领取意图入口；复用IdleClaimBinding的门槛/确认/回执链，未装配或销毁后为null。 */
    public requestIdleClaim: ((presentationContext: object) => Promise<void>) | null = null;

    /** 注入业务交付、角色显示及缺状态的有界鉴权入口；身份仍由应用隔离。 */
    public configure(send: NonNullable<MainChapterController["send"]>, readRoleLevel: () => number = () => 0,
        readRoleAppearance: MainChapterController["readRoleAppearance"] = () => null,
        refreshSnapshot: MainChapterController["refreshSnapshot"] = null): void {
        this.send = send;
        this.readRoleLevel = readRoleLevel;
        this.readRoleAppearance = readRoleAppearance;
        this.refreshSnapshot = refreshSnapshot;
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
        this.ownListener(ProtocolRouter.instance.register(this, [...STATE_PROTOCOLS,
            Protocol.CHAPTER_CHALLENGE, Protocol.CHAPTER_CLAIM, Protocol.CHAPTER_REPLAY, Protocol.CHAPTER_IDLE_ENCOUNTER]));
    }

    /** 校验全局进度、可选新挑战范围和资产版本；旧范围缺失保持未同步，历史进度不因降范围而丢弃。 */
    public static readState(value: unknown, revision?: number): MainChapterState | null {
        if (value === undefined) return null;
        const v = value as MainChapterState;
        if (!v || !this.chapterIndex(v.maxCleared, true)
            || !Number.isSafeInteger(v.assetRevision) || v.assetRevision < 0
            || (revision !== undefined && v.assetRevision !== revision)
            || (v.pendingBattleId != null && !this.validId(v.pendingBattleId))
            || (v.pendingBattleId && v.maxCleared === 0)
            || (v.challengeLimit !== undefined && !this.chapterIndex(v.challengeLimit))) throw new Error("主线快照无效");
        const milestoneProgress = ChapterMilestoneUtils.readProgress(v.milestoneProgress);
        return Object.freeze({ maxCleared: v.maxCleared, pendingBattleId: v.pendingBattleId || null,
            assetRevision: v.assetRevision,
            ...(v.challengeLimit !== undefined ? { challengeLimit: v.challengeLimit } : {}),
            ...(milestoneProgress ? { milestoneProgress } : {}) });
    }

    /**
     * 校验挂机时间与对应关卡，整包拒绝已知格式的非法数据；空快照不代表零收益。
     * 可选领取状态另行冻结，未来未知格式只丢弃领取能力，保留旧挂机时钟和演出。
     */
    public static readIdle(value: unknown, chapter: MainChapterState | null): MainChapterIdleState | null {
        if (value == null) {
            return null;
        }
        const v = value as MainChapterIdleState;
        if (!chapter || !Number.isSafeInteger(v.serverTime) || v.serverTime <= 0
            || !Number.isSafeInteger(v.startedAt) || v.startedAt < 0
            || !Number.isSafeInteger(v.maxSeconds) || v.maxSeconds <= 0
            || !Number.isSafeInteger(v.frequency) || v.frequency <= 0 || v.frequency > v.maxSeconds
            || v.rewardStage !== chapter.maxCleared || !this.chapterIndex(v.rewardStage)
            || !Array.isArray(v.rates) || !v.rates.length
            || !v.rates.every(row => Number.isSafeInteger(row.itemId) && row.itemId > 0
                && Number.isSafeInteger(row.quantity) && row.quantity >= 0)
            || new Set(v.rates.map(row => row.itemId)).size !== v.rates.length) {
            throw new Error("主线挂机快照无效");
        }
        if (v.slots !== undefined && (!Array.isArray(v.slots) || v.slots.length > 3
            || !Number.isSafeInteger(v.lineupVersion) || v.lineupVersion! < 0
            || v.slots.some(slot => typeof slot.heroId !== "string" || !slot.heroId
                || !Number.isInteger(slot.position) || slot.position < 1 || slot.position > 8)
            || new Set(v.slots.map(slot => slot.heroId)).size !== v.slots.length
            || new Set(v.slots.map(slot => slot.position)).size !== v.slots.length)) {
            throw new Error("挂机阵容无效");
        }
        const claimState = MainChapterController.readIdleClaimState(v.claimState);
        return Object.freeze({
            ...v,
            rates: Object.freeze(v.rates.map(row => Object.freeze({ ...row }))),
            slots: v.slots ? Object.freeze(v.slots.map(row => Object.freeze({ ...row }))) : undefined,
            claimState,
        });
    }

    /**
     * 读取服务端可选领取能力；已知格式的坏版本/模式拒绝，未知格式按日志来源和格式去重后保持只读。
     * 返回对象为独立冻结副本，不持有解码树引用，不推导ready或修改按钮状态。
     */
    private static readIdleClaimState(value: unknown): MainChapterIdleClaimState | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("主线挂机领取状态无效");
        }
        const claim = value as Record<string, unknown>;
        if (typeof claim.schemaVersion !== "number" || !Number.isSafeInteger(claim.schemaVersion)
            || claim.schemaVersion < 0 || claim.schemaVersion > 0xffffffff) {
            throw new Error("主线挂机领取状态格式无效");
        }
        if (claim.schemaVersion !== 1) {
            GameLog.shared.warnOnce("MODULE", "MainChapterController", "IDLE_CLAIM_SCHEMA:" + claim.schemaVersion,
                "挂机领取状态格式未支持，保持只读；schemaVersion=" + claim.schemaVersion);
            return undefined;
        }
        if (typeof claim.operationVersion !== "number" || !Number.isSafeInteger(claim.operationVersion)
            || claim.operationVersion <= 0
            || (claim.requestMode !== "READ_ONLY" && claim.requestMode !== "ENABLED")) {
            throw new Error("主线挂机领取状态版本或模式无效");
        }
        return Object.freeze({
            schemaVersion: 1,
            operationVersion: claim.operationVersion,
            requestMode: claim.requestMode,
        });
    }

    /** 统一快照与历史回执分权；首个已接纳鉴权包仅记恢复候选，实际进入主线页才确认结算。 */
    public onNotify(protocol: ProtocolName, value: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED: {
                const state = ProtocolStateUtils.statePayload(protocol, value);
                const chapter = MainChapterController.readState(state.mainChapter, Number(state.revision));
                const idle = MainChapterController.readIdle(state.mainChapterIdle, chapter);
                this.model.state = chapter;
                this.model.idle = idle;
                this.model.idleReceivedAt = Date.now();
                if (this.model.entryRecovery === null && protocol !== Protocol.STATE_CHANGED) {
                    this.model.entryRecovery = Object.freeze({ battleId: chapter?.pendingBattleId || null, consumed: false });
                }
                this.observeSettlement();
                break;
            }
            case Protocol.CHAPTER_CHALLENGE:
            case Protocol.CHAPTER_CLAIM: this.onReceipt(protocol, value); break;
            case Protocol.CHAPTER_REPLAY: this.onReplay(value); break;
            case Protocol.CHAPTER_IDLE_ENCOUNTER: this.onIdleEncounter(value); break;
            default: throw new Error("非主线协议");
        }
        this.notify();
    }

    /** 到达遇敌点时读取旧3006演出战报；不查询库存，不占用挑战忙状态，不自动重发失败请求。 */
    public async encounter(): Promise<Uint8Array | null> {
        if (!this.send || this.model.idleLoading || !this.model.idle?.slots?.length) return null;
        this.model.idleLoading = true;
        this.model.idleReplay = null;
        let failure: unknown = null;
        await this.send(Protocol.CHAPTER_IDLE_ENCOUNTER, {}, frame => {
            ProtocolRouter.instance.dispatch(this, frame);
            this.model.idleLoading = false;
        }, error => {
            this.model.idleLoading = false;
            failure = error;
        });
        if (failure) throw failure;
        const replay = this.model.idleReplay as MainChapterModel["idleReplay"];
        return replay && replay.lineupVersion === this.model.idle?.lineupVersion
            && replay.stage === this.model.idle?.rewardStage
            && replay.assetRevision === this.model.state?.assetRevision ? replay.bytes : null;
    }

    /** 校验只读挂机场景和完整事件链，旧阵容版本只丢弃演出，不覆盖权威快照。 */
    private onIdleEncounter(value: unknown): void {
        const v = value as { stage: number; assetRevision: number; lineupVersion: number; replay: { scenario: string } };
        if (!v || !MainChapterController.chapterIndex(v.stage) || !Number.isSafeInteger(v.assetRevision) || v.assetRevision < 0
            || !Number.isSafeInteger(v.lineupVersion) || v.lineupVersion < 0
            || v.replay?.scenario !== "idle:chapter:" + v.stage) throw new Error("挂机战报无效");
        const codec = (mxzg as any).game.BattleReplay;
        if (codec.verify(v.replay)) throw new Error("挂机战报字段无效");
        const bytes: Uint8Array = codec.encode(v.replay).finish();
        BattleReplayUtils.decode(bytes);
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
        const received = await this.execute(Protocol.CHAPTER_CHALLENGE, { requestId: this.model.requestId });
        const receipt = this.model.receipt;
        if (received && receipt?.action === "SETTLED" && !this.model.requestId) {
            await this.claim(receipt.battleId);
        }
    }

    /**
     * 记录演出结束后的原战斗意图并合并重复请求；仅回执与当前统一快照同时满足才确认。
     * Promise结束也可能仍待恢复，调用者必须读取confirmedSettlement，不能据返回当作成功。
     */
    public claim(battleId: string): Promise<void> {
        if (!MainChapterController.validId(battleId)) {
            throw new Error("结算战报编号无效");
        }
        if (this.settlementTask) {
            if (this.settlementTask.battleId !== battleId) {
                throw new Error("另一场主线结算正在确认");
            }
            return this.settlementTask.promise;
        }
        if (this.model.busy || !this.send) {
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
        const task: SettlementTask = { battleId, promise: Promise.resolve(), resumeAfterAuthentication: false };
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

    /** 应用只在整包被接纳后调用；普通推送只确认，鉴权仅恢复已有原战斗意图。 */
    public afterSnapshot(protocol: string): void {
        if (this.observeSettlement()) {
            return;
        }
        const settlement = this.model.settlement;
        if (!settlement || (protocol !== Protocol.SESSION_AUTHENTICATE && protocol !== Protocol.SESSION_LOGIN)) {
            return;
        }
        if (this.settlementTask) {
            this.settlementTask.resumeAfterAuthentication = !this.settlementReceipt(settlement.battleId);
            return;
        }
        if (!this.settlementReceipt(settlement.battleId)) {
            void this.claim(settlement.battleId).catch(error => this.reportSettlement(error));
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

    /** 每轮只发原编号一次；已有回执只补一次鉴权，失败或仍旧快照保留显式恢复入口。 */
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
            if (this.settlementTask !== task || this.observeSettlement()) {
                return;
            }
            if (this.settlementReceipt(task.battleId) && this.refreshSnapshot) {
                await this.refreshSnapshot(() => {}, error => this.reportSettlement(error));
                if (this.settlementTask === task) {
                    this.observeSettlement();
                }
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
                    this.model.message = "战斗结算待确认，连接恢复后继续；也可返回主线重试";
                    this.notify();
                    if (task.resumeAfterAuthentication && !this.settlementReceipt(task.battleId)) {
                        void this.claim(task.battleId).catch(error => this.reportSettlement(error));
                    }
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
        if (!MainChapterController.validId(battleId)) {
            throw new Error("战报编号无效");
        }
        this.model.replay = null;
        if (!await this.execute(Protocol.CHAPTER_REPLAY, { battleId })) {
            return null;
        }
        const result = this.model.replay as MainChapterReplay | null;
        if (result && result.battleId !== battleId) {
            throw new Error("战报编号不匹配");
        }
        return result;
    }

    /** 应用交付才结束请求；仅真实接收成功返回true，换号丢弃或失败返回false，续段不可推导成功。 */
    private async execute(name: ChapterCommand, body: object): Promise<boolean> {
        if (this.model.busy || !this.send) {
            return false;
        }
        let received = false;
        this.model.busy = true;
        this.model.message = "正在处理…";
        this.notify();
        await this.send(name, body, frame => {
            if (name === Protocol.CHAPTER_CLAIM && (frame.body as { battleId?: unknown })?.battleId !== (body as { battleId: string }).battleId) {
                throw new Error("主线结算回执编号不匹配");
            }
            ProtocolRouter.instance.dispatch(this, frame);
            received = true;
            this.model.busy = false;
            this.notify();
        }, error => {
            this.model.busy = false;
            this.model.message = String(error);
            this.notify();
        });
        return received;
    }

    /** 校验奖励及历史经验整包后提交；仅挑战成功清空挑战编号，结算展示不改变资产Model。 */
    private onReceipt(protocol: ProtocolName, value: unknown): void {
        const v = value as { action: string; battleId: string; state: unknown; rewards: { itemId: number; quantity: number }[];
            experience?: MainChapterExperience; actual?: unknown };
        const state = MainChapterController.readState(v?.state);
        if (!v || !state || (v.action !== "BATTLE" && v.action !== "SETTLED")
            || (protocol === Protocol.CHAPTER_CLAIM && v.action !== "SETTLED")
            || !MainChapterController.validId(v.battleId) || !Array.isArray(v.rewards)
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
        if (!v || !MainChapterController.validId(v.battleId) || !MainChapterController.chapterIndex(v.mission)
            || !Array.isArray(v.pending) || !v.pending.every(item => typeof item === "string")
            || v.replay?.scenario !== "chapter:lineup:" + v.mission) throw new Error("主线战报无效");
        const codec = (mxzg as any).game.BattleReplay;
        if (codec.verify(v.replay)) throw new Error("主线战报字段无效");
        const bytes: Uint8Array = codec.encode(v.replay).finish();
        BattleReplayUtils.decode(bytes);
        this.model.replay = Object.freeze({ battleId: v.battleId, mission: v.mission,
            pending: Object.freeze(v.pending.slice()), bytes });
        this.model.message = "战报已恢复";
    }

    /** 全局关卡与挑战范围使用正uint32；仅已通关进度允许0，不接受浮点、字符串或越界值。 */
    private static chapterIndex(value: unknown, allowZero = false): value is number {
        return typeof value === "number" && Number.isInteger(value)
            && value >= (allowZero ? 0 : 1) && value <= 0xffffffff;
    }

    /** 应用销毁解除通信注入，避免保留失效服务闭包。 */
    protected onDispose(): void {
        this.send = null;
        this.refreshSnapshot = null;
        this.restoreFeedback = null;
        this.retryFeedback = null;
        this.readRoleLevel = () => 0;
        this.readRoleAppearance = () => null;
        this.requestIdleClaim = null;
    }

    /** 持久编号必须为UUID字符串，不接受数值或任意路径。 */
    private static validId(value: unknown): value is string {
        return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
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
