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

    /** 定位已登记的日常副本协议，用于将同一载荷绑定到正确的副本类型。 */
    public static dailyDungeonRoute(name: string): { kind: DailyDungeonKind; operation: "list" | "challenge" } | undefined {
        for (const [kind, route] of Object.entries(DAILY_DUNGEON_PROTOCOLS)) {
            if (route.list === name) {
                return { kind: kind as DailyDungeonKind, operation: "list" };
            }
            if (route.challenge === name) {
                return { kind: kind as DailyDungeonKind, operation: "challenge" };
            }
        }
        return undefined;
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
    /** 读取快速战斗当天的使用次数、钻石价格和冒险点提示。 */
    public static readonly CHAPTER_QUICK_BATTLE_INFO = "chapter.quick-battle.info";
    /** 按服务端报价结算一次快速战斗；相同请求编号恢复原回执。 */
    public static readonly CHAPTER_QUICK_BATTLE_CLAIM = "chapter.quick-battle.claim";
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
    /** 只读预览当前草稿队员战力，不写阵容或资产。 */
    public static readonly FORMATION_POWER = "formation.power";
    /** 基础、友情、高级和积分召唤，回包提供真实获得的英雄实例。 */
    public static readonly HERO_SUMMON = "hero.summon";
    /** 普通单抽由服务端优先使用免费次数，其余消耗一张普通召唤券。 */
    public static readonly HERO_NORMAL_SUMMON = "hero.summon.normal";
    /** 历史免费首抽请求，按原操作编号返回该次结果。 */
    public static readonly HERO_FIRST_SUMMON = "hero.summon.first";
    /** 查询指定普通首抽请求的原成功回执。 */
    public static readonly HERO_FIRST_SUMMON_STATUS = "hero.summon.first.status";
    /** 消耗金币和英雄经验，将当前英雄提升指定的普通等级数。 */
    public static readonly HERO_LEVEL_UPGRADE = "hero.level.upgrade";
    /** 按原请求编号恢复已提交的普通升级回执。 */
    public static readonly HERO_LEVEL_UPGRADE_STATUS = "hero.level.upgrade.status";
    /** 进阶当前英雄一阶。 */
    public static readonly HERO_STAGE_ADVANCE = "hero.stage.advance";
    /** 查询原编号的进阶回执。 */
    public static readonly HERO_STAGE_ADVANCE_STATUS = "hero.stage.advance.status";
    /** 设定当前角色英雄的锁定状态，当前值由统一资产快照提供。 */
    public static readonly HERO_LOCK_SET = "hero.lock.set";
    /** 提交升星素材与配方，资产由统一快照同步。 */
    public static readonly HERO_STAR_UPGRADE = "hero.star.upgrade";
    /** 镶嵌、卸下或合成宝石，资产由统一快照同步。 */
    public static readonly HERO_JEWEL_CHANGE = "hero.jewel.change";
    /** 穿戴或卸下神装，资产由统一快照同步。 */
    public static readonly HERO_GOD_EQUIPMENT_CHANGE = "hero.god-equipment.change";
    /** 神装探宝，资产由统一快照同步。 */
    public static readonly HERO_GOD_EQUIPMENT_DRAW = "hero.god-equipment.draw";
    /** 圣器激活、穿卸、升星和转换。 */
    public static readonly HERO_ARTIFACT_CHANGE = "hero.artifact.change";
    /** 神装商店按商品和当前日周期购买。 */
    public static readonly HERO_GOD_EQUIPMENT_SHOP_BUY = "hero.god-equipment.shop.buy";
    /** 普通装备逐件或批量穿脱；最终装备槽及库存由统一快照提供。 */
    public static readonly HERO_EQUIPMENT_CHANGE = "hero.equipment.change";
    /** 获取当前角色的普通市场货架、已购数量和刷新状态。 */
    public static readonly MARKET_LIST = "market.list";
    /** 按在看的货架版本购买指定商品，价格及库存由服务端处理。 */
    public static readonly MARKET_BUY = "market.buy";
    /** 使用当前货架版本刷新商品，服务端判断免费或付费。 */
    public static readonly MARKET_REFRESH = "market.refresh";
    /** 查询本区公会与当前成员状态。 */
    public static readonly GUILD_LIST = "guild.list";
    /** 创建、申请、审批或退出公会，按同一业务编号去重。 */
    public static readonly GUILD_CHANGE = "guild.change";
    /** 已提交的公会状态发生变化，通知打开的公会页更新。 */
    public static readonly GUILD_UPDATED = "guild.updated";
    /** 领取当前 VIP 档位已达成的契约任务奖励。 */
    public static readonly VIP_CLAIM = "vip.claim";
    /** 读取金币副本的关卡资格、原产物及当天挑战次数。 */
    public static readonly DAILY_DUNGEON_LIST = "dungeon.gold.list";
    /** 提交金币副本的挑战或扫荡并取得权威结算。 */
    public static readonly DAILY_DUNGEON_CHALLENGE = "dungeon.gold.challenge";
    /** 读取经验副本的关卡资格、产物及独立每日次数。 */
    public static readonly EXPERIENCE_DUNGEON_LIST = "dungeon.experience.list";
    /** 提交经验副本的挑战或扫荡并取得权威结算。 */
    public static readonly EXPERIENCE_DUNGEON_CHALLENGE = "dungeon.experience.challenge";
    /** 读取英雄副本的关卡资格、碎片产物及独立每日次数。 */
    public static readonly HERO_DUNGEON_LIST = "dungeon.hero.list";
    /** 提交英雄副本的挑战或扫荡并取得权威结算。 */
    public static readonly HERO_DUNGEON_CHALLENGE = "dungeon.hero.challenge";
    /** 读取羁绊副本的关卡资格、产物及独立每日次数。 */
    public static readonly FETTER_DUNGEON_LIST = "dungeon.fetter.list";
    /** 提交羁绊副本的挑战或扫荡并取得权威结算。 */
    public static readonly FETTER_DUNGEON_CHALLENGE = "dungeon.fetter.challenge";
    /** 读取精灵副本的关卡资格、产物及独立每日次数。 */
    public static readonly SPIRIT_DUNGEON_LIST = "dungeon.spirit.list";
    /** 提交精灵副本的挑战或扫荡并取得权威结算。 */
    public static readonly SPIRIT_DUNGEON_CHALLENGE = "dungeon.spirit.challenge";
    /** 查询幻境之塔的布阵、已通关层数、体力和扫荡报价。 */
    public static readonly TOWER_STATE = "tower.state";
    /** 保存幻境之塔的专用出阵。 */
    public static readonly TOWER_FORMATION_SAVE = "tower.formation.save";
    /** 挑战幻境之塔的下一层并返回原战报及实际结算。 */
    public static readonly TOWER_CHALLENGE = "tower.challenge";
    /** 扫荡已通关的最高层，服务端校验次数及价格。 */
    public static readonly TOWER_SWEEP = "tower.sweep";
    /** 领取幻境之塔里程碑奖励。 */
    public static readonly TOWER_MILESTONE_CLAIM = "tower.milestone.claim";
    /** 查询新手竞技场的对手、次数、积分与历史。 */
    public static readonly ARENA_STATE = "arena.state";
    /** 请求重新匹配一组配置对手。 */
    public static readonly ARENA_REFRESH = "arena.refresh";
    /** 对已匹配的竞技场对手发起真实挑战。 */
    public static readonly ARENA_CHALLENGE = "arena.challenge";
    /** 按原战斗编号读取竞技场的历史战报。 */
    public static readonly ARENA_REPLAY = "arena.replay";
    /** 购买原竞技场门票，余额由资产快照提交。 */
    public static readonly ARENA_TICKET_BUY = "arena.ticket.buy";
    /** 查询本机 GM 实际开关。 */
    public static readonly GM_STATUS = "gm.status";
    /** 向当前角色发放开发资产；服务端持久幂等。 */
    public static readonly GM_GRANT = "gm.grant";
    /** 设置当前角色等级，资产随统一快照更新。 */
    public static readonly GM_LEVEL_SET = "gm.level.set";
    /** 设置当前角色要挑战的主线关卡。 */
    public static readonly GM_CHAPTER_SET = "gm.chapter.set";
    /** 即时读取开发服务器的游戏时间。 */
    public static readonly GM_TIME_GET = "gm.time.get";
    /** 设置开发服务器的游戏时间，参数 0 恢复真实时间。 */
    public static readonly GM_TIME_SET = "gm.time.set";
    /** 匿名读取开放区服。 */
    public static readonly SERVERS_LIST = "servers.list";
    /** 本地登录并统一初始化角色和背包。 */
    public static readonly SESSION_LOGIN = "session.login";
    /** 由服务端为当前角色提供一个随机候选名。 */
    public static readonly ROLE_NAME_RANDOM = "role.name.random";
    /** 保存首次名称，结果通过角色快照同步。 */
    public static readonly ROLE_NAME_SET = "role.name.set";
    /** 二次改名并支付玩家确认的费用，资料随统一快照刷新。 */
    public static readonly ROLE_RENAME = "role.name.rename";
    /** 更换角色形象，服务端按已有解锁条件验证。 */
    public static readonly ROLE_IMAGE_CHANGE = "role.image.change";
    /** 读取当前角色从持久图鉴解锁的形象。 */
    public static readonly ROLE_IMAGES_LIST = "role.image.list";
    /** 读取当前角色已获得的称号和到期时间。 */
    public static readonly ROLE_TITLES_LIST = "role.titles.list";
    /** 读取当前头像、头像框解锁资格及贵重标记设置。 */
    public static readonly ROLE_DECORATIONS_LIST = "role.decorations.list";
    /** 更换已解锁头像。 */
    public static readonly ROLE_HEAD_CHANGE = "role.head.change";
    /** 佩戴已激活头像框。 */
    public static readonly ROLE_BORDER_CHANGE = "role.border.change";
    /** 以原配置所需物品激活头像框。 */
    public static readonly ROLE_BORDER_ACTIVATE = "role.border.activate";
    /** 保存个人贵重标记的聊天展示开关。 */
    public static readonly ROLE_PEERAGE_DISPLAY = "role.peerage.display";
    /** 领取当前角色的一次性新手赠礼，已领取时返回原发奖回执。 */
    public static readonly ROLE_WELCOME_CLAIM = "role.welcome.claim";
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
/** 旧客户端页签顺序及对应的真实协议，列表、挑战和战报共用类型名。 */
export const DAILY_DUNGEON_PROTOCOLS = {
    gold: { list: Protocol.DAILY_DUNGEON_LIST, challenge: Protocol.DAILY_DUNGEON_CHALLENGE },
    experience: { list: Protocol.EXPERIENCE_DUNGEON_LIST, challenge: Protocol.EXPERIENCE_DUNGEON_CHALLENGE },
    hero: { list: Protocol.HERO_DUNGEON_LIST, challenge: Protocol.HERO_DUNGEON_CHALLENGE },
    fetter: { list: Protocol.FETTER_DUNGEON_LIST, challenge: Protocol.FETTER_DUNGEON_CHALLENGE },
    spirit: { list: Protocol.SPIRIT_DUNGEON_LIST, challenge: Protocol.SPIRIT_DUNGEON_CHALLENGE },
} as const;
/** 可定位独立进度、发奖和战报的日常副本类型。 */
export type DailyDungeonKind = keyof typeof DAILY_DUNGEON_PROTOCOLS;
/** 五类副本共用请求载荷，按实际协议名区分查询和资产命令。 */
type DailyDungeonRoutes = typeof DAILY_DUNGEON_PROTOCOLS[DailyDungeonKind];
/** 已实现消息标识集合，预留玩法不伪装成可调用协议。 */
export type ProtocolName = Extract<typeof Protocol[keyof typeof Protocol], string>;
/** 当前只允许读取的业务请求；鉴权首帧由连接层单独处理。 */
export type ReadProtocol = typeof Protocol.SESSION_HEARTBEAT | typeof Protocol.GM_STATUS | typeof Protocol.GM_TIME_GET
    | typeof Protocol.ROLE_NAME_RANDOM | typeof Protocol.ROLE_TITLES_LIST | typeof Protocol.ROLE_IMAGES_LIST
    | typeof Protocol.ROLE_DECORATIONS_LIST
    | typeof Protocol.MARKET_LIST | DailyDungeonRoutes["list"]
    | typeof Protocol.TOWER_STATE | typeof Protocol.ARENA_STATE | typeof Protocol.ARENA_REPLAY
    | typeof Protocol.GUILD_LIST | typeof Protocol.CHAPTER_QUICK_BATTLE_INFO | typeof Protocol.FORMATION_POWER;
/** 具有角色归属回执的操作；查询与原命令经同一条认证连接。 */
export type RoleOperationProtocol = typeof Protocol.HERO_SUMMON | typeof Protocol.HERO_NORMAL_SUMMON
    | typeof Protocol.HERO_FIRST_SUMMON | typeof Protocol.HERO_FIRST_SUMMON_STATUS
    | typeof Protocol.HERO_FRAGMENT_COMBINE | typeof Protocol.HERO_FRAGMENT_COMBINE_STATUS
    | typeof Protocol.HERO_LEVEL_UPGRADE | typeof Protocol.HERO_LEVEL_UPGRADE_STATUS
    | typeof Protocol.HERO_STAGE_ADVANCE | typeof Protocol.HERO_STAGE_ADVANCE_STATUS
    | typeof Protocol.HERO_LOCK_SET
    | typeof Protocol.HERO_STAR_UPGRADE
    | typeof Protocol.HERO_JEWEL_CHANGE
    | typeof Protocol.HERO_GOD_EQUIPMENT_CHANGE
    | typeof Protocol.HERO_GOD_EQUIPMENT_DRAW
    | typeof Protocol.HERO_ARTIFACT_CHANGE
    | typeof Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY
    | typeof Protocol.HERO_EQUIPMENT_CHANGE | typeof Protocol.MARKET_BUY | typeof Protocol.MARKET_REFRESH
    | typeof Protocol.CHAPTER_FIRST_REWARD_CLAIM | typeof Protocol.CHAPTER_FIRST_REWARD_STATUS
    | typeof Protocol.ROLE_WELCOME_CLAIM | DailyDungeonRoutes["challenge"] | typeof Protocol.GUILD_CHANGE
    | typeof Protocol.VIP_CLAIM | typeof Protocol.CHAPTER_QUICK_BATTLE_CLAIM
    | typeof Protocol.TOWER_CHALLENGE | typeof Protocol.TOWER_SWEEP
    | typeof Protocol.TOWER_MILESTONE_CLAIM | typeof Protocol.ARENA_CHALLENGE | typeof Protocol.ARENA_TICKET_BUY;

/** 现行主线请求，包括历史回执和只读战报。 */
export type ChapterProtocol = Extract<ProtocolName, `chapter.${string}`>;

/** 已完成登录后允许从业务模块发出的请求；连接握手和推送由传输层单独处理。 */
export type AuthenticatedGameProtocol = ReadProtocol | RoleOperationProtocol | ChapterProtocol
    | typeof Protocol.BATTLE_PREVIEW | typeof Protocol.FORMATION_SAVE | typeof Protocol.GM_GRANT
    | typeof Protocol.TOWER_FORMATION_SAVE | typeof Protocol.ARENA_REFRESH
    | typeof Protocol.GM_LEVEL_SET | typeof Protocol.GM_CHAPTER_SET | typeof Protocol.GM_TIME_SET
    | typeof Protocol.ROLE_NAME_SET | typeof Protocol.ROLE_RENAME | typeof Protocol.ROLE_IMAGE_CHANGE
    | typeof Protocol.ROLE_HEAD_CHANGE | typeof Protocol.ROLE_BORDER_CHANGE | typeof Protocol.ROLE_BORDER_ACTIVATE
    | typeof Protocol.ROLE_PEERAGE_DISPLAY;

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
    { name: Protocol.FORMATION_POWER, module: "阵容", description: "草稿队员战力预览" },
    { name: Protocol.HERO_SUMMON, module: "召唤", description: "召唤及积分兑换回执" },
    { name: Protocol.HERO_NORMAL_SUMMON, module: "召唤", description: "普通单抽" },
    { name: Protocol.HERO_FIRST_SUMMON, module: "召唤", description: "普通免费首抽" },
    { name: Protocol.HERO_FIRST_SUMMON_STATUS, module: "召唤", description: "恢复普通首抽回执" },
    { name: Protocol.HERO_LEVEL_UPGRADE, module: "英雄", description: "普通英雄升级" },
    { name: Protocol.HERO_LEVEL_UPGRADE_STATUS, module: "英雄", description: "恢复普通升级回执" },
    { name: Protocol.HERO_STAGE_ADVANCE, module: "英雄", description: "强化英雄进阶" },
    { name: Protocol.HERO_STAGE_ADVANCE_STATUS, module: "英雄", description: "恢复强化进阶回执" },
    { name: Protocol.HERO_LOCK_SET, module: "英雄", description: "设置英雄锁定状态" },
    { name: Protocol.HERO_STAR_UPGRADE, module: "英雄", description: "提交升星素材与配方" },
    { name: Protocol.HERO_JEWEL_CHANGE, module: "英雄", description: "镶嵌、卸下或合成宝石" },
    { name: Protocol.HERO_GOD_EQUIPMENT_CHANGE, module: "英雄", description: "穿戴或卸下神装" },
    { name: Protocol.HERO_GOD_EQUIPMENT_DRAW, module: "英雄", description: "神装探宝" },
    { name: Protocol.HERO_ARTIFACT_CHANGE, module: "英雄", description: "圣器操作" },
    { name: Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY, module: "英雄", description: "购买神装商店商品" },
    { name: Protocol.HERO_EQUIPMENT_CHANGE, module: "英雄", description: "普通装备穿脱与一键穿装回执" },
    { name: Protocol.MARKET_LIST, module: "商店", description: "普通市场当前货架及刷新次数" },
    { name: Protocol.MARKET_BUY, module: "商店", description: "购买当前货架商品" },
    { name: Protocol.MARKET_REFRESH, module: "商店", description: "刷新普通市场货架" },
    { name: Protocol.GUILD_LIST, module: "公会", description: "查询本区公会和成员状态" },
    { name: Protocol.GUILD_CHANGE, module: "公会", description: "创建、申请、审批或退出公会" },
    { name: Protocol.GUILD_UPDATED, module: "公会", description: "公会状态已提交更新" },
    { name: Protocol.VIP_CLAIM, module: "VIP", description: "领取当前档位的契约任务奖励" },
    { name: Protocol.CHAPTER_QUICK_BATTLE_INFO, module: "主线", description: "读取今日快速战斗次数与报价" },
    { name: Protocol.CHAPTER_QUICK_BATTLE_CLAIM, module: "主线", description: "确认报价并结算快速战斗" },
    { name: Protocol.DAILY_DUNGEON_LIST, module: "副本", description: "读取金币副本关卡资格和共享每日次数" },
    { name: Protocol.DAILY_DUNGEON_CHALLENGE, module: "副本", description: "金币副本挑战或清扫与结算回执" },
    { name: Protocol.EXPERIENCE_DUNGEON_LIST, module: "副本", description: "读取经验副本关卡资格和独立每日次数" },
    { name: Protocol.EXPERIENCE_DUNGEON_CHALLENGE, module: "副本", description: "经验副本挑战或扫荡与结算回执" },
    { name: Protocol.HERO_DUNGEON_LIST, module: "副本", description: "读取英雄副本关卡、碎片产物及每日次数" },
    { name: Protocol.HERO_DUNGEON_CHALLENGE, module: "副本", description: "英雄副本挑战或扫荡与结算回执" },
    { name: Protocol.FETTER_DUNGEON_LIST, module: "副本", description: "读取羁绊副本关卡、产物及每日次数" },
    { name: Protocol.FETTER_DUNGEON_CHALLENGE, module: "副本", description: "羁绊副本挑战或扫荡与结算回执" },
    { name: Protocol.SPIRIT_DUNGEON_LIST, module: "副本", description: "读取精灵副本关卡、产物及每日次数" },
    { name: Protocol.SPIRIT_DUNGEON_CHALLENGE, module: "副本", description: "精灵副本挑战或扫荡与结算回执" },
    { name: Protocol.TOWER_STATE, module: "幻境之塔", description: "读取专用阵容、通关、体力及扫荡状态" },
    { name: Protocol.TOWER_FORMATION_SAVE, module: "幻境之塔", description: "保存专用阵容" },
    { name: Protocol.TOWER_CHALLENGE, module: "幻境之塔", description: "挑战下一层及结算" },
    { name: Protocol.TOWER_SWEEP, module: "幻境之塔", description: "扫荡已通关最高层" },
    { name: Protocol.TOWER_MILESTONE_CLAIM, module: "幻境之塔", description: "领取通关里程碑奖励" },
    { name: Protocol.ARENA_STATE, module: "竞技场", description: "读取新手对手、积分、次数与战报列表" },
    { name: Protocol.ARENA_REFRESH, module: "竞技场", description: "刷新新手对手" },
    { name: Protocol.ARENA_CHALLENGE, module: "竞技场", description: "发起挑战并结算积分与奖励" },
    { name: Protocol.ARENA_REPLAY, module: "竞技场", description: "读取冻结战报" },
    { name: Protocol.ARENA_TICKET_BUY, module: "竞技场", description: "购买挑战门票" },
    { name: Protocol.GM_STATUS, module: "开发GM", description: "GM 开关" },
    { name: Protocol.GM_GRANT, module: "开发GM", description: "当前角色资产发放回执" },
    { name: Protocol.GM_LEVEL_SET, module: "开发GM", description: "设置当前角色等级" },
    { name: Protocol.GM_CHAPTER_SET, module: "开发GM", description: "设置主线挑战关卡" },
    { name: Protocol.GM_TIME_GET, module: "开发GM", description: "读取服务器时间" },
    { name: Protocol.GM_TIME_SET, module: "开发GM", description: "设置服务器时间" },
    { name: Protocol.SESSION_AUTHENTICATE, module: "会话", description: "连接鉴权确认" },
    { name: Protocol.SERVERS_LIST, module: "选服", description: "开放区服" },
    { name: Protocol.SESSION_LOGIN, module: "登录", description: "统一初始化角色和背包" },
    { name: Protocol.ROLE_NAME_RANDOM, module: "角色", description: "首次命名候选" },
    { name: Protocol.ROLE_NAME_SET, module: "角色", description: "保存首次名称" },
    { name: Protocol.ROLE_RENAME, module: "角色", description: "二次改名" },
    { name: Protocol.ROLE_IMAGE_CHANGE, module: "角色", description: "更换角色形象" },
    { name: Protocol.ROLE_IMAGES_LIST, module: "角色", description: "查看已解锁角色形象" },
    { name: Protocol.ROLE_TITLES_LIST, module: "角色", description: "查看已获得称号" },
    { name: Protocol.ROLE_DECORATIONS_LIST, module: "角色", description: "读取装饰资格" },
    { name: Protocol.ROLE_HEAD_CHANGE, module: "角色", description: "更换头像" },
    { name: Protocol.ROLE_BORDER_CHANGE, module: "角色", description: "佩戴头像框" },
    { name: Protocol.ROLE_BORDER_ACTIVATE, module: "角色", description: "激活头像框" },
    { name: Protocol.ROLE_PEERAGE_DISPLAY, module: "角色", description: "保存贵重标记展示状态" },
    { name: Protocol.ROLE_WELCOME_CLAIM, module: "角色", description: "领取新手赠礼" },
    { name: Protocol.STATE_CHANGED, module: "资产", description: "提交后的角色与背包同步" },
    { name: Protocol.REWARD_GRANTED, module: "奖励", description: "已提交奖励的通用反馈" },
    { name: Protocol.SESSION_HEARTBEAT, module: "会话", description: "连接心跳" },
    { name: Protocol.SESSION_KICKED, module: "会话", description: "当前连接被替换" },
]);
