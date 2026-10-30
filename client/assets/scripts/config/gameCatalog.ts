/**
 * 英雄、道具、主线关卡的展示查找。
 * Boot 读完 JSON 后由 bindConfigTables 登记。没登记时调用方保持原来的句子。
 * 不读 xlsx，不改战报里的 hp。
 */
import { bindRosterCatalog, clearRosterCatalog } from "./rosterCatalog";
import { ConfigTableFile } from "./types";

type Row = Record<string, unknown>;
type Table = ConfigTableFile<Row> | undefined;

export interface HeroSkillFace {
  id: number;
  name: string;
}

export interface HeroProfile {
  type: number;
  name: string;
  occupation: number | null;
  elem: number | null;
  star: number | null;
  skills: HeroSkillFace[];
  /** `ui/hero/hero-icon_<item_id>`。表里没有 item_id 时是 null。 */
  icon: string | null;
}

export interface HeroBaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface ItemProfile {
  idx: number;
  name: string;
  /** resources 路径，不带扩展名。对不上贴图时是 null。 */
  icon: string | null;
  /** item.rare_mark。没有这一列时是 0。 */
  rare: number;
  /** language 里的 content，去掉尖括号。没有时是空串。 */
  blurb: string;
}

export interface ChapterPlace {
  idx: number;
  chapterId: number;
  missionId: number;
  label: string;
}

export interface ChapterEnemy {
  heroType: number;
  pos: number | null;
  star: number | null;
  name: string;
  hp: number | null;
}

interface SkillLevelText {
  level: number;
  blurb: string;
}

const profiles = new Map<number, HeroProfile>();
const bases = new Map<string, HeroBaseStats>();
const items = new Map<number, ItemProfile>();
const itemTypes = new Map<number, number>();
const chapters = new Map<number, ChapterPlace>();
const chapterEnemiesByIdx = new Map<number, ChapterEnemy[]>();
/** chapter.note，和 chapterreward.idx、进战关号同一套。不是行 idx。 */
const chapterEnemiesByStage = new Map<number, ChapterEnemy[]>();
const levels = new Map<number, number>();
const occupationNames = new Map<number, string>();
const skillBooks = new Map<number, { name: string; levels: SkillLevelText[] }>();

export function clearGameCatalog(): void {
  profiles.clear();
  bases.clear();
  items.clear();
  itemTypes.clear();
  chapters.clear();
  chapterEnemiesByIdx.clear();
  chapterEnemiesByStage.clear();
  levels.clear();
  occupationNames.clear();
  skillBooks.clear();
  clearRosterCatalog();
}

/** 缺表就跳过。语言对不上的技能名写成「技能 N」，不编一句。 */
export function bindGameCatalog(tables: Map<string, ConfigTableFile<Row>>): void {
  clearGameCatalog();
  const text = languageMap(tables.get("language"));
  bindOccupations(text);
  const skillNames = skillNameMap(tables.get("heroskill"), text);
  bindHeroProfiles(tables.get("herotype"), skillNames);
  bindBases(tables.get("herobase"));
  bindItems(tables.get("item"), text);
  fillHeroIconsFromItems();
  bindChapters(tables.get("chapter"));
  bindLevels(tables.get("mainlevel"));
  bindRosterCatalog(tables);
}

export function heroProfile(heroType: number | null | undefined): HeroProfile | null {
  const type = whole(heroType);
  if (type === null) return null;
  return profiles.get(type) ?? null;
}

/**
 * language 111001–111005：战士、法师、牧师、坦克、游侠。
 * 对不上是 null，调用方写「未知」，不编职业名。
 */
export function occupationName(id: number | null | undefined): string | null {
  const key = whole(id);
  if (key === null) return null;
  return occupationNames.get(key) ?? null;
}

/**
 * heroskill 这一档的名字和说明。level 对不上时用不超过它的最高一档。
 * next 是下一档 lan_describe。没有下一档是空串。没有这条技能是 null。
 */
export function heroSkillPage(
  skillId: number | null | undefined,
  level: number | null | undefined
): { name: string; blurb: string; next: string } | null {
  const id = whole(skillId);
  if (id === null || id <= 0) return null;
  const book = skillBooks.get(id);
  if (!book) return null;
  const want = whole(level);
  let pick = 0;
  if (want !== null) {
    for (let i = 0; i < book.levels.length; i++) {
      if (book.levels[i].level <= want) pick = i;
      else break;
    }
  }
  const row = book.levels.length > 0 ? book.levels[pick] : null;
  const next = row && pick + 1 < book.levels.length ? book.levels[pick + 1] : null;
  return {
    name: book.name || "技能 " + id,
    blurb: row ? row.blurb : "",
    next: next ? next.blurb : "",
  };
}

/** 图鉴用。顺序跟 herotype 表一致，不另排。 */
export function listHeroProfiles(): HeroProfile[] {
  const out: HeroProfile[] = [];
  profiles.forEach((profile) => out.push(profile));
  return out;
}

