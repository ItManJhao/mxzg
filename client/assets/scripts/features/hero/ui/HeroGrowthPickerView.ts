/**
 * 英雄培养共用的选择窗，用于素材、宝石和神装。
 * 固定行与虚拟列表由 Prefab 提供，每次刷新由调用方投影当前名册、库存和已选草稿。
 */
import { _decorator, Button, Label, Node, UITransform, Widget } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagEvent } from "../../bag/utils/BagEvent";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";

/** 列表只绘制传入的当前状态。key 保留精确英雄或神装实例字符串。 */
export interface HeroGrowthChoice {
    readonly key: string;
    readonly title: string;
    readonly caption: string;
    readonly details?: string;
    readonly icon: string | null;
    readonly quality?: number;
    readonly action: string;
}

/** 业务操作仍交给拥有此次选择的英雄详情子面板。 */
interface PickerArgs {
    readonly title: string;
    readonly empty: string;
    readonly choices: () => readonly HeroGrowthChoice[];
    readonly current?: () => HeroGrowthChoice | undefined;
    /** 返回 true 时关闭，其余情况刷新草稿并保留列表位置。 */
    readonly choose: (key: string) => boolean;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-growth-picker",
    prefab: "bundles/module/hero/prefabs/HeroGrowthPickerView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroGrowthPickerView")
export class HeroGrowthPickerView extends BaseView<PickerArgs> {
    /** 缩放后的对话框尺寸由预制体宽高决定。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 当前素材行或装备部位标题。 */
    @property(Label) titleLabel: Label | null = null;
    /** 返回英雄详情的按钮。 */
    @property(Button) closeButton: Button | null = null;
    /** 可选英雄或资产复用同一虚拟行。 */
    @property(SuperScroll) list: SuperScroll | null = null;
    /** 镶嵌或穿戴已占槽时显示原资产和卸下操作。 */
    @property(Node) equippedRow: Node | null = null;
    /** 没有可选对象时显示对应玩法的提示。 */
    @property(Label) emptyLabel: Label | null = null;

    /** 绑定预制体及资产监听，关窗随 BaseView 释放。 */
    public onOpen(args: PickerArgs): void {
        if (!this.panel || !this.titleLabel || !this.closeButton || !this.list || !this.equippedRow || !this.emptyLabel) {
            throw new Error("培养选择窗预制体绑定缺失");
        }
        this.titleLabel.string = args.title;
        const list = this.list.list.node;
        const close = this.closeButton.node;
        const remove = this.equippedRow.getChildByName("ActionButton")!;
        list.on(SuperContent.RENDER_ITEM, this.paint, this);
        list.on(SuperContent.SELECT_ITEM, this.onChoice, this);
        close.on(Button.EventType.CLICK, this.close, this);
        remove.on(Button.EventType.CLICK, this.onCurrent, this);
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        this.ownListener(() => {
            if (list.isValid) {
                list.off(SuperContent.RENDER_ITEM, this.paint, this);
                list.off(SuperContent.SELECT_ITEM, this.onChoice, this);
            }
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
            if (remove.isValid) {
                remove.off(Button.EventType.CLICK, this.onCurrent, this);
            }
            EventDispatcher.instance.offTarget(this);
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        this.refresh();
        this.list.toStart();
    }

    /** 按当前名册和库存刷新窗口，固定行和虚拟列表不会相叠。 */
    private refresh(): void {
        const args = this.args;
        if (!args) {
            return;
        }
        const current = args.current?.();
        this.equippedRow!.active = current !== undefined;
        if (current) {
            this.paint(this.equippedRow!, current);
        }
        const viewInset = this.list!.node.getComponent(Widget);
        if (viewInset) {
            viewInset.top = current ? 164 : 12;
            viewInset.updateAlignment();
            this.list!.content?.parent?.getComponent(Widget)?.updateAlignment();
        }
        const choices = args.choices();
        this.list!.list.setData(choices);
        this.emptyLabel!.node.active = choices.length === 0;
        this.emptyLabel!.string = args.empty;
    }

    /** 读取同一行模板的图标、说明和操作按钮，不创建额外布局。 */
    private paint(node: Node, choice: HeroGrowthChoice): void {
        node.getChildByName("Name")!.getComponent(Label)!.string = choice.title;
        node.getChildByName("Score")!.getComponent(Label)!.string = choice.caption;
        node.getChildByName("Attributes")!.getComponent(Label)!.string = choice.details ?? "";
        node.getChildByName("Stars")!.getComponent(Label)!.string = "";
        node.getChildByName("ActionButton")!.getChildByName("Label")!.getComponent(Label)!.string = choice.action;
        ResManager.setSprite(node.getChildByName("Icon"), choice.icon);
        ResManager.setSprite(node.getChildByName("Frame"), ResManager.qualityFrame(choice.quality ?? 0));
    }

    /** 候选行点击只交回真实实例或配置键。 */
    private onChoice(choice: HeroGrowthChoice): void {
        if (this.args?.choose(choice.key)) {
            this.close();
        } else {
            this.refresh();
        }
    }

    /** 已占槽行用最新快照上的实例键处理卸下。 */
    private onCurrent(): void {
        const current = this.args?.current?.();
        if (current) {
            this.onChoice(current);
        }
    }

    /** 窄屏缩放沿用普通装备选择窗的可见区比例。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.94 / panel.width, box.height * 0.90 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
