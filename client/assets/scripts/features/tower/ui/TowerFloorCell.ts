/** 幻境之塔的旧版层卡样式，显示层名、通关状态和服务端交付的本层奖励预览。 */
import { _decorator, Button, Component, Label, Sprite, SpriteFrame } from "cc";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import type { TowerFloor } from "../TowerModel";

const { ccclass, property } = _decorator;

/** 每层与当前进度的关系，由窗口按服务器层数计算。 */
export type TowerFloorStatus = "locked" | "passed" | "sweep" | "current";

@ccclass("TowerFloorCell")
export class TowerFloorCell extends Component {
    /** 显示本卡对应层数。 */
    @property(Label) private floorLabel: Label | null = null;
    /** 展示当前层的挑战、通关或锁定状态。 */
    @property(Label) private statusLabel: Label | null = null;
    /** 本层首次奖励，当前最高通关层切换到扫荡产物。 */
    @property(Label) private rewardsLabel: Label | null = null;
    /** 由上层绑定挑战、扫荡或已通关预览。 */
    @property(Button) private actionButton: Button | null = null;
    /** 按按钮当前用途展示。 */
    @property(Label) private actionLabel: Label | null = null;
    /** 原关卡底图，随锁定状态交换。 */
    @property(Sprite) private background: Sprite | null = null;
    /** 旧版未到达层的暗色地板。 */
    @property(SpriteFrame) private lockedFloor: SpriteFrame | null = null;
    /** 旧版可挑战及已通过的彩色地板。 */
    @property(SpriteFrame) private reachedFloor: SpriteFrame | null = null;
    /** 当前项的操作入口，格子换绑时替换。 */
    private action: (() => void) | null = null;

    /** 只从属于本格的按钮向当前回调交付点击。 */
    protected onLoad(): void {
        this.actionButton!.node.on(Button.EventType.CLICK, () => this.action?.());
    }

    /** 按静态层卡绘制状态与奖励，禁用无资格的操作。 */
    public render(floor: TowerFloor, status: TowerFloorStatus, enabled: boolean, price: number, action: () => void): void {
        this.action = action;
        this.background!.spriteFrame = status === "locked" ? this.lockedFloor : this.reachedFloor;
        this.floorLabel!.string = `第 ${floor.floor} 层`;
        this.statusLabel!.string = status === "current" ? `推荐战力 ${UiKitUtils.formatAmount(floor.recommendedPower)}`
            : status === "locked" ? "未到达" : "已通关";
        const rewards = status === "sweep" ? floor.sweepRewards : floor.firstRewards;
        this.rewardsLabel!.string = rewards.map(row => {
            const item = BagItemCatalog.face(row.itemId, row.quantity);
            return `${item.title} ×${UiKitUtils.formatAmount(row.quantity)}`;
        }).join("  ");
        this.actionButton!.node.active = status === "sweep" || status === "current";
        this.actionLabel!.string = status === "sweep" ? (price > 0 ? `扫荡 ${price}钻` : "扫荡") : "挑战";
        this.actionButton!.interactable = enabled;
    }
}
