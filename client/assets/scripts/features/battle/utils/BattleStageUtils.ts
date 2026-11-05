/** 还原旧BattleUtils.getHeroPosition八站位公式；只计算显示坐标，不改变协议站位或战斗规则。 */
export class BattleStageUtils {
    /** 纯静态工具，不创建实例。 */
    private constructor() {}

    /** 站位号1..8：前四位为内列，后四位为外列；返回相对战场左下角的坐标。 */
    public static position(position: number, width: number, height: number, ally: boolean): { x: number; y: number } {
        if (!Number.isInteger(position) || position < 1 || position > 8 || width <= 0 || height <= 0) {
            throw new Error("战场站位或尺寸无效");
        }
        const scale = height <= 640 ? 1 : height <= 768 ? 0.9 : height <= 960 ? 0.8 : height <= 1280 ? 0.75 : 1;
        const viewportHeight = height * scale;
        const offset = 0.1 * Math.max(1 - scale, 0);
        const row = (position - 1) % 4;
        const column = position <= 4 ? 0.4 : 0.85;
        const rightX = (0.5 + 0.5 * column - 0.03) * width;
        return {
            x: ally ? width - rightX : rightX,
            y: (0.52 + 0.5 * (-0.8 + offset + row * (0.4 + offset))) * viewportHeight - 10,
        };
    }
}
