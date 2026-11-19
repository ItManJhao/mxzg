/** 将实际召唤池和推荐阵容配置转为公示列表，数据与抽取共享同一份策划来源。 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { FirstSummonData, type SummonPool } from "../data/FirstSummonData";
import { HeroCatalog } from "./HeroCatalog";

/** 公示列表的一行，图标地址使用现有资源入口。 */
export interface SummonReferenceRow {
    readonly text: string;
    readonly icon?: string | null;
}

/** 用于计算权重百分比的单条候选英雄。 */
interface Weight {
    readonly id: number;
    readonly weight: number;
}

/** 先抽星级，再按对应星级的英雄权重。 */
interface Tier {
    readonly star: number;
    readonly weight: number;
    readonly heroes: readonly Weight[];
}

/** 已在正常配置打包时生成的公示源数据。 */
interface Pools {
    readonly pools: Readonly<Record<SummonPool, readonly Tier[]>>;
    readonly groups: Readonly<Record<string, readonly Weight[]>>;
}

export class SummonReferenceUtils {
    /** 仅提供无状态投影。 */
    private constructor() {}

    /** 正常权重和保底分开展示，保底组按实际权重计算。 */
    public static rates(pool: SummonPool): SummonReferenceRow[] {
        const { rows: [data] } = GameConfig.instance.getFileByPath("config/hero-summon-pools") as { rows: [Pools] };
        const tiers = data.pools[pool];
        const total = tiers.reduce((sum, tier) => sum + tier.weight, 0);
        const rows: SummonReferenceRow[] = [];
        if (pool === "NORMAL") {
            rows.push({ text: "首次基础单抽固定获得" },
                this.hero(Number(FirstSummonData.system("first_ordinary_lottery"))));
        }
        if (pool === "ADVANCED") {
            rows.push({ text: "首次高级单抽固定获得" },
                this.hero(Number(FirstSummonData.system("first_senior_lottery"))),
                { text: "第二次高级单抽固定获得" },
                this.hero(Number(FirstSummonData.system("second_senior_lottery"))),
                { text: "下方为基础权重。高级召唤的保底按服务器累计次数生效。" });
        }
        for (const tier of [...tiers].sort((left, right) => right.star - left.star)) {
            const chance = tier.weight / total;
            rows.push({ text: `${tier.star} 星英雄  ${this.percent(chance)}` });
            rows.push(...this.weighted(tier.heroes, chance));
        }
        if (pool === "ADVANCED") {
            for (const [key, label] of [
                ["first_adv_summon_guarantee_reward_group", "首次高级十连保底"],
                ["adv_summon_guarantee_reward_group", `连续 ${FirstSummonData.system("adv_summon_guarantee_times")} 抽未获五星的保底`],
                ["adv_summon_t1_guarantee_reward_group", `累计 ${FirstSummonData.system("adv_summon_t1_guarantee_times")} 抽的保底`],
            ]) {
                const group = data.groups[String(FirstSummonData.system(key))];
                if (group?.length) {
                    rows.push({ text: label }, ...this.weighted(group, 1));
                }
            }
        }
        return rows;
    }

    /** 展示旧版推荐阵容的队名、实际英雄和配置说明。 */
    public static lineups(): SummonReferenceRow[] {
        const config = GameConfig.instance;
        const { rows } = config.getFileByPath("config/herolineupsuggestion") as {
            rows: readonly { line_up: string; name_lang: number; description_lang: number }[];
        };
        const result: SummonReferenceRow[] = [];
        for (const row of rows) {
            const line = JSON.parse(row.line_up) as { hero_type: number; star: number }[];
            const name = config.getConfig(GConfig.Language, row.name_lang)?.value;
            const description = config.getConfig(GConfig.Language, row.description_lang)?.value;
            const choices: SummonReferenceRow[] = line.map(hero => hero.hero_type
                ? this.hero(hero.hero_type, `${hero.star} 星`) : { text: "自由位" });
            const paragraphs = typeof description === "string"
                ? description.replace(/<[^>]*>/g, "").split(/[，。；]/).map(part => part.trim()).filter(Boolean)
                : [];
            result.push({ text: typeof name === "string" ? name : "推荐阵容" }, ...choices,
                ...paragraphs.map(text => ({ text })));
        }
        return result;
    }

    /** 返回内部保留足够精度的百分比，小概率仍显示有效数字。 */
    private static percent(value: number): string {
        const percent = value * 100;
        return (percent < 0.001 ? Number(percent.toPrecision(2)) : Number(percent.toFixed(3))) + "%";
    }

    /** 星级组概率乘以组内相对权重，保持源表顺序。 */
    private static weighted(entries: readonly Weight[], chance: number): SummonReferenceRow[] {
        const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
        return entries.map(entry => this.hero(entry.id, this.percent(chance * entry.weight / total)));
    }

    /** 复用英雄配置的名称及头像。 */
    private static hero(id: number, hint = ""): SummonReferenceRow {
        const face = HeroCatalog.find(id);
        return { text: hint ? `${face?.name ?? id}  ·  ${hint}` : String(face?.name ?? id), icon: face?.icon };
    }
}
