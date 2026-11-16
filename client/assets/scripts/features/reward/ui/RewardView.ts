/**
 * 通用只读奖励窗：按旧ItemRewardLayer展示实际到账格子、标题光效、彩带及获得音效。
 * 静态结构保存在完整Prefab，列表使用SuperScroll；本窗不发包、不读写资产、不开放业务入口。
 */
import { _decorator, AudioSource, Label, Node, Sprite, SpriteFrame, Tween, UIOpacity, Vec3 } from "cc";
import { GameLog } from "../../../core/GameLog";
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
import type { RewardArgs, RewardRow } from "../data/RewardData";
import { RewardUtils } from "../utils/RewardUtils";

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
    /** 标题位置的十帧循环效果，初始图片由Prefab保存。 */
    @property(Sprite) titleEffect: Sprite | null = null;
    /** 上方十一帧单次彩带，原缩放2保存在Prefab。 */
    @property(Sprite) confetti: Sprite | null = null;
    /** 零实际到账的明确状态，不伪造奖励格。 */
    @property(Label) emptyLabel: Label | null = null;
    /** 唯一获得音源由Prefab绑定，关闭停止，不动态创建音源节点。 */
    @property(AudioSource) rewardAudio: AudioSource | null = null;
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
    /** 当前回执窗口的关闭回调，结束时先取走，重复关闭和销毁不会重复交付。 */
    private closedCallback: (() => void) | undefined;
    /** 当前视口的主体目标比例，入场只放大1.01倍，不覆盖Prefab内部布局。 */
    private panelScale = 1;
    /** 本回执已演出过的物品配置ID，虚拟格子重新渲染同一行时不重复入场。 */
    private readonly animatedItems = new Set<number>();
    /** 本窗口使用过的格子节点，关闭时统一停止其Tween；不持有物品资产。 */
    private readonly animatedNodes = new Set<Node>();
    /** 主体资源准备期间已绑定的格子及其当前物品ID，显示主体后才启动初次入场。 */
    private readonly pendingCells = new Map<Node, number>();

    /** 实例首次绑定时登记列表及视口监听，不因同一窗口切换请求重复订阅。 */
    public onBind(): void {
        if (!this.panel || !this.rewards || !this.titleEffect || !this.confetti || !this.emptyLabel || !this.rewardAudio) {
            throw new Error("奖励窗静态绑定缺失");
        }
        if (!this.panel.getComponent(UIOpacity)) {
            throw new Error("奖励窗主体缺少Prefab透明度组件");
        }
        const content = this.rewards.list.node;
        content.on(SuperContent.RENDER_ITEM, this.onRender, this);
        content.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            if (content.isValid) {
                content.off(SuperContent.RENDER_ITEM, this.onRender, this);
                content.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
        });
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fitViewport()));
    }

    /** 校验只读明细并等待展示资源；同编号重复打开保持当前画面，不重播获得反馈。 */
    public onOpen(args: RewardArgs): void {
        const rows = RewardUtils.rows(args);
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
        this.rewards!.list.setData(rows);
        this.rewards!.toStart();
        this.emptyLabel!.node.active = rows.length === 0;
        void this.prepare(preparation).catch(error => {
            if (!this.released && preparation === this.preparation) {
                this.failOpen(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    /** 列表渲染实际获得数，沿用旧物品样式；不将条目解释为当前库存或精灵实例。 */
    private onRender(node: Node, row: RewardRow): void {
        if (this.released) {
            return;
        }
        const cell = node.getComponent(BagItemView);
        if (!cell) {
            throw new Error("奖励Cell缺少BagItemView");
        }
        cell.show(row, false, BagItemCatalog.face(row.itemId, row.quantity), true, false);
        this.animateCell(node, row.itemId);
    }

    /** 奖励格打开随本窗关闭的配置简介，展示本次数量；其他来源后来接管的详情不归本窗清理。 */
    private onSelect(row: RewardRow): void {
        if (this.released) {
            return;
        }
        void UIManager.instance.openChild(this, BagInfoView, {
            source: "description",
            face: { ...BagItemCatalog.face(row.itemId, row.quantity), typeLine: "本次获得：" + row.quantity },
        }).catch(() => { /* 开窗失败和取消由UIManager统一反馈。 */ });
    }

    /** 复用原资源池加载十帧标题、十一帧彩带和旧获得音效；迟到结果不恢复已关窗口。 */
    private async prepare(preparation: number): Promise<void> {
        const assets = ResourceAssetsUtils.forNode(this.node);
        const [title, confetti, clip] = await Promise.all([
            Promise.all(Array.from({ length: 10 }, (_, index) => ResManager.getSpriteFrame(this.node,
                ResManager.ui("common", "item-reward_effect-" + index)))),
            Promise.all(Array.from({ length: 11 }, (_, index) => ResManager.getSpriteFrame(this.node,
                ResManager.ui("common", "item-reward-effect-2_effect-bomb-" + index)))),
            assets.loadPath("audio/item-get", "AudioClip"),
        ]);
        if (this.released || preparation !== this.preparation || !this.node.isValid) {
            return;
        }
        this.titleFrames = title;
        this.confettiFrames = confetti;
        this.titleSeconds = 0;
        this.confettiSeconds = 0;
        this.titleEffect!.spriteFrame = title[0];
        this.confetti!.spriteFrame = confetti[0];
        this.confetti!.node.active = true;
        this.rewardAudio!.clip = clip;
        this.fitViewport();
        this.panel!.active = true;
        this.animatePanel();
        const pending = Array.from(this.pendingCells);
        this.pendingCells.clear();
        for (const [node, itemId] of pending) {
            if (node.isValid && node.activeInHierarchy) {
                this.animateCell(node, itemId);
            }
        }
        this.rewardAudio!.play();
        this.finishOpen();
    }

    /** 原配置speed是百分秒间隔，不是fps；标题0.12秒/帧循环，彩带0.08秒/帧单次。 */
    public update(dt: number): void {
        if (this.released || !this.panel?.active || dt < 0 || !Number.isFinite(dt)) {
            return;
        }
        this.titleSeconds += dt;
        this.confettiSeconds += dt;
        if (this.titleFrames.length) {
            this.titleEffect!.spriteFrame = this.titleFrames[Math.floor(this.titleSeconds / 0.12) % this.titleFrames.length];
        }
        const index = Math.floor(this.confettiSeconds / 0.08);
        if (index >= this.confettiFrames.length) {
            this.confetti!.node.active = false;
        } else {
            this.confetti!.spriteFrame = this.confettiFrames[index];
        }
    }

    /** 按设计宽度整体缩放，原静态背景、四列和特效坐标不逐机型重排。 */
    private fitViewport(): void {
        if (this.released || !this.panel) {
            return;
        }
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
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
    private animateCell(node: Node, itemId: number): void {
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
            this.pendingCells.set(node, itemId);
            return;
        }
        this.pendingCells.delete(node);
        if (this.animatedItems.has(itemId)) {
            return;
        }
        this.animatedItems.add(itemId);
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
