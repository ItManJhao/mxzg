/**
 * 图鉴、圣龙、星UP、宝石、神装，以及挂机底栏的每分钟收益。
 * 旧 Lua 不在仓库里。数字来自已导出的 JSON。
 * chapterreward.reward_base 是当前关每分钟的三项：900001 金币、900003 角色经验、900101 英雄经验。
 * 底栏 lbl_gold / lbl_exp / lbl_souls 旁边的图就是这三样。
 * system.idle_max_time 是秒，基础封顶。
 * VIP 加成在 vip 表。没有角色 VIP 等级时不把某一档乘进三格。
 * 随机掉落按 chapterreward.drop_group 经 droptrigger / dropgroup 列出可能物品，不掷随机数，也不写进三格。
 */
import { ConfigTableFile } from "./types";

type Row = Record<string, unknown>;
type Table = ConfigTableFile<Row> | undefined;

export interface IdleMinute {
  stageIdx: number;
  gold: number;
  roleExp: number;
  heroExp: number;
}

export interface StarStep {
  star: number;
  levelLimit: number;
  attackShow: number;
  hpShow: number;
  /** herostar.skill1…skill4。这一星技能槽的等级，不是技能 id。 */
  skillLevels: number[];
  cost: CostStack[];
  /** herostar.need_item。和 upstar_cost 分开。 */
  needItem: CostStack[];
}

export interface CostStack {
  itemType: number;
  num: number;
}

export interface SacrificeNeed {
  type: number;
  elem: number;
  star: number;
  num: number;
}

export interface JewelFace {
  id: number;
  place: number;
  rare: number;
  star: number;
}

export interface GodGearFace {
  id: number;
  place: number;
  rare: number;
  star: number;
  name: string;
}

export interface DragonFace {
  name: string;
  level: number;
  /**
   * 四条龙共用的图鉴标。dragon_identify-0…11 是鉴定光效，不是物种立绘。
   * 表上没有立绘列，不把光效按出现顺序安到斯摩格这四条上。
   */
  portrait: string;
}

export interface DropFace {
  itemType: number;
  min: number;
  max: number;
}

export interface VipIdleBonus {
  level: number;
  goldPct: number;
  heroExpPct: number;
  roleExpPct: number;
  /** vip.extra_idle_time，秒。 */
  extraIdleSec: number;
}

export interface RelicFace {
  kind: number;
  rare: number;
  name: string;
  feature: string;
  icon: string;
  stages: { id: number; star: number }[];
}

/** herolevel 这一级升上去要的英雄经验和金币。没有这一行是 null，不写成 0。 */
export interface HeroLevelNeed {
  level: number;
  exp: number;
  gold: number;
}

const GOLD = 900001;
const ROLE_EXP = 900003;
const HERO_EXP = 900101;

const DRAGON_PLATE = "ui/dragon/dragon_btn-illustration";

export interface ChapterStageFace {
  /** chapterreward.map，形如 map01。对不上文件名规则时是空串。 */
  map: string;
  /** chapterreward.name 对上的 language。没有时是空串。 */
  name: string;
}

interface StageBoardRow {
  idx: number;
  mode: number;
  chapterId: number;
  missionId: number;
  map: string;
  name: string;
}

/** 同一张地图上的关。顺序跟表。没有屏幕坐标。 */
export interface ChapterMapStage {
  idx: number;
  chapterId: number;
  missionId: number;
  map: string;
  name: string;
  /** chapter 表的「第 N 章 · 第 M 关」。对不上章号时仍用这两列。 */
  label: string;
}

/** chapterextrareward。gate 是通关关号，也是 chapterreward.idx。 */
export interface ChapterExtraFace {
  gate: number;
  chapter: number;
  tipImg: number;
  /** language，字体标签已去掉，%s 留给关号。 */
  tip: string;
  itemType: number;
  itemNum: number;
}

