/**
 * 英雄列表要画的格子。
 * 名册读 GameStore。元素和头像读 herotype。空间读已经解开的 s2c 4001 容量，没有才用表。
 * 这里不解字节。空名册改画图鉴，不造一个账号英雄。
 */
import { HeroProfile, heroProfile, listHeroProfiles } from "../../config/gameCatalog";
import { heroSpaceCap } from "../../config/rosterCatalog";
import { GameStore, StoreHero } from "../../core/GameStore";
import { Session } from "../../core/Session";
import { deployedHeroIds } from "../mainline/localLineup";
import { WireSession } from "../../net/WireSession";
import { WIRE_HERO_UNSYNCED_TOAST } from "../../net/protocol/wireHero";

export const HERO_LIST_COLS = 4;
export const HERO_LIST_PITCH_X = 108;
export const HERO_LIST_PITCH_Y = 112;
export const HERO_LIST_ORIGIN_X = -162;
export const HERO_LIST_ORIGIN_Y = -52;
export const HERO_ELEM_COUNT = 6;
export const HERO_FACE_FALLBACK = "ui/hero/hero-icon_spr-default";
export const HERO_LIST_UNCONFIGURED = "这一页还没有配置";

export type HeroListTab = "hero" | "book";
export type HeroCellKind = "empty" | "owned" | "locked";

export interface HeroCellModel {
  kind: HeroCellKind;
  hero: StoreHero | null;
  name: string;
  showName: boolean;
  face: string | null;
  elem: number | null;
  stars: number;
  level: number | null;
  locked: boolean;
  deployed: boolean;
}

export interface HeroListModel {
  synced: boolean;
  mode: "roster" | "book";
  capacityLine: string;
  cells: HeroCellModel[];
  emptyText: string;
  contentFloor: number;
}

/** 点格子时给玩家看的一句。锁着的是表里的名字，不是造出来的英雄。 */
export function heroCellLine(cell: HeroCellModel): string {
  if (cell.kind === "empty") return "";
  const name = cell.name || "英雄";
  if (cell.kind === "locked" || cell.locked) return name + "未获得";
  if (cell.level === null) return name;
  return name + " Lv" + cell.level;
}

export function heroCellSeat(index: number): { x: number; y: number } {
  return {
    x: HERO_LIST_ORIGIN_X + (index % HERO_LIST_COLS) * HERO_LIST_PITCH_X,
    y: HERO_LIST_ORIGIN_Y - Math.floor(index / HERO_LIST_COLS) * HERO_LIST_PITCH_Y,
  };
}

export function heroContentHeight(cellCount: number, floor: number): number {
  const rows = cellCount <= 0 ? 4 : Math.max(4, Math.ceil(cellCount / HERO_LIST_COLS));
  return Math.max(floor, rows * HERO_LIST_PITCH_Y + 20);
}

/**
 * 英雄页有名册就画名册。没有名册，或当前是图鉴，画 herotype。
 * 未同步时人数是「—」，不把预制上的 20/40 留在界面上。
 */
export function buildHeroList(tab: HeroListTab, elem: number): HeroListModel {
  const all = GameStore.heroes();
  const synced = all !== null;
  const owned = all || [];
  const capacityLine = heroCapacityLine(all);
  const showBook = tab === "book" || !synced || owned.length === 0;
  if (!showBook) {
    return {
      synced,
      mode: "roster",
      capacityLine,
      cells: pad(filterRoster(owned, elem).map(ownedCell)),
      emptyText: "",
      contentFloor: 360,
    };
  }
  const book = filterBook(elem);
  if (book.length === 0) {
    return {
      synced,
      mode: "book",
      capacityLine,
      cells: pad([]),
      emptyText: synced ? HERO_LIST_UNCONFIGURED : WIRE_HERO_UNSYNCED_TOAST,
      contentFloor: 400,
    };
  }
  return {
    synced,
    mode: "book",
    capacityLine,
    cells: pad(book.map((profile) => bookCell(profile, owned))),
    emptyText: "",
    contentFloor: 400,
  };
}

