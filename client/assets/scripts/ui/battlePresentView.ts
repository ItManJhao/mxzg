/**
 * 把进战表现写进 #163 的 Prefab 挂点。
 * 只改已有节点的字和显隐，不新建 FloatDmg / SkillNameBanner / HeadAnchor。
 * 缺字段就藏起，不写成 0，也不留编辑器占位（-12345、圣光打击、Lv.1、三色 buff）。
 * 不发协议，不加载 PVR。
 */
import { Color, Label, Node } from "cc";
import { battleNumberKind } from "./battleNumberFont";
import { applyBattleNumberFont } from "./battleNumberPaint";
import {
  BATTLE_BUFF_SLOT_COUNT,
  BATTLE_FLOAT_CRIT_PATH,
  BATTLE_FLOAT_SLOT_COUNT,
  BATTLE_SKILL_NAME_BANNER_PATH,
  BATTLE_SKILL_NAME_LABEL_PATH,
  battleFloatDmgPath,
} from "./battlePrefabLayout";
import {
  BATTLE_CRIT_BUBBLE,
  BattleFloatCue,
  BattleOverhead,
  beatShowsCrit,
  floatHurtText,
  overheadLevelText,
  visibleBuffCount,
  visibleFloats,
} from "./battlePresentation";
import { requireNode } from "./prefabLoad";
import { setText } from "./UiKit";

export interface BattlePresentMount {
  floats: Node[];
  crit: Node;
  skillBanner: Node;
  skillLabel: Node;
}

/** 绑 Prefab 上的挂点。缺一个就抛错，调用方退回代码 UI。 */
export function bindBattlePresent(root: Node): BattlePresentMount {
  const floats: Node[] = [];
  for (let i = 0; i < BATTLE_FLOAT_SLOT_COUNT; i++) {
    const path = battleFloatDmgPath(i);
    if (!path) throw new Error("飘字序号超出 Prefab " + i);
    const node = requireNode(root, path);
    setText(node, "");
    node.active = false;
    floats.push(node);
  }
  const crit = requireNode(root, BATTLE_FLOAT_CRIT_PATH);
  crit.active = false;
  const skillBanner = requireNode(root, BATTLE_SKILL_NAME_BANNER_PATH);
  const skillLabel = requireNode(root, BATTLE_SKILL_NAME_LABEL_PATH);
  setText(skillLabel, "");
  skillBanner.active = false;
  return { floats, crit, skillBanner, skillLabel };
}

export function paintBattleSkillName(mount: BattlePresentMount, name: string | null): void {
  if (!mount.skillBanner.isValid || !mount.skillLabel.isValid) return;
  if (name === null || name === "") {
    setText(mount.skillLabel, "");
    mount.skillBanner.active = false;
    return;
  }
  setText(mount.skillLabel, name);
  const label = mount.skillLabel.getComponent(Label);
  if (label) {
    label.fontSize = 26;
    label.color = new Color(255, 236, 180, 255);
  }
  mount.skillBanner.active = true;
}

/**
 * 按顺序写入 FloatDmg_0..3。没用到的藏起。有暴击才打开 FloatCrit。
 * pages 和 floats 对齐，是受击者的页面坐标。有坐标就挪到那个人头顶，不另建节点。
 * 没有坐标时留在 Prefab 的预览位置。
 */
export function paintBattleFloats(
  mount: BattlePresentMount,
  floats: BattleFloatCue[],
  pages?: ({ x: number; y: number } | null)[]
): void {
  const shown = visibleFloats(floats);
  let critPage: { x: number; y: number } | null = null;
  for (let i = 0; i < mount.floats.length; i++) {
    const node = mount.floats[i];
    if (!node || !node.isValid) continue;
    if (i >= shown.length) {
      setText(node, "");
      node.active = false;
      continue;
    }
    const text = floatHurtText(shown[i].hurt);
    if (!text) {
      setText(node, "");
      node.active = false;
      continue;
    }
    setText(node, text);
    const label = node.getComponent(Label);
    if (label) {
      const heal = shown[i].hurt > 0;
      const crit = shown[i].crit === true && !heal;
      const kind = battleNumberKind(heal, crit);
      if (!applyBattleNumberFont(label, kind, text)) {
        label.fontSize = crit ? 40 : 32;
        label.lineHeight = crit ? 44 : 36;
        label.isBold = true;
        label.color = crit
          ? new Color(255, 214, 64, 255)
          : heal
            ? new Color(72, 210, 96, 255)
            : new Color(255, 72, 56, 255);
      }
    }
    node.active = true;
    const page = pages && i < pages.length ? pages[i] : null;
    if (page) {
      placeFloat(node, page.x, page.y + 78 - i * 28);
      if (shown[i].crit && !critPage) critPage = page;
    }
  }
  if (!mount.crit.isValid) return;
  if (!beatShowsCrit(floats)) {
    mount.crit.active = false;
    return;
  }
  setText(mount.crit, BATTLE_CRIT_BUBBLE);
  mount.crit.active = true;
  if (critPage) placeFloat(mount.crit, critPage.x - 72, critPage.y + 96);
}

function placeFloat(node: Node, pageX: number, pageY: number): void {
  const parent = node.parent;
  const ox = parent ? parent.position.x : 0;
  const oy = parent ? parent.position.y : 0;
  node.setPosition(pageX - ox, pageY - oy, 0);
}

/**
 * 前排槽上的 HeadAnchor。后排没有这个节点，直接返回，不补造。
 * 等级缺失就藏起 LevelLabel。buff 列表缺失或为空就藏起 BuffRow。
 */
export function paintBattleOverhead(slot: Node, row: BattleOverhead): void {
  if (!slot.isValid) return;
  const head = slot.getChildByName("HeadAnchor");
  if (!head) return;
  const level = head.getChildByName("LevelLabel");
  const levelText = overheadLevelText(row.level);
  if (level) {
    if (levelText === null) {
      setText(level, "");
      level.active = false;
    } else {
      setText(level, levelText);
      level.active = true;
    }
  }
  const buffRow = head.getChildByName("BuffRow");
  if (!buffRow) return;
  const count = visibleBuffCount(row.buffIds);
  if (count === null || count <= 0) {
    buffRow.active = false;
    hideBuffChips(buffRow);
    return;
  }
  buffRow.active = true;
  for (let i = 0; i < BATTLE_BUFF_SLOT_COUNT; i++) {
    const chip = buffRow.getChildByName("Buff_" + i);
    if (!chip) continue;
    chip.active = i < count;
  }
}

export function clearBattleOverhead(slot: Node): void {
  paintBattleOverhead(slot, { slot: -1, level: null, buffIds: null });
}

function hideBuffChips(buffRow: Node): void {
  for (let i = 0; i < BATTLE_BUFF_SLOT_COUNT; i++) {
    const chip = buffRow.getChildByName("Buff_" + i);
    if (chip) chip.active = false;
  }
}
