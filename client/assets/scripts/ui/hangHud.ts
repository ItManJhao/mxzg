/**
 * 顶栏战力和头像。s2c 2001 没有战力，也没有当前头像。
 * 3103 空探针的 fighting=0 不进这里。没有名册 fighting 时不写 0。
 */
import { GameStore, StoreHero } from "../core/GameStore";
import { heroProfile } from "../config/gameCatalog";
import { deployedHeroIds } from "../module/mainline/localLineup";

export interface FightRow {
  heroId: number | null;
  fighting: number | null;
}

/** 有数字才加总。一个都没有返回 null，调用方留空，不写成 0。 */
export function sumKnownFighting(rows: FightRow[], only: number[] | null): number | null {
  let sum = 0;
  let known = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (only && (row.heroId === null || only.indexOf(row.heroId) < 0)) continue;
    const fight = row.fighting;
    if (typeof fight !== "number" || !isFinite(fight)) continue;
    sum += Math.floor(fight);
    known += 1;
  }
  if (known === 0) return null;
  return sum;
}

/** 优先 MAIN。阵容对不上名册时，再用名册里已经带 fighting 的英雄。没有就空串。 */
export function formatCombatPower(): string {
  const heroes = GameStore.heroes();
  if (!heroes || heroes.length === 0) return "";
  const deployed = deployedHeroIds();
  let total = sumKnownFighting(heroes, deployed.length > 0 ? deployed : null);
  if (total === null && deployed.length > 0) total = sumKnownFighting(heroes, null);
  if (total === null) return "";
  return String(total);
}

/** 出阵第一只，否则名册第一只。没有头像路径就返回 null，顶栏关掉空褐圈。 */
export function formatAvatarIcon(): string | null {
  const heroes = GameStore.heroes();
  if (!heroes || heroes.length === 0) return null;
  const deployed = deployedHeroIds();
  let pick: StoreHero | null = null;
  if (deployed.length > 0) {
    for (let i = 0; i < heroes.length; i++) {
      const id = heroes[i].heroId;
      if (id !== null && deployed.indexOf(id) >= 0) {
        pick = heroes[i];
        break;
      }
    }
  }
  if (!pick) pick = heroes[0];
  const profile = heroProfile(pick.heroType);
  return profile && profile.icon ? profile.icon : null;
}
