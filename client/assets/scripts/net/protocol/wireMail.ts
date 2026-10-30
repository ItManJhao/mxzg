/**
 * 真服邮件只读。仓库里没有 Mail.proto。
 * 字段号按 net-20261020 两例 s2c 15000 反解，不是占位 mail.list。
 *
 * GReq 侧没有字段名。c2s 15000 没有包体。整帧 04 00 00 00 98 3a 00 00。
 * 进主城时由 WireSession.pullIdle 在空 c2s 3004 之后发出。
 * Boot 仍是 pullRoleProfile → pullChapter → pullIdle，所以不改 Boot.ts。
 * 线上顺序是 2001 → 5001 → 3007 → 3004 → 15000。
 * 已合的 2001、5001、3007、3004 相对顺序不变。
 * 旧客户端的 15000 在进游戏同步后段（3200 之后）。这里不发那一长串，只把这一帧接在 3004 后。
 * 不发领取、已读、删除。占位 mail.list / mail.read / mail.claim / mail.claimAll / mail.delete 仍是 1701–1705。
 *
 * s2c 15000（两例包体都是 292 字节，各一封）：
 * - 字段 1 repeated 邮件。空包体 = 已同步的空邮箱。日志里没有空包样本，这是和背包空包同一条规则。
 * - 邮件里：1 id、2 时间、3 标记、4 标记、5 标题、6 正文、7 repeated 附件。
 * - 附件里：2 item id、3 count。两例没有字段 1。
 * 两例字段 3、字段 4 都是 0。没有 Mail.proto，不当成已读或未读，只记日志。
 * 两例标题都是「Hadiah Reservasi Peristiwa」，字段 7 有 6 条附件。
 *
 * 钱包只认 s2c 2001 的金币和宝石。这里不写 Session.gold / diamond，也不写背包。
 */
import { decodeProtoFields, ProtoField } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.mailList。 */
export const WIRE_MAIL_CMD = "wire.15000";

export const WIRE_MAIL_READONLY_TITLE = "邮件（真服只读）";
export const WIRE_MAIL_EMPTY = "空邮箱";
export const WIRE_MAIL_UNSYNCED_TOAST = "真服邮件未同步";
export const WIRE_MAIL_READONLY_NOTE = "只读。不领取，不删除，不写金币";
export const WIRE_MAIL_STATUS_NOTE = "已读未读未解。字段 3、字段 4 只记日志";

/** 字段 7。yes 至少解开一条；no 没有字段 7；unknown 有包但一条都解不开。 */
export type WireMailAttachmentState = "yes" | "no" | "unknown";

export interface WireMailAttachment {
  /** 附件里的字段 2。 */
  itemId: number;
  /** 附件里的字段 3。 */
  count: number;
}

export interface WireMailEntry {
  /** 字段 1。没有时是 null。 */
  id: number | null;
  /** 字段 2。只记日志。两例是 unix 秒。 */
  time: number | null;
  /** 字段 3。两例都是 0。只记日志，不是已读。 */
  mark3: number | null;
  /** 字段 4。两例都是 0。只记日志，不是未读，也不是已领取。 */
  mark4: number | null;
  /** 字段 5。解不开或没有时是 null。 */
  title: string | null;
  /** 字段 6。只记日志。界面列表不展开长正文。 */
  body: string | null;
  attachment: WireMailAttachmentState;
  /** 解开的附件。不进背包，不改顶栏。 */
  attachments: WireMailAttachment[];
}

export interface WireMailList {
  entries: WireMailEntry[];
}

const MAX_BODY = 65536;

/**
 * 解 s2c 15000。空包体返回空列表，不返回 null。
 * 超长、坏 varint、有字段 1 但一封都解不开、或非空却没有邮件时返回 null。
 * 调用方保持上一次，不要把未同步标成已同步。
 */
export function decodeWireMailList(body: Uint8Array | null | undefined): WireMailList | null {
  if (!body) return null;
  if (body.length === 0) return { entries: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const parsed: WireMailEntry[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 1 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const entry = decodeMailEntry(row.bytes);
    if (!entry) continue;
    parsed.push(entry);
  }
  if (blobs === 0 || parsed.length === 0) return null;
  return { entries: parsed };
}

/** 有标题就用标题。没有就写无标题，有 id 时带上。附件只写有无，不写道具名。 */
export function formatWireMailLine(entry: WireMailEntry): string {
  const named = (entry.title || "").trim();
  let title = named;
  if (!title) {
    title = entry.id !== null ? "无标题 · id " + entry.id : "无标题";
  }
  return title + " · " + attachmentLabel(entry.attachment);
}

export function wireMailNote(entries: readonly WireMailEntry[]): string {
  if (entries.length === 0) return "空邮箱。不写金币";
  const parts: string[] = [];
  const n = Math.min(entries.length, 4);
  for (let i = 0; i < n; i++) {
    const row = entries[i];
    let text =
      formatWireMailLine(row) +
      " 字段3=" +
      markText(row.mark3) +
      " 字段4=" +
      markText(row.mark4);
    if (row.attachments.length > 0) {
      text += " 附件 " + row.attachments.length + " 条";
    }
    const body = (row.body || "").trim();
    if (body) text += " 正文「" + clip(body, 24) + "」";
    parts.push(text);
  }
  if (entries.length > n) parts.push("其余 " + (entries.length - n) + " 封");
  return entries.length + " 封 " + parts.join("；") + "。已读未读只记日志，不写金币";
}

function attachmentLabel(state: WireMailAttachmentState): string {
  if (state === "yes") return "有附件";
  if (state === "unknown") return "附件未解";
  return "无附件";
}

function markText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeMailEntry(body: Uint8Array): WireMailEntry | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const id = nonNegativeVarint(fields, 1);
  const time = nonNegativeVarint(fields, 2);
  const mark3 = nonNegativeVarint(fields, 3);
  const mark4 = nonNegativeVarint(fields, 4);
  const title = utf8Field(fields, 5);
  const bodyText = utf8Field(fields, 6);
  const attachments: WireMailAttachment[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 7 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const item = decodeAttachment(row.bytes);
    if (!item) continue;
    attachments.push(item);
  }
  let attachment: WireMailAttachmentState = "no";
  if (blobs > 0 && attachments.length === 0) attachment = "unknown";
  else if (attachments.length > 0) attachment = "yes";
  const named = title !== null && title.trim().length > 0;
  if (id === null && !named) return null;
  return {
    id,
    time,
    mark3,
    mark4,
    title,
    body: bodyText,
    attachment,
    attachments,
  };
}

function decodeAttachment(body: Uint8Array): WireMailAttachment | null {
  let fields: ProtoField[] | null = null;
  try {
    fields = decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
  if (!fields) return null;
  const itemId = nonNegativeProto(fields, 2);
  const count = nonNegativeProto(fields, 3);
  if (itemId === null || count === null) return null;
  return { itemId, count };
}

function utf8Field(fields: RawField[], field: number): string | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "bytes" || !row.bytes) continue;
    return decodeUtf8(row.bytes);
  }
  return null;
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

function nonNegativeProto(fields: ProtoField[], field: number): number | null {
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

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch (_err) {
    return null;
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] >= 0x80) return null;
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}