const idleByIdx = new Map<number, IdleMinute>();
const clearByIdx = new Map<number, CostStack[]>();
const dropGroupByIdx = new Map<number, number>();
const stageFaceByIdx = new Map<number, ChapterStageFace>();
const stageBoardRows: StageBoardRow[] = [];
const extraRewards: ChapterExtraFace[] = [];
const triggersByGroup = new Map<number, number[]>();
const itemsByTrigger = new Map<number, DropFace[]>();
const vipRows = new Map<number, VipIdleBonus>();
let idleMaxMs: number | null = null;
let dropEverySec: number | null = null;
let heroSpace = 300;
const starSteps = new Map<number, StarStep>();
const sacrifices = new Map<string, SacrificeNeed[]>();
const jewels: JewelFace[] = [];
const gears: GodGearFace[] = [];
const dragons: DragonFace[] = [];
const relics: RelicFace[] = [];
const levelNeeds = new Map<number, HeroLevelNeed>();

export function clearRosterCatalog(): void {
  idleByIdx.clear();
  clearByIdx.clear();
  dropGroupByIdx.clear();
  stageFaceByIdx.clear();
  stageBoardRows.length = 0;
  extraRewards.length = 0;
  triggersByGroup.clear();
  itemsByTrigger.clear();
  vipRows.clear();
  idleMaxMs = null;
  dropEverySec = null;
  heroSpace = 300;
  starSteps.clear();
  sacrifices.clear();
  jewels.length = 0;
  gears.length = 0;
  dragons.length = 0;
  relics.length = 0;
  levelNeeds.clear();
}

export function bindRosterCatalog(tables: Map<string, ConfigTableFile<Row>>): void {
  clearRosterCatalog();
  const text = languageMap(tables.get("language"));
  bindIdle(tables.get("chapterreward"), text);
  bindExtraRewards(tables.get("chapterextrareward"), text);
  bindDrops(tables.get("droptrigger"), tables.get("dropgroup"));
  bindSystem(tables.get("system"));
  bindVip(tables.get("vip"));
  bindStars(tables.get("herostar"));
  bindSacrifices(tables.get("herotype"));
  bindJewels(tables.get("jeweltype"));
  bindGears(tables.get("godequipment"));
  bindDragons(tables.get("dragonlevel"), text);
  bindRelics(tables.get("dragonrelic"), tables.get("item"), text);
  bindHeroLevels(tables.get("herolevel"));
}

/**
 * 当前关的地图名和地名。idx 超出表时跟收益同一套就近。
 * 表还没登记时是 null。
 */
export function chapterStageFace(stageIdx: number): ChapterStageFace | null {
  const pick = pickIdleIdx(stageIdx);
  if (pick === null) return null;
  const row = stageFaceByIdx.get(pick);
  return row ? { map: row.map, name: row.name } : null;
}

/**
 * 和当前关同一 mode、同一章、同一张 map 的关。
 * 不读 chapter.pos。那一列是阵位，不是地图上的点。
 */
export function chapterMapStages(stageIdx: number): ChapterMapStage[] {
  const pick = pickIdleIdx(stageIdx);
  if (pick === null) return [];
  let cur: StageBoardRow | null = null;
  for (let i = 0; i < stageBoardRows.length; i++) {
    if (stageBoardRows[i].idx === pick) cur = stageBoardRows[i];
  }
  if (!cur || !cur.map) return [];
  const out: ChapterMapStage[] = [];
  for (let i = 0; i < stageBoardRows.length; i++) {
    const row = stageBoardRows[i];
    if (row.mode !== cur.mode || row.chapterId !== cur.chapterId || row.map !== cur.map) continue;
    out.push({
      idx: row.idx,
      chapterId: row.chapterId,
      missionId: row.missionId,
      map: row.map,
      name: row.name,
      label: "第" + row.chapterId + "章 · 第" + row.missionId + "关",
    });
  }
  return out;
}

export function chapterExtraRewards(): ChapterExtraFace[] {
  const out: ChapterExtraFace[] = [];
  for (let i = 0; i < extraRewards.length; i++) {
    const row = extraRewards[i];
    out.push({
      gate: row.gate,
      chapter: row.chapter,
      tipImg: row.tipImg,
      tip: row.tip,
      itemType: row.itemType,
      itemNum: row.itemNum,
    });
  }
  return out;
}

