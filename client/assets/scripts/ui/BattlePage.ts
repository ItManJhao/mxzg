/**
 * 绑定 BattlePage.prefab。节点名对齐 docs/battle-prefab-layout.md。
 * 路径相对 assets：prefabs/ui/battle/BattlePage。Prefab 本身不走 resources.load。
 * 战斗场景底是 ui/maps/map-bg-mission-1。battle-scene_spr-bg-1 是 112×64 边角，不能当全屏底。
 * 不挂脚本组件，不改 Prefab。USE_BATTLE_PREFAB 为 false，或加载 / 绑节点失败时，调用方仍走代码 UI。
 * 飘字写 LayerFloat/FloatDmg_0..3 和 FloatCrit，技能名写 SkillNameBanner，前排头顶写 HeadAnchor。
 * 这些节点必须已经在 Prefab 上。缺一个就整页退回代码 UI，不另建同名节点。
 * 不发协议。WireBattlePage 没有站位和特效挂点，这一刀不挂它。
 */
import { Color, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import {
  BATTLE_PREFAB_PATH,
  battleHpPath,
  battlePrefabRequiredPaths,
  battleSkillLabelPath,
  battleSlotPath,
  battleVfxPath,
  BattleSlotSide,
  BattleVfxRole,
  HP_FILL_HEIGHT,
  hpFillLayout,
  vfxLocal,
} from "./battlePrefabLayout";
import { BattlePresentMount, bindBattlePresent } from "./battlePresentView";
import { bindClick, loadPrefab, requireNode, spawnPrefab } from "./prefabLoad";
import { setText } from "./UiKit";

export { BATTLE_PREFAB_PATH };

/**
 * 真服进战默认挂 BattlePage。和登录、主城壳一样默认开。
 * 改成 false 再预览，就回到 WireMainlinePage 里代码搭的战斗页。不要改 Boot。
 */
export const USE_BATTLE_PREFAB = true;

/**
 * 全屏战场底，和 Prefab Bg 同一张。648×1152，拉到 720×1280。
 * battle-scene_spr-bg-1 只有约 112×64，不能铺满页面。
 */
export const BATTLE_SCENE_BG_PATHS = [
  "ui/maps/map-bg-mission-1",
];

/** 代码战斗页没有 Prefab 底时用的沙地。已在 resources。 */
export const BATTLE_SCENE_BG_FALLBACK = "ui/maps/map-bg-crusade-group-boss";

/**
 * map-bg-mission-1 下半是黑的。放大并下移，让石板盖住站位，黑边落到画面外。
 * 回合和倍速从顶栏挪到主城条下面。
 */
export function seatBattleField(root: Node): void {
  const bg = root.name === "Bg" ? root : root.getChildByName("Bg");
  if (bg) {
    bg.setScale(1.85, 1.85, 1);
    bg.setPosition(0, -280, 0);
  }
  const top = findNamed(root, "TopBar");
  if (top) top.setPosition(0, 420, 0);
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

export function paintBattleScene(root: Node): void {
  seatBattleField(root);
  const bg = root.name === "Bg" ? root : root.getChildByName("Bg");
  if (!bg) return;
  void loadFirstFrame(BATTLE_SCENE_BG_PATHS).then((frame) => {
    if (!frame || !bg.isValid) return;
    applyFrame(bg, frame);
  });
}

/** 代码页同步铺一张底，再尝试战斗场景图，没有就用沙地。后加的子节点盖在上面。 */
export function mountBattleBackdrop(parent: Node): Node {
  const bg = new Node("Bg");
  bg.layer = parent.layer;
  const ui = bg.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  bg.addComponent(Sprite);
  bg.setPosition(0, 0, 0);
  bg.parent = parent;
  bg.setSiblingIndex(0);
  const paths = BATTLE_SCENE_BG_PATHS.concat([BATTLE_SCENE_BG_FALLBACK]);
  void loadFirstFrame(paths).then((frame) => {
    if (!frame || !bg.isValid) return;
    applyFrame(bg, frame);
  });
  return bg;
}

function applyFrame(bg: Node, frame: SpriteFrame): void {
  const sprite = bg.getComponent(Sprite) || bg.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  sprite.spriteFrame = frame;
  sprite.color = Color.WHITE;
}

function loadFirstFrame(paths: string[]): Promise<SpriteFrame | null> {
  const step = (index: number): Promise<SpriteFrame | null> => {
    if (index >= paths.length) return Promise.resolve(null);
    return loadFrame(paths[index]).then((frame) => {
      if (frame) return frame;
      return step(index + 1);
    });
  };
  return step(0);
}

/** 顶栏加速钮。1 / 2 / 3 对 battle-scene_btn-speed-1 / 2 / 3。 */
export const BATTLE_SPEED_ICON = [
  "ui/battle/battle-scene_btn-speed-1",
  "ui/battle/battle-scene_btn-speed-2",
  "ui/battle/battle-scene_btn-speed-3",
];

export function paintSpeedIcon(node: Node, speed: number): void {
  const index = speed === 2 ? 1 : speed === 3 ? 2 : 0;
  void loadFrame(BATTLE_SPEED_ICON[index]).then((frame) => {
    if (!frame || !node.isValid) return;
    const sprite = node.getComponent(Sprite);
    if (!sprite) return;
    sprite.spriteFrame = frame;
  });
}

function loadFrame(path: string): Promise<SpriteFrame | null> {
  return new Promise((resolve) => {
    try {
      resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (err || !asset) {
          resolve(null);
          return;
        }
        resolve(asset);
      });
    } catch (err) {
      resolve(null);
    }
  });
}

