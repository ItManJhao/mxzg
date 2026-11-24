/**
 * 神装统一快照的只读校验与详情页投影。
 * 实例身份、已穿关系、词条、属性和门槛取服务端，探宝文案使用集中加载的配置。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import type { OwnedHero } from "../data/HeroSnapshotUtils";

/** 实例随机词条，仅用于展示已真实生成的编号与等级。 */
interface GodEquipmentModifier {
    readonly type: number;
    readonly level: number;
}

/** 服务器计算的属性编号及原始数值，百分比为万分数。 */
interface GodEquipmentAttribute {
    readonly type: number;
    readonly value: number;
}

/** 一件持久神装始终独立，未装配时没有 heroId。 */
export interface GodEquipmentItem {
    readonly instanceId: string;
    readonly templateId: number;
    readonly slot: number;
    readonly heroId?: string;
    readonly modifiers: readonly GodEquipmentModifier[];
    readonly attributes: readonly GodEquipmentAttribute[];
    readonly star: number;
    readonly quality: number;
}

/** 登录、恢复和 state.changed 含有的完整神装库存与当前门槛。 */
export interface HeroGodEquipmentState {
    readonly requiredRoleLevel: number;
    readonly requiredWorldLevel: number;
    readonly requiredHeroStar: number;
    readonly worldLevel: number;
    readonly items: readonly GodEquipmentItem[];
    readonly drawCount: number;
    readonly freeDraw: boolean;
    readonly shop?: GodEquipmentShopState;
}

/** 同一神装快照中的日周期和已购买数量。 */
export interface GodEquipmentShopState {
    readonly resetAt: number;
    readonly purchases: readonly { readonly productId: number; readonly purchased: number }[];
}

/** 点击前展示的券或钻石用量，最终扣费由服务端确定。 */
export interface GodEquipmentDrawPrice {
    readonly ticket: number;
    readonly quantity: number;
    readonly diamonds: number;
}

export class HeroGodEquipmentUtils {
    /** 神装、英雄身份全部统一使用字符串 UUID。 */
    private static readonly uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
    /** 只提供静态投影，不持有玩家或会话副本。 */
    private constructor() {
    }

    /** 旧快照缺少字段时保留未同步，已同步的格式错误按完整资产快照拒绝。 */
    public static read(value: unknown, heroIds?: ReadonlySet<string>): HeroGodEquipmentState | undefined {
        if (value === undefined) {
            return undefined;
        }
        const state = this.object(value);
        if (!Array.isArray(state.items) || typeof state.freeDraw !== "boolean") {
            throw new Error("神装库存和探宝状态无效");
        }
        const ids = new Set<string>();
        const wornSlots = new Set<string>();
        const items = state.items.map(raw => {
            const item = this.item(raw);
            if (ids.has(item.instanceId)) {
                throw new Error("神装实例重复：" + item.instanceId);
            }
            ids.add(item.instanceId);
            if (item.heroId) {
                const key = item.heroId + ":" + item.slot;
                if (wornSlots.has(key) || heroIds && !heroIds.has(item.heroId)) {
                    throw new Error("神装穿戴关系无效：" + key);
                }
                wornSlots.add(key);
            }
            return item;
        });
        return Object.freeze({
            requiredRoleLevel: this.number(state.requiredRoleLevel, 1),
            requiredWorldLevel: this.number(state.requiredWorldLevel, 1),
            requiredHeroStar: this.number(state.requiredHeroStar, 1),
            worldLevel: this.number(state.worldLevel, 1),
            drawCount: this.number(state.drawCount, 0),
            freeDraw: state.freeDraw,
            items: Object.freeze(items),
            shop: state.shop === undefined ? undefined : this.readShop(state.shop),
        });
    }

    /** 商店周期和已购买次数须完整有效，重复商品不能覆盖。 */
    private static readShop(value: unknown): GodEquipmentShopState {
        const raw = this.object(value);
        if (!Array.isArray(raw.purchases)) {
            throw new Error("神装商店购买次数无效");
        }
        const seen = new Set<number>();
        const purchases = raw.purchases.map(value => {
            const row = this.object(value);
            const productId = this.number(row.productId, 1);
            const purchased = this.number(row.purchased, 1);
            if (seen.has(productId)) {
                throw new Error("神装商店快照商品重复：" + productId);
            }
            seen.add(productId);
            return Object.freeze({ productId, purchased });
        });
        return Object.freeze({ resetAt: this.number(raw.resetAt, 1), purchases: Object.freeze(purchases) });
    }

    /** 读取本英雄在当前真实神装槽位中已穿的物品。 */
    public static worn(state: HeroGodEquipmentState | undefined, heroId: string, slot: number): GodEquipmentItem | undefined {
        return state?.items.find(item => item.heroId === heroId && item.slot === slot);
    }

    /** 从已同步库存取未穿且同部位的实例，沿旧窗按神装模板编号降序。 */
    public static candidates(state: HeroGodEquipmentState | undefined, slot: number): readonly GodEquipmentItem[] {
        return state?.items.filter(item => item.heroId === undefined && item.slot === slot)
            .sort((left, right) => right.templateId - left.templateId || left.instanceId.localeCompare(right.instanceId)) ?? [];
    }

