/** 聊天提交事件，通信层只向指定的区服或角色发出空载荷刷新。 */
package com.funsgamex.mxzg.chat;

import java.util.Set;

/**
 * @param serverIds 已验证的公开频道区服集合
 * @param roleIds 公会、私聊及个人已读更新的明确接收角色
 */
public record ChatChanged(Set<String> serverIds, Set<String> roleIds) {
    /** 冻结提交时的接收范围。 */
    public ChatChanged {
        serverIds = Set.copyOf(serverIds);
        roleIds = Set.copyOf(roleIds);
    }
}
