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
    /** 对手战力，历史模式显示胜负与积分变化。 */
    @property(Label) private detailLabel: Label | null = null;
    /** 独立的橙色竞技积分。 */
    @property(Label) private scoreLabel: Label | null = null;
    /** 候选对手头像，历史未提供该字段时隐藏。 */
    @property(Node) private portrait: Node | null = null;
    /** 候选头像容器、边框和等级牌。 */
    @property(Node) private portraitGroup: Node | null = null;
    /** 原版圆形头像框，按对手真实配置选择。 */
    @property(Node) private portraitBorder: Node | null = null;
    /** 圆形头像下方的等级。 */
    @property(Label) private levelLabel: Label | null = null;
    /** 当前模式的挑战或播放按钮。 */
    @property(Button) private actionButton: Button | null = null;
    /** 当前操作文案。 */
    @property(Label) private actionLabel: Label | null = null;
    /** 复用格子的当轮按钮操作。 */
    private action: (() => void) | null = null;

    /** 实例只登记一次点击，格子复用时替换操作。 */
    protected onLoad(): void {
        this.actionButton!.node.on(Button.EventType.CLICK, this.perform, this);
    }

    /** 行销毁后释放当前场次点击和回调。 */
    protected onDestroy(): void {
        const node = this.actionButton?.node;
        if (node?.isValid) {
            node.off(Button.EventType.CLICK, this.perform, this);
        }
        this.action = null;
    }

    /** 按匹配或历史的真实字段绘制，未冻结头像的战报隐藏画像。 */
    public render(entry: ArenaEntry, canAct: boolean, action: () => void, free = false): void {
        this.action = action;
        this.actionButton!.interactable = canAct;
        if ("battleId" in entry) {
            this.portraitGroup!.active = false;
            this.scoreLabel!.node.active = false;
            this.nameLabel!.string = entry.opponentName;
            const side = entry.defense ? "防守" : "挑战";
            this.detailLabel!.string = `${side}${entry.won ? "胜利" : "失败"}  ${ArenaController.scoreDelta(entry.scoreDelta)}`;
            this.actionLabel!.string = "战报";
        } else {
            this.portraitGroup!.active = true;
            this.scoreLabel!.node.active = true;
            RolePortraitUtils.paint(this.portrait, this.portraitBorder, entry.avatarId, entry.borderId);
            this.nameLabel!.string = entry.name;
            this.levelLabel!.string = String(entry.level);
            this.scoreLabel!.string = `竞技积分 ${entry.score}`;
            this.detailLabel!.string = `战力 ${UiKitUtils.formatAmount(entry.power)}`;
            this.actionLabel!.string = free ? "免费挑战" : "挑战";
        }
    }

    /** 点击时调用这次渲染内容绑定的当前动作。 */
    private perform(): void {
        this.action?.();
    }
}
