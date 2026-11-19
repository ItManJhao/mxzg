/** 挂机收取使用连接层已校验的即时回包，权威累计和资产通过统一快照更新。 */

/** 即时领取回执。收取轨道和获得窗使用各自需要的字段。 */
export interface IdleClaimReceipt {
    /** 本次点击的请求编号。 */
    readonly requestId: string;
    /** 服务端成功领取的回执编号。 */
    readonly receiptId: string;
    /** 本次提交的累计操作版本。 */
    readonly expectedOperationVersion: number;
    /** 领取完成的资产版本，奖励队列用它等待最新快照。 */
    readonly assetRevision: number;
    /** 实际结算的秒数。 */
    readonly seconds: number;
    /** 本次领取采用的累计上限，单位秒。 */
    readonly maxSeconds: number;
    /** 服务端的实际发放明细，由通用奖励队列读取。 */
    readonly actual: unknown;
}

/** 当前领取成功后的显示信号，保留原页面显示期。 */
export interface IdleClaimConfirmation {
    /** 本次领取在服务器提交后的实际结果。 */
    readonly receipt: IdleClaimReceipt;
    /** 接纳点击时的页面显示期，关闭或重开后失效。 */
    readonly presentationContext: object | null;
}
