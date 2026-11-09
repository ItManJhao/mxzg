/**
 * 战斗统计专用星级显示：绑定预制体中的金/红星行、高星牌及旧13帧光效。
 * 只消费战报冻结星级，不修改通用英雄页面；帧资源随预制体加载，关闭后停止更新。
 */
import { _decorator, Component, Node, Sprite, SpriteFrame } from "cc";
import { BattleStatisticsUtils } from "../utils/BattleStatisticsUtils";

const { ccclass, property } = _decorator;

@ccclass("BattleHeroStarView")
export class BattleHeroStarView extends Component {
    /** 1至9星对应静态布局行；每次复用只显示命中的一行。 */
    @property([Node]) rows: Node[] = [];
    /** 10至13星专用底牌；14星隐藏。 */
    @property(Node) highBadge: Node | null = null;
    /** 14星觉醒底牌；不叠加普通高星数字。 */
    @property(Node) awakenedBadge: Node | null = null;
    /** 11至13星对应旧数字1至3，按历史星级择一显示。 */
    @property([Node]) numbers: Node[] = [];
    /** 头像边框，由旧getRare规则选择已绑定资源。 */
    @property(Sprite) border: Sprite | null = null;
    /** 品质0至5的旧边框帧，随Prefab载入。 */
    @property([SpriteFrame]) borders: SpriteFrame[] = [];
    /** 高星循环光效的静态节点，位置和尺寸归Prefab。 */
    @property(Sprite) effect: Sprite | null = null;
    /** 原effect-star-0至12，绑定顺序决定播放顺序。 */
    @property([SpriteFrame]) frames: SpriteFrame[] = [];
    /** 当前复用数据是否为10至14星；低星和旧缺失字段为false。 */
    private playing = false;
    /** 当前循环已播放秒数；换数据或关闭时清零。 */
    private elapsed = 0;

    /** 覆盖完整星级状态，清除上一格高星光效和数字，不产生请求或资产写入。 */
    public show(star: number | null | undefined): void {
        if (this.rows.length !== 9 || this.numbers.length !== 3 || this.frames.length !== 13
            || this.borders.length !== 6 || !this.border || !this.effect || !this.highBadge || !this.awakenedBadge
            || this.rows.some(node => !node) || this.numbers.some(node => !node)
            || this.frames.some(frame => !frame) || this.borders.some(frame => !frame)) {
            throw new Error("战斗星级预制体绑定缺失");
        }
        const style = BattleStatisticsUtils.stars(star);
        this.rows.forEach((node, index) => { node.active = index === style.row; });
        this.highBadge.active = style.high && !style.awakened;
        this.awakenedBadge.active = style.awakened;
        this.numbers.forEach((node, index) => { node.active = index + 1 === style.number; });
        this.border.spriteFrame = this.borders[style.rarity];
        this.playing = style.high;
        this.elapsed = 0;
        this.effect.node.active = this.playing;
        this.effect.spriteFrame = this.frames[0];
    }

    /** 可见高星格子按旧0.12秒间隔推进，循环尾部停留1.5秒，不新增定时器。 */
    public update(dt: number): void {
        if (!this.playing || !this.effect) {
            return;
        }
        this.elapsed = (this.elapsed + dt) % (13 * 0.12 + 1.5);
        this.effect.spriteFrame = this.frames[BattleStatisticsUtils.starFrame(this.elapsed)];
    }

    /** 关闭/回收格子时清除播放时间；节点不可见期间引擎不更新本组件。 */
    public onDisable(): void {
        this.elapsed = 0;
    }
}
