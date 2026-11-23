/** 商店通用货架格。绘制服务器报价，商品说明与购买按钮各自交回所属页面。 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { MarketOffer } from "../MarketModel";

const { ccclass, property } = _decorator;

@ccclass("MarketItemCell")
export class MarketItemCell extends Component {
    /** 本格商品图片。 */
    @property(Sprite) private _itemIcon: Sprite | null = null;
    /** 物品配置里的品质底框。 */
    @property(Sprite) private _qualityFrame: Sprite | null = null;
    /** 每次购买发放的件数。 */
    @property(Label) private _quantityLabel: Label | null = null;
    /** 价格对应的货币图片。 */
    @property(Sprite) private _currencyIcon: Sprite | null = null;
    /** 直接显示服务器单次价格。 */
    @property(Label) private _priceLabel: Label | null = null;
    /** 配置折扣标签，无折扣时隐藏。 */
    @property(Label) private _discountLabel: Label | null = null;
    /** 已达限购时覆盖货架格。 */
    @property(Node) private _soldOut: Node | null = null;
    /** 商品图标事件，仅打开物品说明。 */
    @property(Button) private _itemButton: Button | null = null;
    /** 价台事件，仅打开当前商品的购买窗口。 */
    @property(Button) private _buyButton: Button | null = null;
    /** 神装商店等需要标题的格子绑定商品名称，普通市场沿用仅图标样式。 */
    @property(Label) private _nameLabel: Label | null = null;
    /** 需要显示每日限购进度的货架绑定此标签，不限购商品留空。 */
    @property(Label) private _limitLabel: Label | null = null;
    /** 当前复用格的说明操作，换绑时更新。 */
    private describe: (() => void) | null = null;
    /** 当前复用格的购买操作，换绑时更新。 */
    private buy: (() => void) | null = null;

    /** 对两个静态按钮各登记一次，复用格不创建额外监听。 */
    protected onLoad(): void {
        this._itemButton!.node.on(Button.EventType.CLICK, this.openDescription, this);
        this._buyButton!.node.on(Button.EventType.CLICK, this.openBuy, this);
    }

    /** 按配置名单绘制图片、折扣与售罄外观，并更新交互映射。 */
    public render(offer: MarketOffer, busy: boolean, describe: () => void, buy: () => void): void {
        this.describe = describe;
        this.buy = buy;
        const face = BagItemCatalog.face(offer.itemId, offer.quantity);
        ResManager.setSprite(this._itemIcon!.node, [face.icon, face.fallback]);
        ResManager.setSprite(this._qualityFrame!.node, face.frame);
        ResManager.setSprite(this._currencyIcon!.node, ResManager.item(offer.costItemId));
        this._quantityLabel!.string = String(offer.quantity);
        this._priceLabel!.string = UiKitUtils.formatAmount(offer.costQuantity);
        if (this._nameLabel) {
            this._nameLabel.string = face.title;
        }
        if (this._limitLabel) {
            this._limitLabel.string = offer.purchaseLimit > 0 ? `购买 ${offer.purchased}/${offer.purchaseLimit}` : "";
        }
        this._discountLabel!.node.parent!.active = offer.discount > 0 && offer.discount < 100;
        this._discountLabel!.string = `${offer.discount / 10}折`;
        const soldOut = offer.purchaseLimit > 0 && offer.purchased >= offer.purchaseLimit;
        this._soldOut!.active = soldOut;
        this._itemIcon!.grayscale = soldOut;
        this._qualityFrame!.grayscale = soldOut;
        this._buyButton!.interactable = !busy && !soldOut;
    }

    /** 将商品说明交给页面，由页面管理子窗口生命周期。 */
    private openDescription(): void {
        this.describe?.();
    }

    /** 将价台点击交给页面，格子本身不发送购买。 */
    private openBuy(): void {
        this.buy?.();
    }
}
