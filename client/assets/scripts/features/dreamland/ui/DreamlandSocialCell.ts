/** 梦境社交列表的通用行。头像、奖励与操作使用预制体既有挂点，行复用时解除旧点击意图。 */
import { _decorator, Button, Component, Label, Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import type { DreamlandRankEntryData, DreamlandRewardAmount } from "../../../platform/Protocol";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";

const { ccclass, property } = _decorator;

/** 由窗口根据页签准备的一行内容。 */
export interface DreamlandSocialRow {
    readonly title: string;
    readonly detail?: string;
    readonly portrait?: DreamlandRankEntryData;
    readonly icon?: string | null;
    readonly marker?: string;
    readonly rewards?: readonly DreamlandRewardAmount[];
    readonly button?: string;
    readonly action?: () => void;
}

@ccclass("DreamlandSocialCell")
export class DreamlandSocialCell extends Component {
    /** 排名、楼层奖励档位或英雄名。 */
    @property(Label) private title: Label | null = null;
    /** 楼层、战力或者派遣角色信息。 */
    @property(Label) private detail: Label | null = null;
    /** 排名行的玩家画像容器。 */
    @property(Node) private portrait: Node | null = null;
    /** 玩家头像载入目标。 */
    @property(Node) private face: Node | null = null;
    /** 玩家头像框载入目标。 */
    @property(Node) private border: Node | null = null;
    /** 派遣英雄头像载入目标。 */
    @property(Node) private heroIcon: Node | null = null;
    /** 排行位置显示在头像下方。 */
    @property(Label) private marker: Label | null = null;
    /** 奖励按服务器配置顺序使用固定图标槽。 */
    @property([Node]) private rewardSlots: Node[] = [];
    /** 背包品质框对应奖励图标槽。 */
    @property([Node]) private rewardFrames: Node[] = [];
    /** 奖励道具图片对应奖励图标槽。 */
    @property([Node]) private rewardIcons: Node[] = [];
    /** 奖励的实际发送数量。 */
    @property([Label]) private rewardCounts: Label[] = [];
    /** 可执行的派遣或借用操作。 */
    @property(Button) private actionButton: Button | null = null;
    /** 操作及限制状态的简短说明。 */
    @property(Label) private actionLabel: Label | null = null;
    /** 行每次复用均替换数据，迟到图片与点击据此辨别当前行。 */
    private row: DreamlandSocialRow | null = null;

    /** 首次初始化只绑定一次操作入口。 */
    protected onLoad(): void {
        this.actionButton!.node.on(Button.EventType.CLICK, this.onAction, this);
    }

    /** 绑定虚拟列表的当前行并切换图标、画像、奖励或按钮。 */
    public paint(row: DreamlandSocialRow): void {
        this.row = row;
        const stillBound = () => this.node.isValid && this.row === row;
        this.title!.string = row.title;
        this.detail!.string = row.detail ?? "";
        this.portrait!.active = !!row.portrait;
        if (row.portrait) {
            RolePortraitUtils.paint(this.face, this.border, row.portrait.headId, row.portrait.headBorderId);
        }
        this.heroIcon!.active = !!row.icon;
        ResManager.setSprite(this.heroIcon!, row.icon ?? null, stillBound);
        this.marker!.string = row.marker ?? "";
        this.actionButton!.node.active = !!row.button;
        this.actionButton!.interactable = !!row.action;
        this.actionLabel!.string = row.button ?? "";
        this.rewardSlots.forEach((slot, index) => {
            const reward = row.rewards?.[index];
            slot.active = !!reward;
            if (reward) {
                const face = BagItemCatalog.face(reward.itemId, reward.quantity);
                this.rewardCounts[index].string = String(reward.quantity);
                ResManager.setSprite(this.rewardFrames[index], face.frame ?? null, stillBound);
                ResManager.setSprite(this.rewardIcons[index], face.icon ?? null, stillBound);
            }
        });
    }

    /** 将点击交给当前行的窗口回调，禁用状态无业务回调。 */
    private onAction(): void {
        this.row?.action?.();
    }
}
