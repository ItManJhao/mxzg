/**
 * 铁匠铺宝石展示：将既有宝石配方和已提交背包快照转换成选项、素材槽及一键净产物。
 * 页面用这些数据展示确认窗，真实扣料与产物由英雄宝石服务结算。
 */
import { GameConfig } from "../../../config/GameConfig";
import type { BagItemData } from "../../bag/data/BagItemDataUtils";
import { HeroJewelUtils, type HeroJewelDefinition } from "../../hero/utils/HeroJewelUtils";

/** 单份配方独立素材槽的配置身份、需求和当前可填数量。 */
interface SmithJewelMaterial {
    readonly itemId: number;
    readonly quantity: number;
    readonly available: number;
}

/** 一键合成完成后保留的净新增宝石。 */
interface SmithJewelReward {
    readonly itemId: number;
    readonly quantity: number;
}

export class SmithJewelUtils {
    /** 所有转换仅使用调用方给出的配置和快照。 */
    private constructor() {}

    /** 按原稀有度和配置编号排列可以通过合成获得的宝石。 */
    public static recipes(slot: number, config = GameConfig.instance): readonly HeroJewelDefinition[] {
        return HeroJewelUtils.forSlot(slot, config).filter(jewel => jewel.recipe.length > 0)
            .sort((left, right) => left.rarity - right.rarity || left.itemId - right.itemId);
    }

    /** 按原先后次序填三枚独立素材槽，每个持有物品最多占一个槽。 */
    public static materials(recipe: HeroJewelDefinition, items: readonly BagItemData[]): readonly SmithJewelMaterial[] {
        const material = recipe.recipe[0];
        if (!material) {
            return [];
        }
        const available = items.find(item => item.itemId === material.itemId)?.quantity ?? 0;
        return Array.from({ length: material.quantity }, (_, index) => ({
            itemId: material.itemId,
            quantity: 1,
            available: index < available ? 1 : 0,
        }));
    }

    /** 逐级模拟同槽合成并返回净增产物，同次继续消耗的中间宝石从预览中扣除。 */
    public static preview(slot: number, items: readonly BagItemData[], config = GameConfig.instance): readonly SmithJewelReward[] {
        const starting = new Map(items.map(item => [item.itemId, item.quantity]));
        const net = new Map<number, number>();
        for (const jewel of HeroJewelUtils.forSlot(slot, config)) {
            const material = jewel.recipe[0];
            if (!material) {
                continue;
            }
            // 同槽配方是单链。先分别求商和余数，避免原库存与中途产物的和超过安全整数。
            const stock = starting.get(material.itemId) ?? 0;
            const craftedEarlier = net.get(material.itemId) ?? 0;
            const cost = material.quantity;
            const remainder = stock % cost + craftedEarlier % cost;
            const crafted = Math.floor(stock / cost) + Math.floor(craftedEarlier / cost) + Math.floor(remainder / cost);
            net.set(material.itemId, remainder % cost - stock);
            net.set(jewel.itemId, crafted);
        }
        return [...net].filter(([, quantity]) => quantity > 0)
            .map(([itemId, quantity]) => ({ itemId, quantity })).sort((left, right) => left.itemId - right.itemId);
    }
}
