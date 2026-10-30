import { GameLog } from "./GameLog";

/**
 * Mock / 网络已经会返回的失败。
 * 数值是客户端自己的，不是旧服错误码。阶段 D 再对照。
 *
 * 未登记的业务 cmd 仍按 B4 echo（自检 echo.ping）。空 cmd 才回 UNKNOWN_CMD。
 * ok:false 但没带 code 时，展示也按未知指令。
 */
export const ErrorCode = {
  OK: 0,
  ROLE_NAME_EMPTY: 1001,
  STAGE_ID_INVALID: 1002,
  LOGIN_FAILED: 1003,
  ROLE_ENTER_FAILED: 1004,
  IDLE_EMPTY: 1005,
  HERO_NOT_FOUND: 1006,
  HERO_GOLD_SHORT: 1007,
  HERO_LEVEL_MAX: 1008,
  SUMMON_DIAMOND_SHORT: 1009,
  SUMMON_COUNT_INVALID: 1010,
  BAG_EMPTY: 1011,
  BAG_NOT_FOUND: 1012,
  BAG_NOT_ENOUGH: 1013,
  BAG_NOT_USABLE: 1014,
  BAG_COUNT_INVALID: 1015,
  BAG_HERO_MAX: 1016,
  MAIL_NOT_FOUND: 1017,
  MAIL_NO_ATTACHMENT: 1018,
  MAIL_ALREADY_CLAIMED: 1019,
  MAIL_NOTHING: 1020,
  MAIL_DELETE_BLOCKED: 1021,
  SMITH_GOLD_SHORT: 1022,
  SMITH_STONE_SHORT: 1023,
  SMITH_LEVEL_MAX: 1024,
  ARENA_NOT_FOUND: 1025,
  ARENA_NO_CHANCE: 1026,
  TOWER_NO_CHANCE: 1027,
  TOWER_CLEARED: 1028,
  DAILY_NOT_FOUND: 1029,
  DAILY_NO_CHANCE: 1030,
  LOGIN7_NOT_FOUND: 1031,
  LOGIN7_LOCKED: 1032,
  LOGIN7_CLAIMED: 1033,
  LOGIN7_MAX: 1034,
  GOAL7_NOT_FOUND: 1035,
  GOAL7_LOCKED: 1036,
  GOAL7_INCOMPLETE: 1037,
  GOAL7_CLAIMED: 1038,
  SHOP_NOT_FOUND: 1039,
  SHOP_SOLD_OUT: 1040,
  SHOP_GOLD_SHORT: 1041,
  SHOP_DIAMOND_SHORT: 1042,
  WISH_PAY_INVALID: 1043,
  WISH_GOLD_SHORT: 1044,
  WISH_DIAMOND_SHORT: 1045,
  WISH_ITEM_SHORT: 1046,
  WISH_NO_CHANCE: 1047,
  CAFE_NO_HERO: 1048,
  CAFE_TOO_MANY: 1049,
  CAFE_DUPLICATE: 1050,
  CAFE_HERO_MISSING: 1051,
  CAFE_BUSY: 1052,
  CAFE_NO_CHANCE: 1053,
  CAFE_NOTHING: 1054,
  GIFT_LEVEL_NOT_FOUND: 1055,
  GIFT_LEVEL_LOCKED: 1056,
  GIFT_LEVEL_CLAIMED: 1057,
  GIFT_DAILY_BOUGHT: 1058,
  GIFT_DAILY_SHORT: 1059,
  GIFT_FIRST_DONE: 1060,
  GIFT_ACC_NOT_FOUND: 1061,
  GIFT_ACC_LOCKED: 1062,
  GIFT_ACC_CLAIMED: 1063,
  GIFT_RECHARGE_INVALID: 1064,
  LIMITED_EX_NOT_FOUND: 1065,
  LIMITED_EX_SOLD_OUT: 1066,
  LIMITED_EX_GOLD_SHORT: 1067,
  LIMITED_EX_ITEM_SHORT: 1068,
  LIMITED_STONE_NO_CHANCE: 1069,
  LIMITED_STONE_SHORT: 1070,
  LIMITED_PACK_NOT_FOUND: 1071,
  LIMITED_PACK_BOUGHT: 1072,
  LIMITED_PACK_ENDED: 1073,
  LIMITED_PACK_SHORT: 1074,
  NET_NOT_CONNECTED: 2001,
  NET_CLOSED: 2002,
  NET_TIMEOUT: 2003,
  UNKNOWN_CMD: 3001,
  REPLAY_ENDED: 3002,
  REPLAY_MISMATCH: 3003,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

const TEXT: Record<number, string> = {
  [ErrorCode.OK]: "成功",
  [ErrorCode.ROLE_NAME_EMPTY]: "角色名不能为空",
  [ErrorCode.STAGE_ID_INVALID]: "关卡编号无效",
  [ErrorCode.LOGIN_FAILED]: "登录失败",
  [ErrorCode.ROLE_ENTER_FAILED]: "进入角色失败",
  [ErrorCode.IDLE_EMPTY]: "挂机时间太短，暂无收益",
  [ErrorCode.HERO_NOT_FOUND]: "没有这名英雄",
  [ErrorCode.HERO_GOLD_SHORT]: "金币不足，无法升级",
  [ErrorCode.HERO_LEVEL_MAX]: "已达最高等级",
  [ErrorCode.SUMMON_DIAMOND_SHORT]: "钻石不足，无法召唤",
  [ErrorCode.SUMMON_COUNT_INVALID]: "召唤次数无效",
  [ErrorCode.BAG_EMPTY]: "背包是空的",
  [ErrorCode.BAG_NOT_FOUND]: "没有这个道具",
  [ErrorCode.BAG_NOT_ENOUGH]: "数量不足",
  [ErrorCode.BAG_NOT_USABLE]: "该道具不能直接使用",
  [ErrorCode.BAG_COUNT_INVALID]: "使用数量无效",
  [ErrorCode.BAG_HERO_MAX]: "英雄已满级，无法使用",
  [ErrorCode.MAIL_NOT_FOUND]: "没有这封邮件",
  [ErrorCode.MAIL_NO_ATTACHMENT]: "这封邮件没有附件",
  [ErrorCode.MAIL_ALREADY_CLAIMED]: "附件已经领取过了",
  [ErrorCode.MAIL_NOTHING]: "没有可领取的附件",
  [ErrorCode.MAIL_DELETE_BLOCKED]: "请先领取附件再删除",
  [ErrorCode.SMITH_GOLD_SHORT]: "金币不足，无法强化",
  [ErrorCode.SMITH_STONE_SHORT]: "强化石不足",
  [ErrorCode.SMITH_LEVEL_MAX]: "武器已达最高强化",
  [ErrorCode.ARENA_NOT_FOUND]: "没有这位对手",
  [ErrorCode.ARENA_NO_CHANCE]: "今日挑战次数已用完",
  [ErrorCode.TOWER_NO_CHANCE]: "今日挑战次数已用完",
  [ErrorCode.TOWER_CLEARED]: "已到达塔顶",
  [ErrorCode.DAILY_NOT_FOUND]: "没有这个难度",
  [ErrorCode.DAILY_NO_CHANCE]: "今日金币副本次数已用完",
  [ErrorCode.LOGIN7_NOT_FOUND]: "没有这一天",
  [ErrorCode.LOGIN7_LOCKED]: "这一天尚未到达",
  [ErrorCode.LOGIN7_CLAIMED]: "这一天的奖励已经领取",
  [ErrorCode.LOGIN7_MAX]: "已经是第7天",
  [ErrorCode.GOAL7_NOT_FOUND]: "没有这个目标",
  [ErrorCode.GOAL7_LOCKED]: "目标尚未开启",
  [ErrorCode.GOAL7_INCOMPLETE]: "目标尚未完成",
  [ErrorCode.GOAL7_CLAIMED]: "这个目标已经领取",
  [ErrorCode.SHOP_NOT_FOUND]: "没有这个商品",
  [ErrorCode.SHOP_SOLD_OUT]: "今日已售罄",
  [ErrorCode.SHOP_GOLD_SHORT]: "金币不足",
  [ErrorCode.SHOP_DIAMOND_SHORT]: "钻石不足",
  [ErrorCode.WISH_PAY_INVALID]: "请选择许愿方式",
  [ErrorCode.WISH_GOLD_SHORT]: "金币不足",
  [ErrorCode.WISH_DIAMOND_SHORT]: "钻石不足",
  [ErrorCode.WISH_ITEM_SHORT]: "许愿符不足",
  [ErrorCode.WISH_NO_CHANCE]: "今日许愿次数已用完",
  [ErrorCode.CAFE_NO_HERO]: "请先选择招待的英雄",
  [ErrorCode.CAFE_TOO_MANY]: "一次最多派出 2 名英雄",
  [ErrorCode.CAFE_DUPLICATE]: "请选择不同的英雄",
  [ErrorCode.CAFE_HERO_MISSING]: "没有这名英雄",
  [ErrorCode.CAFE_BUSY]: "英雄正在招待，请先领取",
  [ErrorCode.CAFE_NO_CHANCE]: "今日招待次数已用完",
  [ErrorCode.CAFE_NOTHING]: "还没有可领取的招待",
  [ErrorCode.GIFT_LEVEL_NOT_FOUND]: "没有这一档升级奖励",
  [ErrorCode.GIFT_LEVEL_LOCKED]: "主线等级不足",
  [ErrorCode.GIFT_LEVEL_CLAIMED]: "已经领取",
  [ErrorCode.GIFT_DAILY_BOUGHT]: "今日礼包已购买",
  [ErrorCode.GIFT_DAILY_SHORT]: "钻石不足",
  [ErrorCode.GIFT_FIRST_DONE]: "首充已完成",
  [ErrorCode.GIFT_ACC_NOT_FOUND]: "没有这一档累充",
  [ErrorCode.GIFT_ACC_LOCKED]: "累充未达到",
  [ErrorCode.GIFT_ACC_CLAIMED]: "已经领取",
  [ErrorCode.GIFT_RECHARGE_INVALID]: "请选择充值方式",
  [ErrorCode.LIMITED_EX_NOT_FOUND]: "没有这个兑换",
  [ErrorCode.LIMITED_EX_SOLD_OUT]: "今日已兑完",
  [ErrorCode.LIMITED_EX_GOLD_SHORT]: "金币不足",
  [ErrorCode.LIMITED_EX_ITEM_SHORT]: "兑换材料不足",
  [ErrorCode.LIMITED_STONE_NO_CHANCE]: "今日点石次数已用完",
  [ErrorCode.LIMITED_STONE_SHORT]: "钻石不足",
  [ErrorCode.LIMITED_PACK_NOT_FOUND]: "没有这个礼包",
  [ErrorCode.LIMITED_PACK_BOUGHT]: "已经购买",
  [ErrorCode.LIMITED_PACK_ENDED]: "限时礼包已结束",
  [ErrorCode.LIMITED_PACK_SHORT]: "钻石不足",
  [ErrorCode.NET_NOT_CONNECTED]: "网络未连接",
  [ErrorCode.NET_CLOSED]: "网络已断开",
  [ErrorCode.NET_TIMEOUT]: "请求超时",
  [ErrorCode.UNKNOWN_CMD]: "未知指令",
  [ErrorCode.REPLAY_ENDED]: "回放已结束",
  [ErrorCode.REPLAY_MISMATCH]: "回放指令不匹配",
};

export function errorText(code: number | undefined | null): string {
  if (typeof code === "number" && Object.prototype.hasOwnProperty.call(TEXT, code)) {
    return TEXT[code];
  }
  if (typeof code === "number") return "未知错误（" + code + "）";
  return "未知错误";
}

/** ok:false 时取出 code；没有 code 则当成未知指令。成功或非对象返回 null。 */
export function failureCode(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const body = data as { ok?: unknown; code?: unknown };
  if (body.ok !== false) return null;
  if (typeof body.code === "number" && isFinite(body.code)) return body.code;
  return ErrorCode.UNKNOWN_CMD;
}

export class GameError extends Error {
  code: number;
  detail: string;

  constructor(code: number, detail?: string) {
    super(errorText(code));
    this.name = "GameError";
    this.code = code;
    this.detail = detail ?? "";
  }
}

/** Toast 用的中文。GameError 走错误码表，其它 Error 保留原文。 */
export function messageOf(err: unknown): string {
  if (err instanceof GameError) return errorText(err.code);
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "number" && Object.prototype.hasOwnProperty.call(TEXT, code)) return errorText(code);
  }
  if (err instanceof Error && err.message) return err.message;
  return "未知错误";
}

/** 记一条失败。返回给玩家看的中文，不含 detail。 */
export function logErrorCode(tag: string, code: number, detail?: string): string {
  const text = errorText(code);
  const line = detail ? text + " (" + detail + ")" : text;
  if (code === ErrorCode.NET_CLOSED || code === ErrorCode.LOGIN_FAILED || code === ErrorCode.ROLE_ENTER_FAILED) {
    GameLog.shared.error(tag, line);
  } else {
    GameLog.shared.warn(tag, line);
  }
  return text;
}
