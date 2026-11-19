/**
 * 主线唯一Model：权威进度、挂机时钟及可选领取能力来自应用统一快照，页面关闭仍保留。
 * 命令回执只描述历史操作，不反写当前角色、背包或挂机状态；应用换号时统一清空。
 */
import { BaseModel } from "../../framework/BaseModel";
import { GameLog } from "../../core/GameLog";
import { ChapterMilestoneUtils } from "./utils/ChapterMilestoneUtils";
import { ChapterClearRewardUtils } from "./utils/ChapterClearRewardUtils";
import type { RewardExperienceGain } from "../reward/data/RewardData";
import type { MainChapterFirstRewardProgress } from "./data/MainChapterFirstRewardData";

/** 服务端权威进度；空待领奖表示没有未领取战报。 */
export interface MainChapterState {
    readonly maxCleared: number;
    readonly pendingBattleId: string | null;
    readonly assetRevision: number;
    /** 服务端当前允许新挑战的最大全局关卡；旧快照缺失为undefined，不默认开放或限制历史恢复。 */
    readonly challengeLimit?: number;
    /** 最新权威已领集合；旧快照缺失为undefined，不能按通关数或历史回执补为0。 */
    readonly milestoneProgress?: MainChapterMilestoneProgress;
    /** 独立通关奖励已领和可领集合；缺扩展仍为未同步。 */
    readonly firstRewardProgress?: MainChapterFirstRewardProgress;
}

