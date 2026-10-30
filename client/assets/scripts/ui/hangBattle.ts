/**
 * 战斗叠在挂机壳上。底栏三钮和收益留在下面。
 * 回合写成 n/15。加速用 battle-scene 的速度图，跳过停在这一局的最后一拍。
 * 血条跟站位。战报没有怒气字段时，怒气条按当前回合 / 15 填充，只标位置。
 * 飘字数字走 yellow-73 / green-73 / red-73。字库没挂上时退回红、绿、金系统字。
 * 技能名用 font/FZCSJW-GB1-0，和战斗壳 SkillNameLabel 同一套字。没挂上仍是系统字。
 * 开战标题用 spine/ZDKS（图里已经有「战斗开始」）。套没挂上才写系统字，不叠两层。
 * 出场光只打在有模型的一侧，中心对齐那一侧的人。没有模型的一侧不播。
 * 数字只来自这一拍真正的血量差或战报 hurt。没有就不写 0。
 * 摆完场会听 PAGE_SHELL_FIGHT。真服先重拉 3001（空体 GReqBattleMatch）。带攻击拍的新战报才播。
 * 3001 没发出、没回到，或等到超时仍没有攻击拍，都不复用上一局，改播本场回合。
 * 真服已经回到带攻击的战报时不改播 planBattle。Mock 仍只走本场。
 * 胜负从这一份战报或本关 planBattle 写明，不留「胜负未带」。胜利才拉 3007，Mock 才写下 stageId。
 * 打完盖 BattleEndLayer，等回挂机或下一关，不在横幅闪完后拆层。
 */
import { BlockInputEvents, Button, Color, Label, Node, Overflow, resources, sp, Sprite, SpriteFrame, TTFFont, UITransform } from "cc";
import { battleRoundMax } from "../config/battleTiming";
import { skillCastDelay } from "../config/lookups";
import { chapterStageEnemies } from "../config/gameCatalog";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { Session } from "../core/Session";
import { planBattle, BattleRound, BattleUnit } from "../module/mainline/battle";
import { mockBattleCast, replayFromStore } from "../module/mainline/battleFromStore";
import { WireSession } from "../net/WireSession";
import { hangFace } from "../features/battle/model/hangFace";
import {
  resolveWireBattleWin,
  wireBattleActionCount,
  WireBattleReport,
  WireSpineBeat,
  WireSpineReplay,
  wireSpineHasClip,
} from "../net/protocol/wireBattle";
import { paintSpeedIcon } from "./BattlePage";
import { battleAppearFramePaths } from "./battleAppear";
import { armBattleDelay } from "./battleClock";
import { battleCastFrameCount, hangStrikeFrames } from "./battleFrames";
import { battleFrameStep, mountFrameReel, type FrameReel } from "./battleFramePlay";
import {
  battleCastWait,
  battleRoundNumber,
  fallbackAttackTitle,
  nextBattleSpeed,
  planBattlePresentation,
  signedHitFloats,
  signedHpDeltas,
} from "./battlePresentation";
import { HANG_ACTOR_SCALE, mountBattleSpine, mountNamedSpine } from "./battleSpine";
import { placeHangFloats, type HangFloat } from "./hangFloat";
import { pauseIdleSkirmishes, resumeIdleSkirmishes } from "./idleHangSkirmish";
import { hangAppearAnchor, hangFightStageId, hangStandPoint, IDLE_HANG_SPOTS, IDLE_SKIRMISH_SPOTS, planHangFightLine } from "./idleHangSkirmishPlan";
import { hangSpineStem } from "./idleHangRoster";
import { mountBattleEnd } from "./battleEndView";
import { PAGE_SHELL_FIGHT } from "./prefabShellMap";
import { startShellFight } from "./pagePrefabShell";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

export type { HangFloat };

export interface HangBar {
  x: number;
  y: number;
  hpRatio: number;
  rageRatio: number;
  ally: boolean;
}

interface HangHold {
  left: string;
  right: string;
  speed: number;
  seq: number;
  allies: BattleUnit[] | null;
  enemies: BattleUnit[] | null;
}

const holds = new Map<Node, HangHold>();
const speedFns = new Map<Node, () => void>();
const skipFns = new Map<Node, () => void>();

const INK = new Color(255, 236, 190, 255);
const BAR_W = 78;

/** 敌方站在殿堂后侧，和挂机演武同一组三格。 */

export function bindHangSpeed(page: Node, fn: () => void): void {
  speedFns.set(page, fn);
  page.once(Node.EventType.NODE_DESTROYED, () => speedFns.delete(page));
}

export function bindHangSkip(page: Node, fn: () => void): void {
  skipFns.set(page, fn);
  page.once(Node.EventType.NODE_DESTROYED, () => skipFns.delete(page));
}

export function setHangSpeed(page: Node, speed: number): void {
  const hold = holds.get(page);
  const next = speed === 2 || speed === 3 ? speed : 1;
  if (hold) hold.speed = next;
  const layer = layerOf(page);
  if (!layer) return;
  const node = layer.getChildByName("HangSpeed");
  if (node) paintSpeedIcon(node, next);
}

/** 前排三格用挂机站位，敌方用后侧三格。多出来的人不画条。 */
export function barsFromSides(
  allies: { hp: number; maxHp: number }[],
  enemies: { hp: number; maxHp: number }[],
  rageRatio: number
): HangBar[] {
  const out: HangBar[] = [];
  pushBars(out, allies, IDLE_HANG_SPOTS, true, rageRatio);
  pushBars(out, enemies, IDLE_SKIRMISH_SPOTS, false, rageRatio);
  return out;
}

/** 出阵之后先把中间按钮改成战斗中，并闪一下开战。右侧怪从战报守方或 chapter 表摆上。 */
export function beginHangBattle(page: Node, left: string, right: string): void {
  armHangFight(page);
  const hold = ensureHold(page);
  hold.seq += 1;
  hold.left = left || "我方";
  hold.right = right || "敌方";
  hold.allies = null;
  hold.enemies = null;
  pauseIdleSkirmishes();
  const layer = ensureLayer(page);
  const foes = seatHangEnemies(layer);
  setCaption(page, "战斗中");
  playOpenVfx(layer);
  playHangAppear(layer, hold.speed, allyModelPoints(page), foes);
  paintVs(layer, hold);
  const round = layer.getChildByName("HangRound");
  if (round) setText(round, "1/15");
  setTalk(page, false);
}

export function showMockRound(page: Node, round: BattleRound, stageId: number): void {
  const hold = ensureHold(page);
  if (!hold.right) hold.right = "第" + stageId + "关";
  const floats: HangFloat[] = [];
  pushSide(floats, hold.allies, round.allies, "ally", false);
  pushSide(floats, hold.enemies, round.enemies, "enemy", round.line.indexOf("溃败") >= 0);
  hold.allies = round.allies.map(copyUnit);
  hold.enemies = round.enemies.map(copyUnit);
  const skill = strikeSkill(round);
  const rage = round.round >= 1 ? Math.min(1, round.round / 15) : 0;
  showHangStrike(page, round.round, 15, skill, floats, barsFromSides(round.allies, round.enemies, rage));
}

export function showHangStrike(
  page: Node,
  round: number,
  total: number,
  skill: string | null,
  floats: HangFloat[],
  bars?: HangBar[]
): void {
  const hold = ensureHold(page);
  const layer = ensureLayer(page);
  const flash = layer.getChildByName("HangFlash");
  if (flash && (titleOnSpine || round > 1 || floats.length > 0)) flash.active = false;
  if (!flash || !flash.active) stopHangAppear(layer);
  const cap = total >= 1 ? total : 15;
  const now = round >= 1 ? round : 1;
  const label = layer.getChildByName("HangRound");
  if (label) setText(label, now + "/" + cap);
  paintVs(layer, hold);
  const banner = layer.getChildByName("HangSkill");
  if (banner) setBanner(banner, skill);
  paintBars(layer, fitBars(page, layer, bars || []));
  const host = layer.getChildByName("HangFloats");
  if (!host) return;
  placeHangFloats(host, floats);
}

export function finishHangBattle(page: Node, win: boolean | null): void {
  const hold = holds.get(page);
  const seq = hold ? hold.seq : -1;
  const layer = layerOf(page);
  if (layer) stopHangAppear(layer);
  const stageId = fightStageId();
  settleHangResult(win, stageId);
  repaintHangProgress(page);
  if (layer) {
    const banner = layer.getChildByName("HangSkill");
    if (banner) {
      if (win === true) setBanner(banner, "胜利");
      else if (win === false) setBanner(banner, "失败");
      else setBanner(banner, null);
    }
    const flash = layer.getChildByName("HangFlash");
    if (flash) flash.active = false;
  }
  void showHangEnd(page, seq, win, stageId);
}

