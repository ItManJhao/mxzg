/** 日常副本的金币首关。选择既有阵容发起挑战，真实战报使用通用战场，结算只显示服务端发放。 */
import { _decorator, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BattleReplayPreview } from "../../battle/ui/BattleReplayPreview";
import { ChapterEndView } from "../../battle/ui/ChapterEndView";
import { BattleReplayUtils } from "../../battle/utils/BattleReplayUtils";
import { DailyDungeonController } from "../DailyDungeonController";
import { DailyDungeonModel, type DailyDungeonBattle } from "../DailyDungeonModel";

/** 主城导航交付返回动作，页面自身不保存页面栈。 */
export interface GoldDungeonArgs {
    readonly backToHall: () => void;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "gold-dungeon",
    prefab: "bundles/module/dungeon/prefabs/GoldDungeonView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("GoldDungeonView")
export class GoldDungeonView extends BaseView<GoldDungeonArgs> {
    /** 预制体存放关卡页签、次数与关卡内容。 */
    @property(UITransform) private _panel: UITransform | null = null;
    /** 战报播放时显示关卡指定的旧 map31。 */
    @property(Node) private _battleBackground: Node | null = null;
    /** 播放器将现有 BattlePage 挂入此处。 */
    @property(Node) private _battleHost: Node | null = null;
    /** 返回副本大厅。 */
    @property(Button) private _backButton: Button | null = null;
    /** 成功挑战或扫荡后刷新当日剩余次数。 */
    @property(Label) private _countLabel: Label | null = null;
    /** 服务端下发的关卡原语言键对应标题。 */
    @property(Label) private _stageLabel: Label | null = null;
    /** 显示战力、阵容或次数不足。 */
    @property(Label) private _conditionLabel: Label | null = null;
    /** 展示当前服务器需要扣除的钻石，免费时整行隐藏。 */
    @property(Label) private _priceLabel: Label | null = null;
    /** 首次是挑战，首通后是扫荡；两者使用一个服务端入口。 */
    @property(Button) private _challengeButton: Button | null = null;
    /** 按权威通关状态显示挑战或扫荡。 */
    @property(Label) private _challengeLabel: Label | null = null;
    /** 首通后切换旧绿色按钮底图。 */
    @property(SpriteFrame) private _sweepArt: SpriteFrame | null = null;
    /** 首关原奖励预览的两个按钮，待服务端下发才显示。 */
    @property([Button]) private _rewardButtons: Button[] = [];
    /** 两件预览奖励的图标。 */
    @property([Sprite]) private _rewardIcons: Sprite[] = [];
    /** 两件预览奖励的原品质框。 */
    @property([Sprite]) private _rewardFrames: Sprite[] = [];
    /** 两件预览奖励的数量，和战斗实际到账分开。 */
    @property([Label]) private _rewardCounts: Label[] = [];

    /** 关闭时用来停止共享播放器并清理战场。 */
    private stopReplay: (() => void) | null = null;
    /** 从接管战报到结果关闭之间为 true，禁止重复呈现。 */
    private presenting = false;
    /** 已开始打开本次结算窗口，播放完成或异常回调都只交付一次。 */
    private settling = false;
    /** 页面离开后阻止迟到资源或结算反馈重新挂回旧页面。 */
    private closed = true;
    /** 已发起查询的服务器重置时间，每次跨日只补查一次。 */
    private checkedReset = 0;
    /** 初始挑战按钮的旧橙色底图，首通前使用。 */
    private challengeArt: SpriteFrame | null = null;

