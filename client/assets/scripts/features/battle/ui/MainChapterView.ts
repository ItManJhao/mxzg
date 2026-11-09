/** 主线挂机主页：静态底板保存关卡、四项收益及三个正式入口；挑战交给页内战场，奖励仅在结算显示。
 * 挂机协议恢复前不伪造计时、收益或领取，页面关闭取消显示但保留服务端待结算状态。 */
import { _decorator, Button, Label, Node, UITransform } from "cc";
import { bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";
import { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";

import { BattleReplayPreview } from "./BattleReplayPreview";
import { MainChapterHeroTalk } from "./MainChapterHeroTalk";
import { MainChapterIdleDisplay } from "./MainChapterIdleDisplay";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { GameLog } from "../../../core/GameLog";

const { ccclass, property } = _decorator;

@ccclass("MainChapterView")
export class MainChapterView extends BaseView {
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
    /** 挂机时长显示，服务端挂机快照接入前显示未接入而非零秒。 */
    @property(Label) idleTimeLabel: Label | null = null;
    /** 金币每分钟收益，未同步时不从通关奖励推算。 */
    @property(Label) goldRateLabel: Label | null = null;
    /** 角色经验每分钟收益。 */
    @property(Label) roleExpRateLabel: Label | null = null;
    /** 英雄经验每分钟收益。 */
    @property(Label) heroExpRateLabel: Label | null = null;
    /** 挂机收益入口，尚未接通时明确提示。 */
    @property(Button) idleClaimButton: Button | null = null;
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
        const talkTemplate = this.node.getChildByName("HeroTalkTemplate");
        if (talkTemplate) {
            this.heroTalk = new MainChapterHeroTalk(talkTemplate, this.battleHost,
                () => MainChapterController.instance.readRoleLevel());
        }
        this.ownListener(UIManager.instance.setResidentHost("main-chapter-field",
            () => !this.closed && this.battleHost?.isValid ? this.battleHost : null));
        bindVisibleRefresh(this.node, () => this.fitViewport());
        this.listen(this.challengeButton, () => { void this.prepareChallenge(); });
        this.listen(this.quickBattleButton, () => UIManager.instance.toast("快速战斗尚未恢复"));
        this.listen(this.powerButton, () => UIManager.instance.toast("战力提升建议尚未恢复"));
        this.listen(this.idleClaimButton, () => UIManager.instance.toast("挂机领取尚未恢复，当前仅展示计时与收益配置"));
        this.ownListener(EventDispatcher.instance.on(MainChapterController.Updated, this, this.render));
        this.render();
    }

    /** 按钮监听归当前页面持有，关闭由BaseView统一解除。 */
    private listen(button: Button, callback: () => void): void {
        button.node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => { if (button.isValid) button.node.off(Button.EventType.CLICK, callback); });
    }

    /** 正常挑战先确认阵容；未确认挑战及待领奖直接恢复原操作，不另建战斗。 */
    private async prepareChallenge(): Promise<void> {
        const model = MainChapterModel.instance;
        if (this.closed || this.playing || model.busy || !model.state) {
            return;
        }
        if (model.requestId || model.state.pendingBattleId) {
            await this.challenge();
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
            if (!this.closed) {
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
            if (!this.closed) UIManager.instance.toast(String(error));
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
            if (!this.closed) UIManager.instance.toast("战报恢复失败：" + String(error));
        } finally {
            if (!this.stopReplay) {
                this.playing = false;
                if (!this.closed) { this.panel!.active = true; this.render(); }
            }
        }
    }

    /** 页面仅读取Model，历史回执不会倒退主线进度或本地增加奖励。 */
    private render = (): void => {
        if (this.closed) return;
        const model = MainChapterModel.instance;
        const state = model.state;
        this.stageLabel!.string = state ? String(Math.min(state.maxCleared + 1, 3)) : "等待主线同步";
        this.statusLabel!.string = model.message || (state?.pendingBattleId ? "上次战斗待结算，点击战斗恢复" : "");
        this.challengeLabel!.string = this.playing ? "战斗中" : model.requestId ? "确认挑战"
            : state?.pendingBattleId ? "恢复战斗" : "战斗";
        this.renderIdle();
        const enabled = !!state && !model.busy && !this.playing;
        this.challengeButton!.interactable = enabled && (!!model.requestId || !!state?.pendingBattleId || state!.maxCleared < 3);
        this.quickBattleButton!.interactable = enabled;
        this.powerButton!.interactable = enabled;
    };

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
            const since = Math.max(0, Math.floor((Date.now() - model.idleReceivedAt) / 1000));
            const seconds = Math.max(0, Math.min(state.maxSeconds, state.serverTime - state.startedAt + since));
            this.idleTimeLabel.string = Math.floor(seconds / 3600) + ":"
                + String(Math.floor(seconds / 60) % 60).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
        } else {
            this.idleTimeLabel.string = model.state?.maxCleared === 0 ? "通关后开启" : "未接入";
        }
        for (const [label, id] of [[this.goldRateLabel, 900001], [this.roleExpRateLabel, 900003],
            [this.heroExpRateLabel, 900101]] as const) {
            if (label) {
                const rate = state?.rates.find(row => row.itemId === id);
                label.string = rate ? String(rate.quantity * 60 / state!.frequency) + "/分" : "—/分";
            }
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
                }, true, () => this.closed || this.playing || epoch !== this.idleDisplayEpoch, this.idleDisplay!);
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

    /** 切换挑战、阵容和关页共用清理，恢复静态背景位置。 */
    private clearIdleDisplay(resetBackground = true): void {
        this.idleDisplayEpoch++;
        this.idleEncounterActive = false;
        this.stopIdleEncounter?.();
        this.stopIdleEncounter = null;
        this.idleDisplay?.dispose();
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
        const box = fitVisibleRoot(this.node);
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
        this.heroTalk?.dispose();
        this.heroTalk = null;
        this.clearIdleDisplay();
        this.stopReplay?.();
        this.stopReplay = null;
        UIManager.instance.closeById("remake-formation");
    }
}
