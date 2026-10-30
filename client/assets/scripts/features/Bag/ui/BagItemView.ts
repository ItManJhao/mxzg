import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import type { BagItemData } from "../data/BagItemData";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import type { BagFace } from "../data/BagItemData";

const { ccclass, property } = _decorator;

/**
 * BackpackItemCell 上的格子。框、图标、数量、选中都是预制里绑好的。
 */
@ccclass("BagItemView")
export class BagItemView extends Component {
  @property(Button)
  button: Button | null = null;
  @property(Node)
  frame: Node | null = null;

  @property(Node)
  icon: Node | null = null;

  @property(Label)
  count: Label | null = null;

  @property(Node)
  selectMark: Node | null = null;

  private tap: (() => void) | null = null;
  private revision = 0;

  validateBindings(): void {
    for (const [field, value] of Object.entries({button:this.button,frame:this.frame,icon:this.icon,count:this.count,selectMark:this.selectMark})) {
      if (!value) throw new Error("BackpackItemCell.prefab [" + this.node.name + "]: 缺失绑定 " + field);
    }
    if (!this.frame!.getComponent(Sprite) || !this.icon!.getComponent(Sprite))
      throw new Error("BackpackItemCell.prefab [" + this.node.name + "]: frame/icon 缺少 Sprite");
  }

  show(item: Readonly<BagItemData> | null, selected: boolean, onTap: (() => void) | null, face?: BagFace): void {
    this.validateBindings();
    if (item && !face) throw new Error("BagItemView: 有物品时必须提供配置展示数据 face");
    const revision = ++this.revision;
    const current = () => this.isValid && this.revision === revision;
    if (this.tap) this.node.off(Button.EventType.CLICK, this.tap);
    this.tap = onTap;
    this.button!.interactable = !!onTap;
    if (onTap) this.node.on(Button.EventType.CLICK, onTap);
    if (this.selectMark) this.selectMark.active = selected;
    if (!item) {
      if (this.frame) {
        this.frame.active = true;
        paintSpritePaths(this.frame, [SLOT_PLATE], current);
      }
      if (this.icon) this.icon.active = false;
      if (this.count) {
        this.count.node.active = false;
        this.count.string = "";
      }
    } else {
      if (this.frame) paintSpritePaths(this.frame, [face!.frame], current);
      if (this.icon) {
        this.icon.active = true;
        this.icon.getComponent(Sprite)!.spriteFrame = null;
        paintSpritePaths(this.icon, [face!.icon, face!.fallback], current);
      }
      if (this.count) {
        const text = String(item.quantity);
        this.count.string = text;
        this.count.node.active = text.length > 0;
      }
    }
  }

  onDestroy(): void {
    this.revision++;
    if (this.tap) this.node.off(Button.EventType.CLICK, this.tap);
    this.tap = null;
  }
}

/** 空槽和 0 稀有都用 common 的底图。稀有文字图和细金框不是格子底。 */
const SLOT_PLATE = "ui/common/other_rare-0";
