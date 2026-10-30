import { isEntryOpen, isServerGateOpen } from "./gates";
import { OpenConditionRow, SystemGateRow } from "./types";

/**
 * 主城底栏和「玩法」列表。
 * gateId 对齐 opencondition.id；serverGateKey 对齐 system_gate.key。
 * 都不填表示随时可进（主城、玩法目录本身）。
 */
export interface NavEntry {
  id: string;
  title: string;
  gateId?: string;
  serverGateKey?: string;
  blurb: string;
}

export const CITY_TAB = "city";

/**
 * 导航根。召唤、铁匠铺、玩法仍算根页，方便从建筑和「玩法」列表进。
 * 画在底栏上的是 CITY_BAR，不是这一组。
 */
export const BOTTOM_TABS: NavEntry[] = [
  { id: "city", title: "主城", blurb: "主城" },
  { id: "hero", title: "英雄", gateId: "main_hero", blurb: "英雄列表、详情与升级" },
  { id: "summon", title: "召唤", gateId: "main_summon", blurb: "单抽与十连。新英雄进名册，重复转碎片" },
  { id: "smith", title: "铁匠铺", gateId: "main_smith_shop", blurb: "强化新手短剑，消耗金币和强化石" },
  { id: "plays", title: "玩法", blurb: "按主线等级或开服天开启" },
];

/**
 * 主城底栏七格：主城、英雄、背包、战斗、副本、公会、VIP。
 * 「副本」的图文件名仍是 skin（lbl-skin / spr-skin），字是副本。
 * 最右一格是日服皇冠和 VIP 字，id 仍是 fetter，避免改点击和占位页。
 * 战斗在正中，略大、略高。不使用日文文案。
 */
export const CITY_BAR: NavEntry[] = [
  { id: "city", title: "主城", blurb: "主城" },
  { id: "hero", title: "英雄", gateId: "main_hero", blurb: "英雄列表、详情与升级" },
  { id: "bag", title: "背包", gateId: "bag", blurb: "强化石、英雄碎片，以及可使用的金币袋和经验药水" },
  { id: "battle", title: "战斗", blurb: "主线战斗" },
  { id: "dungeon", title: "副本", gateId: "main_mission", blurb: "日常副本" },
  { id: "clan", title: "公会", gateId: "main_clan", blurb: "公会占位。主线 Lv18 开启。公会系统还没接。" },
  { id: "fetter", title: "VIP", gateId: "main_fetter", blurb: "VIP" },
];

/** 底栏七格在 720 宽预制上的位置。设计宽是 640。下标 3 是战斗。y 是画面中心系。 */
export function cityBarSlot(index: number): { x: number; y: number; size: number } {
  const xs = [-300, -200, -100, 0, 100, 200, 300];
  const hot = index === 3;
  return { x: xs[index] || 0, y: hot ? -548 : -562, size: hot ? 96 : 78 };
}

