/**
 * 主线探针把上一只 4030 的实例放上 MAIN。c2s 3100 是 GReqLineUpSave。
 * 3100 = 0x0C1C，小端 1c 0c 00 00。空 cmd 不编，和只读 3101 不是一帧。
 * 不进 pullIdle。登录链仍不发 3100。
 *
 * 字段按声明顺序从 1 编号。
 * GReqLineUpSave：1 lineData（PSLineUpData）。
 * PSLineUpData：1 type，2 time（不写），3 goddess_type，4 hero_list（repeated PSLineUpHeroData），5 formation_id。
 * PSLineUpHeroData：1 hero_id（4030 的实例，不是类型号），2 hp（不写），3 position。
 * 探针写 type=0（MAIN）、goddess_type=0、formation_id=1、position=2。time 和 hp 留空。
 * 出现的 0 仍写 0。
 * 阵法 1 合法站位只有 2/3/5/6/7/8/9。1 和 4 不编码。
 *
 * 成功是空的 s2c 3100。有包体不算这次成功。
 */
/** 和 encodeWireMessage 用同一个字符串。数字号是 WireCmd.lineUpSave。 */
export const WIRE_LINEUP_SAVE_CMD = "wire.3100";

export const WIRE_MAIN_LINE_TYPE = 0;
export const WIRE_MAIN_FORMATION_ID = 1;
export const WIRE_MAIN_GODDESS_TYPE = 0;
export const WIRE_MAIN_POSITION = 2;

/** 阵法 1。不要把 1 或 4 编出去。 */
export const WIRE_LINEUP_SAVE_POSITIONS = [2, 3, 5, 6, 7, 8, 9] as const;

/** 出阵列表下标对应的 node_icon_ 号。越界是 null，格子 1 和 4 不在这张表里。 */
export function formationFaceSlot(index: number): number | null {
  if (!isFinite(index) || index < 0 || index !== Math.floor(index)) return null;
  if (index >= WIRE_LINEUP_SAVE_POSITIONS.length) return null;
  return WIRE_LINEUP_SAVE_POSITIONS[index];
}

/** hero_id=42、position=2 的整帧。formation_id 在字段 5，position 在字段 3。用来对照，不是默认发出的实例。 */
export const WIRE_LINEUP_SAVE_SAMPLE_FRAME = "120000001c0c00000a0c080018002204082a18022801";

export interface WireLineUpSaveQuery {
  heroId: number;
  position: number;
}

export interface WireLineUpSaveHero {
  heroId: number;
  position: number;
}

/** 出阵一次写入 MAIN。heroes 按出现顺序，formation_id 仍是字段 5。 */
export interface WireLineUpSaveMany {
  heroes: WireLineUpSaveHero[];
}

export interface WireLineUpSaveAck {
  empty: true;
}

/** 没有 hero_id，或站位不在 2/3/5/6/7/8/9 时返回 null。空 data 返回 null。 */
export function readWireLineUpSave(data: unknown): WireLineUpSaveQuery | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { heroId?: unknown; position?: unknown };
  const heroId = positiveId(raw.heroId);
  if (heroId === null) return null;
  const position = typeof raw.position === "number" ? raw.position : WIRE_MAIN_POSITION;
  if (!legalPosition(position)) return null;
  return { heroId, position: Math.floor(position) };
}

/** 缺实例或站位非法时返回 null。type=0、goddess_type=0、formation_id=1 照写。time 和 hp 不写。 */
export function encodeWireLineUpSaveBody(query: WireLineUpSaveQuery): Uint8Array | null {
  return encodeWireLineUpSaveHeroes({ heroes: [{ heroId: query.heroId, position: query.position }] });
}

/**
 * 多只英雄合成一帧 3100。
 * PSLineUpData 字段 4 重复，字段 5 是 formation_id=1。站位必须落在 2/3/5/6/7/8/9。
 */
export function encodeWireLineUpSaveHeroes(query: WireLineUpSaveMany): Uint8Array | null {
  if (!query.heroes.length) return null;
  const line: number[] = [];
  pushVarintField(line, 1, WIRE_MAIN_LINE_TYPE);
  pushVarintField(line, 3, WIRE_MAIN_GODDESS_TYPE);
  for (let i = 0; i < query.heroes.length; i++) {
    const row = query.heroes[i];
    if (!legalPosition(row.position)) return null;
    if (!Number.isSafeInteger(row.heroId) || row.heroId < 1) return null;
    const hero: number[] = [];
    pushVarintField(hero, 1, row.heroId);
    pushVarintField(hero, 3, Math.floor(row.position));
    pushBytes(line, 4, hero);
  }
  pushVarintField(line, 5, WIRE_MAIN_FORMATION_ID);
  const body: number[] = [];
  pushBytes(body, 1, line);
  return Uint8Array.from(body);
}

/** heroes 数组优先。空数组或站位非法返回 null，调用方再看单只 heroId。 */
export function readWireLineUpSaveMany(data: unknown): WireLineUpSaveMany | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { heroes?: unknown };
  if (!Array.isArray(raw.heroes) || raw.heroes.length === 0) return null;
  const heroes: WireLineUpSaveHero[] = [];
  for (let i = 0; i < raw.heroes.length; i++) {
    const row = raw.heroes[i] as { heroId?: unknown; position?: unknown } | null;
    if (!row) return null;
    const heroId = positiveId(row.heroId);
    if (heroId === null) return null;
    const position = typeof row.position === "number" ? row.position : WIRE_MAIN_POSITION;
    if (!legalPosition(position)) return null;
    heroes.push({ heroId, position: Math.floor(position) });
  }
  return { heroes };
}

/** 空包体是成功。有字节、或缺包，都不是这次成功。 */
export function decodeWireLineUpSave(body: Uint8Array | null | undefined): WireLineUpSaveAck | null {
  if (!body) return null;
  if (body.length !== 0) return null;
  return { empty: true };
}

export function legalLineUpPosition(position: number): boolean {
  return legalPosition(position);
}

function legalPosition(position: number): boolean {
  if (!Number.isFinite(position)) return false;
  const n = Math.floor(position);
  for (let i = 0; i < WIRE_LINEUP_SAVE_POSITIONS.length; i++) {
    if (WIRE_LINEUP_SAVE_POSITIONS[i] === n) return true;
  }
  return false;
}

function positiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 1) return value;
  if (typeof value === "string" && /^[1-9]\d{0,15}$/.test(value)) {
    const n = Number(value);
    if (Number.isSafeInteger(n) && n >= 1) return n;
  }
  return null;
}

function pushVarintField(parts: number[], field: number, value: number): void {
  pushVarint(parts, (field << 3) | 0);
  pushVarint(parts, value);
}

function pushBytes(parts: number[], field: number, bytes: number[]): void {
  pushVarint(parts, (field << 3) | 2);
  pushVarint(parts, bytes.length);
  for (let i = 0; i < bytes.length; i++) parts.push(bytes[i]);
}

function pushVarint(parts: number[], value: number): void {
  let n = Math.floor(value);
  if (n < 0) n = 0;
  while (n > 127) {
    parts.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  parts.push(n);
}
