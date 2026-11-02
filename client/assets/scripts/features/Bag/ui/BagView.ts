/**
 * 背包页面：展示 BagModel 当前角色库存，将操作交给 BagController。
 * Prefab 保存静态布局；页面关闭清理目标事件和按钮，模块库存独立存活。
 */
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";

import {_decorator, Button, director, Director, Label, Layers, Node, Prefab, UITransform} from "cc";
import {BagTabKind} from "../data/BagTabKind";
import {messageOf} from "../../../core/errors";
import {GameLog} from "../../../core/GameLog";
import {
    BAG_TABS,
    bagSlotCount,
} from "./BagPresentation";
import {BagController} from "../BagController";
import {BagModel} from "../BagModel";
import type {BagItemData} from "../data/BagItemData";
import {BagEvent} from "../BagEvent";
import {EventDispatcher} from "../../../framework/EventDispatcher";
import {BagItemCatalog} from "../BagItemCatalog";

import {emptyBagToast} from "./BagPresentation";
import {spawnPrefab} from "../../../framework/assets/PrefabLoader";
import {mountNamedSpine} from "../../battle/ui/battleSpine";
import {SuperScroll} from "../../../framework/ui/SuperScroll";
import {BagItemView} from "./BagItemView";
import {BagTabView} from "./BagTabView";
import {BaseView} from "../../../framework/ui/BaseView";
import {mountBagPage, openBagInfo} from "./BagMount";
import {UILayer} from "../../../framework/ui/UILayer";
import {UIManager} from "../../../framework/ui/UIManager";
import {view} from "../../../framework/ui/UIRegistry";

const {ccclass, property} = _decorator;

const BAG_PORTRAIT = "shangcheng";

export interface BagOpenArgs {
    tab?: BagTabKind;
}

/** 背包数据与选中态展示；通用 SuperContent 负责列表布局。 */
@view({
    id: "bag",
    prefab: ResourceCatalog.prefab_Bag.BagView.assetPath,
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
    mount: mountBagPage,
})
@ccclass("BagView")
export class BagView extends BaseView<BagOpenArgs> {
    @property(Node)
    sprBox: Node | null = null;

    @property(SuperScroll)
    bagScroll: SuperScroll | null = null;

    @property(Node)
    tabContent: Node | null = null;

    @property(Node)
    bubble: Node | null = null;

    @property(Label)
    talk: Label | null = null;

    @property(Node)
    portrait: Node | null = null;

    @property(Node)
    hitMenu: Node | null = null;

    @property(Button)
    btnClose: Button | null = null;

    @property(Prefab)
    tabPrefab: Prefab | null = null;

    @property(Prefab)
    infoPrefab: Prefab | null = null;

    @property(Prefab)
    dimPrefab: Prefab | null = null;

    private tab: BagTabKind = "item";
    private pickedId: number | null = null;
    private lastRoleKey: string | null = null;
    private detailQuantity: number | null = null;
    private catalog: BagItemCatalog | null = null;
    private tabs: BagTabView[] = [];
    private tabsBuilt = false;
    private opened = false;
    private portraitOn = false;
    private resetScroll = true;
    private infoSheet: Node | null = null;
    private shownWatch: (() => void) | null = null;
    private closed = false;
    private closeBound = false;

    /** 收到库存汇总通知后读取当前 Model；已关闭界面不再刷新。 */
    refreshFromModel(): void {
        if (!this.closed) this.refreshGrid();
    }

    /** 同步状态变化仅更新提示，不重复提交库存或重绘列表。 */
    private onSyncStateChanged(): void {
        if (!this.closed && this.catalog) this.writeTalk();
    }