export function heroBaseStats(heroType: number | null | undefined, star: number | null | undefined): HeroBaseStats | null {
  const type = whole(heroType);
  const starN = whole(star);
  if (type === null || starN === null) return null;
  return bases.get(type + ":" + starN) ?? null;
}

/** 先按 item_type 对 item.idx，再按 item_id。两边都对不上是 null。 */
export function itemProfile(itemType: number | null | undefined, itemId: number | null | undefined): ItemProfile | null {
  const byType = whole(itemType);
  if (byType !== null && items.has(byType)) return items.get(byType) ?? null;
  const byId = whole(itemId);
  if (byId !== null && items.has(byId)) return items.get(byId) ?? null;
  return null;
}

export function itemDisplayName(
  itemType: number | null | undefined,
  itemId: number | null | undefined,
  fallback: string
): string {
  const profile = itemProfile(itemType, itemId);
  if (profile && profile.name) return profile.name;
  return fallback;
}

/** 背包贴图在 ui/bag/backpack_<idx>。没有表内图标时是 null。 */
export function itemIconResource(itemType: number | null | undefined, itemId: number | null | undefined): string | null {
  const profile = itemProfile(itemType, itemId);
  return profile ? profile.icon : null;
}

export type BagTabKind = "equip" | "item" | "shard" | "spirit";

/** 装备 14/17/22/26，碎片 7/9，精灵 8。其余进道具。对不上表也进道具。 */
export function itemBagTab(itemType: number | null | undefined, itemId: number | null | undefined): BagTabKind {
  const type = lookupItemType(itemType, itemId);
  if (type === 14 || type === 17 || type === 22 || type === 26) return "equip";
  if (type === 7 || type === 9) return "shard";
  if (type === 8) return "spirit";
  return "item";
}

/** 金币、钻石留在顶栏，不进背包格子。 */
export function itemIsWallet(itemType: number | null | undefined, itemId: number | null | undefined): boolean {
  const type = lookupItemType(itemType, itemId);
  return type === 1 || type === 2;
}

/** chapter.idx 对上时是「第 N 章 · 第 M 关」。对不上是 null，不写成第 0 章。 */
export function chapterPlaceLabel(idx: number | null | undefined): string | null {
  const key = whole(idx);
  if (key === null || key < 1) return null;
  const place = chapters.get(key);
  return place ? place.label : null;
}

export function chapterEnemies(idx: number | null | undefined): ChapterEnemy[] {
  const key = whole(idx);
  if (key === null || key < 1) return [];
  const rows = chapterEnemiesByIdx.get(key);
  return rows ? rows.slice() : [];
}

/**
 * 这一关的守方。键是 chapter.note，和 chapterreward.idx、进战关号同一套。
 * chapter.idx 是行号：同一关有多行阵位，后面的行经常是 hero_type 0。
 * 没有这一关、或表还没绑上，返回空数组，不补别的关。
 */
export function chapterStageEnemies(stage: number | null | undefined): ChapterEnemy[] {
  const key = whole(stage);
  if (key === null || key < 1) return [];
  const rows = chapterEnemiesByStage.get(key);
  return rows ? rows.slice() : [];
}

/** mainlevel.exp。没有这一级是 null。 */
export function mainlevelExpLabel(level: number | null | undefined): string | null {
  const key = whole(level);
  if (key === null || key < 1) return null;
  const exp = levels.get(key);
  if (typeof exp !== "number") return null;
  return "等级经验 " + exp;
}

export function heroSkillText(heroType: number | null | undefined): string {
  const profile = heroProfile(heroType);
  if (!profile || profile.skills.length === 0) return "";
  const names: string[] = [];
  const n = profile.skills.length < 3 ? profile.skills.length : 3;
  for (let i = 0; i < n; i++) names.push(profile.skills[i].name);
  return names.join("/");
}

function bindHeroProfiles(table: Table, skillNames: Map<number, string>): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    if (type === null) continue;
    const note = typeof row.note === "string" ? row.note.trim() : "";
    if (!note) continue;
    const skills: HeroSkillFace[] = [];
    for (let i = 1; i <= 5; i++) {
      const id = num(row["skill_" + i]);
      if (id === null || id <= 0) continue;
      skills.push({ id, name: skillNames.get(id) || "技能 " + id });
    }
    const itemId = num(row.item_id);
    profiles.set(type, {
      type,
      name: note,
      occupation: num(row.occupation),
      elem: num(row.elem),
      star: num(row.star),
      skills,
      icon: itemId !== null && itemId > 0 ? "ui/hero/hero-icon_" + itemId : null,
    });
  }
}

function bindBases(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    const star = num(row.star);
    const hp = num(row.hp);
    const atk = num(row.atk);
    const def = num(row.def);
    const spd = num(row.spd);
    if (type === null || star === null || hp === null || atk === null || def === null || spd === null) continue;
    if (hp <= 0) continue;
    bases.set(type + ":" + star, { hp, atk, def, spd });
  }
}

