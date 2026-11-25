/** 公会排行复用行，显示真实徽章、会长、名次和公会总战力。 */
import { _decorator, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { GuildRankEntry } from "../data/GuildRankingData";
import { GuildBadgeUtils } from "./GuildBadgeUtils";

const { ccclass, property } = _decorator;

@ccclass("GuildRankingCell")
export class GuildRankingCell extends Component {
    /** 普通排名底色。 */
    @property(Sprite) private _background: Sprite | null = null;
    /** 本人公会或领先公会的亮色底图。 */
    @property(SpriteFrame) private _highlight: SpriteFrame | null = null;
    /** 其他行的底图，重用虚拟格时恢复该帧。 */
    @property(SpriteFrame) private _normal: SpriteFrame | null = null;
    /** 第一至第三名的原版彩色名次旗。 */
    @property([SpriteFrame]) private _rankFrames: SpriteFrame[] = [];
    /** 前三名旗面，其他行由 _rankLabel 表示。 */
    @property(Sprite) private _rankIcon: Sprite | null = null;
    /** 非前三的服务器名次。 */
    @property(Label) private _rankLabel: Label | null = null;
    /** 公会选择的旧徽章，首屏和虚拟滚动共用同一资源入口。 */
    @property(Node) private _badge: Node | null = null;
    /** 区服前缀和实际公会名。 */
    @property(Label) private _guildName: Label | null = null;
    /** 查询时实际当选会长的名字。 */
    @property(Label) private _leaderName: Label | null = null;
    /** 所有正式成员的历史最高主阵容战力之和。 */
    @property(Label) private _power: Label | null = null;
    /** 本行目前绘制的徽章编号；复用切换后原异步请求失效。 */
    private badgeId: number | null = null;

    /** 普通名单与表脚共用本行；重新绑定时刷新旗面和选中背景。 */
    public render(row: GuildRankEntry, highlight: boolean): void {
        this._background!.spriteFrame = highlight ? this._highlight : this._normal;
        const frame = this._rankFrames[row.rank - 1] ?? null;
        this._rankIcon!.node.active = frame !== null;
        this._rankIcon!.spriteFrame = frame;
        this._rankLabel!.node.active = frame === null;
        this._rankLabel!.string = row.rank > 0 ? String(row.rank) : "—";
        const server = /^\d+$/.test(row.serverId) ? `S${row.serverId}` : row.serverId;
        this._guildName!.string = `[${server}]${row.name}`;
        this._leaderName!.string = `会长：${row.leaderName}`;
        this._power!.string = String(row.power);
        if (row.badgeId !== this.badgeId) {
            this.badgeId = row.badgeId;
            this._badge!.getComponent(Sprite)!.spriteFrame = null;
            ResManager.setSprite(this._badge, GuildBadgeUtils.source(row.badgeId));
        }
    }
}
