/**
 * 英雄圣器的激活和详情窗口。只读统一名册和配置，交易请求交给圣器控制器。
 * 使用原圣器框、图标和按钮，换装及升星材料复用英雄虚拟选择列表。
 */
import { _decorator, Button, Label, Node } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagEvent } from "../../bag/utils/BagEvent";
import { ConfirmView } from "../../common/ui/ConfirmView";
import type { OwnedHero } from "../data/HeroSnapshotUtils";
import { HeroArtifactController, type HeroArtifactRequest } from "../HeroArtifactController";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroArtifactUtils, type HeroArtifactDefinition, type HeroArtifactItem } from "../utils/HeroArtifactUtils";
import { HeroCatalog } from "../utils/HeroCatalog";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroGrowthPickerView, type HeroGrowthChoice } from "./HeroGrowthPickerView";

/** 弹窗固定服务一个英雄的一个戒指或项链格位。 */
interface HeroArtifactArgs {
    readonly heroId: string;
    readonly slot: number;
}

/** 本次选择窗内的临时材料，关闭即释放。 */
interface ArtifactUpgradeDraft {
    target?: HeroArtifactDefinition;
    readonly heroes: Map<number, Set<string>>;
    readonly dummies: Map<number, number>;
    readonly instances: Set<string>;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-artifact",
    prefab: "bundles/module/hero/prefabs/HeroArtifactView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroArtifactView")
export class HeroArtifactView extends BaseView<HeroArtifactArgs> {
    /** 通用弹窗关闭按钮。 */
    @property(Button) closeButton: Button | null = null;
    /** 激活版画右上方的关闭按钮。 */
    @property(Button) activationCloseButton: Button | null = null;
    /** 原激活画面只在未激活时显示。 */
    @property(Node) activationPanel: Node | null = null;
    /** 已激活页面使用较窄的圣器详情底板。 */
    @property(Node) detailPanel: Node | null = null;
    /** 激活赠品的公告名称。 */
    @property(Label) activationName: Label | null = null;
    /** 激活赠品在页面中部的放大图。 */
    @property(Node) activationIcon: Node | null = null;
    /** 激活赠品的真实品质边框。 */
    @property(Node) activationFrame: Node | null = null;
    /** 戒指和项链各用原激活标题。 */
    @property(Node) activationTitle: Node | null = null;
    /** 已戴或激活赠品的图标。 */
    @property(Node) icon: Node | null = null;
    /** 按策划品质显示的武具边框。 */
    @property(Node) iconFrame: Node | null = null;
    /** 与已戴物品品质一致的详情横幅。 */
    @property(Node) itemHeader: Node | null = null;
    /** 高阶圣器详情标题。 */
    @property(Label) title: Label | null = null;
    /** 当前圣器原物品名称。 */
    @property(Label) itemName: Label | null = null;
    /** 只读评分、属性、套装和激活条件。 */
    @property(Label) details: Label | null = null;
    /** 激活成本在按钮上方显示。 */
    @property(Label) costs: Label | null = null;
    /** 激活格位后立即装备原实物的按钮。 */
    @property(Button) activateButton: Button | null = null;
    /** 查看当前部位闲置圣器，选择后换装或穿戴。 */
    @property(Button) wearButton: Button | null = null;
    /** 解除当前关联，原件回到可穿戴列表。 */
    @property(Button) removeButton: Button | null = null;
    /** 已有后续配方的实际本体可升星。 */
    @property(Button) upgradeButton: Button | null = null;
    /** 仅完美圣器显示的配置目标转换按钮。 */
    @property(Button) transformButton: Button | null = null;
    /** 原版未激活时的戒指或项链提示图。 */
    @property(Node) activationTip: Node | null = null;

    /** 共享视口适配只管理根节点，具体位置由预制体负责。 */
    public onCreate(): void {
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
    }

    /** 打开指定格位并监听名册、普通余额和操作中的状态。 */
    public onOpen(args: HeroArtifactArgs): void {
        if (!args?.heroId || !HeroArtifactUtils.slot(args.slot)) {
            throw new Error("圣器视图参数或配置缺失");
        }
        this.closeButton!.interactable = true;
        this.activationCloseButton!.interactable = true;
        this.listen(this.closeButton!, this.close);
        this.listen(this.activationCloseButton!, this.close);
        this.listen(this.activateButton!, this.activate);
        this.listen(this.wearButton!, this.wear);
        this.listen(this.removeButton!, this.remove);
        this.listen(this.upgradeButton!, this.upgrade);
        this.listen(this.transformButton!, this.transform);
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        EventDispatcher.instance.on(HeroArtifactController.Updated, this, this.refresh);
        this.ownListener(() => EventDispatcher.instance.offTarget(this));
        this.refresh();
    }

