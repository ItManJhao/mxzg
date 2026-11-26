/** 主城好友四页签，读取同一份好友快照，操作和网络交给 FriendController。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { ConfirmView, type ConfirmArgs } from "../../common/ui/ConfirmView";
import { FriendController } from "../FriendController";
import { FriendModel } from "../FriendModel";
import type { FriendAction, FriendEntry, FriendTab } from "../data/FriendData";
import { FriendCell } from "./FriendCell";
import { FriendSearchView } from "./FriendSearchView";

const { ccclass, property } = _decorator;
/** 显示顺序遵循原页签与预制体绑定。 */
const tabs: readonly FriendTab[] = ["friends", "gifts", "applications", "blocked"];
/** 原策划表中的友情点物品。 */
const FRIENDSHIP_ITEM = 900301;

/** 主城快捷栏及聊天加号可以复用好友列表，选中聊天时回到调用方。 */
export interface FriendViewArgs {
    readonly onOpenChat?: (peer: FriendEntry) => void;
}

@UIRegistry.view({ id: "friend", prefab: "bundles/module/friend/prefabs/FriendView", layer: UILayer.Popup,
    hostId: "remake-modal", cache: false, allowMultiple: false, modal: { mask: true, closeOnOutside: true } })
@ccclass("FriendView")
export class FriendView extends BaseView<FriendViewArgs> {
    /** 可见区等比适配的原窗口面板。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 标题栏旁的关闭键。 */
    @property(Button) private closeButton: Button | null = null;
    /** 四张原页签按钮，顺序与 tabs 一致。 */
    @property([Button]) private tabButtons: Button[] = [];
    /** 浅色选中底图，与页签按钮同序。 */
    @property([Node]) private tabHighlights: Node[] = [];
    /** 礼物和申请页签的公共红点锚点。 */
    @property([Node]) private reminderAnchors: Node[] = [];
    /** 四页签统一使用的裁切和虚拟列表。 */
    @property(SuperScroll) private rows: SuperScroll | null = null;
    /** 友情点计数条，好友和礼物页可见。 */
    @property(Node) private friendshipBar: Node | null = null;
    /** 由统一背包快照刷新友情点余额。 */
    @property(Label) private friendship: Label | null = null;
    /** 当前列表人数、礼物数或上限。 */
    @property(Label) private count: Label | null = null;
    /** 好友页的删除模式按钮。 */
    @property(Button) private removeButton: Button | null = null;
    /** 删除模式开启后切换为完成。 */
    @property(Label) private removeLabel: Label | null = null;
    /** 打开搜索与推荐窗口。 */
    @property(Button) private searchButton: Button | null = null;
    /** 按当前页签执行一键赠送或一键领取。 */
    @property(Button) private bulkButton: Button | null = null;
    /** 好友／礼物页批量操作文案。 */
    @property(Label) private bulkLabel: Label | null = null;
    /** 当前活动页签，关窗时恢复好友页。 */
    private tab: FriendTab = "friends";
    /** 好友页显示删除动作时为 true，切页或关闭时复位。 */
    private removing = false;
    /** 是否已经为这次显示绑定控件监听。 */
    private opened = false;
    /** 礼物、申请页签的绑定，关闭时释放。 */
    private dots: RedDotBinding[] = [];

    /** 首次显示时校验控件、订阅快照，并立即渲染当前状态。 */
    public onOpen(args?: FriendViewArgs): void {
        if (this.opened) {
            return;
        }
        super.onOpen(args);
        if (!this.panel || !this.closeButton || !this.rows || !this.friendshipBar || !this.friendship || !this.count
            || !this.removeButton || !this.removeLabel || !this.searchButton || !this.bulkButton || !this.bulkLabel
            || this.tabButtons.length !== 4 || this.tabHighlights.length !== 4 || this.reminderAnchors.length !== 2) {
            throw new Error("FriendView.prefab 缺少好友页绑定");
        }
        this.rows.validateBindings();
        this.opened = true;
        this.dots = this.reminderAnchors.map(anchor => RedDotBinding.atAnchor(anchor));
        this.bindControls();
        FriendController.instance.setVisible(true);
        this.render();
    }

    /** 关闭时撤销红点和列表，保持模块可继续接收真实好友通知。 */
    public onClose(): void {
        this.opened = false;
        this.tab = "friends";
        this.removing = false;
        FriendController.instance.setVisible(false);
        for (const dot of this.dots.splice(0)) {
            dot.dispose();
        }
        if (this.rows?.content?.isValid) {
            this.rows.list.clear();
        }
    }

