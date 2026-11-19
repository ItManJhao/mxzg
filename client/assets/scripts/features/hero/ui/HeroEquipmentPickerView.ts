/** 英雄装备选择窗，显示当前部位已穿装备及背包中的候选。按钮只交付装备指令，库存由统一快照刷新。 */
import { _decorator, Button, Label, Node, UITransform, Widget } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { EquipmentDetailUtils } from "../../bag/utils/EquipmentDetailUtils";
import { HeroEquipmentController } from "../HeroEquipmentController";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroEquipmentUtils, type WearCandidate } from "../utils/HeroEquipmentUtils";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";

/** 打开时只传当前英雄实例与部位，物品由窗口读取最新 Model。 */
interface PickerArgs {
    readonly heroId: string;
    readonly slot: number;
}

const { ccclass, property } = _decorator;
/** 普通四槽与装备配置部位编号一致。 */
const slotNames = ["武器", "头盔", "铠甲", "鞋子"];

@UIRegistry.view({
    id: "hero-equipment-picker",
    prefab: "bundles/module/hero/prefabs/HeroEquipmentPickerView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroEquipmentPickerView")
export class HeroEquipmentPickerView extends BaseView<PickerArgs> {
    /** 对话框按当前可见尺寸等比缩放的主体。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 当前装备部位标题。 */
    @property(Label) titleLabel: Label | null = null;
    /** 关闭选择窗并返回英雄详情。 */
    @property(Button) closeButton: Button | null = null;
    /** 只显示当前部位库存的虚拟列表。 */
    @property(SuperScroll) list: SuperScroll | null = null;
    /** 已穿装备占固定一行，空槽时隐藏。 */
    @property(Node) equippedRow: Node | null = null;
    /** 没有可选库存时显示的说明。 */
    @property(Label) emptyLabel: Label | null = null;

    /** 监听本窗列表、统一库存和装备命令，关闭后由 BaseView 释放。 */
    public onOpen(args: PickerArgs): void {
        if (!args?.heroId || !slotNames[args.slot - 1] || !this.panel || !this.titleLabel
            || !this.closeButton || !this.list || !this.equippedRow || !this.emptyLabel) {
            throw new Error("装备选择窗缺少参数或预制体绑定");
        }
        this.titleLabel.string = slotNames[args.slot - 1];
        const list = this.list.list.node;
        const remove = this.equippedRow.getChildByName("ActionButton");
        if (!remove?.getComponent(Button)) {
            throw new Error("装备选择窗缺少已穿装备操作");
        }
        list.on(SuperContent.RENDER_ITEM, this.onRender, this);
        list.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.closeButton.node.on(Button.EventType.CLICK, this.close, this);
        remove.on(Button.EventType.CLICK, this.unequip, this);
        this.ownListener(() => {
            if (list.isValid) {
                list.off(SuperContent.RENDER_ITEM, this.onRender, this);
                list.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
            if (remove.isValid) {
                remove.off(Button.EventType.CLICK, this.unequip, this);
            }
            this.closeButton?.node.off(Button.EventType.CLICK, this.close, this);
            EventDispatcher.instance.offTarget(this);
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        EventDispatcher.instance.on("hero-equipment:updated", this, this.onEquipmentChanged);
        this.refresh();
        this.list.toStart();
    }

    /** 重新读取已穿项目与同部位库存，装备行按现有列表布局复用。 */
    private refresh(): void {
        const args = this.args;
        if (!args) {
            return;
        }
        const equipment = HeroRosterModel.instance.snapshot.heroes.find(hero => hero.id === args.heroId)?.equipment;
        if (!equipment) {
            this.close();
            return;
        }
        const worn = equipment.items.find(item => item.slot === args.slot);
        this.equippedRow!.active = !!worn;
        if (worn) {
            this.paintRow(this.equippedRow!, worn.templateId, "卸下");
        }
        const inset = this.list!.node.getComponent(Widget);
        if (inset) {
            inset.top = worn ? 164 : 12;
            inset.updateAlignment();
            this.list!.content?.parent?.getComponent(Widget)?.updateAlignment();
        }
        const items = HeroEquipmentUtils.candidates(BagModel.instance.items, args.slot, worn?.templateId);
        this.list!.list.setData(items);
        this.emptyLabel!.node.active = items.length === 0;
        this.emptyLabel!.string = "背包中没有可穿戴的装备";
    }

    /** 将当前库存格交给同一行模板显示，数量仍由背包持有。 */
    private onRender(node: Node, item: WearCandidate): void {
        this.paintRow(node, item.itemId, "穿戴");
    }

    /** 使用原装备评分、配置属性、品质和星级渲染预制体的固定控件。 */
    private paintRow(node: Node, itemId: number, action: string): void {
        const detail = EquipmentDetailUtils.read(itemId);
        const icon = node.getChildByName("Icon");
        const frame = node.getChildByName("Frame");
        const name = node.getChildByName("Name")?.getComponent(Label);
        const score = node.getChildByName("Score")?.getComponent(Label);
        const attrs = node.getChildByName("Attributes")?.getComponent(Label);
        const buttonNode = node.getChildByName("ActionButton");
        const button = node.getComponent(Button) ?? buttonNode?.getComponent(Button);
        const label = buttonNode?.getChildByName("Label")?.getComponent(Label);
        if (!icon || !frame || !name || !score || !attrs || !button || !label) {
            throw new Error("装备选择行缺少图标、文字或操作绑定");
        }
        const stars = node.getChildByName("Stars")?.getComponent(Label);
        if (stars) {
            stars.string = detail ? (detail.star === 6 ? "◆" : "★".repeat(detail.star)) : "";
        }
        name.string = detail?.name ?? `装备 ${itemId}`;
        score.string = detail ? `评分 ${detail.score}` : "评分未同步";
        attrs.string = detail?.attributes.map(attr => `${attr.name} +${attr.value}`).join("  ") ?? "";
        button.interactable = !!detail && !HeroEquipmentController.instance.busy;
        label.string = action;
        ResManager.setSprite(icon, detail?.icon ?? null);
        ResManager.setSprite(frame, detail ? ResManager.qualityFrame(detail.rarity) : null);
    }

    /** 列表选择仅提交当前库存记录 ID，由服务端做实际穿戴。 */
    private onSelect(item: WearCandidate): void {
        if (this.args) {
            HeroEquipmentController.instance.equip(this.args.heroId, item.instanceId);
        }
    }

    /** 点击当前已穿行上的卸下按钮，读取真实部位并提交。 */
    private unequip(): void {
        const args = this.args;
        if (!args) {
            return;
        }
        const hero = HeroRosterModel.instance.snapshot.heroes.find(row => row.id === args.heroId);
        const item = hero?.equipment?.items.find(row => row.slot === args.slot);
        if (item) {
            HeroEquipmentController.instance.unequip(args.heroId, item);
        }
    }

    /** 本英雄的选装成功后返回详情，等待期间只更新控件状态。 */
    private onEquipmentChanged(receipt?: { heroId: string; changed: boolean }): void {
        if (receipt?.changed && receipt.heroId === this.args?.heroId) {
            this.close();
        } else {
            this.refresh();
        }
    }

    /** 复用共享可见区，保持面板、遮罩和列表按同一比例适配。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.90 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
