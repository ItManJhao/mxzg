/** 日常副本的共用关卡页，切换类型后各自读取次数。沿用已有金币页预制体的资源路径和脚本绑定。 */
import { _decorator, Button, director, Director, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { EntryGateUtils } from "../../../config/EntryGateUtils";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../../account/AccountModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BattleReplayPreview } from "../../battle/ui/BattleReplayPreview";
import { ChapterEndView } from "../../battle/ui/ChapterEndView";
import { BattleReplayUtils } from "../../battle/utils/BattleReplayUtils";
import { RulesView } from "../../common/ui/RulesView";
import { DAILY_DUNGEON_ENTRIES, DailyDungeonController } from "../DailyDungeonController";
import { DAILY_DUNGEON_KINDS, DailyDungeonModel, type DailyDungeonBattle, type DailyDungeonItem, type DailyDungeonKind, type DailyDungeonStage,
    type DailyDungeonState } from "../DailyDungeonModel";
import { GoldDungeonStageCell } from "./GoldDungeonStageCell";

/** 主城导航交付返回动作，页面自身不保存页面栈。 */
export interface GoldDungeonArgs {
    /** 当前角色等级供已锁关卡显示对应的旧提示。 */
    readonly account: AccountModel;
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
    /** 战报播放时按当前副本显示旧战场。 */
    @property(Node) private _battleBackground: Node | null = null;
    /** 播放器将现有 BattlePage 挂入此处。 */
    @property(Node) private _battleHost: Node | null = null;
    /** 返回副本大厅。 */
    @property(Button) private _backButton: Button | null = null;
    /** 成功挑战或扫荡后刷新当日剩余次数。 */
    @property(Label) private _countLabel: Label | null = null;
    /** 打开日常副本共用的只读说明，不查询或消费次数。 */
    @property(Button) private _rulesButton: Button | null = null;
    /** 各类型复用同一份关卡卡与滚动列表，尺寸和间距由 Prefab 提供。 */
    @property(SuperScroll) private _list: SuperScroll | null = null;
    /** 副本状态尚未同步或跨日失效时提供重新查询。 */
    @property(Button) private _retryButton: Button | null = null;
    /** 查询中禁用重复操作并显示真实加载状态。 */
    @property(Label) private _retryLabel: Label | null = null;
    /** 五类副本按原顺序绑定对应的页签按钮。 */
    @property([Button]) private _tabButtons: Button[] = [];
    /** 由预制体放置的选中光效，类型切换时只显示一份。 */
    @property([Node]) private _tabSelection: Node[] = [];
    /** 各类型未达等级门槛时的原锁定图，与页签一一对应。 */
    @property([Node]) private _tabLocks: Node[] = [];
    /** 关卡顶部横幅复用同一 Sprite，切换时替换图。 */
    @property(Sprite) private _banner: Sprite | null = null;
    /** 按页签顺序绑定的原横幅。 */
    @property([SpriteFrame]) private _bannerFrames: SpriteFrame[] = [];
    /** 按页签顺序绑定的原副本战场。 */
    @property([SpriteFrame]) private _battleFrames: SpriteFrame[] = [];

