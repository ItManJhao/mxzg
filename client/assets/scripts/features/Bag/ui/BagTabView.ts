import { _decorator, Button, Component, Label } from "cc";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";

const { ccclass, property } = _decorator;

/** BackpackTabButton。标题和按钮在预制上，选中只换图。 */
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

  setSelected(on: boolean): void {
    this.selected = on;
    if (this.button) this.button.transition = Button.Transition.NONE;
    paintSpritePaths(this.node, [on ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23"]);
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
