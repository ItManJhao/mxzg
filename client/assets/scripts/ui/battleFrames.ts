/**
 * 回放用的帧路径。都在 resources/battle 下，给 resources.load 的是不带扩展名的路径。
 * hero-beattack 跳过只有一张小图的第 0 套。skill-101050201-3 只播编号帧，不播那张无序号底图。
 * hero-skill 的文件名是 hero-skill_effect-1-0 … 9，不是 stem_序号。
 * skill_id 对得上 resources 里的套时播那套。对不上仍用下面 49 套取模，所以 0 仍是 hero-skill。
 */
import {
  attackHeroSkillCoverage,
  skillArrowFrames,
  skillCompanionFrames,
  skillIdForSpineStem,
  skillLayerFrames,
  skillRestLayerFrames,
  skillStemForId,
  skillStemFrames,
} from "../net/protocol/battleAssetIndex";

export { attackHeroSkillCoverage, skillIdForSpineStem };

export const HIT_RUNS: readonly (readonly [string, number])[] = [
  ["1", 5],
  ["2", 5],
  ["3", 3],
  ["4", 4],
  ["5", 4],
];

export const EFFECT_RUNS: readonly (readonly [string, number])[] = [
  ["duola-skill-effect-parry", 24],
  ["skill-effect-contract", 20],
  ["skill-effect-parry", 10],
  ["skill-effect-revive", 11],
  ["skill-effect-shield", 10],
  ["skill-effect-slient", 8],
  ["titan-skill-effect-contract", 21],
];

export const SKILL_RUNS: readonly (readonly [string, number])[] = [
  ["hero-skill", 10],
  ["skill-101010011", 9],
  ["skill-101020021", 11],
  ["skill-101030030", 6],
  ["skill-101040050", 7],
  ["skill-101040051", 6],
  ["skill-101040120-1", 8],
  ["skill-101040120-2", 14],
  ["skill-101050060", 11],
  ["skill-101050070", 8],
  ["skill-101050073", 19],
  ["skill-101050080", 11],
  ["skill-101050080-1", 6],
  ["skill-101050080-2", 12],
  ["skill-101050083", 11],
  ["skill-101050085", 7],
  ["skill-101050090", 18],
  ["skill-101050100", 23],
  ["skill-101050101", 21],
  ["skill-101050110", 10],
  ["skill-101050130", 8],
  ["skill-101050201-2", 23],
  ["skill-101050201-3", 11],
  ["skill-102010011", 4],
  ["skill-102020021", 14],
  ["skill-102030031", 8],
  ["skill-102040040", 14],
  ["skill-102040050", 11],
  ["skill-102050060", 8],
  ["skill-102050070", 7],
  ["skill-102050080", 7],
  ["skill-102050100", 18],
  ["skill-103010011", 7],
  ["skill-103020021", 15],
  ["skill-103030030", 12],
  ["skill-103030031", 9],
  ["skill-103040041", 11],
  ["skill-103040050", 8],
  ["skill-103040051", 10],
  ["skill-103040120", 11],
  ["skill-103050060", 18],
  ["skill-104030011", 6],
  ["skill-104040020", 9],
  ["skill-104040021", 9],
  ["skill-104040031", 9],
  ["skill-104050040", 6],
  ["skill-104050041", 11],
  ["skill-104050050", 7],
  ["skill-104050060", 14],
];

export function pickIndex(skillId: number | null, length: number): number {
  if (length <= 0) return 0;
  if (typeof skillId !== "number" || !isFinite(skillId)) return 0;
  return Math.floor(Math.abs(skillId)) % length;
}

function numbered(prefix: string, count: number): string[] {
  const paths: string[] = [];
  for (let i = 0; i < count; i++) paths.push(prefix + String(i));
  return paths;
}

export function hitFramePaths(skillId: number | null): string[] {
  const run = HIT_RUNS[pickIndex(skillId, HIT_RUNS.length)];
  const set = run[0];
  const paths: string[] = [];
  for (let i = 0; i < run[1]; i++) {
    const n = i < 10 ? "0" + String(i) : String(i);
    paths.push("battle/hero-beattack/hero-beattack_" + set + "-" + n);
  }
  return paths;
}

export function effectFramePaths(skillId: number | null): string[] {
  const run = EFFECT_RUNS[pickIndex(skillId, EFFECT_RUNS.length)];
  return numbered("battle/skill-effect/" + run[0] + "/" + run[0] + "_", run[1]);
}

