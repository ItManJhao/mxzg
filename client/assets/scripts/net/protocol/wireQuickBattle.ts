/**
 * 真服快速战斗次数只读。c2s / s2c 都是 3012。
 * c2s 是 GReqQuickBattleInitData，空体，没有 page。整帧 04 00 00 00 c4 0b 00 00，即 04000000c40b0000。
 * 3012 = 0x0BC4，小端是 c4 0b 00 00。
 *
 * 战斗链续在已合的 3001、3010 之后：…→3001→3010→3012→3006。
 * 3006 挂机战报另帧，不从本帧发。
 * 主线页打开时，空 c2s 3010 之后再只读拉一次。不跟挑战同一发，不跟 3010 合成一帧。
 * 不进 pullIdle，不接活动链末（不接 76251 后面），不夹活动号。Boot.ts 不改。
 *
 * 副作用：getRoleMission 轻懒建，跨日清 quickNum。无扣费，无领奖，无养成写。
 * 不发 3002、3005、3008、3011。硬禁 3013（扣钻发奖）。
 * 不重发 3007、3004、3001、3010、3099、3101、18001、3203。
 * 76271 仍暂缓。3102 请求战报另帧，不从本帧发。
 * 硬禁 4601、29001。不把 Mock 1201 / 1202 当真服。
 * 不写金币，不写钻石。不回落 Mock。不接 spine。不接 USE_*。不改 CityChrome。
 *
 * s2c 是 GResQuickBattleInitData。按声明顺序：
 * 字段 1 battle_count，字段 2 max_battle_count，字段 3 promotion，字段 4 privilege。
 * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 空包体是已同步空表。对不上的号按字段号留在 marks。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.quickBattleInit。 */
export const WIRE_QUICK_BATTLE_CMD = "wire.3012";

export const WIRE_QUICK_BATTLE_FRAME = "04000000c40b0000";

/** GResQuickBattleInitData.battle_count。声明顺序第 1 个字段。 */
export const WIRE_QUICK_BATTLE_COUNT_FIELD = 1;
/** GResQuickBattleInitData.max_battle_count。声明顺序第 2 个字段。 */
export const WIRE_QUICK_BATTLE_MAX_FIELD = 2;
/** GResQuickBattleInitData.promotion。声明顺序第 3 个字段。 */
export const WIRE_QUICK_BATTLE_PROMOTION_FIELD = 3;
/** GResQuickBattleInitData.privilege。声明顺序第 4 个字段。 */
export const WIRE_QUICK_BATTLE_PRIVILEGE_FIELD = 4;

export const WIRE_QUICK_BATTLE_EMPTY = "已同步空表";
export const WIRE_QUICK_BATTLE_UNSYNCED = "真服未同步";
export const WIRE_QUICK_BATTLE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_QUICK_BATTLE_ABSENT = "未带";

export const WIRE_QUICK_BATTLE_NOTE =
  "主线页展示快速战斗次数。打开页在空 c2s 3010 之后只读拉空 c2s 3012（GReqQuickBattleInitData，整帧 04000000c40b0000）。战斗链是 …→3001→3010→3012→3006。3006 不从本帧发。须已有 3007。不重发 3007、3004、3001、3010、3099、3101、18001、3203。不发 3002、3005、3008、3011。硬禁 3013。76271 仍暂缓。3102 另帧，不从本帧发。硬禁 4601、29001。不把 Mock 1201/1202 当真服。不进 pullIdle，不夹活动号。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。不写金币，不写钻石。不接 spine。不改 Boot";

export const WIRE_QUICK_BATTLE_SIDE_EFFECT =
  "getRoleMission 轻懒建。跨日清 quickNum。无扣费，无领奖，无养成写。空 c2s 一次，无 page，挂在已合 3010 之后，主线页打开时发。不重发 3010。不重发 3001。不进 pullIdle。不发 3002、3005、3008、3011。硬禁 3013。不发 76271。3102 另帧，不从本帧发。不从本帧发 3006。不重发 3007、3004、3099、3101、18001、3203。硬禁 4601、29001";

