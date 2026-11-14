/** 背包协议条目与显示投影类型；普通库存、期限实例和精灵实例分别校验、分别保存，不将独立实例合成堆叠记录。 */
import type { BagTabKind } from "./BagTabKind";
/** 服务器库存条目，使用绝对数量；当前按物品配置 ID 聚合。 */
export interface BagItemData {
    /** 当前协议的物品配置 ID，尚非旧版独立装备实例 ID。 */
    readonly itemId: number;
    /** 稳定库存记录 ID，字符串保留精度；旧快照可缺失，不能由配置 ID 冒充。 */
    readonly instanceId?: string;
    /** 服务器确认的绝对持有数量，必须为正安全整数；数量为零时从列表移除。 */
    readonly quantity: number;
}
/** 背包快照解码工具：校验普通库存与期限实例，返回冻结数据；由统一资产入口和背包Controller调用，不持有账号或网络状态。 */
export class BagItemDataUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 校验并复制完整库存，拒绝重复 ID、非正数和不安全整数；全部成功才返回冻结列表，空数组有效，错误时抛出异常。 */
    public static readBagItems(value: unknown): readonly BagItemData[] {
        if (!Array.isArray(value)) {
            throw new Error("背包数据无效");
        }
        const seen = new Set<number>();
        const instances = new Set<string>();
        const rows = value.map(item => {
            if (item?.itemId === 2000002) {
                throw new Error("独立精灵不能放入普通堆叠库存：2000002");
            }
            if (!item || typeof item !== "object" || !Number.isSafeInteger(item.itemId) || item.itemId <= 0 ||
                !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || seen.has(item.itemId)) {
                throw new Error("背包条目无效");
            }
            if (item.instanceId !== undefined) {
                if (typeof item.instanceId !== "string" || !item.instanceId.length || item.instanceId.length > 96 || instances.has(item.instanceId)) {
                    throw new Error("库存实例 ID 无效");
                }
                instances.add(item.instanceId);
            }
            seen.add(item.itemId);
            return Object.freeze({ itemId: item.itemId as number, quantity: item.quantity as number, ...(item.instanceId === undefined ? {} : { instanceId: item.instanceId as string }) });
        });
        return Object.freeze(rows);
    }

    /** 整批校验期限快照，不合并同配置的不同实例；缺失字段代表旧协议未提供此类数据。 */
    public static readTimedItems(value: unknown): readonly BagTimedItem[] {
        if (value === undefined) {
            return Object.freeze([]);
        }
        const state = value as {
            items: unknown;
            serverTimeSeconds: number;
        };
        if (!state || !Number.isSafeInteger(state.serverTimeSeconds) || state.serverTimeSeconds < 0 || !Array.isArray(state.items)) {
            throw new Error("期限库存无效");
        }
        const seen = new Set<string>();
        return Object.freeze(state.items.map(item => {
            if (!item || typeof item.instanceId !== "string" || !item.instanceId.length || item.instanceId.length > 96 || seen.has(item.instanceId) ||
                !Number.isSafeInteger(item.itemId) || item.itemId <= 0 || !Number.isSafeInteger(item.activeAtSeconds) || item.activeAtSeconds < 0 ||
                !Number.isSafeInteger(item.expiresAtSeconds) || item.expiresAtSeconds < item.activeAtSeconds || item.expiresAtSeconds <= state.serverTimeSeconds) {
                throw new Error("期限物品无效");
            }
            seen.add(item.instanceId);
            return Object.freeze({ instanceId: item.instanceId, itemId: item.itemId, activeAtSeconds: item.activeAtSeconds, expiresAtSeconds: item.expiresAtSeconds });
        }));
    }

    /** 校验本批已恢复的精灵完整列表；缺字段是旧快照未提供，存在时版本、实例、特性和单技能必须全部有效。 */
    public static readSpiritItems(value: unknown): readonly BagSpiritItem[] {
        if (value === undefined) {
            return Object.freeze([]);
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("精灵库存无效");
        }
        const inventory = value as { schemaVersion?: unknown; items?: unknown };
        if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.items)) {
            throw new Error("精灵库存版本或列表无效");
        }
        const instances = new Set<string>();
        return Object.freeze(inventory.items.map(value => {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                throw new Error("精灵实例无效");
            }
            const item = value as Record<string, unknown>;
            if (typeof item.instanceId !== "string" || !item.instanceId.length || item.instanceId.length > 96
                || instances.has(item.instanceId) || item.itemId !== 2000002
                || !this.positiveUint32(item.abilityId) || item.abilityId > 4 || !Array.isArray(item.skills) || item.skills.length !== 1) {
                throw new Error("精灵实例、物品或特性无效");
            }
            instances.add(item.instanceId);
            const skills = item.skills.map(value => {
                if (!value || typeof value !== "object" || Array.isArray(value)) {
                    throw new Error("精灵技能无效");
                }
                const skill = value as Record<string, unknown>;
                if (skill.sort !== 1 || !this.positiveUint32(skill.skillId) || (skill.level !== 1 && skill.level !== 2)) {
                    throw new Error("精灵技能顺序、配置或等级无效");
                }
                return Object.freeze({ sort: skill.sort, skillId: skill.skillId, level: skill.level });
            });
            return Object.freeze({
                instanceId: item.instanceId,
                itemId: item.itemId,
                abilityId: item.abilityId,
                skills: Object.freeze(skills),
            });
        }));
    }

    /** 对齐协议的正uint32字段，拒绝小数、不安全整数和零，不能用缺省零冒充已生成属性。 */
    private static positiveUint32(value: unknown): value is number {
        return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 0xffffffff;
    }
}
/** 页面格子与详情共用的配置显示数据，不持有服务器资产。 */
export interface BagFace {
    /** 本地化物品名称。 */
    title: string;
    /** 调用入口的副标题；库存详情可按真实mode另取类型，奖励说明保持自己的数量语义。 */
    typeLine: string;
    /** 移除旧富文本标记后的配置说明。 */
    body: string;
    /** 同一正文的Creator富文本，保留旧颜色与换行；缺省时使用body纯文本，不携带交互链接。 */
    readonly richBody?: string;
    /** 登记在资源目录中的物品图标路径。 */
    icon: string;
    /** 主图加载失败时使用的占位图路径。 */
    fallback: string;
    /** 稀有度对应的底框资源路径。 */
    frame: string;
    /** 仅真实精英碎片携带星级与所需数；不把同页签英雄材料当碎片。 */
    readonly shard?: {
        /** 旧物品配置星级，当前精英碎片为1至5。 */
        readonly star: number;
        /** 旧use_value中的合成所需数；持有量始终由当前条目传入。 */
        readonly required: number;
    };
}
/** 静态显示数据附加分类与可见性，隐藏不等于删除库存。 */
export interface BagItemDisplayData extends BagFace {
    /** 由旧配置 place 映射的分类，不决定物品使用规则。 */
    readonly category: BagTabKind;
    /** 源配置 place=0 时仅隐藏背包格子，不丢弃库存条目或结算奖励。 */
    readonly hiddenInBag: boolean;
}
/** 期限物品每件独立，不与同配置堆叠库存合并；时间单位均为 Unix 秒。 */
export interface BagTimedItem {
    /** 服务端持久实例 ID，不转为 number。 */
    readonly instanceId: string;
    /** Item 配置 ID，用于显示名称和图标。 */
    readonly itemId: number;
    /** 服务器记录的激活时刻。 */
    readonly activeAtSeconds: number;
    /** 到达该秒即过期，回收由服务端负责。 */
    readonly expiresAtSeconds: number;
}
/** 精灵实例中已生成的单个技能，展示读取服务端持久结果，不在客户端重抽。 */
export interface BagSpiritSkill {
    /** 服务端保存的技能顺序，本批单技能位置必须为1。 */
    readonly sort: number;
    /** 已生成技能配置ID，不是图标或语言索引。 */
    readonly skillId: number;
    /** 已持久化的技能等级，本批仅1或2，只读且不提供升级。 */
    readonly level: number;
}

/** 独立精灵的完整持久投影，由BagModel唯一持有，与普通数量库存分开。 */
export interface BagSpiritItem {
    /** 持久实例ID，始终按字符串传递，同配置的不同实例不得合并。 */
    readonly instanceId: string;
    /** 本批仅恢复2000002，对应物品显示配置。 */
    readonly itemId: number;
    /** 已生成的单个特性配置ID，本批为1至4，不由客户端推断属性值。 */
    readonly abilityId: number;
    /** 已生成技能的冻结列表，本批必须恰好一个。 */
    readonly skills: readonly BagSpiritSkill[];
}

/** 格子的只读显示投影；独立实例数量固定为一，以 key 区分同配置不同实例。 */
export interface BagListItem extends BagItemData {
    /** 普通堆叠、期限与精灵各自命名空间中的稳定选中键。 */
    readonly key: string;
    /** 仅期限实例具有 Unix 秒到期值，不由配置天数重新计算。 */
    readonly expiresAtSeconds?: number;
    /** 精灵格子保留所属实例的冻结特性和技能，普通与期限格子没有此字段。 */
    readonly spirit?: BagSpiritItem;
}
