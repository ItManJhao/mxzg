/** 契约任务列表格子，展示当前任务的条件、奖励和操作，不持有角色状态。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";

const { ccclass, property } = _decorator;

/** 由 VIP 页面投影给当前格子的任务文案和可用操作。 */
export interface VipTaskDisplay {
    /** 当前绑定的策划任务编号。 */
    readonly id: number;
    /** 配置任务条件与实际进度。 */
    readonly description: string;
    /** 旧任务卡展示的第一项实际奖励配置。 */
    readonly reward: { readonly itemId: number; readonly quantity: number };
    /** 已领取或当前没有进度来源时显示的状态。 */
    readonly status: string;
    /** 领取或前往，可操作时才显示按钮。 */
    readonly actionText: string;
    /** 当前任务满足领取条件时显示红点。 */
    readonly claimable: boolean;
    /** 已接通跳转对应的主城功能入口，无法跳转为 null。 */
    readonly destination: string | null;
}

@ccclass("VipTaskCell")
export class VipTaskCell extends Component {
    /** 任务条件标签，空间由模板固定。 */
    @property(Label) private title: Label | null = null;
    /** 配置奖励的品质框和图标，由格子所属节点维护图片生命周期。 */
    @property(Node) private rewardFrame: Node | null = null;
    /** 品质框内部的物品图。 */
    @property(Node) private rewardIcon: Node | null = null;
    /** 旧卡片左下奖励数量。 */
    @property(Label) private quantity: Label | null = null;
    /** 奖励图按钮，可查看该配置项详情。 */
    @property(Button) private rewardButton: Button | null = null;
    /** 对已接通任务呈现领取或前往。 */
    @property(Button) private actionButton: Button | null = null;
    /** 受格子复用状态驱动的操作标签。 */
    @property(Label) private actionText: Label | null = null;
    /** 没有操作时显示当前真实状态。 */
    @property(Label) private status: Label | null = null;
    /** 领取红点的可选锚点，由预制体保存位置和尺寸。 */
    @property(Node) private reminderAnchor: Node | null = null;

    /** 当前复用行的操作，重绘时更新。 */
    private runAction: (() => void) | null = null;
    /** 当前复用行的奖励预览，重绘时更新。 */
    private showReward: (() => void) | null = null;
    /** 当前任务是否可领取，供格子激活时恢复红点。 */
    private claimable = false;
    /** 当前格的公共红点绑定，同一行实例重复使用。 */
    private reminder: RedDotBinding | null = null;

    /** 绑定一次静态按钮。格子复用只替换数据和回调。 */
    protected onLoad(): void {
        this.actionButton!.node.on(Button.EventType.CLICK, this.onAction, this);
        this.rewardButton!.node.on(Button.EventType.CLICK, this.onReward, this);
    }

    /** 绘制当前任务；提交期间禁用领取按钮，缺少红点时仍可刷新任务。 */
    public render(task: VipTaskDisplay, claiming: boolean, action: () => void, reward: () => void): void {
        this.title!.string = task.description;
        this.quantity!.string = String(task.reward.quantity);
        this.status!.string = task.status;
        this.actionText!.string = task.actionText;
        this.actionButton!.node.active = task.actionText.length > 0;
        this.actionButton!.interactable = !task.claimable || !claiming;
        this.claimable = task.claimable;
        if (this.enabled && this.node.activeInHierarchy) {
            this.refreshReminder();
        }
        const face = BagItemCatalog.face(task.reward.itemId, task.reward.quantity);
        ResManager.setSprite(this.rewardFrame, face.frame);
        ResManager.setSprite(this.rewardIcon, [face.icon, face.fallback]);
        this.runAction = action;
        this.showReward = reward;
    }

    /** 把当前格子的操作交回页面。 */
    private onAction(): void { this.runAction?.(); }

    /** 把当前格子的奖励预览交回页面。 */
    private onReward(): void { this.showReward?.(); }

    /** 格子激活后按当前任务恢复提醒。 */
    protected onEnable(): void {
        this.refreshReminder();
    }

    /** 离开视口时隐藏红点，保留实例供格子复用。 */
    protected onDisable(): void {
        this.reminder?.setVisible(false);
    }

    /** 当前任务可领时按需显示公共红点。 */
    private refreshReminder(): void {
        if (this.claimable && !this.reminder && this.reminderAnchor?.isValid) {
            this.reminder = RedDotBinding.atAnchor(this.reminderAnchor);
        }
        this.reminder?.setVisible(this.claimable);
    }

    /** 销毁时只从有效节点解除监听，并释放格子图片和红点。 */
    protected onDestroy(): void {
        this.reminder?.dispose();
        const action = this.actionButton?.node;
        const reward = this.rewardButton?.node;
        if (action?.isValid) {
            action.off(Button.EventType.CLICK, this.onAction, this);
        }
        if (reward?.isValid) {
            reward.off(Button.EventType.CLICK, this.onReward, this);
        }
        ResManager.setSprite(this.rewardFrame, null);
        ResManager.setSprite(this.rewardIcon, null);
        this.runAction = null;
        this.showReward = null;
    }
}
