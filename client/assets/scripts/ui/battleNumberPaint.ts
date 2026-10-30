/**
 * 把一条飘字换成位图数字。字库没挂上时涂回系统字：掉血红，治疗绿，暴击金。
 */
import { BitmapFont, Color, Label, resources } from "cc";
import { GameLog } from "../core/GameLog";
import {
  BattleNumberKind,
  battleNumberFontPath,
  battleNumberFontSize,
  bitmapNumberText,
} from "./battleNumberFont";

const WHITE = new Color(255, 255, 255, 255);

const fontCache = new Map<string, BitmapFont | null>();
const fontWait = new Map<string, Array<(font: BitmapFont | null) => void>>();
let fontMissLogged = false;

function noteFontMiss(path: string): void {
  if (fontMissLogged) return;
  fontMissLogged = true;
  GameLog.shared.warn("BattleFx", "飘字字库 " + path + " 没有挂上，仍用系统字");
}

function loadNumberFont(path: string, done: (font: BitmapFont | null) => void): void {
  if (fontCache.has(path)) {
    done(fontCache.get(path) || null);
    return;
  }
  const queue = fontWait.get(path);
  if (queue) {
    queue.push(done);
    return;
  }
  fontWait.set(path, [done]);
  const finish = (font: BitmapFont | null) => {
    fontCache.set(path, font);
    const waiting = fontWait.get(path) || [];
    fontWait.delete(path);
    for (let i = 0; i < waiting.length; i++) waiting[i](font);
  };
  try {
    resources.load(path, BitmapFont, (err, asset) => {
      if (err || !asset) {
        noteFontMiss(path);
        finish(null);
        return;
      }
      finish(asset);
    });
  } catch (_err) {
    noteFontMiss(path);
    finish(null);
  }
}

/**
 * 成功返回 true。字还在加载时先涂白，挂上之后不再用系统字染色。
 * 不是纯数字时返回 false，调用方自己涂色。
 */
export function applyBattleNumberFont(label: Label, kind: BattleNumberKind, text: string): boolean {
  const digits = bitmapNumberText(text);
  if (!digits || !label.isValid) return false;
  label.string = digits;
  label.color = WHITE;
  label.isBold = false;
  const size = battleNumberFontSize(kind);
  label.fontSize = size;
  label.lineHeight = size + 4;
  const path = battleNumberFontPath(kind);
  loadNumberFont(path, (font) => {
    if (!label.isValid) return;
    if (!font) {
      paintSystemNumber(label, kind);
      return;
    }
    const view = label as Label & { font?: BitmapFont | null; cacheMode?: number };
    view.font = font;
    label.useSystemFont = false;
    label.string = digits;
    label.color = WHITE;
    label.isBold = false;
    const cache = (Label as unknown as { CacheMode?: { NONE: number } }).CacheMode;
    if (cache) view.cacheMode = cache.NONE;
  });
  return true;
}

/** 字库没挂上时的系统字。掉血红，治疗绿，暴击金。 */
function paintSystemNumber(label: Label, kind: BattleNumberKind): void {
  label.useSystemFont = true;
  label.isBold = true;
  if (kind === "crit") {
    label.fontSize = 40;
    label.lineHeight = 44;
    label.color = new Color(255, 214, 64, 255);
    return;
  }
  if (kind === "heal") {
    label.fontSize = 32;
    label.lineHeight = 36;
    label.color = new Color(72, 210, 96, 255);
    return;
  }
  label.fontSize = 34;
  label.lineHeight = 38;
  label.color = new Color(255, 72, 56, 255);
}