/** 服务端读取真实持久集合后交付的里程碑进度，不表示已开放领取。 */
export interface MainChapterMilestoneProgress {
    /** 当前只支持1；损坏或未知格式不能当作明确空集。 */
    readonly schemaVersion: 1;
    /** 已领取的配置ID集合，允许不连续；空数组是服务端确认尚未领取。 */
    readonly claimedIds: readonly number[];
}
/** 成功回执的历史结果，只用于说明，不替代当前快照。 */
export interface MainChapterReceipt {
    readonly action: "BATTLE" | "SETTLED";
    readonly battleId: string;
    readonly state: MainChapterState;
    readonly rewards: readonly { itemId: number; quantity: number }[];
    /** 服务端冻结的发奖前后经验；旧回执缺失，不从当前角色状态反推。 */
    readonly experience?: MainChapterExperience;
    /** 新回执的实际发放显示投影；旧记录缺失时不从钱包或当前配置补猜升级附赠。 */
    readonly actual?: MainChapterRewardActual;
}
/** 原事务真实明细的最小显示投影；不保存历史钱包或用其更新当前资产。 */
export interface MainChapterRewardActual {
    /** 同次真实经验链；通用升级反馈读取历史值，不依赖最新角色等级。 */
    readonly experience: readonly RewardExperienceGain[];
    /** 服务端发放归属，应用层在交付通用反馈时与当前角色校验。 */
    readonly roleId: string;
    /** 首通基础实际量及减少原因；零到账仍保留，不能与升级附赠混为同一来源。 */
    readonly items: readonly {
        readonly itemId: number;
        readonly requested: number;
        readonly credited: number;
        readonly ignored: number;
        readonly reason: "NONE" | "ROLE_MAX_LEVEL" | "TAVERN_CAP";
    }[];
    /** 单独记录的升级赠钻；通用反馈按实际数量合并，正常胜利基础格子不混入。 */
    readonly bonuses: readonly {
        readonly source: "ROLE_LEVEL_UP";
        readonly itemId: number;
        readonly quantity: number;
    }[];
}
/** 结算动画的历史快照，不提交到角色资产Model；最高级门槛为0。 */
export interface MainChapterExperience {
    /** 发奖事务开始前的角色等级。 */
    readonly beforeLevel: number;
    /** 发奖前等级内经验，不是累计经验。 */
    readonly beforeExp: number;
    /** 发奖前该等级升级门槛；最高级为0。 */
    readonly beforeThreshold: number;
    /** 发奖完成后的角色等级，随历史回执冻结。 */
    readonly afterLevel: number;
    /** 发奖后等级内经验，仅供结算动画。 */
    readonly afterExp: number;
    /** 发奖后该等级升级门槛；最高级为0。 */
    readonly afterThreshold: number;
}
/** 已验证的持久战报，仅保留当前展示所需字节。 */
export interface MainChapterReplay {
    readonly battleId: string;
    /** 同源关卡表的全局idx，不是章节内mission_id；历史字段名保留协议兼容。 */
    readonly mission: number;
    readonly pending: readonly string[];
    readonly bytes: Uint8Array;
}
/** 同一次应用内的主线结算过程；不保存第二份资产或跨重启记录。 */
export interface MainChapterSettlement {
    /** 演出结束或原挑战已结算后固定的服务器战斗编号，恢复时不生成新编号。 */
    readonly battleId: string;
    /** pending待恢复，confirming正在确认，confirmed表示回执及统一快照均已确认。 */
    readonly phase: "pending" | "confirming" | "confirmed";
    /** 在异步确认前固定展示归属；battle走正常胜利页，reward只走通用恢复奖励窗。 */
    readonly presentation: "battle" | "reward";
    /** 已到通用反馈时点且尚未实际打开：正常胜利页关闭后或冷恢复开始时为true，换号随结算清空。 */
    readonly feedbackReady: boolean;
    /** 恢复全部奖励或正常结算后的升级附赠已交给通用队列；失败仅重试显示，不代表弹窗已打开。 */
    readonly feedbackQueued: boolean;
    /** 主展示已实际打开：battle指胜利页，reward指恢复奖励窗；正常附赠是否交队列另由feedbackQueued记录。 */
    readonly presented: boolean;
}
/** 已知格式的挂机消费能力投影；恢复命令读取版本，当前仍没有玩家按钮入口。 */
export interface MainChapterIdleClaimState {
    /** 当前已验证的协议格式，未来未知格式保持只读，不猜测其字段含义。 */
    readonly schemaVersion: 1;
    /** 仅成功消费或明确修正时递增的持久正版本，不等同于统一资产版本。 */
    readonly operationVersion: number;
    /** READ_ONLY表示服务端入口关闭；ENABLED不保证本次权益及最低周期已满足。 */
    readonly requestMode: "READ_ONLY" | "ENABLED";
}
/** 服务端挂机时钟及每个收益周期的配置；不表示已经领取。 */
export interface MainChapterIdleState {
    readonly serverTime: number;
    readonly startedAt: number;
    readonly maxSeconds: number;
    readonly frequency: number;
    readonly rewardStage: number;
    readonly rates: readonly { itemId: number; quantity: number }[];
    /** 服务端从当前主线阵容选出的最多三名英雄，保留原站位。 */
    readonly slots?: readonly { heroId: string; position: number }[];
    /** 选人依据的持久阵容版本；旧后端缺失时不自行代选。 */
    readonly lineupVersion?: number;
    /** 已验证的可选消费状态；缺失或未知格式时为undefined，不据此开放当前按钮。 */
    readonly claimState?: MainChapterIdleClaimState;
}
export class MainChapterModel extends BaseModel {
    /** 同应用生命周期的唯一主线数据入口。 */
    public static readonly instance = new MainChapterModel();
    /** null表示主线快照尚未同步。 */
    public state: MainChapterState | null = null;
    /** 缺少可信起点或服务端未提供挂机快照时为空，首胜前的快照只包含创角计时。 */
    public idle: MainChapterIdleState | null = null;
    /** 最近一次已校验的挂机演出，仅页面消费，不作为挑战或领奖凭证。 */
    public idleReplay: { stage: number; assetRevision: number; lineupVersion: number; bytes: Uint8Array } | null = null;
    /** 当前挂机战报请求；不占用挑战按钮的业务忙状态。 */
    public idleLoading = false;
    /** 当前网络请求尚未结束，阻止重复按钮点击。 */
    public busy = false;
    /** 未确认挑战编号；显式重试复用，成功后清空，关闭页面保留。 */
    public requestId: string | null = null;
    /** 最近一次回执，不作为资产余额来源。 */
    public receipt: MainChapterReceipt | null = null;
    /** 当前原战斗的双确认及展示进度；页面关闭保留，应用身份重置时清空。 */
    public settlement: MainChapterSettlement | null = null;
    /** 本身份首个已接纳鉴权首包中的待结算候选；null为尚无首包，consumed只在首次进入主线页时设置。 */
    public entryRecovery: Readonly<{ battleId: string | null; consumed: boolean }> | null = null;
    /** 最近一次恢复的战报，换号与应用销毁时清空。 */
    public replay: MainChapterReplay | null = null;
    /** 可恢复操作结果，页面关闭不抹去错误。 */
    public message = "";

