/** 铁匠铺一键合成确认窗。展示一次报价中的产物与总金币，玩家确认后把操作交回所属页。 */
import { _decorator, Button, Label, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UILayer } from "../../../framework/ui/UILayer";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { SmithItemCell, type SmithItemFace } from "./SmithItemCell";

/** 本次预览的独立展示与确认，关闭后不保留报价回调。 */
interface SmithComposeArgs {
    readonly rewards: readonly SmithItemFace[];
    readonly goldCost?: number;
    /** 对应来源页校验当前资产版本或宝石方案，然后提交。 */
    readonly confirm: () => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "smith-compose-preview",
    prefab: "bundles/module/smith/prefabs/SmithComposeView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("SmithComposeView")
export class SmithComposeView extends BaseView<SmithComposeArgs> {
    /** 小预览窗的设计宽高用于等比适配手机。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 普通装备预演的实际金币总额，宝石预览时隐藏。 */
    @property(Label) private cost: Label | null = null;
    /** 以原装备和宝石图标展示本次净产物。 */
    @property(SuperScroll) private items: SuperScroll | null = null;
    /** 明确点击才提交的底部蓝色按钮。 */
    @property(Button) private confirmButton: Button | null = null;

    /** 应用报价快照，装备按原预览从高档到低档展示，关闭时释放当前点击监听。 */
    public onOpen(args?: SmithComposeArgs): void {
        if (!args?.rewards.length || !this.panel || !this.cost || !this.items || !this.confirmButton) {
            throw new Error("铁匠铺合成预览缺少报价或预制体绑定");
        }
        super.onOpen(args);
        const equipment = args.goldCost !== undefined;
        const rewards = equipment ? [...args.rewards].sort((left, right) => right.itemId - left.itemId) : args.rewards;
        this.cost.node.active = equipment;
        this.cost.string = equipment ? `消耗金币:${args.goldCost}` : "";
        this.items.list.setData(rewards, (node, item) => node.getComponent(SmithItemCell)!.show(item));
        this.items.toStart();
        const target = this.confirmButton.node;
        target.on(Button.EventType.CLICK, this.confirm, this);
        this.ownListener(() => {
            if (target.isValid) {
                target.off(Button.EventType.CLICK, this.confirm, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel.bind(this)));
    }

    /** 适配窗口可见区，固定面板内部布局仍由预制体控制。 */
    private fitPanel(): void {
        const area = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, area.width * 0.98 / panel.width, area.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 先关闭确认窗，再提交固定报价，连续点击不会触发同一确认。 */
    private confirm(): void {
        const confirm = this.args?.confirm;
        this.close();
        confirm?.();
    }
}
