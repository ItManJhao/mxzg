/**
 * 英雄技能工具：依据服务器星级、强化阶段和进化数据生成四槽只读展示。
 * 由英雄详情及技能窗口调用；不请求网络、不修改资产。缺少展示行时返回明确缺失状态。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import type { OwnedHero } from "../data/HeroSnapshotUtils";

export interface HeroSkillFace {
    /** false 表示展示配置缺失，不允许打开技能说明。 */
    readonly available: boolean;
    /** 四个展示位置，从 0 开始；不含普通攻击 skill_5。 */
    readonly slot: number;
    /** 配置技能 ID；不存在的技能位置为 0。 */
    readonly id: number;
    /** 当前已解锁等级；null 表示服务器尚未同步阶段，0 表示锁定。 */
    readonly level: number | null;
    /** 首次解锁的强化阶段；空位置为 null。 */
    readonly unlockStage: number | null;
    /** 同等级语言表名称；锁定技能使用一级预览名称。 */
    readonly name: string;
    /** 同等级语言表描述；不将策划说明列作为技能文本。 */
    readonly description: string;
    /** 已登记的旧版图标路径；缺图为 null，不拼接猜测路径。 */
    readonly icon: string | null;
}


/** 无状态的英雄技能配置读取及文案工具；不持有角色或会话。 */
export class HeroSkillUtils {
    /** 纯工具类不允许创建实例。 */
    private constructor() { }

    /** 读取四个技能槽；基础配置非法仍拒绝，展示行缺失则返回不可打开的占位。 */
    public static present(hero: OwnedHero, config: GameConfig = GameConfig.instance): readonly HeroSkillFace[] {
        const template = config.requireConfig(GConfig.HeroType, hero.templateId);
        const stage = hero.stage === undefined ? null : config.requireConfig(GConfig.HeroUpgrade, hero.stage);
        const star = hero.stage !== undefined && hero.stage < hero.star && hero.star <= 5 ? hero.stage + 1 : hero.star;
        const rank = config.requireConfig(GConfig.HeroStar, star);
        const levels = [rank.skill1, rank.skill2, rank.skill3, rank.skill4];
        const enabled = stage ? [stage.skill1, stage.skill2, stage.skill3, stage.skill4] : null;
        const ids = [template.skill_1, template.skill_2, template.skill_3, template.skill_4];
        return Object.freeze(ids.map((id, slot): HeroSkillFace => {
            if (!id) {
                return Object.freeze({ slot, id: 0, available: true, level: 0, unlockStage: null, name: "", description: "", icon: null });
            }
            let level = enabled ? (enabled[slot] === 0 ? 0 : levels[slot]) : null;
            const evolved = hero.evolution?.skill;
            if (level !== null && level > 0 && evolved?.skillId === id) {
                level = Math.max(level, evolved.level);
            }
            const previewLevel = Math.max(1, level ?? 1);
            const row = config.getConfig(GConfig.HeroSkill).find(row => row.type === id && row.level === previewLevel);
            const name = row ? this.skillText(config, row.lan_name) : null;
            const description = row ? this.skillText(config, row.lan_describe) : null;
            const available = name !== null && description !== null;
            if (!available) {
                GameLog.shared.warnOnce("MODULE", "HeroSkillUtils", "SKILL_DISPLAY_MISSING:" + id + ":" + previewLevel,
                    "缺少英雄技能展示配置：技能=" + id + "，等级=" + previewLevel + "；已禁用技能说明入口");
            }
            const unlock = config.getConfig(GConfig.HeroUpgrade)
                .filter(row => [row.skill1, row.skill2, row.skill3, row.skill4][slot] > 0)
                .reduce((min, row) => Math.min(min, row.grade), Infinity);
            return Object.freeze({
                slot, id, available, level, unlockStage: Number.isFinite(unlock) ? unlock : null,
                name: name ?? "技能配置缺失", description: description ?? "技能说明暂不可用", icon: ResManager.skill(id) || null
            });
        }));
    }

    /** 区分配置缺失、尚未同步、锁定以及已解锁等级。 */
    public static status(skill: HeroSkillFace): string {
        if (!skill.available) {
            return "配置缺失";
        }
        return skill.level === null ? "待同步" : skill.level > 0 ? "Lv." + skill.level
            : skill.unlockStage === null ? "未解锁" : "强化" + skill.unlockStage + "解锁";
    }

    /** 展示语言允许明确缺失；不伪造有效配置或将 undefined 输出到界面。 */
    private static skillText(config: GameConfig, id: number): string | null {
        const value = config.getConfig(GConfig.Language, id)?.value;
        return typeof value === "string" && value.trim() ? value : null;
    }
}
