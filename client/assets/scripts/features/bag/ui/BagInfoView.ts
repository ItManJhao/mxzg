/**
 * 独立物品详情窗口，由UIManager打开完整预制体；背景、内容布局及面板内输入阻挡保存在Prefab。
 * 共享模态由UIManager按ViewSpec配置提供，窗口不持有独立蒙版节点。
 * 库存入口读取唯一 BagModel；结算与产物说明入口展示调用方传入的只读内容，不查询或修改资产。
 */
import { _decorator, Button, Label, Layout, Node, RichText, ScrollView, Sprite, UITransform, Widget } from "cc";
import { BagUtils } from "../utils/BagUtils";
import { GameLog } from "../../../core/GameLog";
import { BagFace } from "../data/BagItemDataUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UILayer } from "../../../framework/ui/UILayer";
import { BagTabKind } from "../data/BagTabKind";
import { BagModel } from "../BagModel";
import { BagItemCatalog } from "../utils/BagItemCatalog";
import { BagEvent } from "../utils/BagEvent";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ItemDetailDisplay, ItemDetailUtils } from "../utils/ItemDetailUtils";

/** 库存只传条目键与分类；奖励和产物只传只读内容，不能冒充当前库存。 */
export type BagInfoArgs =
    | { source: "inventory"; key: string; tab: BagTabKind }
    | { source: "description"; face: BagFace };

const { ccclass, property } = _decorator;

/**
 * BagInfoView共用普通道具与碎片的旧基础详情，按真实mode展示条件按钮，不承担使用或分解业务。
 * 关闭只收起这张详情，不关背包页。
 */