export function stopHangBattle(page: Node): void {
  const run = runs.get(page);
  holds.delete(page);
  if (run) dropRun(page, run);
  dropHangEnd(page);
  const layer = layerOf(page);
  if (layer) layer.destroy();
  dropHangReplay(page);
  setTalk(page, true);
  setCaption(page, "战斗");
  resumeIdleSkirmishes();
}

/**
 * 真服胜利发空 c2s 3007，等 s2c 回写 nowIdx / maxIdx，不在这里改 GameStore。
 * Mock 胜利把打过的关写成下一关。失败和胜负未带都不推进。
 */
function settleHangResult(win: boolean | null, stageId: number | null): void {
  const stageText = stageId === null ? "没有关号" : "第" + stageId + "关";
  if (win !== true) {
    if (win === false) GameLog.shared.info("Mainline", "开战结算 失败 " + stageText + "，进度不变");
    else GameLog.shared.warn("Mainline", "开战结算 胜负未带 " + stageText + "，不拉 3007，不写进度");
    return;
  }
  if (wireFight()) {
    let sent = false;
    try {
      sent = WireSession.pullChapterProbe();
    } catch (err) {
      GameLog.shared.warn("Mainline", "开战结算 3007 没有发出 " + messageOf(err));
      return;
    }
    if (!sent) {
      GameLog.shared.warn("Mainline", "开战结算 3007 没有发出，" + stageText + " 进度不改");
      return;
    }
    GameLog.shared.info("Mainline", "开战结算 胜利 " + stageText + "，已拉 3007");
    return;
  }
  if (stageId === null) {
    GameLog.shared.warn("Mainline", "开战结算 Mock 没有关号，不写进度");
    return;
  }
  const wrote = GameStore.noteMockVictory(stageId);
  if (!wrote.ok || wrote.next === null) {
    GameLog.shared.warn("Mainline", "开战结算 Mock 没有写入 " + stageText + " " + wrote.reason);
    return;
  }
  GameLog.shared.info("Mainline", "开战结算 Mock " + stageText + " 胜利，下一关 " + wrote.next);
}

function repaintHangProgress(page: Node): void {
  if (!page.isValid) return;
  const face = hangFace(Date.now(), Date.now());
  const names: { [key: string]: string } = {
    lbl_mission_name: face.caption,
    HangMissionLabel: face.caption,
    lbl_gold: face.gold,
    lbl_souls: face.souls,
    lbl_exp: face.exp,
  };
  const stack: Node[] = [page];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const text = names[node.name];
    if (text) setText(node, text);
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
  }
}

async function showHangEnd(page: Node, seq: number, win: boolean | null, stageId: number | null): Promise<void> {
  const live = (): boolean => {
    const now = holds.get(page);
    return page.isValid && !!now && now.seq === seq;
  };
  if (!page.isValid) {
    GameLog.shared.warn("Mainline", "开战结算时页面已关");
    return;
  }
  let hold: Node | null = null;
  try {
    hold = await mountBattleEnd(
      page,
      win,
      () => closeHangEnd(page, seq, false),
      {
        stageId: stageId === null ? undefined : stageId,
        onNext: win === true ? () => closeHangEnd(page, seq, true) : undefined,
      }
    );
  } catch (err) {
    GameLog.shared.warn("Mainline", "开战结算没有盖上 " + messageOf(err));
    hold = null;
  }
  if (!live()) {
    if (hold && hold.isValid) hold.destroy();
    GameLog.shared.info("Mainline", "开战结算时这一局已停");
    return;
  }
  if (!hold) hold = mountCodeEnd(page, win, seq);
  if (!hold) {
    GameLog.shared.warn("Mainline", "开战结算没有页面，不拆层");
    return;
  }
  const headline = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
  GameLog.shared.info("Mainline", "开战结算 盖上结算页 " + headline);
}

function mountCodeEnd(page: Node, win: boolean | null, seq: number): Node | null {
  if (!page.isValid) return null;
  const hold = uiNode("BattleEndHold");
  const ui = hold.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  hold.addComponent(BlockInputEvents);
  place(createRect("dim", 720, 1280, new Color(8, 16, 32, 180)), hold, 0, 0);
  const title = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
  place(createLabel(title, 36, { color: INK, width: 320, height: 48 }), hold, 0, 80);
  place(createButton("回挂机", () => closeHangEnd(page, seq, false), 200, 52), hold, 0, -40);
  if (win === true) {
    place(createButton("下一关", () => closeHangEnd(page, seq, true), 200, 52), hold, 0, -110);
  }
  const shell = page.getChildByName("PagePrefabShell");
  const host = shell && shell.isValid && shell.active ? shell : page;
  hold.parent = host;
  hold.setSiblingIndex(Math.max(0, host.children.length - 1));
  GameLog.shared.warn("Mainline", "开战结算 BattleEndLayer 没有挂上，改用代码结算 " + title);
  return hold;
}

function closeHangEnd(page: Node, seq: number, next: boolean): void {
  const live = holds.get(page);
  if (!page.isValid || !live || live.seq !== seq) {
    GameLog.shared.info("Mainline", "开战结算 回挂机时这一局已停");
    return;
  }
  stopHangBattle(page);
  if (wireFight()) {
    try {
      WireSession.refreshPersisted();
      const sent = WireSession.pullChapterProbe();
      if (sent) GameLog.shared.info("Mainline", "开战结算 回挂机，再拉 2001、5001、3004、3007");
      else GameLog.shared.warn("Mainline", "开战结算 回挂机时 3007 没有发出");
    } catch (err) {
      GameLog.shared.warn("Mainline", "开战结算 回挂机没有拉成 " + messageOf(err));
    }
  }
  if (!next || !page.isValid) return;
  const shell = page.getChildByName("PagePrefabShell");
  const root = shell && shell.isValid ? shell : page;
  startShellFight(root, page, "结算下一关");
}

function dropHangEnd(page: Node): void {
  const shell = page.isValid ? page.getChildByName("PagePrefabShell") : null;
  const hosts: Node[] = [];
  if (page.isValid) hosts.push(page);
  if (shell && shell.isValid) hosts.push(shell);
  for (let i = 0; i < hosts.length; i++) {
    const node = hosts[i].getChildByName("BattleEndHold");
    if (node && node.isValid) node.destroy();
  }
}

/**
 * 开战按钮先摆场，再发 PAGE_SHELL_FIGHT。
 * 真服每场都重发 3001。只播这一次新回来、并且带攻击的战报。
 * 没回到、没有攻击拍，都不拿上一局来补一拍。改播本场 planBattle，胜负写明。
 * Mock 直接播本场回合。没有关号、没有回合、骨架还没挂上，都打日志，不另造一页森林战斗。
 */
interface FightRun {
  seq: number;
  skip: boolean;
  wake: (() => void) | null;
  timers: Array<ReturnType<typeof setTimeout>>;
  modelMiss: boolean;
  gestureMiss: boolean;
  skillMiss: boolean;
  skillNoted: boolean;
  hitMiss: boolean;
}

const runs = new Map<Node, FightRun>();

function armHangFight(page: Node): void {
  const mark = page as Node & { mxzgFightDrive?: boolean };
  if (mark.mxzgFightDrive) return;
  mark.mxzgFightDrive = true;
  page.on(PAGE_SHELL_FIGHT, () => {
    if (!holds.get(page)) {
      GameLog.shared.info("Mainline", "开战入口=PAGE_SHELL_FIGHT 出阵=跳过原因=没有出阵确认");
      return;
    }
    void runHangFight(page);
  });
  page.once(Node.EventType.NODE_DESTROYED, () => {
    const run = runs.get(page);
    if (run) dropRun(page, run);
  });
}

function dropRun(page: Node, run: FightRun): void {
  const wake = run.wake;
  run.wake = null;
  if (wake) wake();
  for (let i = 0; i < run.timers.length; i++) clearTimeout(run.timers[i]);
  run.timers.length = 0;
  if (runs.get(page) === run) runs.delete(page);
}

