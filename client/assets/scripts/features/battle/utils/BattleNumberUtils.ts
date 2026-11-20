/** 战斗数字字体工具：为战报现有的普攻、技能和治疗选择旧版字体。 */
export type BattleNumberKind = "dmg" | "skill" | "heal";

/** 计算字体路径与可绘制文字，不持有加载缓存或动画状态。 */
export class BattleNumberUtils {
    /** 纯工具类不创建实例。 */
    private constructor() {}

    /** 返回旧版位图字体路径，普攻为黄、主动技能为蓝、治疗为绿。 */
    public static battleNumberFontPath(kind: BattleNumberKind): string {
        switch (kind) {
            case "skill": return "font/blue-73";
            case "heal": return "font/green-73";
            default: return "font/yellow-73";
        }
    }

    /** 仅返回位图字库可显示的带符号整数，其他文字返回 null。 */
    public static bitmapNumberText(text: string): string | null {
        if (!text) {
            return null;
        }
        const trimmed = text.trim();
        if (!/^[+-]\d+$/.test(trimmed)) {
            return null;
        }
        return trimmed;
    }
}
