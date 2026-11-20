/**
 * Protobuf 信封边界：使用生成的静态代码转换二进制与已约定的消息对象。
 * 不保存会话/资产；解码只返回数据，业务合法性与会话时效仍由传输/API/Controller 校验。
 */
import { Protocol } from "./Protocol";
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
    "formationSave", "formationSaved", "battlePreview", "battlePreviewed",
    "chapterChallenge", "chapterBattleId", "chapterReceipt", "chapterReplay", "idleEncounter",
    "chapterIdleClaim", "chapterIdleClaimStatusRequest", "chapterIdleClaimReceipt", "chapterIdleClaimStatus",
    "rewardNotice",
    "chapterMilestoneClaim", "chapterMilestoneReceipt", "chapterMilestoneStatus",
    "heroFirstSummonRequest", "heroFirstSummonReceipt", "heroFirstSummonStatus",
    "chapterFirstRewardRequest", "chapterFirstRewardReceipt", "chapterFirstRewardStatus",
    "heroFragmentCombineRequest", "heroFragmentCombineStatusRequest", "heroFragmentCombineReceipt", "heroFragmentCombineStatus",
    "heroLevelUpgradeRequest", "heroLevelUpgradeStatusRequest", "heroLevelUpgradeReceipt", "heroLevelUpgradeStatus",
    "roleName", "roleImageChange", "roleRename", "roleTitles", "roleImages", "heroSummonRequest", "heroSummonReceipt",
    "roleDecorations", "roleDecorationId", "rolePeerageDisplay",
    "heroEquipmentChangeRequest", "heroEquipmentChangeReceipt",
    "marketState", "marketBuyRequest", "marketRefreshRequest", "marketReceipt",
    "dailyDungeonState", "dailyDungeonChallengeRequest", "dailyDungeonReceipt",
];
/** 无状态协议转换工具；不会持有会话、角色或网络连接。 */
export class GameProtocolCodecUtils {
    /** 仅通过静态方法使用，禁止创建实例。 */
    private constructor() { }

