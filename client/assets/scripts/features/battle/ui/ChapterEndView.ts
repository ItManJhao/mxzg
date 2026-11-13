/**
 * 主线结算展示：正式胜利复用旧BattleEnd布局，失败与只读演示保留ChapterEnd底板。
 * 由 UIManager 打开，展示已验证战报结果和控制器确认的奖励；不自行请求结算、不发奖、不开放养成跳转。
 * 最高伤害、经验动画和统计入口只消费冻结快照；旧战报缺数据时明确显示缺失。
 */
import {
    _decorator, AudioSource, Button, Label, Node, Sprite, SpriteFrame,
    tween, Tween, UIOpacity, UITransform, Vec3,
} from "cc";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import type { BagItemData } from "../../bag/data/BagItemDataUtils";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagInfoArgs, BagInfoView } from "../../bag/ui/BagInfoView";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { UIManager } from "../../../framework/ui/UIManager";
import { GameLog } from "../../../core/GameLog";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { BattleSpineService } from "./BattleSpineService";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BattleInfoUtils } from "../utils/BattleInfoUtils";
import { ChapterSettlementUtils } from "../utils/ChapterSettlementUtils";
import { BattleReplayUnit } from "../utils/BattleReplayUtils";
import { MainChapterExperience } from "../MainChapterModel";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import { BattleDetailLayer } from "./BattleDetailLayer";

const { ccclass, property } = _decorator;

/** 展示结果由调用方提供；奖励只允许使用服务端确认回执，关闭通知不修改资产。 */
export interface ChapterEndArgs {
    /** 本场冻结的双方名称；旧战报或只读演示可缺失，不用当前昵称补齐。 */
    names?: Readonly<{ attacker: string | null; defender: string | null }>;
    /** 经过战报校验的我方胜负；独立失败样式验收须明确标注。 */
    won: boolean;
    /** 区分真实主线与只读技能/GM演示。 */
    persistentChapter?: boolean;
    /** true 表示仅验收失败样式，不宣称为真实失败战报。 */
    presentationOnly?: boolean;
    /** 主线控制器确认的本次奖励；只读试战不传入。 */
    rewards?: readonly { itemId: number; quantity: number }[];
    /** 已校验战报名册与服务端统计；不使用当前英雄属性反推历史排名。 */
    units?: readonly BattleReplayUnit[];
    /** 此战报对应结算回执的历史经验，缺失时不播放虚构动画。 */
    experience?: MainChapterExperience;
    /** 应用唯一角色状态提供的当前头像；不用于历史经验或英雄排名。 */
    roleAppearance?: { headId: number; borderId: number } | null;
    /** 已结算或待恢复说明，不以客户端播放结果伪造奖励。 */
    notice?: string;
    /** 结果窗口关闭后通知主线返回主页；不触发结算。 */
    onClosed?: () => void;
}

