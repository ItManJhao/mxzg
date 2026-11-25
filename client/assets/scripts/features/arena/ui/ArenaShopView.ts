/** 竞技商店使用周报价和权威背包余额，兑换交给 ArenaController 和原数量确认窗。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { MarketOffer } from "../../market/MarketModel";
import { MarketBuyView } from "../../market/ui/MarketBuyView";
import { ArenaController } from "../ArenaController";
import { ArenaModel, type ArenaShopOffer } from "../ArenaModel";
import { ArenaShopCell } from "./ArenaShopCell";

/** 旧竞技商店的兑换币配置号。 */
const CURRENCY = 900901;
const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "arena-shop",
    prefab: "bundles/module/arena/prefabs/ArenaShopView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ArenaShopView")
export class ArenaShopView extends BaseView {
    /** 静态商店面板。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 原通用三列商店货架。 */
    @property(SuperScroll) private _products: SuperScroll | null = null;
    /** 关闭商店并返回竞技场。 */
    @property(Button) private _close: Button | null = null;
    /** 从统一背包读取竞技积分币。 */
    @property(Label) private _balance: Label | null = null;
    /** 下一次周刷新倒计时。 */
    @property(Label) private _reset: Label | null = null;
    /** 同一期走到零时只触发一次后台读取。 */
    private requestedReset = 0;

    /** 首次打开后绑定货架、余额和期次切换。 */
    public onOpen(): void {
        if (!this._panel || !this._products || !this._close || !this._balance || !this._reset) {
            throw new Error("ArenaShopView.prefab 缺少竞技商店绑定");
        }
        this._products.validateBindings();
        const content = this._products.list.node;
        const close = this._close.node;
        content.on(SuperContent.RENDER_ITEM, this.renderProduct, this);
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
            if (close.isValid) {
                close.targetOff(this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("arena.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.renderBalance));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.requestedReset = 0;
        this.schedule(this.tick, 1);
        ArenaController.instance.openShop();
        this.render();
    }

    /** 取消本窗口计时并释放循环格。 */
    public onClose(): void {
        this.unschedule(this.tick);
        if (this._products?.content?.isValid) {
            this._products.list.clear();
        }
    }

    /** 窄视口按整体面板等比适配，列距保留预制体定义。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height * 0.9 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 使用本周服务端货架渲染价格和限购。 */
    private render(): void {
        this._products!.list.setData(ArenaModel.instance.shop?.offers ?? []);
        this.renderBalance();
        this.tick();
    }

    /** 更新余额，不额外请求库存。 */
    private renderBalance(): void {
        this._balance!.string = String(BagModel.instance.quantity(CURRENCY));
    }

    /** 周刷新使用校准的服务端时钟，未同步时保留占位。 */
    private tick(): void {
        const shop = ArenaModel.instance.shop;
        const now = ServerClock.instance.nowSeconds();
        if (!shop || now === null) {
            this._reset!.string = "周刷新 --:--:--";
            return;
        }
        const left = Math.max(0, shop.refreshAt - now);
        const formatted = [Math.floor(left / 3600), Math.floor(left / 60) % 60, left % 60]
            .map(value => String(value).padStart(2, "0")).join(":");
        this._reset!.string = `周刷新 ${formatted}`;
        if (!left && shop.refreshAt !== this.requestedReset) {
            this.requestedReset = shop.refreshAt;
            ArenaController.instance.openShop();
        }
    }

    /** 各商品绑定原周报价、道具说明和数量窗。 */
    private renderProduct(node: Node, row: ArenaShopOffer): void {
        const shop = ArenaModel.instance.shop;
        const offer = this.toMarketOffer(row);
        if (shop) {
            node.getComponent(ArenaShopCell)?.render(offer, ArenaController.instance.busy, () => {
                void UIManager.instance.openChild(this, BagInfoView, {
                    source: "description", face: BagItemCatalog.face(offer.itemId, offer.quantity),
                }).catch(error => this.reportOpen(error));
            }, () => this.confirm(row.id, offer, shop.refreshAt));
        }
    }

    /** 数量窗核对同一自然周的商品、余额和购买限额。 */
    private confirm(offerId: number, offer: MarketOffer, refreshAt: number): void {
        if (this.maximum(offer) < 1) {
            UIManager.instance.toast("竞技币不足或已达到限购");
            return;
        }
        void UIManager.instance.openChild(this, MarketBuyView, {
            offer,
            refreshOn: ["arena.updated"],
            read: () => {
                const shop = ArenaModel.instance.shop;
                const now = ServerClock.instance.nowSeconds();
                const current = shop?.offers.find(row => row.id === offerId);
                if (!current || shop?.refreshAt !== refreshAt || (now !== null && now >= refreshAt)) {
                    return null;
                }
                const quote = this.toMarketOffer(current);
                return { offer: quote, maximum: this.maximum(quote), busy: ArenaController.instance.busy };
            },
            buy: quantity => ArenaController.instance.buyOffer(offerId, quantity, refreshAt),
        }).catch(error => this.reportOpen(error));
    }

    /** 原表每个货位兑换一种物品，沿用公共的数量确认数据。 */
    private toMarketOffer(row: ArenaShopOffer): MarketOffer {
        const reward = row.rewards[0];
        return { productId: row.id, itemId: reward.itemId, quantity: reward.quantity, costItemId: CURRENCY,
            costQuantity: row.price, purchaseLimit: row.purchaseLimit, purchased: row.purchased, purchasable: true, discount: 0 };
    }

    /** 计算界面确认上限，实际扣费由服务端完成。 */
    private maximum(offer: MarketOffer): number {
        const balanceLimit = Math.floor(BagModel.instance.quantity(CURRENCY) / offer.costQuantity);
        return Math.max(0, Math.min(balanceLimit, offer.purchaseLimit > 0 ? offer.purchaseLimit - offer.purchased : balanceLimit));
    }

    /** 子窗被取消或已由框架报告时不重复提示。 */
    private reportOpen(error: unknown): void {
        if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
            UIManager.instance.toast("竞技商店操作窗口打开失败");
        }
    }
}
