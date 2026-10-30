/**
 * 底栏「战斗」先看到的挂机站场。不是森林 BattlePage。
 * 仓里没有把殿堂、站场英雄和三钮合成一张的挂机 Prefab。
 * 殿堂用 chapter/hang 的 mapXX_B（天）和 mapXX_F（柱、像、大理石地）。
 * 号来自当前关 chapterreward.map。对不上或图没挂上时仍是 map01。
 * 底栏「我要变强 / 战斗 / 快速战斗」仍是 BattlePanelLayer，盖在这块地上。
 * 站场优先 MAIN 阵容：hero_id 经名册 hero_type 对已有皮肤，再走内存里的 spine 升级。
 * 阵容是空的才用三套默认。加载失败把格子藏起来，不写套名。
 * 不给每个站位写「待命」。计时泡只有 Prefab 里那一个，挪到掉落堆上。
 * 掉落堆上方另挂一句 herotalk，不压左列头顶。进真战报时藏起来。
 * main-scene_spr-drop-1 是空的蓝金匾，不拿来当掉落堆。
 * 掉落堆和计时泡抬到金环顶上面，不盖住环，堆心仍在金环中线。
 * 站场按阵位号铺人（前 4 后 4），不是按 0、1、2 往三角表里塞。
 * 一次铺上挂机名单的每一只（最多 8 只），演武不拆它们。点「战斗」才进真战报。
 */
