/**
 * 英雄头像格子：按传入展示数据更新图片、等级和星级，保持 Prefab 结构和绑定可编辑。
 */
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { HERO_FACE_FALLBACK, HeroCellModel } from "./HeroListPresentation";

const { ccclass, property } = _decorator;

const ELEMENT_FRAMES = [ResourceCatalog.hero.hero_icon_elem_0, ResourceCatalog.hero.hero_icon_elem_1, ResourceCatalog.hero.hero_icon_elem_2, ResourceCatalog.hero.hero_icon_elem_3, ResourceCatalog.hero.hero_icon_elem_4, ResourceCatalog.hero.hero_icon_elem_5] as const;

/**
 * HeroIconCell 上的一格。脸、名字、元素、星、等级、锁和出战标都绑在预制上。
 */
@ccclass("HeroIconCellView")
export class HeroIconCellView extends Component {
  @property(Button)
  button: Button | null = null;
  @property(Node)
  face: Node | null = null;

  @property(Label)
  nameLabel: Label | null = null;

  @property(Node)
  elem: Node | null = null;

  @property([Node])
  stars: Node[] = [];

  @property(Label)
  levelLabel: Label | null = null;

  @property(Node)
  lock: Node | null = null;

  @property(Node)
  battle: Node | null = null;

  private tap: (() => void) | null = null;

  validateBindings(): void {
    const fields = { button: this.button, face: this.face, nameLabel: this.nameLabel, elem: this.elem,
      levelLabel: this.levelLabel, lock: this.lock, battle: this.battle };
    for (const [field, value] of Object.entries(fields)) {
      if (!value) throw new Error("assets/prefabs/ui/hero/HeroIconCellView.prefab / HeroIconCellView: 缺失绑定 " + field);
    }
    if (this.stars.length !== 5 || this.stars.some(star => !star))
      throw new Error("assets/prefabs/ui/hero/HeroIconCellView.prefab / HeroIconCellView: stars 必须绑定五颗星");
    if (!this.face!.getComponent(Sprite))
      throw new Error("assets/prefabs/ui/hero/HeroIconCellView.prefab / HeroIconCellView: face 缺少 Sprite");
  }

  show(cell: HeroCellModel, onTap: (() => void) | null): void {
    this.validateBindings();
    const empty = cell.kind === "empty";
    this.paintFace(cell, empty);
    this.paintName(cell, empty);
    this.paintElem(cell, empty);
    this.paintStars(empty ? 0 : cell.stars);
    this.paintLevel(empty ? null : cell.level);
    if (this.lock) this.lock.active = !empty && cell.locked;
    if (this.battle) this.battle.active = !empty && cell.deployed && !cell.locked;
    this.bindTap(empty || !onTap ? null : onTap);
  }

  /** 空槽跟日服一样不提示。有英雄或未获得才回一句。 */
  private bindTap(onTap: (() => void) | null): void {
    if (this.tap) {
      this.node.off(Button.EventType.CLICK, this.tap);
      this.tap = null;
    }
    const button = this.button!;
    if (!onTap) {
      if (button) button.interactable = false;
      return;
    }
    button.interactable = true;
    const run = () => onTap();
    this.tap = run;
    this.node.on(Button.EventType.CLICK, run);
  }

  private paintFace(cell: HeroCellModel, empty: boolean): void {
    if (!this.face) return;
    const image = this.face.getComponent(Sprite);
    if (image) image.grayscale = !empty && cell.locked;
    if (empty || !cell.face) {
      this.face.active = false;
      return;
    }
    this.face.active = true;
    paintSpritePaths(this.face, [cell.face, HERO_FACE_FALLBACK]);
  }

  private paintName(cell: HeroCellModel, empty: boolean): void {
    if (!this.nameLabel) return;
    const show = !empty && cell.showName && cell.name.length > 0;
    this.nameLabel.node.active = show;
    this.nameLabel.string = show ? cell.name : "";
  }

  /** 显示合法元素对应的静态图标；未知元素隐藏，禁止拼接不存在的路径。 */
  private paintElem(cell: HeroCellModel, empty: boolean): void {
    if (!this.elem) return;
    const show = !empty && cell.elem !== null && !!ELEMENT_FRAMES[cell.elem];
    this.elem.active = show;
    if (show && cell.elem !== null) paintSpritePaths(this.elem, [ELEMENT_FRAMES[cell.elem].path]);
  }

  private paintStars(count: number): void {
    const n = count > 5 ? 5 : count < 0 ? 0 : count;
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (!star) continue;
      star.active = i < n;
    }
  }

  private paintLevel(level: number | null): void {
    if (!this.levelLabel) return;
    const show = level !== null;
    this.levelLabel.node.active = show;
    this.levelLabel.string = show ? String(level) : "";
  }
}
