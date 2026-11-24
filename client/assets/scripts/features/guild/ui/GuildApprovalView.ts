/** 公会申请审批窗，按服务端待审名单显示申请人，由 GuildController 提交决定。 */
import { _decorator, Button, Label, Node } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { GuildController } from "../GuildController";
import { GuildModel, type GuildMember } from "../GuildModel";
import { GuildApprovalCell } from "./GuildApprovalCell";

/** 打开窗口时捕获公会和当前角色，归属或审批权限变化后关闭。 */
export interface GuildRosterArgs {
    readonly guildId: string;
    readonly roleId: string;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "guild-approval",
    prefab: "bundles/module/guild/prefabs/GuildApprovalView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("GuildApprovalView")
export class GuildApprovalView extends BaseView<GuildRosterArgs> {
    /** 关闭审批窗并返回公会大厅。 */
    @property(Button) private _close: Button | null = null;
    /** 待审批数据使用与原版一致的纵向行结构。 */
    @property(SuperScroll) private _list: SuperScroll | null = null;
    /** 真实列表为空时显示。 */
    @property(Label) private _empty: Label | null = null;

    /** 绑定本次弹窗的虚拟列表和状态监听，退出时解除仍存活节点的监听。 */
    public onOpen(args?: GuildRosterArgs): void {
        super.onOpen(args);
        if (!args?.guildId || !args.roleId || !this._close || !this._list || !this._empty) {
            throw new Error("公会申请窗缺少参数或预制体绑定");
        }
        const scroll = this._list.list.node;
        const close = this._close.node;
        scroll.on(SuperContent.RENDER_ITEM, this.renderRow, this);
        close.on(Button.EventType.CLICK, this.close, this);
        this.ownListener(() => {
            if (scroll.isValid) {
                scroll.off(SuperContent.RENDER_ITEM, this.renderRow, this);
            }
            if (close.isValid) {
                close.off(Button.EventType.CLICK, this.close, this);
            }
        });
        this.ownListener(EventDispatcher.instance.on("guild.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node,
            () => ViewportLayoutUtils.fitVisibleRoot(this.node)));
        this.render();
    }

    /** 只展示当前公会的真实申请，失去会长权限后关闭旧窗口。 */
    private render(): void {
        const snapshot = GuildModel.instance.snapshot;
        if (!snapshot?.guild || snapshot.guild.id !== this.args?.guildId
            || !snapshot.members.some(member => member.id === this.args?.roleId && member.leader)) {
            this.close();
            return;
        }
        this._empty!.node.active = snapshot.applications.length === 0;
        this._list!.list.setData(snapshot.applications);
    }

    /** 把指令绑定到当前复用行及其真实申请人，服务器仍会核验审批。 */
    private renderRow(node: Node, applicant: GuildMember): void {
        const guildId = this.args!.guildId;
        node.getComponent(GuildApprovalCell)!.render(applicant, GuildController.instance.busy,
            action => GuildController.instance.change({ action, guildId, applicantId: applicant.id }));
    }
}
