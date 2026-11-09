/**
 * 客户端统一协议目录：集中管理现有消息标识、模块归属和读写含义，供发送、路由和日志共同使用。
 * 当前线上使用 Frame.name 字符串作协议标识；不是另造一套数字号，不复制游爱 Sproto 协议。
 */
export class Protocol {
    /** 当前角色主线挑战，使用持久幂等键。 */
    static readonly CHAPTER_CHALLENGE = "chapter.challenge";
    /** 领取指定战报奖励，重复领取返回历史回执。 */
    static readonly CHAPTER_CLAIM = "chapter.claim";
    /** 恢复当前角色的持久战报，不重新计算。 */
    /** 旧3006挂机普攻演出，不结算资产。 */
    static readonly CHAPTER_IDLE_ENCOUNTER = "chapter.idle.encounter";
    static readonly CHAPTER_REPLAY = "chapter.replay";
    /** 当前已保存阵容的开发只读试战，不发奖、不记录通关。 */
    static readonly BATTLE_PREVIEW = "battle.preview";
    /** 主线阵型和站位保存；资产仍从统一状态同步。 */
    static readonly FORMATION_SAVE = "formation.save";
    /** 查询本机 GM 实际开关。 */
    static readonly GM_STATUS = "gm.status";
    /** 向当前角色发放开发资产；服务端持久幂等。 */
    static readonly GM_GRANT = "gm.grant";
    /** 匿名读取开放区服。 */
    static readonly SERVERS_LIST = "servers.list";
    /** 本地登录并统一初始化角色和背包。 */
    static readonly SESSION_LOGIN = "session.login";
    /** 事务提交后同步角色与背包。 */
    static readonly STATE_CHANGED = "state.changed";
    /** 会话：建连后鉴权，凭证只出现在请求体，不打印。 */
    static readonly SESSION_AUTHENTICATE = "session.authenticate";
    /** 会话：应用层心跳，不更新玩法数据，默认不打印。 */
    static readonly SESSION_HEARTBEAT = "session.heartbeat";
    /** 会话：服务端通知当前连接被替换，停止重连并回登录。 */
    static readonly SESSION_KICKED = "session.kicked";
}
/** 已实现消息标识集合，预留玩法不伪装成可调用协议。 */
export type ProtocolName = Extract<typeof Protocol[keyof typeof Protocol], string>;
/** 当前只允许读取的业务请求；鉴权首帧由连接层单独处理。 */
export type ReadProtocol = typeof Protocol.SESSION_HEARTBEAT | typeof Protocol.GM_STATUS;
/** 协议目录的可读说明，不存玩家数据。 */
export interface ProtocolDefinition {
    /** 与服务端 Frame.name 相同的协议标识。 */
    readonly name: ProtocolName;
    /** 负责处理的功能模块。 */
    readonly module: string;
    /** 人可读的业务含义，供控制台与维护使用。 */
    readonly description: string;
}
/** 仅列出真正已接通的消息，新增协议须同步 .proto、服务端和模块处理。 */
export const ProtocolDefinitions: readonly ProtocolDefinition[] = Object.freeze([
    {name:Protocol.CHAPTER_CHALLENGE,module:"主线",description:"持久挑战回执"},
    {name:Protocol.CHAPTER_CLAIM,module:"主线",description:"幂等结算回执"},
    {name:Protocol.CHAPTER_IDLE_ENCOUNTER,module:"主线",description:"挂机遇敌演出战报"},
    {name:Protocol.CHAPTER_REPLAY,module:"主线",description:"恢复持久战报"},
    {name:Protocol.BATTLE_PREVIEW,module:"战斗",description:"当前阵容只读试战"},
    {name:Protocol.FORMATION_SAVE,module:"阵容",description:"主线阵容保存回执"},
    {name:Protocol.GM_STATUS,module:"开发GM",description:"GM 开关"},
    {name:Protocol.GM_GRANT,module:"开发GM",description:"当前角色资产发放回执"},
    {name:Protocol.SESSION_AUTHENTICATE,module:"会话",description:"连接鉴权确认"},
    {name:Protocol.SERVERS_LIST,module:"选服",description:"开放区服"},
    {name:Protocol.SESSION_LOGIN,module:"登录",description:"统一初始化角色和背包"},
    {name:Protocol.STATE_CHANGED,module:"资产",description:"提交后的角色与背包同步"},
    {name:Protocol.SESSION_HEARTBEAT,module:"会话",description:"连接心跳"},
    {name:Protocol.SESSION_KICKED,module:"会话",description:"当前连接被替换"},

]);
/** 查询已实现协议，未知消息返回 undefined，不能靠前端声明绕过后端准入。 */
export function findProtocol(name: string): ProtocolDefinition | undefined {
    return ProtocolDefinitions.find(value => value.name === name);
}
