/**
 * 挂机进战后的站场。
 * 战报里已经有我方英雄时，用名册 hero_type 对皮肤，和挂机同一套。
 * 战报没有我方英雄、商店里又有 MAIN（3101）时，用那几只，不用默认三套凑数。
 * 战报没有守方、chapter.idx 对得上且该英雄有 stand 时，用表里的怪。没有就留默认套。
 * 不改战报原件，不发协议。
 */
import { GameStore } from "../../core/GameStore";
import { chapterEnemies, heroBaseStats, heroProfile } from "../../config/gameCatalog";
import { BattleCast } from "./battle";
import { mainFormationHeroes } from "../../net/protocol/starterLineup";
import {
  planWireSpineReplay,
  wireSpineHasClip,
  WireBattleHero,
  WireBattleReport,
  WireSpineReplay,
  WireSpineSlot,
} from "../../net/protocol/wireBattle";
import { hangSpineStem } from "../../ui/idleHangRoster";

export function replayFromStore(report: WireBattleReport, roleId: number | null, stageId: number): WireSpineReplay {
  const shaped = shapeReport(report, stageId);
  const plan = planWireSpineReplay(shaped, roleId, stageId);
  return retarget(plan, shaped);
}

/**
 * Mock 简化战报的出场。名册用商店前三名。守方用 chapter.idx 对上的怪。
 * 没有就留空，planBattle 继续用角色名和「前锋」。
 */
export function mockBattleCast(stageId: number): { allies?: BattleCast[]; enemies?: BattleCast[] } {
  const allies: BattleCast[] = [];
  if (GameStore.source === "mock") {
    const heroes = GameStore.heroes();
    if (heroes) {
      for (let i = 0; i < heroes.length && allies.length < 3; i++) {
        const row = heroes[i];
        const profile = heroProfile(row.heroType);
        const name = (row.name || "").trim() || (profile ? profile.name : "");
        if (!name) continue;
        const cast: BattleCast = { name };
        const stats = heroBaseStats(row.heroType, row.star);
        if (stats) cast.maxHp = stats.hp;
        allies.push(cast);
      }
    }
  }
  const enemies: BattleCast[] = [];
  const rows = chapterEnemies(stageId);
  for (let i = 0; i < rows.length && enemies.length < 3; i++) {
    const cast: BattleCast = { name: rows[i].name };
    const hp = rows[i].hp;
    if (hp !== null) cast.maxHp = hp;
    enemies.push(cast);
  }
  return {
    allies: allies.length > 0 ? allies : undefined,
    enemies: enemies.length > 0 ? enemies : undefined,
  };
}

function shapeReport(report: WireBattleReport, stageId: number): WireBattleReport {
  let atk = report.atkHeroes;
  let def = report.defHeroes;
  if (atk.length === 0 && GameStore.source === "wire") {
    const formed = mainFormationHeroes(GameStore.formation());
    if (formed.length > 0) {
      const next: WireBattleHero[] = [];
      const n = formed.length < 3 ? formed.length : 3;
      for (let i = 0; i < n; i++) {
        next.push({
          pos: formed[i].position,
          heroId: formed[i].heroId,
          hp: null,
          maxHp: null,
          marks: [],
        });
      }
      atk = next;
    }
  }
  if (def.length === 0) {
    const rows = chapterEnemies(stageId);
    const next: WireBattleHero[] = [];
    for (let i = 0; i < rows.length && next.length < 3; i++) {
      const stem = String(rows[i].heroType);
      if (!wireSpineHasClip(stem, "stand") && !wireSpineHasClip(stem, "attack")) continue;
      next.push({
        pos: rows[i].pos,
        heroId: rows[i].heroType,
        hp: null,
        maxHp: null,
        marks: [],
      });
    }
    if (next.length > 0) def = next;
  }
  if (atk === report.atkHeroes && def === report.defHeroes) return report;
  return {
    battleId: report.battleId,
    battleType: report.battleType,
    atkId: report.atkId,
    defId: report.defId,
    winId: report.winId,
    rounds: report.rounds,
    atkHeroes: atk,
    defHeroes: def,
    marks: report.marks,
  };
}

function retarget(plan: WireSpineReplay, report: WireBattleReport): WireSpineReplay {
  const roster = GameStore.heroes();
  const slots: WireSpineSlot[] = [];
  let ally = 0;
  let enemy = 0;
  for (let i = 0; i < plan.slots.length; i++) {
    const slot = plan.slots[i];
    if (slot.side === "ally") {
      slots.push(retargetSlot(slot, report.atkHeroes[ally], roster));
      ally += 1;
      continue;
    }
    if (slot.side === "enemy") {
      slots.push(retargetSlot(slot, report.defHeroes[enemy], roster));
      enemy += 1;
      continue;
    }
    slots.push(slot);
  }
  const stems: string[] = [];
  for (let i = 0; i < slots.length; i++) pushUnique(stems, slots[i].stem);
  for (let b = 0; b < plan.beats.length; b++) {
    const vfx = plan.beats[b].vfx;
    for (let v = 0; v < vfx.length; v++) pushUnique(stems, vfx[v].stem);
  }
  return { stageId: plan.stageId, win: plan.win, slots, beats: plan.beats, stems };
}

function retargetSlot(
  slot: WireSpineSlot,
  hero: WireBattleHero | undefined,
  roster: { heroId: number | null; heroType: number | null }[] | null
): WireSpineSlot {
  if (!hero || hero.heroId === null) return slot;
  const fromRoster = typeOf(roster, hero.heroId);
  const looked = fromRoster !== null ? fromRoster : heroProfile(hero.heroId) ? hero.heroId : null;
  const next = preferredStem(hero.heroId, looked, slot.stem);
  const profile = heroProfile(looked !== null ? looked : hero.heroId);
  let label = slot.label;
  if (profile && label.indexOf(profile.name) < 0) label = label + " " + profile.name;
  if (next === slot.stem && label === slot.label) return slot;
  return { side: slot.side, stem: next, pos: slot.pos, hp: slot.hp, maxHp: slot.maxHp, label };
}

function preferredStem(heroId: number, heroType: number | null, current: string): string {
  const next = hangSpineStem(heroId, heroType);
  if (next === current) return current;
  if (wireSpineHasClip(next, "stand") || wireSpineHasClip(next, "attack")) return next;
  return current;
}

function typeOf(
  roster: { heroId: number | null; heroType: number | null }[] | null,
  heroId: number
): number | null {
  if (!roster) return null;
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].heroId === heroId) return roster[i].heroType;
  }
  return null;
}

function pushUnique(list: string[], stem: string): void {
  if (!stem) return;
  for (let i = 0; i < list.length; i++) if (list[i] === stem) return;
  list.push(stem);
}