async function runHangFight(page: Node): Promise<void> {
  const hold = holds.get(page);
  const seq = hold ? hold.seq : -1;
  const prev = runs.get(page);
  const run: FightRun = { seq, skip: false, wake: null, timers: [], modelMiss: false, gestureMiss: false, skillMiss: false, skillNoted: false, hitMiss: false };
  runs.set(page, run);
  if (prev) dropRun(page, prev);
  bindRunControls(page);
  const live = (): boolean => {
    if (!page.isValid) return false;
    const now = holds.get(page);
    return !!now && now.seq === seq && runs.get(page) === run;
  };
  GameLog.shared.info("Mainline", "开战进入回合");
  try {
    if (wireFight()) {
      const taken = await takeWireReport(run, live);
      if (!live()) return;
      if (!taken) return;
      if (taken.staged) {
        const roleId = Session.role ? Session.role.roleId : null;
        const carried = taken.report ? resolveWireBattleWin(taken.report, roleId) : null;
        await playMockReport(page, run, live, carried);
        return;
      }
      if (!taken.report) return;
      await playWireReport(page, run, taken.report, live);
      return;
    }
    await playMockReport(page, run, live, null);
  } catch (err) {
    GameLog.shared.warn("Mainline", "开战回合没有播 " + messageOf(err));
  }
}

function bindRunControls(page: Node): void {
  const mark = page as Node & { mxzgFightControls?: boolean };
  if (mark.mxzgFightControls) return;
  mark.mxzgFightControls = true;
  bindHangSpeed(page, () => {
    const hold = holds.get(page);
    const next = nextBattleSpeed(hold ? hold.speed : 1);
    setHangSpeed(page, next);
    GameLog.shared.info("Mainline", "开战加速 ×" + next);
  });
  bindHangSkip(page, () => {
    const run = runs.get(page);
    if (!run) return;
    run.skip = true;
    if (run.wake) run.wake();
    GameLog.shared.info("Mainline", "开战跳过，停在最后一拍");
  });
}

function wireFight(): boolean {
  return Session.source === "wire" || GameStore.source === "wire";
}

function cachedWireReport(): WireBattleReport | null {
  const match = GameStore.battle() || WireSession.battleMatch;
  if (match && match.report) return match.report;
  if (WireSession.chapterReport && WireSession.chapterReport.report) return WireSession.chapterReport.report;
  if (WireSession.battleReport && WireSession.battleReport.report) return WireSession.battleReport.report;
  return null;
}

interface FightTake {
  report: WireBattleReport | null;
  /** 不播手里那份旧战报，改用本关 planBattle 的完整回合。 */
  staged: boolean;
}

/**
 * 真服点开战就发 3001。只认这一次新回来、并且带攻击的战报。
 * 发得出但没回到，或回来的战报没有攻击拍，都不复用上一局，改播本场回合。
 * 发不出时，手里这份若本来就有攻击才播。没有攻击、也没有关号，就停。
 */
async function takeWireReport(run: FightRun, live: () => boolean): Promise<FightTake | null> {
  const since = WireSession.battleSerial;
  let sent = false;
  try {
    sent = WireSession.challengeMainline();
  } catch (err) {
    GameLog.shared.warn("Mainline", "开战 3001 没有发出 " + messageOf(err));
    sent = false;
  }
  if (!sent) return takeWithoutSend();
  GameLog.shared.info("Mainline", "开战进入战报，已发 3001 空体 GReqBattleMatch");
  const waited = await waitWireReport(since, run);
  if (waited.stopped) {
    if (run.skip) GameLog.shared.info("Mainline", "开战跳过时战报还没到，不播回合");
    else if (live()) GameLog.shared.info("Mainline", "开战已停，不再等战报");
    return null;
  }
  if (waited.report && reportHasActions(waited.report)) {
    GameLog.shared.info("Mainline", "开战战报驱动 攻击拍 " + wireBattleActionCount(waited.report) + "，不改播本场");
    return { report: waited.report, staged: false };
  }
  if (waited.report) return stageTake(waited.report, "开战 3001 回到的战报没有攻击拍，不补一拍结束");
  if (WireSession.battleSerial !== since) return stageTake(null, "开战 3001 回到的战报没有 report");
  return stageTake(null, "开战 3001 没有回到");
}

function takeWithoutSend(): FightTake | null {
  const had = cachedWireReport();
  if (had && reportHasActions(had)) {
    GameLog.shared.info("Mainline", "开战 3001 没有发出，改播已有战报 回合 " + had.rounds.length);
    return { report: had, staged: false };
  }
  if (had) return stageTake(null, "开战 3001 没有发出，已有战报没有攻击拍");
  if (fightStageId() !== null) {
    GameLog.shared.info("Mainline", "开战没有新的 3001，改播本场回合");
    return { report: null, staged: true };
  }
  GameLog.shared.warn("Mainline", "开战没有进战报，3001 没有发出，也没有已有战报，不播回合");
  return null;
}

function stageTake(report: WireBattleReport | null, why: string): FightTake | null {
  if (fightStageId() === null) {
    GameLog.shared.warn("Mainline", why + "，没有关号，不复用已有战报，不播回合");
    return null;
  }
  GameLog.shared.warn("Mainline", why + "，不复用已有战报，改播本场回合");
  return { report, staged: true };
}

function reportHasActions(report: WireBattleReport): boolean {
  return wireBattleActionCount(report) > 0;
}

function waitWireReport(since: number, run: FightRun): Promise<{ report: WireBattleReport | null; stopped: boolean }> {
  return new Promise((resolve) => {
    let settled = false;
    let noted = false;
    let pending: WireBattleReport | null = null;
    let off = (): void => {};
    let cancel = (): void => {};
    const finish = (report: WireBattleReport | null, stopped: boolean): void => {
      if (settled) return;
      settled = true;
      off();
      cancel();
      if (run.wake === abort) run.wake = null;
      resolve({ report, stopped });
    };
    const abort = (): void => finish(null, true);
    off = WireSession.onSync(() => {
      if (WireSession.battleSerial === since) return;
      const match = WireSession.battleMatch;
      const report = match && match.report ? match.report : null;
      if (report && reportHasActions(report)) {
        finish(report, false);
        return;
      }
      pending = report;
      if (noted) return;
      noted = true;
      const rounds = report ? report.rounds.length : 0;
      const attacks = report ? wireBattleActionCount(report) : 0;
      GameLog.shared.info("Mainline", "开战 3001 回到但没有攻击拍 回合 " + rounds + " 攻击拍 " + attacks + "，继续等");
    });
    cancel = armBattleDelay(8000, () => finish(pending, false));
    run.wake = abort;
  });
}

async function playMockReport(page: Node, run: FightRun, live: () => boolean, carried: boolean | null): Promise<void> {
  const stageId = fightStageId();
  if (stageId === null) {
    GameLog.shared.warn("Mainline", "开战没有关号，不播本场回合");
    return;
  }
  const level = fightLevel(stageId);
  const cast = mockBattleCast(stageId);
  const plan = planBattle({
    stageId,
    level,
    roleName: fightRoleName(),
    allies: cast.allies,
    enemies: cast.enemies,
  });
  if (plan.rounds.length === 0) {
    GameLog.shared.warn("Mainline", "开战本场没有回合，不播");
    return;
  }
  const win = carried === true || carried === false ? carried : plan.win;
  const from = carried === true || carried === false ? "来自战报" : "来自本关";
  const title = wireFight() ? "开战本场" : "开战 Mock";
  const first = plan.rounds[0];
  primeHangSides(page, fullUnits(first.allies), fullUnits(first.enemies));
  GameLog.shared.info("Mainline", "开战胜负 " + (win ? "胜利" : "失败") + " " + from);
  GameLog.shared.info("Mainline", title + " 第" + stageId + "关 " + plan.rounds.length + " 回合");
  for (let i = 0; i < plan.rounds.length; i++) {
    if (!live()) return;
    if (run.skip) {
      paintMockRound(page, run, plan.rounds[plan.rounds.length - 1], stageId);
      break;
    }
    paintMockRound(page, run, plan.rounds[i], stageId);
    const last = i === plan.rounds.length - 1;
    await waitBeat(run, battleCastWait(playSpeed(page), last, 8));
    if (!live()) return;
  }
  if (!live()) return;
  finishHangBattle(page, win);
}

async function playWireReport(page: Node, run: FightRun, report: WireBattleReport, live: () => boolean): Promise<void> {
  const stageId = fightStageId();
  if (stageId === null) {
    GameLog.shared.warn("Mainline", "开战战报没有关号，不播回合");
    return;
  }
  const roleId = Session.role ? Session.role.roleId : null;
  const plan = replayFromStore(report, roleId, stageId);
  const present = planBattlePresentation(report, plan);
  const beats = playbackStrikes(plan);
  if (beats.length === 0) {
    GameLog.shared.warn("Mainline", "开战战报没有回合，不播");
    return;
  }
  const cap = battleRoundMax(report.battleType === null ? 1 : report.battleType);
  const total = cap !== null && cap >= 1 ? cap : 15;
  const hpNow: Array<number | null> = [];
  for (let i = 0; i < plan.slots.length; i++) hpNow.push(plan.slots[i].hp);
  let round = 1;
  GameLog.shared.info("Mainline", "开战战报 关" + stageId + " " + beats.length + " 拍");
  for (let i = 0; i < beats.length; i++) {
    if (!live()) return;
    const index = run.skip ? beats.length - 1 : i;
    const beat = beats[index];
    const parsed = battleRoundNumber(beat.line);
    if (parsed !== null) round = parsed;
    const presentBeat = index >= 0 && index < present.beats.length ? present.beats[index] : null;
    const skillId = presentBeat ? presentBeat.skillId : null;
    paintWireBeat(page, run, plan, beat, presentBeat, hpNow, round, total);
    if (run.skip || index === beats.length - 1) break;
    const frames = battleCastFrameCount(skillId);
    const extra = skillId === null ? 0 : skillCastDelay(skillId);
    await waitBeat(run, battleCastWait(playSpeed(page), false, frames, extra));
    if (!live()) return;
    if (round < total) round += 1;
  }
  if (!live()) return;
  finishHangBattle(page, verdictFromReport(plan.win, stageId));
}

