/**
 * 真服宠物图鉴只读。c2s / s2c 都是 74104。
 * c2s 是 GReqPetIllustrate，空体，没有 page。整帧 04 00 00 00 78 21 01 00，即 0400000078210100。
 * 74104 = 0x12178，小端是 78 21 01 00。空体一次。
 * 不是宠物信息 74100。不是英雄祈愿数据 4201。
 * 74100、4201 已合。本刀不重复拉 74100，也不重复拉 4201。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 4201 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不发 74101 升级、74102 携带、74103 卸下。
 * 74105、74106 是背包增减推送，勿发、勿当拉包请求。
 * 28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许轻懒建空 PetIllustrate。无扣费，无发奖。只读展示。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 74104 是 GResPetIllustrate。petTypes 是 repeated int32，已解锁宠物类型。
 * 仓库里其它消息也是按声明顺序从 1 编号。petTypes 是字段 1。
 * 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步，petTypes 为空，页上写「空图鉴」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.petIllustrate。 */
export const WIRE_PET_ILLUSTRATE_CMD = "wire.74104";

export const WIRE_PET_ILLUSTRATE_READONLY_TITLE = "宠物图鉴（真服只读）";
export const WIRE_PET_ILLUSTRATE_EMPTY = "空图鉴";
export const WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_PET_ILLUSTRATE_READONLY_NOTE =
  "只读展示已解锁宠物类型 petTypes。无升级、携带、卸下入口。不发 74101 升级、74102 携带、74103 卸下。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_PET_ILLUSTRATE_SIDE_EFFECT =
  "轻懒建空 PetIllustrate。无扣费，无发奖。只读展示。空 c2s 一次，无 page，挂在 4201 之后。不发 74101、74102、74103。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201";
export const WIRE_PET_ILLUSTRATE_FIELD_NOTE =
  "petTypes。已解锁宠物类型。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

export interface WirePetIllustrateMark {
  field: number;
  text: string;
}

export interface WirePetIllustrateSnapshot {
  /** GResPetIllustrate.petTypes。没有这个字段时是空数组，不写成 0。 */
  petTypes: number[];
  /** 对不上字段 1 的外层号。 */
  marks: WirePetIllustrateMark[];
}

/**
 * 解 s2c 74104。空包体返回已同步的空图鉴。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWirePetIllustrate(body: Uint8Array | null | undefined): WirePetIllustrateSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const petTypes: number[] = [];
  const marks: WirePetIllustrateMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) petTypes.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) petTypes.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { petTypes, marks };
}

/** 页上写 petTypes。没有时写「空图鉴」。出现的 0 仍写 0。 */
export function formatWirePetIllustrateHead(snap: WirePetIllustrateSnapshot): string {
  const list = snap.petTypes.length === 0 ? WIRE_PET_ILLUSTRATE_EMPTY : numList(snap.petTypes);
  return joinMarks("petTypes=" + list, snap.marks);
}

/** 一行一个已解锁宠物类型。出现的 0 仍写 0。 */
export function formatWirePetIllustrateLine(petType: number): string {
  return "type=" + String(petType);
}

export function wirePetIllustrateNote(snap: WirePetIllustrateSnapshot): string {
  const head = formatWirePetIllustrateHead(snap);
  const tail = WIRE_PET_ILLUSTRATE_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.petTypes.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.petTypes.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWirePetIllustrateLine(snap.petTypes[i]));
  if (snap.petTypes.length > n) parts.push("其余 " + (snap.petTypes.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WirePetIllustrateSnapshot {
  return { petTypes: [], marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WirePetIllustrateMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WirePetIllustrateMark[]): string {
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

function markOf(row: RawField): WirePetIllustrateMark | null {
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
