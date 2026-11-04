/**
 * 主线界面：展示当前阶段、服务端奖励和战报，转交挑战操作；关闭时释放战场和结算显示。
 */
import { _decorator, Button, Label, Node } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { mountIdleRewards } from "./idleRewardView";
import { mountBattleEnd } from "./battleEndView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { CampaignActions, CampaignPhase, CampaignScreen } from "../CampaignController";
import type { CampaignState, CampaignReport } from "../CampaignApi";
import { CampaignField } from "./CampaignField";
import type { IdleState, IdleReward } from "../IdleApi";
const { ccclass, property } = _decorator;
@ccclass("CampaignView")
export class CampaignView extends BaseView implements CampaignScreen {
    @property(Button) idleClaimButton: Button | null = null;
    private idleState: IdleState | null = null;
    private idleReceivedAt = 0;
    private idleBusy = false;
    private idleError = "";
    private idleRetry = false;
    @property(Button)
    fightButton: Button | null = null;
    @property(Button)
    growButton: Button | null = null;
    @property(Button)
    speedButton: Button | null = null;
    @property(Label)
    stageLabel: Label | null = null;
    @property(Label)
    statusLabel: Label | null = null;
    @property(Label)
    goldLabel: Label | null = null;
    @property(Label)
    heroExpLabel: Label | null = null;
    @property(Label)
    roleExpLabel: Label | null = null;
    private field: CampaignField | null = null;
    private result: Node | null = null;
    private resultVersion = 0;
    private catalog: BagItemCatalog | null = null;
    private closed = false;
    private actions: CampaignActions | null = null;
    private roleLevel: () => number = () => 1;
    private chooseFormation: () => Promise<boolean> = async () => false;
    private closeFormation: () => void = () => { };
    private last: {
        state: CampaignState | null;
        phase: CampaignPhase;
        error: string;
    } | null = null;
    configure(catalog: BagItemCatalog, roleLevel: () => number, chooseFormation: () => Promise<boolean>, closeFormation: () => void): void {
        this.catalog = catalog; this.roleLevel = roleLevel; this.chooseFormation = chooseFormation; this.closeFormation = closeFormation;
    }
    onOpen(): void {
        this.beginOpen();
        if (!this.fightButton || !this.stageLabel || !this.statusLabel || !this.node.parent)
            throw new Error("战斗页面字段未绑定");
        const idleBubble = this.node.getChildByPath("CCSprite_1/node_bubble");
        if (idleBubble)
            idleBubble.active = false;
        void CampaignField.open(this.node.parent).then(field => {
            if (this.closed) {
                field.dispose();
                return;
            }
            this.field = field;
            fieldRootBelowPanel(this.node);
            if (this.last)
                this.render(this.last.state, this.last.phase, this.last.error);
            this.finishOpen();
        }).catch(error => {
            if (!this.closed)
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
        });
    }
    /** 绑定静态 Prefab 的挂机领取按钮；快速战斗尚未开放，不将其误用为普通领取。 */
    bind(actions: CampaignActions): () => void {
        this.actions = actions;
        const fight = () => actions.fight(), speed = () => actions.speed();
        this.fightButton?.node.on(Button.EventType.CLICK, fight);
        this.speedButton?.node.on(Button.EventType.CLICK, speed);
        const claimIdle = () => actions.claimIdle?.();
        this.idleClaimButton?.node.on(Button.EventType.CLICK, claimIdle);
        if (this.speedButton) this.speedButton.interactable = false;
        if (this.growButton)
            this.growButton.node.active = false;
        return () => {
            this.actions = null;
            this.fightButton?.node.off(Button.EventType.CLICK, fight);
            this.speedButton?.node.off(Button.EventType.CLICK, speed);
            this.idleClaimButton?.node.off(Button.EventType.CLICK, claimIdle);
        };
    }
    /** 更新战斗状态；待机时显示独立挂机计时与每分钟收益，不再混用首通奖励。 */
    render(state: CampaignState | null, phase: CampaignPhase, error: string): void {
        if (this.closed)
            return;
        this.last = { state, phase, error };
        if (this.stageLabel)
            this.stageLabel.string = state ? "第 " + state.stageId + " 关" : "—";
        if (this.statusLabel)
            this.statusLabel.string = error || ({
                loading: "正在读取关卡…", idle: state?.available ? "首通奖励" : "当前章节已完成",
                formation: "正在准备出阵…", challenging: "正在生成战报…", replaying: "战斗进行中", result: "等待结算", claiming: "正在保存奖励…", error: "读取失败，请点击战斗重试"
            })[phase];
        if (this.fightButton)
            this.fightButton.interactable = phase === "error" || (phase === "idle" && !!state?.available);
        this.paintIdle();
        if (phase === "idle" && state)
            this.field?.startIdle(state.units);
    }
    /** 只保存当前页时间基准用于显示，计时推算不能授予奖励。 */
    renderIdle(state: IdleState | null, busy: boolean, error: string, retry: boolean): void {
        this.idleState = state; this.idleReceivedAt = Date.now(); this.idleBusy = busy; this.idleError = error; this.idleRetry = retry; this.paintIdle();
    }
    /** 帧更新仅刷新显示倒计时；服务器在实际领取时重新校验时间与版本。 */
    update(): void { if (!this.closed) this.paintIdle(); }
    /** 利用现有时间格作为领取入口，错误及不确定结果始终保留重试能力。 */
    private paintIdle(): void {
        const d = this.idleState, seconds = d ? Math.min(d.maxSeconds, d.elapsedSeconds + Math.max(0, Math.floor((Date.now() - this.idleReceivedAt) / 1000))) : 0;
        const available = this.last?.phase === "idle" || this.last?.phase === "error";
        if (this.idleClaimButton) this.idleClaimButton.interactable = !!available && !this.idleBusy && (!d || seconds >= d.frequency || this.idleRetry || !!this.idleError);
        if (available && this.statusLabel) this.statusLabel.string = this.last?.error || (this.idleBusy ? "领取中…" : this.idleError ? "点击重试" : !d ? "读取挂机…" : this.idleRetry ? "确认上次领取" :
            Math.floor(seconds / 3600) + ":" + String(Math.floor(seconds / 60) % 60).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0") + (seconds >= d.frequency ? " 领取" : ""));
        for (const [label, id] of [[this.goldLabel, 900001], [this.heroExpLabel, 900101], [this.roleExpLabel, 900003]] as const)
            if (label) label.string = d ? String((d.rates.find(r => r.itemId === id)?.quantity || 0) * 60 / d.frequency) + "/分" : "—";
    }
    /** 展示全部已到账挂机奖励；关闭、换页或较新的弹层请求使迟到加载结果失效。 */
    async showIdleRewards(rewards: readonly IdleReward[]): Promise<void> {
        this.dismissResult(); if (this.closed) return;
        const version = this.resultVersion;
        const result = await mountIdleRewards(this.node.parent!, rewards, this.catalog!, () => this.dismissResult(), () => !this.closed && version === this.resultVersion);
        if (this.closed || version !== this.resultVersion) { result?.destroy(); return; }
        this.result = result;
    }
    async prepareFight(): Promise<boolean> {
        this.field?.pauseIdle();
        try { return await this.chooseFormation(); }
        finally { if (!this.closed) this.field?.resumeIdle(); }
    }
    async replay(report: CampaignReport): Promise<void> {
        await this.whenReady();
        if (!this.closed)
            await this.field?.replay(report);
    }
    async showResult(report: CampaignReport, confirm: () => void): Promise<void> {
        if (this.closed)
            return;
        this.dismissResult();
        const result = await mountBattleEnd(this.node.parent!, report.won, confirm, {
            roleLevel: this.roleLevel(), confirmText: report.won ? "领取奖励" : "返回战场",
            rewards: report.rewards.map(reward => ({ itemType: reward.itemId, num: reward.quantity, icon: this.catalog!.face(reward.itemId, reward.quantity).icon })),
        });
        if (this.closed) {
            result?.destroy();
            return;
        }
        if (!result)
            throw new Error("结算界面加载失败，请重试");
        this.result = result;
    }
    /** 销毁当前结算并废弃尚未完成的挂机弹层加载。 */
    dismissResult(): void {
        this.resultVersion++; if (this.result?.isValid)
            this.result.destroy(); this.result = null;
    }
    nextSpeed(): void {
        const speed = this.field?.nextSpeed(); if (this.statusLabel && speed)
            this.statusLabel.string = "战斗速度 ×" + speed;
    }
    skipReplay(): void { this.field?.skip(); }
    onClose(): void {
        this.closed = true;
        this.closeFormation();
        this.failOpen(new Error("页面已关"));
        this.dismissResult();
        this.field?.dispose();
        this.field = null;
        this.last = null;
    }
}
function fieldRootBelowPanel(panel: Node): void {
    const field = panel.parent?.getChildByName("BattlePage");
    if (field)
        field.setSiblingIndex(0);
}