/** 战报已经判出胜负就用它。没有就按本关 planBattle 写成胜或负，不把 null 送进结算。 */
function verdictFromReport(win: boolean | null, stageId: number): boolean {
  if (win === true || win === false) {
    GameLog.shared.info("Mainline", "开战胜负 " + (win ? "胜利" : "失败") + " 来自战报");
    return win;
  }
  const plan = planBattle({
    stageId,
    level: fightLevel(stageId),
    roleName: fightRoleName(),
  });
  GameLog.shared.warn("Mainline", "开战战报没有胜负，按本关写成" + (plan.win ? "胜利" : "失败") + "，不留胜负未带");
  return plan.win;
}

/** 一拍都没有攻击时补一拍，并在有血量时让守方掉一截，飘字才有数。不改战报原件。 */
function playbackStrikes(plan: WireSpineReplay): WireSpineBeat[] {
  const beats = plan.beats.map(copyBeat);
  if (!hasStrike(beats)) {
    const cues = beats.length > 0 ? beats[beats.length - 1].cues.map((cue) => ({ slot: cue.slot, clip: cue.clip })) : [];
    let ally = -1;
    let enemy = -1;
    for (let i = 0; i < plan.slots.length; i++) {
      if (ally < 0 && plan.slots[i].side === "ally") ally = i;
      if (enemy < 0 && plan.slots[i].side === "enemy") enemy = i;
    }
    if (ally >= 0) setCue(cues, ally, "attack");
    if (enemy >= 0) setCue(cues, enemy, "hit");
    const hp: Array<number | null> = [];
    for (let i = 0; i < plan.slots.length; i++) hp.push(null);
    beats.push({ line: "回合 1 · 攻击", cues, hp, vfx: [] });
    GameLog.shared.info("Mainline", "开战战报没有攻击拍，补一拍攻击");
  }
  if (!hasHpChange(plan, beats)) punchEnemy(plan, beats);
  return beats;
}

function copyBeat(beat: WireSpineBeat): WireSpineBeat {
  const cues = [];
  for (let i = 0; i < beat.cues.length; i++) cues.push({ slot: beat.cues[i].slot, clip: beat.cues[i].clip });
  const vfx = [];
  for (let i = 0; i < beat.vfx.length; i++) {
    vfx.push({ stem: beat.vfx[i].stem, anchor: beat.vfx[i].anchor, role: beat.vfx[i].role });
  }
  return { line: beat.line, cues, hp: beat.hp.slice(), vfx };
}

function hasStrike(beats: WireSpineBeat[]): boolean {
  for (let i = 0; i < beats.length; i++) {
    const cues = beats[i].cues;
    for (let c = 0; c < cues.length; c++) {
      if (cues[c].clip === "attack" || cues[c].clip === "hit") return true;
    }
  }
  return false;
}

function hasHpChange(plan: WireSpineReplay, beats: WireSpineBeat[]): boolean {
  const hp: Array<number | null> = [];
  for (let i = 0; i < plan.slots.length; i++) hp.push(plan.slots[i].hp);
  for (let b = 0; b < beats.length; b++) {
    const next = beats[b].hp;
    for (let i = 0; i < next.length && i < hp.length; i++) {
      if (next[i] === null || hp[i] === null) continue;
      if (next[i] !== hp[i]) return true;
    }
    for (let i = 0; i < next.length && i < hp.length; i++) {
      if (next[i] !== null) hp[i] = next[i];
    }
  }
  return false;
}

function punchEnemy(plan: WireSpineReplay, beats: WireSpineBeat[]): void {
  let beat: WireSpineBeat | null = null;
  for (let i = beats.length - 1; i >= 0; i--) {
    const cues = beats[i].cues;
    for (let c = 0; c < cues.length; c++) {
      if (cues[c].clip === "attack" || cues[c].clip === "hit") beat = beats[i];
    }
    if (beat) break;
  }
  if (!beat) return;
  for (let i = 0; i < plan.slots.length; i++) {
    if (plan.slots[i].side !== "enemy") continue;
    const hp = plan.slots[i].hp;
    if (typeof hp !== "number" || !isFinite(hp) || hp <= 1) continue;
    beat.hp[i] = Math.max(1, Math.floor(hp * 0.72));
    return;
  }
  GameLog.shared.info("Mainline", "开战战报没有可减的血量，这一拍不写飘字");
}

function setCue(cues: WireSpineBeat["cues"], slot: number, clip: WireSpineBeat["cues"][number]["clip"]): void {
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].slot !== slot) continue;
    cues[i] = { slot, clip };
    return;
  }
  cues.push({ slot, clip });
}

function paintMockRound(page: Node, run: FightRun, round: BattleRound, stageId: number): void {
  const hold = holds.get(page);
  const actor = round.actor === "enemy" ? "enemy" : round.actor === "ally" ? "ally" : null;
  if (actor) {
    const defender = actor === "ally" ? "enemy" : "ally";
    const prev = defender === "enemy" ? (hold ? hold.enemies : null) : hold ? hold.allies : null;
    const next = defender === "enemy" ? round.enemies : round.allies;
    playSideClip(page, run, actor, 0, "attack");
    playSideClip(page, run, defender, damagedIndex(prev, next), "hit");
    const spot = hangStandPoint(defender, damagedIndex(prev, next));
    playStrikeVfx(page, run, spot.x, spot.y, stemAt(page, actor, 0), null);
  }
  showMockRound(page, round, stageId);
  noteRound(page, round.round + "/15", true);
}

function paintWireBeat(
  page: Node,
  run: FightRun,
  plan: WireSpineReplay,
  beat: WireSpineBeat,
  presentBeat: { skillName: string | null; skillId: number | null; floats: { anchor: number | null; hurt: number; crit: boolean }[] } | null,
  hpNow: Array<number | null>,
  round: number,
  total: number
): void {
  const prev = hpNow.slice();
  for (let i = 0; i < beat.hp.length && i < hpNow.length; i++) {
    if (beat.hp[i] !== null) hpNow[i] = beat.hp[i];
  }
  const clips: string[] = [];
  let struck = false;
  let attacker = 0;
  let attackSide: "ally" | "enemy" = "ally";
  let hitAt = 0;
  let hitSide: "ally" | "enemy" = "enemy";
  for (let i = 0; i < beat.cues.length; i++) {
    const cue = beat.cues[i];
    clips.push(cue.clip);
    const where = sideOrdinal(plan, cue.slot);
    if (!where) continue;
    if (cue.clip === "attack" || cue.clip === "hit" || cue.clip === "die") {
      playSideClip(page, run, where.side, where.index, cue.clip === "die" ? "die" : cue.clip);
      struck = true;
    }
    if (cue.clip === "attack") {
      attacker = where.index;
      attackSide = where.side;
    }
    if (cue.clip === "hit" || cue.clip === "die") {
      hitSide = where.side;
      hitAt = where.index;
    }
  }
  if (struck) {
    const spot = hangStandPoint(hitSide, hitAt);
    const skillId = presentBeat ? presentBeat.skillId : null;
    playStrikeVfx(page, run, spot.x, spot.y, stemAt(page, attackSide, attacker), skillId);
  }
  let skill = presentBeat ? presentBeat.skillName : null;
  skill = fallbackAttackTitle(skill, beat.line, clips);
  let rows = signedHpDeltas(prev, hpNow);
  if (presentBeat && presentBeat.floats.length > 0) rows = signedHitFloats(presentBeat.floats);
  const floats: HangFloat[] = [];
  for (let i = 0; i < rows.length && floats.length < 6; i++) {
    const hurt = rows[i].hurt;
    if (typeof hurt !== "number" || !isFinite(hurt) || hurt === 0) continue;
    const anchor = rows[i].anchor;
    if (anchor === null) continue;
    const where = sideOrdinal(plan, anchor);
    if (!where) continue;
    const at = hangFloatOrigin(where.side, where.index);
    const heal = hurt > 0;
    floats.push({
      text: heal ? "+" + String(hurt) : String(hurt),
      x: at.x,
      y: at.y,
      heal,
      crit: rows[i].crit === true,
    });
  }
  const allies: { hp: number; maxHp: number }[] = [];
  const enemies: { hp: number; maxHp: number }[] = [];
  for (let i = 0; i < plan.slots.length; i++) {
    const slot = plan.slots[i];
    const hp = hpNow[i];
    if (hp === null || typeof slot.maxHp !== "number" || !isFinite(slot.maxHp) || slot.maxHp <= 0) continue;
    const row = { hp, maxHp: slot.maxHp };
    if (slot.side === "ally") allies.push(row);
    else if (slot.side === "enemy") enemies.push(row);
  }
  const bars = barsFromSides(allies, enemies, round >= 1 ? Math.min(1, round / total) : 0);
  if (struck && !skill) GameLog.shared.warn("Mainline", "开战这一拍没有技能名 " + round + "/" + total);
  if (struck && bars.length === 0) GameLog.shared.warn("Mainline", "开战这一拍没有血条 " + round + "/" + total);
  if (struck && floats.length === 0) GameLog.shared.warn("Mainline", "开战这一拍没有飘字 " + round + "/" + total);
  showHangStrike(page, round, total, skill, floats, bars);
  noteRound(page, round + "/" + total, struck);
}