import { Color, HorizontalTextAlignment, Label, Node, Overflow, resources, sp, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from "cc";
import { chapterStageFace } from "../config/rosterCatalog";
import { hangShownStage } from "../features/battle/model/hangFace";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { WireSession } from "../net/WireSession";
import { HANG_ACTOR_SCALE, mountBattleSpine, mountNamedSpine, SpineActor } from "./battleSpine";
import { harvestCollectClip } from "./cityMapLayout";
import { hangLootBubbleY, hangLootIconY, hangLootSpineY, HANG_LOOT_BUBBLE_X } from "./hangChrome";
import { HangCastMember, hangCastForFormation, idleHangCastFrom } from "./idleHangRoster";
import { mountIdleSkirmish } from "./idleHangSkirmish";
import { mountHangTalk } from "./idleHangTalk";
import { hangAllyFloorPoint, hangAllyVisibleShift, hangLinePosition, HANG_CAST_LIMIT, IDLE_HANG_SPOTS } from "./idleHangSkirmishPlan";
import { localLineupIds, onLocalLineup } from "../module/mainline/localLineup";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./safeAreaLayout";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot, uiSize } from "./visibleFit";
import { createRect, place, uiNode } from "./UiKit";

export { IDLE_HANG_SPOTS };

export const IDLE_HANG_SKY = "ui/chapter/hang/map01_B";
export const IDLE_HANG_FLOOR = "ui/chapter/hang/map01_F";

/** 写进自检和说明。森林 BattlePage 不是这张壳。 */
export const IDLE_HANG_MISSING_PREFAB =
  "没有整张挂机 Prefab。殿堂用 chapterreward.map 对应的 chapter/hang/mapXX_B + mapXX_F，对不上仍是 map01。底栏三钮仍是 BattlePanelLayer，不是森林 BattlePage。";

/** 大理石地砖上的默认三格（阵位 1、4、5）。定义在 idleHangSkirmishPlan，和怪的后沿是同一套地平面。 */

/** 当前 3101 / 4001。本局出阵优先。没有 MAIN 英雄时是三套默认，阵位 1、4、5。 */
export function idleHangCast(): HangCastMember[] {
  const localIds = localLineupIds();
  if (localIds.length > 0) {
    const formation = [];
    const n = localIds.length < HANG_CAST_LIMIT ? localIds.length : HANG_CAST_LIMIT;
    const used: number[] = [];
    for (let i = 0; i < n; i++) {
      formation.push({ heroId: localIds[i], position: hangLinePosition(null, i, used) });
    }
    const cast = hangCastForFormation(formation, GameStore.heroes(), HANG_CAST_LIMIT);
    if (cast.length > 0) return cast;
  }
  const roster = GameStore.hangRoster();
  if (roster) return idleHangCastFrom(roster.lineUp, roster.heroes, HANG_CAST_LIMIT);
  const bag = WireSession.heroes;
  return idleHangCastFrom(WireSession.lineUp, bag, HANG_CAST_LIMIT);
}

/** 只要套名。站位看 idleHangCast 的 position。 */
export function idleHangStems(): string[] {
  const cast = idleHangCast();
  const stems: string[] = [];
  for (let i = 0; i < cast.length; i++) stems.push(cast[i].stem);
  return stems;
}

/** 盖在主线壳最底层。BattlePanelLayer 后挂，所以三钮在上面。阵容晚到会换站场。 */
export function mountIdleHang(parent: Node): Node {
  const root = uiNode("IdleHang");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
  place(root, parent, 0, 0);

  place(createRect("IdleFill", DESIGN_WIDTH, DESIGN_HEIGHT, new Color(186, 156, 124, 255)), root, 0, 0);
  const sky = spriteNode("IdleSky", DESIGN_WIDTH, 420);
  place(sky, root, 0, 430);

  const floor = spriteNode("IdleFloor", DESIGN_WIDTH, DESIGN_HEIGHT);
  place(floor, root, 0, 0);
  let hall = "";
  const paintHall = () => {
    if (!root.isValid) return;
    const face = chapterStageFace(hangStageIdx());
    const map = face && face.map ? face.map : "map01";
    if (map === hall) return;
    hall = map;
    paintHallSprite(sky, "ui/chapter/hang/" + map + "_B", IDLE_HANG_SKY);
    paintHallSprite(floor, "ui/chapter/hang/" + map + "_F", IDLE_HANG_FLOOR);
  };
  paintHall();
  const offStage = GameStore.subscribe(() => paintHall());
  root.once(Node.EventType.NODE_DESTROYED, () => offStage());
  // 进度光在挂机底栏 AFK 条上（screenFill），不另贴在屏外。

  const heroes = uiNode("IdleHeroes");
  place(heroes, root, 0, 0);
  mountHangTalk(root);
  const skirmish = mountIdleSkirmish(root);
  let painted = "";
  const paint = () => {
    if (!heroes.isValid) return;
    const cast = idleHangCast();
    const parts: string[] = [];
    for (let i = 0; i < cast.length; i++) parts.push(cast[i].stem + "@" + cast[i].position);
    const key = parts.join(",");
    if (key === painted) return;
    painted = key;
    const kids = heroes.children.slice();
    for (let i = 0; i < kids.length; i++) kids[i].destroy();
    const actors: SpineActor[] = [];
    for (let i = 0; i < cast.length; i++) {
      const spot = hangAllyFloorPoint(cast[i].position);
      const slot = place(uiNode("IdleHero"), heroes, spot.x, spot.y) as Node & { mxzgHangPos?: number };
      slot.mxzgHangPos = cast[i].position;
      actors.push(mountBattleSpine(slot, cast[i].stem, () => {
        if (slot.isValid) slot.active = false;
      }, { face: spot.face, scale: HANG_ACTOR_SCALE }));
    }
    skirmish.retarget(actors);
  };
  paint();
  let off = () => {};
  off = WireSession.onSync(() => {
    paintHall();
    paint();
  });
  const offLocal = onLocalLineup(paint);
  root.once(Node.EventType.NODE_DESTROYED, () => {
    off();
    offLocal();
  });

  return root;
}

/**
 * 挂机壳抵消安全区缩小，铺满可见区域。
 * 窄屏只裁左右，不再把整层缩成上下黑边。宽屏把殿堂底图拉到可见宽。
 */
export function bindHangFill(shell: Node): void {
  const apply = () => {
    if (!shell.isValid) return;
    const box = fitVisibleRoot(shell);
    const hang = shell.getChildByName("IdleHang");
    if (!hang) return;
    const width = box.width > DESIGN_WIDTH ? box.width : DESIGN_WIDTH;
    const height = box.height > DESIGN_HEIGHT ? box.height : DESIGN_HEIGHT;
    resizeNode(hang.getChildByName("IdleFill"), width, height);
    resizeNode(hang.getChildByName("IdleFloor"), width, height);
    const sky = hang.getChildByName("IdleSky");
    if (sky) {
      const ui = sky.getComponent(UITransform);
      const skySize = uiSize(ui);
      const skyH = skySize && skySize.height > 0 ? skySize.height : 420;
      assignContentSize(ui, width, skyH);
    }
    // 窄屏左右被裁。整列右移，列距仍是阵位公式算出来的。
    const heroes = hang.getChildByName("IdleHeroes");
    if (heroes) heroes.setPosition(hangAllyVisibleShift(box.width), 0, 0);
  };
  bindVisibleRefresh(shell, apply);
  const later = setTimeout(apply, 160);
  shell.once(Node.EventType.NODE_DESTROYED, () => clearTimeout(later));
}

function resizeNode(node: Node | null, width: number, height: number): void {
  if (!node) return;
  assignContentSize(node.getComponent(UITransform), width, height);
}

const LOOT_AT: ReadonlyArray<{ x: number; y: number; w: number }> = [
  { x: -88, y: -2, w: 34 },
  { x: -58, y: 18, w: 40 },
  { x: -30, y: -16, w: 32 },
  { x: -4, y: 8, w: 46 },
  { x: 28, y: -12, w: 34 },
  { x: 56, y: 14, w: 36 },
  { x: 82, y: -4, w: 30 },
  { x: -74, y: 28, w: 28 },
  { x: -18, y: 26, w: 36 },
  { x: 40, y: 28, w: 28 },
  { x: 6, y: -4, w: 42 },
  { x: -42, y: -6, w: 38 },
  { x: 64, y: 24, w: 26 },
  { x: -12, y: -8, w: 30 },
];

/**
 * 用已有金币、水晶、宝箱和掉落图标叠一堆。没有图标时不留节点。
 * 不使用 main-scene_spr-drop-1。堆心在金环中线，高度用 hangLootIconY，不跟英雄脚叠在一起。
 */
export function paintIdleLoot(hang: Node, icons: string[]): void {
  const key = icons.join("|");
  const mark = hang as Node & { mxzgLoot?: string };
  const live = hang.getChildByName("IdleLoot");
  if (mark.mxzgLoot === key && live && live.isValid) return;
  mark.mxzgLoot = key;
  if (live) live.destroy();
  const counted = hang as Node & { mxzgLootCount?: number };
  counted.mxzgLootCount = icons.length;
  if (icons.length === 0) {
    paintIdleLootSpine(hang, 0);
    return;
  }
  const pile = uiNode("IdleLoot");
  place(pile, hang, 0, hangLootIconY());
  pile.setScale(1.2, 1.2, 1);
  const n = icons.length < LOOT_AT.length ? icons.length : LOOT_AT.length;
  for (let i = 0; i < n; i++) {
    const spot = LOOT_AT[i];
    const icon = spriteNode("loot", spot.w, spot.w);
    place(icon, pile, spot.x, spot.y);
    paintSprite(icon, icons[i]);
  }
  paintIdleLootSpine(hang, icons.length);
}

/** 掉落数量对应的 normal 档。0 是空堆，1–3 为 1 档，封顶 4。 */
export function idleLootLevel(count: number): number {
  if (!isFinite(count) || count <= 0) return 0;
  return Math.min(4, Math.max(0, Math.ceil(count / 3)));
}

/**
 * 点挂机宝箱时播 res-block 的 collect。
 * 播完回到当前数量的 normal；数量已经是 0 就藏起来。
 * 领取回包刷新掉落时不打断这一下。
 */
export function playIdleHarvest(hang: Node): void {
  const count = (hang as Node & { mxzgLootCount?: number }).mxzgLootCount || 0;
  const host = ensureLootSpine(hang);
  host.active = true;
  const mark = host as Node & { mxzgHarvest?: boolean; mxzgLootClip?: string };
  mark.mxzgHarvest = true;
  const clip = harvestCollectClip(idleLootLevel(count));
  mark.mxzgLootClip = clip;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (!host.isValid || !hang.isValid) return;
    mark.mxzgHarvest = false;
    mark.mxzgLootClip = "";
    const left = (hang as Node & { mxzgLootCount?: number }).mxzgLootCount || 0;
    paintIdleLootSpine(hang, left);
  };
  // collect 大约 2.2 秒。没有播完回调时不要把堆停在收起。
  setTimeout(finish, 2800);
  mountNamedSpine(host, "res-block", clip, { loop: false, onFail: () => {
    noteLootMiss();
    finish();
  }, onComplete: finish });
}

