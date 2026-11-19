/**
 * 普通英雄升级的前端报价，供详情和提交入口共用。
 * 按已安装的旧版配置及当前快照显示级数与消耗，最终资格、扣费和等级由服务端确认。
 */
import { ConfigUnavailable, GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import type { OwnedHero } from "../data/HeroSnapshotUtils";

/** 按钮和消耗栏使用同一报价。pending 表示本次请求在途。 */
export interface HeroLevelQuote {
    readonly status: "ready" | "pending" | "max" | "unavailable";
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

/** 无状态地计算旧升级面板的显示值。 */
export class HeroLevelQuoteUtils {
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

    /** 价格、升级上限和批量配置须为可安全计算的正整数。 */
    private static positive(value: unknown): value is number {
        return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
    }
}
