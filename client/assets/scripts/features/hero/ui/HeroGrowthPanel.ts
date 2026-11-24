/**
 * 英雄详情的升星、宝石和神装面板。三套布局在 Prefab 中独立编排，素材选择由本面板暂存。
 * 所有消耗、穿戴和探宝交给对应控制器，读取同一版名册与背包快照。
 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { GConfig } from "../../../config/GConfig";
import { GameConfig } from "../../../config/GameConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import type { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { UIManager } from "../../../framework/ui/UIManager";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroStarController, type HeroStarMaterials } from "../HeroStarController";
import { HeroJewelController } from "../HeroJewelController";
import { HeroGodEquipmentController } from "../HeroGodEquipmentController";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroCatalog } from "../utils/HeroCatalog";
import { HeroGrowthDisplayUtils } from "../utils/HeroGrowthDisplayUtils";
import { HeroStarUtils, type HeroStarMaterialRow } from "../utils/HeroStarUtils";
import { HeroJewelUtils } from "../utils/HeroJewelUtils";
import { HeroGodEquipmentUtils, type GodEquipmentDrawPrice, type GodEquipmentItem } from "../utils/HeroGodEquipmentUtils";
import { HeroGrowthPickerView, type HeroGrowthChoice } from "./HeroGrowthPickerView";
import { HeroCreationView } from "./HeroCreationView";
import { HeroGodEquipmentCatalogView } from "./HeroGodEquipmentCatalogView";
import { HeroGodEquipmentShopView } from "./HeroGodEquipmentShopView";

/** 当前绘制的格位和对应入口，隐藏的格位不保留操作。 */
interface GrowthSlot {
    readonly label: string;
    readonly icon: string | null;
    readonly click: () => void;
}

/** 底部按钮只描述意图，服务器控制资格和价格。 */
interface GrowthAction {
    readonly label: string;
    readonly click: () => void;
}

const { ccclass, property } = _decorator;
const jewelSlots = ["攻击", "生命", "速度"];
const divineSlots = ["法典", "戒指", "头饰", "吊坠"];
const slotOffsets = [0, 3, 6, 10];
const actionOffsets = [0, 2, 7, 12];

@ccclass("HeroGrowthPanel")
export class HeroGrowthPanel extends Component {
    /** 按升星、宝石、神装排序的三个静态布局，只显示当前页。 */
    @property([Node]) panels: Node[] = [];
    /** 按页分别展示升星返还和条件、宝石套装、神装门槛。 */
    @property([Label]) summaries: Label[] = [];
    /** 三页选择格，依次绑定三行材料、三个宝石槽、四个神装槽。 */
    @property([Button]) slots: Button[] = [];
    /** 各槽的资产图标，独立于预制体中固定的格位底图。 */
    @property([Node]) icons: Node[] = [];
    /** 按槽对应的配置名称、已装备名称或门槛。 */
    @property([Label]) slotsText: Label[] = [];
    /** 按三页顺序绑定的操作按钮，按当前页绑定动作。 */
    @property([Button]) actions: Button[] = [];
    /** 随页签显示操作文案。 */
    @property([Label]) actionsText: Label[] = [];
    /** 三行材料右上角的已选和需求数量。 */
    @property([Label]) starCounts: Label[] = [];
    /** 三行材料品质框，随配方星级着色。 */
    @property([Node]) starFrames: Node[] = [];
    /** 升星材料按钮的可用提醒锚点，顺序与材料格一致。 */
    @property([Node]) starReminderAnchors: Node[] = [];
    /** 每张素材卡按从左到右绑定五枚星标。 */
    @property([Node]) materialStars: Node[] = [];
    /** 十星素材的翼徽，按配方行顺序绑定。 */
    @property([Node]) materialBadges: Node[] = [];
    /** 十星以上素材叠在翼徽上的星级数字。 */
    @property([Node]) materialBadgeNumbers: Node[] = [];
    /** 当前星级的五枚普通星标，按从箭头向外的顺序绑定。 */
    @property([Node]) fromStars: Node[] = [];
    /** 目标星级的五枚普通星标，按从箭头向外的顺序绑定。 */
    @property([Node]) toStars: Node[] = [];
    /** 当前星级达到十星时显示的翅膀底图。 */
    @property(Node) fromBadge: Node | null = null;
    /** 目标星级达到十星时显示的翅膀底图。 */
    @property(Node) toBadge: Node | null = null;
    /** 当前星级超过十星时叠在翅膀上的数字。 */
    @property(Node) fromBadgeNumber: Node | null = null;
    /** 目标星级超过十星时叠在翅膀上的数字。 */
    @property(Node) toBadgeNumber: Node | null = null;
    /** 当前与目标星级的等级上限。 */
    @property(Label) starLevel: Label | null = null;
    /** 配置中本次变化的技能等级。 */
    @property(Label) starSkills: Label | null = null;
    /** 攻击、生命提升的固定标题。 */
    @property(Label) starBonus: Label | null = null;
    /** 配置中本次升星显示的攻击、生命提升比例。 */
    @property(Label) starBonusValue: Label | null = null;
    /** 星标与箭头在没有进一步配方时一同隐藏。 */
    @property(Node) starProgress: Node | null = null;
    /** 材料卡和升星操作所在的背景，只在有配方时显示。 */
    @property(Node) starMaterials: Node | null = null;
    /** 宝石右栏的属性说明，与三个槽位的顺序相同。 */
    @property([Label]) jewelDetails: Label[] = [];
    /** 已解锁的空槽显示绿色加号。 */
    @property([Node]) jewelPlus: Node[] = [];
    /** 未解锁的槽显示锁。 */
    @property([Node]) jewelLocks: Node[] = [];
    /** 攻击、生命、速度槽以及一键镶嵌按钮的提醒锚点。 */
    @property([Node]) jewelReminderAnchors: Node[] = [];
    /** 宝石右栏的已镶图标，小于圆盘上的宝石图标。 */
    @property([Node]) jewelAttributeIcons: Node[] = [];
    /** 已镶嵌时对应孔位下方的彩色宝石座。 */
    @property([Node]) jewelRings: Node[] = [];
    /** 符合当前套装星级时点亮的三段圆环。 */
    @property([Node]) jewelArcs: Node[] = [];
    /** 圆盘中央套装纹章，达到三槽门槛时点亮。 */
    @property(Node) jewelSeal: Node | null = null;

