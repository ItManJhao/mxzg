/**
 * 真服切磋。c2s / s2c 都是 3030。
 * c2s 是 GReqStudy，不是空壳。字段 1 type（0 本服 / 1 跨服），字段 2 opponent_id，字段 3 server_id。
 * 3030 = 0x0BD6，小端是 d6 0b 00 00。
 * 空壳 04 00 00 00 d6 0b 00 00 不够。示例 type=0、opponent_id=2、server_id=1 的整帧是
 * 0a 00 00 00 d6 0b 00 00 08 00 10 02 18 01，即 0a000000d60b0000080010021801。
 * 页上不预填 opponent_id，也不把这个 2 默认发出去。缺 opponent_id 不编码。
 *
 * 默认本服 type=0。服按 server_id 路由，不按 type。本服必须把 server_id 写成本机 server.id。
 * 文档默认 server.id=1。填错会走跨服，单机上可能卡住。单机不要测跨服。
 * opponent_id 用另一测试号的 roleId，或 mxzg_1_data 里不是当前玩家的一行，或好友 / 排行 id。不能是自己。
 *
 * 主线页点「切磋」才发。不进 pullIdle，不接活动链末，不夹活动号。Boot.ts 不改。
 * 不跟 3102、3103、3099、3101 合并。不发 3100、3097、3098。不是 18001。
 *
 * 副作用：开战 STUDY，并落库战报。无领奖，无扣钻，不推进 chapterId。胜了不回拉 3007。
 * 回包里的 battle_id 可以再点已接的 3102 重拉。不从本帧自动发 3102。
 * 3001 / 3006 的战报不落库，这一帧会落库。
 * 不发 3002、3005、3008、3011。硬禁 3013、4601、29001。
 * 不把 Mock 1201 / 1202 当真服。
 * 不写金币，不写钻石。不回落 Mock。不接 USE_*。不改 CityChrome。
 *
 * s2c 是 GResStudy。按声明顺序：字段 1 report，字段 2 type。
 * report 是 length-delimited 的 BattleReport，rounds 和 3001 / 3006 / 3102 同一套，走 decodeWireBattleReport。
 * 有 report 才在主线页走 planWireSpineReplay / mountBattleSpine。不另写 spine。
 * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 空包体是已同步空表。report 有包但整段解不开时返回 null，调用方保持上一次。
 */
import { decodeWireBattleReport, WireBattleMark, WireBattleReport } from "./wireBattle";

const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.study。 */
export const WIRE_STUDY_CMD = "wire.3030";

/** type=0、opponent_id=2、server_id=1。不是空壳 04000000d60b0000。页上不默认发出 opponent_id=2。 */
export const WIRE_STUDY_FRAME = "0a000000d60b0000080010021801";

export const WIRE_STUDY_EMPTY_SHELL = "04000000d60b0000";

export const WIRE_STUDY_DEFAULT_TYPE = 0;
export const WIRE_STUDY_DEFAULT_SERVER_ID = 1;
/** 只用来对照编码。探针页不预填，也不默认发送。 */
export const WIRE_STUDY_EXAMPLE_OPPONENT_ID = 2;

/** GResStudy.report。声明顺序第 1 个字段。和 3001 / 3006 / 3102 的 report 同一套 BattleReport。 */
export const WIRE_STUDY_REPORT_FIELD = 1;
/** GReqStudy.type / GResStudy.type。声明顺序第 1 个 c2s 字段，s2c 是第 2 个。0 本服，1 跨服。 */
export const WIRE_STUDY_TYPE_FIELD = 1;
export const WIRE_STUDY_TYPE_ECHO_FIELD = 2;
/** GReqStudy.opponent_id。c2s 字段 2。 */
export const WIRE_STUDY_OPPONENT_FIELD = 2;
/** GReqStudy.server_id。c2s 字段 3。路由看这个号，不看 type。 */
export const WIRE_STUDY_SERVER_FIELD = 3;