    /** 当前显示的副本，页面重开从旧默认的金币开始。 */
    private kind: DailyDungeonKind = "gold";
    /** 关闭时用来停止共享播放器并清理战场。 */
    private stopReplay: (() => void) | null = null;
    /** 从接管战报到结果关闭之间为 true，禁止重复呈现。 */
    private presenting = false;
    /** 已开始打开本次结算窗口，播放完成或异常回调都只交付一次。 */
    private settling = false;
    /** 页面离开后阻止迟到资源或结算反馈重新挂回旧页面。 */
    private closed = true;
    /** 首次出现可挑战的关卡时安排一次公共开场预热，五个页签共用本页的资源引用。 */
    private openingWarmScheduled = false;
    /** 已发起查询的服务器重置时间，每次跨日只补查一次。 */
    private checkedReset = 0;
    /** 绑定页签、说明及跨日检查，默认展示金币副本，首个可挑战列表预热开场。 */
    public onOpen(args?: GoldDungeonArgs): void {
        super.onOpen(args);
        if (!args?.account || !this._panel || !this._battleHost || !this._battleBackground || !this._list
            || !this._retryButton || !this._retryLabel || !this._countLabel || !this._rulesButton || !this._backButton
            || !this._banner
            || [this._tabButtons, this._tabSelection, this._tabLocks, this._bannerFrames, this._battleFrames]
                .some(bindings => bindings.length !== DAILY_DUNGEON_KINDS.length)) {
            throw new Error("日常副本缺少预制体绑定或返回入口");
        }
        const content = this._list.list.node;
        content.on(SuperContent.RENDER_ITEM, this.renderStage, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.renderStage, this);
            }
        });
        this.closed = false;
        this.openingWarmScheduled = false;
        this.checkedReset = 0;
        this.listen(this._backButton, args.backToHall);
        this.listen(this._rulesButton, this.openRules.bind(this));
        this.listen(this._retryButton, () => DailyDungeonController.instance.refreshVisible());
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport()));
        this.ownListener(EventDispatcher.instance.on("daily-dungeon.updated", this, this.onDungeonUpdated));
        for (const [index, kind] of DAILY_DUNGEON_KINDS.entries()) {
            const button = this._tabButtons[index];
            this.listen(button, () => this.selectKind(kind));
            const reminder = new RedDotBinding(button.node, DAILY_DUNGEON_ENTRIES[kind].reminder);
            this.ownListener(() => reminder.dispose());
        }
        this.schedule(this.checkReset, 1);
        this.ownListener(() => this.unschedule(this.checkReset));
        this.kind = "gold";
        this.updateArtwork();
        DailyDungeonController.instance.setVisible(this.kind);
        this.render();
    }

    /** 停止当前战报及页面监听，已结算资产由服务端快照保留。 */
    public onClose(): void {
        this.closed = true;
        DailyDungeonController.instance.setVisible(null);
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

    /** 列表可见时按旧开关切换类型，进入战场后不再响应隐藏页签的点击。 */
    private selectKind(kind: DailyDungeonKind): void {
        if (this.kind === kind || this.presenting || DailyDungeonController.instance.awaitingBattle(this.kind)) {
            return;
        }
        const gate = GameConfig.instance.requireConfig(GConfig.OpenCondition, DAILY_DUNGEON_ENTRIES[kind].gate);
        const level = this.args?.account.snapshot.role?.level ?? 0;
        if (!EntryGateUtils.isEntryOpen(gate, level, 0)) {
            UIManager.instance.toast(`角色达到 ${gate.level} 级开启${gate.name}`);
            return;
        }
        this.kind = kind;
        this.checkedReset = 0;
        this.updateArtwork();
        DailyDungeonController.instance.setVisible(kind);
        this.render();
        this._list!.toStart();
    }

    /** 刷新五类页签的选中与锁定图，再绑定当前横幅及战场。 */
    private updateArtwork(): void {
        const index = DAILY_DUNGEON_KINDS.indexOf(this.kind);
        const level = this.args?.account.snapshot.role?.level ?? 0;
        for (const [position, kind] of DAILY_DUNGEON_KINDS.entries()) {
            const selected = position === index;
            const gate = GameConfig.instance.requireConfig(GConfig.OpenCondition, DAILY_DUNGEON_ENTRIES[kind].gate);
            this._tabSelection[position].active = selected;
            this._tabLocks[position].active = !EntryGateUtils.isEntryOpen(gate, level, 0);
            const scale = selected ? 1 : 0.8;
            this._tabButtons[position].node.setScale(scale, scale, 1);
        }
        this._banner!.spriteFrame = this._bannerFrames[index];
        this._battleBackground!.getComponent(Sprite)!.spriteFrame = this._battleFrames[index];
    }

    /** 后台返回其他类型时保留当前列表、滚动位置与待展示战报。 */
    private onDungeonUpdated(kind: DailyDungeonKind): void {
        if (kind === this.kind) {
            this.render();
        }
    }

    /** 显示权威剩余次数和列表，挑战在途揭开战场；拒绝或中断后恢复列表。 */
    private render(): void {
        if (this.closed || this.presenting) {
            return;
        }
        const model = DailyDungeonModel.instance;
        const controller = DailyDungeonController.instance;
        const battle = model.takeBattle(this.kind);
        const entering = controller.awaitingBattle(this.kind);
        this._panel!.node.active = !entering && !battle;
        this._battleBackground!.active = entering || !!battle;
        this._battleHost!.active = !!battle;
        if (battle) {
            this.presenting = true;
            this.afterDraw(() => this.playBattle(battle));
            return;
        }
        if (entering) {
            return;
        }
        const state = model.stateFor(this.kind);
        const busy = controller.busy(this.kind);
        const refresh = !state || this.expiredReset() !== null;
        this._retryButton!.node.active = refresh;
        this._retryButton!.interactable = !busy;
        this._retryLabel!.string = busy ? "同步中" : "重试";
        this._countLabel!.string = refresh ? "次数待同步" : this.remainingText(state!);
        const stages = refresh ? [] : model.stagesFor(this.kind);
        this._list!.list.setData(stages);
        if (!this.openingWarmScheduled && stages.some(stage => stage.canChallenge && !stage.cleared)) {
            this.openingWarmScheduled = true;
            this.afterDraw(() => BattleReplayPreview.warmChallengeOpening(this._battleHost!));
        }
    }

    /** 沿用旧版“今日剩余次数”措辞，只展示服务端总上限扣除当日用量后的结果。 */
    private remainingText(state: DailyDungeonState): string {
        const format = GameConfig.instance.getConfig(GConfig.Language, 41246)?.value ?? "今日剩余次数：%s";
        return format.replace(/%[sd]/, String(Math.max(0, state.totalLimit - state.wins)));
    }

    /** 先让列表或战场背景画出一帧，再开始资源工作；提前离页时解除本次一次性回调。 */
    private afterDraw(action: () => void): void {
        const done = () => {
            director.off(Director.EVENT_AFTER_DRAW, done);
            detach();
            action();
        };
        director.on(Director.EVENT_AFTER_DRAW, done);
        const detach = this.onViewClose(() => director.off(Director.EVENT_AFTER_DRAW, done));
    }

    /** 复用同一预制卡片，按其关卡绑定价格、限制原因与点击回调。 */
    private renderStage(node: Node, stage: DailyDungeonStage): void {
        const state = DailyDungeonModel.instance.stateFor(this.kind);
        if (!state) {
            return;
        }
        const controller = DailyDungeonController.instance;
        const title = GameConfig.instance.getConfig(GConfig.Language, stage.titleLanguageId)?.value;
        const pendingStage = controller.pendingStageId(this.kind);
        const canConfirm = pendingStage === stage.stageId;
        const unlocked = stage.unlocked && state.power > stage.requiredPower;
        node.getComponent(GoldDungeonStageCell)!.render({
            title: title ?? `${this.dungeonTitle()}第${stage.stageId}关`,
            ribbon: stage.ribbon,
            unlocked,
            cleared: stage.cleared,
            canChallenge: !controller.busy(this.kind) && !this.presenting
                && (pendingStage === null ? stage.canChallenge : canConfirm),
            condition: this.stageCondition(state, stage),
            action: canConfirm ? "确认结果" : !unlocked ? "未解锁" : stage.cleared ? "扫荡" : "挑战",
            price: pendingStage === null && stage.canChallenge ? state.nextCostDiamonds : 0,
            rewards: stage.rewardPreview,
        }, () => this.challenge(stage.stageId), item => this.showReward(item));
    }

    /** 只解释服务端拒绝的资格，未开关卡优先显示其等级或前置通关限制。 */
    private stageCondition(state: DailyDungeonState, stage: DailyDungeonStage): string {
        if (stage.canChallenge) {
            return "";
        }
        if (!stage.unlocked) {
            const level = this.args?.account.snapshot.role?.level ?? 0;
            if (stage.minimumLevel && level < stage.minimumLevel) {
                return `角色等级达到 ${stage.minimumLevel}`;
            }
            return stage.stageId > 1 ? `请先通关第${stage.stageId - 1}关` : `${this.dungeonTitle()}尚未解锁`;
        }
        if (state.wins >= state.totalLimit) {
            return "今日次数已用完";
        }
        return state.power > 0 && state.power <= stage.requiredPower
            ? `历史最高战力需大于 ${stage.requiredPower}` : "请先保存出战阵容";
    }

    /** 排队跨日查询，时间以服务器校准为准，界面不自行增加次数。 */
    private checkReset(): void {
        const deadline = this.expiredReset();
        if (deadline !== null && this.checkedReset !== deadline && !DailyDungeonController.instance.busy(this.kind)) {
            this.checkedReset = deadline;
            DailyDungeonController.instance.refreshVisible();
        }
    }

    /** 已到重置时刻时返回应查询的服务器秒，未知或未到时刻则返回 null。 */
    private expiredReset(): number | null {
        const deadline = DailyDungeonModel.instance.stateFor(this.kind)?.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        return deadline && now !== null && now > deadline ? deadline : null;
    }

    /** 提交当前有效关卡，由控制器决定新挑战、扫荡或原请求重试；跨日先刷新。 */
    private challenge(stageId: number): void {
        if (this.closed || this.presenting) {
            return;
        }
        const controller = DailyDungeonController.instance;
        if (DailyDungeonModel.instance.stateFor(this.kind) && this.expiredReset() === null) {
            controller.challenge(this.kind, stageId);
        } else {
            controller.refreshVisible();
        }
    }

    /** 沿用旧版语言配置和通用说明窗；关闭后保留当前副本页签与滚动位置。 */
    private openRules(): void {
        const config = GameConfig.instance;
        const title = config.getConfig(GConfig.Language, 42028)?.value ?? "日常副本";
        const message = config.getConfig(GConfig.Language, 42029)?.value?.replace(/\\n/g, "\n");
        if (!message) {
            UIManager.instance.toast("副本说明暂不可用");
            return;
        }
        void UIManager.instance.openChild(this, RulesView, { title, message }).catch(() => {
            // 开窗错误由 UIManager 统一处理。
        });
    }

    /** 点击预览奖励只说明物品与配置数量，不写库存。 */
    private showReward(item: DailyDungeonItem): void {
        const face = BagItemCatalog.face(item.itemId, item.quantity);
        void UIManager.instance.openChild(this, BagInfoView, { source: "description", face }).catch(() => {
            // 开窗错误由 UIManager 统一处理。
        });
    }

    /** 在战场背景已绘制后复用正式开场、战报和结束时序，播放出错仍显示真实结算。 */
    private playBattle(battle: DailyDungeonBattle): void {
        const title = this.dungeonTitle();
        void BattleReplayPreview.open(this._battleHost!, battle.bytes, false, undefined, undefined, title,
            true, () => this.showSettlement(battle), false, () => this.closed, undefined, undefined, `${title}阵容`,
            () => { void this.showSettlement(battle); })
            .then(stop => {
                if (this.closed) {
                    stop();
                } else {
                    this.stopReplay = stop;
                }
            }).catch(error => {
                if (!this.closed) {
                    GameLog.shared.classified("MODULE", "warn", "GoldDungeonView", `${title}战报播放失败：${String(error)}`);
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

    /** 收起本场播放，重新读取当前副本状态后展示列表，不触发新的结算或发奖。 */
    private restoreStage(): void {
        if (this.closed) {
            return;
        }
        this.stopReplay?.();
        this.stopReplay = null;
        this.presenting = false;
        this.settling = false;
        this.render();
    }

    /** 从当前配置读取副本名，用于关卡缺省标题与战报双方名称。 */
    private dungeonTitle(): string {
        return GameConfig.instance.requireConfig(GConfig.OpenCondition, DAILY_DUNGEON_ENTRIES[this.kind].gate).name;
    }
}
