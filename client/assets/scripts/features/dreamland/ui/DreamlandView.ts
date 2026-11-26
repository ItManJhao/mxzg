/**
 * 永恒梦境主页面。大厅、增益三选一和战斗挂点均由预制体提供。
 * 页面读取权威进度、向控制器交付点击，通用战报与布阵窗各自管理演出和编辑草稿。
 */
import { _decorator, AudioSource, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { DreamlandStateData } from "../../../platform/Protocol";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BattleReplayPreview } from "../../battle/ui/BattleReplayPreview";
import { ConfirmView } from "../../common/ui/ConfirmView";
import { RulesView } from "../../common/ui/RulesView";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import type { MainFormation } from "../../hero/data/HeroSnapshotUtils";
import { FormationView } from "../../hero/ui/FormationView";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { DreamlandController } from "../DreamlandController";
import { DreamlandModel } from "../DreamlandModel";
import { DreamlandRewardView } from "./DreamlandRewardView";

const { ccclass, property } = _decorator;

/** 旧 infiniterewardshow 给入口使用的三个产物类型。 */
const outsideRewards = [901401, 900101, 900001] as const;

/** 旧 infinitebuff 的选择编号与图标序号对应；下标0不使用。 */
const buffIconOrder = [0, 1, 9, 2, 3, 10, 4, 5, 6, 7, 8] as const;

/** 回到保留常驻顶栏和底栏的副本大厅。 */
export interface DreamlandViewArgs {
    readonly backToHall: () => void;
}

@UIRegistry.view({ id: "dreamland", prefab: "bundles/module/dreamland/prefabs/DreamlandView", layer: UILayer.Page,
    cache: false, allowMultiple: false })
