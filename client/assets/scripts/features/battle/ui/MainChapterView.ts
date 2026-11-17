/** 主线挂机主页：静态底板保存关卡、四项收益及三个正式入口，挑战交给页内战场。
 * 挂机读取权威时钟与基础速率；领取意图经Controller交应用绑定，双确认后仅在原显示期播放宝箱。
 * 页面关闭取消显示但保留服务端待结算状态，奖励到账与通用反馈由应用处理。 */
import { _decorator, AudioClip, AudioSource, Button, Label, Node, Sprite, SpriteFrame, UITransform, sp } from "cc";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import type { IdleClaimConfirmation, IdleClaimReceipt } from "../data/MainChapterIdleClaimData";

import { BattleReplayPreview } from "./BattleReplayPreview";
import { MainChapterHeroTalk } from "./MainChapterHeroTalk";
import { MainChapterIdleDisplay } from "./MainChapterIdleDisplay";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { GameLog } from "../../../core/GameLog";
import { IdleChestUtils } from "../utils/IdleChestUtils";
import { BattleSpineService } from "./BattleSpineService";
import { MainChapterIdleResources } from "./MainChapterIdleResources";
import { MainChapterIdleChest, IdleChestAnimation } from "./MainChapterIdleChest";
import { MainChapterMilestoneCard } from "./MainChapterMilestoneCard";
import { PREVIEW } from "cc/env";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import type { AssetScope } from "../../../framework/assets/ResourceAssetsUtils";
import { GameConfig } from "../../../config/GameConfig";
import { ChapterBackgroundUtils } from "../utils/ChapterBackgroundUtils";
import type { ChapterBackgroundPlan } from "../utils/ChapterBackgroundUtils";

declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        "main-chapter.idle-collection": IdleClaimConfirmation;
    }
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "remake-campaign",
    prefab: "bundles/module/battle/prefabs/MainChapterView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("MainChapterView")
export class MainChapterView extends BaseView {
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
    /** 快速战斗入口；规则与协议恢复前只提示，不发送请求。 */
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
    /** 服务器挂机时长按旧版小时分钟显示；没有快照时显示未接入而非零秒。 */
    @property(Label) idleTimeLabel: Label | null = null;
    /** 金币每分钟收益，未同步时不从通关奖励推算。 */
    @property(Label) goldRateLabel: Label | null = null;
    /** 角色经验每分钟收益。 */
    @property(Label) roleExpRateLabel: Label | null = null;
    /** 英雄经验每分钟收益。 */
    @property(Label) heroExpRateLabel: Label | null = null;
    /** 挂机收益入口，只转交当前显示期；实际门槛、网络、发奖与恢复沿原领取绑定。 */
    @property(Button) idleClaimButton: Button | null = null;
    /** 旧中央章节图标的产物说明入口，只读配置不开放领取。 */
    @property(Button) rewardInfoButton: Button | null = null;
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

