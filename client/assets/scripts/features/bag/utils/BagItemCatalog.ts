/** 背包无状态显示投影：按当前条目直接查询GameConfig，生成分类、文案与图标。
 * 配置索引只由GameConfig维护；页面不再创建Catalog或复制整表，不保存角色库存或发起资源加载。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { GameLog } from "../../../core/GameLog";
import type { ItemRow } from "../../../config/GConfig";
import type { BagTabKind } from "../data/BagTabKind";
import type { BagItemData, BagItemDisplayData, BagListItem, BagSpiritItem, BagTimedItem } from "../data/BagItemDataUtils";
import { ItemDetailUtils } from "./ItemDetailUtils";

/** 精灵详情的只读展示结果；基础属性和技能分区，不混入普通道具数量与用法。 */
export interface BagSpiritDetail {
    /** 物品同源的名称、图标及品质信息。 */
    readonly face: BagItemDisplayData;
    /** 已生成特性的中文名称；缺配置时明确提示。 */
    readonly attributeName: string;
    /** 特性配置中的真实数值；缺配置时为破折号，不填默认属性。 */
    readonly attributeValue: string;
    /** 对应旧属性编号的图片地址；缺配置时清空。 */
    readonly attributeIcon: string | null;
    /** 精确技能等级的配置名称，不额外拼接普通道具说明。 */
    readonly skillName: string;
    /** 同等级技能全文，去除旧富文本标记。 */
    readonly skillDescription: string;
    /** 同等级技能图片地址；缺配置时不借用相邻等级图标。 */
    readonly skillIcon: string | null;
}

export class BagItemCatalog {
    /** 仅提供静态显示计算，不再创建逐页面配置索引实例。 */
    private constructor() {
    }

    /** 按物品配置定位图标；允许多物品共图，未知格式返回null供页面显示占位。 */
    public static iconSource(row: Pick<ItemRow, "idx" | "icon"> | undefined): string | null {
        if (!row || !Number.isSafeInteger(row.idx) || row.idx <= 0) {
            return null;
        }
        if (typeof row.icon === "string" && row.icon.length > 0) {
            const match = /^(backpack|hero-icon)\/([A-Za-z0-9_-]+)$/.exec(row.icon);
            if (!match) {
                return null;
            }
            return match[1] === "hero-icon" ? "hero/ui/hero-icon_" + match[2]
                : ResManager.item(match[2]);
        }
        return ResManager.item(row.idx);
    }


    /**
     * 普通道具按旧 BackpackData.getItemsByPageSign 的 item.sort 降序排列。
     * 只排序副本，不改变服务器库存；同权重保持输入顺序，旧 Lua 未定义次序。
     * 其他分类需要各自的实例/装备数据，暂保留原顺序，不能套用道具规则。
     */
    public static sortForTab<T extends BagItemData>(items: readonly T[], tab: BagTabKind,
        config = GameConfig.instance): readonly T[] {
        if (tab !== "item") {
            return items;
        }
        return items.map((item, index) => ({ item, index, weight: config.getConfig(GConfig.Item, item.itemId)?.sort ?? 0 }))
            .sort((a, b) => b.weight - a.weight || a.index - b.index)
            .map(entry => entry.item);
    }

    /** 合并显示投影而非库存：期限与精灵每件一格，精灵只放精灵页，已过期只隐藏不删除Model。 */
    public static list(items: readonly BagItemData[], timedItems: readonly BagTimedItem[], tab: BagTabKind, now: number | null,
        spiritItems: readonly BagSpiritItem[] = [], config = GameConfig.instance): readonly BagListItem[] {
        const rows: BagListItem[] = items.filter(item => {
            const row = config.getConfig(GConfig.Item, item.itemId);
            return row?.place !== 0 && this.category(row?.place) === tab;
        }).map(item => ({ ...item, key: "stack:" + (item.instanceId || item.itemId) }));
        if (tab === "item" && now !== null) {
            for (const item of timedItems) {
                const rule = config.getConfig(GConfig.TimeLimitItem, item.itemId);
                if (!rule || !Number.isSafeInteger(rule.valid_time) || rule.valid_time <= 0
                    || !config.getConfig(GConfig.Item, item.itemId)) {
                    throw new Error("期限道具缺少有效配置：" + item.itemId);
                }
                if (item.expiresAtSeconds > now) {
                    rows.push({ itemId: item.itemId, instanceId: item.instanceId, quantity: 1,
                        key: "timed:" + item.instanceId, expiresAtSeconds: item.expiresAtSeconds });
                }
            }
        }
        if (tab === "spirit") {
            for (const spirit of spiritItems) {
                rows.push({ itemId: spirit.itemId, instanceId: spirit.instanceId, quantity: 1,
                    key: "spirit:" + spirit.instanceId, spirit });
            }
        }
        return this.sortForTab(rows, tab, config);
    }

