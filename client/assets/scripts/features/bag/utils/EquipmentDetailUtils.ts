/**
 * 普通装备只读详情投影：直接查询唯一GameConfig中的装备、评分、套装、属性图标及语言配置。
 * 由背包专用详情调用，仅计算配置级基础属性和旧背包的空穿戴套装展示，不推断玩家穿戴或写资产。
 * 配置缺失时按具体物品限频记录并返回null，调用方据此提示不可展示，不用零值补齐。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig, ItemRow } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "./BagItemCatalog";

/** 一条可读属性；数值格式保留旧基础属性和套装各自口径。 */
export interface EquipmentDetailAttribute {
    /** 旧属性编号，供测试追溯真实配置。 */
    readonly id: number;
    /** 语言表2150000加属性编号对应的名称。 */
    readonly name: string;
    /** 基础属性为原始数值，套装百分比按旧模板保留一位小数。 */
    readonly value: string;
    /** 通过attrshow.icon定位的原属性图片逻辑地址。 */
    readonly icon: string;
}

/** 一个套装激活阈值的只读说明。 */
export interface EquipmentDetailSetBonus {
    /** 激活所需件数，当前同源配置为2、3、4。 */
    readonly required: number;
    /** 旧版“(N件启动)”文案；不表示当前角色已激活。 */
    readonly condition: string;
    /** 当前配置每档一条，结构保留真实属性数组。 */
    readonly attributes: readonly EquipmentDetailAttribute[];
}

/** 旧背包打开装备详情时传空穿戴列表，因此套装计数固定为0/4。 */
export interface EquipmentDetailSet {
    /** 套装语言名称，不混入装备数量。 */
    readonly name: string;
    /** 旧背包空穿戴上下文的套装件数，不从英雄装备猜取。 */
    readonly count: 0;
    /** 旧普通装备套装最多四件。 */
    readonly total: 4;
    /** 按所需件数排列的真实套装属性。 */
    readonly bonuses: readonly EquipmentDetailSetBonus[];
}

/** 只读详情一次生成的完整展示数据，没有玩家能力或资产写状态。 */
export interface EquipmentDetail {
    /** 普通装备配置ID，不是持久库存实例ID。 */
    readonly itemId: number;
    /** 装备名称按旧equipment_type语言键读取。 */
    readonly name: string;
    /** 旧类型前缀及武器/头盔/铠甲/鞋子名称。 */
    readonly typeLine: string;
    /** 真实物品配置的动态图标地址。 */
    readonly icon: string;
    /** 真实装备品质1至6，标题底图和文字样式由页面选择。 */
    readonly rarity: number;
    /** 真实装备星级1至6，不按数量猜测。 */
    readonly star: number;
    /** 逐条向上取整后合计的旧装备评分。 */
    readonly score: number;
    /** 旧equipment_type加100000语言键对应的说明。 */
    readonly description: string;
    /** 按scorecount.idx排序的基础属性，不合并后重新计算评分。 */
    readonly attributes: readonly EquipmentDetailAttribute[];
    /** 没有套装时为null，页面隐藏整段而不是展示0值套装。 */
    readonly set: EquipmentDetailSet | null;
}

/** 原始属性仅在一次投影期间使用，保留配置数组顺序及逐条评分边界。 */
interface EquipmentRawAttribute {
    /** 源配置属性编号。 */
    readonly id: number;
    /** 源配置原始属性值。 */
    readonly value: number;
}

/** 无状态装备显示工具，不保存角色、请求或可变缓存。 */
export class EquipmentDetailUtils {
    /** 仅提供显式静态投影方法，不创建工具实例。 */
    private constructor() {
    }

