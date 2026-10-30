/**
 * 客户端这一局的角色数据。
 * 真服：WireSession 在 s2c 写入之后把同一份数抄到这里。界面读这里，不读 Mock 起步钱包。
 * Mock：仅 ?dev=mock 时 MockTransport 回包后填一份。默认运行时不走这条。
 * 刷新后真服角色在游戏服 MySQL 里，重新登录再由 s2c 灌回来。
 * 这里另存一份不含密码、不含 token 的快照，只为了 Mock 进度和登录页「上次角色」提示。
 */
import { GameLog } from "./GameLog";
import { formatWireMainline } from "../net/protocol/wireChapter";
import type { WireBagItem } from "../net/protocol/wireBag";
import type { WireBattleMatch } from "../net/protocol/wireBattle";
import type { WireHeroEntry } from "../net/protocol/wireHero";
import type { StarterLineView } from "../net/protocol/starterLineup";
import { browserPrefStore, PrefStore } from "./LoginPrefs";

export interface StoreHero {
  heroId: number | null;
  heroType: number | null;
  name: string;
  level: number | null;
  star: number | null;
  fighting: number | null;
  weaponLevel?: number;
}

export interface StoreBagItem {
  itemId: number | null;
  itemType: number | null;
  num: number | null;
}

export interface StoreSlot {
  heroId: number;
  position: number | null;
}

export type StoreSource = "empty" | "mock" | "wire";

/** 哪条协议灌进哪一格。自检和文档都看这张表。 */
export const STORE_PROTOCOLS: ReadonlyArray<{ proto: string; fields: string }> = [
  { proto: "s2c 1001", fields: "roleId。名字、等级、钱包等 2001，不把空包当成 Mock 起步号" },
  { proto: "s2c 2001", fields: "name、level、gold、diamond。缺的格子保持未同步。奖杯不进金币" },
  { proto: "s2c 3007", fields: "nowIdx、maxIdx。不写 Session.stageId" },
  { proto: "s2c 3001", fields: "最近一帧战报。主线页用它播战斗" },
  { proto: "s2c 3004", fields: "rewardTime、maxRewardTime。不改金币" },
  { proto: "s2c 4001", fields: "英雄名册。空数组是已同步的空名册" },
  { proto: "s2c 5001 / 5002", fields: "背包整表，5002 在已有表上改数量。不改钱包" },
  { proto: "s2c 3099", fields: "已解锁阵法 id" },
  { proto: "s2c 3101", fields: "MAIN 阵容。挂机站场读这里，不读 Mock 三名起步英雄" },
  { proto: "Mock role.enter 及后续回包", fields: "仅 ?dev=mock。默认运行时 GameStore 只吃 s2c" },
];

interface LineRow {
  marks: { field: number; text: string }[];
}

interface StoreState {
  source: StoreSource;
  account: string;
  serverId: number;
  roleId: number | null;
  name: string;
  nameSynced: boolean;
  level: number | null;
  gold: number | null;
  diamond: number | null;
  openDay: number | null;
  stageId: number | null;
  clearedStage: number | null;
  nowIdx: number | null;
  maxIdx: number | null;
  heroes: StoreHero[] | null;
  bag: StoreBagItem[] | null;
  lineUp: StarterLineView | null;
  unlockIds: number[] | null;
  rewardTime: number | null;
  maxRewardTime: number | null;
  idleAnchorMs: number | null;
  battle: WireBattleMatch | null;
}

export interface MockStoreFill {
  account: string;
  serverId: number;
  roleId: number;
  name: string;
  level: number;
  gold: number;
  diamond: number;
  openDay: number;
  stageId: number;
  clearedStage: number;
  idleAnchorMs: number;
  heroes: StoreHero[];
  items: { id: number; count: number }[];
}

interface RoleCache {
  v: 1;
  source: "mock" | "wire";
  account: string;
  serverId: number;
  roleId: number;
  name: string;
  level: number | null;
  gold: number | null;
  diamond: number | null;
  openDay: number | null;
  stageId: number | null;
  clearedStage: number | null;
  nowIdx: number | null;
  maxIdx: number | null;
  heroes: StoreHero[];
  bag: StoreBagItem[];
  unlockIds: number[];
  slots: StoreSlot[];
  rewardTime: number | null;
  maxRewardTime: number | null;
  idleAnchorMs: number | null;
}

