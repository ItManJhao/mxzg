/**
 * 主线章节地图和通关奖励。
 * 地图是 chapterreward.map 对应的 ui/chapter/mapXX.jpg（640×1280）。
 * 关卡不按 chapter.pos 钉在图上。那一列是阵位。底下列表才是关。
 * 通关奖励用已有 ChapterRewardLayer / ChapterExtraRewardCell / ChapterRewardCell。
 * 领取不发 3011。出战只放当前关，仍由调用方走原来的战斗。
 */
import { Button, Label, Node, resources, ScrollView, Sprite, SpriteFrame, UITransform, Vec2 } from "cc";
import { itemIconResource } from "../config/gameCatalog";
import { chapterExtraRewards, chapterMapStages, chapterStageCaption, chapterStageFace, ChapterExtraFace } from "../config/rosterCatalog";
import { hangShownStage } from "../features/battle/model/hangFace";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import {
  CHAPTER_EXTRA_CELL_H,
  CHAPTER_EXTRA_CELL_W,
  CHAPTER_REWARD_BOX_W,
  chapterMapResource,
  extraRewardProgress,
  extraRewardTipPath,
  fillRewardTip,
  mainlineClearedCount,
} from "./chapterBoardPlan";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { place, setText } from "./UiKit";

const STRIP_W = 600;
const CHIP_W = 88;

const EXTRA_CELL = "prefabs/ui/chapter/ChapterExtraRewardCell";
const REWARD_CELL = "prefabs/ui/chapter/ChapterRewardCell";
const CHAPTER_MAP = "prefabs/ui/chapter/ChapterMapLayer";
const STAGE_CHIP = "prefabs/ui/chapter/ChapterStageChip";
const TEXT_CHIP = "prefabs/ui/common/TextChip";
export const CHAPTER_REWARD_PREFAB = "prefabs/ui/chapter/ChapterRewardLayer";

export function mountChapterMap(
  sheet: Node,
  actions: { onStage: (idx: number) => void; onReward: () => void; onClose: () => void }
): void {
  const live = stageIdx();
  const known = synced();
  const face = known ? chapterStageFace(live) : null;
  const map = chapterMapResource(face ? face.map : "");
  const old = sheet.getChildByName("ChapterMap");
  if (old) old.destroy();
  void loadPrefab(CHAPTER_MAP).then(
    (prefab) => {
      if (!sheet.isValid) return;
      const art = spawnPrefab(prefab, sheet);
      art.name = "ChapterMap";
      art.setPosition(0, 0, 0);
      const image = art.getComponent(Sprite);
      if (image) image.sizeMode = Sprite.SizeMode.CUSTOM;
      if (!map) {
        GameLog.shared.info("Mainline", "这一关没有章节地图，关卡列表仍在");
      } else {
        paintSprite(art, map, "章节地图 " + map + " 没有挂上，关卡列表仍在");
      }
      const caption = mapCaption(live, known, face ? face.name : "");
      const title = art.getChildByName("ChapterMapTitle");
      if (title) setText(title, caption);
      else GameLog.shared.warn("Mainline", "ChapterMap 下没有 ChapterMapTitle");
      const close = art.getChildByName("MapClose");
      if (close) bindTap(close, actions.onClose);
      else GameLog.shared.warn("Mainline", "ChapterMap 下没有 MapClose");
      const reward = art.getChildByName("MapReward");
      if (reward) bindTap(reward, actions.onReward);
      else GameLog.shared.warn("Mainline", "ChapterMap 下没有 MapReward");
      const stages = known ? chapterMapStages(live) : [];
      const strip = art.getChildByName("StageStrip");
      const content = strip ? strip.getChildByName("content") : null;
      const empty = strip ? strip.getChildByName("lbl_empty") : null;
      const scroll = strip ? strip.getComponent(ScrollView) : null;
      if (!strip || !content) {
        GameLog.shared.warn("Mainline", "ChapterMap 下没有 StageStrip/content");
        return;
      }
      clearChildren(content);
      if (stages.length === 0) {
        if (empty) {
          empty.active = true;
          setText(empty, known ? "这一关没有同图关卡" : "主线未同步");
        }
        return;
      }
      if (empty) empty.active = false;
      void loadPrefab(STAGE_CHIP).then(
        (chipPrefab) => {
          if (!content.isValid) return;
          const width = stages.length * CHIP_W;
          const box = content.getComponent(UITransform);
          if (box) box.setContentSize(width, 52);
          let current = 0;
          for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            if (stage.idx === live) current = i;
            const on = stage.idx === live;
            const chip = spawnPrefab(chipPrefab, content);
            chip.name = "stage-" + stage.idx;
            paintSprite(
              chip,
              on ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23",
              "关卡条 " + stage.idx + " 没有挂上"
            );
            const label = chip.getChildByName("lbl_title");
            if (label) setText(label, "第" + stage.missionId + "关");
            place(chip, content, i * CHIP_W + CHIP_W / 2, 0);
            bindTap(chip, () => actions.onStage(stage.idx));
          }
          if (scroll) scrollStrip(scroll, current, width);
          else GameLog.shared.warn("Mainline", "StageStrip 没有 ScrollView");
        },
        () => {
          GameLog.shared.warn("Mainline", "ChapterStageChip 没有挂上");
        }
      );
    },
    (err) => {
      GameLog.shared.warn("Mainline", "ChapterMapLayer 没有挂上 " + messageOf(err));
    }
  );
}

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