export interface BattlePrefabShell {
  root: Node;
  roundLabel: Node;
  logLabel: Node;
  layerField: Node;
  slot(side: BattleSlotSide, index: number): Node;
  hpLabel(side: BattleSlotSide, index: number): Node | null;
  setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void;
  clearSkillLabels(): void;
  setSkillLabel(index: number, text: string): void;
  vfxAnchor(role: BattleVfxRole): Node;
  placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void;
  bindSkip(fn: () => void): void;
  bindRetreat(fn: () => void): void;
  bindClose(fn: () => void): void;
  /** 大伤害数字和中场技能名。等级、buff 挂在站位上，不在这里。 */
  present: BattlePresentMount;
}

export async function mountBattlePrefab(parent: Node): Promise<BattlePrefabShell> {
  const prefab = await loadPrefab(BATTLE_PREFAB_PATH);
  if (!parent.isValid) throw new Error("战斗页面已关闭");
  const root = spawnPrefab(prefab, parent);
  try {
    return bindBattlePrefab(root);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

function bindBattlePrefab(root: Node): BattlePrefabShell {
  const paths = battlePrefabRequiredPaths();
  for (let i = 0; i < paths.length; i++) requireNode(root, paths[i]);
  const roundLabel = requireNode(root, "LayerHud/TopBar/RoundLabel");
  const logLabel = requireNode(root, "LayerHud/Log");
  const layerField = requireNode(root, "LayerField");
  const skip = requireNode(root, "LayerHud/BtnSkip");
  const retreat = requireNode(root, "LayerHud/BtnRetreat");
  const close = requireNode(root, "LayerHud/TopBar/BtnClose");
  const vfxSkill = requireNode(root, battleVfxPath("skill"));
  const vfxHit = requireNode(root, battleVfxPath("hit"));
  const vfxScreen = requireNode(root, battleVfxPath("screen"));
  const vfxOf = (role: BattleVfxRole): Node => (role === "skill" ? vfxSkill : role === "hit" ? vfxHit : vfxScreen);

  return {
    root,
    roundLabel,
    logLabel,
    layerField,
    slot(side: BattleSlotSide, index: number): Node {
      const path = battleSlotPath(side, index);
      if (!path) throw new Error("站位超出 Prefab " + side + " " + index);
      return requireNode(root, path);
    },
    hpLabel(side: BattleSlotSide, index: number): Node | null {
      const path = battleHpPath(side, index);
      if (!path) return null;
      return requireNode(root, path + "/Label");
    },
    setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void {
      const path = battleHpPath(side, index);
      if (!path || hp === null || maxHp === null || maxHp <= 0) return;
      paintHpFill(requireNode(root, path + "/Fill"), hp / maxHp);
    },
    clearSkillLabels(): void {
      for (let i = 0; i < 3; i++) setText(requireNode(root, "LayerHud/SkillBars/SkillBar_" + i + "/Label"), "");
    },
    setSkillLabel(index: number, text: string): void {
      const path = battleSkillLabelPath(index);
      if (!path) return;
      setText(requireNode(root, path), text);
    },
    vfxAnchor(role: BattleVfxRole): Node {
      return vfxOf(role);
    },
    placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void {
      const anchor = vfxOf(role);
      if (holder.parent !== anchor) holder.parent = anchor;
      const local = vfxLocal(role, pageX, pageY);
      holder.setPosition(local.x, local.y, 0);
    },
    bindSkip(fn: () => void): void {
      bindClick(skip, fn);
    },
    bindRetreat(fn: () => void): void {
      bindClick(retreat, fn);
    },
    bindClose(fn: () => void): void {
      bindClick(close, fn);
    },
    present: bindBattlePresent(root),
  };
}

function paintHpFill(node: Node, ratio: number): void {
  const ui = node.getComponent(UITransform);
  if (!ui) return;
  const layout = hpFillLayout(ratio);
  node.active = layout.visible;
  if (!layout.visible) return;
  ui.setContentSize(layout.width, HP_FILL_HEIGHT);
  node.setPosition(layout.x, 0, 0);
}