function sideOrdinal(plan: WireSpineReplay, slot: number): { side: "ally" | "enemy"; index: number } | null {
  if (slot < 0 || slot >= plan.slots.length) return null;
  const side = plan.slots[slot].side;
  if (side !== "ally" && side !== "enemy") return null;
  let index = 0;
  for (let i = 0; i < slot; i++) if (plan.slots[i].side === side) index += 1;
  return { side, index };
}

function noteRound(page: Node, label: string, struck: boolean): void {
  const layer = layerOf(page);
  if (!layer) {
    GameLog.shared.warn("Mainline", "开战回合没有 HangBattle，不播 " + label);
    return;
  }
  const skill = layer.getChildByName("HangSkill");
  const bars = layer.getChildByName("HangBars");
  const floats = layer.getChildByName("HangFloats");
  const skillOn = !!(skill && skill.active);
  const barN = bars ? bars.children.length : 0;
  const floatN = floats ? floats.children.length : 0;
  GameLog.shared.info("Mainline", "开战回合 " + label + " 技能" + (skillOn ? "开" : "关") + " 血条 " + barN + " 飘字 " + floatN);
  if (!struck) return;
  if (!skillOn) GameLog.shared.warn("Mainline", "开战回合没有技能名 " + label);
  if (barN === 0) GameLog.shared.warn("Mainline", "开战回合没有血条 " + label);
  if (floatN === 0) GameLog.shared.warn("Mainline", "开战回合没有飘字 " + label);
}

function playSideClip(page: Node, run: FightRun, side: "ally" | "enemy", index: number, clip: "attack" | "hit" | "die"): void {
  const host = sideHost(page, side);
  const slot = host && index >= 0 && index < host.children.length ? host.children[index] : null;
  if (!slot) {
    if (!run.modelMiss) {
      run.modelMiss = true;
      const which = side === "ally" ? "我方" : "敌方";
      GameLog.shared.warn("Mainline", "开战攻击没有" + which + "模型，不播动作，仍写技能和血条");
    }
    return;
  }
  const stem = stemOf(slot) || side;
  playLater(run, slot, clip, stem);
}

function playLater(run: FightRun, node: Node, clip: string, stem: string): void {
  const stamp = node as Node & { mxzgClipToken?: number };
  const token = (stamp.mxzgClipToken || 0) + 1;
  stamp.mxzgClipToken = token;
  const attempt = (left: number): void => {
    if (!node.isValid || stamp.mxzgClipToken !== token) return;
    const skel = findSkeleton(node);
    if (skel && playClip(skel, clip)) return;
    if (left <= 0) {
      if (run.gestureMiss) return;
      run.gestureMiss = true;
      const why = skel ? "没有动作 " + clip : "骨架还没挂上";
      GameLog.shared.warn("Mainline", "开战攻击没有播上 spine/" + stem + " " + why + "，仍写技能和血条");
      return;
    }
    const timer = setTimeout(() => attempt(left - 1), 160);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
    run.timers.push(timer);
  };
  attempt(6);
}

function findSkeleton(node: Node): sp.Skeleton | null {
  const own = node.getComponent(sp.Skeleton);
  if (own) return own as sp.Skeleton;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findSkeleton(kids[i]);
    if (found) return found;
  }
  return null;
}

function playClip(skel: sp.Skeleton, clip: string): boolean {
  let found = false;
  try {
    found = !!skel.findAnimation(clip);
  } catch (err) {
    return false;
  }
  if (!found && clip !== "attack") {
    try {
      found = !!skel.findAnimation("hit");
      if (found) clip = "hit";
    } catch (err) {
      return false;
    }
  }
  if (!found) return false;
  try {
    skel.setAnimation(0, clip, false);
    return true;
  } catch (err) {
    return false;
  }
}

function playStrikeVfx(page: Node, run: FightRun, x: number, y: number, stem: string | null, skillId: number | null): void {
  const layer = layerOf(page);
  if (!layer) return;
  const stack = hangStrikeFrames(stem, skillId);
  const who = stem || "英雄";
  if (!run.skillNoted) {
    let logged = false;
    if (stack.source !== "report" && typeof skillId === "number" && isFinite(skillId)) {
      GameLog.shared.warn("Mainline", "开战技能号 " + Math.floor(Math.abs(skillId)) + " 没有帧表，改用套 " + who);
      logged = true;
    }
    if (stack.source === "hero-skill") {
      GameLog.shared.warn("Mainline", "开战技能帧没有对上 " + who + "，改播 hero-skill");
      logged = true;
    }
    if (logged) run.skillNoted = true;
  }
  const fx = strikeFx(layer);
  const noteMiss = (ok: boolean): void => {
    if (ok || run.skillMiss) return;
    run.skillMiss = true;
    GameLog.shared.warn("Mainline", "开战技能帧没有挂上 " + who);
  };
  if (stack.skill.length === 0) {
    noteMiss(false);
  } else {
    fx.skill.node.setPosition(x, y + 48, 0);
    fx.skill.play(stack.skill, noteMiss);
  }
  for (let i = 0; i < fx.layers.length; i++) {
    const paths = i < stack.layers.length ? stack.layers[i] : [];
    if (paths.length === 0) {
      fx.layers[i].stop();
      continue;
    }
    fx.layers[i].node.setPosition(x, y + 48, 0);
    fx.layers[i].play(paths, noteMiss);
  }
  if (stack.arrow.length > 0) {
    fx.arrow.node.setPosition(x, y + 56, 0);
    fx.arrow.play(stack.arrow, noteMiss);
  } else {
    fx.arrow.stop();
  }
  if (stack.hit.length === 0) return;
  fx.hit.node.setPosition(x, y + 24, 0);
  fx.hit.play(stack.hit, (ok) => {
    if (ok || run.hitMiss) return;
    run.hitMiss = true;
    GameLog.shared.warn("Mainline", "开战受击帧没有挂上");
  });
}

interface StrikeFx {
  skill: FrameReel;
  layers: FrameReel[];
  arrow: FrameReel;
  hit: FrameReel;
}

function strikeFx(layer: Node): StrikeFx {
  let host = layer.getChildByName("HangStrikeFx");
  if (!host || !host.isValid) {
    host = uiNode("HangStrikeFx");
    place(host, layer, 0, 0);
  }
  const mark = host as Node & { mxzgFx?: StrikeFx };
  if (!mark.mxzgFx) {
    mark.mxzgFx = {
      skill: mountFrameReel(host, 280, "HangSkillReel"),
      layers: [
        mountFrameReel(host, 260, "HangSkillLayer0"),
        mountFrameReel(host, 260, "HangSkillLayer1"),
        mountFrameReel(host, 260, "HangSkillLayer2"),
      ],
      arrow: mountFrameReel(host, 280, "HangSkillArrow"),
      hit: mountFrameReel(host, 200, "HangHitReel"),
    };
  }
  return mark.mxzgFx;
}

function sideHost(page: Node, side: "ally" | "enemy"): Node | null {
  if (side === "enemy") {
    const layer = layerOf(page);
    return layer ? layer.getChildByName("HangFoes") : null;
  }
  const hang = battleHost(page).getChildByName("IdleHang");
  if (!hang) return null;
  return hang.getChildByName("IdleHeroes");
}

