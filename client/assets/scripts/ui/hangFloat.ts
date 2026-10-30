/**
 * 挂机战报和挂机演武共用的飘字。
 * 数字优先用位图：掉血 yellow-73，治疗 green-73，暴击 red-73。
 * 字库没挂上时退回红字、绿字和更大的金字。「暴击」两个字不写进位图。
 * 字由调用方写好。这里不造 0。
 */
import { Color, Label, Node, Overflow } from "cc";
import { battleNumberFontSize, battleNumberKind } from "./battleNumberFont";
import { applyBattleNumberFont } from "./battleNumberPaint";
import { createLabel, place } from "./UiKit";

export interface HangFloat {
  text: string;
  x: number;
  y: number;
  heal: boolean;
  crit?: boolean;
}

const DMG = new Color(255, 70, 54, 255);
const HEAL = new Color(90, 230, 120, 255);
const CRIT = new Color(255, 214, 72, 255);
const WHITE = new Color(255, 255, 255, 255);

/** 清掉宿主上的旧字，最多画 6 条。 */
export function placeHangFloats(host: Node, floats: HangFloat[]): void {
  if (!host.isValid) return;
  const old = host.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
  for (let i = 0; i < floats.length && i < 6; i++) {
    const row = floats[i];
    const crit = row.crit === true && !row.heal;
    const kind = battleNumberKind(row.heal, crit);
    const color = crit ? CRIT : row.heal ? HEAL : DMG;
    const size = battleNumberFontSize(kind);
    const y = row.y + (crit ? 18 : 0);
    const node = createLabel(row.text, size, { color: WHITE, width: crit ? 220 : 180, height: 56 });
    const labelNode = node.getComponent(Label);
    if (labelNode) {
      labelNode.overflow = Overflow.SHRINK;
      if (!applyBattleNumberFont(labelNode, kind, row.text)) {
        labelNode.color = color;
        labelNode.isBold = true;
        labelNode.string = row.text;
      }
    }
    if (crit) {
      const tag = createLabel("暴击", 18, { color: CRIT, width: 56, height: 28 });
      place(tag, host, row.x - 72, y + 10);
    }
    place(node, host, row.x, y);
    const rise = setTimeout(() => {
      if (node.isValid) node.setPosition(row.x, y + 28, 0);
    }, 90);
    const maybe = rise as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }
}
