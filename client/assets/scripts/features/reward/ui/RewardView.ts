/**
 * 通用只读奖励窗：按旧ItemRewardLayer展示实际到账格子、标题光效、彩带及获得音效。
 * 静态结构保存在完整Prefab，列表使用SuperScroll；召唤汇总可转交再次召唤操作，本窗不发包或修改资产。
 */
import { _decorator, AudioSource, Button, Label, Node, Sprite, SpriteFrame, Tween, UIOpacity, UITransform, Vec3 } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { AudioPreferences } from "../../../core/AudioPreferences";
import { GameLog } from "../../../core/GameLog";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagInfoView } from "../../bag/ui/BagInfoView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import type { RepeatSummon, RewardArgs, RewardRow } from "../data/RewardData";
import { RewardUtils } from "../utils/RewardUtils";
import { HeroRewardView } from "./HeroRewardView";

declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 点再次召唤时交给召唤页面，照常复查消耗和确认。 */
        "summon.repeat": RepeatSummon;
    }
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "reward",
    prefab: "bundles/module/common/prefabs/RewardView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RewardView")
export class RewardView extends BaseView<RewardArgs> {
    /** 旧通用640×400奖励主体，位置、背景和节点样式由Prefab保存。 */
    @property(Node) panel: Node | null = null;
    /** 四列实际到账格子，Cell大小124×134保存在Prefab。 */
    @property(SuperScroll) rewards: SuperScroll | null = null;
    /** 唯一标题，十帧完整字样沿预制体中的位置循环闪光。 */
    @property(Sprite) titleEffect: Sprite | null = null;
    /** 上方十一帧单次彩带，原缩放2保存在Prefab。 */
    @property(Sprite) confetti: Sprite | null = null;
    /** 零实际到账的明确状态，不伪造奖励格。 */
    @property(Label) emptyLabel: Label | null = null;
    /** 唯一获得音源由Prefab绑定，关闭停止，不动态创建音源节点。 */
    @property(AudioSource) rewardAudio: AudioSource | null = null;
    /** 普通奖励的点击关闭说明；有召唤操作的汇总改用下方两个按钮。 */
    @property(Node) closeHint: Node | null = null;
    /** 召唤结果的再次召唤按钮，普通发奖时隐藏。 */
    @property(Button) repeatButton: Button | null = null;
    /** 召唤结果的确认按钮，关闭窗口并推进原反馈队列。 */
    @property(Button) confirmButton: Button | null = null;
    /** 召唤开场根节点，覆盖视口并接收点击跳过。 */
    @property(Node) summonIntro: Node | null = null;
    /** 召唤开场原场景背景，按屏幕等比铺满。 */
    @property(Sprite) summonBackdrop: Sprite | null = null;
    /** 位于屏幕底部的两路原召唤骨骼挂点。 */
    @property(Node) summonEffects: Node | null = null;
    /** 当前只读正到账行，换请求时替换、关闭时清空。 */
    private rows: readonly RewardRow[] = [];
    /** 当前窗口已打开的原请求，防止同编号重复onOpen重播动画或声音。 */
    private receiptId: string | null = null;
    /** 当前开窗准备代次，只隔离本页资源迟到，不比较角色身份。 */
    private preparation = 0;
    /** true表示页面已关闭，所有资源和格子回调停止展示。 */
    private released = true;
    /** 本次窗口持有的标题帧，资源引用由节点原有作用域管理。 */
    private titleFrames: readonly SpriteFrame[] = [];
    /** 本次窗口持有的单次彩带帧，播完隐藏、关闭清空。 */
    private confettiFrames: readonly SpriteFrame[] = [];
    /** 标题开始后的累计秒数，按旧每帧0.12秒循环。 */
    private titleSeconds = 0;
    /** 彩带开始后的累计秒数，按旧每帧0.08秒播一次。 */
    private confettiSeconds = 0;
    /** 召唤开场等待或已播放时间，骨骼就绪时归零。 */
    private introSeconds = 0;
    /** 两路骨骼、背景和音源就绪后，开场以原时长播放。 */
    private introReady = false;
    /** 当前回执窗口的关闭回调，结束时先取走，重复关闭和销毁不会重复交付。 */
    private closedCallback: (() => void) | undefined;
    /** 当前视口的主体目标比例，入场只放大1.01倍，不覆盖Prefab内部布局。 */
    private panelScale = 1;
    /** 普通奖励的行高从Prefab取得；十连汇总只缩紧行距，图标保持原尺寸。 */
    private rewardRowHeight = 0;
    /** 英雄详情准备期间占用入口，避免同一单实例弹窗收到不同英雄。 */
    private openingHeroDetails = false;
    /** 本回执已演出过的物品配置ID或英雄实例ID，虚拟格子重新渲染同一行时不重复入场。 */
    private readonly animatedItems = new Set<number | string>();
    /** 本窗口使用过的格子节点，关闭时统一停止其Tween；不持有物品资产。 */
    private readonly animatedNodes = new Set<Node>();
    /** 主体资源准备期间已绑定的格子及其当前行标识，显示主体后才启动初次入场。 */
    private readonly pendingCells = new Map<Node, number | string>();

