/**
 * 真服穿戴皮肤英雄列表只读。c2s / s2c 都是 4401。
 * c2s 是 GReqHeroFashion，空体，没有 page。整帧 04 00 00 00 31 11 00 00，即 0400000031110000。
 * 4401 = 0x1131，小端是 31 11 00 00。空体一次。
 * 不是激活皮肤列表 4402。不是头像框数据 32001。
 * 4402 已合。本刀不重复拉 4402。与 4402 分刀，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 4402 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。
 * 4406 无实现，勿发。4201 英雄祈愿数据另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 4401 是 GResHeroFashion。repeated PSHeroFashion list。
 * 仓库里其它消息也是按声明顺序从 1 编号。list 是字段 1。
 * PSHeroFashion 的 hero_id、fashion_id 按声明顺序是 1、2。
 * 没有这个字段时保持缺省，不写成 0。出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步，list 为空，页上写「空穿戴」。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroFashion。 */
export const WIRE_WORN_FASHION_CMD = "wire.4401";

export const WIRE_WORN_FASHION_READONLY_TITLE = "穿戴皮肤英雄列表（真服只读）";
export const WIRE_WORN_FASHION_EMPTY = "空穿戴";
export const WIRE_WORN_FASHION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_WORN_FASHION_READONLY_NOTE =
  "只读展示 hero_id、fashion_id。无激活、替换、升级入口。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。4406 无实现，勿发。与 4402 分刀，勿合并请求。本刀不重复拉 4402。4201 英雄祈愿数据另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_WORN_FASHION_SIDE_EFFECT =
  "轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。空 c2s 一次，无 page，挂在 4402 之后。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。4406 无实现，勿发。与 4402 分刀，勿合并。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁";
export const WIRE_WORN_FASHION_FIELD_NOTE =
  "list 的 hero_id、fashion_id。没有的数不写成 0。对不上的号按字段号写";

export interface WireWornFashionMark {
  field: number;
  text: string;
}

export interface WireWornFashionRow {
  /** PSHeroFashion.hero_id。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  heroId: number | null;
  /** PSHeroFashion.fashion_id。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  fashionId: number | null;
  /** 对不上这两个字段的号。 */
  marks: WireWornFashionMark[];
}

export interface WireWornFashionSnapshot {
  /** GResHeroFashion.list。没有这个字段时是空数组，不写成 0。 */
  list: WireWornFashionRow[];
  /** 对不上字段 1 的外层号。 */
  marks: WireWornFashionMark[];
}

/**
 * 解 s2c 4401。空包体返回已同步的空穿戴。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireWornFashion(body: Uint8Array | null | undefined): WireWornFashionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const list: WireWornFashionRow[] = [];
  const marks: WireWornFashionMark[] = [];
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

/** 页上写穿戴条数。没有时写「空穿戴」。 */
export function formatWireWornFashionHead(snap: WireWornFashionSnapshot): string {
  const list = snap.list.length === 0 ? WIRE_WORN_FASHION_EMPTY : snap.list.length + " 条";
  return joinMarks("list=" + list, snap.marks);
}

/** 行上写两个字段。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireWornFashionLine(row: WireWornFashionRow): string {
  return joinMarks("hero_id=" + numText(row.heroId) + " / fashion_id=" + numText(row.fashionId), row.marks);
}

export function wireWornFashionNote(snap: WireWornFashionSnapshot): string {
  const head = formatWireWornFashionHead(snap);
  const tail = WIRE_WORN_FASHION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.list.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.list.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireWornFashionLine(snap.list[i]));
  if (snap.list.length > n) parts.push("其余 " + (snap.list.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireWornFashionSnapshot {
  return { list: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireWornFashionMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireWornFashionMark[]): string {
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

function decodeRow(body: Uint8Array): WireWornFashionRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireWornFashionMark[] = [];
  let heroId: number | null = null;
  let fashionId: number | null = null;
  let sawHero = false;
  let sawFashion = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawHero) {
        sawHero = true;
        heroId = nonNegative(row.varint);
        if (heroId === null) {
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
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { heroId, fashionId, marks };
}

function markOf(row: RawField): WireWornFashionMark | null {
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