/** 通关奖励窗。按钮不发 3011。前往只打开那一关的预览。 */
export function dressChapterRewardBoard(view: Node, onStage: (idx: number) => void): void {
  const box = findNamed(view, "spr_box") || view;
  const board = box.getChildByName("RewardBoard");
  if (!board) {
    GameLog.shared.warn("Mainline", "spr_box 下没有 RewardBoard");
    return;
  }
  const faces = chapterExtraRewards();
  const known = synced();
  const cleared = mainlineClearedCount(known ? stageIdx() : null, known);
  const empty = board.getChildByName("lbl_empty");
  const extra = board.getChildByName("ExtraRow");
  const listHost = board.getChildByName("RewardList");
  const row = extra ? extra.getChildByName("content") : null;
  const list = listHost ? listHost.getChildByName("content") : null;
  if (row) clearChildren(row);
  if (list) clearChildren(list);
  if (faces.length === 0) {
    if (empty) {
      empty.active = true;
      setText(empty, "没有通关奖励表");
    }
    if (extra) extra.active = false;
    if (listHost) listHost.active = false;
    GameLog.shared.info("Mainline", "通关奖励没有 chapterextrareward");
    return;
  }
  if (empty) empty.active = false;
  if (extra) extra.active = true;
  if (listHost) listHost.active = true;
  if (!row || !list) {
    GameLog.shared.warn("Mainline", "RewardBoard 下没有 ExtraRow/content 或 RewardList/content");
    return;
  }
  const rowBox = row.getComponent(UITransform);
  if (rowBox) rowBox.setContentSize(faces.length * CHAPTER_EXTRA_CELL_W, CHAPTER_EXTRA_CELL_H);
  const listBox = list.getComponent(UITransform);
  if (listBox) listBox.setContentSize(CHAPTER_REWARD_BOX_W, faces.length * 160);
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    const progress = extraRewardProgress(cleared, face.gate);
    void mountCell(row, EXTRA_CELL, "extra-" + face.gate).then((cell) => {
      if (!cell || !board.isValid) return;
      place(cell, row, i * CHAPTER_EXTRA_CELL_W, -CHAPTER_EXTRA_CELL_H / 2);
      dressExtraCell(cell, face, progress);
    });
    void mountCell(list, REWARD_CELL, "gate-" + face.gate).then((cell) => {
      if (!cell || !board.isValid) return;
      place(cell, list, -CHAPTER_REWARD_BOX_W / 2, -(i + 1) * 160);
      dressRewardRow(cell, face, progress, () => onStage(face.gate));
    });
  }
}

function dressExtraCell(cell: Node, face: ChapterExtraFace, progress: string): void {
  writeNamed(cell, "lbl_mission", progress);
  const tip = extraRewardTipPath(face.tipImg);
  const mark = findNamed(cell, "spr_top_tip");
  if (mark && tip) paintSprite(mark, tip, "通关奖励角标 " + tip + " 没有挂上");
  else if (!tip) GameLog.shared.info("Mainline", "通关奖励 tip_img " + face.tipImg + " 没有对应角标");
  const slot = findNamed(cell, "spr_reward_bg");
  if (slot) {
    const path = itemIconResource(face.itemType, null) || "ui/bag/backpack_" + face.itemType;
    const icon = slot.getChildByName("spr_icon");
    if (!icon) GameLog.shared.warn("Mainline", "spr_reward_bg 下没有 spr_icon");
    else {
      paintSprite(icon, path, "通关奖励图标 " + path + " 没有挂上");
      bindTap(icon, () => {
        GameLog.shared.info("Mainline", "通关奖励不发 3011");
        toast(cell, "不发领取协议");
      });
    }
    const num = slot.getChildByName("lbl_num");
    if (num) {
      num.active = face.itemNum > 1;
      if (face.itemNum > 1) setText(num, "×" + face.itemNum);
    }
  }
  const button = findNamed(cell, "btn_reward");
  if (button) {
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      GameLog.shared.info("Mainline", "通关奖励不发 3011");
      toast(cell, "不发领取协议");
    });
  }
  const tipText = fillRewardTip(face.tip, face.gate);
  if (tipText) GameLog.shared.info("Mainline", "通关 " + face.gate + " " + tipText);
}

