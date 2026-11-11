/**
 * 背包页面：展示 BagModel 当前角色库存；分类与只读详情由页面处理，库存由 BagController 接收协议更新。
 * Prefab 保存静态布局；页面关闭清理目标事件和按钮，模块库存独立存活。
 * 短期缓存实例由UIManager限时、限量保留；重开重新读取Model，静态资源不随实例淘汰。
 */
import { UILayer } from "../../../framework/ui/UILayer";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { prepareInventoryConfig } from "../../../config/RemakeConfig";

import { _decorator, Button, director, Director, Label, Layers, Node, Prefab, UITransform } from "cc";
import { BagTabKind } from "../data/BagTabKind";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BAG_TABS, BagUtils } from "../utils/BagUtils";
import { BagModel } from "../BagModel";
import type { BagListItem } from "../data/BagItemData";
import { BagEvent } from "../utils/BagEvent";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BagItemCatalog } from "../utils/BagItemCatalog";

import { spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { mountNamedSpine } from "../../battle/ui/battleSpine";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { BagItemView } from "./BagItemView";
import { BagTabView } from "./BagTabView";
import { BaseView } from "../../../framework/ui/BaseView";
import { BagInfoView } from "./BagInfoView";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { isOpenCancelled, UIManager } from "../../../framework/ui/UIManager";
import { view, viewSpecOf } from "../../../framework/ui/UIRegistry";

const { ccclass, property } = _decorator;


/** 打开背包时的可选展示参数，不携带角色身份或库存。 */
export interface BagOpenArgs {
    /** 显示分类；打开参数可覆盖默认道具分类，点击页签只改变展示。 */
    tab?: BagTabKind;
}

/** 背包数据与选中态展示；通用 SuperContent 负责列表布局。 */
@view({
    id: "bag",
    prefab: "bundles/module/bag/prefabs/BagView",
    layer: UILayer.Page,
    cache: true,
    allowMultiple: false,
    prepare: prepareInventoryConfig,
})
@ccclass("BagView")
export class BagView extends BaseView<BagOpenArgs> {
    /** 店员骨骼名，页面显示和模块准备共用；不属于玩家英雄立绘。 */
    public static readonly shopkeeperSkeleton = "shangcheng";

    /** Prefab 绑定的 SuperScroll，负责格子复用与滚动；缺失时拒绝打开。 */
    @property(SuperScroll)
    bagScroll: SuperScroll | null = null;

    /** 页签实例的父节点，由 Prefab 绑定。 */
    @property(Node)
    tabContent: Node | null = null;

    /** 店员气泡节点，显示同步提示时激活。 */
    @property(Node)
    bubble: Node | null = null;

    /** 店员提示文本，按同步状态和库存是否为空更新。 */
    @property(Label)
    talk: Label | null = null;

    /** 店员 Spine 挂载节点，每个页面实例只装配一次。 */
    @property(Node)
    portrait: Node | null = null;

    /** 页面关闭按钮，打开时绑定，页面监听释放时解绑。 */
    @property(Button)
    btnClose: Button | null = null;

    /** 分类页签预制体，缺失时拒绝打开。 */
    @property(Prefab)
    tabPrefab: Prefab | null = null;

    /** 显示分类；打开参数可覆盖默认道具分类，点击页签只改变展示。 */
    private tab: BagTabKind = "item";
    /** 当前选中的格子 key（堆叠记录或期限实例）；条目消失、离开当前分类或关页后清空。 */
    private pickedId: string | null = null;
    /** 下次需隐藏过期格子的服务器秒，无期限格子时为无穷大。 */
    private nextExpiry = Infinity;
    /** 本页静态配置索引，初始化时创建，不保存数量；未初始化为 null。 */
    private catalog: BagItemCatalog | null = null;
    /** 本页创建的分类组件，刷新时同步选中态，随页面节点销毁。 */
    private tabs: BagTabView[] = [];
    /** 是否已创建页签，避免重复实例化。 */
    private tabsBuilt = false;
    /** 是否已执行首次打开；后续 onOpen 只刷新已有内容。 */
    private opened = false;
    /** 是否已装配店员动画，避免重复挂载。 */
    private portraitOn = false;
    /** 下次绘制是否需回到顶部；换分类或关页时设置，首次打开默认复位，执行后清除。 */
    private resetScroll = true;
    /** 等待节点激活的帧回调；显示成功、销毁或关页时解除并清空。 */
    private shownWatch: (() => void) | null = null;
    /** 页面是否已关闭；为 true 时阻止后续刷新与异步展示。 */
    private closed = false;
    /** 关闭按钮是否已绑定；监听释放时重置。 */
    private closeBound = false;
    /** 当前打开周期是否已登记列表事件；关闭统一释放后恢复false，防止缓存重开重复登记。 */
    private listBound = false;
    /** 当前分类没有可见物品时为true，空槽允许点击显示原空包提示；每次绘制重新计算。 */
    private emptyTab = true;

    /** 收到库存汇总通知后读取当前 Model；已关闭界面不再刷新。 */
    refreshFromModel(): void {
        if (!this.closed) this.refreshGrid();
    }

    /** 同步状态变化仅更新提示，不重复提交库存或重绘列表。 */
    private onSyncStateChanged(): void {
        if (!this.closed && this.catalog) this.writeTalk();
    }

    /** 每次打开重新登记监听并读取最新库存；无参数仍默认道具分类，不沿用旧实例的分类。 */
    onOpen(args?: BagOpenArgs): void {
        this.closed = false;
        this.args = args;
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshFromModel);
        EventDispatcher.instance.on(BagEvent.BagSyncStateChanged, this, this.onSyncStateChanged);
        this.bindClose();
        this.bindList();
        this.tab = args?.tab || "item";
        if (this.opened) {
            this.refreshGrid();
            return;
        }
        this.opened = true;
        this.beginOpen();
        void this.initialize();
    }

    /** 清空选中与滚动状态，关闭详情与帧等待；全局事件由 BaseView 按目标清理。 */
    onClose(): void {
        this.closed = true;
        this.pickedId = null;
        this.resetScroll = true;
        this.failOpen(new Error("页面已关"));
        this.dismissInfo();
        this.clearShownWatch();
    }

    /** 校验业务控件并读取配置；固定布局、内容比例和居中由Prefab及通用组件维护。 */
    private async initialize(): Promise<void> {
        try {
            this.validateBindings();
            bindVisibleRefresh(this.node, () => {
                // 闲置缓存仍保留节点；屏幕变化时不布局隐藏页，重新显示再适配。
                if (!this.closed && this.node.activeInHierarchy) {
                    fitVisibleRoot(this.node);
                }
            });
            this.catalog = new BagItemCatalog(GameConfig.instance.getFile(GConfig.Item),
                GameConfig.instance.getFile(GConfig.Language), GameConfig.instance.getFile(GConfig.TimeLimitItem));
            this.dressPortrait();
            if (this.closed || !this.node || !this.node.isValid) {
                this.failOpen(new Error("页面已关"));
                return;
            }
            this.refreshGrid();
            this.finishOpen();
        } catch (err) {
            GameLog.shared.classified("MODULE", "warn", "Bag", "背包没有挂上 " + messageOf(err));
            this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
        }
    }

    /** 挂载且激活后按当前屏幕适配并刷新最新库存；闲置重开也重新计算布局。 */
    private refreshGrid(): void {
        if (this.closed) return;
        if (!this.node || !this.node.isValid || !this.bagScroll || !this.tabPrefab) return;
        if (!this.node.activeInHierarchy) {
            this.watchShown();
            return;
        }
        fitVisibleRoot(this.node);
        this.buildTabs();
        this.paint();
    }

    /** 等待节点激活，注册唯一帧回调；激活后先解除等待再刷新。 */
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

    /** 解除等待页面激活的帧监听，重复调用安全。 */
    private clearShownWatch(): void {
        if (!this.shownWatch) return;
        director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
        this.shownWatch = null;
    }

    /** 校验 BagView 和格子资源绑定，缺失时报告资源路径与字段。 */
    private validateBindings(): void {
        const path = "assets/bundles/module/bag/prefabs/BagView.prefab / BagView: ";
        for (const [field, value] of Object.entries({
            bagScroll: this.bagScroll, tabContent: this.tabContent,
            tabPrefab: this.tabPrefab
        })) {
            if (!value) throw new Error(path + "缺失绑定 " + field);
        }
        this.bagScroll!.validateBindings();
        const cell = this.bagScroll!.list.cellPrefab!.data as Node;
        const component = cell.getComponent(BagItemView);
        if (!component) throw new Error(path + "bagScroll.Content.SuperContent.cellPrefab [" + cell.name + "] 缺少 BagItemView");
        component.validateBindings();
    }

    /** 登记一次关闭按钮回调，交给 BaseView 统一释放。 */
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

    /** 每个打开周期登记渲染和选择；复用格子只替换数据，不持有本页回调。 */
    private bindList(): void {
        if (!this.bagScroll || this.listBound) {
            return;
        }
        this.listBound = true;
        const content = this.bagScroll.list.node;
        content.on(SuperContent.RENDER_ITEM, this.onRender, this);
        content.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.onRender, this);
                content.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
            this.listBound = false;
        });
    }

    /** 在既有立绘节点装配背包动画，每个页面实例只装配一次。 */
    private dressPortrait(): void {
        if (!this.portrait) {
            GameLog.shared.classified("MODULE", "warn", "Bag", "BagView 没有 node_portrait");
            return;
        }
        if (this.portraitOn) return;
        this.portraitOn = true;
        this.portrait.active = true;
        mountNamedSpine(this.portrait, BagView.shopkeeperSkeleton, "act");
    }

    /** 显示同步结果及缓存库存提示；重连由传输层自动处理，不诱导重复查询。 */
    private writeTalk(): void {
        if (this.bubble) this.bubble.active = true;
        if (!this.talk) return;
        this.talk.node.active = true;
        const state = BagModel.instance.snapshot;
        this.talk.string = state.status === "idle" ? "背包尚未同步"
            : state.items.length ? this.catalog!.greeting : "背包为空";
    }

    /** 根据现有分类生成页签，点击只切换显示分类，不查询库存。 */
    private buildTabs(): void {
        if (this.tabsBuilt || !this.tabContent || !this.tabPrefab) return;
        this.tabsBuilt = true;
        for (let i = 0; i < BAG_TABS.length; i++) {
            const spec = BAG_TABS[i];
            const node = spawnPrefab(this.tabPrefab, this.tabContent);
            const tab = node.getComponent(BagTabView);
            if (!tab) {
                GameLog.shared.classified("MODULE", "warn", "Bag", "BagTabButton 上没有 BagTabView");
                continue;
            }
            node.setPosition(64 + i * 120, -24, 0);
            this.adoptLayer(node, this.tabContent.layer || Layers.Enum.UI_2D);
            tab.setTab(spec.title, spec.id === this.tab, () => {
                if (this.closed) return;
                if (this.tab !== spec.id) this.resetScroll = true;
                this.tab = spec.id;
                this.refreshGrid();
            });
            this.tabs.push(tab);
        }
    }

    /** 读取 Model 绘制页签与格子，处理选中失效及滚动复位；详情独立监听库存变化。 */
    private paint(): void {
        this.writeTalk();
        for (let i = 0; i < this.tabs.length; i++) {
            this.tabs[i].setSelected(BAG_TABS[i].id === this.tab);
        }
        const list = this.bagScroll!.list;
        const rows = this.visibleItems();
        this.emptyTab = rows.length === 0;
        const picked = rows.find(item => item.key === this.pickedId);
        this.nextExpiry = rows.reduce((next, item) => Math.min(next, item.expiresAtSeconds ?? Infinity), Infinity);
        if (!picked) {
            this.pickedId = null;
            this.dismissInfo();
        }
        // 空槽补齐属于背包展示规则，通用列表只接收条目，不决定业务槽数。
        const entries = Array.from({ length: BagUtils.slotCount(rows.length) }, (_, index) => rows[index] || null);
        list.setData(entries);
        if (this.resetScroll) {
            this.bagScroll!.toStart();
            this.resetScroll = false;
        }
    }

    /** 列表创建或复用格子时只绘制当前条目，空分类保留20个可提示的空槽。 */
    private onRender(node: Node, item: BagListItem | null): void {
        if (this.closed) {
            return;
        }
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("BagItemView预制体缺少物品格组件");
        }
        const selected = item !== null && item.key === this.pickedId;
        cell.show(item, selected, item ? this.catalog!.face(item.itemId, item.quantity) : undefined,
            item !== null || this.emptyTab);
    }

    /** 选择当前条目后再次核对最新库存键；过期或已移除物品不打开详情。 */
    private onSelect(item: BagListItem | null): void {
        if (this.closed) {
            return;
        }
        const rows = this.visibleItems();
        if (!item) {
            if (!rows.length) {
                this.toast(BagModel.instance.snapshot.status === "ready" ? BagUtils.emptyToast() : "背包尚未同步");
            }
            return;
        }
        const current = rows.find(row => row.key === item.key);
        if (!current) {
            return;
        }
        this.pickedId = current.key;
        this.showInfo(current);
        this.refreshGrid();
    }

    /** 按配置筛选库存并恢复普通道具排序；隐藏条目与服务器原始顺序仍由 Model 完整持有。 */
    visibleItems(): readonly BagListItem[] {
        if (!this.catalog) return [];
        const state = BagModel.instance.snapshot;
        return this.catalog.list(state.items, state.timedItems, this.tab, BagModel.instance.serverTimeSeconds());
    }

    /** 通过页面管理器打开独立详情；合并加载期间的重复点击，最终只展示仍选中的条目。 */
    private showInfo(item: Readonly<BagListItem>): void {
        const args = { source: "inventory" as const, key: item.key, tab: this.tab };
        void UIManager.instance.open(BagInfoView, args).then(detail => {
            if (!this.closed && this.pickedId === item.key) {
                detail.runOpen(args);
            }
        }).catch(error => {
            // 取消由页面管理器处理；真实加载失败也已在该边界统一记录和提示。
            if (!isOpenCancelled(error) && !this.closed) {
                this.pickedId = null;
            }
        });
    }

    /** 到达下一件物品期限才重绘格子；关闭页面停止处理，不发补查或修改库存。 */
    update(dt: number): void {
        if (this.closed) return;

        const now = BagModel.instance.serverTimeSeconds();
        if (now !== null && now >= this.nextExpiry) this.refreshGrid();
    }

    /** 关闭独立详情，连同尚未完成的打开一起取消；不直接销毁其他窗口节点。 */
    private dismissInfo(): void {
        UIManager.instance.closeById(viewSpecOf(BagInfoView)!.id);
    }

    /** 写入页面提示日志并交由 UIManager 展示。 */
    private toast(text: string): void {
        GameLog.shared.classified("MODULE", "info", "Bag", text);
        UIManager.instance.toast(text);
    }

    /** 格子和页签的子节点也要留在 UI 层，只改根节点时图标不会画出来。 */
    private adoptLayer(node: Node, layer: number): void {
        node.layer = layer;
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) this.adoptLayer(kids[i], layer);
    }
}
