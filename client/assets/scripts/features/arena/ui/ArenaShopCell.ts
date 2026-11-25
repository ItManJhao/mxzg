/** 竞技商店货位复用背包道具格，展示原兑换币报价与当周限购。 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { MarketOffer } from "../../market/MarketModel";

const { ccclass, property } = _decorator;

@ccclass("ArenaShopCell")
export class ArenaShopCell extends Component {
    /** 原商店商品的道具格。 */
    @property(Node) private _itemNode: Node | null = null;
    /** 道具的策划名称。 */
    @property(Label) private _title: Label | null = null;
    /** 每份需要的竞技币。 */
    @property(Label) private _price: Label | null = null;
    /** 当期已购与上限。 */
    @property(Label) private _limit: Label | null = null;
    /** 进入数量确认窗的本格按钮。 */
    @property(Button) private _purchase: Button | null = null;
    /** 当期限购用完后显示的原标识。 */
    @property(Sprite) private _soldOut: Sprite | null = null;
    /** 当前复用行的商品说明动作。 */
    private describe: (() => void) | null = null;
    /** 当前复用行的确认购买动作。 */
    private buy: (() => void) | null = null;

    /** 每个货位仅绑定一次按钮，列表滚动时替换动作。 */
    protected onLoad(): void {
        this._itemNode?.getComponent(BagItemView)?.button?.node.on(Button.EventType.CLICK, this.openDescription, this);
        this._purchase?.node.on(Button.EventType.CLICK, this.openPurchase, this);
    }

    /** 根据本期货位和正在提交的状态显示物品及价格。 */
    public render(offer: MarketOffer, busy: boolean, describe: () => void, buy: () => void): void {
        const item = this._itemNode?.getComponent(BagItemView);
        if (!item || !this._title || !this._price || !this._limit || !this._purchase || !this._soldOut) {
            throw new Error("ArenaShopCell.prefab 缺少商品绑定");
        }
        this.describe = describe;
        this.buy = buy;
        const face = BagItemCatalog.face(offer.itemId, offer.quantity);
        item.show(offer, false, face, true);
        this._title.string = face.title;
        this._price.string = String(offer.costQuantity);
        this._limit.string = offer.purchaseLimit ? `每周限购 ${offer.purchased}/${offer.purchaseLimit}` : "不限购";
        const sold = offer.purchaseLimit > 0 && offer.purchased >= offer.purchaseLimit;
        this._soldOut.node.active = sold;
        this._purchase.interactable = !busy && !sold;
    }

    /** 描述动作交当前商店窗口。 */
    private openDescription(): void {
        this.describe?.();
    }

    /** 购买意图交当前商店窗口。 */
    private openPurchase(): void {
        this.buy?.();
    }
}
