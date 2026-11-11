/**
 * 登录页美术适配组件：按可见尺寸适配已有控件，静态样式和结构仍由 Prefab 保存。
 */
import { _decorator, Component, Node, Sprite, UITransform, view } from "cc";
import { fitVisibleRoot } from "../../../framework/ui/visibleFit";

const { ccclass, property } = _decorator;

/** 只负责视口适配；美术、层级和设计位置由登录预制体保存。 */
@ccclass("LoginArtwork")
export class LoginArtwork extends Component {
    /** 登录背景尺寸绑定。 */
    @property(UITransform) backdrop: UITransform | null = null;
    /** 底部选服及开始按钮容器。 */
    @property(Node) controls: Node | null = null;
    /** 开发账号设置容器。 */
    @property(Node) developerTools: Node | null = null;

    /** 页面显示时监听窗口变化并立即适配。 */
    onEnable(): void {
        view.on("canvas-resize", this.fit, this);
        this.fit();
    }
    /** 页面隐藏时解除窗口监听。 */
    onDisable(): void { view.off("canvas-resize", this.fit, this); }

    /** 按原图比例铺满并顶部对齐，短竖屏只裁切下方风景，避免裁掉标题；不改变登录状态。 */
    private fit(): void {
        const { width, height } = view.getVisibleSize();
        if (!(width > 0 && height > 0)) return;
        fitVisibleRoot(this.node);
        const imageSize = this.backdrop?.node.getComponent(Sprite)?.spriteFrame?.originalSize;
        if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
            const cover = Math.max(width / imageSize.width, height / imageSize.height);
            this.backdrop?.setContentSize(imageSize.width * cover, imageSize.height * cover);
            this.backdrop?.node.setPosition(0, (height - imageSize.height * cover) / 2, 0);
        }
        const scale = Math.min(1, width / 640);
        this.controls?.setScale(scale, scale, 1);
        this.controls?.setPosition(0, -height / 2, 0);
        this.developerTools?.setScale(scale, scale, 1);
        this.developerTools?.setPosition(0, height / 2 - 36 * scale, 0);
    }
}
