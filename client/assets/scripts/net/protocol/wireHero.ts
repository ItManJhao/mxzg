/**
 * 真服英雄只读。c2s / s2c 都是 4001，不是占位 hero.list（1401）。
 *
 * 服端：HeroHandler.getHeroList。GReqHeroList 只有 optional page。
 * page 缺省 0 时 handler 会按负下标 list.get，所以禁止空体
 * `04 00 00 00 a1 0f 00 00`。进主城发 page=1：
 * `06 00 00 00 a1 0f 00 00 08 01`。
 * 由 WireSession.pullIdle 在空 c2s 15000 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 20001 在 51001 之后发，20012 接在 20001 之后，都不是英雄前置。18001 是竞技场只读，在 12010 之后发，不是英雄。真开战是 18002，这里不发。
 * 4004 是召唤次数只读，接在 27001 之后，不是这份名册。不要发空体 4001。
 * 不升级，不写钱包。占位 hero.list / hero.upgrade 仍是 1401 / 1402。
 *
 * s2c 4001 = GResHeroList：
 * - 1 hero_capacity
 * - 2 buy_space_times（只记日志，不购买）
 * - 3 repeated ResHeroData
 * - 4 send_status（1 完，0 还有下一页）
 * - 5 page
 * 空名册仍是这一包：capacity / send_status / page 有值，字段 3 长度为 0。不是空体。
 *
 * ResHeroData 对得上的号：
 * 1 hero_id、2 hero_type、3 level、4 stage、5 star、6 elem、7 occupation、8 is_lock、9 fighting。
 * 线上没有名字。hero_type 对上 herotype.note 才用那句；对不上写类型号，不编名字。
 * Boot 读 config/gameconfig 导出的 herotype.json 后登记 note。没登记时仍写类型号。
 */

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroList。 */
export const WIRE_HERO_CMD = "wire.4001";

export const WIRE_HERO_READONLY_TITLE = "英雄（真服只读）";
export const WIRE_HERO_EMPTY = "空名册";
export const WIRE_HERO_UNSYNCED_TOAST = "真服英雄未同步";
export const WIRE_HERO_READONLY_NOTE = "只读。不升级，不写金币";
export const WIRE_HERO_FIELD_NOTE = "没有名字。类型对不上就写类型号";

/** send_status 一直是 0 时停在这一页，避免把服打满。 */
export const WIRE_HERO_PAGE_CAP = 32;

export interface WireHeroEntry {
  heroId: number | null;
  heroType: number | null;
  level: number | null;
  stage: number | null;
  star: number | null;
  elem: number | null;
  occupation: number | null;
  /** ResHeroData.is_lock。0 / 1 按原值写。 */
  isLock: number | null;
  fighting: number | null;
}

export interface WireHeroList {
  entries: WireHeroEntry[];
  heroCapacity: number | null;
  /** 只记日志。不发起购买。 */
  buySpaceTimes: number | null;
  /** 1 本页是最后一页。0 还要下一页。没有这个字段是 null。 */
  sendStatus: number | null;
  page: number | null;
}

const MAX_BODY = 65536;

/** herotype.note。Boot 登记之前保持空。 */
const heroTypeNotes = new Map<number, string>();

/**
 * 记下一条 herotype.note。空白则去掉。
 * 不在这里填写英雄名。表还没读到时调用方不要编。
 */
export function setWireHeroTypeNote(heroType: number, note: string): void {
  if (!Number.isFinite(heroType) || heroType < 0) return;
  const text = (note || "").trim();
  const key = Math.floor(heroType);
  if (!text) heroTypeNotes.delete(key);
  else heroTypeNotes.set(key, text);
}

/** 对上 note 用 note。否则写「类型 N」。没有类型号时写「类型未解」。 */
export function wireHeroTypeLabel(heroType: number | null): string {
  if (heroType === null) return "类型未解";
  const note = heroTypeNotes.get(heroType);
  if (note) return note;
  return "类型 " + heroType;
}

