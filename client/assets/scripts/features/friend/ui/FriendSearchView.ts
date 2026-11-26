/** 好友搜索子窗。输入和虚拟列表由静态预制体提供，查询和申请交给好友控制器。 */
import { _decorator, Button, EditBox, Label, Node, UITransform } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { FriendController } from "../FriendController";
import { FriendModel } from "../FriendModel";
import type { FriendAction, FriendEntry } from "../data/FriendData";
import { FriendCell } from "./FriendCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({ id: "friend-search", prefab: "bundles/module/friend/prefabs/FriendSearchView", layer: UILayer.Dialog,
    hostId: "remake-modal", cache: false, allowMultiple: false, modal: { mask: true, closeOnOutside: true } })
@ccclass("FriendSearchView")
export class FriendSearchView extends BaseView {
    /** 原搜索面板的可见区比例参考。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 关闭子窗。 */
    @property(Button) private closeButton: Button | null = null;
    /** 输入名称或角色编号。 */
    @property(EditBox) private input: EditBox | null = null;
    /** 用当前输入提交搜索。 */
    @property(Button) private searchButton: Button | null = null;
    /** 清空输入并重新查询推荐。 */
    @property(Button) private refreshButton: Button | null = null;
    /** 以同一好友卡片显示服务端查询结果。 */
    @property(SuperScroll) private rows: SuperScroll | null = null;
    /** 可添加人数及上限沿用同一好友状态。 */
    @property(Label) private count: Label | null = null;
    /** 本次显示已登记监听，重复打开不再注册相同点击。 */
    private opened = false;

    /** 打开时绑定文字及列表操作，并先列出服务端推荐。 */
    public onOpen(): void {
        if (this.opened) {
            return;
        }
        if (!this.panel || !this.closeButton || !this.input || !this.searchButton || !this.refreshButton
            || !this.rows || !this.count) {
            throw new Error("FriendSearchView.prefab 缺少搜索绑定");
        }
        this.rows.validateBindings();
        this.opened = true;
        this.input.string = "";
        this.bindClick(this.closeButton, () => this.close());
        this.bindClick(this.searchButton, () => this.submit());
        this.bindClick(this.refreshButton, () => {
            this.input!.string = "";
            this.submit();
        });
        const field = this.input.node;
        const content = this.rows.list.node;
        field.on(EditBox.EventType.EDITING_RETURN, this.submit, this);
        content.on(SuperContent.RENDER_ITEM, this.renderCell, this);
        content.on(FriendCell.ACTION, this.apply, this);
        this.ownListener(() => {
            if (field.isValid) {
                field.targetOff(this);
            }
            if (content.isValid) {
                content.targetOff(this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("friend.updated", this, this.render));
        this.ownListener(EventDispatcher.instance.on("friend.search.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => {
            const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
            const panel = this.panel!;
            const scale = Math.min(1, box.width * 0.96 / panel.width, box.height * 0.86 / panel.height);
            panel.node.setScale(scale, scale, 1);
        }));
        FriendController.instance.search("");
        this.render();
    }

    /** 关闭时取消当前搜索交付并释放输入焦点。 */
    public onClose(): void {
        this.opened = false;
        FriendController.instance.closeSearch();
        this.input?.blur();
        if (this.rows?.content?.isValid) {
            this.rows.list.clear();
        }
    }

    /** 按钮监听只在当前子窗显示期存在。 */
    private bindClick(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 从第一行显示新搜索结果，空查询读取真实在线推荐。 */
    private submit(): void {
        FriendController.instance.search(this.input?.string ?? "");
        this.rows!.toStart();
    }

    /** 渲染当前搜索结果和由同一好友状态提供的容量。 */
    private render(): void {
        const state = FriendModel.instance.state;
        this.count!.string = state ? `好友数 ${state.friends.length}/${state.friendLimit}` : "";
        this.rows!.list.setData(FriendModel.instance.searchResult?.entries ?? []);
    }

    /** 使用添加场景绘制当前虚拟格。 */
    private renderCell(node: Node, entry: FriendEntry): void {
        node.getComponent(FriendCell)?.paint(entry, "search", FriendController.instance.busy);
    }

    /** 发出添加意图，控制器负责申请及搜索结果的刷新。 */
    private apply(action: FriendAction, entry: FriendEntry): void {
        if (action === "APPLY") {
            FriendController.instance.change(action, entry.roleId);
        }
    }
}