@UIRegistry.view({
    id: "bag-info",
    prefab: "bundles/module/bag/prefabs/BagInfoView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("BagInfoView")
export class BagInfoView extends BaseView<BagInfoArgs> {
    /** 每次展示或关页递增，拒绝上一件物品及已关闭窗口的迟到图片。 */
    private paintVersion = 0;
    /** 详情背景的 Prefab 绑定，当前代码不修改。 */
    @property(Node)
    bg: Node | null = null;

    /** 物品名称文本，由 Prefab 绑定。 */
    @property(Label)
    propName: Label | null = null;

    /** 库存按真实mode显示类型；奖励和产物入口保留调用方的只读副标题。 */
    @property(Label)
    propType: Label | null = null;

    /** 配置说明富文本，保留同源换行和颜色；宽度、字体与行高由Prefab保存。 */
    @property(RichText)
    desc: RichText | null = null;

    /** Prefab 绑定的图标节点，未绑定时为 null。 */
    @property(Node)
    icon: Node | null = null;

    /** 碎片独立图标槽，尺寸在Prefab保存，不改变普通道具图标大小。 */
    @property(Node)
    shardIcon: Node | null = null;

    /** 仅精英碎片显示的拼图角标，详情不显示持有量进度。 */
    @property(Node)
    shardCorner: Node | null = null;

    /** 旧碎片1至5颗黄星，位置及原图由Prefab维护。 */
    @property([Node])
    shardStars: Node[] = [];

    /** 正文遮罩视口，只根据真实文字高度在Prefab声明的上下限内调整。 */
    @property(Node)
    descriptionViewport: Node | null = null;

    /** 长正文的单文本滚动容器，不是业务Cell列表，不创建另一份内容。 */
    @property(ScrollView)
    descriptionScroll: ScrollView | null = null;

    /** 正文最小高度，单位设计像素；由Prefab保存旧版60像素下限。 */
    @property
    minDescriptionHeight = 60;

    /** 正文最大可见高度，单位设计像素；超出后在原视口内滚动。 */
    @property
    maxDescriptionHeight = 300;

    /** 稀有度底框节点，由 Prefab 绑定。 */
    @property(Node)
    rare: Node | null = null;

    /** 关闭详情按钮，不关闭背包页。 */
    @property(Button)
    btnClose: Button | null = null;

    /** 库存按旧条件显示使用入口，点击只提示未开放；说明入口显示确定并关闭。 */
    @property(Button)
    btnEnter: Button | null = null;

    /** 库存使用或只读说明确认文案，不按use_type自行改成其他功能名。 */
    @property(Label)
    enterLabel: Label | null = null;

    /** 具体英雄碎片有来源时显示的头部圆形入口，点击只提示未开放。 */
    @property(Button)
    btnSrc: Button | null = null;

    /** 旧底部首按钮，按配置显示详情或来源；不开放英雄图鉴或来源跳转。 */
    @property(Node)
    btnDetail: Node | null = null;

    /** 旧分解入口，仅真实非期限库存且配置允许时显示，点击只提示未开放。 */
    @property(Node)
    btnDecompose: Node | null = null;

    /** 底部首按钮的旧语言文案，具体碎片为详情，其他为来源。 */
    @property(Label)
    detailLabel: Label | null = null;

    /** 分解按钮文案，采用旧CCB的同源语言键。 */
    @property(Label)
    decomposeLabel: Label | null = null;

    /** 旧按钮容器，其尺寸已固定在预制体，不在运行时改布局。 */
    @property(Node)
    hitMenu: Node | null = null;

    /** 没有任何操作时保留旧版底部留白；有按钮时隐藏，由Prefab Grid统一占位。 */
    @property(Node)
    emptyActionSpacer: Node | null = null;

    /** 关闭按钮容器，布局由预制体维护。 */
    @property(Node)
    hitMenuClose: Node | null = null;

    /** Prefab 中固定的底部倒计时标签，普通物品隐藏。 */
    @property(Label)
    countdown: Label | null = null;
    /** 当前期限数据与服务器计时入口，关闭销毁时清空。 */
    private timing: { expiresAtSeconds: number; now: () => number | null } | null = null;
    /** 上次显示的剩余整数秒，避免逐帧重复写文本。 */
    private lastRemaining: number | null = null;
    /** 显示时绑定的关闭动作，关闭或销毁时释放。 */
    private closeAction: (() => void) | null = null;
    /** 页面传入的提示回调，销毁时清空，避免持有旧页面。 */
    private toast: ((text: string) => void) | null = null;
    /** 按钮是否已经绑定；重复 show 不重复注册，销毁时重置。 */
    private wired = false;
    /** 当前库存详情的纯显示结果；说明入口和关闭后为null，不保存玩家数量。 */
    private detail: ItemDetailDisplay | null = null;
    /** 上次完整正文，用于库存数量刷新时保留长文滚动位置，关窗清空。 */
    private lastBody = "";

    /** 对齐窗口根到可见区域；子节点尺寸和居中由预制体 Widget 控制。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 打开独立详情；库存变化只重画本窗口，奖励说明不订阅库存。 */
    public onOpen(args?: BagInfoArgs): void {
        if (!args) {
            throw new Error("物品详情缺少参数");
        }
        this.validateBindings();
        this.args = args;
        EventDispatcher.instance.offTarget(this);
        if (args.source === "inventory") {
            EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshInventory);
            this.refreshInventory();
        } else {
            this.show(args.face, () => this.close(), text => UIManager.instance.toast(text));
            if (this.btnSrc) {
                this.btnSrc.node.active = false;
            }
        }
    }

    /** 按原实例键重读库存和真实mode；已恢复的道具/碎片取配置投影，删除、换号或到期关窗。 */
    private refreshInventory(): void {
        const args = this.args;
        if (args?.source !== "inventory") {
            return;
        }
        const model = BagModel.instance;
        const state = model.snapshot;
        const item = BagItemCatalog.list(state.items, state.timedItems, args.tab, model.serverTimeSeconds(), state.spiritItems)
            .find(row => row.key === args.key);
        if (!item) {
            this.close();
            return;
        }
        const db = GameConfig.instance;
        const row = db.getConfig(GConfig.Item, item.itemId);
        const supported = row && [2, 8, 9, 17].includes(row.mode!);
        const detail = supported ? ItemDetailUtils.read(row, {
            inventory: true,
            timed: item.expiresAtSeconds !== undefined,
            specificHero: !!db.getConfig(GConfig.HeroType, item.itemId - 10000000),
        }) : null;
        if (supported && !detail) {
            UIManager.instance.toast("物品详情暂不可用，请检查显示配置");
            this.close();
            return;
        }
        const face = item.spirit ? BagItemCatalog.spiritFace(item.spirit) : BagItemCatalog.face(item.itemId, item.quantity);
        this.show(detail ? { ...face, typeLine: detail.typeLine, body: detail.description, richBody: detail.richDescription } : face,
            () => this.close(), text => UIManager.instance.toast(text), detail);
        this.setCountdown(item.expiresAtSeconds === undefined ? undefined : {
            expiresAtSeconds: item.expiresAtSeconds,
            now: () => BagModel.instance.serverTimeSeconds(),
        });
    }

    /** 关闭后解除按钮与计时引用；全局目标事件由 BaseView 清理。 */
    public onClose(): void {
        this.paintVersion++;
        this.releaseBindings();
        this.detail = null;
        this.lastBody = "";
        ResManager.setSprite(this.icon, null);
        ResManager.setSprite(this.shardIcon, null);
        ResManager.setSprite(this.rare, null);
        this.args = undefined;
    }

    /** 展示同一基础详情；库存传真实条件投影，奖励/产物保持自己的副标题和唯一确定按钮。 */
    public show(face: BagFace, onClose: () => void, toast: (text: string) => void,
        detail: ItemDetailDisplay | null = null): void {
        const version = ++this.paintVersion;
        const current = () => this.node.isValid && version === this.paintVersion;
        this.setCountdown();
        this.detail = detail;
        this.closeAction = onClose;
        this.toast = toast;
        if (this.propName) {
            this.propName.string = face.title;
        }
        if (this.propType) {
            this.propType.string = face.typeLine;
        }
        if (this.desc) {
            this.desc.node.active = true;
            this.desc.string = face.richBody || face.body || " ";
        }
        const shard = face.shard;
        if (this.shardCorner) {
            this.shardCorner.active = !!shard;
        }
        this.shardStars.forEach((star, index) => { star.active = !!shard && index < shard.star; });
        if (this.icon) {
            this.icon.active = !shard;
        }
        if (this.shardIcon) {
            this.shardIcon.active = !!shard;
        }
        ResManager.setSprite(shard ? this.icon : this.shardIcon, null);
        ResManager.setSprite(shard ? this.shardIcon : this.icon, [face.icon, face.fallback], current);
        if (this.rare) {
            ResManager.setSprite(this.rare, [face.frame], current);
        } else {
            GameLog.shared.classified("MODULE", "warn", "Bag", "BagInfoView 下没有 spr_rare");
        }
        if (this.btnDetail) {
            this.btnDetail.active = !!detail?.bottomAction;
        }
        if (this.btnDecompose) {
            this.btnDecompose.active = detail?.showDecompose === true;
        }
        const confirmImage = this.btnEnter?.node.getComponent(Sprite);
        if (confirmImage) {
            confirmImage.grayscale = false;
        }
        if (this.btnSrc) {
            this.btnSrc.node.active = detail?.showSourceIcon === true;
            const image = this.btnSrc.node.getComponent(Sprite);
            if (image) {
                image.grayscale = false;
            }
        }
        if (this.enterLabel) {
            this.enterLabel.string = detail ? detail.useLabel : "确定";
        }
        if (this.btnEnter) {
            this.btnEnter.node.active = detail ? detail.showUse : true;
        }
        if (this.detailLabel) {
            this.detailLabel.string = detail?.detailLabel || "";
        }
        if (this.decomposeLabel) {
            this.decomposeLabel.string = detail?.decomposeLabel || "";
        }
        const body = face.richBody || face.body;
        this.refreshDescriptionLayout(body !== this.lastBody);
        this.lastBody = body;
        this.refreshActionLayout();
        this.wire();
    }

    /** 核对本窗新增的静态碎片槽与正文边界，配置损坏交给统一开窗边界，不静默漏画。 */
    private validateBindings(): void {
        for (const [field, value] of Object.entries({
            shardIcon: this.shardIcon,
            shardCorner: this.shardCorner,
            descriptionViewport: this.descriptionViewport,
            descriptionScroll: this.descriptionScroll,
            detailLabel: this.detailLabel,
            decomposeLabel: this.decomposeLabel,
            emptyActionSpacer: this.emptyActionSpacer,
        })) {
            if (!value) {
                throw new Error("BagInfoView.prefab缺少绑定：" + field);
            }
        }
        if (this.shardStars.length !== 5 || this.shardStars.some(star => !star)
            || !this.descriptionViewport!.getComponent(UITransform)
            || !Number.isFinite(this.minDescriptionHeight) || this.minDescriptionHeight <= 0
            || !Number.isFinite(this.maxDescriptionHeight) || this.maxDescriptionHeight < this.minDescriptionHeight) {
            throw new Error("BagInfoView.prefab碎片星级或正文高度参数无效");
        }
    }

    /** 读取RichText.string同步排版后的实际高度，视口上下限来自Prefab，其余位置由已有Layout处理。 */
    private refreshDescriptionLayout(resetPosition: boolean): void {
        if (!this.desc || !this.descriptionViewport || !this.descriptionScroll) {
            return;
        }
        const textHeight = this.desc.node.getComponent(UITransform)!.height;
        const height = Math.min(this.maxDescriptionHeight, Math.max(this.minDescriptionHeight, textHeight));
        const viewport = this.descriptionViewport.getComponent(UITransform)!;
        viewport.setContentSize(viewport.width, height);
        this.descriptionScroll.vertical = textHeight > height;
        this.descriptionScroll.content?.getComponent(Layout)?.updateLayout();
        for (let parent = this.descriptionViewport.parent; parent && parent !== this.node; parent = parent.parent) {
            parent.getComponent(Layout)?.updateLayout();
        }
        if (resetPosition) {
            this.descriptionScroll.stopAutoScroll();
            this.descriptionScroll.scrollToTop(0);
        }
    }

    /** 切换Prefab已有的单按钮居中Widget，多按钮仍交给固定两列Grid，不手算位置。 */
    private refreshActionLayout(): void {
        const buttons = [this.btnDetail, this.btnEnter?.node, this.btnDecompose].filter(Boolean) as Node[];
        const activeCount = buttons.filter(button => button.active).length;
        const single = activeCount === 1;
        if (this.emptyActionSpacer) {
            this.emptyActionSpacer.active = activeCount === 0;
        }
        for (const button of buttons) {
            const widget = button.getComponent(Widget);
            if (widget) {
                widget.enabled = single && button.active;
            }
        }
        this.hitMenu?.getComponent(Layout)?.updateLayout();
        for (const button of buttons) {
            const widget = button.getComponent(Widget);
            if (widget?.enabled) {
                widget.updateAlignment();
            }
        }
        for (let parent = this.hitMenu?.parent; parent && parent !== this.node; parent = parent.parent) {
            parent.getComponent(Layout)?.updateLayout();
        }
    }

    /** 设置只读倒计时，不发请求、不修改库存；普通详情传空值以隐藏标签。 */
    public setCountdown(timing?: { expiresAtSeconds: number; now: () => number | null }): void {
        this.timing = timing || null;
        this.lastRemaining = null;
        if (this.countdown) {
            this.countdown.node.active = !!timing;
        }
        if (timing && !this.countdown) {
            throw new Error("BagInfoView 缺少 countdown 绑定");
        }
        this.update();
    }
    /** 每秒更新一次标签；未知服务器时刻显示同步提示，详情随节点销毁停止更新。 */
    public update(): void {
        if (!this.timing || !this.countdown) {
            return;
        }
        const now = this.timing.now();
        if (now === null) {
            this.countdown.string = "等待服务器时间";
            return;
        }
        const remaining = Math.max(0, Math.floor(this.timing.expiresAtSeconds - now));
        if (remaining === 0 && this.args?.source === "inventory") {
            this.close();
            return;
        }
        if (remaining === this.lastRemaining) {
            return;
        }
        this.lastRemaining = remaining;
        this.countdown.string = BagUtils.countdown(remaining);
    }

    /** 确认或关闭仅退出详情，不触发库存写入。 */
    private readonly closeInfo = (): void => {
        this.closeAction?.();
    };

    /** 当前没有来源流程，明确提示功能尚未开放。 */
    private readonly showSourceNotice = (): void => {
        this.toast?.("物品来源暂未开放");
    };

    /** 库存使用只反馈未开放；产物或奖励说明的确定按钮仍只关闭当前窗口。 */
    private readonly showUseNotice = (): void => {
        if (this.detail) {
            if (this.detail.showUse) {
                this.toast?.("物品使用暂未开放");
            }
            return;
        }
        this.closeAction?.();
    };

    /** 底部按钮按真实配置说明来源或图鉴未开放，不借用已拥有英雄的详情。 */
    private readonly showDetailNotice = (): void => {
        if (this.detail?.bottomAction === "detail") {
            this.toast?.("英雄图鉴暂未开放");
        } else if (this.detail?.bottomAction === "source") {
            this.showSourceNotice();
        }
    };

    /** 只反馈旧条件允许显示的分解入口，不提交资产请求或改库存。 */
    private readonly showDecomposeNotice = (): void => {
        if (this.detail?.showDecompose) {
            this.toast?.("物品分解暂未开放");
        }
    };

    /** 每个详情实例只登记内容按钮；外部点击由UIManager共享模态按ViewSpec处理。 */
    private wire(): void {
        if (this.wired) {
            return;
        }
        this.wired = true;
        this.btnClose?.node.on(Button.EventType.CLICK, this.closeInfo);
        this.btnEnter?.node.on(Button.EventType.CLICK, this.showUseNotice);
        this.btnSrc?.node.on(Button.EventType.CLICK, this.showSourceNotice);
        this.btnDetail?.on(Button.EventType.CLICK, this.showDetailNotice);
        this.btnDecompose?.on(Button.EventType.CLICK, this.showDecomposeNotice);
    }

    /** 直接销毁时同样失效图片和监听；引擎可能已先销毁子按钮，因此清理允许空节点。 */
    public onDestroy(): void {
        this.paintVersion++;
        this.releaseBindings();
        this.detail = null;
        this.lastBody = "";
    }

    /** 解除仍存活按钮与计时引用；子节点可能已销毁内部输入处理器，此时不再调用Node.off。 */
    private releaseBindings(): void {
        EventDispatcher.instance.offTarget(this);
        const bindings: readonly (readonly [Node | null | undefined, () => void])[] = [
            [this.btnClose?.node, this.closeInfo],
            [this.btnEnter?.node, this.showUseNotice],
            [this.btnSrc?.node, this.showSourceNotice],
            [this.btnDetail, this.showDetailNotice],
            [this.btnDecompose, this.showDecomposeNotice],
        ];
        for (const [node, listener] of bindings) {
            if (node?.isValid) {
                node.off(Button.EventType.CLICK, listener);
            }
        }
        if (this.descriptionScroll?.isValid) {
            this.descriptionScroll.stopAutoScroll();
        }
        this.timing = null;
        this.lastRemaining = null;
        this.closeAction = null;
        this.toast = null;
        this.wired = false;
    }

}
