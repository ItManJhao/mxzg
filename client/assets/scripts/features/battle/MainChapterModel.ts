/** 主线唯一Model：权威进度来自统一快照，回执只描述已执行命令，不反写角色或背包。 */
import { BaseModel } from "../../framework/BaseModel";

/** 服务端权威进度；空待领奖表示没有未领取战报。 */
export interface MainChapterState {
    readonly maxCleared: number;
    readonly pendingBattleId: string | null;
    readonly assetRevision: number;
}
/** 成功回执的历史结果，只用于说明，不替代当前快照。 */
export interface MainChapterReceipt {
    readonly action: "BATTLE" | "SETTLED";
    readonly battleId: string;
    readonly state: MainChapterState;
    readonly rewards: readonly { itemId: number; quantity: number }[];
}
/** 已验证的持久战报，仅保留当前展示所需字节。 */
export interface MainChapterReplay {
    readonly battleId: string;
    readonly mission: number;
    readonly pending: readonly string[];
    readonly bytes: Uint8Array;
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
}
export class MainChapterModel extends BaseModel {
    /** 同应用生命周期的唯一主线数据入口。 */
    public static readonly instance = new MainChapterModel();
    /** null表示主线快照尚未同步。 */
    public state: MainChapterState | null = null;
    /** null表示未通关或旧服务端尚无挂机快照；不得显示假收益。 */
    public idle: MainChapterIdleState | null = null;
    /** 接纳快照时的本机毫秒，仅用于显示经过时长，不作为领取依据。 */
    public idleReceivedAt = 0;
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
    /** 最近一次恢复的战报，换号与应用销毁时清空。 */
    public replay: MainChapterReplay | null = null;
    /** 可恢复操作结果，页面关闭不抹去错误。 */
    public message = "";

    /** 应用切换身份清空业务状态；不承担网络连接代次判断。 */
    protected onReset(): void {
        this.state = null;
        this.idle = null;
        this.idleReplay = null;
        this.idleLoading = false;
        this.idleReceivedAt = 0;
        this.busy = false;
        this.requestId = null;
        this.receipt = null;
        this.replay = null;
        this.message = "";
    }
}