    /** 实例首次绑定时登记列表、召唤操作及视口监听，不因同一窗口切换请求重复订阅。 */
    public onBind(): void {
        if (!this.panel || !this.rewards || !this.titleEffect || !this.confetti || !this.emptyLabel || !this.rewardAudio
            || !this.closeHint || !this.repeatButton || !this.confirmButton
            || !this.summonIntro || !this.summonBackdrop || this.summonEffects?.children.length !== 2) {
            throw new Error("奖励窗静态绑定缺失");
        }
        if (!this.panel.getComponent(UIOpacity)) {
            throw new Error("奖励窗主体缺少Prefab透明度组件");
        }
        const list = this.rewards.list;
        this.rewardRowHeight = list.explicitCellSize.height;
        const content = list.node;
        content.on(SuperContent.RENDER_ITEM, this.onRender, this);
        content.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.onRender, this);
                content.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
        });
        this.repeatButton.node.on(Button.EventType.CLICK, this.onRepeat, this);
        this.confirmButton.node.on(Button.EventType.CLICK, this.close, this);
        this.summonIntro.on(Node.EventType.TOUCH_END, this.close, this);
        this.ownListener(() => {
            if (this.repeatButton?.isValid) {
                this.repeatButton.node.off(Button.EventType.CLICK, this.onRepeat, this);
            }
            if (this.confirmButton?.isValid) {
                this.confirmButton.node.off(Button.EventType.CLICK, this.close, this);
            }
            if (this.summonIntro?.isValid) {
                this.summonIntro.off(Node.EventType.TOUCH_END, this.close, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport()));
    }

    /** 校验只读明细并等待展示资源；同编号重复打开保持当前画面，不重播获得反馈。 */
    public onOpen(args: RewardArgs): void {
        const rows = args.summonIntro ? [] : RewardUtils.rows(args);
        if (args.onClosed !== undefined && typeof args.onClosed !== "function") {
            throw new Error("奖励窗关闭回调无效");
        }
        if (!this.released && this.receiptId === args.receiptId) {
            if (JSON.stringify(rows) !== JSON.stringify(this.rows)) {
                throw new Error("同一奖励回执展示内容不一致");
            }
            this.closedCallback = args.onClosed ?? this.closedCallback;
            this.args = args;
            return;
        }
        if (!this.released) {
            throw new Error("当前奖励窗口尚未关闭，不能替换另一回执");
        }
        this.beginOpen();
        this.args = args;
        this.closedCallback = args.onClosed;
        this.released = false;
        this.receiptId = args.receiptId;
        this.rows = rows;
        this.animatedItems.clear();
        this.animatedNodes.clear();
        this.pendingCells.clear();
        this.panel!.active = false;
        if (this.rewardAudio!.isValid) {
            this.rewardAudio!.stop();
        }
        const preparation = ++this.preparation;
        this.summonIntro!.active = !!args.summonIntro;
        if (args.summonIntro) {
            this.summonEffects!.active = false;
            this.introReady = false;
            this.introSeconds = 0;
            this.fitViewport();
            this.finishOpen();
            void this.prepareSummonIntro(preparation).catch(error => {
                if (!this.released && preparation === this.preparation) {
                    // 可选开场资源出错时继续已提交奖励，不阻断真实结算。
                    GameLog.shared.classified("MODULE", "warn", "RewardView", "召唤开场资源加载失败：" + String(error));
                    this.close();
                }
            });
            return;
        }
        const list = this.rewards!.list;
        list.explicitCellSize.height = args.summonBatch ? 104 : this.rewardRowHeight;
        list.setData(rows);
        this.rewards!.toStart();
        this.emptyLabel!.node.active = rows.length === 0;
        this.repeatButton!.node.active = !!args.repeatSummon;
        this.confirmButton!.node.active = !!args.repeatSummon;
        this.closeHint!.active = !args.repeatSummon;
        void this.prepare(preparation).catch(error => {
            if (!this.released && preparation === this.preparation) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 实际到账物品显示数量；各召唤英雄显示自身星级的品质框和星标。 */
    private onRender(node: Node, row: RewardRow): void {
        if (this.released) {
            return;
        }
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("奖励Cell缺少BagItemView");
        }
        const face = BagItemCatalog.face(row.itemId, row.quantity);
        if (row.hero) {
            const { star, instanceId } = row.hero;
            cell.show({ itemId: row.itemId, quantity: 0 }, false,
                {
                    ...face,
                    icon: this.heroIcon(row.hero.templateId) ?? face.icon,
                    frame: ResManager.qualityFrame(Math.max(1, Math.min(star - 1, 4))),
                }, true);
            cell.shardStars.forEach((marker, index) => { marker.active = index < star; });
            this.animateCell(node, instanceId);
        } else {
            cell.show(row, false, face, true);
            this.animateCell(node, row.itemId);
        }
    }

    /** 召唤英雄先按英雄模板取头像，和英雄获得窗的取图口径一致。 */
    private heroIcon(templateId: number): string | null {
        const template = GameConfig.instance.getConfig(GConfig.HeroType, templateId);
        return template?.item_id ? ResManager.hero(template.item_id) : null;
    }

    /** 英雄详情一次打开一位，物品格打开本次数量简介；子窗随本窗关闭。 */
    private onSelect(row: RewardRow): void {
        if (this.released) {
            return;
        }
        if (row.hero) {
            const ui = UIManager.instance;
            if (this.openingHeroDetails || ui.isOpen(HeroRewardView)) {
                return;
            }
            this.openingHeroDetails = true;
            const release = () => { this.openingHeroDetails = false; };
            void ui.openChild(this, HeroRewardView, {
                receiptId: this.receiptId!,
                hero: row.hero,
            }).then(release, release);
            return;
        }
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: { ...BagItemCatalog.face(row.itemId, row.quantity), typeLine: "本次获得：" + row.quantity },
        }).catch(() => { /* 开窗失败和取消由UIManager统一反馈。 */ });
    }

    /** 当前结果关闭成功后交还原奖池和抽数，召唤主界面按新的资产和冷却重新核价。 */
    private onRepeat(): void {
        const selection = this.args?.summonIntro ? undefined : this.args?.repeatSummon;
        if (selection && UIManager.instance.close(this)) {
            EventDispatcher.instance.emit("summon.repeat", selection);
        }
    }

    /** 挂载旧开场的骨骼和场景；音效遵循设备设置，播放计时从全部资源就绪开始。 */
    private async prepareSummonIntro(preparation: number): Promise<void> {
        const [lizi, shangcheng] = this.summonEffects!.children;
        const [frame, clip] = await Promise.all([
            ResManager.getSpriteFrame(this.node, "maps/ui/map-bg-summon-1"),
            ResourceAssetsUtils.forNode(this.node).loadPath("audio/summon-anime", "AudioClip"),
            new Promise<void>((resolve, reject) => {
                BattleSpineService.instance.mountNamedSpine(lizi, "lizi", "stand", {
                    loop: false, onReady: resolve, onFail: () => reject(new Error("lizi/stand")),
                });
            }),
            new Promise<void>((resolve, reject) => {
                BattleSpineService.instance.mountNamedSpine(shangcheng, "shangcheng", "act2", {
                    loop: false, onReady: resolve, onFail: () => reject(new Error("shangcheng/act2")),
                });
            }),
        ]);
        if (this.released || preparation !== this.preparation) {
            return;
        }
        this.summonBackdrop!.spriteFrame = frame;
        this.fitViewport();
        this.summonEffects!.active = true;
        this.rewardAudio!.clip = clip;
        AudioPreferences.playEffect(this.rewardAudio!);
        this.introSeconds = 0;
        this.introReady = true;
    }

    /** 等标题、彩带和头像就绪再展示奖励，普通物品按需赋图，音效遵循设备设置。 */
    private async prepare(preparation: number): Promise<void> {
        const assets = ResourceAssetsUtils.forNode(this.node);
        const heroIcons = new Set<string>();
        for (const { hero } of this.rows) {
            const icon = hero && this.heroIcon(hero.templateId);
            if (icon) {
                heroIcons.add(icon);
            }
        }
        const [title, confetti, clip] = await Promise.all([
            Promise.all(Array.from({ length: 10 }, (_, index) => ResManager.getSpriteFrame(this.node,
                ResManager.ui("common", "item-reward_effect-" + index)))),
            Promise.all(Array.from({ length: 11 }, (_, index) => ResManager.getSpriteFrame(this.node,
                ResManager.ui("common", "item-reward-effect-2_effect-bomb-" + index)))),
            assets.loadPath("audio/item-get", "AudioClip"),
            // 个别图缺失时继续显示到账结果，格子仍由正常赋图入口记录失败并显示占位。
            Promise.all(Array.from(heroIcons, icon => ResManager.getSpriteFrame(this.node, icon).catch(() => null))),
        ]);
        if (this.released || preparation !== this.preparation || !this.node.isValid) {
            return;
        }
        this.titleFrames = title;
        this.confettiFrames = confetti;
        this.titleSeconds = 0;
        this.confettiSeconds = 0;
        this.showTitleFrame(title[0]);
        this.confetti!.spriteFrame = confetti[0];
        this.confetti!.node.active = true;
        this.rewardAudio!.clip = clip;
        this.fitViewport();
        this.panel!.active = true;
        this.animatePanel();
        const pending = Array.from(this.pendingCells);
        this.pendingCells.clear();
        for (const [node, key] of pending) {
            if (node.isValid && node.activeInHierarchy) {
                this.animateCell(node, key);
            }
        }
        AudioPreferences.playEffect(this.rewardAudio!);
        this.finishOpen();
    }

    /** 召唤开场播放三秒；奖励标题以0.12秒/帧循环，彩带以0.08秒/帧播放一次。 */
    public update(dt: number): void {
        if (this.released || dt < 0 || !Number.isFinite(dt)) {
            return;
        }
        if (this.args?.summonIntro) {
            this.introSeconds += dt;
            if (this.introSeconds >= (this.introReady ? 3 : 8)) {
                this.close();
            }
            return;
        }
        if (!this.panel?.active) {
            return;
        }
        this.titleSeconds += dt;
        this.confettiSeconds += dt;
        if (this.titleFrames.length) {
            this.showTitleFrame(this.titleFrames[Math.floor(this.titleSeconds / 0.12) % this.titleFrames.length]);
        }
        const index = Math.floor(this.confettiSeconds / 0.08);
        if (index >= this.confettiFrames.length) {
            this.confetti!.node.active = false;
        } else {
            this.confetti!.spriteFrame = this.confettiFrames[index];
        }
    }

    /** 把每帧裁切后的顶部对齐同一标题节点，消除各图片透明留白不同造成的字样跳动。 */
    private showTitleFrame(frame: SpriteFrame): void {
        const title = this.titleEffect!;
        if (title.spriteFrame === frame) {
            return;
        }
        const height = frame.originalSize.height;
        if (height > 0) {
            const transform = title.node.getComponent(UITransform)!;
            // Sprite 保留原图尺寸。裁切区顶部距离原图中心为偏移量加半个裁切高度。
            transform.anchorY = 0.5 + (frame.offset.y + frame.rect.height / 2) / height;
        }
        title.spriteFrame = frame;
    }

    /** 普通奖励按设计宽度整体缩放；召唤开场让背景铺满屏幕，特效始终底部居中。 */
    private fitViewport(): void {
        if (this.released || !this.panel) {
            return;
        }
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        if (this.args?.summonIntro) {
            this.summonIntro!.getComponent(UITransform)!.setContentSize(box.width, box.height);
            this.summonEffects!.setPosition(0, -box.height / 2, 0);
            const effectScale = Math.min(box.width / 640, box.height / 1136);
            this.summonEffects!.setScale(effectScale, effectScale, 1);
            const size = this.summonBackdrop!.spriteFrame?.originalSize;
            if (size && size.width > 0 && size.height > 0) {
                const scale = Math.max(box.width / size.width, box.height / size.height);
                this.summonBackdrop!.node.getComponent(UITransform)!.setContentSize(size.width * scale, size.height * scale);
            }
            return;
        }
        this.panelScale = Math.min(1, box.width / 640, Math.max(0.1, (box.height - 40) / 640));
        Tween.stopAllByTarget(this.panel);
        this.panel.setScale(this.panelScale, this.panelScale, 1);
        this.panel.setPosition(0, 0, 0);
    }

    /** 沿用旧窗口入场：主体1.01倍缩回，0.15秒backOut，透明度0.08秒淡入。 */
    private animatePanel(): void {
        const panel = this.panel!;
        const opacity = panel.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(panel);
        Tween.stopAllByTarget(opacity);
        panel.setScale(1.01 * this.panelScale, 1.01 * this.panelScale, 1);
        opacity.opacity = 0;
        new Tween<Node>().target(panel).to(0.15,
            { scale: new Vec3(this.panelScale, this.panelScale, 1) }, { easing: "backOut" }).start();
        new Tween<UIOpacity>().target(opacity).to(0.08, { opacity: 255 }).start();
    }

    /** 每个实际到账行仅首次绑定时从两倍缩回并淡入，复用格先清旧动画再恢复正确终态。 */
    private animateCell(node: Node, key: number | string): void {
        const opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            throw new Error("奖励Cell缺少Prefab透明度组件");
        }
        this.animatedNodes.add(node);
        Tween.stopAllByTarget(node);
        Tween.stopAllByTarget(opacity);
        node.setScale(1, 1, 1);
        opacity.opacity = 255;
        if (!this.panel?.active) {
            this.pendingCells.set(node, key);
            return;
        }
        this.pendingCells.delete(node);
        if (this.animatedItems.has(key)) {
            return;
        }
        this.animatedItems.add(key);
        node.setScale(2, 2, 1);
        opacity.opacity = 0;
        new Tween<Node>().target(node).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
        new Tween<UIOpacity>().target(opacity).to(0.15, { opacity: 255 }).start();
    }

    /** 关闭时停止主体及本页复用格子的Tween，不停止其他窗口或全局动画。 */
    private stopAnimations(): void {
        const nodes = this.panel ? [this.panel, ...this.animatedNodes] : [...this.animatedNodes];
        this.animatedNodes.clear();
        this.animatedItems.clear();
        this.pendingCells.clear();
        for (const node of nodes) {
            if (!node.isValid) {
                continue;
            }
            try {
                Tween.stopAllByTarget(node);
                const opacity = node.getComponent(UIOpacity);
                if (opacity?.isValid) {
                    Tween.stopAllByTarget(opacity);
                }
            } catch (error) {
                GameLog.shared.classified("MODULE", "error", "RewardView", "停止奖励动画失败：" + String(error));
            }
        }
    }

    /** 关闭结束音效和帧引用，迟到加载不能重新展示，随后只交付一次关闭通知。 */
    public onClose(): void {
        this.released = true;
        this.preparation++;
        this.rows = [];
        this.receiptId = null;
        this.titleFrames = [];
        this.confettiFrames = [];
        this.stopAnimations();
        // 子节点和音源销毁顺序可能不同；任一引擎清理失败，仍须释放其余显示引用并结束队列等待。
        try {
            if (this.rewardAudio?.isValid) {
                try {
                    this.rewardAudio.stop();
                } finally {
                    this.rewardAudio.clip = null;
                }
            }
        } finally {
            try {
                if (this.titleEffect?.isValid) {
                    this.titleEffect.spriteFrame = null;
                }
            } finally {
                try {
                    if (this.confetti?.isValid) {
                        this.confetti.spriteFrame = null;
                    }
                    if (this.summonBackdrop?.isValid) {
                        this.summonBackdrop.spriteFrame = null;
                    }
                } finally {
                    this.args = undefined;
                    this.finishOpen();
                    this.notifyClosed();
                }
            }
        }
    }

    /** 引擎或框架异常释放未展示完的实例时，同样完成清理和单次关闭通知。 */
    public dispose(): void {
        if (!this.released || this.closedCallback) {
            this.onClose();
        }
    }

    /** 延至BaseView完成同步退订后通知展示队列，回调异常不影响本页清理。 */
    private notifyClosed(): void {
        const callback = this.closedCallback;
        this.closedCallback = undefined;
        if (!callback) {
            return;
        }
        void Promise.resolve().then(callback).catch(error => {
            GameLog.shared.classified("MODULE", "error", "RewardView", "奖励窗口关闭回调失败：" + String(error));
        });
    }
}
