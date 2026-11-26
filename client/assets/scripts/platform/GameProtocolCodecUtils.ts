/**
 * Protobuf 信封边界：使用生成的静态代码转换二进制与已约定的消息对象。
 * 不保存会话/资产；解码只返回数据，业务合法性与会话时效仍由传输/API/Controller 校验。
 */
import { Protocol } from "./Protocol";
import { CHAT_CHANNEL_IDS } from "../features/chat/data/ChatData";
import { HeroLevelData } from "../features/hero/data/HeroLevelData";
import { mxzg } from "./GameProtocol.generated";
/** 两端共同声明的 WebSocket 子协议；握手阶段拒绝误连旧 JSON 服务。 */
export const GAME_SOCKET_PROTOCOL = "mxzg.protobuf.v2";
/** 单个完整消息的最大字节数，解码前检查，防止无界输入。 */
export const GAME_FRAME_LIMIT = 262144;
/** 内部可读信封；body 保持模块原有 DTO，网络上传输的是明确的 Protobuf 消息。 */
export interface GameFrame {
    /** 当前信封版本，与握手子协议共同约束兼容范围。 */
    version: number;
    /** 消息方向：request / response / event。 */
    kind: string;
    /** 明确的业务消息名；必须与 oneof 载荷对应。 */
    name: string;
    /** 单次网络往返关联标识，不是业务幂等键。 */
    id?: string;
    /** 服务端分配的连接标识，用于拒绝旧连接消息。 */
    connectionId?: string;
    /** 响应是否成功；缺失与 false 不能混淆。 */
    ok?: boolean;
    /** 模块读取的 DTO，由强类型 Protobuf 载荷投影，不是网络 JSON。 */
    body?: unknown;
    /** 失败响应的稳定原因与重试信息，不与成功载荷共存。 */
    error?: unknown;
}
interface GeneratedType {
    /** 生成器字段类型检查，业务范围校验由手写入口补充。 */
    verify(value: object): string | null;
    /** 将已校验的消息编码为有效字节段。 */
    encode(value: object): {
        finish(): Uint8Array;
    };
    /** 解析字节并检查 proto2 必填字段。 */
    decode(value: Uint8Array): unknown;
    /** 转换为 DTO 投影所需的普通对象。 */
    toObject(value: unknown, options: object): Record<string, unknown>;
}
/** 唯一生成代码调用口，避免在业务模块散落生成器类型转换。 */
const Frame = (mxzg as unknown as {
    game: {
        Frame: GeneratedType;
    };
}).game.Frame;
/** oneof 的所有有效载荷字段，用于检查消息名与载荷类型必须对应。 */
const payloads = [
    "authenticate", "accepted", "snapshot", "inventory", "heartbeat", "kicked", "empty", "login", "servers",
    "gmGrant", "gmResult", "gmStatus", "gmSetRoleLevel", "gmSetChapter", "gmSetTime", "gmTime",
    "formationSave", "formationSaved", "formationPowerRequest", "formationPower", "battlePreview", "battlePreviewed",
    "chapterChallenge", "chapterBattleId", "chapterReceipt", "chapterReplay", "idleEncounter",
    "chapterIdleClaim", "chapterIdleClaimStatusRequest", "chapterIdleClaimReceipt", "chapterIdleClaimStatus",
    "rewardNotice",
    "chapterMilestoneClaim", "chapterMilestoneReceipt", "chapterMilestoneStatus",
    "heroFirstSummonRequest", "heroFirstSummonReceipt", "heroFirstSummonStatus",
    "chapterFirstRewardRequest", "chapterFirstRewardReceipt", "chapterFirstRewardStatus",
    "heroFragmentCombineRequest", "heroFragmentCombineStatusRequest", "heroFragmentCombineReceipt", "heroFragmentCombineStatus",
    "heroLevelUpgradeRequest", "heroLevelUpgradeStatusRequest", "heroLevelUpgradeReceipt", "heroLevelUpgradeStatus",
    "heroStageAdvanceRequest", "heroStageAdvanceStatusRequest", "heroStageAdvanceReceipt", "heroStageAdvanceStatus",
    "heroLockSetRequest", "heroLockSetReceipt",
    "heroStarUpgradeRequest", "heroStarUpgradeReceipt",
    "heroJewelChangeRequest", "heroJewelChangeReceipt",
    "heroGodEquipmentChangeRequest", "heroGodEquipmentChangeReceipt",
    "heroGodEquipmentDrawRequest", "heroGodEquipmentDrawReceipt",
    "heroArtifactChangeRequest", "heroArtifactChangeReceipt", "godEquipmentShopBuyRequest", "godEquipmentShopBuyReceipt",
    "roleName", "roleImageChange", "roleRename", "roleTitles", "roleImages", "heroSummonRequest", "heroSummonReceipt",
    "roleDecorations", "roleDecorationId", "rolePeerageDisplay",
    "heroEquipmentChangeRequest", "heroEquipmentChangeReceipt",
    "marketState", "marketBuyRequest", "marketRefreshRequest", "marketReceipt",
    "blackMarketListRequest", "blackMarketState", "blackMarketBuyRequest", "blackMarketReceipt",
    "smithPreviewRequest", "smithForgeRequest", "smithForgeAllRequest", "smithPreview", "smithReceipt",
    "dailyDungeonState", "dailyDungeonChallengeRequest", "dailyDungeonReceipt",
    "towerState", "towerFormationSave", "towerRequest", "towerSettlement",
    "dreamlandState", "dreamlandCommand", "dreamlandSettlement", "dreamlandAssistance", "dreamlandRanking",
    "dreamlandFormationPowerRequest", "dreamlandFormationPower",
    "trialState", "trialCommand", "trialSettlement", "trialAssistance", "trialShopState", "trialShopBuy", "trialShopReceipt",
    "rainbowState", "rainbowChallengeRequest", "rainbowChallengeResponse", "rainbowHistoryRequest",
    "rainbowHistory", "rainbowReplayRequest", "rainbowLineupSaved",
    "arenaState", "arenaChallengeRequest", "arenaReplayRequest", "arenaReplay", "arenaSettlement",
    "arenaTicketBuyRequest", "arenaTicketPurchase",
    "arenaRanking", "arenaSeason", "arenaChestRequest", "arenaChestReceipt", "arenaLikeRequest", "arenaLikeReceipt",
    "arenaDefense", "arenaDefenseSave", "arenaDefenseSaved", "arenaShopState", "arenaShopBuy", "arenaShopReceipt",
    "guildListRequest", "guildChangeRequest", "guildState", "vipClaimRequest", "vipClaimReceipt",
    "guildShopBuyRequest", "guildShopState", "guildDonationRequest", "guildDonationState", "guildRankingState",
    "guildTechnologyState", "guildTechnologyCommand", "guildTechnologyReceipt",
    "questClaimRequest", "questSnapshot", "questClaimReceipt", "questChanged",
    "rankingListRequest", "rankingLikeRequest", "rankingOverview", "rankingDetail", "rankingLikeReceipt",
    "mailCommand", "mailboxState", "mailboxReceipt", "friendSearchRequest", "friendChangeRequest", "friendState",
    "friendSearchResult", "friendChangeResult", "chatHistoryRequest", "chatSendRequest", "chatReadRequest",
    "chatHistory", "chatSendResult", "chatOverview",
    "chapterQuickBattleState", "chapterQuickBattleClaim", "chapterQuickBattleReceipt",
];
/** 无状态协议转换工具；不会持有会话、角色或网络连接。 */
export class GameProtocolCodecUtils {
    /** 仅通过静态方法使用，禁止创建实例。 */
    private constructor() { }

    /** 按方向和名称选择已登记的强类型业务载荷。 */
    private static payloadName(frame: GameFrame): string | null {
        if (frame.kind === "response" && frame.ok === false) {
            return null;
        }
        const request = frame.kind === "request";
        if (request || frame.kind === "response") {
            switch (frame.name) {
                case Protocol.BLACK_MARKET_LIST:
                    return request ? "blackMarketListRequest" : "blackMarketState";
                case Protocol.BLACK_MARKET_BUY:
                    return request ? "blackMarketBuyRequest" : "blackMarketReceipt";
                case Protocol.SMITH_PREVIEW:
                    return request ? "smithPreviewRequest" : "smithPreview";
                case Protocol.SMITH_FORGE:
                    return request ? "smithForgeRequest" : "smithReceipt";
                case Protocol.SMITH_FORGE_ALL:
                    return request ? "smithForgeAllRequest" : "smithReceipt";
                case Protocol.CHAPTER_QUICK_BATTLE_INFO:
                    return request ? "empty" : "chapterQuickBattleState";
                case Protocol.CHAPTER_QUICK_BATTLE_CLAIM:
                    return request ? "chapterQuickBattleClaim" : "chapterQuickBattleReceipt";
                case Protocol.TOWER_STATE:
                    return request ? "empty" : "towerState";
                case Protocol.DREAMLAND_STATE:
                    return request ? "empty" : "dreamlandState";
                case Protocol.DREAMLAND_ACT:
                    return request ? "dreamlandCommand" : "dreamlandSettlement";
                case Protocol.DREAMLAND_ASSISTANCE:
                    return request ? "empty" : "dreamlandAssistance";
                case Protocol.DREAMLAND_RANKING:
                    return request ? "empty" : "dreamlandRanking";
                case Protocol.DREAMLAND_FORMATION_POWER:
                    return request ? "dreamlandFormationPowerRequest" : "dreamlandFormationPower";
                case Protocol.TRIAL_STATE:
                    return request ? "empty" : "trialState";
                case Protocol.TRIAL_ACT:
                    return request ? "trialCommand" : "trialSettlement";
                case Protocol.TRIAL_ASSISTANCE:
                    return request ? "empty" : "trialAssistance";
                case Protocol.TRIAL_SHOP:
                    return request ? "empty" : "trialShopState";
                case Protocol.TRIAL_SHOP_BUY:
                    return request ? "trialShopBuy" : "trialShopReceipt";
                case Protocol.RAINBOW_STATE:
                    return request ? "empty" : "rainbowState";
                case Protocol.RAINBOW_LINEUP_SAVE:
                    return request ? "formationSave" : "rainbowLineupSaved";
                case Protocol.RAINBOW_CHALLENGE:
                    return request ? "rainbowChallengeRequest" : "rainbowChallengeResponse";
                case Protocol.RAINBOW_HISTORY:
                    return request ? "rainbowHistoryRequest" : "rainbowHistory";
                case Protocol.RAINBOW_REPLAY:
                    return request ? "rainbowReplayRequest" : "arenaReplay";
                case Protocol.TOWER_FORMATION_SAVE:
                    return request ? "towerFormationSave" : "towerState";
                case Protocol.TOWER_CHALLENGE:
                case Protocol.TOWER_SWEEP:
                case Protocol.TOWER_MILESTONE_CLAIM:
                    return request ? "towerRequest" : "towerSettlement";
                case Protocol.ARENA_STATE:
                case Protocol.ARENA_REFRESH:
                    return request ? "empty" : "arenaState";
                case Protocol.ARENA_CHALLENGE:
                    return request ? "arenaChallengeRequest" : "arenaSettlement";
                case Protocol.ARENA_REPLAY:
                    return request ? "arenaReplayRequest" : "arenaReplay";
                case Protocol.ARENA_TICKET_BUY:
                    return request ? "arenaTicketBuyRequest" : "arenaTicketPurchase";
                case Protocol.ARENA_RANKING:
                    return request ? "empty" : "arenaRanking";
                case Protocol.ARENA_SEASON:
                    return request ? "empty" : "arenaSeason";
                case Protocol.ARENA_CHEST_CLAIM:
                    return request ? "arenaChestRequest" : "arenaChestReceipt";
                case Protocol.ARENA_LIKE:
                    return request ? "arenaLikeRequest" : "arenaLikeReceipt";
                case Protocol.ARENA_DEFENSE:
                    return request ? "empty" : "arenaDefense";
                case Protocol.ARENA_DEFENSE_SAVE:
                    return request ? "arenaDefenseSave" : "arenaDefenseSaved";
                case Protocol.ARENA_SHOP:
                    return request ? "empty" : "arenaShopState";
                case Protocol.ARENA_SHOP_BUY:
                    return request ? "arenaShopBuy" : "arenaShopReceipt";
            }
        }
        const dungeonRoute = Protocol.dailyDungeonRoute(frame.name);
        if (dungeonRoute) {
            if (frame.kind === "request") {
                return dungeonRoute.operation === "list" ? "empty" : "dailyDungeonChallengeRequest";
            }
            if (frame.kind === "response") {
                return dungeonRoute.operation === "list" ? "dailyDungeonState" : "dailyDungeonReceipt";
            }
            return null;
        }
        if (frame.kind === "request" && frame.name === Protocol.CHAPTER_CHALLENGE) {
            return "chapterChallenge";
        }
        if (frame.kind === "request" && frame.name === Protocol.CHAPTER_IDLE_CLAIM) {
            return "chapterIdleClaim";
        }
        if (frame.kind === "request" && frame.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
            return "chapterIdleClaimStatusRequest";
        }
        if (frame.kind === "request" && (frame.name === Protocol.CHAPTER_MILESTONE_CLAIM
                || frame.name === Protocol.CHAPTER_MILESTONE_STATUS)) {
            return "chapterMilestoneClaim";
        }
        if (frame.kind === "request" && (frame.name === Protocol.HERO_NORMAL_SUMMON
                || frame.name === Protocol.HERO_FIRST_SUMMON || frame.name === Protocol.HERO_FIRST_SUMMON_STATUS)) {
            return "heroFirstSummonRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_SUMMON) {
            return "heroSummonRequest";
        }
        if (frame.kind === "request" && (frame.name === Protocol.CHAPTER_FIRST_REWARD_CLAIM
                || frame.name === Protocol.CHAPTER_FIRST_REWARD_STATUS)) {
            return "chapterFirstRewardRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_FRAGMENT_COMBINE) {
            return "heroFragmentCombineRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_FRAGMENT_COMBINE_STATUS) {
            return "heroFragmentCombineStatusRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_LEVEL_UPGRADE) {
            return "heroLevelUpgradeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_LEVEL_UPGRADE_STATUS) {
            return "heroLevelUpgradeStatusRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_STAGE_ADVANCE) {
            return "heroStageAdvanceRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_STAGE_ADVANCE_STATUS) {
            return "heroStageAdvanceStatusRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_LOCK_SET) {
            return "heroLockSetRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_STAR_UPGRADE) {
            return "heroStarUpgradeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_JEWEL_CHANGE) {
            return "heroJewelChangeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_GOD_EQUIPMENT_CHANGE) {
            return "heroGodEquipmentChangeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_GOD_EQUIPMENT_DRAW) {
            return "heroGodEquipmentDrawRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_ARTIFACT_CHANGE) {
            return "heroArtifactChangeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY) {
            return "godEquipmentShopBuyRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.HERO_EQUIPMENT_CHANGE) {
            return "heroEquipmentChangeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.MARKET_BUY) {
            return "marketBuyRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.MARKET_REFRESH) {
            return "marketRefreshRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.ROLE_NAME_SET) {
            return "roleName";
        }
        if (frame.kind === "request" && frame.name === Protocol.ROLE_IMAGE_CHANGE) {
            return "roleImageChange";
        }
        if (frame.kind === "request" && frame.name === Protocol.ROLE_RENAME) {
            return "roleRename";
        }
        if (frame.kind === "request" && (frame.name === Protocol.CHAPTER_CLAIM || frame.name === Protocol.CHAPTER_REPLAY)) {
            return "chapterBattleId";
        }
        if (frame.kind === "request" && frame.name === Protocol.BATTLE_PREVIEW) {
            return "battlePreview";
        }
        if (frame.kind === "request" && frame.name === Protocol.FORMATION_SAVE) {
            return "formationSave";
        }
        if (frame.kind === "request" && frame.name === Protocol.GM_GRANT) {
            return "gmGrant";
        }
        if (frame.kind === "request") {
            switch (frame.name) {
                case Protocol.FORMATION_POWER: return "formationPowerRequest";
                case Protocol.ROLE_HEAD_CHANGE:
                case Protocol.ROLE_BORDER_CHANGE:
                case Protocol.ROLE_BORDER_ACTIVATE: return "roleDecorationId";
                case Protocol.ROLE_PEERAGE_DISPLAY: return "rolePeerageDisplay";
                case Protocol.GUILD_LIST: return "guildListRequest";
                case Protocol.GUILD_CHANGE: return "guildChangeRequest";
                case Protocol.GUILD_SHOP_BUY: return "guildShopBuyRequest";
                case Protocol.GUILD_DONATION_DONATE:
                case Protocol.GUILD_DONATION_CLAIM: return "guildDonationRequest";
                case Protocol.GUILD_TECHNOLOGY_UPGRADE:
                case Protocol.GUILD_TECHNOLOGY_RESET: return "guildTechnologyCommand";
                case Protocol.QUEST_CLAIM: return "questClaimRequest";
                case Protocol.RANKING_LIST: return "rankingListRequest";
                case Protocol.RANKING_LIKE: return "rankingLikeRequest";
                case Protocol.MAIL_CHANGE: return "mailCommand";
                case Protocol.FRIEND_SEARCH: return "friendSearchRequest";
                case Protocol.FRIEND_CHANGE: return "friendChangeRequest";
                case Protocol.CHAT_HISTORY: return "chatHistoryRequest";
                case Protocol.CHAT_SEND: return "chatSendRequest";
                case Protocol.CHAT_READ: return "chatReadRequest";
                case Protocol.VIP_CLAIM: return "vipClaimRequest";
                case Protocol.GM_LEVEL_SET: return "gmSetRoleLevel";
                case Protocol.GM_CHAPTER_SET: return "gmSetChapter";
                case Protocol.GM_TIME_SET: return "gmSetTime";
                case Protocol.SESSION_AUTHENTICATE: return "authenticate";
                case Protocol.SESSION_LOGIN: return "login";
                default: return "empty";
            }
        }
        if (frame.kind === "event" && frame.name === Protocol.STATE_CHANGED) {
            return "snapshot";
        }
        if (frame.kind === "event" && frame.name === Protocol.REWARD_GRANTED) {
            return "rewardNotice";
        }
        if (frame.kind === "event" && frame.name === Protocol.SESSION_KICKED) {
            return "kicked";
        }
        if (frame.kind === "event" && frame.name === Protocol.GUILD_UPDATED) {
            return "empty";
        }
        if (frame.kind === "event" && (frame.name === Protocol.MAIL_CHANGED
            || frame.name === Protocol.FRIEND_CHANGED || frame.name === Protocol.CHAT_CHANGED)) {
            return "empty";
        }
        if (frame.kind === "event" && frame.name === Protocol.QUEST_CHANGED) {
            return "questChanged";
        }
        if (frame.kind === "response") {
            switch (frame.name) {
                case Protocol.SESSION_LOGIN:
                case Protocol.SESSION_AUTHENTICATE: return "accepted";
                case Protocol.CHAPTER_CHALLENGE:
                case Protocol.CHAPTER_CLAIM: return "chapterReceipt";
                case Protocol.CHAPTER_REPLAY: return "chapterReplay";
                case Protocol.CHAPTER_IDLE_ENCOUNTER: return "idleEncounter";
                case Protocol.CHAPTER_IDLE_CLAIM: return "chapterIdleClaimReceipt";
                case Protocol.CHAPTER_IDLE_CLAIM_STATUS: return "chapterIdleClaimStatus";
                case Protocol.CHAPTER_MILESTONE_CLAIM: return "chapterMilestoneReceipt";
                case Protocol.CHAPTER_MILESTONE_STATUS: return "chapterMilestoneStatus";
                case Protocol.CHAPTER_FIRST_REWARD_CLAIM: return "chapterFirstRewardReceipt";
                case Protocol.CHAPTER_FIRST_REWARD_STATUS: return "chapterFirstRewardStatus";
                case Protocol.BATTLE_PREVIEW: return "battlePreviewed";
                case Protocol.FORMATION_SAVE: return "formationSaved";
                case Protocol.FORMATION_POWER: return "formationPower";
                case Protocol.HERO_SUMMON: return "heroSummonReceipt";
                case Protocol.HERO_NORMAL_SUMMON:
                case Protocol.HERO_FIRST_SUMMON: return "heroFirstSummonReceipt";
                case Protocol.HERO_FIRST_SUMMON_STATUS: return "heroFirstSummonStatus";
                case Protocol.HERO_FRAGMENT_COMBINE: return "heroFragmentCombineReceipt";
                case Protocol.HERO_FRAGMENT_COMBINE_STATUS: return "heroFragmentCombineStatus";
                case Protocol.HERO_LEVEL_UPGRADE: return "heroLevelUpgradeReceipt";
                case Protocol.HERO_LEVEL_UPGRADE_STATUS: return "heroLevelUpgradeStatus";
                case Protocol.HERO_STAGE_ADVANCE: return "heroStageAdvanceReceipt";
                case Protocol.HERO_STAGE_ADVANCE_STATUS: return "heroStageAdvanceStatus";
                case Protocol.HERO_LOCK_SET: return "heroLockSetReceipt";
                case Protocol.HERO_STAR_UPGRADE: return "heroStarUpgradeReceipt";
                case Protocol.HERO_JEWEL_CHANGE: return "heroJewelChangeReceipt";
                case Protocol.HERO_GOD_EQUIPMENT_CHANGE: return "heroGodEquipmentChangeReceipt";
                case Protocol.HERO_GOD_EQUIPMENT_DRAW: return "heroGodEquipmentDrawReceipt";
                case Protocol.HERO_ARTIFACT_CHANGE: return "heroArtifactChangeReceipt";
                case Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY: return "godEquipmentShopBuyReceipt";
                case Protocol.HERO_EQUIPMENT_CHANGE: return "heroEquipmentChangeReceipt";
                case Protocol.MARKET_LIST: return "marketState";
                case Protocol.MARKET_BUY:
                case Protocol.MARKET_REFRESH: return "marketReceipt";
                case Protocol.GUILD_LIST:
                case Protocol.GUILD_CHANGE: return "guildState";
                case Protocol.GUILD_SHOP_LIST:
                case Protocol.GUILD_SHOP_BUY: return "guildShopState";
                case Protocol.GUILD_DONATION_INFO:
                case Protocol.GUILD_DONATION_DONATE:
                case Protocol.GUILD_DONATION_CLAIM: return "guildDonationState";
                case Protocol.QUEST_LIST: return "questSnapshot";
                case Protocol.QUEST_CLAIM: return "questClaimReceipt";
                case Protocol.RANKING_OVERVIEW: return "rankingOverview";
                case Protocol.RANKING_LIST: return "rankingDetail";
                case Protocol.RANKING_LIKE: return "rankingLikeReceipt";
                case Protocol.MAIL_LIST: return "mailboxState";
                case Protocol.MAIL_CHANGE: return "mailboxReceipt";
                case Protocol.FRIEND_STATE: return "friendState";
                case Protocol.FRIEND_SEARCH: return "friendSearchResult";
                case Protocol.FRIEND_CHANGE: return "friendChangeResult";
                case Protocol.CHAT_HISTORY:
                case Protocol.CHAT_READ: return "chatHistory";
                case Protocol.CHAT_SEND: return "chatSendResult";
                case Protocol.CHAT_OVERVIEW: return "chatOverview";
                case Protocol.GUILD_RANKING: return "guildRankingState";
                case Protocol.GUILD_TECHNOLOGY_INFO: return "guildTechnologyState";
                case Protocol.GUILD_TECHNOLOGY_UPGRADE:
                case Protocol.GUILD_TECHNOLOGY_RESET: return "guildTechnologyReceipt";
                case Protocol.VIP_CLAIM: return "vipClaimReceipt";
                case Protocol.ROLE_NAME_RANDOM: return "roleName";
                case Protocol.ROLE_NAME_SET:
                case Protocol.ROLE_RENAME:
                case Protocol.ROLE_IMAGE_CHANGE: return "empty";
                case Protocol.ROLE_TITLES_LIST: return "roleTitles";
                case Protocol.ROLE_IMAGES_LIST: return "roleImages";
                case Protocol.ROLE_DECORATIONS_LIST:
                case Protocol.ROLE_HEAD_CHANGE:
                case Protocol.ROLE_BORDER_CHANGE:
                case Protocol.ROLE_BORDER_ACTIVATE:
                case Protocol.ROLE_PEERAGE_DISPLAY: return "roleDecorations";
                case Protocol.ROLE_WELCOME_CLAIM: return "rewardNotice";
                case Protocol.GM_GRANT: return "gmResult";
                case Protocol.GM_STATUS: return "gmStatus";
                case Protocol.GM_LEVEL_SET: return "gmSetRoleLevel";
                case Protocol.GM_CHAPTER_SET: return "gmSetChapter";
                case Protocol.GM_TIME_GET:
                case Protocol.GM_TIME_SET: return "gmTime";
                case Protocol.SERVERS_LIST: return "servers";
                case Protocol.SESSION_HEARTBEAT: return "heartbeat";
            }
        }
        throw new Error("不支持的消息载荷");
    }