@ccclass("DreamlandView")
export class DreamlandView extends BaseView<DreamlandViewArgs> {
    /** 固定板块的原设计尺寸，整体缩放适配可见视口。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 战报背景，在播放和结算展示时覆盖大厅内容。 */
    @property(Node) private battleBackground: Node | null = null;
    /** 通用战场挂点，播放结束时一并隐藏。 */
    @property(Node) private battleHost: Node | null = null;
    /** 战场上的原累计奖励面板，显示当前挑战层与退出入口。 */
    @property(Node) private battleHud: Node | null = null;
    /** 当前战场真实结算楼层，由冻结战报提供。 */
    @property(Label) private battleFloorLabel: Label | null = null;
    /** 继承至本层的已累计奖励。 */
    @property(Label) private battleRewardLabel: Label | null = null;
    /** 结束本局并结算奖励，关页和断线仍能恢复原战报。 */
    @property(Button) private battleExitButton: Button | null = null;
    /** 旧梦境大厅使用的主城背景音乐，由页面显示期持有。 */
    @property(AudioSource) private lobbyMusic: AudioSource | null = null;
    /** 原梦境战斗音轨，在连续层数间保持播放。 */
    @property(AudioSource) private battleMusic: AudioSource | null = null;
    /** 返回按钮在游戏内导航至副本大厅。 */
    @property(Button) private backButton: Button | null = null;
    /** 游玩奖励的详情按钮，打开首通、排行及每日奖励详情。 */
    @property(Button) private rewardsButton: Button | null = null;
    /** 显示旧规则，数值仍由服务器处理。 */
    @property(Button) private rulesButton: Button | null = null;
    /** 好友支援的装饰按钮，当前阶段用于说明开放状态。 */
    @property(Button) private supportButton: Button | null = null;
    /** 排行榜详情按钮，当前阶段用于说明开放状态。 */
    @property(Button) private rankingButton: Button | null = null;
    /** 按服务端阶段提交出阵、继续或结算。 */
    @property(Button) private challengeButton: Button | null = null;
    /** 运行时显示本次阶段对应的操作文字。 */
    @property(Label) private challengeLabel: Label | null = null;
    /** 服务器确认的个人记录。 */
    @property(Label) private recordLabel: Label | null = null;
    /** 首个未领取档位的楼层。 */
    @property(Label) private milestoneTitle: Label | null = null;
    /** 首通奖励未达标或已清空时的显示文字。 */
    @property(Label) private milestoneCondition: Label | null = null;
    /** 当前首通档位满足通关条件后开放领取。 */
    @property(Button) private claimButton: Button | null = null;
    /** 旧配置入口的游玩奖励图标，依次为精灵魔力、英雄经验和金币。 */
    @property([Button]) private previewButtons: Button[] = [];
    /** 当前首通档位的道具按钮，空间依旧版原板块提供。 */
    @property([Button]) private milestoneItems: Button[] = [];
    /** 当前首通档位的道具图标。 */
    @property([Sprite]) private milestoneIcons: Sprite[] = [];
    /** 由道具品质决定的四角框，颜色不代表是否已到账。 */
    @property([Sprite]) private milestoneFrames: Sprite[] = [];
    /** 当前首通档位的配置数量。 */
    @property([Label]) private milestoneCounts: Label[] = [];
    /** 当前挑战的起点或正在挑战的楼层。 */
    @property(Label) private startLabel: Label | null = null;
    /** 今日实际通关进度。 */
    @property(Label) private todayLabel: Label | null = null;
    /** 当前累计待发奖励的明细，离开挑战时隐藏。 */
    @property(Label) private runRewardLabel: Label | null = null;
    /** 结束本次挑战的操作，正常开场时隐藏。 */
    @property(Button) private stopButton: Button | null = null;
    /** 断线后的明确补读入口，只有未确认状态时出现。 */
    @property(Button) private refreshButton: Button | null = null;
    /** 增益选择遮罩和内容区，由服务器阶段控制显示。 */
    @property(Node) private buffPanel: Node | null = null;
    /** 增益选择时的当前楼层与倒计时。 */
    @property(Label) private buffFloorLabel: Label | null = null;
    /** 增益浮层内的退出按钮。 */
    @property(Button) private buffCloseButton: Button | null = null;
    /** 原配置每次三选一，固定绑定三个按钮。 */
    @property([Button]) private buffOptions: Button[] = [];
    /** 三张增益图标随权威选项替换。 */
    @property([Sprite]) private buffIcons: Sprite[] = [];
    /** 三个由服务端下发名称和属性描述的文本。 */
    @property([Label]) private buffLabels: Label[] = [];
    /** 旧客户端十张增益图标，按图标文件序号排序。 */
    @property([SpriteFrame]) private buffArtwork: SpriteFrame[] = [];
    /** 我的出阵英雄缩略图，选择增益期间展示。 */
    @property([Sprite]) private lineupIcons: Sprite[] = [];
    /** 页面关闭时拒绝迟到的战报回调与资源。 */
    private opened = false;
    /** 正在展示的战报身份，关页/结束/撤回时清空并使回调失效。 */
    private activeBattleId: string | null = null;
    /** 当前战场回收函数，成功挂载后记录并随播放结束或关页释放。 */
    private stopPlayback: (() => void) | null = null;
    /** 同一次开页已播放的战报编号，防止倒计时重复播放。 */
    private shownBattleId = "";
    /** 最近一次自动补读的服务器秒；失败时仍限频，以免在断线期间连续请求。 */
    private nextRefreshAt = 0;
    /** 首通档变化时更新物品资源，取消覆盖新档位的迟到加载。 */
    private shownMilestoneId = 0;
    /** 当前阵容缩略图的代次，关页及换阵时丢弃迟到资源。 */
    private lineupVersion = -1;
    /** 退出确认期间暂停下一场演出和本页自动推进。 */
    private confirmingExit = false;

