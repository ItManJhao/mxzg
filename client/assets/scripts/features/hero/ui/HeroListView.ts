/**
 * 英雄名册页面：完整Prefab保存背景、纸面、筛选与滚动列表，控件直接绑定到本页。
 * 从唯一HeroRosterModel读取投影；打开时登记渲染和选择，关闭由BaseView解除本页监听。
 * 格子只显示数据，选择英雄由本页使用实例ID打开详情，不查询或修改名册。
 */
import { _decorator, Button, director, Director, Label, Node } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { RemakeConfigUtils } from "../../../config/RemakeConfigUtils";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterUtils } from "../utils/HeroRosterUtils";
import { HeroCatalog } from "../utils/HeroCatalog";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroInfoView } from "./HeroInfoView";
import type { HeroCellModel } from "./HeroListPresentation";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero",
    prefab: "bundles/module/hero/prefabs/HeroListView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
    prepare: RemakeConfigUtils.prepareHeroConfig,
})
@ccclass("HeroListView")
export class HeroListView extends BaseView {
    /** 主线阵容按钮，只打开草稿页，不直接保存阵容或发起挑战。 */
    @property(Button) lineupButton: Button | null = null;
    /** 当前英雄页签，点击说明自动同步状态，不发送查询。 */
    @property(Button) btnHero: Button | null = null;
    /** 完整Prefab绑定的滚动列表，静态结构和格子资源由该组件维护。 */
    @property(SuperScroll) heroScroll: SuperScroll | null = null;
    /** 当前筛选的加载、空态或错误说明。 */
    @property(Label) emptyLabel: Label | null = null;
    /** 服务端名册容量投影，位置由Prefab的Widget固定。 */
    @property(Label) capacityLabel: Label | null = null;
    /** 全部及五元素筛选，图片直接保存在Prefab，顺序为0至5。 */
    @property([Button]) elemButtons: Button[] = [];

    /** 唯一名册状态；生产使用模块实例，专项检查可在开页前注入独立Model。 */
    private roster = HeroRosterModel.instance;
    /** 只读模板索引，首次打开从已准备配置创建，不拥有玩家状态。 */
    private catalog: HeroCatalog | null = null;
    /** 当前元素筛选，0表示全部；新实例默认全部。 */
    private elem = 0;
    /** 关闭后阻止迟到刷新和选择，重开时恢复。 */
    private closed = true;
    /** 等待完整根激活的一份帧回调；显示或关页时解除。 */
    private shownWatch: (() => void) | null = null;

    /** 只将完整外根铺到可见画布；固定布局由Prefab组件处理。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 开页前注入只读状态与模板索引；不接收选择回调或页面控制器。 */
    public configure(roster: HeroRosterModel, catalog: HeroCatalog): void {
        if (!this.closed) {
            throw new Error("英雄名册依赖必须在开页前注入");
        }
        this.roster = roster;
        this.catalog = catalog;
    }