/** res-block：按掉落数量切 normal-0..4，数量为 0 时隐藏。收起过程中不改动作。 */
function paintIdleLootSpine(hang: Node, count: number): void {
  (hang as Node & { mxzgLootCount?: number }).mxzgLootCount = count;
  let host = hang.getChildByName("IdleLootSpine");
  if (host && (host as Node & { mxzgHarvest?: boolean }).mxzgHarvest) return;
  if (count <= 0) {
    if (host && host.isValid) host.active = false;
    return;
  }
  const clip = "normal-" + String(idleLootLevel(count));
  host = ensureLootSpine(hang);
  host.active = true;
  const mark = host as Node & { mxzgLootClip?: string };
  if (mark.mxzgLootClip === clip && host.getComponent(sp.Skeleton)) return;
  mark.mxzgLootClip = clip;
  mountNamedSpine(host, "res-block", clip, { onFail: noteLootMiss });
}

let lootMissLogged = false;

function noteLootMiss(): void {
  if (lootMissLogged) return;
  lootMissLogged = true;
  GameLog.shared.warn("Mainline", "挂机掉落堆 spine/res-block 没有挂上，仍用图标堆");
}

function ensureLootSpine(hang: Node): Node {
  let host = hang.getChildByName("IdleLootSpine");
  if (!host) {
    host = uiNode("IdleLootSpine");
    place(host, hang, 0, hangLootSpineY());
    host.setScale(0.42, 0.42, 1);
  }
  return host;
}

