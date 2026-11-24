/**
 * 创造法阵的配方、试览和备料页。沿旧版在这里挑选本体与素材，
 * 实际消耗和结果交给 HeroStarController，名册和库存始终由服务端快照刷新。
 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BattleSpineService, type SpineActor } from "../../battle/ui/BattleSpineService";
import { ConfirmView } from "../../common/ui/ConfirmView";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroStarController, type HeroStarMaterials, type HeroStarReceipt } from "../HeroStarController";
import { HeroCatalog } from "../utils/HeroCatalog";
import { HeroCreationUtils, type HeroCreationOption } from "../utils/HeroCreationUtils";
import { HeroGrowthDisplayUtils } from "../utils/HeroGrowthDisplayUtils";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroSkillUtils } from "../utils/HeroSkillUtils";
import { HeroStarUtils, type HeroStarMaterialRow } from "../utils/HeroStarUtils";
import { HeroGrowthPickerView, type HeroGrowthChoice } from "./HeroGrowthPickerView";
import { HeroCreationCellView } from "./HeroCreationCellView";
import { HeroSkillView } from "./HeroSkillView";

/** 可从英雄详情预选当前模板，主城入口沿配置列表默认顺序打开。 */
export interface HeroCreationArgs {
    readonly templateId?: number;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-creation",
    prefab: "bundles/module/hero/prefabs/HeroCreationView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("HeroCreationView")
export class HeroCreationView extends BaseView<HeroCreationArgs> {
    /** 完整法阵主体，缩放和内部坐标分别由视口与预制体处理。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 预制体中的返回按钮。 */
    @property(Button) closeButton: Button | null = null;
    /** 打开旧法阵的玩法说明。 */
    @property(Button) infoButton: Button | null = null;
    /** 打开所选英雄下一星的只读技能。 */
    @property(Button) skillButton: Button | null = null;
    /** 六个元素筛选，索引 0 为全部。 */
    @property([Button]) filters: Button[] = [];
    /** 筛选提醒的布局锚点，与元素过滤按钮同序。 */
    @property([Node]) filterReminderAnchors: Node[] = [];
    /** 虚拟英雄配方网格，复用名册头像格。 */
    @property(SuperScroll) list: SuperScroll | null = null;
    /** 当前选中配方英雄的名称。 */
    @property(Label) heroName: Label | null = null;
    /** 当前选中配方的元素头像。 */
    @property(Node) heroElement: Node | null = null;
    /** 目标星级五枚普通星标，六星使用一枚紫星。 */
    @property([Node]) heroStars: Node[] = [];
    /** 显示下一星对应的方案等级上限。 */
    @property(Label) heroLevel: Label | null = null;
    /** 按攻击、生命、防御、速度顺序展示下一星满级基础属性。 */
    @property([Label]) attributes: Label[] = [];
    /** 旧英灵骨骼挂点，切换英雄和关闭时销毁已挂载的演员。 */
    @property(Button) heroPose: Button | null = null;
    /** 骨骼资源缺失时显示模板头像。 */
    @property(Node) heroFallback: Node | null = null;
    /** 本体及三行配方，保存在预制体原法阵四个座位。 */
    @property([Button]) materialButtons: Button[] = [];
    /** 四个座位中所需模板的头像或通配素材图。 */
    @property([Node]) materialIcons: Node[] = [];
    /** 本体和三行配方名称，按材料按钮顺序绑定。 */
    @property([Label]) materialNames: Label[] = [];
    /** 四个座位实际选择的数量。 */
    @property([Label]) materialCounts: Label[] = [];
    /** 备料提醒的布局锚点，与四个材料按钮同序。 */
    @property([Node]) materialReminderAnchors: Node[] = [];
    /** 固定道具成本，当前基础配方无固定费用时隐藏。 */
    @property(Label) costLabel: Label | null = null;
    /** 正式确认合成，按原版直接提交当前配方选择。 */
    @property(Button) composeButton: Button | null = null;
    /** 升星成功展示区，收到可信回执及对应名册后显示。 */
    @property(Node) resultPanel: Node | null = null;
    /** 成功页展示升星前后同一本体的两个英雄头像。 */
    @property([Node]) resultIcons: Node[] = [];
    /** 成功页使用真实本体名称、原星级和事务后的星级。 */
    @property(Label) resultText: Label | null = null;
    /** 成功后按攻击、生命、防御、速度次序显示本体前后的基础成长。 */
    @property([Label]) resultAttributes: Label[] = [];
    /** 关闭成功反馈后继续在原法阵挑选英雄。 */
    @property(Button) resultButton: Button | null = null;

