/** 背包分类页签：由 BagView 传入选中状态与点击回调，Prefab 保存外观。 */
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { _decorator, Button, Component, Label } from "cc";
import { paintSpriteResources } from "../../../framework/kit/SpritePaint";

const { ccclass, property } = _decorator;

/** BagTabButton。标题和按钮在预制上，选中只换图。 */
@ccclass("BagTabView")
export class BagTabView extends Component {
  @property(Label)
  title: Label | null = null;

  @property(Button)
  button: Button | null = null;

  private onClick: (() => void) | null = null;
  private listening = false;
  private selected = false;

  onLoad(): void {
    this.ensureClick();
  }

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

  isSelected(): boolean {
    return this.selected;
  }

  private ensureClick(): void {
    if (this.listening || !this.node) return;
    this.listening = true;
    this.node.on(Button.EventType.CLICK, () => {
      if (this.onClick) this.onClick();
    });
  }
}