/**
 * 挂机关卡名。键是 chapterreward.idx，和进战关号同一套。
 * 不读 chapter.idx。那一列前几行都是第 1 关的不同站位，拿进度去对会一直写成第 1 关。
 * 表上没有这一关时是 null，调用方再写「第 N 关」。
 */
export function chapterStageCaption(stageIdx: number): string | null {
  const place = chapterStageNumbers(stageIdx);
  if (!place) return null;
  return "第" + place.chapterId + "章 · 第" + place.missionId + "关";
}

/** 圆环里只放关号。章号留给长文案。表上没有这一关时是 null。 */
export function chapterStageNumbers(stageIdx: number): { chapterId: number; missionId: number } | null {
  const idx = Math.floor(stageIdx);
  if (!isFinite(stageIdx) || idx < 1) return null;
  for (let i = 0; i < stageBoardRows.length; i++) {
    const row = stageBoardRows[i];
    if (row.idx !== idx) continue;
    return { chapterId: row.chapterId, missionId: row.missionId };
  }
  return null;
}

/** 当前关的每分钟收益。表还没登记时是 null，调用方留原来的句子。 */
export function chapterIdleMinute(stageIdx: number): IdleMinute | null {
  const pick = pickIdleIdx(stageIdx);
  if (pick === null) return null;
  const row = idleByIdx.get(pick);
  return row ? copyMinute(row) : null;
}

/** chapterreward.first_reward。通关结算用。表还没登记时是 null。 */
export function chapterClearReward(stageIdx: number): CostStack[] | null {
  const pick = pickIdleIdx(stageIdx);
  if (pick === null) return null;
  const row = clearByIdx.get(pick);
  return row ? row.slice() : [];
}

/** system.idle_max_time，毫秒。表上没有这一项时是 null。不含 VIP extra_idle_time。 */
export function idleCapMs(): number | null {
  return idleMaxMs;
}

/** system.idle_drop_frequency，秒。表上没有这一项时是 null。 */
export function idleDropEverySec(): number | null {
  return dropEverySec;
}

/**
 * 当前关 drop_group 里的物品，按表顺序，同一 item_type 只留第一次。
 * 数量是表内 min/max，不是掷出来的结果。表还没登记时是空数组。
 */
export function chapterDrops(stageIdx: number): DropFace[] {
  const pick = pickIdleIdx(stageIdx);
  if (pick === null) return [];
  const group = dropGroupByIdx.get(pick);
  if (group === undefined) return [];
  const triggers = triggersByGroup.get(group);
  if (!triggers) return [];
  const out: DropFace[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < triggers.length; i++) {
    const items = itemsByTrigger.get(triggers[i]);
    if (!items) continue;
    for (let j = 0; j < items.length; j++) {
      const row = items[j];
      if (seen.has(row.itemType)) continue;
      seen.add(row.itemType);
      out.push({ itemType: row.itemType, min: row.min, max: row.max });
    }
  }
  return out;
}

/** vip 表这一档。没有这一级，或没传入等级，是 null。不拿 0 代替缺省等级。 */
export function vipIdleBonus(level: number | null | undefined): VipIdleBonus | null {
  const key = whole(level);
  if (key === null || key < 0) return null;
  const row = vipRows.get(key);
  if (!row) return null;
  return {
    level: row.level,
    goldPct: row.goldPct,
    heroExpPct: row.heroExpPct,
    roleExpPct: row.roleExpPct,
    extraIdleSec: row.extraIdleSec,
  };
}

/** 挂机条上的 VIP 一行。没有等级时不写百分比。 */
export function vipIdleLine(level: number | null | undefined): string {
  const row = vipIdleBonus(level);
  if (!row) return "VIP未同步";
  return (
    "VIP" +
    row.level +
    " 金币+" +
    row.goldPct +
    "% 英雄经验+" +
    row.heroExpPct +
    "% 角色经验+" +
    row.roleExpPct +
    "% 挂机+" +
    idleHours(row.extraIdleSec)
  );
}

