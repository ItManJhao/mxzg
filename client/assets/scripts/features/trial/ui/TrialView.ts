/**
 * 勇者试炼的地图主页面。二十个原版节点、每日收益栏和战场挂点均由预制体提供。
 * 监听已确认进度，串起选难度、守军预览、独立出阵、战报和宝箱。
 */
import { _decorator, AudioSource, Button, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { TrialBattle, TrialState } from "../../../platform/Protocol";
import { BattleReplayPreview } from "../../battle/ui/BattleReplayPreview";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { ChapterEndView } from "../../battle/ui/ChapterEndView";
import { BattleReplayUtils } from "../../battle/utils/BattleReplayUtils";
import { RulesView } from "../../common/ui/RulesView";
import type { MainFormation, OwnedHero } from "../../hero/data/HeroSnapshotUtils";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { FormationView } from "../../hero/ui/FormationView";
import { TrialController } from "../TrialController";
import { TrialModel } from "../TrialModel";
import { TrialViewUtils } from "../utils/TrialViewUtils";
import { TrialDifficultyView } from "./TrialDifficultyView";
import { TrialStageView } from "./TrialStageView";
import { TrialSupportView } from "./TrialSupportView";

const { ccclass, property } = _decorator;

/** 应用拥有导航与商店依赖，地图只交付按钮事件。 */
export interface TrialViewArgs {
    /** 回到原副本大厅。 */
    readonly backToHall: () => void;
    /** 打开已配置的试炼商店。 */
    readonly openShop: () => void;
}

@UIRegistry.view({ id: "trial", prefab: "bundles/module/trial/prefabs/TrialView",
    layer: UILayer.Page, cache: false, allowMultiple: false })
@ccclass("TrialView")
export class TrialView extends BaseView<TrialViewArgs> {
    /** 装饰地图覆盖当前可见区域。 */
    @property(UITransform) private background: UITransform | null = null;
    /** 二十个关卡的原版位置和固定顶部界面。 */
    @property(UITransform) private map: UITransform | null = null;
    /** 战斗地图底图，播放期间覆盖试炼大地图。 */
    @property(UITransform) private battleBackground: UITransform | null = null;
    /** 通用战报播放器显示和回收的宿主。 */
    @property(Node) private battleHost: Node | null = null;
    /** 试炼沿用旧主城地图音乐。 */
    @property(AudioSource) private mapMusic: AudioSource | null = null;
    /** 已开战时切换到旧试炼战斗音轨。 */
    @property(AudioSource) private battleMusic: AudioSource | null = null;
    /** 玩法返回按钮，与全局底栏路由一致。 */
    @property(Button) private backButton: Button | null = null;
    /** 查看试炼的参与条件和结算说明。 */
    @property(Button) private rulesButton: Button | null = null;
    /** 打开旧版试炼奖励兑换。 */
    @property(Button) private shopButton: Button | null = null;
    /** 打开好友助战及本日派遣。 */
    @property(Button) private supportButton: Button | null = null;
    /** 读取或写操作中断时重新请求当前服务器状态。 */
    @property(Button) private retryButton: Button | null = null;
    /** 当前日所选难度的原版标题。 */
    @property(Label) private title: Label | null = null;
    /** 今日累计获得的金币。 */
    @property(Label) private gold: Label | null = null;
    /** 今日累计获得的试炼血。 */
    @property(Label) private currency: Label | null = null;
    /** 原地图节点固定布局，数组下标等于关卡节点编号减一。 */
    @property([Button]) private points: Button[] = [];
    /** 与节点同序，采用原版城堡或宝箱图。 */
    @property([Sprite]) private pointSprites: Sprite[] = [];
    /** 与节点同序，只在当前可挑战或可领取节点显示。 */
    @property([Node]) private hints: Node[] = [];
    /** 当前可战节点的原剑光挂点。在资源到达前用地图自带提示图。 */
    @property(Node) private swordMarker: Node | null = null;
    /** 未战、已破、未开箱、已开箱、最终未开、最终已开六种原画。 */
    @property([SpriteFrame]) private pointFrames: SpriteFrame[] = [];
    /** true 代表当前页仍拥有战报和所有子窗。 */
    private opened = false;
    /** 防止读取中重复向 UIManager 打开难度窗。 */
    private choosing = false;
    /** 正在显示的战报 ID，换场或关页后异步回调失效。 */
    private activeBattleId: string | null = null;
    /** 一次进页只自动播放同一冻结战报一次。 */
    private displayedBattleId: string | null = null;
    /** 真时战场初始化后返回的停止操作，关页或结算退场时归还。 */
    private stopReplay: (() => void) | null = null;
    /** 战报和资源失败回调都可能触发结算，只显示一次。 */
    private settling = false;
    /** 最近主动补读的日界秒，避免跨日查询失败持续连发。 */
    private refreshedBoundary = 0;
    /** 原版剑光资源加载后替换可挑战节点的静态提示。 */
    private swordReady = false;

    /** 接管试炼页的按钮、服务端状态更新和上海零点刷新。 */
    public onOpen(args?: TrialViewArgs): void {
        super.onOpen(args);
        if (!args || !this.background || !this.map || !this.battleBackground || !this.battleHost
            || !this.mapMusic || !this.battleMusic || !this.backButton || !this.rulesButton || !this.shopButton
            || !this.supportButton || !this.retryButton || !this.title || !this.gold || !this.currency
            || this.points.length !== 20 || this.pointSprites.length !== 20 || this.hints.length !== 20 || !this.swordMarker
            || this.pointFrames.length !== 6) {
            throw new Error("勇者试炼地图绑定不完整");
        }
        this.opened = true;
        this.ownListener(TrialViewUtils.listen(this.backButton, args.backToHall));
        this.ownListener(TrialViewUtils.listen(this.rulesButton, () => this.rules()));
        this.ownListener(TrialViewUtils.listen(this.shopButton, args.openShop));
        this.ownListener(TrialViewUtils.listen(this.supportButton, () => this.support()));
        this.ownListener(TrialViewUtils.listen(this.retryButton, () => TrialController.instance.refreshVisible()));
        this.points.forEach((button, index) => this.ownListener(TrialViewUtils.listen(button,
            () => this.openStage(index + 1))));
        this.ownListener(EventDispatcher.instance.on("trial.updated", this, this.paint));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        BattleSpineService.instance.mountNamedSpine(this.swordMarker, "battle-sword", "stand", {
            loop: true,
            onReady: () => {
                this.swordReady = true;
                this.paint();
            },
        });
        this.schedule(this.refreshPeriod, 1);
        TrialController.instance.setVisible(true);
        this.paint();
    }

    /** 停止地图和战场音频，清理视口、重置检查及所有迟到战报。 */
    public onClose(): void {
        this.opened = false;
        this.unschedule(this.refreshPeriod);
        TrialController.instance.setVisible(false);
        this.stopBattle();
        if (this.mapMusic && this.battleMusic) {
            AudioPreferences.stopMusic(this.mapMusic);
            AudioPreferences.stopMusic(this.battleMusic);
        }
    }

    /** 地图底图铺满视口，固定节点随原绘制坐标适配。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.background!.setContentSize(box.width, box.height);
        this.battleBackground!.setContentSize(box.width, box.height);
        this.map!.node.setScale(box.width / this.map!.width, box.height / this.map!.height, 1);
    }

    /** 自然日到达后暂停旧节点交互，请求新难度和进度。 */
    private refreshPeriod(): void {
        const boundary = TrialModel.instance.resetAtSeconds;
        const now = ServerClock.instance.nowSeconds();
        if (boundary && now !== null && now >= boundary && this.refreshedBoundary !== boundary
            && !TrialController.instance.busy) {
            this.refreshedBoundary = boundary;
            TrialController.instance.refreshVisible();
        }
    }

    /** 应用当前试炼状态，同时区分可出阵及战斗未开放的节点。 */
    private paint(): void {
        if (!this.opened) {
            return;
        }
        const model = TrialModel.instance;
        const snapshot = model.snapshot;
        const state = snapshot?.state;
        const battle = state?.battle;
        if (this.activeBattleId) {
            return;
        }
        if (battle && snapshot?.replay && battle.battleId !== this.displayedBattleId
            && !model.hasClosedBattle(battle.battleId)) {
            this.playBattle(battle, snapshot.replay);
            return;
        }
        AudioPreferences.playMusic(this.mapMusic!);
        const controller = TrialController.instance;
        const ready = !!state?.difficulty;
        const free = !controller.busy && !controller.awaitingResult;
        if (ready) {
            this.choosing = false;
        }
        this.title!.string = ready
            ? GameConfig.instance.requireConfig(GConfig.Language, 41251 + state.difficulty).value ?? "勇者试炼"
            : "勇者试炼";
        this.supportButton!.interactable = ready && free;
        this.shopButton!.interactable = ready;
        this.retryButton!.node.active = !controller.busy && (!state || controller.awaitingResult);
        this.gold!.string = this.rewardTotal(state, 900001);
        this.currency!.string = this.rewardTotal(state, 901201);
        this.swordMarker!.active = false;
        this.points.forEach((point, index) => {
            const stage = state?.nodes.find(row => row.node === index + 1);
            point.node.active = !!stage && ready;
            if (stage) {
                const chest = stage.type === "chest";
                const done = stage.status === "cleared";
                const offset = chest ? (index === this.points.length - 1 ? 4 : 2) : 0;
                const opened = chest ? stage.status !== "locked" : done;
                this.pointSprites[index].spriteFrame = this.pointFrames[offset + Number(opened)];
                const available = stage.status === "available";
                const showSword = available && !chest && this.swordReady;
                this.hints[index].active = stage.status === "blocked" || (available && !showSword);
                if (showSword) {
                    const position = point.node.position;
                    this.swordMarker!.setPosition(position.x, position.y + 32, 0);
                    this.swordMarker!.active = true;
                }
                point.interactable = free && (chest || !!stage.opponent);
            }
        });
        if (state && !state.difficulty && free && !this.choosing) {
            this.chooseDifficulty();
        }
    }

    /** 显示本日指定物品的真实累计数量，读取中显示空白。 */
    private rewardTotal(state: TrialState | undefined, itemId: number): string {
        return state ? String(state.todayRewards.find(row => row.itemId === itemId)?.quantity ?? 0) : "—";
    }

    /** 初次进入先显示三个难度；取消后仍通过应用路由返回副本大厅。 */
    private chooseDifficulty(): void {
        this.choosing = true;
        void UIManager.instance.openChild(this, TrialDifficultyView, {
            cancel: () => this.args?.backToHall(),
        }).catch(() => {
            this.choosing = false;
        });
    }

    /** 根据服务器节点显示守军或宝箱，未遇见的敌人不能参与预览。 */
    private openStage(stageId: number): void {
        void UIManager.instance.openChild(this, TrialStageView, {
            stageId,
            formation: () => this.openFormation(stageId),
        }).catch(() => { /* UIManager 负责开窗错误反馈。 */ });
    }

    /** 复用正式阵容窗，保存试炼独立阵型并以同一个可战节点发起挑战。 */
    private openFormation(stageId: number): void {
        const controller = TrialController.instance;
        controller.loadAssistance();
        void UIManager.instance.openChild(this, FormationView, {
            title: "勇者试炼出阵",
            closeAfterSave: true,
            formation: {
                read: () => this.readFormation(),
                save: (draft, done) => controller.saveFormation(draft, done),
                watch: changed => EventDispatcher.instance.on("trial.updated", this, changed),
                additionalHeroes: () => TrialModel.instance.assistance?.selected.map(row => ({
                    id: row.heroId, templateId: row.templateId, level: row.level, star: row.star,
                })) ?? [],
                heroState: hero => this.lineupHeroState(hero),
                maxAdditionalHeroes: 1,
            },
            complete: confirmed => {
                if (confirmed && this.opened && TrialModel.instance.snapshot?.state.currentNode === stageId) {
                    controller.act("fight", { choice: stageId });
                }
            },
        }).catch(() => { /* UIManager 负责开窗错误反馈。 */ });
    }

    /** 使用角色已解锁的阵型定义，站位和版本只从试炼服务器进度读取。 */
    private readFormation(): MainFormation | null {
        const state = TrialModel.instance.snapshot?.state;
        const current = HeroRosterModel.instance.snapshot.mainFormation;
        if (!state?.difficulty || !current) {
            return null;
        }
        return { ...current, version: state.version, formationId: state.formationId, slots: state.slots,
            assistanceUnlocked: false, options: current.options?.map(row => ({
                formationId: row.formationId, openPositions: row.openPositions.filter(position => position < 9),
            })) };
    }

    /** 显示继承的剩余生命，同时阻止 Lv.40 以下及已败阵英雄加入新阵位。 */
    private lineupHeroState(hero: OwnedHero): { canDeploy: boolean; caption: string } {
        const hp = TrialModel.instance.snapshot?.state.heroHealth.find(row => row.heroId === hero.id);
        if (hero.level < 40) {
            return { canDeploy: false, caption: "Lv.40出阵" };
        }
        if (!hp) {
            return { canDeploy: true, caption: "100%" };
        }
        const percent = hp.maxHp > 0 ? Math.ceil(100 * hp.hp / hp.maxHp) : 0;
        return { canDeploy: hp.hp > 0, caption: `${percent}%` };
    }

    /** 显示旧版正式帮助；缺少语言配置时沿用该玩法已验证规则。 */
    private rules(): void {
        const config = GameConfig.instance;
        const title = config.getConfig(GConfig.Language, 42022)?.value ?? "勇者试炼";
        const message = config.getConfig(GConfig.Language, 42023)?.value
            ?? "每日 0 点刷新。每天可选一次难度，逐关挑战并领取宝箱。双方英雄的剩余生命带入下一场。";
        void UIManager.instance.openChild(this, RulesView, { title, message: message.replace(/\\n/g, "\n") })
            .catch(() => { /* 统一反馈。 */ });
    }

    /** 打开独立好友助战弹窗。 */
    private support(): void {
        void UIManager.instance.openChild(this, TrialSupportView, undefined).catch(() => { /* 统一反馈。 */ });
    }

    /** 进入已结算的正式战场，战报失败时仍以冻结胜负展示结果。 */
    private playBattle(battle: TrialBattle, bytes: Uint8Array): void {
        UIManager.instance.closeChildren(this);
        this.activeBattleId = battle.battleId;
        this.displayedBattleId = battle.battleId;
        this.map!.node.active = false;
        this.battleBackground!.node.active = true;
        this.battleHost!.active = true;
        AudioPreferences.playMusic(this.battleMusic!);
        const current = () => this.opened && this.activeBattleId === battle.battleId;
        void BattleReplayPreview.open(this.battleHost!, bytes, false, undefined, undefined, "勇者试炼",
            true, () => this.settle(battle, bytes), false, () => !current(), undefined, undefined, "勇者试炼阵容",
            () => { void this.settle(battle, bytes); }).then(stop => {
            if (current()) {
                this.stopReplay = stop;
            } else {
                stop();
            }
        }, error => {
            if (current()) {
                GameLog.shared.classified("MODULE", "warn", "TrialView", `试炼关卡 ${battle.node} 战报播放失败：${String(error)}`);
                void this.settle(battle, bytes);
            }
        });
    }

    /** 按服务器报告展示真实胜负、奖励和战斗统计，关掉结算返回最新地图。 */
    private async settle(battle: TrialBattle, bytes: Uint8Array): Promise<void> {
        if (!this.opened || this.settling || this.activeBattleId !== battle.battleId) {
            return;
        }
        this.settling = true;
        const close = () => this.returnFromBattle(battle.battleId);
        try {
            const { units, names } = BattleReplayUtils.parse(bytes);
            const rewards = TrialModel.instance.battleRewards(battle.battleId);
            await UIManager.instance.openChild(this, ChapterEndView, {
                units, names, rewards, won: battle.won, settledBattle: true,
                notice: rewards.length ? "本次获得" : "战报已保存",
                onClosed: close,
            });
        } catch {
            close();
        }
    }

    /** 同一结算只还原一次，回到地图后使用新关卡和继承生命。 */
    private returnFromBattle(battleId: string): void {
        if (this.opened && this.activeBattleId === battleId) {
            this.stopBattle();
            this.paint();
            TrialController.instance.closeBattle(battleId);
        }
    }

    /** 清除场景播放，再恢复独立页面，取消所有迟到的挂载。 */
    private stopBattle(): void {
        this.activeBattleId = null;
        this.settling = false;
        this.stopReplay?.();
        this.stopReplay = null;
        if (this.map && this.battleHost && this.battleBackground) {
            this.map.node.active = true;
            this.battleHost.active = false;
            this.battleBackground.node.active = false;
        }
    }
}
