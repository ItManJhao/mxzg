/**
 * 真服称号列表只读。c2s / s2c 都是 55001。
 * c2s 是 GReqScanTitleList，没有字段，没有 page。整帧 04 00 00 00 d9 d6 00 00，即 04000000d9d60000。
 * 55001 = 0xD6D9，小端是 d9 d6 00 00。空体一次。
 * 不是圣物图鉴 59010。不是圣龙数据 59001。不是角色资料 2001。
 * 勿与 59010 合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 59010 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。34001 是另只读，单独在本帧之后拉包，勿与本请求合并。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * Title.proto 仅 55001 读写对，同模块无写号。仍不发其它模块的写号。
 * 服侧轻懒建：TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 55001 是 GResScanTitleList。repeated PSTitle titles。
 * 仓库里其它消息也是按声明顺序从 1 编号。titles 是字段 1。
 * PSTitle 的 idx 是字段 1，end_time 是字段 2。
 * end_time：-1 永久，0 未激活，时间戳为到期。没有这个字段时保持缺省，不写成 0。出现的 0 仍写 0。
 * -1 按 protobuf int64 十字节符号扩展（ff ff ff ff ff ff ff ff ff 01）读成 -1，不当成缺字段，也不写成 0。
 * 对不上的号按字段号写。
 *
 * 空包体是已同步，titles 为空，页上写「空称号」。
 * titles 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.scanTitleList。 */
export const WIRE_TITLE_CMD = "wire.55001";

export const WIRE_TITLE_READONLY_TITLE = "称号列表（真服只读）";
export const WIRE_TITLE_EMPTY = "空称号";
export const WIRE_TITLE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_TITLE_READONLY_NOTE =
  "只读展示 idx、end_time。end_time：-1 永久，0 未激活，时间戳为到期。无扣费、领奖、日刷入口。Title.proto 仅 55001 读写对，同模块无写号。34001 另只读接在其后。不做 20011。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_TITLE_SIDE_EFFECT =
  "轻懒建。TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。空 c2s 一次，无 page，挂在 59010 之后。Title.proto 仅 55001 读写对，同模块无写号。34001 另只读接在 55001 之后，勿合并。不做 20011";
export const WIRE_TITLE_FIELD_NOTE =
  "titles 的 idx、end_time。end_time：-1 永久，0 未激活，时间戳为到期。没有的数不写成 0。对不上的号按字段号写";

export interface WireTitleMark {
  field: number;
  text: string;
}

export interface WireTitleRow {
  /** PSTitle.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** PSTitle.end_time。-1 永久，0 未激活，时间戳为到期。没有时是 null，不写成 0。 */
  endTime: number | null;
  /** 对不上 idx、end_time 的号。 */
  marks: WireTitleMark[];
}

export interface WireTitleSnapshot {
  /** GResScanTitleList.titles。没有这个字段时是空数组，不写成 0。 */
  titles: WireTitleRow[];
  /** 对不上字段 1 的外层号。 */
  marks: WireTitleMark[];
}

/**
 * 解 s2c 55001。空包体返回已同步的空称号。
 * 超长、坏 varint、titles 有包但一条都解不开时返回 null。
 */
export function decodeWireTitle(body: Uint8Array | null | undefined): WireTitleSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const titles: WireTitleRow[] = [];
  const marks: WireTitleMark[] = [];
  let titleBlobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      titleBlobs += 1;
      const parsed = decodeTitle(row.bytes);
      if (!parsed) continue;
      titles.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (titleBlobs > 0 && titles.length === 0) return null;
  return { titles, marks };
}

/** 页上写称号条数。没有时写「空称号」。 */
export function formatWireTitleHead(snap: WireTitleSnapshot): string {
  const list = snap.titles.length === 0 ? WIRE_TITLE_EMPTY : snap.titles.length + " 条";
  return joinMarks("titles=" + list, snap.marks);
}

/** 行上写 idx / end_time。没有的格子写「无」。出现的 0 仍写 0。-1 写永久。时间戳写到期。 */
export function formatWireTitleLine(row: WireTitleRow): string {
  return joinMarks("idx=" + numText(row.idx) + " / end_time=" + endTimeText(row.endTime), row.marks);
}

export function wireTitleNote(snap: WireTitleSnapshot): string {
  const head = formatWireTitleHead(snap);
  const tail = WIRE_TITLE_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.titles.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.titles.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireTitleLine(snap.titles[i]));
  if (snap.titles.length > n) parts.push("其余 " + (snap.titles.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireTitleSnapshot {
  return { titles: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function endTimeText(value: number | null): string {
  if (value === null) return "无";
  if (value === -1) return "-1 永久";
  if (value === 0) return "0 未激活";
  return String(value) + " 到期";
}

function joinMarks(line: string, marks: WireTitleMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireTitleMark[]): string {
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

function decodeTitle(body: Uint8Array): WireTitleRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireTitleMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    idx: nonNegativeVarint(fields, 1),
    endTime: endTimeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WireTitleMark | null {
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

function nonNegativeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

/** end_time 保留 -1。其它负数没有约定，不写成 0，也不当成已出现。 */
function endTimeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint)) continue;
    if (row.varint === -1) return -1;
    if (row.varint < 0) continue;
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
