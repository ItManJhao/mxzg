/** 竞技场列表格，候选对手及历史回放沿用旧卡片信息，回调交给当前页面。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import { ArenaController } from "../ArenaController";
import type { ArenaHistory, ArenaOpponent } from "../ArenaModel";

const { ccclass, property } = _decorator;

/** 新手页签的真实对手或冻结的挑战历史。 */
export type ArenaEntry = ArenaOpponent | ArenaHistory;

@ccclass("ArenaEntryCell")
export class ArenaEntryCell extends Component {
    /** 当前对手名称或历史挑战当时冻结的名称。 */
    @property(Label) private nameLabel: Label | null = null;
    /** 对手等级、战力及积分，历史模式显示胜负与积分变化。 */
    @property(Label) private detailLabel: Label | null = null;
    /** 候选对手头像，历史未提供该字段时隐藏。 */
    @property(Node) private portrait: Node | null = null;
    /** 当前模式的挑战或播放按钮。 */
    @property(Button) private actionButton: Button | null = null;
    /** 当前操作文案。 */
    @property(Label) private actionLabel: Label | null = null;
    /** 复用格子的当轮按钮操作。 */
    private action: (() => void) | null = null;

    /** 实例只登记一次点击，格子复用时替换操作。 */
    protected onLoad(): void {
        this.actionButton!.node.on(Button.EventType.CLICK, () => this.action?.());
    }

    /** 根据当前页签展示其真实字段，历史条目无画像时隐藏头像。 */
    public render(entry: ArenaEntry, canAct: boolean, action: () => void): void {
        this.action = action;
        this.actionButton!.interactable = canAct;
        if ("battleId" in entry) {
            this.portrait!.active = false;
            this.nameLabel!.string = entry.opponentName;
            this.detailLabel!.string = `${entry.won ? "胜利" : "失败"}　积分 ${ArenaController.scoreDelta(entry.scoreDelta)}`;
            this.actionLabel!.string = "战报";
        } else {
            RolePortraitUtils.paint(this.portrait, null, entry.avatarId);
            this.nameLabel!.string = `${entry.name} Lv.${entry.level}`;
            this.detailLabel!.string = `战力 ${UiKitUtils.formatAmount(entry.power)}　积分 ${entry.score}`;
            this.actionLabel!.string = "挑战";
        }
    }
}
