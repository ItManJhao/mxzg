/** 主城普通市场页面。货架、价格和刷新次数来自市场 Model，物品详情沿用背包只读窗口。 */
import { _decorator, Button, Label, Node, Sprite, UITransform } from "cc";
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
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { MarketController } from "../MarketController";
import { MarketModel, type MarketOffer } from "../MarketModel";
import { MarketBuyView } from "./MarketBuyView";
import { MarketItemCell } from "./MarketItemCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "market",
    prefab: "bundles/module/market/prefabs/MarketView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("MarketView")
export class MarketView extends BaseView<void> {
    /** 预制体固定构图的面板，适配时整体等比缩放。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 已装配市场看板演出的节点。 */
    @property(Node) private _portraitHost: Node | null = null;
    /** 右上返回按钮，关闭后恢复主城地图。 */
    @property(Button) private _closeButton: Button | null = null;
    /** 优先用免费次数的刷新按钮。 */
    @property(Button) private _refreshButton: Button | null = null;
    /** 付费刷新时显示相应货币。 */
    @property(Sprite) private _refreshIcon: Sprite | null = null;
    /** 当前刷新消耗或免费余量。 */
    @property(Label) private _refreshLabel: Label | null = null;
    /** 当日付费刷新剩余和上限，由服务端给出。 */
    @property(Label) private _refreshCountLabel: Label | null = null;
    /** 以公共服务器时钟计算到下次补免费次数的时间。 */
    @property(Label) private _countdownLabel: Label | null = null;
    /** 三列货架，格子和布局均由预制体配置。 */
    @property(SuperScroll) private _list: SuperScroll | null = null;
    /** 已处理的刷新时间点，防止到期查货架失败后每秒重发。 */
    private checkedDeadline = 0;

    /** 进入页面后绑定呈现与点击，向控制器请求当下货架。 */
    public onOpen(): void {
        this.checkedDeadline = 0;
        this.listen(this._closeButton!, () => this.close());
        this.listen(this._refreshButton!, this.refreshShelf);
        const list = this._list!.list.node;
        list.on(SuperContent.RENDER_ITEM, this.renderCell, this);
        this.ownListener(() => {
            if (list.isValid) {
                list.off(SuperContent.RENDER_ITEM, this.renderCell, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitPanel()));
        this.ownListener(EventDispatcher.instance.on("market.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.renderRefresh));
        this.schedule(this.tick, 1);
        this.ownListener(() => this.unschedule(this.tick));
        BattleSpineService.instance.mountNamedSpine(this._portraitHost!, "shangcheng", "act", { loop: true });
        MarketController.instance.setVisible(true);
        this.render();
    }

    /** 通知控制器停止主动货架更新，已发出的购买仍由会话层交付。 */
    public onClose(): void {
        MarketController.instance.setVisible(false);
    }

    /** 铺开页面视口并按旧页面面板比例整体适配。 */
    private fitPanel(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 绑定本轮显示期间的按钮事件，并随页面关闭统一解除。 */
    private listen(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 服务器货架改变时重新绑定商品格，刷新区独立更新。 */
    private render(): void {
        this._list!.list.setData(MarketModel.instance.snapshot?.offers ?? []);
        this.renderRefresh();
        this.tick();
    }

    /** 绑定本次货架版本和商品 ID，确认窗口使用同一份报价。 */
    private renderCell(node: Node, offer: MarketOffer): void {
        const cell = node.getComponent(MarketItemCell)!;
        const version = MarketModel.instance.snapshot!.shelfVersion;
        cell.render(offer, MarketController.instance.busy,
            () => this.openItem(offer), () => this.openPurchase(offer, version));
    }

    /** 打开配置道具说明，不把展示数量写入背包。 */
    private openItem(offer: MarketOffer): void {
        const face = BagItemCatalog.face(offer.itemId, offer.quantity);
        void UIManager.instance.openChild(this, BagInfoView, { source: "description", face }).catch(() => {
            // 页面管理器统一报告打开失败，随父页取消时不弹提示。
        });
    }

    /** 点击价格时先检查余额，选择次数留给旧版购买窗口。 */
    private openPurchase(offer: MarketOffer, shelfVersion: number): void {
        if (!offer.purchasable) {
            UIManager.instance.toast("该商品暂不可购买");
            return;
        }
        if (MarketController.instance.maximum(offer) <= 0) {
            UIManager.instance.toast(`${BagItemCatalog.face(offer.costItemId, 0).title}不足`);
            return;
        }
        void UIManager.instance.openChild(this, MarketBuyView, { offer, shelfVersion }).catch(() => {
            // 页面管理器统一报告打开失败，随父页取消时不弹提示。
        });
    }

    /** 显示实际次数；货架未取到或资格已过期时允许手动重试读货架。 */
    private renderRefresh(): void {
        const state = MarketModel.instance.snapshot;
        const free = state?.freeRefreshes ?? 0;
        const paid = state ? state.paidRefreshLimit - state.paidRefreshes : 0;
        const hasCost = !!state && !free && !!paid;
        this._refreshLabel!.string = !state ? "刷新" : free ? `免费刷新(${free}/${state.freeRefreshLimit})`
            : hasCost ? `${state.refreshCostQuantity} 刷新` : "刷新";
        this._refreshCountLabel!.string = state ? `刷新次数：${paid}/${state.paidRefreshLimit}` : "";
        this._refreshIcon!.node.active = hasCost;
        ResManager.setSprite(this._refreshIcon!.node, hasCost ? ResManager.item(state!.refreshCostItemId) : null);
        this._refreshButton!.interactable = !MarketController.instance.busy && (!state || !!(free || paid)
            || this.refreshDeadlineReached());
    }

    /** 到期只重新请求一次资格，倒计时不自行增加免费次数。 */
    private tick(): void {
        const state = MarketModel.instance.snapshot;
        const now = ServerClock.instance.nowSeconds();
        const nextFree = state?.nextFreeRefreshAt ?? 0;
        const remaining = now !== null && nextFree ? Math.max(0, nextFree - now) : 0;
        this._countdownLabel!.string = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60]
            .map(part => String(part).padStart(2, "0")).join(":");
        if (!state || now === null || MarketController.instance.busy) {
            return;
        }
        const deadline = Math.min(nextFree || Infinity, state.nextPaidResetAt || Infinity);
        if (deadline <= now && this.checkedDeadline !== deadline) {
            this.checkedDeadline = deadline;
            MarketController.instance.reloadVisible();
        }
    }

    /** 资格到期后保留手动重试入口，避免查货架失败后按钮一直禁用。 */
    private refreshDeadlineReached(): boolean {
        const now = ServerClock.instance.nowSeconds();
        const state = MarketModel.instance.snapshot;
        return now !== null && !!state && (state.nextPaidResetAt <= now
            || (state.nextFreeRefreshAt > 0 && state.nextFreeRefreshAt <= now));
    }

    /** 免费次数用尽时检查原价货币余额，服务端最终确定当次刷新消耗。 */
    private refreshShelf(): void {
        const state = MarketModel.instance.snapshot;
        if (!state || this.refreshDeadlineReached()) {
            MarketController.instance.reloadVisible();
            return;
        }
        if (!state.freeRefreshes && MarketController.instance.balance(state.refreshCostItemId) < state.refreshCostQuantity) {
            UIManager.instance.toast(`${BagItemCatalog.face(state.refreshCostItemId, 0).title}不足`);
            return;
        }
        MarketController.instance.refresh(state.shelfVersion);
    }
}
