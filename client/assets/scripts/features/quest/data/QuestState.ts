/** 任务协议经过编码器校验后的展示数据，由 QuestController 提交给任务 Model。 */

/** 窗口页签与任务列表归属。 */
export type QuestTab = "daily" | "achievement";

/** 按原物品配置编号展示的服务端奖励。 */
export interface QuestReward {
    readonly itemId: number;
    readonly quantity: number;
}

/** 每日或成就的一档任务，实际进度可以超过要求。 */
export interface QuestTask {
    readonly id: number;
    readonly title: string;
    readonly current: number;
    readonly target: number;
    readonly claimed: boolean;
    readonly rewards: readonly QuestReward[];
    readonly destination: string;
}

/** 一次每日活跃度领取门槛。 */
export interface QuestMilestone {
    readonly id: number;
    readonly points: number;
    readonly claimed: boolean;
    readonly rewards: readonly QuestReward[];
}

/** 当前服务端任务快照，换号后由应用清空。 */
export interface QuestSnapshot {
    readonly resetAt: number;
    readonly activityPoints: number;
    readonly daily: readonly QuestTask[];
    readonly achievements: readonly QuestTask[];
    readonly milestones: readonly QuestMilestone[];
}

/** 成就首次达成事件，供场景提示队列显示。 */
export interface QuestCompletion {
    readonly id: number;
    readonly title: string;
}
