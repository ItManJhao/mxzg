/**
 * 真服超值首充记录只读。c2s / s2c 都是 20012。
 * c2s 是 GReqFirstRecharge，没有字段。整帧 04 00 00 00 2c 4e 00 00，即 040000002c4e0000。
 * 20012 = 0x4E2C，小端是 2c 4e 00 00。空体一次。
 * 不是角色资料 2001。不是基金列表 20001。不是世界等级 51001。
 *
 * 由 WireSession.pullIdle 在空 c2s 20001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 20013 领奖。不做 13260。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 20012 是 GResFirstRecharge。对得上的名字才用，对不上的号按字段号写。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * - 1 recharge
 * - 2 repeated list。已领 idx。单条 varint，或打包的 varint
 * - 3 repeated PSMapData can_reward
 * PSMapData：key=1 档位，value=2。value 0 可领，1 不可。
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，recharge 保持缺省，已领 idx 为空，can_reward 为空。
 * 已领打包解不开，或 can_reward 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.firstRecharge。 */
export const WIRE_FIRST_CMD = "wire.20012";

export const WIRE_FIRST_READONLY_TITLE = "超值首充（真服只读）";
export const WIRE_FIRST_EMPTY = "空记录";
export const WIRE_FIRST_UNSYNCED_TOAST = "真服未同步";
export const WIRE_FIRST_READONLY_NOTE =
  "只读展示，无领奖入口。不发 20013。不做 13260。不写金币，不写钻石。不回落 Mock";
export const WIRE_FIRST_SIDE_EFFECT = "只读。空 c2s 一次，挂在 20001 之后。不发 20013。不做 13260";
export const WIRE_FIRST_FIELD_NOTE =
  "recharge、list 已领 idx、can_reward 的档位 key、value。value 0 可领，1 不可。没有的数不写成 0。对不上的号按字段号写";

export interface WireFirstRechargeMark {
  field: number;
  text: string;
}

export interface WireFirstRechargeReward {
  /** PSMapData.key。档位。没有时是 null，不写成 0。 */
  key: number | null;
  /** PSMapData.value。0 可领，1 不可。没有时是 null，不写成 0，也不写成 1。 */
  value: number | null;
  /** 对不上 key、value 的号。 */
  marks: WireFirstRechargeMark[];
}

export interface WireFirstRechargeSnapshot {
  /** GResFirstRecharge.recharge。没有时是 null，不写成 0。 */
  recharge: number | null;
  /** GResFirstRecharge.list。已领 idx。没有这个字段时是空数组，不写成 0。 */
  claimed: number[];
  rewards: WireFirstRechargeReward[];
  /** 对不上字段 1、字段 2、字段 3 的外层号。 */
  marks: WireFirstRechargeMark[];
}

/**
 * 解 s2c 20012。空包体返回已同步的缺省 recharge、空已领和空记录。
 * 超长、坏 varint、已领打包解不开、can_reward 有包但一条都解不开时返回 null。
 */
export function decodeWireFirstRecharge(body: Uint8Array | null | undefined): WireFirstRechargeSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const claimed: number[] = [];
  const rewards: WireFirstRechargeReward[] = [];
  const marks: WireFirstRechargeMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") continue;
    if (row.field === 2 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) claimed.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) claimed.push(packed[j]);
      continue;
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeReward(row.bytes);
      if (!parsed) continue;
      rewards.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && rewards.length === 0) return null;
  return {
    recharge: nonNegativeVarint(fields, 1),
    claimed,
    rewards,
    marks,
  };
}

/** 页上写 recharge、已领 idx 和 can_reward 条数。没有时写「无」。记录为 0 写「空记录」。 */
export function formatWireFirstHead(snap: WireFirstRechargeSnapshot): string {
  const list = snap.rewards.length === 0 ? WIRE_FIRST_EMPTY : snap.rewards.length + " 条";
  return joinMarks("recharge=" + numText(snap.recharge) + " / 已领=" + claimedText(snap.claimed) + " / " + list, snap.marks);
}

/** 行上写档位 / value。0 写可领，1 写不可。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireFirstLine(row: WireFirstRechargeReward): string {
  return joinMarks("档位=" + numText(row.key) + " / value=" + rewardValueText(row.value), row.marks);
}

export function wireFirstNote(snap: WireFirstRechargeSnapshot): string {
  const head = formatWireFirstHead(snap);
  const tail = WIRE_FIRST_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.rewards.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.rewards.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireFirstLine(snap.rewards[i]));
  if (snap.rewards.length > n) parts.push("其余 " + (snap.rewards.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireFirstRechargeSnapshot {
  return { recharge: null, claimed: [], rewards: [], marks: [] };
}

function claimedText(values: number[]): string {
  if (values.length === 0) return "无";
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function rewardValueText(value: number | null): string {
  if (value === null) return "无";
  if (value === 0) return "0 · 可领";
  if (value === 1) return "1 · 不可";
  return String(value);
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireFirstRechargeMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireFirstRechargeMark[]): string {
  const parts: string[] = [];
  for (let i = 0; i < marks.length; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  return parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeReward(body: Uint8Array): WireFirstRechargeReward | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireFirstRechargeMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    key: nonNegativeVarint(fields, 1),
    value: nonNegativeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WireFirstRechargeMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint) && row.varint >= 0) {
    return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    const text = utf8Printable(row.bytes);
    if (text !== null) return { field: row.field, text };
    return { field: row.field, text: "未解" };
  }
  return { field: row.field, text: "未解" };
}

function utf8Printable(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return null;
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_err) {
    return null;
  }
  if (!text) return null;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code === 127) return null;
  }
  return text;
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

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    if (!isFinite(val.value) || val.value < 0) return null;
    values.push(Math.floor(val.value));
    i = val.next;
  }
  return values;
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
