/**
 * 神装图鉴和商城的策划数据投影。图鉴只读，固定货架与服务端统一快照的次数对应。
 * 商城每天上海零点更换周期，界面只以统一服务器时钟计算下一次刷新显示。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import type { MarketOffer } from "../../market/MarketModel";
import { HeroGodEquipmentUtils, type GodEquipmentShopState } from "./HeroGodEquipmentUtils";

/** 图鉴中的品质最高装备模板，属性为原模板基础值。 */
export interface GodEquipmentCatalogRow {
    readonly templateId: number;
    readonly star: number;
    readonly setType: number;
    readonly attributes: readonly { readonly type: number; readonly value: number }[];
}

/** 同源固定货架上的商品以及原套装页签。 */
export interface GodEquipmentShopProduct {
    readonly productId: number;
    readonly section: number;
    readonly itemId: number;
    readonly quantity: number;
    readonly costQuantity: number;
    readonly purchaseLimit: number;
}

/** 每档套装的实际基础属性、所需件数与旧技能编号。 */
interface GodEquipmentSetRow {
    readonly setType: number;
    readonly star: number;
    readonly count: number;
    readonly attributes: GodEquipmentCatalogRow["attributes"];
    readonly skillId: number;
}

/** 登录后唯一配置包内的图鉴和商店静态配置。 */
interface GodEquipmentCatalog {
    readonly currency: number;
    readonly equipment: readonly GodEquipmentCatalogRow[];
    readonly products: readonly GodEquipmentShopProduct[];
    readonly sets: readonly GodEquipmentSetRow[];
}

export class HeroGodEquipmentCatalogUtils {
    /** 同旧无限量购买弹窗，未设日限额时一次可选购买份数的上限。 */
    public static readonly maximumPurchase = 9999;

    /** 仅提供配置和确定性的展示推导。 */
    private constructor() {}

    /** 打开两页前加载过登录配置包，读同一个入口。 */
    public static read(): GodEquipmentCatalog | null {
        return GameConfig.instance.getFileByPath("config/hero-god-equipment-catalog") as GodEquipmentCatalog | null;
    }

    /** 原版按套装类型查语言值，图鉴和商店显示同一名称。 */
    public static setName(type: number): string {
        return GameConfig.instance.getConfig(GConfig.Language, 72400 + type)?.value ?? String(type);
    }

    /** 用已同步的上海零点锚定同日窗口。真正下单时服务端再次核对周期和购买次数。 */
    public static resetAt(state: GodEquipmentShopState, now: number | null): number {
        if (now === null) {
            return state.resetAt;
        }
        const day = 86400;
        return state.resetAt + (Math.floor((now - state.resetAt) / day) + 1) * day;
    }

    /** 将已有商城数据投影为通用购买报价，旧周期的数量用于旧报价。 */
    public static offer(product: GodEquipmentShopProduct, currency: number, purchased: number): MarketOffer {
        return { ...product, costItemId: currency, purchased, discount: 100, purchasable: true };
    }

    /** 以当前同步余额及当日剩余次数限制选择，最终价格和限购仍由服务端确认。 */
    public static maximum(offer: MarketOffer, balance: number): number {
        const stock = offer.purchaseLimit > 0 ? offer.purchaseLimit - offer.purchased : this.maximumPurchase;
        return Math.max(0, Math.min(stock, Math.floor(balance / offer.costQuantity)));
    }

    /** 只读显示真实基础属性及同星套装档位。 */
    public static describe(row: GodEquipmentCatalogRow): string {
        const set = this.read()?.sets.filter(value => value.setType === row.setType && value.star === row.star) ?? [];
        const base = HeroGodEquipmentUtils.attributeText(row);
        const bonuses = set.map(value => {
            if (value.skillId > 0) {
                const skill = GameConfig.instance.getConfig(GConfig.HeroSkill)
                    .find(entry => entry.type === value.skillId && entry.level === value.star);
                const name = skill ? GameConfig.instance.getConfig(GConfig.Language, skill.lan_name)?.value : undefined;
                if (name) {
                    return `${value.count}件：${name} Lv.${value.star}`;
                }
            }
            return `${value.count}件：${HeroGodEquipmentUtils.attributeText(value)}`;
        });
        return [base, this.setName(row.setType), ...bonuses].filter(Boolean).join("\n");
    }
}
