/** 战斗数字字体工具：按伤害/暴击/治疗选用已有位图字体，不参与战斗数值计算。 */
export type BattleNumberKind = "dmg" | "crit" | "heal";

/** 只计算字体路径、字号和可绘制文字，不持有加载缓存或动画状态。 */
export class BattleNumberUtils {
    /** 纯工具类不创建实例。 */
    private constructor() {}

    /** 返回已入库字体路径；普通伤害黄色、暴击红色、治疗绿色。 */
    public static battleNumberFontPath(kind: BattleNumberKind): string {
        if (kind === "crit") {
            return "font/red-73";
        }
        if (kind === "heal") {
            return "font/green-73";
        }
        return "font/yellow-73";
    }

    /** 按原规则优先识别治疗，其次暴击，其余为普通伤害。 */
    public static battleNumberKind(heal: boolean, crit: boolean): BattleNumberKind {
        if (heal) {
            return "heal";
        }
        if (crit) {
            return "crit";
        }
        return "dmg";
    }

    /** 选择原版浮字字号：暴击52、治疗36、普通伤害40。 */
    public static battleNumberFontSize(kind: BattleNumberKind): number {
        if (kind === "crit") {
            return 52;
        }
        if (kind === "heal") {
            return 36;
        }
        return 40;
    }

    /** 仅返回位图字体能显示的带正负号整数；其他文字返回null，由调用方使用系统字体。 */
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
