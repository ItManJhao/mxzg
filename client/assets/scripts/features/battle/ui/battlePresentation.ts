/**
 * 战斗浮字和头顶信息的纯展示规则。
 * 由 battlePresentView 绘制服务端战报，不保存战斗或奖励状态。
 */
export const BATTLE_CRIT_BUBBLE = "暴击";

export const BATTLE_FLOAT_SLOT_COUNT = 4;

export const BATTLE_BUFF_SLOT_COUNT = 3;

export interface BattleFloatCue {
  /** plan.slots 下标。对不上人时是 null。数字仍写在 FloatDmg 槽上，不按站位挪节点。 */
  anchor: number | null;
  hurt: number;
  /** true 才画「暴击」。缺字段和明确的不暴击都是 false，不写 0。 */
  crit: boolean;
}

export interface BattleOverhead {
  /** plan.slots 下标。只含报告里真正带上的英雄，不含补位。 */
  slot: number;
  /** 没有 level 字段时是 null，不写成 0。出现的 0 仍是 0。 */
  level: number | null;
  /** 没有 buffs 字段时是 null。空数组表示列表在，但没有图标。 */
  buffIds: number[] | null;
}

/** 把服务端给出的等级转换为头顶文字；缺失等级返回 null。 */
export function overheadLevelText(level: number | null): string | null {
  if (level === null) return null;
  return "Lv." + String(level);
}

/** 将非零血量变化转换为带符号浮字；零值或无效值返回空文本。 */
export function floatHurtText(hurt: number): string {
  if (typeof hurt !== "number" || !isFinite(hurt) || hurt === 0) return "";
  if (hurt < 0) return String(hurt);
  return "+" + String(hurt);
}

/** 保留最多四个浮字槽位，维持服务端事件的排列顺序。 */
export function visibleFloats(floats: BattleFloatCue[]): BattleFloatCue[] {
  const shown: BattleFloatCue[] = [];
  const n = floats.length < BATTLE_FLOAT_SLOT_COUNT ? floats.length : BATTLE_FLOAT_SLOT_COUNT;
  for (let i = 0; i < n; i++) shown.push(floats[i]);
  return shown;
}

/** 判断本次可显示浮字中是否包含暴击，用于控制暴击标记。 */
export function beatShowsCrit(floats: BattleFloatCue[]): boolean {
  const shown = visibleFloats(floats);
  for (let i = 0; i < shown.length; i++) {
    if (shown[i].crit) return true;
  }
  return false;
}

/** 限制显示的状态图标数量；缺失状态列表返回 null。 */
export function visibleBuffCount(buffIds: number[] | null): number | null {
  if (buffIds === null) return null;
  if (buffIds.length <= 0) return 0;
  return buffIds.length < BATTLE_BUFF_SLOT_COUNT ? buffIds.length : BATTLE_BUFF_SLOT_COUNT;
}
