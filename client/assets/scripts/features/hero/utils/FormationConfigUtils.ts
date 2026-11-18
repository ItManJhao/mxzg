/** 出阵静态配置读取与属性文案，供契约阵型和元素加成复用。 */
import type { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";

/** 旧配置中的一项加成，数值保留原始单位供汇总后统一格式化。 */
export interface FormationBonus {
    /** 旧版属性编号，对应语言表的名称和数值模板。 */
    readonly attribute: number;
    /** 配置原值，百分比属性使用万分整数。 */
    readonly value: number;
}

/** 共享已有 GameConfig 与语言字段，不维护单独的配置表。 */
export class FormationConfigUtils {
    /** 纯配置工具不创建实例。 */
    private constructor() { }

    /** 取得已安装的非空对象数组，配置缺失时保留文件标识。 */
    public static rows(config: GameConfig, path: string): readonly Record<string, unknown>[] {
        const file = config.getFileByPath(path) as { rows?: unknown[] } | null;
        const rows = file?.rows;
        if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row !== "object" || Array.isArray(row))) {
            throw new Error(path + "：出阵配置行无效");
        }
        return rows as Record<string, unknown>[];
    }

    /** 验证配表编号为正安全整数，避免把缺失字段按零处理。 */
    public static id(value: unknown, field: string): number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
            throw new Error(field + "：出阵配置编号无效");
        }
        return value;
    }

    /** 读取旧文案并去色标签，普通 Label 仍显示原文字内容。 */
    public static text(config: GameConfig, id: unknown): string {
        const key = this.id(id, "language");
        const text = config.requireConfig(GConfig.Language, key).value;
        const value = text?.replace(/<\/?font\b[^>]*>/gi, "").trim();
        if (!value) {
            throw new Error("出阵语言内容为空：" + key);
        }
        return value;
    }

    /** 解析出阵表中的 JSON 数组字符串，异常保留原表及字段位置。 */
    public static array(raw: unknown, field: string): readonly unknown[] {
        let values: unknown;
        try {
            values = typeof raw === "string" ? JSON.parse(raw) : null;
        } catch {
            throw new Error(field + " JSON 无效");
        }
        if (!Array.isArray(values)) {
            throw new Error(field + "无效");
        }
        return values;
    }

    /** 读取格位或档位的属性原值，保留配表顺序与重复条目。 */
    public static bonuses(raw: unknown, source: string): readonly FormationBonus[] {
        const values = this.array(raw, "出阵加成：" + source);
        const bonuses: FormationBonus[] = [];
        for (const item of values) {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                throw new Error("出阵加成项无效：" + source);
            }
            for (const [key, value] of Object.entries(item)) {
                const attribute = this.id(Number(key), "ability");
                if (typeof value !== "number" || !Number.isSafeInteger(value)) {
                    throw new Error("出阵加成值无效：" + source);
                }
                bonuses.push({ attribute, value });
            }
        }
        return bonuses;
    }

    /** 按旧名称与数值模板显示属性，百分比原值除 100 后再加后缀。 */
    public static formatBonus(config: GameConfig, { attribute, value }: FormationBonus): string {
        const name = this.text(config, 122000 + attribute);
        const format = this.text(config, 2160000 + attribute);
        const amount = format.startsWith("##p##")
            ? String(value / 100) + format.slice("##p##".length)
            : String(value);
        const sign = value >= 0 ? "+" : "";
        return name + sign + amount;
    }
}
