/**
 * 登录后的主线关卡进度。字段号按 Battle.proto 的 GResChapterData（cmd 3007）。
 *
 * 旧客户端在进游戏的同步里发空的 c2s 3007（整帧 04 00 00 00 bf 0b 00 00）。
 * net-20261020.jsonl 三例都在空 c2s 2001 和对应的 s2c 2001 之后发出，
 * 夹在 c2s 58017 和 c2s 3004 中间。这一文件只解 3007。空 c2s 3004 在 wireIdle.ts，
 * 跟在 3007 后面发。3002 / 3012 仍不从这一帧发。3010 在 wireChapterReward.ts，主线页只读，不从 3007 发出。51001 不夹在这里，由 pullIdle 在空 c2s 74100 之后发一次。20001 也不夹在这里，接在空 c2s 51001 之后。20012 接在 20001 之后，70001 接在 20012 之后，73001 接在 70001 之后，74300 接在 73001 之后，68001 接在 74300 之后，75501 接在 68001 之后，59001 接在 75501 之后，59010 接在 59001 之后，55001 接在 59010 之后，34001 接在 55001 之后，32001 接在 34001 之后，4402 接在 32001 之后，4401 接在 4402 之后，4201 接在 4401 之后，74104 接在 4201 之后，28100 接在 74104 之后，28200 接在 28100 之后，75601 接在 28200 之后，75606 接在 75601 之后，75615 接在 75606 之后，28107 接在 75615 之后，也不夹在这里。11005 仍不补。
 *
 * 三例 s2c 3007 包体都是 8 字节：
 * - c3bfce22  2026-10-20T00:00:11.775  08 f7 96 d8 d6 06 18 00
 * - d6108a92  2026-10-20T10:55:08.164  08 d0 af db d6 06 18 00
 * - 5d7c0ba6  2026-10-20T11:26:42.423  08 b6 be db d6 06 18 00
 * 字段 1 varint = res_reward_time（上次领资源的 unix 秒：1792412535 / 1792464848 / 1792466742）。
 * 等于 RoleMission.startTime。不写进主城按钮。主线页「关卡数据」空壳探针展示。
 * 字段 2 now_idx 三例都没有。不写成 0。
 * 字段 3 max_idx = 0（18 00）。0 是包里的 0。等于 RoleMission.chapterId。
 * 字段 4 extra_reward_id 是 repeated。三例都没有。探针按出现顺序写。没有不写成 0，也不当成 idx。
 *
 * 主城按钮按解开的 idx 写，不改成 Mock 的「第 N 关」，也不写 Session.stageId：
 * - 两个都没有：主线 · 未同步。点按钮 Toast「真服未同步」，不打开页。
 * - 只有 now_idx：主线 · 当前 N
 * - 只有 max_idx：主线 · 最高 M
 * - 两个都有：主线 · 当前 N / 最高 M
 * 数字前面有空格。日志三例是「主线 · 最高 0」。
 * 至少有一个 idx（含 max_idx=0）时，点按钮打开代码页「主线（真服只读）」。
 * 缺的 idx 在页上写「未同步」。不打开 Mock 关卡页。
 * 页内「挑战」才发空 c2s 3001。不发 3002，不把 Mock 1201/1202 当战报。
 */
import { WIRE_BATTLE_MATCH_NOTE } from "./wireBattle";
import { decodeProtoFields, ProtoField } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.chapterData。 */
export const WIRE_CHAPTER_CMD = "wire.3007";

/** GReqChapterData 没有字段。3007 = 0x0BBF，小端 bf 0b 00 00。整帧 04000000bf0b0000。 */
export const WIRE_CHAPTER_FRAME = "04000000bf0b0000";

/** 字段 1。RoleMission.startTime。不写进主城按钮。 */
export const WIRE_CHAPTER_TIME_FIELD = 1;
/** 字段 3。RoleMission.chapterId。 */
export const WIRE_CHAPTER_MAX_FIELD = 3;
/** 字段 4。repeated。按出现顺序。 */
export const WIRE_CHAPTER_EXTRA_FIELD = 4;

export const WIRE_CHAPTER_PROBE_UNSYNCED = "真服未同步";
export const WIRE_CHAPTER_PROBE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_CHAPTER_PROBE_ABSENT = "未带";

export const WIRE_CHAPTER_PROBE_NOTE =
  "主线页「关卡数据」发空 c2s 3007（GReqChapterData 无字段，整帧 04000000bf0b0000，小端 bf 0b 00 00）。挂在已合 3001 / 3010 / 3012 之后，进战前再拉一次关卡状态，和 3030、3102 探针并排。登录链里的空 3007 仍在。本按钮不进 pullIdle，不重发 3001、3010、3012、3006、3102、3103、3030、3004。s2c GResChapterData 展示 max_idx（= chapterId）、res_reward_time（= startTime）、extra_reward_id。缺字段不写成 0。出现的 0 仍写 0。extra_reward_id 按出现顺序。不写主城按钮上的时间。不写 Session.stageId。只读 RoleMission。不落库，无扣费，不推进 chapterId。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。不把 Mock 1201/1202 当真服。不写金币，不写钻石。不回落 Mock。不改 Boot。不从本探针自动发 3001";

export const WIRE_CHAPTER_PROBE_SIDE_EFFECT =
  "只读 RoleMission。不落库，无扣费，不推进 chapterId。空壳 04000000bf0b0000，主线页点「关卡数据」才再发，挂在已合 3001 / 3010 / 3012 之后、进战之前。不进 pullIdle。不发 3002。不发 3005。不发 3008、3011。硬禁 3013。硬禁 4601、29001。不重发 3001、3010、3012、3006、3102、3103、3030。不写金币，不写钻石。不写 Session.stageId";

