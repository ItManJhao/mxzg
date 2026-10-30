/**
 * 战斗结算。用已有 BattleEndLayer，不新做恭喜获得，不发 3002。
 * 确定回到挂机。胜利时 btn_report 改成「下一关」。
 * 星用已有星星图：表上没有星级列，胜利画 3 颗，失败不画。
 * 奖励读 chapterreward.first_reward。加载失败返回 null，调用方仍用代码结算。
 */
import { BlockInputEvents, Color, HorizontalTextAlignment, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform, VerticalTextAlignment, view as gameView } from "cc";
import { bindVisibleRefresh, fitVisibleRoot } from "./visibleFit";
import { itemIconResource } from "../config/gameCatalog";
import { chapterClearReward } from "../config/rosterCatalog";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { bindTap, findDescendant, liftNode, mountCcbiView } from "./pagePrefabShell";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const RESULT_WIN = "ui/battle/battle-end-lang_lbl-result-1";
const RESULT_LOSE = "ui/battle/battle-end-lang_lbl-result-0";

export const BATTLE_END_PREFAB = "prefabs/ui/battle/BattleEndLayer";

export interface BattleEndOptions {
  stageId?: number;
  /** 胜利才出现。点了先关结算，再由调用方开下一关。 */
  onNext?: () => void;
  roleLevel?: number;
  rewards?: { itemType: number; num: number; icon: string }[];
  confirmText?: string;
}

/**
 * 盖在战斗页上。胜负换 spr_result 的横幅，不写进最佳萌神的名字格。
 * 「5秒后关闭」藏起来，不自动关。确定回挂机，下一关走 btn_report。
 * 挂机壳在页面最上层时，结算改挂到壳里面，避免被壳挡住。
 */
export async function mountBattleEnd(
  parent: Node,
  win: boolean | null,
  onClose: () => void,
  options?: BattleEndOptions
): Promise<Node | null> {
  try {
    const prefab = await loadPrefab(BATTLE_END_PREFAB);
    if (!parent.isValid) return null;
    const hold = uiNode("BattleEndHold");
    const ui = hold.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    hold.addComponent(BlockInputEvents);
    place(createRect("dim", 720, 1280, new Color(8, 16, 32, 160)), hold, 0, 0);
    const view = spawnPrefab(prefab, hold);
    mountCcbiView(view);
    const headline = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
    paintResultBanner(view, win);
    hideShellText(view, "lbl_hero_name");
    hideShellText(view, "UILabelTTF_1");
    hideShellText(view, "lbl_hero_nums");
    hideShellText(view, "lbl_role_exp_num");
    paintRoleLevel(view, options?.roleLevel);
    const fail = findDescendant(view, "lbl_faild");
    if (fail) {
      if (win === false) {
        fail.active = true;
      } else if (win === null) {
        fail.active = true;
        setText(fail, "胜负未带");
      } else {
        fail.active = false;
      }
    }
    const timer = findDescendant(view, "lbl_time");
    if (timer) timer.active = false;
    paintStars(view, win === true && options?.rewards === undefined);
    paintClearRewards(view, win === true ? options && options.stageId : undefined, options?.rewards);
    const confirm = findDescendant(view, "btn_confirm");
    if (confirm) {
      caption(confirm, options?.confirmText || "回挂机");
      liftNode(confirm, view);
      bindTap(confirm, onClose);
    } else {
      place(createButton("回挂机", onClose, 200, 52), hold, 0, -420);
    }
    const next = findDescendant(view, "btn_report");
    if (next) {
      if (win === true && options && options.onNext) {
        next.active = true;
        caption(next, "下一关");
        liftNode(next, view);
        const go = options.onNext;
        bindTap(next, () => {
          if (hold.isValid) hold.destroy();
          go();
        });
      } else {
        next.active = false;
      }
    }
    const shell = parent.getChildByName("PagePrefabShell");
    const host = shell && shell.isValid && shell.active ? shell : parent;
    hold.parent = host;
    hold.setSiblingIndex(Math.max(0, host.children.length - 1));
    if (options?.rewards !== undefined) bindVisibleRefresh(hold, () => {
      if (hold.isValid && view.isValid) layoutServerResult(hold, view, win === true);
    });
    GameLog.shared.info("Mainline", "BattleEndLayer " + headline);
    return hold;
  } catch (err) {
    GameLog.shared.warn("Mainline", "BattleEndLayer " + messageOf(err));
    return null;
  }
}

/** The basic rules have no MVP, rating or role-level progress calculation.
 * Reuse the result art while showing only the result and awarded server items. */
function layoutServerResult(hold: Node, panel: Node, won: boolean): void {
  fitVisibleRoot(hold);
  const { width, height } = gameView.getVisibleSize();
  hold.getComponent(UITransform)?.setContentSize(width, height);
  const dim = hold.getChildByName("dim");
  dim?.getComponent(UITransform)?.setContentSize(width, height);
  const scale = Math.min(width * 0.9 / 640, height * 0.72 / 730);
  panel.setScale(scale, scale, 1);
  panel.setPosition(-320 * scale, -365 * scale + 35, 0);
  for (const name of ["show_hero", "CCSprite_2", "CCSprite_3", "spr_photo", "spr_photo_bg", "role_exp", "CCScale9Sprite_1"])
    hideShellText(panel, name);
  const move = (name: string, x: number, y: number) => findDescendant(panel, name)?.setPosition(x, y, 0);
  move("spr_bg", 320, 365);
  move("spr_wing", 320, 650);
  move("spr_result", 320, 640);
  move("lbl_role_lv", 320, 505);
  const level = findDescendant(panel, "lbl_role_lv");
  if (level) {
    level.getComponent(UITransform)?.setContentSize(400, 48);
    const label = level.getComponent(Label);
    if (label) { label.horizontalAlign = HorizontalTextAlignment.CENTER; label.fontSize = 28; label.lineHeight = 36; }
  }
  const rewardsTitle = findDescendant(panel, "CCSprite_1");
  if (rewardsTitle) rewardsTitle.active = won;
  move("CCSprite_1", 320, 430);
  move("show_rich", 320, 300);
  move("lbl_faild", 320, 340);
  move("btn_confirm", 320, 90);
}

