/**
 * 页面内容的统一宽度比例：根据所在根节点可用宽度与设计宽度等比缩放一个内容容器。
 * 在Prefab中绑定目标和设计宽度，定位、上下留白及拉伸由Widget保存；不识别业务或机型名称。
 * 外根由现有视口适配提供尺寸，本组件在帧末同步比例和已有Widget，不另建界面或改业务数据。
 */
import { _decorator, Component, Node, UITransform, Widget } from "cc";

const { ccclass, property } = _decorator;

@ccclass("ViewportScale")
export class ViewportScale extends Component {
    /** Prefab内需要整体等比缩放的内容容器；必须与本组件根节点分开。 */
    @property({ type: Node, displayName: "内容容器" })
    target: Node | null = null;

    /** 内容原始设计宽度，单位为设计像素；所有位置仍在Prefab中编辑。 */
    @property({ min: 1, displayName: "设计宽度" })
    designWidth = 640;

    /** 最大放大倍数；默认1，只在窄屏收缩，不将宽屏内容强行放大。 */
    @property({ min: 0.01, displayName: "最大比例" })
    maxScale = 1;

    /** 最近处理的可用宽度，重新启用时失效，用来跳过尺寸未变化的帧。 */
    private lastWidth = -1;

    /** 最近处理的可用高度；仅高度变化时也须让纵向Widget重新对齐。 */
    private lastHeight = -1;

    /** 校验Prefab设置；无效设计值或把根节点当目标会造成反馈缩放，直接拒绝。 */
    public onLoad(): void {
        if (!this.target || this.target === this.node || !this.node.getComponent(UITransform)
            || !Number.isFinite(this.designWidth) || this.designWidth <= 0
            || !Number.isFinite(this.maxScale) || this.maxScale <= 0) {
            throw new Error("ViewportScale需要独立内容容器、根UITransform及有效设计宽度/最大比例");
        }
    }

    /** 缓存页面重新显示时重新读取实际视口，避免沿用关闭前的机型尺寸。 */
    public onEnable(): void {
        this.lastWidth = -1;
        this.lastHeight = -1;
    }

    /** 在根视口更新后同步比例；固定坐标和控件排列始终由Prefab与Widget决定。 */
    public lateUpdate(): void {
        const target = this.target;
        const bounds = this.node.getComponent(UITransform);
        if (!target?.isValid || !bounds || bounds.width <= 0 || bounds.height <= 0) {
            return;
        }
        const ratio = Math.min(this.maxScale, bounds.width / this.designWidth);
        if (this.lastWidth === bounds.width && this.lastHeight === bounds.height
            && Math.abs(target.scale.x - ratio) < 0.0001 && Math.abs(target.scale.y - ratio) < 0.0001) {
            return;
        }
        this.lastWidth = bounds.width;
        this.lastHeight = bounds.height;
        target.setScale(ratio, ratio, 1);
        this.alignWidgets(target);
    }

    /** 比例变化会影响Widget的可用局部尺寸，按父到子顺序更新Prefab中已有的约束。 */
    private alignWidgets(node: Node): void {
        node.getComponent(Widget)?.updateAlignment();
        for (const child of node.children) {
            this.alignWidgets(child);
        }
    }
}
