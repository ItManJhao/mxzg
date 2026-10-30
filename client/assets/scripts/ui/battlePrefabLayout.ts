/**
 * BattlePage 节点路径和血条填充。
 * 坐标对齐 docs/battle-prefab-layout.md。不加载 Prefab，不发协议。
 * 站位是左敌右我：前排靠中线，后排靠外侧，三行自上而下。
 * 血条 Fill 锚点在中心，满血 112×14、本地 x=-24，左缘固定在 -80。
 * VfxSkill / VfxHit 的页面原点是 (0, 180) / (0, 120)。子节点本地坐标从这里减。
 */

export const BATTLE_PREFAB_PATH = "prefabs/ui/battle/BattlePage";

export const HP_FILL_FULL = 112;
export const HP_FILL_HEIGHT = 14;
export const HP_FILL_FULL_X = -24;

export type BattleSlotSide = "ally" | "enemy";
export type BattleVfxRole = "skill" | "hit" | "screen";

/** 三行，自上而下。前排 index 0–2，后排 3–5 用同一行。 */
export const BATTLE_ROW_Y = [140, -36, -212];
export const BATTLE_ENEMY_FRONT_X = -158;
export const BATTLE_ENEMY_BACK_X = -300;
export const BATTLE_ALLY_FRONT_X = 158;
export const BATTLE_ALLY_BACK_X = 300;

/**
 * 页面坐标。敌方在左、面向右；我方在右、面向左。
 * index 不是人数居中，和 Prefab 的 Slot_E* / Slot_A* 同一格。
 */
export function battleSlotPage(side: BattleSlotSide, index: number): { x: number; y: number } | null {
  if (!slotIndex(index, 5)) return null;
  const row = index % 3;
  const back = index >= 3;
  const x = side === "enemy"
    ? (back ? BATTLE_ENEMY_BACK_X : BATTLE_ENEMY_FRONT_X)
    : (back ? BATTLE_ALLY_BACK_X : BATTLE_ALLY_FRONT_X);
  return { x, y: BATTLE_ROW_Y[row] };
}

export function battleSlotPath(side: BattleSlotSide, index: number): string | null {
  if (!slotIndex(index, 5)) return null;
  const folder = side === "ally" ? "AllySlots/Slot_A" : "EnemySlots/Slot_E";
  return "LayerField/" + folder + index;
}

export function battleHpPath(side: BattleSlotSide, index: number): string | null {
  if (!slotIndex(index, 5)) return null;
  const name = side === "ally" ? "AllyHp_" : "EnemyHp_";
  return "LayerHud/HpBars/" + name + index;
}

export function battleSkillLabelPath(index: number): string | null {
  if (!slotIndex(index, 2)) return null;
  return "LayerHud/SkillBars/SkillBar_" + index + "/Label";
}

export function battleVfxPath(role: BattleVfxRole): string {
  if (role === "skill") return "LayerVfx/VfxSkill";
  if (role === "hit") return "LayerVfx/VfxHit";
  return "LayerVfx/VfxScreen";
}

/** #163 场内挂点。缺了就整页退回代码 UI，不另建同名节点。 */
export const BATTLE_FLOAT_LAYER_PATH = "LayerFloat";
export const BATTLE_FLOAT_ROOT_PATH = "LayerFloat/FloatDamageRoot";
export const BATTLE_FLOAT_CRIT_PATH = "LayerFloat/FloatCrit";
export const BATTLE_SKILL_NAME_BANNER_PATH = "SkillNameBanner";
export const BATTLE_SKILL_NAME_LABEL_PATH = "SkillNameBanner/SkillNameLabel";
export const BATTLE_FLOAT_SLOT_COUNT = 4;
export const BATTLE_BUFF_SLOT_COUNT = 3;

export function battleFloatDmgPath(index: number): string | null {
  if (!slotIndex(index, BATTLE_FLOAT_SLOT_COUNT - 1)) return null;
  return BATTLE_FLOAT_ROOT_PATH + "/FloatDmg_" + index;
}

/** 前排 0–2 才有 HeadAnchor。后排返回 null。 */
export function battleHeadPath(side: BattleSlotSide, index: number): string | null {
  if (!slotIndex(index, 2)) return null;
  const slot = battleSlotPath(side, index);
  if (!slot) return null;
  return slot + "/HeadAnchor";
}

export function battleLevelLabelPath(side: BattleSlotSide, index: number): string | null {
  const head = battleHeadPath(side, index);
  if (!head) return null;
  return head + "/LevelLabel";
}