    /** 拒绝超出 JS 安全范围的整数；int64 解码为 number 后也必须通过此检查，不能静默舍入资产。 */
    private static validateIntegers(value: unknown): void {
        if (typeof value === "number" && !Number.isSafeInteger(value)) {
            throw new Error("协议整数超出安全范围");
        }
        if (value && typeof value === "object") {
            for (const item of Object.values(value)) {
                GameProtocolCodecUtils.validateIntegers(item);
            }
        }
    }

    /** 各协议共用的对象边界，拒绝数组、空值或字符串包装的消息。 */
    private static messageObject(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("协议载荷必须是消息对象");
        }
        return value as Record<string, unknown>;
    }

    /** 判断协议约定的小写 UUID，用于请求、回执和英雄实例。 */
    private static isUuid(value: unknown): value is string {
        return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
    }

    /** 挂机领取意图和回执必须具备可查回的业务编号。 */
    private static validateIdleRequestId(value: unknown): void {
        if (!GameProtocolCodecUtils.isUuid(value)) {
            throw new Error("挂机请求标识无效");
        }
    }

    /** 已消费操作版本和已提交资产版本必须为安全正整数。 */
    private static validatePositiveVersion(value: unknown): asserts value is number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
            throw new Error("协议版本必须为安全正整数");
        }
    }

    /** 校验市场请求只含玩家选择，成功回包以服务端货架和角色回执为准。 */
    private static validateMarket(frame: GameFrame): void {
        const list = frame.name === Protocol.MARKET_LIST;
        const buy = frame.name === Protocol.MARKET_BUY;
        if ((!list && !buy && frame.name !== Protocol.MARKET_REFRESH)
                || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        if (frame.kind === "request") {
            const allowed = list ? [] : buy ? ["requestId", "shelfVersion", "productId", "count"] : ["requestId", "shelfVersion"];
            if (Object.keys(body).some(key => !allowed.includes(key))) {
                throw new Error("市场请求字段无效");
            }
            if (list) {
                return;
            }
            if (!GameProtocolCodecUtils.isUuid(body.requestId)
                    || (buy && (!GameProtocolCodecUtils.isIntegerInRange(body.productId, 1, 0x7fffffff)
                        || !GameProtocolCodecUtils.isIntegerInRange(body.count, 1, 0x7fffffff)))) {
                throw new Error("市场请求参数无效");
            }
            GameProtocolCodecUtils.validatePositiveVersion(body.shelfVersion);
            return;
        }
        if (!list) {
            if (!GameProtocolCodecUtils.isUuid(body.requestId) || !GameProtocolCodecUtils.isUuid(body.roleId)) {
                throw new Error("市场回执标识无效");
            }
            if (!GameProtocolCodecUtils.isIntegerInRange(body.assetRevision, buy ? 1 : 0)) {
                throw new Error("市场回执资产版本无效");
            }
        }
        GameProtocolCodecUtils.validateMarketState(list ? body : body.state);
    }

    /** 黑市只接受页签与当前报价，成功回执必须包含真实角色和资产版本。 */
    private static validateBlackMarket(frame: GameFrame): void {
        const list = frame.name === Protocol.BLACK_MARKET_LIST;
        if ((!list && frame.name !== Protocol.BLACK_MARKET_BUY) || frame.ok === false) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (frame.kind === "request") {
            const allowed = list ? ["shopType"] : ["requestId", "shopType", "shelfVersion", "productId", "count"];
            if (Object.keys(body).some(key => !allowed.includes(key)) || !integer(body.shopType, 1, 0x7fffffff)) {
                throw new Error("黑市请求页签或字段无效");
            }
            if (!list && (!GameProtocolCodecUtils.isUuid(body.requestId) || !integer(body.shelfVersion, 1)
                    || !integer(body.productId, 1, 0x7fffffff) || !integer(body.count, 1, 0x7fffffff))) {
                throw new Error("黑市购买请求参数无效");
            }
            return;
        }
        if (frame.kind !== "response") {
            throw new Error("黑市消息方向无效");
        }
        if (!list && (!GameProtocolCodecUtils.isUuid(body.requestId) || !GameProtocolCodecUtils.isUuid(body.roleId)
                || !integer(body.assetRevision, 1))) {
            throw new Error("黑市购买回执标识或资产版本无效");
        }
        GameProtocolCodecUtils.validateBlackMarketState(list ? body : body.state, !list);
    }

    /** 校验装备合成的配方指令、单部位预演及实际结算内容。 */
    private static validateSmith(frame: GameFrame): void {
        const preview = frame.name === Protocol.SMITH_PREVIEW;
        const single = frame.name === Protocol.SMITH_FORGE;
        const all = frame.name === Protocol.SMITH_FORGE_ALL;
        if ((!preview && !single && !all) || frame.ok === false) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (frame.kind === "request") {
            const keys = preview ? ["slot"] : single ? ["requestId", "itemId", "count"]
                : ["requestId", "slot", "expectedRevision"];
            if (Object.keys(body).some(key => !keys.includes(key))
                    || (!single && !integer(body.slot, 1, 4))
                    || (!preview && !GameProtocolCodecUtils.isUuid(body.requestId))
                    || (single && (!integer(body.itemId, 1, 0x7fffffff) || !integer(body.count, 1, 0x7fffffff)))
                    || (all && !integer(body.expectedRevision, 0))) {
                throw new Error("装备合成指令无效");
            }
            return;
        }
        if (frame.kind !== "response" || !integer(body.slot, 1, 4)
                || !integer(body.assetRevision, preview ? 0 : 1) || !integer(body.goldCost, preview ? 0 : 1)
                || !Array.isArray(body.rewards) || (!preview && body.rewards.length === 0)) {
            throw new Error("装备合成结果无效");
        }
        const itemIds = new Set<number>();
        for (const value of body.rewards) {
            const item = GameProtocolCodecUtils.messageObject(value);
            if (!integer(item.itemId, 1, 0x7fffffff) || !integer(item.quantity, 1)
                    || itemIds.has(Number(item.itemId))) {
                throw new Error("装备合成产物无效");
            }
            itemIds.add(Number(item.itemId));
        }
        if (preview) {
            if ((body.goldCost === 0) !== (body.rewards.length === 0)) {
                throw new Error("装备合成预演消耗与产物不一致");
            }
            return;
        }
        const first = GameProtocolCodecUtils.messageObject(body.rewards[0]);
        if (!GameProtocolCodecUtils.isUuid(body.requestId) || !GameProtocolCodecUtils.isUuid(body.roleId)
                || (all && (body.itemId !== 0 || body.count !== 0))
                || (single && (!integer(body.itemId, 1) || !integer(body.count, 1)
                    || body.rewards.length !== 1 || first.itemId !== body.itemId || first.quantity !== body.count))) {
            throw new Error("装备合成回执与指令不符");
        }
    }

    /** 校验当前货架属于唯一的可见页签，未开放页签不得发放可买商品。 */
    private static validateBlackMarketState(value: unknown, isReceipt: boolean): void {
        const state = GameProtocolCodecUtils.messageObject(value);
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (!integer(state.shopType, 1) || !integer(state.shelfVersion, 1) || !integer(state.nextRefreshAt, 0)
                || !integer(state.currencyItemId, 1) || !Array.isArray(state.tabs) || !Array.isArray(state.offers)) {
            throw new Error("黑市货架状态无效");
        }
        const shopTypes = new Set<number>();
        let currentAvailable: boolean | undefined;
        for (const value of state.tabs) {
            const tab = GameProtocolCodecUtils.messageObject(value);
            if (!integer(tab.shopType, 1) || shopTypes.has(tab.shopType) || !integer(tab.minimumLevel, 1)
                    || typeof tab.available !== "boolean" || typeof tab.name !== "string" || !tab.name.trim()) {
                throw new Error("黑市页签状态无效");
            }
            shopTypes.add(tab.shopType);
            if (tab.shopType === state.shopType) {
                currentAvailable = tab.available;
            }
        }
        if (currentAvailable === undefined || (!currentAvailable
                && (isReceipt || state.offers.some(row => GameProtocolCodecUtils.messageObject(row).purchasable)))) {
            throw new Error("黑市货架与页签不一致");
        }
        GameProtocolCodecUtils.validateMarketOffers(state.offers, true);
    }

    /** 校验服务器货架的版本、刷新额度和商品数量；合法商品 ID 在货架内唯一。 */
    private static validateMarketState(value: unknown): void {
        const state = GameProtocolCodecUtils.messageObject(value);
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        GameProtocolCodecUtils.validatePositiveVersion(state.shelfVersion);
        if (!integer(state.freeRefreshLimit, 1) || !integer(state.paidRefreshLimit, 0)
                || !integer(state.freeRefreshes, 0, state.freeRefreshLimit)
                || !integer(state.paidRefreshes, 0, state.paidRefreshLimit)
                || !integer(state.nextFreeRefreshAt, 0) || !integer(state.nextPaidResetAt, 1)
                || (state.freeRefreshes === state.freeRefreshLimit) !== (state.nextFreeRefreshAt === 0)
                || !integer(state.refreshCostItemId, 1) || !integer(state.refreshCostQuantity, 0)
                || !Array.isArray(state.offers) || state.offers.length === 0) {
            throw new Error("市场货架状态无效");
        }
        GameProtocolCodecUtils.validateMarketOffers(state.offers, false);
    }

    /** 校验两类货架共用的商品结构；仅黑市可以返回原策划不限购项。 */
    private static validateMarketOffers(offers: readonly unknown[], allowUnlimited: boolean): void {
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        const products = new Set<number>();
        for (const row of offers) {
            const offer = GameProtocolCodecUtils.messageObject(row);
            if (!integer(offer.productId, 1) || products.has(offer.productId)
                    || !integer(offer.itemId, 1) || !integer(offer.quantity, 1)
                    || !integer(offer.costItemId, 1) || !integer(offer.costQuantity, 1)
                    || !integer(offer.purchaseLimit, allowUnlimited ? 0 : 1)
                    || !integer(offer.purchased, 0, offer.purchaseLimit || 0xffffffff)
                    || !integer(offer.discount, 1, 100) || typeof offer.purchasable !== "boolean") {
                throw new Error("市场商品状态无效");
            }
            products.add(offer.productId);
        }
    }

    /** 判断协议数量、编号或时间是否为指定范围内的安全整数。 */
    private static isIntegerInRange(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): value is number {
        return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
    }

    /** 校验日常副本关卡与报价，确认成功回包、战报类型和发奖归属于同一结算。 */
    private static validateDailyDungeon(frame: GameFrame): void {
        const route = Protocol.dailyDungeonRoute(frame.name);
        if (!route || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        const list = route.operation === "list";
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (frame.kind === "request") {
            const fields = list ? [] : ["requestId", "stageId", "sweep", "maxDiamonds"];
            if (Object.keys(body).some(key => !fields.includes(key))
                    || (!list && (!GameProtocolCodecUtils.isUuid(body.requestId)
                        || typeof body.sweep !== "boolean" || !integer(body.maxDiamonds, 0)
                        || (body.stageId !== undefined && !integer(body.stageId, 1, 0x7fffffff))))) {
                throw new Error("副本请求字段无效");
            }
            return;
        }
        const state = list ? body : GameProtocolCodecUtils.messageObject(body.state);
        GameProtocolCodecUtils.validateDailyDungeonState(state);
        if (list) {
            return;
        }
        if (!GameProtocolCodecUtils.isUuid(body.requestId) || !GameProtocolCodecUtils.isUuid(body.battleId)
                || !GameProtocolCodecUtils.isUuid(body.roleId) || typeof body.sweep !== "boolean"
                || typeof body.won !== "boolean" || !integer(body.assetRevision, body.won ? 1 : 0)
                || (body.won !== (body.actual !== undefined)) || (body.sweep === (body.replay !== undefined))
                || (body.sweep && !body.won)) {
            throw new Error("副本结算回执无效");
        }
        if (body.replay !== undefined) {
            const replay = GameProtocolCodecUtils.messageObject(body.replay);
            const expectedScene = `dungeon:${route.kind}:${state.stageId}`;
            if (replay.schemaVersion !== 1 || replay.scenario !== expectedScene
                    || replay.outcome !== (body.won ? "ATTACKER_WIN" : "DEFENDER_WIN")) {
                throw new Error("副本战报与结算胜负不一致");
            }
        }
        if (body.actual !== undefined) {
            const actual = GameProtocolCodecUtils.messageObject(body.actual);
            if (actual.roleId !== body.roleId || !Array.isArray(actual.items) || actual.items.length === 0
                    || !Array.isArray(actual.heroes)) {
                throw new Error("副本发奖与原回执不一致");
            }
            GameProtocolCodecUtils.validateHeroGrants(actual.heroes, actual.items);
        }
    }

    /** 检查共享次数和当前关卡，并确认关卡列表按原进度顺序下发。历史首关回执可没有列表。 */
    private static validateDailyDungeonState(state: Record<string, unknown>): void {
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (!integer(state.stageId, 1, 0xffffffff) || !integer(state.titleLanguageId, 1, 0xffffffff)
                || !integer(state.freeLimit, 1, 0xffffffff) || !integer(state.totalLimit, state.freeLimit, 0xffffffff)
                || !integer(state.wins, 0, state.totalLimit) || !integer(state.nextCostDiamonds, 0)
                || !integer(state.resetAtSeconds, 1) || !integer(state.power, 0) || !integer(state.requiredPower, 0)
                || typeof state.cleared !== "boolean" || typeof state.unlocked !== "boolean"
                || typeof state.canChallenge !== "boolean" || (state.canChallenge && (!state.unlocked || state.wins >= state.totalLimit
                    || state.power <= state.requiredPower))) {
            throw new Error("副本次数、准入或预览状态无效");
        }
        const expected = GameProtocolCodecUtils.validateDailyDungeonRewards(state.rewardPreview);
        const stages = state.stages ?? [];
        if (!Array.isArray(stages)) {
            throw new Error("日常副本关卡列表无效");
        }
        if (!stages.length) {
            if (state.stageId !== 1) {
                throw new Error("日常副本关卡列表缺失");
            }
            return;
        }
        if (state.stageId > stages.length) {
            throw new Error("日常副本当前关卡不在列表中");
        }
        let previousCleared = true;
        for (const [index, value] of stages.entries()) {
            const stage = GameProtocolCodecUtils.messageObject(value);
            const power = stage.requiredPower;
            if (stage.stageId !== index + 1 || !integer(stage.titleLanguageId, 1, 0xffffffff)
                    || !integer(stage.minimumLevel, 1, 0xffffffff) || !integer(stage.ribbon, 1, 0xffffffff)
                    || !integer(power, 0) || typeof stage.cleared !== "boolean" || typeof stage.unlocked !== "boolean"
                    || typeof stage.canChallenge !== "boolean" || (!previousCleared && (stage.cleared || stage.unlocked))
                    || (stage.canChallenge && (!stage.unlocked || state.wins >= state.totalLimit || state.power <= power))) {
                throw new Error("日常副本关卡资格无效");
            }
            previousCleared = stage.cleared;
            const rewards = GameProtocolCodecUtils.validateDailyDungeonRewards(stage.rewardPreview);
            if (stage.stageId === state.stageId && (stage.titleLanguageId !== state.titleLanguageId || power !== state.requiredPower
                    || stage.cleared !== state.cleared || stage.unlocked !== state.unlocked || stage.canChallenge !== state.canChallenge
                    || rewards.length !== expected.length || rewards.some((reward, position) => reward[0] !== expected[position][0]
                        || reward[1] !== expected[position][1]))) {
                throw new Error("日常副本选定关卡与列表不一致");
            }
        }
    }

    /** 副本原配置奖励必须有准确的物品编号与正数量。 */
    private static validateDailyDungeonRewards(values: unknown): ReadonlyArray<readonly [number, number]> {
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error("副本奖励预览缺失");
        }
        return values.map(value => {
            const reward = GameProtocolCodecUtils.messageObject(value);
            if (!integer(reward.itemId, 1, 0xffffffff) || !integer(reward.quantity, 1)) {
                throw new Error("副本奖励预览无效");
            }
            return [reward.itemId, reward.quantity];
        });
    }

    /** 校验快速战斗的报价凭据、次日刷新时间和实际发奖归属。 */
    private static validateQuickBattle(frame: GameFrame): void {
        const claim = frame.name === Protocol.CHAPTER_QUICK_BATTLE_CLAIM;
        if ((!claim && frame.name !== Protocol.CHAPTER_QUICK_BATTLE_INFO) || frame.ok === false) {
            return;
        }
        const body = this.messageObject(frame.body);
        if (frame.kind === "request") {
            if (claim && (Object.keys(body).length !== 3 || !this.isUuid(body.requestId)
                    || !this.isIntegerInRange(body.resetAt, 1) || !this.isIntegerInRange(body.usedCount, 0, 0x7fffffff))) {
                throw new Error("快速战斗报价凭据无效");
            }
            return;
        }
        const state = claim ? this.messageObject(body.state) : body;
        if (typeof state.unlocked !== "boolean" || typeof state.tavernFull !== "boolean"
                || !this.isIntegerInRange(state.maxCount, 1) || !this.isIntegerInRange(state.usedCount, 0, state.maxCount)
                || !this.isIntegerInRange(state.resetAt, 1) || !this.isIntegerInRange(state.costDiamonds, 0)) {
            throw new Error("快速战斗报价无效");
        }
        if (claim) {
            this.validateBattleSettlement(body);
            if (!this.isUuid(body.receiptId) || body.actual === undefined) {
                throw new Error("快速战斗发奖回执无效");
            }
            if (body.notice !== undefined) {
                const notice = this.validateRewardNotice(body.notice);
                if (notice.roleId !== body.roleId || notice.assetRevision !== body.assetRevision
                        || notice.receiptId !== body.receiptId || notice.requestId !== body.requestId
                        || notice.mode !== "POPUP") {
                    throw new Error("快速战斗奖励通知与回执不一致");
                }
            }
        }
    }

    /** 校验勇者试炼请求、完整状态或带角色归属的发奖回执。 */
    private static validateTrial(frame: GameFrame): void {
        if (!frame.name.startsWith("trial.")
                || (frame.kind !== "request" && frame.kind !== "response") || frame.ok === false) {
            return;
        }
        const body = this.messageObject(frame.body);
        const integer = this.isIntegerInRange;
        const isAction = frame.name === Protocol.TRIAL_ACT;
        const isBuy = frame.name === Protocol.TRIAL_SHOP_BUY;
        if (isAction && !["selectDifficulty", "saveFormation", "fight", "claim", "revive", "dispatchAssist",
            "selectAssist", "cancelAssist"].some(action => action === body.action)) {
            throw new Error("试炼操作无效");
        }
        if (frame.kind === "request") {
            if (isAction) {
                this.validateTrialCommand(body);
            } else if (isBuy) {
                if (!this.isUuid(body.requestId) || !integer(body.offerId, 1) || !integer(body.count, 1)
                        || !integer(body.refreshAt, 1)
                        || Object.keys(body).some(key => !["requestId", "offerId", "count", "refreshAt"].includes(key))) {
                    throw new Error("试炼兑换请求无效");
                }
            } else if (Object.keys(body).length !== 0) {
                throw new Error("试炼查询不接受额外参数");
            }
            return;
        }
        if (isAction || isBuy) {
            this.validateBattleSettlement(body, isBuy ? 1 : 0);
        }
        if (frame.name === Protocol.TRIAL_ASSISTANCE) {
            this.validateTrialAssistance(body);
        } else if (isBuy || frame.name === Protocol.TRIAL_SHOP) {
            if (isBuy && body.actual === undefined) {
                throw new Error("试炼兑换缺少实发结果");
            }
            this.validateTrialShop(isBuy ? this.messageObject(body.state) : body);
        } else {
            this.validateTrialState(isAction ? this.messageObject(body.state) : body);
        }
    }

    /** 校验操作版本和每种操作允许的参数，阵容使用 1～8 号有效站位。 */
    private static validateTrialCommand(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        const fields = ["requestId", "expectedVersion", "action", "slots", "heroIds"];
        const choosing = ["selectDifficulty", "fight", "claim"].includes(body.action as string);
        const saving = body.action === "saveFormation";
        const targeting = ["dispatchAssist", "selectAssist", "cancelAssist"].includes(body.action as string);
        if (choosing) {
            fields.push("choice");
        }
        if (saving) {
            fields.push("formationId");
        }
        if (targeting) {
            fields.push("targetId");
        }
        if (!this.isUuid(body.requestId) || !integer(body.expectedVersion, 0)
                || Object.keys(body).some(key => !fields.includes(key))
                || (choosing && !integer(body.choice, 1, body.action === "selectDifficulty" ? 3 : 20))
                || (saving && (!integer(body.formationId, 1) || !this.validLineupSlots(body.slots)))
                || (!saving && body.slots !== undefined && (!Array.isArray(body.slots) || body.slots.length))
                || (targeting && !this.isUuid(body.targetId))
                || (body.heroIds !== undefined && (!Array.isArray(body.heroIds)
                    || (body.action !== "revive" && body.heroIds.length !== 0)
                    || body.heroIds.length > 8 || !body.heroIds.every(value => this.isUuid(value))
                    || new Set(body.heroIds).size !== body.heroIds.length))) {
            throw new Error("试炼操作参数无效");
        }
    }

    /** 校验当天难度、地图节点、阵容、生命以及最近的战报。 */
    private static validateTrialState(state: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        if (!integer(state.version, 0) || !integer(state.minimumLevel, 1) || !integer(state.resetAtSeconds, 1)
                || !integer(state.difficulty, 0, 3) || !integer(state.maxDifficulty, 1, 3)
                || !integer(state.completedDifficulty, 0, 3) || !integer(state.currentNode, 0, 21)
                || !integer(state.reviveLimit, 0) || !integer(state.reviveUsed, 0, state.reviveLimit)
                || (state.reviveCost !== undefined && !this.validRewardPreview([state.reviveCost]))
                || !integer(state.formationId, 1) || !this.validLineupSlots(state.slots)
                || !Array.isArray(state.difficulties) || state.difficulties.length !== 3
                || !Array.isArray(state.nodes) || ![0, 20].includes(state.nodes.length)
                || !Array.isArray(state.todayRewards)
                || (state.todayRewards.length !== 0 && !this.validRewardPreview(state.todayRewards))
                || !Array.isArray(state.heroHealth) || state.heroHealth.some(value => {
                    const hero = this.messageObject(value);
                    return !this.isUuid(hero.heroId) || !this.validTrialHealth(hero);
                })) {
            throw new Error("试炼快照无效");
        }
        if (!state.difficulties.every((raw, index) => {
            const difficulty = this.messageObject(raw);
            return difficulty.id === index + 1 && integer(difficulty.minimumPower, 0)
                && typeof difficulty.combatReady === "boolean" && this.validRewardPreview(difficulty.rewards);
        }) || !state.nodes.every((raw, index) => this.validTrialNode(raw, index + 1))) {
            throw new Error("试炼地图或难度无效");
        }
        if (state.battle !== undefined) {
            const battle = this.messageObject(state.battle);
            if (!this.isUuid(battle.battleId) || !integer(battle.node, 1, 20) || typeof battle.won !== "boolean") {
                throw new Error("试炼战报名单无效");
            }
            this.validateProgressionReplay(battle.replay, `trial:${state.difficulty}:${battle.node}`, battle.won);
        }
    }

    /** 验证一格节点的展示状态，以及确实已经匹配的守军生命与站位。 */
    private static validTrialNode(value: unknown, expectedNode: number): boolean {
        const node = this.messageObject(value);
        const integer = this.isIntegerInRange;
        if (node.node !== expectedNode || node.type !== (expectedNode % 4 === 0 ? "chest" : "battle")
                || !["locked", "available", "cleared", "blocked"].some(status => status === node.status)
                || (node.type === "chest" ? node.displayLevel !== 0 : !integer(node.displayLevel, 1, 15))
                || !this.validRewardPreview(node.rewards)) {
            return false;
        }
        if (node.opponent === undefined) {
            return true;
        }
        const opponent = this.messageObject(node.opponent);
        return node.type === "battle" && typeof opponent.name === "string" && opponent.name.length <= 128
            && integer(opponent.power, 0) && integer(opponent.level, 1) && integer(opponent.avatarId, 0)
            && integer(opponent.formationId, 1) && Array.isArray(opponent.heroes) && opponent.heroes.length <= 8
            && opponent.heroes.every(raw => {
                const hero = this.messageObject(raw);
                return integer(hero.position, 1, 8) && integer(hero.templateId, 1)
                    && integer(hero.level, 1) && integer(hero.star, 1) && integer(hero.element, 0)
                    && this.validTrialHealth(hero);
            });
    }

    /** 当前生命允许为零，最大生命必须为正且两项都能安全表示。 */
    private static validTrialHealth(hero: Record<string, unknown>): boolean {
        return this.isIntegerInRange(hero.maxHp, 1) && this.isIntegerInRange(hero.hp, 0, hero.maxHp);
    }

    /** 校验当天的支援英雄身份与已出战标志。 */
    private static validateTrialAssistance(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        if (!integer(body.version, 0) || !integer(body.resetAtSeconds, 1) || !integer(body.dispatchLimit, 1)
                || !integer(body.maxAssistPower, 0) || ![body.dispatched, body.selected, body.available].every(list =>
                    Array.isArray(list) && list.every(value => this.validDreamlandAssistHero(value)
                        && typeof this.messageObject(value).used === "boolean"))) {
            throw new Error("试炼支援状态无效");
        }
    }

    /** 兑换报价只携带已提交的周货架和非负限购计数。 */
    private static validateTrialShop(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        if (!integer(body.refreshAt, 1) || !Array.isArray(body.offers) || !body.offers.every(value => {
            const row = this.messageObject(value);
            return integer(row.id, 1) && this.validRewardPreview([row.reward]) && integer(row.price, 1)
                && integer(row.purchaseLimit, 0) && integer(row.purchased, 0)
                && (row.purchaseLimit === 0 || row.purchased <= row.purchaseLimit);
        })) {
            throw new Error("试炼货架无效");
        }
    }

    /** 校验梦境查询和操作的阶段、参数、战报来源及角色回执。 */
    private static validateDreamland(frame: GameFrame): void {
        if (!frame.name.startsWith("dreamland.")
                || (frame.kind !== "request" && frame.kind !== "response") || frame.ok === false) {
            return;
        }
        const body = this.messageObject(frame.body);
        const integer = this.isIntegerInRange;
        const action = body.action;
        if (frame.name === Protocol.DREAMLAND_FORMATION_POWER) {
            const isRequest = frame.kind === "request";
            const allowed = isRequest ? ["requestId", "expectedVersion", "formationId", "slots"]
                : ["requestId", "version", "power"];
            if (!this.isUuid(body.requestId) || Object.keys(body).some(key => !allowed.includes(key))
                || (isRequest
                    ? !integer(body.expectedVersion, 0) || !integer(body.formationId, 1, 0x7fffffff)
                        || !this.validLineupSlots(body.slots)
                    : !integer(body.version, 0) || !integer(body.power, 0, 0x7fffffff))) {
                throw new Error("梦境阵容战力请求或回显无效");
            }
            return;
        }
        if (frame.name === Protocol.DREAMLAND_ACT
                && (typeof action !== "string" || !["START", "SELECT_BUFF", "NEXT", "END", "CLAIM", "SAVE_FORMATION",
                    "DISPATCH_ASSIST", "SELECT_ASSIST", "CLEAR_ASSIST"].includes(action))) {
            throw new Error("梦境操作无效");
        }
        if (frame.kind === "request") {
            if (frame.name !== Protocol.DREAMLAND_ACT) {
                if (Object.keys(body).length !== 0) {
                    throw new Error("梦境查询不接受参数");
                }
                return;
            }
            const choosing = action === "SELECT_BUFF" || action === "CLAIM";
            const saving = action === "SAVE_FORMATION";
            const selectingHero = action === "DISPATCH_ASSIST" || action === "SELECT_ASSIST";
            const fields = ["requestId", "expectedVersion", "action", "slots"];
            if (choosing) {
                fields.push("choice");
            }
            if (saving) {
                fields.push("formationId");
            }
            if (selectingHero) {
                fields.push("targetId");
            }
            if (!this.isUuid(body.requestId) || !integer(body.expectedVersion, 0)
                    || Object.keys(body).some(key => !fields.includes(key))
                    || (choosing && !integer(body.choice, 1, 0x7fffffff))
                    || (selectingHero && !this.isUuid(body.targetId))
                    || (saving && (!integer(body.formationId, 1, 0x7fffffff) || !this.validLineupSlots(body.slots)))
                    || (!saving && body.slots !== undefined && (!Array.isArray(body.slots) || body.slots.length !== 0))) {
                throw new Error("梦境操作参数无效");
            }
            return;
        }
        if (frame.name === Protocol.DREAMLAND_ASSISTANCE) {
            this.validateDreamlandAssistance(body);
            return;
        }
        if (frame.name === Protocol.DREAMLAND_RANKING) {
            this.validateDreamlandRanking(body);
            return;
        }
        if (frame.name === Protocol.DREAMLAND_ACT) {
            this.validateBattleSettlement(body, 0);
        }
        const state = frame.name === Protocol.DREAMLAND_ACT ? this.messageObject(body.state) : body;
        this.validateDreamlandState(state);
    }

    /** 校验权威梦境快照，允许还没有通关或没有奖励的有效空状态。 */
    private static validateDreamlandState(state: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        const maxFloor = state.maxFloor;
        const zeroFields = ["version", "startFloor", "currentFloor", "highestFloor",
            "todayHighestFloor", "todayRewardFloor", "challengeCount", "deadlineSeconds", "activeBuffId"];
        if (!zeroFields.every(field => integer(state[field], 0))
                || typeof maxFloor !== "number" || !integer(maxFloor, 1)
                || !integer(state.minimumLevel, 1) || !integer(state.formationId, 1) || !integer(state.resetAtSeconds, 1)
                || !["READY", "SELECT_BUFF", "NEXT_BATTLE", "RESULT"].some(phase => phase === state.phase)
                || !this.validLineupSlots(state.slots)
                || (state.assistance !== undefined && !this.validDreamlandAssistHero(state.assistance))
                || !Array.isArray(state.buffs) || state.buffs.length > 3
                || !Array.isArray(state.pendingRewards)
                || (state.pendingRewards.length > 0 && !this.validRewardPreview(state.pendingRewards))
                || !Array.isArray(state.milestones) || state.milestones.length > 1500) {
            throw new Error("梦境状态无效");
        }
        if (!state.buffs.every(value => {
            const buff = this.messageObject(value);
            return integer(buff.id, 1) && typeof buff.name === "string" && typeof buff.description === "string";
        }) || !state.milestones.every(value => {
            const milestone = this.messageObject(value);
            return integer(milestone.id, 1) && integer(milestone.floor, 1, maxFloor)
                && typeof milestone.claimed === "boolean" && this.validRewardPreview(milestone.rewards);
        })) {
            throw new Error("梦境增益或里程碑无效");
        }
        if (state.battle !== undefined) {
            const battle = this.messageObject(state.battle);
            if (!this.isUuid(battle.battleId) || !integer(battle.floor, 1, maxFloor)
                    || typeof battle.won !== "boolean") {
                throw new Error("梦境战报编号或楼层无效");
            }
            this.validateProgressionReplay(battle.replay, `dreamland:${battle.floor}`, battle.won);
        }
    }

    /** 只接受服务端可展示的持久英雄标识和面板快照。 */
    private static validDreamlandAssistHero(source: unknown): boolean {
        const hero = this.messageObject(source);
        const integer = this.isIntegerInRange;
        return this.isUuid(hero.roleId) && this.isUuid(hero.heroId) && typeof hero.roleName === "string"
            && hero.roleName.length <= 128 && integer(hero.templateId, 1) && integer(hero.level, 1)
            && integer(hero.star, 1) && integer(hero.power, 0);
    }

    /** 核对派遣与借用回包的当日期次、列表唯一性及奖励配置。 */
    private static validateDreamlandAssistance(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        if (!integer(body.version, 0) || !integer(body.resetAtSeconds, 1) || !integer(body.maxAssistPower, 0)
                || typeof body.canSelect !== "boolean" || !Array.isArray(body.available) || body.available.length > 100
                || !body.available.every(offer => this.validDreamlandAssistHero(offer))
                || new Set(body.available.map(offer => this.messageObject(offer).roleId)).size !== body.available.length
                || [body.selected, body.dispatched].some(hero => hero !== undefined && !this.validDreamlandAssistHero(hero))
                || !this.validRewardPreview(body.dispatchRewards)) {
            throw new Error("梦境好友支援状态无效");
        }
    }

    /** 只接收最多前百名和实际本人记录，奖档必须有合法区间及原物品数量。 */
    private static validateDreamlandRanking(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        if (!integer(body.resetAtSeconds, 1) || !Array.isArray(body.entries) || body.entries.length > 100
                || !body.entries.every((entry, index) => this.validDreamlandRankEntry(entry)
                    && this.messageObject(entry).rank === index + 1)
                || !this.validDreamlandRankEntry(body.own)
                || !Array.isArray(body.rewardTiers) || body.rewardTiers.length > 50
                || !body.rewardTiers.every(value => {
                    const tier = this.messageObject(value);
                    return typeof tier.minRank === "number" && integer(tier.minRank, 1, 50)
                        && integer(tier.maxRank, tier.minRank, 50) && this.validRewardPreview(tier.rewards);
                })) {
            throw new Error("梦境榜单状态无效");
        }
    }

    /** 排行用实际公开角色资料与服务端名次，时间为零兼容旧通关记录。 */
    private static validDreamlandRankEntry(source: unknown): boolean {
        const entry = this.messageObject(source);
        const integer = this.isIntegerInRange;
        return this.isUuid(entry.roleId) && typeof entry.name === "string" && entry.name.length <= 128
            && integer(entry.level, 1) && integer(entry.headId, 0) && integer(entry.headBorderId, 0)
            && integer(entry.power, 0) && integer(entry.floor, 0, 1500) && integer(entry.rank, 0)
            && integer(entry.achievedAtSeconds, 0);
    }

    /** 核对爬塔和竞技场的指令字段、战报来源及结算结果的角色归属。 */
    private static validateProgressionBattle(frame: GameFrame): void {
        const isTower = frame.name.startsWith("tower.");
        if ((!isTower && !frame.name.startsWith("arena."))
                || (frame.kind !== "request" && frame.kind !== "response") || frame.ok === false) {
            return;
        }
        const body = this.messageObject(frame.body);
        const integer = this.isIntegerInRange;
        if (frame.kind === "request") {
            switch (frame.name) {
                case Protocol.TOWER_CHALLENGE:
                case Protocol.TOWER_SWEEP:
                case Protocol.TOWER_MILESTONE_CLAIM: {
                    const index = frame.name === Protocol.TOWER_MILESTONE_CLAIM ? "milestoneId" : "floor";
                    const sweep = frame.name === Protocol.TOWER_SWEEP;
                    const fields = sweep ? ["requestId", index, "maxDiamonds"] : ["requestId", index];
                    if (Object.keys(body).some(key => !fields.includes(key)) || !this.isUuid(body.requestId)
                            || !integer(body[index], 1, 0x7fffffff) || (sweep && !integer(body.maxDiamonds, 0))) {
                        throw new Error("幻境之塔请求无效");
                    }
                    break;
                }
                case Protocol.ARENA_CHALLENGE:
                    if (!this.isUuid(body.requestId) || !this.validArenaTarget(body.opponentId, body.opponentRoleId)
                            || Object.keys(body).some(key => !["requestId", "opponentId", "opponentRoleId"].includes(key))) {
                        throw new Error("竞技场对手编号无效");
                    }
                    break;
                case Protocol.ARENA_TICKET_BUY:
                    if (!this.isUuid(body.requestId) || !integer(body.quantity, 1, 0x7fffffff)) {
                        throw new Error("竞技场请求无效");
                    }
                    break;
                case Protocol.ARENA_REPLAY:
                    if (!this.isUuid(body.battleId)) {
                        throw new Error("竞技场战报编号无效");
                    }
                    break;
                default:
                    break;
            }
            return;
        }
        switch (frame.name) {
            case Protocol.TOWER_CHALLENGE:
            case Protocol.TOWER_SWEEP:
            case Protocol.TOWER_MILESTONE_CLAIM: {
                const action = frame.name === Protocol.TOWER_CHALLENGE ? "CHALLENGE"
                    : frame.name === Protocol.TOWER_SWEEP ? "SWEEP" : "MILESTONE";
                this.validateBattleSettlement(body, body.won === false ? 0 : 1);
                if (body.action !== action || !integer(body.floor, 1, 0x7fffffff) || typeof body.won !== "boolean"
                        || (body.won !== (body.actual !== undefined))
                        || (action !== "CHALLENGE" && (!body.won || body.replay !== undefined))) {
                    throw new Error("幻境之塔结算无效");
                }
                if (action === "CHALLENGE") {
                    this.validateProgressionReplay(body.replay, `tower:${body.floor}`, body.won);
                }
                break;
            }
            case Protocol.ARENA_CHALLENGE: {
                this.validateBattleSettlement(body);
                const entry = this.messageObject(body.record);
                if (!this.validArenaHistory(entry) || entry.defense === true) {
                    throw new Error("竞技场结算记录无效");
                }
                const scenario = entry.opponentRoleId ? `arena:pvp:${entry.opponentRoleId}` : `arena:${entry.opponentId}`;
                this.validateProgressionReplay(body.replay, scenario, entry.won === true);
                const replay = this.messageObject(body.replay);
                if (replay.defenderName !== entry.opponentName) {
                    throw new Error("竞技场结算对手不符");
                }
                this.validateArenaState(body.state);
                break;
            }
            case Protocol.ARENA_REPLAY:
                if (body.schemaVersion !== 1 || typeof body.scenario !== "string"
                        || !(/^arena:[1-9][0-9]*$/.test(body.scenario)
                            || (body.scenario.startsWith("arena:pvp:") && this.isUuid(body.scenario.slice(10))))) {
                    throw new Error("竞技场历史战报来源无效");
                }
                break;
            case Protocol.ARENA_STATE:
            case Protocol.ARENA_REFRESH:
                this.validateArenaState(body);
                break;
            case Protocol.ARENA_TICKET_BUY:
                this.validateBattleSettlement(body);
                if (!integer(body.quantity, 1) || !integer(body.spentDiamonds, 1) || body.actual === undefined) {
                    throw new Error("竞技场门票购买回执无效");
                }
                break;
            default:
                break;
        }
    }

    /** 机器人配置号与真人角色号使用同一个协议的两个互斥表示。 */
    private static validArenaTarget(id: unknown, roleId: unknown): boolean {
        return roleId === undefined ? this.isIntegerInRange(id, 1, 0x7fffffff) : id === 0 && this.isUuid(roleId);
    }

    /** 只接受服务端参与者历史和有效战报标识。 */
    private static validArenaHistory(row: Record<string, unknown>): boolean {
        return this.isUuid(row.battleId) && this.validArenaTarget(row.opponentId, row.opponentRoleId)
            && typeof row.opponentName === "string" && row.opponentName.length <= 128
            && typeof row.won === "boolean" && this.isIntegerInRange(row.settledAtSeconds, 1)
            && this.isIntegerInRange(row.scoreDelta, -0x80000000, 0x7fffffff)
            && (row.defense === undefined || typeof row.defense === "boolean");
    }

    /** 校验候选、真实场次和历史，保持已保存机器人回执的旧字段兼容。 */
    private static validateArenaState(source: unknown): void {
        const state = this.messageObject(source);
        const integer = this.isIntegerInRange;
        const validOpponent = (value: unknown): boolean => {
            const row = this.messageObject(value);
            return this.validArenaTarget(row.id, row.roleId) && typeof row.name === "string" && row.name.length <= 128
                && integer(row.level, 1) && integer(row.score, 0) && integer(row.power, 0)
                && integer(row.avatarId, 0) && (row.borderId === undefined || integer(row.borderId, 0));
        };
        if (![state.score, state.freeRemaining, state.robotWins, state.settledChallenges, state.ticketBalance]
                .every(value => integer(value, 0))
                || !integer(state.resetAtSeconds, 1) || !integer(state.ticketPriceDiamonds, 1)
                || typeof state.newcomerActive !== "boolean"
                || !Array.isArray(state.opponents) || state.opponents.length > 3 || !state.opponents.every(validOpponent)
                || !Array.isArray(state.history) || state.history.length > 100
                || !state.history.every(row => this.validArenaHistory(this.messageObject(row)))) {
            throw new Error("竞技场状态无效");
        }
    }

    /** 核对独立阵容格位，拒绝重复站位和不属于战斗区域的助战格。 */
    private static validLineupSlots(source: unknown): boolean {
        if (!Array.isArray(source) || source.length > 8) {
            return false;
        }
        const slots = source.map(value => this.messageObject(value));
        return new Set(slots.map(slot => slot.position)).size === slots.length
            && new Set(slots.map(slot => slot.heroId)).size === slots.length
            && slots.every(slot => this.isIntegerInRange(slot.position, 1, 8) && this.isUuid(slot.heroId));
    }

    /** 原策划表的奖品必须为正数量和有效配置编号。 */
    private static validRewardPreview(value: unknown): boolean {
        return Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(item => {
            const reward = this.messageObject(item);
            return this.isIntegerInRange(reward.itemId, 1, 0x7fffffff) && this.isIntegerInRange(reward.quantity, 1);
        });
    }

    /** 校验赛季、宝箱、商店及防守的独立请求和嵌套回执。 */
    private static validateArenaPanels(frame: GameFrame): void {
        const names = [
            Protocol.ARENA_RANKING, Protocol.ARENA_SEASON, Protocol.ARENA_CHEST_CLAIM, Protocol.ARENA_LIKE,
            Protocol.ARENA_DEFENSE, Protocol.ARENA_DEFENSE_SAVE, Protocol.ARENA_SHOP, Protocol.ARENA_SHOP_BUY,
        ];
        if (frame.ok === false || !(names as readonly string[]).includes(frame.name)) {
            return;
        }
        const body = this.messageObject(frame.body);
        const integer = this.isIntegerInRange;
        if (frame.kind === "request") {
            let valid: boolean;
            switch (frame.name) {
                case Protocol.ARENA_CHEST_CLAIM:
                    valid = Object.keys(body).length === 3 && this.isUuid(body.requestId)
                        && integer(body.chestId, 1) && integer(body.seasonEndsAt, 1);
                    break;
                case Protocol.ARENA_LIKE:
                    valid = Object.keys(body).length === 3 && this.isUuid(body.requestId)
                        && this.isUuid(body.targetRoleId) && integer(body.dailyEndsAt, 1);
                    break;
                case Protocol.ARENA_DEFENSE_SAVE:
                    valid = Object.keys(body).length === 4 && this.isUuid(body.requestId)
                        && integer(body.expectedVersion, 0) && integer(body.formationId, 1) && this.validLineupSlots(body.slots);
                    break;
                case Protocol.ARENA_SHOP_BUY:
                    valid = Object.keys(body).length === 4 && this.isUuid(body.requestId)
                        && integer(body.offerId, 1) && integer(body.quantity, 1) && integer(body.refreshAt, 1);
                    break;
                default:
                    valid = Object.keys(body).length === 0;
                    break;
            }
            if (!valid) {
                throw new Error("竞技场页面操作无效");
            }
            return;
        }
        const hasReward = frame.name === Protocol.ARENA_CHEST_CLAIM || frame.name === Protocol.ARENA_LIKE
            || frame.name === Protocol.ARENA_SHOP_BUY;
        const savesDefense = frame.name === Protocol.ARENA_DEFENSE_SAVE;
        if ((hasReward || savesDefense) && !this.isUuid(body.requestId)) {
            throw new Error("竞技场操作回执无效");
        }
        if (hasReward && this.validateRewardNotice(body.notice).requestId !== body.requestId) {
            throw new Error("竞技场奖励与操作回执不符");
        }
        switch (frame.name) {
            case Protocol.ARENA_RANKING:
            case Protocol.ARENA_LIKE:
                this.validateArenaRanking(frame.name === Protocol.ARENA_LIKE ? this.messageObject(body.ranking) : body);
                break;
            case Protocol.ARENA_SEASON:
            case Protocol.ARENA_CHEST_CLAIM:
                this.validateArenaSeason(hasReward ? this.messageObject(body.state) : body);
                break;
            case Protocol.ARENA_SHOP:
            case Protocol.ARENA_SHOP_BUY:
                this.validateArenaShop(hasReward ? this.messageObject(body.state) : body);
                break;
            default: {
                const defense = savesDefense ? this.messageObject(body.defense) : body;
                if (!integer(defense.version, savesDefense ? 1 : 0) || !integer(defense.formationId, 1)
                        || !this.validLineupSlots(defense.slots) || typeof defense.fallback !== "boolean") {
                    throw new Error("竞技场防守阵容无效");
                }
                break;
            }
        }
    }

    /** 榜单行唯一且按真实名次排列，未上榜的本人名次为 0。 */
    private static validateArenaRanking(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        const validEntry = (row: Record<string, unknown>): boolean =>
            this.isUuid(row.roleId) && typeof row.name === "string" && row.name.length <= 128
            && [row.rank, row.score, row.power, row.headId, row.borderId, row.receivedLikes].every(value => integer(value, 0))
            && integer(row.level, 1) && typeof row.liked === "boolean";
        if (!integer(body.likesRemaining, 0) || !integer(body.dailyEndsAt, 1)
                || !Array.isArray(body.entries) || body.entries.length > 50 || !validEntry(this.messageObject(body.own))) {
            throw new Error("竞技场榜单无效");
        }
        const rows = body.entries.map(row => this.messageObject(row));
        if (new Set(rows.map(row => row.roleId)).size !== rows.length
                || !rows.every((row, index) => validEntry(row) && row.rank === index + 1)) {
            throw new Error("竞技场榜单名次无效");
        }
    }

    /** 匹配服务端赛季和自然日时间，奖励档位及宝箱必须可显示。 */
    private static validateArenaSeason(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        const validTiers = (value: unknown): boolean => Array.isArray(value) && value.length <= 50
            && value.every(item => {
                const tier = this.messageObject(item);
                return integer(tier.minRank, 1) && integer(tier.maxRank, Number(tier.minRank))
                    && this.validRewardPreview(tier.rewards);
            });
        if (!integer(body.seasonEndsAt, 0) || !integer(body.dailyEndsAt, 1) || !integer(body.seasonChallenges, 0)
                || (body.challengeEndsAt !== undefined && !integer(body.challengeEndsAt, 0, Number(body.seasonEndsAt)))
                || !validTiers(body.dailyTiers) || !validTiers(body.seasonTiers)
                || !Array.isArray(body.chests) || body.chests.length > 6 || !body.chests.every(value => {
                    const chest = this.messageObject(value);
                    return integer(chest.id, 1) && integer(chest.requiredChallenges, 1) && integer(chest.boxPic, 1)
                        && typeof chest.claimed === "boolean" && this.validRewardPreview(chest.rewards);
                })) {
            throw new Error("竞技场赛季状态无效");
        }
    }

    /** 核对固定商品的周限购次数、价格和实际奖品。 */
    private static validateArenaShop(body: Record<string, unknown>): void {
        const integer = this.isIntegerInRange;
        if (!integer(body.refreshAt, 1) || !integer(body.currencyBalance, 0) || !Array.isArray(body.offers)
                || body.offers.length > 50 || !body.offers.every(value => {
                    const offer = this.messageObject(value);
                    return integer(offer.id, 1) && integer(offer.requiredLevel, 0) && integer(offer.price, 1)
                        && integer(offer.purchaseLimit, 0)
                        && integer(offer.purchased, 0, offer.purchaseLimit || Number.MAX_SAFE_INTEGER)
                        && Array.isArray(offer.rewards) && offer.rewards.length === 1 && this.validRewardPreview(offer.rewards);
                })) {
            throw new Error("竞技商店状态无效");
        }
    }

    /** 两项玩法及门票使用相同的回执身份和通用发奖结构。 */
    private static validateBattleSettlement(body: Record<string, unknown>, minimumRevision = 1): void {
        if (!this.isUuid(body.requestId) || !this.isUuid(body.roleId)
                || !this.isIntegerInRange(body.assetRevision, minimumRevision)) {
            throw new Error("战斗玩法结算归属无效");
        }
        if (body.actual !== undefined) {
            const actual = this.messageObject(body.actual);
            if (actual.roleId !== body.roleId || !Array.isArray(actual.items) || !Array.isArray(actual.heroes)) {
                throw new Error("战斗玩法发奖与结算不一致");
            }
            this.validateHeroGrants(actual.heroes, actual.items);
        }
    }

    /** 结算携带原场景和实际胜负，播放器继续校验真实名册和事件。 */
    private static validateProgressionReplay(value: unknown, scenario: string, won: boolean): void {
        const replay = this.messageObject(value);
        if (replay.schemaVersion !== 1 || replay.scenario !== scenario
                || replay.outcome !== (won ? "ATTACKER_WIN" : "DEFENDER_WIN")) {
            throw new Error("战报与结算不一致");
        }
    }

    /** 验证历史回执格式、消费版本、安全时间及角色字段；返回的历史数据不能提交为当前资产。 */
    public static validateIdleReceipt(value: unknown): Record<string, unknown> {
        const receipt = GameProtocolCodecUtils.messageObject(value);
        if (receipt.schemaVersion !== 1) {
            throw new Error("挂机回执格式未支持");
        }
        GameProtocolCodecUtils.validateIdleRequestId(receipt.requestId);
        GameProtocolCodecUtils.validateIdleRequestId(receipt.receiptId);
        GameProtocolCodecUtils.validatePositiveVersion(receipt.expectedOperationVersion);
        GameProtocolCodecUtils.validatePositiveVersion(receipt.beforeOperationVersion);
        GameProtocolCodecUtils.validatePositiveVersion(receipt.afterOperationVersion);
        GameProtocolCodecUtils.validatePositiveVersion(receipt.assetRevision);
        if (receipt.expectedOperationVersion !== receipt.beforeOperationVersion
            || receipt.afterOperationVersion !== receipt.beforeOperationVersion + 1) {
            throw new Error("挂机回执消费版本不一致");
        }
        for (const field of ["committedAtSeconds", "previousStartedAtSeconds", "seconds", "maxSeconds", "rewardStage"]) {
            if (typeof receipt[field] !== "number" || !Number.isSafeInteger(receipt[field]) || (receipt[field] as number) <= 0) {
                throw new Error("挂机回执时间或关卡无效");
            }
        }
        if ((receipt.seconds as number) > (receipt.maxSeconds as number)
            || (receipt.committedAtSeconds as number) - (receipt.previousStartedAtSeconds as number) < (receipt.seconds as number)) {
            throw new Error("挂机回执累计时间不一致");
        }
        const actual = GameProtocolCodecUtils.messageObject(receipt.actual);
        if (typeof actual.roleId !== "string" || !actual.roleId || actual.roleId.length > 128) {
            throw new Error("挂机回执缺少角色归属");
        }
        return receipt;
    }

    /** 校验通用反馈的请求关联、回执、实际到账和展示模式，不更新资产。 */
    public static validateRewardNotice(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("奖励通知对象无效");
        }
        const notice = value as Record<string, unknown>;
        if (notice.requestId !== undefined && !GameProtocolCodecUtils.isUuid(notice.requestId)) {
            throw new Error("奖励通知原请求关联无效");
        }
        if (notice.schemaVersion !== 1
            || !GameProtocolCodecUtils.isUuid(notice.receiptId)
            || typeof notice.roleId !== "string" || !notice.roleId || notice.roleId.length > 128
            || /[\u0000-\u001f\u007f]/.test(notice.roleId)
            || !Number.isSafeInteger(notice.assetRevision) || (notice.assetRevision as number) <= 0
            || !["SILENT", "POPUP", "TIPS"].includes(notice.mode as string)
            || !Array.isArray(notice.items) || (notice.items.length === 0 && notice.roleUpgrade === undefined)) {
            throw new Error("奖励通知格式、归属或版本无效");
        }
        if (notice.roleUpgrade !== undefined) {
            const upgrade = notice.roleUpgrade as Record<string, unknown>;
            if (!upgrade || typeof upgrade !== "object" || Array.isArray(upgrade)
                || !Number.isSafeInteger(upgrade.beforeLevel) || (upgrade.beforeLevel as number) < 1
                || !Number.isSafeInteger(upgrade.afterLevel) || (upgrade.afterLevel as number) > 0xffffffff
                || (upgrade.afterLevel as number) <= (upgrade.beforeLevel as number)) {
                throw new Error("奖励通知的历史升级信息无效");
            }
        }
        const seen = new Set<number>();
        for (const raw of notice.items) {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
                throw new Error("奖励通知明细无效");
            }
            const item = raw as Record<string, unknown>;
            if (!Number.isSafeInteger(item.itemId) || (item.itemId as number) <= 0
                || (item.itemId as number) > 0xffffffff || seen.has(item.itemId as number)
                || !Number.isSafeInteger(item.credited) || (item.credited as number) <= 0) {
                throw new Error("奖励通知实际数量无效");
            }
            seen.add(item.itemId as number);
        }
        GameProtocolCodecUtils.validateHeroGrants(notice.heroes,
            notice.items as readonly { itemId: number; credited: number }[]);
        return notice;
    }

    /** 验证并冻结同笔新英雄，检查实例编号、重复实例与逐模板实际到账数量。 */
    public static validateHeroGrants(value: unknown,
        items: readonly { readonly itemId: number; readonly credited: number }[]): readonly {
            readonly instanceId: string; readonly templateId: number; readonly level: number;
            readonly star: number; readonly stage: number;
        }[] {
        if (value === undefined) {
            return Object.freeze([]);
        }
        if (!Array.isArray(value) || value.length > 1000) {
            throw new Error("奖励英雄实例集合无效");
        }
        const seen = new Set<string>();
        const counts = new Map<number, number>();
        const heroes = value.map(raw => {
            const row = raw as Record<string, unknown>;
            if (!row || typeof row !== "object" || Array.isArray(row)
                || !GameProtocolCodecUtils.isUuid(row.instanceId)
                || seen.has(row.instanceId)
                || ![row.templateId, row.level, row.star, row.stage].every(number =>
                    typeof number === "number" && Number.isSafeInteger(number) && number <= 0xffffffff)
                || (row.templateId as number) <= 0 || (row.level as number) <= 0
                || (row.star as number) <= 0 || (row.stage as number) < 0) {
                throw new Error("奖励英雄实例身份或成长无效");
            }
            seen.add(row.instanceId);
            counts.set(row.templateId as number, (counts.get(row.templateId as number) || 0) + 1);
            return Object.freeze({ instanceId: row.instanceId, templateId: row.templateId as number,
                level: row.level as number, star: row.star as number, stage: row.stage as number });
        });
        for (const [id, count] of counts) {
            if (items.find(item => item.itemId === id)?.credited !== count) {
                throw new Error("奖励英雄实例与同笔实际数量不一致");
            }
        }
        return Object.freeze(heroes);
    }

    /** 通用奖励事件与新手赠礼包使用同样的到账结构，各自校验信封方向和必要字段。 */
    private static validateRewardFrame(frame: GameFrame): void {
        if (frame.name === Protocol.REWARD_GRANTED) {
            if (frame.kind !== "event" || frame.id !== undefined || frame.ok !== undefined || frame.error !== undefined) {
                throw new Error("奖励通知信封无效");
            }
            GameProtocolCodecUtils.validateRewardNotice(frame.body);
        } else if (frame.name === Protocol.ROLE_WELCOME_CLAIM) {
            GameProtocolCodecUtils.validateWelcomeGiftFrame(frame);
        }
    }

    /** 新手赠礼只请求当前角色的固定份额，成功返回用于通用奖励窗的原回执。 */
    private static validateWelcomeGiftFrame(frame: GameFrame): void {
        if (typeof frame.id !== "string" || !frame.id) {
            throw new Error("新手赠礼信封缺少请求关联");
        }
        if (frame.kind === "request") {
            if (frame.ok !== undefined || frame.error !== undefined
                || Object.keys(GameProtocolCodecUtils.messageObject(frame.body)).length !== 0) {
                throw new Error("新手赠礼请求必须为空");
            }
            return;
        }
        if (frame.kind !== "response" || typeof frame.ok !== "boolean") {
            throw new Error("新手赠礼信封方向无效");
        }
        if (!frame.ok) {
            if (frame.body != null || frame.error === undefined) {
                throw new Error("新手赠礼失败回包无效");
            }
            return;
        }
        const notice = GameProtocolCodecUtils.validateRewardNotice(frame.body);
        if (frame.error !== undefined || notice.mode !== "POPUP" || notice.requestId !== undefined) {
            throw new Error("新手赠礼回执格式无效");
        }
    }

    /** 校验 VIP 请求、领取回包与快照，保留没有权威进度来源的状态。 */
    private static validateVip(frame: GameFrame): void {
        if (frame.kind === "response" && frame.ok === false) {
            return;
        }
        if (frame.name === Protocol.VIP_CLAIM) {
            const body = this.messageObject(frame.body);
            if (!this.isUuid(body.requestId)) {
                throw new Error("VIP 请求标识无效");
            }
            this.validatePositiveVersion(body.taskId);
            if (frame.kind === "request") {
                if (Object.keys(body).length !== 2) {
                    throw new Error("VIP 请求字段无效");
                }
                return;
            }
            const notice = this.validateRewardNotice(body.notice);
            this.validatePositiveVersion(body.assetRevision);
            if (!this.isUuid(body.roleId) || notice.roleId !== body.roleId
                || notice.assetRevision !== body.assetRevision || notice.requestId !== body.requestId
                || notice.mode !== "POPUP") {
                throw new Error("VIP 任务回执与奖励不符");
            }
            return;
        }
        let state: Record<string, unknown>;
        if (frame.name === Protocol.STATE_CHANGED && frame.kind === "event") {
            state = this.messageObject(frame.body);
        } else if (frame.kind === "response"
                && (frame.name === Protocol.SESSION_LOGIN || frame.name === Protocol.SESSION_AUTHENTICATE)) {
            state = this.messageObject(this.messageObject(frame.body).initial);
        } else {
            return;
        }
        if (state.vip === undefined) {
            return;
        }
        const { level, tasks } = this.messageObject(state.vip);
        if (!Number.isSafeInteger(level) || Number(level) < 0 || !Array.isArray(tasks)) {
            throw new Error("VIP 状态无效");
        }
        const ids = new Set<number>();
        for (const value of tasks) {
            const { id, target, progress, claimed } = this.messageObject(value);
            this.validatePositiveVersion(id);
            this.validatePositiveVersion(target);
            if (ids.has(id) || typeof claimed !== "boolean"
                || (progress !== undefined && (!Number.isSafeInteger(progress) || Number(progress) < 0))) {
                throw new Error("VIP 任务进度无效");
            }
            ids.add(id);
        }
    }

    /** 校验稳定里程碑键与强类型历史结果，未知格式、关联冲突和跨角色实际结果拒绝整包。 */
    private static validateMilestone(frame: GameFrame): void {
        const claim = frame.name === Protocol.CHAPTER_MILESTONE_CLAIM;
        const status = frame.name === Protocol.CHAPTER_MILESTONE_STATUS;
        if ((!claim && !status) || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        if (frame.kind !== "request" && frame.kind !== "response") {
            throw new Error("里程碑信封方向无效");
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const validId = (id: unknown): id is number => typeof id === "number"
            && Number.isSafeInteger(id) && id > 0 && id <= 0xffffffff;
        if (!validId(body.rewardId)) {
            throw new Error("里程碑稳定业务键无效");
        }
        if (frame.kind === "request") {
            if (Object.keys(body).join(",") !== "rewardId") {
                throw new Error("里程碑请求不得提交奖励或身份");
            }
            return;
        }
        if (status && (typeof body.found !== "boolean"
                || (body.found ? body.receipt === undefined : body.receipt !== undefined))) {
            throw new Error("里程碑查询结果无效");
        }
        if (status && !body.found) {
            return;
        }
        const receipt = status ? GameProtocolCodecUtils.messageObject(body.receipt) : body;
        GameProtocolCodecUtils.validateIdleRequestId(receipt.receiptId);
        GameProtocolCodecUtils.validatePositiveVersion(receipt.assetRevision);
        const state = GameProtocolCodecUtils.messageObject(receipt.state);
        const progress = GameProtocolCodecUtils.messageObject(state.milestoneProgress);
        const actual = GameProtocolCodecUtils.messageObject(receipt.actual);
        if (receipt.schemaVersion !== 1 || receipt.rewardId !== body.rewardId || !validId(receipt.targetChapter)
                || typeof receipt.roleId !== "string" || !receipt.roleId || receipt.roleId.length > 128
                || /[\u0000-\u001f\u007f]/.test(receipt.roleId) || actual.roleId !== receipt.roleId
                || typeof receipt.rulesVersion !== "string" || !/^chapter-milestone-v1:[0-9a-f]{64}$/.test(receipt.rulesVersion)
                || state.assetRevision !== receipt.assetRevision || progress.schemaVersion !== 1
                || !Array.isArray(progress.claimedIds) || !progress.claimedIds.includes(receipt.rewardId)
                || !Array.isArray(actual.items) || !Array.isArray(actual.heroes)) {
            throw new Error("里程碑回执归属、原配置版本或已领集合无效");
        }
        GameProtocolCodecUtils.validateHeroGrants(actual.heroes,
            actual.items as { itemId: number; credited: number }[]);
    }

    /** 通关、碎片和召唤共用原编号及到账归属检查，按协议补验各自的结果。 */
    private static validateProgressReward(frame: GameFrame): void {
        const chapter = frame.name === Protocol.CHAPTER_FIRST_REWARD_CLAIM
            || frame.name === Protocol.CHAPTER_FIRST_REWARD_STATUS;
        const fragment = frame.name === Protocol.HERO_FRAGMENT_COMBINE
            || frame.name === Protocol.HERO_FRAGMENT_COMBINE_STATUS;
        const summon = frame.name === Protocol.HERO_NORMAL_SUMMON
            || frame.name === Protocol.HERO_FIRST_SUMMON || frame.name === Protocol.HERO_FIRST_SUMMON_STATUS;
        if ((!chapter && !fragment && !summon) || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        if (frame.kind !== "request" && frame.kind !== "response") {
            throw new Error("成长奖励协议方向无效");
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const key = chapter ? "chapter" : "requestId";
        const status = frame.name === Protocol.CHAPTER_FIRST_REWARD_STATUS
            || frame.name === Protocol.HERO_FRAGMENT_COMBINE_STATUS || frame.name === Protocol.HERO_FIRST_SUMMON_STATUS;
        const positive = (value: unknown): value is number => typeof value === "number"
            && Number.isSafeInteger(value) && value > 0 && value <= 0xffffffff;
        if (chapter ? !positive(body.chapter) : !GameProtocolCodecUtils.isUuid(body.requestId)) {
            throw new Error("成长奖励协议原键无效");
        }
        if (frame.kind === "request") {
            const validFields = fragment && !status
                ? Object.keys(body).length === 3 && positive(body.itemId) && positive(body.quantity)
                : Object.keys(body).length === 1;
            if (!validFields) {
                throw new Error("成长奖励请求携带了无效参数");
            }
            return;
        }
        if (status && (typeof body.found !== "boolean"
                || (body.found ? body.receipt === undefined : body.receipt !== undefined))) {
            throw new Error("成长奖励状态与回执不一致");
        }
        if (status && !body.found) {
            return;
        }
        const receipt = status ? GameProtocolCodecUtils.messageObject(body.receipt) : body;
        const actual = GameProtocolCodecUtils.messageObject(receipt.actual);
        GameProtocolCodecUtils.validatePositiveVersion(receipt.assetRevision);
        if (receipt.schemaVersion !== 1 || receipt[key] !== body[key] || !GameProtocolCodecUtils.isUuid(receipt.receiptId)
                || typeof receipt.roleId !== "string" || !receipt.roleId || receipt.roleId.length > 128
                || /[\u0000-\u001f\u007f]/.test(receipt.roleId)
                || actual.roleId !== receipt.roleId || !Array.isArray(actual.heroes) || !Array.isArray(actual.items)) {
            throw new Error("成长奖励回执与业务归属不一致");
        }
        const heroes = GameProtocolCodecUtils.validateHeroGrants(actual.heroes,
            actual.items as { itemId: number; credited: number }[]);
        if (summon) {
            const state = GameProtocolCodecUtils.messageObject(receipt.state);
            if (state.schemaVersion !== 1 || state.firstNormalCompleted !== true
                    || typeof state.normalFreeAtSeconds !== "number" || state.normalFreeAtSeconds <= 0
                    || heroes.length !== 1) {
                throw new Error("普通单抽回包缺少召唤状态或实际英雄");
            }
        }
        if (fragment && (!positive(receipt.itemId) || !positive(receipt.quantity)
                || typeof receipt.costQuantity !== "number" || receipt.costQuantity < receipt.quantity
                || heroes?.length !== receipt.quantity)) {
            throw new Error("碎片消耗与合成英雄数量无效");
        }
    }

    /** 校验召唤池、次数和授权钻石上限，并确认成功回执里的英雄与实际到账一一对应。 */
    private static validateSummon(frame: GameFrame): void {
        if (frame.name !== Protocol.HERO_SUMMON) {
            return;
        }
        if (!frame.id || typeof frame.id !== "string") {
            throw new Error("召唤信封缺少请求关联");
        }
        if (frame.kind === "response" && frame.ok === false) {
            if (frame.error === undefined || frame.body != null) {
                throw new Error("召唤失败回包无效");
            }
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const pools = ["NORMAL", "FRIENDSHIP", "ADVANCED", "POINTS"];
        if (!GameProtocolCodecUtils.isUuid(body.requestId) || !pools.includes(body.pool as string)
            || (body.count !== 1 && body.count !== 10) || (body.pool === "POINTS" && body.count !== 1)) {
            throw new Error("召唤请求编号、池或次数无效");
        }
        if (frame.kind === "request") {
            const limit = body.maxDiamonds;
            if (frame.error !== undefined || frame.ok !== undefined
                || Object.keys(body).some(key => !["requestId", "pool", "count", "maxDiamonds"].includes(key))
                || (limit !== undefined && (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 0
                    || (limit !== 0 && body.pool !== "ADVANCED")))) {
                throw new Error("召唤请求钻石授权或额外字段无效");
            }
            return;
        }
        if (frame.kind !== "response" || frame.ok !== true || frame.error !== undefined) {
            throw new Error("召唤回包方向或状态无效");
        }
        GameProtocolCodecUtils.validatePositiveVersion(body.assetRevision);
        const actual = GameProtocolCodecUtils.messageObject(body.actual);
        if (body.schemaVersion !== 1 || !GameProtocolCodecUtils.isUuid(body.receiptId)
            || typeof body.roleId !== "string" || !body.roleId || body.roleId.length > 128
            || /[\u0000-\u001f\u007f]/.test(body.roleId)
            || actual.roleId !== body.roleId || !Array.isArray(actual.items) || !Array.isArray(actual.heroes)) {
            throw new Error("召唤回执格式或归属无效");
        }
        const heroes = GameProtocolCodecUtils.validateHeroGrants(actual.heroes,
            actual.items as readonly { itemId: number; credited: number }[]);
        if (heroes.length !== body.count) {
            throw new Error("召唤回执英雄数量与原次数不一致");
        }
        const state = GameProtocolCodecUtils.messageObject(body.state);
        const validOptionalTimes = ["advancedFreeAtSeconds", "pointRechargeRequired", "prayerEndsAtSeconds"]
            .every(key => state[key] === undefined
                || (typeof state[key] === "number" && (state[key] as number) >= 0));
        if (state.schemaVersion !== 1 || typeof state.firstNormalCompleted !== "boolean"
            || typeof state.normalFreeAtSeconds !== "number" || state.normalFreeAtSeconds < 0
            || state.firstNormalCompleted !== (state.normalFreeAtSeconds > 0)
            || !validOptionalTimes
            || (state.pointsCost !== undefined && (typeof state.pointsCost !== "number" || state.pointsCost <= 0))
            || (state.pointsExchangeAvailable !== undefined && typeof state.pointsExchangeAvailable !== "boolean")) {
            throw new Error("召唤回执免费时间或积分资格无效");
        }
    }

    /** 锁定指令只传本次设值和实例，回执附提交版本，禁止以缺失状态充当解锁。 */
    private static validateHeroLock(frame: GameFrame): void {
        if (frame.name !== Protocol.HERO_LOCK_SET) {
            return;
        }
        if (typeof frame.id !== "string" || !frame.id) {
            throw new Error("英雄锁定信封缺少请求关联");
        }
        if (frame.kind === "response" && frame.ok === false) {
            if (frame.error === undefined || frame.body != null) {
                throw new Error("英雄锁定失败回包无效");
            }
            return;
        }
        const body = this.messageObject(frame.body);
        const { requestId, heroId, locked, assetRevision } = body;
        if (!this.isUuid(requestId) || !this.isUuid(heroId) || typeof locked !== "boolean") {
            throw new Error("英雄锁定请求编号、实例或设值无效");
        }
        if (frame.kind === "request" && frame.ok === undefined && frame.error === undefined
            && Object.keys(body).length === 3) {
            return;
        }
        if (frame.kind !== "response" || frame.ok !== true || frame.error !== undefined
            || Object.keys(body).length !== 4 || typeof assetRevision !== "number"
            || !Number.isSafeInteger(assetRevision) || assetRevision < 0) {
            throw new Error("英雄锁定回执状态或提交版本无效");
        }
    }

    /** 校验新培养指令和归属回执，限制选择数组和数值范围，资产由统一快照更新。 */
    private static validateHeroGrowth(frame: GameFrame): void {
        const name = frame.name;
        if (name !== Protocol.HERO_STAR_UPGRADE && name !== Protocol.HERO_JEWEL_CHANGE
            && name !== Protocol.HERO_GOD_EQUIPMENT_CHANGE && name !== Protocol.HERO_GOD_EQUIPMENT_DRAW
            && name !== Protocol.HERO_ARTIFACT_CHANGE && name !== Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY) {
            return;
        }
        const invalid = () => new Error("英雄培养协议内容无效");
        if (typeof frame.id !== "string" || !frame.id) {
            throw invalid();
        }
        if (frame.kind === "response" && frame.ok === false) {
            if (frame.body != null || !frame.error) {
                throw invalid();
            }
            return;
        }
        const request = frame.kind === "request";
        const body = this.messageObject(frame.body);
        const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) =>
            typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
        if (!this.isUuid(body.requestId) || (request
            ? frame.ok !== undefined || frame.error !== undefined
            : frame.kind !== "response" || frame.ok !== true || frame.error !== undefined
                || !this.isUuid(body.roleId) || !integer(body.assetRevision))) {
            throw invalid();
        }
        switch (name) {
            case Protocol.HERO_STAR_UPGRADE: {
                if (!this.isUuid(body.heroId)) {
                    throw invalid();
                }
                if (!request) {
                    if (!integer(body.fromStar, 1, 13) || body.toStar !== Number(body.fromStar) + 1
                        || !this.validGrowthAmounts(body.refunded)) {
                        throw invalid();
                    }
                    return;
                }
                if (!integer(body.expectedStar, 1, 13) || !Array.isArray(body.materials) || body.materials.length > 12) {
                    throw invalid();
                }
                for (const entry of body.materials) {
                    const row = this.messageObject(entry);
                    if (!integer(row.row, 0, 11) || typeof row.useReplacement !== "boolean"
                        || !Array.isArray(row.heroIds) || row.heroIds.length > 30 || !row.heroIds.every(this.isUuid)) {
                        throw invalid();
                    }
                }
                return;
            }
            case Protocol.HERO_JEWEL_CHANGE: {
                const action = body.action;
                const values = [body.itemId, body.slot, body.expectedItemId, body.count];
                const combines = action === "COMBINE" || action === "COMBINE_ALL";
                if (!["EQUIP", "UNEQUIP", "EQUIP_ALL", "UNEQUIP_ALL", "COMBINE", "COMBINE_ALL"].includes(String(action))
                    || values.some(value => value !== undefined && !integer(value, 0, 0x7fffffff))
                    || (combines ? body.heroId !== undefined : !this.isUuid(body.heroId))
                    || (body.expectedRevision !== undefined && (action !== "COMBINE_ALL" || !integer(body.expectedRevision)))
                    || (!request && (typeof body.changed !== "boolean" || !this.validGrowthAmounts(body.rewards)))) {
                    throw invalid();
                }
                return;
            }
            case Protocol.HERO_GOD_EQUIPMENT_CHANGE:
                if (!this.isUuid(body.heroId) || !integer(body.slot, 1, 4)
                    || !this.isEquipmentIdentity(body.instanceId)
                    || (body.action !== "EQUIP" && body.action !== "UNEQUIP")
                    || (body.expectedInstanceId !== undefined
                        && (body.action === "UNEQUIP" || !this.isEquipmentIdentity(body.expectedInstanceId)))) {
                    throw invalid();
                }
                return;
            case Protocol.HERO_GOD_EQUIPMENT_DRAW:
                if ((body.count !== 1 && body.count !== 10)
                    || (request ? !integer(body.maxDiamonds)
                        : !integer(body.diamondsPaid) || !this.validGrowthAmounts(body.rewards, "templateId"))) {
                    throw invalid();
                }
                return;
            case Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY:
                if (!integer(body.productId, 1, 0x7fffffff) || !integer(body.count, 1, 0x7fffffff)
                    || !integer(body.resetAt, 1) || (!request && !integer(body.purchased, 0, 0x7fffffff))) {
                    throw invalid();
                }
                return;
            case Protocol.HERO_ARTIFACT_CHANGE:
                if (!this.isUuid(body.heroId) || !integer(body.slot, 1, 2)
                    || !["ACTIVATE", "EQUIP", "UNEQUIP", "UPGRADE", "TRANSFORM"].includes(String(body.action))
                    || (body.expectedInstanceId !== undefined && !this.isUuid(body.expectedInstanceId))) {
                    throw invalid();
                }
                if (!request) {
                    if (!this.isUuid(body.instanceId) || !integer(body.templateId, 1, 0x7fffffff)) {
                        throw invalid();
                    }
                    return;
                }
                if ((body.action !== "ACTIVATE" && !this.isUuid(body.instanceId))
                    || (body.instanceId !== undefined && !this.isUuid(body.instanceId))
                    || (body.targetTemplateId !== undefined && !integer(body.targetTemplateId, 1, 0x7fffffff))) {
                    throw invalid();
                }
                for (const field of ["materialInstanceIds", "materialHeroIds", "replacementItemIds"]) {
                    const values = body[field];
                    if (values !== undefined && (!Array.isArray(values) || values.length > 12
                        || !values.every(value => field === "replacementItemIds"
                            ? integer(value, 1, 0x7fffffff) : this.isUuid(value)))) {
                        throw invalid();
                    }
                }
                return;
        }
    }

    /** 合成、材料返还与探宝只返回已确认的配置号和数量。 */
    private static validGrowthAmounts(value: unknown, idKey = "itemId"): boolean {
        return Array.isArray(value) && value.every(entry => {
            const row = this.messageObject(entry);
            return Number.isSafeInteger(row[idKey]) && Number(row[idKey]) > 0
                && Number.isSafeInteger(row.quantity) && Number(row.quantity) > 0;
        });
    }

    /** 普通装备请求仅传选择和原槽配置，成功回执保留这些参数且不携带资产写入数据。 */
    private static validateEquipmentChange(frame: GameFrame): void {
        if (frame.name !== Protocol.HERO_EQUIPMENT_CHANGE) {
            return;
        }
        if (typeof frame.id !== "string" || !frame.id) {
            throw new Error("装备变更信封缺少请求关联");
        }
        if (frame.kind === "response" && frame.ok === false) {
            if (frame.error === undefined || frame.body != null) {
                throw new Error("装备变更失败回包无效");
            }
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const { requestId, heroId, action, equipmentId, slot, expectedTemplateId } = body;
        if (!GameProtocolCodecUtils.isUuid(requestId) || !GameProtocolCodecUtils.isUuid(heroId)
            || (action !== "EQUIP" && action !== "UNEQUIP" && action !== "EQUIP_ALL" && action !== "UNEQUIP_ALL")) {
            throw new Error("装备变更请求编号、英雄或操作无效");
        }
        const request = frame.kind === "request";
        const validUnused = (value: unknown) => value === undefined || (!request && value === 0);
        const single = action === "EQUIP" || action === "UNEQUIP";
        if ((single ? !GameProtocolCodecUtils.isEquipmentIdentity(equipmentId) : equipmentId !== undefined)
            || (action === "UNEQUIP"
                ? typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 4
                    || typeof expectedTemplateId !== "number" || !Number.isInteger(expectedTemplateId)
                    || expectedTemplateId < 1 || expectedTemplateId > 0x7fffffff
                : !validUnused(slot) || !validUnused(expectedTemplateId))) {
            throw new Error("装备变更实例、槽位或原配置无效");
        }
        if (request) {
            if (frame.error !== undefined || frame.ok !== undefined
                || Object.keys(body).some(key => !["requestId", "heroId", "action", "equipmentId", "slot",
                    "expectedTemplateId"].includes(key))) {
                throw new Error("装备变更请求包含额外字段");
            }
            return;
        }
        if (frame.kind !== "response" || frame.ok !== true || frame.error !== undefined
            || !GameProtocolCodecUtils.isEquipmentIdentity(body.roleId)
            || typeof body.changed !== "boolean" || typeof body.assetRevision !== "number"
            || !Number.isSafeInteger(body.assetRevision) || body.assetRevision < (body.changed ? 1 : 0)) {
            throw new Error("装备变更回执状态或归属无效");
        }
    }

    /** 实例身份保持原字符串，包括旧堆叠标识和长整型数字串。 */
    private static isEquipmentIdentity(value: unknown): value is string {
        return typeof value === "string" && value.length <= 96 && !!value.trim()
            && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
    }

    /**
     * 挂机命令校验确定的请求/回执格式，不推导可领资格或执行恢复重试。
     * status的NOT_FOUND仅代表锁内查询时尚未提交，不能解释为取消成功；未知状态明确拒绝。
     */
    private static validateIdleClaim(frame: GameFrame): void {
        if (frame.name !== Protocol.CHAPTER_IDLE_CLAIM && frame.name !== Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
            return;
        }
        if (frame.kind === "response" && frame.ok === false) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        if (frame.kind === "request") {
            GameProtocolCodecUtils.validateIdleRequestId(body.requestId);
            if (frame.name === Protocol.CHAPTER_IDLE_CLAIM) {
                GameProtocolCodecUtils.validatePositiveVersion(body.expectedOperationVersion);
            }
            return;
        }
        if (frame.name === Protocol.CHAPTER_IDLE_CLAIM) {
            GameProtocolCodecUtils.validateIdleReceipt(body);
            return;
        }
        GameProtocolCodecUtils.validateIdleRequestId(body.requestId);
        if (body.status === "COMMITTED") {
            const receipt = GameProtocolCodecUtils.validateIdleReceipt(body.receipt);
            if (receipt.requestId !== body.requestId) {
                throw new Error("挂机查询回执与请求不一致");
            }
        } else if (body.status !== "NOT_FOUND" || body.receipt != null) {
            throw new Error("挂机查询状态无效");
        }
    }

    /** 校验命名载荷只携带当前方向允许的字段，名称规则仍由服务端判断。 */
    private static validateRoleName(frame: GameFrame, payload: string | null): void {
        if (payload === null || (frame.name !== Protocol.ROLE_NAME_RANDOM && frame.name !== Protocol.ROLE_NAME_SET)) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const carriesName = payload === "roleName";
        if (Object.keys(body).length !== (carriesName ? 1 : 0) || (carriesName && typeof body.nickname !== "string")) {
            throw new Error("角色命名协议载荷无效");
        }
    }

    /** 验证个人空间申请、装饰资格及称号列表的 DTO，非法列表不得局部交付。 */
    private static validateRoleProfile(frame: GameFrame, payload: string | null): void {
        const isId = (value: unknown): value is number => typeof value === "number"
            && Number.isSafeInteger(value) && value > 0 && value <= 0x7fffffff;
        switch (payload) {
            case "roleImageChange": {
                const body = this.messageObject(frame.body);
                if (Object.keys(body).length !== 1 || !isId(body.imageId)) {
                    throw new Error("角色形象变更载荷无效");
                }
                break;
            }
            case "roleRename": {
                const body = this.messageObject(frame.body);
                if (Object.keys(body).length !== 2 || typeof body.nickname !== "string"
                    || (body.paymentType !== 1 && body.paymentType !== 2)) {
                    throw new Error("角色改名载荷无效");
                }
                break;
            }
            case "roleImages": {
                const images = this.messageObject(frame.body).imageIds;
                if (!Array.isArray(images) || !images.every(isId) || new Set(images).size !== images.length) {
                    throw new Error("角色形象列表无效");
                }
                break;
            }
            case "roleTitles": {
                const titles = this.messageObject(frame.body).titles;
                if (!Array.isArray(titles)) {
                    throw new Error("角色称号列表无效");
                }
                const ids = new Set<number>();
                for (const value of titles) {
                    const title = this.messageObject(value);
                    const end = title.endTimeSeconds;
                    if (!isId(title.idx) || ids.has(title.idx)
                        || typeof end !== "number" || !Number.isSafeInteger(end) || end < -1) {
                        throw new Error("角色称号记录无效");
                    }
                    ids.add(title.idx);
                }
                break;
            }
            case "roleDecorationId": {
                const body = this.messageObject(frame.body);
                if (Object.keys(body).length !== 1 || (body.id !== 0 && !isId(body.id))) {
                    throw new Error("角色装饰变更载荷无效");
                }
                break;
            }
            case "rolePeerageDisplay": {
                const body = this.messageObject(frame.body);
                if (Object.keys(body).length !== 1 || typeof body.visible !== "boolean") {
                    throw new Error("贵重标记设置载荷无效");
                }
                break;
            }
            case "roleDecorations": {
                const { headIds, borders, totalRecharge, showPeerage } = this.messageObject(frame.body);
                if (!Array.isArray(headIds) || !headIds.every(isId) || new Set(headIds).size !== headIds.length
                    || !Array.isArray(borders) || typeof totalRecharge !== "number"
                    || !Number.isSafeInteger(totalRecharge) || totalRecharge < 0 || typeof showPeerage !== "boolean") {
                    throw new Error("角色装饰状态无效");
                }
                const ids = new Set<number>();
                for (const row of borders) {
                    const { id, expiresAtSeconds } = this.messageObject(row);
                    if ((id !== 0 && !isId(id)) || ids.has(id)
                        || (expiresAtSeconds !== -1 && !(typeof expiresAtSeconds === "number"
                            && Number.isSafeInteger(expiresAtSeconds) && expiresAtSeconds > 0))) {
                        throw new Error("角色头像框记录无效");
                    }
                    ids.add(id);
                }
                break;
            }
            default:
                break;
        }
    }

    /** 草稿战力使用有界的普通队员列表，不接受位置、战力或其他角色资料写入。 */
    private static validateFormationPower(frame: GameFrame): void {
        if (frame.name !== Protocol.FORMATION_POWER || frame.ok === false) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const ids = body.heroIds;
        const request = frame.kind === "request";
        const allowed = request ? ["requestId", "heroIds"] : ["requestId", "heroIds", "power", "assetRevision"];
        if (Object.keys(body).some(key => !allowed.includes(key))
            || !GameProtocolCodecUtils.isUuid(body.requestId) || !Array.isArray(ids) || ids.length > 6
            || ids.some(id => typeof id !== "string" || !id.length || id.length > 96)
            || new Set(ids).size !== ids.length) {
            throw new Error("阵容战力请求或队员回显无效");
        }
        if (!request && (!GameProtocolCodecUtils.isIntegerInRange(body.power, 0, 0x7fffffff)
            || !GameProtocolCodecUtils.isIntegerInRange(body.assetRevision, 0))) {
            throw new Error("阵容战力回包无效");
        }
    }

    /** 校验公会新增数值投影，缺失仍表示旧回包未同步，不能当作假零。 */
    private static validateGuildProgress(frame: GameFrame): void {
        if ((frame.name !== Protocol.GUILD_LIST && frame.name !== Protocol.GUILD_CHANGE)
            || frame.kind !== "response" || frame.ok === false) {
            return;
        }
        const state = GameProtocolCodecUtils.messageObject(frame.body);
        const inRange = GameProtocolCodecUtils.isIntegerInRange;
        const summaries = Array.isArray(state.guilds) ? state.guilds : [];
        for (const summary of state.guild === undefined ? summaries : [state.guild, ...summaries]) {
            const guild = GameProtocolCodecUtils.messageObject(summary);
            if ((guild.level !== undefined && !inRange(guild.level, 1, 0x7fffffff))
                || (guild.experience !== undefined && !inRange(guild.experience, 0, 0x7fffffff))
                || (guild.nextLevelExperience !== undefined && !inRange(guild.nextLevelExperience, 0, 0x7fffffff))) {
                throw new Error("公会等级或经验无效");
            }
        }
        for (const group of [state.members, state.applications]) {
            if (Array.isArray(group)) {
                for (const member of group) {
                    const { power } = GameProtocolCodecUtils.messageObject(member);
                    if (power !== undefined && !inRange(power, 0, 0x7fffffff)) {
                        throw new Error("公会成员战力无效");
                    }
                }
            }
        }
    }

    /** 校验任务消息、领取凭据和完整列表，避免损坏的数据进入共享任务状态。 */
    private static validateQuest(frame: GameFrame): void {
        if (frame.ok === false || (frame.name !== Protocol.QUEST_LIST && frame.name !== Protocol.QUEST_CLAIM
            && frame.name !== Protocol.QUEST_CHANGED)) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const positive = (value: unknown): boolean => GameProtocolCodecUtils.isIntegerInRange(value, 1, 0x7fffffff);
        const count = (value: unknown): boolean => GameProtocolCodecUtils.isIntegerInRange(value, 0, Number.MAX_SAFE_INTEGER);
        const title = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0 && value.length <= 300;
        if (frame.kind === "request") {
            if (frame.name === Protocol.QUEST_LIST && !Object.keys(body).length) {
                return;
            }
            if (frame.name !== Protocol.QUEST_CLAIM || !GameProtocolCodecUtils.isUuid(body.requestId)
                || !["DAILY", "ACHIEVEMENT", "MILESTONE"].includes(String(body.kind)) || !positive(body.id)
                || !count(body.resetAt) || Object.keys(body).some(key => !["requestId", "kind", "id", "resetAt"].includes(key))) {
                throw new Error("任务领取请求无效");
            }
            return;
        }
        if (frame.kind === "event") {
            if (!GameProtocolCodecUtils.validQuestRows(body.completed, 128, row => title(row.title))) {
                throw new Error("成就完成通知无效");
            }
            return;
        }
        if (frame.name === Protocol.QUEST_CLAIM && !GameProtocolCodecUtils.isUuid(body.requestId)) {
            throw new Error("任务领取回执编号无效");
        }
        const snapshot = frame.name === Protocol.QUEST_CLAIM ? GameProtocolCodecUtils.messageObject(body.snapshot) : body;
        const rewardRow = (row: Record<string, unknown>): boolean => typeof row.claimed === "boolean"
            && Array.isArray(row.rewards) && row.rewards.length <= 16 && row.rewards.every(value => {
                const reward = GameProtocolCodecUtils.messageObject(value);
                return positive(reward.itemId) && count(reward.quantity) && Number(reward.quantity) > 0;
            });
        const taskRow = (row: Record<string, unknown>): boolean => rewardRow(row) && title(row.title)
            && count(row.current) && count(row.target) && Number(row.target) > 0
            && typeof row.destination === "string" && /^[a-z0-9_-]{0,64}$/.test(row.destination);
        if (!count(snapshot.resetAt) || !count(snapshot.activityPoints)
            || !GameProtocolCodecUtils.validQuestRows(snapshot.daily, 128, taskRow)
            || !GameProtocolCodecUtils.validQuestRows(snapshot.achievements, 512, taskRow)
            || !GameProtocolCodecUtils.validQuestRows(snapshot.milestones, 16, row => positive(row.points) && rewardRow(row))) {
            throw new Error("任务快照无效");
        }
        if (body.notice !== undefined) {
            GameProtocolCodecUtils.validateRewardNotice(GameProtocolCodecUtils.messageObject(body.notice));
        }
    }

    /** 校验邮件命令和完整摘要，邮件详情只在打开回执中出现。 */
    private static validateMail(frame: GameFrame): void {
        if (frame.ok === false || (frame.name !== Protocol.MAIL_LIST && frame.name !== Protocol.MAIL_CHANGE)) {
            return;
        }
        const body = this.messageObject(frame.body);
        if (frame.kind === "request") {
            if (frame.name === Protocol.MAIL_LIST && !Object.keys(body).length) {
                return;
            }
            const single = ["OPEN", "CLAIM", "DELETE"].includes(String(body.action));
            const bulk = ["CLAIM_ALL", "DELETE_READ"].includes(String(body.action));
            if (frame.name !== Protocol.MAIL_CHANGE || !this.isUuid(body.requestId)
                || (!single && !bulk) || Object.keys(body).length !== (single ? 3 : 2)
                || (single ? !this.isUuid(body.mailId) : body.mailId !== undefined)) {
                throw new Error("邮件操作参数无效");
            }
            return;
        }
        const receipt = frame.name === Protocol.MAIL_CHANGE;
        const state = receipt ? this.messageObject(body.state) : body;
        if ((receipt && !this.isUuid(body.requestId)) || !Array.isArray(state.entries) || state.entries.length > 500) {
            throw new Error("邮件回包无效");
        }
        const entries = state.entries.map(row => this.messageObject(row));
        if (new Set(entries.map(row => row.id)).size !== entries.length || entries.some(row =>
            !this.isUuid(row.id) || typeof row.title !== "string" || row.title.length > 160
            || !this.isIntegerInRange(row.createdAt, 1) || typeof row.read !== "boolean"
            || typeof row.claimed !== "boolean" || typeof row.hasAttachments !== "boolean")) {
            throw new Error("邮件摘要无效");
        }
        if (body.detail !== undefined) {
            const detail = this.messageObject(body.detail);
            if (!this.isUuid(detail.id) || !entries.some(row => row.id === detail.id && row.read)
                || typeof detail.content !== "string" || detail.content.length > 10000
                || !Array.isArray(detail.attachments) || detail.attachments.length > 100 || detail.attachments.some(value => {
                    const reward = this.messageObject(value);
                    return !this.isIntegerInRange(reward.itemId, 1, 0x7fffffff) || !this.isIntegerInRange(reward.quantity, 1);
                })) {
                throw new Error("邮件详情无效");
            }
        }
        this.validateSocialReward(body);
    }

    /** 校验聊天范围、精确游标、发送回执和历史顺序。已读游标可超过当前可见尾部。 */
    private static validateChat(frame: GameFrame): void {
        const routes = [Protocol.CHAT_OVERVIEW, Protocol.CHAT_HISTORY, Protocol.CHAT_SEND, Protocol.CHAT_READ];
        if (frame.ok === false || !routes.some(name => name === frame.name)) {
            return;
        }
        const body = this.messageObject(frame.body);
        if (frame.name === Protocol.CHAT_OVERVIEW) {
            this.validateChatOverview(frame.kind, body);
            return;
        }
        if (frame.kind === "request") {
            this.validateChatScope(body.channel, body.peerRoleId);
            const count = Object.keys(body).filter(key => key !== "channel" && key !== "peerRoleId").length;
            const valid = frame.name === Protocol.CHAT_HISTORY
                ? count === 0 || (count === 1 && (this.chatId(body.afterId, true) || this.chatId(body.beforeId)))
                : frame.name === Protocol.CHAT_READ
                    ? count === 1 && this.chatId(body.throughId)
                    : count === 2 && this.isUuid(body.requestId) && typeof body.text === "string" && body.text.length <= 408;
            if (!valid) {
                throw new Error("聊天请求参数无效");
            }
            return;
        }
        if (frame.name === Protocol.CHAT_SEND) {
            if (!this.isUuid(body.requestId)) {
                throw new Error("聊天发送回执编号无效");
            }
            const message = this.messageObject(body.message);
            const channel = this.validateChatScope(message.channel, body.peerRoleId);
            this.validateChatMessage(message, channel);
            return;
        }
        const channel = this.validateChatScope(body.channel, body.peerRoleId);
        if (!this.chatId(body.latestId, true) || !this.chatId(body.readThroughId, true)
            || !this.isIntegerInRange(body.unreadCount, 0, 100)
            || [body.hasMore, body.hasNewer, body.canSend].some(value => typeof value !== "boolean")
            || !Array.isArray(body.messages) || body.messages.length > 100
            || (body.scopeId !== undefined && !this.validChatScopeId(body.scopeId))
            || (frame.name === Protocol.CHAT_READ && body.messages.length > 0)) {
            throw new Error("聊天记录页无效");
        }
        let previous = "0";
        for (const message of body.messages) {
            const id = this.validateChatMessage(this.messageObject(message), channel);
            if (this.chatIdOrder(id, previous) <= 0 || this.chatIdOrder(id, body.latestId) > 0) {
                throw new Error("聊天记录顺序无效");
            }
            previous = id;
        }
    }

    /** 校验页签和会话摘要；同一频道和私聊对象各只能出现一次。 */
    private static validateChatOverview(kind: string, body: Record<string, unknown>): void {
        if (kind === "request") {
            if (Object.keys(body).length !== 0) {
                throw new Error("聊天摘要请求无需参数");
            }
            return;
        }
        if (!Array.isArray(body.channels) || body.channels.length !== Object.keys(CHAT_CHANNEL_IDS).length
            || !Array.isArray(body.conversations) || body.conversations.length > 100) {
            throw new Error("聊天摘要无效");
        }
        const channels = new Set<number>();
        let privateUnread = 0;
        for (const value of body.channels) {
            const row = this.messageObject(value);
            if (!this.isChatChannel(row.channel) || channels.has(row.channel) || typeof row.available !== "boolean"
                || !this.isIntegerInRange(row.unreadCount, 0, row.channel === CHAT_CHANNEL_IDS.private ? 5000 : 100)
                || (!row.available && row.unreadCount !== 0)) {
                throw new Error("聊天频道摘要无效");
            }
            channels.add(row.channel);
            if (row.channel === CHAT_CHANNEL_IDS.private) {
                privateUnread = row.unreadCount;
            }
        }
        const roles = new Set<string>();
        let conversationUnread = 0;
        for (const value of body.conversations) {
            const row = this.messageObject(value);
            if (!this.isUuid(row.roleId) || roles.has(row.roleId) || !this.chatId(row.latestMessageId)
                || typeof row.name !== "string" || row.name.length === 0 || row.name.length > 128
                || !this.isIntegerInRange(row.level, 1) || !this.isIntegerInRange(row.avatarId, 0)
                || !this.isIntegerInRange(row.borderId, 0) || !this.isIntegerInRange(row.unreadCount, 0, 50)) {
                throw new Error("聊天私聊摘要无效");
            }
            roles.add(row.roleId);
            conversationUnread += row.unreadCount;
        }
        if (privateUnread !== conversationUnread) {
            throw new Error("聊天私聊未读数量不符");
        }
    }

    /** 校验当前业务范围；只有私聊必须携带对方角色 ID。 */
    private static validateChatScope(channel: unknown, peerRoleId: unknown): number {
        const id = channel === undefined ? CHAT_CHANNEL_IDS.world : channel;
        if (!this.isChatChannel(id)
            || (id === CHAT_CHANNEL_IDS.private ? !this.isUuid(peerRoleId) : peerRoleId !== undefined)) {
            throw new Error("聊天频道或私聊对象无效");
        }
        return id;
    }

    /** 确认协议声明的频道编号，避免把未知频道降级成世界频道。 */
    private static isChatChannel(channel: unknown): channel is number {
        return typeof channel === "number" && Object.values(CHAT_CHANNEL_IDS).some(id => id === channel);
    }

    /** 范围标识来自服务端区服、公会、分组或私聊组合键，仅用于前后比较。 */
    private static validChatScopeId(value: unknown): boolean {
        return typeof value === "string" && /^[A-Za-z0-9_:-]{1,73}$/.test(value);
    }

    /** 校验一条消息的协议身份。公告带通知编号和固定作者身份，玩家发言带真实角色 ID。 */
    private static validateChatMessage(row: Record<string, unknown>, channel: number): string {
        const notice = row.noticeId !== undefined;
        const validAuthor = notice
            ? row.roleId === "" && row.level === 0 && row.avatarId === 0 && row.borderId === 0
                && this.isIntegerInRange(row.noticeId, 1, 0xffffffff)
            : channel !== CHAT_CHANNEL_IDS.system && this.isUuid(row.roleId);
        if (!this.chatId(row.id) || (row.channel ?? CHAT_CHANNEL_IDS.world) !== channel
            || !validAuthor
            || typeof row.name !== "string" || row.name.length === 0 || row.name.length > 128
            || typeof row.text !== "string" || row.text.length === 0 || row.text.length > (notice ? 512 : 408)
            || !this.isIntegerInRange(row.avatarId, 0) || !this.isIntegerInRange(row.borderId, 0)
            || !this.isIntegerInRange(row.level, notice ? 0 : 1) || !this.isIntegerInRange(row.sentAtSeconds, 1)
            || (row.serverId !== undefined && (typeof row.serverId !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(row.serverId)))) {
            throw new Error("聊天消息无效");
        }
        return row.id;
    }

    /** 比较规范十进制字符串，保留超出 JavaScript 安全整数的服务端编号。 */
    private static chatIdOrder(left: string, right: string): number {
        return left.length - right.length || (left < right ? -1 : Number(left !== right));
    }

    /** 限制游标在有符号 64 位范围。零值只供空历史或无已读位置使用。 */
    private static chatId(value: unknown, allowZero = false): value is string {
        return typeof value === "string" && ((allowZero && value === "0")
            || (/^[1-9][0-9]{0,18}$/.test(value) && this.chatIdOrder(value, "9223372036854775807") <= 0));
    }

    /** 校验好友公开资料、四类列表及与原操作关联的礼物奖励。 */
    private static validateFriend(frame: GameFrame): void {
        if (frame.ok === false || (frame.name !== Protocol.FRIEND_STATE && frame.name !== Protocol.FRIEND_SEARCH
            && frame.name !== Protocol.FRIEND_CHANGE)) {
            return;
        }
        const body = this.messageObject(frame.body);
        const search = frame.name === Protocol.FRIEND_SEARCH;
        const change = frame.name === Protocol.FRIEND_CHANGE;
        if (frame.kind === "request") {
            if (search && Object.keys(body).length === 1 && typeof body.query === "string" && body.query.length <= 80) {
                return;
            }
            if (!search && !change && !Object.keys(body).length) {
                return;
            }
            const batch = body.action === "SEND_ALL" || body.action === "CLAIM_ALL";
            const single = ["APPLY", "ACCEPT", "REJECT", "REMOVE", "BLOCK", "UNBLOCK", "SEND", "CLAIM"].includes(String(body.action));
            if (!change || (!batch && !single) || !this.isUuid(body.requestId)
                || !this.isIntegerInRange(body.resetAt, 0) || Object.keys(body).length !== (batch ? 3 : 4)
                || (batch ? body.targetId !== undefined : !this.isUuid(body.targetId))) {
                throw new Error("好友操作参数无效");
            }
            return;
        }
        if (search) {
            if (typeof body.query !== "string" || body.query.length > 80 || !this.validFriendList(body.entries)) {
                throw new Error("好友搜索结果无效");
            }
            return;
        }
        const state = change ? this.messageObject(body.state) : body;
        if ((change && !this.isUuid(body.requestId)) || [state.friendLimit, state.blockLimit, state.sendLimit, state.resetAt]
                .some(value => !this.isIntegerInRange(value, 1))
            || !this.isIntegerInRange(state.sentToday, 0, Number(state.sendLimit)) || !this.isIntegerInRange(state.friendship, 0)
            || [state.friends, state.gifts, state.applications, state.blocked].some(list => !this.validFriendList(list))) {
            throw new Error("好友状态无效");
        }
        this.validateSocialReward(body);
    }

    /** 每种关系列表只允许同一角色出现一次；通过在线连接读取的角色信息仅用于显示。 */
    private static validFriendList(value: unknown): boolean {
        if (!Array.isArray(value) || value.length > 500) {
            return false;
        }
        const rows = value.map(entry => this.messageObject(entry));
        return new Set(rows.map(row => row.roleId)).size === rows.length && rows.every(row => this.isUuid(row.roleId)
            && typeof row.serverId === "string" && /^[a-z0-9_-]{1,32}$/i.test(row.serverId)
            && typeof row.name === "string" && row.name.length > 0 && row.name.length <= 128
            && this.isIntegerInRange(row.level, 1, 0x7fffffff) && this.isIntegerInRange(row.giftState, 0, 2)
            && [row.headId, row.borderId, row.power, row.lastLoginAt].every(field => this.isIntegerInRange(field, 0))
            && typeof row.sentToday === "boolean" && typeof row.requested === "boolean");
    }

    /** 有奖励时要求它与本次社交命令的业务请求编号一致。 */
    private static validateSocialReward(body: Record<string, unknown>): void {
        if (body.notice !== undefined && this.validateRewardNotice(body.notice).requestId !== body.requestId) {
            throw new Error("奖励与社交操作回执不符");
        }
    }

    /** 排行榜只接受现有的五种榜单和完整的展示行，点赞回执必须携带原金币反馈。 */
    private static validateRanking(frame: GameFrame): void {
        const { name, kind } = frame;
        if (frame.ok === false || (name !== Protocol.RANKING_OVERVIEW && name !== Protocol.RANKING_LIST && name !== Protocol.RANKING_LIKE)) {
            return;
        }
        const body = this.messageObject(frame.body);
        const boardKinds = ["CHAPTER", "GUILD", "POWER", "CROSS_GUILD", "CROSS_POWER"];
        const validKind = (value: unknown): boolean => typeof value === "string" && boardKinds.includes(value);
        const positive = (value: unknown): boolean => this.isIntegerInRange(value, 1, Number.MAX_SAFE_INTEGER);
        if (kind === "request") {
            const fields = name === Protocol.RANKING_OVERVIEW ? [] : name === Protocol.RANKING_LIST ? ["kind"]
                : ["kind", "requestId", "targetId", "resetAt"];
            if (Object.keys(body).length !== fields.length || Object.keys(body).some(key => !fields.includes(key))
                || (fields.length > 0 && !validKind(body.kind))
                || (name === Protocol.RANKING_LIKE && (!this.isUuid(body.requestId) || !this.isUuid(body.targetId) || !positive(body.resetAt)))) {
                throw new Error("排行榜操作参数无效");
            }
            return;
        }
        if (name === Protocol.RANKING_LIST) {
            if (!validKind(body.kind) || !Array.isArray(body.entries) || body.entries.length > 50
                || new Set(body.entries.map(entry => this.messageObject(entry).id)).size !== body.entries.length
                || body.entries.some((entry, index) => !this.validRankingEntry(entry, index + 1))
                || (body.own !== undefined && !this.validRankingEntry(body.own))) {
                throw new Error("榜单名次或条目无效");
            }
            return;
        }
        const overview = name === Protocol.RANKING_OVERVIEW ? body : this.messageObject(body.overview);
        if (!positive(overview.crossLevel) || !positive(overview.resetAt) || typeof overview.crossUnlocked !== "boolean"
            || !Array.isArray(overview.boards) || overview.boards.length > 5
            || new Set(overview.boards.map(board => this.messageObject(board).kind)).size !== overview.boards.length
            || overview.boards.some(value => {
                const row = this.messageObject(value);
                return !validKind(row.kind) || typeof row.liked !== "boolean"
                    || (!overview.crossUnlocked && String(row.kind).startsWith("CROSS_"))
                    || (row.leader !== undefined && !this.validRankingEntry(row.leader, 1));
            })) {
            throw new Error("排行总览无效");
        }
        if (name === Protocol.RANKING_LIKE) {
            const notice = this.validateRewardNotice(body.notice);
            if (!this.isUuid(body.requestId) || notice.requestId !== body.requestId || notice.mode !== "TIPS") {
                throw new Error("排行点赞回执无效");
            }
        }
    }

    /** 校验角色或公会的公开显示资料；自己未上榜时允许名次为零。 */
    private static validRankingEntry(value: unknown, expectedRank?: number): boolean {
        const entry = this.messageObject(value);
        return this.isUuid(entry.id) && typeof entry.serverId === "string" && /^[a-z0-9_-]{1,32}$/i.test(entry.serverId)
            && typeof entry.name === "string" && entry.name.trim().length > 0 && entry.name.length <= 128
            && typeof entry.leaderName === "string" && entry.leaderName.length <= 128
            && this.isIntegerInRange(entry.score, 0, Number.MAX_SAFE_INTEGER)
            && [entry.rank, entry.level, entry.headId, entry.borderId, entry.badgeId]
                .every(field => this.isIntegerInRange(field, 0, 0x7fffffff))
            && (expectedRank === undefined || entry.rank === expectedRank);
    }

    /** 各类任务编号必须为正整数，同一列表只允许一个条目使用该编号。 */
    private static validQuestRows(value: unknown, maximum: number,
        validate: (row: Record<string, unknown>) => boolean): boolean {
        if (!Array.isArray(value) || value.length > maximum) {
            return false;
        }
        const ids = new Set<unknown>();
        return value.every(entry => {
            const row = GameProtocolCodecUtils.messageObject(entry);
            if (!GameProtocolCodecUtils.isIntegerInRange(row.id, 1, 0x7fffffff) || ids.has(row.id) || !validate(row)) {
                return false;
            }
            ids.add(row.id);
            return true;
        });
    }

    /** 拒绝公会报价、贡献和排行榜中不完整或非法的字段。 */
    private static validateGuildFeature(frame: GameFrame): void {
        const shop = frame.name === Protocol.GUILD_SHOP_LIST || frame.name === Protocol.GUILD_SHOP_BUY;
        const donation = frame.name === Protocol.GUILD_DONATION_INFO || frame.name === Protocol.GUILD_DONATION_DONATE
            || frame.name === Protocol.GUILD_DONATION_CLAIM;
        const ranking = frame.name === Protocol.GUILD_RANKING;
        if ((!shop && !donation && !ranking) || frame.ok === false) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const uint = (value: unknown, min = 0): boolean => GameProtocolCodecUtils.isIntegerInRange(value, min, 0x7fffffff);
        const timestamp = (value: unknown): boolean => GameProtocolCodecUtils.isIntegerInRange(value, 1);
        const write = frame.name === Protocol.GUILD_SHOP_BUY || frame.name === Protocol.GUILD_DONATION_DONATE
            || frame.name === Protocol.GUILD_DONATION_CLAIM;
        if (frame.kind === "request" && !write) {
            if (Object.keys(body).length) {
                throw new Error("公会查询不接收额外参数");
            }
            return;
        }
        if (ranking) {
            GameProtocolCodecUtils.validateGuildRanking(body);
            return;
        }
        if (!GameProtocolCodecUtils.isUuid(body.guildId) || (write && !GameProtocolCodecUtils.isUuid(body.requestId))) {
            throw new Error("公会操作归属或编号无效");
        }
        if (!timestamp(shop ? body.resetAtSeconds : body.resetAt)) {
            throw new Error("公会刷新时间无效");
        }
        if (frame.kind === "request") {
            const fields = shop ? ["productId", "count"] : ["optionId"];
            const allowed = [...fields, "guildId", "requestId", shop ? "resetAtSeconds" : "resetAt"];
            if (Object.keys(body).some(key => !allowed.includes(key)) || fields.some(key => !uint(body[key], 1))) {
                throw new Error("公会兑换或捐献请求无效");
            }
        } else if (shop) {
            const products = body.products;
            if (!Array.isArray(products) || products.length > 100 || new Set(products.map(value => value?.productId)).size !== products.length
                || products.some(value => {
                    const row = GameProtocolCodecUtils.messageObject(value);
                    return [row.productId, row.itemId, row.quantity, row.cost, row.limit].some(n => !uint(n, 1))
                        || !uint(row.purchased) || Number(row.purchased) > Number(row.limit)
                        || typeof row.purchasable !== "boolean";
                })) {
                throw new Error("公会商店货架无效");
            }
        } else {
            GameProtocolCodecUtils.validateGuildDonation(body);
        }
    }

    /** 校验三档捐献和三档宝箱的编号、实际消耗与领取状态。 */
    private static validateGuildDonation(body: Record<string, unknown>): void {
        const uint = (value: unknown, min = 0): boolean => GameProtocolCodecUtils.isIntegerInRange(value, min, 0x7fffffff);
        const tiers = body.tiers;
        const chests = body.chests;
        if (!uint(body.level, 1) || [body.experience, body.nextLevelExperience, body.nextCapacity, body.dailyPoints].some(n => !uint(n))
            || !uint(body.donatedTier) || Number(body.donatedTier) > 3 || !Array.isArray(tiers) || tiers.length !== 3
            || !Array.isArray(chests) || chests.length !== 3) {
            throw new Error("公会捐献状态无效");
        }
        for (let index = 0; index < 3; index++) {
            const tier = GameProtocolCodecUtils.messageObject(tiers[index]);
            const chest = GameProtocolCodecUtils.messageObject(chests[index]);
            if (tier.id !== index + 1 || chest.id !== index + 1
                || [tier.costItemId, tier.costAmount, tier.medals, tier.experience, chest.points].some(n => !uint(n, 1))
                || typeof chest.claimed !== "boolean" || !Array.isArray(chest.rewards) || !chest.rewards.length
                || chest.rewards.some(value => {
                    const item = GameProtocolCodecUtils.messageObject(value);
                    return !uint(item.itemId, 1) || !GameProtocolCodecUtils.isIntegerInRange(item.quantity, 1);
                })) {
                throw new Error("公会捐献档位或宝箱奖励无效");
            }
        }
    }

    /** 榜单名次应连续且战力降序；本人行可处于榜外，榜内应与相同名次对应。 */
    private static validateGuildRanking(body: Record<string, unknown>): void {
        const entries = body.entries;
        if (!Array.isArray(entries) || entries.length > 100) {
            throw new Error("公会排行榜长度无效");
        }
        const validate = (value: unknown, rank: number): Record<string, unknown> => {
            const entry = GameProtocolCodecUtils.messageObject(value);
            if (entry.rank !== rank || !GameProtocolCodecUtils.isUuid(entry.guildId)
                || typeof entry.name !== "string" || !entry.name.length || typeof entry.serverId !== "string"
                || !entry.serverId.length || typeof entry.leaderName !== "string" || !entry.leaderName.length
                || !GameProtocolCodecUtils.isIntegerInRange(entry.badgeId, 0, 43)
                || !GameProtocolCodecUtils.isIntegerInRange(entry.power, rank > 0 ? 1 : 0)) {
                throw new Error("公会排行榜条目无效");
            }
            return entry;
        };
        let previous = Number.MAX_SAFE_INTEGER;
        const ids = new Set<unknown>();
        entries.forEach((value, index) => {
            const entry = validate(value, index + 1);
            if (Number(entry.power) > previous || ids.has(entry.guildId)) {
                throw new Error("公会排行榜顺序或公会重复");
            }
            previous = Number(entry.power);
            ids.add(entry.guildId);
        });
        if (body.own !== undefined) {
            const rank = GameProtocolCodecUtils.messageObject(body.own).rank;
            if (!GameProtocolCodecUtils.isIntegerInRange(rank, 0, entries.length)) {
                throw new Error("本公会名次无效");
            }
            const own = validate(body.own, Number(rank));
            if (rank ? entries[Number(rank) - 1].guildId !== own.guildId : ids.has(own.guildId)) {
                throw new Error("本公会名次与榜单不符");
            }
        }
    }

    /** 编码完整帧，校验各玩法指令和回执，返回可直接发送的独立 ArrayBuffer。 */
    public static encodeGameFrame(frame: GameFrame): ArrayBuffer {
        GameProtocolCodecUtils.validateIntegers(frame);
        GameProtocolCodecUtils.validateIdleClaim(frame);
        GameProtocolCodecUtils.validateRewardFrame(frame);
        GameProtocolCodecUtils.validateMilestone(frame);
        GameProtocolCodecUtils.validateProgressReward(frame);
        GameProtocolCodecUtils.validateSummon(frame);
        GameProtocolCodecUtils.validateEquipmentChange(frame);
        GameProtocolCodecUtils.validateHeroLock(frame);
        GameProtocolCodecUtils.validateHeroGrowth(frame);
        GameProtocolCodecUtils.validateMarket(frame);
        GameProtocolCodecUtils.validateBlackMarket(frame);
        GameProtocolCodecUtils.validateSmith(frame);
        GameProtocolCodecUtils.validateDailyDungeon(frame);
        GameProtocolCodecUtils.validateDreamland(frame);
        GameProtocolCodecUtils.validateTrial(frame);
        GameProtocolCodecUtils.validateProgressionBattle(frame);
        GameProtocolCodecUtils.validateQuickBattle(frame);
        GameProtocolCodecUtils.validateVip(frame);
        GameProtocolCodecUtils.validateFormationPower(frame);
        GameProtocolCodecUtils.validateGuildProgress(frame);
        GameProtocolCodecUtils.validateGuildFeature(frame);
        GameProtocolCodecUtils.validateQuest(frame);
        GameProtocolCodecUtils.validateRanking(frame);
        GameProtocolCodecUtils.validateMail(frame);
        GameProtocolCodecUtils.validateFriend(frame);
        GameProtocolCodecUtils.validateChat(frame);
        GameProtocolCodecUtils.validateArenaPanels(frame);
        HeroLevelData.validateFrame(frame);
        HeroLevelData.validateStageFrame(frame);
        const { body, ...envelope } = frame;
        const payload = GameProtocolCodecUtils.payloadName(frame);
        GameProtocolCodecUtils.validateRoleName(frame, payload);
        GameProtocolCodecUtils.validateRoleProfile(frame, payload);
        const message: Record<string, unknown> = { ...envelope };
        if (payload) {
            message[payload] = payload === "inventory" ? { items: body } : body;
        }
        const error = Frame.verify(message);
        if (error) {
            throw new Error("协议编码字段无效");
        }
        const bytes = Frame.encode(message).finish();
        if (bytes.length > GAME_FRAME_LIMIT) {
            throw new Error("协议帧超限");
        }
        const copy = new Uint8Array(bytes.length);
        copy.set(bytes);
        return copy.buffer;
    }

    /** 解码并校验二进制帧，拒绝截断、缺失字段及载荷、协议名或结算结果的错配。 */
    public static decodeGameFrame(raw: unknown): GameFrame {
        const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw)
            : raw instanceof Uint8Array ? raw : null;
        if (!bytes || !bytes.length || bytes.byteLength > GAME_FRAME_LIMIT) {
            throw new Error("协议帧无效");
        }
        const value = Frame.toObject(Frame.decode(bytes), { longs: Number, arrays: true });
        GameProtocolCodecUtils.validateIntegers(value);
        const frame = value as unknown as GameFrame;
        const expected = GameProtocolCodecUtils.payloadName(frame);
        const present = payloads.filter(key => Object.prototype.hasOwnProperty.call(value, key));
        if (present.length !== (expected ? 1 : 0) || (expected && present[0] !== expected)) {
            throw new Error("协议载荷不匹配");
        }
        if (expected) {
            const body = value[expected];
            frame.body = expected === "inventory" ? (body as {
                items: unknown;
            }).items : body;
        }
        else {
            frame.body = null;
        }
        for (const key of payloads) {
            delete value[key];
        }
        GameProtocolCodecUtils.validateIdleClaim(frame);
        GameProtocolCodecUtils.validateRewardFrame(frame);
        GameProtocolCodecUtils.validateMilestone(frame);
        GameProtocolCodecUtils.validateProgressReward(frame);
        GameProtocolCodecUtils.validateSummon(frame);
        GameProtocolCodecUtils.validateEquipmentChange(frame);
        GameProtocolCodecUtils.validateHeroLock(frame);
        GameProtocolCodecUtils.validateHeroGrowth(frame);
        GameProtocolCodecUtils.validateMarket(frame);
        GameProtocolCodecUtils.validateBlackMarket(frame);
        GameProtocolCodecUtils.validateSmith(frame);
        GameProtocolCodecUtils.validateDailyDungeon(frame);
        GameProtocolCodecUtils.validateDreamland(frame);
        GameProtocolCodecUtils.validateTrial(frame);
        GameProtocolCodecUtils.validateProgressionBattle(frame);
        GameProtocolCodecUtils.validateQuickBattle(frame);
        GameProtocolCodecUtils.validateVip(frame);
        GameProtocolCodecUtils.validateFormationPower(frame);
        GameProtocolCodecUtils.validateGuildProgress(frame);
        GameProtocolCodecUtils.validateGuildFeature(frame);
        GameProtocolCodecUtils.validateQuest(frame);
        GameProtocolCodecUtils.validateRanking(frame);
        GameProtocolCodecUtils.validateMail(frame);
        GameProtocolCodecUtils.validateFriend(frame);
        GameProtocolCodecUtils.validateChat(frame);
        GameProtocolCodecUtils.validateArenaPanels(frame);
        HeroLevelData.validateFrame(frame);
        HeroLevelData.validateStageFrame(frame);
        GameProtocolCodecUtils.validateRoleName(frame, expected);
        GameProtocolCodecUtils.validateRoleProfile(frame, expected);
        return frame;
    }
}