function stemAt(page: Node, side: "ally" | "enemy", index: number): string | null {
  const host = sideHost(page, side);
  if (!host || index < 0 || index >= host.children.length) return null;
  return stemOf(host.children[index]);
}

function stemOf(slot: Node): string | null {
  const kids = slot.children;
  for (let i = 0; i < kids.length; i++) {
    const name = kids[i].name;
    if (name.indexOf("spine-") === 0) return name.slice("spine-".length);
  }
  return null;
}

function damagedIndex(prev: BattleUnit[] | null, next: BattleUnit[]): number {
  if (!prev) return 0;
  const n = prev.length < next.length ? prev.length : next.length;
  for (let i = 0; i < n && i < 3; i++) {
    if (prev[i].hp > next[i].hp) return i;
  }
  return 0;
}

function waitBeat(run: FightRun, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let cancel = (): void => {};
    const done = (): void => {
      if (settled) return;
      settled = true;
      cancel();
      if (run.wake === done) run.wake = null;
      resolve();
    };
    cancel = armBattleDelay(ms, done);
    run.wake = done;
  });
}

function playSpeed(page: Node): number {
  const hold = holds.get(page);
  return hold ? hold.speed : 1;
}

function fightStageId(): number | null {
  const chapter = GameStore.chapter();
  return hangFightStageId(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx, wireFight());
}

function fightLevel(stageId: number): number {
  const level = Session.role && Session.role.level >= 1 ? Math.floor(Session.role.level) : 1;
  return level >= stageId ? level : stageId;
}

function fightRoleName(): string {
  const name = Session.role && Session.role.name ? Session.role.name.trim() : "";
  return name || "我方";
}

function primeHangSides(page: Node, allies: BattleUnit[], enemies: BattleUnit[]): void {
  const hold = ensureHold(page);
  hold.allies = allies.map(copyUnit);
  hold.enemies = enemies.map(copyUnit);
}

function fullUnits(units: BattleUnit[]): BattleUnit[] {
  const out: BattleUnit[] = [];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const max = unit.maxHp;
    const hp = typeof max === "number" && isFinite(max) ? max : unit.hp;
    out.push({ name: unit.name, hp, maxHp: max });
  }
  return out;
}

function strikeSkill(round: BattleRound): string | null {
  const named = skillFromLine(round.line);
  if (round.actor !== "ally" && round.actor !== "enemy") return named;
  if (named && (named.indexOf("攻击") >= 0 || named.indexOf("技能") >= 0)) return named;
  return "攻击";
}

/**
 * 把战报的站场和特效抬到挂机壳上，大理石留在下面。
 * 不抬整页 BattlePage，它的森林底会盖住殿堂。也不抬飘字层，挂机条已经在画飘字。
 * 演武英雄先藏起来，避免和战报站位叠两套人。
 */
export function liftHangReplay(page: Node, field: Node | null, vfx: Node | null): void {
  const host = shellOf(page) || page;
  if (!host.isValid) return;
  setIdleCast(host, false);
  const hang = host.getChildByName("IdleHang");
  seatLifted(host, field, hang);
  if (field) seatHangField(field);
  seatLifted(host, vfx, field && field.parent === host ? field : hang);
  const hud = host.getChildByName("HangBattle");
  if (hud && hud.isValid) hud.setSiblingIndex(Math.max(0, host.children.length - 1));
}

/** 拆掉抬上来的站场和特效。战斗 HUD 还在时不把演武英雄放回来。 */
export function dropHangReplay(page: Node): void {
  const host = shellOf(page) || page;
  if (!host.isValid) return;
  const kids = host.children.slice();
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i] as Node & { mxzgLifted?: boolean };
    if (kid.mxzgLifted && kid.isValid) kid.destroy();
  }
  const fighting = holds.has(page) || !!host.getChildByName("HangBattle");
  if (!fighting) setIdleCast(host, true);
}

function ensureHold(page: Node): HangHold {
  let hold = holds.get(page);
  if (!hold) {
    hold = { left: "我方", right: "敌方", speed: 1, seq: 0, allies: null, enemies: null };
    holds.set(page, hold);
    page.once(Node.EventType.NODE_DESTROYED, () => holds.delete(page));
  }
  return hold;
}

function layerOf(page: Node): Node | null {
  const host = battleHost(page);
  const layer = host.getChildByName("HangBattle");
  return layer && layer.isValid ? layer : null;
}

function battleHost(page: Node): Node {
  const shell = shellOf(page);
  if (shell && shell.active) return shell;
  return page;
}

function shellOf(page: Node): Node | null {
  const shell = page.getChildByName("PagePrefabShell");
  return shell && shell.isValid ? shell : null;
}

function seatLifted(host: Node, node: Node | null, after: Node | null): void {
  if (!node || !node.isValid) return;
  const lifted = node as Node & { mxzgLifted?: boolean };
  lifted.mxzgLifted = true;
  if (node.parent !== host) node.parent = host;
  const at = after && after.isValid && after.parent === host ? after.getSiblingIndex() + 1 : 0;
  node.setSiblingIndex(Math.min(at, Math.max(0, host.children.length - 1)));
}

/** 战报格子从森林左右排挪到挂机地砖。和演武同一组点。 */
export function seatHangField(field: Node): void {
  for (let i = 0; i < IDLE_HANG_SPOTS.length; i++) {
    const ally = findNamed(field, "Slot_A" + i);
    const enemy = findNamed(field, "Slot_E" + i);
    const allySpot = hangStandPoint("ally", i);
    const enemySpot = hangStandPoint("enemy", i);
    if (ally) ally.setPosition(allySpot.x, allySpot.y, 0);
    if (enemy) enemy.setPosition(enemySpot.x, enemySpot.y, 0);
  }
}

/** 飘字落在这一侧的地砖站位头顶。 */
export function hangFloatOrigin(side: "ally" | "enemy", index: number): { x: number; y: number } {
  const spot = hangStandPoint(side, index);
  return { x: spot.x, y: spot.y + 108 };
}

function setIdleCast(host: Node, active: boolean): void {
  const hang = host.getChildByName("IdleHang");
  if (!hang || !hang.isValid) return;
  const heroes = hang.getChildByName("IdleHeroes");
  if (heroes) heroes.active = active;
  const foes = hang.getChildByName("IdleFoes");
  if (foes) foes.active = active;
}

let openVfxMiss = false;
let appearMiss = false;
/** ZDKS 图里已经写着「战斗开始」。挂上之后不再另写一层系统字。 */
let titleOnSpine = false;

interface AppearRun {
  stop(): void;
}

const appearRuns = new Map<Node, AppearRun>();

/** 只在有模型的一侧播出场光，光心落在这些人身上。另一侧清掉上一局留下的帧。 */
function playHangAppear(
  layer: Node,
  speed: number,
  allies: ReadonlyArray<{ x: number; y: number }>,
  enemies: ReadonlyArray<{ x: number; y: number }>
): void {
  stopHangAppear(layer);
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  const stops: Array<() => void> = [];
  const step = battleFrameStep(speed);
  const left = hangAppearAnchor(allies);
  const right = hangAppearAnchor(enemies);
  const arm = (name: string, at: { x: number; y: number } | null, side: "left" | "right") => {
    const old = layer.getChildByName(name);
    if (old) old.destroy();
    if (!at) {
      const which = side === "left" ? "左侧" : "右侧";
      GameLog.shared.info("Mainline", "开战出场光跳过" + which + "，这一侧没有模型");
      return;
    }
    const paths = battleAppearFramePaths(side);
    const reel = mountFrameReel(layer, 240, name);
    reel.node.setPosition(at.x, at.y, 0);
    stops.push(() => reel.stop());
    reel.play(paths, (ok) => {
      if (!ok) noteAppearMiss();
    });
    const timer = setTimeout(() => reel.stop(), paths.length * step + 40);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
    timers.push(timer);
  };
  arm("HangAppearLeft", left, "left");
  arm("HangAppearRight", right, "right");
  const stop = () => {
    for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    for (let i = 0; i < stops.length; i++) stops[i]();
  };
  appearRuns.set(layer, { stop });
  const hooked = layer as Node & { mxzgAppearHook?: boolean };
  if (!hooked.mxzgAppearHook) {
    hooked.mxzgAppearHook = true;
    layer.on(Node.EventType.NODE_DESTROYED, () => {
      const run = appearRuns.get(layer);
      if (!run) return;
      run.stop();
      appearRuns.delete(layer);
    });
  }
}

function stopHangAppear(layer: Node): void {
  const run = appearRuns.get(layer);
  if (!run) return;
  run.stop();
  appearRuns.delete(layer);
}

