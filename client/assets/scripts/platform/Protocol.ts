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
    /** 获取指定黑市页签的商品、限购和自动刷新时间。 */
    public static readonly BLACK_MARKET_LIST = "black-market.list";
    /** 购买指定黑市货架上的商品，服务端原子结算与计数。 */
    public static readonly BLACK_MARKET_BUY = "black-market.buy";
    /** 按当前库存预演一个部位的一键装备合成。 */
    public static readonly SMITH_PREVIEW = "smith.preview";
    /** 提交普通装备的目标配置和合成数量。 */
    public static readonly SMITH_FORGE = "smith.forge";
    /** 按玩家确认的资产版本提交一个部位的连续合成。 */
    public static readonly SMITH_FORGE_ALL = "smith.forge.all";
    /** 查询本区公会与当前成员状态。 */
    public static readonly GUILD_LIST = "guild.list";
    /** 创建、申请、审批或退出公会，按同一业务编号去重。 */
    public static readonly GUILD_CHANGE = "guild.change";
    /** 已提交的公会状态发生变化，通知打开的公会页更新。 */
    public static readonly GUILD_UPDATED = "guild.updated";
    /** 读取当前周可兑换物品和个人限购。 */
    public static readonly GUILD_SHOP_LIST = "guild.shop.list";
    /** 使用服务器提供的周报价兑换公会商店物品。 */
    public static readonly GUILD_SHOP_BUY = "guild.shop.buy";
    /** 读取当天个人捐献资格与全公会点数。 */
    public static readonly GUILD_DONATION_INFO = "guild.donation.info";
    /** 向当前公会完成一档捐献。 */
    public static readonly GUILD_DONATION_DONATE = "guild.donation.donate";
    /** 根据全会每日贡献领取一个宝箱。 */
    public static readonly GUILD_DONATION_CLAIM = "guild.donation.claim";
    /** 读取本服公会榜和所属公会的名次。 */
    public static readonly GUILD_RANKING = "guild.ranking";
    /** 读取本人四职业科技树和下一格的服务端报价。 */
    public static readonly GUILD_TECHNOLOGY_INFO = "guild.technology.info";
    /** 确认本人科技树版本，点亮指定职业的下一格。 */
    public static readonly GUILD_TECHNOLOGY_UPGRADE = "guild.technology.upgrade";
    /** 按同一确认版本消耗钻石、重置职业并实际返还材料。 */
    public static readonly GUILD_TECHNOLOGY_RESET = "guild.technology.reset";
    /** 读取当前角色的每日任务、活跃奖励和成就。 */
    public static readonly QUEST_LIST = "quest.list";
    /** 领取指定分类和编号的任务或活跃奖励。 */
    public static readonly QUEST_CLAIM = "quest.claim";
    /** 已提交的任务进度变化，携带本次达成的成就。 */
    public static readonly QUEST_CHANGED = "quest.changed";
    /** 获取本服与已开放跨服榜首及当日点赞状态。 */
    public static readonly RANKING_OVERVIEW = "ranking.overview";
    /** 获取指定榜的前列名次及本人名次。 */
    public static readonly RANKING_LIST = "ranking.list";
    /** 向指定榜首点赞，按已展示的日界及榜首校验。 */
    public static readonly RANKING_LIKE = "ranking.like";
    /** 读取角色邮件箱及各封邮件的状态。 */
    public static readonly MAIL_LIST = "mail.list";
    /** 打开、领取或删除邮件。 */
    public static readonly MAIL_CHANGE = "mail.change";
    /** 事务提交后通知在线角色读取邮件。 */
    public static readonly MAIL_CHANGED = "mail.changed";
    /** 读取好友、礼物、申请与黑名单。 */
    public static readonly FRIEND_STATE = "friend.state";
    /** 按角色名称或编号搜索，也提供空查询推荐。 */
    public static readonly FRIEND_SEARCH = "friend.search";
    /** 提交好友关系及友情礼物操作。 */
    public static readonly FRIEND_CHANGE = "friend.change";
    /** 好友关系或礼物提交后的刷新通知。 */
    public static readonly FRIEND_CHANGED = "friend.changed";
    /** 读取当前角色的可用频道、未读和最近私聊。 */
    public static readonly CHAT_OVERVIEW = "chat.overview";
    /** 读取指定频道或私聊最近消息及历史分页。 */
    public static readonly CHAT_HISTORY = "chat.history";
    /** 发布有权限的频道或私聊消息；原业务编号用于结果未知时重试。 */
    public static readonly CHAT_SEND = "chat.send";
    /** 保存本角色在一个频道或会话的已读位置。 */
    public static readonly CHAT_READ = "chat.read";
    /** 角色可访问的消息或已读提交后的空载荷刷新信号。 */
    public static readonly CHAT_CHANGED = "chat.changed";
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
    /** 读取当前梦境挑战、专用阵容、里程碑及可恢复战报。 */
    public static readonly DREAMLAND_STATE = "dreamland.state";
    /** 在服务端确认的状态版本上执行一次梦境操作。 */
    public static readonly DREAMLAND_ACT = "dreamland.act";
    /** 读取本日派遣、已选支援和好友提供的英雄。 */
    public static readonly DREAMLAND_ASSISTANCE = "dreamland.assistance";
    /** 读取同服通关排行、本人名次与零点奖励档。 */
    public static readonly DREAMLAND_RANKING = "dreamland.ranking";
    /** 预估独立草稿与已选好友助战的服务端战力。 */
    public static readonly DREAMLAND_FORMATION_POWER = "dreamland.formation.power";
    /** 读取上海自然日的试炼难度、进度和恢复战报。 */
    public static readonly TRIAL_STATE = "trial.state";
    /** 执行试炼选难度、布阵、挑战、领奖与好友支援。 */
    public static readonly TRIAL_ACT = "trial.act";
    /** 查询当日派遣、已借用和可用好友支援。 */
    public static readonly TRIAL_ASSISTANCE = "trial.assistance";
    /** 读取勇者试炼周货架。 */
    public static readonly TRIAL_SHOP = "trial.shop";
    /** 使用试炼之血按本周报价兑换。 */
    public static readonly TRIAL_SHOP_BUY = "trial.shop.buy";
    /** 读取彩虹圣殿的本服神位、排名与独立阵容。 */
    public static readonly RAINBOW_STATE = "rainbow.state";
    /** 按独立阵容版本保存站位。 */
    public static readonly RAINBOW_LINEUP_SAVE = "rainbow.lineup.save";
    /** 挑战指定神位与进化次数，重试按原请求号取回。 */
    public static readonly RAINBOW_CHALLENGE = "rainbow.challenge";
    /** 读取本服指定神位最近的胜利记录。 */
    public static readonly RAINBOW_HISTORY = "rainbow.history";
    /** 读取神位公开记录中的对应战报。 */
    public static readonly RAINBOW_REPLAY = "rainbow.replay";
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
    /** 读取当前赛季本服积分榜与自己的名次。 */
    public static readonly ARENA_RANKING = "arena.ranking";
    /** 读取挑战截止时间、宝箱进度和两类奖励。 */
    public static readonly ARENA_SEASON = "arena.season";
    /** 领取达到挑战场次的赛季宝箱。 */
    public static readonly ARENA_CHEST_CLAIM = "arena.chest.claim";
    /** 给当前榜单上的其他角色点赞。 */
    public static readonly ARENA_LIKE = "arena.like";
    /** 读取自己的专用防守阵容及版本。 */
    public static readonly ARENA_DEFENSE = "arena.defense";
    /** 保存通过名册和槽位校验的防守阵容。 */
    public static readonly ARENA_DEFENSE_SAVE = "arena.defense.save";
    /** 读取每周自然日刷新的竞技商店。 */
    public static readonly ARENA_SHOP = "arena.shop";
    /** 以竞技积分币兑换商店商品。 */
    public static readonly ARENA_SHOP_BUY = "arena.shop.buy";
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
    | typeof Protocol.MARKET_LIST | typeof Protocol.BLACK_MARKET_LIST | typeof Protocol.SMITH_PREVIEW
    | DailyDungeonRoutes["list"]
    | typeof Protocol.TOWER_STATE | typeof Protocol.DREAMLAND_STATE | typeof Protocol.ARENA_STATE | typeof Protocol.ARENA_REPLAY
    | typeof Protocol.DREAMLAND_ASSISTANCE | typeof Protocol.DREAMLAND_RANKING | typeof Protocol.DREAMLAND_FORMATION_POWER
    | typeof Protocol.TRIAL_STATE | typeof Protocol.TRIAL_ASSISTANCE | typeof Protocol.TRIAL_SHOP
    | typeof Protocol.RAINBOW_STATE | typeof Protocol.RAINBOW_HISTORY | typeof Protocol.RAINBOW_REPLAY
    | typeof Protocol.ARENA_RANKING | typeof Protocol.ARENA_SEASON | typeof Protocol.ARENA_DEFENSE
    | typeof Protocol.ARENA_SHOP
    | typeof Protocol.GUILD_LIST | typeof Protocol.GUILD_SHOP_LIST | typeof Protocol.GUILD_DONATION_INFO
    | typeof Protocol.GUILD_TECHNOLOGY_INFO
    | typeof Protocol.GUILD_RANKING | typeof Protocol.CHAPTER_QUICK_BATTLE_INFO | typeof Protocol.FORMATION_POWER
    | typeof Protocol.QUEST_LIST | typeof Protocol.RANKING_OVERVIEW | typeof Protocol.RANKING_LIST
    | typeof Protocol.MAIL_LIST | typeof Protocol.FRIEND_STATE | typeof Protocol.FRIEND_SEARCH
    | typeof Protocol.CHAT_HISTORY | typeof Protocol.CHAT_OVERVIEW;
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
    | typeof Protocol.BLACK_MARKET_BUY | typeof Protocol.SMITH_FORGE | typeof Protocol.SMITH_FORGE_ALL
    | typeof Protocol.CHAPTER_FIRST_REWARD_CLAIM | typeof Protocol.CHAPTER_FIRST_REWARD_STATUS
    | typeof Protocol.ROLE_WELCOME_CLAIM | DailyDungeonRoutes["challenge"] | typeof Protocol.GUILD_CHANGE
    | typeof Protocol.GUILD_SHOP_BUY | typeof Protocol.GUILD_DONATION_DONATE | typeof Protocol.GUILD_DONATION_CLAIM
    | typeof Protocol.GUILD_TECHNOLOGY_UPGRADE | typeof Protocol.GUILD_TECHNOLOGY_RESET
    | typeof Protocol.VIP_CLAIM | typeof Protocol.QUEST_CLAIM | typeof Protocol.RANKING_LIKE
    | typeof Protocol.CHAPTER_QUICK_BATTLE_CLAIM | typeof Protocol.MAIL_CHANGE | typeof Protocol.FRIEND_CHANGE
    | typeof Protocol.TOWER_CHALLENGE | typeof Protocol.TOWER_SWEEP | typeof Protocol.DREAMLAND_ACT
    | typeof Protocol.TRIAL_ACT | typeof Protocol.TRIAL_SHOP_BUY
    | typeof Protocol.RAINBOW_LINEUP_SAVE | typeof Protocol.RAINBOW_CHALLENGE
    | typeof Protocol.TOWER_MILESTONE_CLAIM | typeof Protocol.ARENA_CHALLENGE | typeof Protocol.ARENA_TICKET_BUY
    | typeof Protocol.ARENA_CHEST_CLAIM | typeof Protocol.ARENA_LIKE | typeof Protocol.ARENA_DEFENSE_SAVE
    | typeof Protocol.ARENA_SHOP_BUY | typeof Protocol.CHAT_SEND | typeof Protocol.CHAT_READ;

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