@UIRegistry.view({
    id: "chapter-end",
    prefab: "bundles/module/battle/prefabs/ChapterEndView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ChapterEndView")
export class ChapterEndView extends BaseView<ChapterEndArgs> {
    /** 旧 640×400 主体，负责入场缩放与淡入。 */
    @property(Node) panel: Node | null = null;
    /** 旧BattleEnd静态胜利布局；仅正常主线胜利启用，失败布局独立保留。 */
    @property(Node) mainVictoryPanel: Node | null = null;
    /** 胜利 chibang 骨骼挂点，随窗口销毁。 */
    @property(Node) victory: Node | null = null;
    /** 失败翅膀静态资源，旧版失败分支没有胜利骨骼。 */
    @property(Node) defeatWing: Node | null = null;
    /** 失败标题，使用旧语言资源。 */
    @property(Node) defeatTitle: Node | null = null;
    /** 失败原因与四个只读养成图标，禁止跳转。 */
    @property(Node) defeatContent: Node | null = null;
    /** 无奖励数据时明确提示只读，不显示虚构物品。 */
    @property(Node) readonlyNotice: Node | null = null;
    /** 胜利关闭提示或失败倒计时。 */
    @property(Label) closeHint: Label | null = null;
    /** 旧主线eff_battle_end序列帧挂点；只读演示仍使用原奖励彩带，失败不播放。 */
    @property(Sprite) confetti: Sprite | null = null;
    /** 真实奖励列表；普通底板横排、主线胜利四列，布局与格子预制体由Prefab维护。 */
    @property(SuperScroll) rewardScroll: SuperScroll | null = null;
    /** 本窗口音源；关闭立即停止，不影响战场背景音。 */
    private audio: AudioSource | null = null;
    /** 主线胜利额外音效，独立音源便于关页立即停止，不修改全局音乐。 */
    private mainAudio: AudioSource | null = null;
    /** 关闭后为 true，拒绝迟到的资源播放；不涉及网络会话隔离。 */
    private released = false;
    /** 剩余关闭秒数；开页时胜利设4、失败设5，资源就绪后每秒递减，关闭取消定时器。 */
    private seconds = 5;
    /** 本次已加载的结算帧，关闭清空引用。 */
    private frames: SpriteFrame[] = [];
    /** 当前结算帧序号，播放一遍后隐藏。 */
    private frameIndex = 0;
    /** 当前视口下主体等比缩放值；重排时更新，入场动画按此值结束。 */
    private panelScale = 1;
    /** 已确认真实主线胜利时启用四秒关闭；结算未确认或只读演示不自动关闭。 */
    private victoryCountdown = false;
    /** 本页经验动画已推进的0.1秒步数，关闭停止调度。 */
    private experienceTick = 0;
    /** 本页加载的同源等级门槛，键为等级、值为升级所需经验；仅跨级动画读取。 */
    private experienceThresholds = new Map<number, number>();
    /** 本窗口奖励的只读显示索引，打开有奖励时创建，关闭清空；不持有库存。 */
    private rewardCatalog: BagItemCatalog | null = null;

    /** 绑定确认关闭并异步准备表现；原空白关闭由ViewSpec共享模态转交，不请求结算。 */
    public onOpen(args?: ChapterEndArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.victory || !this.defeatWing || !this.defeatTitle
            || !this.defeatContent || !this.readonlyNotice || !this.closeHint || !this.confetti) {
            throw new Error("主线结算参数或预制体绑定缺失");
        }
        this.beginOpen();
        this.released = false;
        if (args.persistentChapter && args.won) {
            this.bindMainVictory();
        }
        if (this.rewardScroll) {
            const content = this.rewardScroll.list.node;
            content.on(SuperContent.RENDER_ITEM, this.onRewardRender, this);
            content.on(SuperContent.SELECT_ITEM, this.onRewardSelect, this);
            this.ownListener(() => {
                if (content.isValid) {
                    content.off(SuperContent.RENDER_ITEM, this.onRewardRender, this);
                    content.off(SuperContent.SELECT_ITEM, this.onRewardSelect, this);
                }
            });
        }
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport());
        this.victoryCountdown = !!args.persistentChapter && args.won && (args.rewards?.length || 0) > 0;
        this.victory.active = args.won;
        this.defeatWing.active = !args.won;
        this.defeatTitle.active = !args.won;
        this.defeatContent.active = !args.won;
        this.readonlyNotice.active = args.won;
        const notice = this.readonlyNotice.getComponent(Label) || this.readonlyNotice.getComponentInChildren(Label);
        if (notice && args.persistentChapter) {
            notice.string = args.notice || "战报已保存";
        }
        this.showRewards(args);
        this.seconds = this.victoryCountdown ? 4 : 5;
        this.closeHint.string = args.won && !this.victoryCountdown ? "点击空白处关闭" : this.seconds + " 秒后关闭";
        if (args.presentationOnly) {
            this.closeHint.string = "失败样式验收 · 5 秒后关闭";
        }
        const close = () => this.close();
        const confirm = this.mainVictoryPanel?.active
            ? this.panel.getChildByPath("VictoryButtons/ConfirmButton")! : this.panel.getChildByName("ConfirmButton")!;
        confirm.active = !!args.persistentChapter && args.won;
        if (confirm.active) {
            const anchor = this.panel.getChildByName(this.mainVictoryPanel?.active ? "MainVictoryCloseHintAnchor" : "VictoryCloseHintAnchor")!;
            this.closeHint.node.setPosition(anchor.position);
        }
        confirm.on(Button.EventType.CLICK, close);
        this.ownListener(() => {
            if (confirm.isValid) {
                confirm.off(Button.EventType.CLICK, close);
            }
        });
        void this.prepare(args).then(() => {
            if (!this.released) {
                this.finishOpen();
            }
        }).catch(error => {
            if (!this.released) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 切换到旧胜利布局并隐藏加载内容，资源就绪后统一淡入；统计按钮打开独立只读弹层。 */
    private bindMainVictory(): void {
        if (!this.mainVictoryPanel) {
            throw new Error("主线胜利预制体绑定缺失");
        }
        this.panel!.active = false;
        this.mainVictoryPanel.active = true;
        this.panel = this.mainVictoryPanel;
        // 头像、骨骼和经验均异步准备，避免先露出空白文案与默认满经验条。
        this.panel.getComponent(UIOpacity)!.opacity = 0;
        this.victory = this.panel.getChildByName("MainVictoryAnimation");
        this.readonlyNotice = this.panel.getChildByName("MainVictoryNotice");
        this.closeHint = this.panel.getChildByName("CloseHint")!.getComponent(Label);
        this.confetti = this.panel.getChildByName("MainVictoryConfetti")!.getComponent(Sprite);
        this.rewardScroll = this.panel.getChildByName("MainVictoryRewards")!.getComponent(SuperScroll);
        const reportButton = this.panel.getChildByPath("VictoryButtons/ReportButton")!;
        reportButton.on(Button.EventType.CLICK, this.openStatistics, this);
        this.ownListener(() => {
            if (reportButton.isValid) {
                reportButton.off(Button.EventType.CLICK, this.openStatistics, this);
            }
        });
    }

    /** 打开本场冻结统计；沿旧版独立弹层，结算倒计时继续，已打开统计不会随其关闭。 */
    private openStatistics(): void {
        if (this.released || !this.args?.units?.length) {
            return;
        }
        void UIManager.instance.open(BattleDetailLayer, { units: this.args.units, won: this.args.won, names: this.args.names }).catch(() => {
            // UIManager已统一记录打开失败及玩家提示，不重复打印或伪装打开成功。
        });
    }

    /** 主体按视口等比收窄，不累计缩放；全屏遮罩由UIManager统一持有。 */
    private fitViewport(): void {
        if (this.released || !this.panel) {
            return;
        }
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.panelScale = BattleInfoUtils.contentScale(box.width);
        Tween.stopAllByTarget(this.panel);
        this.panel.setScale(this.panelScale, this.panelScale, 1);
        this.panel.setPosition(-320 * this.panelScale, (this.mainVictoryPanel?.active ? -365 : -200) * this.panelScale, 0);
    }

    /** 只绘制已确认奖励，并复用背包物品说明；展示本次数量而非库存余额。 */
    private showRewards(args: ChapterEndArgs): void {
        if (!this.rewardScroll) {
            return;
        }
        const rewards = args.persistentChapter && args.won
            ? (args.rewards || []).filter(row => row.quantity > 0) : [];
        this.rewardScroll.node.active = rewards.length > 0;
        if (!rewards.length) {
            return;
        }
        this.rewardScroll.validateBindings();
        this.rewardCatalog = new BagItemCatalog(GameConfig.instance.getFile(GConfig.Item), GameConfig.instance.getFile(GConfig.Language));
        this.rewardScroll.list.setData(rewards);
        this.rewardScroll.toStart();
    }

    /** 奖励列表创建或复用格子时只绘制当前回执条目，不传页面回调。 */
    private onRewardRender(node: Node, reward: Readonly<BagItemData>): void {
        if (this.released) {
            return;
        }
        const cell = node.getComponent(BagItemView);
        if (!cell || !this.rewardCatalog) {
            throw new Error("奖励格子组件或显示配置缺失");
        }
        cell.show(reward, false, this.rewardCatalog.face(reward.itemId, reward.quantity));
    }

    /** 选择本次回执中的当前奖励打开只读说明，展示本次数量，不读取或修改库存。 */
    private onRewardSelect(reward: Readonly<BagItemData>): void {
        if (this.released || !this.rewardCatalog) {
            return;
        }
        const args: BagInfoArgs = {
            source: "description",
            face: { ...this.rewardCatalog.face(reward.itemId, reward.quantity), typeLine: "本次获得：" + reward.quantity },
        };
        void UIManager.instance.open(BagInfoView, args).then(info => {
            if (!this.released) {
                info.runOpen(args);
            }
        }).catch(() => { /* 加载失败或取消由UIManager统一处理。 */ });
    }

    /** 预载胜负音频；真实主线胜利使用旧14帧光效与双音源，失败不播放胜利光效。 */
    private async prepare(args: ChapterEndArgs): Promise<void> {
        const assets = ResourceAssetsUtils.forNode(this.node);
        const clipPromise = assets.loadPath("audio/battle-end-" + (args.won ? "1" : "0"), "AudioClip");
        const mainVictory = !!args.persistentChapter && args.won;
        const mainClipPromise = mainVictory ? assets.loadPath("audio/battle-main-end-1", "AudioClip") : Promise.resolve(null);
        const framesPromise = Promise.all(Array.from({ length: args.won ? (mainVictory ? 14 : 11) : 0 }, (_, index) =>
            assets.loadPath((mainVictory ? "battle/ui/battle-end_effect-" : "common/ui/item-reward-effect-2_effect-bomb-")
                + index + "/spriteFrame", "SpriteFrame")));
        const [clip, frames, mainClip] = await Promise.all([clipPromise, framesPromise, mainClipPromise]);
        if (this.released || !this.node.isValid) {
            return;
        }
        if (args.won) {
            await new Promise<void>((resolve, reject) => BattleSpineService.instance.mountNamedSpine(this.victory!, "chibang", "idle", {
                loop: true, onReady: resolve, onFail: () => reject(new Error("主线胜利翅膀加载失败"))
            }));
        }
        if (mainVictory && !this.released) {
            await this.prepareMainVictory(args);
        }
        if (this.released || !this.node.isValid) {
            return;
        }
        this.frames = frames;
        this.frameIndex = 0;
        this.confetti!.sizeMode = Sprite.SizeMode.RAW;
        this.confetti!.spriteFrame = frames[0] || null;
        this.confetti!.node.active = frames.length > 0;
        if (mainVictory) {
            const anchor = this.panel!.getChildByName("MainVictoryEffectAnchor")!;
            this.confetti!.node.setPosition(anchor.position);
            this.confetti!.node.setScale(anchor.scale);
        }
        if (frames.length > 0) {
            this.schedule(this.advanceConfetti, mainVictory ? 0.06 : 0.08);
        }
        this.panel!.setScale(1.01 * this.panelScale, 1.01 * this.panelScale, 1);
        tween(this.panel!).to(0.15, { scale: new Vec3(this.panelScale, this.panelScale, 1) }, { easing: "backOut" }).start();
        const opacity = this.panel!.getComponent(UIOpacity)!;
        opacity.opacity = 0;
        tween(opacity).to(0.08, { opacity: 255 }).start();
        this.audio = this.node.getComponent(AudioSource) || this.node.addComponent(AudioSource);
        this.audio.clip = clip;
        const onAudioStarted = () => GameLog.shared.classified("MODULE", "info", "ChapterEndView", "audio.started " + clip.name);
        this.node.on(AudioSource.EventType.STARTED, onAudioStarted);
        this.ownListener(() => {
            if (this.node?.isValid) {
                this.node.off(AudioSource.EventType.STARTED, onAudioStarted);
            }
        });
        this.audio.play();
        if (mainClip) {
            this.mainAudio = this.node.addComponent(AudioSource);
            this.mainAudio.clip = mainClip;
            this.mainAudio.play();
        }
        if (!args.won || this.victoryCountdown) {
            this.schedule(this.tickClose, 1);
        }
        GameLog.shared.classified("MODULE", "info", "ChapterEndView",
            "结算展示 " + (args.won ? "胜利" : "失败") + " sound=" + clip.name
            + " mainSound=" + (mainClip?.name || "none") + " presentationOnly=" + !!args.presentationOnly);
    }

    /** 加载展示配置并按冻结头像映射最高伤害英雄骨骼；历史外观缺失标注基础外观，不查当前名册或资产。 */
    private async prepareMainVictory(args: ChapterEndArgs): Promise<void> {
        const assets = ResourceAssetsUtils.forNode(this.node);
        const [heroes, levels, skins, evolutions] = await Promise.all([
            assets.loadPath("config/herotype", "JsonAsset"),
            assets.loadPath("config/mainlevel", "JsonAsset"),
            assets.loadPath("config/skin", "JsonAsset"),
            assets.loadPath("config/heroevolvelevel", "JsonAsset"),
        ]);
        if (this.released || !this.node.isValid) {
            return;
        }
        const best = ChapterSettlementUtils.highestDamage(args.units || []);
        const panel = this.panel!;
        if (args.roleAppearance) {
            RolePortraitUtils.paint(panel.getChildByName("RolePortrait"), panel.getChildByName("RolePortraitBorder"),
                args.roleAppearance.headId, args.roleAppearance.borderId);
        }
        const heroName = panel.getChildByName("HeroName")!.getComponent(Label)!;
        const damage = panel.getChildByName("HeroDamage")!.getComponent(Label)!;
        const host = panel.getChildByName("HighestHero")!;
        host.active = !!best;
        if (best) {
            const template = (heroes.json as { rows: { type: number; note: string }[] }).rows.find(row => row.type === best.templateId);
            const historicalSpine = ChapterSettlementUtils.historicalSpine(best.portraitIconId ?? null,
                (skins.json as { rows: { skin: string }[] }).rows,
                (evolutions.json as { rows: { evolve_icon_id: number; evolve_fashion_id: number }[] }).rows);
            heroName.string = (template?.note || "英雄 " + best.templateId)
                + (historicalSpine === null ? "\n历史外观缺失" : "");
            damage.string = String(best.totalDamage);
            await new Promise<void>((resolve, reject) => BattleSpineService.instance.mountNamedSpine(host, historicalSpine || String(best.templateId), "stand", {
                loop: true, onReady: resolve, onFail: () => reject(new Error("最高伤害英雄骨骼加载失败")),
            }));
        } else {
            heroName.string = "旧战报未记录统计";
            damage.string = "—";
        }
        if (this.released || !this.node.isValid) {
            return;
        }
        this.experienceThresholds = new Map((levels.json as { rows: { level: number; exp: number }[] }).rows.map(row => [row.level, row.exp]));
        this.experienceTick = 0;
        this.paintExperience(0);
        if (args.experience) {
            this.schedule(this.advanceExperience, 0.1);
        }
    }

    /** 按旧0.1秒节奏推进1秒动画；窗口关闭统一取消，不写角色等级或经验。 */
    private advanceExperience(): void {
        this.experienceTick++;
        this.paintExperience(Math.min(1, this.experienceTick / 10));
        if (this.experienceTick >= 10) {
            this.unschedule(this.advanceExperience);
        }
    }

    /** 仅更新静态经验条填充比例及文字，终值严格来自历史结算回执。 */
    private paintExperience(progress: number): void {
        const panel = this.panel!;
        const level = panel.getChildByName("RoleLevel")!.getComponent(Label)!;
        const text = panel.getChildByName("RoleExperience")!.getComponent(Label)!;
        const fill = panel.getChildByName("ExperienceFill")!;
        const snapshot = this.args?.experience;
        fill.active = !!snapshot;
        if (!snapshot) {
            level.string = "经验记录缺失";
            text.string = "—";
            return;
        }
        const frame = ChapterSettlementUtils.experienceFrame(snapshot, progress, value => this.experienceThresholds.get(value) || 0);
        level.string = "Lv " + frame.level;
        text.string = frame.threshold ? frame.exp + "/" + frame.threshold : "等级已满";
        fill.getComponent(Sprite)!.fillRange = frame.ratio;
    }

    /** 按各自旧effect2间隔推进一帧，结束隐藏而不保留尾帧。 */
    private advanceConfetti(): void {
        this.frameIndex++;
        if (this.frameIndex >= this.frames.length) {
            this.unschedule(this.advanceConfetti);
            this.confetti!.node.active = false;
            return;
        }
        this.confetti!.spriteFrame = this.frames[this.frameIndex];
    }

    /** 失败按旧LoseCell五秒关闭，主线胜利按BattleEnd先减一次后四秒关闭；暂停时同步暂停。 */
    private tickClose(): void {
        this.seconds--;
        if (this.seconds <= 0) {
            this.close();
            return;
        }
        this.closeHint!.string = (this.args?.presentationOnly ? "失败样式验收 · " : "") + this.seconds + " 秒后关闭";
    }

    /** 统一关闭释放动画、音频与定时器；兼容引擎先销毁子节点再调用父组件onDestroy，不访问失效节点。 */
    public onClose(): void {
        if (this.released) {
            return;
        }
        this.released = true;
        UIManager.instance.closeById(UIRegistry.viewSpecOf(BagInfoView)!.id);
        this.unscheduleAllCallbacks();
        if (this.audio?.isValid) {
            this.audio.stop();
            this.audio.clip = null;
        }
        if (this.mainAudio?.isValid) {
            this.mainAudio.stop();
            this.mainAudio.clip = null;
        }
        if (this.confetti?.isValid) {
            this.confetti.spriteFrame = null;
        }
        this.frames = [];
        this.experienceThresholds.clear();
        this.rewardCatalog = null;
        if (this.panel?.isValid) {
            Tween.stopAllByTarget(this.panel);
            const opacity = this.panel.getComponent(UIOpacity);
            if (opacity) {
                Tween.stopAllByTarget(opacity);
            }
        }
        this.finishOpen();
        this.args?.onClosed?.();
    }
}
