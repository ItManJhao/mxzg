/**
 * 把主城顶底栏和地图视口拉到 view.getVisibleSize()。
 * 设计分辨率是 640×1280，只 Fit Height。不要再勾 Fit Width（两个一起是 SHOW_ALL）。
 * 安全区仍可能把整层缩小。这里把主城根抵消那一层缩放，让本地像素等于屏幕像素。
 */
import { Graphics, Node, Sprite, UITransform, view, Widget } from "cc";
import { GameLog } from "../../core/GameLog";
import { ErrorUtils } from "../../core/ErrorUtils";
import { ChromeLayoutUtils, VisibleBox } from "./ChromeLayoutUtils";
type WorldPoint = {
    x: number;
    y: number;
    z?: number;
};
type SpaceTransform = UITransform & {
    convertToWorldSpaceAR?: (point: WorldPoint) => WorldPoint;
    convertToNodeSpaceAR?: (point: WorldPoint) => WorldPoint;
};
interface DesignPlace {
    x: number;
    y: number;
    sx: number;
    sy: number;
}
/** 视口尺寸与已有节点布局辅助，静态页面布局仍由Prefab和Widget维护。 */
export class ViewportLayoutUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 读取引擎可见区域并规范为有效尺寸；引擎暂不可用时使用设计尺寸，不保存另一份视口状态。 */
    public static readVisibleBox(): VisibleBox {
        try {
            const size = view.getVisibleSize();
            const width = size && typeof size.width === "number" ? size.width : 0;
            const height = size && typeof size.height === "number" ? size.height : 0;
            return ChromeLayoutUtils.visibleBox(width, height);
        }
        catch (_err) {
            return ChromeLayoutUtils.visibleBox(0, 0);
        }
    }

    /** 不含自身。主城根要用它把父层的安全区缩放抵消掉。 */
    public static ancestorScale(node: Node): number {
        let scale = 1;
        let cur = node.parent;
        while (cur) {
            const raw = cur.scale && typeof cur.scale.x === "number" ? cur.scale.x : 1;
            scale *= raw > 0 ? raw : 1;
            cur = cur.parent;
        }
        return scale > 0 ? scale : 1;
    }

    /** 根节点铺满当前可见区域，并抵消祖先缩放，使本地坐标等于屏幕坐标。 */
    public static fitVisibleRoot(node: Node, box?: VisibleBox): VisibleBox {
        const size = box || ViewportLayoutUtils.readVisibleBox();
        const ui = (node.getComponent(UITransform) || node.addComponent(UITransform)) as UITransform;
        ui.setAnchorPoint(0.5, 0.5);
        ViewportLayoutUtils.assignContentSize(ui, size.width, size.height);
        const parentScale = ViewportLayoutUtils.ancestorScale(node);
        node.setScale(1 / parentScale, 1 / parentScale, 1);
        ViewportLayoutUtils.centerOnCanvas(node);
        return size;
    }

    /**
     * 地图挂在 CityMapHost 上。Host 铺满可见区域，地图根再用 Widget 四边贴住 Host。
     * 页面上的 bg 一并拉到同样的宽，避免宽屏两侧露出清屏色。
     */
    public static fitCityViewport(root: Node): VisibleBox {
        const parent = root.parent;
        const host = parent && parent.name === "CityMapHost" ? parent : root;
        const box = ViewportLayoutUtils.fitVisibleRoot(host);
        if (host !== root) {
            const ui = (root.getComponent(UITransform) || root.addComponent(UITransform)) as UITransform;
            ui.setAnchorPoint(0.5, 0.5);
            ViewportLayoutUtils.assignContentSize(ui, box.width, box.height);
            root.setScale(1, 1, 1);
            root.setPosition(0, 0, 0);
            ViewportLayoutUtils.stretchToParent(root);
        }
        const page = host.parent;
        const bg = page ? page.getChildByName("bg") : null;
        if (bg) {
            const bgUi = bg.getComponent(UITransform) as UITransform | null;
            const bgSize = ViewportLayoutUtils.uiSize(bgUi);
            if (bgUi && bgSize) {
                ViewportLayoutUtils.assignContentSize(bgUi, box.width, box.height);
            }
            ViewportLayoutUtils.redrawGraphics(bg, box.width, bgSize ? bgSize.height : box.height);
        }
        return box;
    }

    /** 左右拉满父节点。不改垂直对齐，调用方自己钉顶或钉底。 */
    public static stretchHorizontal(node: Node, visibleW: number): void {
        const ui = node.getComponent(UITransform) as UITransform | null;
        const self = ViewportLayoutUtils.uiSize(ui);
        if (!ui || !self) {
            return;
        }
        const parentUi = node.parent ? (node.parent.getComponent(UITransform) as UITransform | null) : null;
        const parentSize = ViewportLayoutUtils.uiSize(parentUi);
        const parentW = parentSize && parentSize.width > 0 ? parentSize.width : visibleW;
        const margins = ChromeLayoutUtils.horizontalFillMargins(parentW, visibleW);
        const height = self.height > 0 ? self.height : 1;
        ui.setContentSize(margins.width, height);
        const sprite = node.getComponent(Sprite) as Sprite | null;
        if (sprite) {
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        if (ViewportLayoutUtils.alignReady(node)) {
            const widget = (node.getComponent(Widget) || node.addComponent(Widget)) as Widget;
            widget.isAlignHorizontalCenter = false;
            widget.isAlignVerticalCenter = false;
            widget.isAlignTop = false;
            widget.isAlignBottom = false;
            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            widget.left = margins.left;
            widget.right = margins.right;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
            if (typeof widget.updateAlignment === "function") {
                widget.updateAlignment();
            }
        }
        const y = node.position && typeof node.position.y === "number" ? node.position.y : 0;
        const z = node.position && typeof node.position.z === "number" ? node.position.z : 0;
        node.setPosition(0, y, z);
        const drawn = ViewportLayoutUtils.uiSize(ui);
        ViewportLayoutUtils.redrawGraphics(node, margins.width, drawn ? drawn.height : height);
    }

    /** 顶栏或底栏：左右铺满可见宽，并贴住根节点的顶边或底边。Bg / BgPad 跟着拉宽。 */
    public static stretchBar(node: Node, visibleW: number, edge: "top" | "bottom"): void {
        ViewportLayoutUtils.stretchHorizontal(node, visibleW);
        const ui = node.getComponent(UITransform) as UITransform | null;
        const parentUi = node.parent ? (node.parent.getComponent(UITransform) as UITransform | null) : null;
        const self = ViewportLayoutUtils.uiSize(ui);
        const parentSize = ViewportLayoutUtils.uiSize(parentUi);
        if (self && parentSize && parentSize.height > 0) {
            const barH = self.height;
            const y = edge === "top" ? parentSize.height * 0.5 - barH * 0.5 : -parentSize.height * 0.5 + barH * 0.5;
            node.setPosition(0, y, 0);
        }
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) {
            const child = kids[i];
            if (child.name !== "Bg" && child.name !== "BgPad") {
                continue;
            }
            const childY = child.position && typeof child.position.y === "number" ? child.position.y : 0;
            ViewportLayoutUtils.stretchHorizontal(child, visibleW);
            child.setPosition(0, childY, 0);
        }
    }

    /** 地图根贴住 CityMapHost 的四边。Host 已经是可见尺寸。 */
    public static stretchToParent(node: Node): void {
        if (!ViewportLayoutUtils.alignReady(node)) {
            return;
        }
        const widget = (node.getComponent(Widget) || node.addComponent(Widget)) as Widget;
        widget.isAlignHorizontalCenter = false;
        widget.isAlignVerticalCenter = false;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.left = 0;
        widget.right = 0;
        widget.top = 0;
        widget.bottom = 0;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        if (typeof widget.updateAlignment === "function") {
            widget.updateAlignment();
        }
    }

    /**
     * 窄屏把按 720 预制摆的按钮和挂机顶栏内容往中间收，避免裁出屏幕。
     * 宽屏不把它们拉开，只拉背景。
     */
    public static squeezeWideNode(node: Node, visibleW: number): void {
        const mark = node as Node & {
            mxzgDesign?: DesignPlace;
        };
        if (!mark.mxzgDesign) {
            const pos = node.position;
            const sc = node.scale;
            mark.mxzgDesign = {
                x: pos && typeof pos.x === "number" ? pos.x : 0,
                y: pos && typeof pos.y === "number" ? pos.y : 0,
                sx: sc && typeof sc.x === "number" && sc.x !== 0 ? sc.x : 1,
                sy: sc && typeof sc.y === "number" && sc.y !== 0 ? sc.y : 1,
            };
        }
        const design = mark.mxzgDesign;
        const squeeze = ChromeLayoutUtils.widthSqueeze(visibleW);
        const z = node.position && typeof node.position.z === "number" ? node.position.z : 0;
        node.setPosition(design.x * squeeze, design.y, z);
        node.setScale(design.sx * squeeze, design.sy * squeeze, 1);
    }

    /** 窗口变化后再铺一次。安全区会在稍后的 tick 里改缩放，所以多补两帧。 */
    public static bindVisibleRefresh(owner: Node, apply: () => void): void {
        const safe = () => {
            try {
                apply();
            }
            catch (err) {
                GameLog.shared.classified("FRAMEWORK", "error", "VisibleFit", ErrorUtils.messageOf(err));
            }
        };
        safe();
        const host = view as {
            on?: (type: string, cb: () => void) => void;
            off?: (type: string, cb: () => void) => void;
        };
        if (host.on) {
            host.on("canvas-resize", safe);
        }
        const timers = [setTimeout(safe, 0), setTimeout(safe, 80)];
        owner.once(Node.EventType.NODE_DESTROYED, () => {
            if (host.off) {
                host.off("canvas-resize", safe);
            }
            for (let i = 0; i < timers.length; i++) {
                clearTimeout(timers[i]);
            }
        });
    }

    /** 将Canvas中心换算到父节点坐标；页面切换动画中不改位置，无法换算时回到父节点原点。 */
    private static centerOnCanvas(node: Node): void {
        let moving: Node | null = node;
        while (moving) {
            if ((moving as Node & {
                mxzgPageAnimating?: boolean;
            }).mxzgPageAnimating) {
                return;
            }
            moving = moving.parent;
        }
        const canvas = ViewportLayoutUtils.findCanvas(node);
        const parent = node.parent;
        if (!canvas || !parent) {
            node.setPosition(0, 0, 0);
            return;
        }
        const canvasUi = canvas.getComponent(UITransform) as SpaceTransform | null;
        const parentUi = parent.getComponent(UITransform) as SpaceTransform | null;
        if (!canvasUi || !parentUi || !canvasUi.convertToWorldSpaceAR || !parentUi.convertToNodeSpaceAR) {
            node.setPosition(0, 0, 0);
            return;
        }
        try {
            const world = canvasUi.convertToWorldSpaceAR({ x: 0, y: 0, z: 0 });
            const local = parentUi.convertToNodeSpaceAR(world);
            node.setPosition(local && typeof local.x === "number" ? local.x : 0, local && typeof local.y === "number" ? local.y : 0, 0);
        }
        catch (_err) {
            node.setPosition(0, 0, 0);
        }
    }

    /** 从当前节点向上寻找Canvas宿主；脱离Canvas的节点返回null。 */
    private static findCanvas(node: Node): Node | null {
        let cur: Node | null = node;
        while (cur) {
            if (cur.name === "Canvas") {
                return cur;
            }
            cur = cur.parent;
        }
        return null;
    }

    /**
     * contentSize 还没挂上时是 null。读 .width 会抛。
     * 预览里 getter 自己也会在内部读 width，所以这里把读取包住。
     */
    public static uiSize(ui: UITransform | null): {
        width: number;
        height: number;
    } | null {
        if (!ui) {
            return null;
        }
        try {
            const size = ui.contentSize;
            if (!size || typeof size.width !== "number" || typeof size.height !== "number") {
                return null;
            }
            return { width: size.width, height: size.height };
        }
        catch (_err) {
            return null;
        }
    }

    /**
     * 尺寸还是 null 时先补上 _contentSize，再交给引擎。
     * 直接 setContentSize 会读 _contentSize.width，挂机壳和进度条都会抛 reading 'width'。
     * 已经有尺寸时不换掉引擎自己的 Size。
     */
    public static assignContentSize(ui: UITransform | null, width: number, height: number): boolean {
        if (!ui) {
            return false;
        }
        if (!isFinite(width) || !isFinite(height)) {
            return false;
        }
        const raw = ui as unknown as {
            _contentSize?: {
                width: number;
                height: number;
            } | null;
        };
        try {
            if (!raw._contentSize) {
                raw._contentSize = { width: width, height: height };
            }
        }
        catch (_err) {
            return false;
        }
        try {
            ui.setContentSize(width, height);
        }
        catch (_err) {
            return false;
        }
        return true;
    }

    /**
     * Widget 左右对齐会读节点 width。节点还没进激活树时，引擎里的 UITransform 还是 null。
     * 这一帧先按内容尺寸摆，下一帧再对齐。
     */
    private static alignReady(node: Node): boolean {
        if (!node.isValid || !node.active || !node.parent) {
            return false;
        }
        let cur: Node | null = node.parent;
        while (cur) {
            if (!cur.active) {
                return false;
            }
            cur = cur.parent;
        }
        if (!ViewportLayoutUtils.uiSize(node.getComponent(UITransform))) {
            return false;
        }
        const parentUi = node.parent.getComponent(UITransform);
        if (parentUi && !ViewportLayoutUtils.uiSize(parentUi)) {
            return false;
        }
        return true;
    }

    /** 按当前宽高重画已有Graphics的居中矩形；没有绘制组件时保持节点原显示。 */
    private static redrawGraphics(node: Node, width: number, height: number): void {
        const graphics = node.getComponent(Graphics) as Graphics | null;
        if (!graphics || width <= 0 || height <= 0) {
            return;
        }
        if (typeof graphics.clear !== "function" || typeof graphics.rect !== "function" || typeof graphics.fill !== "function") {
            return;
        }
        graphics.clear();
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
    }
}