/** 梦境挑战的持久行为与客户端等待阶段。 */
export type DreamlandAction = "START" | "SELECT_BUFF" | "NEXT" | "END" | "CLAIM" | "SAVE_FORMATION"
    | "DISPATCH_ASSIST" | "SELECT_ASSIST" | "CLEAR_ASSIST";
export type DreamlandPhase = "READY" | "SELECT_BUFF" | "NEXT_BATTLE" | "RESULT";

/** 彩虹圣殿独立进攻阵容，版本和英雄实例由服务器确认。 */
export interface RainbowLineup {
    readonly version: number;
    readonly formationId: number;
    readonly slots: readonly { position: number; heroId: string }[];
}

/** 神位当前守军预览、占位资料及属性万分数。 */
export interface RainbowSeat {
    readonly id: number;
    readonly type: number;
    readonly evolution: number;
    readonly requiredRank: number;
    readonly owner?: {
        readonly roleId: string;
        readonly name: string;
        readonly level: number;
        readonly headId: number;
        readonly borderId: number;
        readonly imageId: number;
    };
    readonly occupiedUntil?: number;
    readonly heroTypeId: number;
    readonly heroStar: number;
    readonly activeSkills: readonly { id: number; level: number }[];
    readonly passiveSkills: readonly { id: number; level: number }[];
    readonly attackBonus: number;
    readonly healthBonus: number;
}