export const WIRE_STUDY_EMPTY = "已同步空表";
export const WIRE_STUDY_UNSYNCED = "真服未同步";
export const WIRE_STUDY_UNSYNCED_TOAST = "真服未同步";
export const WIRE_STUDY_ABSENT = "未带";
export const WIRE_STUDY_NO_REPORT = "没有 report";
export const WIRE_STUDY_NEED_OPPONENT = "opponent_id 未填，不发送";
export const WIRE_STUDY_SELF = "不能切磋自己";

export const WIRE_STUDY_PROBE_NOTE =
  "本服 type=0。server_id 填本机 server.id，文档默认 1。填错会走跨服。opponent_id 不预填，不能是自己。单机不测跨服。成功后用 battle_id 再拉 3102，不自动发";

export const WIRE_STUDY_NOTE =
  "主线页「切磋」发 c2s 3030（GReqStudy，字段 1 type、字段 2 opponent_id、字段 3 server_id）。默认本服 type=0，server_id=1（本机 server.id，文档默认 1；路由看 server_id，不看 type，填错会走跨服并可能卡住）。opponent_id 不预填，不能是自己。示例 type=0、opponent_id=2、server_id=1 整帧 0a000000d60b0000080010021801，不是空壳 04000000d60b0000。页上不默认发出 opponent_id=2。挂在已合 3102 / 3103 旁边，点「切磋」才发，不从 3102 自动接，成功后也不自动发 3102。3030 开战 STUDY 并落库，随后可用 report.battle_id 再点已接的 3102。3001/3006 不落库。须已有 3007。不重发 3006、3102、3103、3012、3010、3001、3007、3004、3099、3101、18001、3203。不发 3002、3005、3008、3011。硬禁 3013。不发 3100、3097、3098。不是 18001。硬禁 4601、29001。不把 Mock 1201/1202 当真服。report 走 decodeWireBattleReport，rounds 走 planWireSpineReplay。不进 pullIdle，不夹活动号。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。无领奖，无扣钻，不推进 chapterId。胜了不回拉 3007。不写金币，不写钻石。不改 Boot";

export const WIRE_STUDY_SIDE_EFFECT =
  "开战 STUDY 并落库战报。无领奖，无扣钻，不推进 chapterId。胜了不回拉 3007。不自动发 3102。带 type、opponent_id、server_id，不是空壳，主线页点「切磋」才发。不进 pullIdle。不发 3002。不发 3005。不发 3008、3011。硬禁 3013。不发 3100、3097、3098。不是 18001。不重发 3007、3006、3001、3010、3012、3102、3103、3099、3101、3203。硬禁 4601、29001。server_id 决定路由。本服必须填本机 server.id。opponent_id 不能是自己";

/** 本刀不编码这些号。3006 / 3102 / 3103 / 3001 已有自己的帧。3013 硬禁。18001 仍由竞技场模块编码，不能编成 3030。 */
export const WIRE_STUDY_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.3100",
  "wire.3097",
  "wire.3098",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireStudyQuery {
  type: number;
  opponentId: number;
  serverId: number;
}

export interface WireStudySnapshot {
  /** 空包体。report 和 type 都保持缺省。 */
  empty: boolean;
  /** 字段 1。没有时是 null。 */
  report: WireBattleReport | null;
  /** 字段 2。没有时是 null，不写成 0。 */
  type: number | null;
  marks: WireBattleMark[];
}

/** 只有 1 才是跨服。缺省、空白和其它数都收成本服 0。 */
export function normalizeWireStudyType(value: unknown): number {
  if (value === 1 || value === "1") return 1;
  if (typeof value === "number" && Number.isFinite(value) && Math.floor(value) === 1) return 1;
  if (typeof value === "string" && value.trim() === "1") return 1;
  return WIRE_STUDY_DEFAULT_TYPE;
}

/** 小于 1、缺省或不是整数时写成文档默认 1。不把 0 编出去。 */
export function normalizeWireStudyServerId(value: unknown): number {
  const parsed = positiveInt(value);
  if (parsed === null) return WIRE_STUDY_DEFAULT_SERVER_ID;
  return parsed;
}

/** 不是正整数时返回 null。不发明对手，也不接受 0。 */
export function normalizeWireStudyOpponentId(value: unknown): number | null {
  return positiveInt(value);
}

