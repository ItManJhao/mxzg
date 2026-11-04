/** 背包分类页签：由 BagView 传入选中状态与点击回调，Prefab 保存外观。 */
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { _decorator, Button, Component, Label } from "cc";
import { paintSpriteResources } from "../../../framework/kit/SpritePaint";

const { ccclass, property } = _decorator;

/** BagTabButton。标题和按钮在预制上，选中只换图。 */
@ccclass("BagTabView")
export class BagTabView extends Component {
    /** 页签标题标签，由 Prefab 绑定。 */
    @property(Label)
    title: Label | null = null;

    /** Prefab 绑定的点击按钮，未绑定时为 null。 */
    @property(Button)
    button: Button | null = null;

    /** 父页面传入的分类切换回调，setTab 时替换，不发请求。 */
    private onClick: (() => void) | null = null;
    /** 节点是否已订阅点击，避免重复注册；随节点生命周期结束。 */
    private listening = false;
    /** 当前页签是否选中，由页面刷新时同步。 */
    private selected = false;

    /** 加载时确保点击监听已注册，与 setTab 共用防重复入口。 */
    onLoad(): void {
        this.ensureClick();
    }

    /** 更新标题、回调和选中外观；重复调用不增加监听。 */
    setTab(text: string, on: boolean, handler: () => void): void {
        if (this.title) this.title.string = text;
        this.onClick = handler;
        this.ensureClick();
        this.setSelected(on);
    }

    /** 切换已登记的页签贴图；资源作用域随节点销毁释放。 */
    setSelected(on: boolean): void {
        this.selected = on;
        if (this.button) this.button.transition = Button.Transition.NONE;
        paintSpriteResources(this.node, [on ? ResourceCatalog.common.button_btn_tab_24 : ResourceCatalog.common.button_btn_tab_23]);
    }

    /** 返回当前页签的选中状态。 */
    isSelected(): boolean {
        return this.selected;
    }

    /** 每个节点只订阅一次点击，执行最新回调；监听随节点销毁释放。 */
    private ensureClick(): void {
        if (this.listening || !this.node) return;
        this.listening = true;
        this.node.on(Button.EventType.CLICK, () => {
            if (this.onClick) this.onClick();
        });
    }
}
