/**
 * 独立物品详情窗口，由 UIManager 打开完整预制体，遮罩、背景与布局由预制体保存。
 * 库存入口读取唯一 BagModel；结算与产物说明入口展示调用方传入的只读内容，不查询或修改资产。
 */
import { _decorator, Button, Label, Node, Sprite } from "cc";
import { BagUtils } from "../utils/BagUtils";
import { GameLog } from "../../../core/GameLog";
import { BagFace } from "../data/BagItemData";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { view, viewSpecOf } from "../../../framework/ui/UIRegistry";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { UILayer } from "../../../framework/ui/UILayer";
import { BagTabKind } from "../data/BagTabKind";
import { BagModel } from "../BagModel";
import { BagItemCatalog } from "../utils/BagItemCatalog";
import { BagEvent } from "../utils/BagEvent";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";

/** 库存只传条目键与分类；奖励和产物只传只读内容，不能冒充当前库存。 */
export type BagInfoArgs =
    | { source: "inventory"; key: string; tab: BagTabKind }
    | { source: "description"; face: BagFace };

const { ccclass, property } = _decorator;

/**
 * BagInfoView 只展示当前库存详情，确认关闭，不承担道具使用业务。
 * 关闭只收起这张详情，不关背包页。
 */
@view({
    id: "bag-info",
    prefab: ResourceCatalog.prefab_bag.BagInfoView.assetPath,
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
})
@ccclass("BagInfoView")
export class BagInfoView extends BaseView<BagInfoArgs> {
    /** 完整预制体自带的遮罩按钮，点击窗口外部关闭本窗口。 */
    @property(Button)
    dimButton: Button | null = null;
    /** 物品配置查询器，仅库存详情使用；关闭释放，不缓存服务器数量。 */
    private catalog: BagItemCatalog | null = null;
    /** 每次展示或关页递增，拒绝上一件物品及已关闭窗口的迟到图片。 */
    private paintVersion = 0;
    /** 详情背景的 Prefab 绑定，当前代码不修改。 */
    @property(Node)
    bg: Node | null = null;

    /** 物品名称文本，由 Prefab 绑定。 */
    @property(Label)
    propName: Label | null = null;

    /** 数量说明文本，由 Prefab 绑定。 */
    @property(Label)
    propType: Label | null = null;

    /** 配置说明文本，由 Prefab 绑定。 */
    @property(Label)
    desc: Label | null = null;

    /** Prefab 绑定的图标节点，未绑定时为 null。 */
    @property(Node)
    icon: Node | null = null;

    /** 稀有度底框节点，由 Prefab 绑定。 */
    @property(Node)
    rare: Node | null = null;

    /** 关闭详情按钮，不关闭背包页。 */
    @property(Button)
    btnClose: Button | null = null;

    /** 当前仅作确认关闭按钮，尚未接入使用道具。 */
    @property(Button)
    btnEnter: Button | null = null;

    /** 确认按钮文案，当前显示“确定”。 */
    @property(Label)
    enterLabel: Label | null = null;

    /** 物品来源按钮，当前置灰并提示尚未开放。 */
    @property(Button)
    btnSrc: Button | null = null;

    /** 旧详情操作节点，目前隐藏，保留序列化绑定。 */
    @property(Node)
    btnDetail: Node | null = null;

    /** 旧分解操作节点，目前隐藏，尚未恢复分解业务。 */
    @property(Node)
    btnDecompose: Node | null = null;

    /** 旧按钮容器，其尺寸已固定在预制体，不在运行时改布局。 */
    @property(Node)
    hitMenu: Node | null = null;

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

    /** 对齐窗口根到可见区域；子节点尺寸和居中由预制体 Widget 控制。 */
    public onCreate(): void {
        bindVisibleRefresh(this.node, () => fitVisibleRoot(this.node));
    }

