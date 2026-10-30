/**
 * 英雄详情相对日服壳的锚点。只写 Prefab 上已经量过的差。
 * 穿上、升级可以留着壳上的按钮，不从这里发协议。
 */

/** HeroInfoUpStarLayer：图标在 (-70, 0)，等级底在 (-90, 20)。 */
export const HERO_SKILL_BADGE_OFFSET = { x: -20, y: 20 };
export const HERO_SKILL_BADGE_ART = "ui/hero/hero-info_spr-skill-level-bg";

/**
 * 立绘挂在 node_equip 圆心。
 * 战斗地砖把骨架往下挪 36，详情圈不跟那一格。
 */
export const HERO_DETAIL_SPINE_SEAT_Y = 0;

export const HERO_EMPTY_RING_NAMES = [
  "btn_equip_1",
  "btn_equip_2",
  "btn_equip_3",
  "btn_equip_4",
  "btn_runes_1",
  "btn_runes_2",
  "btn_artifact_1",
  "btn_artifact_2",
];
