import { _decorator, Component, Label, Node, Overflow, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
import { StoreHero } from "../../../core/GameStore";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { mountBattleSpine } from "../../../ui/battleSpine";
import { HERO_DETAIL_SPINE_SEAT_Y } from "../../../ui/heroDetailPlan";
import { hangSpineStem } from "../../../ui/idleHangRoster";
import { assignContentSize, positiveUiSize } from "../../../ui/visibleFit";
import {
  HERO_DETAIL_BOOK,
  HERO_DETAIL_GRADE,
  HERO_DETAIL_OFF,
  HERO_DETAIL_SETTING,
  HERO_DETAIL_UNFOLD,
  HERO_DETAIL_WEAR,
  heroDetailTalk,
} from "./heroChrome";

const { ccclass, property } = _decorator;

const TALK_BUBBLE = "ui/common/other_spr-bubble-5";

/**
 * HeroInfoLayer。立绘挂在 node_equip 圆心，台词在 lbl_talk。
 * 底栏字绑在按钮上的 Label。不搜整棵树，不发穿戴和升级。
 */
@ccclass("HeroInfoView")
export class HeroInfoView extends Component {
  @property(Node)
  portrait: Node | null = null;

  @property(Node)
  talkBubble: Node | null = null;

  @property(Label)
  talk: Label | null = null;

  @property(Label)
  nameLabel: Label | null = null;

  @property(Label)
  wearTitle: Label | null = null;

  @property(Label)
  offTitle: Label | null = null;

  @property(Label)
  gradeTitle: Label | null = null;

  @property(Label)
  settingTitle: Label | null = null;

  @property(Label)
  unfoldTitle: Label | null = null;

  @property(Label)
  bookTitle: Label | null = null;

  @property([Node])
  hitMenus: Node[] = [];

  private spineNode: Node | null = null;
  private heroId = 0;

  show(hero: StoreHero): void {
    this.silenceHits();
    this.writeName(hero);
    this.writeActions();
    this.writeTalk(hero);
    this.mountPortrait(hero);
  }

  private writeName(hero: StoreHero): void {
    if (!this.nameLabel) return;
    const name = hero.name && hero.name.length > 0 ? hero.name : "英雄";
    this.nameLabel.string = name;
    this.nameLabel.node.active = true;
  }

  private writeActions(): void {
    this.fitAction(this.wearTitle, HERO_DETAIL_WEAR, 22);
    this.fitAction(this.offTitle, HERO_DETAIL_OFF, 22);
    this.fitAction(this.gradeTitle, HERO_DETAIL_GRADE, 22);
    this.fitAction(this.settingTitle, HERO_DETAIL_SETTING, 16);
    this.fitAction(this.unfoldTitle, HERO_DETAIL_UNFOLD, 16);
    this.fitAction(this.bookTitle, HERO_DETAIL_BOOK, 16);
  }

  private writeTalk(hero: StoreHero): void {
    const line = heroDetailTalk(hero.level);
    if (this.talkBubble) {
      this.talkBubble.active = true;
      paintSpritePaths(this.talkBubble, [TALK_BUBBLE]);
    }
    if (!this.talk) {
      GameLog.shared.warn("Hero", "HeroInfoLayer 没有 lbl_talk");
      return;
    }
    this.talk.node.active = true;
    this.talk.string = line;
    this.talk.fontSize = 18;
    this.talk.lineHeight = 22;
    let ui = this.talk.node.getComponent(UITransform);
    if (!ui) ui = this.talk.node.addComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!size || size.width < 8 || size.height < 8) assignContentSize(ui, 200, 56);
    this.talk.overflow = Overflow.SHRINK;
  }

  /** 动态立绘。加载失败只打日志，节点留着，不退回头像贴图。 */
  private mountPortrait(hero: StoreHero): void {
    const host = this.portrait;
    if (!host) {
      GameLog.shared.warn("Hero", "HeroInfoLayer 没有 node_equip");
      return;
    }
    host.active = true;
    const id = hero.heroId && hero.heroId > 0 ? hero.heroId : hero.heroType || 0;
    if (this.spineNode && this.spineNode.isValid && this.heroId === id) return;
    if (this.spineNode && this.spineNode.isValid) this.spineNode.destroy();
    this.spineNode = null;
    this.heroId = id;
    if (!id) return;
    const actor = mountBattleSpine(host, hangSpineStem(id, hero.heroType), () => {
      GameLog.shared.warn("Hero", "详情立绘没有挂上");
    }, { seatY: HERO_DETAIL_SPINE_SEAT_Y });
    this.spineNode = actor.node;
    if (this.spineNode.parent === host) this.spineNode.setSiblingIndex(1);
  }

  private fitAction(label: Label | null, text: string, size: number): void {
    if (!label) return;
    label.string = text;
    label.fontSize = size;
    label.lineHeight = size + 4;
    label.node.active = true;
    let ui = label.node.getComponent(UITransform);
    if (!ui) ui = label.node.addComponent(UITransform);
    const parent = label.node.parent ? label.node.parent.getComponent(UITransform) : null;
    const parentSize = positiveUiSize(parent);
    const width = parentSize && parentSize.width > 8 ? Math.max(8, parentSize.width - 8) : 96;
    const height = parentSize && parentSize.height > 8 ? Math.max(8, Math.min(28, parentSize.height)) : 24;
    assignContentSize(ui, width, height);
    label.overflow = Overflow.SHRINK;
  }

  private silenceHits(): void {
    for (let i = 0; i < this.hitMenus.length; i++) this.zeroIfHuge(this.hitMenus[i]);
  }

  private zeroIfHuge(node: Node | null): void {
    if (!node) return;
    const ui = node.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }
}
