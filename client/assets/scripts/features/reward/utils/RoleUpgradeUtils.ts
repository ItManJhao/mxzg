/**
 * 升级只读展示投影：校验历史前后等级，并从同源旧客户端候选表选择下一项等级预告。
 * 页面传入同版配置与语言读取能力；本工具不联网、不读取当前角色等级，也不开放或跳转功能。
 */
import type { RoleUpgradeFeatureRow } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import type { RewardArgs } from "../data/RewardData";

/** 旧功能预告的纯显示结果；缺少名称或说明时保留明确缺失，不编造配置内容。 */
export interface RoleUpgradeFeature {
    /** 原功能原子标识，用于已有home图片路径和缺失日志，不是页面导航命令。 */
    readonly atom: string;
    /** 严格高于历史升级后等级的下一个门槛，不代表功能已开放。 */
    readonly level: number;
    /** 真实名称语言；null表示配置缺失。 */
    readonly name: string | null;
    /** 真实说明语言；null表示配置缺失。 */
    readonly description: string | null;
    /** 旧47576的Cocos颜色文本；null表示语言缺失。 */
    readonly condition: string | null;
}

export class RoleUpgradeUtils {
    /** 无状态投影仅使用静态入口。 */
    private constructor() {}

    /** 校验真实历史升级，拒绝同级、降级和不安全整数；不采用当前角色等级补算。 */
    public static levels(change: RewardArgs["roleUpgrade"]): Readonly<{ beforeLevel: number; afterLevel: number }> {
        if (!change || !Number.isSafeInteger(change.beforeLevel) || change.beforeLevel < 1
            || !Number.isSafeInteger(change.afterLevel) || change.afterLevel > 0xffffffff
            || change.afterLevel <= change.beforeLevel) {
            throw new Error("升级展示缺少真实前后等级");
        }
        return Object.freeze({ beforeLevel: change.beforeLevel, afterLevel: change.afterLevel });
    }

    /**
     * 从生成器已按旧根原子、父键、type/open筛好的候选中取严格大于afterLevel的最小门槛。
     * 旧pairs在同门槛未规定顺序，这里仅保持源表顺序，不新增业务优先级或重复筛选规则。
     * @param rows 登录配置包已安装的旧客户端候选表，不使用当前OpenCondition实际门槛表替代。
     * @param readLanguage 同一份GameConfig语言映射，缺行返回undefined。
     * @returns null表示不存在更高等级候选；字段null表示候选存在但展示语言缺失。
     */
    public static nextFeature(afterLevel: number, rows: readonly RoleUpgradeFeatureRow[],
        readLanguage: (id: number | string) => string | undefined): RoleUpgradeFeature | null {
        if (!Number.isSafeInteger(afterLevel) || afterLevel < 1) {
            throw new Error("功能预告等级无效");
        }
        let candidate: RoleUpgradeFeatureRow | null = null;
        for (const row of rows) {
            if (!Number.isSafeInteger(row.condition_value) || row.condition_value <= afterLevel) {
                continue;
            }
            if (!candidate || row.condition_value < candidate.condition_value) {
                candidate = row;
            }
        }
        if (!candidate) {
            return null;
        }
        const name = this.language(candidate.name_lang, candidate.atom, "name", readLanguage);
        const description = this.language(candidate.desc, candidate.atom, "description", readLanguage);
        const template = this.language(47576, candidate.atom, "condition", readLanguage);
        return Object.freeze({
            atom: candidate.atom,
            level: candidate.condition_value,
            name,
            description,
            condition: template === null ? null : this.conditionText(template, candidate.condition_value),
        });
    }

    /** 将旧等级门槛替换为真实数字并只保留合法六位font颜色，其余旧富文本标签不交给引擎。 */
    private static conditionText(template: string, level: number): string {
        return template.replace(/%s/g, String(level))
            .replace(/<font\s+color=['"](#[0-9a-f]{6})['"]>/gi, "<color=$1>")
            .replace(/<\/font>/gi, "</color>")
            .replace(/<(?!\/?color(?:=#[0-9a-f]{6})?>)[^>]*>/gi, "");
    }

    /** 按候选与字段记录一次明确缺失；不把策划备注、原子标识或空串当作真实语言。 */
    private static language(id: number | string | undefined, atom: string, field: string,
        readLanguage: (id: number | string) => string | undefined): string | null {
        const valid = typeof id === "number" ? Number.isSafeInteger(id) && id > 0
            : typeof id === "string" && id.length > 0;
        const value = valid ? readLanguage(id!) : undefined;
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
        GameLog.shared.warnOnce("MODULE", "RoleUpgradeUtils", "LANGUAGE:" + atom + ":" + field + ":" + id,
            "升级功能预告语言缺失：atom=" + atom + "，字段=" + field + "，语言=" + id);
        return null;
    }
}
