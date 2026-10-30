/**
 * 真服竞技场只读。c2s / s2c 都是 18001，PvpHandler.pvpData。
 * c2s 是 GReqPvpData，没有字段。整帧 04 00 00 00 51 46 00 00。
 * 不是英雄。英雄是 4001。占位 arena.view / arena.challenge 仍是 1901 / 1902。
 *
 * 由 WireSession.pullIdle 在空 c2s 12010 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 18002 开战、18003 刷新对手、18005 买票、18007 点赞、18008 赛季奖。
 * 18004 战报只读可发，本刀不接。不匹配，不扣次，不开战。不写积分，不写钱包。
 *
 * 服端只在对手名单为空时懒建并落库。日切或赛季切时也可能写库。
 * 页面写「同步时若对手为空服可能补名单」。
 *
 * s2c 是 GResPvpData：
 * - 1 free_count 剩余免费次数
 * - 2 score 积分。不写进金币，也不写 Mock 积分
 * - 3 repeated PSRankPlayerData list 对手。可以没有
 * - 4 season_end_time
 * - 5 like_rids
 * - 6 season_count
 * - 7 season_reward
 * 空数据仍是非空外层：必带 score / free_count / season_*，list 可以没有。
 * 没有 list，以及空包体，都是已同步的空对手表，不是未同步。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * PSRankPlayerData 对得上的号：1 player_id，2 name。
 * 抓包里还有 3、4、6、7、9、10、11。level、head_id、score、combat_num、border_id
 * 没有单独的字段号，不能按名字写。这些号按字段号展示。
 * net-20261020 两例包体 129 与 132 字节，各 3 名。字段 9 常为 1000，不写成金币。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.pvpData。 */
export const WIRE_PVP_CMD = "wire.18001";

export const WIRE_PVP_READONLY_TITLE = "竞技场（真服只读）";
export const WIRE_PVP_EMPTY = "空对手表";
export const WIRE_PVP_UNSYNCED_TOAST = "真服未同步";
export const WIRE_PVP_READONLY_NOTE = "只读。不挑战，不匹配，不扣次，不写积分，不写金币";
export const WIRE_PVP_SIDE_EFFECT = "同步时若对手为空服可能补名单";
export const WIRE_PVP_SEASON_NOTE = "日切或赛季切时服可能写库";
export const WIRE_PVP_FIELD_NOTE = "free_count、score、season_end_time、like_rids、season_count、season_reward。对手写 player_id、name";

export interface WirePvpMark {
  field: number;
  text: string;
}

export interface WirePvpOpponent {
  /** PSRankPlayerData.player_id。没有时是 null，不写成 0。 */
  playerId: number | null;
  /** PSRankPlayerData.name。没有时是 null。 */
  name: string | null;
  /** 对不上名字的子字段。按字段号。 */
  marks: WirePvpMark[];
}

export interface WirePvpSnapshot {
  /** GResPvpData.free_count。没有时是 null，不写成 0。 */
  freeCount: number | null;
  /** GResPvpData.score。没有时是 null。不写钱包。 */
  score: number | null;
  opponents: WirePvpOpponent[];
  /** GResPvpData.season_end_time。原数。 */
  seasonEndTime: number | null;
  /** GResPvpData.like_rids。没有这个字段时是 null。 */
  likeRids: number[] | null;
  /** like_rids 是解不开的包。 */
  likeRidsUnparsed: boolean;
  /** GResPvpData.season_count。 */
  seasonCount: number | null;
  /** GResPvpData.season_reward。 */
  seasonReward: number | null;
  /** season_reward 是解不开的包。 */
  seasonRewardUnparsed: boolean;
}

