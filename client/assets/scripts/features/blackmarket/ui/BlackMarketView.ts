/**
 * 主城黑市全屏页。用服务端货架和统一资产投影刷新各页签，购买交给黑市控制器。
 * 裁剪、横向页签、三列货架和元素栏均由预制体配置；页面关闭时停止轮询时钟并解除监听。
 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
import { GConfig } from "../../../config/GConfig";
import { GameConfig } from "../../../config/GameConfig";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../../account/AccountModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { MarketBuyView } from "../../market/ui/MarketBuyView";
import { BlackMarketController } from "../BlackMarketController";
import { BlackMarketModel } from "../BlackMarketModel";
import {
    BLACK_MARKET_STALL,
    type BlackMarketOffer,
    type BlackMarketState,
    type BlackMarketTab,
} from "../data/BlackMarketData";
import { BlackMarketItemCell } from "./BlackMarketItemCell";
import { BlackMarketTabCell } from "./BlackMarketTabCell";

/** 由主城导航注入钱包更新与回城操作。 */
interface BlackMarketOpenArgs {
    /** 统一账号角色状态，只用于订阅钱包和等级刷新。 */
    readonly account?: AccountModel;
    /** 指定黑市货架的配置 ID，省略时打开道具货架。 */
    readonly shopType?: number;
    /** 主城导航负责恢复原场景、地图位置与激活页。 */
    readonly backToCity?: () => void;
}

/** 原策划的先知货架支持按英雄元素筛选。 */
const PROPHET_SHOP = 100300;
/** 原竞技场同源货架，限购按周计算。 */
const ARENA_SHOP = 100500;
const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "black-market",
    prefab: "bundles/module/blackmarket/prefabs/BlackMarketView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("BlackMarketView")
export class BlackMarketView extends BaseView<BlackMarketOpenArgs> {
    /** 全屏页的固定设计构图，视口改变时整体等比缩放。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 黑市老板 Spine 演出挂点。 */
    @property(Node) private _portraitHost: Node | null = null;
    /** 右上返回主城按钮。 */
    @property(Button) private _back: Button | null = null;
    /** 横滚页签条，宽度及裁剪保存在预制体。 */
    @property(SuperScroll) private _tabs: SuperScroll | null = null;
    /** 普通三列货架。 */
    @property(SuperScroll) private _shelf: SuperScroll | null = null;
    /** 先知三列货架，为静态元素栏保留高度。 */
    @property(SuperScroll) private _prophetShelf: SuperScroll | null = null;
    /** 先知元素栏，选择其他页签时隐藏。 */
    @property(Node) private _elements: Node | null = null;
    /** 从全部、火、水、风、光、暗排列的六个筛选按钮。 */
    @property([Button]) private _elementButtons: Button[] = [];
    /** 与元素按钮一一对应的高亮节点。 */
    @property([Node]) private _elementSelections: Node[] = [];
    /** 页首货币胶囊。有货架货币后才显示。 */
    @property(Node) private _currencyCounter: Node | null = null;
    /** 页首当前货架货币图标。 */
    @property(Sprite) private _currencyIcon: Sprite | null = null;
    /** 角色钱包或背包中的实际余额。 */
    @property(Label) private _balance: Label | null = null;
    /** 页底货架周期文案，不控制真实刷新时刻。 */
    @property(Label) private _reset: Label | null = null;
    /** 无货架或未开放时，在陈列区域内居中说明。 */
    @property(Label) private _status: Label | null = null;
    /** 页面选中的先知元素，0 表示全部，切换货架后复位。 */
    private element = 0;
    /** 当前已显示的货架 ID，跨页签切换时复位滚动与元素。 */
    private renderedShop: number | null = null;
    /** 已为哪个货架的哪个 Unix 秒边界触发查询，避免连接故障时每秒重发。 */
    private requestedReset = "";

