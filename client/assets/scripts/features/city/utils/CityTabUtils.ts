/** 主城底栏显示规则：规范宿主传入的选中状态，不参与预制体布局或角色状态。 */
export class CityTabUtils {
    /** 纯工具类不创建实例。 */
    private constructor() {}

    /** 仅保留最后一个选中项，其余选中项转为open；保留锁定状态，不修改输入数组。 */
    public static tabPaintState(states: string[]): string[] {
        let chosen = -1;
        for (let i = 0; i < states.length; i++) {
            if (states[i] === "selected") {
                chosen = i;
            }
        }
        const out: string[] = [];
        for (let i = 0; i < states.length; i++) {
            if (states[i] === "selected" && i !== chosen) {
                out.push("open");
            } else {
                out.push(states[i]);
            }
        }
        return out;
    }
}
