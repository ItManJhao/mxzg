/**
 * 领域操作已写入本次事务时发布的任务信号。
 * 来源持有实际角色锁并先处理原操作幂等，任务服务同步消费，进度随来源操作提交或回滚。
 */
package com.funsgamex.mxzg.quest;

/**
 * @param roleId 实际完成操作或发生状态变化的角色
 * @param metric 来源领域可证明的条件
 * @param condition 用于区分星级、品质、商店类型等的旧表参数，零表示通用条件
 * @param amount 正数为本次新增进度，零表示读取持久状态并检查达成情况
 */
public record QuestProgressEvent(String roleId, QuestMetric metric, int condition, long amount) {
    /** 生成由任务服务从领域事实表重新读取的信号，避免累加已有回执或角色状态。 */
    public QuestProgressEvent(String roleId, QuestMetric metric) {
        this(roleId, metric, 0, 0);
    }
}