    /**
     * 生成普通装备详情；非mode=1不适用本详情，缺少真实显示配置同样返回null并记录原因。
     * @param itemId 服务器库存中的配置ID，不能传库存实例ID。
     * @param config 已安装的唯一配置仓库；独立规则检查可传隔离仓库，不传整表副本。
     */
    public static read(itemId: number, config: GameConfig = GameConfig.instance): EquipmentDetail | null {
        const item = config.getConfig(GConfig.Item, itemId);
        if (item?.mode !== 1) {
            return null;
        }
        try {
            return EquipmentDetailUtils.build(item, config);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            GameLog.shared.warnOnce("MODULE", "EquipmentDetailUtils", "EQUIPMENT_DISPLAY_MISSING:" + itemId + ":" + reason,
                "普通装备详情不可展示：itemId=" + itemId + "；" + reason);
            return null;
        }
    }

    /** 核对完整配置后一次构造投影；任何缺口都中止，不生成部分属性或默认评分。 */
    private static build(item: ItemRow, config: GameConfig): EquipmentDetail {
        const equipment = config.getConfig(GConfig.EquipmentType, item.idx);
        if (!equipment || !Number.isSafeInteger(equipment.rare) || equipment.rare < 1 || equipment.rare > 6
            || !Number.isSafeInteger(equipment.star) || equipment.star < 1 || equipment.star > 6
            || !Number.isSafeInteger(equipment.place) || equipment.place < 1 || equipment.place > 4
            || !Number.isSafeInteger(equipment.set_type) || Number(equipment.set_type) < 0) {
            throw new Error("equipmenttype缺行或品质、星级、位置、套装类型无效");
        }
        const raw = EquipmentDetailUtils.readAttributes(equipment.ability, "equipmenttype.ability");
        if (!raw.length) {
            throw new Error("equipmenttype.ability缺少基础属性");
        }
        const scores = config.getConfig(GConfig.ScoreCount);
        if (!scores.length) {
            throw new Error("scorecount整表未准备或为空");
        }
        // ScoreCount主键是idx，属性对应mapping；不能把属性编号当主键查询或另存页面映射。
        for (let index = 0; index < scores.length; index++) {
            const row = scores[index];
            if (!Number.isSafeInteger(row.mapping) || !Number.isSafeInteger(row.idx) || !Number.isFinite(row.ratio)
                || scores.findIndex(candidate => candidate.mapping === row.mapping) !== index) {
                throw new Error("scorecount映射重复或无效");
            }
        }
        const score = raw.reduce((sum, attribute) => {
            const ratio = scores.find(row => row.mapping === attribute.id)?.ratio;
            // 沿旧Lua先除10000再乘属性；不能交换浮点求值顺序后改变ceil边界。
            // 无评分映射的合法属性按旧代码贡献0，显示仍需完整属性名称和图标。
            return sum + (ratio === undefined ? 0 : Math.ceil(attribute.value * (ratio / 10000)));
        }, 0);
        const sorted = raw.map((attribute, order) => ({ attribute, order }))
            .sort((left, right) => (scores.find(row => row.mapping === left.attribute.id)?.idx ?? 100)
                - (scores.find(row => row.mapping === right.attribute.id)?.idx ?? 100)
                || left.order - right.order);
        const icon = BagItemCatalog.iconSource(item);
        if (!icon || !Number.isSafeInteger(score)) {
            throw new Error("物品图标格式或装备评分无效");
        }
        return {
            itemId: item.idx,
            name: EquipmentDetailUtils.word(config, item.idx),
            typeLine: EquipmentDetailUtils.word(config, 47086) + EquipmentDetailUtils.word(config, 50 + equipment.place),
            icon,
            rarity: equipment.rare,
            star: equipment.star,
            score,
            description: EquipmentDetailUtils.plainText(EquipmentDetailUtils.word(config, item.idx + 100000)),
            attributes: sorted.map(row => EquipmentDetailUtils.displayAttribute(row.attribute, config, false)),
            set: Number(equipment.set_type) === 0 ? null
                : EquipmentDetailUtils.setDetail(Number(equipment.set_type), config),
        };
    }