    /** 同步主线进度和挂机状态。首次认证记录待结算战斗，首次进入主线页时使用。 */
    public applySnapshot(state: Record<string, unknown>, authenticated: boolean): void {
        const chapter = MainChapterModel.readState(state.mainChapter, Number(state.revision));
        const idle = MainChapterModel.readIdle(state.mainChapterIdle, chapter);
        this.state = chapter;
        this.idle = idle;
        if (authenticated && this.entryRecovery === null) {
            this.entryRecovery = Object.freeze({ battleId: chapter?.pendingBattleId ?? null, consumed: false });
        }
    }

    /** 校验全局进度、可选挑战范围、两套独立领奖集合和资产版本，缺字段保持未同步。 */
    public static readState(value: unknown, revision?: number): MainChapterState | null {
        if (value === undefined) {
            return null;
        }
        const v = value as MainChapterState;
        if (!v || !this.isChapterIndex(v.maxCleared, true)
            || !Number.isSafeInteger(v.assetRevision) || v.assetRevision < 0
            || (revision !== undefined && v.assetRevision !== revision)
            || (v.pendingBattleId != null && !this.isBattleId(v.pendingBattleId))
            || (v.pendingBattleId && v.maxCleared === 0)
            || (v.challengeLimit !== undefined && !this.isChapterIndex(v.challengeLimit))) {
            throw new Error("主线快照无效");
        }
        const milestoneProgress = ChapterMilestoneUtils.readProgress(v.milestoneProgress);
        const firstRewardProgress = ChapterClearRewardUtils.readProgress(v.firstRewardProgress, v.maxCleared);
        return Object.freeze({
            maxCleared: v.maxCleared,
            pendingBattleId: v.pendingBattleId || null,
            assetRevision: v.assetRevision,
            ...(v.challengeLimit !== undefined ? { challengeLimit: v.challengeLimit } : {}),
            ...(milestoneProgress ? { milestoneProgress } : {}),
            ...(firstRewardProgress ? { firstRewardProgress } : {}),
        });
    }

    /**
     * 校验挂机时间与对应关卡。首胜前只同步创角时钟，不能携带关卡收益、遇敌阵容或领取能力。
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
            || v.rewardStage !== chapter.maxCleared || !this.isChapterIndex(v.rewardStage, true)
            || !Array.isArray(v.rates) || (v.rewardStage > 0) !== (v.rates.length > 0)
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
        const claimState = this.readIdleClaimState(v.claimState);
        if (v.rewardStage === 0 && (v.slots?.length || claimState)) {
            throw new Error("未通关的挂机快照包含遇敌阵容或领取状态");
        }
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
            GameLog.shared.warnOnce("MODULE", "MainChapterModel", "IDLE_CLAIM_SCHEMA:" + claim.schemaVersion,
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

    /** 全局关卡与挑战范围使用正uint32；仅已通关进度允许0，不接受浮点、字符串或越界值。 */
    public static isChapterIndex(value: unknown, allowZero = false): value is number {
        return typeof value === "number" && Number.isInteger(value)
            && value >= (allowZero ? 0 : 1) && value <= 0xffffffff;
    }

    /** 持久编号必须为UUID字符串，不接受数值或任意路径。 */
    public static isBattleId(value: unknown): value is string {
        return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
    }

    /** 应用切换身份清空业务状态；不承担网络连接代次判断。 */
    protected onReset(): void {
        this.state = null;
        this.idle = null;
        this.idleReplay = null;
        this.idleLoading = false;
        this.busy = false;
        this.requestId = null;
        this.receipt = null;
        this.settlement = null;
        this.entryRecovery = null;
        this.replay = null;
        this.message = "";
    }
}
