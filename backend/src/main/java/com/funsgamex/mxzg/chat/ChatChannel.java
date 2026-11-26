/** 聊天在协议中的频道编号及旧版各自的历史窗口。 */
package com.funsgamex.mxzg.chat;

import java.util.Arrays;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum ChatChannel {
    SYSTEM(1, 10, true), WORLD(2, 100, false), GUILD(3, 100, false),
    PRIVATE(5, 50, true), CROSS(6, 100, false), GLOBAL(7, 50, false);

    /** 保留旧版频道号，供服务端读写和协议判断。 */
    private final int wireId;
    /** 同一会话客户端可读的最大消息条数。 */
    private final int retention;
    /** 系统和私聊使用旧版七个自然日的可见窗口。 */
    private final boolean dated;

    /** 记录频道的身份和历史窗口。 */
    ChatChannel(int wireId, int retention, boolean dated) {
        this.wireId = wireId;
        this.retention = retention;
        this.dated = dated;
    }

    /** 返回协议频道编号。 */
    public int wireId() {
        return wireId;
    }

    /** 返回当前频道的最大可见记录数。 */
    int retention() {
        return retention;
    }

    /** 私聊和系统频道需要额外判断自然日留存。 */
    boolean dated() {
        return dated;
    }

    /** 将明确收到的频道号换成域值，未知编号不自动降级为世界频道。 */
    public static ChatChannel fromWire(int wireId) {
        return Arrays.stream(values()).filter(channel -> channel.wireId == wireId).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "CHAT_INVALID"));
    }
}