/** 彩虹圣殿的本服状态，冷却和占位截止均为 Unix 毫秒。 */
export interface RainbowState {
    readonly seats: readonly RainbowSeat[];
    readonly arenaRank: number;
    readonly cooldownUntil: number;
    readonly lineup: RainbowLineup;
    readonly serverTime: number;
}

/** 进化次数只允许 1、5、10，开战前校验玩家已确认阵容版本。 */
export interface RainbowChallengeRequest {
    readonly requestId: string;
    readonly seatId: number;
    readonly evolution: number;
    readonly expectedLineupVersion: number;
}

/** 原挑战回执附带当前神位快照及同一份战报。 */
export interface RainbowSettlement {
    readonly requestId: string;
    readonly state: RainbowState;
    readonly battleId: string;
    readonly replay: object;
    readonly won: boolean;
    readonly seatId: number;
    readonly evolution: number;
}

/** 冻结胜场结算时的阵容与战力，客户端按战斗编号请求回放。 */
export interface RainbowHistoryEntry {
    readonly battleId: string;
    readonly name: string;
    readonly evolution: number;
    readonly foughtAt: number;
    readonly power: number;
    readonly heroes: readonly { heroTypeId: number; level: number; star: number; iconId: number }[];
}

/** 单神位最近胜利记录。 */
export interface RainbowHistory {
    readonly seatId: number;
    readonly records: readonly RainbowHistoryEntry[];
}

