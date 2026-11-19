/**
 * 英雄详情页读取名册与背包。选装、卸下和升级分别交给对应控制器，显示服务端属性。
 * Prefab 保存界面、普通装备槽和音画挂点，关闭释放监听、立绘和特效。
 */
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import type { AssetScope } from "../../../framework/assets/ResourceAssetsUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroEquipmentController } from "../HeroEquipmentController";
import { HeroLevelController } from "../HeroLevelController";
import { HeroLevelEvent } from "../utils/HeroLevelEvent";
import { HeroSkillView } from "./HeroSkillView";
import { HeroAttributesView } from "./HeroAttributesView";
import { HeroEquipmentPickerView } from "./HeroEquipmentPickerView";
import { HeroSkillUtils } from "../utils/HeroSkillUtils";
import { HeroEquipmentUtils } from "../utils/HeroEquipmentUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroCatalog } from "../utils/HeroCatalog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { _decorator, AudioSource, Button, Color, Label, Node, Sprite, SpriteFrame, UIOpacity } from "cc";
import { GameLog } from "../../../core/GameLog";
interface HeroPortraitData { templateId: number; name: string; level: number; }
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { EquipmentInfoView } from "../../bag/ui/EquipmentInfoView";

/** 当前英雄及进入详情时的筛选顺序，持久数据仍由名册读取。 */
interface HeroInfoArgs {
    readonly heroId: string;
    readonly heroIds?: readonly string[];
}

const { ccclass, property } = _decorator;
/** 旧 effect.lua 7 号普通升级特效的帧间隔与淡入时长，单位为秒。 */
const UPGRADE_FRAME_SECONDS = 0.06;
const UPGRADE_FADE_SECONDS = 0.1;

/**
 * 详情布局由 Prefab 绑定，使用同一英雄实例打开装备、技能与属性的子窗口。
 */
