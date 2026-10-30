/**
 * 挂机掉落堆上方的一句对白。不盖左列英雄的头。
 * 图是 other_spr-bubble-5（224×74）。other_spr-bubble-1 只有 54×44，装不下一句 language。
 * 节点名 IdleTalk，进真战报时由 hangBattle 藏起来。不给每个站位写空等。
 */
import { Color, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { ConfigDb } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { hangLootBubbleY, HANG_LOOT_BUBBLE_X } from "./hangChrome";
import {
  HANG_TALK_BUBBLE_H,
  HANG_TALK_BUBBLE_W,
  hangTalkAnchor,
  hangTalkBucket,
  hangTalkLevel,
  pickHeroTalkLan,
  plainTalk,
  readHeroTalkRows,
} from "./idleHangTalkPlan";
import { createLabel, place, uiNode } from "./UiKit";

const BUBBLE = "ui/common/other_spr-bubble-5";
const BUBBLE_W = HANG_TALK_BUBBLE_W;
const BUBBLE_H = HANG_TALK_BUBBLE_H;
const INK = new Color(255, 244, 220, 255);

let bubbleMiss = false;
let tableMiss = false;
let cachedRows: ReturnType<typeof readHeroTalkRows> | null = null;
let cachedLang: { [key: string]: string } | null = null;

export function mountHangTalk(hang: Node): void {
  const node = uiNode("IdleTalk");
  const ui = node.addComponent(UITransform);
  ui.setContentSize(BUBBLE_W, BUBBLE_H);
  const at = hangTalkAnchor({ x: HANG_LOOT_BUBBLE_X, y: hangLootBubbleY() });
  place(node, hang, at.x, at.y);

  const plate = uiNode("HangTalkPlate");
  const plateUi = plate.addComponent(UITransform);
  plateUi.setContentSize(BUBBLE_W, BUBBLE_H);
  const sprite = plate.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  place(plate, node, 0, 0);
  paintBubble(sprite);

  const line = createLabel("", 18, { color: INK, width: 172, height: 64 });
  line.name = "HangTalkLine";
  const label = line.getComponent(Label);
  if (label) {
    label.overflow = Overflow.SHRINK;
    const wrap = label as Label & { enableWrapText?: boolean };
    wrap.enableWrapText = true;
  }
  place(line, node, 10, 2);
  node.active = false;

  let shown = "";
  const tick = () => {
    if (!hang.isValid || !node.isValid) return;
    if (battleUp(hang)) {
      node.active = false;
      return;
    }
    const text = currentTalk();
    if (!text) {
      node.active = false;
      shown = "";
      return;
    }
    node.active = true;
    if (text === shown) return;
    shown = text;
    if (label) label.string = text;
  };
  tick();
  const timer = setInterval(tick, 1000);
  const maybe = timer as { unref?: () => void };
  if (typeof maybe.unref === "function") maybe.unref();
  hang.once(Node.EventType.NODE_DESTROYED, () => clearInterval(timer));
}

function battleUp(hang: Node): boolean {
  const host = hang.parent;
  return !!(host && host.isValid && host.getChildByName("HangBattle"));
}

function currentTalk(): string {
  const ready = talkTables();
  if (!ready) return "";
  const lan = pickHeroTalkLan(ready.rows, talkLevel(), hangTalkBucket(Date.now()));
  if (lan === null) return "";
  return ready.lang[String(lan)] || "";
}

function talkTables(): { rows: ReturnType<typeof readHeroTalkRows>; lang: { [key: string]: string } } | null {
  if (cachedRows && cachedLang) return { rows: cachedRows, lang: cachedLang };
  const db = ConfigDb.current;
  const talkFile = db ? db.tables.get("herotalk") : null;
  const langFile = db ? db.tables.get("language") : null;
  if (!talkFile || !langFile) {
    noteTableMiss();
    return null;
  }
  const lang: { [key: string]: string } = {};
  const list = Array.isArray(langFile.rows) ? langFile.rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { key?: unknown; value?: unknown };
    if (rec.key === undefined || rec.key === null || typeof rec.value !== "string") continue;
    const text = plainTalk(rec.value);
    if (text) lang[String(rec.key)] = text;
  }
  cachedRows = readHeroTalkRows(talkFile);
  cachedLang = lang;
  return { rows: cachedRows, lang };
}

function talkLevel(): number {
  if (Session.source === "wire" && !Session.wireSync.level) return hangTalkLevel(null);
  const level = Session.role ? Session.role.level : null;
  return hangTalkLevel(level);
}

function paintBubble(sprite: Sprite): void {
  try {
    resources.load(BUBBLE + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!sprite.isValid) return;
      if (err || !asset) {
        noteBubbleMiss();
        return;
      }
      sprite.spriteFrame = asset;
    });
  } catch (_err) {
    noteBubbleMiss();
  }
}

function noteBubbleMiss(): void {
  if (bubbleMiss) return;
  bubbleMiss = true;
  GameLog.shared.warn("Mainline", "挂机对白 other_spr-bubble-5 没有挂上，仍写句子");
}

function noteTableMiss(): void {
  if (tableMiss) return;
  tableMiss = true;
  GameLog.shared.warn("Mainline", "挂机对白 herotalk 还没读到，气泡先藏着");
}
