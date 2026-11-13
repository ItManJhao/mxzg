/**
 * 现有战斗演出、飘字和主城动态挂点使用的节点与显示辅助。
 * 这里只保留实际使用的构造方法；页面静态结构、布局和控件优先在 Prefab 中维护。
 */
import { Color, HorizontalTextAlignment, Label, Layers, Node, Overflow, UITransform, VerticalTextAlignment, } from "cc";
/** 动态演出节点与文字辅助；不替代Prefab中的静态页面结构。 */
export class UiKitUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 为动态演出创建UI层节点；调用方负责挂载和销毁。 */
    public static uiNode(name: string): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        return node;
    }

    /** 将动态节点挂到指定父节点，并设置父级局部坐标。 */
    public static place(node: Node, parent: Node, x: number, y: number): Node {
        node.setPosition(x, y, 0);
        node.parent = parent;
        return node;
    }

    /** 更新已有Label文字；节点没有Label时不修改其他组件。 */
    public static setText(node: Node, text: string): void {
        const label = node.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }

    /** 创建系统字体Label，供飘字等动态内容使用；调用方负责生命周期。 */
    public static createLabel(text: string, fontSize: number, options?: {
        color?: Color;
        width?: number;
        height?: number;
        align?: "center" | "left";
    }): Node {
        const width = options?.width ?? 680;
        const height = options?.height ?? fontSize + 16;
        const node = UiKitUtils.uiNode("Label");
        const ui = node.addComponent(UITransform);
        ui.setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 8;
        label.useSystemFont = true;
        label.fontFamily = "sans-serif";
        label.overflow = Overflow.CLAMP;
        label.horizontalAlign = options?.align === "left" ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
        label.verticalAlign = options?.height ? VerticalTextAlignment.TOP : VerticalTextAlignment.CENTER;
        label.color = options?.color ?? new Color(240, 240, 240, 255);
        return node;
    }
}