    /** 真正拥有各选择窗的英雄详情，父页退出时由 UIManager 一起关闭。 */
    private owner: BaseView | null = null;
    /** 当前已展示的英雄实例，关闭详情或切换对象时丢弃素材草稿。 */
    private hero: OwnedHero | null = null;
    /** 当前显示的培养页签索引，0 表示普通培养。 */
    private tab = 0;
    /** 只保存尚未提交的升星选择，以配方行号索引。 */
    private materials: HeroStarMaterials[] = [];
    /** 每次刷新都替换按钮动作，隐藏的按钮不使用上次页签行为。 */
    private slotActions: readonly GrowthSlot[] = [];
    /** 每次刷新按当前配方或槽位设置真实动作。 */
    private commands: readonly (GrowthAction | null)[] = [];
    /** 按材料格索引保存公共红点，随面板销毁。 */
    private starReminders: (RedDotBinding | null)[] = [];
    /** 按宝石槽位或一键镶嵌按钮复用实例，隐藏时解除订阅。 */
    private jewelReminders: (RedDotBinding | null)[] = [];

    /** 组件挂载时绑定点击和红点锚点，监听随节点销毁回收。 */
    protected onLoad(): void {
        this.starReminders = this.starReminderAnchors.map(anchor => anchor ? RedDotBinding.atAnchor(anchor) : null);
        this.jewelReminders = this.jewelReminderAnchors.map(anchor => anchor ? RedDotBinding.atAnchor(anchor) : null);
        this.slots.forEach((button, index) => {
            button.node.on(Button.EventType.CLICK, () => {
                this.slotActions[index - slotOffsets[this.tab - 1]]?.click();
            }, this);
        });
        this.actions.forEach((button, index) => {
            button.node.on(Button.EventType.CLICK, () => {
                this.commands[index - actionOffsets[this.tab - 1]]?.click();
            }, this);
        });
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        EventDispatcher.instance.on(HeroStarController.Updated, this, this.refresh);
        EventDispatcher.instance.on("hero-jewel:updated", this, this.refresh);
        EventDispatcher.instance.on("hero-god-equipment:updated", this, this.refresh);
    }

    /** 重开时读取当前英雄的状态，再绑定被停用的宝石提醒。 */
    protected onEnable(): void {
        this.refresh();
    }

    /** 停用时隐藏材料提醒并解除宝石订阅，保留实例供页签复用。 */
    protected onDisable(): void {
        this.starReminders.forEach(binding => binding?.setVisible(false));
        this.bindJewelReminders(null);
    }

