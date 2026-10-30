import { setWireHeroTypeNote } from "../net/protocol/wireHero";
import { setBattleFrameStepMs, setBattleRoundMax, setBattleUnlockLevels } from "./battleTiming";
import { ConfigTableFile } from "./types";
import { bindGameCatalog } from "./gameCatalog";
import { clearConfigLookups, setHeroBaseHp, setSkillCastDelay, setSkillDisplayName } from "./lookups";

type Row = Record<string, unknown>;
type Table = ConfigTableFile<Row> | undefined;

/**
 * 把已加载的 JSON 登记到战斗和英雄查找。
 * 缺表就跳过，调用方继续用原来的常量。
 */
export function bindConfigTables(tables: Map<string, ConfigTableFile<Row>>): void {
  clearConfigLookups();
  bindHeroTypes(tables.get("herotype"));
  bindSkills(tables.get("heroskill"), tables.get("language"), tables.get("buff"));
  bindHeroBase(tables.get("herobase"));
  bindFrameStep(tables.get("effect2"));
  bindSystemUnlocks(tables.get("system"));
  bindRoundCaps(tables.get("battletype"));
  bindGameCatalog(tables);
}

function bindHeroTypes(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    if (type === null || typeof row.note !== "string") continue;
    setWireHeroTypeNote(type, row.note);
  }
}

function bindSkills(skills: Table, language: Table, buffs: Table): void {
  const text = new Map<number, string>();
  for (const row of rows(language)) {
    const key = num(row.key);
    if (key === null || typeof row.value !== "string" || !row.value.trim()) continue;
    text.set(key, row.value.trim());
  }
  const delayByIdx = new Map<number, number>();
  for (const row of rows(buffs)) {
    const idx = num(row.idx);
    const delay = num(row.delay);
    if (idx === null || delay === null || delay <= 0) continue;
    delayByIdx.set(idx, delay);
  }
  const chosen = new Map<number, { rank: number; name: string; delay: number }>();
  for (const row of rows(skills)) {
    const skillId = num(row.type);
    if (skillId === null) continue;
    const level = num(row.level);
    const rank = level === null ? 9999 : level;
    const prev = chosen.get(skillId);
    if (prev && rank >= prev.rank) continue;
    const lang = num(row.lan_name);
    const name = lang === null ? "" : text.get(lang) || "";
    if (!name) continue;
    const art = firstArt(row.art_list);
    const delay = art === null ? 0 : delayByIdx.get(art) ?? 0;
    chosen.set(skillId, { rank, name, delay });
  }
  chosen.forEach((item, skillId) => {
    setSkillDisplayName(skillId, item.name);
    if (item.delay > 0) setSkillCastDelay(skillId, item.delay);
  });
}

function bindHeroBase(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    const star = num(row.star);
    const hp = num(row.hp);
    if (type === null || star === null || hp === null) continue;
    setHeroBaseHp(type, star, hp);
  }
}

function bindFrameStep(table: Table): void {
  for (const row of rows(table)) {
    if (row.name !== "eff_battle_start") continue;
    const speed = num(row.speed);
    if (speed === null || speed <= 0) continue;
    setBattleFrameStepMs(speed * 10);
    return;
  }
}

function bindSystemUnlocks(table: Table): void {
  let speed = 0;
  let skip = 0;
  for (const row of rows(table)) {
    if (row.key === "battle_speed_level") speed = num(row.value) ?? 0;
    else if (row.key === "battle_skip_level") skip = num(row.value) ?? 0;
  }
  setBattleUnlockLevels(speed, skip);
}

function bindRoundCaps(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    const rounds = num(row.round_max);
    if (type === null || rounds === null) continue;
    setBattleRoundMax(type, rounds);
  }
}

function rows(table: Table): Row[] {
  if (!table || !Array.isArray(table.rows)) return [];
  return table.rows;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

function firstArt(value: unknown): number | null {
  const text = typeof value === "string" ? value : Array.isArray(value) ? value.join(",") : "";
  const match = /-?\d+/.exec(text);
  if (!match) return null;
  return parseInt(match[0], 10);
}
