/** 公会成员列表的复用格。显示服务器提供的身份、职务和当前主阵容战力。 */
import { _decorator, Component, Label, Node, Sprite } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import type { GuildMember } from "../GuildModel";

const { ccclass, property } = _decorator;

@ccclass("GuildMemberCell")
export class GuildMemberCell extends Component {
    /** 头像下方等级底牌中的数字。 */
    @property(Label) private _level: Label | null = null;
    /** 成员的角色昵称。 */
    @property(Label) private _nameLabel: Label | null = null;
    /** 显示本成员是会长或普通成员。 */
    @property(Label) private _position: Label | null = null;
    /** 已同步的主阵容战力行；字段缺失时隐藏。 */
    @property(Label) private _power: Label | null = null;
    /** 本人所在行的黄色背景，复用到其他成员时清掉。 */
    @property(Node) private _selfHighlight: Node | null = null;
    /** 成员实际头像；旧回包未同步时隐藏。 */
    @property(Node) private _face: Node | null = null;
    /** 成员当前头像框；0 使用默认框。 */
    @property(Node) private _border: Node | null = null;
    /** 上一次实际下发头像的组合，换人时清掉旧画面。 */
    private portraitKey = "";

    /** 绑定真实成员资料；黄色底图仅选中本人，非会长身份提示。 */
    public render(member: GuildMember, self: boolean): void {
        this._level!.string = String(member.level);
        this._nameLabel!.string = member.nickname;
        this._position!.string = member.leader ? "职位：会长" : "职位：成员";
        this._power!.node.active = member.power !== undefined;
        this._power!.string = member.power === undefined ? "" : `战斗力：${member.power}`;
        this._selfHighlight!.active = self;
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
    }
}
