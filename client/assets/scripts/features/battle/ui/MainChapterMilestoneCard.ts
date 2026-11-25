/**
 * 主线常显里程碑卡：沿旧最小未领配置显示奖励预览、绝对关卡进度和达成领取。
 * 领取按钮提交当前配置编号，服务端快照更新已领取的目标。
 * 结构和样式保存在主线 Prefab，停用时清理本页监听。
 */
import { _decorator, Button, Component, Label, Node, RichText, Sprite, SpriteFrame } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { UIManager } from "../../../framework/ui/UIManager";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResManager } from "../../../framework/assets/ResManager";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { MainChapterController } from "../MainChapterController";
import { MainChapterModel } from "../MainChapterModel";
import { ChapterMilestoneUtils } from "../utils/ChapterMilestoneUtils";
import { HeroTalkUtils } from "../utils/HeroTalkUtils";
import { BattleSpineService } from "./BattleSpineService";
import type { SpineActor } from "./BattleSpineService";

const { ccclass, property } = _decorator;

@ccclass("MainChapterMilestoneCard")
export class MainChapterMilestoneCard extends Component {
    /** 原奖励预览图，不作为本次获得或当前英雄名册。 */
    @property(Sprite) rewardIcon: Sprite | null = null;
    /** 原英雄模型静态挂点，骨架复用BattleSpineService，不创建第二份资源池。 */
    @property(Node) heroHost: Node | null = null;
    /** 模型后的淡光，等待主线同步时隐藏。 */
    @property(Node) rewardGlow: Node | null = null;
    /** 原进度填充，比例来自最新绝对通关数/目标。 */
    @property(Sprite) progressFill: Sprite | null = null;
    /** 模型上方的原奖励定位图，由当前配置的 tip_img 选帧。 */
    @property(Sprite) tipArtwork: Sprite | null = null;
    /** 原定位图静态帧，按 tip_img 从 1 开始排列。 */
    @property([SpriteFrame]) tipFrames: SpriteFrame[] = [];
    /** 原通关说明横条，达成后随说明一起隐藏。 */
    @property(Node) tipBackdrop: Node | null = null;
    /** 进度下方的原通关说明，保留配置中奖励名称和关卡颜色。 */
    @property(RichText) progressTip: RichText | null = null;
    /** 原绝对通关数/目标，仅未达到时显示。 */
    @property(Label) progressLabel: Label | null = null;
    /** 仅在达标时显示，点击后直接提交当前里程碑配置号。 */
    @property(Button) claimButton: Button | null = null;
    /** 按钮原图，自带领取字样，发送后隐藏以免覆盖确认中提示。 */
    @property(Sprite) claimArtwork: Sprite | null = null;
    /** 发出领取后覆盖按钮原字样，等待回执期间显示确认中。 */
    @property(Label) claimLabel: Label | null = null;
    /** 达标待领取提醒的可选定位节点，保留原按钮相对位置。 */
    @property(Node) claimDotAnchor: Node | null = null;
    /** 退页/停用时撤销的主线事件，不重复订阅。 */
    private stop: (() => void) | null = null;
    /** 当前卡片启用期间的动态红点，停用时释放。 */
    private claimRedDot: RedDotBinding | null = null;
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

    /** 启用时登记交互、主线状态和可选红点，直接读取登录后已安装配置。 */
    protected onEnable(): void {
        if (!this.rewardIcon || !this.heroHost || !this.rewardGlow || !this.progressFill || !this.tipArtwork
                || !this.tipFrames.length || !this.tipBackdrop || !this.progressTip || !this.progressLabel
                || !this.claimButton || !this.claimArtwork || !this.claimLabel) {
            throw new Error("主线常显里程碑卡静态绑定缺失");
        }
        this.claimButton.node.on(Button.EventType.CLICK, this.claim, this);
        this.stop = EventDispatcher.instance.on(MainChapterController.Updated, () => this.render());
        if (this.claimDotAnchor) {
            this.claimRedDot = RedDotBinding.atAnchor(this.claimDotAnchor, GameRedDotKey.CHAPTER_MILESTONE);
        }
        this.render();
    }

