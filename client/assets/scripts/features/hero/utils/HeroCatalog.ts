/** 英雄名册配置投影：直接使用英雄配置item_id，物品回退图标复用BagItemCatalog的配置解析。
 * 只生成显示信息，不持有库存或发起资源加载；未知配置保留明确缺失。
 */
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
export interface HeroTemplateFace {
    readonly templateId: number;
    readonly name: string;
    readonly elem: number | null;
    readonly icon: string | null;
}
import type { HeroTypeRow, ItemRow } from "../../../config/GConfig";
/** Local display projection only; does not own role data. */
export class HeroCatalog {
    /** 按模板ID索引只读展示信息，随本配置投影实例释放。 */
    private readonly templates = new Map<number, HeroTemplateFace>();
    /** 对已校验的配置建立显示索引，不修改源表或角色名册。 */
    constructor(herotype: {
        readonly rows: readonly HeroTypeRow[];
    }, items: {
        readonly rows: readonly ItemRow[];
    }) {
        if (!Array.isArray(herotype?.rows) || !Array.isArray(items?.rows)) {
            throw new Error("英雄展示配置无效");
        }
        const icons = new Map<number, string>();
        for (const row of items.rows) {
            if (!HeroCatalog.positive(row.idx) || typeof row.icon !== "string") {
                continue;
            }
            const match = /^hero-icon\/([A-Za-z0-9_-]+)$/.exec(row.icon);
            if (match) {
                icons.set(row.idx, BagItemCatalog.iconSource(row) || "");
            }
        }
        for (const row of herotype.rows) {
            // 配置包含说明行，只有正整数ID作为有效英雄模板。
            if (!HeroCatalog.positive(row.type)) {
                continue;
            }
            if (this.templates.has(row.type)) {
                throw new Error("英雄模板 ID 重复：" + row.type);
            }
            this.templates.set(row.type, Object.freeze({
                templateId: row.type,
                name: typeof row.note === "string" && row.note.trim() ? row.note.trim() : "英雄 " + row.type,
                elem: HeroCatalog.positive(row.elem) && row.elem <= 5 ? row.elem : null,
                icon: ResManager.hero(row.item_id) || icons.get(row.type) || null,
            }));
        }
    }

    /** 找不到模板时返回 null，由页面明确显示未知模板。 */
    find(templateId: number): HeroTemplateFace | null { return this.templates.get(templateId) || null; }
    /** 判断配置中的正整数 ID，不将占位值当作有效模板。 */
    private static positive(value: unknown): value is number {
        return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    }
}