    /** 从真实实例定位同源特性和精确等级技能，供专用详情分区展示；缺配置保留实例并明确提示。 */
    public static spiritDetail(spirit: BagSpiritItem, config = GameConfig.instance): BagSpiritDetail {
        const face = this.face(spirit.itemId, 1, config);
        const display = config.getConfig(GConfig.SpiritDisplay, spirit.itemId);
        const ability = display?.abilities.find(row => row.id === spirit.abilityId);
        const assigned = spirit.skills[0];
        const skill = display?.skills.find(row => row.skillId === assigned.skillId && row.level === assigned.level);
        if (!ability || !skill) {
            GameLog.shared.warnOnce("MODULE", "BagItemCatalog", "SPIRIT_DISPLAY_MISSING:" + spirit.itemId + ":"
                + spirit.abilityId + ":" + assigned.skillId + ":" + assigned.level,
            "精灵显示配置缺失：itemId=" + spirit.itemId + "，abilityId=" + spirit.abilityId
                + "，skillId=" + assigned.skillId + "，level=" + assigned.level + "；保留真实实例，只显示缺失提示");
        }
        const icon = skill && /^skill-icon\/(\d+)$/.exec(skill.icon);
        return {
            face,
            attributeName: ability?.name || "特性配置缺失（" + spirit.abilityId + "）",
            attributeValue: ability ? String(ability.value) : "—",
            attributeIcon: ability ? ResManager.ui("bag", "backpack-info_spr-attr-" + ability.attributeId) : null,
            skillName: skill?.name || "技能配置缺失",
            skillDescription: skill ? BagItemCatalog.plainText(skill.description)
                : "技能" + assigned.skillId + "，等级" + assigned.level + "的显示配置尚未恢复",
            skillIcon: icon ? ResManager.skill(Number(icon[1])) : null,
        };
    }

    /** 为只读文本用途复用同一精灵投影；实际库存入口由SpiritInfoView展示，不另维护技能映射。 */
    public static spiritFace(spirit: BagSpiritItem, config = GameConfig.instance): BagItemDisplayData {
        const detail = this.spiritDetail(spirit, config);
        const body = "特性：" + detail.attributeName + "+" + detail.attributeValue + "\n"
            + detail.skillName + " Lv." + spirit.skills[0].level + "：" + detail.skillDescription;
        return {
            ...detail.face,
            body,
            richBody: ItemDetailUtils.richText(body),
        };
    }

    /** 取旧说明的纯文本版本，br和配置转义换行保留；颜色版本由同一ItemDetailUtils转换。 */
    private static plainText(value: string): string {
        return value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\\n/g, "\n");
    }

    /** 按place决定分类、按mode附加碎片外观；数量语义由格子所属入口控制，缺图使用已有占位图。 */
    public static face(id: number, quantity: number, config = GameConfig.instance): BagItemDisplayData {
        const row = config.getConfig(GConfig.Item, id);
        const place = row?.place;
        const category = this.category(place);
        const name = row?.name === undefined ? "未知道具（" + id + "）"
            : config.getConfig(GConfig.Language, Number(row.name))?.value || "未知道具（" + id + "）";
        const icon = BagItemCatalog.iconSource(row) || ResManager.ui("common", "backpack_spr-default");
        const rare = typeof row?.rare_mark === "number" ? Math.min(6, Math.max(0, row.rare_mark)) : 0;
        const originalDescription = row?.content === undefined ? "道具说明尚未配置"
            : config.getConfig(GConfig.Language, Number(row.content))?.value || "道具说明尚未配置";
        const description = BagItemCatalog.plainText(originalDescription);
        const shard = row ? ItemDetailUtils.piece(row) : null;
        return {
            title: name,
            typeLine: `数量：${quantity}`,
            body: description,
            richBody: ItemDetailUtils.richText(originalDescription),
            icon,
            fallback: ResManager.ui("common", "backpack_spr-default"),
            frame: ResManager.qualityFrame(rare),
            category,
            hiddenInBag: place === 0,
            ...(shard ? { shard } : {})
        };
    }

    /** 将旧物品place转成背包页签；未知类型沿用普通道具分类，不创建分类索引。 */
    private static category(place: number | undefined): BagTabKind {
        return place === 1 ? "equip" : place === 3 ? "shard" : place === 4 ? "spirit" : "item";
    }
}