    /** 绑定位于预制体中的导航、滚动条及按钮。 */
    private bindControls(): void {
        this.bindClick(this.closeButton!, () => this.close());
        this.tabButtons.forEach((button, index) => this.bindClick(button, () => this.selectTab(tabs[index])));
        this.bindClick(this.removeButton!, () => {
            this.removing = !this.removing;
            this.render();
        });
        this.bindClick(this.searchButton!, () => this.openSearch());
        this.bindClick(this.bulkButton!, () => this.bulk());
        const content = this.rows!.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderCell, this);
        content.on(FriendCell.ACTION, this.change, this);
        content.on(FriendCell.PROFILE, this.profile, this);
        content.on(FriendCell.CHAT, this.openChat, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("friend.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.renderFriendship));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => {
            const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
            const panel = this.panel!;
            const scale = Math.min(1, box.width * 0.97 / panel.width, box.height * 0.9 / panel.height);
            panel.node.setScale(scale, scale, 1);
        }));
    }

    /** 一个按钮属于本窗当前的显示期。 */
    private bindClick(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 搜索窗归当前好友窗口，框架取消打开时无需展示错误。 */
    private openSearch(): void {
        void UIManager.instance.openChild(this, FriendSearchView).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("好友搜索打开失败");
            }
        });
    }

    /** 切换页签时结束删除模式，列表从首项开始显示。 */
    private selectTab(tab: FriendTab): void {
        if (this.tab !== tab) {
            this.tab = tab;
            this.removing = false;
            this.render();
            this.rows!.toStart();
        }
    }

    /** 每页只切换明确需要的底部控件，空列表保留正式服底板。 */
    private render(): void {
        const state = FriendModel.instance.state;
        const busy = FriendController.instance.busy;
        const friends = this.tab === "friends";
        const gifts = this.tab === "gifts";
        const rows = state?.[this.tab] ?? [];
        const availableGifts = state?.gifts.filter(entry => entry.giftState === 1).length ?? 0;
        this.rows!.list.setData(rows);
        this.tabHighlights.forEach((node, index) => { node.active = this.tab === tabs[index]; });
        this.dots[0].setVisible(availableGifts > 0);
        this.dots[1].setVisible((state?.applications.length ?? 0) > 0);
        this.friendshipBar!.active = friends || gifts;
        this.renderFriendship();
        this.count!.string = !state ? "" : friends ? `好友数 ${rows.length}/${state.friendLimit}` : gifts
            ? `礼物数 ${availableGifts}` : this.tab === "applications" ? `申请数 ${rows.length}` : `黑名单 ${rows.length}/${state.blockLimit}`;
        this.removeButton!.node.active = friends;
        this.removeButton!.interactable = !busy && rows.length > 0;
        this.removeLabel!.string = this.removing ? "完成" : "删除好友";
        this.searchButton!.node.active = friends;
        this.bulkButton!.node.active = friends || gifts;
        this.bulkButton!.interactable = !busy && (friends
            ? !!state && state.sentToday < state.sendLimit && rows.some(entry => !entry.sentToday) : availableGifts > 0);
        this.bulkLabel!.string = friends ? "一键赠送" : "一键领取";
    }

    /** 从统一资产状态读取友情点，赠礼领取和其他库存变化走同一刷新入口。 */
    private renderFriendship(): void {
        this.friendship!.string = String(BagModel.instance.quantity(FRIENDSHIP_ITEM));
    }

    /** 使用当前页签决定同一列表行的操作。 */
    private renderCell(node: Node, entry: FriendEntry): void {
        node.getComponent(FriendCell)?.paint(entry, this.removing ? "remove" : this.tab,
            FriendController.instance.busy, !!this.args?.onOpenChat);
    }

    /** 选择好友后关闭当前好友页，已打开的聊天窗可以直接切换到这个对象。 */
    private openChat(entry: FriendEntry): void {
        const callback = this.args?.onOpenChat;
        if (callback) {
            this.close();
            callback(entry);
        }
    }

    /** 批量操作仅提交当前页签明确选择的动作。 */
    private bulk(): void {
        FriendController.instance.change(this.tab === "friends" ? "SEND_ALL" : "CLAIM_ALL");
    }

    /** 破坏好友关系前确认；其他行操作直接由服务器校验。 */
    private change(action: FriendAction, entry: FriendEntry): void {
        if (action === "REMOVE") {
            this.confirm({ title: "删除好友", message: `确认删除好友 ${entry.name}？`,
                onConfirm: () => FriendController.instance.change(action, entry.roleId) });
        } else {
            FriendController.instance.change(action, entry.roleId);
        }
    }

    /** 通过好友公开卡查看资料，可进一步执行黑名单操作。 */
    private profile(entry: FriendEntry): void {
        this.confirm({ title: entry.name, message: `等级 ${entry.level}\n战力 ${entry.power}\n将对方加入黑名单？`,
            confirmText: "拉黑", onConfirm: () => FriendController.instance.change("BLOCK", entry.roleId) });
    }

    /** 确认窗跟随好友窗口释放，切换角色时不会提交旧意图。 */
    private confirm(args: ConfirmArgs): void {
        void UIManager.instance.openChild(this, ConfirmView, args).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("好友操作窗口打开失败");
            }
        });
    }
}
