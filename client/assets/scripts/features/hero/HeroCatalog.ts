export interface HeroTemplateFace {
  readonly templateId: number;
  readonly name: string;
  readonly elem: number | null;
  readonly icon: string | null;
}

type Row = Record<string, unknown>;
function rows(value: unknown): Row[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as Row).rows)) throw new Error("英雄展示配置无效");
  return (value as { rows: unknown[] }).rows.filter((row): row is Row => !!row && typeof row === "object" && !Array.isArray(row));
}
function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** Local display projection only; never overwrites legacy gameCatalog/ConfigDb. */
export class HeroCatalog {
  private readonly templates = new Map<number, HeroTemplateFace>();
  constructor(herotype: unknown, items: unknown) {
    const icons = new Map<number, string>();
    for (const row of rows(items)) {
      if (!positive(row.idx) || typeof row.icon !== "string") continue;
      const match = /^hero-icon\/([A-Za-z0-9_-]+)$/.exec(row.icon);
      if (match) icons.set(row.idx, "ui/hero/hero-icon_" + match[1]);
    }
    for (const row of rows(herotype)) {
      // Exported tables contain comment rows; only positive numeric IDs are templates.
      if (!positive(row.type)) continue;
      if (this.templates.has(row.type)) throw new Error("英雄模板 ID 重复：" + row.type);
      this.templates.set(row.type, Object.freeze({ templateId: row.type,
        name: typeof row.note === "string" && row.note.trim() ? row.note.trim() : "英雄 " + row.type,
        elem: positive(row.elem) && row.elem <= 5 ? row.elem : null,
        icon: positive(row.item_id) ? "ui/hero/hero-icon_" + row.item_id : icons.get(row.type) || null,
      }));
    }
  }
  find(templateId: number): HeroTemplateFace | null { return this.templates.get(templateId) || null; }
}
