/**
 * 真服副本队列只读。c2s / s2c 都是 3101。
 * c2s 是 GReqLineUp，空体，没有 page。整帧 04 00 00 00 1D 0C 00 00，即 040000001d0c0000。
 * 3101 = 0x0C1D，小端是 1D 0C 00 00。空体一次。
 * 服侧 BattleHandler.getLineUp @CMD _3101；CmdCode._3101；HeroLineUpService.getHeroLineUps / fillLineUp；BattleGMsg.GReq/GResLineUp。
 * 不是阵法 3099。不是契约 28107。不是背包 5001。
 * 3099 已合。本刀不重复拉 3099。与 3099 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 3099 之后发出，只发一次。Boot.ts 不改。
 * 主线页「获取阵容」再发同一空帧，挂在已合 3007 之后、进战之前，和 3102、3103、3030 探针并排。
 * 不从 3001、3102、3103、3030 自动接。不进 pullIdle 的加发。不发 3100。不接 3020。
 * 这一帧只展示 list 与 assistance_unlock。客户端不改行，不落库，无扣费。
 * 不夹在 2001 和 3007 中间。
 * 不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。
 * 3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许 getHeroLineUps→fillLineUp 轻修复（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 3101 是 GResLineUp。list 是字段 1，repeated PSLineUpData。assistance_unlock 是字段 2，optional bool。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * PSLineUpData 里出现的号按字段号写，不排序。没有的数不写成 0。
 * assistance_unlock 没有时保持缺省，不写成 0，也不写成 false。出现的 0 仍写 0。出现的 1 仍写 1。
 * 对不上的号按字段号写。出现的值如实展示。出现的 -1 仍写 -1。
 *
 * 空包体是已同步。list 为空，assistance_unlock 保持缺省，页上写「空副本队列」。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.lineUp。 */
export const WIRE_LINEUP_CMD = "wire.3101";

export const WIRE_LINEUP_READONLY_TITLE = "副本队列（真服只读）";
export const WIRE_LINEUP_EMPTY = "空副本队列";
export const WIRE_LINEUP_ROW_EMPTY = "（缺省）";
export const WIRE_LINEUP_UNSYNCED_TOAST = "真服未同步";
export const WIRE_LINEUP_READONLY_NOTE =
  "只读展示副本队列 list 与 assistance_unlock。缺字段保持缺省。出现的值如实展示。无保存队列、无解锁阵法入口。不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_LINEUP_SIDE_EFFECT =
  "轻修复（getHeroLineUps→fillLineUp：formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。空 c2s 一次，无 page，挂在 3099 之后。只发 cmd=3101，空帧 040000001d0c0000。不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。20101 进行中活动另只读接在其后，勿合并";
export const WIRE_LINEUP_FIELD_NOTE =
  "list 为 repeated PSLineUpData，行上按字段号写。没有的数不写成 0。assistance_unlock 为 optional bool，没有时保持缺省。出现的 0 仍写 0，出现的 1 仍写 1。出现的值如实展示。对不上的号按字段号写";

/** GReqLineUp 没有字段。3101 = 0x0C1D，小端 1d 0c 00 00。整帧 040000001d0c0000。 */
export const WIRE_LINEUP_FRAME = "040000001d0c0000";

export const WIRE_LINEUP_PROBE_UNSYNCED = "真服未同步";
export const WIRE_LINEUP_PROBE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_LINEUP_PROBE_ABSENT = "未带";

export const WIRE_LINEUP_PROBE_NOTE =
  "主线页「获取阵容」发空 c2s 3101（GReqLineUp 无字段，整帧 040000001d0c0000，小端 1d 0c 00 00）。挂在已合 3007 之后、进战之前，和 3102、3103、3030 探针并排，给阵容 UI 填 list。登录链里的空 3101 仍在。本按钮不进 pullIdle，不重发 3007、3001、3006、3004、3102、3103、3030。不从 3001、3102、3103、3030 自动接。s2c GResLineUp 展示 list、assistance_unlock。缺字段不写成 0。出现的 0 仍写 0。出现的 1 仍写 1。只读。不落库，无扣费，不改阵容。不发 3100。不接 3020。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。不把 Mock 1201/1202 当真服。不写金币，不写钻石。不写 Session.stageId。不回落 Mock。不改 Boot。不从本探针自动发 3001";

export const WIRE_LINEUP_PROBE_SIDE_EFFECT =
  "只读获取阵容。展示 list 与 assistance_unlock。不落库，无扣费，不改阵容。空壳 040000001d0c0000，主线页点「获取阵容」才再发，挂在已合 3007 之后、进战之前，和 3102、3103、3030 探针并排。不从 3001、3102、3103、3030 自动接。不进 pullIdle。不发 3100。不接 3020。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。不重发 3007、3001、3006、3004、3102、3103、3030。不写金币，不写钻石。不写 Session.stageId";

