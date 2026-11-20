/** 副本大厅的可复用入口卡。大厅提供配置后的文案、解锁与奖励，卡片负责现有预制控件的绑定。 */
import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RedDotManager } from "../../../framework/ui/RedDotManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";

/** 一张已按当前角色等级装配的大厅卡；后续开放横幅没有副本入口。 */
export interface DungeonHallCard {
    readonly art: SpriteFrame;
    readonly title: string;
    readonly description: string;
    readonly lockText: string;
    /** 支持提醒的已开放入口路径；其他卡片及预告均不订阅。 */
    readonly reminderPath?: string;
    readonly rewards: readonly { readonly item_type: number; readonly item_num: number }[];
}

const { ccclass, property } = _decorator;

@ccclass("DungeonHallCardView")
export class DungeonHallCardView extends Component {
    /** 旧版入口画面，由页面按当前门槛换用对应贴图。 */
    @property(Sprite) private _cardArt: Sprite | null = null;
    /** 原大厅奖励描述，由语言表提供，预告不显示。 */
    @property(Label) private _descriptionLabel: Label | null = null;
    /** 等级条件未满足时显示预制体内的遮挡条。 */
    @property(Node) private _lockOverlay: Node | null = null;
    /** 原等级开启文案。 */
    @property(Label) private _lockLabel: Label | null = null;
    /** 原日常副本卡右上角的红点，默认关闭。 */
    @property(Node) private _reminderDot: Node | null = null;
    /** 按奖励配置顺序绑定的四张道具图。 */
    @property([Sprite]) private _rewardIcons: Sprite[] = [];
    /** 对应四个奖励位置的品质框。 */
    @property([Sprite]) private _rewardFrames: Sprite[] = [];
    /** 只打开道具说明的四个交互区，未配置奖励时隐藏。 */
    @property([Button]) private _rewardButtons: Button[] = [];
    /** 格子复用时更新，点击只读本次绑定的奖励。 */
    private current: DungeonHallCard | null = null;
    /** 大厅提供的道具说明入口，预告卡上没有可调用条目。 */
    private showReward: ((itemId: number, quantity: number) => void) | null = null;
    /** 当前卡片条目的红点订阅，复用、停用或离开大厅时释放。 */
    private stopReminder: (() => void) | null = null;

    /** 只登记一次子奖励按钮事件；卡片主体由 SuperContent 管理选择。 */
    protected onLoad(): void {
        this._rewardButtons.forEach((button, index) => {
            button.node.on(Button.EventType.CLICK, () => {
                const reward = this.current?.rewards[index];
                if (reward) {
                    this.showReward?.(reward.item_type, reward.item_num);
                }
            });
        });
    }

    /** 复用时替换入口图、锁定、奖励和红点来源。 */
    public render(card: DungeonHallCard, showReward: (itemId: number, quantity: number) => void): void {
        const reminderChanged = this.current?.reminderPath !== card.reminderPath;
        this.current = card;
        this.showReward = showReward;
        if (reminderChanged && this.enabledInHierarchy) {
            this.bindReminder();
        }
        this._cardArt!.spriteFrame = card.art;
        this._descriptionLabel!.node.active = !!card.description;
        this._descriptionLabel!.string = card.description;
        this._lockOverlay!.active = !!card.lockText;
        this._lockLabel!.string = card.lockText;
        this.node.getComponent(Button)!.interactable = !!card.title && !card.lockText;
        this._rewardButtons.forEach((button, index) => {
            const reward = card.rewards[index];
            const face = reward && BagItemCatalog.face(reward.item_type, reward.item_num);
            const icon = this._rewardIcons[index];
            const frame = this._rewardFrames[index];
            button.node.active = !!face;
            icon.grayscale = frame.grayscale = !!card.lockText;
            ResManager.setSprite(icon.node, face ? [face.icon, face.fallback] : null);
            ResManager.setSprite(frame.node, face ? face.frame : null);
        });
    }

    /** 滚动回到可见区域时立即读取当前提醒。 */
    protected onEnable(): void {
        this.bindReminder();
    }

    /** 滚出可见范围或大厅关闭时释放旧条目订阅。 */
    protected onDisable(): void {
        this.stopReminder?.();
        this.stopReminder = null;
    }

    /** 将当前条目绑定到静态红点节点，复用为其他卡时同时清空旧显示。 */
    private bindReminder(): void {
        this.stopReminder?.();
        this.stopReminder = null;
        const dot = this._reminderDot!;
        dot.active = false;
        const path = this.current?.reminderPath;
        if (path) {
            this.stopReminder = RedDotManager.instance.watch(path, visible => { dot.active = visible; });
        }
    }
}
