import { _decorator, Button, Component, director, Director, Graphics, Label, Mask, Node, ScrollView, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { assignContentSize, positiveUiSize } from "../../../ui/visibleFit";
import { HERO_PORT_H } from "./heroChrome";

const { ccclass, property } = _decorator;

const ELEM_SPRITE = "ui/hero/hero-icon_elem-";

/**
 * HeroListHeroLayer。羊皮纸、滚动、元素筛选和空间字绑在这一层上。
 * 不从根往下搜。格子由 HeroListView 填进 content。
 */
@ccclass("HeroListBoardView")
export class HeroListBoardView extends Component {
  @property(Node)
  sprBox: Node | null = null;

  @property(Node)
  heroScroll: Node | null = null;

  @property(Node)
  heroPort: Node | null = null;

  @property(Node)
  heroContent: Node | null = null;

  @property(Label)
  emptyLabel: Label | null = null;

  @property(Label)
  capacityLabel: Label | null = null;

  @property([Button])
  elemButtons: Button[] = [];

  @property(Node)
  elemRow: Node | null = null;

  @property(Node)
  hitMenu: Node | null = null;

  @property(Node)
  skin: Node | null = null;

  @property(Node)
  evolve: Node | null = null;

  /** 羊皮纸下沿的花边。窗口拉高后跟空间字、进化钮一起贴住新的纸底。 */
  @property(Node)
  pattern: Node | null = null;

  private elemBound = false;

  get content(): Node | null {
    return this.heroContent;
  }

  /**
   * 进场景前卸掉宿主遮罩。onLoad 会装一块空模板，格子会被裁到看不见。
   * content 仍等进了场景再收进 view。
   */
  dropHostMask(): void {
    const scroll = this.heroScroll;
    if (!scroll) return;
    const hostMask = scroll.getComponent(Mask);
    if (hostMask) scroll.removeComponent(hostMask);
  }

  prepare(): boolean {
    const scroll = this.heroScroll;
    const port = this.heroPort;
    const content = this.heroContent;
    if (!scroll || !port || !content) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 的 spr_box 下没有 HeroScroll");
      return false;
    }
    if (!this.node.activeInHierarchy) return false;
    this.dropHostMask();
    this.fitPort();
    if (content.parent !== port) content.parent = port;
    content.setPosition(0, 0, 0);
    const scrollUi = scroll.getComponent(UITransform);
    const scrollSize = positiveUiSize(scrollUi);
    const width = scrollSize && scrollSize.width > 0 ? scrollSize.width : 540;
    const height = scrollSize && scrollSize.height > 0 ? scrollSize.height : 320;
    assignContentSize(scrollUi, width, height);
    const viewUi = port.getComponent(UITransform);
    const viewSize = positiveUiSize(viewUi);
    assignContentSize(viewUi, viewSize && viewSize.width > 0 ? viewSize.width : width, height);
    this.armMask(port);
    const scroller = scroll.getComponent(ScrollView);
    if (!scroller) GameLog.shared.warn("Hero", "HeroScroll 没有 ScrollView");
    else if (scroller.content !== content) scroller.content = content;
    this.silenceHit();
    return true;
  }

  bindElem(pick: (id: number) => void): void {
    if (this.elemBound) return;
    this.elemBound = true;
    if (this.elemRow && this.elemRow.parent) {
      this.elemRow.active = true;
      this.elemRow.setSiblingIndex(this.elemRow.parent.children.length - 1);
    } else {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 没有 node_elem");
    }
    if (this.elemButtons.length < 6) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 的元素钮没有绑全");
    }
    for (let i = 0; i < this.elemButtons.length; i++) {
      const button = this.elemButtons[i];
      if (!button || !button.node) continue;
      const id = i;
      button.node.active = true;
      button.transition = Button.Transition.NONE;
      button.interactable = true;
      paintSpritePaths(button.node, [ELEM_SPRITE + id]);
      button.node.on(Button.EventType.CLICK, () => pick(id));
    }
  }

  markElem(elem: number): void {
    for (let i = 0; i < this.elemButtons.length; i++) {
      const button = this.elemButtons[i];
      if (!button || !button.node) continue;
      button.transition = Button.Transition.NONE;
      const scale = i === elem ? 1 : 0.8;
      button.node.setScale(scale, scale, 1);
    }
  }

  /** 英雄页露出永久皮肤。图鉴露出进化。两颗不叠在一起。 */
  setCorner(tab: "hero" | "book"): void {
    if (this.skin) this.skin.active = tab === "hero";
    if (this.evolve) this.evolve.active = tab === "book";
    if (this.elemRow) this.elemRow.active = true;
  }

  setCapacity(text: string): void {
    if (!this.capacityLabel) return;
    this.capacityLabel.node.active = true;
    this.capacityLabel.string = text;
  }

  setEmpty(text: string): void {
    if (!this.emptyLabel) return;
    const show = text.length > 0;
    this.emptyLabel.node.active = show;
    this.emptyLabel.string = show ? text : "";
  }

  /**
   * 日服大约露出 3 行半。格子中心从 -52 起，行距 112，第 4 行中心在 388。
   * 视口顶锚点切在这里。
   */
  private fitPort(): void {
    const scroll = this.heroScroll;
    const scrollUi = scroll ? scroll.getComponent(UITransform) : null;
    const scrollSize = positiveUiSize(scrollUi);
    const width = scrollSize && scrollSize.width > 0 ? scrollSize.width : 540;
    assignContentSize(scrollUi, width, HERO_PORT_H);
    const portUi = this.heroPort ? this.heroPort.getComponent(UITransform) : null;
    assignContentSize(portUi, width, HERO_PORT_H);
  }

  /**
   * 外层羊皮纸拉高之后，花边、空间字和进化钮贴住新的纸底。
   * paperBottom 是列表根上的 y。检查里这几样直接挂在板子上时不动，避免把假节点拽走。
   */
  pinLower(paperBottom: number): void {
    this.pin(this.pattern, paperBottom + 36);
    const capHost = this.capacityLabel && this.capacityLabel.node ? this.capacityLabel.node.parent : null;
    if (capHost && capHost !== this.node) this.pin(capHost, paperBottom + 64);
    const evolveHost = this.evolve ? this.evolve.parent : null;
    if (evolveHost && evolveHost !== this.node) this.pin(evolveHost, paperBottom + 28);
  }

  private pin(node: Node | null, listY: number): void {
    if (!node) return;
    node.setPosition(node.position.x, listY - this.node.position.y, node.position.z);
  }

  private silenceHit(): void {
    const menu = this.hitMenu;
    if (!menu) return;
    const ui = menu.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }

  private armMask(node: Node): void {
    const draw = () => {
      if (!node.isValid) return false;
      let mask = node.getComponent(Mask);
      if (!mask) mask = node.addComponent(Mask);
      if (!node.activeInHierarchy) return false;
      const ui = node.getComponent(UITransform);
      const size = positiveUiSize(ui);
      if (!ui || !size) {
        mask.enabled = false;
        return false;
      }
      mask.enabled = true;
      if (mask.type !== Mask.Type.GRAPHICS_RECT) mask.type = Mask.Type.GRAPHICS_RECT;
      assignContentSize(ui, size.width, size.height);
      return !!node.getComponent(Graphics);
    };
    if (draw()) return;
    let frames = 0;
    const retry = () => {
      if (!node.isValid) {
        director.off(Director.EVENT_AFTER_UPDATE, retry);
        return;
      }
      frames += 1;
      const drawn = draw();
      if (drawn || frames > 45) {
        if (!drawn && node.isValid && !node.getComponent(Graphics)) {
          const mask = node.getComponent(Mask);
          if (mask) mask.enabled = false;
        }
        director.off(Director.EVENT_AFTER_UPDATE, retry);
      }
    };
    director.on(Director.EVENT_AFTER_UPDATE, retry);
    node.once(Node.EventType.NODE_DESTROYED, () => {
      director.off(Director.EVENT_AFTER_UPDATE, retry);
    });
  }
}
