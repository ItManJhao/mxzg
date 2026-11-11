/**
 * 只读英雄详情页：由 UIManager 传入实例 ID，读取唯一英雄 Model 并订阅服务端同步后的事件。
 * 完整Prefab保存背景与固定布局，Widget和统一比例组件负责视口适配；关闭释放监听和立绘，不触发养成写操作。
 */
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { view } from "../../../framework/ui/UIRegistry";
import { prepareHeroDetailConfig } from "../../../config/RemakeConfig";
import { UIManager } from "../../../framework/ui/UIManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroSkillUtils } from "../utils/HeroSkillUtils";
import { readHeroEquipment } from "../utils/HeroEquipment";
import { ResManager } from "../../../framework/assets/ResManager";
import { HeroCatalog } from "../utils/HeroCatalog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { _decorator, Button, Label, Node, Sprite } from "cc";
import { GameLog } from "../../../core/GameLog";
interface HeroPortraitData { templateId: number; name: string; level: number; }
import { mountBattleSpine } from "../../battle/ui/battleSpine";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";

const { ccclass, property } = _decorator;

/**
 * 详情字段直接绑定到完整Prefab；动态立绘挂在node_equip，固定结构无需运行组装。
 * 只读阶段隐藏养成入口和引导台词，不发送穿戴或升级操作。
 */
@view({
    id: "hero-info",
    prefab: "bundles/module/hero/prefabs/HeroInfoView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
    prepare: prepareHeroDetailConfig,
})
@ccclass("HeroInfoView")
export class HeroInfoView extends BaseView<{ heroId: string }> {
    /** 立绘挂载点，由预制体绑定。 */
    @property(Node)
    portrait: Node | null = null;

    /** 英雄名称标题，按配置刷新。 */
    @property(Label)
    nameLabel: Label | null = null;

    /** 由详情预制体绑定的返回按钮。 */
    @property(Button) backButton: Button | null = null;
    /** 当前等级、星级与只读状态。 */
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
    /** 普通装备四槽图标，静态节点不提供穿脱按钮。 */
    @property([Node]) equipmentIcons: Node[] = [];
    /** 按旧物品品质显示四槽边框。 */
    @property([Node]) equipmentFrames: Node[] = [];
    /** 装备星级和附魂等级；旧快照明确显示待同步。 */
    @property([Label]) equipmentLabels: Label[] = [];
    /** 技能按钮解除函数，关闭时逐一释放。 */
    private skillStops: Array<() => void> = [];
    /** 本次打开的实例 ID；关闭清空，不能误用模板 ID 查找。 */
    private selectedId = "";
    /** 当前角色归属；换号后关闭，不能继续显示旧角色详情。 */
    private owner: string | null = null;
    /** 页面持有的动态立绘节点，切换或关闭时销毁。 */
    private spineNode: Node | null = null;
    /** 已加载立绘的模板 ID，仅用于资源复用。 */
    private heroId = 0;
    /** 仅将完整外根铺到画布，固定内容由Prefab Widget和ViewportScale处理。 */
    public onCreate(): void {
        bindVisibleRefresh(this.node, () => fitVisibleRoot(this.node));
    }

