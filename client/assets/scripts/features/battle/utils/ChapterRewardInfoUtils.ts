/** 主线产物说明的数据投影，供只读说明页使用旧chapterreward配置。
 * 保留配置关卡顺序和产物顺序，不读取背包、不计算实际掉落，也不开放对应关卡或领取。 */

/** 一个关卡的两类产物配置；只包含物品种类，不代表已经获得的数量。 */
export interface ChapterRewardInfoRow {
    /** 旧配置关卡编号，用于章节标题，不作为挑战开放条件。 */
    readonly stage: number;
    /** 首通奖励按配置顺序保留，旧说明页不展示数量。 */
    readonly firstItems: readonly number[];
    /** 基础产物优先，再追加随机产物，按物品ID去重。 */
    readonly idleItems: readonly number[];
}

export class ChapterRewardInfoUtils {
    /** 无状态配置工具，不允许实例化。 */
    private constructor() {}

    /** 校验并投影完整同源配置；任一行损坏时拒绝整页，不用空列表掩盖缺失。 */
    public static rows(table: unknown): readonly ChapterRewardInfoRow[] {
        if (!table || typeof table !== "object" || !Array.isArray((table as { rows?: unknown }).rows)) {
            throw new Error("主线产物说明配置缺少rows");
        }
        const seen = new Set<number>();
        return (table as { rows: Record<string, unknown>[] }).rows.map(row => {
            const stage = this.id(row?.idx, "关卡");
            if (seen.has(stage)) {
                throw new Error("主线产物说明关卡重复：" + stage);
            }
            seen.add(stage);
            const firstItems = this.items(row.first_reward, "item_type", stage);
            const base = this.items(row.reward_base, "item_type", stage);
            const random = this.items(row.reward_unique, "type", stage);
            return Object.freeze({
                stage,
                firstItems: Object.freeze(firstItems),
                idleItems: Object.freeze(Array.from(new Set([...base, ...random]))),
            });
        });
    }

    /** 解码导出表内的JSON列表；只取物品类型，数量和概率不作为必得承诺显示。 */
    private static items(raw: unknown, key: string, stage: number): number[] {
        const list: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(list)) {
            throw new Error("主线产物说明列表缺失：" + stage + "/" + key);
        }
        return list.map(item => this.id(item?.[key], stage + "/" + key));
    }

    /** 配置ID必须为正安全整数；缺失值不能变成零号物品或关卡。 */
    private static id(value: unknown, source: string): number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
            throw new Error("主线产物说明ID非法：" + source);
        }
        return value;
    }
}