/** 公会科技单格。百分比增量和累计量为万分数，速度为原始整数。 */
export interface GuildTechnologyNode {
    readonly slot: number;
    readonly attributeId: number;
    readonly level: number;
    readonly increment: number;
    readonly total: number;
}

/** 公会科技一个职业当前阶、点亮进度、下一格报价及重置返还。 */
export interface GuildTechnologyBranch {
    readonly profession: number;
    readonly stage: number;
    readonly step: number;
    readonly nodes: readonly GuildTechnologyNode[];
    readonly next?: {
        readonly stage: number;
        readonly slot: number;
        readonly gold: number;
        readonly medals: number;
        readonly blocked: boolean;
    };
    readonly refundGold: number;
    readonly refundMedals: number;
}

/** 个人科技独立版本及四职业快照，权限状态和报价从服务器取得。 */
export interface GuildTechnologyState {
    readonly version: number;
    readonly member: boolean;
    readonly maxStage: number;
    readonly stageGap: number;
    readonly resetDiamonds: number;
    readonly branches: readonly GuildTechnologyBranch[];
}

/** 冻结原回执的版本与资产确认号，附带最新整树。 */
export interface GuildTechnologyReceipt {
    readonly requestId: string;
    readonly action: "upgrade" | "reset";
    readonly profession: number;
    readonly version: number;
    readonly assetRevision: number;
    readonly state: GuildTechnologyState;
}

/** 试炼模块接受的状态变更操作，由服务端校验当前难度、节点与请求版本。 */
export type TrialAction = "selectDifficulty" | "saveFormation" | "fight" | "claim" | "revive"
    | "dispatchAssist" | "selectAssist" | "cancelAssist";

/** 原难度档位、所需战力和难度窗口展示的整轮奖励。 */
export interface TrialDifficulty {
    readonly id: number;
    readonly minimumPower: number;
    readonly rewards: readonly DreamlandRewardAmount[];
    readonly combatReady: boolean;
}

/** 守方一个真实站位的头像数据与可恢复生命。 */
export interface TrialOpponentHero {
    readonly position: number;
    readonly templateId: number;
    readonly level: number;
    readonly star: number;
    readonly element: number;
    readonly hp: number;
    readonly maxHp: number;
}