    /** 随详情销毁释放当前选择和红点，避免旧英雄窗口继续更新。 */
    protected onDestroy(): void {
        EventDispatcher.instance.offTarget(this);
        this.starReminders.forEach(binding => binding?.dispose());
        this.jewelReminders.forEach(binding => binding?.dispose());
        this.starReminders = [];
        this.jewelReminders = [];
        this.owner = null;
        this.hero = null;
        this.materials = [];
    }

    /** 进入页签或同步名册；切英雄时重置草稿，离开宝石页时解除槽位提醒。 */
    public show(owner: BaseView, tab: number, hero: OwnedHero): void {
        if (hero.id !== this.hero?.id || hero.star !== this.hero.star) {
            this.materials = [];
        }
        this.owner = owner;
        this.hero = hero;
        this.tab = tab;
        if (tab !== 2) {
            this.bindJewelReminders(null);
        }
        this.panels.forEach((panel, index) => {
            panel.active = index === tab - 1;
        });
        this.refresh();
    }

    /** 刷新当前正在展示的页签，从名册取最新已穿数据。 */
    private refresh(): void {
        if (!this.node.isValid || !this.node.activeInHierarchy || !this.hero) {
            return;
        }
        const hero = HeroRosterModel.instance.snapshot.heroes.find(value => value.id === this.hero?.id);
        if (!hero) {
            return;
        }
        if (hero.star !== this.hero.star) {
            this.materials = [];
        }
        this.hero = hero;
        switch (this.tab) {
            case 1: this.renderStar(hero); break;
            case 2: this.renderJewels(hero); break;
            case 3: this.renderDivine(hero); break;
        }
    }

    /** 将已算出的展示交给静态格位和操作按钮。 */
    private render(slots: readonly GrowthSlot[], actions: readonly (GrowthAction | null)[], text: string): void {
        this.slotActions = slots;
        this.commands = actions;
        const section = this.tab - 1;
        this.summaries[section].string = text;
        for (let index = slotOffsets[section]; index < slotOffsets[section + 1]; index++) {
            const button = this.slots[index];
            const slot = slots[index - slotOffsets[section]];
            button.node.active = !!slot;
            button.interactable = !!slot;
            if (slot) {
                this.slotsText[index].string = slot.label;
                const icon = this.icons[index];
                icon.active = !!slot.icon;
                ResManager.setSprite(icon, slot.icon);
            }
        }
        for (let index = actionOffsets[section]; index < actionOffsets[section + 1]; index++) {
            const button = this.actions[index];
            const action = actions[index - actionOffsets[section]];
            button.node.active = !!action;
            button.interactable = !!action;
            if (action) {
                this.actionsText[index].string = action.label;
            }
        }
    }

