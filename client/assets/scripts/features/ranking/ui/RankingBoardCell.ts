/** 排行总览的一张榜首卡片，由排行榜视图绑定数据并处理点击。 */
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import type { RankingBoard, RankingBoardKind } from "../data/RankingData";
import { RankingDisplayUtils } from "./RankingDisplayUtils";

const { ccclass, property } = _decorator;

/** 图集帧与排行种类同序，跨服图片的第一名图章单独绑定。 */
const BOARD_ART: readonly RankingBoardKind[] = ["CHAPTER", "GUILD", "POWER", "CROSS_GUILD", "CROSS_POWER"];

@ccclass("RankingBoardCell")
export class RankingBoardCell extends Component {
    /** 点赞触发卡片事件，由上层视图转给当前会话的控制器。 */
    public static readonly LIKE = "ranking-board-like";

    /** 预制体内的背景图位。 */
    @property(Sprite) private artwork: Sprite | null = null;
    /** 本服三张与跨服两张的原版中文图集。 */
    @property([SpriteFrame]) private boardFrames: SpriteFrame[] = [];
    /** 跨服横幅首名标记，与本服背景原图自带标记对齐。 */
    @property(Node) private crossFirstBadge: Node | null = null;
    /** 首名头像，也用于绘制公会徽章。 */
    @property(Node) private face: Node | null = null;
    /** 只有角色首名显示边框。 */
    @property(Node) private border: Node | null = null;
    /** 榜首真实角色或公会名称。 */
    @property(Label) private displayName: Label | null = null;
    /** 第一名所在区服，仅跨服卡片显示。 */
    @property(Label) private serverName: Label | null = null;
    /** 第一名的关卡或战力值。 */
    @property(Label) private score: Label | null = null;
    /** 跨服卡片分数位于区服行下方，布局由 Prefab 保存。 */
    @property(Label) private crossScore: Label | null = null;
    /** 每张卡片自己的点赞入口，已赞和无榜首时隐藏。 */
    @property(Button) private likeButton: Button | null = null;
    /** 点赞图标右上角的红点锚点。 */
    @property(Node) private likeDotAnchor: Node | null = null;

    /** 当前虚拟格对应的未点赞榜种，换绑和销毁时清理。 */
    private likeKind: RankingBoardKind | null = null;
    /** 红点首次绘制时绑定，格子销毁时一并释放。 */
    private likeDot: RedDotBinding | null = null;

    /** 仅绑定一次点赞按钮，卡片本身的点击交给虚拟列表。 */
    protected onLoad(): void {
        if (!this.likeButton || !this.likeDotAnchor) {
            throw new Error("排行卡片未绑定点赞按钮或红点");
        }
        this.likeButton.node.on(Button.EventType.CLICK, this.onLike, this);
    }

    /** 刷新当前虚拟格，点赞待确认时暂时禁按，保留未赞状态直到收到回包。 */
    public paint(board: RankingBoard, busy: boolean): void {
        const cross = RankingDisplayUtils.isCross(board.kind);
        const leader = board.leader;
        const score = !leader ? "" : `${board.kind === "CHAPTER" ? "关卡" : "战力"} ${leader.score}`;
        this.artwork!.spriteFrame = this.boardFrames[BOARD_ART.indexOf(board.kind)];
        this.crossFirstBadge!.active = cross && !!leader;
        this.displayName!.string = leader?.name ?? "";
        this.serverName!.node.active = cross && !!leader;
        this.serverName!.string = leader ? RankingDisplayUtils.serverTag(leader.serverId) : "";
        this.score!.node.active = !cross;
        this.score!.string = score;
        this.crossScore!.node.active = cross;
        this.crossScore!.string = score;
        RankingDisplayUtils.paintPortrait(this.face!, this.border!, board.kind, leader);
        this.likeKind = leader && !board.liked ? board.kind : null;
        this.likeButton!.node.active = this.likeKind !== null;
        this.likeButton!.interactable = !busy && this.likeKind !== null;
        this.likeDot ??= RedDotBinding.atAnchor(this.likeDotAnchor!);
        this.likeDot.setVisible(this.likeKind !== null);
    }

    /** 广播当前榜种，不携带虚拟格上一次的列表数据。 */
    private onLike(): void {
        if (this.likeKind && this.likeButton?.interactable) {
            this.node.parent?.emit(RankingBoardCell.LIKE, this.likeKind);
        }
    }

    /** 清理一次性组件监听与红点，兼容子节点先销毁。 */
    protected onDestroy(): void {
        const buttonNode = this.likeButton?.node;
        if (buttonNode?.isValid) {
            buttonNode.off(Button.EventType.CLICK, this.onLike, this);
        }
        this.likeDot?.dispose();
        this.likeDot = null;
        this.likeKind = null;
    }
}