    /** 打开独立详情；库存变化只重画本窗口，奖励说明不订阅库存。 */
    public onOpen(args?: BagInfoArgs): void {
        if (!args || !this.dimButton) {
            throw new Error("物品详情缺少参数或遮罩按钮绑定");
        }
        this.args = args;
        EventDispatcher.instance.offTarget(this);
        if (args.source === "inventory") {
            this.catalog = new BagItemCatalog(GameConfig.instance.getFile(GConfig.Item),
                GameConfig.instance.getFile(GConfig.Language), GameConfig.instance.getFile(GConfig.TimeLimitItem));
            EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshInventory);
            this.refreshInventory();
        } else {
            this.show(args.face, () => this.close(), text => UIManager.instance.toast(text));
            if (this.btnSrc) {
                this.btnSrc.node.active = false;
            }
        }
    }

    /** 从唯一 Model 重读当前条目；删除、换号或到期后关闭详情，不修改库存。 */
    private refreshInventory(): void {
        const args = this.args;
        if (args?.source !== "inventory" || !this.catalog) {
            return;
        }
        const model = BagModel.instance;
        const state = model.snapshot;
        const item = this.catalog.list(state.items, state.timedItems, args.tab, model.serverTimeSeconds())
            .find(row => row.key === args.key);
        if (!item) {
            this.close();
            return;
        }
        this.show(this.catalog.face(item.itemId, item.quantity), () => this.close(), text => UIManager.instance.toast(text));
        if (this.btnSrc) {
            this.btnSrc.node.active = true;
        }
        this.setCountdown(item.expiresAtSeconds === undefined ? undefined : {
            expiresAtSeconds: item.expiresAtSeconds,
            now: () => BagModel.instance.serverTimeSeconds(),
        });
    }

    /** 关闭后解除按钮与计时引用；全局目标事件由 BaseView 清理。 */
    public onClose(): void {
        this.paintVersion++;
        this.releaseBindings();
        this.catalog = null;
        this.args = undefined;
    }

    /** 展示配置与数量；重复展示只替换回调，不重复绑定按钮。 */
    show(face: BagFace, onClose: () => void, toast: (text: string) => void): void {
        const version = ++this.paintVersion;
        const current = () => version === this.paintVersion;
        this.setCountdown();
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
            this.desc.string = face.body || " ";
        }
        paintSpritePaths(this.icon, [face.icon, face.fallback], current);
        if (this.rare) {
            paintSpritePaths(this.rare, [face.frame], current);
        } else {
            GameLog.shared.classified("MODULE", "warn", "Bag", "BagInfoView 下没有 spr_rare");
        }
        if (this.btnDetail) {
            this.btnDetail.active = false;
        }
        if (this.btnDecompose) {
            this.btnDecompose.active = false;
        }
        const confirmImage = this.btnEnter?.node.getComponent(Sprite);
        if (confirmImage) {
            confirmImage.grayscale = false;
        }
        this.gray(this.btnSrc);
        if (this.enterLabel) {
            this.enterLabel.string = "确定";
        }
        if (this.btnEnter) {
            this.btnEnter.node.active = true;
        }
        this.wire();
    }

    /** 设置只读倒计时，不发请求、不修改库存；普通详情传空值以隐藏标签。 */
    setCountdown(timing?: { expiresAtSeconds: number; now: () => number | null }): void {
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
    update(): void {
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

    /** 每个详情实例只登记一次交互，回调读取最新展示数据。 */
    private wire(): void {
        if (this.wired) {
            return;
        }
        this.wired = true;
        this.btnClose?.node.on(Button.EventType.CLICK, this.closeInfo);
        this.btnEnter?.node.on(Button.EventType.CLICK, this.closeInfo);
        this.btnSrc?.node.on(Button.EventType.CLICK, this.showSourceNotice);
        this.dimButton?.node.on(Button.EventType.CLICK, this.closeInfo);
    }

    /** 来源入口维持当前未开放的灰色展示。 */
    private gray(button: Button | null): void {
        if (!button) return;
        const image = button.node.getComponent(Sprite);
        if (image) image.grayscale = true;
    }

    /** 销毁时解除仍存活按钮的回调并释放页面引用；Creator 可能已先销毁子按钮并清空其 node。 */
    onDestroy(): void {
        this.releaseBindings();
    }

    /** 关闭和销毁共用清理，允许重复调用；不保留旧页面按钮或计时引用。 */
    private releaseBindings(): void {
        this.btnClose?.node?.off(Button.EventType.CLICK, this.closeInfo);
        this.btnEnter?.node?.off(Button.EventType.CLICK, this.closeInfo);
        this.btnSrc?.node?.off(Button.EventType.CLICK, this.showSourceNotice);
        this.dimButton?.node?.off(Button.EventType.CLICK, this.closeInfo);
        this.timing = null;
        this.lastRemaining = null;
        this.closeAction = null;
        this.toast = null;
        this.wired = false;
    }

}