    /** 按方向和名称选择强类型载荷，GM 等级与关卡的请求和回执共用目标。 */
    private static payloadName(frame: GameFrame): string | null {
        if (frame.kind === "response" && frame.ok === false) {
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
        if (frame.kind === "request" && frame.name === Protocol.HERO_EQUIPMENT_CHANGE) {
            return "heroEquipmentChangeRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.MARKET_BUY) {
            return "marketBuyRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.MARKET_REFRESH) {
            return "marketRefreshRequest";
        }
        if (frame.kind === "request" && frame.name === Protocol.DAILY_DUNGEON_CHALLENGE) {
            return "dailyDungeonChallengeRequest";
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
                case Protocol.ROLE_HEAD_CHANGE:
                case Protocol.ROLE_BORDER_CHANGE:
                case Protocol.ROLE_BORDER_ACTIVATE: return "roleDecorationId";
                case Protocol.ROLE_PEERAGE_DISPLAY: return "rolePeerageDisplay";
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
                case Protocol.HERO_SUMMON: return "heroSummonReceipt";
                case Protocol.HERO_NORMAL_SUMMON:
                case Protocol.HERO_FIRST_SUMMON: return "heroFirstSummonReceipt";
                case Protocol.HERO_FIRST_SUMMON_STATUS: return "heroFirstSummonStatus";
                case Protocol.HERO_FRAGMENT_COMBINE: return "heroFragmentCombineReceipt";
                case Protocol.HERO_FRAGMENT_COMBINE_STATUS: return "heroFragmentCombineStatus";
                case Protocol.HERO_LEVEL_UPGRADE: return "heroLevelUpgradeReceipt";
                case Protocol.HERO_LEVEL_UPGRADE_STATUS: return "heroLevelUpgradeStatus";
                case Protocol.HERO_EQUIPMENT_CHANGE: return "heroEquipmentChangeReceipt";
                case Protocol.MARKET_LIST: return "marketState";
                case Protocol.MARKET_BUY:
                case Protocol.MARKET_REFRESH: return "marketReceipt";
                case Protocol.DAILY_DUNGEON_LIST: return "dailyDungeonState";
                case Protocol.DAILY_DUNGEON_CHALLENGE: return "dailyDungeonReceipt";
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
        const products = new Set<number>();
        for (const row of state.offers) {
            const offer = GameProtocolCodecUtils.messageObject(row);
            if (!integer(offer.productId, 1) || products.has(offer.productId)
                    || !integer(offer.itemId, 1) || !integer(offer.quantity, 1)
                    || !integer(offer.costItemId, 1) || !integer(offer.costQuantity, 1)
                    || !integer(offer.purchaseLimit, 1) || !integer(offer.purchased, 0, offer.purchaseLimit)
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

    /** 副本挑战只接受原请求编号、清扫选择及确认价格。成功回包校验结算、战报和发奖的对应关系。 */
    private static validateDailyDungeon(frame: GameFrame): void {
        const list = frame.name === Protocol.DAILY_DUNGEON_LIST;
        if ((!list && frame.name !== Protocol.DAILY_DUNGEON_CHALLENGE)
                || (frame.kind === "response" && frame.ok === false)) {
            return;
        }
        const body = GameProtocolCodecUtils.messageObject(frame.body);
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (frame.kind === "request") {
            const fields = list ? [] : ["requestId", "sweep", "maxDiamonds"];
            if (Object.keys(body).some(key => !fields.includes(key))
                    || (!list && (!GameProtocolCodecUtils.isUuid(body.requestId)
                        || typeof body.sweep !== "boolean" || !integer(body.maxDiamonds, 0)))) {
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
            if (replay.schemaVersion !== 1 || replay.scenario !== "dungeon:gold:" + state.stageId
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

    /** 检查副本当日计数、重置时间和原配置奖励预览，使界面只使用有效服务器状态。 */
    private static validateDailyDungeonState(state: Record<string, unknown>): void {
        const integer = GameProtocolCodecUtils.isIntegerInRange;
        if (!integer(state.stageId, 1, 0xffffffff) || !integer(state.titleLanguageId, 1, 0xffffffff)
                || !integer(state.freeLimit, 1, 0xffffffff) || !integer(state.totalLimit, state.freeLimit, 0xffffffff)
                || !integer(state.wins, 0, state.totalLimit) || !integer(state.nextCostDiamonds, 0)
                || !integer(state.resetAtSeconds, 1) || !integer(state.power, 0) || !integer(state.requiredPower, 0)
                || typeof state.cleared !== "boolean" || typeof state.unlocked !== "boolean"
                || typeof state.canChallenge !== "boolean" || (state.canChallenge && (!state.unlocked || state.wins >= state.totalLimit))
                || !Array.isArray(state.rewardPreview) || state.rewardPreview.length === 0) {
            throw new Error("副本次数、准入或预览状态无效");
        }
        for (const value of state.rewardPreview) {
            const reward = GameProtocolCodecUtils.messageObject(value);
            if (!integer(reward.itemId, 1, 0xffffffff) || !integer(reward.quantity, 1)) {
                throw new Error("副本奖励预览无效");
            }
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

    /** 编码完整帧并限制大小；返回独立 ArrayBuffer，微信小游戏可直接发送，不使用 Base64 包装。 */
    public static encodeGameFrame(frame: GameFrame): ArrayBuffer {
        GameProtocolCodecUtils.validateIntegers(frame);
        GameProtocolCodecUtils.validateIdleClaim(frame);
        GameProtocolCodecUtils.validateRewardFrame(frame);
        GameProtocolCodecUtils.validateMilestone(frame);
        GameProtocolCodecUtils.validateProgressReward(frame);
        GameProtocolCodecUtils.validateSummon(frame);
        GameProtocolCodecUtils.validateEquipmentChange(frame);
        GameProtocolCodecUtils.validateMarket(frame);
        GameProtocolCodecUtils.validateDailyDungeon(frame);
        HeroLevelData.validateFrame(frame);
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

    /** 只解码二进制帧；拒绝文本、截断数据、缺失必填字段和消息名/oneof 载荷不匹配。 */
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
        GameProtocolCodecUtils.validateMarket(frame);
        GameProtocolCodecUtils.validateDailyDungeon(frame);
        HeroLevelData.validateFrame(frame);
        GameProtocolCodecUtils.validateRoleName(frame, expected);
        GameProtocolCodecUtils.validateRoleProfile(frame, expected);
        return frame;
    }
}
