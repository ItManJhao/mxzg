/**
 * Fit Height 下的可见宽度。
 * 设计分辨率是 640×1280。宽屏可见宽可以大于 640，瘦屏可以小于 640。
 * 底栏和挂机顶栏的按钮仍按预制作者宽 720 摆，收拢时用 CHROME_LAYOUT_WIDTH，不用 640。
 * 这里只算边距，不改项目里的 Fit Width / Fit Height。
 */
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./DesignResolution";
/**
 * CityChrome 等预制按 720 宽摆按钮。设计宽改成 640 之后，9:16 的可视宽仍约 720。
 * 可见宽小于 720 才往中间收（640 的设计预览收成 640/720），避免外格裁出画面。
 */
export const CHROME_LAYOUT_WIDTH = 720;
export interface VisibleBox {
    width: number;
    height: number;
}
export interface HorizontalFill {
    left: number;
    right: number;
    width: number;
}
/** 主城栏宽和边距的纯计算，不保存屏幕或页面实例。 */
export class ChromeLayoutUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 非正数退回设计分辨率，避免把栏宽收成 0。 */
    public static visibleBox(width: number, height: number): VisibleBox {
        return {
            width: ChromeLayoutUtils.positive(width, DESIGN_WIDTH),
            height: ChromeLayoutUtils.positive(height, DESIGN_HEIGHT),
        };
    }

    /**
     * 窄屏把按 720 摆的按钮往中间收。宽屏保持预制位置，多出来的宽度只拉背景。
     * 不传作者宽时用 CHROME_LAYOUT_WIDTH，不用设计宽 640。返回值不超过 1。
     */
    public static widthSqueeze(visibleW: number, designW?: number): number {
        const design = ChromeLayoutUtils.positive(designW === undefined ? 0 : designW, CHROME_LAYOUT_WIDTH);
        const visible = ChromeLayoutUtils.positive(visibleW, design);
        if (visible >= design) {
            return 1;
        }
        return visible / design;
    }

    /**
     * Widget 左 + 右对齐后的边距。父节点居中放在可见区域上。
     * 父节点比可见区域窄时边距为负，栏会伸出父节点，铺满屏幕。
     */
    public static horizontalFillMargins(parentW: number, visibleW: number): HorizontalFill {
        const parent = ChromeLayoutUtils.positive(parentW, DESIGN_WIDTH);
        const visible = ChromeLayoutUtils.positive(visibleW, parent);
        const inset = (parent - visible) / 2;
        return { left: inset, right: inset, width: visible };
    }

    /** 保留有效正数，否则返回指定的设计尺寸回退值。 */
    private static positive(value: number, fallback: number): number {
        return typeof value === "number" && isFinite(value) && value > 0 ? value : fallback;
    }
}
