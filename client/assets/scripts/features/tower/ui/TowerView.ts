/** 幻境之塔入口。页内使用旧版层卡、专用出阵和体力，战斗结果及奖励使用项目共用窗口。 */
import { _decorator, AudioSource, Button, Label, Node, UITransform } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { SettledBattlePlayback } from "../../battle/ui/SettledBattlePlayback";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import type { MainFormation } from "../../hero/data/HeroSnapshotUtils";
import { FormationView } from "../../hero/ui/FormationView";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { TowerController } from "../TowerController";
import { TowerModel, type TowerFloor, type TowerState } from "../TowerModel";
import { TowerFloorCell, type TowerFloorStatus } from "./TowerFloorCell";
import { TowerMilestoneView } from "./TowerMilestoneView";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "tower",
    prefab: "bundles/module/tower/prefabs/TowerView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("TowerView")
export class TowerView extends BaseView {
    /** 旧塔窗口的静态坐标和尺寸。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 旧地图在战斗演出时铺满。 */
    @property(Node) private battleBackground: Node | null = null;
    /** 原战场复用到此挂点。 */
    @property(Node) private battleHost: Node | null = null;
    /** 塔页面背景音乐。 */
    @property(AudioSource) private lobbyMusic: AudioSource | null = null;
    /** 塔战斗背景音乐。 */
    @property(AudioSource) private battleMusic: AudioSource | null = null;
    /** 返回主城。 */
    @property(Button) private backButton: Button | null = null;
    /** 查询进度以及确定断线中的挑战结果。 */
    @property(Button) private refreshButton: Button | null = null;
    /** 当前塔体力及自然恢复倒计时。 */
    @property(Label) private energyLabel: Label | null = null;
    /** 显示最高已通关层与当前扫荡次数。 */
    @property(Label) private progressLabel: Label | null = null;
    /** 进入独立层数领奖列表。 */
    @property(Button) private milestoneButton: Button | null = null;
    /** 里程碑实时状态。 */
    @property(Label) private milestoneLabel: Label | null = null;
    /** 独立塔阵容入口。 */
    @property(Button) private formationButton: Button | null = null;
    /** 当前可挑战层及其余层共用列表。 */
    @property(SuperScroll) private floors: SuperScroll | null = null;

    /** 当前页面负责停止演出以及恢复塔状态。 */
    private playback: SettledBattlePlayback | null = null;
    /** 当前打开期最近一次已查询的自然恢复或跨日边界。 */
    private checkedTime = 0;
    /** 已居中定位的当前层，体力或扫荡次数变化时不打断玩家滚动。 */
    private centeredFloor = 0;

