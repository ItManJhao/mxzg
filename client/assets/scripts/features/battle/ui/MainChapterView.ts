/** 主线挂机主页：静态底板保存关卡、四项收益及三个正式入口；挑战交给页内战场，奖励仅在结算显示。
 * 挂机读取权威时钟与基础速率，宝箱只读；页面关闭取消显示但保留服务端待结算状态。 */
import { _decorator, Button, Label, Node, Sprite, SpriteFrame, UITransform, sp } from "cc";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UIManager } from "../../../framework/ui/UIManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";

import { BattleReplayPreview } from "./BattleReplayPreview";
import { MainChapterHeroTalk } from "./MainChapterHeroTalk";
import { MainChapterIdleDisplay } from "./MainChapterIdleDisplay";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { GameLog } from "../../../core/GameLog";
import { IdleChestUtils } from "../utils/IdleChestUtils";
import { BattleSpineService } from "./BattleSpineService";
import { MainChapterIdleResources } from "./MainChapterIdleResources";

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
    /** 当前已接通的主线最后一关；仅用于说明阶段边界，实际挑战仍由服务端核验。 */
    private static readonly LAST_SUPPORTED_STAGE = 3;
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
    /** 挂机收益入口，尚未接通时明确提示。 */
    @property(Button) idleClaimButton: Button | null = null;
    /** 旧中央章节图标的产物说明入口，只读配置不开放领取。 */
    @property(Button) rewardInfoButton: Button | null = null;
    /** 静态宝箱挂点；本页只挂载一次骨骼，跨档仅切动作。 */
    @property(Node) idleChestHost: Node | null = null;
    /** 超过十分钟显示的旧计时气泡，位置和图片保存在Prefab。 */
    @property(Node) idleBubble: Node | null = null;
    /** 气泡内时长，与底栏使用同一服务器快照。 */
    @property(Label) idleBubbleLabel: Label | null = null;
    /** 已应用的待机档位；0表示资源尚未就绪，关闭时清零。 */
    private idleChestStage = 0;
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

    /** 绑定现有预制体按钮与Model事件，不在开页时请求库存或主线进度。 */
    public onOpen(): void {
        if (!this.battleHost || !this.panel || !this.challengeButton || !this.quickBattleButton || !this.powerButton
            || !this.stageLabel || !this.statusLabel || !this.challengeLabel || !this.idleTimeLabel
            || !this.goldRateLabel || !this.roleExpRateLabel || !this.heroExpRateLabel || !this.idleClaimButton) throw new Error("主线页面绑定缺失");
        this.closed = false;
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
        this.listen(this.idleClaimButton, () => UIManager.instance.toast("挂机领取尚未恢复。每分钟显示基础收益，不含随机掉落和额外加成。"));
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
        BattleSpineService.instance.mountNamedSpine(this.idleChestHost, "res-block", "normal-1", {
            onReady: () => {
                if (!this.closed) {
                    this.idleChestStage = 0;
                    this.renderIdle();
                }
            },
        });
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.render));
        this.render();
    }

    /** 按钮监听归当前页面持有，关闭由BaseView统一解除。 */
    private listen(button: Button, callback: () => void): void {
        button.node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => { if (button.isValid) button.node.off(Button.EventType.CLICK, callback); });
    }

    /** 正常挑战先确认阵容；未确认挑战及待领奖优先恢复，已完成开放范围时明确说明而不误开布阵。 */
    private async prepareChallenge(): Promise<void> {
        const model = MainChapterModel.instance;
        if (this.closed || this.playing || model.busy || !model.state) {
            return;
        }
        if (model.requestId || model.state.pendingBattleId) {
            await this.challenge();
            return;
        }
        if (this.isChapterRangeComplete()) {
            UIManager.instance.toast("当前开放的前三关已全部通关");
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

    /** 只依据统一快照选择挑战或领奖；未确认挑战优先用原编号确认。 */
    private async challenge(): Promise<void> {
        const model = MainChapterModel.instance;
        if (model.busy || this.playing || !model.state) return;
        const controller = MainChapterController.instance;
        try {
            if (model.state.pendingBattleId && !model.requestId) {
                await this.play(model.state.pendingBattleId);
            } else {
                await controller.challenge();
                if (!this.closed && !model.requestId && model.receipt?.action === "BATTLE") {
                    await this.play(model.receipt.battleId);
                }
            }
        } catch (error) {
            if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) UIManager.instance.toast(String(error));
        }
    }

    /** 播放器使用UIManager管理的页内战场，加载迟到和中途关页都释放；正常播完转交控制器结算，关闭不触发领奖。 */
    private async play(battleId: string): Promise<void> {
        if (this.closed || this.playing) return;
        this.playing = true;
        this.clearIdleDisplay();
        this.render();
        try {
            const report = await MainChapterController.instance.replay(battleId);
            if (this.closed || !report) return;
            // 战场在主页内部播放，底部面板与共享导航继续显示。
            this.stopReplay = () => UIManager.instance.closeById("main-chapter-battle");
            await UIManager.instance.openById("main-chapter-battle", { report, onClosed: () => {
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

    /** 页面仅读取Model；明确显示阶段上限，避免已通关后的禁用按钮仍写着“战斗”而看似失灵。 */
    private render = (): void => {
        if (this.closed) return;
        const model = MainChapterModel.instance;
        const state = model.state;
        const completed = this.isChapterRangeComplete();
        this.stageLabel!.string = state ? String(Math.min(state.maxCleared + 1, MainChapterView.LAST_SUPPORTED_STAGE)) : "等待主线同步";
        if (model.busy) {
            this.lastResultMessage = "";
        } else if (model.message && model.message !== this.lastResultMessage) {
            UIManager.instance.toast(model.message);
            this.lastResultMessage = model.message;
        }
        this.statusLabel!.string = completed ? "当前开放的前三关已全部通关"
            : model.busy ? "正在处理…" : state?.pendingBattleId ? "上次战斗待结算，点击战斗恢复" : "";
        this.challengeLabel!.string = this.playing ? "战斗中" : model.busy ? "处理中" : !state ? "等待同步" : model.requestId ? "确认挑战"
            : state?.pendingBattleId ? "恢复战斗" : completed ? "已通关" : "战斗";
        this.renderIdle();
        const enabled = !!state && !model.busy && !this.playing;
        this.challengeButton!.interactable = enabled && !completed;
        this.quickBattleButton!.interactable = enabled;
        this.powerButton!.interactable = enabled;
    };

    /** 没有旧请求或待结算战报，且已到当前服务端支持末关时返回true；恢复操作不受阶段上限拦截。 */
    private isChapterRangeComplete(): boolean {
        const model = MainChapterModel.instance;
        return !!model.state && model.state.maxCleared >= MainChapterView.LAST_SUPPORTED_STAGE
            && !model.requestId && !model.state.pendingBattleId;
    }

    /** 引擎帧只更新计时显示；后台恢复按已接纳服务器时间推算，不自行发奖。 */
    public update(dt: number): void {
        if (!this.closed) {
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
            this.idleTimeLabel.string = IdleChestUtils.time(seconds);
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

    /** 只切换跨档动作；加载期间仍刷新目标时间，资源就绪后读取最新快照，关页不再访问节点。 */
    private renderIdleChest(seconds: number, maxSeconds: number): void {
        if (!this.idleChestHost || !this.idleBubble || !this.idleBubbleLabel) {
            return;
        }
        this.idleChestHost.active = !this.playing;
        this.idleBubble.active = !this.playing && IdleChestUtils.showBubble(seconds);
        this.idleBubbleLabel.string = IdleChestUtils.time(seconds);
        if (this.idleProgress) {
            this.idleProgress.node.active = true;
            this.idleProgress.fillRange = IdleChestUtils.percentage(seconds, maxSeconds) / 100;
        }
        const skeleton = this.idleChestHost.getComponent(sp.Skeleton);
        const stage = IdleChestUtils.stage(seconds, maxSeconds);
        if (skeleton?.skeletonData && stage !== this.idleChestStage) {
            skeleton.setAnimation(0, "normal-" + stage, true);
            this.idleChestStage = stage;
        }
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
        if (!this.idleDisplay || this.playing || this.idleEncounterActive) {
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
        this.marchOffset = 0;
        this.skyOffset = 0;
        for (const name of ["PalaceFloor", "PalaceBackground"]) {
            const node = this.node.getChildByName(name);
            node?.setPosition(0, 0, 0);
            this.node.getChildByName(name + "Loop")?.setPosition(node?.getComponent(UITransform)?.contentSize.width || 640, 0, 0);
        }
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
        this.idleChestStage = 0;
        this.heroTalk?.dispose();
        this.heroTalk = null;
        this.clearIdleDisplay();
        this.idleResources = null;
        this.stopReplay?.();
        this.stopReplay = null;
        UIManager.instance.closeById("remake-formation");
    }
}
