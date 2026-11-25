/**
 * 已提交的日常和成就变更。QuestService 按事务聚合后向在线连接发布。
 * 客户端收到后重读权威任务状态，completed 仅包含事务中首次达到的成就。
 */
package com.funsgamex.mxzg.quest;

import java.util.List;

public record QuestChanged(String roleId, List<QuestService.QuestCompletion> completed) {
    /** 固定本次提示顺序，提交后的接收方无法修改其他会话的通知。 */
    public QuestChanged {
        completed = List.copyOf(completed);
    }
}
