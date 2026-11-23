/**
 * 创造法阵读取原英雄模板的初始升星配方，并投影备料进度和结果属性预览。
 * 英雄和库存均来自既有 Model，实际合成沿用升星协议和服务端事务。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroCatalog, type HeroTemplateFace } from "./HeroCatalog";
import { HeroStarUtils, type HeroStarRecipe } from "./HeroStarUtils";

/** 单个可在法阵选中的初始英雄配方和当前名册的备料进度。 */
export interface HeroCreationOption {
    /** 英雄配置标识和展示图标。 */
    readonly face: HeroTemplateFace;
    /** 原配方，包含星级及逐行消耗。 */
    readonly recipe: HeroStarRecipe;
    /** 能在各行分配到的当前英雄和替代道具总数，包含本体。 */
    readonly available: number;
    /** 完成配方所需的英雄总量，包含本体。 */
    readonly required: number;
    /** 本体、材料和固定费用都已齐备。 */
    readonly ready: boolean;
}

/** 旧客户端的下一级模板预览，仅供显示，不交给名册或作为升星结果。 */
interface HeroCreationPreview {
    readonly level: number;
    readonly stage: number;
    readonly attributes: readonly number[] | null;
}

/** 计算旧客户端成长预览所需的两份已集中打包的原配置。 */
type AttributeKey = "atk" | "hp" | "def" | "spd";
type HeroPreviewBase = { readonly type: number; readonly star: number } & Readonly<Record<AttributeKey, number>>;
type HeroPreviewRate = { readonly hero_id: number; readonly grade: number }
    & Readonly<Record<`${AttributeKey}_rate` | `${AttributeKey}_grow`, number>>;

/** 页面查询静态配方和真实名册，不创建另一套升星业务。 */
export class HeroCreationUtils {
    /** 本工具不持有玩家状态或配置缓存。 */
    private constructor() {}

    /** 旧法阵允许任意未被其他行选中的同模板、同初始星级实例作为本体，升星后保留其等级和装备。 */
    public static bases(templateId: number, star: number, roster: readonly OwnedHero[],
        used: readonly string[]): readonly OwnedHero[] {
        return roster.filter(hero => hero.templateId === templateId && hero.star === star && !used.includes(hero.id));
    }

    /** 只列 kind 1 且有基础升星配方的模板，按已齐料、备料数、初始星级和模板编号排列。 */
    public static options(roster: readonly OwnedHero[], quantity: (itemId: number) => number,
        config = GameConfig.instance): HeroCreationOption[] {
        const options: HeroCreationOption[] = [];
        for (const template of config.getConfig(GConfig.HeroType)) {
            if (template.kind !== 1 || !template.star) {
                continue;
            }
            const face = HeroCatalog.find(template.type, config);
            const recipe = face && HeroStarUtils.recipe({ templateId: template.type, star: template.star }, config);
            if (!face || !recipe) {
                continue;
            }
            const base = this.bases(template.type, template.star, roster, [])[0];
            const occupied = base ? [base.id] : [];
            const remaining = new Map<number, number>();
            for (const cost of recipe.costs) {
                remaining.set(cost.itemId, quantity(cost.itemId) - cost.quantity);
            }
            let available = base ? 1 : 0;
            let required = 1;
            for (const row of recipe.rows) {
                const selected = HeroStarUtils.candidates({ templateId: template.type, id: base?.id }, row,
                    roster, occupied, config).slice(0, row.count);
                occupied.push(...selected.map(hero => hero.id));
                const itemId = row.replacementItemId;
                const stock = itemId ? Math.max(0, remaining.get(itemId) ?? quantity(itemId)) : 0;
                const replacement = Math.min(row.count - selected.length, stock);
                if (itemId) {
                    remaining.set(itemId, stock - replacement);
                }
                available += selected.length + replacement;
                required += row.count;
            }
            options.push({ face, recipe, available, required,
                ready: available === required && recipe.costs.every(cost => quantity(cost.itemId) >= cost.quantity) });
        }
        return options.sort((left, right) => Number(right.ready) - Number(left.ready)
            || right.available - left.available || left.recipe.fromStar - right.recipe.fromStar
            || right.face.templateId - left.face.templateId);
    }

    /** 用旧版公式显示下一星满级的攻击、生命、防御和速度，缺成长配置时留空。 */
    public static preview(option: HeroCreationOption, config = GameConfig.instance): HeroCreationPreview {
        const level = config.requireConfig(GConfig.HeroStar, option.recipe.toStar).level_limit;
        const grade = config.getConfig(GConfig.HeroUpgrade).filter(row => row.level <= level)
            .reduce((latest, row) => Math.max(latest, row.grade), 0);
        const earlier = config.getConfig(GConfig.HeroUpgrade, grade - 1)?.level ?? 1;
        const base = (config.getFileByPath("config/herobase") as { rows: readonly HeroPreviewBase[] } | null)?.rows
            .find(row => row.type === option.face.templateId && row.star === option.recipe.toStar);
        const rates = (config.getFileByPath("config/heroupgraderate") as { rows: readonly HeroPreviewRate[] } | null)?.rows
            .find(row => row.hero_id === option.face.templateId && row.grade === grade);
        const keys: readonly AttributeKey[] = ["atk", "hp", "def", "spd"];
        return { level, stage: grade, attributes: base && rates
            ? keys.map(key => Math.floor(base[key] * (rates[`${key}_rate`] + (level - earlier) * rates[`${key}_grow`]) / 10000))
            : null };
    }

    /** 显示确认时的真实固定费用和各行替代缺口，同一消耗品合并核算。 */
    public static payable(recipe: HeroStarRecipe, rows: readonly { row: number; heroIds: readonly string[];
        useReplacement: boolean }[], quantity: (itemId: number) => number): boolean {
        const costs = new Map(recipe.costs.map(cost => [cost.itemId, cost.quantity]));
        for (const requirement of recipe.rows) {
            const selection = rows.find(row => row.row === requirement.row);
            const missing = requirement.count - (selection?.heroIds.length ?? 0);
            if (missing === 0) {
                continue;
            }
            if (missing < 0 || !selection?.useReplacement || !requirement.replacementItemId) {
                return false;
            }
            const item = requirement.replacementItemId;
            costs.set(item, (costs.get(item) ?? 0) + missing);
        }
        return [...costs].every(([itemId, count]) => quantity(itemId) >= count);
    }

    /** 固定费用显示原物品名及当前持有量，材料替代道具在对应格显示。 */
    public static costText(recipe: HeroStarRecipe, quantity: (itemId: number) => number): string {
        return recipe.costs.map(cost => {
            const face = BagItemCatalog.face(cost.itemId, 1);
            return `${face.title} ${quantity(cost.itemId)}/${cost.quantity}`;
        }).join("　");
    }
}
