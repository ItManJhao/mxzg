/**
 * 英雄详情页读取名册与背包，显示正式服立绘、培养条件和服务端属性。
 * Prefab 保存培养页签、装备槽和音画挂点。穿脱和培养交给各控制器，关页释放立绘和特效。
 */
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import type { AssetScope } from "../../../framework/assets/ResourceAssetsUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotManager } from "../../../framework/ui/RedDotManager";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterController } from "../HeroRosterController";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroEquipmentController } from "../HeroEquipmentController";
import { HeroLevelController } from "../HeroLevelController";
import { HeroLevelEvent } from "../utils/HeroLevelEvent";
import { HeroSkillView } from "./HeroSkillView";
import { HeroAttributesView } from "./HeroAttributesView";
import { HeroEquipmentPickerView } from "./HeroEquipmentPickerView";
import { HeroSkillUtils } from "../utils/HeroSkillUtils";
import { HeroEquipmentUtils } from "../utils/HeroEquipmentUtils";
import { HeroGrowthDisplayUtils } from "../utils/HeroGrowthDisplayUtils";
import { HeroPortraitUtils } from "../utils/HeroPortraitUtils";
import { HeroLevelQuoteUtils } from "../utils/HeroLevelQuoteUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroCatalog } from "../utils/HeroCatalog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { _decorator, AudioSource, Button, Color, Label, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, UITransform, Vec3 } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { BagEvent } from "../../bag/utils/BagEvent";
import { EquipmentInfoView } from "../../bag/ui/EquipmentInfoView";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { HeroGrowthPanel } from "./HeroGrowthPanel";

/** 名称与形态来自当前模板和权威名册，用于切换同一个立绘挂点。 */
interface HeroPortraitData {
    readonly templateId: number;
    readonly name: string;
    readonly level: number;
    readonly star?: number;
    readonly evolution?: OwnedHero["evolution"];
}

/** 当前英雄及进入详情时的筛选顺序，持久数据仍由名册读取。 */
interface HeroInfoArgs {
    readonly heroId: string;
    readonly heroIds?: readonly string[];
}

