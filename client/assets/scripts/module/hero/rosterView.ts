/**
 * 英雄页读 GameStore 名册，名字和技能读配置。
 * 真服名册来自 s2c 4001。空数组是已同步的空名册，null 是还没同步。
 * Mock 名册沿用会话里的名字。类型对上 herotype 才换表内名字和技能。
 */
import { GameStore, StoreHero } from "../../core/GameStore";
import { heroBaseStats, heroProfile, heroSkillText, HeroSkillFace } from "../../config/gameCatalog";
import { toHeroCard } from "./growth";
import { HeroCard } from "../../net/protocol/types";
import { wireHeroTypeLabel, WireHeroEntry } from "../../net/protocol/wireHero";

export interface HeroFace {
  line: string;
  detail: string[];
}

export function formatStoreHeroLine(hero: StoreHero): string {
  return lineOf(hero, null);
}

/**
 * 真服页。source 是 wire 时只认 GameStore。
 * 还没 4001 是 unsynced。空数组是 empty。
 * source 不是 wire 时退回传入的会话名册，避免商店还没抄到就把页刷空。
 */
export function wireHeroBoard(sessionHeroes: WireHeroEntry[] | null): {
  kind: "unsynced" | "empty" | "list";
  faces: HeroFace[];
} {
  if (GameStore.source === "wire") {
    const heroes = GameStore.heroes();
    if (!heroes) return { kind: "unsynced", faces: [] };
    if (heroes.length === 0) return { kind: "empty", faces: [] };
    return { kind: "list", faces: heroes.map((hero) => faceOf(hero, findSession(sessionHeroes, hero.heroId))) };
  }
  if (!sessionHeroes) return { kind: "unsynced", faces: [] };
  if (sessionHeroes.length === 0) return { kind: "empty", faces: [] };
  const faces: HeroFace[] = [];
  for (let i = 0; i < sessionHeroes.length; i++) {
    const entry = sessionHeroes[i];
    faces.push(
      faceOf(
        {
          heroId: entry.heroId,
          heroType: entry.heroType,
          name: "",
          level: entry.level,
          star: entry.star,
          fighting: entry.fighting,
        },
        entry
      )
    );
  }
  return { kind: "list", faces };
}

/**
 * Mock 英雄页。source 是 mock 且名册已写入时，按商店顺序展示。
 * 空数组是空名册。商店还没写入时返回 null，调用方继续用协议回包。
 */
export function mockHeroCards(proto: HeroCard[]): HeroCard[] | null {
  if (GameStore.source !== "mock") return null;
  const heroes = GameStore.heroes();
  if (!heroes) return null;
  const cards: HeroCard[] = [];
  for (let i = 0; i < heroes.length; i++) {
    const row = heroes[i];
    if (row.heroId === null || row.heroId < 1) continue;
    const card = cardOf(row, findCard(proto, row.heroId));
    if (card) cards.push(card);
  }
  return cards;
}

export function heroSkillSuffix(heroId: number): string {
  const heroes = GameStore.heroes();
  if (!heroes) return "";
  for (let i = 0; i < heroes.length; i++) {
    if (heroes[i].heroId !== heroId) continue;
    const text = heroSkillText(heroes[i].heroType);
    return text ? " · " + text : "";
  }
  return "";
}

function faceOf(hero: StoreHero, session: WireHeroEntry | null): HeroFace {
  const profile = heroProfile(hero.heroType);
  const detail: string[] = [lineOf(hero, session)];
  if (session) {
    pushNamed(detail, "阶段", session.stage);
    pushNamed(detail, "元素", session.elem);
    pushNamed(detail, "职业", session.occupation);
    pushNamed(detail, "锁定", session.isLock);
  } else if (profile) {
    pushNamed(detail, "元素", profile.elem);
    pushNamed(detail, "职业", profile.occupation);
  }
  const skills: HeroSkillFace[] = profile ? profile.skills : [];
  if (skills.length > 0) {
    const names: string[] = [];
    for (let i = 0; i < skills.length; i++) names.push(skills[i].name);
    detail.push("技能 " + names.join(" / "));
  }
  const star = hero.star !== null ? hero.star : profile ? profile.star : null;
  const stats = heroBaseStats(hero.heroType, star);
  if (stats) {
    detail.push("生命 " + stats.hp + " · 攻击 " + stats.atk + " · 防御 " + stats.def + " · 速度 " + stats.spd);
  }
  return { line: detail[0], detail };
}

function lineOf(hero: StoreHero, _session: WireHeroEntry | null): string {
  const profile = heroProfile(hero.heroType);
  const stored = (hero.name || "").trim();
  const name = stored || (profile ? profile.name : wireHeroTypeLabel(hero.heroType));
  let text = name;
  if (hero.heroId !== null) text += " · id " + hero.heroId;
  if (hero.level !== null) text += " · Lv" + hero.level;
  if (hero.star !== null) text += " · " + hero.star + "星";
  if (hero.fighting !== null) text += " · 战力 " + hero.fighting;
  const skills = heroSkillText(hero.heroType);
  if (skills) text += " · " + skills;
  return text;
}

function cardOf(row: StoreHero, proto: HeroCard | null): HeroCard | null {
  const id = row.heroId;
  if (id === null || id < 1) return null;
  const profile = heroProfile(row.heroType);
  const name = (row.name || "").trim() || (profile ? profile.name : "");
  if (proto) {
    return {
      id: proto.id,
      name: name || proto.name,
      level: row.level !== null && row.level >= 1 ? row.level : proto.level,
      star: row.star !== null && row.star >= 1 ? row.star : proto.star,
      atk: proto.atk,
      hp: proto.hp,
      def: proto.def,
      upgradeCost: proto.upgradeCost,
      maxLevel: proto.maxLevel,
      weaponName: proto.weaponName,
      weaponLevel: row.weaponLevel !== undefined ? row.weaponLevel : proto.weaponLevel,
      weaponAtk: proto.weaponAtk,
    };
  }
  if (!name) return null;
  const level = row.level !== null && row.level >= 1 ? row.level : 1;
  const star = row.star !== null && row.star >= 1 ? row.star : 1;
  return toHeroCard({
    id,
    name,
    level,
    star,
    weaponLevel: row.weaponLevel,
  });
}

function findCard(cards: HeroCard[], id: number): HeroCard | null {
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].id === id) return cards[i];
  }
  return null;
}

function findSession(heroes: WireHeroEntry[] | null, heroId: number | null): WireHeroEntry | null {
  if (!heroes || heroId === null) return null;
  for (let i = 0; i < heroes.length; i++) {
    if (heroes[i].heroId === heroId) return heroes[i];
  }
  return null;
}

function pushNamed(lines: string[], label: string, value: number | null): void {
  if (value === null) return;
  lines.push(label + " " + value);
}
