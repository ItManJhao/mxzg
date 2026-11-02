/**
 * 飘字数字走已入库的位图字。
 * 掉血 yellow-73，暴击 red-73，治疗 green-73。
 * 这三套只有加号、减号和数字。汉字留在系统字上。
 * blue-73 同样只有数字，技能名不用它。
 */

export type BattleNumberKind = "dmg" | "crit" | "heal";

export function battleNumberFontPath(kind: BattleNumberKind): string {
  if (kind === "crit") return "font/red-73";
  if (kind === "heal") return "font/green-73";
  return "font/yellow-73";
}

export function battleNumberKind(heal: boolean, crit: boolean): BattleNumberKind {
  if (heal) return "heal";
  if (crit) return "crit";
  return "dmg";
}

export function battleNumberFontSize(kind: BattleNumberKind): number {
  if (kind === "crit") return 52;
  if (kind === "heal") return 36;
  return 40;
}

/** 位图能画的才返回。带汉字或空串返回 null，调用方继续用系统字。 */
export function bitmapNumberText(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!/^[+-]\d+$/.test(trimmed)) return null;
  return trimmed;
}