/** page 小于 1、缺省或不是数时写成 1。禁止把 0 编出去。 */
export function normalizeWireHeroPage(page: number | null | undefined): number {
  if (typeof page !== "number" || !Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function readWireHeroPage(data: unknown): number {
  if (data && typeof data === "object") {
    const page = (data as { page?: unknown }).page;
    if (typeof page === "number") return normalizeWireHeroPage(page);
  }
  return 1;
}

/** GReqHeroList：字段 1 = page。page=1 的包体是 `08 01`。 */
export function encodeWireHeroListBody(page: number): Uint8Array {
  const n = normalizeWireHeroPage(page);
  const parts: number[] = [];
  pushVarint(parts, (1 << 3) | 0);
  pushVarint(parts, n);
  return Uint8Array.from(parts);
}

/**
 * 解 s2c 4001。空体返回 null，不当成空名册。
 * 坏包、有英雄子消息但一个都解不开，也返回 null。调用方保持上一次。
 * 字段 3 长度为 0、并且带 send_status 或 page，才是已同步的空名册。
 */
export function decodeWireHeroList(body: Uint8Array | null | undefined): WireHeroList | null {
  if (!body || body.length === 0) return null;
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const parsed: WireHeroEntry[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 3 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const entry = decodeHeroEntry(row.bytes);
    if (!entry) return null;
    parsed.push(entry);
  }
  const heroCapacity = nonNegativeVarint(fields, 1);
  const buySpaceTimes = nonNegativeVarint(fields, 2);
  const sendStatus = nonNegativeVarint(fields, 4);
  const page = nonNegativeVarint(fields, 5);
  if (blobs === 0 && sendStatus === null && page === null) return null;
  return { entries: parsed, heroCapacity, buySpaceTimes, sendStatus, page };
}

/** 列表行。名字只来自类型 note，否则是类型号。 */
export function formatWireHeroLine(entry: WireHeroEntry): string {
  let text = wireHeroTypeLabel(entry.heroType);
  if (entry.heroId !== null) text += " · id " + entry.heroId;
  if (entry.level !== null) text += " · Lv" + entry.level;
  if (entry.star !== null) text += " · " + entry.star + "星";
  if (entry.fighting !== null) text += " · 战力 " + entry.fighting;
  return text;
}

/** 详情写对得上的字段。不升级。 */
export function formatWireHeroDetail(entry: WireHeroEntry): string[] {
  const lines: string[] = [];
  if (entry.heroType !== null) {
    const label = wireHeroTypeLabel(entry.heroType);
    lines.push(label === "类型 " + entry.heroType ? label : label + " · 类型 " + entry.heroType);
  } else lines.push("类型未解");
  lines.push(entry.heroId !== null ? "id " + entry.heroId : "id 未解");
  pushNamed(lines, "等级", entry.level);
  pushNamed(lines, "阶段", entry.stage);
  pushNamed(lines, "星级", entry.star);
  pushNamed(lines, "元素", entry.elem);
  pushNamed(lines, "职业", entry.occupation);
  pushNamed(lines, "锁定", entry.isLock);
  pushNamed(lines, "战力", entry.fighting);
  return lines;
}

export function wireHeroNote(list: WireHeroList): string {
  const entries = list.entries;
  const tail =
    "。容量=" +
    markText(list.heroCapacity) +
    " 购买次数=" +
    markText(list.buySpaceTimes) +
    " send_status=" +
    markText(list.sendStatus) +
    " page=" +
    markText(list.page) +
    "。不升级，不写金币";
  if (entries.length === 0) return "空名册" + tail;
  const parts: string[] = [];
  const n = Math.min(entries.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireHeroLine(entries[i]));
  if (entries.length > n) parts.push("其余 " + (entries.length - n) + " 名");
  return entries.length + " 名 " + parts.join("；") + tail;
}

function pushNamed(lines: string[], label: string, value: number | null): void {
  if (value === null) return;
  lines.push(label + " " + value);
}

function markText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeHeroEntry(body: Uint8Array): WireHeroEntry | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const heroId = nonNegativeVarint(fields, 1);
  const heroType = nonNegativeVarint(fields, 2);
  if (heroId === null && heroType === null) return null;
  return {
    heroId,
    heroType,
    level: nonNegativeVarint(fields, 3),
    stage: nonNegativeVarint(fields, 4),
    star: nonNegativeVarint(fields, 5),
    elem: nonNegativeVarint(fields, 6),
    occupation: nonNegativeVarint(fields, 7),
    isLock: nonNegativeVarint(fields, 8),
    fighting: nonNegativeVarint(fields, 9),
  };
}

function nonNegativeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

function readRawFields(body: Uint8Array): RawField[] | null {
  const fields: RawField[] = [];
  let i = 0;
  while (i < body.length) {
    const key = readVarint(body, i);
    if (!key) return null;
    const field = key.value >>> 3;
    const wt = key.value & 7;
    i = key.next;
    if (field <= 0) return null;
    if (wt === 0) {
      const val = readVarint(body, i);
      if (!val) return null;
      fields.push({ field, kind: "varint", varint: val.value });
      i = val.next;
      continue;
    }
    if (wt === 2) {
      const len = readVarint(body, i);
      if (!len) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      fields.push({ field, kind: "bytes", bytes: blob });
      continue;
    }
    return null;
  }
  return fields;
}

function readVarint(body: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < body.length && shift <= 49) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
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