/** system.hero_space_initial。没读到表时是 300，和旧底栏「空间 n/300」一致。 */
export function heroSpaceCap(): number {
  return heroSpace;
}

/** 当前等级升到下一级的金币和英雄经验。表上没有这一级是 null。 */
export function heroLevelNeed(level: number | null | undefined): HeroLevelNeed | null {
  const key = whole(level);
  if (key === null || key < 1) return null;
  const row = levelNeeds.get(key);
  return row ? { level: row.level, exp: row.exp, gold: row.gold } : null;
}

export function heroStarStep(star: number | null | undefined): StarStep | null {
  const key = whole(star);
  if (key === null) return null;
  const row = starSteps.get(key);
  return row
    ? {
        star: row.star,
        levelLimit: row.levelLimit,
        attackShow: row.attackShow,
        hpShow: row.hpShow,
        skillLevels: row.skillLevels.slice(),
        cost: row.cost.slice(),
        needItem: row.needItem.slice(),
      }
    : null;
}

/** herotype.to_N_star。N 是升上去的那一星。没有这条是空数组。 */
export function heroStarNeeds(heroType: number | null | undefined, targetStar: number | null | undefined): SacrificeNeed[] {
  const type = whole(heroType);
  const star = whole(targetStar);
  if (type === null || star === null) return [];
  const row = sacrifices.get(type + ":" + star);
  return row ? row.slice() : [];
}

export function listJewels(place: number): JewelFace[] {
  const out: JewelFace[] = [];
  for (let i = 0; i < jewels.length; i++) {
    if (place === 0 || jewels[i].place === place) out.push(jewels[i]);
  }
  return out;
}

export function listGodGears(place: number): GodGearFace[] {
  const out: GodGearFace[] = [];
  for (let i = 0; i < gears.length; i++) {
    if (place === 0 || gears[i].place === place) out.push(gears[i]);
  }
  return out;
}

export function listDragons(): DragonFace[] {
  return dragons.slice();
}

export function listRelics(): RelicFace[] {
  return relics.slice();
}

function bindIdle(table: Table, text: Map<string, string>): void {
  for (const row of rows(table)) {
    const idx = num(row.idx);
    if (idx === null || idx < 1) continue;
    const stacks = parseStacks(row.reward_base);
    idleByIdx.set(idx, {
      stageIdx: idx,
      gold: stackNum(stacks, GOLD),
      roleExp: stackNum(stacks, ROLE_EXP),
      heroExp: stackNum(stacks, HERO_EXP),
    });
    clearByIdx.set(idx, parseStacks(row.first_reward));
    const group = num(row.drop_group);
    if (group !== null && group > 0) dropGroupByIdx.set(idx, group);
    const map = typeof row.map === "string" && /^map\d{2}$/.test(row.map) ? row.map : "";
    const nameKey = num(row.name);
    const name = nameKey === null ? "" : plainLanguage(text.get(String(nameKey)) || "");
    stageFaceByIdx.set(idx, { map, name });
    const mode = num(row.mode_id);
    const chapterId = num(row.chapter_id);
    const missionId = num(row.mission_id);
    if (mode === null || chapterId === null || missionId === null) continue;
    stageBoardRows.push({ idx, mode, chapterId, missionId, map, name });
  }
}

function bindExtraRewards(table: Table, text: Map<string, string>): void {
  for (const row of rows(table)) {
    const gate = num(row.idx);
    const chapter = num(row.chapter);
    if (gate === null || gate < 1 || chapter === null) continue;
    const stacks = parseStacks(row.reward);
    if (stacks.length === 0) continue;
    const tipKey = num(row.tips_lang);
    const tip = tipKey === null ? "" : plainLanguage(text.get(String(tipKey)) || "");
    const tipImg = num(row.tip_img);
    extraRewards.push({
      gate,
      chapter,
      tipImg: tipImg === null ? 0 : tipImg,
      tip,
      itemType: stacks[0].itemType,
      itemNum: stacks[0].num,
    });
  }
}

