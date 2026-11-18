/**
 * 客户端统一协议目录：集中管理现有消息标识、模块归属和读写含义，供发送、路由和日志共同使用。
 * 当前线上使用 Frame.name 字符串作协议标识；不是另造一套数字号，不复制游爱 Sproto 协议。
 */
export class Protocol {
    /** 协议目录只提供常量和查询，不创建实例。 */
    private constructor() { }

    /** 查询已实现协议；未知名称返回undefined，由调用边界决定拒绝或记录。 */
    public static findProtocol(name: string): ProtocolDefinition | undefined {
        return ProtocolDefinitions.find(value => value.name === name);
    }

    /** 当前角色主线挑战，使用持久幂等键。 */
    public static readonly CHAPTER_CHALLENGE = "chapter.challenge";
    /** 领取指定战报奖励，重复领取返回历史回执。 */
    public static readonly CHAPTER_CLAIM = "chapter.claim";
    /** 旧3006挂机普攻演出，不结算资产。 */
    public static readonly CHAPTER_IDLE_ENCOUNTER = "chapter.idle.encounter";
    /** 挂机消费事务；默认只读，原业务请求键用于持久幂等恢复。 */
    public static readonly CHAPTER_IDLE_CLAIM = "chapter.idle.claim";
    /** 只查询指定挂机请求的已提交回执，不查询库存或重算奖励。 */
    public static readonly CHAPTER_IDLE_CLAIM_STATUS = "chapter.idle.claim.status";
    /** 恢复当前角色的持久战报，不重新计算。 */
    public static readonly CHAPTER_REPLAY = "chapter.replay";
    /** 原配置ID是每角色稳定业务键，重复领取读取冻结回执。 */
    public static readonly CHAPTER_MILESTONE_CLAIM = "chapter.milestone.claim";
    /** 只查指定里程碑成功回执，不重新发放或查询库存。 */
    public static readonly CHAPTER_MILESTONE_STATUS = "chapter.milestone.claim.status";
    /** 领取绝对关卡号对应的独立通关奖励。 */
    public static readonly CHAPTER_FIRST_REWARD_CLAIM = "chapter.firstreward.claim";
    /** 根据绝对关卡号恢复同一笔独立通关奖励。 */
    public static readonly CHAPTER_FIRST_REWARD_STATUS = "chapter.firstreward.claim.status";
    /** 按持久请求键消耗精英碎片并生成英雄。 */
    public static readonly HERO_FRAGMENT_COMBINE = "bag.fragment.combine";
    /** 查询同一精英碎片合成请求的原结果。 */
    public static readonly HERO_FRAGMENT_COMBINE_STATUS = "bag.fragment.combine.status";
    /** 当前已保存阵容的开发只读试战，不发奖、不记录通关。 */
    public static readonly BATTLE_PREVIEW = "battle.preview";
    /** 主线阵型和站位保存；资产仍从统一状态同步。 */
    public static readonly FORMATION_SAVE = "formation.save";
    /** 领取角色唯一一次普通免费首抽，重复请求使用原幂等键。 */
    public static readonly HERO_FIRST_SUMMON = "hero.summon.first";
    /** 查询指定普通首抽请求的原成功回执。 */
    public static readonly HERO_FIRST_SUMMON_STATUS = "hero.summon.first.status";
    /** 消耗金币和英雄经验，将当前英雄提升指定的普通等级数。 */
    public static readonly HERO_LEVEL_UPGRADE = "hero.level.upgrade";
    /** 按原请求编号恢复已提交的普通升级回执。 */
    public static readonly HERO_LEVEL_UPGRADE_STATUS = "hero.level.upgrade.status";
    /** 查询本机 GM 实际开关。 */
    public static readonly GM_STATUS = "gm.status";
    /** 向当前角色发放开发资产；服务端持久幂等。 */
    public static readonly GM_GRANT = "gm.grant";
    /** 匿名读取开放区服。 */
    public static readonly SERVERS_LIST = "servers.list";
    /** 本地登录并统一初始化角色和背包。 */
    public static readonly SESSION_LOGIN = "session.login";
    /** 事务提交后同步角色与背包。 */
    public static readonly STATE_CHANGED = "state.changed";
    /** 原发奖事务提交后的通用反馈；不作为角色或背包资产增量。 */
    public static readonly REWARD_GRANTED = "reward.granted";
    /** 会话：建连后鉴权，凭证只出现在请求体，不打印。 */
    public static readonly SESSION_AUTHENTICATE = "session.authenticate";
    /** 会话：应用层心跳，不更新玩法数据，默认不打印。 */
    public static readonly SESSION_HEARTBEAT = "session.heartbeat";
    /** 会话：服务端通知当前连接被替换，停止重连并回登录。 */
    public static readonly SESSION_KICKED = "session.kicked";
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
    { name: Protocol.CHAPTER_CHALLENGE, module: "主线", description: "持久挑战回执" },
    { name: Protocol.CHAPTER_CLAIM, module: "主线", description: "幂等结算回执" },
    { name: Protocol.CHAPTER_IDLE_ENCOUNTER, module: "主线", description: "挂机遇敌演出战报" },
    { name: Protocol.CHAPTER_IDLE_CLAIM, module: "主线", description: "挂机领取历史回执" },
    { name: Protocol.CHAPTER_IDLE_CLAIM_STATUS, module: "主线", description: "指定挂机领取结果查询" },
    { name: Protocol.CHAPTER_REPLAY, module: "主线", description: "恢复持久战报" },
    { name: Protocol.CHAPTER_MILESTONE_CLAIM, module: "主线", description: "领取通关里程碑" },
    { name: Protocol.CHAPTER_MILESTONE_STATUS, module: "主线", description: "恢复里程碑领取回执" },
    { name: Protocol.CHAPTER_FIRST_REWARD_CLAIM, module: "主线", description: "领取独立通关奖励" },
    { name: Protocol.CHAPTER_FIRST_REWARD_STATUS, module: "主线", description: "恢复独立通关奖励回执" },
    { name: Protocol.HERO_FRAGMENT_COMBINE, module: "背包", description: "精英碎片合成" },
    { name: Protocol.HERO_FRAGMENT_COMBINE_STATUS, module: "背包", description: "恢复精英碎片合成回执" },
    { name: Protocol.BATTLE_PREVIEW, module: "战斗", description: "当前阵容只读试战" },
    { name: Protocol.FORMATION_SAVE, module: "阵容", description: "主线阵容保存回执" },
    { name: Protocol.HERO_FIRST_SUMMON, module: "召唤", description: "普通免费首抽" },
    { name: Protocol.HERO_FIRST_SUMMON_STATUS, module: "召唤", description: "恢复普通首抽回执" },
    { name: Protocol.HERO_LEVEL_UPGRADE, module: "英雄", description: "普通英雄升级" },
    { name: Protocol.HERO_LEVEL_UPGRADE_STATUS, module: "英雄", description: "恢复普通升级回执" },
    { name: Protocol.GM_STATUS, module: "开发GM", description: "GM 开关" },
    { name: Protocol.GM_GRANT, module: "开发GM", description: "当前角色资产发放回执" },
    { name: Protocol.SESSION_AUTHENTICATE, module: "会话", description: "连接鉴权确认" },
    { name: Protocol.SERVERS_LIST, module: "选服", description: "开放区服" },
    { name: Protocol.SESSION_LOGIN, module: "登录", description: "统一初始化角色和背包" },
    { name: Protocol.STATE_CHANGED, module: "资产", description: "提交后的角色与背包同步" },
    { name: Protocol.REWARD_GRANTED, module: "奖励", description: "已提交奖励的通用反馈" },
    { name: Protocol.SESSION_HEARTBEAT, module: "会话", description: "连接心跳" },
    { name: Protocol.SESSION_KICKED, module: "会话", description: "当前连接被替换" },
]);
