/** 竞技场新手段页面。列表来自服务端当前选敌与历史，复用原战场、统计、确认及奖励反馈。 */
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
import { ArenaController } from "../ArenaController";
import { ArenaModel, type ArenaState } from "../ArenaModel";
import { ArenaEntryCell, type ArenaEntry } from "./ArenaEntryCell";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "arena",
    prefab: "bundles/module/arena/prefabs/ArenaView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("ArenaView")
export class ArenaView extends BaseView {
    /** 内容使用旧公用窗底板和竞技场页眉。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 原竞技场战场背景，隐藏时保留页面背景。 */
    @property(Node) private battleBackground: Node | null = null;
    /** 显示共用战报的原战场宿主。 */
    @property(Node) private battleHost: Node | null = null;
    /** 对手与历史页沿用主城原曲。 */
    @property(AudioSource) private lobbyMusic: AudioSource | null = null;
    /** 原竞技场战斗音乐，离开本场即停止。 */
    @property(AudioSource) private battleMusic: AudioSource | null = null;
    /** 返回主城。 */
    @property(Button) private backButton: Button | null = null;
    /** 服务器筛选的下一组对手。 */
    @property(Button) private refreshButton: Button | null = null;
    /** 刷新或确认原在途操作的文案。 */
    @property(Label) private refreshLabel: Label | null = null;
    /** 协议返回的当前积分。 */
    @property(Label) private scoreLabel: Label | null = null;
    /** 对手、历史或新手段结束时显示当前阶段。 */
    @property(Label) private phaseLabel: Label | null = null;
    /** 当天权威免费次数和可用挑战券。 */
    @property(Label) private attemptsLabel: Label | null = null;
    /** 购买一张原竞技场门票。 */
    @property(Button) private ticketButton: Button | null = null;
    /** 页签切换回当前推荐对手。 */
    @property(Button) private opponentsButton: Button | null = null;
    /** 页签切换到战斗历史。 */
    @property(Button) private historyButton: Button | null = null;
    /** 候选与历史共享静态行卡和滚动规格。 */
    @property(SuperScroll) private entries: SuperScroll | null = null;

    /** 页面关闭时用来中止战报或拒绝迟到结果。 */
    private playback: SettledBattlePlayback | null = null;
    /** 当前页签，重开时只从推荐对手开始。 */
    private showingHistory = false;
    /** 当前打开期已经查询过的跨日秒。 */
    private checkedReset = 0;

