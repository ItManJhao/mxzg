/**
 * 宝石统一快照校验与只读展示。槽位选择、套装提示及合成数量统一读取配置包和真实背包。
 * 不写镶嵌、库存或属性，所有变更由服务端提交。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import type { BagItemData } from "../../bag/data/BagItemDataUtils";

/** 服务器最新快照中的已镶宝石。模板 ID 不等于持久槽位记录。 */
export interface HeroJewel {
    /** 已镶嵌关系的字符串 ID，换装时保留。 */
    readonly instanceId: string;
    /** 道具及宝石配置 ID。 */
    readonly templateId: number;
    /** 宝石槽位 1 至 3。 */
    readonly slot: number;
}

/** 配置属性的编号和原始值，百分比值按万分数计。 */
interface JewelAttribute {
    readonly attr: number;
    readonly value: number;
}

/** 合成一枚所需的普通库存类型与正整数个数。 */
interface JewelIngredient {
    readonly itemId: number;
    readonly quantity: number;
}

/** 宝石定义由同源策划工具生成，客户端只用于界面。 */
export interface HeroJewelDefinition {
    readonly itemId: number;
    readonly slot: number;
    readonly star: number;
    readonly rarity: number;
    readonly recipe: readonly JewelIngredient[];
    readonly attributes: readonly JewelAttribute[];
    readonly fighting: readonly JewelAttribute[];
}

/** 套装说明与同英雄当前已达到该档位的槽位数。 */
export interface HeroJewelSetProgress {
    /** 本档要求的最低宝石星级。 */
    readonly star: number;
    /** 达到本档的实际镶嵌槽数量。 */
    readonly count: number;
    /** 保留原始属性单位，供展示工具格式化。 */
    readonly attributes: readonly JewelAttribute[];
}

/** 配置包内直接索引的宝石投影。 */
interface JewelConfig {
    readonly slotStars: readonly { slot: number; star: number }[];
    readonly jewels: readonly HeroJewelDefinition[];
    readonly sets: readonly { star: number; attributes: readonly JewelAttribute[] }[];
}

export class HeroJewelUtils {
    /** 供包清单、前端读表和独立测试共用的逻辑路径。 */
    public static readonly configPath = "config/hero-jewels";

    /** 全部输入由调用方提供。 */
    private constructor() {}

    /** 统一快照安装先于完整配置包，因此这里只校验形状、槽位与身份。 */
    public static read(value: unknown): readonly HeroJewel[] {
        if (!Array.isArray(value) || value.length > 3) {
            throw new Error("英雄宝石槽状态无效");
        }
        const slots = new Set<number>();
        const ids = new Set<string>();
        return Object.freeze(value.map(item => {
            const { instanceId, templateId, slot } = item ?? {};
            if (typeof instanceId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(instanceId)
                || !Number.isSafeInteger(templateId) || templateId <= 0 || !Number.isSafeInteger(slot)
                || slot < 1 || slot > 3 || slots.has(slot) || ids.has(instanceId)) {
                throw new Error("英雄宝石槽位或持久身份无效");
            }
            slots.add(slot);
            ids.add(instanceId);
            return Object.freeze({ instanceId, templateId, slot });
        }));
    }

    /** 读取实际宝石规则，普通物品和未开放宝石返回 undefined。 */
    public static definition(itemId: number, config = GameConfig.instance): HeroJewelDefinition | undefined {
        return this.table(config)?.jewels.find(row => row.itemId === itemId);
    }

    /** 返回实际英雄星级门槛，配置未同步或槽非法时返回 undefined。 */
    public static requiredStar(slot: number, config = GameConfig.instance): number | undefined {
        return this.table(config)?.slotStars.find(row => row.slot === slot)?.star;
    }

    /** 候选只来自同槽正余额，已镶同模板由面板独立展示。按宝石星级从高到低排序。 */
    public static candidates(items: readonly BagItemData[], slot: number, currentTemplate?: number,
        config = GameConfig.instance): BagItemData[] {
        const definitions = new Map(this.table(config)?.jewels.filter(row => row.slot === slot)
            .map(row => [row.itemId, row.star]));
        return items.filter(item => item.quantity > 0 && item.itemId !== currentTemplate && definitions.has(item.itemId))
            .sort((a, b) => definitions.get(b.itemId)! - definitions.get(a.itemId)!);
    }

    /** 由目标现有权威配方反查下一档。攻击9星没有有效目标，生命1星的可合成目标仍生效。 */
    public static combineTarget(itemId: number, config = GameConfig.instance): HeroJewelDefinition | undefined {
        return this.table(config)?.jewels.find(row => row.recipe.some(material => material.itemId === itemId));
    }

    /** 以真实库存投影最多可合成数量，服务器仍按提交时可用库存校验。 */
    public static combineLimit(itemId: number, items: readonly BagItemData[], config = GameConfig.instance): number {
        const recipe = this.definition(itemId, config)?.recipe;
        if (!recipe?.length) {
            return 0;
        }
        return Math.min(0x7fffffff, ...recipe.map(material => {
            const stock = items.find(item => item.itemId === material.itemId)?.quantity ?? 0;
            return Math.floor(stock / material.quantity);
        }));
    }

    /** 按实际三槽显示最低星级档位；缺槽时套装仍以真实已达档位的数量展示。 */
    public static setProgress(items: readonly HeroJewel[], config = GameConfig.instance): HeroJewelSetProgress | undefined {
        const table = this.table(config);
        if (!table?.sets.length) {
            return undefined;
        }
        const equipped = new Map(items.map(item => [item.slot, this.definition(item.templateId, config)?.star ?? 0]));
        const minimum = equipped.size ? Math.min(...equipped.values()) : 0;
        const tier = table.sets.find(row => row.star === minimum) ?? table.sets[0];
        const count = [...equipped.values()].filter(star => star >= tier.star).length;
        return { star: tier.star, count, attributes: tier.attributes };
    }

    /** 沿用原语言模板的宝石属性格式；缺语言行时保留实际配置编号和数值。 */
    public static attributesText(attributes: readonly JewelAttribute[], config = GameConfig.instance): string {
        return attributes.map(({ attr, value }) => {
            const original = config.getConfig(GConfig.Language, 2141000 + attr)?.value;
            if (typeof original !== "string" || !original.includes("##")) {
                const label = config.getConfig(GConfig.Language, 2150000 + attr)?.value;
                return `${typeof label === "string" ? label : attr} +${value}`;
            }
            return original.replace(/##([^#]+)##/g, (_match, key: string) =>
                key === "p" ? `${(value / 100).toFixed(1).replace(/\.0$/, "")}%` : String(value));
        }).join("　");
    }

    /** 读取唯一配置快照，无第二份表缓存或网络请求。 */
    private static table(config: GameConfig): JewelConfig | null {
        return config.getFileByPath(this.configPath) as JewelConfig | null;
    }
}
