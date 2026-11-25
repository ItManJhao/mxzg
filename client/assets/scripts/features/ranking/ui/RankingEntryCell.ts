/** 共用榜单行，绘制服务端返回的名单和独立的本人排名。 */
import { _decorator, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import type { RankingBoardKind, RankingEntry } from "../data/RankingData";
import { RankingDisplayUtils } from "./RankingDisplayUtils";

const { ccclass, property } = _decorator;

@ccclass("RankingEntryCell")
export class RankingEntryCell extends Component {
    /** 榜单行的固定边框。 */
    @property(Sprite) private background: Sprite | null = null;
    /** 普通榜单行底图。 */
    @property(SpriteFrame) private normal: SpriteFrame | null = null;
    /** 本人排名使用的浅黄底图。 */
    @property(SpriteFrame) private highlight: SpriteFrame | null = null;
    /** 第一至第三名的彩色名次旗。 */
    @property([SpriteFrame]) private rankFrames: SpriteFrame[] = [];
    /** 前三名旗位，其他名次使用数字。 */
    @property(Sprite) private rankIcon: Sprite | null = null;
    /** 名次文字，仅用于第四名以后。 */
    @property(Label) private rankText: Label | null = null;
    /** 榜单头像或公会徽章。 */
    @property(Node) private face: Node | null = null;
    /** 角色头像边框，与公会徽章互斥。 */
    @property(Node) private border: Node | null = null;
    /** 服务端的角色或公会显示名及区服。 */
    @property(Label) private entryName: Label | null = null;
    /** 角色等级或公会会长。 */
    @property(Label) private subtitle: Label | null = null;
    /** 服务端的排序值。 */
    @property(Label) private score: Label | null = null;

    /** 更新共享排行行，服务端名次未上榜时显示文字。 */
    public paint(entry: RankingEntry, kind: RankingBoardKind, own: boolean): void {
        const flag = this.rankFrames[entry.rank - 1] ?? null;
        this.background!.spriteFrame = own ? this.highlight : this.normal;
        this.rankIcon!.node.active = !!flag;
        this.rankIcon!.spriteFrame = flag;
        this.rankText!.node.active = !flag;
        this.rankText!.string = entry.rank ? String(entry.rank) : "未上榜";
        this.entryName!.string = `${RankingDisplayUtils.serverTag(entry.serverId)}${entry.name}`;
        this.subtitle!.string = RankingDisplayUtils.isGuild(kind) ? `会长：${entry.leaderName}` : `等级 ${entry.level}`;
        this.score!.string = String(entry.score);
        RankingDisplayUtils.paintPortrait(this.face!, this.border!, kind, entry);
    }

    /** 隐藏本人项前释放此前绑定的图标。 */
    public reset(kind: RankingBoardKind): void {
        RankingDisplayUtils.paintPortrait(this.face!, this.border!, kind);
    }
}
