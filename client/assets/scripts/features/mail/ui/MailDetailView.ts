/** 邮件阅读弹窗，使用原版正文、信封图和附件格。收到权威已读回包后才显示正文。 */
import { _decorator, Button, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { MailController } from "../MailController";
import { MailModel } from "../MailModel";
import type { MailAttachment } from "../data/MailData";
import { MailDisplayUtils } from "./MailDisplayUtils";

const { ccclass, property } = _decorator;

/** 本详情只阅读已选中的一封邮件。 */
interface MailDetailArgs {
    readonly id: string;
}

@UIRegistry.view({
    id: "mail-detail",
    prefab: "bundles/module/common/prefabs/MailDetailView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("MailDetailView")
export class MailDetailView extends BaseView<MailDetailArgs> {
    /** 详情窗口设计尺寸和当前缩放入口。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭详情不会改变尚未领取的附件状态。 */
    @property(Button) private closeButton: Button | null = null;
    /** 只在尚有附件可领时显示的橙色按钮。 */
    @property(Button) private claimButton: Button | null = null;
    /** 附件已领后显示原版绿色删除按钮。 */
    @property(Button) private deleteButton: Button | null = null;
    /** 当前信件标题。 */
    @property(Label) private subject: Label | null = null;
    /** 使用服务器时间计算送达相对时间。 */
    @property(Label) private age: Label | null = null;
    /** 可滚动的长正文，在同一封信展示期间保留读到的位置。 */
    @property(Label) private body: Label | null = null;
    /** 正文超出窗口时可单独滚动。 */
    @property(ScrollView) private bodyScroll: ScrollView | null = null;
    /** 从共享物品格渲染附件实际数量和拼图品质样式。 */
    @property(SuperScroll) private attachments: SuperScroll | null = null;
    /** 原信封图的独立 Sprite，用四种状态利用正式材质。 */
    @property(Sprite) private envelope: Sprite | null = null;
    /** 静态绑定原图，避免点开详情再进行一次异步查图。 */
    @property([SpriteFrame]) private envelopes: SpriteFrame[] = [];

    /** 详情只在打开期间关注这一封，关闭后忽略延迟回调。 */
    private currentId: string | null = null;
    /** 防止同一正文随附件状态刷新而跳回开头。 */
    private renderedBody: string | null = null;

    /** 默认打开正文并标记为已读，附件渲染和物品查看在本窗内绑定。 */
    public onOpen(args?: MailDetailArgs): void {
        super.onOpen(args);
        if (!args) {
            throw new Error("邮件详情缺少邮件标识");
        }
        this.attachments!.validateBindings();
        this.currentId = args.id;
        this.renderedBody = null;
        this.bind(this.closeButton!, this.close);
        this.bind(this.claimButton!, this.claim);
        this.bind(this.deleteButton!, this.delete);
        const content = this.attachments!.list.node;
        content.on(SuperContent.RENDER_ITEM, this.paintAttachment, this);
        content.on(SuperContent.SELECT_ITEM, this.inspectAttachment, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("mail.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.paint();
        void MailController.instance.open(args.id).then(loaded => {
            if (!loaded && this.currentId === args.id && !MailModel.instance.detailFor(args.id)) {
                this.close();
            }
        });
    }

    /** 拆除详情列表的虚拟行，并拒绝已关闭页的延迟结果。 */
    public onClose(): void {
        this.currentId = null;
        this.renderedBody = null;
        if (this.attachments?.content?.isValid) {
            this.attachments.list.clear();
        }
    }

    /** 接入预制体按钮并在页面释放时解除监听。 */
    private bind(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback, this);
            }
        });
    }

    /** 详情页保持固定构图，窄屏按视口统一缩放。 */
    private fit(): void {
        const viewport = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, viewport.width / panel.width, viewport.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 同步正文和附件状态，删除后自动离开失效详情。 */
    private paint(): void {
        const id = this.currentId;
        if (!id) {
            return;
        }
        const entry = MailModel.instance.entryFor(id);
        if (!entry) {
            this.close();
            return;
        }
        const detail = MailModel.instance.detailFor(id);
        this.subject!.string = entry.title;
        this.age!.string = MailDisplayUtils.age(entry.createdAt);
        this.envelope!.spriteFrame = this.envelopes[MailDisplayUtils.frameIndex(entry)];
        const body = detail?.content ?? "正在读取邮件…";
        if (this.renderedBody !== body) {
            this.renderedBody = body;
            this.body!.string = body;
            this.bodyScroll!.scrollToTop();
        }
        const canSubmit = !MailController.instance.busy && !!detail;
        this.claimButton!.node.active = !!detail && entry.hasAttachments && !entry.claimed;
        this.deleteButton!.node.active = !!detail && entry.hasAttachments && entry.claimed;
        this.claimButton!.interactable = canSubmit;
        this.deleteButton!.interactable = canSubmit;
        this.attachments!.list.setData(detail?.attachments ?? []);
    }

    /** 已领后将附件贴图变灰，同时保留用户可查询物品详情。 */
    private paintAttachment(node: Node, attachment: MailAttachment): void {
        const cell = node.getComponent(BagItemView)!;
        cell.show(attachment, false, BagItemCatalog.face(attachment.itemId, attachment.quantity));
        const claimed = this.currentId ? !!MailModel.instance.entryFor(this.currentId)?.claimed : false;
        for (const target of [cell.icon, cell.shardIcon, cell.frame]) {
            const sprite = target?.getComponent(Sprite);
            if (sprite) {
                sprite.grayscale = claimed;
            }
        }
    }

    /** 复用通用物品说明窗口，显示原计划附件数量。 */
    private inspectAttachment(attachment: MailAttachment): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: BagItemCatalog.face(attachment.itemId, attachment.quantity),
        }).catch(() => {
            // 加载异常由 UIManager 提示。
        });
    }

    /** 领取当前邮件的正式附件。 */
    private claim(): void {
        if (this.currentId) {
            void MailController.instance.claim(this.currentId);
        }
    }

    /** 删除当前已读且附件已领完的邮件。 */
    private delete(): void {
        if (this.currentId) {
            void MailController.instance.delete(this.currentId);
        }
    }
}
