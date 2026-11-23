/** 从英雄、阵容和背包的同一快照派生红点，详情和底栏据此显示。 */
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import type { BagModel } from "../../bag/BagModel";
import type { HeroRosterState } from "../HeroRosterModel";
import { HeroEquipmentUtils } from "./HeroEquipmentUtils";
import { HeroLevelQuoteUtils } from "./HeroLevelQuoteUtils";

export class HeroRedDotUtils {
    /** 只投影当前快照，无需创建实例。 */
    private constructor() {}

    /**
     * 所有英雄可显示自己的装备、升级和进阶红点，底栏只汇总主线已上阵的英雄。
     * 未同步的装备或库存不触发可操作提示。
     */
    public static project(roster: HeroRosterState, bag: BagModel, gold: number): {
        readonly details: Readonly<Record<string, boolean>>;
        readonly lineupReady: boolean;
    } {
        const details: Record<string, boolean> = {};
        let lineupReady = false;
        if (!bag.snapshot.synced) {
            return { details, lineupReady };
        }
        const mainHeroes = new Set(roster.mainFormation?.slots.map(slot => slot.heroId));
        const exp = bag.quantity(HeroLevelQuoteUtils.EXPERIENCE_ITEM_ID);
        const stone = bag.quantity(HeroLevelQuoteUtils.STAGE_STONE_ITEM_ID);
        const availableScores = HeroEquipmentUtils.bestAvailableScores(bag.items);
        for (const hero of roster.heroes) {
            const quote = HeroLevelQuoteUtils.describe(hero, gold, exp);
            const stage = quote.status === "max" ? HeroLevelQuoteUtils.describeStage(hero, gold, stone) : null;
            const canUpgrade = (quote.status === "ready" && quote.levels > 0)
                || (stage?.status === "ready" && hero.level === stage.requiredLevel
                    && stage.goldEnough && stage.stoneEnough);
            const slots = hero.equipment ? HeroEquipmentUtils.improvableSlots(availableScores, hero.equipment.items) : [];
            if (canUpgrade) {
                details[GameRedDotKey.heroUpgrade(hero.id)] = true;
            }
            for (const slot of slots) {
                details[GameRedDotKey.heroEquipment(hero.id, slot)] = true;
            }
            if (mainHeroes.has(hero.id) && (canUpgrade || slots.length > 0)) {
                lineupReady = true;
            }
        }
        return { details, lineupReady };
    }
}