    /** 绑定静态控件与状态通知，再请求所选的权威货架。 */
    public onOpen(args?: BlackMarketOpenArgs): void {
        super.onOpen(args);
        this.validateBindings();
        this.renderedShop = null;
        this.requestedReset = "";
        this.listen(this._back!, this.goBack);
        this._elementButtons.forEach((button, element) => this.listen(button, () => this.chooseElement(element)));
        this._tabs!.list.node.on(SuperContent.SELECT_ITEM, this.selectTab, this);
        this.ownListener(() => {
            const content = this._tabs?.content;
            if (content?.isValid) {
                content.off(SuperContent.SELECT_ITEM, this.selectTab, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel.bind(this)));
        this.ownListener(EventDispatcher.instance.on("blackMarket.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.renderBalance));
        if (args?.account) {
            this.ownListener(args.account.subscribe(() => this.renderBalance()));
        }
        this.schedule(this.tick, 1);
        this.ownListener(() => this.unschedule(this.tick));
        BattleSpineService.instance.mountNamedSpine(this._portraitHost!, "heishi", "act", { loop: true });
        BlackMarketController.instance.setVisible(true, args?.shopType);
        this.render();
    }

    /** 关闭后停止读可见货架；已提交订单由控制器完成或重连恢复。 */
    public onClose(): void {
        BlackMarketController.instance.setVisible(false);
    }

    /** 检查编辑器绑定的视口、静态节点和筛选按钮。 */
    private validateBindings(): void {
        if (!this._panel || !this._portraitHost || !this._back || !this._tabs || !this._shelf || !this._prophetShelf
                || !this._elements || !this._currencyCounter || !this._currencyIcon || !this._balance || !this._reset
                || !this._status || this._elementButtons.length !== 6 || this._elementSelections.length !== 6
                || this._elementButtons.some(button => !button) || this._elementSelections.some(node => !node)) {
            throw new Error("BlackMarketView.prefab 缺少黑市页面绑定");
        }
        for (const scroll of [this._tabs, this._shelf, this._prophetShelf]) {
            scroll.validateBindings();
        }
    }

    /** 缩放静态构图以适应不同长宽比，维持货架的裁剪和构图。 */
    private fitPanel(): void {
        const area = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, area.width / panel.width, area.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 按页面显示期绑定按钮，关页时解除本次监听。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 返回由导航层管理，脱离主城导航打开时可单独关页。 */
    private goBack(): void {
        if (this.args?.backToCity) {
            this.args.backToCity();
        } else {
            this.close();
        }
    }

    /** 页签来自服务器配置，检查等级后交给控制器切换货架。 */
    private selectTab(tab: BlackMarketTab): void {
        const level = this.args?.account?.snapshot.role?.level;
        if (level !== undefined && level < tab.minimumLevel) {
            UIManager.instance.toast(`${tab.minimumLevel}级解锁`);
            return;
        }
        BlackMarketController.instance.selectShop(tab.shopType);
        this.render();
    }

    /** 只筛选当前先知货架已收到的英雄碎片，保留服务端顺序。 */
    private chooseElement(element: number): void {
        if (this.element === element) {
            return;
        }
        this.element = element;
        this._prophetShelf!.toStart();
        this.render();
    }

    /** 选择新货架时保留页签位置，旧货架内容不会出现在新页签。 */
    private render(): void {
        const controller = BlackMarketController.instance;
        const snapshot = BlackMarketModel.instance.snapshot;
        const selected = controller.selectedShopType;
        const state = this.currentState();
        const prophet = selected === PROPHET_SHOP;
        const shopChanged = this.renderedShop !== selected;
        if (shopChanged) {
            this.renderedShop = selected;
            this.element = 0;
        }
        const tabs = snapshot?.tabs ?? [];
        this._tabs!.list.setData(tabs, (node, tab) => {
            node.getComponent(BlackMarketTabCell)!.render(tab.name, tab.shopType === selected);
        });
        this._elements!.active = prophet;
        this._elementSelections.forEach((node, element) => { node.active = element === this.element; });
        this._shelf!.node.active = !prophet;
        this._prophetShelf!.node.active = prophet;
        const period = this.limitPeriod(selected);
        const offers = state?.offers.filter(offer => this.matchesElement(offer)) ?? [];
        const scroll = prophet ? this._prophetShelf! : this._shelf!;
        scroll.list.setData(offers, (node, offer) => {
            node.getComponent(BlackMarketItemCell)!.render(offer, period, selected !== BLACK_MARKET_STALL,
                controller.busy, () => this.openItem(offer), () => this.openPurchase(state!, offer));
        });
        if (shopChanged) {
            scroll.toStart();
        }
        const tab = tabs.find(row => row.shopType === selected);
        this._status!.string = this.shelfStatus(state, tab, controller.busy, offers.length);
        this._reset!.node.parent!.active = !!state?.nextRefreshAt;
        this._reset!.string = period ? `${period}0时重置购买次数` : "定时重置购买次数";
        this.renderBalance();
        this.tick();
    }

    /** 当前页签的有效快照，加载期间不读上一个页签的库存或货币。 */
    private currentState(): BlackMarketState | null {
        const state = BlackMarketModel.instance.snapshot;
        return state?.shopType === BlackMarketController.instance.selectedShopType ? state : null;
    }

    /** 空列表区只报告货架内容状态，操作错误由通用飘字处理。 */
    private shelfStatus(state: BlackMarketState | null, tab: BlackMarketTab | undefined, busy: boolean,
        count: number): string {
        if (count > 0) {
            return "";
        }
        if (!state && busy) {
            return "正在加载";
        }
        return tab && !tab.available ? "商品暂未开放" : "暂无商品";
    }

    /** 先知筛选使用碎片对应的英雄配置，其他货架和全部筛选保留所有商品。 */
    private matchesElement(offer: BlackMarketOffer): boolean {
        return this.element === 0 || GameConfig.instance.getConfig(GConfig.HeroType,
            offer.itemId - 10000000)?.elem === this.element;
    }

    /** 根据已恢复货架的配置周期显示相应限购前缀。 */
    private limitPeriod(shopType: number | null): string {
        if (shopType === BLACK_MARKET_STALL) {
            return "每日";
        }
        return shopType === ARENA_SHOP ? "每周" : "";
    }

    /** 真实余额从统一资产读取，打开和切换货架不查询背包。 */
    private renderBalance(): void {
        const state = this.currentState();
        const currency = state?.currencyItemId ?? 0;
        this._currencyCounter!.active = currency > 0;
        if (currency > 0) {
            this._balance!.string = String(BlackMarketController.instance.balance(currency));
            ResManager.setSprite(this._currencyIcon!.node, ResManager.item(currency));
        }
    }

    /** 到服务器给出的刷新边界后重新读货架，页面不自行补限购次数。 */
    private tick(): void {
        const state = this.currentState();
        const now = ServerClock.instance.nowSeconds();
        const controller = BlackMarketController.instance;
        if (!state?.nextRefreshAt || now === null || now < state.nextRefreshAt || controller.busy) {
            return;
        }
        const resetKey = `${state.shopType}:${state.nextRefreshAt}`;
        if (resetKey !== this.requestedReset) {
            this.requestedReset = resetKey;
            controller.reloadVisible();
        }
    }

    /** 物品图标只打开已有配置说明窗，不变更真实库存或询价。 */
    private openItem(offer: BlackMarketOffer): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description", face: BagItemCatalog.face(offer.itemId, offer.quantity),
        }).catch(() => { /* UIManager 统一报告打开失败。 */ });
    }

    /** 打开通用数量窗，确认和活动刷新时始终重复读取原货架的最新报价。 */
    private openPurchase(state: BlackMarketState, offer: BlackMarketOffer): void {
        const controller = BlackMarketController.instance;
        const maximum = controller.maximum(offer);
        if (maximum < 1) {
            UIManager.instance.toast(`${BagItemCatalog.face(offer.costItemId, 0).title}不足`);
            return;
        }
        void UIManager.instance.openChild(this, MarketBuyView, {
            offer,
            account: this.args?.account,
            refreshOn: ["blackMarket.updated"],
            read: () => this.readPurchase(state, offer.productId),
            buy: count => controller.buy(state.shopType, state.shelfVersion, offer.productId, count),
        }).catch(() => { /* UIManager 统一报告打开失败。 */ });
    }

    /** 关页、切页、货架换期或商品移除后返回空，禁止提交旧确认。 */
    private readPurchase(original: BlackMarketState, productId: number): {
        readonly offer: BlackMarketOffer;
        readonly maximum: number;
        readonly busy: boolean;
    } | null {
        const state = this.currentState();
        const now = ServerClock.instance.nowSeconds();
        if (!state || state.shopType !== original.shopType || state.shelfVersion !== original.shelfVersion
                || (state.nextRefreshAt > 0 && now !== null && now >= state.nextRefreshAt)) {
            return null;
        }
        const offer = state.offers.find(row => row.productId === productId);
        const controller = BlackMarketController.instance;
        return offer ? { offer, maximum: controller.maximum(offer), busy: controller.busy } : null;
    }
}
