/** 独立通关奖励的配置与状态投影：完整展示旧目录，只有服务器可领集合才能启用领取。 */
import type { MainChapterFirstRewardProgress, FirstRewardClaimProgress } from "../data/MainChapterFirstRewardData";
import type { MainChapterState } from "../MainChapterModel";

/** 一个旧奖励格只保存配置预览，不表示当前库存或实际发奖。 */
export interface ChapterClearRewardItem {
    /** 原物品配置ID。 */
    readonly itemId: number;
    /** 原奖励面值。 */
    readonly quantity: number;
}

/** 原目录一行，列表不根据实际开放关卡截断。 */
export interface ChapterClearRewardConfig {
    /** 原配置展示序号，只用于排序。 */
    readonly idx: number;
    /** 请求和进度使用的原绝对通关号。 */
    readonly chapter: number;
    /** 原配置展示物品及数量。 */
    readonly items: readonly ChapterClearRewardItem[];
}

/** 旧领取/前往/已领取的投影；旧快照缺字段或超开放范围时明确不可操作。 */
export type ChapterClearRewardStatus = "unavailable" | "battle" | "claim" | "claimed" | "pending";

/** 窗口当前可显示的数据，数量来自配置，状态来自原权威快照及本地恢复进度。 */
export interface ChapterClearRewardRow extends ChapterClearRewardConfig {
    /** 该行操作及显示形态。 */
    readonly status: ChapterClearRewardStatus;
    /** 当前权威绝对进度，用于旧标题的分子。 */
    readonly progress: number | null;
    /** 当前原领奖执行中时禁止任何其他行开始操作。 */
    readonly enabled: boolean;
    /** 当前行按钮文案由原状态投影统一确定。 */
    readonly actionText: string;
}

export class ChapterClearRewardUtils {
    /** 无状态配置与进度转换，不建立第二份状态。 */
    private constructor() {
    }

    /** 从统一配置取全目录，按原配置序号保留显示顺序及原物品数量。 */
    public static config(table: unknown): readonly ChapterClearRewardConfig[] {
        const rows = (table as { rows?: unknown } | null)?.rows;
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error("通关奖励配置缺少 rows");
        }
        const seenChapters = new Set<number>();
        const seenIds = new Set<number>();
        return Object.freeze(rows.map(raw => {
            const idx = this.id(raw?.idx);
            const chapter = this.id(raw?.chapter);
            if (seenIds.has(idx) || seenChapters.has(chapter)) {
                throw new Error("通关奖励配置和关卡不可重复：" + idx + "/" + chapter);
            }
            seenChapters.add(chapter);
            seenIds.add(idx);
            const rewards: unknown = typeof raw.reward === "string" ? JSON.parse(raw.reward) : raw.reward;
            if (!Array.isArray(rewards) || !rewards.length) {
                throw new Error("通关奖励物品缺失：" + chapter);
            }
            return Object.freeze({
                idx, chapter,
                items: Object.freeze(rewards.map(item => Object.freeze({
                    itemId: this.id(item?.item_type),
                    quantity: this.id(item?.item_num),
                }))),
            });
        }).sort((left, right) => left.idx - right.idx));
    }

    /** 校验首包进度有序唯一、互斥且未超当前绝对通关号；历史已领不受后来挑战上限影响。 */
    public static readProgress(value: unknown, maxCleared: number): MainChapterFirstRewardProgress | undefined {
        if (value === undefined) {
            return undefined;
        }
        const data = value as Partial<MainChapterFirstRewardProgress> | null;
        if (!data || data.schemaVersion !== 1 || !Array.isArray(data.claimedChapters) || !Array.isArray(data.eligibleChapters)) {
            throw new Error("通关奖励权威进度无效");
        }
        const used = new Set<number>();
        const group = (values: readonly number[]): readonly number[] => Object.freeze(values.map(value => {
            const chapter = this.id(value);
            if (chapter > maxCleared || used.has(chapter)) {
                throw new Error("通关奖励权威进度冲突：" + chapter);
            }
            used.add(chapter);
            return chapter;
        }).sort((left, right) => left - right));
        return Object.freeze({
            schemaVersion: 1 as const,
            claimedChapters: group(data.claimedChapters),
            eligibleChapters: group(data.eligibleChapters),
        });
    }

    /** 旧排序为可领、可战、已领；原意图等待恢复时排在最前，范围之外为只读。 */
    public static rows(config: readonly ChapterClearRewardConfig[], state: MainChapterState | null,
        pending: FirstRewardClaimProgress): readonly ChapterClearRewardRow[] {
        const progress = state?.firstRewardProgress;
        const waiting = pending.chapter !== null && pending.phase !== "confirmed";
        const rank: Record<ChapterClearRewardStatus, number> = { pending: 0, claim: 1, battle: 2, unavailable: 3, claimed: 4 };
        return config.map((row): ChapterClearRewardRow => {
            let status: ChapterClearRewardStatus = "unavailable";
            let actionText = progress ? "暂未开放" : "等待同步";
            let enabled = false;
            if (waiting && pending.chapter === row.chapter) {
                status = "pending";
                enabled = !pending.busy;
                actionText = pending.busy ? "确认中" : "恢复领取";
            } else if (progress?.claimedChapters.includes(row.chapter)) {
                status = "claimed";
                actionText = "已领取";
            } else if (progress?.eligibleChapters.includes(row.chapter)) {
                status = "claim";
                enabled = !waiting;
                actionText = "领取奖励";
            } else if (state && progress && state.challengeLimit !== undefined && row.chapter <= state.challengeLimit
                && row.chapter > state.maxCleared) {
                status = "battle";
                enabled = true;
                actionText = "前往战斗";
            }
            return Object.freeze({ ...row, status, enabled,
                progress: state?.maxCleared ?? null, actionText });
        }).sort((left, right) => rank[left.status] - rank[right.status] || left.idx - right.idx);
    }

    /** 配置和协议都使用正且无符号32位安全整数。 */
    public static id(value: unknown): number {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 0xffffffff) {
            throw new Error("通关奖励关卡或配置整数无效");
        }
        return value;
    }
}