const CACHE_KEY = "mxzg.roleCache";
const HERO_CAP = 80;
const BAG_CAP = 200;

function emptyState(): StoreState {
  return {
    source: "empty",
    account: "",
    serverId: 1,
    roleId: null,
    name: "",
    nameSynced: false,
    level: null,
    gold: null,
    diamond: null,
    openDay: null,
    stageId: null,
    clearedStage: null,
    nowIdx: null,
    maxIdx: null,
    heroes: null,
    bag: null,
    lineUp: null,
    unlockIds: null,
    rewardTime: null,
    maxRewardTime: null,
    idleAnchorMs: null,
    battle: null,
  };
}

export class GameStore {
  private static state: StoreState = emptyState();
  private static watchers: Array<() => void> = [];

  /** 进度写进 Store 之后马上通知挂机面板。关掉时调用返回的函数。 */
  static subscribe(listener: () => void): () => void {
    this.watchers.push(listener);
    return () => {
      const index = this.watchers.indexOf(listener);
      if (index >= 0) this.watchers.splice(index, 1);
    };
  }

  private static notify(): void {
    const list = this.watchers.slice();
    for (let i = 0; i < list.length; i++) {
      try {
        list[i]();
      } catch (err) {
        GameLog.shared.error("Store", "挂机进度没有刷新 " + (err instanceof Error ? err.message : "未知错误"));
      }
    }
  }

  static get source(): StoreSource {
    return this.state.source;
  }

  static reset(): void {
    this.state = emptyState();
  }

  /** 真服进主城或每次 s2c 落地后调用。source 不是 wire 时不动 Mock 那一份。 */
  static noteWire(input: {
    enabled: boolean;
    account: string;
    serverId: number;
    roleId: number | null;
    name: string;
    nameSynced: boolean;
    level: number | null;
    gold: number | null;
    diamond: number | null;
    nowIdx: number | null;
    maxIdx: number | null;
    heroes: WireHeroEntry[] | null;
    bag: WireBagItem[] | null;
    lineUp: { rows: LineRow[] } | null;
    unlockIds: number[] | null;
    rewardTime: number | null;
    maxRewardTime: number | null;
    battle: WireBattleMatch | null;
  }): void {
    if (!input.enabled) return;
    const next = emptyState();
    next.source = "wire";
    next.account = input.account;
    next.serverId = input.serverId;
    next.roleId = input.roleId;
    next.name = input.name;
    next.nameSynced = input.nameSynced;
    next.level = input.level;
    next.gold = input.gold;
    next.diamond = input.diamond;
    next.nowIdx = input.nowIdx;
    next.maxIdx = input.maxIdx;
    next.heroes = input.heroes ? input.heroes.slice(0, HERO_CAP).map(copyWireHero) : null;
    next.bag = input.bag ? input.bag.slice(0, BAG_CAP).map(copyWireBag) : null;
    next.lineUp = input.lineUp ? copyLine(input.lineUp) : null;
    next.unlockIds = input.unlockIds ? input.unlockIds.slice() : null;
    next.rewardTime = input.rewardTime;
    next.maxRewardTime = input.maxRewardTime;
    next.battle = input.battle;
    this.state = next;
    this.persist();
    this.notify();
  }

  /** Mock 回包之后整份替换。不拿来填真服。 */
  static fillFromMock(input: MockStoreFill): void {
    const heroes = input.heroes.slice(0, HERO_CAP).map((row) => ({
      heroId: row.heroId,
      heroType: row.heroType,
      name: row.name,
      level: row.level,
      star: row.star,
      fighting: row.fighting,
      weaponLevel: row.weaponLevel,
    }));
    const bag: StoreBagItem[] = [];
    for (let i = 0; i < input.items.length && bag.length < BAG_CAP; i++) {
      const row = input.items[i];
      bag.push({ itemId: row.id, itemType: null, num: row.count });
    }
    this.state = {
      source: "mock",
      account: input.account,
      serverId: input.serverId,
      roleId: input.roleId,
      name: input.name,
      nameSynced: true,
      level: input.level,
      gold: input.gold,
      diamond: input.diamond,
      openDay: input.openDay,
      stageId: input.stageId,
      clearedStage: input.clearedStage,
      nowIdx: null,
      maxIdx: null,
      heroes,
      bag,
      lineUp: null,
      unlockIds: null,
      rewardTime: null,
      maxRewardTime: null,
      idleAnchorMs: input.idleAnchorMs,
      battle: null,
    };
    this.persist();
    this.notify();
  }

