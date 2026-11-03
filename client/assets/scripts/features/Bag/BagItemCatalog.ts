/** 背包显示投影：读取已校验配置，生成分类、文案与图标，不保存角色库存。 */
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { ItemIconById } from "../../framework/assets/IconCatalog";
import type { ItemRow, LanguageRow } from "../../config/GConfig";
import type { BagTabKind } from "./data/BagTabKind";
import type { BagItemData, BagItemDisplayData } from "./data/BagItemData";


export class BagItemCatalog {
    /** 物品配置 ID 对应的静态配置行；构造时建立，不保存玩家数量。 */
    private items = new Map<number, ItemRow>();
    /** 语言键对应的中文文案；随当前配置快照建立。 */
    private words = new Map<number, string>();
    /** 建立当前配置快照的显示索引，兼容源表数字文本语言键。 */
    constructor(items: {
        /** 配置模块已经加载、校验的只读表格行。 */
        rows: readonly ItemRow[];
    }, language: {
        /** 配置模块已经加载、校验的只读表格行。 */
        rows: readonly LanguageRow[];
    }) {
        for (const row of items.rows)
            if (typeof row.idx === "number")
                this.items.set(row.idx, row);
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
    sortForTab(items: readonly BagItemData[], tab: BagTabKind): readonly BagItemData[] {
        if (tab !== "item") return items;
        return items.map((item, index) => ({ item, index, weight: this.items.get(item.itemId)?.sort ?? 0 }))
            .sort((a, b) => b.weight - a.weight || a.index - b.index)
            .map(entry => entry.item);
    }

    /** 按源表 place 决定标签及可见性；type 是效用类型，不能用来推断背包分类。缺图使用已登记占位图。 */
    face(id: number, quantity: number): BagItemDisplayData {
        const row = this.items.get(id);
        const place = row?.place;
        const category: BagTabKind = place === 1 ? "equip" : place === 3 ? "shard" : place === 4 ? "spirit" : "item";
        const name = this.words.get(Number(row?.name)) || "未知道具（" + id + "）";
        const icon = ItemIconById[id]?.path || ResourceCatalog.bag.backpack_spr_default.path;
        const rare = typeof row?.rare_mark === "number" ? Math.min(6, Math.max(0, row.rare_mark)) : 0;
        const description = (this.words.get(Number(row?.content)) || "道具说明尚未配置").replace(/<[^>]+>/g, "").replace(/\\n/g, "\n");
        return { title: name, typeLine: `数量：${quantity}`, body: description, icon,
            fallback: ResourceCatalog.bag.backpack_spr_default.path, frame: [ResourceCatalog.common.other_rare_0, ResourceCatalog.common.other_rare_1, ResourceCatalog.common.other_rare_2, ResourceCatalog.common.other_rare_3, ResourceCatalog.common.other_rare_4, ResourceCatalog.common.other_rare_5, ResourceCatalog.common.other_rare_6][rare].path,
            category, hiddenInBag: place === 0 };
    }
}
