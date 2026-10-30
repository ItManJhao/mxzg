/**
 * 主城只读 / 系统入口的挂接约定。
 *
 * 主屏不再画红「活动」、蓝「更多」矩形。入口在 CityChrome Prefab 的 ActGroup 和 UtilityRow/BtnMore。
 * 这些按钮没有单独的列表预制，点击只打日志，不再手搓一整页按钮。底栏七项在 CityChrome / CITY_BAR，不在这里。
 * CityMap 上跟随拖动的建筑入口不在这里，不要改 CityMap 的拖动和建筑点。
 *
 * 后续只读协议新入口：
 * 一律调用 attachReadonlyCityEntry，或把一项写进下面两个数组。
 * slot 用 readonlyCitySlot：活动类（节日、福利、任务列表、礼包活动）传 "activity"；
 * 系统 / 数据类（查询、列表、主线、挂机、背包、邮件等）传 "system" 或 "more"。
 * 拿不准时传 "system"，会进「更多」。
 * 禁止再在 buildCity、主屏或顶部 place 新的矩形按钮。
 */

export type CityHubSlot = "activity" | "more";

/** 传给 readonlyCitySlot。system 与未知都进「更多」。 */
export type CityHubKind = "activity" | "system" | "more";

export type CityHubAction = "notice" | "simulateDrop";

export interface CityHubEntry {
  /** 面板按钮文案。dynamic 为 mainline 时，打开「更多」改用当前关卡文案。 */
  title: string;
  /** buildPage / openChild 的页面 id。action 入口不进 buildPage。 */
  id: string;
  slot: CityHubSlot;
  /** 文案随关卡变。只给主线。 */
  dynamic?: "mainline";
  /** 不进页面栈的主城动作。 */
  action?: CityHubAction;
}

/** PanelNav 页面 id。主屏「活动」打开这一页。 */
export const CITY_HUB_ACTIVITY_ID = "cityActivity";
/** PanelNav 页面 id。主屏「更多」打开这一页。 */
export const CITY_HUB_MORE_ID = "cityMore";

/** 主屏允许常驻的入口按钮。新只读钮不要加进这里。 */
export const CITY_SCREEN_RESIDENT_IDS = [CITY_HUB_ACTIVITY_ID, CITY_HUB_MORE_ID];

export const CITY_SCREEN_ACTIVITY = { id: CITY_HUB_ACTIVITY_ID, title: "活动", x: -160, y: -470 };
export const CITY_SCREEN_MORE = { id: CITY_HUB_MORE_ID, title: "更多", x: 160, y: -470 };

/** 主屏状态字，不是入口。 */
export const CITY_DRAG_HINT = "左右拖动地图，点建筑进入";

export const CITY_HUB_COLUMNS = 3;
export const CITY_HUB_BUTTON_W = 220;
export const CITY_HUB_BUTTON_H = 36;
export const CITY_HUB_GAP_X = 10;
export const CITY_HUB_GAP_Y = 8;
/** 第一行中心。留在顶栏下面。 */
export const CITY_HUB_TOP = 380;
/** 返回钮中心。留在底栏上面。 */
export const CITY_HUB_BACK_Y = -470;

export interface CityHubSpot {
  x: number;
  y: number;
}

/**
 * 活动面板。顺序就是列表顺序。
 * 顶部活动只读入口，以及同类节日 / 福利 / 任务 / 礼包活动。
 */
export const CITY_ACTIVITY_ENTRIES: CityHubEntry[] = [
  { title: "黑五", id: "heiWuMission", slot: "activity" },
  { title: "万圣抽奖", id: "wanShengLottery", slot: "activity" },
  { title: "约惠圣诞", id: "christmasGift", slot: "activity" },
  { title: "秋赏明月", id: "qiuShangMingYue", slot: "activity" },
  { title: "诸神祭坛", id: "zhuShenJiTan", slot: "activity" },
  { title: "斩魔之路", id: "magicTowerRoad", slot: "activity" },
  { title: "时空冒险", id: "spaceTimeAdventure", slot: "activity" },
  { title: "周末礼包", id: "weekendGift", slot: "activity" },
  { title: "每月福利列表", id: "mouthWelfareList", slot: "activity" },
  { title: "每日福利列表", id: "dailyWelfareList", slot: "activity" },
  { title: "每日任务列表", id: "dailyTaskList", slot: "activity" },
  { title: "赏月佳肴", id: "midFood", slot: "activity" },
  { title: "出游寻春", id: "springOuting", slot: "activity" },
  { title: "圣诞连线", id: "christmasMission", slot: "activity" },
  { title: "春日踏青", id: "springOutingGrid", slot: "activity" },
  { title: "关卡榜", id: "magicTowerLevelRank", slot: "activity" },
  { title: "七神器", id: "qiShenQi", slot: "activity" },
  { title: "签到列表", id: "signInList", slot: "activity" },
  { title: "进行中活动", id: "runningPromotion", slot: "activity" },
  { title: "限时活动", id: "limited", slot: "activity" },
  { title: "七日登录", id: "login7", slot: "activity" },
  { title: "七日目标", id: "goal7", slot: "activity" },
  { title: "礼包", id: "gift", slot: "activity" },
  { title: "积天豪礼2", id: "rechargeDaysB", slot: "activity" },
  { title: "超值首充", id: "firstRecharge", slot: "activity" },
  { title: "基金列表", id: "promotion", slot: "activity" },
];

/**
 * 更多面板。顺序就是列表顺序。
 * 主屏上原来那片系统 / 数据钮，含主线、挂机、背包、邮件。
 * 神迹遗物、英雄殿堂、时空魔塔是系统页，不放进活动。
 */
