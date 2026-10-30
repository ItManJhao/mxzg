import { _decorator, Button, Component, Label, Node, Sprite, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
import { BagFace } from "../data/BagItemData";
import { positiveUiSize } from "../../../ui/visibleFit";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";

const { ccclass, property } = _decorator;

/**
 * BackpackInfoLayer。使用和来源只读，不发 5004–5009。
 * 关闭只收起这张详情，不关背包页。
 */
@ccclass("BagInfoView")
export class BagInfoView extends Component {
  @property(Node)
  bg: Node | null = null;

  @property(Label)
  propName: Label | null = null;

  @property(Label)
  propType: Label | null = null;

  @property(Label)
  desc: Label | null = null;

  @property(Node)
  icon: Node | null = null;

  @property(Node)
  rare: Node | null = null;

  @property(Button)
  btnClose: Button | null = null;

  @property(Button)
  btnEnter: Button | null = null;

  @property(Label)
  enterLabel: Label | null = null;

  @property(Button)
  btnSrc: Button | null = null;

  @property(Node)
  btnDetail: Node | null = null;

  @property(Node)
  btnDecompose: Node | null = null;

  @property(Node)
  hitMenu: Node | null = null;

  @property(Node)
  hitMenuClose: Node | null = null;

  private onClose: (() => void) | null = null;
  private toast: ((text: string) => void) | null = null;
  private wired = false;
  private readOnly = false;

  setReadOnly(value: boolean): void {
    this.readOnly = value;
    if (this.enterLabel) this.enterLabel.string = value ? "确定" : "使用";
  }

  show(face: BagFace, onClose: () => void, toast: (text: string) => void): void {
    this.onClose = onClose;
    this.toast = toast;
    if (this.propName) this.propName.string = face.title;
    if (this.propType) this.propType.string = face.typeLine;
    if (this.desc) {
      this.desc.node.active = true;
      this.desc.string = face.body || " ";
    }
    paintSpritePaths(this.icon, [face.icon, face.fallback]);
    if (this.rare) paintSpritePaths(this.rare, [face.frame]);
    else GameLog.shared.warn("Bag", "BackpackInfoLayer 下没有 spr_rare");
    if (this.btnDetail) this.btnDetail.active = false;
    if (this.btnDecompose) this.btnDecompose.active = false;
    this.gray(this.btnEnter);
    this.gray(this.btnSrc);
    if (this.enterLabel) this.enterLabel.string = "使用";
    if (this.btnEnter) this.btnEnter.node.active = true;
    this.silence(this.hitMenu);
    this.silence(this.hitMenuClose);
    this.wire();
  }

  private wire(): void {
    if (this.wired) return;
    this.wired = true;
    this.listen(this.btnClose, () => {
      if (this.onClose) this.onClose();
    });
    this.listen(this.btnEnter, () => {
      if (this.readOnly) { this.onClose?.(); return; }
      GameLog.shared.info("Bag", "背包使用停用，不发 5004–5009");
      if (this.toast) this.toast("不发使用协议");
    });
    this.listen(this.btnSrc, () => {
      if (this.toast) this.toast("来源只读，不跳转");
    });
  }

  private listen(button: Button | null, handler: () => void): void {
    if (!button) return;
    button.node.on(Button.EventType.CLICK, handler);
  }

  private gray(button: Button | null): void {
    if (!button) return;
    const image = button.node.getComponent(Sprite);
    if (image) image.grayscale = true;
  }

  /** 全屏 menu 会挡住关闭。只处理绑上来的那一个。 */
  private silence(menu: Node | null): void {
    if (!menu) return;
    const ui = menu.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }
}
