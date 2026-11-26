/** 主线挂机主页：静态底板保存关卡、四项收益及三个正式入口，挑战交给页内战场。
 * 挂机显示服务器下发的累计与基础收益，首通结算关闭后对比新旧收益。领取成功后本页播放收取效果。
 * 页面关闭取消显示但保留服务端待结算状态，奖励到账与通用反馈由应用处理。 */
import { _decorator, AudioClip, AudioSource, Button, Label, Node, Sprite, SpriteFrame, Tween, UIOpacity, UITransform, sp, tween } from "cc";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { MainChapterController } from "../MainChapterController";
import { MainChapterSession } from "../MainChapterSession";
import { MainChapterModel } from "../MainChapterModel";
import type { IdleClaimConfirmation, IdleClaimReceipt } from "../data/MainChapterIdleClaimData";

import { BattleReplayPreview } from "./BattleReplayPreview";
import { MainChapterHeroTalk } from "./MainChapterHeroTalk";
import { MainChapterIdleDisplay } from "./MainChapterIdleDisplay";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { FormationView } from "../../hero/ui/FormationView";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { ServerClock } from "../../../core/ServerClock";
import { IdleChestUtils } from "../utils/IdleChestUtils";
import { BattleSpineService } from "./BattleSpineService";
import { MainChapterIdleResources } from "./MainChapterIdleResources";
import { MainChapterIdleChest, IdleChestAnimation } from "./MainChapterIdleChest";
import { MainChapterMilestoneCard } from "./MainChapterMilestoneCard";
import { ChapterClearRewardView } from "./ChapterClearRewardView";
import { ChapterRewardInfoView } from "./ChapterRewardInfoView";
import { MainChapterQuickBattleView } from "./MainChapterQuickBattleView";
import { PREVIEW } from "cc/env";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import type { AssetScope } from "../../../framework/assets/ResourceAssetsUtils";
import { GameConfig } from "../../../config/GameConfig";
import { ChapterBackgroundUtils } from "../utils/ChapterBackgroundUtils";
import type { ChapterBackgroundPlan } from "../utils/ChapterBackgroundUtils";
import { ChapterRewardInfoUtils, chapterIdleIncomeIds } from "../utils/ChapterRewardInfoUtils";

const { ccclass, property } = _decorator;

/** 主城导航注入战斗页可打开的跨模块入口。 */
interface MainChapterOpenArgs {
    readonly openQuest?: () => void;
}