function bindItems(table: Table, text: Map<string, string>): void {
  for (const row of rows(table)) {
    const idx = num(row.idx);
    if (idx === null || idx <= 0) continue;
    const type = num(row.type);
    if (type !== null) itemTypes.set(idx, type);
    const nameKey = num(row.name);
    const name = nameKey === null ? "" : text.get(String(nameKey)) || "";
    if (!name) continue;
    const iconField = typeof row.icon === "string" ? row.icon : "";
    const icon = resourceIcon(iconField, idx);
    const rare = num(row.rare_mark);
    const contentKey = num(row.content);
    const blurb = contentKey === null ? "" : plainLanguage(text.get(String(contentKey)) || "");
    items.set(idx, { idx, name, icon, rare: rare === null || rare < 0 ? 0 : rare, blurb });
  }
}

/** item_id 为 0 的英雄，用 item.idx = 类型号 上的 hero-icon/ 路径。 */
function fillHeroIconsFromItems(): void {
  profiles.forEach((profile) => {
    if (profile.icon) return;
    const item = items.get(profile.type);
    if (!item || !item.icon || item.icon.indexOf("ui/hero/hero-icon_") !== 0) return;
    profile.icon = item.icon;
  });
}

function resourceIcon(field: string, idx: number): string | null {
  if (field.indexOf("backpack/") === 0) return "ui/bag/backpack_" + idx;
  if (field.indexOf("hero-icon/") === 0) {
    const stem = field.slice("hero-icon/".length).trim();
    if (stem) return "ui/hero/hero-icon_" + stem;
  }
  return null;
}

function bindChapters(table: Table): void {
  for (const row of rows(table)) {
    const idx = num(row.idx);
    const chapterId = num(row.chapter_id);
    const missionId = num(row.mission_id);
    if (idx === null || idx < 1 || chapterId === null || missionId === null) continue;
    if (!chapters.has(idx)) {
      chapters.set(idx, {
        idx,
        chapterId,
        missionId,
        label: "第" + chapterId + "章 · 第" + missionId + "关",
      });
    }
    const heroType = num(row.hero_type);
    if (heroType === null || heroType <= 0) continue;
    const star = num(row.hero_star);
    const stats = star === null ? null : bases.get(heroType + ":" + star);
    const profile = profiles.get(heroType);
    const enemy: ChapterEnemy = {
      heroType,
      pos: num(row.pos),
      star,
      name: profile ? profile.name : "类型 " + heroType,
      hp: stats ? stats.hp : null,
    };
    const list = chapterEnemiesByIdx.get(idx) || [];
    list.push(enemy);
    chapterEnemiesByIdx.set(idx, list);
    const stage = num(row.note);
    if (stage === null || stage < 1) continue;
    const staged = chapterEnemiesByStage.get(stage) || [];
    staged.push(enemy);
    chapterEnemiesByStage.set(stage, staged);
  }
}

function bindLevels(table: Table): void {
  for (const row of rows(table)) {
    const level = num(row.level);
    const exp = num(row.exp);
    if (level === null || level < 1 || exp === null || exp < 0) continue;
    levels.set(level, exp);
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

function bindOccupations(text: Map<string, string>): void {
  for (let i = 1; i <= 5; i++) {
    const value = plainLanguage(text.get(String(111000 + i)) || "");
    if (value) occupationNames.set(i, value);
  }
}

function skillNameMap(table: Table, text: Map<string, string>): Map<number, string> {
  const grouped = new Map<number, { name: string; nameRank: number; levels: SkillLevelText[] }>();
  for (const row of rows(table)) {
    const skillId = num(row.type);
    if (skillId === null || skillId <= 0) continue;
    const level = num(row.level);
    const rank = level === null ? 9999 : level;
    let book = grouped.get(skillId);
    if (!book) {
      book = { name: "", nameRank: 9999, levels: [] };
      grouped.set(skillId, book);
    }
    const lang = num(row.lan_name);
    const name = lang === null ? "" : plainLanguage(text.get(String(lang)) || "");
    if (name && rank < book.nameRank) {
      book.name = name;
      book.nameRank = rank;
    }
    const descKey = num(row.lan_describe);
    const blurb = descKey === null ? "" : plainLanguage(text.get(String(descKey)) || "");
    if (blurb && level !== null) {
      let replaced = false;
      for (let i = 0; i < book.levels.length; i++) {
        if (book.levels[i].level === level) {
          replaced = true;
          break;
        }
      }
      if (!replaced) book.levels.push({ level, blurb });
    }
  }
  const names = new Map<number, string>();
  grouped.forEach((book, skillId) => {
    book.levels.sort((a, b) => a.level - b.level);
    if (book.name) names.set(skillId, book.name);
    if (book.name || book.levels.length > 0) skillBooks.set(skillId, { name: book.name, levels: book.levels });
  });
  return names;
}

function plainLanguage(value: string): string {
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

function lookupItemType(itemType: number | null | undefined, itemId: number | null | undefined): number | null {
  const byType = whole(itemType);
  if (byType !== null && itemTypes.has(byType)) return itemTypes.get(byType) ?? null;
  const byId = whole(itemId);
  if (byId !== null && itemTypes.has(byId)) return itemTypes.get(byId) ?? null;
  return null;
}

function whole(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}
