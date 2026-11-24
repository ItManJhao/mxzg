/**
 * 使用预制体绑定的品质底框、星星和等级，统一英雄名册与出阵阵位的头像外观。
 * 只绘制这一格的数据，无页面状态、阵容规则或协议依赖。
 */
import { Label, Node, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroGrowthDisplayUtils } from "./HeroGrowthDisplayUtils";

/** 名册样式所需的预制体引用；各场景可独立设置尺寸和位置。 */
export interface HeroPortraitRankBindings {
    readonly rosterFrame: Sprite | null;
    readonly rosterFrames: readonly SpriteFrame[];
    readonly rosterStarFrames: readonly SpriteFrame[];
    readonly stars: readonly Node[];
    readonly rosterStarBadge: Node | null;
    readonly rosterStarBadgeNumber: Node | null;
}

export class HeroPortraitDisplayUtils {
    /** 头像绘制工具不持有实例。 */
    private constructor() {}

    /** 核对品质框、普通星与高星翼徽的预制体资源是否完整。 */
    public static hasRankBindings(view: HeroPortraitRankBindings): boolean {
        return !!view.rosterFrame
            && view.rosterFrames.length === 6 && view.rosterFrames.every(frame => !!frame)
            && view.rosterStarFrames.length === 2 && view.rosterStarFrames.every(frame => !!frame)
            && view.stars.length === 5 && view.stars.every(node => !!node?.getComponent(Sprite))
            && !!view.rosterStarBadge?.getComponent(Sprite)
            && !!view.rosterStarBadgeNumber?.getComponent(Sprite);
    }

    /**
     * 按名册星级规则更新品质、金紫星和高星翼徽。
     * @param isCurrent 异步翼徽赋图时判断列表格是否仍显示这轮数据；阵位由同节点请求栅栏负责取消旧图。
     */
    public static paintRank(view: HeroPortraitRankBindings, star: number, isCurrent?: () => boolean): void {
        const rarity = star <= 0 ? 0 : star >= 10 ? 5 : Math.min(4, Math.max(1, star - 1));
        view.rosterFrame!.spriteFrame = view.rosterFrames[rarity];
        const appearance = HeroGrowthDisplayUtils.starAppearance(star);
        const frame = view.rosterStarFrames[star > 5 ? 1 : 0];
        HeroPortraitDisplayUtils.paintStars(view.stars, appearance.count, frame);
        HeroPortraitDisplayUtils.paintBadge(view.rosterStarBadge!, appearance.badge, isCurrent);
        HeroPortraitDisplayUtils.paintBadge(view.rosterStarBadgeNumber!, appearance.number, isCurrent);
    }

    /** 只显示当前档位需要的星星，实际位置交给预制体内的水平布局。 */
    public static paintStars(stars: readonly Node[], count: number, frame?: SpriteFrame): void {
        const visibleCount = Math.min(5, Math.max(0, count));
        for (const [index, node] of stars.entries()) {
            node.active = index < visibleCount;
            if (node.active && frame) {
                node.getComponent(Sprite)!.spriteFrame = frame;
            }
        }
    }

    /** 等级只显示实际数字；空阵位或无等级的卡隐藏文本。 */
    public static paintLevel(label: Label, level: number | null): void {
        label.node.active = level !== null;
        label.string = level === null ? "" : String(level);
    }

    /** 先清除旧翼徽图，再交给 ResManager 复用同图或加载当前星级的资源。 */
    private static paintBadge(node: Node, source: string | null, isCurrent?: () => boolean): void {
        node.active = source !== null;
        node.getComponent(Sprite)!.spriteFrame = null;
        ResManager.setSprite(node, source, isCurrent);
    }
}