@UIRegistry.view({
    id: "hero-info",
    prefab: "bundles/module/hero/prefabs/HeroInfoView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("HeroInfoView")
export class HeroInfoView extends BaseView<HeroInfoArgs> {
    /** 立绘挂载点，由预制体绑定。 */
    @property(Node)
    portrait: Node | null = null;

    /** 英雄名称标题，按配置刷新。 */
    @property(Label)
    nameLabel: Label | null = null;

    /** 由详情预制体绑定的返回按钮。 */
    @property(Button) backButton: Button | null = null;
    /** 当前等级和已同步的升级上限。 */
    @property(Label) summary: Label | null = null;
    /** 服务端面板按攻击、生命、防御、速度绑定；不在客户端叠加装备。 */
    @property([Label]) attributes: Label[] = [];
    /** 由模板元素选择图标，不能沿用预制体占位元素。 */
    @property(Node) elementIcon: Node | null = null;
    /** 四个技能图标节点；空技能显示旧版空槽，锁定技能灰显。 */
    @property([Node]) skillIcons: Node[] = [];
    /** 四个技能名称，来自同等级语言表。 */
    @property([Label]) skillNames: Label[] = [];
    /** 四个技能等级或强化解锁条件。 */
    @property([Label]) skillLevels: Label[] = [];
    /** 四个只读说明入口，不执行养成。 */
    @property([Button]) skillButtons: Button[] = [];
    /** 图标异步绘制代次；每次刷新递增，关闭作废，防止旧图片覆盖新实例。 */
    private paintVersion = 0;
    /** 普通装备四槽的图标节点，按权威穿戴绘制。 */
    @property([Node]) equipmentIcons: Node[] = [];
    /** 按旧物品品质显示四槽边框。 */
    @property([Node]) equipmentFrames: Node[] = [];
    /** 装备星级和附魂等级；旧快照明确显示待同步。 */
    @property([Label]) equipmentLabels: Label[] = [];
    /** 普通装备四槽的操作入口，空槽选装，已穿槽查看详情。 */
    @property([Button]) equipmentButtons: Button[] = [];
    /** 当前部位有候选升级时显示的旧红点。 */
    @property([Node]) equipmentDots: Node[] = [];
    /** 有可提升装备时出现在旧按钮位。 */
    @property(Button) equipAllButton: Button | null = null;
    /** 一键穿装存在改进时显示红点。 */
    @property(Node) equipAllDot: Node | null = null;
    /** 没有可提升装备且已穿装备时出现在同一按钮位。 */
    @property(Button) unequipAllButton: Button | null = null;
    /** 原版穿装和单件卸下音效的预制体音源。 */
    @property(AudioSource) equipmentAudio: AudioSource | null = null;
    /** 前后箭头沿进入详情时的名册顺序切换。 */
    @property(Button) previousHeroButton: Button | null = null;
    /** 最后一名英雄不显示下一名按钮。 */
    @property(Button) nextHeroButton: Button | null = null;
    /** 低阶英雄标题行的金色星标。 */
    @property([Node]) heroStars: Node[] = [];
    /** 超出单行星标时显示实际星数。 */
    @property(Label) heroStarCount: Label | null = null;
    /** 与模板职业对应的图标。 */
    @property(Node) professionIcon: Node | null = null;
    /** 用同源语言表显示英雄职业。 */
    @property(Label) professionLabel: Label | null = null;
    /** 由服务端按当前已恢复属性来源计算的个人战力。 */
    @property(Label) heroPowerLabel: Label | null = null;
    /** 展开服务器已同步的属性明细。 */
    @property(Button) attributeButton: Button | null = null;
    /** 提交当前英雄实例的普通升级。 */
    @property(Button) upgradeButton: Button | null = null;
    /** 当前可升的级数或请求等待提示。 */
    @property(Label) upgradeLabel: Label | null = null;
    /** 有可负担升级时显示的旧红点。 */
    @property(Node) upgradeDot: Node | null = null;
    /** 两项消耗的组合节点，等待回复、达到上限或未同步时隐藏。 */
    @property(Node) upgradeCosts: Node | null = null;
    /** 当前升级金币消耗，余额不足时按旧规则标红。 */
    @property(Label) upgradeGold: Label | null = null;
    /** 当前升级英雄经验消耗，余额不足时按旧规则标红。 */
    @property(Label) upgradeExperience: Label | null = null;
    /** 等级上限或配置未同步时取代升级栏。 */
    @property(Label) upgradeStatus: Label | null = null;
    /** 旧普通升级单次光效，静态挂在立绘上方。 */
    @property(Sprite) upgradeEffect: Sprite | null = null;
    /** 光效淡入通道，独立于立绘和详情控件。 */
    @property(UIOpacity) upgradeEffectOpacity: UIOpacity | null = null;
    /** 页面技能及装备按钮的解除函数，关闭时逐一释放。 */
    private skillStops: Array<() => void> = [];
    /** 本次打开的实例 ID；关闭清空，不能误用模板 ID 查找。 */
    private selectedId = "";
    /** 页面关闭后为true，阻止迟到的展示刷新和导航；账号变化由应用统一关闭页面。 */
    private closed = true;
    /** 页面持有的动态立绘节点，切换或关闭时销毁。 */
    private spineNode: Node | null = null;
    /** 已加载立绘的模板 ID，仅用于资源复用。 */
    private heroId = 0;
    /** 此次动画的资源持有，关闭或下一轮动画开始时释放。 */
    private upgradeEffectScope: AssetScope | null = null;
    /** 已准备的有序升级帧；播放结束后清空。 */
    private upgradeFrames: readonly SpriteFrame[] = [];
    /** 从动画开始累计的显示秒数，保持原淡入时序。 */
    private upgradeEffectTime = 0;

    /** 仅将完整外根铺到画布，固定内容由Prefab Widget和ViewportScale处理。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 绑定当前英雄、培养按钮和其子窗，订阅唯一名册及装备库存。 */
    onOpen(args: HeroInfoArgs): void {
        if (!args?.heroId) {
            throw new Error("缺少英雄实例 ID");
        }
        this.clearListeners();
        this.stopUpgradeEffect();
        this.closed = false;
        this.selectedId = args.heroId;
        this.backButton?.node.on(Button.EventType.CLICK, this.goBack, this);
        this.upgradeButton?.node.on(Button.EventType.CLICK, this.upgrade, this);
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        EventDispatcher.instance.on(HeroLevelEvent.Updated, this, this.onUpgradeChanged);
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshEquipmentActions);
        EventDispatcher.instance.on("hero-equipment:updated", this, this.onEquipmentChanged);
        this.listenDetail(this.previousHeroButton, () => this.moveHero(-1));
        this.listenDetail(this.nextHeroButton, () => this.moveHero(1));
        this.listenDetail(this.equipAllButton, () => HeroEquipmentController.instance.changeAll(this.selectedId, true));
        this.listenDetail(this.unequipAllButton, () => HeroEquipmentController.instance.changeAll(this.selectedId, false));
        this.listenDetail(this.attributeButton, () => this.openAttributes());
        this.equipmentButtons.forEach((button, index) => this.listenDetail(button, () => this.openEquipment(index + 1)));
        this.skillButtons.forEach((button, slot) => {
            const click = () => {
                if (this.closed) {
                    return;
                }
                void UIManager.instance.openChild(this, HeroSkillView, { heroId: this.selectedId, slot })
                    .catch(error => {
                        if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                            GameLog.shared.classified("MODULE", "warn", "Hero", "技能详情未能打开：" + String(error));
                        }
                    });
            };
            button.node.on(Button.EventType.CLICK, click);
            this.skillStops.push(() => button.node.off(Button.EventType.CLICK, click));
        });
        this.refresh();
    }

    /** 将详情新增按钮与当前打开期绑定，复用现有解绑流程。 */
    private listenDetail(button: Button | null, click: () => void): void {
        if (button) {
            const node = button.node;
            node.on(Button.EventType.CLICK, click);
            this.skillStops.push(() => { if (node.isValid) node.off(Button.EventType.CLICK, click); });
        }
    }

    /** 返回当前选中英雄的权威快照条目。 */
    private currentHero(): OwnedHero | undefined {
        return HeroRosterModel.instance.snapshot.heroes.find(row => row.id === this.selectedId);
    }

    /** 沿本次名册顺序切换英雄，切换时结束旧英雄的局部光效。 */
    private moveHero(step: -1 | 1): void {
        const order = this.args?.heroIds ?? [];
        const index = order.indexOf(this.selectedId);
        const heroId = index < 0 ? undefined : order[index + step];
        if (!this.closed && heroId && HeroRosterModel.instance.snapshot.heroes.some(hero => hero.id === heroId)) {
            this.stopUpgradeEffect();
            this.selectedId = heroId;
            this.refresh();
        }
    }

    /** 打开权威属性明细，跟随本页关闭。 */
    private openAttributes(): void {
        void UIManager.instance.openChild(this, HeroAttributesView, { heroId: this.selectedId })
            .catch(() => { /* UIManager 报告开窗失败。 */ });
    }

    /** 空槽直接选装，已穿槽沿旧版先显示换装或卸下的共享装备详情。 */
    private openEquipment(slot: number): void {
        const equipment = this.currentHero()?.equipment;
        if (!equipment) {
            return;
        }
        if (!equipment.items.some(item => item.slot === slot)) {
            this.openEquipmentPicker(slot);
            return;
        }
        void UIManager.instance.openChild(this, EquipmentInfoView, {
            heroId: this.selectedId, slot, onReplace: () => this.openEquipmentPicker(slot),
        }).catch(() => { /* UIManager 报告开窗失败。 */ });
    }

    /** 由空槽或更换入口打开同一部位选择窗。 */
    private openEquipmentPicker(slot: number): void {
        if (!this.closed) {
            void UIManager.instance.openChild(this, HeroEquipmentPickerView, { heroId: this.selectedId, slot })
                .catch(() => { /* UIManager 报告开窗失败。 */ });
        }
    }

    /** 用已同步的背包装备显示旧版红点与一键操作。 */
    private refreshEquipmentActions(): void {
        if (this.closed) {
            return;
        }
        const worn = this.currentHero()?.equipment?.items;
        const ready = !!worn && BagModel.instance.snapshot.synced;
        const better = ready ? HeroEquipmentUtils.betterSlots(BagModel.instance.items, worn) : new Set<number>();
        const busy = HeroEquipmentController.instance.busy;
        this.equipmentButtons.forEach(button => { button.interactable = ready && !busy; });
        this.equipmentDots.forEach((node, index) => { node.active = better.has(index + 1); });
        if (this.equipAllButton) {
            this.equipAllButton.node.active = better.size > 0;
            this.equipAllButton.interactable = !busy;
        }
        if (this.equipAllDot) {
            this.equipAllDot.active = better.size > 0;
        }
        if (this.unequipAllButton) {
            this.unequipAllButton.node.active = ready && better.size === 0 && worn.length > 0;
            this.unequipAllButton.interactable = !busy;
        }
    }

    /** 装备操作回包只刷新按钮和原音效，具体属性由统一快照刷新。 */
    private onEquipmentChanged(receipt?: { heroId: string; changed: boolean; action: string }): void {
        this.refreshEquipmentActions();
        const source = this.equipmentAudio;
        if (!source || this.closed || !receipt?.changed || receipt.heroId !== this.selectedId || receipt.action === "UNEQUIP_ALL") {
            return;
        }
        void ResourceAssetsUtils.forNode(this.node).loadPath("audio/equip-wear-1", "AudioClip").then(clip => {
            if (!this.closed && source.isValid && receipt.heroId === this.selectedId) {
                source.clip = clip;
                source.play();
            }
        }).catch(error => GameLog.shared.warnOnce("MODULE", "HeroInfoView", "EQUIP_SOUND", String(error)));
    }
    /** 读取最新实例、服务器属性和当前模板行；不为刷新建立配置索引，实例移除时关闭或返回。 */
    private refresh(): void {
        if (this.closed) {
            return;
        }
        const state = HeroRosterModel.instance.snapshot;
        const hero = this.currentHero();
        if (!hero) {
            if (state.status === "ready") {
                this.goBack();
            } else {
                this.close();
            }
            return;
        }
        const template = HeroCatalog.find(hero.templateId);
        const elem = template?.elem;
        const icons = [ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-0", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-1", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-2", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-3", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-4", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-5", "SpriteFrame")];
        if (this.elementIcon) {
            this.elementIcon.active = !!elem;
            if (elem) {
                ResManager.setSprite(this.elementIcon, icons[elem]);
            }
        }
        this.show({ templateId: hero.templateId, name: template?.name || "未知英雄", level: hero.level });
        const levelLimit = this.refreshUpgrade();
        if (this.summary) {
            const level = levelLimit === null ? String(hero.level) : `${hero.level}/${levelLimit}`;
            this.summary.string = `等级：${level}    强化：${hero.stage ?? "—"}`;
        }
        this.refreshHeader(hero);
        const stats = hero.panelStats?.values; const names = ["攻击", "生命", "防御", "速度"], values = stats ? [stats.atk, stats.hp, stats.def, stats.spd] : [];
        this.attributes.forEach((label, i) => { label.string = names[i] + "：" + (values[i] ?? "待同步"); });
        const version = ++this.paintVersion;
        this.refreshEquipment(hero, version);
        this.refreshEquipmentActions();
        if (this.skillIcons.length) HeroSkillUtils.present(hero).forEach((skill, i) => {
            const icon = this.skillIcons[i], sprite = icon?.getComponent(Sprite); if (sprite) { sprite.spriteFrame = null; sprite.grayscale = skill.id > 0 && skill.level === 0; }
            if (icon) ResManager.setSprite(icon, [skill.icon || "hero/ui/hero-info_spr-new-9"], () => this.paintVersion === version && this.selectedId === hero.id);
            if (this.skillNames[i]) this.skillNames[i].string = skill.name;
            if (this.skillLevels[i]) this.skillLevels[i].string = skill.id ? HeroSkillUtils.status(skill) : "";
            if (this.skillButtons[i]) this.skillButtons[i].interactable = skill.id > 0 && skill.available;
        });
    }

    /** 显示真实星级、职业、个人战力以及当前名册顺序的翻页状态。 */
    private refreshHeader(hero: OwnedHero): void {
        const config = GameConfig.instance;
        const occupation = config.getConfig(GConfig.HeroType, hero.templateId)?.occupation;
        if (this.professionLabel) {
            const job = occupation && config.getConfig(GConfig.Language, 111000 + occupation)?.value;
            this.professionLabel.string = job ? `职业：${job}` : "";
        }
        if (this.professionIcon) {
            this.professionIcon.active = !!occupation;
            ResManager.setSprite(this.professionIcon, occupation ? ResManager.ui("hero", "hero-info_icon-occup-" + occupation) : null);
        }
        const visibleStars = hero.star < 10 ? (hero.star > 5 ? hero.star - 5 : hero.star) : 0;
        const starFrame = ResManager.ui("common", hero.star > 5 ? "other_star-1" : "other_star-0");
        this.heroStars.forEach((star, index) => {
            star.active = index < visibleStars;
            if (star.active) {
                ResManager.setSprite(star, starFrame);
            }
        });
        if (this.heroStarCount) {
            this.heroStarCount.node.active = hero.star >= 10;
            this.heroStarCount.string = `${hero.star} 星`;
        }
        if (this.heroPowerLabel) {
            const power = hero.panelStats?.power;
            this.heroPowerLabel.node.parent!.active = power !== undefined;
            this.heroPowerLabel.string = power === undefined ? "" : String(power);
        }
        if (this.attributeButton) {
            this.attributeButton.interactable = !!hero.panelStats;
        }
        const order = this.args?.heroIds ?? [];
        const index = order.indexOf(hero.id);
        if (this.previousHeroButton) {
            this.previousHeroButton.interactable = index > 0;
            this.previousHeroButton.node.active = this.previousHeroButton.interactable;
        }
        if (this.nextHeroButton) {
            this.nextHeroButton.interactable = index >= 0 && index < order.length - 1;
            this.nextHeroButton.node.active = this.nextHeroButton.interactable;
        }
    }

    /** 刷新按钮、旧红点与金币/英雄经验消耗，返回标题可显示的当前上限。 */
    private refreshUpgrade(): number | null {
        if (this.closed || !this.upgradeButton || !this.upgradeLabel || !this.upgradeDot || !this.upgradeCosts
            || !this.upgradeGold || !this.upgradeExperience || !this.upgradeStatus) {
            return null;
        }
        const quote = HeroLevelController.instance.describe(this.selectedId);
        const ready = quote.status === "ready";
        const pending = quote.status === "pending";
        this.upgradeButton.node.active = ready || pending;
        this.upgradeButton.interactable = ready;
        this.upgradeLabel.string = pending ? "升级中…" : quote.jumpLabel ? `升${quote.levels}级` : "升级";
        this.upgradeDot.active = ready && quote.levels > 0;
        this.upgradeCosts.active = ready;
        this.upgradeGold.string = UiKitUtils.formatAmount(quote.gold);
        this.upgradeGold.color = quote.goldEnough ? Color.WHITE : new Color(255, 0, 0);
        this.upgradeExperience.string = UiKitUtils.formatAmount(quote.heroExp);
        this.upgradeExperience.color = quote.heroExpEnough ? Color.WHITE : new Color(255, 0, 0);
        this.upgradeStatus.node.active = !ready && !pending;
        this.upgradeStatus.string = quote.status === "max" ? "已达当前等级上限" : "升级条件待同步";
        return quote.levelLimit;
    }

    /** 升级按钮把当前英雄交给控制器，界面从升级事件刷新显示。 */
    private upgrade(): void {
        if (!this.closed && this.upgradeButton?.interactable) {
            HeroLevelController.instance.upgrade(this.selectedId);
        }
    }

    /** 按请求忙态重绘升级栏，当前英雄的成功回包触发光效。 */
    private onUpgradeChanged(event?: { heroId?: string; fromLevel?: number; toLevel?: number }): void {
        if (this.closed) {
            return;
        }
        this.refreshUpgrade();
        if (event?.heroId === this.selectedId && event.toLevel !== undefined && event.fromLevel !== undefined
            && event.toLevel > event.fromLevel) {
            void this.playUpgradeEffect();
        }
    }

    /** 准备旧 upexp 00–29 帧；确认先于美术加载，资源异常仅影响当前光效。 */
    private async playUpgradeEffect(): Promise<void> {
        if (!this.upgradeEffect || !this.upgradeEffectOpacity) {
            return;
        }
        this.stopUpgradeEffect();
        const scope = ResourceAssetsUtils.createAssetScope();
        this.upgradeEffectScope = scope;
        try {
            const frames = await Promise.all(Array.from({ length: 30 }, (_, index) =>
                scope.load(ResourceAssetsUtils.sprite(ResManager.ui("hero",
                    "hero-info-effect_upexp-" + String(index).padStart(2, "0"))))));
            if (this.upgradeEffectScope === scope) {
                this.upgradeFrames = frames;
                this.upgradeEffect.node.active = true;
                this.update(0);
            }
        } catch (error) {
            if (this.upgradeEffectScope === scope) {
                this.stopUpgradeEffect();
                GameLog.shared.classified("MODULE", "warn", "Hero", "升级光效加载失败：" + String(error));
            }
        }
    }

    /** 按原 60 毫秒每帧推进 30 帧，前 100 毫秒渐入，结束归还引用。 */
    public update(deltaSeconds: number): void {
        if (!this.upgradeFrames.length || !this.upgradeEffect || !this.upgradeEffectOpacity) {
            return;
        }
        this.upgradeEffectTime += Math.max(0, deltaSeconds);
        const index = Math.floor(this.upgradeEffectTime / UPGRADE_FRAME_SECONDS);
        if (index >= this.upgradeFrames.length) {
            this.stopUpgradeEffect();
            return;
        }
        this.upgradeEffect.spriteFrame = this.upgradeFrames[index];
        this.upgradeEffectOpacity.opacity = Math.round(255 * Math.min(1, this.upgradeEffectTime / UPGRADE_FADE_SECONDS));
    }

    /** 撤销迟到加载及帧引用，避免关页或切换实例后重放旧特效。 */
    private stopUpgradeEffect(): void {
        if (this.upgradeEffect?.isValid) {
            this.upgradeEffect.node.active = false;
            this.upgradeEffect.spriteFrame = null;
        }
        this.upgradeFrames = [];
        this.upgradeEffectTime = 0;
        this.upgradeEffectScope?.dispose();
        this.upgradeEffectScope = null;
    }

    /** 从已校验的统一名册绘制四槽，按显示需要取得空槽和品质框；不从背包库存推测穿戴。 */
    private refreshEquipment(hero: OwnedHero, version: number): void {
        if (!this.equipmentIcons.length) {
            return;
        }
        const config = GameConfig.instance;
        const items = hero.equipment ? HeroEquipmentUtils.readHeroEquipment(hero.equipment.items, config) : undefined;
        const empty = [1, 2, 3, 4].map(slot => ResManager.ui("common", "other_spr-equip-" + slot));
        this.equipmentIcons.forEach((icon, index) => {
            const item = items?.find(row => row.slot === index + 1);
            const frame = this.equipmentFrames[index];
            const sprite = icon.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = null;
            }
            let path: string = empty[index];
            let quality = 0;
            let status = items ? "" : "待同步";
            if (item) {
                const template = config.requireConfig(GConfig.EquipmentType, item.templateId);
                const itemConfig = config.requireConfig(GConfig.Item, item.templateId);
                path = ResManager.equipment(item.templateId) || path;
                quality = itemConfig.rare_mark || 0;
                status = "★" + template.star + (item.soulLevel ? " · 附魂" + item.soulLevel : "");
            }
            const current = () => this.paintVersion === version && this.selectedId === hero.id;
            ResManager.setSprite(icon, [path], current);
            if (frame) {
                frame.active = true;
                const border = frame.getComponent(Sprite);
                if (border) {
                    border.spriteFrame = null;
                }
                ResManager.setSprite(frame, [ResManager.qualityFrame(quality)], current);
            }
            if (this.equipmentLabels[index]) {
                this.equipmentLabels[index].string = status;
            }
        });
    }
    /** 返回已有列表，不触发升级、穿戴或扩容。 */
    private goBack(): void {
        if (this.closed) {
            return;
        }
        // 当前导航只保留主城根页面，详情必须显式打开列表，不能直接调用 back 回主城。
        void UIManager.instance.openById("hero").catch(error => GameLog.shared.classified("MODULE", "warn", "Hero", "返回英雄列表失败：" + String(error)));
    }
    /** 关页释放订阅、立绘和升级光效；框架清理本页技能孩子，升级确认由控制器继续。 */
    onClose(): void {
        this.closed = true;
        this.clearListeners();
        this.stopUpgradeEffect();
        if (this.equipmentAudio?.isValid) {
            this.equipmentAudio.stop();
        }
        this.paintVersion++;
        this.selectedId = "";
        if (this.spineNode?.isValid) {
            this.spineNode.destroy();
        }
        this.spineNode = null;
        this.heroId = 0;
    }

    /** 清理本次打开绑定的事件和按钮，重复打开不叠加回调。 */
    private clearListeners(): void {
        EventDispatcher.instance.offTarget(this);
        this.backButton?.node?.off(Button.EventType.CLICK, this.goBack, this);
        this.upgradeButton?.node?.off(Button.EventType.CLICK, this.upgrade, this);
        for (const stop of this.skillStops.splice(0)) {
            stop();
        }
    }

    /** 显示显式传入的英雄资料，不读取其他角色仓库。 */
    show(hero: HeroPortraitData): void {
        this.writeName(hero);
        this.mountPortrait(hero);
    }

    /** 把传入名称写入既有标题控件，缺名时显示通用标题。 */
    private writeName(hero: HeroPortraitData): void {
        if (!this.nameLabel) return;
        const name = hero.name && hero.name.length > 0 ? hero.name : "英雄";
        this.nameLabel.string = name;
        this.nameLabel.node.active = true;
    }

    /** 挂载日服缺图时沿用的 Spine；实际加载失败由骨骼服务统一记录。 */
    private mountPortrait(hero: HeroPortraitData): void {
        const host = this.portrait;
        if (!host) {
            GameLog.shared.classified("MODULE", "warn", "Hero", "HeroInfoLayer 没有 node_equip");
            return;
        }
        host.active = true;
        const id = hero.templateId;
        if (this.spineNode && this.spineNode.isValid && this.heroId === id) return;
        if (this.spineNode && this.spineNode.isValid) this.spineNode.destroy();
        this.spineNode = null;
        this.heroId = id;
        if (!id) return;
        const actor = BattleSpineService.instance.mountBattleSpine(host, String(id), () => {
            /* 切换英雄也会取消挂载，页面没有等待项需要结束。 */
        }, { seatY: -160, scale: 2.13 });
        this.spineNode = actor.node;
        if (this.spineNode.parent === host) this.spineNode.setSiblingIndex(1);
    }

}
