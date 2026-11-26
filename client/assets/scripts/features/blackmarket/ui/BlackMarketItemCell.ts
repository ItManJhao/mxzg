/**
 * 黑市商品格。共用背包展示道具数量、品质、星级和碎片标记，单次报价与限购由外部传入。
 * 详情及购买点击委托给所属页面，列表复用时只更新当前行绑定。
 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { BlackMarketOffer } from "../data/BlackMarketData";

const { ccclass, property } = _decorator;

@ccclass("BlackMarketItemCell")
export class BlackMarketItemCell extends Component {
    /** 预制体嵌套的通用物品格，用同一配置展示物品和星级。 */
    @property(Node) private _itemNode: Node | null = null;
    /** 道具摊位以外的货架使用暖色底图，复用时重新设置可见性。 */
    @property(Node) private _warmCard: Node | null = null;
    /** 每份商品的配置名称。 */
    @property(Label) private _title: Label | null = null;
    /** 价格使用的服务端配置货币，随行重新绑定图标。 */
    @property(Sprite) private _currency: Sprite | null = null;
    /** 服务端每份报价，显示完整数值。 */
    @property(Label) private _price: Label | null = null;
    /** 当前周期已购和上限，无限量商品隐藏文案。 */
    @property(Label) private _limit: Label | null = null;
    /** 价签按钮只打开购买确认窗。 */
    @property(Button) private _purchase: Button | null = null;
    /** 原优惠背景，只有折扣报价才显示。 */
    @property(Node) private _promotion: Node | null = null;
    /** 已耗尽本周期可购次数时显示售罄图。 */
    @property(Node) private _soldOut: Node | null = null;
    /** 注册物品说明点击的节点，子节点先销毁时只检查存活状态。 */
    private itemButtonNode: Node | null = null;
    /** 注册价签点击的节点，销毁时解除监听并释放引用。 */
    private priceButtonNode: Node | null = null;
    /** 由所属页面在挂载当前行时绑定并在销毁时清理。 */
    private describe: (() => void) | null = null;
    /** 当前商品的购买入口，复用格时覆盖。 */
    private buy: (() => void) | null = null;

    /** 校验静态绑定，注册物品说明及价签两个互相独立的点击区。 */
    protected onLoad(): void {
        const item = this._itemNode?.getComponent(BagItemView);
        if (!item?.button || !this._warmCard || !this._title || !this._currency || !this._price
                || !this._limit || !this._purchase || !this._promotion || !this._soldOut) {
            throw new Error("BlackMarketItemCell.prefab 缺少商品显示绑定");
        }
        this.itemButtonNode = item.button.node;
        this.priceButtonNode = this._purchase.node;
        this.itemButtonNode.on(Button.EventType.CLICK, this.openDescription, this);
        this.priceButtonNode.on(Button.EventType.CLICK, this.openPurchase, this);
    }

    /**
     * 绑定实际报价和可售状态。限购前缀已由页面按货架周期决定。
     * @param warmCard true 使用非摊位货架的暖色卡底。
     * @param busy true 表示后台查询或结算期间停用价签。
     */
    public render(offer: BlackMarketOffer, period: string, warmCard: boolean, busy: boolean,
        describe: () => void, buy: () => void): void {
        const item = this._itemNode?.getComponent(BagItemView);
        if (!item) {
            throw new Error("BlackMarketItemCell.prefab 缺少内嵌物品格");
        }
        this.describe = describe;
        this.buy = buy;
        const face = BagItemCatalog.face(offer.itemId, offer.quantity);
        const stars = GameConfig.instance.getConfig(GConfig.EquipmentType, offer.itemId)?.star ?? 0;
        const soldOut = offer.purchaseLimit > 0 && offer.purchased >= offer.purchaseLimit;
        item.show(offer, false, face, true, false, false, stars);
        for (const target of [item.frame, item.icon, item.shardIcon]) {
            const sprite = target?.getComponent(Sprite);
            if (sprite) {
                sprite.grayscale = soldOut;
            }
        }
        this._warmCard!.active = warmCard;
        this._title!.string = face.title;
        this._price!.string = String(offer.costQuantity);
        this._limit!.string = offer.purchaseLimit ? `${period}限购 ${offer.purchased}/${offer.purchaseLimit}` : "";
        this._promotion!.active = offer.discount > 0 && offer.discount < 100;
        this._soldOut!.active = soldOut;
        this._purchase!.interactable = !busy && offer.purchasable && !soldOut;
        ResManager.setSprite(this._currency!.node, ResManager.item(offer.costItemId));
    }

    /** 物品图标只打开配置说明。 */
    private openDescription(): void {
        this.describe?.();
    }

    /** 点击可用价签时将本行确认意图交给窗口。 */
    private openPurchase(): void {
        this.buy?.();
    }

    /** 子节点可能先于格子销毁，解除仍存活节点的监听并释放行引用。 */
    protected onDestroy(): void {
        if (this.itemButtonNode?.isValid) {
            this.itemButtonNode.off(Button.EventType.CLICK, this.openDescription, this);
        }
        if (this.priceButtonNode?.isValid) {
            this.priceButtonNode.off(Button.EventType.CLICK, this.openPurchase, this);
        }
        this.itemButtonNode = null;
        this.priceButtonNode = null;
        this.describe = null;
        this.buy = null;
    }
}