    /** 绑定现有显示与事件，首次进入只转交首包待结算恢复，不查询库存或主线进度。 */
    public onOpen(): void {
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
        const talkTemplate = this.node.getChildByName("HeroTalkTemplate");
        if (talkTemplate) {
            this.heroTalk = new MainChapterHeroTalk(talkTemplate, this.battleHost,
                () => MainChapterController.instance.readRoleLevel());
        }
        this.ownListener(UIManager.instance.setResidentHost("main-chapter-field",
            () => !this.closed && this.battleHost?.isValid ? this.battleHost : null));
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport());
        this.listen(this.challengeButton, () => { void this.prepareChallenge(); });
        this.listen(this.quickBattleButton, () => UIManager.instance.toast("快速战斗尚未恢复"));
        this.listen(this.powerButton, () => UIManager.instance.toast("战力提升建议尚未恢复"));
        this.listen(this.idleClaimButton, () => this.collectIdleRewards());
        if (!this.rewardInfoButton) {
            throw new Error("主线产物说明入口绑定缺失");
        }
        this.listen(this.rewardInfoButton, () => {
            void UIManager.instance.openById("chapter-reward-info").catch(error => {
                if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    UIManager.instance.toast("产物说明暂不可用");
                }
            });
        });
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

    /** 按钮监听归当前页面持有，关闭由BaseView统一解除。 */
    private listen(button: Button, callback: () => void): void {
        button.node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => { if (button.isValid) button.node.off(Button.EventType.CLICK, callback); });
    }

    /** 转交宝箱点击，正式战斗/已有收取演出时不重复发起；页面自身不发协议或修改累计与资产。 */
    private collectIdleRewards(): void {
        if (this.closed || this.playing || this.idleChest?.collecting) {
            return;
        }
        const request = MainChapterController.instance.requestIdleClaim;
        if (!request) {
            UIManager.instance.toast("挂机领取正在准备，请稍后重试");
            return;
        }
        void request(this.idleCollectionToken).catch(error => {
            if (this.closed || UIManager.isOpenCancelled(error) || UIManager.isFailureReported(error)) {
                return;
            }
            const reason = error instanceof Error ? error.stack || error.message : String(error);
            GameLog.shared.classified("MODULE", "warn", "MainChapterView", "挂机领取入口失败：" + reason.slice(0, 4096));
            UIManager.instance.toast("挂机领取未开始，请稍后重试");
        });
    }

    /** 正常挑战先确认阵容；未确认挑战及待领奖优先恢复，已完成开放范围时明确说明而不误开布阵。 */
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
            await UIManager.instance.openById("remake-formation", {
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

    /** 显示页内战场；本应用已结束的原战斗可只继续结算，关页不取消服务端提交。 */
    private async play(battleId: string, settlementOnly = false): Promise<void> {
        if (this.closed || this.playing) {
            return;
        }
        this.playing = true;
        this.clearIdleDisplay();
        this.render();
        try {
            const cached = MainChapterModel.instance.replay;
            const report = settlementOnly && cached?.battleId === battleId ? cached
                : await MainChapterController.instance.replay(battleId);
            if (this.closed || !report) return;
            // 战场在主页内部播放，底部面板与共享导航继续显示。
            this.stopReplay = () => UIManager.instance.closeById("main-chapter-battle");
            await UIManager.instance.openById("main-chapter-battle", { report, settlementOnly, onClosed: () => {
                this.stopReplay = null;
                this.playing = false;
                if (!this.closed) { this.panel!.active = true; this.render(); }
            }});
            if (this.closed) UIManager.instance.closeById("main-chapter-battle");
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

    /** 事件驱动更新挑战范围及同源背景；缺范围只禁新挑战，历史恢复仍优先，不在每帧查询配置。 */
    private render = (): void => {
        if (this.closed) return;
        if (this.milestoneCard?.isValid) {
            this.milestoneCard.node.active = !this.playing && !this.milestoneCard.completed;
        }
        this.refreshChapterBackground();
        const model = MainChapterModel.instance;
        const state = model.state;
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

    /** 引擎帧只更新计时显示；后台恢复按已接纳服务器时间推算，不自行发奖。 */
    public update(dt: number): void {
        if (!this.closed) {
            this.idleChest?.update(dt);
            this.renderIdle();
            this.updateMarch(dt);
            this.heroTalk?.update(dt, !this.playing);
        }
    }

    /** 读取统一快照，时间封顶；三种速率按服务器周期换算每分钟，首通奖励不参与。 */
    private renderIdle(): void {
        const model = MainChapterModel.instance;
        const state = model.idle;
        this.refreshIdleDisplay();
        if (!this.idleTimeLabel) {
            return;
        }
        if (state) {
            const seconds = IdleChestUtils.elapsed(state.serverTime, state.startedAt,
                state.maxSeconds, model.idleReceivedAt, Date.now());
            if (!this.idleChest?.collecting) {
                this.idleTimeLabel.string = IdleChestUtils.time(seconds);
            }
            this.renderIdleChest(seconds, state.maxSeconds);
        } else {
            this.idleTimeLabel.string = model.state?.maxCleared === 0 ? "通关后开启" : "未接入";
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
                label.string = rate ? String(rate.quantity * 60 / state!.frequency) + "/分" : "—/分";
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

    /** 只接纳原页面仍打开的现场确认；历史恢复或其他显示期不补播，也不打开页面。 */
    private onIdleCollection(confirmation: IdleClaimConfirmation): void {
        if (this.closed || confirmation.presentationContext !== this.idleCollectionToken) {
            return;
        }
        this.playIdleCollection(confirmation.receipt);
    }

    /**
     * 以原回执冻结的秒数播放四档收取，不从已经重置的最新快照猜测原档位。
     * true只表示动画已启动；资源未就绪、正在战斗/收取或页面关闭返回false且不补播。
     * 调用方已完成原请求双确认和单次交付；本方法不发请求、不改资产，也不等待动画后才弹奖励。
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
        // 双确认时统一快照可能已经归零；旧保护区间显示原领取量，结束后render恢复最新时钟。
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

    /** 仅Creator显式演示入口可调用收取表现；不重置累计、不发请求、不触发奖励到账提示。 */
    public previewIdleChest(stage: number): boolean {
        if (!PREVIEW || this.closed || this.playing || !MainChapterModel.instance.idle) {
            return false;
        }
        const played = this.idleChest?.collect(stage) || false;
        if (played) {
            this.playChestClick();
            const state = MainChapterModel.instance.idle;
            const seconds = IdleChestUtils.elapsed(state.serverTime, state.startedAt,
                state.maxSeconds, MainChapterModel.instance.idleReceivedAt, Date.now());
            GameLog.shared.classified("DEV", "info", "IdleChestPreview", JSON.stringify({
                stage, collect: IdleChestUtils.collectAnimation(stage), queued: "normal-0",
                queuedDelaySeconds: 1.5, displayGuardSeconds: 2,
                claimWaitSeconds: IdleChestUtils.claimWaitSeconds(seconds, state.frequency, state.maxSeconds),
                readOnly: true,
            }));
        }
        return played;
    }

    /** 复用节点资源作用域播放旧通用点击音；关页或显示期变化后的迟到加载不再播放或保留音源。 */
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
            this.chestAudio.play();
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

    /** 根与背景覆盖实际可见区域，纸张在窄长屏缩至安全宽度，不改变格子内部排布。 */
    private fitViewport(): void {
        if (this.closed || !this.panel) {
            return;
        }
        this.idleResources?.clear();
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const scale = Math.min(1, Math.max(0.1, (box.width - 24) / 640));
        this.panel.setScale(scale, scale, 1);
        this.panel.setPosition(0, -box.height / 2 + 150 + 84 * scale, 0);
        for (const name of ["PalaceBackground", "PalaceFloor", "PalaceBackgroundLoop", "PalaceFloorLoop"]) {
            const background = this.node.getChildByName(name);
            background?.getComponent(UITransform)?.setContentSize(box.width, box.height);
        }
    }

    /** 页面关闭只取消展示，不撤销已提交战斗；待领奖随下次登录恢复。 */
    public onClose(): void {
        this.closed = true;
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
        UIManager.instance.closeById("remake-formation");
    }
}
