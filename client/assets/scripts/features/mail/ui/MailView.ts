/** 主城信箱。保留正式服空列表构图，以真实索引驱动滚动和批量操作。 */
import { _decorator, Button, Node, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { MailController } from "../MailController";
import { MailModel } from "../MailModel";
import type { MailEntry } from "../data/MailData";
import { MailCell } from "./MailCell";
import { MailDetailView } from "./MailDetailView";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "mail",
    prefab: "bundles/module/mail/prefabs/MailView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("MailView")
export class MailView extends BaseView {
    /** 列表布局和按钮整体随可用视口适配。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 右上角退出信箱。 */
    @property(Button) private closeButton: Button | null = null;
    /** 已读邮件的批量删除。 */
    @property(Button) private deleteReadButton: Button | null = null;
    /** 可领取系统邮件附件的批量领取。 */
    @property(Button) private claimAllButton: Button | null = null;
    /** 按时间倒序展示可滚动的真实收到的邮件。 */
    @property(SuperScroll) private list: SuperScroll | null = null;

    /** 菜单关闭时撤销读窗反馈及所有页面监听。 */
    private observing = false;

    /** 绑定窗口并同步索引，空信箱使用原版留白。 */
    public onOpen(): void {
        if (this.observing) {
            return;
        }
        if (!this.panel || !this.closeButton || !this.deleteReadButton || !this.claimAllButton || !this.list) {
            throw new Error("邮件窗口缺少必需的预制体绑定");
        }
        this.list.validateBindings();
        this.observing = true;
        this.bind(this.closeButton, this.close);
        this.bind(this.deleteReadButton, this.deleteRead);
        this.bind(this.claimAllButton, this.claimAll);
        const content = this.list.list.node;
        content.on(SuperContent.RENDER_ITEM, this.paintCell, this);
        content.on(SuperContent.SELECT_ITEM, this.showDetail, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("mail.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        MailController.instance.setVisible(true);
        this.paint();
    }

    /** 在关窗时释放虚拟行及本窗口的错误反馈。 */
    public onClose(): void {
        if (this.observing) {
            this.observing = false;
            MailController.instance.setVisible(false);
        }
        if (this.list?.content?.isValid) {
            this.list.list.clear();
        }
    }

    /** 将 Prefab 按钮接到本界面操作，并在父页面关闭后安全解绑。 */
    private bind(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback, this);
            }
        });
    }

    /** 按视口保持窗口原比例。 */
    private fit(): void {
        const viewport = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, viewport.width / panel.width, viewport.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 使用服务器数据重绘信箱，提交期间避免重复点击。 */
    private paint(): void {
        const state = MailModel.instance.state;
        const canSubmit = !MailController.instance.busy && !!state;
        this.list!.list.setData(state?.entries ?? []);
        this.deleteReadButton!.interactable = canSubmit;
        this.claimAllButton!.interactable = canSubmit;
    }

    /** 来信列表项复用原版四种信封状态。 */
    private paintCell(node: Node, entry: MailEntry): void {
        node.getComponent(MailCell)!.paint(entry);
    }

    /** 从当前索引打开一个独立的详情层，详情负责请求已读回执。 */
    private showDetail(entry: MailEntry): void {
        if (!MailController.instance.busy && MailModel.instance.entryFor(entry.id)) {
            void UIManager.instance.openChild(this, MailDetailView, { id: entry.id }).catch(() => {
                // 预制体加载失败交由 UIManager 提示。
            });
        }
    }

    /** 把批量删除交给领域条件，未处理附件的邮件会保留。 */
    private deleteRead(): void {
        if (!MailModel.instance.state?.entries.some(entry => entry.read && entry.claimed)) {
            UIManager.instance.toast("没有可删除的已读邮件");
            return;
        }
        void MailController.instance.deleteRead();
    }

    /** 批量结清待收邮件，服务端统一合并其中实际存在的附件。 */
    private claimAll(): void {
        if (!MailModel.instance.state?.entries.some(entry => !entry.claimed)) {
            UIManager.instance.toast("没有可领取的邮件");
            return;
        }
        void MailController.instance.claimAll();
    }
}