    /** 只从权威名册读取当前英雄与佩戴信息，同步后不沿用旧格位。 */
    private selection(): { hero: OwnedHero; item: HeroArtifactItem | undefined; activated: boolean } | undefined {
        const args = this.args;
        const state = HeroRosterModel.instance.snapshot;
        const hero = state.heroes.find(row => row.id === args?.heroId);
        if (!hero || !args || !state.artifacts) {
            return undefined;
        }
        return {
            hero,
            item: HeroArtifactUtils.worn(state.artifacts, hero.id, args.slot),
            activated: HeroArtifactUtils.active(state.artifacts, hero.id, args.slot),
        };
    }

    /** 用实际佩戴状态显示激活、空槽和已穿戴三个状态。 */
    private refresh(): void {
        const data = this.selection();
        if (!data) {
            this.close();
            return;
        }
        const slot = HeroArtifactUtils.slot(this.args!.slot)!;
        const templateId = data.item?.templateId ?? (data.activated ? undefined : slot.rewardTemplateId);
        const template = templateId ? HeroArtifactUtils.definition(templateId) : undefined;
        const face = templateId ? BagItemCatalog.face(templateId, 1) : null;
        const equipped = HeroRosterModel.instance.snapshot.artifacts!.items.filter(item => item.heroId === data.hero.id);
        const name = this.args!.slot === 1 ? "戒指" : "项链";
        this.activationPanel!.active = !data.activated;
        this.detailPanel!.active = data.activated;
        this.title!.string = `圣器·${name}`;
        this.itemName!.string = face?.title ?? `未佩戴${name}`;
        if (data.activated) {
            this.details!.string = data.item && template ? HeroArtifactUtils.description(template, equipped)
                : "选择同部位的闲置圣器进行佩戴";
            ResManager.setSprite(this.icon, face?.icon ?? ResManager.ui("common", this.args!.slot === 1
                ? "artifacts_jiezhi" : "artifacts_xianglian"));
            ResManager.setSprite(this.iconFrame, face?.frame ?? ResManager.qualityFrame(0));
            const quality = templateId ? GameConfig.instance.getConfig(GConfig.Item, templateId)?.rare_mark : undefined;
            ResManager.setSprite(this.itemHeader, `bag/ui/backpack-info_spr-banner-backpack-${quality ?? 1}`);
        } else {
            this.activationName!.string = face?.title ?? name;
            this.costs!.string = HeroArtifactUtils.costText(slot.costs);
            ResManager.setSprite(this.activationIcon, face?.icon ?? null);
            ResManager.setSprite(this.activationFrame, face?.frame ?? ResManager.qualityFrame(0));
            ResManager.setSprite(this.activationTitle, ResManager.ui("common", "artifacts_jihuo" + slot.slot));
            ResManager.setSprite(this.activationTip, ResManager.ui("common", "artifacts_tips" + slot.slot));
        }
        this.updateButton(this.activateButton!, !data.activated && data.hero.level >= slot.level && data.hero.star >= slot.star);
        this.updateButton(this.wearButton!, data.activated);
        this.updateButton(this.removeButton!, !!data.item);
        this.updateButton(this.upgradeButton!, !!data.item && !!template?.upgradeTargets.length);
        this.updateButton(this.transformButton!, !!data.item && !!template?.transformTarget);
    }

    /** 激活券/钻石资格在点击时说明；真实扣款和赠品由服务端执行。 */
    private activate(): void {
        const slot = HeroArtifactUtils.slot(this.args!.slot)!;
        const controller = HeroArtifactController.instance;
        if (slot.costs.some(cost => controller.balance(cost.itemId) < cost.quantity)) {
            UIManager.instance.toast("圣器激活材料不足");
            return;
        }
        this.change({ action: "ACTIVATE" });
    }

    /** 在当前格位选择闲置圣器，换装提交玩家看到的原件身份。 */
    private wear(): void {
        this.openPicker({
            title: "选择圣器",
            empty: "暂无可佩戴的同部位圣器",
            choices: () => HeroArtifactUtils.available(HeroRosterModel.instance.snapshot.artifacts, this.args!.slot)
                .map(item => this.itemChoice(item.templateId, item.instanceId, "佩戴")),
            choose: key => {
                const item = this.selection()?.item;
                this.change({ action: "EQUIP", instanceId: key, expectedInstanceId: item?.instanceId });
                return true;
            },
        });
    }

    /** 旧版卸下保留原件和圣器位置激活。 */
    private remove(): void {
        const item = this.selection()?.item;
        if (item) {
            this.change({ action: "UNEQUIP", instanceId: item.instanceId });
        }
    }