    /** 对照当前和下一星配置，展示等级上限、技能成长、配方与返还。 */
    private renderStar(hero: OwnedHero): void {
        const recipe = HeroStarUtils.recipe(hero);
        this.starProgress!.active = !!recipe;
        this.starMaterials!.active = !!recipe;
        for (const label of [this.starLevel, this.starSkills, this.starBonus, this.starBonusValue]) {
            label!.node.active = !!recipe;
        }
        if (!recipe) {
            this.render([], [], "这名英雄已达最高星级");
            return;
        }
        const config = GameConfig.instance;
        const before = config.requireConfig(GConfig.HeroStar, recipe.fromStar);
        const after = config.requireConfig(GConfig.HeroStar, recipe.toStar);
        this.showRank(recipe.fromStar, this.fromStars, this.fromBadge!, this.fromBadgeNumber!);
        this.showRank(recipe.toStar, this.toStars, this.toBadge!, this.toBadgeNumber!);
        this.starLevel!.string = `等级上限 ${before.level_limit} → ${after.level_limit}`;
        const skillsBefore = [before.skill1, before.skill2, before.skill3, before.skill4];
        const skillsAfter = [after.skill1, after.skill2, after.skill3, after.skill4];
        const changed = skillsAfter.findIndex((value, index) => value !== skillsBefore[index]);
        const allSkillsChanged = changed === 0 && skillsAfter.every((value, index) =>
            value === skillsAfter[0] && skillsBefore[index] === skillsBefore[0] && value !== skillsBefore[index]);
        this.starSkills!.string = changed === -1 ? "" :
            `${allSkillsChanged ? "全技能" : "技能" + (changed + 1)} Lv.${skillsBefore[changed]} → Lv.${skillsAfter[changed]}`;
        this.starBonus!.string = hero.star >= 5 ? "攻/生命提升" : "速度提升";
        this.starBonusValue!.string = hero.star >= 5 ? `${before.attack_show ?? 0}% / ${before.hp_show ?? 0}%` : "10";
        const costText = recipe.costs.map(cost => {
            const face = BagItemCatalog.face(cost.itemId, 1);
            return `${face.title} ${BagModel.instance.quantity(cost.itemId)}/${cost.quantity}`;
        }).join("　");
        const conditionText = [
            [recipe.roleLevel > 0 ? `角色 ${recipe.roleLevel} 级` : "",
                recipe.worldLevel > 0 ? `世界等级 ${recipe.worldLevel}` : ""].filter(Boolean).join(" 或 "),
            recipe.minimumOwnedHeroes ? `持有 ${recipe.minimumOwnedHeroes} 名 ${recipe.minimumOwnedStar} 星英雄` : "",
        ].filter(Boolean).join("，");
        const roster = HeroRosterModel.instance.snapshot.heroes;
        const target = HeroCatalog.find(hero.templateId);
        const slots = recipe.rows.map((row, index) => {
            const choice = this.materials.find(value => value.row === row.row);
            const selected = roster.find(value => value.id === choice?.heroIds[0]);
            const element = row.element === -1 ? target?.elem ?? 0 : row.element;
            const stock = row.replacementItemId === null ? 0 : BagModel.instance.quantity(row.replacementItemId);
            const chosenHeroes = choice?.heroIds.length ?? 0;
            const count = Math.min(row.count, chosenHeroes + (choice?.useReplacement ? stock : 0));
            const icon = selected ? HeroCatalog.find(selected.templateId)?.icon
                : choice?.useReplacement && row.replacementItemId !== null
                    ? BagItemCatalog.face(row.replacementItemId, stock).icon
                    : row.templateId === -1 ? target?.icon
                        : row.templateId > 0 ? HeroCatalog.find(row.templateId)?.icon
                            : ResManager.item(20_000_000 + 100_000 * element + 1000 * Math.min(5, Math.max(3, row.star)));
            this.starCounts[index].string = `${count}/${row.count}`;
            const occupied = this.materials.reduce<string[]>((ids, other) => {
                if (other.row !== row.row) {
                    ids.push(...other.heroIds);
                }
                return ids;
            }, []);
            const canChoose = HeroStarUtils.candidates(hero, row, roster, occupied).length + stock >= row.count;
            this.starReminders[index]?.setVisible(count < row.count && canChoose);
            const rarity = row.star >= 10 ? 5 : row.star >= 5 ? 4 : Math.max(1, row.star - 1);
            ResManager.setSprite(this.starFrames[index], ResManager.qualityFrame(rarity));
            this.showRank(row.star, this.materialStars.slice(index * 5, (index + 1) * 5),
                this.materialBadges[index], this.materialBadgeNumbers[index]);
            return { label: row.label, icon: icon ?? null, click: () => this.chooseStarMaterials(hero, row) };
        });
        this.render(slots, [
            { label: "升星", click: () => this.submitStar(hero) },
            { label: "前往创造法阵", click: () => this.openCreation(hero.templateId) },
        ], [costText, conditionText, "素材英雄升级、强化消耗的资源将返还"].filter(Boolean).join("\n"));
    }

    /** 从升星页进入创造法阵，预选当前英雄模板。 */
    private openCreation(templateId: number): void {
        if (this.owner) {
            void UIManager.instance.openChild(this.owner, HeroCreationView, { templateId })
                .catch(() => { /* 框架统一处理开窗失败。 */ });
        }
    }

    /** 在升星前后和材料卡上应用与英雄标题相同的星级图案。 */
    private showRank(rank: number, stars: readonly Node[], badge: Node, badgeNumber: Node): void {
        const { count, frame, badge: badgeFrame, number: numberFrame } = HeroGrowthDisplayUtils.starAppearance(rank);
        stars.forEach((star, index) => {
            star.active = index < count;
            if (star.active) {
                ResManager.setSprite(star, frame);
            }
        });
        badge.active = !!badgeFrame;
        badgeNumber.active = !!numberFrame;
        ResManager.setSprite(badge, badgeFrame);
        ResManager.setSprite(badgeNumber, numberFrame);
    }