    /** 打开先登记目标监听，再读取当前库存，保证关闭期间的奖励更新可见。 */
    onOpen(args?: BagOpenArgs): void {
        this.closed = false;
        this.args = args;
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshFromModel);
        EventDispatcher.instance.on(BagEvent.BagSyncStateChanged, this, this.onSyncStateChanged);
        this.bindClose();
        if (args && args.tab) this.tab = args.tab;
        if (this.opened) {
            this.refreshGrid();
            return;
        }
        this.opened = true;
        this.beginOpen();
        void this.initialize();
    }

    /** 关闭详情与帧等待；全局事件由 BaseView 按目标清理。 */
    onClose(): void {
        this.closed = true;
        this.failOpen(new Error("页面已关"));
        this.dismissInfo();
        this.clearShownWatch();
    }

    /** 校验绑定并读取统一配置快照，失败通过页面打开 Promise 报告。 */
    private async initialize(): Promise<void> {
        try {
            this.validateBindings();
            this.catalog = new BagItemCatalog(GameConfig.instance.getFile(GConfig.Item),
                GameConfig.instance.getFile(GConfig.Language));
            this.dressPortrait();
            if (this.closed || !this.node || !this.node.isValid) {
                this.failOpen(new Error("页面已关"));
                return;
            }
            this.refreshGrid();
            this.finishOpen();
        } catch (err) {
            GameLog.shared.warn("Bag", "背包没有挂上 " + messageOf(err));
            this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
        }
    }

    /** Layout runs after mounting; no reparenting, mask creation or size repair. */
    private refreshGrid(): void {
        if (this.closed) return;
        if (!this.node || !this.node.isValid || !this.bagScroll || !this.tabPrefab) return;
        if (!this.node.activeInHierarchy) {
            this.watchShown();
            return;
        }
        this.buildTabs();
        this.paint();
    }

    private watchShown(): void {
        if (this.shownWatch) return;
        const retry = () => {
            if (!this.node || !this.node.isValid) {
                this.clearShownWatch();
                return;
            }
            if (!this.node.activeInHierarchy) return;
            this.clearShownWatch();
            this.refreshGrid();
        };
        this.shownWatch = retry;
        director.on(Director.EVENT_AFTER_UPDATE, retry);
        this.node.once(Node.EventType.NODE_DESTROYED, () => this.clearShownWatch());
    }

    private clearShownWatch(): void {
        if (!this.shownWatch) return;
        director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
        this.shownWatch = null;
    }

    /** 校验 BagView 和格子资源绑定，缺失时报告资源路径与字段。 */
    private validateBindings(): void {
        const path = "assets/prefabs/ui/Bag/BagView.prefab / BagView: ";
        for (const [field, value] of Object.entries({
            bagScroll: this.bagScroll, tabContent: this.tabContent,
            tabPrefab: this.tabPrefab, infoPrefab: this.infoPrefab, dimPrefab: this.dimPrefab
        })) {
            if (!value) throw new Error(path + "缺失绑定 " + field);
        }
        this.bagScroll!.validateBindings();
        const cell = this.bagScroll!.list.cellPrefab!.data as Node;
        const component = cell.getComponent(BagItemView);
        if (!component) throw new Error(path + "bagScroll.Content.SuperContent.cellPrefab [" + cell.name + "] 缺少 BagItemView");
        component.validateBindings();
    }

    private bindClose(): void {
        if (!this.btnClose || this.closeBound) return;
        this.closeBound = true;
        const close = () => this.close();
        this.btnClose.node.on(Button.EventType.CLICK, close);
        this.ownListener(() => {
            this.btnClose?.node.off(Button.EventType.CLICK, close);
            this.closeBound = false;
        });
    }

    /** 在既有立绘节点装配背包动画，每个页面实例只装配一次。 */
    private dressPortrait(): void {
        if (!this.portrait) {
            GameLog.shared.warn("Bag", "BagView 没有 node_portrait");
            return;
        }
        if (this.portraitOn) return;
        this.portraitOn = true;
        this.portrait.active = true;
        mountNamedSpine(this.portrait, BAG_PORTRAIT, "act");
    }

    private writeTalk(): void {
        if (this.bubble) this.bubble.active = true;
        if (!this.talk) return;
        this.talk.node.active = true;
        const state = BagModel.instance.snapshot;
        this.talk.string = state.status === "idle" ? "背包尚未同步"
            : state.status === "loading" ? "正在同步背包…"
                : state.status === "error" ? state.error + (state.synced ? "，显示上次库存" : "") + "，点击分类重试"
                    : state.items.length ? this.catalog!.greeting : "背包为空";
    }

    /** 根据现有分类生成页签，点击只切换显示分类并按需重试查询。 */
    private buildTabs(): void {
        if (this.tabsBuilt || !this.tabContent || !this.tabPrefab) return;
        this.tabsBuilt = true;
        for (let i = 0; i < BAG_TABS.length; i++) {
            const spec = BAG_TABS[i];
            const node = spawnPrefab(this.tabPrefab, this.tabContent);
            const tab = node.getComponent(BagTabView);
            if (!tab) {
                GameLog.shared.warn("Bag", "BagTabButton 上没有 BagTabView");
                continue;
            }
            node.setPosition(64 + i * 120, -24, 0);
            this.adoptLayer(node, this.tabContent.layer || Layers.Enum.UI_2D);
            tab.setTab(spec.title, spec.id === this.tab, () => {
                if (this.closed) return;
                if (this.tab !== spec.id) this.resetScroll = true;
                this.tab = spec.id;
                if (BagModel.instance.snapshot.status === "error") void BagController.instance.refresh();
                this.refreshGrid();
            });
            this.tabs.push(tab);
        }
    }

    private paint(): void {
        this.writeTalk();
        for (let i = 0; i < this.tabs.length; i++) {
            this.tabs[i].setSelected(BAG_TABS[i].id === this.tab);
        }
        const list = this.bagScroll!.list;
        const state = BagModel.instance.snapshot;
        if (state.roleKey !== this.lastRoleKey) {
            this.lastRoleKey = state.roleKey;
            this.pickedId = null;
            this.resetScroll = true;
            this.dismissInfo();
        }
        const rows = this.visibleItems();
        const picked = this.pickedId === null ? null : BagModel.instance.getItem(this.pickedId);
        if (!picked || !rows.some(item => item.itemId === this.pickedId)) {
            this.pickedId = null;
            this.dismissInfo();
        } else if (this.infoSheet?.isValid && this.detailQuantity !== picked.quantity) this.showInfo(picked);
        // Empty-slot padding belongs to the bag, never to the generic list component.
        const entries = Array.from({length: bagSlotCount(rows.length)}, (_, index) => rows[index] || null);
        list.setData(entries, (node, item) => {
            const cell = node.getComponent(BagItemView)!;
            const selected = item !== null && item.itemId === this.pickedId;
            const onTap = item
                ? () => {
                    if (this.closed) return;
                    const current = BagModel.instance.getItem(item.itemId);
                    if (!current) return;
                    this.pickedId = current.itemId;
                    this.showInfo(current);
                    this.refreshGrid();
                }
                : rows.length === 0
                    ? () => {
                        if (BagModel.instance.snapshot.status === "error") void BagController.instance.refresh();
                        else this.toast(BagModel.instance.snapshot.status === "ready" ? emptyBagToast() : "背包尚未同步");
                    }
                    : null;
            cell.show(item, selected, onTap, item ? this.catalog!.face(item.itemId, item.quantity) : undefined);
        });
        if (this.resetScroll) {
            this.bagScroll!.toStart();
            this.resetScroll = false;
        }
    }

    /** 按配置的可见性和当前标签筛选库存；隐藏条目仍由 Model 完整持有。 */
    visibleItems(): readonly BagItemData[] {
        if (!this.catalog) return [];
        return BagModel.instance.items.filter(item => {
            const face = this.catalog!.face(item.itemId, item.quantity);
            return !face.hiddenInBag && face.category === this.tab;
        });
    }

    /** 从当前库存打开只读详情，数量变化时重新展示。 */
    private showInfo(item: Readonly<BagItemData>): void {
        if (!this.infoPrefab || !this.dimPrefab) {
            GameLog.shared.warn("Bag", "背包详情预制没有绑定");
            return;
        }
        this.dismissInfo();
        this.detailQuantity = item.quantity;
        this.infoSheet = openBagInfo(this.node, this.dimPrefab, this.infoPrefab, this.catalog!.face(item.itemId, item.quantity), (text) => this.toast(text));
    }

    private dismissInfo(): void {
        if (this.infoSheet && this.infoSheet.isValid) {
            this.infoSheet.removeFromParent();
            this.infoSheet.destroy();
        }
        this.infoSheet = null;
        this.detailQuantity = null;
    }

    private toast(text: string): void {
        GameLog.shared.info("Bag", text);
        UIManager.instance.toast(text);
    }

    /** 格子和页签的子节点也要留在 UI 层，只改根节点时图标不会画出来。 */
    private adoptLayer(node: Node, layer: number): void {
        node.layer = layer;
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) this.adoptLayer(kids[i], layer);
    }
}

