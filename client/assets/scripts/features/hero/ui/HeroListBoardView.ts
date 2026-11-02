/**
 * 英雄列表板：管理筛选按钮和滚动容器显示，名册数据由外部注入，不维护角色状态。
 */
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { _decorator, Button, Component, Label, Mask, Node, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";



const { ccclass, property } = _decorator;

const ELEMENT_FRAMES = [ResourceCatalog.hero.hero_icon_elem_0, ResourceCatalog.hero.hero_icon_elem_1, ResourceCatalog.hero.hero_icon_elem_2, ResourceCatalog.hero.hero_icon_elem_3, ResourceCatalog.hero.hero_icon_elem_4, ResourceCatalog.hero.hero_icon_elem_5] as const;

/**
 * HeroListBoardView。羊皮纸、滚动、元素筛选和空间字绑在这一层上。
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

  /** 由 Prefab 绑定的统一滚动组件；布局和 Cell 资源归 SuperContent。 */
  get scroll(): SuperScroll {
    const scroll=this.heroScroll?.getComponent(SuperScroll);
    if(!scroll)throw new Error("HeroListBoardView 缺少 SuperScroll");
    return scroll;
  }
  get content(): Node | null {
    return this.heroContent;
  }

  /** 校验静态视口、遮罩和内容归属；不再运行时重挂节点、改尺寸或禁用遮罩。 */
  prepare(): boolean {
    if (!this.heroScroll || !this.heroPort || !this.heroContent) throw new Error("HeroListBoardView 缺少滚动绑定");
    if (this.heroContent.parent !== this.heroPort || this.heroScroll.getComponent(Mask) || !this.heroPort.getComponent(Mask))
      throw new Error("HeroListBoardView 需要 view/Mask/content 的静态布局");
    const scroller = this.scroll;
    if (scroller.content !== this.heroContent) throw new Error("HeroListBoardView SuperScroll.content 绑定错误");
    scroller.validateBindings();
    return this.node.activeInHierarchy;
  }

  /** 绑定一次元素筛选交互，并使用目录中明确登记的元素图标。 */
  bindElem(pick: (id: number) => void): void {
    if (this.elemBound) return;
    this.elemBound = true;
    if (this.elemRow && this.elemRow.parent) {
      this.elemRow.active = true;
      this.elemRow.setSiblingIndex(this.elemRow.parent.children.length - 1);
    } else {
      GameLog.shared.warn("Hero", "HeroListBoardView 没有 node_elem");
    }
    if (this.elemButtons.length < 6) {
      GameLog.shared.warn("Hero", "HeroListBoardView 的元素钮没有绑全");
    }
    for (let i = 0; i < this.elemButtons.length; i++) {
      const button = this.elemButtons[i];
      if (!button || !button.node || !ELEMENT_FRAMES[i]) continue;
      const id = i;
      button.node.active = true;
      button.transition = Button.Transition.NONE;
      button.interactable = true;
      paintSpritePaths(button.node, [ELEMENT_FRAMES[id].path]);
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

}
