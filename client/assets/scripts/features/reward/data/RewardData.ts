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

/** 打开一次历史奖励展示，同编号重复打开不重新播放当前窗口的音效和动画。 */
export interface RewardArgs {
    /** 已确认业务成功结果的真实UUID，只用于当前窗口重复展示判断。 */
    readonly receiptId: string;
    /** 服务端通知或真实回执中已合并的实际到账与附赠；不传理论量或背包当前持有数。 */
    readonly items: readonly RewardItem[];
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
