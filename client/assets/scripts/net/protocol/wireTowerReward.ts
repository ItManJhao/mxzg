/**
 * 真服爬塔首通已领只读。c2s / s2c 都是 3203。
 * c2s 是 GReqTowerRewardList，空体，没有 page。整帧 04 00 00 00 83 0C 00 00，即 04000000830c0000。
 * 3203 = 0x0C83，小端是 83 0C 00 00。空体一次。
 * 服侧 TowerHandler.towerRewardList @CMD _3203；TowerGMsg.GReq/GResTowerRewardList；CmdCode._3203。
 * 副作用是 towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。
 * 无扣费，无领奖，无养成写。轻懒建可接受。
 * 不是进行中活动 20101。不是副本队列 3101。不是阵法 3099。不是世界等级 51001。不是背包 5001。
 * 20101 已合。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 20101 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 20101 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 3202 买票、3204 领首通、3205 战斗结束、3206 扫荡、3220 编辑 npc。
 * 另只读 3200（含门票回复写库）本轮勿挂、勿编码。
 * 4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 3099、3101、20101 勿再发。
 * 不从本帧发 3012、3010。不做 19001。12020 每日任务列表另只读接在 13010 之后，勿与本帧合并。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 3203 是 GResTowerRewardList。list 是字段 1，repeated int32，已领爬塔首通 idx。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * list 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 服不保证顺序。客户端按出现顺序写，不排序。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。list 为空，页上写「空已领首通」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.towerReward。 */
export const WIRE_TOWER_REWARD_CMD = "wire.3203";

export const WIRE_TOWER_REWARD_FRAME = "04000000830c0000";
export const WIRE_TOWER_REWARD_READONLY_TITLE = "爬塔首通已领（真服只读）";
export const WIRE_TOWER_REWARD_EMPTY = "空已领首通";
export const WIRE_TOWER_REWARD_UNSYNCED_TOAST = "真服未同步";
export const WIRE_TOWER_REWARD_READONLY_NOTE =
  "只读展示已领爬塔首通 idx。缺字段保持缺省。出现的值如实展示。无买票、领首通、战斗结束、扫荡、编辑 npc 入口。不发 3202、3204、3205、3206、3220。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不从本帧发 3012、3010。不做 19001。12020 每日任务列表另只读接在 13010 之后，勿与本帧合并。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_TOWER_REWARD_SIDE_EFFECT =
  "towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。无扣费，无领奖，无养成写。轻懒建可接受。空 c2s 一次，无 page，挂在 20101 之后。只发 cmd=3203，空帧 04000000830c0000。不发 3202 买票、3204 领首通、3205 战斗结束、3206 扫荡、3220 编辑 npc。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不从本帧发 3012、3010。不做 19001。12020 每日任务列表另只读接在 13010 之后，勿与本帧合并。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_TOWER_REWARD_FIELD_NOTE =
  "list。已领爬塔首通 idx。字段 1，repeated int32。不保证顺序。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。5001 / 51001 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。3010、3012 已由主线战斗链自己编码，不在这张表里；3203 不发 3010，也不发 3012。 */
export const WIRE_TOWER_REWARD_BANNED_CMDS = [
  "wire.3202",
  "wire.3204",
  "wire.3205",
  "wire.3206",
  "wire.3220",
  "wire.3200",
  "wire.20011",
  "wire.19001",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireTowerRewardMark {
  field: number;
  text: string;
}

export interface WireTowerRewardSnapshot {
  /** GResTowerRewardList.list。没有这个字段时是空数组，不写成 0。 */
  list: number[];
  /** 对不上字段 1 的外层号。 */
  marks: WireTowerRewardMark[];
}

/**
 * 解 s2c 3203。空包体返回已同步的空已领首通。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireTowerReward(body: Uint8Array | null | undefined): WireTowerRewardSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const list: number[] = [];
  const marks: WireTowerRewardMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        list.push(value);
      }
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) list.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { list, marks };
}

/** 页上写 list。没有时写「空已领首通」。出现的 0 仍写 0。不排序。 */
export function formatWireTowerRewardHead(snap: WireTowerRewardSnapshot): string {
  const list = snap.list.length === 0 ? WIRE_TOWER_REWARD_EMPTY : numList(snap.list);
  return joinMarks("list=" + list, snap.marks);
}

/** 一行一个已领爬塔首通 idx。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireTowerRewardLine(idx: number): string {
  return "idx=" + String(idx);
}

export function wireTowerRewardNote(snap: WireTowerRewardSnapshot): string {
  const head = formatWireTowerRewardHead(snap);
  const tail = WIRE_TOWER_REWARD_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.list.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.list.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireTowerRewardLine(snap.list[i]));
  if (snap.list.length > n) parts.push("其余 " + (snap.list.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireTowerRewardSnapshot {
  return { list: [], marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireTowerRewardMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireTowerRewardMark[]): string {
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

function markOf(row: RawField): WireTowerRewardMark | null {
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
