/** 主城底栏布局工具：按旧版选中比例计算按钮位置和大小，不持有页面或角色状态。 */
export const TAB_REST_SIZE = 78;
export const TAB_SELECTED_SIZE = 117;
export const TAB_SELECTED_SCALE = TAB_SELECTED_SIZE / TAB_REST_SIZE;

/** 主城七个导航按钮共用的纯显示规则。 */
export class CityTabUtils {
    /** 纯工具类不创建实例。 */
    private constructor() {}

    /** 只有选中按钮使用旧版117/78放大比例。 */
    public static tabVisualScale(selected: boolean): number {
        return selected ? TAB_SELECTED_SCALE : 1;
    }

    /** 七个按钮分布在视口宽度90%内；宽屏只增加间距，不继续放大图标。 */
    public static cityTabLayout(width: number, index: number, selected: boolean) {
        const step = width * 0.9 / 7;
        const visualStep = Math.min(width, 640) * 0.9 / 7;
        const scale = visualStep / TAB_REST_SIZE * this.tabVisualScale(selected);
        return {
            x: -width * 0.45 + step * (index + 0.3125),
            y: 13 + (selected ? visualStep * 0.25 : 0),
            scale,
        };
    }

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
