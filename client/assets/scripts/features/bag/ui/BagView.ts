/**
 * 背包页面：展示 BagModel 当前角色库存；分类与只读详情由页面处理，库存由 BagController 接收协议更新。
 * Prefab 保存静态布局；页面关闭清理目标事件和按钮，模块库存独立存活。
 */
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";

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
import { BagItemView } from "./BagItemView";
import { BagTabView } from "./BagTabView";
import { BaseView } from "../../../framework/ui/BaseView";
import { mountBagPage, openBagInfo } from "./BagMount";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";

const { ccclass, property } = _decorator;

/** 店员动画资源名，仅用于页面装饰。 */
const BAG_PORTRAIT = "shangcheng";

/** 打开背包时的可选展示参数，不携带角色身份或库存。 */
export interface BagOpenArgs {
    /** 显示分类；打开参数可覆盖默认道具分类，点击页签只改变展示。 */
    tab?: BagTabKind;
}

/** 背包数据与选中态展示；通用 SuperContent 负责列表布局。 */
@view({
    id: "bag",
    prefab: ResourceCatalog.prefab_bag.BagView.assetPath,
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
    mount: mountBagPage,
})
@ccclass("BagView")
export class BagView extends BaseView<BagOpenArgs> {
    /** 旧纸张背景的 Prefab 绑定，当前页面不运行时重建其布局。 */
    @property(Node)
    sprBox: Node | null = null;

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

    /** 保留旧 Prefab 交互节点绑定，当前页面逻辑不使用。 */
    @property(Node)
    hitMenu: Node | null = null;

    /** 页面关闭按钮，打开时绑定，页面监听释放时解绑。 */
    @property(Button)
    btnClose: Button | null = null;

    /** 分类页签预制体，缺失时拒绝打开。 */
    @property(Prefab)
    tabPrefab: Prefab | null = null;

    /** 只读详情预制体，缺失时拒绝打开。 */
    @property(Prefab)
    infoPrefab: Prefab | null = null;

    /** 详情遮罩预制体，承接外部点击关闭并适配视口。 */
    @property(Prefab)
    dimPrefab: Prefab | null = null;

    /** 显示分类；打开参数可覆盖默认道具分类，点击页签只改变展示。 */
    private tab: BagTabKind = "item";
    /** 当前选中的格子 key（堆叠记录或期限实例）；条目消失、离开当前分类或关页后清空。 */
    private pickedId: string | null = null;
    /** 当前详情数量；库存变化时重建详情，关闭后为 null。 */
    private detailQuantity: number | null = null;
    /** 当前详情的到期值，重连延期时刷新详情；普通物品为 undefined。 */
    private detailExpiry: number | undefined;
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
    /** 当前详情遮罩根节点，重开详情或关页时销毁并清空。 */
    private infoSheet: Node | null = null;
    /** 等待节点激活的帧回调；显示成功、销毁或关页时解除并清空。 */
    private shownWatch: (() => void) | null = null;
    /** 页面是否已关闭；为 true 时阻止后续刷新与异步展示。 */
    private closed = false;
    /** 关闭按钮是否已绑定；监听释放时重置。 */
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

    /** 清空选中与滚动状态，关闭详情与帧等待；全局事件由 BaseView 按目标清理。 */
    onClose(): void {
        this.closed = true;
        this.pickedId = null;
        this.resetScroll = true;
        this.failOpen(new Error("页面已关"));
        this.dismissInfo();
        this.clearShownWatch();
    }

