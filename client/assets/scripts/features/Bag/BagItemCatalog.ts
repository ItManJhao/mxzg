import type { BagTabKind } from "../../config/gameCatalog";
import type { BagItemDisplayData } from "./data/BagItemData";

type Row = Record<string, unknown>;
export class BagItemCatalog {
    private items = new Map<number, Row>();
    private words = new Map<number, string>();
    constructor(items: {
        rows: Row[];
    }, language: {
        rows: Row[];
    }) {
        for (const row of items.rows)
            if (typeof row.idx === "number")
                this.items.set(row.idx, row);
        for (const row of language.rows)
            if (typeof row.key === "number" && typeof row.value === "string")
                this.words.set(row.key, row.value);
    }
    get greeting(): string { return this.words.get(5788) || "欢迎光临～"; }
    face(id: number, quantity: number): BagItemDisplayData {
        const row = this.items.get(id);
        const type = row?.type;
        const category: BagTabKind = [14, 17, 22, 26].includes(Number(type)) ? "equip" : [7, 9].includes(Number(type)) ? "shard" : type === 8 ? "spirit" : "item";
        const name = this.words.get(Number(row?.name)) || "未知道具（" + id + "）";
        const iconField = typeof row?.icon === "string" ? row.icon : "";
        const icon = iconField.startsWith("hero-icon/") ? "ui/hero/hero-icon_" + iconField.slice(10) : "ui/bag/backpack_" + id;
        const rare = typeof row?.rare_mark === "number" ? Math.min(6, Math.max(0, row.rare_mark)) : 0;
        const description = (this.words.get(Number(row?.content)) || "道具说明尚未配置").replace(/<[^>]+>/g, "").replace(/\\n/g, "\n");
        return { title: name, typeLine: `数量：${quantity}`, body: description, icon,
            fallback: "ui/bag/backpack_spr-default", frame: "ui/common/other_rare-" + rare,
            category, wallet: type === 1 || type === 2 };
    }
}