    /** 展示旧表对应的下一品质或两种完美分支，在同一列表中选择实际素材。 */
    private upgrade(): void {
        const data = this.selection();
        if (!data?.item) {
            return;
        }
        const current = data.item;
        const origin = HeroArtifactUtils.definition(current.templateId);
        if (!origin?.upgradeTargets.length) {
            return;
        }
        const draft: ArtifactUpgradeDraft = { heroes: new Map(), dummies: new Map(), instances: new Set() };
        this.openPicker({
            title: "圣器升星",
            empty: "当前圣器没有后续配方",
            choices: () => draft.target ? this.materialChoices(data.hero, draft) :
                origin.upgradeTargets.map(target => this.itemChoice(target, "target:" + target, "选择")),
            choose: key => this.chooseUpgrade(current, draft, key),
        });
    }

    /** 逐行列出原配方需求，并排除已经被其他行选中的英雄。 */
    private materialChoices(hero: OwnedHero, draft: ArtifactUpgradeDraft): readonly HeroGrowthChoice[] {
        const target = draft.target!;
        const state = HeroRosterModel.instance.snapshot;
        const rows: HeroGrowthChoice[] = [{
            ...this.itemChoice(target.templateId, "submit", "升星"),
            caption: HeroArtifactUtils.costText(target.upgradeCosts),
        }, {
            key: "return", title: "重新选择升星目标", caption: "", icon: null, action: "返回",
        }];
        for (const cost of target.upgradeCosts) {
            if (HeroArtifactUtils.definition(cost.itemId)) {
                rows.push(...state.artifacts!.items.filter(item => !item.heroId && item.templateId === cost.itemId)
                    .map(item => this.itemChoice(item.templateId, "instance:" + item.instanceId,
                        draft.instances.has(item.instanceId) ? "取消" : "选择")));
            }
        }
        target.heroMaterials.forEach((rule, row) => {
            const selected = draft.heroes.get(row);
            const reserved = new Set([...draft.heroes].filter(([index]) => row !== index)
                .reduce<string[]>((ids, entry) => ids.concat([...entry[1]]), []));
            const count = (selected?.size ?? 0) + (draft.dummies.get(row) ?? 0);
            if (rule.replacementItemId) {
                const face = BagItemCatalog.face(rule.replacementItemId, 1);
                rows.push({
                    key: "dummy:" + row, title: face.title,
                    caption: `已选 ${draft.dummies.get(row) ?? 0} / 需求 ${rule.count}`,
                    icon: face.icon, action: "增选",
                });
            }
            for (const candidate of HeroArtifactUtils.candidates(hero, rule, state.heroes)) {
                const face = HeroCatalog.find(candidate.templateId);
                if (!reserved.has(candidate.id) && face) {
                    rows.push({
                        key: `hero:${row}:${candidate.id}`, title: face.name,
                        caption: `${rule.star} 星素材　${count}/${rule.count}`, icon: face.icon,
                        action: selected?.has(candidate.id) ? "取消" : "选择",
                    });
                }
            }
        });
        return rows;
    }

    /** 更新本窗草稿；只有点升星且材料齐全才打开资产确认。 */
    private chooseUpgrade(current: HeroArtifactItem, draft: ArtifactUpgradeDraft, key: string): boolean {
        const [kind, value, id] = key.split(":");
        if (kind === "target" || kind === "return") {
            draft.target = kind === "target" ? HeroArtifactUtils.definition(Number(value)) : undefined;
            draft.heroes.clear();
            draft.dummies.clear();
            draft.instances.clear();
        } else if (kind === "instance") {
            if (!draft.instances.delete(value)) {
                draft.instances.add(value);
            }
        } else if (kind === "dummy" || kind === "hero") {
            this.selectHeroMaterial(draft, Number(value), kind === "hero" ? id : undefined);
        } else if (kind === "submit") {
            return this.submitUpgrade(current, draft);
        }
        return false;
    }

    /** 按配方行份数限制选择；再次点满额傀儡恢复为零。 */
    private selectHeroMaterial(draft: ArtifactUpgradeDraft, index: number, heroId?: string): void {
        const rule = draft.target!.heroMaterials[index];
        const picked = draft.heroes.get(index) ?? new Set<string>();
        const dummies = draft.dummies.get(index) ?? 0;
        if (heroId) {
            if (!picked.delete(heroId) && picked.size + dummies < rule.count) {
                picked.add(heroId);
            }
            draft.heroes.set(index, picked);
        } else {
            const reserved = [...draft.dummies].filter(([row]) => row !== index
                && draft.target!.heroMaterials[row].replacementItemId === rule.replacementItemId)
                .reduce((count, entry) => count + entry[1], 0);
            const balance = HeroArtifactController.instance.balance(rule.replacementItemId) - reserved;
            if (balance > dummies && picked.size + dummies < rule.count) {
                draft.dummies.set(index, dummies + 1);
            } else {
                draft.dummies.set(index, 0);
            }
        }
    }

