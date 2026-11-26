/**
 * 勇者试炼商店弹窗。展示固定货架、真实背包试炼之血和周刷新倒计时。
 * 查看物品及购买份数使用项目通用窗口，兑换只交给试炼商店控制器。
 */
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
import type { TrialShopOffer } from "../../../platform/Protocol";
import { BagModel } from "../../bag/BagModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagEvent } from "../../bag/utils/BagEvent";
import type { MarketOffer } from "../../market/MarketModel";
import { MarketBuyView } from "../../market/ui/MarketBuyView";
import { TrialShopController } from "../TrialShopController";
import { TrialShopModel } from "../TrialShopModel";
import { TrialShopCell } from "./TrialShopCell";

/** 试炼之血与试炼奖励走同一个背包物品配置号。 */
const CURRENCY = 901201;
const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "trial-shop",
    prefab: "bundles/module/trial/prefabs/TrialShopView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("TrialShopView")
export class TrialShopView extends BaseView<void> {
    /** 静态三列货架的整体面板，用于窄屏等比缩放。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 货位的行列、间距和裁剪由预制体保存。 */
    @property(SuperScroll) private _products: SuperScroll | null = null;
    /** 关闭商店后返回试炼地图。 */
    @property(Button) private _close: Button | null = null;
    /** 唯一背包中的试炼之血真实余额。 */
    @property(Label) private _balance: Label | null = null;
    /** 下一次上海周一零点的倒计时。 */
    @property(Label) private _reset: Label | null = null;
    /** 归零后已请求的期次，避免同一期每秒重复请求。 */
    private requestedRefresh = 0;

    /** 绑定预制体与事件，并由模块读取服务器报价。 */
    public onOpen(): void {
        if (!this._panel || !this._products || !this._close || !this._balance || !this._reset) {
            throw new Error("TrialShopView.prefab 缺少试炼商店绑定");
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
        this.ownListener(EventDispatcher.instance.on("trial.shop.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.renderBalance));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.requestedRefresh = 0;
        this.schedule(this.tick, 1);
        TrialShopController.instance.setVisible(true);
        this.render();
    }

    /** 关窗释放列表、计时和可见性，已发出的兑换由模块完成。 */
    public onClose(): void {
        this.unschedule(this.tick);
        TrialShopController.instance.setVisible(false);
        if (this._products?.isValid && this._products.content?.isValid) {
            this._products.list.clear();
        }
    }

    /** 在可见区域整体缩放窗口，保留预制体固有的栏间距。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 显示最新服务器货架和额度，不在运行时摆放单个货位。 */
    private render(): void {
        this._products!.list.setData(TrialShopModel.instance.snapshot?.offers ?? []);
        this.renderBalance();
        this.tick();
    }

    /** 从统一背包读余额，开关商店不触发库存查询。 */
    private renderBalance(): void {
        this._balance!.string = String(BagModel.instance.quantity(CURRENCY));
    }

    /** 用校准服务器秒显示剩余总小时，到期且没有订单时读取下一期。 */
    private tick(): void {
        const shop = TrialShopModel.instance.snapshot;
        const now = ServerClock.instance.nowSeconds();
        if (!shop || now === null) {
            this._reset!.string = "免费刷新 --:--:--";
            return;
        }
        const remaining = Math.max(0, shop.refreshAt - now);
        const time = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60]
            .map(value => String(value).padStart(2, "0")).join(":");
        this._reset!.string = `免费刷新 ${time}`;
        const controller = TrialShopController.instance;
        if (!remaining && !controller.busy && this.requestedRefresh !== shop.refreshAt) {
            this.requestedRefresh = shop.refreshAt;
            controller.refreshVisible();
        }
    }

    /** 绑定当前货位、报价时刻、物品详情和购买动作。 */
    private renderProduct(node: Node, row: TrialShopOffer): void {
        const state = TrialShopModel.instance.snapshot;
        const cell = node.getComponent(TrialShopCell);
        if (!state || !cell) {
            return;
        }
        const offer = this.marketOffer(row);
        cell.render(offer, TrialShopController.instance.busy, () => {
            void UIManager.instance.openChild(this, BagInfoView, {
                source: "description", face: BagItemCatalog.face(offer.itemId, offer.quantity),
            }).catch(() => { /* UIManager 已处理加载失败。 */ });
        }, () => this.confirm(offer, state.refreshAt));
    }

    /** 在同一周期内用最新成交数和背包余额限制可选数量。 */
    private confirm(offer: MarketOffer, refreshAt: number): void {
        if (this.maximum(offer) < 1) {
            UIManager.instance.toast("试炼之血不足或已达到限购");
            return;
        }
        void UIManager.instance.openChild(this, MarketBuyView, {
            offer,
            refreshOn: ["trial.shop.updated"],
            read: () => {
                const state = TrialShopModel.instance.snapshot;
                const current = state?.offers.find(row => row.id === offer.productId);
                const now = ServerClock.instance.nowSeconds();
                if (!current || state?.refreshAt !== refreshAt || (now !== null && now >= refreshAt)) {
                    return null;
                }
                const quote = this.marketOffer(current);
                return { offer: quote, maximum: this.maximum(quote), busy: TrialShopController.instance.busy };
            },
            buy: count => TrialShopController.instance.buy(offer.productId, count, refreshAt),
        }).catch(() => { /* UIManager 已处理加载失败。 */ });
    }

    /** 将服务端单件报价投影成既有数量窗的输入格式。 */
    private marketOffer(row: TrialShopOffer): MarketOffer {
        return {
            productId: row.id,
            itemId: row.reward.itemId,
            quantity: row.reward.quantity,
            costItemId: CURRENCY,
            costQuantity: row.price,
            purchaseLimit: row.purchaseLimit,
            purchased: row.purchased,
            purchasable: true,
            discount: 0,
        };
    }

    /** 依货币余额与未用限额限制份数，零限额度按原配置表示不限购。 */
    private maximum(offer: MarketOffer): number {
        const canAfford = Math.min(0x7fffffff - offer.purchased,
            Math.floor(BagModel.instance.quantity(CURRENCY) / offer.costQuantity));
        const canBuy = offer.purchaseLimit > 0 ? offer.purchaseLimit - offer.purchased : canAfford;
        return Math.max(0, Math.min(canAfford, canBuy));
    }
}
