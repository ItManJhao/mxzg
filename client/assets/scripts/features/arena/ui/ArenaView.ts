/** 竞技场四页共用窗口，负责绑定原资源和触发角色行为。榜单、周宝箱和奖励档位均来自竞技场模型。 */
import { _decorator, AudioSource, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../../account/AccountModel";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { SettledBattlePlayback } from "../../battle/ui/SettledBattlePlayback";
import { ConfirmView } from "../../common/ui/ConfirmView";
import type { MarketOffer } from "../../market/MarketModel";
import { MarketBuyView } from "../../market/ui/MarketBuyView";
import { ArenaController } from "../ArenaController";
import { ArenaModel, type ArenaOpponent, type ArenaRanking, type ArenaReward, type ArenaState } from "../ArenaModel";
import { ArenaDialogs } from "./ArenaDialogs";
import { ArenaEntryCell } from "./ArenaEntryCell";
import { ArenaHistoryView } from "./ArenaHistoryView";
import { ArenaRankCell } from "./ArenaRankCell";
import { ArenaRewardCell } from "./ArenaRewardCell";

const { ccclass, property } = _decorator;
const tabs = ["challenge", "ranking", "daily", "season"] as const;
type ArenaTab = (typeof tabs)[number];

/** 附着在主城上的竞技弹窗退出时将背景音源交还给调用方。 */
interface ArenaViewArgs {
    readonly resumeHomeMusic?: () => void;
    /** 从当前账号快照读取竞技券购买所需的钻石余额。 */
    readonly account?: AccountModel;
}

@UIRegistry.view({
    id: "arena",
    prefab: "bundles/module/arena/prefabs/ArenaView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("ArenaView")
export class ArenaView extends BaseView<ArenaViewArgs> {
    /** 主窗口和镶在顶部的冠军赛横幅一起显隐。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 进入录像场景时启用原竞技场背景。 */
    @property(Node) private battleBackground: Node | null = null;
    /** 通用录像挂在玩法页自己的战场节点。 */
    @property(Node) private battleHost: Node | null = null;
    /** 菜单和战场分别复用对应原音乐。 */
    @property(AudioSource) private lobbyMusic: AudioSource | null = null;
    /** 录像期间播放原竞技场战场配乐。 */
    @property(AudioSource) private battleMusic: AudioSource | null = null;
    /** 关闭主窗口回到主城。 */
    @property(Button) private backButton: Button | null = null;
    /** 顶栏冠军赛入口。 */
    @property(Button) private championButton: Button | null = null;
    /** 联网后取得下一组候选。 */
    @property(Button) private refreshButton: Button | null = null;
    /** 换对手时显示服务端冷却。 */
    @property(Label) private refreshLabel: Label | null = null;
    /** 当前竞技积分。 */
    @property(Label) private scoreLabel: Label | null = null;
    /** 当前实际排行或榜外说明。 */
    @property(Label) private rankLabel: Label | null = null;
    /** 选敌读取中或候选为空时的玩法状态。 */
    @property(Label) private phaseLabel: Label | null = null;
    /** 背包实际门票数量。 */
    @property(Label) private ticketLabel: Label | null = null;
    /** 打开购买一张门票的确认窗口。 */
    @property(Button) private ticketButton: Button | null = null;
    /** 原版四页选项卡，从挑战到排名奖励。 */
    @property([Button]) private tabButtons: Button[] = [];
    /** 每页当前选中时显示浅色底。 */
    @property([Node]) private selectedTabs: Node[] = [];
    /** 挑战、排行和共用奖表三块静态区域。 */
    @property([Node]) private pages: Node[] = [];
    /** 挑战候选列表。 */
    @property(SuperScroll) private entries: SuperScroll | null = null;
    /** 排行玩家列表。 */
    @property(SuperScroll) private rankingEntries: SuperScroll | null = null;
    /** 每日和赛季共享一套奖励表。 */
    @property(SuperScroll) private rewardEntries: SuperScroll | null = null;
    /** 排行底部原黄色卡。 */
    @property(ArenaRankCell) private ownRank: ArenaRankCell | null = null;
    /** 奖励页底部显示自身档位。 */
    @property(ArenaRewardCell) private ownRewards: ArenaRewardCell | null = null;
    /** 点击编辑当前竞技场的独立防守阵容。 */
    @property(Button) private defenseButton: Button | null = null;
    /** 打开从当前账号读取的挑战记录。 */
    @property(Button) private historyButton: Button | null = null;
    /** 点选跳过开关，资格和偏好交控制器管理。 */
    @property(Button) private skipButton: Button | null = null;
    /** 只在实际启用跳过时显示原版对勾。 */
    @property(Node) private skipCheck: Node | null = null;
    /** 挑战剩余时间，按服务器时间每秒刷新。 */
    @property(Label) private challengeClock: Label | null = null;
    /** 每日结算与赛季结算倒计时。 */
    @property(Label) private rewardClock: Label | null = null;
    /** 进度条上的六个周宝箱入口。 */
    @property([Button]) private chestButtons: Button[] = [];
    /** 周宝箱实际目标次数。 */
    @property([Label]) private chestLabels: Label[] = [];
    /** 静态共用宝箱的关闭和已达成样式，各三档。 */
    @property([SpriteFrame]) private chestFrames: SpriteFrame[] = [];
    /** 已参加的挑战次数。 */
    @property(Label) private weeklyCount: Label | null = null;
    /** 达成间距之间线性填充周进度条。 */
    @property(Sprite) private weeklyFill: Sprite | null = null;
    /** 进入竞技场独立商店。 */
    @property(Button) private shopButton: Button | null = null;

    /** 当前显示页关闭时中止录像，防止迟到结果穿透到主城。 */
    private playback: SettledBattlePlayback | null = null;
    /** 切页仅切换呈现，权威结算由控制器保存。 */
    private tab: ArenaTab = "challenge";
    /** 已刷新过的上海日界周期，避免同一个截止点每秒发包。 */
    private checkedReset = 0;

    /** 建立四页及旧挑战操作，读取竞技场和赛季所需数据。 */
    public onOpen(args?: ArenaViewArgs): void {
        super.onOpen(args);
        const controller = ArenaController.instance;
        for (const list of [this.entries, this.rankingEntries, this.rewardEntries]) {
            list!.validateBindings();
        }
        this.playback = new SettledBattlePlayback(this, this.battleHost!, "竞技场", () => this.finishBattle());
        this.tabButtons.forEach((button, index) => this.listen(button, () => this.setTab(tabs[index])));
        this.chestButtons.forEach((button, index) => this.listen(button, () => this.openChest(index)));
        this.listen(this.backButton!, () => this.close());
        this.listen(this.championButton!, () => UIManager.instance.toast("冠军赛暂未开放"));
        this.listen(this.refreshButton!, () => controller.refreshOpponents());
        this.listen(this.ticketButton!, () => this.confirmTicket());
        this.listen(this.defenseButton!, () => ArenaDialogs.openDefense(this));
        this.listen(this.historyButton!, () => this.openHistory());
        this.listen(this.skipButton!, () => controller.setSkipBattle(!controller.skipBattle));
        this.listen(this.shopButton!, () => ArenaDialogs.openShop(this));
        this.listenReward(this.rewardEntries!.list.node);
        this.listenReward(this.ownRewards!.node.parent!);
        this.ownListener(EventDispatcher.instance.on("arena.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.schedule(this.checkReset, 1);
        AudioPreferences.playMusic(this.lobbyMusic!);
        controller.setVisible(true);
        controller.openRanking();
        this.render();
    }

    /** 关窗释放列表事件、音源和正在播放的战报。 */
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
        this.args?.resumeHomeMusic?.();
    }

    /** 用原窗口宽度和横幅范围适配屏幕，战场本身填满可见区域。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width / panel.width, box.height / 1154);
        panel.node.setScale(scale, scale, 1);
        this.battleBackground!.getComponent(UITransform)!.setContentSize(box.width, box.height);
    }

    /** 当前显示期管理按钮绑定，关页解除本轮操作引用。 */
    private listen(button: Button, callback: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, callback);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, callback);
            }
        });
    }

    /** 赛季奖励内层列表把物品选择交给统一道具说明窗。 */
    private listenReward(content: Node): void {
        content.on(ArenaRewardCell.INSPECT, this.inspectReward, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.targetOff(this);
            }
        });
    }

    /** 切换页签时读取需要的真实榜单或赛季，并把新奖表复位。 */
    private setTab(tab: ArenaTab): void {
        this.tab = tab;
        const controller = ArenaController.instance;
        if (tab === "ranking") {
            controller.openRanking();
        } else if (tab !== "challenge") {
            controller.openSeason();
            controller.openRanking();
            this.rewardEntries!.toStart();
        }
        this.render();
    }

    /** 消费一次已结算战报。其他更新只重画活动中的页签。 */
    private render = (): void => {
        if (this.playback?.active) {
            return;
        }
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
        const tab = tabs.indexOf(this.tab);
        this.selectedTabs.forEach((node, index) => { node.active = index === tab; });
        this.pages.forEach((node, index) => { node.active = index === Math.min(tab, 2); });
        if (tab === 0) {
            this.paintChallenge(model.state);
        } else if (tab === 1) {
            this.paintRankings();
        } else {
            this.paintRewards();
        }
        this.drawClocks();
    };

    /** 对手按战力由低至高展示，是否免费和是否有票均以当前服务端状态为准。 */
    private paintChallenge(state: ArenaState | null): void {
        const controller = ArenaController.instance;
        const model = ArenaModel.instance;
        const own = model.ranking?.own;
        this.rankLabel!.string = own ? `排名 ${own.rank || "榜外"}` : "排名 —";
        this.scoreLabel!.string = state ? `积分 ${state.score}` : "积分 —";
        this.ticketLabel!.string = state ? String(state.ticketBalance) : "—";
        this.ticketButton!.interactable = !!state && !controller.busy;
        const entries = [...(state?.opponents ?? [])].sort((a, b) => a.power - b.power);
        this.phaseLabel!.node.active = entries.length === 0;
        this.phaseLabel!.string = state ? "暂无可挑战对手" : "正在读取竞技场";
        this.entries!.list.setData<ArenaOpponent>(entries, (node, entry) => {
            node.getComponent(ArenaEntryCell)!.render(entry, !!state && !controller.busy,
                () => this.challenge(entry, state!), (state?.freeRemaining ?? 0) > 0);
        });
        this.skipCheck!.active = controller.skipBattle;
        this.paintChests();
    }

    /** 先检查真实次数，不能挑战时复用现有购票确认。 */
    private challenge(entry: ArenaOpponent, state: ArenaState): void {
        const controller = ArenaController.instance;
        if (controller.busy) {
            return;
        }
        if (state.freeRemaining > 0 || state.ticketBalance > 0) {
            controller.challenge(entry.id, entry.roleId);
        } else {
            this.confirmTicket();
        }
    }

    /** 本期榜单和下方个人行直接使用服务端返回的资料。 */
    private paintRankings(): void {
        const ranking = ArenaModel.instance.ranking;
        const controller = ArenaController.instance;
        const own = ranking?.own;
        this.rankingEntries!.list.setData<ArenaRanking>(ranking?.entries ?? [], (node, row) => {
            const isOwn = row.roleId === own?.roleId;
            const canLike = !isOwn && !row.liked && !controller.busy && !!ranking?.likesRemaining;
            node.getComponent(ArenaRankCell)!.paint(row, isOwn, canLike ? () => controller.like(row.roleId) : null);
        });
        this.ownRank!.node.active = !!own;
        if (own) {
            this.ownRank!.paint(own, true, null);
        }
    }

    /** 根据日或赛季奖表和自己最新排行渲染底部预计档位。 */
    private paintRewards(): void {
        const model = ArenaModel.instance;
        const tiers = this.tab === "daily" ? model.season?.dailyTiers : model.season?.seasonTiers;
        this.rewardEntries!.list.setData(tiers ?? [], (node, tier) => {
            const interval = tier.minRank === tier.maxRank ? String(tier.minRank) : `${tier.minRank}-${tier.maxRank}`;
            node.getComponent(ArenaRewardCell)!.paint(interval, tier.maxRank, tier.rewards);
        });
        const rank = model.ranking?.own.rank;
        const own = rank ? tiers?.find(tier => tier.minRank <= rank && rank <= tier.maxRank) : undefined;
        this.ownRewards!.paint(`排名 ${rank === 0 ? "榜外" : (rank ?? "—")}`, 0, own?.rewards ?? [], true);
    }

    /** 原奖箱按每档真实次数推进，已达成和已领取以活动快照显示。 */
    private paintChests(): void {
        const season = ArenaModel.instance.season;
        const chests = season?.chests ?? [];
        const count = season?.seasonChallenges ?? 0;
        this.weeklyCount!.string = season ? `已挑战 ${count} 次` : "";
        this.chestButtons.forEach((button, index) => {
            const chest = chests[index];
            this.chestLabels[index].string = chest ? String(chest.requiredChallenges) : "";
            button.node.active = !!chest;
            if (chest) {
                const type = Math.max(0, [1, 2, 4].indexOf(chest.boxPic));
                const frame = (count >= chest.requiredChallenges || chest.claimed ? 3 : 0) + type;
                button.node.getComponent(Sprite)!.spriteFrame = this.chestFrames[frame] ?? this.chestFrames[0];
            }
        });
        const reached = chests.findIndex(chest => count < chest.requiredChallenges);
        const current = chests[reached];
        const previous = chests[reached - 1]?.requiredChallenges ?? 0;
        this.weeklyFill!.fillRange = !chests.length ? 0 : !current ? 1
            : (reached + (count - previous) / (current.requiredChallenges - previous)) / chests.length;
    }

    /** 宝箱内容通过活动真实奖表显示，达成后允许确认领取。 */
    private openChest(index: number): void {
        const season = ArenaModel.instance.season;
        const chest = season?.chests[index];
        if (!season || !chest) {
            return;
        }
        const eligible = season.seasonChallenges >= chest.requiredChallenges && !chest.claimed;
        const rewards = chest.rewards.map(prize => `${BagItemCatalog.face(prize.itemId, prize.quantity).title} ×${prize.quantity}`);
        const status = chest.claimed ? "已领取" : `本周挑战 ${season.seasonChallenges}/${chest.requiredChallenges} 次`;
        void UIManager.instance.openChild(this, ConfirmView, {
            title: "每周宝箱", message: [status, ...rewards].join("\n"), showCancel: eligible,
            confirmText: eligible ? "领取" : "确定", onConfirm: () => {
                if (eligible) {
                    ArenaController.instance.claimChest(chest.id);
                }
            },
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 通过共用道具资料展示奖励的真实数量、品质与说明。 */
    private inspectReward(prize: ArenaReward): void {
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description", face: BagItemCatalog.face(prize.itemId, prize.quantity),
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 挑战记录保留独立弹窗，回放按照钮来源保持不跳过。 */
    private openHistory(): void {
        ArenaController.instance.refreshHistory();
        void UIManager.instance.openChild(this, ArenaHistoryView).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 沿用原数量购买窗口，服务端仍负责扣钻、出票和幂等回执。 */
    private confirmTicket(): void {
        const offer = this.ticketOffer();
        if (!offer) {
            return;
        }
        const controller = ArenaController.instance;
        void UIManager.instance.openChild(this, MarketBuyView, {
            offer,
            refreshOn: ["arena.updated"],
            read: () => {
                const current = this.ticketOffer();
                const diamonds = this.args?.account?.snapshot.role?.diamonds;
                if (!current || diamonds === undefined) {
                    return null;
                }
                const maximum = Math.min(0x7fffffff, Math.floor(diamonds / current.costQuantity));
                return { offer: current, maximum, busy: controller.busy };
            },
            buy: quantity => controller.buyTicket(quantity),
        }).catch(() => { /* 由页面管理器反馈加载异常。 */ });
    }

    /** 竞技券的单次发放数量固定，单价取当前竞技场快照。 */
    private ticketOffer(): MarketOffer | null {
        const state = ArenaModel.instance.state;
        if (!state) {
            return null;
        }
        return {
            productId: 900501, itemId: 900501, quantity: 1, costItemId: 900002,
            costQuantity: state.ticketPriceDiamonds, purchaseLimit: 0, purchased: 0,
            discount: 0, purchasable: true,
        };
    }

    /** 根据当前页算挑战、每日和赛季秒数，等待权威时间时保留空文案。 */
    private drawClocks(): void {
        const model = ArenaModel.instance;
        const season = model.season;
        const cooldown = ArenaController.instance.refreshCooldown();
        this.refreshLabel!.string = cooldown > 0 ? this.timeText(cooldown) : "刷新对手";
        this.refreshButton!.interactable = !ArenaController.instance.busy && cooldown === 0;
        const now = ServerClock.instance.nowSeconds();
        const challengeEnd = season?.challengeEndsAt ?? season?.seasonEndsAt;
        const rewardEnd = this.tab === "daily" ? season?.dailyEndsAt : season?.seasonEndsAt;
        this.challengeClock!.string = challengeEnd && now !== null ? `结束前 ${this.timeText(challengeEnd - now)}` : "";
        this.rewardClock!.string = rewardEnd && now !== null ? `下次结算 ${this.timeText(rewardEnd - now)}` : "";
    }

    /** 将剩余秒数格式化为与原界面相同的日、时、分、秒。 */
    private timeText(seconds: number): string {
        const remaining = Math.max(0, seconds);
        const days = Math.floor(remaining / 86400);
        const clock = [Math.floor(remaining / 3600) % 24, Math.floor(remaining / 60) % 60, remaining % 60]
            .map(part => String(part).padStart(2, "0")).join(":");
        return days ? `${days}天 ${clock}` : clock;
    }

    /** 在上海日界后只申请一次新的次数和奖表。 */
    private checkReset = (): void => {
        this.drawClocks();
        const resetAt = ArenaModel.instance.state?.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        const controller = ArenaController.instance;
        if (resetAt && now !== null && resetAt < now && resetAt !== this.checkedReset && !controller.busy && !this.playback?.active) {
            this.checkedReset = resetAt;
            controller.refreshVisible();
            if (this.tab !== "challenge") {
                controller.openRanking();
            }
        }
    };

    /** 关闭结果窗后恢复挑战页和此前滚动位置。 */
    private finishBattle(): void {
        AudioPreferences.stopMusic(this.battleMusic!);
        this.battleHost!.active = false;
        this.battleBackground!.active = false;
        this.panel!.node.active = true;
        AudioPreferences.playMusic(this.lobbyMusic!);
        this.render();
    }
}