  static mainlineLabel(): string {
    if (this.state.source === "wire") return formatWireMainline(this.state.nowIdx, this.state.maxIdx);
    if (this.state.source === "mock") {
      const stage = this.state.stageId !== null && this.state.stageId >= 1 ? this.state.stageId : 1;
      return "主线 · 第" + stage + "关";
    }
    return "主线 · 未同步";
  }

  /**
   * 本机下一关。真服返回 null，调用方继续用 3007。
   * 空仓库在 Mock 胜利写下关号之后也能读到，不把 source 改成 mock，英雄和背包仍按原来的源。
   */
  static mockStageId(): number | null {
    if (this.state.source === "wire") return null;
    if (this.state.stageId === null || this.state.stageId < 1) return null;
    return Math.floor(this.state.stageId);
  }

  /**
   * Mock 挂机胜利后写下下一关。只动 stageId / clearedStage。
   * 不改 source、英雄、背包、钱包。真服返回 false，进度只跟 s2c 3007。
   * 打过的关不倒退。
   */
  static noteMockVictory(stageId: number): { ok: boolean; next: number | null; reason: string } {
    if (this.state.source === "wire") return { ok: false, next: null, reason: "真服不在本地改关卡" };
    if (typeof stageId !== "number" || !isFinite(stageId) || stageId < 1) {
      return { ok: false, next: null, reason: "关号无效" };
    }
    const cleared = Math.floor(stageId);
    const next = cleared + 1;
    const had = this.state.clearedStage !== null && this.state.clearedStage >= 0 ? this.state.clearedStage : 0;
    if (cleared <= had) {
      const stay = this.state.stageId !== null && this.state.stageId >= 1 ? this.state.stageId : next;
      return { ok: false, next: stay, reason: "已经过了这一关" };
    }
    this.state.clearedStage = cleared;
    this.state.stageId = next;
    this.persist();
    this.notify();
    return { ok: true, next, reason: "" };
  }

  static chapter(): { fromStore: boolean; nowIdx: number | null; maxIdx: number | null } {
    if (this.state.source !== "wire") return { fromStore: false, nowIdx: null, maxIdx: null };
    return { fromStore: true, nowIdx: this.state.nowIdx, maxIdx: this.state.maxIdx };
  }

  static battle(): WireBattleMatch | null {
    if (this.state.source !== "wire") return null;
    return this.state.battle;
  }

  /**
   * 真服起点是 s2c 3004 的 rewardTime。
   * Mock 起点是 idleAnchorMs。0 和空不当成已经挂过，调用方再退回本页打开时刻。
   */
  static idle(): {
    fromStore: boolean;
    rewardTime: number | null;
    maxRewardTime: number | null;
    anchorMs: number | null;
  } {
    if (this.state.source === "wire") {
      return { fromStore: true, rewardTime: this.state.rewardTime, maxRewardTime: this.state.maxRewardTime, anchorMs: null };
    }
    const anchor = this.state.idleAnchorMs;
    const anchorMs = anchor !== null && isFinite(anchor) && anchor > 0 ? anchor : null;
    return { fromStore: false, rewardTime: null, maxRewardTime: null, anchorMs };
  }

  /**
   * 挂机站场。只有真服这份已经接上时才返回。
   * 返回 null 时调用方仍读 WireSession，Mock 预览保持原来的默认站场。
   */
  static hangRoster(): { lineUp: StarterLineView | null; heroes: StoreHero[] | null } | null {
    if (this.state.source !== "wire") return null;
    return { lineUp: this.state.lineUp, heroes: this.state.heroes };
  }

  /** 4001 / Mock 名册。null 是还没同步。空数组是已同步的空名册。 */
  static heroes(): StoreHero[] | null {
    if (!this.state.heroes) return null;
    return this.state.heroes.map(copyStoreHero);
  }

  /** 5001 / 5002 / Mock 背包。null 是还没同步。空数组是已同步的空背包。 */
  static bag(): StoreBagItem[] | null {
    if (!this.state.bag) return null;
    return this.state.bag.map(copyStoreBag);
  }

  /** 3101 MAIN。Mock 没有这份阵容时是 null。 */
  static formation(): StarterLineView | null {
    if (!this.state.lineUp) return null;
    return copyLine(this.state.lineUp);
  }

