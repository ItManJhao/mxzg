/**
 * 真服七日登录只读。c2s / s2c 都是 22000。
 * c2s 是 GReqSevenDayLoginData，没有字段，也没有 page。整帧 04 00 00 00 f0 55 00 00。
 * 不是占位 login7.view / login7.claim / login7.advance（2201–2203）。
 * 不是点金 17000。七日目标是 21010，旧号 21000 / 21001 不用。
 *
 * 由 WireSession.pullIdle 在空 c2s 18001 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 22001 领奖。22002 是隔天推送 s2c，GResSevenDayLoginUpdateDay，只有 cur_day=1。不是 c2s。
 * 不写钱包。不接 USE_*。
 *
 * s2c 22000 是 GResSevenDayLoginData：
 * - 1 end_time。创角日 0 点起 7 天的截止。原数，不推开服天
 * - 2 cur_day。累计登录天数。没有时不写成 0
 * - 3 repeated PSSevenLoginStatus list
 * PSSevenLoginStatus：idx=1 天数，status=2（0 未领，1 已领）。
 *
 * 空领奖表仍是非空外层：必带 cur_day / end_time，list 按配置逐日填，未领 status=0。
 * 这是已同步，不是未同步。空包体、以及能解开但 list 为 0 条，同样是已同步的空表。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * 服端 22000 只读：无写库，无自动领奖。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.sevenDayLogin。 */
export const WIRE_SEVEN_CMD = "wire.22000";
/** s2c 22002。只订阅，不编码。 */
export const WIRE_SEVEN_PUSH_CMD = "wire.22002";

export const WIRE_SEVEN_READONLY_TITLE = "七日登录（真服只读）";
export const WIRE_SEVEN_EMPTY = "空表";
export const WIRE_SEVEN_UNSYNCED_TOAST = "真服未同步";
export const WIRE_SEVEN_READONLY_NOTE = "只读。不领奖，不发 22001，不写金币";
export const WIRE_SEVEN_SIDE_EFFECT = "22000 只读，无写库，无自动领奖";
export const WIRE_SEVEN_PUSH_NOTE = "22002 是隔天推送，只改 cur_day，不是请求";
export const WIRE_SEVEN_FIELD_NOTE = "end_time 是创角日 0 点加 7 天的截止。cur_day 是累计登录天数。行上 idx 天数，status 0 未领 / 1 已领";

export interface WireSevenDayRow {
  /** PSSevenLoginStatus.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** PSSevenLoginStatus.status。0 未领，1 已领。没有时是 null，不写成 0。 */
  status: number | null;
}

export interface WireSevenDaySnapshot {
  /** GResSevenDayLoginData.end_time。原数。 */
  endTime: number | null;
  /** GResSevenDayLoginData.cur_day。没有时是 null。 */
  curDay: number | null;
  rows: WireSevenDayRow[];
}

/**
 * 解 s2c 22000。空包体、以及没有 list 的合法包，都返回空表。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireSevenDay(body: Uint8Array | null | undefined): WireSevenDaySnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireSevenDayRow[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 3 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const parsed = decodeStatus(row.bytes);
    if (!parsed) continue;
    rows.push(parsed);
  }
  if (blobs > 0 && rows.length === 0) return null;
  return {
    endTime: nonNegativeVarint(fields, 1),
    curDay: nonNegativeVarint(fields, 2),
    rows,
  };
}

/**
 * 解 s2c 22002。GResSevenDayLoginUpdateDay 只有 cur_day=1。
 * 空包、坏包、没有字段 1 时返回 null。不要拿 22000 的解码器来读这一帧。
 */
export function decodeWireSevenDayUpdate(body: Uint8Array | null | undefined): number | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return nonNegativeVarint(fields, 1);
}

/** 只替换 cur_day。list 和 end_time 不动。不领奖。 */
export function applyWireSevenDayUpdate(snap: WireSevenDaySnapshot, curDay: number): WireSevenDaySnapshot {
  return {
    endTime: snap.endTime,
    curDay,
    rows: snap.rows.map((row) => ({ idx: row.idx, status: row.status })),
  };
}

export function formatWireSevenHead(snap: WireSevenDaySnapshot): string {
  return "end_time=" + numText(snap.endTime) + " / cur_day=" + numText(snap.curDay);
}

/** 行上写 idx / status。0、1 同时写未领、已领。其它数字不另起名字。 */
export function formatWireSevenLine(row: WireSevenDayRow): string {
  return "idx=" + numText(row.idx) + " / status=" + statusText(row.status);
}

export function wireSevenNote(snap: WireSevenDaySnapshot): string {
  const head = formatWireSevenHead(snap);
  if (snap.rows.length === 0) return head + "。" + WIRE_SEVEN_EMPTY + "。" + WIRE_SEVEN_SIDE_EFFECT + "。不写金币";
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 7);
  for (let i = 0; i < n; i++) parts.push(formatWireSevenLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + WIRE_SEVEN_SIDE_EFFECT + "。不写金币";
}

function emptySnapshot(): WireSevenDaySnapshot {
  return { endTime: null, curDay: null, rows: [] };
}

function statusText(status: number | null): string {
  if (status === null) return "无";
  if (status === 0) return "0 · 未领";
  if (status === 1) return "1 · 已领";
  return String(status);
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeStatus(body: Uint8Array): WireSevenDayRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const idx = nonNegativeVarint(fields, 1);
  const status = nonNegativeVarint(fields, 2);
  if (idx === null && status === null) return null;
  return { idx, status };
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
