/**
 * 英雄升级和强化进阶的前端报价，供详情和提交入口共用。
 * 配置和统一快照用于展示有效条件与消耗，最终资格、扣费和成长由服务端确认。
 */
import { ConfigUnavailable, GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import type { OwnedHero } from "../data/HeroSnapshotUtils";

/** 按钮和消耗栏使用同一份普通升级报价。 */
export interface HeroLevelQuote {
    readonly status: "ready" | "max" | "unavailable";
    readonly levelLimit: number | null;
    readonly gold: number;
    readonly heroExp: number;
    readonly goldEnough: boolean;
    readonly heroExpEnough: boolean;
    readonly levels: number;
    readonly fromLevel: number | null;
    /** 旧版阈值内且可以升级时，按钮显示“升N级”。 */
    readonly jumpLabel: boolean;
}

/** 强化进阶的展示条件；ready 表示等级与星级达标，是否足额由余额标记独立描述。 */
export interface HeroStageQuote {
    readonly status: "ready" | "locked" | "max" | "unavailable";
    readonly stage: number | null;
    readonly nextStage: number | null;
    readonly requiredLevel: number | null;
    readonly requiredStar: number | null;
    readonly gold: number;
    readonly stone: number;
    readonly goldEnough: boolean;
    readonly stoneEnough: boolean;
}

/** 无状态地计算旧成长面板的显示值。 */
export class HeroLevelQuoteUtils {
    /** 普通英雄升级消耗的英雄经验道具配置编号。 */
    public static readonly EXPERIENCE_ITEM_ID = 900101;

    /** 强化进阶消耗的英雄进阶石配置编号。 */
    public static readonly STAGE_STONE_ITEM_ID = 900102;

    /** 所有输入由调用方提供，不持有名册或余额。 */
    private constructor() {}

    /**
     * 计算从当前等级开始可负担的连续等级及累计消耗。
     * 余额不足时仍返回下一等级的实际消耗，levels 为 0。缺少状态或配置时禁用升级。
     * @param gold 当前角色统一快照中的金币余额。
     * @param heroExp 当前角色背包中物品 900101 的数量。
     */
    public static describe(
        hero: OwnedHero | undefined,
        gold: number,
        heroExp: number,
        config: GameConfig = GameConfig.instance,
    ): HeroLevelQuote {
        const unavailable: HeroLevelQuote = {
            status: "unavailable",
            levelLimit: null,
            gold: 0,
            heroExp: 0,
            goldEnough: false,
            heroExpEnough: false,
            levels: 0,
            fromLevel: hero?.level ?? null,
            jumpLabel: false,
        };
        if (!hero || hero.stage === undefined || !Number.isSafeInteger(gold) || gold < 0
            || !Number.isSafeInteger(heroExp) || heroExp < 0) {
            return unavailable;
        }
        try {
            const stageLimit = config.getConfig(GConfig.HeroUpgrade, hero.stage)?.level;
            const starLimit = config.getConfig(GConfig.HeroStar, hero.star)?.level_limit;
            const lastStageLimit = config.getConfig(GConfig.HeroUpgrade)
                .reduce((highest, row) => Math.max(highest, row.level), 0);
            if (!this.positive(stageLimit) || !this.positive(starLimit) || !this.positive(lastStageLimit)) {
                return unavailable;
            }
            const levelLimit = hero.level < lastStageLimit ? stageLimit : starLimit;
            if (hero.level >= levelLimit) {
                return { ...unavailable, status: "max", levelLimit };
            }
            const system = config.getFileByPath("config/system") as {
                readonly rows?: readonly { readonly key?: string; readonly value?: unknown }[];
            } | null;
            const systemRows = system?.rows;
            if (!Array.isArray(systemRows)) {
                return unavailable;
            }
            const jumpLimit = systemRows.find(row => row?.key === "hero_level_jump_limit")?.value;
            const jumpMax = systemRows.find(row => row?.key === "hero_level_jump_max")?.value;
            if (!this.positive(jumpLimit) || !this.positive(jumpMax)) {
                return unavailable;
            }
            const maximumLevels = Math.min(hero.level < jumpLimit ? jumpMax : 1, levelLimit - hero.level);
            let totalGold = 0;
            let totalExp = 0;
            let levels = 0;
            for (let offset = 0; offset < maximumLevels; offset++) {
                const cost = config.getConfig(GConfig.HeroLevel, hero.level + offset);
                if (!cost || !this.positive(cost.gold_need) || !this.positive(cost.exp_need)) {
                    return unavailable;
                }
                const nextGold = totalGold + cost.gold_need;
                const nextExp = totalExp + cost.exp_need;
                if (!Number.isSafeInteger(nextGold) || !Number.isSafeInteger(nextExp)) {
                    return unavailable;
                }
                // 已可升一级以上时保留最后一笔可负担的累计值，否则显示一级成本并标出缺项。
                if (nextGold > gold || nextExp > heroExp) {
                    if (offset === 0) {
                        totalGold = nextGold;
                        totalExp = nextExp;
                    }
                    break;
                }
                totalGold = nextGold;
                totalExp = nextExp;
                levels++;
            }
            return {
                status: "ready",
                levelLimit,
                gold: totalGold,
                heroExp: totalExp,
                goldEnough: gold >= totalGold,
                heroExpEnough: heroExp >= totalExp,
                levels,
                fromLevel: hero.level,
                jumpLabel: hero.level < jumpLimit && levels > 0,
            };
        } catch (error) {
            if (error instanceof ConfigUnavailable) {
                return unavailable;
            }
            throw error;
        }
    }

    /** 读取当前阶级对应的进阶要求和费用，以及是否拥有足额金币和进阶石。 */
    public static describeStage(
        hero: OwnedHero | undefined,
        gold: number,
        stone: number,
        config: GameConfig = GameConfig.instance,
    ): HeroStageQuote {
        const unavailable: HeroStageQuote = {
            status: "unavailable",
            stage: hero?.stage ?? null,
            nextStage: null,
            requiredLevel: null,
            requiredStar: null,
            gold: 0,
            stone: 0,
            goldEnough: false,
            stoneEnough: false,
        };
        if (!hero || hero.stage === undefined || !Number.isSafeInteger(gold) || gold < 0
            || !Number.isSafeInteger(stone) || stone < 0) {
            return unavailable;
        }
        try {
            const stage = hero.stage;
            const rows = config.getConfig(GConfig.HeroUpgrade);
            const row = config.getConfig(GConfig.HeroUpgrade, stage);
            if (!row || !this.positive(row.level)) {
                return unavailable;
            }
            const maxStage = rows.reduce((highest, entry) => Math.max(highest, entry.grade), 0);
            if (stage === maxStage) {
                return { ...unavailable, status: "max" };
            }
            const nextStage = stage + 1;
            if (!config.getConfig(GConfig.HeroUpgrade, nextStage) || !this.positive(row.gold)
                || !this.positive(row.soul)) {
                return unavailable;
            }
            return {
                status: hero.level >= row.level && hero.star >= nextStage ? "ready" : "locked",
                stage,
                nextStage,
                requiredLevel: row.level,
                requiredStar: nextStage,
                gold: row.gold,
                stone: row.soul,
                goldEnough: gold >= row.gold,
                stoneEnough: stone >= row.soul,
            };
        } catch (error) {
            if (error instanceof ConfigUnavailable) {
                return unavailable;
            }
            throw error;
        }
    }

    /** 价格、升级上限和批量配置须为可安全计算的正整数。 */
    private static positive(value: unknown): value is number {
        return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    }
}
