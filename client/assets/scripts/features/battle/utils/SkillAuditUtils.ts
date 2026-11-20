/**
 * 技能演示目录：从唯一GameConfig列出英雄技能，从真实战报的出手事件识别精确等级。
 * 由开发技能窗使用，不维护人工完成清单；可解析演示不代表玩法或视觉已经验收。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BattleAttackUtils } from "./BattleAttackUtils";
import { BattleReplayUtils } from "./BattleReplayUtils";

/** 一份已通过当前播放器配置预检、确实出现过的技能出手。 */
export interface SkillAuditEvidence {
    /** 战报sourceId对应的真实英雄模板，不以文件名推断。 */
    readonly heroId: number;
    /** 原skill.begin记录的技能配置ID。 */
    readonly skillId: number;
    /** 原skill.begin记录的精确技能等级。 */
    readonly level: number;
    /** 本机开发资源目录中的二进制文件名，不是任意URL。 */
    readonly fixture: string;
}

/** 可选择的真实技能等级；状态只说明演示可用性，不保存开发完成进度。 */
export interface SkillAuditEntry {
    /** 技能配置ID，与level共同定位一行配置。 */
    readonly id: number;
    /** 原配置技能等级，不能以其他等级代替。 */
    readonly level: number;
    /** 原配置类型，区分普通/主动出手和被动触发。 */
    readonly activeType: number;
    /** 唯一语言表中的技能名称。 */
    readonly name: string;
    /** 唯一语言表中的原技能说明。 */
    readonly description: string;
    /** 自动检测状态，不用“已验收”表示静态可解析。 */
    readonly status: string;
    /** 当前条目可播放或需要场景证据的原因。 */
    readonly reason: string;
    /** 匹配英雄、技能与等级的真实战报；null表示没有对应出手证据。 */
    readonly fixture: string | null;
}

/** 当前播放器消费的同源Buff字段，不另存配置映射。 */
interface AuditBuffRow {
    /** 原Buff配置主键。 */
    readonly idx: number;
    /** 原动作或数值效果类型。 */
    readonly type: number;
    /** 原动作参数JSON。 */
    readonly ani_base: string;
    /** 原序列帧声明JSON。 */
    readonly file: string;
    /** 原音效声明JSON。 */
    readonly sound: string;
    /** 原60帧制延迟。 */
    readonly delay: number;
    /** 原暗屏标记。 */
    readonly dimly: number;
}

export class SkillAuditUtils {
    /** 无状态配置与战报查询工具禁止实例化。 */
    private constructor() {}

    /**
     * 完整校验真实战报及本场动作，再提取实际出手的英雄/技能/等级。
     * 战报步骤和单位身份取自同一次校验；包括复活的旧配置。存在不支持的动作时由开发目录记录失败。
     */
    public static inspectReplay(fixture: string, bytes: Uint8Array,
        config = GameConfig.instance): readonly SkillAuditEvidence[] {
        if (!/^[a-z0-9-]+\.pb$/.test(fixture)) {
            throw new Error("演示战报文件名无效");
        }
        const { steps, units } = BattleReplayUtils.parse(bytes);
        const rows = (config.getFileByPath("config/buff") as { rows: readonly AuditBuffRow[] }).rows;
        for (const step of steps) {
            if (!["presentation", "buff.upsert", "damage", "recovery", "revival"].includes(step.kind)) {
                continue;
            }
            const row = rows.find(value => value.idx === step.configId);
            if (!row) {
                throw new Error("演示缺少战斗配置：" + step.configId);
            }
            if (step.kind === "revival" && row.type !== 154) {
                throw new Error("演示复活类型不符：" + step.configId);
            }
            if (step.kind === "presentation") {
                for (const action of BattleAttackUtils.legacyActions(row)) {
                    BattleAttackUtils.plan(action);
                }
            } else if (step.kind === "damage" && row.type === 100) {
                BattleAttackUtils.damageSounds(row);
            }
        }
        const evidence = new Map<string, SkillAuditEvidence>();
        for (const step of steps) {
            if (step.kind !== "skill.begin") {
                continue;
            }
            const heroId = units.find(unit => unit.unitId === step.sourceId)!.templateId;
            const level = step.skillLevel!;
            const entry = Object.freeze({ heroId, skillId: step.configId, level, fixture });
            evidence.set(heroId + ":" + step.configId + ":" + level, entry);
        }
        return Object.freeze(Array.from(evidence.values()));
    }

    /**
     * 从已安装配置列出英雄全部技能等级，按真实出手证据自动匹配演示。
     * 未出现的被动只说明需要触发场景，不从资源存在或其他等级推定完成。
     */
    public static skills(heroId: number, evidence: readonly SkillAuditEvidence[] = [],
        config = GameConfig.instance): readonly SkillAuditEntry[] {
        const hero = config.requireConfig(GConfig.HeroType, heroId);
        const ids = [hero.skill_5, hero.skill_1, hero.skill_2, hero.skill_3, hero.skill_4];
        const rows = config.getConfig(GConfig.HeroSkill);
        const text = (id: number) => String(config.getConfig(GConfig.Language, id)?.value || "");
        return ids.filter((id): id is number => typeof id === "number" && id > 0)
            .reduce<SkillAuditEntry[]>((result, id) => result.concat(rows.filter(row => row.type === id)
                .sort((a, b) => a.level - b.level).map(row => {
                    const demo = evidence.find(value => value.heroId === heroId
                        && value.skillId === id && value.level === row.level);
                    const passive = row.active_type !== 1 && row.active_type !== 2;
                    return Object.freeze({
                        id,
                        level: row.level,
                        activeType: row.active_type ?? 0,
                        name: text(row.lan_name).replace(/<[^>]*>/g, "") || (row.active_type === 2 ? "普通攻击" : String(id)),
                        description: text(row.lan_describe).replace(/<[^>]*>/g, ""),
                        status: demo ? "有演示" : passive ? "需触发场景" : "暂无演示",
                        reason: demo ? "真实战报已记录本英雄此等级出手，当前动作解析通过；不等同于完整验收。"
                            : passive ? "被动需要真实触发场景；没有出手记录时不伪造施法演示，也不推断规则未实现。"
                                : "当前测试战报没有此英雄、技能和等级的可播放出手记录；不代表底层尚未实现。",
                        fixture: demo?.fixture || null,
                    });
                })), []);
    }
}