    /** 校验绑定并读取统一配置快照，失败通过页面打开 Promise 报告。 */
    private async initialize(): Promise<void> {
        try {
            this.validateBindings();
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

    /** 挂载且激活后刷新分类与格子；未激活则等待，不重建遮罩或预制层级。 */
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
        const path = "assets/prefabs/ui/bag/BagView.prefab / BagView: ";
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

    /** 在既有立绘节点装配背包动画，每个页面实例只装配一次。 */
    private dressPortrait(): void {
        if (!this.portrait) {
            GameLog.shared.classified("MODULE", "warn", "Bag", "BagView 没有 node_portrait");
            return;
        }
        if (this.portraitOn) return;
        this.portraitOn = true;
        this.portrait.active = true;
        mountNamedSpine(this.portrait, BAG_PORTRAIT, "act");
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

    /** 读取 Model 绘制页签与格子，处理选中失效、详情数量变化及滚动复位，不写库存。 */
    private paint(): void {
        this.writeTalk();
        for (let i = 0; i < this.tabs.length; i++) {
            this.tabs[i].setSelected(BAG_TABS[i].id === this.tab);
        }
        const list = this.bagScroll!.list;
        const rows = this.visibleItems();
        const picked = rows.find(item => item.key === this.pickedId);
        this.nextExpiry = rows.reduce((next, item) => Math.min(next, item.expiresAtSeconds ?? Infinity), Infinity);
        if (!picked) {
            this.pickedId = null;
            this.dismissInfo();
        } else if (this.infoSheet?.isValid && (this.detailQuantity !== picked.quantity || this.detailExpiry !== picked.expiresAtSeconds)) this.showInfo(picked);
        // 空槽补齐属于背包展示规则，通用列表只接收条目，不决定业务槽数。
        const entries = Array.from({ length: BagUtils.slotCount(rows.length) }, (_, index) => rows[index] || null);
        list.setData(entries, (node, item) => {
            const cell = node.getComponent(BagItemView)!;
            const selected = item !== null && item.key === this.pickedId;
            const onTap = item
                ? () => {
                    if (this.closed) return;
                    const current = this.visibleItems().find(row => row.key === item.key);
                    if (!current) return;
                    this.pickedId = current.key;
                    this.showInfo(current);
                    this.refreshGrid();
                }
                : rows.length === 0
                    ? () => {
                        this.toast(BagModel.instance.snapshot.status === "ready" ? BagUtils.emptyToast() : "背包尚未同步");
                    }
                    : null;
            cell.show(item, selected, onTap, item ? this.catalog!.face(item.itemId, item.quantity) : undefined);
        });
        if (this.resetScroll) {
            this.bagScroll!.toStart();
            this.resetScroll = false;
        }
    }

    /** 按配置筛选库存并恢复普通道具排序；隐藏条目与服务器原始顺序仍由 Model 完整持有。 */
    visibleItems(): readonly BagListItem[] {
        if (!this.catalog) return [];
        const state = BagModel.instance.snapshot;
        return this.catalog.list(state.items, state.timedItems, this.tab, BagModel.instance.serverTimeSeconds());
    }

    /** 从当前库存打开只读详情，数量变化时重新展示。 */
    private showInfo(item: Readonly<BagListItem>): void {
        if (!this.infoPrefab || !this.dimPrefab) {
            GameLog.shared.classified("MODULE", "warn", "Bag", "背包详情预制没有绑定");
            return;
        }
        this.dismissInfo();
        this.detailQuantity = item.quantity;
        this.detailExpiry = item.expiresAtSeconds;
        this.infoSheet = openBagInfo(this.node, this.dimPrefab, this.infoPrefab, this.catalog!.face(item.itemId, item.quantity), (text) => this.toast(text), item.expiresAtSeconds === undefined ? undefined : { expiresAtSeconds: item.expiresAtSeconds, now: () => BagModel.instance.serverTimeSeconds() });
    }

    /** 到达下一件物品期限才重绘格子；关闭页面停止处理，不发补查或修改库存。 */
    update(dt: number): void {
        if (this.closed) return;

        const now = BagModel.instance.serverTimeSeconds();
        if (now !== null && now >= this.nextExpiry) this.refreshGrid();
    }

    /** 销毁详情遮罩并清空数量缓存，详情已经销毁时也可调用。 */
    private dismissInfo(): void {
        if (this.infoSheet && this.infoSheet.isValid) {
            this.infoSheet.removeFromParent();
            this.infoSheet.destroy();
        }
        this.infoSheet = null;
        this.detailQuantity = null;
        this.detailExpiry = undefined;
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
