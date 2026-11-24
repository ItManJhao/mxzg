/** 五类日常副本关卡列表的共用卡片。使用服务端状态投影更新原关卡牌匾、奖励和操作按钮。 */
import { _decorator, Button, Component, Label, Sprite, SpriteFrame } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { DailyDungeonItem } from "../DailyDungeonModel";

const { ccclass, property } = _decorator;

/** 当前列表条目的服务端状态经过页面投影后用于绘制，回调由页面处理。 */
export interface GoldDungeonStageDisplay {
    readonly title: string;
    readonly ribbon: number;
    readonly unlocked: boolean;
    readonly cleared: boolean;
    readonly canChallenge: boolean;
    readonly condition: string;
    readonly action: string;
    readonly price: number;
    readonly rewards: readonly DailyDungeonItem[];
}

@ccclass("GoldDungeonStageCell")
export class GoldDungeonStageCell extends Component {
    /** 关卡配置里的原语言名。 */
    @property(Label) private _title: Label | null = null;
    /** 按配置编号替换的旧版关卡牌匾。 */
    @property(Sprite) private _ribbon: Sprite | null = null;
    /** 按原牌匾编号从 1 顺序绑定的美术。 */
    @property([SpriteFrame]) private _ribbons: SpriteFrame[] = [];
    /** 服务端确认的等级、战力、前置关卡或共享次数限制。 */
    @property(Label) private _condition: Label | null = null;
    /** 共享次数决定的当前钻石报价。 */
    @property(Label) private _price: Label | null = null;
    /** 当前复用格的实际挑战或扫荡按钮。 */
    @property(Button) private _challenge: Button | null = null;
    /** 操作按钮上的当前状态文案。 */
    @property(Label) private _action: Label | null = null;
    /** 未扫荡时使用的原橙色按钮。 */
    @property(SpriteFrame) private _challengeArt: SpriteFrame | null = null;
    /** 已通关后使用的原绿色按钮。 */
    @property(SpriteFrame) private _sweepArt: SpriteFrame | null = null;
    /** 两个关卡产物的说明入口，复用时重设当前条目。 */
    @property([Button]) private _rewardButtons: Button[] = [];
    /** 产物图标，索引与奖励按钮一致。 */
    @property([Sprite]) private _rewardIcons: Sprite[] = [];
    /** 产物品质框，索引与奖励按钮一致。 */
    @property([Sprite]) private _rewardFrames: Sprite[] = [];
    /** 产物配置数量，索引与奖励按钮一致。 */
    @property([Label]) private _rewardCounts: Label[] = [];

    /** 当前卡片可用的操作回调，换绑时替换。 */
    private challenge: (() => void) | null = null;
    /** 当前卡片预览槽回调，换绑时替换。 */
    private showReward: ((index: number) => void) | null = null;

    /** 每个实例只绑定一次按钮，点击总是走当前条目的回调。 */
    protected onLoad(): void {
        this._challenge!.node.on(Button.EventType.CLICK, () => {
            if (this._challenge?.interactable) {
                this.challenge?.();
            }
        });
        this._rewardButtons.forEach((button, index) => button.node.on(Button.EventType.CLICK, () => {
            if (button.node.active) {
                this.showReward?.(index);
            }
        }));
    }

    /** 绘制真实关卡与当日共享报价，清空不存在的奖励槽及上一关的回调。 */
    public render(stage: GoldDungeonStageDisplay, challenge: () => void, preview: (item: DailyDungeonItem) => void): void {
        this.challenge = challenge;
        this.showReward = index => {
            const item = stage.rewards[index];
            if (item) {
                preview(item);
            }
        };
        this._title!.string = stage.title;
        this._ribbon!.spriteFrame = this._ribbons[stage.ribbon - 1] ?? null;
        this._condition!.string = stage.condition;
        this._action!.string = stage.action;
        this._challenge!.interactable = stage.canChallenge;
        const buttonArt = this._challenge!.node.getComponent(Sprite)!;
        buttonArt.spriteFrame = stage.cleared ? this._sweepArt : this._challengeArt;
        buttonArt.grayscale = !stage.unlocked;
        this._price!.node.parent!.active = stage.price > 0;
        this._price!.string = String(stage.price);
        this._rewardButtons.forEach((button, index) => {
            const item = stage.rewards[index];
            const face = item && BagItemCatalog.face(item.itemId, item.quantity);
            button.node.active = !!item;
            this._rewardCounts[index].string = item ? UiKitUtils.formatAmount(item.quantity) : "";
            ResManager.setSprite(this._rewardIcons[index].node, face ? [face.icon, face.fallback] : null);
            ResManager.setSprite(this._rewardFrames[index].node, face ? face.frame : null);
        });
    }
}