/** 不放底栏的系统。背包在这里，避免底栏塞不下。 */
export const PLAY_ENTRIES: NavEntry[] = [
  { id: "idle", title: "挂机", blurb: "时长、收益预览、快速作战。主城按钮也能进" },
  {
    id: "login7",
    title: "七日登录",
    blurb: "按角色登录天领七日奖励。新号第1天可进，主城按钮也能进",
  },
  {
    id: "goal7",
    title: "七日目标",
    blurb: "任务进度、前往和领奖。第7日通关第70关仍锁着，主城按钮也能进",
  },
  {
    id: "shop",
    title: "商店",
    blurb: "用金币或钻石买强化石、小金币袋和经验药水。新号可进，主城按钮也能进",
  },
  {
    id: "gift",
    title: "礼包",
    blurb: "升级有礼、每日礼包、首充和累充。模拟充值，不走真实支付。主城按钮也能进",
  },
  {
    id: "limited",
    title: "限时活动",
    blurb: "限时兑换、点石成金和限时礼包。主城按钮也能进",
  },
  { id: "bag", title: "背包", gateId: "bag", blurb: "强化石、英雄碎片，以及可使用的金币袋和经验药水" },
  { id: "fetter", title: "VIP", gateId: "main_fetter", blurb: "VIP" },
  { id: "mail", title: "邮件", gateId: "mail", blurb: "系统欢迎、开服补给和公告。主城按钮也能进" },
  { id: "arena", title: "竞技场", gateId: "main_pvp", blurb: "积分、固定对手、一键挑战。主线 Lv8" },
  { id: "wish", title: "许愿池", gateId: "main_blessingpool", blurb: "低级许愿。花金币、许愿符或钻石抽一次，主线 Lv10" },
  { id: "cafe", title: "咖啡馆", gateId: "main_cafe", blurb: "派出 1 到 2 名英雄招待，领取金币和咖啡豆。主线 Lv12" },
  { id: "daily", title: "日常副本", gateId: "main_mission", blurb: "金币副本。看剩余次数和奖励预览，主线 Lv15 开启" },
  { id: "tower", title: "幻境之塔", gateId: "main_fantasy_tower", blurb: "当前层与挑战。胜利给金币和强化石，主线 Lv16 开启" },
  {
    id: "magic",
    title: "幻魔塔",
    gateId: "magic_tower",
    serverGateKey: "magic_tower_open_day",
    blurb: "幻魔塔按开服天开启",
  },
];

const BOTTOM_IDS: { [id: string]: boolean } = {};
for (let i = 0; i < BOTTOM_TABS.length; i++) BOTTOM_IDS[BOTTOM_TABS[i].id] = true;

export interface GateSnapshot {
  opencondition: OpenConditionRow[];
  systemGate: SystemGateRow[];
}

export interface EntryAccess {
  open: boolean;
  hint: string;
}

export function findNavEntry(id: string): NavEntry | null {
  for (let i = 0; i < BOTTOM_TABS.length; i++) {
    if (BOTTOM_TABS[i].id === id) return BOTTOM_TABS[i];
  }
  for (let i = 0; i < PLAY_ENTRIES.length; i++) {
    if (PLAY_ENTRIES[i].id === id) return PLAY_ENTRIES[i];
  }
  for (let i = 0; i < CITY_BAR.length; i++) {
    if (CITY_BAR[i].id === id) return CITY_BAR[i];
  }
  return null;
}

/**
 * 未开启时仍显示按钮。hint 给 Toast。
 * 表里没有对应 id 时当作已开启，避免样例表缺行就把入口卡死。
 * 配置还没加载、又写了 gate 时先锁上。
 */
export function entryAccess(
  entry: NavEntry,
  level: number,
  openDay: number,
  db: GateSnapshot | null
): EntryAccess {
  if (!entry.gateId && !entry.serverGateKey) return { open: true, hint: "" };
  if (!db) return { open: false, hint: entry.title + "未开启，配置未加载" };
  const reasons: string[] = [];
  let blocked = false;
  if (entry.gateId) {
    const row = findOpen(db.opencondition, entry.gateId);
    if (row && !isEntryOpen(row, level, openDay)) {
      blocked = true;
      if (row.condition_type === 1 && level < row.level) reasons.push("主线达到 Lv" + row.level);
      if (row.open_server_day > 0 && openDay < row.open_server_day) reasons.push("开服第" + row.open_server_day + "天");
    }
  }
  if (entry.serverGateKey) {
    const gate = findGate(db.systemGate, entry.serverGateKey);
    if (gate && !isServerGateOpen(gate, openDay)) {
      blocked = true;
      const text = "开服第" + gate.open_server_day + "天";
      if (reasons.indexOf(text) < 0) reasons.push(text);
    }
  }
  if (!blocked) return { open: true, hint: "" };
  if (reasons.length === 0) reasons.push("尚未达到开启条件");
  return { open: false, hint: entry.title + "未开启，需要" + reasons.join("、") };
}

