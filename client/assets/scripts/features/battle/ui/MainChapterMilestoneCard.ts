/**
 * 主线常显里程碑卡：沿旧最小未领配置显示奖励预览、绝对关卡进度和达成领取。
 * 领取按钮提交当前配置编号，服务端快照更新已领取的目标。
 * 结构和样式保存在主线 Prefab，停用时清理本页监听。
 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { RedDotManager } from "../../../framework/ui/RedDotManager";
import { UIManager } from "../../../framework/ui/UIManager";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterMilestoneUtils } from "../utils/ChapterMilestoneUtils";
import { BattleSpineService } from "./BattleSpineService";
import type { SpineActor } from "./BattleSpineService";

const { ccclass, property } = _decorator;

@ccclass("MainChapterMilestoneCard")
export class MainChapterMilestoneCard extends Component {
    /** 原奖励预览图，不作为本次获得或当前英雄名册。 */
    @property(Sprite) rewardIcon: Sprite | null = null;
    /** 原英雄模型静态挂点，骨架复用BattleSpineService，不创建第二份资源池。 */
    @property(Node) heroHost: Node | null = null;
    /** 原进度填充，比例来自最新绝对通关数/目标。 */
    @property(Sprite) progressFill: Sprite | null = null;
    /** 配置奖励名称与数量。 */
    @property(Label) rewardName: Label | null = null;
    /** 原绝对通关数/目标，仅未达到时显示。 */
    @property(Label) progressLabel: Label | null = null;
    /** 达标直接提交稳定业务键，未达标点击只提示剩余关数。 */
    @property(Button) claimButton: Button | null = null;
    /** 显示进度、可领取或正在等待回包。 */
    @property(Label) claimLabel: Label | null = null;
    /** 当前卡片奖励达到通关要求且未领取时显示的按钮红点。 */
    @property(Node) claimDot: Node | null = null;
    /** 退页/停用时撤销的主线事件，不重复订阅。 */
    private stop: (() => void) | null = null;
    /** 停用卡片时退出里程碑红点订阅，重新启用时立即同步。 */
    private stopRedDot: (() => void) | null = null;
    /** 当前原配置目标；undefined表示未同步，null表示全部已领。 */
    private rewardId: number | null | undefined;
    /** 卡片当前点击流程引用，停用后旧续段不改新卡。 */
    private intent: object | null = null;
    /** 本次显示的奖励ID，避免状态推送反复申请相同图片。 */
    private iconId = 0;
    /** 当前原奖励英雄骨架，目标变化或停用时销毁节点以撤回资源持有。 */
    private actor: SpineActor | null = null;

    /** 全部已领时由主线撤下常显卡；缺同步不等同于完成。 */
    public get completed(): boolean {
        return this.rewardId === null;
    }

    /** 启用时登记交互、主线状态和里程碑红点，直接读取登录后已安装配置。 */
    protected onEnable(): void {
        if (!this.rewardIcon || !this.heroHost || !this.progressFill || !this.rewardName
                || !this.progressLabel || !this.claimButton || !this.claimLabel || !this.claimDot) {
            throw new Error("主线常显里程碑卡静态绑定缺失");
        }
        this.claimButton.node.on(Button.EventType.CLICK, this.claim, this);
        this.stop = EventDispatcher.instance.on(MainChapterController.Updated, () => this.render());
        const claimDot = this.claimDot;
        this.stopRedDot = RedDotManager.instance.watch(GameRedDotKey.CHAPTER_MILESTONE, visible => {
            claimDot.active = visible;
        });
        this.render();
    }

    /** 停用时撤销红点和主线监听，领取结果仍由应用接收。 */
    protected onDisable(): void {
        this.stop?.();
        this.stop = null;
        this.stopRedDot?.();
        this.stopRedDot = null;
        this.intent = null;
        this.actor?.node.destroy();
        this.actor = null;
        this.iconId = 0;
        if (this.claimButton?.isValid) {
            this.claimButton.node.off(Button.EventType.CLICK, this.claim, this);
        }
    }

    /** 旧最小未领项达成后不跳项；未同步与全部已领明确区分，不从通关数猜集合。 */
    private render(): void {
        const model = MainChapterModel.instance;
        const state = model.state;
        const hint = ChapterMilestoneUtils.hint(state,
            () => GameConfig.instance.getConfig(GConfig.ChapterExtraReward),
            id => GameConfig.instance.getConfig(GConfig.Language, id)?.value);
        this.rewardId = hint.kind === "complete" ? null
            : hint.kind === "unavailable" ? undefined : hint.rewardId;
        if (this.rewardId == null) {
            this.rewardIcon!.node.active = false;
            this.heroHost!.active = false;
            this.rewardName!.string = this.rewardId === null ? "通关奖励已领完" : "通关奖励同步中";
            this.progressLabel!.string = "";
            this.claimLabel!.string = this.rewardId === null ? "已领取" : "等待同步";
            this.claimButton!.interactable = false;
            return;
        }
        const row = GameConfig.instance.requireConfig(GConfig.ChapterExtraReward, this.rewardId);
        const rewards = JSON.parse(row.reward) as { item_type: number; item_num: number }[];
        if (!Array.isArray(rewards) || !rewards.length || rewards.some(item =>
                !Number.isSafeInteger(item.item_type) || item.item_type <= 0
                || !Number.isSafeInteger(item.item_num) || item.item_num <= 0)) {
            throw new Error("主线里程碑奖励配置无效");
        }
        this.rewardName!.string = rewards.map(item => BagItemCatalog.face(item.item_type, item.item_num).title
            + " ×" + item.item_num).join("\n");
        if (this.iconId !== row.show_model) {
            this.iconId = row.show_model;
            this.actor?.node.destroy();
            this.actor = null;
            const face = BagItemCatalog.face(row.show_model, 1);
            ResManager.setSprite(this.rewardIcon!.node, [face.icon, face.fallback], () => this.isValid);
            const hero = GameConfig.instance.requireConfig(GConfig.Item, row.show_model).type === 7;
            this.rewardIcon!.node.active = !hero;
            this.heroHost!.active = hero;
            if (hero) {
                // 旧Hero.cpp读取原骨架时缩放0.5，再乘Cell的0.67*0.8*1.42；不使用战场默认0.58。
                this.actor = BattleSpineService.instance.mountBattleSpine(this.heroHost!, String(row.show_model), () => {},
                    { face: 1, scale: 0.5 * 0.67 * 0.8 * 1.42, seatY: 0 });
                this.actor.gesture("stand");
            }
        }
        const cleared = state?.maxCleared;
        const reached = cleared !== undefined && cleared >= row.chapter;
        this.progressLabel!.string = reached ? "" : "通关 " + (cleared ?? "?") + "/" + row.chapter;
        this.progressFill!.fillRange = Math.max(0, Math.min(1, (cleared || 0) / row.chapter));
        this.progressFill!.node.parent!.active = !reached;
        this.claimLabel!.string = this.intent ? "确认中" : reached ? "领取奖励" : "第" + row.chapter + "关奖励";
        this.claimButton!.interactable = !this.intent;
    }

    /** 达标后把领奖交给主线控制器，未达标时提示剩余关数。 */
    private async claim(): Promise<void> {
        if (this.intent || this.rewardId == null) { return; }
        const id = this.rewardId;
        const cleared = MainChapterModel.instance.state?.maxCleared ?? 0;
        const row = GameConfig.instance.requireConfig(GConfig.ChapterExtraReward, id);
        if (cleared < row.chapter) {
            UIManager.instance.toast("再通关" + (row.chapter - cleared) + "关可领取奖励");
            return;
        }
        const intent = {};
        this.intent = intent;
        this.render();
        try {
            await MainChapterController.instance.claimMilestone(id);
        } finally {
            if (this.intent === intent) {
                this.intent = null;
                this.render();
            }
        }
    }
}
