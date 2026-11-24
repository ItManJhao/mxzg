/** 幻境之塔层数奖励列表格子：显示配置奖励与真实状态，格子复用时替换操作。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { TowerMilestone, TowerReward } from "../TowerModel";

const { ccclass, property } = _decorator;

@ccclass("TowerMilestoneCell")
export class TowerMilestoneCell extends Component {
    /** 当前楼层档及已达进度。 */
    @property(Label) private title: Label | null = null;
    /** 当前模板为每件奖品绑定按钮、品质框、图标与数量。 */
    @property([Button]) private rewardButtons: Button[] = [];
    /** 按奖品位置显示原品级背景。 */
    @property([Node]) private rewardFrames: Node[] = [];
    /** 按奖品位置显示物品图标。 */
    @property([Node]) private rewardIcons: Node[] = [];
    /** 按奖品位置显示待领数量。 */
    @property([Label]) private quantities: Label[] = [];
    /** 当前档位的领取按钮。 */
    @property(Button) private claimButton: Button | null = null;
    /** 已领、未达成或可领取的操作文案。 */
    @property(Label) private claimLabel: Label | null = null;

    /** 格子当前绑定的点击回调，重绘时用新的档位数据覆盖。 */
    private claim: (() => void) | null = null;
    /** 本次绑定的奖品及其详情回调，离开格子时释放。 */
    private preview: ((slot: number) => void) | null = null;

    /** 只绑定一次按钮，随后由列表设置当前档位。 */
    protected onLoad(): void {
        this.claimButton!.node.on(Button.EventType.CLICK, this.onClaim, this);
        for (const button of this.rewardButtons) {
            button.node.on(Button.EventType.CLICK, this.onReward, this);
        }
    }

    /** 按真实进度绘制档位，从配置读取奖品并收回复用的空槽。 */
    public render(row: TowerMilestone, highest: number, busy: boolean, claim: () => void,
                  preview: (reward: TowerReward) => void): void {
        this.title!.string = `通关第 ${row.floor} 层　${Math.min(highest, row.floor)}/${row.floor}`;
        const reached = highest >= row.floor;
        this.claimLabel!.string = row.claimed ? "已领取" : reached ? "领取" : "未达成";
        this.claimButton!.interactable = reached && !row.claimed && !busy;
        this.claim = this.claimButton!.interactable ? claim : null;
        this.preview = slot => {
            const reward = row.rewards[slot];
            if (reward) {
                preview(reward);
            }
        };

        for (const [index, button] of this.rewardButtons.entries()) {
            const reward = row.rewards[index];
            const face = reward ? BagItemCatalog.face(reward.itemId, reward.quantity) : null;
            button.node.active = !!reward;
            ResManager.setSprite(this.rewardFrames[index], face?.frame ?? null);
            ResManager.setSprite(this.rewardIcons[index], face ? [face.icon, face.fallback] : null);
            this.quantities[index].string = reward ? String(reward.quantity) : "";
        }
    }

    /** 点击只触发当前绑定且仍可用的领取操作。 */
    private onClaim(): void {
        this.claim?.();
    }

    /** 将按钮对应的当前奖品交给奖励窗打开描述。 */
    private onReward(button: Button): void {
        this.preview?.(this.rewardButtons.indexOf(button));
    }

    /** 父节点销毁时只从有效按钮解除监听。 */
    protected onDestroy(): void {
        const claim = this.claimButton?.node;
        if (claim?.isValid) {
            claim.off(Button.EventType.CLICK, this.onClaim, this);
        }
        for (const button of this.rewardButtons) {
            const node = button?.node;
            if (node?.isValid) {
                node.off(Button.EventType.CLICK, this.onReward, this);
            }
        }
        this.claim = null;
        this.preview = null;
    }
}