/** 主线等级门槛。没有这种门槛，或等级不超过 1，返回 0。底栏用它写 Lv。 */
export function entryLockLevel(entry: NavEntry, db: GateSnapshot | null): number {
  if (!entry.gateId || !db) return 0;
  const row = findOpen(db.opencondition, entry.gateId);
  if (!row || row.condition_type !== 1 || !(row.level > 1)) return 0;
  return row.level;
}

export function tabLabel(title: string, open: boolean): string {
  return open ? title : "锁·" + title;
}

/** 子页面高亮它所属的底栏。日志、主线和挂机从主城进时仍算主城。英雄详情仍算英雄。 */
export function rootTabFor(pageId: string): string {
  if (BOTTOM_IDS[pageId]) return pageId;
  if (pageId === "log" || pageId === "mainline" || pageId === "idle" || pageId === "buygold" || pageId === "achieve" || pageId === "prophet" || pageId === "jewel" || pageId === "illustrat" || pageId === "pet" || pageId === "world" || pageId === "promotion" || pageId === "firstRecharge" || pageId === "reiki" || pageId === "islands" || pageId === "totems" || pageId === "astrolabe" || pageId === "tweakCube" || pageId === "dragon" || pageId === "dragonCollection" || pageId === "titleList" || pageId === "headPortrait" || pageId === "borderData" || pageId === "fashionList" || pageId === "wornFashion" || pageId === "heroPrayer" || pageId === "petIllustrate" || pageId === "fetterData" || pageId === "fetterFashion" || pageId === "shenBin" || pageId === "occupation" || pageId === "roleShenBin" || pageId === "fetterContract" || pageId === "formation" || pageId === "lineUp" || pageId === "runningPromotion" || pageId === "towerReward" || pageId === "heroLevelResetTimes" || pageId === "signInList" || pageId === "dailyTaskList" || pageId === "dailyWelfareList" || pageId === "mouthWelfareList" || pageId === "weekendGift" || pageId === "godRelic" || pageId === "heroPalace" || pageId === "rechargeDaysB" || pageId === "timeTower" || pageId === "spaceTimeAdventure" || pageId === "magicTowerRoad" || pageId === "qiShenQi" || pageId === "zhuShenJiTan" || pageId === "midFood" || pageId === "qiuShangMingYue" || pageId === "wanShengLottery" || pageId === "heiWuMission" || pageId === "christmasGift" || pageId === "springOuting" || pageId === "christmasMission" || pageId === "magicTowerLevelRank" || pageId === "springOutingGrid") return CITY_TAB;
  if (pageId === "hero-detail") return "hero";
  return "plays";
}

/** 和页面栈对齐的名字栈。根是主城，不弹出。 */
export class NavHistory {
  private stack: string[] = [];

  reset(root = CITY_TAB): void {
    this.stack = [root];
  }

  get depth(): number {
    return this.stack.length;
  }

  get current(): string | null {
    if (this.stack.length === 0) return null;
    return this.stack[this.stack.length - 1];
  }

  push(id: string): void {
    if (this.current === id) return;
    this.stack.push(id);
  }

  pop(): string | null {
    if (this.stack.length <= 1) return null;
    return this.stack.pop() ?? null;
  }

  popTo(id: string): void {
    const index = this.stack.lastIndexOf(id);
    if (index < 0) {
      this.stack = [id];
      return;
    }
    this.stack.length = index + 1;
  }

  rootTab(): string {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (BOTTOM_IDS[this.stack[i]]) return this.stack[i];
    }
    const current = this.current;
    if (!current) return CITY_TAB;
    return rootTabFor(current);
  }
}

function findOpen(rows: OpenConditionRow[], id: string): OpenConditionRow | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return rows[i];
  }
  return null;
}

function findGate(rows: SystemGateRow[], key: string): SystemGateRow | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].key === key) return rows[i];
  }
  return null;
}
