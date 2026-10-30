/**
 * 登录后的角色资料。字段号按 Role.proto 的 GResRoleInfo（cmd 2001）。
 *
 * 旧客户端在 s2c 1001 有角色之后发空的 c2s 2001（整帧 04 00 00 00 d1 07 00 00）。
 * net-20261020.jsonl 三例 s2c 2001 都解得开，和 .proto 对得上：
 * - 字段 1 varint = 0（`08 00`）宝石，顶栏钻石
 * - 字段 2 varint = 0（`10 00`）金币
 * - 字段 5 varint = 1000（`28 e8 07`）奖杯，不是金币
 * - 字段 6 varint = 1（`30 01`）等级
 * - 字段 9 string = 「见习冒险家」（`4a 0f` + utf-8）
 * - 字段 16 varint = 1792406063（`80 01 af e4 d7 d6 06`）开服 unix 秒
 * 先登录的那份（conn c3bfce22）多一个字段 15 = 100，两份新号没有。不读字段 15。
 *
 * 开服天不从字段 16 推。它是时间戳，不是天数。`docs/day60-open-server.md` 的
 * getOpenDays 要「开服当日 0 点」和服务器时区；这一包没有时区，样本也不是 0 点
 * （1792406063 = 2026-10-19 10:34:23 UTC）。Mock 的开服天是按通关推的
 * `1 + floor(clearedStage / 5)`。s2c 3007 的 idx 不是这个天数，拿它会编出一天。顶栏开服天保持未同步。
 *
 * 某个字段没出现就留 null。调用方不要把它写成 0，也不要拿字段 5 填金币。
 */
import { decodeProtoFields, ProtoField } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.roleProfile。 */
export const WIRE_ROLE_CMD = "wire.2001";

export interface WireRoleProfile {
  /** 字段 9。没有合格字符串时是 null。 */
  name: string | null;
  /** 字段 6。没有大于等于 1 的整数时是 null。 */
  level: number | null;
  /** 字段 2。没有非负整数时是 null。0 表示服上就是 0。 */
  gold: number | null;
  /** 字段 1 宝石。没有非负整数时是 null。0 表示服上就是 0。 */
  diamond: number | null;
}

const MAX_BODY = 8192;
const MAX_NAME = 32;

/**
 * 解 s2c 2001。解不开、超长、空包都返回 null，不抛。
 * 包能解开但没有可用字段时，四个值都是 null，顶栏不改。
 */
export function decodeWireRole(body: Uint8Array | null | undefined): WireRoleProfile | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  let fields: ProtoField[] | null = null;
  try {
    fields = decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
  if (!fields) return null;
  let name: string | null = null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 9 || row.kind !== "string" || !row.text) continue;
    const text = acceptableName(row.text);
    if (text) {
      name = text;
      break;
    }
  }
  const levelRaw = nonNegativeVarint(fields, 6);
  return {
    name,
    level: levelRaw !== null && levelRaw >= 1 ? levelRaw : null,
    gold: nonNegativeVarint(fields, 2),
    diamond: nonNegativeVarint(fields, 1),
  };
}

/** 只列出这一包写进顶栏的格子。没出现的字段不写「未同步」，避免看起来像被清掉。 */
export function wireProfileNote(profile: WireRoleProfile): string {
  const bits: string[] = [];
  if (profile.name) bits.push("角色名 " + profile.name);
  if (profile.level !== null) bits.push("等级 " + profile.level);
  if (profile.gold !== null) bits.push("金币 " + profile.gold);
  if (profile.diamond !== null) bits.push("钻石 " + profile.diamond);
  return bits.join(" ");
}

export function wireProfileHasBar(profile: WireRoleProfile): boolean {
  return profile.name !== null || profile.level !== null || profile.gold !== null || profile.diamond !== null;
}

function nonNegativeVarint(fields: ProtoField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

function acceptableName(text: string): string | null {
  const name = text.trim();
  const chars = Array.from(name);
  if (chars.length < 1 || chars.length > MAX_NAME) return null;
  let marked = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i].codePointAt(0) || 0;
    if (c < 32) return null;
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c >= 0x80) marked = true;
  }
  if (!marked) return null;
  return name;
}
