/** 事务内登记的公会页变更事件，提交后通知受影响的当前区服角色重读状态。 */
package com.funsgamex.mxzg.guild;

import java.util.Set;

/** 申请与成员的刷新目标，事件不携带未提交的公会数据。 */
public record GuildChanged(Set<String> roleIds) {
    /** 冻结同一动作的去重接收名单。 */
    public GuildChanged {
        roleIds = Set.copyOf(roleIds);
    }
}