    /** 按原页签逻辑绑定列表，查询本角色的权威积分和对手。 */
    public onOpen(): void {
        if (!this.panel || !this.battleHost || !this.battleBackground || !this.lobbyMusic || !this.battleMusic || !this.backButton
            || !this.refreshButton || !this.refreshLabel || !this.scoreLabel || !this.phaseLabel
            || !this.attemptsLabel || !this.ticketButton || !this.opponentsButton || !this.historyButton || !this.entries) {
            throw new Error("竞技场预制体绑定不完整");
        }
        this.playback = new SettledBattlePlayback(this, this.battleHost, "竞技场", () => this.finishBattle());
        this.listen(this.backButton, () => this.close());
        this.listen(this.refreshButton, () => {
            if (this.showingHistory || !ArenaModel.instance.state) {
                ArenaController.instance.refreshVisible();
            } else {
                ArenaController.instance.refreshOpponents();
            }
        });
        this.listen(this.ticketButton, () => this.confirmTicket());
        this.listen(this.opponentsButton, () => this.setTab(false));
        this.listen(this.historyButton, () => this.setTab(true));
        this.ownListener(EventDispatcher.instance.on("arena.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.checkReset, 1);
        AudioPreferences.playMusic(this.lobbyMusic);
        ArenaController.instance.setVisible(true);
        this.render();
    }

    /** 停止当前战报、音源和跨日计时。 */
    public onClose(): void {
        ArenaController.instance.setVisible(false);
        this.unschedule(this.checkReset);
        this.playback?.close();
        this.playback = null;
        if (this.battleMusic) {
            AudioPreferences.stopMusic(this.battleMusic);
        }
        if (this.lobbyMusic) {
            AudioPreferences.stopMusic(this.lobbyMusic);
        }
    }

    /** 使主窗保持旧版比例并让出顶栏、底栏。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, Math.max(1, box.height - 170) / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 当前显示期管理按钮绑定，并在页面释放时解除。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 切换显示项，服务器已交付的历史资料不需要重复查询。 */
    private setTab(showHistory: boolean): void {
        this.showingHistory = showHistory;
        this.render();
        this.entries!.toStart();
    }

    /** 提交一次当前战报展示，或绘制已确认的积分、次数、历史与候选。 */
    private render = (): void => {
        if (this.playback?.active) {
            return;
        }
        const controller = ArenaController.instance;
        const model = ArenaModel.instance;
        const battle = model.takeBattle();
        if (battle) {
            this.panel!.node.active = false;
            this.battleBackground!.active = true;
            this.battleHost!.active = true;
            AudioPreferences.playMusic(this.battleMusic!);
            this.playback!.play(battle);
            return;
        }
        const state = model.state;
        this.scoreLabel!.string = state ? `当前积分 ${state.score}` : "当前积分 —";
        this.attemptsLabel!.string = state ? `免费次数 ${state.freeRemaining}　挑战券 ${state.ticketBalance}` : "";
        this.phaseLabel!.string = this.phase(state);
        this.ticketButton!.interactable = !!state?.newcomerActive && !controller.busy;
        this.drawRefresh(state);
        this.historyButton!.interactable = !this.showingHistory;
        this.opponentsButton!.interactable = this.showingHistory;
        const entries = this.showingHistory ? state?.history : state?.opponents;
        this.entries!.list.setData<ArenaEntry>(entries ?? [], (node, entry) => {
            const history = "battleId" in entry;
            const canAct = !controller.busy && (history || state?.newcomerActive === true);
            node.getComponent(ArenaEntryCell)!.render(entry, canAct, () => {
                if (history) {
                    controller.replay(entry);
                } else if ((state?.freeRemaining ?? 0) > 0 || (state?.ticketBalance ?? 0) > 0) {
                    controller.challenge(entry.id);
                } else {
                    this.confirmTicket();
                }
            });
        });
    };

    /** 仅展示当前已接通段落的原规则和真实参与记录。 */
    private phase(state: ArenaState | null): string {
        if (!state) {
            return ArenaController.instance.busy ? "正在读取竞技场" : "请刷新竞技场";
        }
        if (this.showingHistory) {
            return state.history.length ? `已参加 ${state.settledChallenges} 场` : "暂无战斗记录";
        }
        return state.newcomerActive ? `新手胜场 ${state.robotWins}/5` : "新手阶段已完成，真人匹配暂未开放";
    }

    /** 旧版换一批按配置秒数恢复，历史刷新独立，不等待选敌冷却。 */
    private drawRefresh(state: ArenaState | null): void {
        const controller = ArenaController.instance;
        const refreshState = this.showingHistory || !state;
        const cooldown = refreshState ? 0 : controller.refreshCooldown();
        this.refreshLabel!.string = refreshState ? "刷新" : cooldown > 0 ? `${cooldown} 秒` : "换一批";
        this.refreshButton!.interactable = !controller.busy && cooldown === 0
            && (state?.newcomerActive !== false || this.showingHistory);
    }

    /** 原票价显示在确认中，实际扣钻和发票由服务器完成。 */
    private confirmTicket(): void {
        const state = ArenaModel.instance.state;
        if (!state?.newcomerActive) {
            return;
        }
        void UIManager.instance.openChild(this, ConfirmView, {
            title: "竞技场挑战券", message: `消耗 ${state.ticketPriceDiamonds} 钻石购买 1 张挑战券？`,
            onConfirm: () => ArenaController.instance.buyTicket(1),
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 上海零点后的第一秒才读取新日次数，和竞技场服务端的日切边界一致。 */
    private checkReset = (): void => {
        const state = ArenaModel.instance.state;
        this.drawRefresh(state);
        const at = state?.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        if (at !== undefined && now !== null && at < now && at !== this.checkedReset
            && !ArenaController.instance.busy && !this.playback?.active) {
            this.checkedReset = at;
            ArenaController.instance.refreshVisible();
        }
    };

    /** 关闭结果窗后恢复原页签和滚动位置，不重新结算。 */
    private finishBattle(): void {
        AudioPreferences.stopMusic(this.battleMusic!);
        this.battleHost!.active = false;
        this.battleBackground!.active = false;
        this.panel!.node.active = true;
        AudioPreferences.playMusic(this.lobbyMusic!);
        this.render();
    }
}