    /** 统一入口只传实例 ID；资料来自唯一名册，不额外发送详情查询。 */
    onOpen(args: { heroId: string }): void {
        if (!args?.heroId) throw new Error("缺少英雄实例 ID");
        this.selectedId = args.heroId; this.owner = HeroRosterModel.instance.roleKey;
        this.backButton?.node.on(Button.EventType.CLICK, this.goBack, this);
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        this.skillButtons.forEach((button, slot) => { const click = () => { void UIManager.instance.openById("hero-skill", { heroId: this.selectedId, slot }).catch(error => GameLog.shared.classified("MODULE", "warn", "Hero", String(error))); }; button.node.on(Button.EventType.CLICK, click); this.skillStops.push(() => button.node.off(Button.EventType.CLICK, click)); });
        this.refresh();
    }
    /** 读取最新实例与服务器属性，元素图标保留Bundle描述；角色变化或实例删除即返回列表。 */
    private refresh(): void {
        const model = HeroRosterModel.instance;
        const hero = model.snapshot.heroes.find(row => row.id === this.selectedId);
        if (!hero || model.roleKey !== this.owner) { this.goBack(); return; }
        const catalog = new HeroCatalog(GameConfig.instance.getFile(GConfig.HeroType), GameConfig.instance.getFile(GConfig.Item));
        const elem = catalog.find(hero.templateId)?.elem;
        const icons = [ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-0", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-1", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-2", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-3", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-4", "SpriteFrame"), ResourceAssetsUtils.describe("hero", "ui/hero-icon_elem-5", "SpriteFrame")];
        if (this.elementIcon) {
            this.elementIcon.active = !!elem;
            if (elem) {
                ResManager.setSprite(this.elementIcon, icons[elem]);
            }
        }
        this.show({ templateId: hero.templateId, name: catalog.find(hero.templateId)?.name || "未知英雄", level: hero.level });
        if (this.summary) this.summary.string = "等级：" + hero.level + "    星级：" + hero.star + "    强化：" + (hero.stage ?? "—") + "\n" + (hero.panelStats ? (hero.panelStats.complete ? "英雄属性" : "当前属性（部分加成待恢复）") : "属性待同步");
        const stats = hero.panelStats?.values; const names = ["攻击", "生命", "防御", "速度"], values = stats ? [stats.atk, stats.hp, stats.def, stats.spd] : [];
        this.attributes.forEach((label, i) => { label.string = names[i] + "：" + (values[i] ?? "待同步"); });
        const version = ++this.paintVersion;
        this.refreshEquipment(hero, version);
        if (this.skillIcons.length) HeroSkillUtils.present(hero).forEach((skill, i) => {
            const icon = this.skillIcons[i], sprite = icon?.getComponent(Sprite); if (sprite) { sprite.spriteFrame = null; sprite.grayscale = skill.id > 0 && skill.level === 0; }
            if (icon) ResManager.setSprite(icon, [skill.icon || "hero/ui/hero-info_spr-new-9"], () => this.paintVersion === version && this.selectedId === hero.id);
            if (this.skillNames[i]) this.skillNames[i].string = skill.name;
            if (this.skillLevels[i]) this.skillLevels[i].string = skill.id ? HeroSkillUtils.status(skill) : "";
            if (this.skillButtons[i]) this.skillButtons[i].interactable = skill.id > 0 && skill.available;
        });
    }
    /** 从已校验的统一名册绘制四槽，按显示需要取得空槽和品质框；不从背包库存推测穿戴。 */
    private refreshEquipment(hero: import("../data/HeroSnapshotData").OwnedHero, version: number): void {
        if (!this.equipmentIcons.length) {
            return;
        }
        const config = GameConfig.instance;
        const items = hero.equipment ? readHeroEquipment(hero.equipment.items, config) : undefined;
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
        if (HeroRosterModel.instance.roleKey !== this.owner) { UIManager.instance.back(); return; }
        // 当前导航只保留主城根页面，详情必须显式打开列表，不能直接调用 back 回主城。
        void UIManager.instance.openById("hero").catch(error => GameLog.shared.classified("MODULE", "warn", "Hero", "返回英雄列表失败：" + String(error)));
    }
    /** 关页释放订阅和立绘；异步加载由无效节点检查阻止回写。 */
    onClose(): void {
        EventDispatcher.instance.offTarget(this); this.backButton?.node?.off(Button.EventType.CLICK, this.goBack, this);
        this.paintVersion++; for (const stop of this.skillStops.splice(0)) stop(); UIManager.instance.closeById("hero-skill");
        this.selectedId = ""; this.owner = null; if (this.spineNode?.isValid) this.spineNode.destroy(); this.spineNode = null; this.heroId = 0;
    }

    /** 显示显式传入的英雄资料，不读取其他角色仓库。 */
    show(hero: HeroPortraitData): void {
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

    /** 动态立绘。加载失败只打日志，节点留着，不退回头像贴图。 */
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
        const actor = mountBattleSpine(host, String(id), () => {
            GameLog.shared.classified("MODULE", "warn", "Hero", "详情立绘没有挂上");
        }, { seatY: -160, scale: 2.13 });
        this.spineNode = actor.node;
        if (this.spineNode.parent === host) this.spineNode.setSiblingIndex(1);
    }

}
