/** 战斗骨架动作契约：定义播放控制器支持的基础动作名，由BattleSpineService与英雄/战报显示共同使用，不登记资源或持有状态。 */
export type BattleAnimationClip = "stand" | "attack" | "hit" | "die" | "idle";
