/** 从角色、英雄、阵容和背包的同一快照派生红点，详情、名册和底栏据此显示。 */
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import type { BagModel } from "../../bag/BagModel";
import type { RoleProfile } from "../../account/AccountModel";
import type { HeroRosterState } from "../HeroRosterModel";
import { HeroEquipmentUtils } from "./HeroEquipmentUtils";
import { HeroGodEquipmentUtils } from "./HeroGodEquipmentUtils";
import { HeroJewelUtils } from "./HeroJewelUtils";
import { HeroLevelQuoteUtils } from "./HeroLevelQuoteUtils";
import { HeroStarUtils } from "./HeroStarUtils";

export class HeroRedDotUtils {
    /** 只投影当前快照，无需创建实例。 */
    private constructor() {}

    /**
     * 所有英雄可显示自身可操作的提示，底栏只汇总主线已上阵英雄的培养、升星及普通装备。
     * 宝石、神装放在独立的页签分支；未同步的库存不触发提醒。
     */
    public static project(roster: HeroRosterState, bag: BagModel, role: Pick<RoleProfile, "level" | "gold">): {
        readonly details: Readonly<Record<string, boolean>>;
        readonly growth: Readonly<Record<string, boolean>>;
        readonly lineupReady: boolean;
    } {
        const details: Record<string, boolean> = {};
        const growth: Record<string, boolean> = {};
        let lineupReady = false;
        if (!bag.snapshot.synced) {
            return { details, growth, lineupReady };
        }
        const mainHeroes = new Set(roster.mainFormation?.slots.map(slot => slot.heroId));
        const exp = bag.quantity(HeroLevelQuoteUtils.EXPERIENCE_ITEM_ID);
        const stone = bag.quantity(HeroLevelQuoteUtils.STAGE_STONE_ITEM_ID);
        const availableScores = HeroEquipmentUtils.bestAvailableScores(bag.items);
        const availableJewelStars = HeroJewelUtils.bestAvailableStars(bag.items);
        const worldLevel = roster.godEquipment?.worldLevel ?? 0;
        for (const hero of roster.heroes) {
            const quote = HeroLevelQuoteUtils.describe(hero, role.gold, exp);
            const stage = quote.status === "max" ? HeroLevelQuoteUtils.describeStage(hero, role.gold, stone) : null;
            const canUpgrade = (quote.status === "ready" && quote.levels > 0)
                || (stage?.status === "ready" && hero.level === stage.requiredLevel
                    && stage.goldEnough && stage.stoneEnough);
            const slots = hero.equipment ? HeroEquipmentUtils.improvableSlots(availableScores, hero.equipment.items) : [];
            const recipe = HeroStarUtils.recipe(hero);
            const canStar = !!recipe && HeroStarUtils.eligible(recipe, roster.heroes, role.level, worldLevel)
                && HeroStarUtils.canPrepareMaterials(hero, recipe, roster.heroes, id => bag.quantity(id));
            if (canUpgrade) {
                details[GameRedDotKey.heroUpgrade(hero.id)] = true;
            }
            if (canStar) {
                details[GameRedDotKey.heroStar(hero.id)] = true;
            }
            for (const slot of slots) {
                details[GameRedDotKey.heroEquipment(hero.id, slot)] = true;
            }
            const jewels = hero.gems ? HeroJewelUtils.reminderSlots(hero.star, hero.gems.items, availableJewelStars) : [];
            for (const slot of jewels) {
                growth[GameRedDotKey.heroJewel(hero.id, slot)] = true;
            }
            for (const slot of HeroGodEquipmentUtils.reminderSlots(roster.godEquipment, hero, role.level)) {
                growth[GameRedDotKey.heroGodEquipment(hero.id, slot)] = true;
            }
            if (mainHeroes.has(hero.id) && (canUpgrade || canStar || slots.length > 0)) {
                lineupReady = true;
            }
        }
        return { details, growth, lineupReady };
    }
}