/** 已冻结守方的身份、战力、阵型和英雄。 */
export interface TrialOpponent {
    readonly name: string;
    readonly power: number;
    readonly level: number;
    readonly avatarId: number;
    readonly formationId: number;
    readonly heroes: readonly TrialOpponentHero[];
}

/** 原地图节点、服务端可用状态及预览奖励。 */
export interface TrialNode {
    readonly node: number;
    readonly type: "battle" | "chest";
    readonly status: "locked" | "available" | "cleared" | "blocked";
    readonly displayLevel: number;
    readonly rewards: readonly DreamlandRewardAmount[];
    readonly opponent?: TrialOpponent;
}

/** 当日已参战英雄的持久生命值。 */
export interface TrialHeroHealth {
    readonly heroId: string;
    readonly hp: number;
    readonly maxHp: number;
}

/** 服务端冻结的最近一次挑战和原二进制战报数据。 */
export interface TrialBattle {
    readonly battleId: string;
    readonly node: number;
    readonly won: boolean;
    readonly replay: Readonly<Record<string, unknown>>;
}

/** 权威试炼快照。difficulty 为 0 时等待当天选择；resetAtSeconds 是上海次日零点。 */
export interface TrialState {
    readonly version: number;
    readonly minimumLevel: number;
    readonly resetAtSeconds: number;
    readonly difficulty: number;
    readonly maxDifficulty: number;
    readonly completedDifficulty: number;
    readonly currentNode: number;
    readonly reviveUsed: number;
    readonly reviveLimit: number;
    readonly reviveCost?: DreamlandRewardAmount;
    readonly formationId: number;
    readonly slots: readonly DreamlandSlot[];
    readonly nodes: readonly TrialNode[];
    readonly heroHealth: readonly TrialHeroHealth[];
    readonly todayRewards: readonly DreamlandRewardAmount[];
    readonly battle?: TrialBattle;
    readonly difficulties: readonly TrialDifficulty[];
}

/** 指令携带服务端版本及本次操作需要的选择，标识始终作为字符串传输。 */
export interface TrialCommand {
    readonly requestId: string;
    readonly expectedVersion: number;
    readonly action: TrialAction;
    readonly choice?: number;
    readonly formationId?: number;
    readonly slots?: readonly DreamlandSlot[];
    readonly targetId?: string;
    readonly heroIds?: readonly string[];
}

/** 已提交的原请求、角色资产版本和可安全重放的试炼状态。 */
export interface TrialSettlement {
    readonly requestId: string;
    readonly roleId: string;
    readonly assetRevision: number;
    readonly action: TrialAction;
    readonly state: TrialState;
    readonly actual?: unknown;
}

/** 试炼支援英雄的冻结属性摘要与当天已出战状态。 */
export interface TrialAssistHero {
    readonly roleId: string;
    readonly roleName: string;
    readonly heroId: string;
    readonly templateId: number;
    readonly level: number;
    readonly star: number;
    readonly power: number;
    readonly used: boolean;
}

/** 当日派遣上限、允许借用战力及三个列表。 */
export interface TrialAssistance {
    readonly version: number;
    readonly resetAtSeconds: number;
    readonly dispatched: readonly TrialAssistHero[];
    readonly selected: readonly TrialAssistHero[];
    readonly available: readonly TrialAssistHero[];
    readonly dispatchLimit: number;
    readonly maxAssistPower: number;
}

/** 原货位、单份价格和本周已购数量。 */
export interface TrialShopOffer {
    readonly id: number;
    readonly reward: DreamlandRewardAmount;
    readonly price: number;
    readonly purchaseLimit: number;
    readonly purchased: number;
}

/** 当周试炼之血货架及服务端确认的刷新时间。 */
export interface TrialShopState {
    readonly refreshAt: number;
    readonly offers: readonly TrialShopOffer[];
}

/** 客户端确认原货位、自然周期及份数。价格按服务端配置。 */
export interface TrialShopBuy {
    readonly requestId: string;
    readonly offerId: number;
    readonly count: number;
    readonly refreshAt: number;
}

