/**
 * 主线里程碑的只读目标投影：将最新权威已领集合与同源配置转为旧胜利页提示。
 * Controller用此处校验进度，战场传入配置/语言查询能力；不领取、不修改资产或推测已领记录。
 */
import type { ChapterExtraRewardRow } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import type { MainChapterMilestoneProgress, MainChapterState } from "../MainChapterModel";
import { HeroTalkUtils } from "./HeroTalkUtils";

/** 结果页消费的不可变提示；未同步和全部领取必须明确区分。 */
export interface ChapterMilestoneHint {
    /** target显示旧目标，complete清空目标，unavailable只显示明确不可用状态。 */
    readonly kind: "target" | "complete" | "unavailable";
    /** 已转换为Cocos颜色标签的只读文字；complete时为空。 */
    readonly text: string;
    /** 最小未领配置ID；没有可信目标时为null，不代表已领取最大ID。 */
    readonly rewardId: number | null;
    /** 该配置要求的绝对关卡编号；只读提示不改变服务端控制的挑战范围。 */
    readonly targetChapter: number | null;
    /** 距离目标的非负绝对关卡差，已达成未领为0；不是领取资格或请求参数。 */
    readonly remaining: number | null;
}

export class ChapterMilestoneUtils {
    /** 无状态投影不保存页面、账号或额外配置索引。 */
    private constructor() {}

    /** 旧快照缺扩展返回undefined；存在但格式损坏拒绝整包，不将缺失改为空已领集合。 */
    public static readProgress(value: unknown): MainChapterMilestoneProgress | undefined {
        if (value === undefined) {
            return undefined;
        }
        const progress = value as { schemaVersion?: unknown; claimedIds?: unknown };
        if (!progress || typeof progress !== "object" || Array.isArray(progress)
            || progress.schemaVersion !== 1 || !Array.isArray(progress.claimedIds)) {
            throw new Error("主线里程碑进度格式无效");
        }
        const ids: number[] = [];
        const seen = new Set<number>();
        for (const id of progress.claimedIds) {
            if (!Number.isSafeInteger(id) || id <= 0 || id > 0xffffffff || seen.has(id)) {
                throw new Error("主线里程碑已领配置ID无效或重复");
            }
            seen.add(id);
            ids.push(id);
        }
        return Object.freeze({ schemaVersion: 1, claimedIds: Object.freeze(ids.sort((a, b) => a - b)) });
    }

    /**
     * 按旧配置ID顺序选择最小未领项；已达成未领仍停在原项，不根据通关数跳过它。
     * 使用最新已接纳状态，不读历史回执state；配置或语言展示缺失只降为明确不可用，不影响结算。
     */
    public static hint(state: MainChapterState | null, readRows: () => readonly ChapterExtraRewardRow[],
        readLanguage: (id: number) => string | undefined): ChapterMilestoneHint {
        if (!state?.milestoneProgress) {
            return this.unavailable("权威里程碑进度尚未同步");
        }
        try {
            const progress = this.readProgress(state.milestoneProgress)!;
            if (!Number.isSafeInteger(state.maxCleared) || state.maxCleared < 0) {
                throw new Error("主线绝对关卡进度无效");
            }
            const rows = readRows();
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new Error("里程碑配置缺失或为空");
            }
            const ids = new Set<number>();
            for (const row of rows) {
                if (!row || ![row.idx, row.chapter, row.tips_lang, row.other_tip_language]
                    .every(value => Number.isSafeInteger(value) && value > 0) || ids.has(row.idx)) {
                    throw new Error("里程碑配置ID、关卡或语言键无效");
                }
                ids.add(row.idx);
            }
            const claimed = new Set(progress.claimedIds);
            const target = [...rows].sort((a, b) => a.idx - b.idx).find(row => !claimed.has(row.idx));
            if (!target) {
                return Object.freeze({ kind: "complete", text: "", rewardId: null,
                    targetChapter: null, remaining: null });
            }
            const remaining = Math.max(0, target.chapter - state.maxCleared);
            const languageId = remaining > 0 ? target.tips_lang : target.other_tip_language;
            const template = readLanguage(languageId);
            if (typeof template !== "string" || !template.trim()) {
                throw new Error("里程碑提示语言缺失：" + languageId);
            }
            const placeholders = template.match(/%[sd]/g) || [];
            if (placeholders.length !== (remaining > 0 ? 1 : 0)) {
                throw new Error("里程碑提示的关卡占位符不一致：" + languageId);
            }
            const text = HeroTalkUtils.richText(template.replace(/%[sd]/g, String(remaining)))
                .replace(/<(?!\/?color(?:=#[0-9a-f]{6})?>)[^>]*>/gi, "");
            return Object.freeze({ kind: "target", text, rewardId: target.idx,
                targetChapter: target.chapter, remaining });
        } catch (error) {
            return this.unavailable(error);
        }
    }

    /** 展示依赖缺失记录一次并返回固定不可用提示，不把异常当作全领或默认未领。 */
    public static unavailable(reason: unknown): ChapterMilestoneHint {
        const detail = reason instanceof Error ? reason.stack || reason.message : String(reason);
        GameLog.shared.warnOnce("MODULE", "ChapterMilestoneUtils", "TARGET_UNAVAILABLE:" + String(reason),
            "主线下一目标暂不展示配置内容：" + detail);
        return Object.freeze({ kind: "unavailable", text: "目标信息暂不可用", rewardId: null,
            targetChapter: null, remaining: null });
    }
}