    /** 复核草稿完整性并在确认后提交实际选择，服务端仍验证实时库存和资格。 */
    private submitUpgrade(current: HeroArtifactItem, draft: ArtifactUpgradeDraft): boolean {
        const target = draft.target!;
        const controller = HeroArtifactController.instance;
        const state = HeroRosterModel.instance.snapshot.artifacts!;
        const covered = target.upgradeCosts.every(cost => HeroArtifactUtils.definition(cost.itemId)
            ? state.items.filter(row => row.templateId === cost.itemId && draft.instances.has(row.instanceId)).length === cost.quantity
            : controller.balance(cost.itemId) >= cost.quantity);
        const materials = target.heroMaterials.every((rule, index) =>
            (draft.heroes.get(index)?.size ?? 0) + (draft.dummies.get(index) ?? 0) === rule.count);
        if (!covered || !materials) {
            UIManager.instance.toast("圣器升星材料不足");
            return false;
        }
        const materialHeroIds = [...draft.heroes.values()].reduce<string[]>((ids, row) => ids.concat([...row]), []);
        const replacementItemIds = target.heroMaterials.reduce<number[]>((ids, row, index) => {
            const count = draft.dummies.get(index) ?? 0;
            return ids.concat(Array<number>(count).fill(row.replacementItemId));
        }, []);
        const targetName = BagItemCatalog.face(target.templateId, 1).title;
        this.confirm("圣器升星", `确认消耗已选素材，将圣器升为${targetName}？`, () => this.change({
            action: "UPGRADE", instanceId: current.instanceId, targetTemplateId: target.templateId,
            materialInstanceIds: [...draft.instances], materialHeroIds, replacementItemIds,
        }));
        return true;
    }

    /** 完美转换只展示当前配置对应目标与费用，确认后使用原佩戴实例。 */
    private transform(): void {
        const current = this.selection()?.item;
        const definition = current && HeroArtifactUtils.definition(current.templateId);
        if (!current || !definition?.transformTarget) {
            return;
        }
        const target = BagItemCatalog.face(definition.transformTarget, 1).title;
        this.confirm("圣器转换", `消耗 ${HeroArtifactUtils.costText(definition.transformCosts)}，将圣器转换为${target}？`,
            () => this.change({ action: "TRANSFORM", instanceId: current.instanceId, targetTemplateId: definition.transformTarget }));
    }

    /** 复用同一物品图标与名称生成选择条目。 */
    private itemChoice(templateId: number, key: string, action: string): HeroGrowthChoice {
        const face = BagItemCatalog.face(templateId, 1);
        const definition = HeroArtifactUtils.definition(templateId);
        const quality = GameConfig.instance.getConfig(GConfig.Item, templateId)?.rare_mark;
        return {
            key, title: face.title, caption: definition ? `评分 ${definition.score}` : "",
            icon: face.icon, quality, action,
        };
    }

    /** 添加当前英雄槽位标识并交给应用唯一的协议入口。 */
    private change(request: Omit<HeroArtifactRequest, "heroId" | "slot">): void {
        const args = this.args;
        if (args) {
            HeroArtifactController.instance.change({ ...request, heroId: args.heroId, slot: args.slot });
        }
    }

    /** 资产操作确认用通用弹窗，取消只返回当前圣器。 */
    private confirm(title: string, message: string, onConfirm: () => void): void {
        void UIManager.instance.openChild(this, ConfirmView, { title, message, onConfirm }).catch(() => {
            /* 统一窗口入口会反馈加载失败。 */
        });
    }

    /** 圣器、目标和素材使用已有虚拟滚动窗口。 */
    private openPicker(args: Parameters<HeroGrowthPickerView["onOpen"]>[0]): void {
        void UIManager.instance.openChild(this, HeroGrowthPickerView, args).catch(() => {
            /* 统一窗口入口会反馈加载失败。 */
        });
    }

    /** 只显示当前状态能使用的操作，在发送期间按控制器等待状态禁用。 */
    private updateButton(button: Button, visible: boolean): void {
        button.node.active = visible;
        button.interactable = visible && !HeroArtifactController.instance.busy;
    }

    /** 监听归窗口生命周期，销毁后不保留按钮引用。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback, this);
            }
        });
    }
}