export function readWireStudyQuery(data: unknown): WireStudyQuery | null {
  let type: unknown = WIRE_STUDY_DEFAULT_TYPE;
  let opponent: unknown = null;
  let server: unknown = WIRE_STUDY_DEFAULT_SERVER_ID;
  if (data && typeof data === "object") {
    const raw = data as { type?: unknown; opponentId?: unknown; serverId?: unknown };
    if (raw.type !== undefined) type = raw.type;
    if (raw.opponentId !== undefined) opponent = raw.opponentId;
    if (raw.serverId !== undefined) server = raw.serverId;
  }
  const opponentId = normalizeWireStudyOpponentId(opponent);
  if (opponentId === null) return null;
  return {
    type: normalizeWireStudyType(type),
    opponentId,
    serverId: normalizeWireStudyServerId(server),
  };
}

/** GReqStudy。三个字段都写。type=0、opponent_id=2、server_id=1 的包体是 `08 00 10 02 18 01`。 */
export function encodeWireStudyBody(type: number, opponentId: number, serverId: number): Uint8Array {
  const query = readWireStudyQuery({ type, opponentId, serverId });
  if (!query) return new Uint8Array(0);
  const parts: number[] = [];
  pushVarint(parts, (WIRE_STUDY_TYPE_FIELD << 3) | 0);
  pushVarint(parts, query.type);
  pushVarint(parts, (WIRE_STUDY_OPPONENT_FIELD << 3) | 0);
  pushVarint(parts, query.opponentId);
  pushVarint(parts, (WIRE_STUDY_SERVER_FIELD << 3) | 0);
  pushVarint(parts, query.serverId);
  return Uint8Array.from(parts);
}

/** report.battle_id 写成 3102 的字符串。没有时是 null，不写成 1，也不写成 0。出现的 0 仍是 "0"。 */
export function wireStudyBattleIdText(snap: WireStudySnapshot | null): string | null {
  if (!snap || !snap.report || snap.report.battleId === null) return null;
  return String(Math.floor(snap.report.battleId));
}

/**
 * 解 s2c 3030。空包体返回已同步空表。
 * 超长、坏 varint、report 有包但整段解不开时返回 null，调用方保持上一次。
 */
export function decodeWireStudy(body: Uint8Array | null | undefined): WireStudySnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, report: null, type: null, marks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const snap: WireStudySnapshot = {
    empty: false,
    report: null,
    type: null,
    marks: [],
  };
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_STUDY_REPORT_FIELD && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeWireBattleReport(row.bytes);
      if (!parsed) continue;
      snap.report = parsed;
      continue;
    }
    if (row.field === WIRE_STUDY_TYPE_ECHO_FIELD && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) snap.marks.push(mark);
      } else {
        snap.type = value;
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) snap.marks.push(mark);
  }
  if (blobs > 0 && !snap.report) return null;
  return snap;
}

/** 主线页上的切磋。null 是还没同步。空包体写「已同步空表」。缺的 type 不写成 0。 */
export function formatWireStudy(snap: WireStudySnapshot | null): string {
  if (!snap) return "切磋 " + WIRE_STUDY_UNSYNCED;
  if (snap.empty) return "切磋 " + WIRE_STUDY_EMPTY;
  const parts: string[] = [];
  if (snap.type !== null) parts.push("type=" + String(snap.type));
  if (snap.report) {
    if (snap.report.battleId !== null) parts.push("battle_id " + String(snap.report.battleId));
    parts.push("rounds " + snap.report.rounds.length);
  } else {
    parts.push(WIRE_STUDY_NO_REPORT);
  }
  const line = parts.length === 0 ? "切磋 " + WIRE_STUDY_ABSENT : "切磋 " + parts.join(" / ");
  return joinMarks(line, snap.marks);
}

function positiveInt(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 1) return null;
    return value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\r\n]/g, "").trim();
  if (!trimmed || !/^[0-9]+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function joinMarks(line: string, marks: WireBattleMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  const n = Math.min(marks.length, 6);
  for (let i = 0; i < n; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  if (marks.length > n) parts.push("其余 " + (marks.length - n) + " 项");
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireBattleMark | null {
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
