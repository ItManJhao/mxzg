/**
 * 挂机舞台上的演武。阵容站好之后一直打，不点「战斗」也打。
 * 我方是挂机页铺上的那几只（最多八格，前 4 后 4），整段行军和战斗都留在地砖上，不拆、不重刷。
 * 行军时大家播 run，天和大理石往左循环。遇到怪就改站立，背景停。
 * 怪从右侧滑进格子。滑到位并且骨架出来之后才出刀。受击只打在被打的那只怪上。
 * 怪收掉之后我方接着跑。不把我方当成新刷出来的人。
 * 奇数刀：套名、补 0 或表上的换皮技能对得上帧就叠主套、分套和箭矢；对不上仍是 hero-skill。
 * 飘字只是演出，不写钱包，不发 3001 / 3004 / 3005。
 * 点中间「战斗」进入真战报时暂停，回到挂机再继续。
 */
import { director, Director, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { chapterEnemies } from "../config/gameCatalog";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { WIRE_SPINE_ENEMY_STEMS, WIRE_SPINE_HIT_STEM, wireSpineHasClip, wireSpineVfxClip } from "../net/protocol/wireBattle";
import { hangSkillVfx } from "./battleFrames";
import { mountFrameReel } from "./battleFramePlay";
import { HANG_ACTOR_SCALE, mountBattleSpine, SpineActor } from "./battleSpine";
import { placeHangFloats } from "./hangFloat";
import {
  IDLE_FOE_ENTER_MS,
  IDLE_HALL_SCROLL_PX,
  hangAllyFloorPoint,
  IDLE_MARCH_MS,
  IDLE_SKIRMISH_APPEAR_MS,
  IDLE_SKIRMISH_GAP_MS,
  IDLE_SKIRMISH_KILL_MS,
  IDLE_SKIRMISH_OPEN_MS,
  IDLE_SKIRMISH_SPOTS,
  IDLE_SKIRMISH_STRIKE_MS,
  IDLE_SKY_SCROLL_PX,
  IdleFoePlan,
  idleFoeEnterX,
  idleHangLoopOffset,
  idleSkirmishHurt,
  idleSkirmishKillClip,
  idleSkirmishMayStrike,
  idleSkirmishStageIdx,
  idleSkirmishSwingClip,
  idleSkirmishSwings,
  planIdleWave,
} from "./idleHangSkirmishPlan";
import { place, uiNode } from "./UiKit";
import { DESIGN_WIDTH } from "./safeAreaLayout";
import { assignContentSize, uiSize } from "./visibleFit";

const FOE_LATE_MS = 2600;
const ENTER_STEPS = 8;

export interface IdleSkirmish {
  retarget(actors: SpineActor[]): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

/** New applications supply server-owned encounter templates without legacy stores. */
export interface IdleSkirmishSource { plans(): IdleFoePlan[]; }

interface WaveFoe {
  node: Node;
  actor: SpineActor | null;
  plan: IdleFoePlan;
  entered: boolean;
  ready: boolean;
  hits: number;
  dead: boolean;
}

const controls: { pause(): void; resume(): void }[] = [];

/** 真战报盖上来时停演武。 */
export function pauseIdleSkirmishes(): void {
  for (let i = 0; i < controls.length; i++) controls[i].pause();
}

/** 真战报拆掉之后继续。 */
export function resumeIdleSkirmishes(): void {
  for (let i = 0; i < controls.length; i++) controls[i].resume();
}

/** 挂到 IdleHang 上。英雄换装时 retarget。节点销毁时停。 */
export function mountIdleSkirmish(hang: Node, source?: IdleSkirmishSource): IdleSkirmish {
  const foes = place(uiNode("IdleFoes"), hang, 0, 0);
  const fx = place(uiNode("IdleSkirmishFx"), hang, 0, 0);
  const floats = place(uiNode("IdleSkirmishFloats"), fx, 0, 0);
  const skillReel = mountFrameReel(fx, 280, "IdleSkillReel");
  const hitReel = mountFrameReel(fx, 200, "IdleHitReel");
  const layerReels = [
    mountFrameReel(fx, 260, "IdleSkillLayer0"),
    mountFrameReel(fx, 260, "IdleSkillLayer1"),
    mountFrameReel(fx, 260, "IdleSkillLayer2"),
  ];
  const arrowReel = mountFrameReel(fx, 280, "IdleSkillArrow");
  let actors: SpineActor[] = [];
  let wave = 0;
  let swingCursor = 0;
  let generation = 0;
  let paused = false;
  let stopped = false;
  let waveGen = 0;
  let fightStarted = false;
  let waveFoes: WaveFoe[] = [];
  let puffNode: Node | null = null;
  let puffActor: SpineActor | null = null;
  const standGen = new Map<SpineActor, number>();
  let scrolling = false;
  let scrollMs = 0;
  let haltTick: (() => void) | null = null;
  let notedEntry = false;

  const control = {
    pause(): void {
      if (stopped) return;
      paused = true;
      generation += 1;
      setScrolling(false);
      clearFoes();
      plantAllies();
      standAll();
    },
    resume(): void {
      if (stopped || !paused) return;
      paused = false;
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
    },
  };
  controls.push(control);

  const api: IdleSkirmish = {
    pause: () => control.pause(),
    resume: () => control.resume(),
    retarget(next: SpineActor[]): void {
      actors = next.slice();
      plantAllies();
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      paused = true;
      generation += 1;
      setScrolling(false);
      if (haltTick) haltTick();
      haltTick = null;
      clearFoes();
      const index = controls.indexOf(control);
      if (index >= 0) controls.splice(index, 1);
    },
  };

  hang.once(Node.EventType.NODE_DESTROYED, () => api.stop());
  ensureTick();
  arm(IDLE_SKIRMISH_OPEN_MS, beginCycle);
  return api;

  function ensureTick(): void {
    if (haltTick) return;
    haltTick = armHangTicker((dt) => {
      if (stopped || !hang.isValid) {
        if (haltTick) haltTick();
        haltTick = null;
        return;
      }
      if (!scrolling || !hang.active) return;
      const parent = hang.parent;
      if (parent && !parent.active) return;
      scrollMs += dt;
      applyLoop(scrollMs);
    });
  }

  function setScrolling(on: boolean): void {
    scrolling = on;
    if (!on) return;
    ensureTick();
    applyLoop(scrollMs);
  }

  function arm(ms: number, fn: () => void): void {
    const gen = generation;
    const timer = setTimeout(() => {
      if (gen !== generation || stopped || !hang.isValid) return;
      fn();
    }, ms);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  function blocked(): boolean {
    if (paused || stopped || !hang.isValid || !hang.active) return true;
    const parent = hang.parent;
    if (parent && !parent.active) return true;
    if (!parent) return false;
    const battle = parent.getChildByName("HangBattle");
    return !!(battle && battle.isValid && battle.active);
  }

  function applyHangFace(actor: SpineActor, face: -1 | 1): void {
    const node = actor.node;
    if (!node || !node.isValid) return;
    node.setScale(HANG_ACTOR_SCALE * face, HANG_ACTOR_SCALE, 1);
  }

  function plantAllies(): void {
    for (let i = 0; i < actors.length; i++) {
      const actor = actors[i];
      const home = actor.node.parent as (Node & { mxzgHangPos?: number }) | null;
      if (!home || !home.isValid) continue;
      const spot = typeof home.mxzgHangPos === "number" ? hangAllyFloorPoint(home.mxzgHangPos) : hangAllyFloorPoint(i + 1);
      home.active = true;
      home.setPosition(spot.x, spot.y, 0);
      applyHangFace(actor, spot.face);
    }
  }

  function standAll(): void {
    for (let i = 0; i < actors.length; i++) actors[i].play("stand");
  }

  function playMarch(): void {
    for (let i = 0; i < actors.length; i++) {
      const actor = actors[i];
      if (actor.gesture("run")) continue;
      if (actor.gesture("walk")) continue;
      actor.play("stand");
    }
  }

  function armStand(actor: SpineActor): void {
    const gen = (standGen.get(actor) || 0) + 1;
    standGen.set(actor, gen);
    const timer = setTimeout(() => {
      if (standGen.get(actor) !== gen || stopped) return;
      actor.play("stand");
    }, IDLE_SKIRMISH_STRIKE_MS - 80);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  function stopStrikeFx(): void {
    skillReel.stop();
    hitReel.stop();
    arrowReel.stop();
    for (let i = 0; i < layerReels.length; i++) layerReels[i].stop();
    if (puffNode && puffNode.isValid) puffNode.active = false;
    placeHangFloats(floats, []);
  }

  function clearFoes(): void {
    waveGen += 1;
    fightStarted = false;
    stopStrikeFx();
    for (let i = 0; i < waveFoes.length; i++) {
      const node = waveFoes[i].node;
      if (node && node.isValid) node.destroy();
    }
    waveFoes = [];
  }

  function beginCycle(): void {
    if (blocked()) {
      setScrolling(false);
      clearFoes();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    if (actors.length === 0) {
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    if (!notedEntry) {
      notedEntry = true;
      GameLog.shared.info("Mainline", "开战入口=自动开战 出阵=跳过原因=演武不调用开战");
    }
    plantAllies();
    playMarch();
    setScrolling(true);
    arm(IDLE_MARCH_MS, endMarch);
  }

  function endMarch(): void {
    if (blocked()) {
      setScrolling(false);
      clearFoes();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    setScrolling(false);
    plantAllies();
    standAll();
    openWave();
  }

  function raiseFx(): void {
    if (!fx.isValid) return;
    fx.setSiblingIndex(Math.max(0, hang.children.length - 1));
    const heroes = hang.getChildByName("IdleHeroes");
    if (heroes && foes.isValid) foes.setSiblingIndex(heroes.getSiblingIndex());
  }

  function foeCanFight(foe: WaveFoe): boolean {
    return !foe.dead && foe.entered && foe.ready && !!foe.actor && foe.node.isValid && foe.node.active;
  }

  function openWave(): void {
    if (blocked()) {
      clearFoes();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    if (actors.length === 0) {
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    stopStrikeFx();
    let plans: IdleFoePlan[];
    if (source) plans = source.plans();
    else {
      const chapter = GameStore.chapter();
      const stage = idleSkirmishStageIdx(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx);
      plans = planIdleWave(chapterEnemies(stage), (stem) => wireSpineHasClip(stem, "stand"), WIRE_SPINE_ENEMY_STEMS);
    }
    if (!plans.length) { arm(IDLE_SKIRMISH_GAP_MS, beginCycle); return; }
    const gen = waveGen;
    fightStarted = false;
    waveFoes = [];
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const spot = IDLE_SKIRMISH_SPOTS[plan.spot];
      const node = place(uiNode("IdleFoe"), foes, idleFoeEnterX(spot.x, 0), spot.y);
      const foe: WaveFoe = {
        node,
        actor: null,
        plan,
        entered: false,
        ready: false,
        hits: 0,
        dead: false,
      };
      foe.actor = mountBattleSpine(node, plan.stem, () => {
        if (gen !== waveGen) return;
        GameLog.shared.warn("IdleHang", "foe miss spine/" + plan.stem);
        foe.dead = true;
        if (node.isValid) node.active = false;
        maybeFight(gen);
      }, {
        face: plan.face,
        scale: HANG_ACTOR_SCALE,
        onReady: () => {
          if (gen !== waveGen || !node.isValid || foe.dead) return;
          foe.ready = true;
          node.active = true;
          if (foe.actor) {
            applyHangFace(foe.actor, plan.face);
            foe.actor.play("stand");
          }
          maybeFight(gen);
        },
      });
      waveFoes.push(foe);
    }
    raiseFx();
    slideFoes(0, gen);
    arm(FOE_LATE_MS, () => lateFoes(gen));
  }

  function slideFoes(step: number, gen: number): void {
    if (gen !== waveGen) return;
    const t = step / ENTER_STEPS;
    for (let i = 0; i < waveFoes.length; i++) {
      const foe = waveFoes[i];
      if (foe.dead || !foe.node.isValid) continue;
      const spot = IDLE_SKIRMISH_SPOTS[foe.plan.spot];
      foe.node.setPosition(idleFoeEnterX(spot.x, t), spot.y, 0);
    }
    if (step < ENTER_STEPS) {
      arm(Math.round(IDLE_FOE_ENTER_MS / ENTER_STEPS), () => slideFoes(step + 1, gen));
      return;
    }
    for (let i = 0; i < waveFoes.length; i++) {
      const foe = waveFoes[i];
      if (foe.dead) continue;
      foe.entered = true;
      if (foe.actor) applyHangFace(foe.actor, foe.plan.face);
    }
    maybeFight(gen);
  }

  function maybeFight(gen: number): void {
    if (gen !== waveGen || fightStarted) return;
    let waiting = false;
    let shown = 0;
    for (let i = 0; i < waveFoes.length; i++) {
      const foe = waveFoes[i];
      if (foe.dead) continue;
      if (foeCanFight(foe)) shown += 1;
      else waiting = true;
    }
    if (shown === 0 || waiting) return;
    startFight(gen);
  }

  function lateFoes(gen: number): void {
    if (gen !== waveGen || fightStarted) return;
    const shown: WaveFoe[] = [];
    for (let i = 0; i < waveFoes.length; i++) {
      if (foeCanFight(waveFoes[i])) shown.push(waveFoes[i]);
    }
    if (shown.length === 0) {
      GameLog.shared.warn("IdleHang", "foe late");
      clearFoes();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    for (let i = 0; i < waveFoes.length; i++) {
      const foe = waveFoes[i];
      if (foeCanFight(foe)) continue;
      foe.dead = true;
      if (foe.node.isValid) foe.node.destroy();
    }
    startFight(gen);
  }

  function startFight(gen: number): void {
    if (gen !== waveGen || fightStarted) return;
    fightStarted = true;
    plantAllies();
    standAll();
    arm(IDLE_SKIRMISH_APPEAR_MS, () => strike(gen));
  }

  function livingFoes(): WaveFoe[] {
    const out: WaveFoe[] = [];
    for (let i = 0; i < waveFoes.length; i++) {
      if (foeCanFight(waveFoes[i])) out.push(waveFoes[i]);
    }
    return out;
  }

  function strike(gen: number): void {
    if (gen !== waveGen || blocked()) {
      if (gen === waveGen) {
        clearFoes();
        arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      }
      return;
    }
    const targets = livingFoes();
    if (targets.length === 0) {
      finishWave(gen);
      return;
    }
    const damaged = targets[swingCursor % targets.length];
    const ally = actors.length > 0 ? actors[swingCursor % actors.length] : null;
    swingCursor += 1;
    if (!idleSkirmishMayStrike(foeCanFight(damaged))) {
      GameLog.shared.warn("IdleHang", "skip swing, foe not visible");
      clearFoes();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    const clip = idleSkirmishSwingClip(damaged.hits);
    if (ally) {
      const skilled = clip === "attack2" && ally.gesture("attack2");
      if (!skilled) ally.play("attack");
      armStand(ally);
    }
    const swings = idleSkirmishSwings(actors.length);
    const blow = idleSkirmishHurt(damaged.plan.maxHp, damaged.hits, swings);
    damaged.hits += 1;
    if (damaged.actor && wireSpineHasClip(damaged.plan.stem, "hit")) damaged.actor.play("hit");
    const spot = IDLE_SKIRMISH_SPOTS[damaged.plan.spot];
    placeHangFloats(floats, [{ text: "-" + blow.hurt, x: spot.x, y: spot.y + 108, heal: false }]);
    playSwingFx(clip, spot.x, spot.y, ally ? ally.stem : null);
    puff(spot.x, spot.y + 40);
    raiseFx();
    plantAllies();
    if (blow.kill) {
      damaged.dead = true;
      arm(IDLE_SKIRMISH_STRIKE_MS, () => fellFoe(damaged, gen));
      return;
    }
    arm(IDLE_SKIRMISH_STRIKE_MS, () => strike(gen));
  }

  function fellFoe(damaged: WaveFoe, gen: number): void {
    if (gen !== waveGen) return;
    stopStrikeFx();
    if (damaged.actor && damaged.node.isValid) {
      const clip = idleSkirmishKillClip(damaged.plan.stem, wireSpineHasClip);
      if (clip === "die") damaged.actor.play("die");
    }
    arm(IDLE_SKIRMISH_KILL_MS, () => {
      if (gen !== waveGen) return;
      if (damaged.node.isValid) damaged.node.destroy();
      if (livingFoes().length === 0) finishWave(gen);
      else strike(gen);
    });
  }

  function finishWave(gen: number): void {
    if (gen !== waveGen) return;
    clearFoes();
    wave += 1;
    plantAllies();
    arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
  }

  function playSwingFx(clip: "attack" | "attack2", x: number, y: number, stem: string | null): void {
    const stack = hangSkillVfx(stem, clip === "attack2");
    if (stack.skill.length > 0) {
      skillReel.node.setPosition(x, y + 48, 0);
      skillReel.play(stack.skill, (ok) => {
        if (!ok) GameLog.shared.warn("IdleHang", "skill reel miss " + (stem || "hero-skill"));
      });
    } else {
      skillReel.stop();
    }
    for (let i = 0; i < layerReels.length; i++) {
      const paths = i < stack.layers.length ? stack.layers[i] : [];
      if (paths.length === 0) {
        layerReels[i].stop();
        continue;
      }
      layerReels[i].node.setPosition(x, y + 48, 0);
      layerReels[i].play(paths, (ok) => {
        if (!ok) GameLog.shared.warn("IdleHang", "skill layer miss " + (stem || ""));
      });
    }
    if (stack.arrow.length > 0) {
      arrowReel.node.setPosition(x, y + 56, 0);
      arrowReel.play(stack.arrow, (ok) => {
        if (!ok) GameLog.shared.warn("IdleHang", "skill arrow miss " + (stem || ""));
      });
    } else {
      arrowReel.stop();
    }
    hitReel.node.setPosition(x, y + 24, 0);
    hitReel.play(stack.hit, (ok) => {
      if (!ok) GameLog.shared.warn("IdleHang", "hit reel miss hero-beattack");
    });
  }

  function puff(x: number, y: number): void {
    if (!puffNode || !puffNode.isValid) {
      puffNode = place(uiNode("IdleHit"), fx, x, y);
      const node = puffNode;
      puffActor = mountBattleSpine(node, WIRE_SPINE_HIT_STEM, () => {
        if (node.isValid) node.active = false;
      }, { effect: true });
    }
    puffNode.active = true;
    puffNode.setPosition(x, y, 0);
    if (puffActor) puffActor.burst(wireSpineVfxClip(WIRE_SPINE_HIT_STEM));
  }

  function applyLoop(elapsed: number): void {
    layoutLoop(hang.getChildByName("IdleSky"), elapsed, IDLE_SKY_SCROLL_PX);
    layoutLoop(hang.getChildByName("IdleFloor"), elapsed, IDLE_HALL_SCROLL_PX);
  }
}

function layoutLoop(layer: Node | null, elapsed: number, speed: number): void {
  if (!layer || !layer.isValid) return;
  const width = layerWidth(layer);
  const pair = ensurePair(layer, width);
  const src = layer.getComponent(Sprite);
  const frame = src ? src.spriteFrame : null;
  if (src && frame) {
    copyFrame(pair.a, frame);
    copyFrame(pair.b, frame);
    const painted = pair.a.getComponent(Sprite);
    if (painted && painted.spriteFrame) src.enabled = false;
  }
  const offset = idleHangLoopOffset(elapsed, width, speed);
  pair.a.setPosition(offset, 0, 0);
  pair.b.setPosition(offset + width, 0, 0);
}

function layerWidth(layer: Node): number {
  const size = uiSize(layer.getComponent(UITransform));
  const width = size ? size.width : 0;
  return width >= 2 ? width : DESIGN_WIDTH;
}

function ensurePair(layer: Node, width: number): { a: Node; b: Node } {
  let a = layer.getChildByName("LoopA");
  let b = layer.getChildByName("LoopB");
  if (!a || !a.isValid) a = loopChild(layer, "LoopA");
  if (!b || !b.isValid) b = loopChild(layer, "LoopB");
  sizeLoop(a, layer, width);
  sizeLoop(b, layer, width);
  return { a, b };
}

function loopChild(layer: Node, name: string): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setAnchorPoint(0.5, 0.5);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  return place(node, layer, 0, 0);
}

function sizeLoop(node: Node, layer: Node, width: number): void {
  const ui = node.getComponent(UITransform);
  const parentSize = uiSize(layer.getComponent(UITransform));
  const height = parentSize && parentSize.height > 0 ? parentSize.height : 1280;
  assignContentSize(ui, width, height);
}

function copyFrame(node: Node, frame: SpriteFrame): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite || sprite.spriteFrame === frame) return;
  try {
    sprite.spriteFrame = frame;
  } catch (_err) {
    /* 循环底图尺寸还是空的时，引擎会读 width。下一拍再贴。 */
  }
}

function armHangTicker(onFrame: (dt: number) => void): () => void {
  let dead = false;
  let last = Date.now();
  const tick = (): void => {
    if (dead) return;
    const now = Date.now();
    let step = now - last;
    last = now;
    if (step < 0) step = 0;
    if (step > 50) step = 50;
    onFrame(step);
  };
  const eventName = Director && Director.EVENT_AFTER_UPDATE;
  let armed = false;
  if (eventName && director && typeof director.on === "function") {
    try {
      director.on(eventName, tick);
      armed = true;
    } catch (err) {
      armed = false;
    }
  }
  let raf = 0;
  if (!armed && typeof requestAnimationFrame === "function") {
    const frame = (): void => {
      if (dead) return;
      tick();
      if (!dead) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }
  const timer = armed ? null : setInterval(tick, 32);
  if (timer) {
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }
  return () => {
    dead = true;
    if (armed && director && typeof director.off === "function") director.off(eventName, tick);
    if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
    if (timer) clearInterval(timer);
  };
}
