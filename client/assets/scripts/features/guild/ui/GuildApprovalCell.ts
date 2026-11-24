/** 申请名单的独立虚拟行，显示申请人资料和原版纵向的同意、忽略按钮。 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import type { GuildMember } from "../GuildModel";

const { ccclass, property } = _decorator;
type Decision = "APPROVE" | "REJECT";

@ccclass("GuildApprovalCell")
export class GuildApprovalCell extends Component {
    /** 名字与等级以服务器返回的申请人快照为准。 */
    @property(Label) private _nameLabel: Label | null = null;
    /** 独立的角色等级行。 */
    @property(Label) private _level: Label | null = null;
    /** 申请人实际头像；旧回包缺失时隐藏。 */
    @property(Node) private _face: Node | null = null;
    /** 申请人当前头像框；0 使用默认框。 */
    @property(Node) private _border: Node | null = null;
    /** 同意当前行绑定的申请。 */
    @property(Button) private _approve: Button | null = null;
    /** 忽略当前行绑定的申请。 */
    @property(Button) private _reject: Button | null = null;
    /** 复用行改绑时，清理上一名申请人尚显示的头像。 */
    private portraitKey = "";
    /** 当前行有效的审批动作，回收时解除。 */
    private decide: ((decision: Decision) => void) | null = null;

    /** 每个实际行只注册一次点击。 */
    protected onLoad(): void {
        this._approve!.node.on(Button.EventType.CLICK, this.approve, this);
        this._reject!.node.on(Button.EventType.CLICK, this.reject, this);
    }

    /** 回收离开视口时解除旧审批意图。 */
    protected onDisable(): void {
        this.decide = null;
    }

    /** 切页销毁时释放审批回调，并从仍存活的按钮节点解除本行监听。 */
    protected onDestroy(): void {
        this.decide = null;
        const approveNode = this._approve?.node;
        const rejectNode = this._reject?.node;
        if (approveNode?.isValid) {
            approveNode.off(Button.EventType.CLICK, this.approve, this);
        }
        if (rejectNode?.isValid) {
            rejectNode.off(Button.EventType.CLICK, this.reject, this);
        }
    }

    /** 一次性绑定昵称、等级、头像以及当前可用的审批操作。 */
    public render(member: GuildMember, busy: boolean, decide: (decision: Decision) => void): void {
        this._nameLabel!.string = member.nickname;
        this._level!.string = `等级 ${member.level}`;
        const portraitKey = `${member.headId}:${member.borderId}`;
        if (portraitKey !== this.portraitKey) {
            this.portraitKey = portraitKey;
            if (member.headId === undefined) {
                for (const node of [this._face!, this._border!]) {
                    ResManager.setSprite(node, null);
                    node.active = false;
                }
            } else {
                this._face!.getComponent(Sprite)!.spriteFrame = null;
                this._border!.getComponent(Sprite)!.spriteFrame = null;
                RolePortraitUtils.paint(this._face, this._border, member.headId, member.borderId);
            }
        }
        this.decide = busy ? null : decide;
        this._approve!.interactable = !busy;
        this._reject!.interactable = !busy;
    }

    /** 由窗口当前绑定的处理函数确认申请。 */
    private approve(): void {
        this.decide?.("APPROVE");
    }

    /** 由窗口当前绑定的处理函数忽略申请。 */
    private reject(): void {
        this.decide?.("REJECT");
    }
}
