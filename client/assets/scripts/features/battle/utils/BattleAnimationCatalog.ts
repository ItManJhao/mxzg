/**
 * 战斗动画资源目录：登记骨骼可用动作和演出素材。
 * 由战报播放、英雄立绘和演武显示调用；不解析旧协议，不计算战斗结果。
 */
import { heroSkinClips } from "./BattleAssetCatalog";

export const BATTLE_ALLY_ANIMATIONS = ["10105008", "10405005", "10505005"];

export const BATTLE_ENEMY_ANIMATIONS = ["10405006", "10405007", "10505010"];

export const BATTLE_HIT_ANIMATION = "yanwu";

export type BattleAnimationClip = "stand" | "attack" | "hit" | "die" | "idle";

const STEM_CLIPS: { [stem: string]: BattleAnimationClip[] } = {
    "10101": ["stand"],
    "10201": ["stand"],
    "10301": ["stand"],
    "10401": ["stand"],
    "10501": ["stand"],
    "10701": ["stand"],
    "battle-sword": ["stand"],
    "10405005": ["stand", "attack", "hit"],
    "10405006": ["stand", "attack", "hit"],
    "10405007": ["stand", "attack", "hit"],
    "10505005": ["stand", "attack", "hit"],
    "10505010": ["stand", "attack", "hit"],
    "10105008": ["stand", "attack", "hit"],
    zhandoujijian: ["idle"],
    crusade_boss_die: ["stand", "die"],
};

/** 检查指定骨骼资源是否具备目标动作，不发起资源加载。 */
export function hasBattleAnimationClip(stem: string, clip: BattleAnimationClip): boolean {
    const list = STEM_CLIPS[stem] || heroSkinClips(stem);
    if (!list) return false;
    for (let i = 0; i < list.length; i++) {
        if (list[i] === clip) return true;
    }
    return false;
}

const VFX_CLIP: { [stem: string]: string } = {
    yanwu: "act1",
    heidong: "act1",
    chaihong: "act1",
    act: "attack",
    "Dragon-1": "attack",
    "Dragon-2": "attack",
    "Dragon-3": "attack",
    "Dragon-4": "attack",
    lijijihuo: "idle",
    zhihuanfazhen: "idle",
};

/** 为指定演出素材选择已有动作名称，供骨骼播放使用。 */
export function battleEffectClip(stem: string): string {
    const named = VFX_CLIP[stem];
    if (named) return named;
    return "stand";
}
