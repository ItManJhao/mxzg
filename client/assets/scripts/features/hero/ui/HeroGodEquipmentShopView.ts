/**
 * 英雄详情的神装商城。固定货架按旧套装分组，余额与限购取共享快照，实际购买交给神装控制器。
 * 旧版货架、页签和价格确认由预制体与现有通用商店组件负责。
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
import { BagModel } from "../../bag/BagModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { MarketOffer } from "../../market/MarketModel";
import { MarketBuyView } from "../../market/ui/MarketBuyView";
import { MarketItemCell } from "../../market/ui/MarketItemCell";
import { HeroGodEquipmentController } from "../HeroGodEquipmentController";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroGodEquipmentCatalogUtils } from "../utils/HeroGodEquipmentCatalogUtils";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroGodEquipmentTabCell } from "./HeroGodEquipmentTabCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-god-equipment-shop",
    prefab: "bundles/module/hero/prefabs/HeroGodEquipmentShopView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroGodEquipmentShopView")
export class HeroGodEquipmentShopView extends BaseView<void> {
    /** 原版商城面板，短屏时等比缩放。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 右上关闭按钮。 */
    @property(Button) private closeButton: Button | null = null;
    /** 套装分类的横向虚拟列表。 */
    @property(SuperScroll) private tabs: SuperScroll | null = null;
    /** 商品的三列虚拟货架。 */
    @property(SuperScroll) private shelf: SuperScroll | null = null;
    /** 当前账户的真实神装碎片余额。 */
    @property(Label) private currencyLabel: Label | null = null;
    /** 到旧版日限购刷新时间的倒计时。 */
    @property(Label) private resetLabel: Label | null = null;
    /** 当前分类是原策划套装编号，每次进入默认首类。 */
    private section = 1;
    /** 上次渲染的日截止 Unix 秒，用于零点切换时重新绑定货架。 */
    private visibleReset = 0;

    /** 绑定虚拟列表、共享快照以及时钟，在退出时随页面解绑。 */
    public onOpen(): void {
        const config = HeroGodEquipmentCatalogUtils.read();
        const sections = [...new Set(config?.products.map(product => product.section) ?? [])].sort((a, b) => a - b);
        this.section = sections[0] ?? 1;
        this.visibleReset = 0;
        this.tabs!.validateBindings();
        this.shelf!.validateBindings();
        const close = this.closeButton!.node;
        const tabs = this.tabs!.list.node;
        const shelf = this.shelf!.list.node;
        close.on(Button.EventType.CLICK, this.close, this);
        tabs.on(SuperContent.RENDER_ITEM, this.showTab, this);
        tabs.on(SuperContent.SELECT_ITEM, this.selectSection, this);
        shelf.on(SuperContent.RENDER_ITEM, this.showOffer, this);
        this.ownListener(() => {
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
            if (tabs.isValid) {
                tabs.targetOff(this);
            }
            if (shelf.isValid) {
                shelf.targetOff(this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.resize()));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.render));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.render));
        this.ownListener(EventDispatcher.instance.on("hero-god-equipment:updated", this, this.render));
        this.schedule(this.tick, 1);
        this.ownListener(() => this.unschedule(this.tick));
        this.tabs!.list.setData(sections);
        this.tabs!.toStart();
        this.render();
    }

    /** 绑定当前看到的套装名称及选中状态。 */
    private showTab(node: Node, section: number): void {
        node.getComponent(HeroGodEquipmentTabCell)!.show(HeroGodEquipmentCatalogUtils.setName(section),
            section === this.section);
    }

    /** 切换套装类别，货架从首格显示，保留横向页签位置。 */
    private selectSection(section: number): void {
        this.section = section;
        this.tabs!.list.refresh();
        this.render();
        this.shelf!.toStart();
    }

    /** 从现有角色快照和固定货架投影一个实时购买选项。 */
    private offer(productId: number): MarketOffer | null {
        const state = HeroRosterModel.instance.snapshot.godEquipment?.shop;
        const config = HeroGodEquipmentCatalogUtils.read();
        const product = config?.products.find(item => item.productId === productId);
        if (!state || !config || !product) {
            return null;
        }
        const reset = HeroGodEquipmentCatalogUtils.resetAt(state, ServerClock.instance.nowSeconds());
        const purchased = reset === state.resetAt ? state.purchases.find(item => item.productId === productId)?.purchased : 0;
        return HeroGodEquipmentCatalogUtils.offer(product, config.currency, purchased ?? 0);
    }

    /** 重绘当前分类，角色资产变化不会丢失滚动位置。 */
    private render(): void {
        const state = HeroRosterModel.instance.snapshot.godEquipment?.shop;
        const config = HeroGodEquipmentCatalogUtils.read();
        if (!state || !config) {
            this.shelf!.list.clear();
            return;
        }
        const now = ServerClock.instance.nowSeconds();
        this.visibleReset = HeroGodEquipmentCatalogUtils.resetAt(state, now);
        this.currencyLabel!.string = String(BagModel.instance.quantity(config.currency));
        const current: MarketOffer[] = [];
        for (const product of config.products) {
            if (product.section === this.section) {
                const bought = this.visibleReset === state.resetAt
                    ? state.purchases.find(item => item.productId === product.productId)?.purchased : 0;
                current.push(HeroGodEquipmentCatalogUtils.offer(product, config.currency, bought ?? 0));
            }
        }
        this.shelf!.list.setData(current);
        this.updateResetLabel(now);
    }

    /** 用同一个通用商品格显示先验报价，购买和商品说明分开。 */
    private showOffer(node: Node, offer: MarketOffer): void {
        node.getComponent(MarketItemCell)!.render(offer, HeroGodEquipmentController.instance.busy,
            () => this.showItem(offer), () => this.confirmPurchase(offer));
    }

    /** 打开商品配置说明，兑换结果所得品质仍由服务器独立抽取。 */
    private showItem(offer: MarketOffer): void {
        const face = BagItemCatalog.face(offer.itemId, offer.quantity);
        void UIManager.instance.openChild(this, BagInfoView, { source: "description", face })
            .catch(() => { /* 开窗异常由 UIManager 统一反馈。 */ });
    }

    /** 购买确认复用旧商品数量弹窗，报价过期或余额变化时重新校验。 */
    private confirmPurchase(offer: MarketOffer): void {
        const resetAt = this.visibleReset;
        if (HeroGodEquipmentCatalogUtils.maximum(offer, BagModel.instance.quantity(offer.costItemId)) <= 0) {
            UIManager.instance.toast("神装碎片不足");
            return;
        }
        const controller = HeroGodEquipmentController.instance;
        void UIManager.instance.openChild(this, MarketBuyView, {
            offer,
            refreshOn: ["hero-god-equipment:updated", HeroRosterEvent.Updated],
            read: () => {
                const latest = this.offer(offer.productId);
                if (!latest || this.visibleReset !== resetAt) {
                    return null;
                }
                return {
                    offer: latest,
                    maximum: HeroGodEquipmentCatalogUtils.maximum(latest, BagModel.instance.quantity(latest.costItemId)),
                    busy: controller.busy,
                };
            },
            buy: quantity => controller.buy(offer.productId, quantity, resetAt),
        }).catch(() => { /* 开窗异常由 UIManager 统一反馈。 */ });
    }

    /** 通过统一服务器时钟更新每日限购倒计时，跨日当秒重绘。 */
    private tick(): void {
        const state = HeroRosterModel.instance.snapshot.godEquipment?.shop;
        const now = ServerClock.instance.nowSeconds();
        if (state && HeroGodEquipmentCatalogUtils.resetAt(state, now) !== this.visibleReset) {
            this.render();
            return;
        }
        this.updateResetLabel(now);
    }

    /** 没有可信时钟时保留正式服每日刷新说明。 */
    private updateResetLabel(now: number | null): void {
        if (now === null || this.visibleReset === 0) {
            this.resetLabel!.string = "每天0点刷新购买次数";
            return;
        }
        const remain = Math.max(0, this.visibleReset - now);
        const time = [Math.floor(remain / 3600), Math.floor(remain / 60) % 60, remain % 60]
            .map(part => String(part).padStart(2, "0")).join(":");
        this.resetLabel!.string = `${time} 后刷新`;
    }

    /** 适应可见区，购买货架和面板仍使用同一静态比例。 */
    private resize(): void {
        const size = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, size.width * 0.98 / panel.width, size.height * 0.95 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
