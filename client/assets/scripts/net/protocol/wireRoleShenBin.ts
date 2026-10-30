/**
 * 真服神兵道具/精华只读。c2s / s2c 都是 75615。
 * c2s 是 GReqRoleShenBinInfo，空体，没有 page。整帧 04 00 00 00 5F 27 01 00，即 040000005f270100。
 * 75615 = 0x1275F，小端是 5F 27 01 00。空体一次。
 * 不是职级信息 75606。不是神兵数据 75601。
 * 75606、75601 已合。本刀不重复拉 75606，也不重复拉 75601。与已合刀分开发，勿合并成一个请求。
 * 75607 晋升职级同为空体，cmd 小端是 57 27 01 00，整帧 0400000057270100。只发 75615，不发 75607。
 *
 * 由 WireSession.pullIdle 在空 c2s 75606 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 75602 合成、75603 装备、75604 核心升级、75605 分解、75619。
 * 不发 75607 晋升职级、75609 职级任务手动完成。
 * 75608 是服推，勿当 c2s，不编码发出。
 * 28107 查看契约另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。
 * 客户端不把缺省填成 knighthoodId=1，也不把缺的 item_type / itemNum 写成 0。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 75615 是 GResRoleShenBinInfo。roleShenBins 是字段 1，repeated。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * 行上 item_type、itemNum 按声明顺序是 1、2。
 * item_type=902048 是 SHENBIN_ESSENCE 精华。其余 item_type 是 shenBinMap 材料，按原数写。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 *
 * 空包体是已同步。roleShenBins 为空，页上写「空神兵道具」。
 * roleShenBins 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.roleShenBin。 */
export const WIRE_ROLE_SHENBIN_CMD = "wire.75615";

/** SHENBIN_ESSENCE。出现这个 item_type 时在原数后标「精华」。 */
export const SHENBIN_ESSENCE = 902048;

export const WIRE_ROLE_SHENBIN_READONLY_TITLE = "神兵道具（真服只读）";
export const WIRE_ROLE_SHENBIN_EMPTY = "空神兵道具";
export const WIRE_ROLE_SHENBIN_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ROLE_SHENBIN_READONLY_NOTE =
  "只读展示 roleShenBins 的 item_type、itemNum。item_type=902048 是精华 SHENBIN_ESSENCE，其余是 shenBinMap 材料。无合成、装备、分解、晋升入口。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_ROLE_SHENBIN_SIDE_EFFECT =
  "允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。空 c2s 一次，无 page，挂在 75606 之后。只发 cmd=75615，空帧 040000005f270100。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601";
export const WIRE_ROLE_SHENBIN_FIELD_NOTE =
  "roleShenBins 行上写 item_type、itemNum。902048 是精华。其余 item_type 按原数写。没有的数不写成 0。出现的值如实展示";

export interface WireRoleShenBinMark {
  field: number;
  text: string;
}

export interface WireRoleShenBinItem {
  /** roleShenBins.item_type。没有时是 null，不写成 0。902048 是精华。 */
  itemType: number | null;
  /** roleShenBins.itemNum。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  itemNum: number | null;
  /** 对不上 1、2 的号。 */
  marks: WireRoleShenBinMark[];
}

export interface WireRoleShenBinSnapshot {
  /** GResRoleShenBinInfo.roleShenBins。没有这个字段时是空数组。 */
  items: WireRoleShenBinItem[];
  /** 对不上字段 1 的外层号。 */
  marks: WireRoleShenBinMark[];
}

/**
 * 解 s2c 75615。空包体返回已同步的空神兵道具。
 * 超长、坏 varint、roleShenBins 有包但一条都解不开时返回 null。
 */
export function decodeWireRoleShenBin(body: Uint8Array | null | undefined): WireRoleShenBinSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const items: WireRoleShenBinItem[] = [];
  const marks: WireRoleShenBinMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeItem(row.bytes);
      if (!parsed) continue;
      items.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && items.length === 0) return null;
  return { items, marks };
}

/** 页上写条数。没有时写「空神兵道具」。 */
export function formatWireRoleShenBinHead(snap: WireRoleShenBinSnapshot): string {
  const list = snap.items.length === 0 ? WIRE_ROLE_SHENBIN_EMPTY : snap.items.length + " 条";
  return joinMarks("roleShenBins=" + list, snap.marks);
}

/** 一行一个 roleShenBins。没有的格子写「无」。出现的 0 仍写 0。出现的 -1 仍写 -1。902048 标精华。 */
export function formatWireRoleShenBinLine(row: WireRoleShenBinItem): string {
  const line = "item_type=" + typeText(row.itemType) + " / itemNum=" + numText(row.itemNum);
  return joinMarks(line, row.marks);
}

/** 先写头，再写行。给页面和日志用。 */
export function formatWireRoleShenBinRows(snap: WireRoleShenBinSnapshot): string[] {
  const rows: string[] = [];
  for (let i = 0; i < snap.items.length; i++) rows.push(formatWireRoleShenBinLine(snap.items[i]));
  return rows;
}

export function wireRoleShenBinNote(snap: WireRoleShenBinSnapshot): string {
  const head = formatWireRoleShenBinHead(snap);
  const tail = WIRE_ROLE_SHENBIN_SIDE_EFFECT + "。不写金币，不写钻石";
  const rows = formatWireRoleShenBinRows(snap);
  if (rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(rows[i]);
  if (rows.length > n) parts.push("其余 " + (rows.length - n) + " 行");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireRoleShenBinSnapshot {
  return { items: [], marks: [] };
}

function typeText(value: number | null): string {
  if (value === null) return "无";
  if (value === SHENBIN_ESSENCE) return String(value) + "（精华）";
  return String(value);
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireRoleShenBinMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireRoleShenBinMark[]): string {
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

function decodeItem(body: Uint8Array): WireRoleShenBinItem | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireRoleShenBinMark[] = [];
  let itemType: number | null = null;
  let itemNum: number | null = null;
  let sawType = false;
  let sawNum = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawType) {
        sawType = true;
        itemType = accepted(row.varint);
        if (itemType === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawNum) {
        sawNum = true;
        itemNum = accepted(row.varint);
        if (itemNum === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { itemType, itemNum, marks };
}

function markOf(row: RawField): WireRoleShenBinMark | null {
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