    /** 按旧2/3/4件顺序取套装配置，固定空穿戴计数；缺失某档不伪造激活属性。 */
    private static setDetail(type: number, config: GameConfig): EquipmentDetailSet {
        const rows = config.getConfig(GConfig.EquipmentSetType).filter(row => row.type === String(type));
        const bonuses: EquipmentDetailSetBonus[] = [];
        for (let required = 2; required <= 4; required++) {
            const matches = rows.filter(row => row.num === required);
            if (matches.length !== 1) {
                throw new Error("equipmentsettype缺少唯一套装档位：" + type + "/" + required);
            }
            const raw = EquipmentDetailUtils.readAttributes(matches[0].attr, "equipmentsettype.attr");
            if (!raw.length) {
                throw new Error("equipmentsettype.attr为空：" + type + "/" + required);
            }
            bonuses.push({
                required,
                condition: "(" + required + EquipmentDetailUtils.word(config, 47200),
                attributes: raw.map(row => EquipmentDetailUtils.displayAttribute(row, config, true)),
            });
        }
        return { name: EquipmentDetailUtils.word(config, type), count: 0, total: 4, bonuses };
    }

    /** 将原始单属性JSON数组解析为有序条目；保持重复条目，评分必须先逐条ceil再相加。 */
    private static readAttributes(text: string, source: string): readonly EquipmentRawAttribute[] {
        const rows: unknown = JSON.parse(text);
        if (!Array.isArray(rows)) {
            throw new Error(source + "不是属性数组");
        }
        return rows.map(row => {
            if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).length !== 1) {
                throw new Error(source + "属性行无效");
            }
            const [key] = Object.keys(row);
            const id = Number(key);
            const value: unknown = (row as Record<string, unknown>)[key];
            if (!Number.isSafeInteger(id) || id <= 0 || typeof value !== "number" || !Number.isFinite(value)) {
                throw new Error(source + "属性编号或数值无效");
            }
            return { id, value };
        });
    }

    /** 使用真实属性名称和attrshow图标；套装数值按2160000语言模板，基础数值保持旧原值。 */
    private static displayAttribute(attribute: EquipmentRawAttribute, config: GameConfig,
        formatted: boolean): EquipmentDetailAttribute {
        const show = config.getConfig(GConfig.AttributeShow, attribute.id);
        if (!show || !Number.isSafeInteger(show.icon) || show.icon <= 0) {
            throw new Error("attrshow图标配置缺失：" + attribute.id);
        }
        return {
            id: attribute.id,
            name: EquipmentDetailUtils.word(config, 2150000 + attribute.id),
            value: formatted ? EquipmentDetailUtils.formatValue(EquipmentDetailUtils.word(config, 2160000 + attribute.id), attribute.value)
                : String(attribute.value),
            icon: ResManager.ui("bag", "backpack-info_spr-attr-" + show.icon),
        };
    }

    /** 复用旧StringUtil的##p##万分值展示：除100、保留一位小数；没有模板标记时按原整数格式。 */
    private static formatValue(template: string, value: number): string {
        if (template.includes("##")) {
            const formatted = template.replace(/##([^#]+)##/g,
                (_match, key: string) => key === "p" ? (value / 100).toFixed(1) : String(value));
            if (formatted.includes("##")) {
                throw new Error("套装属性数值模板不完整：" + template);
            }
            return formatted;
        }
        const formatted = template.replace(/%d/g, String(Math.trunc(value)));
        if (/%[-+.\d]*[a-z]/i.test(formatted)) {
            throw new Error("套装属性数值模板尚未支持：" + template);
        }
        return formatted;
    }

    /** 必需语言行不存在时中止展示，不拿物品ID或零值冒充已恢复文案。 */
    private static word(config: GameConfig, key: number): string {
        const text = config.getConfig(GConfig.Language, key)?.value;
        if (typeof text !== "string" || !text.trim()) {
            throw new Error("语言配置缺失：" + key);
        }
        return text;
    }

    /** 去除旧富文本标签并还原换行，正文使用Prefab普通Label，不执行旧标记。 */
    private static plainText(value: string): string {
        return value.replace(/<[^>]+>/g, "").replace(/\\n/g, "\n");
    }
}
