/**
 * 挂机领取恢复的命令契约：仅保存原请求及历史确认，不复制角色、库存或挂机权威状态。
 * 应用层为已认证身份提供持久记录口，模块Controller不接收账号键或凭证。
 */
import type { GameFrame } from "../../../platform/GameProtocolCodecUtils";
import type { Protocol } from "../../../platform/Protocol";
import type { RewardNotice } from "../../reward/data/RewardNoticeData";

/** 一次待确认的原始意图；格式版本是本地存储格式，不加入服务端请求体。 */
export interface IdleClaimPending {
    /** 当前仅支持1；未知格式停止恢复，不删除记录。 */
    readonly schemaVersion: 1;
    /** 跨超时和重登保持的业务UUID，不是一次网络往返的Frame.id。 */
    readonly requestId: string;
    /** 用户创建意图时的服务端操作版本，重试不能替换为最新版本。 */
    readonly expectedOperationVersion: number;
}

/** 通过完整协议校验后的历史确认摘要；不向资产Model回写历史余额或起点。 */
export interface IdleClaimReceipt {
    /** 与持久待确认记录相同的业务请求UUID。 */
    readonly requestId: string;
    /** 服务端成功事务的持久回执UUID。 */
    readonly receiptId: string;
    /** 原请求固定的操作版本。 */
    readonly expectedOperationVersion: number;
    /** 消费前的操作版本，必须等于expected。 */
    readonly beforeOperationVersion: number;
    /** 消费后的操作版本，供统一快照双向确认。 */
    readonly afterOperationVersion: number;
    /** 事务提交的资产版本；最新快照达到或超过它才可确认。 */
    readonly assetRevision: number;
    /** 服务端冻结提交时刻，Unix秒，不作为本地超时依据。 */
    readonly committedAtSeconds: number;
    /** 本次消费前的服务端持久起点，Unix秒；只用于核对历史表现，不回写当前挂机状态。 */
    readonly previousStartedAtSeconds: number;
    /** 本次实际结算的封顶秒数；收取表现必须用它，不能使用已重置的新快照反推。 */
    readonly seconds: number;
    /** 本次领取前冻结的VIP最大累计秒数，与seconds共同决定原宝箱显示档位。 */
    readonly maxSeconds: number;
    /** 本次真实收益关卡，非宝箱档位；只读保留来源，不能由页面改作新领取参数。 */
    readonly rewardStage: number;
    /** 完整已匹配actual投影的通用反馈；零到账为null，不从理论收益或当前库存补造。 */
    readonly feedback: RewardNotice | null;
}

/** 原意图持久清理及统一状态双确认后的单次显示信号，零到账也必须交付。 */
export interface IdleClaimConfirmation {
    /** 已冻结的历史成功回执；调用方不能据此再次写角色、库存或挂机起点。 */
    readonly receipt: IdleClaimReceipt;
    /** 本应用真正新建原请求时传入的显示引用；历史/冷恢复为null，应用判断原页面是否仍可显示。 */
    readonly presentationContext: object | null;
}

/** 命令恢复过程，界面入口关闭时仍可由独立测试观察，不代表领取资格。 */
export interface IdleClaimProgress {
    /** idle无待确认，paused可再恢复，blocked需明确处理；confirmed/rejected分别表示成功及已证实无法提交。 */
    readonly phase: "idle" | "restoring" | "checking" | "sending" | "waiting-state"
        | "paused" | "blocked" | "confirmed" | "rejected";
    /** 当前原请求；仅双向确认或经状态核实的版本拒绝后清空。 */
    readonly pending: IdleClaimPending | null;
    /** 当前意图的历史确认摘要；尚未收到或失败时为null。 */
    readonly receipt: IdleClaimReceipt | null;
    /** 当前恢复状态说明，不替代资产或领取按钮条件。 */
    readonly message: string;
}

/** 应用按身份绑定的持久化口；键和稳定实例归应用，模块只操作原请求。 */
export interface IdleClaimJournalPort {
    /** 读取现有意图；空值表示确实没有记录，损坏/存储故障必须拒绝Promise。 */
    read(): Promise<IdleClaimPending | null>;
    /** 原子保存；已有未确认记录时返回原记录，不覆盖成新请求。 */
    create(request: IdleClaimPending): Promise<IdleClaimPending>;
    /** 原子核对完整原请求后清理；false表示不存在或已是其他请求，不删除后来记录。 */
    clear(request: IdleClaimPending): Promise<boolean>;
}

/** 已实现的两条挂机命令，禁止透传其他玩法或恢复HTTP。 */
export type IdleClaimCommand = typeof Protocol.CHAPTER_IDLE_CLAIM | typeof Protocol.CHAPTER_IDLE_CLAIM_STATUS;

/** 应用通过AccountService交付当前身份结果，旧身份的成功与失败均不进入模块。 */
export type IdleClaimSend = (name: IdleClaimCommand, body: object,
    received: (frame: GameFrame) => void, failed: (error: unknown) => void) => Promise<void>;
