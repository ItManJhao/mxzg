/**
 * 试炼商店三列滚动货位，复用背包图标和碎片展示。
 * 价格及限购读本次真实报价，复用时替换查看与购买回调，销毁时解除绑定。
 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { MarketOffer } from "../../market/MarketModel";

const { ccclass, property } = _decorator;

@ccclass("TrialShopCell")
export class TrialShopCell extends Component {
    /** 预制体内嵌的通用道具格，负责展示碎片角标、品质和件数。 */
    @property(Node) private _itemNode: Node | null = null;
    /** 策划物品名称，从物品本地化配置读取。 */
    @property(Label) private _title: Label | null = null;
    /** 每份商品的服务端价格，单位为试炼之血。 */
    @property(Label) private _price: Label | null = null;
    /** 仅限购商品显示当前周的已购次数与总数。 */
    @property(Label) private _limit: Label | null = null;
    /** 点击价格后进入公共购买份数窗。 */
    @property(Button) private _purchase: Button | null = null;
    /** 原限购达到上限时显示售罄标识。 */
    @property(Sprite) private _soldOut: Sprite | null = null;
    /** 初始化后缓存当前道具格，直到节点销毁。 */
    private item: BagItemView | null = null;
    /** 当前虚拟货位对应的只读详情，复用后失效。 */
    private describe: (() => void) | null = null;
    /** 当前虚拟货位的购买意图，复用时替换。 */
    private buy: (() => void) | null = null;

    /** 检查全部预制体绑定，静态按钮在货位存活期间只监听一次。 */
    protected onLoad(): void {
        this.item = this._itemNode?.getComponent(BagItemView) ?? null;
        if (!this.item?.button || !this._title || !this._price || !this._limit || !this._purchase || !this._soldOut) {
            throw new Error("TrialShopCell.prefab 缺少兑换货位绑定");
        }
        this.item.button.node.on(Button.EventType.CLICK, this.openDescription, this);
        this._purchase.node.on(Button.EventType.CLICK, this.openPurchase, this);
    }

    /** 绑定实际商品及份数；虚拟列表在首次激活前已调用绑定，因此直接解析内嵌物品格。 */
    public render(offer: MarketOffer, busy: boolean, describe: () => void, buy: () => void): void {
        this.describe = describe;
        this.buy = buy;
        const face = BagItemCatalog.face(offer.itemId, offer.quantity);
        const item = this.item ?? this._itemNode?.getComponent(BagItemView);
        if (!item) {
            throw new Error("TrialShopCell.prefab 缺少内嵌物品格");
        }
        item.show(offer, false, face, true);
        this._title!.string = face.title;
        this._price!.string = String(offer.costQuantity);
        this._limit!.string = offer.purchaseLimit > 0 ? `每周限购 ${offer.purchased}/${offer.purchaseLimit}` : "";
        const soldOut = offer.purchaseLimit > 0 && offer.purchased >= offer.purchaseLimit;
        this._soldOut!.node.active = soldOut;
        this._purchase!.interactable = !busy && !soldOut;
    }

    /** 交给可见商店读取该道具的说明。 */
    private openDescription(): void {
        this.describe?.();
    }

    /** 交给可见商店校验报价并打开确认。 */
    private openPurchase(): void {
        this.buy?.();
    }

    /** 安全解绑仍存活的节点，清空上次虚拟复用回调。 */
    protected onDestroy(): void {
        const item = this.item;
        const price = this._purchase;
        if (item?.isValid && item.button?.isValid) {
            item.button.node.targetOff(this);
        }
        if (price?.isValid) {
            price.node.targetOff(this);
        }
        this.item = null;
        this.describe = null;
        this.buy = null;
    }
}