    /** 当前展示期已绑监听，重开同一实例时复用，关闭后为 false。 */
    private opened = false;
    /** 筛选按钮的公共红点绑定，本次打开期间复用。 */
    private filterReminders: (RedDotBinding | null)[] = [];
    /** 材料座位的公共红点绑定，本次打开期间复用。 */
    private materialReminders: (RedDotBinding | null)[] = [];
    /** 元素筛选，0 为全部，切换筛选后从首个配方开始。 */
    private element = 0;
    /** 当前显示的英雄模板，打开和选择配方后更新。 */
    private templateId = 0;
    /** 本次配方选中的真实本体，切换配方和关闭时清空。 */
    private baseId: string | undefined;
    /** 材料行的本地选择，成功、切换配方和关闭时清空。 */
    private materials: HeroStarMaterials[] = [];
    /** 该窗口导出的配方展示，基于当前名册和库存刷新。 */
    private options: readonly HeroCreationOption[] = [];
    /** 当前模型演员，由该窗口独占，切换和关闭时销毁释放。 */
    private actor: SpineActor | null = null;
    /** 模型当前对应模板，避免名册刷新重复加载骨架。 */
    private actorTemplate = 0;
    /** 当前窗口主动发起的本体编号，匹配升星回执后交给结果区。 */
    private submittedId: string | undefined;
    /** 发送时当前真实本体的基础属性，成功或关窗后释放。 */
    private beforeStats: OwnedHero["baseStats"];
    /** 已收真实结果，等待匹配的名册快照再显示，完成后清空。 */
    private result: HeroStarReceipt | undefined;

    /** 校验四个座位、筛选和列表所需的绑定，装饰红点可省略。 */
    public onBind(): void {
        if (!this.panel || !this.closeButton || !this.infoButton || !this.skillButton || !this.list
            || !this.heroName || !this.heroElement || !this.heroLevel || !this.heroPose || !this.heroFallback
            || !this.costLabel || !this.composeButton || !this.resultPanel || !this.resultText
            || !this.resultButton || this.filters.length !== 6
            || this.resultIcons.length !== 2 || this.resultAttributes.length !== 4
            || this.heroStars.length !== 5 || this.attributes.length !== 4 || this.materialButtons.length !== 4
            || this.materialIcons.length !== 4 || this.materialNames.length !== 4 || this.materialCounts.length !== 4) {
            throw new Error("创造法阵预制体绑定缺失");
        }
        this.list.validateBindings();
    }

