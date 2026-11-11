/** 背包显示投影：读取已校验配置，生成分类、文案与图标，不保存角色库存。 */
import { ResManager } from "../../../framework/assets/ResManager";
import type { ItemRow, LanguageRow, TimeLimitItemRow } from "../../../config/GConfig";
import type { BagTabKind } from "../data/BagTabKind";
import type { BagItemData, BagItemDisplayData, BagListItem, BagTimedItem } from "../data/BagItemData";


export class BagItemCatalog {
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

    /** 物品配置 ID 对应的静态配置行；构造时建立，不保存玩家数量。 */
    private items = new Map<number, ItemRow>();
    /** 语言键对应的中文文案；随当前配置快照建立。 */
    private words = new Map<number, string>();
    /** 期限规则索引，只存配置，实际到期时刻必须来自服务器。 */
    private timed = new Map<number, TimeLimitItemRow>();
    /** 建立当前配置快照的显示索引，兼容源表数字文本语言键。 */
    constructor(items: {
        /** 配置模块已经加载、校验的只读表格行。 */
        rows: readonly ItemRow[];
    }, language: {
        /** 配置模块已经加载、校验的只读表格行。 */
        rows: readonly LanguageRow[];
    }, timeLimits: { rows: readonly TimeLimitItemRow[] } = { rows: [] }) {
        for (const row of items.rows)
            if (typeof row.idx === "number")
                this.items.set(row.idx, row);
        for (const row of timeLimits.rows) {
            if (!Number.isSafeInteger(row.item_id) || row.item_id <= 0 || !Number.isSafeInteger(row.valid_time) || row.valid_time <= 0 || !this.items.has(row.item_id) || this.timed.has(row.item_id)) throw new Error("期限配置无效：" + row.item_id);
            this.timed.set(row.item_id, row);
        }
        for (const row of language.rows)
            if (Number.isFinite(Number(row.key)) && typeof row.value === "string")
                this.words.set(Number(row.key), row.value);
    }
    /** 读取店员欢迎语，语言键缺失时使用中文兜底。 */
    get greeting(): string { return this.words.get(5788) || "欢迎光临～"; }
    /**
     * 普通道具按旧 BackpackData.getItemsByPageSign 的 item.sort 降序排列。
     * 只排序副本，不改变服务器库存；同权重保持输入顺序，旧 Lua 未定义次序。
     * 其他分类需要各自的实例/装备数据，暂保留原顺序，不能套用道具规则。
     */
    sortForTab<T extends BagItemData>(items: readonly T[], tab: BagTabKind): readonly T[] {
        if (tab !== "item") return items;
        return items.map((item, index) => ({ item, index, weight: this.items.get(item.itemId)?.sort ?? 0 }))
            .sort((a, b) => b.weight - a.weight || a.index - b.index)
            .map(entry => entry.item);
    }

    /** 合并显示投影而非库存：期限实例仅放道具页，每件一格，已过期只隐藏不删除 Model。 */
    list(items: readonly BagItemData[], timedItems: readonly BagTimedItem[], tab: BagTabKind, now: number | null): readonly BagListItem[] {
        const rows: BagListItem[] = items.filter(item => {
            const face = this.face(item.itemId, item.quantity); return !face.hiddenInBag && face.category === tab;
        }).map(item => ({ ...item, key: "stack:" + (item.instanceId || item.itemId) }));
        if (tab === "item" && now !== null) for (const item of timedItems) {
            if (!this.timed.has(item.itemId)) throw new Error("期限道具缺少配置：" + item.itemId);
            if (item.expiresAtSeconds > now) rows.push({ itemId: item.itemId, instanceId: item.instanceId, quantity: 1, key: "timed:" + item.instanceId, expiresAtSeconds: item.expiresAtSeconds });
        }
        return this.sortForTab(rows, tab);
    }
    /** 按源表 place 决定标签及可见性；type 是效用类型，不能用来推断背包分类。缺图使用已登记占位图。 */
    face(id: number, quantity: number): BagItemDisplayData {
        const row = this.items.get(id);
        const place = row?.place;
        const category: BagTabKind = place === 1 ? "equip" : place === 3 ? "shard" : place === 4 ? "spirit" : "item";
        const name = this.words.get(Number(row?.name)) || "未知道具（" + id + "）";
        const icon = BagItemCatalog.iconSource(row) || ResManager.ui("common", "backpack_spr-default");
        const rare = typeof row?.rare_mark === "number" ? Math.min(6, Math.max(0, row.rare_mark)) : 0;
        const description = (this.words.get(Number(row?.content)) || "道具说明尚未配置").replace(/<[^>]+>/g, "").replace(/\\n/g, "\n");
        return {
            title: name,
            typeLine: `数量：${quantity}`,
            body: description,
            icon,
            fallback: ResManager.ui("common", "backpack_spr-default"),
            frame: ResManager.qualityFrame(rare),
            category,
            hiddenInBag: place === 0
        };
    }
}