/** 本刀不编码这些号。3007 / 3004 / 3001 / 3010 / 3099 / 3101 / 18001 / 3203 / 3005 已有自己的帧，由战斗链断言不重发。3013 是扣钻发奖，硬禁。 */
export const WIRE_QUICK_BATTLE_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.76271",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireQuickBattleMark {
  field: number;
  text: string;
}

export interface WireQuickBattleSnapshot {
  /** 空包体。四个数都保持缺省，页上写「已同步空表」。 */
  empty: boolean;
  /** 字段 1。没有时是 null，不写成 0。 */
  battleCount: number | null;
  /** 字段 2。没有时是 null，不写成 0。 */
  maxBattleCount: number | null;
  /** 字段 3。没有时是 null，不写成 0。 */
  promotion: number | null;
  /** 字段 4。没有时是 null，不写成 0。 */
  privilege: number | null;
  marks: WireQuickBattleMark[];
}

/**
 * 解 s2c 3012。空包体返回已同步空表。
 * 超长、坏 varint 时返回 null，调用方保持上一次。
 */
export function decodeWireQuickBattle(body: Uint8Array | null | undefined): WireQuickBattleSnapshot | null {
  if (!body) return null;
  if (body.length === 0) {
    return { empty: true, battleCount: null, maxBattleCount: null, promotion: null, privilege: null, marks: [] };
  }
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const snap: WireQuickBattleSnapshot = {
    empty: false,
    battleCount: null,
    maxBattleCount: null,
    promotion: null,
    privilege: null,
    marks: [],
  };
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    const known = knownField(row.field);
    if (known && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) snap.marks.push(mark);
      } else {
        writeKnown(snap, known, value);
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) snap.marks.push(mark);
  }
  return snap;
}

/** 主线页上的快速战斗次数。null 是还没同步。空包体写「已同步空表」。缺的数不写成 0。 */
export function formatWireQuickBattle(snap: WireQuickBattleSnapshot | null): string {
  if (!snap) return "快速战斗 " + WIRE_QUICK_BATTLE_UNSYNCED;
  if (snap.empty) return "快速战斗 " + WIRE_QUICK_BATTLE_EMPTY;
  const parts: string[] = [];
  if (snap.battleCount !== null) parts.push("battle_count=" + String(snap.battleCount));
  if (snap.maxBattleCount !== null) parts.push("max_battle_count=" + String(snap.maxBattleCount));
  if (snap.promotion !== null) parts.push("promotion=" + String(snap.promotion));
  if (snap.privilege !== null) parts.push("privilege=" + String(snap.privilege));
  const line = parts.length === 0 ? "快速战斗 " + WIRE_QUICK_BATTLE_ABSENT : "快速战斗 " + parts.join(" / ");
  return joinMarks(line, snap.marks);
}

function knownField(field: number): "battleCount" | "maxBattleCount" | "promotion" | "privilege" | null {
  if (field === WIRE_QUICK_BATTLE_COUNT_FIELD) return "battleCount";
  if (field === WIRE_QUICK_BATTLE_MAX_FIELD) return "maxBattleCount";
  if (field === WIRE_QUICK_BATTLE_PROMOTION_FIELD) return "promotion";
  if (field === WIRE_QUICK_BATTLE_PRIVILEGE_FIELD) return "privilege";
  return null;
}

function writeKnown(
  snap: WireQuickBattleSnapshot,
  key: "battleCount" | "maxBattleCount" | "promotion" | "privilege",
  value: number
): void {
  snap[key] = value;
}

function joinMarks(line: string, marks: WireQuickBattleMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  for (let i = 0; i < marks.length; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireQuickBattleMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return { field: row.field, text: "空" };
    return { field: row.field, text: "包" + row.bytes.length };
  }
  return { field: row.field, text: "未解" };
}

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
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
