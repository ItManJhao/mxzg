/** 普通首抽唯一Model：权威资格由统一快照提交，待确认标记由Controller更新。 */
import type { FirstSummonState } from "./data/FirstSummonData";

/** 页面使用的只读首抽状态；待确认与服务端真实资格可同时存在。 */
export interface FirstSummonProgress {
    /** 已接纳的首抽资格；null表示尚未同步。 */
    readonly state: FirstSummonState | null;
    /** 当前统一持久资产版本；-1表示尚未收到首包。 */
    readonly revision: number;
    /** 原意图记录尚待回执、资产状态或反馈确认的请求编号。 */
    readonly requestId: string | null;
    /** 正在持久化/恢复/提交；完成或撤销后恢复可用。 */
    readonly busy: boolean;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 首抽已接纳的资格及原意图进度。 */
        "first-summon.updated": FirstSummonProgress;
    }
}

export class FirstSummonModel {
    /** 模块唯一快照；应用重置角色时清空资格和在途标记。 */
    public snapshot: FirstSummonProgress = Object.freeze({
        state: null, revision: -1, requestId: null, busy: false,
    });
}
