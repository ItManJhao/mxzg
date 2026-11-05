/** 技能验收目录：配置提供全部英雄与技能，精确等级白名单仅记录已有演示证据，不推断未恢复效果。 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";

/** 一个可选择的真实技能等级及开发证据。 */
export interface SkillAuditEntry {
    readonly id: number;
    readonly level: number;
    /** 原配置技能类型，用于区分主动定位与被动完整触发过程。 */
    readonly activeType: number;
    readonly name: string;
    readonly description: string;
    readonly status: string;
    readonly reason: string;
    readonly fixture: string | null;
}

export class SkillAuditUtils {
    /** 无状态配置工具禁止实例化。 */
    private constructor() {}

    /** 精确技能/等级对应的已有只读场景；未登记不是对后端全部能力的推断。 */
    private static readonly demos: Readonly<Record<string, readonly [string | null, string, string]>> = {
        "101010010:0": ["chapter-1-1-1-replay.pb", "部分接入", "普攻战报可播放；旧覆盖表ani_ba4e字段疑点待核对，独立特效未恢复。"],
        "101010011:1": ["chapter-1-1-1-replay.pb", "可演示", "一级主动已复验斩击特效、暗屏和退出；正式服完整时序对照仍待验收。"],
        "101040040:0": ["chapter-1-1-3-control-replay.pb", "已验收", "第三关敌方赛西莉普攻与多单位场景。"],
        "101040041:1": ["chapter-1-1-3-control-replay.pb", "已验收", "第三关赛西莉真实施法与眩晕。"],
        "105050050:0": ["chapter-1-1-2-replay.pb", "已验收", "第二关黑暗切割者普攻。"],
        "105050051:1": ["chapter-1-1-2-replay.pb", "部分接入", "真实施法战报可播放；旧type9等覆盖特效尚未恢复，本等级流血概率为零。"],
        "102050230:0": ["independent-nanako-replay.pb", "可演示", "普攻已补旧表现覆盖；正式服完整特效对照待验收。"],
        "102050231:1": ["independent-nanako-star-5-replay.pb", "可演示", "五星真实一级技能，降护甲后伤害；暴击追加概率为零。"],
        "102050231:2": ["independent-nanako-star-6-replay.pb", "可演示", "六星真实二级技能，降护甲后伤害；暴击追加概率为零。"],
        "102050231:3": ["independent-nanako-critical-replay.pb", "可演示", "三级暴击追加已通过自动验证；此暴击分支画面待验收。"],
        "102050232:1": ["independent-nanako-star-5-replay.pb", "可演示", "五星一级静态属性被动在入场计算，无独立施法动画。"],
        "102050233:1": ["independent-nanako-star-5-replay.pb", "可演示", "五星一级技能降攻与到期冰冻独立战报。"],
        "102050234:1": ["independent-nanako-star-5-replay.pb", "部分接入", "五星一级控制监听可演示；208配置疑点保留。"],
        "102050232:2": ["independent-nanako-replay.pb", "可演示", "静态属性被动在入场计算，无独立施法动画。"],
        "102050233:2": ["independent-nanako-replay.pb", "可演示", "已补施法者与目标双段特效；正式服完整表现待对照，保留降攻和冰冻战报验证。"],
        "102050234:2": ["independent-nanako-replay.pb", "部分接入", "控制触发链可演示；208全零配置疑点保留，不能视为所有分支验收。"]
    };

    /** 列出英雄全部配置技能等级，保留未接入条目与明确原因。 */
    public static skills(heroId: number, config = GameConfig.instance): readonly SkillAuditEntry[] {
        const hero = config.requireConfig(GConfig.HeroType, heroId);
        const ids = [hero.skill_5, hero.skill_1, hero.skill_2, hero.skill_3, hero.skill_4];
        const rows = config.getFile(GConfig.HeroSkill).rows;
        const text = (id: number) => String(config.getConfig(GConfig.Language, id)?.value || "");
        return ids.filter((id): id is number => typeof id === "number" && id > 0).reduce<SkillAuditEntry[]>((all, id) => all.concat(rows.filter(row => row.type === id)
            .sort((a, b) => a.level - b.level).map(row => {
                const demo = this.demos[id + ":" + row.level];
                return Object.freeze({ id, level: row.level, activeType: row.active_type ?? 0,
                    name: text(row.lan_name).replace(/<[^>]*>/g, "") || (row.active_type === 2 ? "普通攻击" : String(id)),
                    description: text(row.lan_describe).replace(/<[^>]*>/g, ""),
                    status: demo ? demo[1] : "未接入",
                    reason: demo ? demo[2] : "此技能等级尚未登记可播放演示；不代表其他等级已完成。",
                    fixture: demo ? demo[0] : null });
            })), []);
    }
}
