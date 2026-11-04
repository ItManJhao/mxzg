/**
 * 只读英雄详情页：由 UIManager 传入实例 ID，读取唯一英雄 Model 并订阅服务端同步后的事件。
 * 复用旧详情预制体与立绘；展示服务器基础属性，关闭时释放监听和立绘，不触发养成写操作。
 */
import { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import {presentHeroSkills,heroSkillStatus} from "../HeroSkillPresentation";
import { readHeroEquipment } from "../HeroEquipment";
import { EquipmentIconById } from "../../../framework/assets/IconCatalog";
import { HeroCatalog } from "../HeroCatalog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { _decorator, Button, Label, Node, Sprite, Overflow, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
interface HeroPortraitData { templateId: number; name: string; level: number; }
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { mountBattleSpine } from "../../battle/ui/battleSpine";
import { HERO_DETAIL_SPINE_SEAT_Y } from "./HeroDetailLayout";
import { assignContentSize, positiveUiSize } from "../../../framework/ui/visibleFit";
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

const TALK_BUBBLE = ResourceCatalog.common.other_spr_bubble_5.path;

/**
 * HeroInfoLayer。立绘挂在 node_equip 圆心，台词在 lbl_talk。
 * 底栏字绑在按钮上的 Label。不搜整棵树，不发穿戴和升级。
 */
@ccclass("HeroInfoView")
export class HeroInfoView extends BaseView<{heroId:string}> {
  /** 立绘挂载点，由预制体绑定。 */
  @property(Node)
  portrait: Node | null = null;

  /** 旧对话背景，只读阶段隐藏。 */
  @property(Node)
  talkBubble: Node | null = null;

  /** 旧升级引导台词，只读阶段不写入。 */
  @property(Label)
  talk: Label | null = null;

  /** 英雄名称标题，按配置刷新。 */
  @property(Label)
  nameLabel: Label | null = null;

  /** 旧穿戴标题，入口保持关闭。 */
  @property(Label)
  wearTitle: Label | null = null;

  /** 旧卸下标题，入口保持关闭。 */
  @property(Label)
  offTitle: Label | null = null;

  /** 旧升级标题，入口保持关闭。 */
  @property(Label)
  gradeTitle: Label | null = null;

  /** 旧设置标题，入口保持关闭。 */
  @property(Label)
  settingTitle: Label | null = null;

  /** 旧展开标题，入口保持关闭。 */
  @property(Label)
  unfoldTitle: Label | null = null;

  /** 旧图鉴标题，入口保持关闭。 */
  @property(Label)
  bookTitle: Label | null = null;

  /** 旧菜单容器，展示时清理整屏命中区域。 */
  @property([Node])
  hitMenus: Node[] = [];

  /** 由详情预制体绑定的返回按钮。 */
  @property(Button) backButton:Button|null=null;
  /** 当前等级、星级与只读状态。 */
  @property(Label) summary:Label|null=null;
  /** 基础属性按攻击、生命、防御、速度绑定；不是完整加成战力。 */
  @property([Label]) attributes:Label[]=[];
  /** 由模板元素选择图标，不能沿用预制体占位元素。 */
  @property(Node) elementIcon:Node|null=null;
  /** 四个技能图标节点；空技能显示旧版空槽，锁定技能灰显。 */
  @property([Node]) skillIcons:Node[]=[];
  /** 四个技能名称，来自同等级语言表。 */
  @property([Label]) skillNames:Label[]=[];
  /** 四个技能等级或强化解锁条件。 */
  @property([Label]) skillLevels:Label[]=[];
  /** 四个只读说明入口，不执行养成。 */
  @property([Button]) skillButtons:Button[]=[];
  /** 图标异步绘制代次；每次刷新递增，关闭作废，防止旧图片覆盖新实例。 */
  private paintVersion=0;
  /** 普通装备四槽图标，静态节点不提供穿脱按钮。 */
  @property([Node]) equipmentIcons:Node[]=[];
  /** 按旧物品品质显示四槽边框。 */
  @property([Node]) equipmentFrames:Node[]=[];
  /** 装备星级和附魂等级；旧快照明确显示待同步。 */
  @property([Label]) equipmentLabels:Label[]=[];
  /** 技能按钮解除函数，关闭时逐一释放。 */
  private skillStops:Array<()=>void>=[];
  /** 本次打开的实例 ID；关闭清空，不能误用模板 ID 查找。 */
  private selectedId="";
  /** 当前角色归属；换号后关闭，不能继续显示旧角色详情。 */
  private owner:string|null=null;
  /** 页面持有的动态立绘节点，切换或关闭时销毁。 */
  private spineNode: Node | null = null;
  /** 已加载立绘的模板 ID，仅用于资源复用。 */
  private heroId = 0;
  /** 统一入口只传实例 ID；资料来自唯一名册，不额外发送详情查询。 */
  onOpen(args:{heroId:string}):void {
    if(!args?.heroId)throw new Error("缺少英雄实例 ID");
    this.selectedId=args.heroId;this.owner=HeroRosterModel.instance.roleKey;
    this.backButton?.node.on(Button.EventType.CLICK,this.goBack,this);
    EventDispatcher.instance.on(HeroRosterEvent.Updated,this,this.refresh);
    this.skillButtons.forEach((button,slot)=>{const click=()=>{void UIManager.instance.openById("hero-skill",{heroId:this.selectedId,slot}).catch(error=>GameLog.shared.warn("Hero",String(error)));};button.node.on(Button.EventType.CLICK,click);this.skillStops.push(()=>button.node.off(Button.EventType.CLICK,click));});
    this.refresh();
  }
  /** 读取最新实例和服务器基础属性；角色变化或实例删除即返回列表。 */
  private refresh():void {
    const model=HeroRosterModel.instance;
    const hero=model.snapshot.heroes.find(row=>row.id===this.selectedId);
    if(!hero || model.roleKey!==this.owner){this.goBack();return;}
    const catalog=new HeroCatalog(GameConfig.instance.getFile(GConfig.HeroType),GameConfig.instance.getFile(GConfig.Item));
    const elem=catalog.find(hero.templateId)?.elem;
    const icons=[ResourceCatalog.hero.hero_icon_elem_0,ResourceCatalog.hero.hero_icon_elem_1,ResourceCatalog.hero.hero_icon_elem_2,ResourceCatalog.hero.hero_icon_elem_3,ResourceCatalog.hero.hero_icon_elem_4,ResourceCatalog.hero.hero_icon_elem_5];
    if(this.elementIcon){this.elementIcon.active=!!elem;if(elem)paintSpritePaths(this.elementIcon,[icons[elem].path]);}
    this.show({templateId:hero.templateId,name:catalog.find(hero.templateId)?.name||"未知英雄",level:hero.level});
    if(this.summary)this.summary.string="等级："+hero.level+"    星级："+hero.star+"    强化："+(hero.stage??"—")+"\n基础属性（不含装备、天赋加成）";
    const stats=hero.baseStats;const names=["攻击","生命","防御","速度"],values=stats?[stats.atk,stats.hp,stats.def,stats.spd]:[];
    this.attributes.forEach((label,i)=>{label.string=names[i]+"："+(values[i]??"待同步");});
    const version=++this.paintVersion;
    this.refreshEquipment(hero,version);
    if(this.skillIcons.length)presentHeroSkills(hero).forEach((skill,i)=>{
      const icon=this.skillIcons[i],sprite=icon?.getComponent(Sprite);if(sprite){sprite.spriteFrame=null;sprite.grayscale=skill.id>0 && skill.level===0;}
      if(icon)paintSpritePaths(icon,[skill.icon||ResourceCatalog.hero.hero_info_spr_new_9.path],()=>this.paintVersion===version && this.selectedId===hero.id);
      if(this.skillNames[i])this.skillNames[i].string=skill.name;
      if(this.skillLevels[i])this.skillLevels[i].string=skill.id?heroSkillStatus(skill):"";
      if(this.skillButtons[i])this.skillButtons[i].interactable=skill.id>0;
    });
  }
  /** 从已校验的统一名册绘制四槽；空槽沿用旧资源，不从背包库存推测穿戴。 */
  private refreshEquipment(hero:import("../HeroApi").OwnedHero,version:number):void {
    if(!this.equipmentIcons.length)return;
    const config=GameConfig.instance;
    const items=hero.equipment?readHeroEquipment(hero.equipment.items,config):undefined;
    const empty=[ResourceCatalog.common.other_spr_equip_1,ResourceCatalog.common.other_spr_equip_2,ResourceCatalog.common.other_spr_equip_3,ResourceCatalog.common.other_spr_equip_4];
    const rare=[ResourceCatalog.common.other_rare_0,ResourceCatalog.common.other_rare_1,ResourceCatalog.common.other_rare_2,ResourceCatalog.common.other_rare_3,ResourceCatalog.common.other_rare_4,ResourceCatalog.common.other_rare_5,ResourceCatalog.common.other_rare_6];
    this.equipmentIcons.forEach((icon,index)=>{
      const item=items?.find(row=>row.slot===index+1),frame=this.equipmentFrames[index];
      const sprite=icon.getComponent(Sprite);if(sprite)sprite.spriteFrame=null;
      let path:string=empty[index].path,quality=0,status=items?"":"待同步";
      if(item){const template=config.requireConfig(GConfig.EquipmentType,item.templateId);const itemConfig=config.requireConfig(GConfig.Item,item.templateId);path=EquipmentIconById[item.templateId]?.path||path;quality=itemConfig.rare_mark||0;status="★"+template.star+(item.soulLevel?" · 附魂"+item.soulLevel:"");}
      const current=()=>this.paintVersion===version&&this.selectedId===hero.id;
      paintSpritePaths(icon,[path],current);
      if(frame){frame.active=true;const border=frame.getComponent(Sprite);if(border)border.spriteFrame=null;paintSpritePaths(frame,[rare[quality]?.path||rare[0].path],current);}
      if(this.equipmentLabels[index])this.equipmentLabels[index].string=status;
    });
  }
  /** 返回已有列表，不触发升级、穿戴或扩容。 */
  private goBack():void {
    if (HeroRosterModel.instance.roleKey !== this.owner) { UIManager.instance.back(); return; }
    // 当前导航只保留主城根页面，详情必须显式打开列表，不能直接调用 back 回主城。
    void UIManager.instance.openById("hero").catch(error => GameLog.shared.warn("Hero", "返回英雄列表失败：" + String(error)));
  }
  /** 关页释放订阅和立绘；异步加载由无效节点检查阻止回写。 */
  onClose():void {
    EventDispatcher.instance.offTarget(this);this.backButton?.node?.off(Button.EventType.CLICK,this.goBack,this);
    this.paintVersion++;for(const stop of this.skillStops.splice(0))stop();UIManager.instance.closeById("hero-skill");
    this.selectedId="";this.owner=null;if(this.spineNode?.isValid)this.spineNode.destroy();this.spineNode=null;this.heroId=0;
  }

/** 显示显式传入的英雄资料，不读取其他角色仓库。 */
  show(hero: HeroPortraitData): void {
    this.silenceHits();
    this.writeName(hero);
    // 只读版本的写操作节点已在 Prefab 中关闭。
    // 旧升级引导台词不属于只读详情，不显示。
    this.mountPortrait(hero);
  }

/** 把传入名称写入既有标题控件，缺名时显示通用标题。 */
  private writeName(hero: HeroPortraitData): void {
    if (!this.nameLabel) return;
    const name = hero.name && hero.name.length > 0 ? hero.name : "英雄";
    this.nameLabel.string = name;
    this.nameLabel.node.active = true;
  }

  /** 为保留的旧养成按钮设置标题；只读页面不调用。 */
  private writeActions(): void {
    this.fitAction(this.wearTitle, HERO_DETAIL_WEAR, 22);
    this.fitAction(this.offTitle, HERO_DETAIL_OFF, 22);
    this.fitAction(this.gradeTitle, HERO_DETAIL_GRADE, 22);
    this.fitAction(this.settingTitle, HERO_DETAIL_SETTING, 16);
    this.fitAction(this.unfoldTitle, HERO_DETAIL_UNFOLD, 16);
    this.fitAction(this.bookTitle, HERO_DETAIL_BOOK, 16);
  }

/** 按传入等级选择展示文案，不推断角色养成状态。 */
  private writeTalk(hero: HeroPortraitData): void {
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
  private mountPortrait(hero: HeroPortraitData): void {
    const host = this.portrait;
    if (!host) {
      GameLog.shared.warn("Hero", "HeroInfoLayer 没有 node_equip");
      return;
    }
    host.active = true;
    const id = hero.templateId;
    if (this.spineNode && this.spineNode.isValid && this.heroId === id) return;
    if (this.spineNode && this.spineNode.isValid) this.spineNode.destroy();
    this.spineNode = null;
    this.heroId = id;
    if (!id) return;
    const actor = mountBattleSpine(host, String(id), () => {
      GameLog.shared.warn("Hero", "详情立绘没有挂上");
    }, { seatY: -160, scale: 2.13 });
    this.spineNode = actor.node;
    if (this.spineNode.parent === host) this.spineNode.setSiblingIndex(1);
  }

  /** 按旧按钮尺寸缩放标题，供后续恢复养成入口时使用。 */
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

  /** 清除旧菜单的整屏命中区域，避免挡住返回按钮。 */
  private silenceHits(): void {
    for (let i = 0; i < this.hitMenus.length; i++) this.zeroIfHuge(this.hitMenus[i]);
  }

  /** 仅清空异常大的菜单命中尺寸，保留正常局部控件。 */
  private zeroIfHuge(node: Node | null): void {
    if (!node) return;
    const ui = node.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }
}