    /** 保留已选素材可反选，其他行的选择仍占用，替代道具须由玩家明确选择。 */
    private chooseStarMaterials(hero: OwnedHero, material: HeroStarMaterialRow): void {
        const current = () => this.materials.find(value => value.row === material.row)
            ?? { row: material.row, heroIds: [], useReplacement: false };
        this.openPicker({
            title: material.label,
            empty: "名册中没有符合条件的素材",
            choices: () => {
                const selected = current();
                const occupied: string[] = [];
                for (const row of this.materials) {
                    if (row.row !== material.row) {
                        occupied.push(...row.heroIds);
                    }
                }
                const roster = HeroRosterModel.instance.snapshot.heroes;
                const choices = HeroStarUtils.candidates(hero, material, roster, occupied).map(value => {
                    const face = HeroCatalog.find(value.templateId);
                    return {
                        key: value.id, title: face?.name ?? "英雄", caption: `Lv.${value.level} · ${value.star} 星`,
                        icon: face?.icon ?? null, action: selected.heroIds.includes(value.id) ? "取消" : "选用",
                    };
                });
                if (material.replacementItemId && selected.heroIds.length < material.count) {
                    const itemId = material.replacementItemId;
                    const stock = BagModel.instance.quantity(itemId);
                    const face = BagItemCatalog.face(itemId, stock);
                    choices.push({ key: "replacement", title: face.title, caption: `持有 ${stock}`,
                        icon: face.icon, action: selected.useReplacement ? "取消" : "替代" });
                }
                return choices;
            },
            choose: key => {
                const selected = current();
                const ids = selected.heroIds.includes(key) ? selected.heroIds.filter(id => id !== key)
                    : selected.heroIds.length < material.count && key !== "replacement"
                        ? [...selected.heroIds, key] : selected.heroIds;
                const useReplacement = ids.length < material.count
                    && (key === "replacement" ? !selected.useReplacement : selected.useReplacement);
                const row = { row: material.row, heroIds: ids, useReplacement };
                this.materials = [...this.materials.filter(value => value.row !== material.row), row];
                this.refresh();
                return false;
            },
        });
    }

    /** 玩家确认前确认各行已填满，最终扣除、死锁恢复和原回执由服务端处理。 */
    private submitStar(hero: OwnedHero): void {
        const recipe = HeroStarUtils.recipe(hero);
        const stars = HeroStarController.instance;
        if (!recipe || stars.busy) {
            return;
        }
        if (!stars.eligible(recipe)) {
            UIManager.instance.toast("尚未达到升星等级或名册条件");
            return;
        }
        const selections = recipe.rows.map(row => this.materials.find(value => value.row === row.row));
        const complete = selections.every((value, index) => {
            const row = recipe.rows[index];
            const missing = row.count - (value?.heroIds.length ?? 0);
            return missing === 0 || (value?.useReplacement === true && row.replacementItemId !== null
                && BagModel.instance.quantity(row.replacementItemId) >= missing);
        });
        if (!complete || recipe.costs.some(cost => BagModel.instance.quantity(cost.itemId) < cost.quantity)) {
            UIManager.instance.toast("升星材料不足");
            return;
        }
        const rows = selections.filter((row): row is HeroStarMaterials => row !== undefined);
        this.confirm("英雄升星", `升至 ${recipe.toStar} 星。确认后会消耗所选素材英雄及对应道具。`,
            () => stars.upgrade(hero.id, hero.star, rows));
    }

    /** 按实际三槽和套装进度显示宝石，槽位与一键镶嵌共用页签的红点路径。 */
    private renderJewels(hero: OwnedHero): void {
        const jewels = hero.gems?.items;
        this.bindJewelReminders(jewels ? hero.id : null);
        if (!jewels) {
            this.render([], [], "宝石状态待同步");
            return;
        }
        const set = HeroJewelUtils.setProgress(jewels);
        const bag = BagModel.instance.items;
        const slots = jewelSlots.map((name, index) => {
            const slot = index + 1;
            const item = jewels.find(value => value.slot === slot);
            const need = HeroJewelUtils.requiredStar(slot);
            const face = item && BagItemCatalog.face(item.templateId, 1);
            const definition = item && HeroJewelUtils.definition(item.templateId);
            const locked = need !== undefined && hero.star < need && !item;
            this.jewelPlus[index].active = !locked && need !== undefined && !item;
            this.jewelLocks[index].active = locked;
            this.jewelRings[index].active = !!item;
            this.jewelArcs[index].active = !!set && !!definition && definition.star >= set.star;
            const attributeIcon = this.jewelAttributeIcons[index];
            attributeIcon.active = !!face?.icon;
            ResManager.setSprite(attributeIcon, face?.icon ?? null);
            this.jewelDetails[index].string = definition ? HeroJewelUtils.attributesText(definition.attributes)
                : locked ? `英雄达到 ${need} 星解锁` : `镶嵌后提高${name}`;
            return {
                label: face?.title ?? (locked ? `${name}槽未解锁` : `${name}宝石可镶嵌`),
                icon: face?.icon ?? null,
                click: () => this.chooseJewel(hero, slot),
            };
        });
        this.jewelSeal!.getComponent(Sprite)!.grayscale = set?.count !== 3;
        const controls = HeroJewelController.instance;
        const canCombine = bag.some(item => {
            const target = HeroJewelUtils.combineTarget(item.itemId);
            return target && HeroJewelUtils.combineLimit(target.itemId, bag) > 0;
        });
        this.render(slots, [
            { label: "一键镶嵌", click: () => controls.changeAll(hero.id, true) },
            jewels.length ? { label: "全部卸下", click: () => controls.changeAll(hero.id, false) } : null,
            { label: "宝石获取", click: () => this.notice("宝石获取", "旧版的攻击和生命宝石来自黑市，速度宝石来自周礼包。相关入口暂未开放。") },
            { label: "", click: () => this.notice("宝石说明", "达到对应星级可解锁槽位。镶满三槽后，按最低宝石星级激活套装加成。") },
            canCombine ? { label: "宝石合成", click: () => this.chooseJewelRecipe() } : null,
        ], set ? `${set.star}星宝石套装（${set.count}/3）　${HeroJewelUtils.attributesText(set.attributes)}` : "");
    }