const { ccclass, property } = _decorator;
/** 旧 effect.lua 7 号普通升级特效的帧间隔与淡入时长，单位为秒。 */
const UPGRADE_FRAME_SECONDS = 0.06;
const UPGRADE_FADE_SECONDS = 0.1;
/** 正式服以普通装备内沿为立绘基准，人物允许向装备方向重叠 16 设计单位。 */
const PORTRAIT_SUBJECT_WIDTH = 444;

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
    /** 模板有正式服全身图时显示，静态位置由预制体决定。 */
    @property(Sprite) portraitImage: Sprite | null = null;
    /** Q 版底座和光圈，在全身图就绪后隐藏。 */
    @property([Node]) portraitBackdrop: Node[] = [];

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
    /** 已解锁技能显示图标角标，锁定技能只显示强化条件。 */
    @property([Node]) skillBadges: Node[] = [];
    /** 按服务端阶星和旧技能配置得到的等级数字。 */
    @property([Label]) skillBadgeLabels: Label[] = [];
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
    /** 十星之前标题行里的金色或紫色星标。 */
    @property([Node]) heroStars: Node[] = [];
    /** 十星起显示的翼徽，觉醒星级改用独立徽记。 */
    @property(Node) heroRankBadge: Node | null = null;
    /** 十星翼徽中代表新增星数的原版数字图。 */
    @property([Node]) heroRankDigits: Node[] = [];
    /** 十四星时替换普通翼徽的原版觉醒图。 */
    @property(Node) heroAwakenedBadge: Node | null = null;
    /** 与模板职业对应的图标。 */
    @property(Node) professionIcon: Node | null = null;
    /** 用同源语言表显示英雄职业。 */
    @property(Label) professionLabel: Label | null = null;
    /** 由服务端按当前已恢复属性来源计算的个人战力。 */
    @property(Label) heroPowerLabel: Label | null = null;
    /** 展开服务器已同步的属性明细。 */
    @property(Button) attributeButton: Button | null = null;
    /** 培养、升星、宝石、神装按钮，绑定顺序与原页一致。 */
    @property([Button]) growthTabs: Button[] = [];
    /** 各培养页签的标题，使用项目简体中文文案。 */
    @property([Label]) growthTabLabels: Label[] = [];
    /** 当前页签的亮色贴图，与按钮一一对应。 */
    @property([Node]) growthTabSelected: Node[] = [];
    /** 日服默认培养页，包含等级、强化、费用、属性和技能。 */
    @property(Node) growthPanel: Node | null = null;
    /** 其他培养页签共用的内容区。 */
    @property(Node) featurePanel: Node | null = null;
    /** 子面板处理培养选择，详情只交付当前英雄与页签。 */
    @property(HeroGrowthPanel) growthDetails: HeroGrowthPanel | null = null;
    /** 阶段图标未同步时，此处显示同步状态。 */
    @property(Label) stageLabel: Label | null = null;
    /** 原版六个强化印记，只显示当前星级可见的槽位。 */
    @property([Sprite]) stageMarks: Sprite[] = [];
    /** 打开当前英雄的独立设置。 */
    @property(Button) settingsButton: Button | null = null;
    /** 普通装备下面的两个符文入口，按英雄可达等级和星级显示。 */
    @property([Button]) lockedSlots: Button[] = [];
    /** 两个符文入口的等级或星级门槛。 */
    @property([Label]) lockLabels: Label[] = [];
    /** 提交当前英雄实例的普通升级或到阶上限后的强化。 */
    @property(Button) upgradeButton: Button | null = null;
    /** 当前可升的级数或请求等待提示。 */
    @property(Label) upgradeLabel: Label | null = null;
    /** 有可负担升级时显示的旧红点。 */
    @property(Node) upgradeDot: Node | null = null;
    /** 两项消耗的组合节点，等待回复、达到上限或未同步时隐藏。 */
    @property(Node) upgradeCosts: Node | null = null;
    /** 当前升级金币消耗，余额不足时按旧规则标红。 */
    @property(Label) upgradeGold: Label | null = null;
    /** 普通升级消耗英雄经验，强化时显示突破石数量。 */
    @property(Label) upgradeExperience: Label | null = null;
    /** 随当前培养动作切换英雄经验和突破石的图标。 */
    @property(Node) upgradeMaterialIcon: Node | null = null;
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
    /** 打开及翻页时回到培养，切到其他页签只影响详情自身。 */
    private growthTab = 0;
    /** 页面关闭后为true，阻止迟到的展示刷新和导航；账号变化由应用统一关闭页面。 */
    private closed = true;
    /** 页面持有的动态立绘节点，切换或关闭时销毁。 */
    private spineNode: Node | null = null;
    /** 当前立绘或回退骨骼的形态键，避免资产快照刷掉正在展示的立绘。 */
    private portraitKey = "";
    /** 当前全身立绘的资源范围，翻页或关闭时释放并防止迟到图片覆盖。 */
    private portraitScope: AssetScope | null = null;
    /** 全身立绘的原版轻微呼吸，切换英雄时停止。 */
    private portraitMotion: Tween<Node> | null = null;
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
        this.growthTab = 0;
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
        this.listenDetail(this.settingsButton, () => this.openSettings());
        this.growthTabs.forEach((button, index) => this.listenDetail(button, () => this.selectGrowthTab(index)));
        this.lockedSlots.forEach((button, index) => this.listenDetail(button, () => this.showRuneHint(index)));
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
            this.growthTab = 0;
            this.refresh();
        }
    }

    /** 打开权威属性明细，跟随本页关闭。 */
    private openAttributes(): void {
        void UIManager.instance.openChild(this, HeroAttributesView, { heroId: this.selectedId })
            .catch(() => { /* UIManager 报告开窗失败。 */ });
    }

    /** 切换已对当前英雄显示的页签，不发请求或修改资产。 */
    private selectGrowthTab(index: number): void {
        const hero = this.currentHero();
        if (hero && this.growthTabs[index].node.active) {
            this.growthTab = index;
            this.refreshGrowthTabs(hero);
        }
    }

    /** 从当前快照读取锁定状态，将确认后的设值交给名册控制器。 */
    private openSettings(): void {
        const hero = this.currentHero();
        if (hero) {
            const locked = hero.locked;
            void UIManager.instance.openChild(this, ConfirmView, {
                title: "英雄设置",
                message: locked === undefined ? "锁定状态待同步" : locked ? "当前英雄已锁定" : "锁定后可保护此英雄",
                confirmText: locked === undefined ? "确定" : locked ? "解锁" : "锁定",
                showCancel: locked !== undefined,
                onConfirm: () => {
                    if (locked !== undefined && !this.closed && this.selectedId === hero.id) {
                        HeroRosterController.instance.setLocked(hero.id, !locked);
                    }
                },
            }).catch(() => { /* UIManager 报告开窗失败。 */ });
        }
    }

    /** 未达门槛时提示旧解锁条件，已达门槛明确当前符文开放状态。 */
    private showRuneHint(index: number): void {
        const hero = this.currentHero();
        if (!hero) {
            return;
        }
        const required = HeroGrowthDisplayUtils.forHero(hero).runeLevels[index];
        if (required !== null) {
            const current = index === 0 ? hero.level : hero.star;
            UIManager.instance.toast(current >= required ? "符文佩戴暂未开放" : `英雄达到 ${required}${index === 0 ? " 级" : " 星"}解锁`);
        }
    }

    /** 按当前英雄更新页签和符文槽，再填入当前页签的配置详情。 */
    private refreshGrowthTabs(hero: OwnedHero): void {
        if (!this.growthTabs.length) {
            return;
        }
        const data = HeroGrowthDisplayUtils.forHero(hero);
        if (!data.tabs[this.growthTab]) {
            this.growthTab = 0;
        }
        this.growthTabs.forEach((button, index) => {
            button.node.active = data.tabs[index];
            this.growthTabLabels[index].string = HeroGrowthDisplayUtils.tabNames[index];
            this.growthTabSelected[index].active = index === this.growthTab;
        });
        this.lockedSlots.forEach((button, index) => {
            const requirement = data.runeLevels[index];
            const reached = requirement !== null && (index === 0 ? hero.level : hero.star) >= requirement;
            button.node.active = requirement !== null;
            this.lockLabels[index].string = reached ? "符文" : `${requirement ?? ""}${index === 0 ? "级" : "星"}解锁`;
        });
        if (this.growthPanel && this.featurePanel) {
            this.growthPanel.active = this.growthTab === 0;
            this.featurePanel.active = this.growthTab !== 0;
        }
        this.growthDetails?.show(this, this.growthTab, hero);
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

    /** 读取当前英雄的装备红点，并用同一条件控制一键穿装的显示。 */
    private refreshEquipmentActions(): void {
        if (this.closed) {
            return;
        }
        const worn = this.currentHero()?.equipment?.items;
        const ready = !!worn && BagModel.instance.snapshot.synced;
        const dots = RedDotManager.instance;
        const better = ready && dots.isVisible(GameRedDotKey.heroEquipment(this.selectedId));
        const busy = HeroEquipmentController.instance.busy;
        this.equipmentButtons.forEach(button => { button.interactable = ready && !busy; });
        this.equipmentDots.forEach((node, index) => {
            node.active = better && dots.isVisible(GameRedDotKey.heroEquipment(this.selectedId, index + 1));
        });
        if (this.equipAllButton) {
            this.equipAllButton.node.active = better;
            this.equipAllButton.interactable = !busy;
        }
        if (this.equipAllDot) {
            this.equipAllDot.active = better;
        }
        if (this.unequipAllButton) {
            this.unequipAllButton.node.active = ready && !better && worn.length > 0;
            this.unequipAllButton.interactable = !busy;
        }
    }

    /** 装备操作回包刷新按钮，穿装音效遵循设备偏好，具体属性由统一快照刷新。 */
    private onEquipmentChanged(receipt?: { heroId: string; changed: boolean; action: string }): void {
        this.refreshEquipmentActions();
        const source = this.equipmentAudio;
        if (!source || this.closed || !receipt?.changed || receipt.heroId !== this.selectedId || receipt.action === "UNEQUIP_ALL") {
            return;
        }
        void ResourceAssetsUtils.forNode(this.node).loadPath("audio/equip-wear-1", "AudioClip").then(clip => {
            if (!this.closed && source.isValid && receipt.heroId === this.selectedId) {
                source.clip = clip;
                AudioPreferences.playEffect(source);
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
        this.show({ templateId: hero.templateId, name: template?.name || "未知英雄", level: hero.level,
            star: hero.star, evolution: hero.evolution });
        const levelLimit = this.refreshUpgrade();
        if (this.summary) {
            const level = levelLimit === null ? String(hero.level) : `${hero.level}/${levelLimit}`;
            this.summary.string = `等级：${level}`;
        }
        this.refreshStageMarks(hero);
        this.refreshGrowthTabs(hero);
        this.refreshHeader(hero);
        const stats = hero.panelStats?.values; const names = ["攻击", "生命", "防御", "速度"], values = stats ? [stats.atk, stats.hp, stats.def, stats.spd] : [];
        this.attributes.forEach((label, i) => { label.string = names[i] + "：" + (values[i] ?? "待同步"); });
        const version = ++this.paintVersion;
        this.refreshEquipment(hero, version);
        this.refreshEquipmentActions();
        this.refreshSkills(hero, version);
    }

    /** 按旧版星级展示可见强化印记，已达到的阶级使用亮色。 */
    private refreshStageMarks(hero: OwnedHero): void {
        const stage = hero.stage;
        if (this.stageLabel) {
            this.stageLabel.string = stage === undefined ? "强化待同步" : "强化：";
        }
        this.stageMarks.forEach((mark, index) => {
            mark.node.active = stage !== undefined && index < hero.star;
            if (mark.node.active && stage !== undefined) {
                const art = index < stage ? "hero-info_spr-quality-2" : "hero-info_spr-quality-1";
                ResManager.setSprite(mark.node, ResManager.ui("hero", art));
            }
        });
    }

    /** 已学技能用原版数字角标，灰显技能显示解锁阶段且仍可查看说明。 */
    private refreshSkills(hero: OwnedHero, version: number): void {
        if (!this.skillIcons.length) {
            return;
        }
        HeroSkillUtils.present(hero).forEach((skill, index) => {
            const icon = this.skillIcons[index];
            const sprite = icon?.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = null;
                sprite.grayscale = skill.id > 0 && skill.level === 0;
            }
            const learned = skill.available && (skill.level ?? 0) > 0;
            const current = () => this.paintVersion === version && this.selectedId === hero.id;
            ResManager.setSprite(icon, skill.icon || "hero/ui/hero-info_spr-new-9", current);
            if (this.skillNames[index]) {
                this.skillNames[index].string = skill.name;
            }
            if (this.skillLevels[index]) {
                this.skillLevels[index].string = skill.id && !learned ? HeroSkillUtils.status(skill) : "";
            }
            if (this.skillBadges[index]) {
                this.skillBadges[index].active = learned;
                this.skillBadgeLabels[index].string = learned ? String(skill.level) : "";
            }
            if (this.skillButtons[index]) {
                this.skillButtons[index].interactable = skill.id > 0 && skill.available;
            }
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
        this.refreshStars(hero.star);
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

    /** 沿用日服星级分组，十星以上切换到对应的翼徽和数字。 */
    private refreshStars(starLevel: number): void {
        const appearance = HeroGrowthDisplayUtils.starAppearance(starLevel);
        this.heroStars.forEach((star, index) => {
            star.active = index < appearance.count;
            if (star.active) {
                ResManager.setSprite(star, appearance.frame);
            }
        });
        if (this.heroRankBadge) {
            this.heroRankBadge.active = appearance.badge !== null && !appearance.awakened;
        }
        if (this.heroAwakenedBadge) {
            this.heroAwakenedBadge.active = appearance.awakened;
        }
        this.heroRankDigits.forEach((digit, index) => {
            digit.active = appearance.badgeDigit === index + 1;
        });
    }

    /** 普通升级和强化共用培养行，当前阶满级后展示强化费用或所缺门槛。 */
    private refreshUpgrade(): number | null {
        if (this.closed || !this.upgradeButton || !this.upgradeLabel || !this.upgradeDot || !this.upgradeCosts
            || !this.upgradeGold || !this.upgradeExperience || !this.upgradeStatus) {
            return null;
        }
        const controller = HeroLevelController.instance;
        const quote = controller.describe(this.selectedId);
        const stage = quote.status === "max" ? controller.describeStage(this.selectedId) : null;
        const advancing = stage?.status === "ready";
        const ready = quote.status === "ready" || advancing;
        const pending = quote.status === "pending";
        this.upgradeButton.node.active = ready || pending;
        this.upgradeButton.interactable = ready;
        this.upgradeLabel.string = pending ? "升级中…" : advancing ? "强化" : quote.jumpLabel ? `升${quote.levels}级` : "升级";
        this.upgradeDot.active = ready && RedDotManager.instance.isVisible(GameRedDotKey.heroUpgrade(this.selectedId));
        this.upgradeCosts.active = ready;
        this.upgradeGold.string = UiKitUtils.formatAmount(advancing ? stage.gold : quote.gold);
        this.upgradeGold.color = (advancing ? stage.goldEnough : quote.goldEnough) ? Color.WHITE : new Color(255, 0, 0);
        this.upgradeExperience.string = UiKitUtils.formatAmount(advancing ? stage.stone : quote.heroExp);
        this.upgradeExperience.color = (advancing ? stage.stoneEnough : quote.heroExpEnough) ? Color.WHITE : new Color(255, 0, 0);
        ResManager.setSprite(this.upgradeMaterialIcon, ResManager.item(advancing
            ? HeroLevelQuoteUtils.STAGE_STONE_ITEM_ID : HeroLevelQuoteUtils.EXPERIENCE_ITEM_ID));
        this.upgradeStatus.node.active = !ready && !pending;
        this.upgradeStatus.string = stage?.status === "locked" && stage.requiredStar
            ? `达到 ${stage.requiredStar} 星后可强化`
            : quote.status === "max" ? "已达当前等级上限" : "培养条件待同步";
        return quote.levelLimit;
    }

    /** 当前阶已满时先确认强化费用，其余直接交给普通升级。 */
    private upgrade(): void {
        if (!this.closed && this.upgradeButton?.interactable) {
            const controller = HeroLevelController.instance;
            const heroId = this.selectedId;
            if (controller.describe(heroId).status !== "max") {
                controller.upgrade(heroId);
                return;
            }
            const quote = controller.describeStage(heroId);
            if (!quote.goldEnough || !quote.stoneEnough) {
                controller.advanceStage(heroId);
                return;
            }
            void UIManager.instance.openChild(this, ConfirmView, {
                title: "英雄强化",
                message: `强化至 ${quote.nextStage} 阶\n消耗 ${UiKitUtils.formatAmount(quote.gold)} 金币及 ${quote.stone} 进阶石`,
                confirmText: "强化",
                onConfirm: () => {
                    if (!this.closed && this.selectedId === heroId) {
                        controller.advanceStage(heroId);
                    }
                },
            }).catch(() => { /* UIManager 报告开窗失败。 */ });
        }
    }

    /** 按请求忙态重绘培养栏，当前英雄实际升阶或升级后播放光效。 */
    private onUpgradeChanged(event?: { heroId?: string; fromLevel?: number; toLevel?: number; fromStage?: number; toStage?: number }): void {
        if (this.closed) {
            return;
        }
        this.refreshUpgrade();
        if (event?.heroId !== this.selectedId) {
            return;
        }
        const advanced = (event.toStage ?? 0) > (event.fromStage ?? 0);
        if (advanced) {
            UIManager.instance.toast(`强化至 ${event.toStage} 阶`);
        }
        if (advanced || (event.toLevel ?? 0) > (event.fromLevel ?? 0)) {
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
        this.releasePortrait();
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

    /** 优先加载正式服当前形态的全身立绘，缺图时使用已迁移的 Q 版。 */
    private mountPortrait(hero: HeroPortraitData): void {
        const host = this.portrait;
        if (!host) {
            GameLog.shared.classified("MODULE", "warn", "Hero", "HeroInfoLayer 没有 node_equip");
            return;
        }
        host.active = true;
        const art = this.portraitImage && HeroPortraitUtils.find(hero.templateId, hero.star ?? 1, hero.evolution);
        const key = `${hero.templateId}:${hero.star ?? 1}:${hero.evolution?.type ?? 0}:${hero.evolution?.level ?? 0}`;
        if (this.portraitKey === key) {
            return;
        }
        this.releasePortrait();
        this.portraitKey = key;
        const image = this.portraitImage;
        if (!art || !image) {
            this.mountSpine(host, hero.templateId);
            return;
        }
        const scope = ResourceAssetsUtils.createAssetScope();
        this.portraitScope = scope;
        void scope.load(ResourceAssetsUtils.sprite(art.path)).then(frame => {
            if (this.portraitScope !== scope || !image.isValid) {
                return;
            }
            const transform = image.node.getComponent(UITransform)!;
            const [left, , right] = art.box;
            const width = Math.max(1, right - left);
            const scale = PORTRAIT_SUBJECT_WIDTH * art.zoom / width;
            // 与日服同样以透明画布顶部和人物像素中心定位，换形态仍保持立绘比例。
            image.spriteFrame = frame;
            transform.setContentSize(art.width, art.height);
            transform.setAnchorPoint((left + right) / 2 / art.width, 1);
            image.node.setPosition(art.offsetX, art.offsetY);
            image.node.setScale(scale, scale, 1);
            image.node.active = true;
            this.portraitBackdrop.forEach(node => { node.active = false; });
            this.portraitMotion = tween(image.node).repeatForever(tween<Node>()
                .to(2.5, { position: new Vec3(art.offsetX, art.offsetY + 3, 0), scale: new Vec3(scale * 1.004, scale * 1.006, 1) }, { easing: "sineInOut" })
                .to(2.5, { position: new Vec3(art.offsetX, art.offsetY, 0), scale: new Vec3(scale, scale, 1) }, { easing: "sineInOut" }));
            this.portraitMotion.start();
        }).catch(error => {
            if (this.portraitScope === scope) {
                scope.dispose();
                this.portraitScope = null;
                this.mountSpine(host, hero.templateId);
                GameLog.shared.warnOnce("MODULE", "HeroInfoView", "PORTRAIT:" + art.path, "立绘加载失败：" + String(error));
            }
        });
    }

    /** 回退骨骼保持在圆光前和装备按钮后，沿用已有动画和资源释放。 */
    private mountSpine(host: Node, templateId: number): void {
        const actor = BattleSpineService.instance.mountBattleSpine(host, String(templateId), () => {
            /* 骨骼服务报告回退资源失败，页面仍保留姓名和装备。 */
        }, { seatY: -160, scale: 2.13 });
        this.spineNode = actor.node;
        if (this.spineNode.parent === host) {
            this.spineNode.setSiblingIndex(this.portraitImage ? 2 : 1);
        }
    }

    /** 清除当前图及呼吸动画，旧英雄的未完成加载不会覆盖新形态。 */
    private releasePortrait(): void {
        this.portraitMotion?.stop();
        this.portraitMotion = null;
        if (this.portraitImage?.isValid) {
            this.portraitImage.spriteFrame = null;
            this.portraitImage.node.active = false;
        }
        this.portraitBackdrop.forEach(node => {
            if (node.isValid) {
                node.active = true;
            }
        });
        this.portraitScope?.dispose();
        this.portraitScope = null;
        if (this.spineNode?.isValid) {
            this.spineNode.destroy();
        }
        this.spineNode = null;
        this.portraitKey = "";
    }
}
