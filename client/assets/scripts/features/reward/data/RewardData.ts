/**
 * 通用奖励窗的只读参数：由已确认的实际到账明细投影，不携带库存或登录身份。
 * 各业务只交付已确认的真实结果；窗口不发奖、不联网、不保存第二份资产。
 */

/** 一项服务端实际到账量；零到账会被显示投影过滤，不以理论量替代。 */
export interface RewardItem {
    /** 同源物品配置ID，不是持久实例ID。 */
    readonly itemId: number;
    /** 本次实际入账的非负安全整数。 */
    readonly credited: number;
}

/** 原发奖事务的真实等级变化，仅供升级反馈，不写角色Model或开启新功能。 */
export interface RoleUpgradeData {
    /** 本次经验链开始前的角色等级，不能从当前等级倒推。 */
    readonly beforeLevel: number;
    /** 本次经验链结束后的等级，必须严格高于beforeLevel。 */
    readonly afterLevel: number;
}

/** 已冻结的角色经验实际结果；主线回执投影保留它供通用升级反馈复用。 */
export interface RewardExperienceGain {
    /** 本次发放前的等级。 */
    readonly beforeLevel: number;
    /** 发放前等级内经验。 */
    readonly beforeExperience: number;
    /** 可信发奖计划请求的经验量。 */
    readonly requested: number;
    /** 规则真正接纳的经验量，包含跨级消耗。 */
    readonly accepted: number;
    /** 因等级上限未接纳的经验量，与accepted合为requested。 */
    readonly ignored: number;
    /** 发放后的历史等级，不是最新快照等级。 */
    readonly level: number;
    /** 发放后等级内经验。 */
    readonly experience: number;
    /** 本段升级实际附赠钻石，不含基础奖励。 */
    readonly diamonds: number;
}

/** 打开一次历史奖励展示，同编号重复打开不重新播放当前窗口的音效和动画。 */
export interface RewardArgs {
    /** 已确认业务成功结果的真实UUID，只用于当前窗口重复展示判断。 */
    readonly receiptId: string;
    /** 服务端通知或真实回执中已合并的实际到账与附赠；不传理论量或背包当前持有数。 */
    readonly items: readonly RewardItem[];
    /** 可选的真实升级信息；与本笔奖励共享原回执、队列与关闭语义。 */
    readonly roleUpgrade?: RoleUpgradeData;
    /** 本页关闭或销毁并清理监听后执行一次，供调用方继续展示队列，不代表资产提交。 */
    readonly onClosed?: () => void;
}

/** 列表格使用的实际到账展示，不提交任何资产Model。 */
export interface RewardRow {
    /** 本次实际获得的物品配置ID。 */
    readonly itemId: number;
    /** 已过滤零值的实际到账数量。 */
    readonly quantity: number;
}