export const CITY_MORE_ENTRIES: CityHubEntry[] = [
  { title: "主线", id: "mainline", slot: "more", dynamic: "mainline" },
  { title: "挂机", id: "idle", slot: "more" },
  { title: "背包", id: "bag", slot: "more" },
  { title: "邮件", id: "mail", slot: "more" },
  { title: "日志", id: "log", slot: "more" },
  { title: "模拟断线", id: "net-drop", slot: "more", action: "simulateDrop" },
  { title: "商店", id: "shop", slot: "more" },
  { title: "公告", id: "notice", slot: "more", action: "notice" },
  { title: "成就记录", id: "achieve", slot: "more" },
  { title: "点金", id: "buygold", slot: "more" },
  { title: "先知召唤", id: "prophet", slot: "more" },
  { title: "英雄宝石", id: "jewel", slot: "more" },
  { title: "英雄图鉴", id: "illustrat", slot: "more" },
  { title: "宠物信息", id: "pet", slot: "more" },
  { title: "世界等级", id: "world", slot: "more" },
  { title: "灵器数据", id: "reiki", slot: "more" },
  { title: "浮空岛时间", id: "islands", slot: "more" },
  { title: "图腾信息", id: "totems", slot: "more" },
  { title: "星盘数据", id: "astrolabe", slot: "more" },
  { title: "魔方数据", id: "tweakCube", slot: "more" },
  { title: "圣龙数据", id: "dragon", slot: "more" },
  { title: "圣物图鉴", id: "dragonCollection", slot: "more" },
  { title: "称号列表", id: "titleList", slot: "more" },
  { title: "头像列表", id: "headPortrait", slot: "more" },
  { title: "头像框数据", id: "borderData", slot: "more" },
  { title: "激活皮肤列表", id: "fashionList", slot: "more" },
  { title: "穿戴皮肤英雄列表", id: "wornFashion", slot: "more" },
  { title: "英雄祈愿数据", id: "heroPrayer", slot: "more" },
  { title: "宠物图鉴", id: "petIllustrate", slot: "more" },
  { title: "羁绊数据", id: "fetterData", slot: "more" },
  { title: "羁绊皮肤", id: "fetterFashion", slot: "more" },
  { title: "神兵数据", id: "shenBin", slot: "more" },
  { title: "职级信息", id: "occupation", slot: "more" },
  { title: "神兵道具", id: "roleShenBin", slot: "more" },
  { title: "查看契约", id: "fetterContract", slot: "more" },
  { title: "查询阵法", id: "formation", slot: "more" },
  { title: "副本队列", id: "lineUp", slot: "more" },
  { title: "爬塔首通已领", id: "towerReward", slot: "more" },
  { title: "英雄等级重生次数", id: "heroLevelResetTimes", slot: "more" },
  { title: "神迹遗物", id: "godRelic", slot: "more" },
  { title: "英雄殿堂", id: "heroPalace", slot: "more" },
  { title: "时空魔塔", id: "timeTower", slot: "more" },
];

/** 活动类进「活动」，系统 / 数据 / 拿不准进「更多」。 */
export function readonlyCitySlot(kind: CityHubKind): CityHubSlot {
  if (kind === "activity") return "activity";
  return "more";
}

export function cityHubEntries(slot: CityHubSlot): CityHubEntry[] {
  if (slot === "activity") return CITY_ACTIVITY_ENTRIES;
  return CITY_MORE_ENTRIES;
}

export function isCityScreenResident(id: string): boolean {
  for (let i = 0; i < CITY_SCREEN_RESIDENT_IDS.length; i++) {
    if (CITY_SCREEN_RESIDENT_IDS[i] === id) return true;
  }
  return false;
}

/**
 * 后续只读刀的挂接点。
 * 相同 id 已在目标面板里则不重复加。
 * 不要在主屏再放一颗矩形。页面仍由 MainApp.buildPage / 原来的 open* 接。
 */
export function attachReadonlyCityEntry(entry: CityHubEntry): CityHubEntry {
  const slot = entry.slot === "activity" ? "activity" : "more";
  const next: CityHubEntry = {
    title: entry.title,
    id: entry.id,
    slot,
    dynamic: entry.dynamic,
    action: entry.action,
  };
  const list = cityHubEntries(slot);
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === next.id) return list[i];
  }
  list.push(next);
  return next;
}

/** 面板按钮中心。三列，从上往下。 */
export function cityHubSpots(count: number): CityHubSpot[] {
  const span = CITY_HUB_COLUMNS * CITY_HUB_BUTTON_W + (CITY_HUB_COLUMNS - 1) * CITY_HUB_GAP_X;
  const origin = -span / 2 + CITY_HUB_BUTTON_W / 2;
  const pitch = CITY_HUB_BUTTON_H + CITY_HUB_GAP_Y;
  const spots: CityHubSpot[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % CITY_HUB_COLUMNS;
    const row = Math.floor(i / CITY_HUB_COLUMNS);
    spots.push({
      x: origin + col * (CITY_HUB_BUTTON_W + CITY_HUB_GAP_X),
      y: CITY_HUB_TOP - row * pitch,
    });
  }
  return spots;
}

/** 最后一行要留在返回钮上面，返回钮留在底栏上面。 */
export function cityHubFits(count: number): boolean {
  if (count <= 0) return true;
  const spots = cityHubSpots(count);
  const last = spots[spots.length - 1];
  return last.y - CITY_HUB_BUTTON_H / 2 > CITY_HUB_BACK_Y + 28;
}
