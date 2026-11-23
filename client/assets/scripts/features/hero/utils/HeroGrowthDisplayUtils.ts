/**
 * 英雄详情的培养页签、符文入口和星级表现。
 * 按目前名册和集中配置读取连续可达星级，详情顶部与升星面板共用原版星级图案。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroStarUtils } from "./HeroStarUtils";

/** 两个符文门槛为 null 时不显示对应格。 */
interface HeroGrowthDisplay {
    readonly tabs: readonly boolean[];
    readonly runeLevels: readonly (number | null)[];
}

/** 原版星级的普通星数量、翼徽和星差数字绘制资源。 */
interface HeroStarAppearance {
    readonly count: number;
    readonly frame: string | null;
    readonly badge: string | null;
    readonly number: string | null;
    readonly awakened: boolean;
    readonly badgeDigit: number;
}

export class HeroGrowthDisplayUtils {
    /** 项目采用日服截图中已有培养页签顺序。 */
    public static readonly tabNames = ["培养", "升星", "宝石", "神装"] as const;

    /** 配置读取不持有游戏状态。 */
    private constructor() {}

    /** 前五星用金星，六至九星用紫星，十星起用翼徽并在觉醒星级换图。 */
    public static starAppearance(star: number): HeroStarAppearance {
        if (star < 10) {
            const purple = star > 5;
            return {
                count: purple ? star - 5 : star,
                frame: purple ? "common/ui/other_star-1" : "common/ui/other_star-0",
                badge: null,
                number: null,
                awakened: false,
                badgeDigit: 0,
            };
        }
        const awakened = star === 14;
        const badgeDigit = star >= 11 && star <= 13 ? star - 10 : 0;
        return {
            count: 0,
            frame: null,
            badge: awakened ? "bag/ui/backpack_spr-star-bg-4" : "bag/ui/backpack_spr-star-bg-2",
            number: badgeDigit ? `bag/ui/backpack_lbl-star-${badgeDigit}` : null,
            awakened,
            badgeDigit,
        };
    }

    /** 升星需要连续下一星配方，宝石和符文入口按英雄可达上限显示。 */
    public static forHero(hero: OwnedHero, config = GameConfig.instance): HeroGrowthDisplay {
        const highestStar = HeroStarUtils.highestStar(hero, config);
        const levelLimit = config.getConfig(GConfig.HeroStar, highestStar)?.level_limit;
        const system = config.getFileByPath("config/system") as { rows?: readonly { key: string; value: unknown }[] } | null;
        const runeLevel = system?.rows?.find(row => row.key === "elf_1_unlock_level")?.value;
        const runeStar = system?.rows?.find(row => row.key === "elf_2_unlock_star")?.value;
        return {
            tabs: [true, highestStar > hero.star, highestStar > 6, true],
            runeLevels: [
                typeof runeLevel === "number" && levelLimit !== undefined && levelLimit >= runeLevel ? runeLevel : null,
                typeof runeStar === "number" && highestStar >= runeStar ? runeStar : null,
            ],
        };
    }
}