export function skillFramePaths(skillId: number | null): string[] {
  const exact = skillStemFrames(skillId);
  if (exact) return exact;
  const run = SKILL_RUNS[pickIndex(skillId, SKILL_RUNS.length)];
  if (run[0] === "hero-skill") {
    return numbered("battle/skill/hero-skill/hero-skill_effect-1-", run[1]);
  }
  return numbered("battle/skill/" + run[0] + "/" + run[0] + "_", run[1]);
}

/**
 * 对得上的技能再播下一层。没有下一层是空数组。
 * 技能号对不上是 null，调用方仍播 skill-effect 取模。
 */
export function skillLayerFramePaths(skillId: number | null): string[] | null {
  return skillLayerFrames(skillId);
}

/** 下一层之后还要同时播的分套。没有就是空数组。 */
export function skillRestLayerFramePaths(skillId: number | null): string[][] {
  return skillRestLayerFrames(skillId);
}

/** 跟主套一起播的箭矢。没有就是空数组。 */
export function skillArrowFramePaths(skillId: number | null): string[] {
  return skillArrowFrames(skillId);
}

/** 这一拍要留多久才够播完技能帧。没有 skill_id 是 0，调用方不编造技能。 */
export function battleCastFrameCount(skillId: number | null): number {
  if (typeof skillId !== "number" || !isFinite(skillId)) return 0;
  const skill = skillFramePaths(skillId).length;
  const layer = skillLayerFramePaths(skillId);
  const effect = layer === null ? effectFramePaths(skillId).length : layer.length;
  const hit = hitFramePaths(skillId).length;
  let count = skill;
  if (effect > count) count = effect;
  if (hit > count) count = hit;
  const rest = skillRestLayerFrames(skillId);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].length > count) count = rest[i].length;
  }
  const arrow = skillArrowFrames(skillId).length;
  if (arrow > count) count = arrow;
  return count;
}

/**
 * 挂机奇数刀要叠的帧。套名、套名补 0，或表上的换皮/技能号对得上，就播那套和它的分套、箭矢。
 * 对不上仍是 hero-skill，不把 skill-effect 取模里的立绘套上来。
 * 普通刀只留受击帧。
 */
export function hangSkillVfx(stem: string | null, skilled: boolean): { skill: string[]; layers: string[][]; arrow: string[]; hit: string[] } {
  if (!skilled) {
    return { skill: [], layers: [], arrow: [], hit: hitFramePaths(null) };
  }
  const skillId = skillIdForSpineStem(stem);
  const layers: string[][] = [];
  if (skillId !== null) {
    const extra = skillCompanionFrames(skillId);
    if (extra) {
      for (let i = 0; i < extra.length; i++) layers.push(extra[i]);
    }
  }
  return {
    skill: skillFramePaths(skillId),
    layers,
    arrow: skillId === null ? [] : skillArrowFrames(skillId),
    hit: hitFramePaths(skillId),
  };
}

export interface HangStrikeStack {
  skill: string[];
  layers: string[][];
  arrow: string[];
  hit: string[];
  /** report：战报技能号有帧。stem：套名映射。hero-skill：两处都没有，改播通用技能。 */
  source: "report" | "stem" | "hero-skill";
}

/**
 * 开战这一拍要挂的技能帧。
 * 先用战报 skill_id 对帧表。对不上再按套名（补 0 / 换皮表）。两处都没有就播 hero-skill，调用方打「没有对上」并仍然挂上。
 * 不改 hangSkillVfx，演武奇数刀仍走套名。
 */
export function hangStrikeFrames(stem: string | null, skillId: number | null): HangStrikeStack {
  if (typeof skillId === "number" && isFinite(skillId) && skillStemForId(skillId)) {
    return packStrike(Math.floor(Math.abs(skillId)), "report");
  }
  const mapped = skillIdForSpineStem(stem);
  if (mapped !== null && skillStemForId(mapped)) return packStrike(mapped, "stem");
  const fallback = hangSkillVfx(stem, true);
  return {
    skill: fallback.skill,
    layers: [],
    arrow: [],
    hit: fallback.hit,
    source: "hero-skill",
  };
}

function packStrike(skillId: number, source: "report" | "stem"): HangStrikeStack {
  const extra = skillCompanionFrames(skillId);
  const layers: string[][] = [];
  if (extra) {
    for (let i = 0; i < extra.length; i++) layers.push(extra[i]);
  }
  return {
    skill: skillFramePaths(skillId),
    layers,
    arrow: skillArrowFrames(skillId),
    hit: hitFramePaths(skillId),
    source,
  };
}
