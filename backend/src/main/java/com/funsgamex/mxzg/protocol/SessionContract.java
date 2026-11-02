/** 自动生成：会话试点 DTO；修改 protocol/session-contract.json 后重新生成。英雄升级请求暂为预留。 */
package com.funsgamex.mxzg.protocol;

/** 首批请求与会话数据类型；字段取值仍需接入层校验。 */
public final class SessionContract {
    /** 禁止实例化类型容器。 */
    private SessionContract() {}

    /** 连接建立后的首个请求；令牌仅通过加密连接消息体传递。 */
    public record SessionAuthenticate(String accessToken, String clientInstanceId) {}

    /** 鉴权成功确认；进入同步阶段，不代表业务已可操作。 */
    public record SessionAccepted(String connectionId, String roleId, long serverTimeMs) {}

    /** 应用层心跳回执；时间为服务端 Unix 毫秒。 */
    public record SessionHeartbeat(long serverTimeMs) {}

    /** 一级升级业务请求；重连重试保持 requestId 和 expectedLevel 不变。 */
    public record HeroLevelCommand(String heroId, String requestId, long expectedLevel) {}
}