    /** 绑定当前显示期的按钮、服务器状态、场景音乐与自然恢复。 */
    public onOpen(): void {
        if (!this.panel || !this.battleHost || !this.battleBackground || !this.backButton || !this.refreshButton
            || !this.energyLabel || !this.progressLabel || !this.milestoneButton || !this.milestoneLabel
            || !this.formationButton || !this.floors || !this.lobbyMusic || !this.battleMusic) {
            throw new Error("幻境之塔预制体绑定不完整");
        }
        this.playback = new SettledBattlePlayback(this, this.battleHost, "幻境之塔", () => this.finishBattle());
        this.listen(this.backButton, () => this.close());
        this.listen(this.refreshButton, () => TowerController.instance.refreshVisible());
        this.listen(this.milestoneButton, () => this.showMilestone());
        this.listen(this.formationButton, () => this.openFormation());
        this.ownListener(EventDispatcher.instance.on("tower.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.updateTime, 1);
        AudioPreferences.playMusic(this.lobbyMusic);
        TowerController.instance.setVisible(true);
        this.render();
    }

    /** 页面离开时撤销倒计时、播放和页面音源。 */
    public onClose(): void {
        TowerController.instance.setVisible(false);
        this.unschedule(this.updateTime);
        this.playback?.close();
        this.playback = null;
        if (this.battleMusic) {
            AudioPreferences.stopMusic(this.battleMusic);
        }
        if (this.lobbyMusic) {
            AudioPreferences.stopMusic(this.lobbyMusic);
        }
    }

    /** 适配完整可见根视口，塔面板留出顶栏与底栏位置。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, Math.max(1, box.height - 170) / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 当前有效页面绑定按钮，销毁过程只清理仍有效的节点。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 冻结播放期间保留原战报，其他时间绘制层数、次数和可领档数。 */
    private render = (): void => {
        if (this.playback?.active) {
            return;
        }
        const model = TowerModel.instance;
        const controller = TowerController.instance;
        const state = model.state;
        const battle = model.takeBattle();
        if (battle) {
            this.panel!.node.active = false;
            this.battleBackground!.active = true;
            this.battleHost!.active = true;
            AudioPreferences.playMusic(this.battleMusic!);
            this.playback!.play(battle);
            return;
        }
        this.refreshButton!.interactable = !controller.busy;
        this.formationButton!.interactable = !!state && !controller.busy;
        this.milestoneButton!.interactable = !!state && !controller.busy;
        const claimableCount = (state?.milestones ?? [])
            .filter(row => !row.claimed && row.floor <= (state?.highestCleared ?? 0)).length;
        this.milestoneLabel!.string = claimableCount ? `层数奖励 (${claimableCount})` : "层数奖励";
        this.progressLabel!.string = state
            ? `已通关 ${state.highestCleared}/${state.maxFloor} 层　扫荡 ${state.sweeps}/${state.sweepLimit}`
            : controller.busy ? "正在读取幻境进度" : "请刷新幻境进度";
        this.drawEnergy(state);
        const current = state ? Math.min(state.highestCleared + 1, state.maxFloor) : 0;
        const sorted = [...(state?.floors ?? [])].sort((a, b) => b.floor - a.floor);
        this.floors!.list.setData(sorted, (node, floor) => {
            const status = this.floorStatus(state!, floor.floor);
            const sweeping = status === "sweep";
            node.getComponent(TowerFloorCell)!.render(floor, status, !controller.busy && (status === "current" || sweeping),
                state!.nextSweepCostDiamonds, () => sweeping ? this.confirmSweep(state!) : this.inspectFloor(floor, status));
        });
        if (current && current !== this.centeredFloor) {
            const index = sorted.findIndex(floor => floor.floor === current);
            if (index >= 0) {
                this.floors!.centerItem(index);
                this.centeredFloor = current;
            }
        }
    };

    /** 本次开放段只允许从当前层挑战，最高已通关层可扫荡。 */
    private floorStatus(state: TowerState, floor: number): TowerFloorStatus {
        if (floor === state.highestCleared + 1) {
            return "current";
        }
        if (floor > state.highestCleared) {
            return "locked";
        }
        return floor === state.highestCleared ? "sweep" : "passed";
    }

    /** 服务端时间到达自然恢复或自动重置点时，仅发一次权威查询。 */
    private updateTime = (): void => {
        const state = TowerModel.instance.state;
        this.drawEnergy(state);
        if (!state || TowerController.instance.busy || this.playback?.active) {
            return;
        }
        const now = ServerClock.instance.nowSeconds();
        const due = [state.nextEnergyAtSeconds, state.sweepResetAtSeconds]
            .find(time => time > 0 && now !== null && time <= now && time !== this.checkedTime);
        if (due !== undefined) {
            this.checkedTime = due;
            TowerController.instance.refreshVisible();
        }
    };

    /** 显示最近一次服务端确认的体力和下一点恢复的剩余时间。 */
    private drawEnergy(state: TowerState | null): void {
        if (!state) {
            this.energyLabel!.string = "幻境体力 —";
            return;
        }
        const now = ServerClock.instance.nowSeconds();
        const left = state.nextEnergyAtSeconds > 0 && now !== null ? Math.max(0, state.nextEnergyAtSeconds - now) : null;
        const countdown = left === null ? "" : `　${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} 恢复`;
        this.energyLabel!.string = `幻境体力 ${state.energy}/${state.maxEnergy}${countdown}`;
    }

    /** 在通用预览窗展示本层原守军；只有当前层且有体力时能前往出阵。 */
    private inspectFloor(floor: TowerFloor, status: TowerFloorStatus): void {
        const enemies = floor.enemies.map(unit => {
            const name = HeroCatalog.find(unit.templateId)?.name ?? `守军 ${unit.templateId}`;
            return `${unit.position}号位　${name} Lv.${unit.level}`;
        }).join("\n");
        const playable = status === "current" && (TowerModel.instance.state?.energy ?? 0) > 0;
        const text = status === "current" && !playable ? "\n体力不足，请等待自然恢复" : "";
        void UIManager.instance.openChild(this, ConfirmView, {
            title: `第 ${floor.floor} 层守军`, message: enemies + text,
            showCancel: playable, confirmText: playable ? "出阵" : "确定",
            onConfirm: () => { if (playable) { this.openFormation(floor.floor); } },
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 复用现有出阵交互和阵型配置，保存和读取均使用塔专用阵容。 */
    private openFormation(floor?: number): void {
        const controller = TowerController.instance;
        const source = (): MainFormation | null => {
            const state = TowerModel.instance.state;
            const main = HeroRosterModel.instance.snapshot.mainFormation;
            if (!main || !state) {
                return null;
            }
            return {
                ...main, assistanceUnlocked: false,
                options: main.options?.map(row => ({
                    formationId: row.formationId, openPositions: row.openPositions.filter(position => position !== 9),
                })),
                version: state.formationVersion, formationId: state.formationId, slots: state.slots,
            };
        };
        void UIManager.instance.openChild(this, FormationView, {
            title: "幻境之塔出阵",
            formation: { read: source, save: (draft, done) => controller.saveFormation(draft, done) },
            complete: confirmed => {
                if (confirmed && floor !== undefined && this.playback) {
                    controller.challenge(floor);
                }
            },
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 明示扫荡的最高通关层和服务端报价，确认后带原报价提交。 */
    private confirmSweep(state: TowerState): void {
        if (state.sweeps >= state.sweepLimit) {
            UIManager.instance.toast("今日扫荡次数已用完");
            return;
        }
        const quote = state.nextSweepCostDiamonds;
        void UIManager.instance.openChild(this, ConfirmView, {
            title: "幻境扫荡",
            message: `${quote > 0 ? `消耗 ${quote} 钻石` : "使用一次免费次数"}扫荡第 ${state.highestCleared} 层？`,
            onConfirm: () => TowerController.instance.sweep(state.highestCleared, quote),
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 打开塔页所属的层数奖励列表，关闭塔时一起回收。 */
    private showMilestone(): void {
        void UIManager.instance.openChild(this, TowerMilestoneView)
            .catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 已结算战报结束后恢复原塔页面，无需再次发奖。 */
    private finishBattle(): void {
        this.battleHost!.active = false;
        this.battleBackground!.active = false;
        this.panel!.node.active = true;
        AudioPreferences.playMusic(this.lobbyMusic!);
        this.render();
    }
}
