/**
 * 真服神兵数据只读。c2s / s2c 都是 75601。
 * c2s 是 GReqShenBinInfo，空体，没有 page。整帧 04 00 00 00 51 27 01 00，即 0400000051270100。
 * 75601 = 0x12751，小端是 51 27 01 00。空体一次。
 * 不是羁绊皮肤 28200。不是羁绊数据 28100。
 * 28200、28100 已合。本刀不重复拉 28200，也不重复拉 28100。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 28200 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 75602 合成、75603 装备、75604 核心升级、75605 分解。
 * 不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许按 job 轻懒建 core（默认 coreLv=1）。无合成，无装备，无核心升级，无分解。只读展示。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 75601 是 GResShenBinInfo。shenBinInfos 是字段 1，repeated PSShenBinInfo。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * PSShenBinInfo：job、coreLv、equipData、fighting 按声明顺序是 1、2、3、4。
 * equipData：job 是字段 1，equip_list 是字段 2，repeated PSHoleData。
 * PSHoleData 本刀没有点名字段。出现的号按字段号写，不猜孔位名。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 客户端不把缺省 coreLv 填成 1。服侧轻懒建写出来的 1 仍写 1。
 *
 * 空包体是已同步。shenBinInfos 为空，页上写「空神兵」。
 * shenBinInfos 有包但一条都解不开时返回 null，调用方保持上一次。
 * equip_list 有包但一条都解不开时，这一条神兵解不开。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.shenBin。 */
export const WIRE_SHENBIN_CMD = "wire.75601";

export const WIRE_SHENBIN_READONLY_TITLE = "神兵数据（真服只读）";
export const WIRE_SHENBIN_EMPTY = "空神兵";
export const WIRE_SHENBIN_UNSYNCED_TOAST = "真服未同步";
export const WIRE_SHENBIN_READONLY_NOTE =
  "只读展示 job、coreLv、equipData、fighting。无合成、装备、核心升级、分解入口。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_SHENBIN_SIDE_EFFECT =
  "按 job 轻懒建 core（默认 coreLv=1）。无合成，无装备，无核心升级，无分解。只读展示。空 c2s 一次，无 page，挂在 28200 之后。不发 75602 合成、75603 装备、75604 核心升级、75605 分解。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100";
export const WIRE_SHENBIN_FIELD_NOTE =
  "shenBinInfos 行上 job、coreLv、fighting。equipData 写 job 与 equip_list。PSHoleData 对不上的号按字段号写。没有的数不写成 0。出现的值如实展示";

export interface WireShenBinMark {
  field: number;
  text: string;
}

export interface WireShenBinHole {
  /** PSHoleData 没有点名字段。出现的号记在这里，缺的不补 0。 */
  marks: WireShenBinMark[];
}

export interface WireShenBinEquip {
  /** equipData.job。没有时是 null，不写成 0。 */
  job: number | null;
  /** equipData.equip_list。没有这个字段时是空数组。 */
  holes: WireShenBinHole[];
  /** 对不上 1、2 的号。 */
  marks: WireShenBinMark[];
}

export interface WireShenBinInfo {
  /** PSShenBinInfo.job。没有时是 null，不写成 0。 */
  job: number | null;
  /** PSShenBinInfo.coreLv。没有时是 null，不写成 0，也不填成默认 1。出现的 0 仍写 0。出现的 1 仍写 1。 */
  coreLv: number | null;
  /** PSShenBinInfo.fighting。没有时是 null，不写成 0。 */
  fighting: number | null;
  /** PSShenBinInfo.equipData。没有这个字段时是 null。 */
  equip: WireShenBinEquip | null;
  /** 对不上 1、2、3、4 的号。 */
  marks: WireShenBinMark[];
}

export interface WireShenBinSnapshot {
  /** GResShenBinInfo.shenBinInfos。没有这个字段时是空数组。 */
  infos: WireShenBinInfo[];
  /** 对不上字段 1 的外层号。 */
  marks: WireShenBinMark[];
}

/**
 * 解 s2c 75601。空包体返回已同步的空神兵。
 * 超长、坏 varint、shenBinInfos 有包但一条都解不开时返回 null。
 */
