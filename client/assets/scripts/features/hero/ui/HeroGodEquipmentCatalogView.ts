/**
 * 英雄详情的神装图鉴。按旧版品质规则和星级页签浏览实际配置，只读说明跟随图鉴关闭。
 * 卡片、页签与滚动区域由预制体绑定。
 */
import { _decorator, Button, Node, UITransform } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { HeroGodEquipmentCatalogUtils, type GodEquipmentCatalogRow } from "../utils/HeroGodEquipmentCatalogUtils";
import { HeroGodEquipmentCatalogCell } from "./HeroGodEquipmentCatalogCell";
import { HeroGodEquipmentTabCell } from "./HeroGodEquipmentTabCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-god-equipment-catalog",
    prefab: "bundles/module/hero/prefabs/HeroGodEquipmentCatalogView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroGodEquipmentCatalogView")
export class HeroGodEquipmentCatalogView extends BaseView<void> {
    /** 用统一视口整体缩放的原版面板。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 右上关闭入口。 */
    @property(Button) private closeButton: Button | null = null;
    /** 一至五星的页签条。 */
    @property(SuperScroll) private tabs: SuperScroll | null = null;
    /** 两列神装名录，尺寸和虚拟格由预制体提供。 */
    @property(SuperScroll) private cards: SuperScroll | null = null;
    /** 当前窗口的浏览星级，每次打开从一星开始。 */
    private star = 1;

    /** 绑定静态组件，默认展示一星图鉴。所有监听跟随窗口关闭。 */
    public onOpen(): void {
        this.star = 1;
        this.tabs!.validateBindings();
        this.cards!.validateBindings();
        const close = this.closeButton!.node;
        const tabs = this.tabs!.list.node;
        const cards = this.cards!.list.node;
        close.on(Button.EventType.CLICK, this.close, this);
        tabs.on(SuperContent.RENDER_ITEM, this.showTab, this);
        tabs.on(SuperContent.SELECT_ITEM, this.selectStar, this);
        cards.on(SuperContent.RENDER_ITEM, this.showCard, this);
        cards.on(SuperContent.SELECT_ITEM, this.showDetail, this);
        this.ownListener(() => {
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
            if (tabs.isValid) {
                tabs.targetOff(this);
            }
            if (cards.isValid) {
                cards.targetOff(this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.resize()));
        this.selectStar(1);
        this.tabs!.toStart();
    }

    /** 更改页签并从所选星级的第一项开始浏览。 */
    private selectStar(star: number): void {
        this.star = star;
        this.tabs!.list.setData([1, 2, 3, 4, 5]);
        const equipment = HeroGodEquipmentCatalogUtils.read()?.equipment ?? [];
        this.cards!.list.setData(equipment.filter(item => item.star === star));
        this.cards!.toStart();
    }

    /** 从当前星级设置原页签底图和显示名称。 */
    private showTab(node: Node, star: number): void {
        node.getComponent(HeroGodEquipmentTabCell)!.show(`${star}星神装`, this.star === star);
    }

    /** 绑定图鉴中的实际模板行。 */
    private showCard(node: Node, item: GodEquipmentCatalogRow): void {
        node.getComponent(HeroGodEquipmentCatalogCell)!.show(item);
    }

    /** 点开模板基础属性与套装档位，展示不生成装备实例。 */
    private showDetail(item: GodEquipmentCatalogRow): void {
        void UIManager.instance.openChild(this, ConfirmView, {
            title: BagItemCatalog.face(item.templateId, 1).title,
            message: HeroGodEquipmentCatalogUtils.describe(item),
            confirmText: "关闭",
            showCancel: false,
            onConfirm: () => {},
        }).catch(() => { /* 开窗异常由 UIManager 统一反馈。 */ });
    }

    /** 适配可见区，同时保留旧版面板的设计比例。 */
    private resize(): void {
        const size = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, size.width * 0.98 / panel.width, size.height * 0.95 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }
}