/** 空间 n/容量。null 名册的 n 是破折号。容量没带到就用 hero_space_initial。 */
export function heroCapacityLine(all: StoreHero[] | null): string {
  return "空间 " + (all ? all.length : "—") + "/" + heroSpaceShown();
}

function heroSpaceShown(): number {
  if (Session.source === "wire" && WireSession.heroCapacity !== null && WireSession.heroCapacity >= 0) {
    return WireSession.heroCapacity;
  }
  return heroSpaceCap();
}

/**
 * 元素跟 herotype。类型对不上表时才用已经解开的 s2c 4001 字段 6。
 * 0 是全部。1–5 以外不当成某一系。
 */
function elemOf(hero: StoreHero): number | null {
  const profile = heroProfile(hero.heroType);
  if (profile && profile.elem !== null && profile.elem >= 1 && profile.elem <= HERO_ELEM_COUNT - 1) return profile.elem;
  if (hero.heroId === null) return null;
  const list = WireSession.heroes;
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].heroId !== hero.heroId) continue;
    const elem = list[i].elem;
    if (elem === null || elem < 1 || elem > HERO_ELEM_COUNT - 1) return null;
    return elem;
  }
  return null;
}

function filterRoster(all: StoreHero[], elem: number): StoreHero[] {
  if (elem <= 0) return all.slice();
  const rows: StoreHero[] = [];
  for (let i = 0; i < all.length; i++) {
    if (elemOf(all[i]) === elem) rows.push(all[i]);
  }
  return rows;
}

function filterBook(elem: number): HeroProfile[] {
  const all = listHeroProfiles();
  if (elem <= 0) return all;
  const rows: HeroProfile[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].elem === elem) rows.push(all[i]);
  }
  return rows;
}

function ownedCell(hero: StoreHero): HeroCellModel {
  const profile = heroProfile(hero.heroType);
  const typed = hero.heroType !== null;
  const stars = clampStar(hero.star !== null ? hero.star : profile && profile.star !== null ? profile.star : 0);
  const deployed = deployedSet();
  return {
    kind: "owned",
    hero,
    name: hero.name || (profile ? profile.name : ""),
    showName: !typed && !!(hero.name || (profile && profile.name)),
    face: typed ? (profile && profile.icon ? profile.icon : HERO_FACE_FALLBACK) : null,
    elem: elemOf(hero),
    stars,
    level: hero.level,
    locked: false,
    deployed: hero.heroId !== null && deployed.has(hero.heroId),
  };
}

function bookCell(profile: HeroProfile, owned: StoreHero[]): HeroCellModel {
  const have = heroByType(owned, profile.type);
  if (have) return ownedCell(have);
  const elem = profile.elem !== null && profile.elem >= 1 && profile.elem <= HERO_ELEM_COUNT - 1 ? profile.elem : null;
  return {
    kind: "locked",
    hero: null,
    name: profile.name,
    showName: false,
    face: profile.icon || HERO_FACE_FALLBACK,
    elem,
    stars: clampStar(profile.star !== null ? profile.star : 0),
    level: null,
    locked: true,
    deployed: false,
  };
}

function heroByType(all: StoreHero[], type: number): StoreHero | null {
  for (let i = 0; i < all.length; i++) {
    if (all[i].heroType === type) return all[i];
  }
  return null;
}

function emptyCell(): HeroCellModel {
  return {
    kind: "empty",
    hero: null,
    name: "",
    showName: false,
    face: null,
    elem: null,
    stars: 0,
    level: null,
    locked: false,
    deployed: false,
  };
}

function pad(rows: HeroCellModel[]): HeroCellModel[] {
  const out = rows.slice();
  const shown = paddedCount(rows.length);
  while (out.length < shown) out.push(emptyCell());
  return out;
}

function paddedCount(count: number): number {
  const rows = count <= 0 ? 4 : Math.max(4, Math.ceil(count / HERO_LIST_COLS));
  return rows * HERO_LIST_COLS;
}

function deployedSet(): Set<number> {
  const set = new Set<number>();
  const ids = deployedHeroIds();
  for (let i = 0; i < ids.length; i++) set.add(ids[i]);
  return set;
}

function clampStar(value: number): number {
  if (value < 0) return 0;
  if (value > 5) return 5;
  return Math.floor(value);
}