  static hintFor(account: string): string {
    const cache = loadRoleCache(browserPrefStore());
    if (!cache || cache.account !== account.trim() || !cache.roleId) return "";
    const name = cache.name || "角色 " + cache.roleId;
    if (cache.source === "wire") return "上次真服 " + name + " · 角色 " + cache.roleId + "。进入后以服务器回包为准";
    return "上次 Mock " + name + "。同账号进入会接上这份进度";
  }

  /** 给 MockGameSession.restoreClientCache。账号对不上或不是 Mock 快照时返回 null。 */
  static mockSeedFor(account: string, store: PrefStore | null = browserPrefStore()): MockStoreFill | null {
    const cache = loadRoleCache(store);
    const name = account.trim();
    if (!cache || cache.source !== "mock" || cache.account !== name || !cache.roleId) return null;
    const heroes: StoreHero[] = [];
    for (let i = 0; i < cache.heroes.length; i++) heroes.push(cache.heroes[i]);
    const items: { id: number; count: number }[] = [];
    for (let i = 0; i < cache.bag.length; i++) {
      const row = cache.bag[i];
      if (row.itemId === null || row.num === null || row.num <= 0) continue;
      items.push({ id: row.itemId, count: row.num });
    }
    return {
      account: cache.account,
      serverId: cache.serverId,
      roleId: cache.roleId,
      name: cache.name,
      level: cache.level !== null && cache.level >= 1 ? cache.level : 1,
      gold: cache.gold !== null && cache.gold >= 0 ? cache.gold : 0,
      diamond: cache.diamond !== null && cache.diamond >= 0 ? cache.diamond : 0,
      openDay: cache.openDay !== null && cache.openDay >= 1 ? cache.openDay : 1,
      stageId: cache.stageId !== null && cache.stageId >= 1 ? cache.stageId : 1,
      clearedStage: cache.clearedStage !== null && cache.clearedStage >= 0 ? cache.clearedStage : 0,
      idleAnchorMs: cache.idleAnchorMs !== null ? cache.idleAnchorMs : 0,
      heroes,
      items,
    };
  }

  private static persist(): void {
    const store = browserPrefStore();
    if (!store || this.state.roleId === null || this.state.source === "empty") return;
    const cache = toCache(this.state);
    if (!cache) return;
    saveRoleCache(cache, store);
  }
}

export function loadRoleCache(store: PrefStore | null): RoleCache | null {
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(CACHE_KEY);
  } catch (_err) {
    return null;
  }
  if (!raw) return null;
  return parseCache(raw);
}