function paintStars(view: Node, win: boolean): void {
  const old = view.getChildByName("EndStars");
  if (old) old.destroy();
  if (!win) return;
  const host = findDescendant(view, "show_hero") || view;
  const row = uiNode("EndStars");
  place(row, host, 0, -36);
  for (let i = 0; i < 3; i++) {
    const star = uiNode("star");
    const ui = star.addComponent(UITransform);
    ui.setContentSize(28, 28);
    const sprite = star.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(star, row, (i - 1) * 34, 0);
    paintFrame(star, "ui/hero/hero-info_spr-star-1");
  }
}

function paintResultBanner(view: Node, win: boolean | null): void {
  const banner = findDescendant(view, "spr_result");
  if (!banner) return;
  if (win === null) {
    banner.active = false;
    return;
  }
  if (!win) {
    banner.active = true;
    paintFrame(banner, RESULT_LOSE);
    return;
  }
  banner.active = false;
  paintFrame(banner, RESULT_WIN, () => {
    if (banner.isValid) banner.active = true;
  });
}

function paintRoleLevel(view: Node, supplied?: number): void {
  const node = findDescendant(view, "lbl_role_lv");
  if (!node) return;
  const synced = supplied !== undefined || Session.source !== "wire" || Session.wireSync.level;
  const level = supplied !== undefined ? supplied : Session.role ? Session.role.level : 0;
  if (!synced || level < 1) {
    node.active = false;
    return;
  }
  node.active = true;
  setText(node, "Lv " + level);
}

function hideShellText(view: Node, name: string): void {
  const node = findDescendant(view, name);
  if (node) node.active = false;
}

function paintClearRewards(view: Node, stageId: number | undefined, supplied?: { itemType: number; num: number; icon: string }[]): void {
  const stacks = supplied !== undefined ? supplied : typeof stageId === "number" ? chapterClearReward(stageId) : null;
  const host = findDescendant(view, "show_rich") || view;
  const old = host.getChildByName("EndRewards");
  if (old) old.destroy();
  if (!stacks || stacks.length === 0) return;
  const row = uiNode("EndRewards");
  place(row, host, 0, 0);
  const shown = stacks.length < 6 ? stacks.length : 6;
  for (let i = 0; i < shown; i++) {
    const stack = stacks[i];
    const icon = ("icon" in stack && typeof stack.icon === "string" ? stack.icon : itemIconResource(stack.itemType, null)) || "ui/bag/backpack_spr-default";
    const cell = uiNode("reward");
    const ui = cell.addComponent(UITransform);
    ui.setContentSize(64, 64);
    const sprite = cell.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(cell, row, (i - (shown - 1) / 2) * 72, 0);
    paintFrame(cell, icon);
    const count = createLabel(String(stack.num), supplied ? 20 : 14, { color: new Color(255, 248, 220, 255), width: 64, height: supplied ? 28 : 18 });
    const countLabel = count.getComponent(Label);
    if (countLabel) {
      countLabel.overflow = Overflow.SHRINK;
      countLabel.verticalAlign = VerticalTextAlignment.CENTER;
    }
    place(count, cell, 0, supplied ? -48 : -18);
  }
}

function caption(node: Node, text: string): void {
  const parentUi = node.getComponent(UITransform);
  const boxW = parentUi && parentUi.contentSize.width > 8 ? Math.max(8, parentUi.contentSize.width - 8) : 0;
  const boxH = parentUi && parentUi.contentSize.height > 8 ? Math.max(8, parentUi.contentSize.height - 8) : 0;
  let found = false;
  const stack: Node[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop() as Node;
    const label = cur.getComponent(Label);
    if (label) {
      label.string = text;
      label.overflow = Overflow.SHRINK;
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
      label.verticalAlign = VerticalTextAlignment.CENTER;
      const ui = cur.getComponent(UITransform);
      if (ui && boxW > 0 && boxH > 0 && (ui.contentSize.width < 8 || ui.contentSize.height < 8)) {
        ui.setContentSize(boxW, boxH);
      }
      found = true;
    }
    const kids = cur.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
  }
  if (!found) {
    const w = boxW > 0 ? boxW : 120;
    const h = boxH > 0 ? boxH : 28;
    const font = Math.max(12, Math.min(20, Math.floor(Math.min(w, h) * 0.36)));
    const made = createLabel(text, font, { color: new Color(255, 248, 220, 255), width: w, height: h });
    const madeLabel = made.getComponent(Label);
    if (madeLabel) {
      madeLabel.overflow = Overflow.SHRINK;
      madeLabel.verticalAlign = VerticalTextAlignment.CENTER;
    }
    place(made, node, 0, 0);
  }
}

function paintFrame(node: Node, path: string, onReady?: () => void): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (err || !asset || !node.isValid) {
        if (err) GameLog.shared.warn("Mainline", "结算横幅 " + path + " 没有挂上");
        return;
      }
      sprite.spriteFrame = asset;
      if (onReady) onReady();
    });
  } catch (_err) {
    return;
  }
}
