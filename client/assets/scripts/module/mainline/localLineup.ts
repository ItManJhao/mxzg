/**
 * ?dev=mock 时，出阵只记在本局。
 * 真服不读这里。MAIN 以 s2c 3101 为准，确认出阵走 c2s 3100。
 */
import { GameStore } from "../../core/GameStore";
import { Session } from "../../core/Session";
import { WireSession } from "../../net/WireSession";
import { mainFormationHeroes } from "../../net/protocol/starterLineup";
import { mockRuntimeEnabled } from "../../net/transportSelect";

const ids: number[] = [];
const listeners: Array<() => void> = [];

export function localLineupIds(): number[] {
  return ids.slice();
}

/** 最多 8 个。重复的丢掉。空数组表示这一局还没在出阵里确认。 */
export function setLocalLineup(next: readonly number[]): void {
  ids.length = 0;
  for (let i = 0; i < next.length; i++) {
    const id = next[i];
    if (typeof id !== "number" || !isFinite(id) || id <= 0) continue;
    const heroId = Math.floor(id);
    if (ids.indexOf(heroId) >= 0) continue;
    ids.push(heroId);
    if (ids.length >= 8) break;
  }
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

export function onLocalLineup(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index >= 0) listeners.splice(index, 1);
  };
}

/** 出阵确认过，或 3101 MAIN 里已经有英雄。 */
export function hangLineupReady(): boolean {
  return deployedHeroIds().length > 0;
}

/** 真服只读 s2c 3101。Mock 才用本局记下的 id。 */
export function deployedHeroIds(): number[] {
  if (mockRuntimeEnabled() && ids.length > 0) return ids.slice();
  if (Session.source !== "wire" && GameStore.source !== "wire" && !mockRuntimeEnabled()) return [];
  const line = GameStore.formation() || (Session.source === "wire" ? WireSession.lineUp : null);
  const heroes = mainFormationHeroes(line);
  const found: number[] = [];
  for (let i = 0; i < heroes.length; i++) found.push(heroes[i].heroId);
  return found;
}
