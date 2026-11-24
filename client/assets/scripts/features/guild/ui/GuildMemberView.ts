/** 公会成员窗，以真实成员快照显示人数和职务，并通过通用确认框发起退会。 */
import { _decorator, Button, Label, Node } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { GuildController } from "../GuildController";
import { GuildModel, type GuildMember } from "../GuildModel";
import type { GuildRosterArgs } from "./GuildApprovalView";
import { GuildMemberCell } from "./GuildMemberCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "guild-members",
    prefab: "bundles/module/guild/prefabs/GuildMemberView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildMemberView")
export class GuildMemberView extends BaseView<GuildRosterArgs> {
    /** 上方右侧的实际人数和容量。 */
    @property(Label) private _count: Label | null = null;
    /** 中间滚动区域只显示实际已加入的成员。 */
    @property(SuperScroll) private _list: SuperScroll | null = null;
    /** 底部操作，确认后发送退会请求。 */
    @property(Button) private _leave: Button | null = null;
    /** 右上角关闭按钮。 */
    @property(Button) private _close: Button | null = null;

    /** 开启成员窗时绑定本次窗口的事件，退出时清理仍存活的节点。 */
    public onOpen(args?: GuildRosterArgs): void {
        super.onOpen(args);
        if (!args?.guildId || !args.roleId || !this._count || !this._list || !this._leave || !this._close) {
            throw new Error("公会成员窗缺少参数或预制体绑定");
        }
        const scroll = this._list.list.node;
        const close = this._close.node;
        const leave = this._leave.node;
        scroll.on(SuperContent.RENDER_ITEM, this.renderRow, this);
        close.on(Button.EventType.CLICK, this.close, this);
        leave.on(Button.EventType.CLICK, this.confirmLeave, this);
        this.ownListener(() => {
            if (scroll.isValid) {
                scroll.off(SuperContent.RENDER_ITEM, this.renderRow, this);
            }
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
            if (leave.isValid) {
                leave.off(Button.EventType.CLICK, this.confirmLeave, this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("guild.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
        this.render();
    }

    /** 快照上屏时更新人数与虚拟行，退会成功后关闭旧成员窗。 */
    private render(): void {
        const snapshot = GuildModel.instance.snapshot;
        if (!snapshot?.guild || snapshot.guild.id !== this.args?.guildId
            || !snapshot.members.some(member => member.id === this.args?.roleId)) {
            this.close();
            return;
        }
        this._count!.string = `${snapshot.guild.memberCount}/${snapshot.guild.capacity}`;
        this._leave!.interactable = !GuildController.instance.busy;
        this._list!.list.setData(snapshot.members);
    }

    /** 将当前成员及本人标记填入复用行，不以职务推定选中底图。 */
    private renderRow(node: Node, member: GuildMember): void {
        node.getComponent(GuildMemberCell)!.render(member, member.id === this.args?.roleId);
    }

    /** 确认窗随成员窗关闭，回包在服务端提交后更新公会大厅。 */
    private confirmLeave(): void {
        const snapshot = GuildModel.instance.snapshot;
        const guild = snapshot?.guild;
        if (!guild || guild.id !== this.args?.guildId) {
            return;
        }
        const disband = guild.memberCount === 1
            && snapshot.members.some(member => member.id === this.args?.roleId && member.leader);
        void UIManager.instance.openChild(this, ConfirmView, {
            title: disband ? "解散公会" : "退出公会",
            message: disband ? `离开将解散「${guild.name}」，确定继续？`
                : `确定退出「${guild.name}」？退出后需等待冷却才能加入公会。`,
            onConfirm: () => GuildController.instance.change({ action: "LEAVE", guildId: guild.id }),
        }).catch(() => {
            // UIManager 统一提示打开失败。
        });
    }
}
