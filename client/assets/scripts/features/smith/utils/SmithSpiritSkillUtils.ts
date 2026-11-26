/**
 * 铁匠铺精灵图鉴的技能展示转换。目录中的档位与品质取自旧客户端，
 * 技能名称、说明和冷却沿用现有语言及技能配置，不读取玩家的精灵库存。
 */
import { GConfig, type HeroSkillRow } from "../../../config/GConfig";
import { GameConfig } from "../../../config/GameConfig";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import { SMITH_SPIRIT_SKILL_CATALOG } from "../data/SmithSpiritSkillCatalog";

/** 图鉴格及详情共用的一档技能，字段来自同一配置等级。 */
export interface SmithSpiritSkillFace {
    readonly level: number;
    readonly tag: number;
    readonly name: string;
    readonly type: string;
    readonly icon: string;
    readonly description: string;
    readonly cooldown: string;
}

export class SmithSpiritSkillUtils {
    /** 只通过静态方法生成图鉴展示。 */
    private constructor() {}

    /** 按原品质和目录号顺序交付一档技能。缺配置时跳过失效条目并按技能等级记录一次。 */
    public static list(level: number, config = GameConfig.instance): readonly SmithSpiritSkillFace[] {
        const skills = new Map(config.getConfig(GConfig.HeroSkill).filter(row => row.level === level)
            .map(row => [row.type, row]));
        const result: SmithSpiritSkillFace[] = [];
        for (const [skillId, skillLevel, tag] of SMITH_SPIRIT_SKILL_CATALOG) {
            if (skillLevel !== level) {
                continue;
            }
            const row = skills.get(skillId);
            const icon = ResManager.skill(skillId + skillLevel - 1);
            const name = row ? this.text(config, row.lan_name) : "";
            const description = row ? this.text(config, row.lan_describe) : "";
            if (!row || !name || !description || !icon) {
                GameLog.shared.warnOnce("MODULE", "SmithSpiritSkillUtils", `SPIRIT_SKILL:${skillId}:${level}`,
                    `精灵图鉴技能缺少配置：技能=${skillId}，等级=${level}`);
                continue;
            }
            result.push({ level, tag, name, description, icon,
                type: this.text(config, row.active_type === 1 ? 41239 : 41240),
                cooldown: this.cooldown(config, row) });
        }
        return result;
    }

    /** 按原技能的首次释放与冷却回合选择规则文案，依序填入原语言占位。 */
    private static cooldown(config: GameConfig, row: HeroSkillRow): string {
        const first = row.initial_round ?? 0;
        const repeat = row.cool_round ?? 0;
        if (!first) {
            return this.text(config, 41336);
        }
        if (!repeat) {
            return this.text(config, 41338).replace("%s", String(first));
        }
        return this.text(config, 41337).replace("%s", String(first)).replace("%s", String(repeat));
    }

    /** 复用配置语言，保留换行并移除普通标签无法展示的旧富文本标记。 */
    private static text(config: GameConfig, key: number): string {
        const value = config.getConfig(GConfig.Language, key)?.value;
        return typeof value === "string" ? value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "").trim() : "";
    }
}
