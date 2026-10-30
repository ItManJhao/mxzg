/**
 * 真服阵法只读。c2s / s2c 都是 3099。
 * c2s 是 GReqQueryFormation，空体，没有 page。整帧 04 00 00 00 1B 0C 00 00，即 040000001b0c0000。
 * 3099 = 0x0C1B，小端是 1B 0C 00 00。空体一次。
 * 服侧 BattleHandler.queryFormation @CMD _3099；CmdCode._3099；FormationService.getFormation；BattleGMsg.GReq/GResQueryFormation。
 * 不是契约 28107。不是神兵道具 75615。不是职级信息 75606。
 * 28107、75615 已合。本刀不重复拉 28107，也不重复拉 75615。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 28107 之后发出，只发一次。Boot.ts 不改。
 * 主线页「查询阵法」再发同一空帧，挂在已合 3101 旁边、已合 3007 之后、进战之前。
 * 不从 3001、3101、3102、3103、3030 自动接。不进 pullIdle 的加发。不发 3098。不发 3100。不接 3020。
 * 这一帧只展示 unlockIds。客户端不改阵法，不落库，无扣费。
 * 不夹在 2001 和 3007 中间。
 * 不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。
 * 邻近勿发 3102 查战报、3030 切磋。
 * 3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许 getFormation 轻懒建（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 3099 是 GResQueryFormation。unlockIds 是字段 1，repeated int32，已解锁阵法。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * unlockIds 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 服不保证顺序。客户端按出现顺序写，不排序。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。unlockIds 为空，页上写「空阵法」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.formation。 */
export const WIRE_FORMATION_CMD = "wire.3099";

export const WIRE_FORMATION_READONLY_TITLE = "查询阵法（真服只读）";
export const WIRE_FORMATION_EMPTY = "空阵法";
export const WIRE_FORMATION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_FORMATION_READONLY_NOTE =
  "只读展示已解锁阵法 unlockIds。不保证顺序，按出现顺序写。无解锁阵法、保存战斗队列入口。不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。不发 3102 查战报、3030 切磋。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_FORMATION_SIDE_EFFECT =
  "轻懒建（getFormation：无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。空 c2s 一次，无 page，挂在 28107 之后。只发 cmd=3099，空帧 040000001b0c0000。不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。不发 3102 查战报、3030 切磋。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615";
export const WIRE_FORMATION_FIELD_NOTE =
  "unlockIds。已解锁阵法 id。不保证顺序。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

/** GReqQueryFormation 没有字段。3099 = 0x0C1B，小端 1b 0c 00 00。整帧 040000001b0c0000。 */
export const WIRE_FORMATION_FRAME = "040000001b0c0000";

export const WIRE_FORMATION_PROBE_UNSYNCED = "真服未同步";
export const WIRE_FORMATION_PROBE_UNSYNCED_TOAST = "真服未同步";

export const WIRE_FORMATION_PROBE_NOTE =
  "主线页「查询阵法」发空 c2s 3099（GReqQueryFormation 无字段，整帧 040000001b0c0000，小端 1b 0c 00 00）。挂在已合 3101 旁边、已合 3007 之后、进战之前，和 3101、3102、3103、3030 探针并排。登录链里的空 3099 仍在。本按钮不进 pullIdle，不重发 3101、3007、3001、3006、3004、3102、3103、3030。不从 3001、3101、3102、3103、3030 自动接。s2c GResQueryFormation 展示 unlockIds。缺字段不写成 0。出现的 0 仍写 0。只读。不落库，无扣费，不改阵法。不发 3098。不发 3100。不接 3020。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。不把 Mock 1201/1202 当真服。不写金币，不写钻石。不写 Session.stageId。不回落 Mock。不改 Boot。不从本探针自动发 3001 或 3101";

export const WIRE_FORMATION_PROBE_SIDE_EFFECT =
  "只读查询阵法。展示 unlockIds。不落库，无扣费，不改阵法。空壳 040000001b0c0000，主线页点「查询阵法」才再发，挂在已合 3101 旁边、已合 3007 之后、进战之前，和 3101、3102、3103、3030 探针并排。不从 3001、3101、3102、3103、3030 自动接。不进 pullIdle。不发 3098。不发 3100。不接 3020。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。不重发 3101、3007、3001、3006、3004、3102、3103、3030。不写金币，不写钻石。不写 Session.stageId";

/** 本刀不编码这些号。3099 自己的空帧已由登录链编码。3098、3100 有写，不能编成 3099。3020 不接。3013 硬禁。 */
export const WIRE_FORMATION_PROBE_BANNED_CMDS = [
  "wire.3098",
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

export interface WireFormationMark {
  field: number;
  text: string;
}

export interface WireFormationSnapshot {
  /** GResQueryFormation.unlockIds。没有这个字段时是空数组，不写成 0。 */
  unlockIds: number[];
  /** 对不上字段 1 的外层号。 */
  marks: WireFormationMark[];
}

/**
 * 解 s2c 3099。空包体返回已同步的空阵法。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireFormation(body: Uint8Array | null | undefined): WireFormationSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const unlockIds: number[] = [];
  const marks: WireFormationMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        unlockIds.push(value);
      }
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) unlockIds.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { unlockIds, marks };
}

/**
 * 主线页「查询阵法」。null 是还没同步。
 * 写出 unlockIds。没有这个字段时写「unlockIds 空」，不写成 0。出现的 0 仍写 0。不排序。
 */
export function formatWireFormationProbe(snap: WireFormationSnapshot | null): string {
  if (!snap) return "查询阵法 " + WIRE_FORMATION_PROBE_UNSYNCED;
  const list = snap.unlockIds.length === 0 ? "unlockIds 空" : "unlockIds=" + numList(snap.unlockIds);
  let text = "查询阵法 " + list;
  if (snap.marks.length > 0) text += " / " + marksText(snap.marks);
  return text;
}

/** 页上写 unlockIds。没有时写「空阵法」。出现的 0 仍写 0。不排序。 */
export function formatWireFormationHead(snap: WireFormationSnapshot): string {
  const list = snap.unlockIds.length === 0 ? WIRE_FORMATION_EMPTY : numList(snap.unlockIds);
  return joinMarks("unlockIds=" + list, snap.marks);
}

/** 一行一个已解锁阵法 id。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireFormationLine(id: number): string {
  return "id=" + String(id);
}

export function wireFormationNote(snap: WireFormationSnapshot): string {
  const head = formatWireFormationHead(snap);
  const tail = WIRE_FORMATION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.unlockIds.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.unlockIds.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireFormationLine(snap.unlockIds[i]));
  if (snap.unlockIds.length > n) parts.push("其余 " + (snap.unlockIds.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireFormationSnapshot {
  return { unlockIds: [], marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireFormationMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireFormationMark[]): string {
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

function markOf(row: RawField): WireFormationMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
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