/**
 * Prefab 计时泡的子节点按底板写在 y≈400，会飘到演武场中间。
 * 每次都收回掉落堆上沿。占位「999」不留在场上。
 */
export function seatHangTimer(hang: Node, bubble: Node): void {
  const spr = bubble.getChildByName("spr_bubble");
  const label = bubble.getChildByName("lbl_progress_time2");
  if (bubble.parent !== hang) bubble.parent = hang;
  if (spr) spr.setPosition(0, 4, 0);
  if (label) label.setPosition(0, 10, 0);
  bubble.setPosition(HANG_LOOT_BUBBLE_X, hangLootBubbleY(), 0);
  if (bubble.parent === hang) bubble.setSiblingIndex(Math.max(0, hang.children.length - 1));
}

/** 泡上的字换成时钟。Prefab 的 0×0、占位「999」不留在场上。 */
export function writeHangClock(bubble: Node, text: string): void {
  const labelNode = bubble.getChildByName("lbl_progress_time2");
  const show = text !== "" && text !== "999";
  try {
    bubble.active = show;
  } catch (_err) {
    return;
  }
  if (!labelNode || !show) return;
  labelNode.setScale(1, 1, 1);
  const ui = labelNode.getComponent(UITransform);
  if (ui) {
    ui.setAnchorPoint(0.5, 0.5);
    assignContentSize(ui, 70, 28);
  }
  const label = labelNode.getComponent(Label);
  if (!label) return;
  try {
    label.overflow = Overflow.SHRINK;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.fontSize = 16;
    label.lineHeight = 20;
    label.string = text;
  } catch (_err) {
    /* 字号装配读到空尺寸时这一拍留原字，下一拍再写。 */
  }
}

function spriteNode(name: string, width: number, height: number): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  assignContentSize(ui, width, height);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  return node;
}

function hangStageIdx(): number {
  const shown = hangShownStage();
  return shown === null ? 1 : shown;
}

const hallMiss = new Set<string>();

function paintHallSprite(node: Node, path: string, fallback: string): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  const apply = (frame: string) => {
    try {
      resources.load(frame + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (!node.isValid) return;
        if (err || !asset) {
          if (frame !== fallback && !hallMiss.has(frame)) {
            hallMiss.add(frame);
            GameLog.shared.warn("Mainline", "挂机地图 " + frame + " 没有挂上，仍用 map01");
            apply(fallback);
          }
          return;
        }
        try {
          sprite.spriteFrame = asset;
        } catch (_err) {
          return;
        }
      });
    } catch (_err) {
      return;
    }
  };
  apply(path);
}

function paintSprite(node: Node, path: string): void {
  paintHallSprite(node, path, path);
}