/**
 * 解 s2c 18001。空包体、以及没有 list 的合法包，都返回空对手表。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWirePvp(body: Uint8Array | null | undefined): WirePvpSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const opponents: WirePvpOpponent[] = [];
  let blobs = 0;
  const likeRids: number[] = [];
  let sawLike = false;
  let likeRidsUnparsed = false;
  let seasonRewardUnparsed = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeOpponent(row.bytes);
      if (parsed) opponents.push(parsed);
      continue;
    }
    if (row.field === 5) {
      sawLike = true;
      if (row.kind === "varint" && typeof row.varint === "number") likeRids.push(row.varint);
      else if (row.kind === "bytes" && row.bytes) {
        const packed = readPackedVarints(row.bytes);
        if (!packed) likeRidsUnparsed = true;
        else for (let j = 0; j < packed.length; j++) likeRids.push(packed[j]);
      }
      continue;
    }
    if (row.field === 7 && row.kind === "bytes") seasonRewardUnparsed = true;
  }
  if (blobs > 0 && opponents.length === 0) return null;
  return {
    freeCount: nonNegativeVarint(fields, 1),
    score: nonNegativeVarint(fields, 2),
    opponents,
    seasonEndTime: nonNegativeVarint(fields, 4),
    likeRids: sawLike ? likeRids : null,
    likeRidsUnparsed,
    seasonCount: nonNegativeVarint(fields, 6),
    seasonReward: seasonRewardUnparsed ? null : nonNegativeVarint(fields, 7),
    seasonRewardUnparsed,
  };
}

/** 自身字段用 GResPvpData 的名字。缺的写「无」，0 仍写 0。 */
export function formatWirePvpSelfLines(snap: WirePvpSnapshot): string[] {
  return [
    "free_count=" + numText(snap.freeCount),
    "score=" + numText(snap.score),
    "season_end_time=" + numText(snap.seasonEndTime),
    "like_rids=" + likeText(snap),
    "season_count=" + numText(snap.seasonCount),
    "season_reward=" + rewardText(snap),
  ];
}

export function formatWirePvpSelf(snap: WirePvpSnapshot): string {
  return formatWirePvpSelfLines(snap).join(" / ");
}

/** 名字用字符串字段。player_id 对得上才写这个名字。其余子字段写字段号。 */
export function formatWirePvpLine(row: WirePvpOpponent): string {
  const named = (row.name || "").trim();
  let text = (named || "无名") + " · player_id=" + numText(row.playerId);
  for (let i = 0; i < row.marks.length; i++) {
    text += " · 字段" + row.marks[i].field + "=" + row.marks[i].text;
  }
  return text;
}

export function wirePvpNote(snap: WirePvpSnapshot): string {
  const head = formatWirePvpSelf(snap);
  if (snap.opponents.length === 0) {
    return head + "。空对手表。" + WIRE_PVP_SIDE_EFFECT + "。不写金币";
  }
  const parts: string[] = [];
  const n = Math.min(snap.opponents.length, 3);
  for (let i = 0; i < n; i++) parts.push(formatWirePvpLine(snap.opponents[i]));
  if (snap.opponents.length > n) parts.push("其余 " + (snap.opponents.length - n) + " 名");
  return head + "。" + snap.opponents.length + " 名 " + parts.join("；") + "。" + WIRE_PVP_SIDE_EFFECT + "。不写金币";
}

function emptySnapshot(): WirePvpSnapshot {
  return {
    freeCount: null,
    score: null,
    opponents: [],
    seasonEndTime: null,
    likeRids: null,
    likeRidsUnparsed: false,
    seasonCount: null,
    seasonReward: null,
    seasonRewardUnparsed: false,
  };
}

function likeText(snap: WirePvpSnapshot): string {
  if (snap.likeRidsUnparsed) return "有包";
  if (!snap.likeRids || snap.likeRids.length === 0) return "无";
  return snap.likeRids.join(",");
}

function rewardText(snap: WirePvpSnapshot): string {
  if (snap.seasonRewardUnparsed) return "有包";
  return numText(snap.seasonReward);
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeOpponent(body: Uint8Array): WirePvpOpponent | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const playerId = nonNegativeVarint(fields, 1);
  const name = utf8Field(fields, 2);
  const named = name !== null && name.trim().length > 0;
  if (playerId === null && !named) return null;
  const marks: WirePvpMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 || row.field === 2) continue;
    if (row.kind === "varint" && typeof row.varint === "number") {
      marks.push({ field: row.field, text: String(row.varint) });
      continue;
    }
    if (row.kind === "bytes" && row.bytes) {
      if (row.bytes.length === 0) {
        marks.push({ field: row.field, text: "空" });
        continue;
      }
      const text = decodeUtf8(row.bytes);
      marks.push({ field: row.field, text: text !== null ? text : "有包" });
    }
  }
  return { playerId, name, marks };
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

function readPackedVarints(body: Uint8Array): number[] | null {
  if (body.length === 0) return [];
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val || val.value < 0) return null;
    values.push(val.value);
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
