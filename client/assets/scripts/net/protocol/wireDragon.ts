/**
 * 真服圣龙数据只读。c2s / s2c 都是 59001。
 * c2s 是 GReqDragonScanInfo，没有字段，没有 page。整帧 04 00 00 00 79 e6 00 00，即 0400000079e60000。
 * 59001 = 0xE679，小端是 79 e6 00 00。空体一次。handler scanDragonInfo 不读 msg。
 * 不是魔方数据 75501。不是星盘数据 68001。不是角色资料 2001。
 *
 * 由 WireSession.pullIdle 在空 c2s 75501 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 34001。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011 升星、59012 升星、59013 分解。
 * 59010 是另只读，单独在本请求之后拉包，勿与 59001 合并成一个请求，勿当写号。不在这一帧里编成 c2s。
 * 服侧轻懒建：首次 dragonDao.add。无扣费，无领奖。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 59001 是 GResDragonScanInfo。对得上的名字才用，对不上的号按字段号写。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * - 1 identify_level
 * - 2 attr_level
 * - 3 repeated identities。type=1，start_time=2，level=3，speed_add=4
 * - 4 repeated slots。id=1，sys_id=2
 * - 5 privilege_end_time
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，identify_level、attr_level、privilege_end_time 保持缺省，identities 与 slots 为空。
 * identities 有包但一条都解不开，或 slots 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.dragonScan。 */
export const WIRE_DRAGON_CMD = "wire.59001";

export const WIRE_DRAGON_READONLY_TITLE = "圣龙数据（真服只读）";
export const WIRE_DRAGON_EMPTY_IDENTITIES = "空鉴定";
export const WIRE_DRAGON_EMPTY_SLOTS = "空槽位";
export const WIRE_DRAGON_UNSYNCED_TOAST = "真服未同步";
export const WIRE_DRAGON_READONLY_NOTE =
  "只读展示，无放源石、提升鉴定、加速鉴定、鉴定领奖、提升圣龙等级、圣物替换、调顺序、升星、分解入口。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。不做 34001，不做 20011。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_DRAGON_SIDE_EFFECT =
  "轻懒建。首次 dragonDao.add。无扣费，无领奖。空 c2s 一次，无 page，挂在 75501 之后。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。不做 34001，不做 20011";
export const WIRE_DRAGON_FIELD_NOTE =
  "identify_level、attr_level、identities 的 type、start_time、level、speed_add、slots 的 id、sys_id、privilege_end_time。没有的数不写成 0。对不上的号按字段号写";

export interface WireDragonMark {
  field: number;
  text: string;
}

export interface WireDragonIdentity {
  /** identities.type。没有时是 null，不写成 0。 */
  type: number | null;
  /** identities.start_time。没有时是 null，不写成 0。 */
  startTime: number | null;
  /** identities.level。没有时是 null，不写成 0。 */
  level: number | null;
  /** identities.speed_add。没有时是 null，不写成 0。 */
  speedAdd: number | null;
  /** 对不上 type、start_time、level、speed_add 的号。 */
  marks: WireDragonMark[];
}

export interface WireDragonSlot {
  /** slots.id。没有时是 null，不写成 0。 */
  id: number | null;
  /** slots.sys_id。没有时是 null，不写成 0。 */
  sysId: number | null;
  /** 对不上 id、sys_id 的号。 */
  marks: WireDragonMark[];
}

export interface WireDragonSnapshot {
  /** GResDragonScanInfo.identify_level。没有时是 null，不写成 0。 */
  identifyLevel: number | null;
  /** GResDragonScanInfo.attr_level。没有时是 null，不写成 0。 */
  attrLevel: number | null;
  /** GResDragonScanInfo.identities。没有这个字段时是空数组，不写成 0。 */
  identities: WireDragonIdentity[];
  /** GResDragonScanInfo.slots。没有这个字段时是空数组，不写成 0。 */
  slots: WireDragonSlot[];
  /** GResDragonScanInfo.privilege_end_time。没有时是 null，不写成 0。 */
  privilegeEndTime: number | null;
  /** 对不上字段 1、字段 2、字段 3、字段 4、字段 5 的外层号。 */
  marks: WireDragonMark[];
}