    /** 三个槽位订阅各自叶子，一键镶嵌订阅同一汇总；未显示时解除所有绑定。 */
    private bindJewelReminders(heroId: string | null): void {
        this.jewelReminders.forEach((binding, index) => {
            const slot = index < jewelSlots.length ? index + 1 : undefined;
            binding?.bindPath(heroId === null ? null : GameRedDotKey.heroJewel(heroId, slot));
        });
    }

    /** 当前槽位在同一窗列出卸下和可镶候选，只提交选择的真实配置。 */
    private chooseJewel(hero: OwnedHero, slot: number): void {
        const need = HeroJewelUtils.requiredStar(slot);
        const equipped = () => HeroRosterModel.instance.snapshot.heroes.find(value => value.id === hero.id)
            ?.gems?.items.find(value => value.slot === slot);
        if (need === undefined || (hero.star < need && !equipped())) {
            UIManager.instance.toast(need === undefined ? "宝石条件待同步" : `英雄达到 ${need} 星可镶嵌`);
            return;
        }
        this.openPicker({
            title: jewelSlots[slot - 1] + "宝石",
            empty: "背包中没有可镶的宝石",
            choices: () => HeroJewelUtils.candidates(BagModel.instance.items, slot, equipped()?.templateId)
                .map(item => this.jewelChoice(item.itemId, item.quantity, "镶嵌")),
            current: () => {
                const item = equipped();
                return item ? this.jewelChoice(item.templateId, 1, "卸下", "remove") : undefined;
            },
            choose: key => {
                const controller = HeroJewelController.instance;
                const worn = equipped();
                if (key === "remove" && worn) {
                    controller.remove(hero.id, slot, worn.templateId);
                } else if (key !== "remove") {
                    controller.wear(hero.id, Number(key), slot, worn?.templateId);
                }
                return true;
            },
        });
    }

    /** 显示可合成配方及同槽一键合成，所有实际成本仍读服务端配置。 */
    private chooseJewelRecipe(): void {
        this.openPicker({
            title: "宝石合成",
            empty: "暂无可合成的宝石",
            choices: () => {
                const items = BagModel.instance.items;
                const rows: Array<HeroGrowthChoice & { slot: number }> = [];
                for (const item of items) {
                    const target = HeroJewelUtils.combineTarget(item.itemId);
                    if (!target || HeroJewelUtils.combineLimit(target.itemId, items) < 1) {
                        continue;
                    }
                    const cost = target.recipe.map(material => {
                        return `${BagItemCatalog.face(material.itemId, 1).title} ×${material.quantity}`;
                    }).join("　");
                    rows.push({ ...this.jewelChoice(target.itemId, 1, "合成"), caption: cost, slot: target.slot });
                }
                return [...rows, ...[...new Set(rows.map(row => row.slot))].map(slot => ({
                    key: `all:${slot}`, title: jewelSlots[slot - 1] + "宝石", caption: "按星级逐档使用可用材料",
                    icon: null, action: "一键合成",
                }))];
            },
            choose: key => {
                const controller = HeroJewelController.instance;
                if (key.startsWith("all:")) {
                    const slot = Number(key.slice(4));
                    this.confirm("宝石合成", `一键合成背包中的${jewelSlots[slot - 1]}宝石？`,
                        () => controller.combineAll(slot));
                } else {
                    const name = BagItemCatalog.face(Number(key), 1).title;
                    this.confirm("宝石合成", `按配方合成 1 枚${name}？`,
                        () => controller.combine(Number(key), 1));
                }
                return true;
            },
        });
    }

