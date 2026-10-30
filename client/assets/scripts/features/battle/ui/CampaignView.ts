import { _decorator, Button, Label, Node } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { mountBattleEnd } from "../../../ui/battleEndView";
import { BagItemCatalog } from "../../Bag/BagItemCatalog";
import type { CampaignActions, CampaignPhase, CampaignScreen } from "../CampaignController";
import type { CampaignState, CampaignReport } from "../CampaignApi";
import { CampaignField } from "./CampaignField";
const { ccclass, property } = _decorator;
@ccclass("CampaignView")
export class CampaignView extends BaseView implements CampaignScreen {
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
    private catalog: BagItemCatalog | null = null;
    private closed = false;
    private actions: CampaignActions | null = null;
    private roleLevel: () => number = () => 1;
    private chooseFormation: () => Promise<boolean> = async () => false;
    private closeFormation: () => void = () => {};
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
        }).catch(error => { if (!this.closed)
            this.failOpen(error instanceof Error ? error : new Error(String(error))); });
    }
    bind(actions: CampaignActions): () => void {
        this.actions = actions;
        const fight = () => actions.fight(), speed = () => actions.speed();
        this.fightButton?.node.on(Button.EventType.CLICK, fight);
        this.speedButton?.node.on(Button.EventType.CLICK, speed);
        if (this.growButton)
            this.growButton.node.active = false;
        return () => {
            this.actions = null;
            this.fightButton?.node.off(Button.EventType.CLICK, fight);
            this.speedButton?.node.off(Button.EventType.CLICK, speed);
        };
    }
    render(state: CampaignState | null, phase: CampaignPhase, error: string): void {
        if (this.closed)
            return;
        this.last = { state, phase, error };
        if (this.stageLabel)
            this.stageLabel.string = state ? "第 " + state.stageId + " 关" : "—";
        if (this.statusLabel)
            this.statusLabel.string = error || ({ loading: "正在读取关卡…", idle: state?.available ? "首通奖励" : "当前章节已完成",
                formation: "正在准备出阵…", challenging: "正在生成战报…", replaying: "战斗进行中", result: "等待结算", claiming: "正在保存奖励…", error: "读取失败，请点击战斗重试" })[phase];
        if (this.fightButton)
            this.fightButton.interactable = phase === "error" || (phase === "idle" && !!state?.available);
        for (const [label, id] of [[this.goldLabel, 900001], [this.heroExpLabel, 900101], [this.roleExpLabel, 900003]] as const)
            if (label)
                label.string = state ? String(state.rewards.find(reward => reward.itemId === id)?.quantity || 0) : "—";
        if (phase === "idle" && state)
            this.field?.startIdle(state.units);
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
    dismissResult(): void { if (this.result?.isValid)
        this.result.destroy(); this.result = null; }
    nextSpeed(): void { const speed = this.field?.nextSpeed(); if (this.statusLabel && speed)
        this.statusLabel.string = "战斗速度 ×" + speed; }
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
