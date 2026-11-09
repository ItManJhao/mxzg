/** 挂机对话规则：沿用旧 herotalk 的开区间等级筛选，文案读取 language；不改变角色或资产。 */
export interface HeroTalkRow { level_min: number; level_max: number; lan: number; }
export class HeroTalkUtils {
    /** 纯规则工具不持有页面。 */
    private constructor() {}

    /** 旧版两个等级端点都不包含；缺少语言时跳过，不把策划备注当正式文案。 */
    public static candidates(level: number, rows: readonly HeroTalkRow[], language: ReadonlyMap<number, string>): string[] {
        return rows.filter(row => level > row.level_min && level < row.level_max)
            .map(row => language.get(row.lan)).filter((value): value is string => !!value);
    }

    /** 将旧 XML 字色标签转换为 Creator RichText 支持的颜色标签。 */
    public static richText(text: string): string {
        return text.replace(/<font\s+color=['"]([^'"]+)['"]>/g, '<color=$1>').replace(/<\/font>/g, '</color>');
    }
}
