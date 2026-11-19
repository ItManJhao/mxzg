/** 独立通关奖励的快照字段，供主线状态校验和奖励列表读取。 */

/** 服务器统一快照里的独立通关奖励进度。 */
export interface MainChapterFirstRewardProgress {
    /** 首版进度格式，缺扩展时保持未同步。 */
    readonly schemaVersion: 1;
    /** 本角色独立通关奖励已领取的绝对关卡，不含战斗结果或里程碑。 */
    readonly claimedChapters: readonly number[];
    /** 当前服务器确认可领取、已达成但尚未领取的关卡。 */
    readonly eligibleChapters: readonly number[];
}
