/**
 * c2s 2015 是 GReqGMCommandNew。成功没有 2015 回包。
 * 字段按声明顺序从 1 编号：1 command（string），2 param（repeated string）。
 * 主线探针仍是 command=ADD_HERO，param=["10505010","9"]。类型号可被输入框改掉，星级仍是 "9"。
 * 调试面板上的其它命令（ROLE_LV、ALL_HERO、ALL_EQUIP、ADD_ITEM）走同一帧，命令名必须是大写标识。
 * 2015 = 0x07DF，小端 df 07 00 00。
 * 缺 command、或类型号不是正整数时不编码。空 cmd 不编，登录链不发。
 *
 * s2c 4030 是 GResHeroAdd。字段 1 heros（repeated）。每条字段 1 是 hero_id（实例），不是类型号。
 * 类型号若出现在字段 2，不收进实例。没有实例时不当成功。
 *
 * s2c 1005 是服端错误。字段 1 见过 34501 这类码。探针等 4030 / 3100 时拿它 Toast。
 * gm.cmd.open=false 时 2015 往往没有 4030，也没有 1005。页上短等之后 Toast「GM 未开」。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.gmCommand。 */
export const WIRE_GM_CMD = "wire.2015";
/** s2c。数字号是 WireCmd.heroAdd。客户端不发。 */
export const WIRE_HERO_ADD_CMD = "wire.4030";
/** s2c。数字号是 WireCmd.s2c1005。客户端不发。 */
export const WIRE_SERVER_ERROR_CMD = "wire.1005";

export const WIRE_GM_COMMAND = "ADD_HERO";
export const WIRE_GM_DEFAULT_TYPE = "10505010";
export const WIRE_GM_STAR_PARAM = "9";
/** 默认 ADD_HERO / 10505010 / 9。整帧 1b000000df0700000a084144445f4845524f12083130353035303130120139。 */
export const WIRE_GM_ADD_HERO_FRAME = "1b000000df0700000a084144445f4845524f12083130353035303130120139";

export const WIRE_GM_CLOSED_TOAST = "GM 未开";
export const WIRE_GM_SILENT_MS = 1500;
export const WIRE_GM_BAD_TYPE = "类型号不对，不发送";
export const WIRE_GM_NEED_HERO = "还没有英雄实例";
export const WIRE_GM_UNSYNCED_TOAST = "真服未同步";

export interface WireGmAddHero {
  command: string;
  params: string[];
}

/** 同一条 2015。ADD_HERO 仍只从 readWireGmAddHero 进来，星级锁在 9。 */
export interface WireGmCommand {
  command: string;
  params: string[];
}

const GM_COMMAND_NAME = /^[A-Z][A-Z0-9_]{0,31}$/;
const GM_PARAM_TEXT = /^[0-9A-Za-z_-]{1,24}$/;

export interface WireHeroAddSnapshot {
  /** 字段 1 子消息里的字段 1。实例 id。不含类型号。 */
  heroIds: number[];
}

export interface WireServerError {
  code: number | null;
  text: string;
}

/** 没有 command、或类型号写了但不是正整数时返回 null。空白类型号用 10505010。已编好的 params 也能再读。 */
export function readWireGmAddHero(data: unknown): WireGmAddHero | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { command?: unknown; typeId?: unknown; params?: unknown };
  if (raw.command !== WIRE_GM_COMMAND) return null;
  if (Array.isArray(raw.params)) {
    if (raw.params.length < 2) return null;
    const typeText = raw.params[0];
    const star = raw.params[1];
    if (typeof typeText !== "string" || !/^[1-9]\d{0,11}$/.test(typeText)) return null;
    if (star !== WIRE_GM_STAR_PARAM) return null;
    return { command: WIRE_GM_COMMAND, params: [typeText, WIRE_GM_STAR_PARAM] };
  }
  let typeId = WIRE_GM_DEFAULT_TYPE;
  if (typeof raw.typeId === "string") {
    const trimmed = raw.typeId.trim();
    if (trimmed) {
      if (!/^[1-9]\d{0,11}$/.test(trimmed)) return null;
      typeId = trimmed;
    }
  } else if (typeof raw.typeId === "number") {
    if (!Number.isSafeInteger(raw.typeId) || raw.typeId < 1) return null;
    typeId = String(raw.typeId);
  } else if (raw.typeId !== undefined && raw.typeId !== null) {
    return null;
  }
  return { command: WIRE_GM_COMMAND, params: [typeId, WIRE_GM_STAR_PARAM] };
}

