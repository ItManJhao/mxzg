/** 铁匠铺普通装备配方的只读投影，供界面列出策划材料、部位与数量上限。实际成交由服务端校验。 */
import { GConfig } from "../../../config/GConfig";
import { GameConfig } from "../../../config/GameConfig";

/** 原版一件普通装备对应的单材料和金币消耗。 */
export interface SmithEquipmentRecipe {
    readonly itemId: number;
    readonly materialId: number;
    readonly materialCount: number;
    readonly goldCost: number;
}

/** 普通装备页按部位展示策划表，不保存库存或结算副本。 */
export class SmithEquipmentUtils {
    /** 该工具只读取配置与传入的余额。 */
    private constructor() {
    }

    /** 读取指定部位的可锻造配方，原本不能合成的一星基础品没有配方。 */
    public static recipes(slot: number): readonly SmithEquipmentRecipe[] {
        return GameConfig.instance.getConfig(GConfig.EquipmentType)
            .filter(row => row.place === slot && row.need_gold > 0)
            .sort((left, right) => left.equipment_type - right.equipment_type)
            .map(row => {
                const ingredients = JSON.parse(row.need_equipment) as { item_type: number; item_num: number }[];
                if (ingredients.length !== 1 || !Number.isSafeInteger(ingredients[0].item_type)
                    || ingredients[0].item_type < 1 || !Number.isSafeInteger(ingredients[0].item_num)
                    || ingredients[0].item_num < 1 || !Number.isSafeInteger(row.need_gold)) {
                    throw new Error(`普通装备配方无效：${row.equipment_type}`);
                }
                return {itemId: row.equipment_type, materialId: ingredients[0].item_type,
                    materialCount: ingredients[0].item_num, goldCost: row.need_gold};
            });
    }

    /** 单次可合成数量取普通库存与角色金币两者约束，结果供数量框显示。 */
    public static maximum(recipe: SmithEquipmentRecipe, materials: number, gold: number): number {
        return Math.min(Math.floor(materials / recipe.materialCount), Math.floor(gold / recipe.goldCost));
    }
}