/**
 * 解 s2c 59001。空包体返回已同步的缺省等级、空鉴定、空槽位和缺省 privilege_end_time。
 * 超长、坏 varint、identities 有包但一条都解不开、slots 有包但一条都解不开时返回 null。
 */
export function decodeWireDragon(body: Uint8Array | null | undefined): WireDragonSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const identities: WireDragonIdentity[] = [];
  const slots: WireDragonSlot[] = [];
  const marks: WireDragonMark[] = [];
  let identityBlobs = 0;
  let slotBlobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 5) && row.kind === "varint") continue;
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      identityBlobs += 1;
      const parsed = decodeIdentity(row.bytes);
      if (!parsed) continue;
      identities.push(parsed);
      continue;
    }
    if (row.field === 4 && row.kind === "bytes" && row.bytes) {
      slotBlobs += 1;
      const parsed = decodeSlot(row.bytes);
      if (!parsed) continue;
      slots.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (identityBlobs > 0 && identities.length === 0) return null;
  if (slotBlobs > 0 && slots.length === 0) return null;
  return {
    identifyLevel: nonNegativeVarint(fields, 1),
    attrLevel: nonNegativeVarint(fields, 2),
    identities,
    slots,
    privilegeEndTime: nonNegativeVarint(fields, 5),
    marks,
  };
}

/** 页上写 identify_level、attr_level、鉴定条数、槽位条数和 privilege_end_time。没有时写「无」。鉴定为 0 写「空鉴定」。槽位为 0 写「空槽位」。 */
export function formatWireDragonHead(snap: WireDragonSnapshot): string {
  const identities = snap.identities.length === 0 ? WIRE_DRAGON_EMPTY_IDENTITIES : snap.identities.length + " 条";
  const slots = snap.slots.length === 0 ? WIRE_DRAGON_EMPTY_SLOTS : snap.slots.length + " 条";
  return joinMarks(
    "identify_level=" +
      numText(snap.identifyLevel) +
      " / attr_level=" +
      numText(snap.attrLevel) +
      " / identities=" +
      identities +
      " / slots=" +
      slots +
      " / privilege_end_time=" +
      numText(snap.privilegeEndTime),
    snap.marks
  );
}

/** 行上写 type / start_time / level / speed_add。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireDragonIdentity(row: WireDragonIdentity): string {
  return joinMarks(
    "type=" +
      numText(row.type) +
      " / start_time=" +
      numText(row.startTime) +
      " / level=" +
      numText(row.level) +
      " / speed_add=" +
      numText(row.speedAdd),
    row.marks
  );
}

/** 行上写 id / sys_id。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireDragonSlot(row: WireDragonSlot): string {
  return joinMarks("id=" + numText(row.id) + " / sys_id=" + numText(row.sysId), row.marks);
}

export function wireDragonNote(snap: WireDragonSnapshot): string {
  const head = formatWireDragonHead(snap);
  const tail = WIRE_DRAGON_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.identities.length === 0 && snap.slots.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const ni = Math.min(snap.identities.length, 4);
  for (let i = 0; i < ni; i++) parts.push(formatWireDragonIdentity(snap.identities[i]));
  if (snap.identities.length > ni) parts.push("其余鉴定 " + (snap.identities.length - ni) + " 条");
  const ns = Math.min(snap.slots.length, 4);
  for (let i = 0; i < ns; i++) parts.push(formatWireDragonSlot(snap.slots[i]));
  if (snap.slots.length > ns) parts.push("其余槽位 " + (snap.slots.length - ns) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireDragonSnapshot {
  return {
    identifyLevel: null,
    attrLevel: null,
    identities: [],
    slots: [],
    privilegeEndTime: null,
    marks: [],
  };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireDragonMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireDragonMark[]): string {
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

function decodeIdentity(body: Uint8Array): WireDragonIdentity | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireDragonMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 3 || row.field === 4) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    type: nonNegativeVarint(fields, 1),
    startTime: nonNegativeVarint(fields, 2),
    level: nonNegativeVarint(fields, 3),
    speedAdd: nonNegativeVarint(fields, 4),
    marks,
  };
}

function decodeSlot(body: Uint8Array): WireDragonSlot | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireDragonMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    id: nonNegativeVarint(fields, 1),
    sysId: nonNegativeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WireDragonMark | null {
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

function nonNegativeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
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
