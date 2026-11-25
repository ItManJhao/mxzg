/** 公会商店的复用货位。道具展示走背包通用格，查看和购买都交给所属窗口。 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { GuildShopProduct } from "../GuildModel";

const { ccclass, property } = _decorator;

@ccclass("GuildShopCell")
export class GuildShopCell extends Component {
    /** 预制体内的通用物品格，复用碎片角标、亮星和数量。 */
    @property(Node) private _itemNode: Node | null = null;
    /** 显示商品配置名称。 */
    @property(Label) private _title: Label | null = null;
    /** 既定公会币单次价格，始终按服务端报价显示。 */
    @property(Label) private _price: Label | null = null;
    /** 商品本周已兑份数和上限，缺少发奖领域时显示暂未开放。 */
    @property(Label) private _limit: Label | null = null;
    /** 价台按钮只打开购买数量选择。 */
    @property(Button) private _purchase: Button | null = null;
    /** 已达到周上限时使用原售罄图。 */
    @property(Sprite) private _soldOut: Sprite | null = null;
    /** 当前内嵌物品格。加载完成后可用，销毁时清理。 */
    private item: BagItemView | null = null;
    /** 由所属窗口在实际虚拟行绑定时更新。 */
    private describe: (() => void) | null = null;
    /** 本次挂载行允许提交的购买操作，复用时替换。 */
    private buy: (() => void) | null = null;

    /** 校验两个静态按钮，只在格生命周期内注册一次。 */
    protected onLoad(): void {
        this.item = this._itemNode?.getComponent(BagItemView) ?? null;
        if (!this.item?.button || !this._title || !this._price || !this._limit || !this._purchase || !this._soldOut) {
            throw new Error("GuildShopCell.prefab 缺少商品显示绑定");
        }
        this.item.button.node.on(Button.EventType.CLICK, this.openDescription, this);
        this._purchase.node.on(Button.EventType.CLICK, this.openPurchase, this);
    }

    /** 用当前真实报价更新复用格，价格、数量、周限和独立说明各用实际绑定。 */
    public render(product: GuildShopProduct, busy: boolean, describe: () => void, buy: () => void): void {
        this.describe = describe;
        this.buy = buy;
        const face = BagItemCatalog.face(product.itemId, product.quantity);
        const stars = GameConfig.instance.getConfig(GConfig.EquipmentType, product.itemId)?.star ?? 0;
        const item = this.item ?? this._itemNode?.getComponent(BagItemView);
        if (!item) {
            throw new Error("GuildShopCell.prefab 缺少内嵌物品格");
        }
        item.show(product, false, face, true, false, false, stars);
        this._title!.string = face.title;
        this._price!.string = String(product.cost);
        this._limit!.string = product.purchasable ? `每周限购 ${product.purchased}/${product.limit}` : "暂未开放";
        const soldOut = product.purchased >= product.limit;
        this._soldOut!.node.active = soldOut;
        this._purchase!.interactable = !busy && !soldOut && product.purchasable;
    }

    /** 打开通用道具只读详情，保持本格没有真实库存写入。 */
    private openDescription(): void {
        this.describe?.();
    }

    /** 复用格只把购买意图交给所属窗口。 */
    private openPurchase(): void {
        this.buy?.();
    }

    /** 解除仍存活节点的监听，释放上次挂载行的操作。 */
    protected onDestroy(): void {
        const item = this.item?.button?.node;
        const purchase = this._purchase?.node;
        if (item?.isValid) {
            item.targetOff(this);
        }
        if (purchase?.isValid) {
            purchase.targetOff(this);
        }
        this.item = null;
        this.describe = null;
        this.buy = null;
    }
}