function noteAppearMiss(): void {
  if (appearMiss) return;
  appearMiss = true;
  GameLog.shared.warn("Mainline", "开战出场帧 battle-appear 没有挂上，仍写战斗开始");
}

function playOpenVfx(layer: Node): void {
  const flash = layer.getChildByName("HangFlash");
  if (flash) flash.active = false;
  titleOnSpine = false;
  let host = layer.getChildByName("HangOpenVfx");
  if (!host || !host.isValid) {
    host = uiNode("HangOpenVfx");
    host.addComponent(UITransform).setContentSize(220, 220);
    place(host, layer, 0, 180);
  }
  mountNamedSpine(host, "ZDKS", "stand", {
    loop: false,
    onReady: () => {
      titleOnSpine = true;
      if (flash && flash.isValid) flash.active = false;
    },
    onFail: () => {
      titleOnSpine = false;
      if (flash && flash.isValid) {
        flash.active = true;
        setText(flash, "战斗开始");
      }
      if (openVfxMiss) return;
      openVfxMiss = true;
      GameLog.shared.warn("Mainline", "开战特效 spine/ZDKS 没有挂上，仍写战斗开始");
    },
  });
}

function paintHangSprite(node: Node, path: string, miss: string): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("Mainline", miss);
        return;
      }
      sprite.spriteFrame = asset;
    });
  } catch (err) {
    GameLog.shared.warn("Mainline", miss);
  }
}

/**
 * 演武暂停时会清掉右侧的怪。这里按战报守方或 chapter.note 再摆上。
 * 关号用进战 idx：max_idx 是 chapterId，打的是下一关。两个 idx 都没有就不造第 1 关。
 * 没有关卡、表是空的、类型没有 stand、spine 路径挂不上时只打日志，不补默认怪。
 * 返回摆上的站位。空数组表示右侧没有模型。
 */
function seatHangEnemies(layer: Node): { x: number; y: number }[] {
  try {
    const old = layer.getChildByName("HangFoes");
    if (old) old.destroy();
    const wire = Session.source === "wire" || GameStore.source === "wire";
    const chapter = GameStore.chapter();
    const stageId = hangFightStageId(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx, wire);
    const rows = stageId === null ? [] : chapterStageEnemies(stageId);
    const monsters: { heroType: number; hp: number | null; name: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      monsters.push({ heroType: rows[i].heroType, hp: rows[i].hp, name: rows[i].name });
    }
    const match = GameStore.battle();
    const report = match && match.report ? match.report.defHeroes : null;
    const line = planHangFightLine(stageId, monsters, (stem) => wireSpineHasClip(stem, "stand"), fightReport(report));
    if (line.foes.length === 0) {
      const stageText = stageId === null ? "关号未同步" : "关" + stageId;
      GameLog.shared.warn("Mainline", "开战敌方没有摆上 " + stageText + " " + line.reason);
      return [];
    }
    const host = uiNode("HangFoes");
    place(host, layer, 0, 0);
    host.setSiblingIndex(0);
    const names: string[] = [];
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < line.foes.length; i++) {
      const foe = line.foes[i];
      names.push(foe.stem);
      const spot = hangStandPoint("enemy", foe.spot);
      points.push({ x: spot.x, y: spot.y });
      const slot = place(uiNode("HangFoe"), host, spot.x, spot.y);
      mountBattleSpine(slot, foe.stem, () => {
        GameLog.shared.warn("Mainline", "开战敌方 spine/" + foe.stem + " 没有挂上");
        if (slot.isValid) slot.active = false;
      }, { face: spot.face, scale: HANG_ACTOR_SCALE });
    }
    const stageText = line.stageId === null ? "—" : String(line.stageId);
    GameLog.shared.info(
      "Mainline",
      "开战敌方 " + line.source + " 关" + stageText + " " + names.join(",") + " spine/" + names.join(",spine/") + " " + line.reason
    );
    return points;
  } catch (err) {
    GameLog.shared.warn("Mainline", "开战敌方没有摆上 " + messageOf(err));
    return [];
  }
}

/** 战报 hero_id 对不上套时，用名册 hero_type。两边都不是套名就留原 id，让后面打日志。 */
function fightReport(
  heroes: { heroId: number | null; hp: number | null; maxHp: number | null }[] | null
): { heroId: number | null; hp: number | null; maxHp: number | null }[] | null {
  if (!heroes) return null;
  const roster = GameStore.heroes();
  const out: { heroId: number | null; hp: number | null; maxHp: number | null }[] = [];
  for (let i = 0; i < heroes.length; i++) {
    const hero = heroes[i];
    out.push({ heroId: spineIdOf(hero.heroId, roster), hp: hero.hp, maxHp: hero.maxHp });
  }
  return out;
}

function spineIdOf(
  heroId: number | null,
  roster: { heroId: number | null; heroType: number | null }[] | null
): number | null {
  if (typeof heroId !== "number" || !isFinite(heroId) || heroId <= 0) return heroId;
  const id = Math.floor(heroId);
  let type: number | null = null;
  if (roster) {
    for (let i = 0; i < roster.length; i++) {
      if (roster[i].heroId === id) {
        type = roster[i].heroType;
        break;
      }
    }
  }
  const stem = hangSpineStem(id, type);
  const parsed = Number(stem);
  if (!isFinite(parsed) || parsed <= 0) return id;
  return Math.floor(parsed);
}

/** 大理石上还站着的我方。含窄屏把整列右移的那段。没有人就空。 */
function allyModelPoints(page: Node): { x: number; y: number }[] {
  const host = battleHost(page);
  const hang = host.getChildByName("IdleHang");
  if (!hang || !hang.isValid) return [];
  const heroes = hang.getChildByName("IdleHeroes");
  if (!heroes) return [];
  const out: { x: number; y: number }[] = [];
  const kids = heroes.children;
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    if (!kid.active) continue;
    out.push({
      x: hang.position.x + heroes.position.x + kid.position.x,
      y: hang.position.y + heroes.position.y + kid.position.y,
    });
  }
  return out;
}

function ensureLayer(page: Node): Node {
  const host = battleHost(page);
  let layer = host.getChildByName("HangBattle");
  if (layer && layer.isValid) {
    layer.setSiblingIndex(Math.max(0, host.children.length - 1));
    return layer;
  }
  layer = uiNode("HangBattle");
  const ui = layer.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  place(layer, host, 0, 0);
  layer.setSiblingIndex(Math.max(0, host.children.length - 1));

  const flash = createLabel("战斗开始", 42, { color: INK, width: 420, height: 64 });
  flash.name = "HangFlash";
  flash.active = false;
  place(flash, layer, 0, 250);

  const roundBg = createRect("HangRoundBg", 160, 36, new Color(16, 18, 28, 180));
  place(roundBg, layer, 0, 560);
  const roundPlate = uiNode("HangRoundPlate");
  const plateUi = roundPlate.addComponent(UITransform);
  plateUi.setContentSize(160, 36);
  const plateSprite = roundPlate.addComponent(Sprite);
  plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(roundPlate, roundBg, 0, 0);
  paintHangSprite(roundPlate, "ui/battle/battle-end_spr-round-bg", "回合牌 battle-end_spr-round-bg 没有挂上，仍用色块");
  const round = createLabel("1/15", 26, { color: INK, width: 110, height: 32 });
  round.name = "HangRound";
  place(round, layer, 0, 560);

  const vs = createLabel("我方  VS  敌方", 20, { color: INK, width: 520, height: 32 });
  vs.name = "HangVs";
  place(vs, layer, 0, 188);

  const skillBg = createRect("HangSkillBg", 280, 40, new Color(28, 16, 48, 200));
  skillBg.name = "HangSkill";
  skillBg.active = false;
  place(skillBg, layer, 0, 150);
  const skill = createLabel("", 26, { color: INK, width: 260, height: 36 });
  skill.name = "HangSkillName";
  place(skill, skillBg, 0, 0);
  armHangSkillFont(skill);

  const bars = uiNode("HangBars");
  place(bars, layer, 0, 0);
  const floats = uiNode("HangFloats");
  place(floats, layer, 0, 0);

  const speed = uiNode("HangSpeed");
  const speedUi = speed.addComponent(UITransform);
  speedUi.setContentSize(73, 78);
  const speedSprite = speed.addComponent(Sprite);
  speedSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(speed, layer, -300, 540);
  paintSpeedIcon(speed, 1);
  if (!speed.getComponent(Button)) speed.addComponent(Button);
  speed.on(Button.EventType.CLICK, () => tapSpeed(page, speed));

  const skip = createLabel("跳过", 22, { color: INK, width: 88, height: 40 });
  skip.name = "HangSkip";
  const skipBg = createRect("HangSkipBg", 74, 76, new Color(46, 110, 190, 230));
  place(skipBg, layer, 300, 540);
  const skipPlate = uiNode("HangSkipPlate");
  const skipUi = skipPlate.addComponent(UITransform);
  skipUi.setContentSize(74, 76);
  const skipSprite = skipPlate.addComponent(Sprite);
  skipSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(skipPlate, skipBg, 0, 0);
  paintHangSprite(skipPlate, "ui/battle/battle-scene_btn-speed-11", "跳过钮 battle-scene_btn-speed-11 没有挂上，仍写跳过");
  place(skip, skipBg, 0, 0);
  if (!skipBg.getComponent(Button)) skipBg.addComponent(Button);
  skipBg.on(Button.EventType.CLICK, () => tapSkip(page));
  return layer;
}

