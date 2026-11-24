/**
 * 通用规则说明窗：展示父页提供的标题与正文，支持阅读长文并关闭返回。
 * 由 UIManager 管理模态及父子窗口归属，不读取业务配置、不发请求。
 */
import { _decorator, Button, Label, ScrollView } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";

/** 调用方准备好的只读文案。 */
export interface RulesArgs {
    /** 窗口标题。 */
    readonly title: string;
    /** 左对齐展示的规则正文，换行由调用方准备。 */
    readonly message: string;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "rules",
    prefab: "bundles/module/common/prefabs/RulesView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RulesView")
export class RulesView extends BaseView<RulesArgs> {
    /** 说明窗的标题标签，位置、字号和颜色以 Prefab 为准。 */
    @property(Label) private _title: Label | null = null;

    /** 规则正文标签，按 Prefab 中的行高和宽度自动换行。 */
    @property(Label) private _message: Label | null = null;

    /** 正文阅读区，长文可纵向滚动，每次打开回到顶部。 */
    @property(ScrollView) private _scroll: ScrollView | null = null;

    /** 右上角关闭钮，仅关闭说明窗，不向父页派发业务操作。 */
    @property(Button) private _closeButton: Button | null = null;

    /** 更新外层视口；窗口比例与居中约束由 Prefab 中的组件维护。 */
    public onCreate(): void {
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 应用当次文案并回到正文起始位置，关窗时解除按钮绑定。 */
    public onOpen(args?: RulesArgs): void {
        if (!args?.title || !args.message || !this._title || !this._message || !this._scroll || !this._closeButton) {
            throw new Error("规则说明窗口参数或Prefab绑定缺失");
        }
        this._title.string = args.title;
        this._message.string = args.message;
        this._message.updateRenderData(true);
        this._scroll.scrollToTop(0);

        const button = this._closeButton.node;
        button.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (button.isValid) {
                button.off(Button.EventType.CLICK, this.close, this);
            }
        });
    }
}