    /** 停用时撤销红点、主线及仍存活的按钮监听，领取结果仍由应用接收。 */
    protected onDisable(): void {
        this.stop?.();
        this.stop = null;
        this.claimRedDot?.dispose();
        this.claimRedDot = null;
        this.intent = null;
        this.clearRewardDisplay();
        const claimNode = this.claimButton?.node;
        if (claimNode?.isValid) {
            claimNode.off(Button.EventType.CLICK, this.claim, this);
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
        if (hint.kind !== "target" || this.rewardId == null) {
            this.clearRewardDisplay();
            this.rewardGlow!.active = false;
            this.tipArtwork!.node.active = false;
            this.progressTip!.string = this.rewardId === null ? "" : "进度奖励同步中";
            this.tipBackdrop!.active = !this.completed;
            this.progressTip!.node.active = !this.completed;
            this.progressLabel!.string = "";
            this.progressFill!.node.parent!.active = false;
            this.claimButton!.interactable = false;
            this.claimButton!.node.active = false;
            if (this.completed) {
                this.node.active = false;
            }
            return;
        }
        const row = GameConfig.instance.requireConfig(GConfig.ChapterExtraReward, this.rewardId);
        const tipFrame = this.tipFrames[row.tip_img - 1];
        this.tipArtwork!.spriteFrame = tipFrame ?? null;
        this.tipArtwork!.node.active = !!tipFrame;
        this.rewardGlow!.active = true;
        if (this.iconId !== row.show_model) {
            this.showRewardDisplay(row.show_model);
        }
        const cleared = state!.maxCleared;
        const reached = hint.remaining === 0;
        this.progressLabel!.string = reached ? "" : `${cleared}/${row.chapter}`;
        this.progressFill!.fillRange = Math.min(1, cleared / row.chapter);
        this.progressFill!.node.parent!.active = !reached;
        // 胜利页文案以剩余关数填占位，常显卡使用原目标关卡。
        const template = GameConfig.instance.getConfig(GConfig.Language, row.tips_lang)?.value;
        this.progressTip!.string = reached || !template ? ""
            : `<outline color=#41290a width=1>${HeroTalkUtils.richText(template.replace(/%[sd]/, String(row.chapter)))}</outline>`;
        this.tipBackdrop!.active = !reached;
        this.progressTip!.node.active = !reached;
        this.claimArtwork!.enabled = !this.intent;
        this.claimLabel!.node.active = !!this.intent;
        this.claimButton!.interactable = reached && !this.intent;
        this.claimButton!.node.active = reached;
    }

    /** 切换奖励模型并释放原骨架；旧道具贴图晚到时不覆盖当前目标。 */
    private showRewardDisplay(modelId: number): void {
        this.clearRewardDisplay();
        this.iconId = modelId;
        const hero = GameConfig.instance.requireConfig(GConfig.Item, modelId).type === 7;
        this.rewardIcon!.node.active = !hero;
        this.heroHost!.active = hero;
        if (hero) {
            // 旧Hero.cpp读取骨架时缩放0.5，再乘卡片的0.67*0.8*1.42。
            this.actor = BattleSpineService.instance.mountBattleSpine(this.heroHost!, String(modelId), () => {},
                { face: 1, scale: 0.5 * 0.67 * 0.8 * 1.42, seatY: 0 });
            this.actor.gesture("stand");
        } else {
            const face = BagItemCatalog.face(modelId, 1);
            ResManager.setSprite(this.rewardIcon!.node, [face.icon, face.fallback], () => this.isValid && this.iconId === modelId);
        }
    }

    /** 清空模型和道具展示归属，销毁骨架节点并使原贴图请求失效。 */
    private clearRewardDisplay(): void {
        this.actor?.node.destroy();
        this.actor = null;
        this.iconId = 0;
        if (this.rewardIcon?.node?.isValid) {
            this.rewardIcon.node.active = false;
            this.rewardIcon.spriteFrame = null;
        }
        if (this.heroHost?.isValid) {
            this.heroHost.active = false;
        }
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
