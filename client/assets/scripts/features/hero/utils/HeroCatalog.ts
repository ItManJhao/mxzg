/** 英雄名册配置投影：只生成显示信息，图标使用已验证 ID 映射，不拼接未知资源地址。 */
import { HeroIconById, ItemIconById } from "../../../framework/assets/IconCatalog";
export interface HeroTemplateFace {
    readonly templateId: number;
    readonly name: string;
    readonly elem: number | null;
    readonly icon: string | null;
}

import type { HeroTypeRow, ItemRow } from "../../../config/GConfig";
/** 判断配置中的正整数 ID，不将占位值当作有效模板。 */
function positive(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** Local display projection only; does not own role data. */
export class HeroCatalog {
    private readonly templates = new Map<number, HeroTemplateFace>();
    /** 对已校验的配置建立显示索引，不修改源表或角色名册。 */
    constructor(herotype: { readonly rows: readonly HeroTypeRow[] }, items: { readonly rows: readonly ItemRow[] }) {
        if (!Array.isArray(herotype?.rows) || !Array.isArray(items?.rows)) throw new Error("英雄展示配置无效");
        const icons = new Map<number, string>();
        for (const row of items.rows) {
            if (!positive(row.idx) || typeof row.icon !== "string") continue;
            const match = /^hero-icon\/([A-Za-z0-9_-]+)$/.exec(row.icon);
            if (match) icons.set(row.idx, ItemIconById[row.idx]?.path || "");
        }
        for (const row of herotype.rows) {
            // Exported tables contain comment rows; only positive numeric IDs are templates.
            if (!positive(row.type)) continue;
            if (this.templates.has(row.type)) throw new Error("英雄模板 ID 重复：" + row.type);
            this.templates.set(row.type, Object.freeze({
                templateId: row.type,
                name: typeof row.note === "string" && row.note.trim() ? row.note.trim() : "英雄 " + row.type,
                elem: positive(row.elem) && row.elem <= 5 ? row.elem : null,
                icon: HeroIconById[row.type]?.path || icons.get(row.type) || null,
            }));
        }
    }
    /** 找不到模板时返回 null，由页面明确显示未知模板。 */
    find(templateId: number): HeroTemplateFace | null { return this.templates.get(templateId) || null; }
}
