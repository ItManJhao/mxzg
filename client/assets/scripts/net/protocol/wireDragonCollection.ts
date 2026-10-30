/**
 * 真服圣物图鉴只读。c2s / s2c 都是 59010。
 * c2s 是 GReqDragonCollection，没有字段，没有 page。整帧 04 00 00 00 82 e6 00 00，即 0400000082e60000。
 * 59010 = 0xE682，小端是 82 e6 00 00。空体一次。handler 不读 msg。
 * 不是圣龙数据 59001。不是魔方数据 75501。不是角色资料 2001。
 * 勿与 59001 合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 59001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 34001。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011 升星、59012 升星、59013 分解。
 * 服侧轻懒建：与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 59010 是 GResDragonCollection。repeated int32 sys_id，图鉴 manuals。
 * 仓库里其它消息也是按声明顺序从 1 编号。sys_id 是字段 1。
 * 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 没有的数不写成 0。出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步，sys_id 为空，页上写「空图鉴」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.dragonCollection。 */
export const WIRE_DRAGON_COLLECTION_CMD = "wire.59010";

export const WIRE_DRAGON_COLLECTION_READONLY_TITLE = "圣物图鉴（真服只读）";
export const WIRE_DRAGON_COLLECTION_EMPTY = "空图鉴";
export const WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_DRAGON_COLLECTION_READONLY_NOTE =
  "只读展示，无放源石、提升鉴定、加速鉴定、鉴定领奖、提升圣龙等级、圣物替换、调顺序、升星、分解入口。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001，不做 20011。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_DRAGON_COLLECTION_SIDE_EFFECT =
  "轻懒建。与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。空 c2s 一次，无 page，挂在 59001 之后。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001，不做 20011";
export const WIRE_DRAGON_COLLECTION_FIELD_NOTE = "sys_id。图鉴 manuals。没有的数不写成 0。对不上的号按字段号写";

export interface WireDragonCollectionMark {
  field: number;
  text: string;
}

export interface WireDragonCollectionSnapshot {
  /** GResDragonCollection.sys_id。没有这个字段时是空数组，不写成 0。 */
  sysIds: number[];
  /** 对不上字段 1 的外层号。 */
  marks: WireDragonCollectionMark[];
}

/**
 * 解 s2c 59010。空包体返回已同步的空图鉴。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireDragonCollection(body: Uint8Array | null | undefined): WireDragonCollectionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const sysIds: number[] = [];
  const marks: WireDragonCollectionMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) sysIds.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) sysIds.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { sysIds, marks };
}

/** 页上写 sys_id。没有时写「空图鉴」。出现的 0 仍写 0。 */
export function formatWireDragonCollectionHead(snap: WireDragonCollectionSnapshot): string {
  const list = snap.sysIds.length === 0 ? WIRE_DRAGON_COLLECTION_EMPTY : numList(snap.sysIds);
  return joinMarks("sys_id=" + list, snap.marks);
}

/** 一行一个 sys_id。出现的 0 仍写 0。 */
export function formatWireDragonCollectionLine(sysId: number): string {
  return "sys_id=" + String(sysId);
}

export function wireDragonCollectionNote(snap: WireDragonCollectionSnapshot): string {
  const head = formatWireDragonCollectionHead(snap);
  const tail = WIRE_DRAGON_COLLECTION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.sysIds.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.sysIds.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireDragonCollectionLine(snap.sysIds[i]));
  if (snap.sysIds.length > n) parts.push("其余 " + (snap.sysIds.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireDragonCollectionSnapshot {
  return { sysIds: [], marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireDragonCollectionMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireDragonCollectionMark[]): string {
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

function markOf(row: RawField): WireDragonCollectionMark | null {
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