    /** 显示当前英雄配置，绑定快照、素材列表、法阵按钮和本次红点。 */
    public onOpen(args?: HeroCreationArgs): void {
        this.templateId = args?.templateId ?? 0;
        this.element = 0;
        this.clearDraft();
        this.result = undefined;
        this.resultPanel!.active = false;
        if (!this.opened) {
            this.opened = true;
            this.filterReminders = this.filterReminderAnchors.map(anchor => anchor ? RedDotBinding.atAnchor(anchor) : null);
            this.materialReminders = this.materialReminderAnchors.map(anchor => anchor ? RedDotBinding.atAnchor(anchor) : null);
            this.bindList();
            this.bindActions();
            this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh));
            this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh));
            this.ownListener(EventDispatcher.instance.on(HeroStarController.Updated, this, this.onUpgrade));
            this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        }
        this.refresh();
        this.list!.toStart();
    }

    /** 窗口关闭时释放本次草稿和红点，由 BaseView 清除按钮及事件。 */
    public onClose(): void {
        this.opened = false;
        this.filterReminders.forEach(binding => binding?.dispose());
        this.materialReminders.forEach(binding => binding?.dispose());
        this.filterReminders = [];
        this.materialReminders = [];
        this.clearDraft();
        this.submittedId = undefined;
        this.beforeStats = undefined;
        this.result = undefined;
        this.options = [];
        this.actor?.node.destroy();
        this.actor = null;
        this.actorTemplate = 0;
    }

    /** 整体保持原设计比例并缩放到可见范围，格位和列表尺寸来自预制体。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * .98 / panel.width, box.height * .91 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 虚拟网格传递所选配方，不修改名册中的英雄。 */
    private bindList(): void {
        const node = this.list!.list.node;
        node.on(SuperContent.RENDER_ITEM, this.renderOption, this);
        node.on(SuperContent.SELECT_ITEM, this.selectOption, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(SuperContent.RENDER_ITEM, this.renderOption, this);
                node.off(SuperContent.SELECT_ITEM, this.selectOption, this);
            }
        });
    }

    /** 当前显示期只绑定一份按钮监听，关窗后一起释放。 */
    private bindActions(): void {
        this.listen(this.closeButton!, () => this.goBack());
        this.listen(this.infoButton!, () => this.openInfo());
        this.listen(this.skillButton!, () => this.openSkills());
        this.listen(this.composeButton!, () => this.compose());
        this.listen(this.heroPose!, () => this.actor?.play("attack"));
        this.listen(this.resultButton!, () => { this.resultPanel!.active = false; });
        this.filters.forEach((button, index) => this.listen(button, () => {
            if (this.element !== index) {
                this.element = index;
                this.templateId = 0;
                this.clearDraft();
                this.refresh();
                this.list!.toStart();
            }
        }));
        this.materialButtons.forEach((button, index) => this.listen(button, () => this.openMaterials(index)));
    }

    /** 按按钮节点生命周期解绑，销毁后不访问引擎节点。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 重置选中本体及素材；不触及协议在途状态。 */
    private clearDraft(): void {
        this.baseId = undefined;
        this.materials = [];
    }

    /** 沿旧版返回主城，详情入口先关闭法阵，再由应用恢复主城根。 */
    private goBack(): void {
        const fromDetail = !!this.args?.templateId;
        this.close();
        if (fromDetail) {
            UIManager.instance.back();
        }
    }

    /** 从最新名册和库存刷新配方网格、筛选红点、详情及结果反馈。 */
    private refresh(): void {
        if (!this.opened) {
            return;
        }
        const roster = HeroRosterModel.instance.snapshot.heroes;
        this.options = HeroCreationUtils.options(roster, this.quantity);
        const visible = this.options.filter(option => this.element === 0 || option.face.elem === this.element);
        const option = visible.find(row => row.face.templateId === this.templateId) ?? visible[0];
        if (option && this.templateId !== option.face.templateId) {
            this.templateId = option.face.templateId;
            this.clearDraft();
        }
        this.filters.forEach((button, index) => {
            const scale = index === this.element ? 1 : .82;
            button.node.setScale(scale, scale, 1);
            this.filterReminders[index]?.setVisible(this.options.some(row => row.ready && (index === 0 || row.face.elem === index)));
        });
        this.list!.list.setData(visible);
        if (option) {
            this.renderPreview(option);
            this.renderMaterials(option, roster);
        }
        this.composeButton!.interactable = !!option && !HeroStarController.instance.busy;
        this.showResult(roster);
    }

    /** 读取当前背包数量，作为配方展示和提交前的成本提示。 */
    private readonly quantity = (itemId: number): number => BagModel.instance.quantity(itemId);

    /** 将当前配方交给法阵头像格显示，复用格滚动换绑时也会刷新备料进度。 */
    private renderOption(node: Node, option: HeroCreationOption): void {
        node.getComponent(HeroCreationCellView)!.showRecipe(option);
    }

    /** 切换配方时清掉旧候选，避免其他模板选择留在当前提交。 */
    private selectOption(option: HeroCreationOption): void {
        if (this.templateId !== option.face.templateId) {
            this.templateId = option.face.templateId;
            this.clearDraft();
            this.refresh();
        }
    }

    /** 更新原名牌、星标、模型和下一星满级属性；未同步的成长留空。 */
    private renderPreview(option: HeroCreationOption): void {
        const { face, recipe } = option;
        const preview = HeroCreationUtils.preview(option);
        this.heroName!.string = face.name;
        this.heroLevel!.string = `等级：${preview.level}`;
        ResManager.setSprite(this.heroElement, ResManager.ui("hero", "hero-icon_elem-" + (face.elem ?? 0)));
        this.attributes.forEach((label, index) => { label.string = String(preview.attributes?.[index] ?? "—"); });
        const stars = HeroGrowthDisplayUtils.starAppearance(recipe.toStar);
        this.heroStars.forEach((node, index) => {
            node.active = index < stars.count;
            ResManager.setSprite(node, node.active ? stars.frame : null);
        });
        if (this.actorTemplate !== face.templateId) {
            this.actor?.node.destroy();
            this.actorTemplate = face.templateId;
            this.heroFallback!.active = false;
            this.actor = BattleSpineService.instance.mountBattleSpine(this.heroPose!.node, String(face.templateId), () => {
                if (this.opened && this.actorTemplate === face.templateId) {
                    this.heroFallback!.active = true;
                    ResManager.setSprite(this.heroFallback, face.icon);
                }
            }, { seatY: -56, scale: 1.16 });
        }
    }

    /** 绘制四个实际配方座位，使用模板、替代或通配图标。 */
    private renderMaterials(option: HeroCreationOption, roster: readonly OwnedHero[]): void {
        const primary = roster.find(hero => hero.id === this.baseId);
        this.renderSlot(0, option.face.name, option.face.icon, primary ? 1 : 0, 1,
            HeroCreationUtils.bases(option.face.templateId, option.recipe.fromStar, roster, this.used()).length > 0);
        this.materialButtons.slice(1).forEach((_, index) => {
            const row = option.recipe.rows[index];
            const button = this.materialButtons[index + 1];
            button.node.active = !!row;
            if (!row) {
                return;
            }
            const choice = this.selection(row);
            const chosen = roster.find(hero => hero.id === choice.heroIds[0]);
            const configured = HeroCatalog.find(row.templateId === -1 ? option.face.templateId : row.templateId);
            const element = row.element === -1 ? option.face.elem ?? 0 : row.element;
            const count = choice.heroIds.length;
            const stock = row.replacementItemId === null ? 0 : this.quantity(row.replacementItemId);
            const replacement = choice.useReplacement && row.replacementItemId !== null
                ? BagItemCatalog.face(row.replacementItemId, stock).icon : null;
            const icon = chosen ? HeroCatalog.find(chosen.templateId)?.icon
                : replacement ?? configured?.icon ?? ResManager.item(20_000_000 + 100_000 * element + 1000 * Math.max(3, Math.min(5, row.star)));
            const candidates = HeroStarUtils.candidates({ templateId: option.face.templateId, id: this.baseId }, row,
                roster, this.used(row.row)).length;
            this.renderSlot(index + 1, configured?.name ?? `${row.star}星英雄`, icon ?? null,
                Math.min(row.count, count + (choice.useReplacement ? stock : 0)), row.count, candidates + stock >= row.count);
        });
        this.costLabel!.string = HeroCreationUtils.costText(option.recipe, this.quantity);
        this.costLabel!.node.active = this.costLabel!.string.length > 0;
    }

    /** 更新法阵格的内容，已填满时压暗并隐藏现有红点。 */
    private renderSlot(index: number, title: string, icon: string | null, count: number, need: number, available: boolean): void {
        const node = this.materialIcons[index];
        node.active = !!icon;
        ResManager.setSprite(node, icon);
        node.getComponent(Sprite)!.grayscale = count === need;
        this.materialNames[index].string = title;
        this.materialCounts[index].string = `${count}/${need}`;
        this.materialReminders[index]?.setVisible(available && count < need);
    }

    /** 读取本次仍选中的配方。 */
    private current(): HeroCreationOption | undefined {
        return this.options.find(option => option.face.templateId === this.templateId);
    }

    /** 未选择的行按空材料草稿显示，首次选择之后才保存。 */
    private selection(row: HeroStarMaterialRow): HeroStarMaterials {
        return this.materials.find(choice => choice.row === row.row)
            ?? { row: row.row, heroIds: [], useReplacement: false };
    }

    /** 返回其他配方行已占用的英雄编号，已选本体由候选筛选单独排除。 */
    private used(except?: number): string[] {
        const ids: string[] = [];
        for (const item of this.materials) {
            if (item.row !== except) {
                ids.push(...item.heroIds);
            }
        }
        return ids;
    }

    /** 同一培养选择窗处理本体或逐行材料，候选始终读取最新名册。 */
    private openMaterials(index: number): void {
        const option = this.current();
        if (!option || HeroStarController.instance.busy) {
            return;
        }
        const row = index > 0 ? option.recipe.rows[index - 1] : undefined;
        void UIManager.instance.openChild(this, HeroGrowthPickerView, {
            title: row?.label ?? `选择 ${option.recipe.fromStar} 星${option.face.name}作为本体`,
            empty: "没有符合条件的英雄",
            choices: () => this.materialChoices(option, row),
            choose: key => this.chooseMaterial(option, key, row),
        }).catch(() => { /* 界面打开异常由 UIManager 统一反馈。 */ });
    }

    /** 列出现有本体与可消耗英雄，替代物只对应明示的配方行。 */
    private materialChoices(option: HeroCreationOption, row?: HeroStarMaterialRow): HeroGrowthChoice[] {
        const roster = HeroRosterModel.instance.snapshot.heroes;
        const selected = row ? this.selection(row) : undefined;
        const candidates = row ? HeroStarUtils.candidates({ templateId: option.face.templateId, id: this.baseId }, row,
            roster, this.used(row.row)) : HeroCreationUtils.bases(option.face.templateId, option.recipe.fromStar, roster, this.used());
        const choices: HeroGrowthChoice[] = candidates.map(hero => {
            const face = HeroCatalog.find(hero.templateId);
            const chosen = selected ? selected.heroIds.includes(hero.id) : this.baseId === hero.id;
            return {
                key: hero.id, title: face?.name ?? "英雄", caption: `Lv.${hero.level} · ${hero.star}星`,
                details: !row && hero.deployed ? "当前已上阵" : undefined,
                icon: face?.icon ?? null, action: chosen ? "取消" : "选用",
            };
        });
        if (row?.replacementItemId && selected && selected.heroIds.length < row.count) {
            const stock = this.quantity(row.replacementItemId);
            const bagItem = BagItemCatalog.face(row.replacementItemId, stock);
            choices.push({
                key: "replacement", title: bagItem.title, caption: `持有 ${stock}`,
                icon: bagItem.icon, action: selected.useReplacement ? "取消" : "替代",
            });
        }
        return choices;
    }

    /** 记录当前选择，本体单选完成后关闭，素材可继续逐件选中或反选。 */
    private chooseMaterial(option: HeroCreationOption, key: string, row?: HeroStarMaterialRow): boolean {
        if (!this.materialChoices(option, row).some(choice => choice.key === key)) {
            return false;
        }
        if (!row) {
            this.baseId = this.baseId === key ? undefined : key;
            this.refresh();
            return true;
        }
        const selected = this.selection(row);
        const ids = selected.heroIds.slice();
        const index = ids.indexOf(key);
        if (index !== -1) {
            ids.splice(index, 1);
        } else if (key !== "replacement" && ids.length < row.count) {
            ids.push(key);
        }
        const useReplacement = ids.length < row.count && (key === "replacement" ? !selected.useReplacement : selected.useReplacement);
        this.materials = this.materials.filter(choice => choice.row !== row.row);
        this.materials.push({ row: row.row, heroIds: ids, useReplacement });
        this.refresh();
        return false;
    }

    /** 旧玩法说明保存在统一语言配置，通用说明窗关闭后回原法阵。 */
    private openInfo(): void {
        const config = GameConfig.instance;
        const title = config.getConfig(GConfig.Language, 42018)?.value ?? "创造法阵";
        const message = config.getConfig(GConfig.Language, 42019)?.value?.replace(/\\n/g, "\n");
        if (!message) {
            UIManager.instance.toast("玩法说明暂不可用");
            return;
        }
        void UIManager.instance.openChild(this, ConfirmView, {
            title, message, showCancel: false, confirmText: "知道了", onConfirm: () => {},
        }).catch(() => { /* 界面打开异常由 UIManager 统一反馈。 */ });
    }

    /** 按下一星满级投影只读技能，引导玩家查看现有技能说明。 */
    private openSkills(): void {
        const option = this.current();
        if (!option) {
            return;
        }
        const { stage } = HeroCreationUtils.preview(option);
        const skills = HeroSkillUtils.present({
            templateId: option.face.templateId, star: option.recipe.toStar, stage,
        }).filter(skill => skill.available && skill.id > 0);
        void UIManager.instance.openChild(this, HeroGrowthPickerView, {
            title: option.face.name + "技能预览",
            empty: "没有可展示的技能说明",
            choices: () => skills.map(skill => ({
                key: String(skill.slot), title: skill.name, caption: HeroSkillUtils.status(skill),
                icon: skill.icon, action: "查看",
            })),
            choose: key => {
                const skill = skills.find(value => String(value.slot) === key);
                if (skill) {
                    void UIManager.instance.openChild(this, HeroSkillView, { slot: skill.slot, readonlyFace: skill })
                        .catch(() => { /* 界面打开异常由 UIManager 统一反馈。 */ });
                }
                return true;
            },
        }).catch(() => { /* 界面打开异常由 UIManager 统一反馈。 */ });
    }

    /** 按原版点击合成后提交已选配方，实际消耗和资格由 Controller 与服务端处理。 */
    private compose(): void {
        const option = this.current();
        const hero = HeroRosterModel.instance.snapshot.heroes.find(value => value.id === this.baseId);
        const controller = HeroStarController.instance;
        if (!option || controller.busy) {
            return;
        }
        if (!hero || hero.templateId !== option.face.templateId || hero.star !== option.recipe.fromStar) {
            UIManager.instance.toast("请选择要升星的英雄本体");
            return;
        }
        if (!controller.eligible(option.recipe) || !HeroCreationUtils.payable(option.recipe, this.materials, this.quantity)) {
            UIManager.instance.toast("升星条件或材料不足");
            return;
        }
        this.submittedId = hero.id;
        this.beforeStats = hero.baseStats;
        controller.upgrade(hero.id, option.recipe.fromStar, this.materials);
    }

    /** 只用本窗口提交的真实回执触发升星结果，其他英雄更新仅刷新网格。 */
    private onUpgrade(receipt?: HeroStarReceipt): void {
        if (receipt && receipt.heroId === this.submittedId) {
            this.result = receipt;
            this.clearDraft();
        }
        if (!HeroStarController.instance.busy) {
            this.submittedId = undefined;
            if (!this.result) {
                this.beforeStats = undefined;
            }
        }
        this.refresh();
    }

    /** 回执和同一英雄的新星级同时到达才确认结果，避免把旧快照误作成功。 */
    private showResult(roster: readonly OwnedHero[]): void {
        const result = this.result;
        const hero = result && roster.find(value => value.id === result.heroId && value.star === result.toStar);
        if (result && hero) {
            const face = HeroCatalog.find(hero.templateId);
            this.result = undefined;
            this.resultText!.string = `${face?.name ?? "英雄"} · Lv.${hero.level} · ${result.fromStar} 星 → ${result.toStar} 星`;
            this.resultIcons.forEach(node => ResManager.setSprite(node, face?.icon ?? null));
            const keys = ["atk", "hp", "def", "spd"] as const;
            this.resultAttributes.forEach((label, index) => {
                const key = keys[index];
                const before = this.beforeStats?.[key];
                const after = hero.baseStats?.[key];
                label.node.parent!.active = before !== undefined && after !== undefined && before !== after;
                label.string = `${before ?? "—"}   →   ${after ?? "—"}`;
            });
            this.beforeStats = undefined;
            this.resultPanel!.active = true;
        }
    }
}