export function battleBuffRowPath(side: BattleSlotSide, index: number): string | null {
  const head = battleHeadPath(side, index);
  if (!head) return null;
  return head + "/BuffRow";
}

export function battleBuffIconPath(side: BattleSlotSide, index: number, buffIndex: number): string | null {
  const row = battleBuffRowPath(side, index);
  if (!row || !slotIndex(buffIndex, BATTLE_BUFF_SLOT_COUNT - 1)) return null;
  return row + "/Buff_" + buffIndex;
}

/** 进战绑定时必须存在的节点。缺一个就整页退回代码 UI。 */
export function battlePrefabRequiredPaths(): string[] {
  const paths = [
    "Bg",
    "LayerField",
    "LayerField/EnemySlots",
    "LayerField/AllySlots",
    "LayerVfx",
    battleVfxPath("skill"),
    battleVfxPath("hit"),
    battleVfxPath("screen"),
    "LayerHud",
    "LayerHud/TopBar",
    "LayerHud/TopBar/RoundLabel",
    "LayerHud/TopBar/BtnClose",
    "LayerHud/HpBars",
    "LayerHud/SkillBars",
    "LayerHud/LogBg",
    "LayerHud/Log",
    "LayerHud/BtnSkip",
    "LayerHud/BtnRetreat",
    BATTLE_FLOAT_LAYER_PATH,
    BATTLE_FLOAT_ROOT_PATH,
    BATTLE_FLOAT_CRIT_PATH,
    BATTLE_SKILL_NAME_BANNER_PATH,
    BATTLE_SKILL_NAME_BANNER_PATH + "/BannerBg",
    BATTLE_SKILL_NAME_LABEL_PATH,
  ];
  for (let f = 0; f < BATTLE_FLOAT_SLOT_COUNT; f++) {
    const dmg = battleFloatDmgPath(f);
    if (dmg) paths.push(dmg);
  }
  for (let i = 0; i < 6; i++) {
    const enemy = battleSlotPath("enemy", i);
    const ally = battleSlotPath("ally", i);
    if (enemy) paths.push(enemy);
    if (ally) paths.push(ally);
    if (i > 2) continue;
    const enemyHp = battleHpPath("enemy", i);
    const allyHp = battleHpPath("ally", i);
    const skill = battleSkillLabelPath(i);
    if (enemyHp) {
      paths.push(enemyHp);
      paths.push(enemyHp + "/Fill");
      paths.push(enemyHp + "/Label");
    }
    if (allyHp) {
      paths.push(allyHp);
      paths.push(allyHp + "/Fill");
      paths.push(allyHp + "/Label");
    }
    if (skill) paths.push(skill);
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      const side: BattleSlotSide = sideIndex === 0 ? "enemy" : "ally";
      const head = battleHeadPath(side, i);
      const level = battleLevelLabelPath(side, i);
      const buffs = battleBuffRowPath(side, i);
      if (head) paths.push(head);
      if (level) paths.push(level);
      if (buffs) paths.push(buffs);
      for (let b = 0; b < BATTLE_BUFF_SLOT_COUNT; b++) {
        const icon = battleBuffIconPath(side, i, b);
        if (icon) paths.push(icon);
      }
    }
  }
  return paths;
}

/**
 * 按当前血比改 Fill 的宽和 x。ratio 不是有限数时当成 0。
 * 大于 1 收成满血。visible 为 false 时调用方隐藏节点，不把缺血写成一条 0 宽的色条。
 */
export function hpFillLayout(ratio: number): { width: number; x: number; visible: boolean } {
  let clamped = ratio;
  if (!isFinite(clamped) || clamped < 0) clamped = 0;
  if (clamped > 1) clamped = 1;
  const width = HP_FILL_FULL * clamped;
  const left = HP_FILL_FULL_X - HP_FILL_FULL / 2;
  return { width, x: left + width / 2, visible: width > 0.5 };
}

/** 页面坐标换成挂点下的本地坐标。无锚点时技能 (0, 180)、受击 (0, 120)，本地就是 (0, 0)。 */
export function vfxLocal(role: BattleVfxRole, pageX: number, pageY: number): { x: number; y: number } {
  const origin = role === "skill" ? { x: 0, y: 180 } : role === "hit" ? { x: 0, y: 120 } : { x: 0, y: 0 };
  return { x: pageX - origin.x, y: pageY - origin.y };
}

function slotIndex(index: number, max: number): boolean {
  return index >= 0 && index <= max && index === Math.floor(index);
}
