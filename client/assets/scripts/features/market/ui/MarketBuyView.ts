/** 普通市场购买确认窗。显示原报价与所选次数，确认后只将购买意图交给 MarketController。 */
import { _decorator, Button, Label, Slider, Sprite, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagEvent } from "../../bag/utils/BagEvent";
import { MarketController } from "../MarketController";
import { MarketModel, type MarketOffer } from "../MarketModel";

/** 玩家打开价格确认窗时看到的报价，确认必须使用同一货架版本。 */
interface MarketBuyArgs {
    readonly offer: MarketOffer;
    readonly shelfVersion: number;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "market-buy",
    prefab: "bundles/module/market/prefabs/MarketBuyView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("MarketBuyView")
export class MarketBuyView extends BaseView<MarketBuyArgs> {
    /** 购买窗口固定构图，随视口等比缩放。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 商品配置图标。 */
    @property(Sprite) private _icon: Sprite | null = null;
    /** 商品品质底图。 */
    @property(Sprite) private _frame: Sprite | null = null;
    /** 本次确认的商品名称。 */
    @property(Label) private _nameLabel: Label | null = null;
    /** 玩家已选择的购买次数，初始为一。 */
    @property(Label) private _quantityLabel: Label | null = null;
    /** 单次报价使用的货币图标。 */
    @property(Sprite) private _unitCostIcon: Sprite | null = null;
    /** 服务端单次报价。 */
    @property(Label) private _unitCostLabel: Label | null = null;
    /** 总消耗使用的货币图标。 */
    @property(Sprite) private _costIcon: Sprite | null = null;
    /** 次数乘以单次价格的展示结果，真实扣费由服务端完成。 */
    @property(Label) private _costLabel: Label | null = null;
    /** 当前货架已购和限购次数。 */
    @property(Label) private _limitLabel: Label | null = null;
    /** 在一次到可买上限之间选择次数。 */
    @property(Slider) private _slider: Slider | null = null;
    /** 选择比例对应的填充条。 */
    @property(Sprite) private _sliderFill: Sprite | null = null;
    /** 购买次数减一。 */
    @property(Button) private _minusButton: Button | null = null;
    /** 购买次数加一。 */
    @property(Button) private _plusButton: Button | null = null;
    /** 将选择设为当前可买上限。 */
    @property(Button) private _maxButton: Button | null = null;
    /** 确认当前选择并关窗。 */
    @property(Button) private _confirmButton: Button | null = null;
    /** 取消还未发送的买入选择。 */
    @property(Button) private _cancelButton: Button | null = null;
    /** 右上关闭按钮，与取消等价。 */
    @property(Button) private _closeButton: Button | null = null;
    /** 当前未确认的购买次数，打开后初始为一。 */
    private quantity = 1;
    /** 当前同步余额和货架共同允许的购买上限，重绘时更新。 */
    private maximum = 0;

    /** 装入本次报价；绑定窗口交互以及余额和货架变化。 */
    public onOpen(args?: MarketBuyArgs): void {
        if (!args) {
            throw new Error("市场确认窗口缺少商品报价");
        }
        this.args = args;
        this.quantity = 1;
        const face = BagItemCatalog.face(args.offer.itemId, args.offer.quantity);
        this._nameLabel!.string = `${face.title} ×${args.offer.quantity}`;
        this._unitCostLabel!.string = UiKitUtils.formatAmount(args.offer.costQuantity);
        const currency = ResManager.item(args.offer.costItemId);
        ResManager.setSprite(this._icon!.node, [face.icon, face.fallback]);
        ResManager.setSprite(this._frame!.node, face.frame);
        ResManager.setSprite(this._unitCostIcon!.node, currency);
        ResManager.setSprite(this._costIcon!.node, currency);
        this.listen(this._closeButton!, () => this.close());
        this.listen(this._cancelButton!, () => this.close());
        this.listen(this._minusButton!, () => this.select(this.quantity - 1));
        this.listen(this._plusButton!, () => this.select(this.quantity + 1));
        this.listen(this._maxButton!, () => this.select(this.maximum));
        this.listen(this._confirmButton!, this.confirm);
        const slider = this._slider!.node;
        slider.on("slide", this.slide, this);
        this.ownListener(() => {
            if (slider.isValid) {
                slider.off("slide", this.slide, this);
            }
        });
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.render));
        this.ownListener(EventDispatcher.instance.on("market.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        this.render();
    }

    /** 按窗口作用域监听静态按钮，关窗时统一解除。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 保留预制体布局，极窄屏幕只缩放整个面板。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width * 0.95 / panel.width, box.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 滑杆按旧版取整，统一经过次数范围限制。 */
    private slide(slider: Slider): void {
        this.select(1 + Math.floor(slider.progress * (this.maximum - 1)));
    }

    /** 更新未提交次数，重新显示总价和滑杆。 */
    private select(quantity: number): void {
        this.quantity = quantity;
        this.render();
    }

    /** 使用最新货架及余额限制选择；刷新了货架则关闭失效的确认窗。 */
    private render(): void {
        const { shelfVersion, offer } = this.args!;
        const state = MarketModel.instance.snapshot;
        const current = state?.offers.find(row => row.productId === offer.productId);
        if (state?.shelfVersion !== shelfVersion || !current) {
            this.close();
            return;
        }
        this.maximum = Math.max(0, MarketController.instance.maximum(current));
        this.quantity = this.maximum ? Math.min(this.maximum, Math.max(1, this.quantity)) : 0;
        const fraction = this.maximum > 1 ? (this.quantity - 1) / (this.maximum - 1) : this.maximum;
        this._slider!.progress = fraction;
        this._slider!.enabled = this.maximum > 1;
        this._sliderFill!.fillRange = fraction;
        this._quantityLabel!.string = String(this.quantity);
        this._costLabel!.string = UiKitUtils.formatAmount(this.quantity * current.costQuantity);
        this._limitLabel!.string = current.purchaseLimit ? `已购 ${current.purchased}/${current.purchaseLimit}` : "";
        this._minusButton!.interactable = this.quantity > 1;
        this._plusButton!.interactable = this.quantity < this.maximum;
        this._maxButton!.interactable = this.quantity < this.maximum;
        this._confirmButton!.interactable = this.quantity > 0 && !MarketController.instance.busy;
    }

    /** 关窗后提交一次当前报价，购买结果由统一服务器通知更新。 */
    private confirm(): void {
        const { offer, shelfVersion } = this.args!;
        const quantity = this.quantity;
        this.close();
        MarketController.instance.buy(shelfVersion, offer.productId, quantity);
    }
}