    /** 每次打开登记一份列表渲染、选择和筛选监听，再显示最新名册。 */
    public onOpen(): void {
        if (!this.closed) {
            this.refresh();
            return;
        }
        this.validateBindings();
        this.catalog ??= new HeroCatalog(GameConfig.instance.getFile(GConfig.HeroType), GameConfig.instance.getFile(GConfig.Item));
        this.closed = false;
        const list = this.heroScroll!.list;
        list.node.on(SuperContent.RENDER_ITEM, this.onRender, this);
        list.node.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            list.node.off(SuperContent.RENDER_ITEM, this.onRender, this);
            list.node.off(SuperContent.SELECT_ITEM, this.onSelect, this);
        });
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        this.bindButtons();
        this.refresh();
    }

    /** 关闭后废弃显示等待；BaseView随后解除本页按钮、列表和名册监听。 */
    public onClose(): void {
        this.closed = true;
        this.clearShownWatch();
    }

    /** 根重新激活时读取最新投影；开页前和关闭后不绘制。 */
    public onEnable(): void {
        this.refresh();
    }

    /** 校验直接绑定的业务控件，滚动结构统一交给SuperScroll检查。 */
    private validateBindings(): void {
        if (!this.heroScroll || !this.emptyLabel || !this.capacityLabel || this.elemButtons.length !== 6
            || this.elemButtons.some(button => !button?.node)) {
            throw new Error("HeroListView缺少滚动列表、说明、容量或六个元素按钮绑定");
        }
        this.heroScroll.validateBindings();
    }

    /** 只把当前筛选的数据交给列表，不创建列表板或计算格子坐标。 */
    private refresh(): void {
        if (this.closed || !this.node?.isValid || !this.heroScroll || !this.catalog) {
            return;
        }
        if (!this.node.activeInHierarchy) {
            this.watchShown();
            return;
        }
        const model = HeroRosterUtils.present(this.roster.snapshot, this.catalog, this.elem);
        this.capacityLabel!.string = model.capacityLine;
        this.emptyLabel!.string = model.emptyText;
        this.emptyLabel!.node.active = model.emptyText.length > 0;
        this.elemButtons.forEach((button, index) => {
            const scale = index === this.elem ? 1 : 0.8;
            button.node.setScale(scale, scale, 1);
        });
        this.heroScroll.list.setData(model.cells);
    }

    /** 列表创建或复用格子时只提交展示数据，不给格子注入页面导航。 */
    private onRender(node: Node, hero: HeroCellModel): void {
        const cell = node.getComponent(HeroIconCellView);
        if (!cell) {
            throw new Error("HeroIconCellView Prefab缺少格子组件");
        }
        cell.show(hero);
    }

    /** 选中当前列表的真实英雄实例后打开详情；关闭、空槽和未获得项不执行导航。 */
    private onSelect(hero: HeroCellModel): void {
        if (this.closed || hero.kind !== "owned" || !hero.instanceId) {
            return;
        }
        void UIManager.instance.open(HeroInfoView, { heroId: hero.instanceId })
            .catch(error => UIManager.instance.toast(ErrorUtils.messageOf(error)));
    }

    /** 只保留一份等待激活的帧回调，实际显示后立即解除并绘制。 */
    private watchShown(): void {
        if (this.shownWatch) {
            return;
        }
        this.shownWatch = () => {
            if (!this.node?.isValid || this.closed) {
                this.clearShownWatch();
            } else if (this.node.activeInHierarchy) {
                this.clearShownWatch();
                this.refresh();
            }
        };
        director.on(Director.EVENT_AFTER_UPDATE, this.shownWatch);
    }

    /** 显示、关闭或销毁时停止等待，重复执行安全。 */
    private clearShownWatch(): void {
        if (this.shownWatch) {
            director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
            this.shownWatch = null;
        }
    }

    /** 改变筛选后回到列表起点；普通同步刷新继续保留滚动位置。 */
    private pickElem(id: number): void {
        if (this.closed || id === this.elem) {
            return;
        }
        this.elem = id;
        this.refresh();
        this.heroScroll!.toStart();
    }

    /** 每次打开登记业务按钮，关闭由BaseView统一解除，不改变固定几何。 */
    private bindButtons(): void {
        const bind = (button: Button | null, action: () => void) => {
            if (!button) {
                return;
            }
            button.node.on(Button.EventType.CLICK, action);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, action));
        };
        bind(this.lineupButton, () => {
            void UIManager.instance.openById("remake-formation", { complete: () => {} })
                .catch(error => UIManager.instance.toast(ErrorUtils.messageOf(error)));
        });
        bind(this.btnHero, () => UIManager.instance.toast("英雄数据随登录和重连自动同步，请等待连接恢复"));
        this.elemButtons.forEach((button, index) => bind(button, () => this.pickElem(index)));
        if (this.btnHero) {
            ResManager.setSprite(this.btnHero.node, [ResManager.ui("common", "button_btn-tab-24")]);
        }
    }
}
