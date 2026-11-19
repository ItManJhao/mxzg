/**
 * 精英碎片旧5008数量选择窗：初始选当前最大合成次数，支持加减和输入，数量0确认只关闭。
 * BagView通过UIManager拥有本窗，静态旧面板保存在Prefab；角色与库存仍归唯一Model，不预扣资产。
 * 正数确认交给 BagController，关窗不取消已发送合成，账号重置和数量变化只影响未发送选择。
 */
import { _decorator, Button, EditBox, Label, Node } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UILayer } from "../../../framework/ui/UILayer";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagController } from "../BagController";
import { BagEvent } from "../utils/BagEvent";
import { BagItemCatalog } from "../utils/BagItemCatalog";
import { HeroPieceComposeUtils } from "../utils/HeroPieceComposeUtils";

/** 只传物品配置 ID，页面根据当前库存计算可选次数。 */
export interface HeroPieceComposeArgs {
    /** 精英碎片配置ID，不是英雄模板ID或持久记录ID。 */
    readonly itemId: number;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-piece-compose",
    prefab: "bundles/module/bag/prefabs/HeroPieceComposeView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroPieceComposeView")
export class HeroPieceComposeView extends BaseView<HeroPieceComposeArgs> {
    /** 当前碎片名称，读取现有物品语言，不按英雄模板改名。 */
    @property(Label) nameLabel: Label | null = null;
    /** 当前碎片内容图标，尺寸与布局由Prefab保存。 */
    @property(Node) itemIcon: Node | null = null;
    /** 物品品质底框，复用现有ResManager与资源池。 */
    @property(Node) itemFrame: Node | null = null;
    /** 原碎片格的五颗静态黄星，实际可见数来自物品配置，不显示库存进度。 */
    @property([Node]) shardStars: Node[] = [];
    /** 旧数量输入框，只表示合成次数，不是碎片消耗总量。 */
    @property(EditBox) quantityInput: EditBox | null = null;
    /** 每次减一，选到0时不可再减。 */
    @property(Button) subtractButton: Button | null = null;
    /** 每次加一，到当前库存可合成上限时不可再加。 */
    @property(Button) addButton: Button | null = null;
    /** 正数转交合成；0只关闭，不创建请求。 */
    @property(Button) confirmButton: Button | null = null;
    /** 仅关闭未发送选择，不取消应用持久请求。 */
    @property(Button) closeButton: Button | null = null;
    /** 当前未发送选择次数；打开先取最大值，关闭清零，不作为资产状态。 */
    private quantity = 0;
    /** 本轮当前上限，库存更新时重算；不按英雄容量裁减。 */
    private maximum = 0;
    /** 关闭或重新打开时递增，拒绝上轮图标迟到赋值。 */
    private paintVersion = 0;
    /** 防止同一次确认连点；关闭不取消已经交付应用的Promise。 */
    private submitted = false;