    /** 同一宝石配置用于合成和穿戴行，说明显示服务器使用的原属性单位。 */
    private jewelChoice(itemId: number, count: number, action: string, key = String(itemId)): HeroGrowthChoice {
        const item = HeroJewelUtils.definition(itemId);
        const face = BagItemCatalog.face(itemId, count);
        return {
            key, title: face.title, caption: item ? `${item.star} 星 · 数量 ${count}` : "",
            details: item ? HeroJewelUtils.attributesText(item.attributes) : "", icon: face.icon,
            quality: item?.rarity, action,
        };
    }

    /** 在原四个格位表现实际实例，门槛与说明各自读取当前快照。 */
    private renderDivine(hero: OwnedHero): void {
        const state = HeroRosterModel.instance.snapshot.godEquipment;
        const controller = HeroGodEquipmentController.instance;
        if (!state) {
            this.render([], [], "神装状态待同步");
            return;
        }
        const gate = controller.gate(hero.star);
        const slots = divineSlots.map((name, index) => {
            const slot = index + 1;
            const item = HeroGodEquipmentUtils.worn(state, hero.id, slot);
            const face = item && BagItemCatalog.face(item.templateId, 1);
            return {
                label: face ? name : "",
                icon: face?.icon ?? null,
                click: () => this.chooseDivine(hero, slot),
            };
        });
        this.render(slots, [
            { label: "神装探宝", click: () => this.chooseDivineDraw() },
            { label: "神装图鉴", click: () => this.openGodEquipmentView("catalog") },
            { label: "神装商店", click: () => this.openGodEquipmentView("shop") },
            { label: "加成一览", click: () => this.showDivineAttributes(hero) },
            { label: "", click: () => this.notice("神装说明",
                `角色达到 ${state.requiredRoleLevel} 级、世界等级达到 ${state.requiredWorldLevel} 可探宝。英雄达到 ${state.requiredHeroStar} 星可穿戴。点击格位可更换或卸下神装。`) },
        ], gate ?? "");
    }

    /** 图鉴和商店沿探宝的角色、世界等级门槛，打开后仍保留当前英雄。 */
    private openGodEquipmentView(page: "catalog" | "shop"): void {
        const gate = HeroGodEquipmentController.instance.gate();
        if (gate) {
            UIManager.instance.toast(gate);
        } else if (this.owner) {
            const target = page === "catalog" ? HeroGodEquipmentCatalogView : HeroGodEquipmentShopView;
            void UIManager.instance.openChild(this.owner, target)
                .catch(() => { /* 框架统一处理开窗失败。 */ });
        }
    }

    /** 复用培养选择窗显示单次与十次的当前费用，点击后沿用原扣费确认。 */
    private chooseDivineDraw(): void {
        const gate = HeroGodEquipmentController.instance.gate();
        if (gate) {
            UIManager.instance.toast(gate);
            return;
        }
        this.openPicker({
            title: "神装探宝",
            empty: "探宝价格待同步",
            choices: () => {
                const choices: HeroGrowthChoice[] = [];
                for (const count of [1, 10] as const) {
                    const price = this.divineDrawPrice(count);
                    if (price) {
                        choices.push({
                            key: String(count),
                            title: count === 1 ? "探宝一次" : "探宝十次",
                            caption: this.divineDrawCostText(price),
                            icon: BagItemCatalog.face(price.ticket, 1).icon,
                            action: "探宝",
                        });
                    }
                }
                return choices;
            },
            choose: key => {
                this.drawDivine(key === "10" ? 10 : 1);
                return true;
            },
        });
    }

    /** 加成说明来自已穿神装的真实实例，只展示当前已接通的属性。 */
    private showDivineAttributes(hero: OwnedHero): void {
        const items = HeroRosterModel.instance.snapshot.godEquipment?.items.filter(item => item.heroId === hero.id) ?? [];
        const text = items.map(item => {
            const face = BagItemCatalog.face(item.templateId, 1);
            return `${face.title}：${HeroGodEquipmentUtils.attributeText(item)}`;
        }).join("\n");
        this.notice("神装加成", text || "该英雄未佩戴神装");
    }