function dressRewardRow(cell: Node, face: ChapterExtraFace, progress: string, onGo: () => void): void {
  writeNamed(cell, "lbl_title", "通关" + face.gate + "关(" + progress + ")");
  const button = findNamed(cell, "btn_battle");
  if (!button) return;
  if (!button.getComponent(Button)) button.addComponent(Button);
  button.on(Button.EventType.CLICK, () => {
    GameLog.shared.info("Mainline", "通关奖励前往只看关卡，不发 3011");
    onGo();
  });
}

function mapCaption(idx: number, known: boolean, area: string): string {
  if (!known) return "主线未同步";
  const place = chapterStageCaption(idx);
  const head = place || (idx >= 1 ? "第" + idx + "关" : "主线未同步");
  return area ? head + " " + area : head;
}

function stageIdx(): number {
  const shown = hangShownStage();
  return shown === null ? 1 : shown;
}

function synced(): boolean {
  const mock = GameStore.mockStageId();
  const chapter = GameStore.chapter();
  return (mock !== null && mock >= 1) || chapter.nowIdx !== null || chapter.maxIdx !== null;
}

function scrollStrip(scroll: ScrollView, index: number, contentW: number): void {
  let shift = index * CHIP_W + CHIP_W / 2 - STRIP_W / 2;
  if (shift < 0) shift = 0;
  const max = contentW > STRIP_W ? contentW - STRIP_W : 0;
  if (shift > max) shift = max;
  scroll.scrollToOffset(new Vec2(shift, 0), 0);
}

function mountCell(parent: Node, path: string, name: string): Promise<Node | null> {
  return loadPrefab(path).then(
    (prefab) => {
      if (!parent.isValid) return null;
      const node = spawnPrefab(prefab, parent);
      node.name = name;
      silenceMenus(node);
      return node;
    },
    (_err) => {
      GameLog.shared.warn("Mainline", path + " 没有挂上");
      return null;
    }
  );
}

function silenceMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name !== "menu" && node.name.indexOf("menu") < 0 && node.name.indexOf("Menu") < 0) continue;
    const ui = node.getComponent(UITransform);
    if (!ui || ui.contentSize.width < 400 || ui.contentSize.height < 400) continue;
    ui.setContentSize(0, 0);
  }
}

function bindTap(node: Node, fn: () => void): void {
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

function clearChildren(node: Node): void {
  const old = node.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
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

function writeNamed(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (node) setText(node, text);
}

function toast(host: Node, text: string): void {
  GameLog.shared.info("Mainline", text);
  if (!host.isValid) return;
  void loadPrefab(TEXT_CHIP).then(
    (prefab) => {
      if (!host.isValid) return;
      const old = host.getChildByName("ReadToast");
      if (old) old.destroy();
      const node = spawnPrefab(prefab, host);
      node.name = "ReadToast";
      const label = node.getComponent(Label);
      if (label) {
        label.string = text;
        label.fontSize = 18;
        label.lineHeight = 22;
      }
      node.setPosition(0, 40, 0);
      const timer = setTimeout(() => {
        if (node.isValid) node.destroy();
      }, 1600);
      const maybe = timer as { unref?: () => void };
      if (typeof maybe.unref === "function") maybe.unref();
    },
    () => {
      GameLog.shared.warn("Mainline", "TextChip 没有挂上");
    }
  );
}

function paintSprite(node: Node, path: string, miss: string): void {
  const image = node.getComponent(Sprite);
  if (!image) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("Mainline", miss);
        return;
      }
      image.spriteFrame = asset;
    });
  } catch (_err) {
    GameLog.shared.warn("Mainline", miss);
  }
}