/** 试炼商店成交回执，通用资产版本与实际发放来自同一事务。 */
export interface TrialShopReceipt {
    readonly requestId: string;
    readonly roleId: string;
    readonly assetRevision: number;
    readonly state: TrialShopState;
    readonly actual: unknown;
}

/** 只展示配置与待结算奖品，最终到账使用实际发奖回执。 */
export interface DreamlandRewardAmount {
    readonly itemId: number;
    readonly quantity: number;
}

/** 按位置保存的独立阵容格位。 */
export interface DreamlandSlot {
    readonly position: number;
    readonly heroId: string;
}

/** 一组可选或已生效的增益说明。 */
export interface DreamlandBuffData {
    readonly id: number;
    readonly name: string;
    readonly description: string;
}

/** 由服务器按原首通奖励配置返回一次性领奖资格。 */
export interface DreamlandMilestoneData {
    readonly id: number;
    readonly floor: number;
    readonly claimed: boolean;
    readonly rewards: readonly DreamlandRewardAmount[];
}

/** 可重放的末次战斗，战报的具体内容由统一战斗解析器校验。 */
export interface DreamlandBattleData {
    readonly battleId: string;
    readonly floor: number;
    readonly won: boolean;
    readonly replay: object;
}

/** 单个角色的完整梦境状态；截止与重置字段均为服务器 Unix 秒。 */
export interface DreamlandStateData {
    readonly version: number;
    readonly minimumLevel: number;
    readonly maxFloor: number;
    readonly startFloor: number;
    readonly currentFloor: number;
    readonly highestFloor: number;
    readonly todayHighestFloor: number;
    readonly todayRewardFloor: number;
    readonly challengeCount: number;
    readonly phase: DreamlandPhase;
    readonly deadlineSeconds: number;
    readonly resetAtSeconds: number;
    readonly activeBuffId: number;
    readonly buffs: readonly DreamlandBuffData[];
    readonly slots: readonly DreamlandSlot[];
    readonly formationId: number;
    readonly pendingRewards: readonly DreamlandRewardAmount[];
    readonly milestones: readonly DreamlandMilestoneData[];
    readonly battle?: DreamlandBattleData;
    readonly assistance?: DreamlandAssistHeroData;
}

/** 查询仅使用连接上当前角色，客户端不提交进度或标识。 */
export type DreamlandStateRequest = Record<string, never>;

/** 发出一条幂等操作，额外参数只允许出现在对应动作。 */
export interface DreamlandActRequest {
    readonly requestId: string;
    readonly expectedVersion: number;
    readonly action: DreamlandAction;
    readonly choice?: number;
    readonly formationId?: number;
    readonly slots?: readonly DreamlandSlot[];
    readonly targetId?: string;
}

/** 写操作的原始回执，角色与资产版本交给认证通道和奖励展示校验。 */
export interface DreamlandActData {
    readonly requestId: string;
    readonly roleId: string;
    readonly assetRevision: number;
    readonly action: DreamlandAction;
    readonly state: DreamlandStateData;
    readonly actual?: unknown;
}

/** 只读预估基于可保存的独立站位和本次玩家看到的梦境版本。 */
export interface DreamlandFormationPowerRequest {
    readonly requestId: string;
    readonly expectedVersion: number;
    readonly formationId: number;
    readonly slots: readonly DreamlandSlot[];
}

/** 回显请求号及同次服务器版本，只用于当前草稿展示。 */
export interface DreamlandFormationPowerData {
    readonly requestId: string;
    readonly version: number;
    readonly power: number;
}

/** 派遣当时的英雄镜像；不会成为借用角色的背包或英雄资产。 */
export interface DreamlandAssistHeroData {
    readonly roleId: string;
    readonly roleName: string;
    readonly heroId: string;
    readonly templateId: number;
    readonly level: number;
    readonly star: number;
    readonly power: number;
}

/** 同一自然日的派遣和借用状态；每天按服务器零点更新。 */
export interface DreamlandAssistanceData {
    readonly version: number;
    readonly resetAtSeconds: number;
    readonly canSelect: boolean;
    readonly maxAssistPower: number;
    readonly dispatched?: DreamlandAssistHeroData;
    readonly selected?: DreamlandAssistHeroData;
    readonly available: readonly DreamlandAssistHeroData[];
    readonly dispatchRewards: readonly DreamlandRewardAmount[];
}

