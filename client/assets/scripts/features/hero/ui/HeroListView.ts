/**
 * 英雄名册页面：完整Prefab保存背景、纸面、页签及唯一列表板，不再加载壳或拼装页面。
 * 读取HeroRosterModel的只读投影，操作转交阵容/详情入口；关页只清理本页监听。
 * 固定布局与Widget由Prefab维护，可见区域桥接与统一容器比例不参与名册状态。
 */
import { _decorator, Button, director, Director, Node } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { ResManager } from "../../../framework/assets/ResManager";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { messageOf } from "../../../core/errors";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterController } from "../HeroRosterController";
import { HeroRosterUtils } from "../utils/HeroRosterUtils";
import { HeroCatalog } from "../utils/HeroCatalog";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroListBoardView } from "./HeroListBoardView";
import { heroCellLine } from "./HeroListPresentation";
import type { HeroRosterSource, HeroRosterView } from "../data/HeroRosterData";

const { ccclass, property } = _decorator;

@view({
    id: "hero",
    prefab: "bundles/hero/prefabs/HeroListView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("HeroListView")
export class HeroListView extends BaseView implements HeroRosterView {
    /** 主线阵容按钮，只打开草稿页，不直接保存阵容或发起挑战。 */
    @property(Button) lineupButton: Button | null = null;
    /** 当前英雄页签，点击只说明同步状态，不发送额外查询。 */
    @property(Button) btnHero: Button | null = null;
    /** 完整Prefab中的唯一列表板节点，不再绑定另一个需运行实例化的Prefab。 */
    @property(Node) boardRoot: Node | null = null;

    /** 当前元素筛选；0表示全部，页面实例创建时初始化。 */
    private elem = 0;
    /** 已校验的静态列表组件；首次开页取得，随本页节点销毁。 */
    private board: HeroListBoardView | null = null;
    /** 是否完成首次绑定，重复打开不再装配列表或创建节点。 */
    private opened = false;
    /** 列表尺寸和静态绑定是否已在显示后通过校验。 */
    private scrollReady = false;
    /** 等待页面实际激活的一份帧回调；完成或关页清空。 */
    private shownWatch: (() => void) | null = null;
    /** 页面注入的只读名册源，缺少时由默认模块配置。 */
    private roster: HeroRosterSource | null = null;
    /** 关闭后拒绝刷新和筛选回调，重开时恢复。 */
    private closed = true;
    /** 默认装配的英雄模块引用，不由页面创建或销毁。 */
    private rosterModule: HeroRosterController | null = null;

    /** 只把完整根铺到可见画布；Content的比例和所有静态布局由Prefab组件处理。 */
    public onCreate(): void {
        bindVisibleRefresh(this.node, () => fitVisibleRoot(this.node));
    }

    /** 注入唯一Model的展示投影和操作；页面不持有额外名册、查询或模块生命周期。 */
    public configureRoster(model: HeroRosterModel, controller: HeroRosterController, catalog: HeroCatalog,
        notice: (text: string) => void, openHero?: (id: string) => void): void {
        this.rosterModule = controller;
        this.useRoster({
            read: elem => HeroRosterUtils.present(model.snapshot, catalog, elem),
            retry: () => {
                if (!this.closed) {
                    notice("英雄数据随登录和重连自动同步，请等待连接恢复");
                }
            },
            select: cell => {
                if (this.closed) {
                    return;
                }
                if (openHero && cell.instanceId) {
                    openHero(cell.instanceId);
                } else {
                    notice(cell.name + " Lv" + cell.level + "，详情暂未开放");
                }
            },
        });
    }

    /** 首次开页前设置只读源；不允许已显示的实例更换另一份数据所有者。 */
    public useRoster(source: HeroRosterSource): void {
        if (this.opened) {
            throw new Error("英雄数据源必须在开页前注入");
        }
        this.roster = source;
    }

    /** 收到名册通知后读取当前状态，已关闭实例不再绘制。 */
    public refreshRoster(): void {
        if (!this.closed) {
            this.refresh();
        }
    }

    /** 打开静态列表，登记本页交互并绘制当前名册；不创建壳、纸面或列表板。 */
    public onOpen(): void {
        if (!this.roster) {
            this.configureRoster(HeroRosterModel.instance, HeroRosterController.instance,
                new HeroCatalog(GameConfig.instance.getFile(GConfig.HeroType), GameConfig.instance.getFile(GConfig.Item)),
                text => UIManager.instance.toast(text), id => {
                    void UIManager.instance.openById("hero-info", { heroId: id })
                        .catch(error => UIManager.instance.toast(messageOf(error)));
                });
        }
        if (this.opened && !this.closed) {
            this.refresh();
            return;
        }
        this.closed = false;
        if (this.rosterModule) {
            EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refreshRoster);
        }
        this.bindButtons();
        if (!this.opened) {
            this.beginOpen();
            this.opened = true;
            try {
                this.board = this.boardRoot?.getComponent(HeroListBoardView) || null;
                if (!this.board) {
                    throw new Error("HeroListView缺少静态HeroListBoardView绑定");
                }
                this.board.bindElem(id => this.pickElem(id));
                this.primeCapacity();
                this.refresh();
                this.finishOpen();
            } catch (error) {
                this.failOpen(error instanceof Error ? error : new Error(messageOf(error)));
            }
            return;
        }
        this.refresh();
    }

    /** 关闭后解除名册和等待显示的帧监听，唯一模块状态仍然有效。 */
    public onClose(): void {
        this.closed = true;
        EventDispatcher.instance.offTarget(this);
        this.failOpen(new Error("页面已关"));
        this.clearShownWatch();
    }

    /** 根激活时绘制已有静态列表，不另生成板子。 */
    public onEnable(): void {
        if (this.board) {
            this.refresh();
        }
    }

    /** 读取当前筛选的名册投影；未注入数据源时拒绝显示假数据。 */
    private readModel() {
        if (!this.roster) {
            throw new Error("HeroListView需要当前角色名册源");
        }
        return this.roster.read(this.elem);
    }

    /** 静态列表挂载前先覆盖容量和同步提示，避免闪出Prefab中的历史占位值。 */
    private primeCapacity(): void {
        const model = this.readModel();
        this.board!.setCapacity(model.capacityLine);
        this.board!.setEmpty(model.emptyText);
    }

    /** 在页面激活后校验列表，再把数据交给SuperContent；不手排格子或改变视口尺寸。 */
    private refresh(): void {
        if (this.closed || !this.node?.isValid || !this.board) {
            return;
        }
        if (!this.node.activeInHierarchy) {
            this.watchShown();
            return;
        }
        if (!this.scrollReady) {
            this.scrollReady = this.board.prepare();
        }
        if (!this.scrollReady) {
            this.watchShown();
            return;
        }
        const board = this.board;
        board.markElem(this.elem);
        const model = this.readModel();
        board.setCapacity(model.capacityLine);
        board.setEmpty(model.emptyText);
        board.scroll.list.setData(model.cells, (node, face) => {
            const cell = node.getComponent(HeroIconCellView);
            if (!cell) {
                throw new Error("HeroIconCellView Prefab缺少格子组件");
            }
            cell.show(face, heroCellLine(face) ? () => this.roster?.select(face) : null);
        });
    }

    /** 只登记一份等待激活的回调，完成后立即解除。 */
    private watchShown(): void {
        if (this.shownWatch) {
            return;
        }
        this.shownWatch = () => {
            if (!this.node?.isValid) {
                this.clearShownWatch();
            } else if (this.node.activeInHierarchy) {
                this.clearShownWatch();
                this.refresh();
            }
        };
        director.on(Director.EVENT_AFTER_UPDATE, this.shownWatch);
        this.node.once(Node.EventType.NODE_DESTROYED, () => this.clearShownWatch());
    }

    /** 关闭、显示成功或销毁时解除等待，重复调用安全。 */
    private clearShownWatch(): void {
        if (this.shownWatch) {
            director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
            this.shownWatch = null;
        }
    }

    /** 改变当前筛选后回到列表开头；普通同步刷新保留滚动位置。 */
    private pickElem(id: number): void {
        if (this.closed || id === this.elem) {
            return;
        }
        this.elem = id;
        this.refresh();
        this.board?.scroll.toStart();
    }

    /** 绑定Prefab中现有按钮；关闭由BaseView统一解除，不在运行时改变菜单几何。 */
    private bindButtons(): void {
        if (this.lineupButton) {
            const button = this.lineupButton;
            const open = () => {
                void UIManager.instance.openById("remake-formation", { complete: () => {} })
                    .catch(error => UIManager.instance.toast(messageOf(error)));
            };
            button.node.on(Button.EventType.CLICK, open);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, open));
        }
        if (this.btnHero) {
            const button = this.btnHero;
            const retry = () => this.roster?.retry();
            button.node.on(Button.EventType.CLICK, retry);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, retry));
            ResManager.setSprite(button.node, [ResManager.ui("common", "button_btn-tab-24")]);
        }
    }
}