@UIRegistry.view({
    id: "remake-campaign",
    prefab: "bundles/module/battle/prefabs/MainChapterView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("MainChapterView")
export class MainChapterView extends BaseView<MainChapterOpenArgs> {
    /** 当前操作已反馈的结果，开始新请求后清空，防止时钟刷新重复飘字。 */
    private lastResultMessage = "";
    /** 对话由本页持有，跨遇敌保留冷却，挑战与关闭时隐藏。 */
    private heroTalk: MainChapterHeroTalk | null = null;
    /** 到达行军路程后等待/播放挂机战报，期间停止背景。 */
    private idleEncounterActive = false;
    /** 挂机播放器的取消口，与正式挑战分开，不打开结算。 */
    private stopIdleEncounter: (() => void) | null = null;
    /** 主线底部面板，挑战期间保留；按钮由播放状态禁用。 */
    @property(Node) panel: Node | null = null;
    /** 序列化战场宿主，位于背景之上、底部面板之下，不覆盖主城导航。 */
    @property(Node) battleHost: Node | null = null;
    /** 挑战或领取按钮，文案由当前服务器状态决定。 */
    @property(Button) challengeButton: Button | null = null;
    /** 快速战斗入口，打开报价与产物窗口。 */
    @property(Button) quickBattleButton: Button | null = null;
    /** 战力提升入口；不将旧变强建议误用为布阵或开放养成。 */
    @property(Button) powerButton: Button | null = null;
    /** 原主线常显最小未领里程碑卡，正式战斗期间隐藏，不另造弹窗入口。 */
    @property(MainChapterMilestoneCard) milestoneCard: MainChapterMilestoneCard | null = null;
    /** 当前关卡与通关信息。 */
    @property(Label) stageLabel: Label | null = null;
    /** 操作状态或待领奖提示。 */
    @property(Label) statusLabel: Label | null = null;
    /** 挑战按钮文字，避免复用固定旧文案。 */
    @property(Label) challengeLabel: Label | null = null;
    /** 按旧版小时分钟显示服务器挂机时长，首次快照到达前显示等待提示。 */
    @property(Label) idleTimeLabel: Label | null = null;
    /** 金币每分钟收益，未同步时不从通关奖励推算。 */
    @property(Label) goldRateLabel: Label | null = null;
    /** 角色经验每分钟收益。 */
    @property(Label) roleExpRateLabel: Label | null = null;
    /** 英雄经验每分钟收益。 */
    @property(Label) heroExpRateLabel: Label | null = null;
    /** 中部收益提示的整体透明度，页面关闭或下一场开战时停止动画。 */
    @property(UIOpacity) private idleIncomeOpacity: UIOpacity | null = null;
    /** 从上至下三行的上一关数值，顺序为英雄经验、角色经验、金币。 */
    @property([Label]) private previousIncomeLabels: Label[] = [];
    /** 从上至下三行的当前每分钟收益，与上一关数值按行对应。 */
    @property([Label]) private currentIncomeLabels: Label[] = [];
    /** 挂机收益入口，只转交当前显示期；实际门槛、网络、发奖与恢复沿原领取绑定。 */
    @property(Button) idleClaimButton: Button | null = null;
    /** 旧中央章节图标的产物说明入口，只读配置不开放领取。 */
    @property(Button) rewardInfoButton: Button | null = null;
    /** 旧战斗页右上「通关奖励」独立入口。 */
    @property(Button) clearRewardButton: Button | null = null;
    /** 通关奖励红点的可选定位节点，保存原尺寸与偏移。 */
    @property(Node) clearRewardDotAnchor: Node | null = null;
    /** 战斗主页的每日任务按钮，由应用导航打开共用任务窗口。 */
    @property(Button) dailyTaskButton: Button | null = null;
    /** 每日任务入口红点位置，与通关奖励分别布局。 */
    @property(Node) dailyTaskDotAnchor: Node | null = null;
    /** 静态宝箱挂点；本页只挂载一次骨骼，跨档仅切动作。 */
    @property(Node) idleChestHost: Node | null = null;
    /** 超过十分钟显示的旧计时气泡，位置和图片保存在Prefab。 */
    @property(Node) idleBubble: Node | null = null;
    /** 气泡内时长，与底栏使用同一服务器快照。 */
    @property(Label) idleBubbleLabel: Label | null = null;
    /** 宝箱仅负责旧收取时序及跨档播放；关闭清理，不发送领取或修改服务器起点。 */
    private idleChest: MainChapterIdleChest | null = null;
    /** 当前页收取表现的通用点击音，关闭停止；不持有业务领取状态。 */
    private chestAudio: AudioSource | null = null;
    /** 累计进度条，使用旧版整数百分比，不代表可领取资产比例。 */
    @property(Sprite) idleProgress: Sprite | null = null;
    /** 资源飞行独立层，不与临时战场一起销毁。 */
    @property(Node) resourceFlightHost: Node | null = null;
    /** 隐藏的图标模板，尺寸和Sprite样式保存在Prefab。 */
    @property(Node) resourceFlightTemplate: Node | null = null;
    /** 面板内旧收集终点，适配跟随面板。 */
    @property(Node) resourceFlightTarget: Node | null = null;
    /** 金币、钻石、角色经验、英雄经验四种静态图标，不携带数量。 */
    @property([SpriteFrame]) resourceFlightFrames: SpriteFrame[] = [];
    /** 当前页面的临时飞行管理，关闭时清空并释放引用。 */
    private idleResources: MainChapterIdleResources | null = null;
    /** 页面关闭后拒绝迟到的画面加载，与网络会话隔离无关。 */
    private closed = false;
    /** 本次显示期的无业务标识引用；打开和关闭均换新，旧请求不能在后来页面补播。 */
    private idleCollectionToken: object = Object.freeze({});
    /** 当前播放器清理口，关闭页面立即释放。 */
    private stopReplay: (() => void) | null = null;
    /** 准备或播放战报期间阻止再次开场。 */
    private playing = false;
    /** 已结束正常结算但还在等待升级弹窗的关卡，播出、开战或离开页面时清空。 */
    private pendingIncomeStage: number | null = null;

    /** 当前行军节点，仅本页持有，不影响权威阵容。 */
    private idleDisplay: MainChapterIdleDisplay | null = null;
    /** 已请求的阵容和外观签名，避免每帧重复加载。 */
    private idleDisplayKey = "";
    /** 本页显示加载代次，用于取消关页或开战前尚未完成的资源请求。 */
    private idleDisplayEpoch = 0;
    /** 近远景滚动偏移，单位为设计像素，不参与游戏规则。 */
    private marchOffset = 0;
    /** 远景独立偏移，制造旧版的前后景速度差。 */
    private skyOffset = 0;
    /** 最近请求的地图与演出模式；同一地图内刷新快照不重复加载，打开本页时清空。 */
    private backgroundKey = "";
    /** 已实际切到画面的资源身份；与请求不同期间暂停行军背景，避免旧地图继续循环。 */
    private appliedBackgroundKey = "";
    /** 本页背景切换代次；新地图和关闭时递增，迟到图片不能覆盖当前地图。 */
    private backgroundEpoch = 0;
    /** 当前四张显示节点共用的图片作用域，切换全部成功后才撤回旧图持有。 */
    private backgroundScope: AssetScope | null = null;
    /** 正在准备的候选图片作用域；被新地图替代或关页时立即释放，不另造资源池。 */
    private pendingBackgroundScope: AssetScope | null = null;

    /** 绑定主线入口、收益提示和适配，有红点挂点时订阅，首次进入转交待结算恢复。 */
    public onOpen(args?: MainChapterOpenArgs): void {
        if (!this.battleHost || !this.panel || !this.challengeButton || !this.quickBattleButton || !this.powerButton
            || !this.stageLabel || !this.statusLabel || !this.challengeLabel || !this.idleTimeLabel
            || !this.goldRateLabel || !this.roleExpRateLabel || !this.heroExpRateLabel || !this.idleClaimButton) throw new Error("主线页面绑定缺失");
        this.closed = false;
        this.backgroundKey = "";
        this.appliedBackgroundKey = "";
        this.idleCollectionToken = Object.freeze({});
        this.lastResultMessage = MainChapterModel.instance.message;
        if (!this.idleProgress || !this.resourceFlightHost || !this.resourceFlightTemplate || !this.resourceFlightTarget) {
            throw new Error("挂机进度或资源飞行绑定缺失");
        }
        this.idleResources = new MainChapterIdleResources(this.resourceFlightHost, this.resourceFlightTemplate,
            this.resourceFlightTarget, this.resourceFlightFrames);
        if (!this.idleIncomeOpacity || this.previousIncomeLabels.length !== chapterIdleIncomeIds.length
            || this.currentIncomeLabels.length !== chapterIdleIncomeIds.length) {
            throw new Error("主线收益对比绑定缺失");
        }
        this.clearIdleIncome();
        const talkTemplate = this.node.getChildByName("HeroTalkTemplate");
        if (talkTemplate) {
            this.heroTalk = new MainChapterHeroTalk(talkTemplate, this.battleHost,
                () => MainChapterSession.current?.currentRole?.level ?? 0);
        }
        this.ownListener(UIManager.instance.setResidentHost("main-chapter-field",
            () => !this.closed && this.battleHost?.isValid ? this.battleHost : null));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport()));
        this.listen(this.challengeButton, () => { void this.prepareChallenge(); });
        this.listen(this.quickBattleButton, () => this.openQuickBattle());
        this.listen(this.powerButton, () => UIManager.instance.toast("战力提升建议尚未恢复"));
        this.listen(this.idleClaimButton, () => this.collectIdleRewards());
        if (!this.rewardInfoButton || !this.clearRewardButton) {
            throw new Error("主线产物说明或通关奖励入口绑定缺失");
        }
        this.listen(this.rewardInfoButton, () => {
            void UIManager.instance.openChild(this, ChapterRewardInfoView).catch(error => {
                if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    UIManager.instance.toast("产物说明暂不可用");
                }
            });
        });
        this.listen(this.clearRewardButton, () => this.openClearRewards());
        if (this.dailyTaskButton && args?.openQuest) {
            this.listen(this.dailyTaskButton, args.openQuest);
        }
        if (this.dailyTaskDotAnchor) {
            const binding = RedDotBinding.atAnchor(this.dailyTaskDotAnchor, GameRedDotKey.QUEST);
            this.ownListener(() => binding.dispose());
        }
        if (this.clearRewardDotAnchor) {
            const binding = RedDotBinding.atAnchor(this.clearRewardDotAnchor, GameRedDotKey.CHAPTER_CLEAR);
            this.ownListener(() => binding.dispose());
        }
        if (!this.idleChestHost || !this.idleBubble || !this.idleBubbleLabel) {
            throw new Error("挂机宝箱静态绑定缺失");
        }
        this.idleChest?.dispose();
        this.idleChest = new MainChapterIdleChest(() => {
            if (this.closed || !this.idleChestHost?.isValid) {
                return null;
            }
            const skeleton = this.idleChestHost.getComponent(sp.Skeleton);
            return skeleton?.skeletonData ? skeleton as IdleChestAnimation : null;
        });
        BattleSpineService.instance.mountNamedSpine(this.idleChestHost, "res-block", "normal-1", {
            onReady: () => {
                if (!this.closed) {
                    this.renderIdle();
                }
            },
        });
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.render));
        this.ownListener(EventDispatcher.instance.on("main-chapter.idle-collection", this, this.onIdleCollection));
        this.render();
        void MainChapterController.instance.recoverPendingOnEntry().catch(error => {
            if (!this.closed) {
                GameLog.shared.classified("MODULE", "warn", "MainChapterView", "主线待结算恢复暂停：" + String(error));
                UIManager.instance.toast("结算待恢复，请点击确认结算重试");
            }
        });
    }

    /** 将原始按钮节点登记到页面清理队列，节点先销毁时跳过解绑。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 从主线或契约任务的跳转打开快速战斗，切页时关闭随附的子窗。 */
    public openQuickBattle(): void {
        if (!this.closed && !this.playing) {
            void UIManager.instance.openChild(this, MainChapterQuickBattleView)
                .catch(() => { /* 由 UIManager 统一处理开窗失败。 */ });
        }
    }

    /** 只读列表直接由父页打开，切页或账号失效时一并关闭。 */
    private openClearRewards(): void {
        if (!this.closed && !this.playing) {
            void UIManager.instance.openChild(this, ChapterClearRewardView).catch(error => {
                if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    UIManager.instance.toast("通关奖励暂不可用");
                }
            });
        }
    }

    /** 宝箱点击交给确认流程，战斗或已有收取演出时忽略重复点击。 */
    private collectIdleRewards(): void {
        if (this.closed || this.playing || this.idleChest?.collecting) {
            return;
        }
        const session = MainChapterSession.current;
        if (!session) {
            UIManager.instance.toast("挂机领取正在准备，请稍后重试");
            return;
        }
        void session.idleClaim.begin(this.idleCollectionToken);
    }

    /** 正常挑战在本页子窗确认阵容；待确认挑战和待结算优先恢复。 */
    private async prepareChallenge(): Promise<void> {
        const model = MainChapterModel.instance;
        if (this.closed || this.playing || model.busy || !model.state) {
            return;
        }
        if (model.requestId || model.state.pendingBattleId
            || (model.settlement && (!model.settlement.presented || model.settlement.feedbackReady))) {
            await this.challenge();
            return;
        }
        if (model.state.challengeLimit === undefined) {
            UIManager.instance.toast("挑战范围尚未同步");
            return;
        }
        if (this.isChapterRangeComplete()) {
            UIManager.instance.toast("当前开放的" + model.state.challengeLimit + "关已全部通关");
            return;
        }
        try {
            await UIManager.instance.openChild(this, FormationView, {
                closeAfterSave: true,
                complete: (confirmed: boolean) => {
                    if (confirmed && !this.closed) {
                        void this.challenge();
                    }
                },
            });
        } catch (error) {
            if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast(String(error));
            }
        }
    }

    /** 未收口结算用原战斗编号继续确认，未确认挑战复用原请求，其余按权威状态选择。 */
    private async challenge(): Promise<void> {
        const model = MainChapterModel.instance;
        if (model.busy || this.playing || !model.state) {
            return;
        }
        const controller = MainChapterController.instance;
        try {
            if (model.settlement && (!model.settlement.presented || model.settlement.feedbackReady)) {
                if (model.settlement.presentation === "reward" || model.settlement.feedbackReady) {
                    await controller.retrySettlementFeedback();
                } else {
                    await this.play(model.settlement.battleId, true);
                }
            } else if (model.state.pendingBattleId && !model.requestId) {
                await this.play(model.state.pendingBattleId);
            } else {
                const previousReceipt = model.receipt;
                await controller.challenge();
                // 布阵期间范围可能缩小；没有新交付回执时，不能把上一场结果当成本次挑战播放。
                if (model.receipt === previousReceipt) {
                    return;
                }
                if (!this.closed && !model.requestId && model.receipt?.action === "BATTLE") {
                    await this.play(model.receipt.battleId);
                } else if (!this.closed && !model.requestId && model.receipt?.action === "SETTLED") {
                    await this.play(model.receipt.battleId, true);
                }
            }
        } catch (error) {
            if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) UIManager.instance.toast(String(error));
        }
    }

    /** 显示页内战场或继续原结算；开战停止上一关提示，正常首通关闭战场后准备新提示。 */
    private async play(battleId: string, settlementOnly = false): Promise<void> {
        if (this.closed || this.playing) {
            return;
        }
        this.playing = true;
        this.clearIdleIncome();
        this.clearIdleDisplay();
        this.render();
        try {
            const cached = MainChapterModel.instance.replay;
            const report = settlementOnly && cached?.battleId === battleId ? cached
                : await MainChapterController.instance.replay(battleId);
            if (this.closed || !report) return;
            // 战场在主页内部播放，底部面板与共享导航继续显示。
            this.stopReplay = () => UIManager.instance.closeById("main-chapter-battle");
            await UIManager.instance.openById("main-chapter-battle", { report, settlementOnly, onClosed: (firstClearStage?: number) => {
                this.stopReplay = null;
                this.playing = false;
                if (!this.closed) {
                    this.panel!.active = true;
                    this.render();
                    if (firstClearStage !== undefined) {
                        this.pendingIncomeStage = firstClearStage;
                        this.schedule(this.showPendingIdleIncome, 0.5);
                    }
                }
            }});
        } catch (error) {
            this.stopReplay = null;
            if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) UIManager.instance.toast("战报恢复失败：" + String(error));
        } finally {
            if (!this.stopReplay) {
                this.playing = false;
                if (!this.closed) { this.panel!.active = true; this.render(); }
            }
        }
    }

    /** 每半秒等候升级窗关闭，匹配本次首通的最新收益快照后播放 4.5 秒淡入淡出。 */
    private showPendingIdleIncome = (): void => {
        const windows = UIManager.instance;
        if (this.closed || this.playing || windows.isOpen("role-upgrade") || windows.isOpen("chapter-end")) {
            return;
        }
        this.unschedule(this.showPendingIdleIncome);
        const stage = this.pendingIncomeStage;
        this.pendingIncomeStage = null;
        const model = MainChapterModel.instance;
        if (stage === null || model.state?.maxCleared !== stage || model.state.pendingBattleId) {
            return;
        }
        try {
            const comparison = ChapterRewardInfoUtils.idleIncomeComparison(
                GameConfig.instance.getFileByPath("config/chapterreward"), stage, model.idle,
            );
            if (!comparison) {
                return;
            }
            comparison.forEach((row, index) => {
                this.previousIncomeLabels[index].string = String(row.previous);
                this.currentIncomeLabels[index].string = row.current + "/分";
            });
            const opacity = this.idleIncomeOpacity!;
            opacity.opacity = 0;
            opacity.node.active = true;
            tween(opacity).to(1, { opacity: 255 }, { easing: "expoOut" }).delay(0.5)
                .to(3, { opacity: 0 }).call(() => { opacity.node.active = false; }).start();
        } catch (error) {
            GameLog.shared.warnOnce("MODULE", "MainChapterView", "chapter-idle-income:" + stage, String(error));
        }
    };

    /** 离开当前战斗场景、开新战或重新显示页面时取消尚未播出或正在播放的收益提示。 */
    private clearIdleIncome(): void {
        if (this.pendingIncomeStage !== null) {
            this.pendingIncomeStage = null;
            this.unschedule(this.showPendingIdleIncome);
        }
        const opacity = this.idleIncomeOpacity;
        if (opacity?.isValid && opacity.node.isValid) {
            Tween.stopAllByTarget(opacity);
            opacity.node.active = false;
        }
    }

    /** 事件驱动更新挑战范围、领奖入口和背景，历史恢复仍优先于新挑战。 */
    private render = (): void => {
        if (this.closed) return;
        if (this.milestoneCard?.isValid) {
            this.milestoneCard.node.active = !this.playing && !this.milestoneCard.completed;
        }
        this.refreshChapterBackground();
        const model = MainChapterModel.instance;
        const state = model.state;
        if (this.clearRewardButton?.isValid) {
            this.clearRewardButton.node.active = !this.playing;
        }
        if (this.dailyTaskButton?.isValid) {
            this.dailyTaskButton.node.active = !this.playing;
        }
        const completed = this.isChapterRangeComplete();
        const scopePending = !!state && state.challengeLimit === undefined;
        this.stageLabel!.string = !state ? "等待主线同步" : scopePending ? "等待范围同步"
            : String(state.maxCleared < state.challengeLimit! ? state.maxCleared + 1 : state.maxCleared);
        if (model.busy) {
            this.lastResultMessage = "";
        } else if (model.message && model.message !== this.lastResultMessage) {
            UIManager.instance.toast(model.message);
            this.lastResultMessage = model.message;
        }
        const settlementPending = !!model.settlement && (!model.settlement.presented || model.settlement.feedbackReady);
        const retryReward = settlementPending && model.settlement!.feedbackReady && model.settlement!.phase === "confirmed";
        this.statusLabel!.string = retryReward ? "奖励已结算，显示未完成，可重试显示"
            : settlementPending ? "上一场战斗结算待确认，可继续恢复"
            : completed ? "当前开放的" + state!.challengeLimit + "关已全部通关"
            : model.busy ? "正在处理…" : state?.pendingBattleId ? "上次战斗待结算，点击战斗恢复"
            : scopePending ? "挑战范围尚未同步" : "";
        this.challengeLabel!.string = this.playing ? "战斗中" : model.busy ? "处理中" : !state ? "等待同步"
            : model.settlement?.phase === "confirming" ? "确认中" : retryReward ? "重试显示" : settlementPending ? "确认结算" : model.requestId ? "确认挑战"
            : state?.pendingBattleId ? "恢复战斗" : completed ? "已通关" : scopePending ? "等待范围" : "战斗";
        this.renderIdle();
        const enabled = !!state && !model.busy && !this.playing && model.settlement?.phase !== "confirming";
        const recovering = !!model.requestId || !!state?.pendingBattleId || settlementPending;
        this.challengeButton!.interactable = enabled && !completed && (!scopePending || recovering);
        this.quickBattleButton!.interactable = enabled;
        this.powerButton!.interactable = enabled;
    };

    /** 没有旧请求或待结算战报，且已到当前服务端支持末关时返回true；恢复操作不受阶段上限拦截。 */
    private isChapterRangeComplete(): boolean {
        const model = MainChapterModel.instance;
        return !!model.state && model.state.challengeLimit !== undefined
            && model.state.maxCleared >= model.state.challengeLimit
            && !model.requestId && !model.state.pendingBattleId
            && (!model.settlement || (model.settlement.presented && !model.settlement.feedbackReady));
    }

    /** 每帧刷新挂机计时、宝箱、行军和对话表现。 */
    public update(dt: number): void {
        if (!this.closed) {
            this.idleChest?.update(dt);
            this.renderIdle();
            this.updateMarch(dt);
            this.heroTalk?.update(dt, !this.playing);
        }
    }

    /** 按公共时钟显示挂机累计，等待校时保留收取画面，首胜后把基础收益换算为每分钟。 */
    private renderIdle(): void {
        const state = MainChapterModel.instance.idle;
        this.refreshIdleDisplay();
        if (!this.idleTimeLabel) {
            return;
        }
        const now = state ? ServerClock.instance.nowSeconds() : null;
        if (state && now !== null) {
            const seconds = IdleChestUtils.elapsed(now, state.startedAt, state.maxSeconds);
            if (!this.idleChest?.collecting) {
                this.idleTimeLabel.string = IdleChestUtils.time(seconds);
            }
            this.renderIdleChest(seconds, state.maxSeconds);
        } else if (!state || !this.idleChest?.collecting) {
            this.idleTimeLabel.string = "等待挂机计时";
            if (this.idleProgress) {
                this.idleProgress.node.active = false;
            }
            if (this.idleChestHost) {
                this.idleChestHost.active = false;
            }
            if (this.idleBubble) {
                this.idleBubble.active = false;
            }
        }
        for (const [label, id] of [[this.goldRateLabel, 900001], [this.roleExpRateLabel, 900003],
            [this.heroExpRateLabel, 900101]] as const) {
            if (label) {
                const rate = state?.rates.find(row => row.itemId === id);
                label.string = rate ? ChapterRewardInfoUtils.perMinute(rate.quantity, state!.frequency) + "/分" : "—/分";
            }
        }
    }

    /** 四档待机复用同一骨骼；旧收取两秒内保留计时/进度/气泡，随后只读最新统一状态。 */
    private renderIdleChest(seconds: number, maxSeconds: number): void {
        if (!this.idleChestHost || !this.idleBubble || !this.idleBubbleLabel) {
            return;
        }
        this.idleChestHost.active = !this.playing;
        this.idleChest?.render(seconds, maxSeconds);
        if (this.idleChest?.collecting) {
            return;
        }
        this.idleBubble.active = !this.playing && IdleChestUtils.showBubble(seconds);
        this.idleBubbleLabel.string = IdleChestUtils.time(seconds);
        if (this.idleProgress) {
            this.idleProgress.node.active = true;
            this.idleProgress.fillRange = IdleChestUtils.percentage(seconds, maxSeconds) / 100;
        }
    }

    /** 返回本次显示期的原样引用；关闭或再次打开后失效，不包含角色、请求或资产数据。 */
    public idleCollectionContext(): object {
        return this.idleCollectionToken;
    }

    /** 收到本次领取的即时回包后，只在发起领取的页面显示期内播放。 */
    private onIdleCollection(confirmation: IdleClaimConfirmation): void {
        if (this.closed || confirmation.presentationContext !== this.idleCollectionToken) {
            return;
        }
        this.playIdleCollection(confirmation.receipt);
    }

    /**
     * 以服务端本次实际结算的秒数选择收取档位。
     * true 表示动画已启动，false 表示页面、资源或演出状态暂不允许播放。
     */
    public playIdleCollection(receipt: Pick<IdleClaimReceipt, "receiptId" | "seconds" | "maxSeconds">): boolean {
        if (this.closed || this.playing || !this.node.isValid || !MainChapterModel.instance.idle
            || !this.idleTimeLabel?.isValid || !this.idleChestHost?.isValid || !this.idleBubble?.isValid
            || !this.idleBubbleLabel?.isValid || !this.idleProgress?.isValid) {
            return false;
        }
        const stage = IdleChestUtils.stage(receipt.seconds, receipt.maxSeconds);
        if (!this.idleChest?.collect(stage)) {
            return false;
        }
        // 演出期间显示本次领取量，结束后恢复最新累计。
        const time = IdleChestUtils.time(receipt.seconds);
        this.idleTimeLabel.string = time;
        this.idleChestHost.active = true;
        this.idleBubble.active = IdleChestUtils.showBubble(receipt.seconds);
        this.idleBubbleLabel.string = time;
        this.idleProgress.node.active = true;
        this.idleProgress.fillRange = IdleChestUtils.percentage(receipt.seconds, receipt.maxSeconds) / 100;
        this.playChestClick();
        return true;
    }

    /** 公共时钟就绪后，允许 Creator 演示入口按指定档位播放宝箱并记录显示时间。 */
    public previewIdleChest(stage: number): boolean {
        const state = MainChapterModel.instance.idle;
        const now = ServerClock.instance.nowSeconds();
        if (!PREVIEW || this.closed || this.playing || !state || now === null) {
            return false;
        }
        const played = this.idleChest?.collect(stage) || false;
        if (played) {
            this.playChestClick();
            const seconds = IdleChestUtils.elapsed(now, state.startedAt, state.maxSeconds);
            GameLog.shared.classified("DEV", "info", "IdleChestPreview", JSON.stringify({
                stage, collect: IdleChestUtils.collectAnimation(stage), queued: "normal-0",
                queuedDelaySeconds: 1.5, displayGuardSeconds: 2,
                claimWaitSeconds: IdleChestUtils.claimWaitSeconds(seconds, state.frequency, state.maxSeconds),
                readOnly: true,
            }));
        }
        return played;
    }

    /** 按设备设置播放原通用点击音；关页或显示期变化后的迟到加载不再保留音源。 */
    private playChestClick(): void {
        const context = this.idleCollectionToken;
        ResourceAssetsUtils.loadForNode(this.node, "audio/sfx-button-click", "AudioClip", (error, asset) => {
            if (this.closed || !this.node.isValid || context !== this.idleCollectionToken) {
                return;
            }
            if (error || !asset) {
                GameLog.shared.warnOnce("MODULE", "MainChapterView", "idle-chest-click-audio", "挂机收取点击音暂不可用");
                return;
            }
            this.chestAudio = this.node.getComponent(AudioSource) || this.node.addComponent(AudioSource);
            this.chestAudio.clip = asset as AudioClip;
            AudioPreferences.playEffect(this.chestAudio);
        });
    }

    /** 快照选人或英雄外观变化时重建，未接通挂机或正式挑战期间不显示替代英雄。 */
    private refreshIdleDisplay(): void {
        const state = MainChapterModel.instance.idle;
        if (this.playing || !state?.slots?.length || !this.battleHost) {
            if (this.idleDisplay || this.idleDisplayKey) {
                this.clearIdleDisplay();
            }
            return;
        }
        const roster = HeroRosterModel.instance.snapshot;
        const key = JSON.stringify([state.slots, roster.heroes.map(hero => [hero.id, hero.templateId, hero.level])]);
        if (key === this.idleDisplayKey) {
            return;
        }
        this.clearIdleDisplay(false);
        this.idleDisplayKey = key;
        const epoch = this.idleDisplayEpoch;
        void MainChapterIdleDisplay.open(this.battleHost, state).then(display => {
            if (this.closed || this.playing || epoch !== this.idleDisplayEpoch) {
                display.dispose();
                return;
            }
            this.idleDisplay = display;
        }).catch(error => {
            if (!this.closed && epoch === this.idleDisplayEpoch) {
                GameLog.shared.classified("MODULE", "warn", "MainChapter", "挂机显示加载失败：" + String(error));
            }
        });
    }

    /** 近景120、远景20沿旧BattleIdleLayer；两份静态背景循环，不创建每帧节点。 */
    private updateMarch(dt: number): void {
        if (!this.idleDisplay || this.playing || this.idleEncounterActive
            || this.backgroundKey !== this.appliedBackgroundKey) {
            return;
        }
        const floor = this.node.getChildByName("PalaceFloor")!;
        const width = floor.getComponent(UITransform)!.contentSize.width;
        const travelled = this.marchOffset + Math.max(0, dt) * 120;
        this.marchOffset = travelled % width;
        this.skyOffset = (this.skyOffset + Math.max(0, dt) * 20) % width;
        for (const [name, offset] of [["PalaceFloor", this.marchOffset], ["PalaceBackground", this.skyOffset]] as const) {
            this.node.getChildByName(name)?.setPosition(-offset, 0, 0);
            this.node.getChildByName(name + "Loop")?.setPosition(width - offset, 0, 0);
        }
        if (travelled >= width) void this.beginIdleEncounter();
    }

    /** 一张地面宽度后请求真实遇敌战报，借用现有英雄播放；结束归还，挑战或关页取消，不结算奖励。 */
    private async beginIdleEncounter(): Promise<void> {
        if (this.idleEncounterActive || this.closed || this.playing || !this.idleDisplay) return;
        this.idleEncounterActive = true;
        this.idleDisplay.stand();
        const epoch = this.idleDisplayEpoch;
        try {
            const bytes = await MainChapterController.instance.encounter();
            if (this.closed || this.playing || epoch !== this.idleDisplayEpoch) return;
            if (!bytes) {
                this.finishIdleEncounter();
                return;
            }
            const stop = await BattleReplayPreview.open(this.battleHost!, bytes, false, undefined, undefined,
                "挂机遇敌", true, async () => {
                    if (!this.closed && epoch === this.idleDisplayEpoch) this.finishIdleEncounter();
                }, true, () => this.closed || this.playing || epoch !== this.idleDisplayEpoch, this.idleDisplay!, world => {
                    if (!this.closed && !this.playing && epoch === this.idleDisplayEpoch) {
                        this.idleResources?.play(world);
                    }
                });
            if (this.closed || this.playing || epoch !== this.idleDisplayEpoch || !this.idleEncounterActive) {
                stop();
            } else {
                this.stopIdleEncounter = stop;
            }
        } catch (error) {
            if (!this.closed && epoch === this.idleDisplayEpoch) {
                GameLog.shared.classified("MODULE", "warn", "MainChapter", "挂机遇敌暂不可用：" + String(error));
                this.finishIdleEncounter();
            }
        }
    }

    /** 结束本次遇敌并归还骨骼后恢复行军，不销毁行军显示或重置背景，避免切换空帧。 */
    private finishIdleEncounter(): void {
        const stop = this.stopIdleEncounter;
        this.stopIdleEncounter = null;
        stop?.();
        this.idleEncounterActive = false;
        this.idleDisplay?.resume();
    }

    /** 切换挑战、阵容和关页共用清理；先释放行军归还入口，再停止遇敌，避免同帧归还到待销毁站位。 */
    private clearIdleDisplay(resetBackground = true): void {
        this.idleResources?.clear();
        this.idleDisplayEpoch++;
        this.idleEncounterActive = false;
        this.idleDisplay?.dispose();
        this.stopIdleEncounter?.();
        this.stopIdleEncounter = null;
        this.idleDisplay = null;
        this.idleDisplayKey = "";
        if (!resetBackground) return;
        this.resetBackgroundOffsets();
    }

    /** 重置近远景的两份循环位置；图片成套切换和清理行军时共用，不重建静态节点。 */
    private resetBackgroundOffsets(): void {
        this.marchOffset = 0;
        this.skyOffset = 0;
        for (const name of ["PalaceFloor", "PalaceBackground"]) {
            const node = this.node.getChildByName(name);
            node?.setPosition(0, 0, 0);
            this.node.getChildByName(name + "Loop")?.setPosition(node?.getComponent(UITransform)?.contentSize.width || 640, 0, 0);
        }
    }

    /**
     * 从已安装配置包选择当前背景，候选图片全部就绪后成套替换；失败保留原图并记录明确原因。
     * 正式整图隐藏地板与循环副本，挂机两层继续复用原速度；关闭或换景会撤销迟到交付。
     */
    private refreshChapterBackground(): void {
        let plan: ChapterBackgroundPlan;
        try {
            plan = ChapterBackgroundUtils.resolve(GameConfig.instance.getFileByPath("config/chapterreward"),
                MainChapterModel.instance.state, this.playing);
        } catch (error) {
            GameLog.shared.warnOnce("MODULE", "MainChapterView", "chapter-background-config", String(error));
            return;
        }
        if (plan.key === this.backgroundKey) {
            return;
        }
        this.backgroundKey = plan.key;
        const epoch = ++this.backgroundEpoch;
        this.pendingBackgroundScope?.dispose();
        const scope = this.pendingBackgroundScope = ResourceAssetsUtils.createAssetScope();
        const target = plan;
        void Promise.all([
            scope.loadPath(target.background, "SpriteFrame"),
            target.floor ? scope.loadPath(target.floor, "SpriteFrame") : Promise.resolve(null),
        ]).then(([backgroundFrame, floorFrame]) => {
            if (this.closed || epoch !== this.backgroundEpoch || !this.node.isValid) {
                scope.dispose();
                return;
            }
            // 先检查全部静态绑定，避免第四个节点缺失时前三个已经换成随后释放的候选图片。
            const targets = ["PalaceBackground", "PalaceBackgroundLoop", "PalaceFloor", "PalaceFloorLoop"].map(name => {
                const node = this.node.getChildByName(name);
                const sprite = node?.getComponent(Sprite);
                if (!node || !sprite) {
                    throw new Error("主线背景显示绑定缺失：" + name);
                }
                return { name, node, sprite };
            });
            for (const { name, node, sprite } of targets) {
                sprite.spriteFrame = name.startsWith("PalaceBackground") ? backgroundFrame : floorFrame;
                node.active = !!floorFrame || name === "PalaceBackground";
            }
            const previous = this.backgroundScope;
            this.backgroundScope = scope;
            this.pendingBackgroundScope = null;
            this.appliedBackgroundKey = target.key;
            this.resetBackgroundOffsets();
            previous?.dispose();
        }).catch(error => {
            scope.dispose();
            if (this.closed || epoch !== this.backgroundEpoch) {
                return;
            }
            if (this.pendingBackgroundScope === scope) {
                this.pendingBackgroundScope = null;
            }
            GameLog.shared.warnOnce("MODULE", "MainChapterView", "chapter-background:" + target.key,
                "主线背景未切换：" + target.background + "；" + String(error));
            UIManager.instance.toast("主线背景加载失败，请重新打开战斗界面");
        });
    }

    /** 根与背景覆盖可见区域，底栏与中部提示按各自展示位置适配安全宽度。 */
    private fitViewport(): void {
        if (this.closed || !this.panel) {
            return;
        }
        this.idleResources?.clear();
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const scale = Math.min(1, Math.max(0.1, (box.width - 24) / 640));
        this.panel.setScale(scale, scale, 1);
        this.panel.setPosition(0, -box.height / 2 + 150 + 84 * scale, 0);
        const incomeScale = Math.min(1, box.width / 640);
        this.idleIncomeOpacity?.node.setScale(incomeScale, incomeScale, 1);
        this.idleIncomeOpacity?.node.setPosition(0, box.height * 0.108, 0);
        for (const name of ["PalaceBackground", "PalaceFloor", "PalaceBackgroundLoop", "PalaceFloorLoop"]) {
            const background = this.node.getChildByName(name);
            background?.getComponent(UITransform)?.setContentSize(box.width, box.height);
        }
    }

    /** 页面关闭取消提示、播放及监听，已提交的战斗按既有逻辑恢复。 */
    public onClose(): void {
        this.closed = true;
        this.clearIdleIncome();
        this.backgroundEpoch++;
        for (const name of ["PalaceBackground", "PalaceBackgroundLoop", "PalaceFloor", "PalaceFloorLoop"]) {
            const sprite = this.node.getChildByName(name)?.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = null;
            }
        }
        this.pendingBackgroundScope?.dispose();
        this.pendingBackgroundScope = null;
        this.backgroundScope?.dispose();
        this.backgroundScope = null;
        this.backgroundKey = "";
        this.appliedBackgroundKey = "";
        this.idleCollectionToken = Object.freeze({});
        this.idleChest?.dispose();
        this.idleChest = null;
        if (this.chestAudio?.isValid) {
            this.chestAudio.stop();
            this.chestAudio.clip = null;
        }
        this.chestAudio = null;
        this.heroTalk?.dispose();
        this.heroTalk = null;
        this.clearIdleDisplay();
        this.idleResources = null;
        this.stopReplay?.();
        this.stopReplay = null;
    }
}