    /** 安装现有控制器监听、预制体点击和跨日检查，打开时读取权威次数。 */
    public onOpen(args?: GoldDungeonArgs): void {
        super.onOpen(args);
        if (!args || !this._panel || !this._battleHost || !this._battleBackground || !this._challengeButton
            || !this._challengeLabel || !this._conditionLabel || !this._priceLabel || !this._stageLabel
            || !this._countLabel || !this._backButton || !this._sweepArt || this._rewardButtons.length !== 2) {
            throw new Error("金币副本缺少预制体绑定或返回入口");
        }
        this.challengeArt = this._challengeButton.node.getComponent(Sprite)!.spriteFrame;
        this.closed = false;
        this.checkedReset = 0;
        this.listen(this._backButton, args.backToHall);
        this.listen(this._challengeButton, () => this.challenge());
        this._rewardButtons.forEach((button, index) => this.listen(button, () => this.showReward(index)));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport()));
        this.ownListener(EventDispatcher.instance.on("daily-dungeon.updated", this, this.render));
        this.schedule(this.checkReset, 1);
        this.ownListener(() => this.unschedule(this.checkReset));
        DailyDungeonController.instance.setVisible(true);
        this.render();
    }

    /** 停止当前战报及页面监听，已结算资产由服务端快照保留。 */
    public onClose(): void {
        this.closed = true;
        DailyDungeonController.instance.setVisible(false);
        this.stopReplay?.();
        this.stopReplay = null;
        this.presenting = false;
        this.settling = false;
    }

    /** 在可见区域内等比适配关卡面板，背景按照预制体 Widget 铺满。 */
    private fitViewport(): void {
        const area = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this._panel!;
        const scale = Math.min(1, area.width / panel.width, area.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 按钮事件跟随显示期，在关页时解除。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 从服务端快照显示首关、价格、奖励和次数，并接管最新战报。 */
    private render(): void {
        const model = DailyDungeonModel.instance;
        const state = model.state;
        const busy = DailyDungeonController.instance.busy;
        const refresh = !state || this.expiredReset() !== null;
        this._challengeButton!.interactable = !busy && !this.presenting && (refresh || state.canChallenge);
        this._challengeLabel!.string = busy ? "同步中" : refresh ? "重试" : state.cleared ? "扫荡" : "挑战";
        this._challengeButton!.node.getComponent(Sprite)!.spriteFrame = state?.cleared ? this._sweepArt : this.challengeArt;
        this._stageLabel!.string = state ? GameConfig.instance.getConfig(GConfig.Language, state.titleLanguageId)?.value ?? "金币副本第1关" : "金币副本第1关";
        this._countLabel!.string = state ? `剩余次数：${Math.max(0, state.totalLimit - state.wins)}/${state.totalLimit}` : "次数待同步";
        this._priceLabel!.node.parent!.active = !!state?.nextCostDiamonds && state.canChallenge;
        this._priceLabel!.string = state?.nextCostDiamonds.toString() ?? "";
        this._conditionLabel!.string = !state || state.canChallenge ? ""
            : state.wins >= state.totalLimit ? "今日次数已用完"
                : !state.unlocked ? "金币副本尚未解锁"
                    : state.power > 0 && state.power <= state.requiredPower
                        ? `历史最高战力需大于 ${state.requiredPower}` : "请先保存出战阵容";
        this._rewardButtons.forEach((button, index) => {
            const item = state?.rewardPreview[index];
            button.node.active = !!item;
            if (item) {
                const face = BagItemCatalog.face(item.itemId, item.quantity);
                this._rewardCounts[index].string = UiKitUtils.formatAmount(item.quantity);
                ResManager.setSprite(this._rewardIcons[index].node, [face.icon, face.fallback]);
                ResManager.setSprite(this._rewardFrames[index].node, face.frame);
            }
        });
        if (!this.presenting) {
            const battle = model.takeBattle();
            if (battle) {
                this.playBattle(battle);
            }
        }
    }

    /** 排队跨日查询，时间以服务器校准为准，界面不自行增加次数。 */
    private checkReset(): void {
        const deadline = this.expiredReset();
        if (deadline !== null && this.checkedReset !== deadline && !DailyDungeonController.instance.busy) {
            this.checkedReset = deadline;
            DailyDungeonController.instance.refreshVisible();
        }
    }

    /** 已到重置时刻时返回应查询的服务器秒，未知或未到时刻则返回 null。 */
    private expiredReset(): number | null {
        const deadline = DailyDungeonModel.instance.state?.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        return deadline && now !== null && now > deadline ? deadline : null;
    }

    /** 已显示报价的点击直接交给控制器，缺少状态时允许重试查询。 */
    private challenge(): void {
        const controller = DailyDungeonController.instance;
        if (DailyDungeonModel.instance.state && this.expiredReset() === null) {
            controller.challenge();
        } else {
            controller.refreshVisible();
        }
    }

    /** 点击预览奖励只说明物品与配置数量，不写库存。 */
    private showReward(index: number): void {
        const item = DailyDungeonModel.instance.state?.rewardPreview[index];
        if (item) {
            const face = BagItemCatalog.face(item.itemId, item.quantity);
            void UIManager.instance.openChild(this, BagInfoView, { source: "description", face }).catch(() => {
                // 开窗错误由 UIManager 统一处理。
            });
        }
    }

    /** 复用正式开场、战报和结束时序，播放出错仍可显示服务端的真实结算。 */
    private playBattle(battle: DailyDungeonBattle): void {
        this.presenting = true;
        this._panel!.node.active = false;
        this._battleBackground!.active = true;
        this._battleHost!.active = true;
        void BattleReplayPreview.open(this._battleHost!, battle.bytes, false, undefined, undefined, "金币副本",
            true, () => this.showSettlement(battle), false, () => this.closed, undefined, undefined, "金币副本阵容",
            () => { void this.showSettlement(battle); })
            .then(stop => {
                if (this.closed) {
                    stop();
                } else {
                    this.stopReplay = stop;
                }
            }).catch(error => {
                if (!this.closed) {
                    GameLog.shared.classified("MODULE", "warn", "GoldDungeonView", `金币副本战报播放失败：${String(error)}`);
                    void this.showSettlement(battle);
                }
            });
    }

    /** 战报结束显示权威胜负与奖励，关闭后恢复关卡页。 */
    private async showSettlement(battle: DailyDungeonBattle): Promise<void> {
        if (this.closed || !this.presenting || this.settling) {
            return;
        }
        this.settling = true;
        try {
            const { units, names } = BattleReplayUtils.parse(battle.bytes);
            await UIManager.instance.openChild(this, ChapterEndView, {
                won: battle.won,
                rewards: battle.rewards,
                notice: "本次获得",
                units,
                names,
                onClosed: () => this.restoreStage(),
            });
        } catch {
            this.restoreStage();
        }
    }

    /** 收起本场播放并重新显示已有次数，不触发新的结算或发奖。 */
    private restoreStage(): void {
        if (this.closed) {
            return;
        }
        this.stopReplay?.();
        this.stopReplay = null;
        this.presenting = false;
        this.settling = false;
        this._battleBackground!.active = false;
        this._battleHost!.active = false;
        this._panel!.node.active = true;
        this.render();
    }
}
