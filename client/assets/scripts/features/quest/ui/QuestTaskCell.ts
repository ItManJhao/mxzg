/**
 * 每日与成就共用的任务行，由 QuestView 绑定权威进度和奖励。
 * 行负责展示及转发点击；外层页面负责导航和发起领取。
 */
import { _decorator, Button, Component, Label, Node, RichText, Sprite } from "cc";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { QuestReward, QuestTask } from "../data/QuestState";

const { ccclass, property } = _decorator;

@ccclass("QuestTaskCell")
export class QuestTaskCell extends Component {
    /** 将当前行操作交给所属列表，参数为当前任务。 */
    public static readonly ACTION = "quest-task-action";
    /** 将奖励配置交给所属列表的道具详情。 */
    public static readonly ITEM = "quest-task-item";

    /** 任务条件，不承载按钮或任务状态。 */
    @property(RichText) private title: RichText | null = null;
    /** 共用物品格的横向滚动容器。 */
    @property(SuperScroll) private rewards: SuperScroll | null = null;
    /** 裁剪式进度填充，比例在 0 至 1 之间。 */
    @property(Sprite) private progressFill: Sprite | null = null;
    /** 原始进度值和目标值，允许进度高于目标。 */
    @property(Label) private progressText: Label | null = null;
    /** 达标未领时显示的橙色按钮。 */
    @property(Button) private claimButton: Button | null = null;
    /** 尚未达标且有对应入口时显示的绿色按钮。 */
    @property(Button) private navigateButton: Button | null = null;
    /** 未开放或当前只可查看进度的状态。 */
    @property(Label) private status: Label | null = null;
    /** 已领任务对应的旧版盖章，和前往、领取按钮互斥。 */
    @property(Node) private claimedBadge: Node | null = null;
    /** 橙色按钮右上角的公共红点锚点。 */
    @property(Node) private claimDotAnchor: Node | null = null;

    /** 行在虚拟池中重绑时替换；销毁时释放。 */
    private task: QuestTask | null = null;
    /** 当前任务可领奖时点亮，视口停用时隐藏。 */
    private claimDot: RedDotBinding | null = null;

    /** 首次渲染发生在虚拟行激活前，先连接内层列表，保证首次奖励能被绘制。 */
    private bindControls(): void {
        if (!this.title || !this.rewards || !this.progressFill || !this.progressText
            || !this.claimButton || !this.navigateButton || !this.status || !this.claimedBadge || !this.claimDotAnchor) {
            throw new Error("QuestTaskCell.prefab 缺少条件、奖励、进度或操作绑定");
        }
        this.rewards.validateBindings();
        this.claimButton.node.on(Button.EventType.CLICK, this.perform, this);
        this.navigateButton.node.on(Button.EventType.CLICK, this.perform, this);
        this.rewards.list.node.on(SuperContent.RENDER_ITEM, this.renderReward, this);
        this.rewards.list.node.on(SuperContent.SELECT_ITEM, this.inspect, this);
        this.claimDot = RedDotBinding.atAnchor(this.claimDotAnchor);
    }

    /** 使用服务器快照绘制本行，忙时仅禁用领取操作。 */
    public bind(task: QuestTask, busy: boolean, canNavigate: boolean): void {
        if (!this.claimDot) {
            this.bindControls();
        }
        const reuse = this.task?.id !== task.id;
        this.task = task;
        const complete = task.current >= task.target;
        const claimable = complete && !task.claimed;
        const navigable = !complete && !task.claimed && canNavigate;
        this.title!.string = task.title
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\d+/g, number => `<color=#269E11>${number}</color>`);
        this.progressFill!.fillRange = Math.min(1, task.current / task.target);
        this.progressText!.string = `${task.current}/${task.target}`;
        this.claimButton!.node.active = claimable;
        this.claimButton!.interactable = !busy;
        this.navigateButton!.node.active = navigable;
        this.claimedBadge!.active = task.claimed;
        this.status!.node.active = !task.claimed && !claimable && !navigable;
        this.status!.string = task.destination ? "未开放" : "进行中";
        const list = this.rewards!.list;
        list.setData(task.rewards);
        if (reuse) {
            this.rewards!.toStart();
        }
        this.showClaimDot();
    }

    /** 虚拟行恢复时按新任务点亮红点。 */
    protected onEnable(): void {
        this.showClaimDot();
    }

    /** 行离开视口后隐藏红点，下一次激活继续复用同一绑定。 */
    protected onDisable(): void {
        this.claimDot?.setVisible(false);
    }

    /** 销毁本行的列表监听和红点，子按钮可能已先由引擎销毁。 */
    protected onDestroy(): void {
        for (const button of [this.claimButton, this.navigateButton]) {
            const node = button?.node;
            if (node?.isValid) {
                node.off(Button.EventType.CLICK, this.perform, this);
            }
        }
        if (this.rewards?.content?.isValid) {
            this.rewards.list.node.off(SuperContent.RENDER_ITEM, this.renderReward, this);
            this.rewards.list.node.off(SuperContent.SELECT_ITEM, this.inspect, this);
        }
        this.claimDot?.dispose();
        this.task = null;
    }

    /** 沿用背包物品品质和碎片图标，奖励数量按旧任务格式显示。 */
    private renderReward(node: Node, reward: QuestReward): void {
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("任务奖励列表缺少共用物品格");
        }
        cell.show(reward, false, BagItemCatalog.face(reward.itemId, reward.quantity));
        cell.count!.string = UiKitUtils.formatAmount(reward.quantity);
    }

    /** 通知所属列表显示奖励详情，不持有其他页面引用。 */
    private inspect(reward: QuestReward): void {
        this.node.parent?.emit(QuestTaskCell.ITEM, reward);
    }

    /** 提交点击时读取当前任务，避免虚拟行复用前的旧回调。 */
    private perform(): void {
        if (this.task && this.node.activeInHierarchy) {
            this.node.parent?.emit(QuestTaskCell.ACTION, this.task);
        }
    }

    /** 行可见且其快照仍然可领时显示共享红点。 */
    private showClaimDot(): void {
        this.claimDot?.setVisible(this.node.activeInHierarchy && this.claimButton!.node.active);
    }
}
