/**
 * 主城铁匠铺全屏页，按正式服组织装备、精灵、宝石和神装的选择及合成界面。
 * 静态构图和滚动位置放在预制体，服务器与统一资产提供实际报价、金币和背包；页面只保存选择草稿。
 */
import { _decorator, Button, Color, EditBox, Label, Node, Sprite, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../../account/AccountModel";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { EquipmentDetailUtils } from "../../bag/utils/EquipmentDetailUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { SpiritInfoView } from "../../bag/ui/SpiritInfoView";
import { RulesView } from "../../common/ui/RulesView";
import { HeroJewelController } from "../../hero/HeroJewelController";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { HeroGodEquipmentCatalogView } from "../../hero/ui/HeroGodEquipmentCatalogView";
import { HeroGodEquipmentCatalogUtils } from "../../hero/utils/HeroGodEquipmentCatalogUtils";
import { HeroGodEquipmentUtils, type GodEquipmentItem } from "../../hero/utils/HeroGodEquipmentUtils";
import { HeroJewelUtils, type HeroJewelDefinition } from "../../hero/utils/HeroJewelUtils";
import { HeroRosterEvent } from "../../hero/utils/HeroRosterEvent";
import { SmithController } from "../SmithController";
import { SmithModel } from "../SmithModel";
import { SmithEquipmentUtils, type SmithEquipmentRecipe } from "../utils/SmithEquipmentUtils";
import { SmithJewelUtils } from "../utils/SmithJewelUtils";
import { SmithComposeView } from "./SmithComposeView";
import { SmithForgeEffect } from "./SmithForgeEffect";
import { SmithItemCell } from "./SmithItemCell";
import { SmithPickerView, type SmithPickerChoice } from "./SmithPickerView";
import { SmithSpiritSkillView } from "./SmithSpiritSkillView";

/** 导航提供账号投影与回城和材料来源的正式跳转。 */
interface SmithOpenArgs {
    readonly account?: AccountModel;
    readonly backToCity?: () => void;
    readonly openFeature?: (atom: string) => boolean;
    readonly tab?: "equipment" | "spirit" | "jewel" | "god";
}

/** 顶部页签顺序与预制体保持一致，配置使用 1 开始的部位或宝石属性编号。 */
const tabs = ["equipment", "spirit", "jewel", "god"] as const;
/** 原 runescombine/runestype 中现有真实库存 2000002 的只读预演。 */
const spiritRecipe = { itemId: 2000002, resultId: 2000003, gold: 80000, required: 120, materialPoints: 30 } as const;
const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "smith",
    prefab: "bundles/module/smith/prefabs/SmithView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("SmithView")
export class SmithView extends BaseView<SmithOpenArgs> {
    /** 页面设计构图和可见区适配挂点。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 原版装备、精灵、宝石、神装的四块静态区域。 */
    @property([Node]) private boards: Node[] = [];
    /** 对应页面的顶部蓝色页签按钮。 */
    @property([Button]) private tabButtons: Button[] = [];
    /** 原版的亮色选中页签背景。 */
    @property([Node]) private tabHighlights: Node[] = [];
    /** 退出铁匠铺并返回来源主城。 */
    @property(Button) private backButton: Button | null = null;
    /** 当前页签的说明按钮。 */
    @property(Button) private helpButton: Button | null = null;
    /** 地图背景，精灵页切换到原蓝色背景。 */
    @property(Node) private spiritBackground: Node | null = null;
    /** 顶部装备配方的需求装备格。 */
    @property(SmithItemCell) private equipmentMaterial: SmithItemCell | null = null;
    /** 顶部装备配方的目标装备格。 */
    @property(SmithItemCell) private equipmentResult: SmithItemCell | null = null;
    /** 所选配方总金币及不足颜色。 */
    @property(Label) private goldCost: Label | null = null;
    /** 单份消耗的持有数与所需数量。 */
    @property(Label) private equipmentMaterialCount: Label | null = null;
    /** 金币约束和材料约束都限制该数量输入。 */
    @property(EditBox) private equipmentInput: EditBox | null = null;
    /** 装备数量减一按钮。 */
    @property(Button) private equipmentMinus: Button | null = null;
    /** 装备数量加一按钮，达到库存或金币上限时停用。 */
    @property(Button) private equipmentPlus: Button | null = null;
    /** 按当前配方和所选数量合成。 */
    @property(Button) private equipmentForge: Button | null = null;
    /** 请求当前装备部位的一键合成预览。 */
    @property(Button) private equipmentBulk: Button | null = null;
    /** 普通装备单次合成时，播放材料到产物的三段原图动画。 */
    @property(SmithForgeEffect) private forgeEffect: SmithForgeEffect | null = null;
    /** 按策划部位切换的四个装备按钮。 */
    @property([Button]) private equipmentSlots: Button[] = [];
    /** 四个部位按钮的选中高亮，按槽位顺序绑定。 */
    @property([Node]) private equipmentHighlights: Node[] = [];
    /** 对应部位有材料且有金币时显示的红点。 */
    @property([Node]) private equipmentReminders: Node[] = [];
    /** 普通装备配方虚拟网格。 */
    @property(SuperScroll) private equipmentList: SuperScroll | null = null;
    /** 宝石三枚素材的原版独立格子。 */
    @property([SmithItemCell]) private jewelMaterials: SmithItemCell[] = [];
    /** 各材料槽中已持有枚数与单份消耗。 */
    @property([Label]) private jewelMaterialCounts: Label[] = [];
    /** 当前宝石合成目标。 */
    @property(SmithItemCell) private jewelResult: SmithItemCell | null = null;
    /** 宝石合成数量输入框。 */
    @property(EditBox) private jewelInput: EditBox | null = null;
    /** 宝石数量减一按钮。 */
    @property(Button) private jewelMinus: Button | null = null;
    /** 宝石数量加一按钮，达到当前库存上限时停用。 */
    @property(Button) private jewelPlus: Button | null = null;
    /** 按原来源跳转到黑市道具栏。 */
    @property(Button) private jewelSource: Button | null = null;
    /** 按当前宝石配方和所选数量合成。 */
    @property(Button) private jewelForge: Button | null = null;
    /** 预览当前宝石属性的连续合成。 */
    @property(Button) private jewelBulk: Button | null = null;
    /** 攻击、生命、速度三个宝石属性的筛选按钮。 */
    @property([Button]) private jewelSlots: Button[] = [];
    /** 当前宝石属性的选中高亮，顺序与三类筛选一致。 */
    @property([Node]) private jewelHighlights: Node[] = [];
    /** 当前库存可合成对应属性时显示的红点。 */
    @property([Node]) private jewelReminders: Node[] = [];
    /** 宝石配方虚拟网格。 */
    @property(SuperScroll) private jewelList: SuperScroll | null = null;
    /** 精灵目标和材料的两个原版圆形入口。 */
    @property([Button]) private spiritPick: Button[] = [];
    /** 显示已选择精灵真实图标的两个静态格子。 */
    @property([SmithItemCell]) private spiritCells: SmithItemCell[] = [];
    /** 使用背包实例的精灵网格。 */
    @property(SuperScroll) private spiritList: SuperScroll | null = null;
    /** 实际精灵库存为空时显示。 */
    @property(Label) private spiritEmpty: Label | null = null;
    /** 仅报告选中材料件数，随选择刷新。 */
    @property(Label) private spiritSelection: Label | null = null;
    /** 只显示已知配方的预览金币，空槽按原界面显示零。 */
    @property(Label) private spiritGoldCost: Label | null = null;
    /** 精灵素材预览进度填充，随当前草稿更新。 */
    @property(Sprite) private spiritProgress: Sprite | null = null;
    /** 精灵页右上角的玩法说明。 */
    @property(Button) private spiritGuide: Button | null = null;
    /** 预留一键添加位置，当前打开实际素材选择。 */
    @property(Button) private spiritAuto: Button | null = null;
    /** 合成位置提供当前功能开放状态反馈。 */
    @property(Button) private spiritForge: Button | null = null;
    /** 神装三个素材入口贴住同一个选择窗，保留 1 至 3 件真库存。 */
    @property([Button]) private godPick: Button[] = [];
    /** 三件神装素材的显示格，依次对应三个添加入口。 */
    @property([SmithItemCell]) private godCells: SmithItemCell[] = [];
    /** 所选未穿戴神装的实际属性摘要。 */
    @property(Label) private godAttributes: Label | null = null;
    /** 未挑选材料时显示原版神装属性空态。 */
    @property(Node) private godAttributesEmpty: Node | null = null;
    /** 打开英雄模块现有的神装图鉴。 */
    @property(Button) private godCatalog: Button | null = null;
    /** 一键添加位置用于打开神装素材选择。 */
    @property(Button) private godAuto: Button | null = null;
    /** 神装合成位置提供当前功能开放状态反馈。 */
    @property(Button) private godForge: Button | null = null;

    /** 玩家当前的顶层页签，关页重新初始化。 */
    private tab = 0;
    /** 当前普通装备的策划部位，在此窗口期间保留。 */
    private equipmentSlot = 1;
    /** 当前宝石策划属性，在此窗口期间保留。 */
    private jewelSlot = 1;
    /** 当前普通装备配方，切换部位后取第一条。 */
    private equipment: SmithEquipmentRecipe | undefined;
    /** 当前宝石配方，切换属性后取第一条。 */
    private jewel: HeroJewelDefinition | undefined;
    /** 当前普通装备的合成次数，切换配方使用新上限。 */
    private equipmentCount = 1;
    /** 当前宝石的合成次数，切换配方使用新上限。 */
    private jewelCount = 1;
    /** 等待某一个部位的服务端一键预览；切页或打开弹窗后清空。 */
    private previewSlot = 0;
    /** 预演目标的真实精灵实例，换页保留，关闭重置。 */
    private spiritTarget: string | null = null;
    /** 尚未消耗的精灵材料实例，随库存失效或目标变化清除。 */
    private spiritMaterials: readonly string[] = [];
    /** 神装选择窗交回的实际素材实例 ID。 */
    private godIds: readonly string[] = [];

    /** 应用路由及资源就绪后绑定所有交互，按当前库存渲染每个页签。 */
    public onOpen(args?: SmithOpenArgs): void {
        super.onOpen(args);
        this.verifyBindings();
        this.tab = 0;
        this.equipmentSlot = 1;
        this.jewelSlot = 1;
        this.previewSlot = 0;
        this.spiritTarget = null;
        this.spiritMaterials = [];
        this.godIds = [];
        this.listen(this.backButton!, () => this.args?.backToCity ? this.args.backToCity() : this.close());
        this.listen(this.helpButton!, this.showHelp);
        this.tabButtons.forEach((button, index) => this.listen(button, () => this.showTab(index)));
        this.equipmentSlots.forEach((button, index) => this.listen(button, () => this.chooseEquipmentSlot(index + 1)));
        this.jewelSlots.forEach((button, index) => this.listen(button, () => this.chooseJewelSlot(index + 1)));
        this.listen(this.equipmentMinus!, () => this.setEquipmentCount(this.equipmentCount - 1));
        this.listen(this.equipmentPlus!, () => this.setEquipmentCount(this.equipmentCount + 1));
        this.listen(this.equipmentForge!, this.forgeEquipment);
        this.listen(this.equipmentBulk!, this.requestBulkEquipment);
        this.listen(this.jewelMinus!, () => this.setJewelCount(this.jewelCount - 1));
        this.listen(this.jewelPlus!, () => this.setJewelCount(this.jewelCount + 1));
        this.listen(this.jewelForge!, this.forgeJewel);
        this.listen(this.jewelBulk!, this.previewJewelBulk);
        this.listen(this.jewelSource!, this.openJewelSource);
        this.listen(this.spiritPick[0], this.chooseSpirit);
        this.listen(this.spiritPick[1], this.describeSpiritResult);
        this.listen(this.spiritAuto!, this.addSpiritMaterials);
        this.listen(this.spiritGuide!, () => void UIManager.instance.openChild(this, SmithSpiritSkillView).catch(() => {}));
        this.listen(this.spiritForge!, () => UIManager.instance.toast("精灵合成尚未开放"));
        this.godPick.forEach(button => this.listen(button, this.chooseGodEquipment));
        this.listen(this.godAuto!, this.chooseGodEquipment);
        this.listen(this.godForge!, () => UIManager.instance.toast("神装升星尚未开放"));
        this.listen(this.godCatalog!, () => void UIManager.instance.openChild(this, HeroGodEquipmentCatalogView).catch(() => {}));
        this.listenInput(this.equipmentInput!, () => this.setEquipmentCount(this.inputValue(this.equipmentInput!)));
        this.listenInput(this.jewelInput!, () => this.setJewelCount(this.inputValue(this.jewelInput!)));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh));
        this.ownListener(EventDispatcher.instance.on("hero-jewel:updated", this, this.refresh));
        this.ownListener(EventDispatcher.instance.on("smith:updated", this, this.onSmithUpdated));
        if (args?.account) {
            this.ownListener(args.account.subscribe(() => this.refresh()));
        }
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel.bind(this)));
        this.chooseEquipmentSlot(1);
        this.chooseJewelSlot(1);
        this.showTab(args?.tab ? tabs.indexOf(args.tab) : 0);
    }

    /** 关闭页面时取消仍未提交的装备合成演出。 */
    public onClose(): void {
        this.forgeEffect?.cancel();
    }

    /** 对齐根节点并按设计宽高等比缩放页面。 */
    private fitPanel(): void {
        const area = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(area.width / panel.width, area.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** Prefab 缺项时在开页处报告具体失效字段。 */
    private verifyBindings(): void {
        const required = { panel: this.panel, backButton: this.backButton, helpButton: this.helpButton,
            spiritBackground: this.spiritBackground, equipmentMaterial: this.equipmentMaterial,
            equipmentResult: this.equipmentResult, goldCost: this.goldCost, equipmentMaterialCount: this.equipmentMaterialCount,
            equipmentInput: this.equipmentInput, equipmentMinus: this.equipmentMinus, equipmentPlus: this.equipmentPlus,
            equipmentForge: this.equipmentForge, equipmentBulk: this.equipmentBulk, equipmentList: this.equipmentList,
            forgeEffect: this.forgeEffect,
            jewelResult: this.jewelResult, jewelInput: this.jewelInput, jewelMinus: this.jewelMinus, jewelPlus: this.jewelPlus,
            jewelSource: this.jewelSource, jewelForge: this.jewelForge, jewelBulk: this.jewelBulk, jewelList: this.jewelList,
            spiritList: this.spiritList, spiritEmpty: this.spiritEmpty, spiritSelection: this.spiritSelection,
            spiritGuide: this.spiritGuide, spiritAuto: this.spiritAuto, spiritForge: this.spiritForge,
            spiritGoldCost: this.spiritGoldCost, spiritProgress: this.spiritProgress,
            godAttributes: this.godAttributes, godAttributesEmpty: this.godAttributesEmpty,
            godAuto: this.godAuto, godForge: this.godForge, godCatalog: this.godCatalog };
        const missing = Object.entries(required).find(([, reference]) => !reference);
        if (missing || this.boards.length !== 4 || this.tabButtons.length !== 4 || this.tabHighlights.length !== 4
            || this.equipmentSlots.length !== 4 || this.jewelSlots.length !== 3 || this.jewelMaterials.length !== 3
            || this.spiritPick.length !== 2 || this.spiritCells.length !== 2 || this.godPick.length !== 3 || this.godCells.length !== 3) {
            throw new Error(`SmithView.prefab 绑定缺失：${missing?.[0] ?? "页签或素材槽"}`);
        }
    }

    /** 按钮绑定仅在当前窗口可见期间持有。 */
    private listen(button: Button, callback: () => void): void {
        const target = button.node;
        target.on(Button.EventType.CLICK, callback, this);
        this.ownListener(() => {
            if (target.isValid) {
                target.off(Button.EventType.CLICK, callback, this);
            }
        });
    }

    /** 结束输入后一次应用数量，防止输入半截数字时重绘键盘字段。 */
    private listenInput(field: EditBox, callback: () => void): void {
        const target = field.node;
        target.on(EditBox.EventType.EDITING_DID_ENDED, callback, this);
        this.ownListener(() => {
            if (target.isValid) {
                target.off(EditBox.EventType.EDITING_DID_ENDED, callback, this);
            }
        });
    }

    /** 接受正整数文本，其他值归到一次。 */
    private inputValue(field: EditBox): number {
        const text = field.string.trim();
        return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : 1;
    }

    /** 切换页签时校验神装等级，不清除其他页签的配方选择。 */
    private showTab(index: number): void {
        if (index === 3) {
            const gate = GameConfig.instance.getConfig(GConfig.OpenCondition, "main_smith_shop_god_equip");
            const level = this.args?.account?.snapshot.role?.level ?? 0;
            const minimumWorldLevel = gate?.world_level ?? 1;
            const worldLevel = HeroRosterModel.instance.snapshot.godEquipment?.worldLevel;
            if (gate && (level < gate.level || worldLevel !== undefined && worldLevel < minimumWorldLevel)) {
                UIManager.instance.toast(`角色${gate.level}级、世界${minimumWorldLevel}级开放神装升星`);
                return;
            }
        }
        if (this.tab !== index) {
            this.previewSlot = 0;
        }
        this.tab = index;
        this.boards.forEach((node, tab) => { node.active = tab === index; });
        this.tabHighlights.forEach((node, tab) => { node.active = tab === index; });
        this.spiritBackground!.active = index === 1;
        this.refresh();
    }

    /** 只重绘当前可见区域，资产事件和购买按钮共用同一状态投影。 */
    private refresh(): void {
        switch (this.tab) {
            case 0: this.paintEquipment(); break;
            case 1: this.paintSpirits(); break;
            case 2: this.paintJewels(); break;
            case 3: this.paintGodEquipment(); break;
        }
    }

    /** 按职业装备部位选择首个配方，恢复初始滚动。 */
    private chooseEquipmentSlot(slot: number): void {
        if (this.forgeEffect!.playing) {
            return;
        }
        this.equipmentSlot = slot;
        this.previewSlot = 0;
        this.selectEquipment(SmithEquipmentUtils.recipes(slot)[0]);
        this.equipmentList!.toStart();
    }

    /** 记录所选普通配方，初次选择显示现有资源允许的最大份数。 */
    private selectEquipment(recipe: SmithEquipmentRecipe | undefined): void {
        if (this.forgeEffect!.playing) {
            return;
        }
        this.equipment = recipe;
        this.equipmentCount = Math.max(1, recipe ? this.equipmentMaximum(recipe) : 0);
        if (this.tab === 0) {
            this.paintEquipment();
        }
    }

    /** 以真实角色钱包、背包和请求状态重绘装备配方与全部部位的红点。 */
    private paintEquipment(): void {
        const selected = this.equipment;
        this.equipmentHighlights.forEach((node, index) => { node.active = this.equipmentSlot === index + 1; });
        this.equipmentReminders.forEach((node, index) => {
            node.active = SmithEquipmentUtils.recipes(index + 1).some(row => this.equipmentMaximum(row) > 0);
        });
        this.equipmentList!.list.setData(SmithEquipmentUtils.recipes(this.equipmentSlot), (node, row) => {
            node.getComponent(SmithItemCell)!.show({ itemId: row.itemId, quantity: 0,
                selected: selected?.itemId === row.itemId, ready: this.equipmentMaximum(row) > 0 },
            () => this.selectEquipment(row));
        });
        this.equipmentMaterial!.show(selected ? {itemId: selected.materialId, quantity: 0} : null,
            selected ? () => this.describeItem(selected.materialId) : undefined);
        this.equipmentResult!.show(selected ? {itemId: selected.itemId, quantity: 0} : null,
            selected ? () => this.describeItem(selected.itemId) : undefined);
        const held = selected ? BagModel.instance.quantity(selected.materialId) : 0;
        this.equipmentMaterialCount!.string = selected ? `${held}/${selected.materialCount}` : "";
        this.equipmentMaterialCount!.color = selected && held < selected.materialCount ? new Color(255, 105, 76) : Color.WHITE;
        this.setEquipmentCount(this.equipmentCount);
        this.equipmentBulk!.interactable = !SmithController.instance.busy && !this.forgeEffect!.playing;
    }

    /** 显示最新余额限制、所选份数与总价，单次提交仍由服务器复核。 */
    private setEquipmentCount(count: number): void {
        const recipe = this.equipment;
        const maximum = recipe ? this.equipmentMaximum(recipe) : 0;
        this.equipmentCount = Math.max(1, Math.min(maximum, count));
        const gold = (recipe?.goldCost ?? 0) * this.equipmentCount;
        this.goldCost!.string = String(gold);
        this.goldCost!.color = gold > this.gold() ? new Color(255, 105, 76) : Color.WHITE;
        this.equipmentInput!.string = String(this.equipmentCount);
        const playing = this.forgeEffect!.playing;
        this.equipmentInput!.enabled = !playing;
        this.equipmentMinus!.interactable = !playing && this.equipmentCount > 1;
        this.equipmentPlus!.interactable = !playing && this.equipmentCount < maximum;
        this.equipmentForge!.interactable = !!recipe && !playing && !SmithController.instance.busy;
    }

    /** 从统一账号读取普通金币，失败或退出时界面额度为零。 */
    private gold(): number {
        return this.args?.account?.snapshot.role?.gold ?? 0;
    }

    /** 同一套数量计算供按钮、列表红点和输入框共用。 */
    private equipmentMaximum(recipe: SmithEquipmentRecipe): number {
        return SmithEquipmentUtils.maximum(recipe, BagModel.instance.quantity(recipe.materialId), this.gold());
    }

    /** 冻结所见配方及数量，原版演出结束后才提交这次操作。 */
    private forgeEquipment(): void {
        if (this.forgeEffect!.playing || SmithController.instance.busy) {
            return;
        }
        const recipe = this.equipment;
        this.setEquipmentCount(this.inputValue(this.equipmentInput!));
        if (!recipe || this.equipmentMaximum(recipe) < this.equipmentCount) {
            const materials = recipe ? BagModel.instance.quantity(recipe.materialId) : 0;
            UIManager.instance.toast(recipe && materials >= recipe.materialCount ? "金币不足" : "合成材料不足");
            return;
        }
        const count = this.equipmentCount;
        this.forgeEffect!.play(() => {
            SmithController.instance.forge(recipe.itemId, count);
            this.refresh();
        });
        this.refresh();
    }

    /** 仅向服务器请求当前部位的一键报价。 */
    private requestBulkEquipment(): void {
        this.previewSlot = this.equipmentSlot;
        SmithController.instance.previewAll(this.equipmentSlot);
    }

    /** 只为仍然选择的部位打开权威预览，按报价的资产版本提交。 */
    private onSmithUpdated(): void {
        this.refresh();
        const preview = SmithModel.instance.preview;
        if (!this.previewSlot || !preview || this.tab !== 0 || preview.slot !== this.previewSlot) {
            return;
        }
        this.previewSlot = 0;
        if (!preview.rewards.length) {
            UIManager.instance.toast("没有可合成的装备");
            return;
        }
        void UIManager.instance.openChild(this, SmithComposeView, {
            goldCost: preview.goldCost, rewards: preview.rewards,
            confirm: () => SmithController.instance.forgeAll(preview.slot, preview.assetRevision),
        }).catch(() => {});
    }

    /** 选择宝石属性，加载该类第一档配方。 */
    private chooseJewelSlot(slot: number): void {
        this.jewelSlot = slot;
        this.selectJewel(SmithJewelUtils.recipes(slot)[0]);
        this.jewelList!.toStart();
    }

    /** 选中宝石配方，新的配方默认使用库存容许的最大数量。 */
    private selectJewel(recipe: HeroJewelDefinition | undefined): void {
        this.jewel = recipe;
        this.jewelCount = Math.max(1, recipe ? this.jewelMaximum(recipe) : 0);
        if (this.tab === 2) {
            this.paintJewels();
        }
    }

    /** 法阵显示三枚素材和产物的裸图标，素材槽角标逐个分配当前库存。 */
    private paintJewels(): void {
        const selected = this.jewel;
        const materials = selected ? SmithJewelUtils.materials(selected, BagModel.instance.items) : [];
        this.jewelMaterials.forEach((cell, index) => {
            const material = materials[index];
            cell.show(material ? { itemId: material.itemId, quantity: 0, plainIcon: true } : null,
                material ? () => this.describeItem(material.itemId) : undefined);
            this.jewelMaterialCounts[index].string = material ? `${material.available}/${material.quantity}` : "";
            this.jewelMaterialCounts[index].color = material && material.available < material.quantity
                ? Color.RED : Color.WHITE;
        });
        this.jewelResult!.show(selected ? { itemId: selected.itemId, quantity: 0, plainIcon: true } : null,
            selected ? () => this.describeItem(selected.itemId) : undefined);
        this.jewelHighlights.forEach((node, index) => { node.active = this.jewelSlot === index + 1; });
        this.jewelReminders.forEach((node, index) => {
            node.active = SmithJewelUtils.recipes(index + 1).some(row => this.jewelMaximum(row) > 0);
        });
        this.jewelList!.list.setData(SmithJewelUtils.recipes(this.jewelSlot), (node, row) => {
            node.getComponent(SmithItemCell)!.show({itemId: row.itemId, quantity: 0, stars: row.star,
                selected: row.itemId === selected?.itemId, ready: this.jewelMaximum(row) > 0 }, () => this.selectJewel(row));
        });
        this.setJewelCount(this.jewelCount);
    }

    /** 按英雄宝石模块的真实配方与同一背包快照限制所选次数。 */
    private jewelMaximum(recipe: HeroJewelDefinition): number {
        return HeroJewelUtils.combineLimit(recipe.itemId, BagModel.instance.items);
    }

    /** 应用宝石输入数，复用现有宝石控制器的请求中状态。 */
    private setJewelCount(count: number): void {
        const maximum = this.jewel ? this.jewelMaximum(this.jewel) : 0;
        this.jewelCount = Math.max(1, Math.min(maximum, count));
        this.jewelInput!.string = String(this.jewelCount);
        this.jewelMinus!.interactable = this.jewelCount > 1;
        this.jewelPlus!.interactable = this.jewelCount < maximum;
        this.jewelForge!.interactable = !!this.jewel && !HeroJewelController.instance.busy;
        this.jewelBulk!.interactable = !HeroJewelController.instance.busy;
    }

    /** 合成宝石复用已具持久幂等和资产同步的模块。 */
    private forgeJewel(): void {
        this.setJewelCount(this.inputValue(this.jewelInput!));
        if (!this.jewel || this.jewelMaximum(this.jewel) < this.jewelCount) {
            UIManager.instance.toast("合成材料不足");
            return;
        }
        HeroJewelController.instance.combine(this.jewel.itemId, this.jewelCount);
    }

    /** 预览本属性的原版连锁净产物，确认时附带已同步的权威版本。 */
    private previewJewelBulk(): void {
        const slot = this.jewelSlot;
        const version = SmithController.instance.assetRevision;
        const rewards = SmithJewelUtils.preview(slot, BagModel.instance.items);
        if (!rewards.length) {
            UIManager.instance.toast("没有可合成的宝石");
            return;
        }
        void UIManager.instance.openChild(this, SmithComposeView, {
            rewards,
            confirm: () => HeroJewelController.instance.combineAll(slot, version),
        }).catch(() => {});
    }

    /** 原版宝石来源指向黑市道具货架，沿现有主城业务入口进入。 */
    private openJewelSource(): void {
        this.args?.openFeature?.("main_black_market");
    }

    /** 以真实实例计算预演消耗与经验，两槽显示目标和下一阶精灵。 */
    private paintSpirits(): void {
        const inventory = BagModel.instance.snapshot.spiritItems;
        const target = inventory.find(item => item.instanceId === this.spiritTarget);
        const eligible = target?.itemId === spiritRecipe.itemId;
        this.spiritTarget = target?.instanceId ?? null;
        this.spiritMaterials = eligible ? this.spiritMaterials.filter(id => inventory.some(item => item.instanceId === id)) : [];
        const points = this.spiritMaterials.length * spiritRecipe.materialPoints;
        const cost = eligible ? spiritRecipe.gold : 0;
        const targetId = target?.itemId;
        const previewIds = [targetId, eligible ? spiritRecipe.resultId : undefined];
        this.spiritCells.forEach((cell, index) => {
            const itemId = previewIds[index];
            cell.node.active = !!itemId;
            if (itemId) {
                cell.show({ itemId, quantity: 0, plainIcon: true }, index === 0
                    ? this.chooseSpirit.bind(this) : this.describeSpiritResult.bind(this));
            }
        });
        this.spiritEmpty!.node.active = !inventory.length;
        this.spiritSelection!.string = eligible ? `${points}/${spiritRecipe.required}` : "0/0";
        this.spiritProgress!.fillRange = eligible ? Math.min(points / spiritRecipe.required, 1) : 0;
        this.spiritGoldCost!.string = String(cost);
        this.spiritGoldCost!.color = cost > this.gold() ? new Color(255, 105, 76) : Color.WHITE;
        this.spiritList!.list.setData(inventory, (node, item) => {
            node.getComponent(SmithItemCell)!.show({ itemId: item.itemId, quantity: 0,
                selected: this.spiritMaterials.includes(item.instanceId) }, () => {
                if (eligible && item.instanceId !== target.instanceId && item.itemId === spiritRecipe.itemId) {
                    this.toggleSpiritMaterial(item.instanceId);
                } else {
                    void UIManager.instance.openChild(this, SpiritInfoView, { key: `spirit:${item.instanceId}` }).catch(() => {});
                }
            });
        });
    }

    /** 以单选窗从现有精灵中切换目标，清空上一个目标的材料。 */
    private chooseSpirit(): void {
        void UIManager.instance.openChild(this, SmithPickerView, {
            title: "精灵选择", limit: 1, selected: this.spiritTarget ? [this.spiritTarget] : [],
            candidates: () => BagModel.instance.snapshot.spiritItems.map(item => ({
                instanceId: item.instanceId, itemId: item.itemId, quantity: 0,
            })),
            confirm: ids => {
                const selected = ids[0] ?? null;
                if (selected !== this.spiritTarget) {
                    this.spiritMaterials = [];
                }
                this.spiritTarget = selected;
                this.paintSpirits();
            },
        }).catch(() => {});
    }

    /** 已知配方时查看下一阶精灵说明，空槽保持待选。 */
    private describeSpiritResult(): void {
        if (BagModel.instance.snapshot.spiritItems.some(item => item.instanceId === this.spiritTarget
                && item.itemId === spiritRecipe.itemId)) {
            this.describeItem(spiritRecipe.resultId);
        }
    }

    /** 只选择补足预览所需的实际精灵实例，保留原背包数量。 */
    private addSpiritMaterials(): void {
        const inventory = BagModel.instance.snapshot.spiritItems;
        const target = inventory.find(item => item.instanceId === this.spiritTarget);
        if (target?.itemId !== spiritRecipe.itemId) {
            UIManager.instance.toast("请先选择精灵");
            return;
        }
        this.spiritMaterials = inventory.filter(item => item.itemId === spiritRecipe.itemId
                && item.instanceId !== target.instanceId)
            .slice(0, Math.ceil(spiritRecipe.required / spiritRecipe.materialPoints)).map(item => item.instanceId);
        this.paintSpirits();
    }

    /** 点击已有候选可加入或撤销本地精灵素材选择。 */
    private toggleSpiritMaterial(instanceId: string): void {
        if (this.spiritMaterials.includes(instanceId)) {
            this.spiritMaterials = this.spiritMaterials.filter(id => id !== instanceId);
        } else if (this.spiritMaterials.length * spiritRecipe.materialPoints < spiritRecipe.required) {
            this.spiritMaterials = [...this.spiritMaterials, instanceId];
        }
        this.paintSpirits();
    }

    /** 将神装写入与展示分开，候选只包含服务端快照中未穿戴的真实实例。 */
    private godInventory(): readonly GodEquipmentItem[] {
        return HeroRosterModel.instance.snapshot.godEquipment?.items.filter(item => !item.heroId) ?? [];
    }

    /** 仅投影所选素材和真实属性；还没有已提交的神装升星结果。 */
    private paintGodEquipment(): void {
        const inventory = this.godInventory();
        const selected = this.godIds.map(id => inventory.find(item => item.instanceId === id))
            .filter((item): item is GodEquipmentItem => !!item);
        this.godIds = selected.map(item => item.instanceId);
        this.godCells.forEach((cell, index) => {
            const item = selected[index];
            cell.node.active = !!item;
            if (item) {
                cell.show({ itemId: item.templateId, quantity: 0, stars: item.star }, this.chooseGodEquipment.bind(this));
            }
        });
        this.godAttributes!.string = selected.map(item => HeroGodEquipmentUtils.attributeText(item)).join("\n");
        this.godAttributesEmpty!.active = !selected.length;
    }

    /** 神装可按原图鉴套装筛选并选三件独立库存。 */
    private chooseGodEquipment(): void {
        const rows = HeroGodEquipmentCatalogUtils.read()?.equipment ?? [];
        const groups = new Map(rows.map(row => [row.templateId, row.setType]));
        const categories = [0, ...new Set(rows.map(row => row.setType))].map(group => ({
            group, title: group === 0 ? "全部" : HeroGodEquipmentCatalogUtils.setName(group),
        }));
        void UIManager.instance.openChild(this, SmithPickerView, {
            title: "神装选择", limit: 3, selected: this.godIds, categories, sameTemplate: true,
            candidates: (): readonly SmithPickerChoice[] => this.godInventory().map(item => ({
                instanceId: item.instanceId, itemId: item.templateId, quantity: 0, stars: item.star,
                group: groups.get(item.templateId),
            })),
            confirm: ids => { this.godIds = ids; this.paintGodEquipment(); },
        }).catch(() => {});
    }

    /** 道具说明沿用背包描述，普通装备附上原配置的属性和评分。 */
    private describeItem(itemId: number): void {
        const item = BagItemCatalog.face(itemId, BagModel.instance.quantity(itemId));
        const detail = GameConfig.instance.getConfig(GConfig.EquipmentType, itemId) ? EquipmentDetailUtils.read(itemId) : null;
        if (detail) {
            const message = [`评分 ${detail.score}`, ...detail.attributes.map(attr => `${attr.name} ${attr.value}`),
                detail.description].filter(Boolean).join("\n");
            void UIManager.instance.openChild(this, RulesView, {title: item.title, message}).catch(() => {});
            return;
        }
        void UIManager.instance.openChild(this, BagInfoView, {source: "description", face: item}).catch(() => {});
    }

    /** 分页说明展示对应真实规则与当前可用范围。 */
    private showHelp(): void {
        const rows = [
            {title: "装备合成", message: "消耗对应装备和金币，即可合成更高阶装备。已穿戴的装备不参与合成。一键合成只处理当前部位，确认前会显示总消耗和产物。"},
            {title: "精灵合成", message: "可以从背包选择精灵并查看实例详情。精灵合成尚未开放。"},
            {title: "宝石合成", message: "同类的三枚低星宝石可合成一枚高星宝石。装备在英雄身上的宝石不计入素材。一键合成只处理当前宝石类别。"},
            {title: "神装升星", message: "选择背包中的独立神装实例以查看素材属性。神装升星尚未开放。"},
        ];
        void UIManager.instance.openChild(this, RulesView, rows[this.tab]).catch(() => {});
    }
}