/** 服务端排序后的行，零名次表示未上榜，零到达时间表示旧记录没有时间。 */
export interface DreamlandRankEntryData {
    readonly roleId: string;
    readonly name: string;
    readonly level: number;
    readonly headId: number;
    readonly headBorderId: number;
    readonly power: number;
    readonly floor: number;
    readonly rank: number;
    readonly achievedAtSeconds: number;
}

/** 当前区服排行榜以及下一次结算的奖励区间。 */
export interface DreamlandRankingData {
    readonly entries: readonly DreamlandRankEntryData[];
    readonly own: DreamlandRankEntryData;
    readonly rewardTiers: readonly Readonly<{
        minRank: number;
        maxRank: number;
        rewards: readonly DreamlandRewardAmount[];
    }>[];
    readonly resetAtSeconds: number;
}

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
    { name: Protocol.BLACK_MARKET_LIST, module: "黑市", description: "查询页签货架、已购数量和自动刷新时间" },
    { name: Protocol.BLACK_MARKET_BUY, module: "黑市", description: "购买指定页签和货架的商品" },
    { name: Protocol.SMITH_PREVIEW, module: "铁匠铺", description: "预演一个部位的金币消耗和净产物" },
    { name: Protocol.SMITH_FORGE, module: "铁匠铺", description: "合成指定普通装备" },
    { name: Protocol.SMITH_FORGE_ALL, module: "铁匠铺", description: "确认同一资产版本的一键合成" },
    { name: Protocol.GUILD_LIST, module: "公会", description: "查询本区公会和成员状态" },
    { name: Protocol.GUILD_CHANGE, module: "公会", description: "创建、申请、审批或退出公会" },
    { name: Protocol.GUILD_UPDATED, module: "公会", description: "公会状态已提交更新" },
    { name: Protocol.GUILD_SHOP_LIST, module: "公会", description: "读取公会商店周报价" },
    { name: Protocol.GUILD_SHOP_BUY, module: "公会", description: "兑换公会商店物品" },
    { name: Protocol.GUILD_DONATION_INFO, module: "公会", description: "读取捐献档位和宝箱" },
    { name: Protocol.GUILD_DONATION_DONATE, module: "公会", description: "提交每日公会捐献" },
    { name: Protocol.GUILD_DONATION_CLAIM, module: "公会", description: "领取公会捐献宝箱" },
    { name: Protocol.GUILD_RANKING, module: "公会", description: "读取本服公会战力榜" },
    { name: Protocol.GUILD_TECHNOLOGY_INFO, module: "公会", description: "读取个人科技与下一格报价" },
    { name: Protocol.GUILD_TECHNOLOGY_UPGRADE, module: "公会", description: "按原价点亮下一格科技" },
    { name: Protocol.GUILD_TECHNOLOGY_RESET, module: "公会", description: "重置一项职业并退回累计材料" },
    { name: Protocol.QUEST_LIST, module: "任务", description: "读取每日任务和成就" },
    { name: Protocol.QUEST_CLAIM, module: "任务", description: "领取任务、成就或活跃奖励" },
    { name: Protocol.QUEST_CHANGED, module: "任务", description: "任务进度更新和新成就" },
    { name: Protocol.RANKING_OVERVIEW, module: "排行", description: "读取本服和跨服榜首" },
    { name: Protocol.RANKING_LIST, module: "排行", description: "读取榜单和自己的名次" },
    { name: Protocol.RANKING_LIKE, module: "排行", description: "点赞榜首并领取金币" },
    { name: Protocol.MAIL_LIST, module: "邮件", description: "读取邮件列表和状态" },
    { name: Protocol.MAIL_CHANGE, module: "邮件", description: "打开、领取或删除邮件" },
    { name: Protocol.MAIL_CHANGED, module: "邮件", description: "邮件箱状态已更新" },
    { name: Protocol.FRIEND_STATE, module: "好友", description: "读取好友、礼物、申请与黑名单" },
    { name: Protocol.FRIEND_SEARCH, module: "好友", description: "搜索并推荐好友" },
    { name: Protocol.FRIEND_CHANGE, module: "好友", description: "处理好友关系和赠领" },
    { name: Protocol.FRIEND_CHANGED, module: "好友", description: "好友状态已更新" },
    { name: Protocol.CHAT_OVERVIEW, module: "聊天", description: "读取频道提醒和最近私聊" },
    { name: Protocol.CHAT_HISTORY, module: "聊天", description: "读取频道或私聊记录" },
    { name: Protocol.CHAT_SEND, module: "聊天", description: "发送频道或私聊消息" },
    { name: Protocol.CHAT_READ, module: "聊天", description: "更新频道或私聊已读位置" },
    { name: Protocol.CHAT_CHANGED, module: "聊天", description: "可访问的聊天状态已更新" },
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
    { name: Protocol.DREAMLAND_STATE, module: "永恒梦境", description: "读取梦境挑战、阵容与可恢复战报" },
    { name: Protocol.DREAMLAND_ACT, module: "永恒梦境", description: "执行梦境挑战、增益、布阵或领取操作" },
    { name: Protocol.DREAMLAND_ASSISTANCE, module: "永恒梦境", description: "读取派遣和可用好友支援" },
    { name: Protocol.DREAMLAND_RANKING, module: "永恒梦境", description: "读取同服排行与奖励档" },
    { name: Protocol.DREAMLAND_FORMATION_POWER, module: "永恒梦境", description: "预估梦境布阵及好友助战的战力" },
    { name: Protocol.TRIAL_STATE, module: "勇者试炼", description: "读取当天难度、挑战和英雄生命" },
    { name: Protocol.TRIAL_ACT, module: "勇者试炼", description: "执行试炼挑战、宝箱、布阵或支援" },
    { name: Protocol.TRIAL_ASSISTANCE, module: "勇者试炼", description: "读取当天派遣和好友支援" },
    { name: Protocol.TRIAL_SHOP, module: "勇者试炼", description: "读取试炼之血兑换货架" },
    { name: Protocol.TRIAL_SHOP_BUY, module: "勇者试炼", description: "兑换试炼商品" },
    { name: Protocol.RAINBOW_STATE, module: "彩虹圣殿", description: "读取本服神位、竞技场资格与独立阵容" },
    { name: Protocol.RAINBOW_LINEUP_SAVE, module: "彩虹圣殿", description: "保存圣殿独立进攻阵容" },
    { name: Protocol.RAINBOW_CHALLENGE, module: "彩虹圣殿", description: "挑战配置守军并结算所选神位" },
    { name: Protocol.RAINBOW_HISTORY, module: "彩虹圣殿", description: "读取神位挑战胜场历史" },
    { name: Protocol.RAINBOW_REPLAY, module: "彩虹圣殿", description: "查看神位历史战报" },
    { name: Protocol.ARENA_STATE, module: "竞技场", description: "读取当前对手、积分、次数与战报列表" },
    { name: Protocol.ARENA_REFRESH, module: "竞技场", description: "刷新当前对手" },
    { name: Protocol.ARENA_CHALLENGE, module: "竞技场", description: "发起挑战并结算积分与奖励" },
    { name: Protocol.ARENA_REPLAY, module: "竞技场", description: "读取冻结战报" },
    { name: Protocol.ARENA_TICKET_BUY, module: "竞技场", description: "购买挑战门票" },
    { name: Protocol.ARENA_RANKING, module: "竞技场", description: "读取当前积分榜及个人名次" },
    { name: Protocol.ARENA_SEASON, module: "竞技场", description: "读取赛季、宝箱和名次奖励" },
    { name: Protocol.ARENA_CHEST_CLAIM, module: "竞技场", description: "领取赛季宝箱" },
    { name: Protocol.ARENA_LIKE, module: "竞技场", description: "给积分榜角色点赞" },
    { name: Protocol.ARENA_DEFENSE, module: "竞技场", description: "读取防守阵容" },
    { name: Protocol.ARENA_DEFENSE_SAVE, module: "竞技场", description: "保存专用防守阵容" },
    { name: Protocol.ARENA_SHOP, module: "竞技场", description: "读取竞技商店周限购目录" },
    { name: Protocol.ARENA_SHOP_BUY, module: "竞技场", description: "兑换竞技商店奖励" },
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
