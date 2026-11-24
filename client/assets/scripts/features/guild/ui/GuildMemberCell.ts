/** 公会成员列表的复用格。显示真实头像、等级、昵称与当前已实现的职务。 */
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
    /** 成员实际头像；旧回包未同步时隐藏。 */
    @property(Node) private _face: Node | null = null;
    /** 成员当前头像框；0 使用默认框。 */
    @property(Node) private _border: Node | null = null;
    /** 上一次实际下发头像的组合，换人时清掉旧画面。 */
    private portraitKey = "";

    /** 将虚拟名单当前的数据应用到原版样式的头像与文字。 */
    public render(member: GuildMember): void {
        this._level!.string = String(member.level);
        this._nameLabel!.string = member.nickname;
        this._position!.string = member.leader ? "职位：会长" : "职位：成员";
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
