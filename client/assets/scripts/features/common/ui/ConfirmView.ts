/**
 * 通用确认窗口：只展示调用方提供的标题、正文和按钮文案，确定/取消后交回一次操作意图。
 * 由UIManager打开完整Prefab并使用共享模态；本页不查询配置、判断业务资格或发起网络请求。
 */
import { _decorator, Button, Label, Layout, Node, Widget } from "cc";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";

/** 调用方已准备的展示内容；业务配置和条件判断留在调用方。 */
export interface ConfirmArgs {
    /** 本次确认的标题；空字符串隐藏标题条，不作为配置键解释。 */
    readonly title: string;
    /** 本次确认的正文，静态文本区域按Prefab设置换行。 */
    readonly message: string;
    /** 点击确定并关闭窗口后执行一次，不由取消或空白关闭触发。 */
    readonly onConfirm: () => void;
    /** 可选确定文案，未提供时使用通用的“确定”。 */
    readonly confirmText?: string;
    /** 可选取消文案，未提供时使用通用的“取消”。 */
    readonly cancelText?: string;
    /** 默认显示取消按钮；false仅保留确定，按钮行由Prefab的Layout和Widget自动居中。 */
    readonly showCancel?: boolean;
    /** 取消按钮、空白关闭或应用清页后执行一次；未提供则只关闭。 */
    readonly onCancel?: () => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "confirm",
    prefab: "bundles/module/common/prefabs/ConfirmView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ConfirmView")
export class ConfirmView extends BaseView<ConfirmArgs> {
    /** 调用方标题的显示标签，位置及字号保存在Prefab。 */
    @property(Label) title: Label | null = null;
    /** 标题装饰，标题为空时与标题标签一起隐藏，不保留空标题条。 */
    @property(Node) titleBackground: Node | null = null;
    /** 调用方正文的显示标签，换行和尺寸保存在Prefab。 */
    @property(Label) content: Label | null = null;
    /** 右侧确定按钮，关闭后交付一次确认意图。 */
    @property(Button) confirmButton: Button | null = null;
    /** 左侧取消按钮，关闭后交付可选的取消意图。 */
    @property(Button) cancelButton: Button | null = null;
    /** 确定按钮文案，支持调用方覆盖通用默认值。 */
    @property(Label) confirmLabel: Label | null = null;
    /** 取消按钮文案，支持调用方覆盖通用默认值。 */
    @property(Label) cancelLabel: Label | null = null;
    /** 按钮行的横排容器布局，子按钮显隐后自动更新宽度，不在代码手排坐标。 */
    @property(Layout) buttonsLayout: Layout | null = null;
    /** 按钮行的水平居中约束，宽度随Layout变化后仍保持居中。 */
    @property(Widget) buttonsAlignment: Widget | null = null;
    /** true表示尚未打开或本次操作已结束，阻止双击及关闭后的迟到操作。 */
    private finished = true;
    /** 已通过校验的当前操作意图；拒绝重入开窗时不采用BaseView暂存的新参数。 */
    private intent: ConfirmArgs | undefined;

    /** 首次创建绑定可见区域变化；内容比例与居中由Prefab的ViewportScale/Widget处理。 */
    public onCreate(): void {
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 校验调用方内容并绑定本次按钮，不读取语言配置或推导业务状态。 */
    public onOpen(args?: ConfirmArgs): void {
        if (!args || typeof args.title !== "string"
            || typeof args.message !== "string" || !args.message || typeof args.onConfirm !== "function"
            || (args.onCancel !== undefined && typeof args.onCancel !== "function")
            || (args.confirmText !== undefined && (typeof args.confirmText !== "string" || !args.confirmText))
            || (args.cancelText !== undefined && (typeof args.cancelText !== "string" || !args.cancelText))
            || (args.showCancel !== undefined && typeof args.showCancel !== "boolean")
            || !this.title || !this.titleBackground || !this.content || !this.confirmButton || !this.cancelButton
            || !this.confirmLabel || !this.cancelLabel || !this.buttonsLayout || !this.buttonsAlignment) {
            throw new Error("确认窗口参数或Prefab绑定缺失");
        }
        if (!this.finished) {
            throw new Error("当前确认窗口尚未关闭，不能替换操作意图");
        }
        this.title.string = args.title;
        this.title.node.active = args.title.length > 0;
        this.titleBackground.active = args.title.length > 0;
        this.content.string = args.message;
        this.confirmLabel.string = args.confirmText ?? "确定";
        this.cancelLabel.string = args.cancelText ?? "取消";
        this.cancelButton.node.active = args.showCancel !== false;
        this.buttonsLayout.updateLayout();
        this.buttonsAlignment.updateAlignment();
        this.args = args;
        this.intent = args;
        this.finished = false;
        this.confirmButton.interactable = true;
        this.cancelButton.interactable = args.showCancel !== false;
        this.listen(this.confirmButton, () => this.finish(true));
        if (args.showCancel !== false) {
            this.listen(this.cancelButton, () => this.finish(false));
        }
    }

    /** 按钮监听归BaseView作用域持有，销毁顺序改变时不访问已失效节点。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 结束当前意图并先关闭窗口，双击、取消和回调重入均不能交付第二次。 */
    private finish(confirmed: boolean): void {
        const args = this.intent;
        if (this.finished || !args) {
            return;
        }
        this.finished = true;
        this.args = undefined;
        this.intent = undefined;
        this.disableButtons();
        try {
            this.close();
        } finally {
            this.notify(confirmed ? args.onConfirm : args.onCancel);
        }
    }

    /** 包括空白关闭和应用清页在内，未作确认的退出统一视为取消，不触发业务请求。 */
    public onClose(): void {
        const cancel = this.finished ? undefined : this.intent?.onCancel;
        this.finished = true;
        this.args = undefined;
        this.intent = undefined;
        this.disableButtons();
        this.notify(cancel);
    }

    /** 退出后禁止按钮继续操作；子节点先销毁时不读取失效的按钮对象。 */
    private disableButtons(): void {
        if (this.confirmButton?.isValid) {
            this.confirmButton.interactable = false;
        }
        if (this.cancelButton?.isValid) {
            this.cancelButton.interactable = false;
        }
    }

    /** 等BaseView同步撤销监听后交付已取走的单次回调，调用方异常只记录一次。 */
    private notify(callback?: () => void): void {
        if (!callback) {
            return;
        }
        void Promise.resolve().then(callback).catch(error => {
            GameLog.shared.classified("MODULE", "error", "ConfirmView", "确认回调失败：" + String(error));
        });
    }
}