    /** 候选和已穿实例都读同一份独立神装快照。 */
    private chooseDivine(hero: OwnedHero, slot: number): void {
        const controller = HeroGodEquipmentController.instance;
        const state = () => HeroRosterModel.instance.snapshot.godEquipment;
        const worn = () => HeroGodEquipmentUtils.worn(state(), hero.id, slot);
        const gate = controller.gate(hero.star);
        if (gate && !worn()) {
            UIManager.instance.toast(gate);
            return;
        }
        this.openPicker({
            title: "神装 · " + divineSlots[slot - 1],
            empty: "没有该部位的闲置神装",
            choices: () => gate ? [] : HeroGodEquipmentUtils.candidates(state(), slot)
                .map(item => this.divineChoice(item, "穿戴")),
            current: () => {
                const item = worn();
                return item && this.divineChoice(item, "卸下", "remove");
            },
            choose: key => {
                if (key === "remove") {
                    controller.remove(hero.id, slot);
                } else {
                    controller.wear(hero.id, slot, key);
                }
                return true;
            },
        });
    }

    /** 神装展示实例实际属性和星级，同模板不同随机项保持独立。 */
    private divineChoice(item: GodEquipmentItem, action: string, key = item.instanceId): HeroGrowthChoice {
        const face = BagItemCatalog.face(item.templateId, 1);
        return { key, title: face.title, caption: `${item.star} 星`, icon: face.icon, quality: item.quality,
            details: HeroGodEquipmentUtils.attributeText(item), action };
    }

    /** 探宝按真实免费次数或价格确认，钻石报价封顶由服务端复核。 */
    private drawDivine(count: 1 | 10): void {
        const controller = HeroGodEquipmentController.instance;
        const gate = controller.gate();
        if (gate) {
            UIManager.instance.toast(gate);
            return;
        }
        if (controller.busy) {
            return;
        }
        const price = this.divineDrawPrice(count);
        if (!price) {
            UIManager.instance.toast("探宝价格待同步");
            return;
        }
        if (price.quantity === 0 && price.diamonds === 0) {
            controller.draw(count, 0);
            return;
        }
        const cost = this.divineDrawCostText(price);
        this.confirm("神装探宝", `消耗 ${cost} 探宝 ${count} 次？`, () => controller.draw(count, price.diamonds));
    }

    /** 从现有快照按实际库存计算当前报价。 */
    private divineDrawPrice(count: 1 | 10): GodEquipmentDrawPrice | null {
        const state = HeroRosterModel.instance.snapshot.godEquipment;
        const offer = state && HeroGodEquipmentUtils.drawPrice(count, 0, state);
        return state && offer
            ? HeroGodEquipmentUtils.drawPrice(count, BagModel.instance.quantity(offer.ticket), state)
            : null;
    }

    /** 显示实际使用的免费次数、钻石或探宝券。 */
    private divineDrawCostText(price: GodEquipmentDrawPrice): string {
        if (price.diamonds > 0) {
            return `${price.diamonds} 钻石`;
        }
        return price.quantity > 0 ? `${BagItemCatalog.face(price.ticket, 1).title} ×${price.quantity}` : "本次免费";
    }

    /** 子窗归当前详情，重复打开或关页由共享 UI 生命周期处理。 */
    private openPicker(args: Parameters<HeroGrowthPickerView["onOpen"]>[0]): void {
        if (this.owner) {
            void UIManager.instance.openChild(this.owner, HeroGrowthPickerView, args)
                .catch(() => { /* 框架统一处理开窗失败。 */ });
        }
    }

    /** 只读说明沿用通用单按钮窗，关闭后回到当前英雄页签。 */
    private notice(title: string, message: string): void {
        if (this.owner) {
            void UIManager.instance.openChild(this.owner, ConfirmView, {
                title, message, showCancel: false, confirmText: "知道了", onConfirm: () => {},
            }).catch(() => { /* 框架统一处理开窗失败。 */ });
        }
    }

    /** 资产消费复用通用确认窗。切换英雄后撤销旧界面的确认意图。 */
    private confirm(title: string, message: string, submit: () => void): void {
        const hero = this.hero;
        if (this.owner && hero) {
            void UIManager.instance.openChild(this.owner, ConfirmView, {
                title, message,
                onConfirm: () => {
                    if (this.isValid && this.hero?.id === hero.id && this.hero.star === hero.star) {
                        submit();
                    }
                },
            }).catch(() => { /* 框架统一处理开窗失败。 */ });
        }
    }
}
