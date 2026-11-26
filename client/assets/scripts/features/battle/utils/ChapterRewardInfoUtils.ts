/** 主线产物说明和结算后收益对比。说明页保留同源配置顺序；对比使用当次首通后的服务器快照。
 * 历史一侧沿原展示读取上关基础产物，不计算实际掉落，也不开放对应关卡或领取。 */
import type { MainChapterIdleState } from "../MainChapterModel";

/** 收益提示由上至下的资源顺序，和底栏使用相同配置 ID。 */
export const chapterIdleIncomeIds = [900101, 900003, 900001] as const;

/** 按同一结算周期规范为每分钟的两列，只用于中部展示。 */
export interface ChapterIdleIncomeComparison {
    /** 物品配置 ID，可对照预制体上固定的三行图标。 */
    readonly itemId: number;
    /** 上一关基础收益，首关前为零。 */
    readonly previous: number;
    /** 新通关快照中的当前收益。 */
    readonly current: number;
}

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
        const seen = new Set<number>();
        return this.sourceRows(table).map(row => {
            const stage = this.id(row?.idx, "关卡");
            if (seen.has(stage)) {
                throw new Error("主线产物说明关卡重复：" + stage);
            }
            seen.add(stage);
            const firstItems = this.items(row.first_reward, "item_type", stage);
            return Object.freeze({
                stage,
                firstItems: Object.freeze(firstItems),
                idleItems: this.idleItems(row, stage),
            });
        });
    }

    /** 只解析当前关卡的挂机产物说明，供快速战斗窗口使用。 */
    public static idleItemsForStage(table: unknown, stage: number): readonly number[] {
        const row = this.sourceRows(table).find(entry => entry?.idx === stage);
        if (!row) {
            throw new Error("缺少主线挂机产物说明：" + stage);
        }
        return this.idleItems(row, stage);
    }

    /** 只比较本次首通的收益档位；较新的其他通关、未知快照和缺项无法形成有效对比。 */
    public static idleIncomeComparison(
        table: unknown, stage: number, idle: MainChapterIdleState | null,
    ): readonly ChapterIdleIncomeComparison[] | null {
        if (!idle || idle.rewardStage !== stage) {
            return null;
        }
        const previous = stage === 1 ? null : this.previousIncome(table, stage - 1);
        return chapterIdleIncomeIds.map(itemId => {
            const current = idle.rates.find(row => row.itemId === itemId);
            const prior = previous === null ? 0 : previous.get(itemId);
            if (!current || prior === undefined) {
                throw new Error("主线挂机收益缺少对比物品：" + stage + "/" + itemId);
            }
            return {
                itemId,
                previous: this.perMinute(prior, idle.frequency),
                current: this.perMinute(current.quantity, idle.frequency),
            };
        });
    }

    /** 服务器收益按每个周期下发，中部提示与底栏统一换算为每分钟。 */
    public static perMinute(quantity: number, frequency: number): number {
        return quantity * 60 / frequency;
    }

    /** 按全局关卡 ID 解码旧表的上一关基础产物，零值合法，重复条目不叠加。 */
    private static previousIncome(table: unknown, stage: number): ReadonlyMap<number, number> {
        const rows = this.sourceRows(table).filter(row => row?.idx === stage);
        const raw = rows[0]?.reward_base;
        const list: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (rows.length !== 1 || !Array.isArray(list)) {
            throw new Error("主线挂机收益配置缺失或重复：" + stage);
        }
        const values = new Map<number, number>();
        for (const row of list) {
            const itemId = this.id(row?.item_type, stage + "/item_type");
            const amount: unknown = row.item_num;
            if (values.has(itemId) || typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0) {
                throw new Error("主线挂机收益配置数量非法：" + stage + "/" + itemId);
            }
            values.set(itemId, amount);
        }
        return values;
    }

    /** 读取唯一已安装的关卡配置，不保存额外副本。 */
    private static sourceRows(table: unknown): readonly Record<string, unknown>[] {
        if (!table || typeof table !== "object" || !Array.isArray((table as { rows?: unknown }).rows)) {
            throw new Error("主线产物说明配置缺少rows");
        }
        return (table as { rows: Record<string, unknown>[] }).rows;
    }

    /** 按旧说明顺序保留基础和随机产物配置 ID，每类物品只展示一格。 */
    private static idleItems(row: Record<string, unknown>, stage: number): readonly number[] {
        const base = this.items(row.reward_base, "item_type", stage);
        const random = this.items(row.reward_unique, "type", stage);
        return Object.freeze(Array.from(new Set([...base, ...random])));
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
