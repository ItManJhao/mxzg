/** 变更事件只携带需要刷新好友列表的角色，由通信层在原事务提交后消费。 */
package com.funsgamex.mxzg.friend;

import java.util.List;

public record FriendChanged(List<String> roleIds) {
    /** 冻结目标列表，避免事务提交前更改推送对象。 */
    public FriendChanged {
        roleIds = List.copyOf(roleIds);
    }
}