function tapSpeed(page: Node, node: Node): void {
  const fn = speedFns.get(page);
  if (fn) {
    fn();
    return;
  }
  const hold = ensureHold(page);
  hold.speed = hold.speed === 1 ? 2 : hold.speed === 2 ? 3 : 1;
  paintSpeedIcon(node, hold.speed);
}

function tapSkip(page: Node): void {
  const fn = skipFns.get(page);
  if (fn) fn();
}

const HANG_SKILL_FONT = "font/FZCSJW-GB1-0";
let hangSkillFont: TTFFont | null = null;

/** 技能名用战斗壳同一套方正字。加载失败留着系统字，并打一次日志。 */
function armHangSkillFont(node: Node): void {
  const label = node.getComponent(Label);
  if (!label) return;
  if (hangSkillFont) {
    label.useSystemFont = false;
    label.font = hangSkillFont;
    return;
  }
  resources.load(HANG_SKILL_FONT, TTFFont, (err, font) => {
    if (!node.isValid) return;
    if (err || !font) {
      GameLog.shared.warn("Mainline", "技能名字体 FZCSJW 没有挂上，仍用系统字");
      return;
    }
    hangSkillFont = font;
    label.useSystemFont = false;
    label.font = font;
  });
}

function setBanner(banner: Node, text: string | null): void {
  banner.active = !!text;
  const kids = banner.children;
  for (let i = 0; i < kids.length; i++) {
    if (text) setText(kids[i], text);
  }
}

/** 站着几个人就留几根。没站人时仍按这一拍的单位画，检查环境没有模型也不至于 0 根。 */
function fitBars(page: Node, layer: Node, bars: HangBar[]): HangBar[] {
  const allyPts = allyModelPoints(page);
  const enemyPts = foeModelPoints(layer);
  if (allyPts.length === 0 && enemyPts.length === 0) return bars;
  const out: HangBar[] = [];
  let ally = 0;
  let enemy = 0;
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar.ally) {
      if (allyPts.length === 0) {
        out.push(bar);
        continue;
      }
      if (ally >= allyPts.length) continue;
      out.push(moveBar(bar, allyPts[ally]));
      ally += 1;
      continue;
    }
    if (enemyPts.length === 0) {
      out.push(bar);
      continue;
    }
    if (enemy >= enemyPts.length) continue;
    out.push(moveBar(bar, enemyPts[enemy]));
    enemy += 1;
  }
  while (ally < allyPts.length) {
    out.push(fullBar(allyPts[ally], true, bars));
    ally += 1;
  }
  while (enemy < enemyPts.length) {
    out.push(fullBar(enemyPts[enemy], false, bars));
    enemy += 1;
  }
  return out;
}

function moveBar(bar: HangBar, at: { x: number; y: number }): HangBar {
  return { x: at.x, y: at.y + 108, hpRatio: bar.hpRatio, rageRatio: bar.rageRatio, ally: bar.ally };
}

function fullBar(at: { x: number; y: number }, ally: boolean, bars: HangBar[]): HangBar {
  let rage = 0;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].ally === ally) {
      rage = bars[i].rageRatio;
      break;
    }
  }
  return { x: at.x, y: at.y + 108, hpRatio: 1, rageRatio: rage, ally };
}

function foeModelPoints(layer: Node): { x: number; y: number }[] {
  const host = layer.getChildByName("HangFoes");
  if (!host) return [];
  const out: { x: number; y: number }[] = [];
  const kids = host.children;
  for (let i = 0; i < kids.length; i++) {
    if (!kids[i].active) continue;
    out.push({ x: kids[i].position.x, y: kids[i].position.y });
  }
  return out;
}

function paintBars(layer: Node, bars: HangBar[]): void {
  const host = layer.getChildByName("HangBars");
  if (!host) return;
  const old = host.children.slice();
  for (let i = 0; i < old.length; i++) {
    old[i].removeFromParent();
    old[i].destroy();
  }
  for (let i = 0; i < bars.length; i++) {
    const row = bars[i];
    const root = uiNode("HangBar");
    place(root, host, row.x, row.y);
    place(createRect("hpBg", BAR_W, 8, new Color(20, 16, 16, 220)), root, 0, 8);
    const hp = Math.min(1, Math.max(0, row.hpRatio));
    if (hp > 0) {
      const width = BAR_W * hp;
      place(
        createRect("hp", width, 8, row.ally ? new Color(72, 210, 96, 255) : new Color(220, 64, 56, 255)),
        root,
        -BAR_W / 2 + width / 2,
        8
      );
    }
    place(createRect("rageBg", BAR_W, 6, new Color(16, 20, 36, 220)), root, 0, -2);
    const rage = Math.min(1, Math.max(0, row.rageRatio));
    if (rage > 0) {
      const width = BAR_W * rage;
      place(createRect("rage", width, 6, new Color(72, 156, 255, 255)), root, -BAR_W / 2 + width / 2, -2);
    }
  }
}

function pushBars(
  out: HangBar[],
  units: { hp: number; maxHp: number }[],
  spots: ReadonlyArray<{ x: number; y: number }>,
  ally: boolean,
  rageRatio: number
): void {
  const n = units.length < spots.length ? units.length : spots.length;
  for (let i = 0; i < n; i++) {
    const max = units[i].maxHp;
    const hp = units[i].hp;
    if (typeof max !== "number" || !isFinite(max) || max <= 0) continue;
    if (typeof hp !== "number" || !isFinite(hp)) continue;
    out.push({
      x: spots[i].x,
      y: spots[i].y + 108,
      hpRatio: hp <= 0 ? 0 : hp >= max ? 1 : hp / max,
      rageRatio,
      ally,
    });
  }
}

function setTalk(page: Node, visible: boolean): void {
  const host = battleHost(page);
  const hang = host.getChildByName("IdleHang");
  if (!hang) return;
  const kids = hang.children;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].name === "IdleTalk") kids[i].active = visible;
  }
}

function paintVs(layer: Node, hold: HangHold): void {
  const vs = layer.getChildByName("HangVs");
  if (vs) setText(vs, hold.left + "  VS  " + hold.right);
}

function setCaption(page: Node, text: string): void {
  const shell = page.getChildByName("PagePrefabShell");
  const root = shell && shell.isValid ? shell : page;
  const button = findNamed(root, "btn_battle");
  if (!button) return;
  eachLabel(button, (label) => {
    label.string = text;
    if (label.fontSize > 28) label.fontSize = 22;
    label.overflow = Overflow.SHRINK;
  });
}

function pushSide(
  out: HangFloat[],
  prev: BattleUnit[] | null,
  next: BattleUnit[],
  side: "ally" | "enemy",
  crit: boolean
): void {
  if (!prev) return;
  const n = prev.length < next.length ? prev.length : next.length;
  for (let i = 0; i < n && i < 3; i++) {
    const delta = prev[i].hp - next[i].hp;
    if (!isFinite(delta) || delta === 0) continue;
    const heal = delta < 0;
    const amount = heal ? -delta : delta;
    const at = hangFloatOrigin(side, i);
    out.push({
      text: (heal ? "+" : "-") + String(amount),
      x: at.x,
      y: at.y,
      heal,
      crit: crit && !heal,
    });
  }
}

function copyUnit(unit: BattleUnit): BattleUnit {
  return { name: unit.name, hp: unit.hp, maxHp: unit.maxHp };
}

function skillFromLine(line: string): string | null {
  const parts = line.split("·");
  if (parts.length < 2) return line.indexOf("攻击") >= 0 ? "攻击" : null;
  const name = parts[parts.length - 1].trim();
  return name || null;
}

function findNamed(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findNamed(kids[i], name);
    if (found) return found;
  }
  return null;
}

function eachLabel(node: Node, fn: (label: Label) => void): void {
  const label = node.getComponent(Label);
  if (label) fn(label);
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) eachLabel(kids[i], fn);
}
