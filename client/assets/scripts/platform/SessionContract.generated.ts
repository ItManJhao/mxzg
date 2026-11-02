/** 自动生成：会话试点 DTO；修改 protocol/session-contract.json 后重新生成。尚未接入网络。 */

/** 连接建立后的首个请求；令牌仅通过加密连接消息体传递。 */
export interface SessionAuthenticate {
  readonly accessToken: string;
  readonly clientInstanceId: string;
}

/** 鉴权成功确认；进入同步阶段，不代表业务已可操作。 */
export interface SessionAccepted {
  readonly connectionId: string;
  readonly roleId: string;
  readonly serverTimeMs: number;
}

/** 应用层心跳回执；时间为服务端 Unix 毫秒。 */
export interface SessionHeartbeat {
  readonly serverTimeMs: number;
}

/** 一级升级业务请求；重连重试保持 requestId 和 expectedLevel 不变。 */
export interface HeroLevelCommand {
  readonly heroId: string;
  readonly requestId: string;
  readonly expectedLevel: number;
}