export function saveRoleCache(cache: RoleCache, store: PrefStore | null): void {
  if (!store) return;
  try {
    store.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (_err) {
    // 配额满时下一局仍可从服务器再拉。
  }
}

function toCache(state: StoreState): RoleCache | null {
  if (state.source === "empty" || state.roleId === null) return null;
  return {
    v: 1,
    source: state.source,
    account: state.account,
    serverId: state.serverId,
    roleId: state.roleId,
    name: state.name,
    level: state.level,
    gold: state.gold,
    diamond: state.diamond,
    openDay: state.openDay,
    stageId: state.stageId,
    clearedStage: state.clearedStage,
    nowIdx: state.nowIdx,
    maxIdx: state.maxIdx,
    heroes: state.heroes ? state.heroes.slice(0, HERO_CAP) : [],
    bag: state.bag ? state.bag.slice(0, BAG_CAP) : [],
    unlockIds: state.unlockIds ? state.unlockIds.slice() : [],
    slots: slotsOf(state.lineUp),
    rewardTime: state.rewardTime,
    maxRewardTime: state.maxRewardTime,
    idleAnchorMs: state.idleAnchorMs,
  };
}

function slotsOf(lineUp: StarterLineView | null): StoreSlot[] {
  if (!lineUp) return [];
  const slots: StoreSlot[] = [];
  for (let r = 0; r < lineUp.rows.length; r++) {
    const marks = lineUp.rows[r].marks || [];
    for (let i = 0; i < marks.length; i++) {
      if (marks[i].field !== 4) continue;
      const found = /字段1=([1-9]\d*)/.exec(marks[i].text || "");
      if (!found) continue;
      const heroId = Number(found[1]);
      if (!Number.isSafeInteger(heroId) || heroId < 1) continue;
      const posMatch = /字段3=(\d+)/.exec(marks[i].text || "");
      let position: number | null = null;
      if (posMatch) {
        const pos = Number(posMatch[1]);
        if (Number.isSafeInteger(pos) && pos >= 0) position = pos;
      }
      slots.push({ heroId, position });
      if (slots.length >= 12) return slots;
    }
  }
  return slots;
}

function parseCache(raw: string): RoleCache | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (_err) {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const row = data as { [key: string]: unknown };
  if (row.v !== 1) return null;
  if (row.source !== "mock" && row.source !== "wire") return null;
  const roleId = finiteInt(row.roleId);
  if (roleId === null || roleId < 1) return null;
  const account = typeof row.account === "string" ? row.account.trim() : "";
  return {
    v: 1,
    source: row.source,
    account,
    serverId: finiteInt(row.serverId) ?? 1,
    roleId,
    name: typeof row.name === "string" ? row.name : "",
    level: nonNeg(row.level),
    gold: nonNeg(row.gold),
    diamond: nonNeg(row.diamond),
    openDay: nonNeg(row.openDay),
    stageId: nonNeg(row.stageId),
    clearedStage: nonNeg(row.clearedStage),
    nowIdx: nonNeg(row.nowIdx),
    maxIdx: nonNeg(row.maxIdx),
    heroes: parseHeroes(row.heroes),
    bag: parseBag(row.bag),
    unlockIds: parseInts(row.unlockIds),
    slots: [],
    rewardTime: nonNeg(row.rewardTime),
    maxRewardTime: nonNeg(row.maxRewardTime),
    idleAnchorMs: nonNeg(row.idleAnchorMs),
  };
}

function parseHeroes(raw: unknown): StoreHero[] {
  if (!Array.isArray(raw)) return [];
  const out: StoreHero[] = [];
  for (let i = 0; i < raw.length && out.length < HERO_CAP; i++) {
    const row = raw[i] as { [key: string]: unknown } | null;
    if (!row) continue;
    const name = typeof row.name === "string" ? row.name : "";
    out.push({
      heroId: finiteInt(row.heroId),
      heroType: finiteInt(row.heroType),
      name,
      level: finiteInt(row.level),
      star: finiteInt(row.star),
      fighting: finiteInt(row.fighting),
      weaponLevel: finiteInt(row.weaponLevel) ?? undefined,
    });
  }
  return out;
}

function parseBag(raw: unknown): StoreBagItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StoreBagItem[] = [];
  for (let i = 0; i < raw.length && out.length < BAG_CAP; i++) {
    const row = raw[i] as { [key: string]: unknown } | null;
    if (!row) continue;
    out.push({
      itemId: finiteInt(row.itemId),
      itemType: finiteInt(row.itemType),
      num: finiteInt(row.num),
    });
  }
  return out;
}

function parseInts(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const value = finiteInt(raw[i]);
    if (value !== null) out.push(value);
  }
  return out;
}

function copyStoreHero(row: StoreHero): StoreHero {
  return {
    heroId: row.heroId,
    heroType: row.heroType,
    name: row.name,
    level: row.level,
    star: row.star,
    fighting: row.fighting,
    weaponLevel: row.weaponLevel,
  };
}

function copyStoreBag(row: StoreBagItem): StoreBagItem {
  return { itemId: row.itemId, itemType: row.itemType, num: row.num };
}

function copyWireHero(row: WireHeroEntry): StoreHero {
  return {
    heroId: row.heroId,
    heroType: row.heroType,
    name: "",
    level: row.level,
    star: row.star,
    fighting: row.fighting,
  };
}

function copyWireBag(row: WireBagItem): StoreBagItem {
  return { itemId: row.itemId, itemType: row.itemType, num: row.num };
}

function copyLine(lineUp: { rows: LineRow[] }): StarterLineView {
  const rows: StarterLineView["rows"] = [];
  for (let i = 0; i < lineUp.rows.length; i++) {
    const marks = lineUp.rows[i].marks || [];
    const next: { field: number; text: string }[] = [];
    for (let m = 0; m < marks.length; m++) {
      next.push({ field: marks[m].field, text: marks[m].text });
    }
    rows.push({ marks: next });
  }
  return { rows };
}

function finiteInt(value: unknown): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}

function nonNeg(value: unknown): number | null {
  const n = finiteInt(value);
  if (n === null || n < 0) return null;
  return n;
}