export function decodeWireShenBin(body: Uint8Array | null | undefined): WireShenBinSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const infos: WireShenBinInfo[] = [];
  const marks: WireShenBinMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeInfo(row.bytes);
      if (!parsed) continue;
      infos.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && infos.length === 0) return null;
  return { infos, marks };
}

/** 页上写条数。没有时写「空神兵」。 */
export function formatWireShenBinHead(snap: WireShenBinSnapshot): string {
  const list = snap.infos.length === 0 ? WIRE_SHENBIN_EMPTY : snap.infos.length + " 条";
  return joinMarks("shenBinInfos=" + list, snap.marks);
}

/** 一行一个 PSShenBinInfo。没有的格子写「无」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireShenBinLine(row: WireShenBinInfo): string {
  const equip = row.equip
    ? joinMarks(
        "equip.job=" + numText(row.equip.job) + " / equip_list=" + holeCount(row.equip),
        row.equip.marks
      )
    : "equip=无";
  const line =
    "job=" + numText(row.job) + " / coreLv=" + numText(row.coreLv) + " / fighting=" + numText(row.fighting) + " / " + equip;
  return joinMarks(line, row.marks);
}

/** 一行一个 PSHoleData。没有点名字段，按字段号写。空孔写「孔 无」。 */
export function formatWireShenBinHole(hole: WireShenBinHole): string {
  if (hole.marks.length === 0) return "孔 无";
  return "孔 " + marksText(hole.marks);
}

/** 先写神兵，再写这一条的孔。给页面和日志用。 */
export function formatWireShenBinRows(snap: WireShenBinSnapshot): string[] {
  const rows: string[] = [];
  for (let i = 0; i < snap.infos.length; i++) {
    const info = snap.infos[i];
    rows.push(formatWireShenBinLine(info));
    if (!info.equip) continue;
    for (let j = 0; j < info.equip.holes.length; j++) rows.push(formatWireShenBinHole(info.equip.holes[j]));
  }
  return rows;
}

export function wireShenBinNote(snap: WireShenBinSnapshot): string {
  const head = formatWireShenBinHead(snap);
  const tail = WIRE_SHENBIN_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.infos.length === 0) return head + "。" + tail;
  const rows = formatWireShenBinRows(snap);
  const parts: string[] = [];
  const n = Math.min(rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(rows[i]);
  if (rows.length > n) parts.push("其余 " + (rows.length - n) + " 行");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireShenBinSnapshot {
  return { infos: [], marks: [] };
}

function holeCount(equip: WireShenBinEquip): string {
  return equip.holes.length === 0 ? "空孔" : equip.holes.length + " 孔";
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireShenBinMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireShenBinMark[]): string {
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

function decodeInfo(body: Uint8Array): WireShenBinInfo | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireShenBinMark[] = [];
  let job: number | null = null;
  let coreLv: number | null = null;
  let fighting: number | null = null;
  let equip: WireShenBinEquip | null = null;
  let sawJob = false;
  let sawCore = false;
  let sawFight = false;
  let sawEquip = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawJob) {
        sawJob = true;
        job = accepted(row.varint);
        if (job === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawCore) {
        sawCore = true;
        coreLv = accepted(row.varint);
        if (coreLv === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      if (!sawEquip) {
        sawEquip = true;
        const parsed = decodeEquip(row.bytes);
        if (!parsed) return null;
        equip = parsed;
      }
      continue;
    }
    if (row.field === 4 && row.kind === "varint") {
      if (!sawFight) {
        sawFight = true;
        fighting = accepted(row.varint);
        if (fighting === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { job, coreLv, fighting, equip, marks };
}

function decodeEquip(body: Uint8Array): WireShenBinEquip | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const holes: WireShenBinHole[] = [];
  const marks: WireShenBinMark[] = [];
  let job: number | null = null;
  let sawJob = false;
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawJob) {
        sawJob = true;
        job = accepted(row.varint);
        if (job === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeHole(row.bytes);
      if (!parsed) continue;
      holes.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && holes.length === 0) return null;
  return { job, holes, marks };
}

function decodeHole(body: Uint8Array): WireShenBinHole | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireShenBinMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i]);
    if (mark) marks.push(mark);
  }
  return { marks };
}

function markOf(row: RawField): WireShenBinMark | null {
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