function plainLanguage(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function bindDrops(triggers: Table, items: Table): void {
  for (const row of rows(triggers)) {
    const group = num(row.drop_group);
    const id = num(row.drop_trigger_id);
    if (group === null || id === null) continue;
    const list = triggersByGroup.get(group);
    if (!list) triggersByGroup.set(group, [id]);
    else if (list.indexOf(id) < 0) list.push(id);
  }
  for (const row of rows(items)) {
    const id = num(row.drop_trigger_id);
    const itemType = num(row.item_type);
    const min = num(row.item_min);
    const max = num(row.item_max);
    if (id === null || itemType === null || min === null || max === null || min < 0 || max < min) continue;
    const list = itemsByTrigger.get(id);
    const face: DropFace = { itemType, min, max };
    if (!list) itemsByTrigger.set(id, [face]);
    else list.push(face);
  }
}

function bindVip(table: Table): void {
  for (const row of rows(table)) {
    const level = num(row.vip_level);
    if (level === null || level < 0) continue;
    const gold = num(row.gold_bonus);
    const hero = num(row.heroes_exp_bonus);
    const role = num(row.charater_exp_bonus);
    const extra = num(row.extra_idle_time);
    if (gold === null || hero === null || role === null || extra === null) continue;
    vipRows.set(level, { level, goldPct: gold, heroExpPct: hero, roleExpPct: role, extraIdleSec: extra });
  }
}

function pickIdleIdx(stageIdx: number): number | null {
  if (idleByIdx.size === 0) return null;
  let idx = Math.floor(stageIdx);
  if (!isFinite(stageIdx) || idx < 1) idx = 1;
  if (idleByIdx.has(idx)) return idx;
  let best = 0;
  let lower = 0;
  idleByIdx.forEach((_row, key) => {
    if (key > best) best = key;
    if (key <= idx && key > lower) lower = key;
  });
  const pick = idx > best ? best : lower || best;
  return pick > 0 ? pick : null;
}

function bindSystem(table: Table): void {
  for (const row of rows(table)) {
    if (row.key === "idle_max_time") {
      const sec = num(row.value);
      if (sec !== null && sec > 0) idleMaxMs = sec * 1000;
    } else if (row.key === "idle_drop_frequency") {
      const sec = num(row.value);
      if (sec !== null && sec > 0) dropEverySec = sec;
    } else if (row.key === "hero_space_initial") {
      const cap = num(row.value);
      if (cap !== null && cap > 0) heroSpace = cap;
    }
  }
}

function bindStars(table: Table): void {
  for (const row of rows(table)) {
    const star = num(row.star);
    const levelLimit = num(row.level_limit);
    if (star === null || levelLimit === null) continue;
    starSteps.set(star, {
      star,
      levelLimit,
      attackShow: num(row.attack_show) ?? 0,
      hpShow: num(row.hp_show) ?? 0,
      skillLevels: [num(row.skill1) ?? 0, num(row.skill2) ?? 0, num(row.skill3) ?? 0, num(row.skill4) ?? 0],
      cost: parseStacks(row.upstar_cost),
      needItem: parseStacks(row.need_item),
    });
  }
}

function bindSacrifices(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    if (type === null) continue;
    for (let star = 5; star <= 14; star++) {
      const needs = parseNeeds(row["to_" + star + "_star"]);
      if (needs.length > 0) sacrifices.set(type + ":" + star, needs);
    }
  }
}

function bindJewels(table: Table): void {
  for (const row of rows(table)) {
    const id = num(row.jewel_type);
    const place = num(row.place);
    if (id === null || place === null) continue;
    jewels.push({
      id,
      place,
      rare: num(row.rare) ?? 0,
      star: num(row.star) ?? 0,
    });
  }
}

function bindGears(table: Table): void {
  for (const row of rows(table)) {
    const id = num(row.equipment_type);
    const place = num(row.place);
    if (id === null || place === null) continue;
    const note = typeof row.description === "string" ? row.description.trim() : "";
    gears.push({
      id,
      place,
      rare: num(row.rare) ?? 0,
      star: num(row.star) ?? 0,
      name: note,
    });
  }
}

