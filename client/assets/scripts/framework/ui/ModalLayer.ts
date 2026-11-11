/**
 * UIManager持有的一份共享模态节点：按当前窗口配置绘制蒙版或透明拦截，并只关闭当前所属窗口。
 * 不挂到业务Prefab、不保存业务状态；节点随模态目标移到窗口下方，最后一窗关闭后脱离场景复用。
 * 这是框架统一输入层，不创建页面主体；内容结构与内容区输入阻挡仍由各页面Prefab保存。
 */
import { BlockInputEvents, Button, Color, director, Director, Graphics, Layers, Node } from "cc";
import { ModalOptions } from "./UIRegistry";
import { ancestorScale, fitVisibleRoot, readVisibleBox } from "./visibleFit";

/** 共享蒙版的不透明度，0到255；叠窗只改变所属目标，不叠加多份颜色。 */
const MASK_ALPHA = 150;

/** 单个UIManager使用的模态显示与输入节点，不是页面组件或业务管理器。 */
export class ModalLayer {
    /** 首次需要模态时创建，隐藏时复用，卸载或外部销毁后清空。 */
    private node: Node | null = null;
    /** 当前需要模态的真实窗口实例；隐藏或释放时清空，不按页面id猜归属。 */
    private owner: Node | null = null;
    /** 当前允许的外部关闭动作；禁止点击关闭时为null，但节点仍阻挡输入。 */
    private dismiss: (() => void) | null = null;
    /** true绘制统一蒙版，false保留透明输入拦截。 */
    private mask = false;
    /** 上次可见尺寸及父级变换签名，改变后才更新节点与Graphics。 */
    private boundsKey = "";
    /** 是否已登记引擎帧监听；隐藏、销毁和卸载时解除。 */
    private watching = false;

    /**
     * 保存失效目标回调；目标被外部隐藏或销毁时由UIManager重新寻找下层模态。
     * @param refreshOwner 只刷新UI层归属，不执行任何业务提交。
     */
    public constructor(private readonly refreshOwner: () => void) { }

    /** 返回节点与显示计数，透明拦截也属于活动模态；不代表纹理或进程内存大小。 */
    public snapshot(): Record<string, number> {
        const valid = !!this.node?.isValid;
        const active = valid && !!this.node?.activeInHierarchy;
        return { nodes: valid ? 1 : 0, active: active ? 1 : 0, masked: active && this.mask ? 1 : 0 };
    }

    /** 将唯一节点移到目标窗口正下方；配置透明或禁止关闭时仍拦截外部点击。 */
    public showBefore(owner: Node, options: ModalOptions, dismiss: () => void): void {
        if (!owner.isValid || !owner.activeInHierarchy || !owner.parent?.isValid) {
            this.hide();
            return;
        }
        const node = this.ensureNode();
        if (this.owner !== owner) {
            // 同一输入节点转交给新窗口时取消旧按压，避免旧手势的抬起误关新窗口。
            const button = node.getComponent(Button)!;
            button.interactable = false;
            button.interactable = true;
        }
        this.owner = owner;
        this.dismiss = options.closeOnOutside ? dismiss : null;
        if (this.mask !== options.mask || node.parent !== owner.parent) {
            this.boundsKey = "";
        }
        this.mask = options.mask;
        node.parent = owner.parent;
        node.active = true;
        let index = owner.getSiblingIndex();
        // 移动已有节点前，先扣除它自身占据的位置，避免遮罩被放到窗口上方。
        if (node.getSiblingIndex() < index) {
            index--;
        }
        node.setSiblingIndex(index);
        this.updateBounds();
        this.watch();
    }

    /** 最后一个模态关闭时隐藏并脱离场景；复用同一节点，不保留旧窗口关闭动作。 */
    public hide(): void {
        this.owner = null;
        this.dismiss = null;
        this.boundsKey = "";
        this.unwatch();
        if (this.node?.isValid) {
            this.node.active = false;
            this.node.removeFromParent();
        }
    }

    /** 应用卸载时销毁共享节点并解除所有监听；同一管理器后续安装可重新创建。 */
    public dispose(): void {
        this.hide();
        const node = this.node;
        this.node = null;
        if (node?.isValid) {
            node.off(Button.EventType.CLICK, this.onOutsideClick);
            node.destroy();
        }
    }

    /** 首次创建纯色绘制及输入组件；所有业务弹窗共用这一份基础节点。 */
    private ensureNode(): Node {
        if (this.node?.isValid) {
            return this.node;
        }
        const node = new Node("SharedModalLayer");
        node.layer = Layers.Enum.UI_2D;
        node.addComponent(Graphics);
        node.addComponent(BlockInputEvents);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, this.onOutsideClick);
        this.node = node;
        this.boundsKey = "";
        return node;
    }

    /** 仅执行当前所属窗口的关闭动作；禁止关闭模式也不向底层传播点击。 */
    private readonly onOutsideClick = (): void => {
        if (!this.owner?.isValid || !this.owner.activeInHierarchy) {
            this.refreshOwner();
            return;
        }
        this.dismiss?.();
    };

    /** 活动期间在引擎帧末检查尺寸，保证父级安全区/缩放完成后再更新共享节点。 */
    private watch(): void {
        if (!this.watching) {
            this.watching = true;
            director.on(Director.EVENT_AFTER_UPDATE, this.onFrame);
        }
    }

    /** 解除本实例的帧监听，不影响其他UIManager或页面。 */
    private unwatch(): void {
        if (this.watching) {
            this.watching = false;
            director.off(Director.EVENT_AFTER_UPDATE, this.onFrame);
        }
    }

    /** 目标失效时通知管理器向下恢复；尺寸稳定时不重复修改Graphics和节点变换。 */
    private readonly onFrame = (): void => {
        if (!this.owner?.isValid || !this.owner.activeInHierarchy) {
            this.refreshOwner();
            return;
        }
        this.updateBounds();
    };

    /** 只调整共享输入层到可见区域，窗口内容坐标、缩放及Widget保持原归属。 */
    private updateBounds(): void {
        const node = this.node;
        if (!node?.isValid || !node.parent) {
            return;
        }
        const size = readVisibleBox();
        const parent = node.parent as Node & { worldPosition?: { x: number; y: number; z: number } };
        const position = parent.worldPosition || parent.position;
        const key = [size.width, size.height, ancestorScale(node), position.x, position.y, this.mask].join("/");
        if (key === this.boundsKey) {
            return;
        }
        this.boundsKey = key;
        fitVisibleRoot(node, size);
        const graphics = node.getComponent(Graphics)!;
        graphics.clear();
        graphics.fillColor = new Color(0, 0, 0, this.mask ? MASK_ALPHA : 0);
        graphics.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        graphics.fill();
    }
}