/** 本刀不编码这些号。3007 自己的空帧已由登录链编码。3005 仍是挂机领取，不能编成 3007。3013 硬禁。 */
export const WIRE_CHAPTER_PROBE_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireChapterProgress {
  /** 字段 2 now_idx。没有这个字段时是 null，不要当成 0。 */
  nowIdx: number | null;
  /** 字段 3 max_idx。没有这个字段时是 null。0 表示服上就是 0。等于 chapterId。 */
  maxIdx: number | null;
  /** 字段 1 res_reward_time。没有这个字段时是 null。0 是包里的 0。等于 startTime。不写进按钮。 */
  resRewardTime: number | null;
  /** 字段 4 extra_reward_id。没有时是空数组，不写成 0。出现的 0 仍留在数组里。 */
  extraRewardIds: number[];
}

const MAX_BODY = 8192;

/**
 * 解 s2c 3007。解不开、超长、空包都返回 null，不抛。
 * 包能解开但没有 now_idx / max_idx 时，两个 idx 都是 null。
 * 字段 1 的时间和字段 4 的 extra_reward_id 仍返回，不当成 idx。
 */
export function decodeWireChapter(body: Uint8Array | null | undefined): WireChapterProgress | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  let fields: ProtoField[] | null = null;
  try {
    fields = decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
  if (!fields) return null;
  return {
    nowIdx: nonNegativeVarint(fields, 2),
    maxIdx: nonNegativeVarint(fields, WIRE_CHAPTER_MAX_FIELD),
    resRewardTime: presentVarint(fields, WIRE_CHAPTER_TIME_FIELD),
    extraRewardIds: extraRewardIds(fields),
  };
}

/**
 * 主线页「关卡数据」。null 是还没同步。
 * 只写这一包带上的 max_idx、res_reward_time、extra_reward_id。缺的写「未带」，不写成 0。
 */
export function formatWireChapterProbe(progress: WireChapterProgress | null): string {
  if (!progress) return "关卡数据 " + WIRE_CHAPTER_PROBE_UNSYNCED;
  const max = progress.maxIdx === null ? "max_idx " + WIRE_CHAPTER_PROBE_ABSENT : "max_idx " + progress.maxIdx + " (= chapterId)";
  const time =
    progress.resRewardTime === null
      ? "res_reward_time " + WIRE_CHAPTER_PROBE_ABSENT
      : "res_reward_time " + progress.resRewardTime + " (= startTime)";
  const extra =
    progress.extraRewardIds.length === 0
      ? "extra_reward_id " + WIRE_CHAPTER_PROBE_ABSENT
      : "extra_reward_id " + progress.extraRewardIds.join(",");
  return "关卡数据 " + max + " / " + time + " / " + extra;
}

export function wireChapterHasIdx(progress: WireChapterProgress): boolean {
  return progress.nowIdx !== null || progress.maxIdx !== null;
}

/** 真服只读页标题。不是 Mock 关卡列表。 */
export const WIRE_MAINLINE_READONLY_TITLE = "主线（真服只读）";

/** 真服主线页说明。挑战在页内发 3001，说明与 wireBattle 同一句。 */
export const WIRE_MAINLINE_READONLY_NOTE = WIRE_BATTLE_MATCH_NOTE;

/**
 * 只读页上的一行。kind=now 是字段 2，kind=max 是字段 3。
 * 没有这个字段写「未同步」。0 仍写 0。
 */
export function formatWireChapterIdx(kind: "now" | "max", idx: number | null): string {
  const name = kind === "now" ? "当前 idx" : "最高 idx";
  if (idx === null) return name + " 未同步";
  return name + " " + idx;
}

/** 只列出这一包带上的 idx。没出现的字段不写「未同步」。 */
export function wireChapterNote(progress: WireChapterProgress): string {
  return "主线 " + formatWireMainline(progress.nowIdx, progress.maxIdx).replace(/^主线 · /, "");
}

/**
 * 主城「主线」按钮。当前 = 字段 2 now_idx，最高 = 字段 3 max_idx。
 * 不是 Mock 的「第 N 关」（那是下一关 stageId）。
 */
export function formatWireMainline(nowIdx: number | null, maxIdx: number | null): string {
  if (nowIdx !== null && maxIdx !== null) return "主线 · 当前 " + nowIdx + " / 最高 " + maxIdx;
  if (nowIdx !== null) return "主线 · 当前 " + nowIdx;
  if (maxIdx !== null) return "主线 · 最高 " + maxIdx;
  return "主线 · 未同步";
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

/** 字段 1 和字段 4。-1 仍是 -1。其它负数丢掉。0 留下。 */
function presentVarint(fields: ProtoField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const value = acceptedNumber(fields[i], field);
    if (value !== null) return value;
  }
  return null;
}

function extraRewardIds(fields: ProtoField[]): number[] {
  const ids: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    const value = acceptedNumber(fields[i], WIRE_CHAPTER_EXTRA_FIELD);
    if (value !== null) ids.push(value);
  }
  return ids;
}

function acceptedNumber(row: ProtoField, field: number): number | null {
  if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") return null;
  if (!isFinite(row.varint)) return null;
  if (row.varint === -1) return -1;
  if (row.varint < 0) return null;
  return Math.floor(row.varint);
}