    /** 显示梦境页面、绑定玩家操作并查询当前可恢复的挑战。 */
    public onOpen(args?: DreamlandViewArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.battleHost || !this.battleBackground || !this.battleHud
            || !this.battleFloorLabel || !this.battleRewardLabel || !this.battleExitButton || !this.buffPanel
            || !this.lobbyMusic || !this.battleMusic
            || this.buffOptions.length !== 3 || this.buffArtwork.length !== 10) {
            throw new Error("永恒梦境预制体绑定不完整");
        }
        this.opened = true;
        this.listen(this.backButton!, args.backToHall);
        this.listen(this.battleExitButton!, () => this.endRun());
        this.listen(this.rewardsButton!, () => this.openRewards());
        this.listen(this.rulesButton!, () => this.openRules());
        this.listen(this.supportButton!, () => UIManager.instance.toast("好友支援尚未开放"));
        this.listen(this.rankingButton!, () => UIManager.instance.toast("永恒梦境排行尚未开放"));
        this.listen(this.challengeButton!, () => this.challenge());
        this.listen(this.claimButton!, () => this.claimMilestone());
        this.listen(this.stopButton!, () => this.endRun());
        this.listen(this.buffCloseButton!, () => this.endRun());
        this.listen(this.refreshButton!, () => DreamlandController.instance.refreshVisible());
        this.previewButtons.forEach((button, index) => this.listen(button, () => this.showItem(outsideRewards[index], 1)));
        this.milestoneItems.forEach((button, index) => this.listen(button, () => {
            const item = this.milestone()?.rewards[index];
            if (item) {
                this.showItem(item.itemId, item.quantity);
            }
        }));
        this.buffOptions.forEach((button, index) => this.listen(button, () => this.chooseBuff(index)));
        this.ownListener(EventDispatcher.instance.on("dreamland.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.updateClock, 1);
        DreamlandController.instance.setVisible(true);
        this.render();
    }

    /** 释放播放、倒计时和迟到的头像加载，页外无自动读取。 */
    public onClose(): void {
        if (!this.opened) {
            return;
        }
        this.opened = false;
        DreamlandController.instance.setVisible(false);
        this.unschedule(this.updateClock);
        this.unschedule(this.advanceFromNext);
        this.finishPlayback();
        AudioPreferences.stopMusic(this.lobbyMusic!);
        AudioPreferences.stopMusic(this.battleMusic!);
    }

    /** 按视口缩放原比例板块，保留常驻导航空间。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, Math.max(1, box.height - 154) / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 当前页面关闭时解绑自己的按钮监听。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 读取新状态。未播放的确凿战报优先进入演出，返回后显示服务器进度。 */
    private render = (): void => {
        const snapshot = DreamlandModel.instance.snapshot;
        const state = snapshot?.state;
        if (!this.opened) {
            return;
        }
        if (this.activeBattleId && this.activeBattleId === state?.battle?.battleId) {
            this.battleExitButton!.interactable = !DreamlandController.instance.busy;
            return;
        }
        if (this.activeBattleId) {
            this.finishPlayback();
        }
        if (snapshot?.replay && state?.battle && state.battle.battleId !== this.shownBattleId && !this.confirmingExit) {
            this.playBattle(state, snapshot.replay);
            return;
        }
        if (!state || state.phase === "READY" || state.phase === "SELECT_BUFF") {
            AudioPreferences.playMusic(this.lobbyMusic!);
        }
        const controller = DreamlandController.instance;
        const available = !!state && !controller.busy && !controller.awaitingResult;
        this.challengeButton!.interactable = available;
        this.refreshButton!.node.active = !state || controller.awaitingResult;
        this.refreshButton!.interactable = !controller.busy;
        this.rewardsButton!.interactable = !!state;
        this.recordLabel!.string = state ? String(state.highestFloor) : "—";
        this.startLabel!.string = state?.phase === "READY" ? `从第 ${state.startFloor + 1} 层开始`
            : state ? `第 ${state.currentFloor + 1} 层` : "读取梦境进度";
        this.todayLabel!.string = state ? `今日通关 ${Math.max(0, state.todayHighestFloor - state.startFloor)} 层` : "今日通关 — 层";
        this.challengeLabel!.string = state?.phase === "RESULT" && !state.battle?.won ? "领取结算"
            : state?.phase === "RESULT" || state?.phase === "NEXT_BATTLE" ? "继续挑战" : "开始挑战";
        this.stopButton!.node.active = !!state && state.phase !== "READY";
        this.stopButton!.interactable = available;
        this.runRewardLabel!.node.active = !!state && state.phase !== "READY";
        this.runRewardLabel!.string = this.rewardCaption(state);
        this.drawMilestone(state, available);
        this.drawBuffs(state, available);
        this.unschedule(this.advanceFromNext);
        if (available && state?.phase === "NEXT_BATTLE" && !this.confirmingExit) {
            this.scheduleOnce(this.advanceFromNext, 0.8);
        }
    };

    /** 读取服务端待结算奖励，只在离开/失败后交资产队列实际到账。 */
    private rewardCaption(state: DreamlandStateData | undefined): string {
        return state?.pendingRewards.length
            ? "已累计奖励：" + state.pendingRewards
                .map(row => `${BagItemCatalog.face(row.itemId, row.quantity).title} ×${row.quantity}`).join("  ")
            : "已累计奖励：—";
    }

    /** 首通入口展示第一个未领档，领取判定由服务器的个人记录驱动。 */
    private drawMilestone(state: DreamlandStateData | undefined, available: boolean): void {
        const milestone = this.milestone();
        const ready = !!milestone && (state?.highestFloor ?? 0) >= milestone.floor;
        this.milestoneTitle!.string = milestone ? `首通奖励（第 ${milestone.floor} 层）` : "首通奖励";
        this.milestoneCondition!.node.active = !ready;
        this.milestoneCondition!.string = milestone ? `达到 ${milestone.floor} 层可领` : state ? "已领取全部首通奖励" : "—";
        this.claimButton!.node.active = ready;
        this.claimButton!.interactable = available;
        const nextId = milestone?.id ?? 0;
        if (this.shownMilestoneId === nextId) {
            return;
        }
        this.shownMilestoneId = nextId;
        this.milestoneItems.forEach((slot, index) => {
            const item = milestone?.rewards[index];
            slot.node.active = !!item;
            if (item) {
                const face = BagItemCatalog.face(item.itemId, item.quantity);
                const current = () => this.opened && this.shownMilestoneId === nextId;
                ResManager.setSprite(this.milestoneIcons[index].node, face.icon, current);
                ResManager.setSprite(this.milestoneFrames[index].node, face.frame, current);
                this.milestoneCounts[index].string = String(item.quantity);
            }
        });
    }

    /** 服务器下发有效选择时展示固定三格和当前梦境队伍。 */
    private drawBuffs(state: DreamlandStateData | undefined, available: boolean): void {
        this.buffPanel!.active = state?.phase === "SELECT_BUFF";
        if (!state || state.phase !== "SELECT_BUFF") {
            return;
        }
        this.buffCloseButton!.interactable = available;
        this.buffOptions.forEach((button, index) => {
            const option = state.buffs[index];
            button.node.parent!.active = !!option;
            button.interactable = available;
            this.buffLabels[index].string = option?.description ?? "";
            const icon = option ? buffIconOrder[option.id] : 0;
            this.buffIcons[index].spriteFrame = icon ? this.buffArtwork[icon - 1] : null;
        });
        if (this.lineupVersion !== state.version) {
            this.lineupVersion = state.version;
            const roster = HeroRosterModel.instance.snapshot.heroes;
            this.lineupIcons.forEach((sprite, index) => {
                const slot = state.slots[index];
                const hero = slot && roster.find(row => row.id === slot.heroId);
                const face = hero ? HeroCatalog.find(hero.templateId) : null;
                sprite.node.parent!.active = !!face;
                ResManager.setSprite(sprite.node, face?.icon ?? null, () => this.opened && this.lineupVersion === state.version);
            });
        }
        this.drawCountdown(state, ServerClock.instance.nowSeconds());
    }

    /** 从服务器持续时间投影倒计时，并在期限或跨日边界到来后补读。 */
    private updateClock = (): void => {
        const state = DreamlandModel.instance.snapshot?.state;
        const now = ServerClock.instance.nowSeconds();
        if (!state || now === null) {
            return;
        }
        this.drawCountdown(state, now);
        const due = [state.deadlineSeconds, state.resetAtSeconds].some(time => time > 0 && time <= now);
        const controller = DreamlandController.instance;
        if (due && !controller.busy && !this.activeBattleId && !this.confirmingExit && now >= this.nextRefreshAt) {
            this.nextRefreshAt = now + 5;
            controller.refreshVisible();
        }
    };

    /** 展示即将挑战的确定层数与距自动选择剩余秒数。 */
    private drawCountdown(state: DreamlandStateData, now: number | null): void {
        if (state.phase === "SELECT_BUFF") {
            const left = now !== null && state.deadlineSeconds ? `　${Math.max(0, state.deadlineSeconds - now)}秒` : "";
            this.buffFloorLabel!.string = `即将挑战：第 ${state.currentFloor + 1} 层${left}`;
        }
    }

    /** 播放冻结战报。结束后确认服务端战果，逐层推进；退出由玩家另行确认。 */
    private playBattle(state: DreamlandStateData, bytes: Uint8Array): void {
        const battle = state.battle!;
        this.activeBattleId = battle.battleId;
        this.shownBattleId = battle.battleId;
        this.buffPanel!.active = false;
        this.panel!.node.active = false;
        this.battleBackground!.active = true;
        this.battleHost!.active = true;
        this.battleHud!.active = true;
        this.battleFloorLabel!.string = `第 ${battle.floor} 层`;
        this.battleRewardLabel!.string = this.rewardCaption(state);
        this.battleExitButton!.interactable = !DreamlandController.instance.busy;
        AudioPreferences.playMusic(this.battleMusic!);
        const current = () => this.opened && battle.battleId === this.activeBattleId;
        const settle = () => {
            if (!current()) {
                return;
            }
            this.finishPlayback();
            if (!this.confirmingExit) {
                DreamlandController.instance.act("NEXT");
            }
        };
        const failed = (error: unknown) => {
            if (current()) {
                GameLog.shared.classified("MODULE", "warn", "DreamlandView", `梦境第 ${battle.floor} 层战报播放失败：${String(error)}`);
                settle();
            }
        };
        void BattleReplayPreview.open(this.battleHost!, bytes, false, settle, undefined, "永恒梦境", true,
            async () => settle(), false, () => !current(), undefined, undefined, "永恒梦境阵容", failed).then(stop => {
            if (current()) {
                this.stopPlayback = stop;
            } else {
                stop();
            }
        }, failed);
    }

    /** 播放退出后归还旧页面内容，取消迟到的战场资源。 */
    private finishPlayback(): void {
        this.activeBattleId = null;
        this.stopPlayback?.();
        this.stopPlayback = null;
        this.battleHost!.active = false;
        this.battleBackground!.active = false;
        this.battleHud!.active = false;
        this.panel!.node.active = true;
    }

    /** 确认上一场后自动发起下一层，增益选择或结束状态由服务端决定。 */
    private advanceFromNext = (): void => {
        if (this.opened && !this.confirmingExit && DreamlandModel.instance.snapshot?.state.phase === "NEXT_BATTLE") {
            DreamlandController.instance.act("NEXT");
        }
    };

    /** 首次挑战打开梦境出阵，本日已挑战过则按原交互先确认。 */
    private challenge(): void {
        const state = DreamlandModel.instance.snapshot?.state;
        const controller = DreamlandController.instance;
        if (!state) {
            return;
        }
        if (state.phase === "RESULT" || state.phase === "NEXT_BATTLE") {
            controller.act("NEXT");
        } else if (state.phase === "READY" && state.challengeCount > 0) {
            void UIManager.instance.openChild(this, ConfirmView, {
                title: "重新挑战",
                message: "今日已经挑战过，已结算的楼层不会重复发放奖励。仍可刷新个人纪录和领取首通奖励。确认再次挑战？",
                onConfirm: () => this.openFormation(),
            }).catch(() => { /* 统一开窗入口反馈异常。 */ });
        } else if (state.phase === "READY") {
            this.openFormation();
        }
    }

    /** 复用通用站位编辑，保存仅更新梦境专用阵容，出阵确认后才开始。 */
    private openFormation(): void {
        const controller = DreamlandController.instance;
        const read = (): MainFormation | null => {
            const state = DreamlandModel.instance.snapshot?.state;
            const main = HeroRosterModel.instance.snapshot.mainFormation;
            if (!state || !main) {
                return null;
            }
            return {
                ...main,
                assistanceUnlocked: false,
                version: state.version,
                formationId: state.formationId,
                slots: state.slots,
                options: main.options?.map(row => ({
                    formationId: row.formationId, openPositions: row.openPositions.filter(position => position < 9),
                })),
            };
        };
        void UIManager.instance.openChild(this, FormationView, {
            title: "永恒梦境出阵",
            closeAfterSave: true,
            formation: { read, save: (draft, done) => controller.saveFormation(draft, done) },
            complete: confirmed => {
                if (confirmed && this.opened) {
                    controller.act("START");
                }
            },
        }).catch(() => { /* 统一开窗入口反馈异常。 */ });
    }

    /** 提交当前有效增益编号，选择及战斗冻结在同一服务端操作。 */
    private chooseBuff(index: number): void {
        const state = DreamlandModel.instance.snapshot?.state;
        const option = state?.phase === "SELECT_BUFF" ? state.buffs[index] : null;
        if (option) {
            DreamlandController.instance.act("SELECT_BUFF", option.id);
        }
    }

    /** 结束本次挑战前确认，实际资产出现在共用领奖窗口。 */
    private endRun(): void {
        if (this.confirmingExit) {
            return;
        }
        this.confirmingExit = true;
        this.unschedule(this.advanceFromNext);
        const cancel = () => {
            this.confirmingExit = false;
            if (!this.activeBattleId && DreamlandModel.instance.snapshot?.state.phase === "RESULT" && this.shownBattleId) {
                DreamlandController.instance.act("NEXT");
            }
            this.render();
        };
        void UIManager.instance.openChild(this, ConfirmView, {
            title: "退出挑战",
            message: "结束本次永恒梦境挑战，结算本次已累积的奖励？",
            onConfirm: () => {
                this.confirmingExit = false;
                DreamlandController.instance.act("END");
            },
            onCancel: cancel,
        }).catch(cancel);
    }

    /** 读取服务端按楼层排序的首个未领取档位。 */
    private milestone(): DreamlandStateData["milestones"][number] | undefined {
        return DreamlandModel.instance.snapshot?.state.milestones.find(row => !row.claimed);
    }

    /** 达到要求后按原档位编号提交首通领取。 */
    private claimMilestone(): void {
        const milestone = this.milestone();
        if (milestone) {
            DreamlandController.instance.act("CLAIM", milestone.id);
        }
    }

    /** 打开配置奖励详情。 */
    private openRewards(): void {
        void UIManager.instance.openChild(this, DreamlandRewardView).catch(() => { /* 统一开窗入口反馈异常。 */ });
    }

    /** 介绍新版已开放的连续战斗、首通与跨日规则。 */
    private openRules(): void {
        void UIManager.instance.openChild(this, RulesView, {
            title: "永恒梦境规则",
            message: "1、用同一队伍连续战斗，战斗后继承生命和技能使用状态。挑战失败或主动退出时按已通关层数结算。\n\n"
                + "2、开始时选择一种增益，每通关五层重新选择。超时后系统自动选择。\n\n"
                + "3、每天零点重置，起点在历史最高通关记录之前十层。已结算的楼层当天不重复发奖，达成新首通档位后可手动领取。",
        }).catch(() => { /* 统一开窗入口反馈异常。 */ });
    }

    /** 背包详情以同源物品配置展示预览，无资产写入。 */
    private showItem(itemId: number, quantity: number): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description", face: BagItemCatalog.face(itemId, quantity),
        }).catch(() => { /* 统一开窗入口反馈异常。 */ });
    }

}