/**
 * 调试面板的 2015。ADD_HERO 不从这里放行，避免绕开星级 9。
 * 没有 command、命令名不是大写标识、或 param 不是短字符串时返回 null。
 */
export function readWireGmCommand(data: unknown): WireGmCommand | null {
  const hero = readWireGmAddHero(data);
  if (hero) return { command: hero.command, params: hero.params.slice() };
  if (!data || typeof data !== "object") return null;
  const raw = data as { command?: unknown; params?: unknown };
  if (typeof raw.command !== "string" || !GM_COMMAND_NAME.test(raw.command)) return null;
  if (raw.command === WIRE_GM_COMMAND) return null;
  if (raw.params === undefined || raw.params === null) return { command: raw.command, params: [] };
  if (!Array.isArray(raw.params) || raw.params.length > 6) return null;
  const params: string[] = [];
  for (let i = 0; i < raw.params.length; i++) {
    const text = raw.params[i];
    if (typeof text !== "string" || !GM_PARAM_TEXT.test(text)) return null;
    params.push(text);
  }
  return { command: raw.command, params };
}

/** GReqGMCommandNew。字段 1 command，字段 2 每个 param 一条 string。 */
export function encodeWireGmCommandBody(query: WireGmAddHero): Uint8Array | null {
  if (query.command !== WIRE_GM_COMMAND) return null;
  if (!query.params || query.params.length < 2) return null;
  return encodeGmBody(query.command, query.params);
}

/** 非 ADD_HERO 的 2015。命令名和 param 已经过 readWireGmCommand。 */
export function encodeWireGmGenericBody(query: WireGmCommand): Uint8Array | null {
  if (query.command === WIRE_GM_COMMAND) return encodeWireGmCommandBody(query);
  if (!GM_COMMAND_NAME.test(query.command)) return null;
  for (let i = 0; i < query.params.length; i++) {
    if (!GM_PARAM_TEXT.test(query.params[i])) return null;
  }
  return encodeGmBody(query.command, query.params);
}

function encodeGmBody(command: string, params: string[]): Uint8Array | null {
  const parts: number[] = [];
  pushString(parts, 1, command);
  for (let i = 0; i < params.length; i++) {
    const text = params[i];
    if (typeof text !== "string" || !text) return null;
    pushString(parts, 2, text);
  }
  return Uint8Array.from(parts);
}

/**
 * 解 s2c 4030。空包、坏包、有 heros 但没有字段 1 实例时返回 null。
 * 只收每条 heros 的字段 1。字段 2 类型号不收。
 */
export function decodeWireHeroAdd(body: Uint8Array | null | undefined): WireHeroAddSnapshot | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const heroIds: number[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 1 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const id = heroIdOf(row.bytes);
    if (id !== null) heroIds.push(id);
  }
  if (blobs === 0 || heroIds.length === 0) return null;
  return { heroIds };
}

/** 解 s2c 1005。空包仍是错误，码缺省。字段 1 是码。 */
export function decodeWireServerError(body: Uint8Array | null | undefined): WireServerError {
  if (!body || body.length === 0 || body.length > MAX_BODY) return { code: null, text: "服端错误" };
  const fields = readRawFields(body);
  if (!fields) return { code: null, text: "服端错误" };
  let code: number | null = null;
  const texts: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && typeof row.varint === "number" && row.varint >= 0) {
      code = Math.floor(row.varint);
      continue;
    }
    if (row.kind === "bytes" && row.bytes && row.bytes.length > 0) {
      const text = decodeUtf8(row.bytes);
      if (text) texts.push(text);
    }
  }
  let text = code === null ? "服端错误" : "错误 " + code;
  if (texts.length > 0) text += " " + texts.join(" ");
  return { code, text };
}

export function formatWireGmHero(heroId: number | null): string {
  if (heroId === null) return "GM 英雄实例 未到";
  return "GM 英雄实例 " + heroId;
}

function heroIdOf(body: Uint8Array): number | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 1 || row.kind !== "varint") continue;
    if (typeof row.varint !== "number" || !Number.isSafeInteger(row.varint) || row.varint < 1) return null;
    return row.varint;
  }
  return null;
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function pushString(parts: number[], field: number, text: string): void {
  const bytes = utf8(text);
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
      fields.push({ field, kind: "bytes", bytes: body.slice(i, i + len.value) });
      i += len.value;
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
  while (i < body.length && shift <= 63) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (isProtoInt64Neg1(body, offset, i)) return { value: -1, next: i };
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}

function utf8(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  const parts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (c < 0x80) parts.push(c);
    else if (c < 0x800) parts.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) parts.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else parts.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(parts);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_err) {
    return null;
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else return null;
  }
  return out;
}
