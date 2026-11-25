/** 竞技场排行与我的排名共用原版角色卡，排行和点赞状态由服务器提供。 */
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import type { ArenaRanking } from "../ArenaModel";

const { ccclass, property } = _decorator;

@ccclass("ArenaRankCell")
export class ArenaRankCell extends Component {
    /** 榜单前三名使用原活动的红、银、铜排名牌。 */
    @property([SpriteFrame]) private badges: SpriteFrame[] = [];
    /** 可复用的排名徽记。 */
    @property(Sprite) private badge: Sprite | null = null;
    /** 普通排行或榜外说明。 */
    @property(Label) private rankLabel: Label | null = null;
    /** 当前行的角色头像。 */
    @property(Node) private face: Node | null = null;
    /** 角色原版框的资源挂点。 */
    @property(Node) private border: Node | null = null;
    /** 与头像一起显示的真实角色等级。 */
    @property(Label) private levelLabel: Label | null = null;
    /** 当前排行条目的角色名。 */
    @property(Label) private nameLabel: Label | null = null;
    /** 服务器当前主队战力。 */
    @property(Label) private powerLabel: Label | null = null;
    /** 本期竞技积分。 */
    @property(Label) private scoreLabel: Label | null = null;
    /** 以实际资格切换的点赞操作。 */
    @property(Button) private likeButton: Button | null = null;
    /** 复用原灰白与金色点赞图。 */
    @property(Sprite) private likeIcon: Sprite | null = null;
    /** 前一张是禁用态，后一张是当日可操作态。 */
    @property([SpriteFrame]) private likeFrames: SpriteFrame[] = [];
    /** 真实收到的点赞数。 */
    @property(Label) private likeCount: Label | null = null;
    /** 行框用于切换普通与自己的亮色卡。 */
    @property(Sprite) private background: Sprite | null = null;
    /** 普通米色框与自选黄色框。 */
    @property([SpriteFrame]) private backgrounds: SpriteFrame[] = [];
    /** 本行当前能触发的点赞回调，复用时替换。 */
    private like: (() => void) | null = null;

    /** 初次激活绑定该卡片的点赞入口。 */
    protected onLoad(): void {
        this.likeButton!.node.on(Button.EventType.CLICK, this.onLike, this);
    }

    /** 复用原三色徽记，自己和已点赞的行使用禁用外观。 */
    public paint(row: ArenaRanking, own: boolean, like: (() => void) | null): void {
        this.like = like;
        const frame = this.badges[row.rank - 1];
        this.badge!.node.active = !!frame;
        this.badge!.spriteFrame = frame ?? null;
        this.rankLabel!.node.active = !frame;
        this.rankLabel!.string = row.rank > 0 ? String(row.rank) : "榜外";
        this.background!.spriteFrame = this.backgrounds[own ? 1 : 0];
        RolePortraitUtils.paint(this.face, this.border, row.headId, row.borderId);
        this.levelLabel!.string = String(row.level);
        this.nameLabel!.string = row.name;
        this.powerLabel!.string = `战力 ${row.power}`;
        this.scoreLabel!.string = `积分 ${row.score}`;
        this.likeCount!.string = String(Math.min(row.receivedLikes, 999));
        this.likeButton!.interactable = like !== null;
        this.likeButton!.node.getComponent(Sprite)!.grayscale = like === null;
        this.likeIcon!.spriteFrame = this.likeFrames[like ? 1 : 0];
    }

    /** 当前卡片只允许执行外层给出的操作。 */
    private onLike(): void {
        this.like?.();
    }
}
