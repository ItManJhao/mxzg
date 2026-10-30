/**
 * 真服激活皮肤列表只读。c2s / s2c 都是 4402。
 * c2s 是 GReqHeroFashionList，空体，没有 page。整帧 04 00 00 00 32 11 00 00，即 0400000032110000。
 * 4402 = 0x1132，小端是 32 11 00 00。空体一次。
 * 不是头像框数据 32001。不是头像列表 34001。不是角色资料 2001。
 * 勿与 32001 合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 32001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。
 * 4406 无实现，勿发。4401 穿戴皮肤英雄列表另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 4402 是 GResHeroFashionList。repeated PSFashionData list。
 * 仓库里其它消息也是按声明顺序从 1 编号。list 是字段 1。
 * PSFashionData 的 hero_type、fashion_id、level、status、end_time 按声明顺序是 1、2、3、4、5。
 * status：0 永久，1 限时。没有这个字段时保持缺省，不写成 0。出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步，list 为空，页上写「空皮肤」。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroFashionList。 */
export const WIRE_FASHION_CMD = "wire.4402";

export const WIRE_FASHION_READONLY_TITLE = "激活皮肤列表（真服只读）";
export const WIRE_FASHION_EMPTY = "空皮肤";
export const WIRE_FASHION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_FASHION_READONLY_NOTE =
  "只读展示 hero_type、fashion_id、level、status、end_time。status：0 永久，1 限时。无激活、替换、升级入口。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。4406 无实现，勿发。4401 穿戴皮肤英雄列表另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_FASHION_SIDE_EFFECT =
  "轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。空 c2s 一次，无 page，挂在 32001 之后。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁";
export const WIRE_FASHION_FIELD_NOTE =
  "list 的 hero_type、fashion_id、level、status、end_time。status：0 永久，1 限时。没有的数不写成 0。对不上的号按字段号写";

export interface WireFashionMark {
  field: number;
  text: string;
}

export interface WireFashionRow {
  /** PSFashionData.hero_type。没有时是 null，不写成 0。 */
  heroType: number | null;
  /** PSFashionData.fashion_id。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  fashionId: number | null;
  /** PSFashionData.level。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  level: number | null;
  /** PSFashionData.status。0 永久，1 限时。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  status: number | null;
  /** PSFashionData.end_time。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  endTime: number | null;
  /** 对不上这五个字段的号。 */
  marks: WireFashionMark[];
}

export interface WireFashionSnapshot {
  /** GResHeroFashionList.list。没有这个字段时是空数组，不写成 0。 */
  list: WireFashionRow[];
  /** 对不上字段 1 的外层号。 */
  marks: WireFashionMark[];
}

/**
 * 解 s2c 4402。空包体返回已同步的空皮肤。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireFashion(body: Uint8Array | null | undefined): WireFashionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const list: WireFashionRow[] = [];
  const marks: WireFashionMark[] = [];
  let rowBlobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      rowBlobs += 1;
      const parsed = decodeRow(row.bytes);
      if (!parsed) continue;
      list.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (rowBlobs > 0 && list.length === 0) return null;
  return { list, marks };
}

/** 页上写皮肤条数。没有时写「空皮肤」。 */
export function formatWireFashionHead(snap: WireFashionSnapshot): string {
  const list = snap.list.length === 0 ? WIRE_FASHION_EMPTY : snap.list.length + " 条";
  return joinMarks("list=" + list, snap.marks);
}

/** 行上写五个字段。没有的格子写「无」。出现的 0 仍写 0。status 0 写永久，1 写限时。 */
export function formatWireFashionLine(row: WireFashionRow): string {
  return joinMarks(
    "hero_type=" +
      numText(row.heroType) +
      " / fashion_id=" +
      numText(row.fashionId) +
      " / level=" +
      numText(row.level) +
      " / status=" +
      statusText(row.status) +
      " / end_time=" +
      numText(row.endTime),
    row.marks
  );
}

export function wireFashionNote(snap: WireFashionSnapshot): string {
  const head = formatWireFashionHead(snap);
  const tail = WIRE_FASHION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.list.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.list.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireFashionLine(snap.list[i]));
  if (snap.list.length > n) parts.push("其余 " + (snap.list.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireFashionSnapshot {
  return { list: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function statusText(value: number | null): string {
  if (value === null) return "无";
  if (value === 0) return "0 永久";
  if (value === 1) return "1 限时";
  return String(value);
}

function joinMarks(line: string, marks: WireFashionMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireFashionMark[]): string {
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

function decodeRow(body: Uint8Array): WireFashionRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireFashionMark[] = [];
  let heroType: number | null = null;
  let fashionId: number | null = null;
  let level: number | null = null;
  let status: number | null = null;
  let endTime: number | null = null;
  let sawHero = false;
  let sawFashion = false;
  let sawLevel = false;
  let sawStatus = false;
  let sawEnd = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawHero) {
        sawHero = true;
        heroType = nonNegative(row.varint);
        if (heroType === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawFashion) {
        sawFashion = true;
        fashionId = nonNegative(row.varint);
        if (fashionId === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 3 && row.kind === "varint") {
      if (!sawLevel) {
        sawLevel = true;
        level = nonNegative(row.varint);
        if (level === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 4 && row.kind === "varint") {
      if (!sawStatus) {
        sawStatus = true;
        status = nonNegative(row.varint);
        if (status === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 5 && row.kind === "varint") {
      if (!sawEnd) {
        sawEnd = true;
        endTime = nonNegative(row.varint);
        if (endTime === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { heroType, fashionId, level, status, endTime, marks };
}

function markOf(row: RawField): WireFashionMark | null {
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

function nonNegative(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value) || value < 0) return null;
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

/** protobuf int64 的 -1：九个 0xFF 再加 0x01。没有约定时不当成 0，调用方按缺省或字段号记下。 */
function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