/** 本刀不编码这些号。3101 自己的空帧已由登录链编码。3100 是保存队列，不能编成 3101。3020 不接。3013 硬禁。 */
export const WIRE_LINEUP_PROBE_BANNED_CMDS = [
  "wire.3100",
  "wire.3020",
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireLineUpMark {
  field: number;
  text: string;
}

export interface WireLineUpRow {
  /** PSLineUpData 里出现的字段。没有的号不在这里，不写成 0。 */
  marks: WireLineUpMark[];
}

export interface WireLineUpSnapshot {
  /** GResLineUp.list。没有这个字段时是空数组。 */
  rows: WireLineUpRow[];
  /** GResLineUp.assistance_unlock。没有时是 null，不写成 false。 */
  assistanceUnlock: boolean | null;
  /** 对不上字段 1、2 的外层号。字段 2 不是 0/1 时也记在这里。 */
  marks: WireLineUpMark[];
}

/**
 * 解 s2c 3101。空包体返回已同步的空队列，assistance_unlock 保持缺省。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireLineUp(body: Uint8Array | null | undefined): WireLineUpSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireLineUpRow[] = [];
  const marks: WireLineUpMark[] = [];
  let blobs = 0;
  let assistanceUnlock: boolean | null = null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeRow(row.bytes);
      if (!parsed) continue;
      rows.push(parsed);
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (row.varint === 0) {
        assistanceUnlock = false;
        continue;
      }
      if (row.varint === 1) {
        assistanceUnlock = true;
        continue;
      }
    }
    const mark = markOf(row, 0);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && rows.length === 0) return null;
  return { rows, assistanceUnlock, marks };
}

/** 页上写条数和 assistance_unlock。没有 list 时写「空副本队列」。没有 bool 时不写成 0。 */
export function formatWireLineUpHead(snap: WireLineUpSnapshot): string {
  const list = snap.rows.length === 0 ? WIRE_LINEUP_EMPTY : snap.rows.length + " 条";
  const unlock = snap.assistanceUnlock === null ? "" : " / assistance_unlock=" + (snap.assistanceUnlock ? "1" : "0");
  return joinMarks(list + unlock, snap.marks);
}

/**
 * 主线页「获取阵容」。null 是还没同步。
 * 写出 list 条数和 assistance_unlock。没有 bool 时写「未带」，不写成 0。
 * 有行时带上前几行，给旁边的阵容 UI 看。
 */
export function formatWireLineUpProbe(snap: WireLineUpSnapshot | null): string {
  if (!snap) return "获取阵容 " + WIRE_LINEUP_PROBE_UNSYNCED;
  const list = snap.rows.length === 0 ? "list 空" : "list " + snap.rows.length;
  const unlock =
    snap.assistanceUnlock === null
      ? "assistance_unlock " + WIRE_LINEUP_PROBE_ABSENT
      : "assistance_unlock=" + (snap.assistanceUnlock ? "1" : "0");
  let text = "获取阵容 " + list + " / " + unlock;
  if (snap.rows.length > 0) {
    const parts: string[] = [];
    const n = Math.min(snap.rows.length, 3);
    for (let i = 0; i < n; i++) parts.push(formatWireLineUpLine(snap.rows[i]));
    if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
    text += " / " + parts.join("；");
  }
  if (snap.marks.length > 0) text += " / " + marksText(snap.marks);
  return text;
}

/** 一行一个 PSLineUpData。没有字段时写「（缺省）」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireLineUpLine(row: WireLineUpRow): string {
  if (row.marks.length === 0) return WIRE_LINEUP_ROW_EMPTY;
  return marksText(row.marks);
}

export function wireLineUpNote(snap: WireLineUpSnapshot): string {
  const head = formatWireLineUpHead(snap);
  const tail = WIRE_LINEUP_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireLineUpLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireLineUpSnapshot {
  return { rows: [], assistanceUnlock: null, marks: [] };
}

function joinMarks(line: string, marks: WireLineUpMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireLineUpMark[]): string {
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

function decodeRow(body: Uint8Array): WireLineUpRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireLineUpMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i], 0);
    if (mark) marks.push(mark);
  }
  return { marks };
}

function markOf(row: RawField, depth: number): WireLineUpMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    return { field: row.field, text: formatBlob(row.bytes, depth) };
  }
  return { field: row.field, text: "未解" };
}

function formatBlob(bytes: Uint8Array, depth: number): string {
  if (bytes.length === 0) return "空";
  const text = utf8Printable(bytes);
  if (text !== null) return text;
  if (depth < 2) {
    const nested = readRawFields(bytes);
    if (nested && nested.length > 0) {
      const parts: string[] = [];
      for (let i = 0; i < nested.length; i++) {
        const mark = markOf(nested[i], depth + 1);
        if (mark) parts.push("字段" + mark.field + "=" + mark.text);
      }
      if (parts.length > 0) return parts.join(",");
    }
  }
  const packed = readPackedVarints(bytes);
  if (packed && packed.length > 0) {
    const n = Math.min(packed.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String(packed[i]));
    if (packed.length > n) return head.join(",") + "…+" + (packed.length - n);
    return head.join(",");
  }
  return "未解";
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

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
}

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    const value = accepted(val.value);
    if (value === null) return null;
    values.push(value);
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

/** protobuf int64 的 -1：九个 0xFF 再加 0x01。 */
function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
