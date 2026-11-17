/**
 * 主线常显里程碑卡：沿旧最小未领配置显示奖励预览、绝对关卡进度和达成领取。
 * 领取按钮直接交应用稳定键入口，不增加确认弹窗、图鉴或另一条奖励表现。
 * 结构和样式保存在主线Prefab，停用/销毁清理监听，事务及持久恢复不随卡片关闭取消。
 */
import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { UIManager } from "../../../framework/ui/UIManager";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
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
    /** 显示进度、可领取或原请求待恢复。 */
    @property(Label) claimLabel: Label | null = null;
    /** 退页/停用时撤销的主线事件，不重复订阅。 */
    private stop: (() => void) | null = null;
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

    /** 启用时登记一次交互与主线状态，直接读取登录后已安装配置。 */
    protected onEnable(): void {
        if (!this.rewardIcon || !this.heroHost || !this.progressFill || !this.rewardName
                || !this.progressLabel || !this.claimButton || !this.claimLabel) {
            throw new Error("主线常显里程碑卡静态绑定缺失");
        }
        this.claimButton.node.on(Button.EventType.CLICK, this.claim, this);
        this.stop = EventDispatcher.instance.on(MainChapterController.Updated, () => this.render());
        this.render();
    }

    /** 停用只撤显示回调，不取消原领取或清应用持久意图。 */
    protected onDisable(): void {
        this.stop?.();
        this.stop = null;
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
        const pending = model.milestoneClaim;
        const recovering = pending.rewardId !== null && pending.phase !== "confirmed";
        this.rewardId = recovering ? pending.rewardId : hint.kind === "complete" ? null
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
        this.claimLabel!.string = this.intent || pending.phase === "delivering" ? "确认中"
            : recovering ? "恢复领取" : reached ? "领取奖励" : "第" + row.chapter + "关奖励";
        this.claimButton!.interactable = !this.intent && pending.phase !== "delivering";
    }

    /** 旧卡直接领奖；未达标只提示剩余关数，不增加通用确认框或图鉴跳转。 */
    private async claim(): Promise<void> {
        if (this.intent || this.rewardId == null) { return; }
        const id = this.rewardId;
        const model = MainChapterModel.instance;
        const pending = model.milestoneClaim;
        const row = GameConfig.instance.requireConfig(GConfig.ChapterExtraReward, id);
        if (pending.rewardId === null || pending.phase === "confirmed") {
            if (!model.state || model.state.maxCleared < row.chapter) {
                UIManager.instance.toast("再通关" + (row.chapter - (model.state?.maxCleared || 0)) + "关可领取奖励");
                return;
            }
        }
        const entry = MainChapterController.instance.requestMilestoneClaim;
        if (!entry) { UIManager.instance.toast("通关奖励正在准备，请稍后重试"); return; }
        const intent = {};
        this.intent = intent;
        this.render();
        try {
            await entry(id, intent);
        } catch (error) {
            if (this.intent === intent) {
                UIManager.instance.toast(error instanceof Error ? error.message : "通关奖励仍待确认，请重试");
            }
        } finally {
            if (this.intent === intent) {
                this.intent = null;
                this.render();
            }
        }
    }
}