    /** 解锁后只提醒有同部位未穿实例的空槽，已穿槽位沿用旧版不提示换装的表现。 */
    public static reminderSlots(state: HeroGodEquipmentState | undefined, hero: Pick<OwnedHero, "id" | "star">,
        roleLevel: number): readonly number[] {
        if (!state || this.gate(state, roleLevel, hero.star) !== null) {
            return [];
        }
        const vacant = new Set(state.items.filter(item => item.heroId === undefined).map(item => item.slot));
        for (const item of state.items) {
            if (item.heroId === hero.id) {
                vacant.delete(item.slot);
            }
        }
        return Array.from(vacant);
    }

    /** 角色与世界等级限制探宝和穿戴，星级只限制穿戴。 */
    public static gate(state: HeroGodEquipmentState, roleLevel: number, star?: number): string | null {
        if (roleLevel < state.requiredRoleLevel) {
            return `角色达到 ${state.requiredRoleLevel} 级解锁`;
        }
        if (state.worldLevel < state.requiredWorldLevel) {
            return `世界等级达到 ${state.requiredWorldLevel} 解锁`;
        }
        if (star !== undefined && star < state.requiredHeroStar) {
            return `英雄达到 ${state.requiredHeroStar} 星可穿戴`;
        }
        return null;
    }

    /** 使用集中加载的旧 system 表计算支付提示，免费仅适用于本次单抽。 */
    public static drawPrice(count: 1 | 10, tickets: number, state: HeroGodEquipmentState,
                            config = GameConfig.instance): GodEquipmentDrawPrice | null {
        const system = config.getFileByPath("config/system") as {
            rows?: readonly { key: string; value: unknown }[];
        } | null;
        const suffix = count === 1 ? "one" : "ten";
        const ticket = this.cost(system?.rows?.find(row => row.key === `god_equipment_lottery_${suffix}_item`)?.value);
        const diamonds = this.cost(system?.rows?.find(row => row.key === `god_equipment_lottery_${suffix}_gem`)?.value);
        if (!ticket || diamonds?.item_type !== 900002) {
            return null;
        }
        if (count === 1 && state.freeDraw) {
            return { ticket: ticket.item_type, quantity: 0, diamonds: 0 };
        }
        return tickets >= ticket.item_num
            ? { ticket: ticket.item_type, quantity: ticket.item_num, diamonds: 0 }
            : { ticket: ticket.item_type, quantity: 0, diamonds: diamonds.item_num };
    }

    /** 生成旧版语言属性行，供真实实例、图鉴模板和套装展示。 */
    public static attributeText(item: Pick<GodEquipmentItem, "attributes">, config = GameConfig.instance): string {
        return item.attributes.map(attribute => {
            const name = config.getConfig(GConfig.Language, 2150000 + attribute.type)?.value ?? String(attribute.type);
            const template = config.getConfig(GConfig.Language, 2160000 + attribute.type)?.value;
            const value = template?.includes("##p##")
                ? template.replace("##p##", (attribute.value / 100).toFixed(1))
                : String(attribute.value);
            return `${name} ${value}`;
        }).join("  ");
    }

    /** 读取指定支付行，缺失时由界面禁用报价。 */
    private static cost(raw: unknown): { item_type: number; item_num: number } | null {
        if (typeof raw !== "string") {
            return null;
        }
        const [cost] = JSON.parse(raw) as { item_type: number; item_num: number }[];
        return cost ?? null;
    }

    /** 校验一个独立实例和穿戴引用，保留原属性顺序。 */
    private static item(value: unknown): GodEquipmentItem {
        const raw = this.object(value);
        const slot = this.number(raw.slot, 1);
        const quality = this.number(raw.quality, 2);
        const modifierTypes = new Set<number>();
        if (slot > 4 || quality > 4 || !Array.isArray(raw.modifiers) || !Array.isArray(raw.attributes)
            || raw.modifiers.length !== quality - 2 || raw.attributes.length === 0) {
            throw new Error("神装部位、品质或属性格式无效");
        }
        const modifiers = raw.modifiers.map(value => {
            const modifier = this.object(value);
            const type = this.number(modifier.type, 1);
            if (modifierTypes.has(type)) {
                throw new Error("神装随机属性重复：" + type);
            }
            modifierTypes.add(type);
            return Object.freeze({ type, level: this.number(modifier.level, 1) });
        });
        const attributes = raw.attributes.map(value => {
            const attribute = this.object(value);
            return Object.freeze({ type: this.number(attribute.type, 1), value: this.number(attribute.value) });
        });
        return Object.freeze({
            instanceId: this.identity(raw.instanceId),
            templateId: this.number(raw.templateId, 1),
            heroId: raw.heroId === undefined ? undefined : this.identity(raw.heroId),
            slot,
            star: this.number(raw.star, 1),
            quality,
            modifiers: Object.freeze(modifiers),
            attributes: Object.freeze(attributes),
        });
    }

    /** 允许协议提供的有符号安全整数，门槛可另外指定最小值。 */
    private static number(value: unknown, min = Number.MIN_SAFE_INTEGER): number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) {
            throw new Error("神装数值无效");
        }
        return value;
    }

    /** 校验持久字符串身份，拒绝把模板编号误认成装备实例。 */
    private static identity(value: unknown): string {
        if (typeof value !== "string" || !this.uuid.test(value)) {
            throw new Error("神装实例身份无效");
        }
        return value;
    }

    /** 按普通消息对象形状读取字段。 */
    private static object(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("神装数据格式无效");
        }
        return value as Record<string, unknown>;
    }
}