    /** 根节点桥接可见区域，面板定位、固定尺寸和比例由Prefab维护。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 绑定当前真实碎片及库存变化，初始按旧版选最大可合成次数，不发任何库存补查。 */
    public onOpen(args?: HeroPieceComposeArgs): void {
        if (!args || !Number.isSafeInteger(args.itemId) || args.itemId <= 0) {
            throw new Error("碎片合成数量窗口缺少物品ID");
        }
        this.validateBindings();
        this.releaseListeners();
        this.args = args;
        this.submitted = false;
        this.wire();
        EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refresh);
        const state = HeroPieceComposeUtils.stock(args.itemId);
        this.quantity = state?.maximum || 0;
        this.refresh();
    }

    /** 核对完整Prefab绑定；缺少真实控件时拒绝开窗，不运行时另造面板。 */
    private validateBindings(): void {
        for (const [field, value] of Object.entries({
            nameLabel: this.nameLabel, itemIcon: this.itemIcon, itemFrame: this.itemFrame,
            quantityInput: this.quantityInput, subtractButton: this.subtractButton,
            addButton: this.addButton, confirmButton: this.confirmButton, closeButton: this.closeButton,
        })) {
            if (!value) {
                throw new Error("HeroPieceComposeView.prefab缺少绑定：" + field);
            }
        }
        if (this.shardStars.length !== 5 || this.shardStars.some(star => !star)) {
            throw new Error("HeroPieceComposeView.prefab缺少五颗碎片星级绑定");
        }
    }

    /** 库存变化后刷新可选次数，保留仍有效的输入。 */
    private readonly refresh = (): void => {
        const itemId = this.args?.itemId;
        const state = itemId === undefined ? null : HeroPieceComposeUtils.stock(itemId);
        if (!state?.maximum || !BagController.instance.canComposeHeroPieces) {
            this.close();
            return;
        }
        this.maximum = state.maximum;
        this.quantity = HeroPieceComposeUtils.normalize(this.quantity, this.maximum);
        const face = BagItemCatalog.face(state.itemId, state.owned);
        const version = ++this.paintVersion;
        const current = () => this.node.isValid && version === this.paintVersion;
        this.nameLabel!.string = face.title;
        this.shardStars.forEach((star, index) => { star.active = !!face.shard && index < face.shard.star; });
        ResManager.setSprite(this.itemIcon, [face.icon, face.fallback], current);
        ResManager.setSprite(this.itemFrame, face.frame, current);
        this.renderQuantity();
    };

    /** 仅刷新旧输入和加减按钮，不修改库存；确认0仍保持可点击以实现旧版关闭语义。 */
    private renderQuantity(): void {
        this.quantityInput!.string = String(this.quantity);
        this.subtractButton!.interactable = !this.submitted && this.quantity > 0;
        this.addButton!.interactable = !this.submitted && this.quantity < this.maximum;
        this.confirmButton!.interactable = !this.submitted;
        this.quantityInput!.enabled = !this.submitted;
    }

    /** 数量框结束编辑后按旧规则取整和截上限；非法文本回0并统一提示。 */
    private readonly finishInput = (): void => {
        const text = this.quantityInput!.string;
        const value = Number(text.trim());
        this.quantity = HeroPieceComposeUtils.normalize(text, this.maximum);
        this.renderQuantity();
        if (text.trim() === "" || !Number.isFinite(value)) {
            UIManager.instance.toast("请输入整数");
        }
    };

    /** 减少一次合成，允许选到0，不借此删除物品。 */
    private readonly subtract = (): void => {
        this.quantity = Math.max(0, this.quantity - 1);
        this.renderQuantity();
    };

    /** 增加一次合成，最多当前库存允许的次数。 */
    private readonly add = (): void => {
        this.quantity = Math.min(this.maximum, this.quantity + 1);
        this.renderQuantity();
    };

    /** 零次数直接关闭；正数交背包控制器发包，随后关闭数量窗。 */
    private readonly confirm = (): void => {
        if (this.submitted || !this.args) {
            return;
        }
        this.finishInput();
        if (this.quantity === 0) {
            this.close();
            return;
        }
        this.submitted = true;
        this.renderQuantity();
        BagController.instance.composeHeroPieces(this.args.itemId, this.quantity);
        this.close();
    };

    /** 登记本窗实际控件；重复打开先解除旧监听，避免同次点击创建多份请求。 */
    private wire(): void {
        this.subtractButton!.node.on(Button.EventType.CLICK, this.subtract);
        this.addButton!.node.on(Button.EventType.CLICK, this.add);
        this.confirmButton!.node.on(Button.EventType.CLICK, this.confirm);
        this.closeButton!.node.on(Button.EventType.CLICK, this.close, this);
        this.quantityInput!.node.on(EditBox.EventType.EDITING_DID_ENDED, this.finishInput);
    }

    /** 解除仍存活控件及库存监听，允许Creator先销毁子节点的关闭顺序。 */
    private releaseListeners(): void {
        EventDispatcher.instance.offTarget(this);
        const buttons: readonly (readonly [Node | null | undefined, () => void])[] = [
            [this.subtractButton?.node, this.subtract],
            [this.addButton?.node, this.add],
            [this.confirmButton?.node, this.confirm],
        ];
        for (const [node, callback] of buttons) {
            if (node?.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        }
        if (this.closeButton?.node?.isValid) {
            this.closeButton.node.off(Button.EventType.CLICK, this.close, this);
        }
        if (this.quantityInput?.node?.isValid) {
            this.quantityInput.node.off(EditBox.EventType.EDITING_DID_ENDED, this.finishInput);
        }
    }

    /** 关闭不取消已发送动作，清空选择与图片拥有者，账号重置后旧参数不能重开。 */
    public onClose(): void {
        this.paintVersion++;
        this.releaseListeners();
        ResManager.setSprite(this.itemIcon, null);
        ResManager.setSprite(this.itemFrame, null);
        this.args = undefined;
        this.quantity = 0;
        this.maximum = 0;
    }
}
