/** 公会商店弹窗，展示服务端货架和背包公会币。兑换由 GuildController 发送并通过统一资产同步。 */
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
import { GuildController } from "../GuildController";
import { GuildModel, type GuildShopProduct } from "../GuildModel";
import { GuildShopCell } from "./GuildShopCell";

/** 本次商店弹窗的公会，退会或切换公会后由界面关闭。 */
interface GuildShopArgs {
    readonly guildId: string;
}

/** 原 shopcontrol 中的公会币物品编号，与捐献到账同一背包余额。 */
const CURRENCY = 901301;
const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "guild-shop",
    prefab: "bundles/module/guild/prefabs/GuildShopView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildShopView")
export class GuildShopView extends BaseView<GuildShopArgs> {
    /** 固定商店构图的根面板，窄屏整体等比缩放。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 商店商品用预制体三列滚动和裁剪。 */
    @property(SuperScroll) private _products: SuperScroll | null = null;
    /** 右上关闭按钮。 */
    @property(Button) private _close: Button | null = null;
    /** 当前权威背包公会币余额。 */
    @property(Label) private _balance: Label | null = null;
    /** 服务器周一重置时刻的倒计时，按总小时显示。 */
    @property(Label) private _reset: Label | null = null;
    /** 页面在同一期自动查询一次，防止断线时每秒轰炸网络。 */
    private requestedReset = 0;

    /** 装配静态布局、货架和余额，再交控制器查询当期状态。 */
    public onOpen(args?: GuildShopArgs): void {
        super.onOpen(args);
        if (!args?.guildId || !this._panel || !this._products || !this._close || !this._balance || !this._reset) {
            throw new Error("GuildShopView.prefab 缺少公会或窗口绑定");
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
        this.ownListener(EventDispatcher.instance.on("guild.shop.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on("guild.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.renderBalance));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.requestedReset = 0;
        this.schedule(this.tick, 1);
        GuildController.instance.setFeatureVisible("shop", true);
        this.render();
    }

    /** 关闭后停止读货架和倒计时，已经发出的确认仍由模块处理。 */
    public onClose(): void {
        this.unschedule(this.tick);
        GuildController.instance.setFeatureVisible("shop", false);
        if (this._products?.isValid && this._products.content?.isValid) {
            this._products.list.clear();
        }
    }

    /** 整个静态面板等比适配并保留两侧外框留白，行列与节点位置保持预制体定义。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width * 0.96 / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 公会变更后关闭旧商店，当前货架回包仅刷新可见行。 */
    private render(): void {
        if (GuildModel.instance.snapshot?.guild?.id !== this.args?.guildId) {
            this.close();
            return;
        }
        const shop = GuildModel.instance.shop;
        this._products!.list.setData(shop && shop.guildId === this.args?.guildId ? shop.products : []);
        this.renderBalance();
        this.tick();
    }

    /** 直接从唯一背包读取公会币数量，不发额外库存查询。 */
    private renderBalance(): void {
        this._balance!.string = String(BagModel.instance.quantity(CURRENCY));
    }

    /** 上海周一零点以服务端时间触发重查，未同步时不伪造刷新时间。 */
    private tick(): void {
        const shop = GuildModel.instance.shop;
        const now = ServerClock.instance.nowSeconds();
        if (!shop || shop.guildId !== this.args?.guildId || now === null) {
            this._reset!.string = "免费刷新 --:--:--";
            return;
        }
        const remaining = Math.max(0, shop.resetAtSeconds - now);
        const time = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60]
            .map(part => String(part).padStart(2, "0")).join(":");
        this._reset!.string = `免费刷新 ${time}`;
        const controller = GuildController.instance;
        if (!remaining && !controller.shopBusy && this.requestedReset !== shop.resetAtSeconds) {
            this.requestedReset = shop.resetAtSeconds;
            controller.refreshShop();
        }
    }

    /** 给当前可见格绑定所属周期和真实商品，支持查看原道具和打开数量窗。 */
    private renderProduct(node: Node, product: GuildShopProduct): void {
        const shop = GuildModel.instance.shop;
        const cell = node.getComponent(GuildShopCell);
        if (!shop || !cell) {
            return;
        }
        cell.render(product, GuildController.instance.shopBusy,
            () => this.describe(product), () => this.confirm(product, shop.resetAtSeconds));
    }

    /** 走已有的背包说明窗口，只描述商品配置。 */
    private describe(product: GuildShopProduct): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description", face: BagItemCatalog.face(product.itemId, product.quantity),
        }).catch(() => { /* UIManager 统一展示加载失败。 */ });
    }

    /** 复用商店数量确认窗，并在同一报价期间持续校验余额与周限购。 */
    private confirm(product: GuildShopProduct, resetAtSeconds: number): void {
        const maximum = this.maximum(product);
        if (maximum < 1) {
            UIManager.instance.toast("公会币不足");
            return;
        }
        const guildId = this.args?.guildId;
        void UIManager.instance.openChild(this, MarketBuyView, {
            offer: this.marketOffer(product),
            refreshOn: ["guild.shop.updated", "guild.updated"],
            read: () => {
                const shop = GuildModel.instance.shop;
                const current = shop?.products.find(row => row.productId === product.productId);
                const now = ServerClock.instance.nowSeconds();
                if (!shop || !current || shop.guildId !== guildId || shop.resetAtSeconds !== resetAtSeconds
                        || (now !== null && now >= resetAtSeconds)) {
                    return null;
                }
                return { offer: this.marketOffer(current), maximum: this.maximum(current), busy: GuildController.instance.shopBusy };
            },
            buy: count => GuildController.instance.buyShop(product.productId, count, resetAtSeconds),
        }).catch(() => { /* UIManager 统一展示加载失败。 */ });
    }

    /** 把公会报价交给通用数量窗，仍用相同商品和公会币配置。 */
    private marketOffer(product: GuildShopProduct): MarketOffer {
        return {
            productId: product.productId, itemId: product.itemId, quantity: product.quantity,
            costItemId: CURRENCY, costQuantity: product.cost, purchaseLimit: product.limit,
            purchased: product.purchased, purchasable: product.purchasable, discount: 0,
        };
    }

    /** 当前界面可选的份数上限，服务器仍逐笔检查。 */
    private maximum(product: GuildShopProduct): number {
        return product.purchasable ? Math.max(0, Math.min(product.limit - product.purchased,
            Math.floor(BagModel.instance.quantity(CURRENCY) / product.cost))) : 0;
    }
}
