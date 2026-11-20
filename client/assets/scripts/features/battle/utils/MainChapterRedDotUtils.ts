/**
 * 根据当前主线权威快照和已加载配置计算通关奖励红点。
 * 由应用红点接线提交结果，页面只订阅显示。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import type { MainChapterState } from "../MainChapterModel";
import { ChapterMilestoneUtils } from "./ChapterMilestoneUtils";

export class MainChapterRedDotUtils {
    /** 无状态计算，不持有主线快照或红点管理器。 */
    private constructor() {}

    /** 逐关奖励直接取可领集合，里程碑只检查卡片当前展示的最小未领配置。 */
    public static project(state: MainChapterState | null): Readonly<Record<string, boolean>> {
        const milestone = state?.milestoneProgress ? ChapterMilestoneUtils.hint(state,
            () => GameConfig.instance.getConfig(GConfig.ChapterExtraReward),
            id => GameConfig.instance.getConfig(GConfig.Language, id)?.value) : null;
        return {
            [GameRedDotKey.CHAPTER_CLEAR]: (state?.firstRewardProgress?.eligibleChapters.length ?? 0) > 0,
            [GameRedDotKey.CHAPTER_MILESTONE]: milestone?.kind === "target" && milestone.remaining === 0,
        };
    }
}