function bindHeroLevels(table: Table): void {
  for (const row of rows(table)) {
    const level = num(row.level);
    const exp = num(row.exp_need);
    const gold = num(row.gold_need);
    if (level === null || level < 1 || exp === null || gold === null || exp < 0 || gold < 0) continue;
    levelNeeds.set(level, { level, exp, gold });
  }
}

function bindDragons(table: Table, text: Map<string, string>): void {
  const seen = new Set<string>();
  for (const row of rows(table)) {
    const nameKey = num(row.name);
    const name = nameKey === null ? "" : text.get(String(nameKey)) || "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const level = num(row.level);
    dragons.push({
      name,
      level: level === null || level < 1 ? 1 : level,
      portrait: DRAGON_PLATE,
    });
  }
}

function bindRelics(table: Table, items: Table, text: Map<string, string>): void {
  const names = new Map<number, string>();
  for (const row of rows(items)) {
    const idx = num(row.idx);
    const nameKey = num(row.name);
    if (idx === null || nameKey === null) continue;
    const name = text.get(String(nameKey)) || "";
    if (name) names.set(idx, name);
  }
  const byKind = new Map<number, RelicFace>();
  for (const row of rows(table)) {
    const id = num(row.relic_type);
    const kind = num(row.kind);
    const star = num(row.star);
    if (id === null || kind === null || star === null) continue;
    let face = byKind.get(kind);
    if (!face) {
      const featureKey = num(row.features);
      const feature = featureKey === null ? "" : plain(text.get(String(featureKey)) || "");
      face = {
        kind,
        rare: num(row.rare) ?? 0,
        name: names.get(id) || "圣物 " + id,
        feature,
        icon: "ui/bag/backpack_" + id,
        stages: [],
      };
      byKind.set(kind, face);
      relics.push(face);
    }
    face.stages.push({ id, star });
    if (star === 1) {
      face.rare = num(row.rare) ?? face.rare;
      face.icon = "ui/bag/backpack_" + id;
      const named = names.get(id);
      if (named) face.name = named;
    }
  }
}

function idleHours(sec: number): string {
  const hours = sec / 3600;
  if (!isFinite(hours) || hours <= 0) return "0小时";
  if (hours === Math.floor(hours)) return hours + "小时";
  return hours + "小时";
}

function copyMinute(row: IdleMinute): IdleMinute {
  return { stageIdx: row.stageIdx, gold: row.gold, roleExp: row.roleExp, heroExp: row.heroExp };
}

function stackNum(stacks: CostStack[], itemType: number): number {
  for (let i = 0; i < stacks.length; i++) {
    if (stacks[i].itemType === itemType) return stacks[i].num;
  }
  return 0;
}

function parseStacks(value: unknown): CostStack[] {
  const list = parseJsonArray(value);
  const out: CostStack[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const itemType = num(row.item_type);
    const count = num(row.item_num);
    if (itemType === null || count === null || count < 0) continue;
    out.push({ itemType, num: count });
  }
  return out;
}

function parseNeeds(value: unknown): SacrificeNeed[] {
  const list = parseJsonArray(value);
  const out: SacrificeNeed[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const type = num(row.type);
    const elem = num(row.elem);
    const star = num(row.star);
    const count = num(row.num);
    if (type === null || elem === null || star === null || count === null || count <= 0) continue;
    out.push({ type, elem, star, num: count });
  }
  return out;
}

function parseJsonArray(value: unknown): Row[] {
  if (typeof value !== "string" || !value.trim() || value.trim() === "[]") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const out: Row[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      if (row && typeof row === "object") out.push(row as Row);
    }
    return out;
  } catch (_err) {
    return [];
  }
}

function languageMap(table: Table): Map<string, string> {
  const text = new Map<string, string>();
  for (const row of rows(table)) {
    const key = row.key;
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (!value) continue;
    if (typeof key === "number" && isFinite(key)) text.set(String(Math.floor(key)), value);
    else if (typeof key === "string" && key.trim()) text.set(key.trim(), value);
  }
  return text;
}

function plain(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function rows(table: Table): Row[] {
  if (!table || !Array.isArray(table.rows)) return [];
  return table.rows;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

function whole(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}
