/**
 * 主线只读结算：复用旧 ChapterEnd 的底板、胜利翅膀、失败引导图标与胜负音效。
 * 由 UIManager 打开，仅展示已验证战报结果；不请求结算、不发奖、不开放养成跳转。
 */
import { _decorator,AudioSource,Button,Label,Node,Sprite,SpriteFrame,tween,Tween,UIOpacity,UITransform,Vec3,view } from "cc";
import { GameLog } from "../../../core/GameLog";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { BaseView } from "../../../framework/ui/BaseView";
import { mountNamedSpine } from "./battleSpine";

const { ccclass, property } = _decorator;

/** 只接受胜负展示信息，不携带奖励、角色状态或资产修改回调。 */
export interface ChapterEndArgs {
    /** 经过战报校验的我方胜负；独立失败样式验收须明确标注。 */
    won: boolean;
    /** true 表示仅验收失败样式，不宣称为真实失败战报。 */
    presentationOnly?: boolean;
}

@ccclass("ChapterEndView")
export class ChapterEndView extends BaseView<ChapterEndArgs> {
    /** 旧 640×400 主体，负责入场缩放与淡入。 */
    @property(Node) panel: Node | null = null;
    /** 全屏遮罩，点击只关闭结算，不执行奖励或导航。 */
    @property(Node) backdrop: Node | null = null;
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
    /** 旧 eff_reward_bomb 序列帧挂点。 */
    @property(Sprite) confetti: Sprite | null = null;
    /** 本窗口音源；关闭立即停止，不影响战场背景音。 */
    private audio: AudioSource | null = null;
    /** 关闭后为 true，拒绝迟到的资源播放；不涉及网络会话隔离。 */
    private released = false;
    /** 失败剩余秒数；旧 LoseCell 从 6 立即减到 5，之后每秒递减。 */
    private seconds = 5;
    /** 本次已加载的彩带帧，关闭清空引用。 */
    private frames: SpriteFrame[] = [];
    /** 当前彩带帧序号，11 帧播放一遍后隐藏。 */
    private frameIndex = 0;

    /** 绑定只读关闭操作，异步加载完成后再开始音效和动画。 */
    public onOpen(args?: ChapterEndArgs): void {
        super.onOpen(args);
        if (!args || !this.panel || !this.backdrop || !this.victory || !this.defeatWing || !this.defeatTitle
            || !this.defeatContent || !this.readonlyNotice || !this.closeHint || !this.confetti) {
            throw new Error("主线结算参数或预制体绑定缺失");
        }
        this.beginOpen();
        this.released = false;
        const visible = view.getVisibleSize();
        this.backdrop.getComponent(UITransform)!.setContentSize(visible.width, visible.height);
        this.victory.active = args.won;
        this.defeatWing.active = !args.won;
        this.defeatTitle.active = !args.won;
        this.defeatContent.active = !args.won;
        this.readonlyNotice.active = args.won;
        this.closeHint.string = args.won ? "点击空白处关闭" : "5 秒后关闭";
        if (args.presentationOnly) this.closeHint.string = "失败样式验收 · 5 秒后关闭";
        const close = () => this.close();
        this.backdrop.on(Button.EventType.CLICK, close);
        this.ownListener(() => this.backdrop?.off(Button.EventType.CLICK, close));
        void this.prepare(args).then(() => {
            if (!this.released) this.finishOpen();
        }).catch(error => {
            if (!this.released) this.failOpen(error instanceof Error ? error : new Error(String(error)));
        });
    }

    /** 预载本页所需音频和彩带，胜利额外等待翅膀资源，失败不播放胜利动画。 */
    private async prepare(args: ChapterEndArgs): Promise<void> {
        const assets = ResourceAssetsUtils.forNode(this.node);
        const clipPromise = assets.loadPath("audio/battle-end-" + (args.won ? "1" : "0"), "AudioClip");
        const framesPromise = Promise.all(Array.from({ length: 11 }, (_, index) =>
            assets.loadPath("ui/common/item-reward-effect-2_effect-bomb-" + index + "/spriteFrame", "SpriteFrame")));
        const [clip, frames] = await Promise.all([clipPromise, framesPromise]);
        if (this.released || !this.node.isValid) return;
        if (args.won) {
            await new Promise<void>((resolve, reject) => mountNamedSpine(this.victory!, "chibang", "idle", {
                loop: true, onReady: resolve, onFail: () => reject(new Error("主线胜利翅膀加载失败"))
            }));
        }
        if (this.released || !this.node.isValid) return;
        this.frames = frames;
        this.frameIndex = 0;
        this.confetti!.sizeMode = Sprite.SizeMode.RAW;
        this.confetti!.spriteFrame = frames[0];
        this.confetti!.node.active = true;
        this.schedule(this.advanceConfetti, 0.08);
        this.panel!.setScale(1.01, 1.01, 1);
        tween(this.panel!).to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: "backOut" }).start();
        const opacity = this.panel!.getComponent(UIOpacity)!;
        opacity.opacity = 0;
        tween(opacity).to(0.08, { opacity: 255 }).start();
        this.audio = this.node.getComponent(AudioSource) || this.node.addComponent(AudioSource);
        this.audio.clip = clip;
        const onAudioStarted = () => GameLog.shared.classified("MODULE", "info", "ChapterEndView", "audio.started " + clip.name);
        this.node.on(AudioSource.EventType.STARTED, onAudioStarted);
        this.ownListener(() => this.node.off(AudioSource.EventType.STARTED, onAudioStarted));
        this.audio.play();
        if (!args.won) {
            this.seconds = 5;
            this.schedule(this.tickClose, 1);
        }
        GameLog.shared.classified("MODULE", "info", "ChapterEndView",
            "只读结算 " + (args.won ? "胜利" : "失败") + " sound=" + clip.name + " presentationOnly=" + !!args.presentationOnly);
    }

    /** 按旧 effect2 配置每帧 0.08 秒播放一次彩带，结束隐藏而不保留尾帧。 */
    private advanceConfetti(): void {
        this.frameIndex++;
        if (this.frameIndex >= this.frames.length) {
            this.unschedule(this.advanceConfetti);
            this.confetti!.node.active = false;
            return;
        }
        this.confetti!.spriteFrame = this.frames[this.frameIndex];
    }

    /** 失败按旧 LoseCell 五秒关闭；引擎暂停时倒计时同步暂停。 */
    private tickClose(): void {
        this.seconds--;
        if (this.seconds <= 0) {
            this.close();
            return;
        }
        this.closeHint!.string = (this.args?.presentationOnly ? "失败样式验收 · " : "") + this.seconds + " 秒后关闭";
    }

    /** 统一关闭释放动画、音频与定时器，取消未完成打开，避免关场后响起结算声。 */
    public onClose(): void {
        this.released = true;
        this.unscheduleAllCallbacks();
        this.audio?.stop();
        if (this.audio?.isValid) this.audio.clip = null;
        if (this.confetti?.isValid) this.confetti.spriteFrame = null;
        this.frames = [];
        if (this.panel) {
            Tween.stopAllByTarget(this.panel);
            const opacity = this.panel.getComponent(UIOpacity);
            if (opacity) Tween.stopAllByTarget(opacity);
        }
        this.finishOpen();
    }
}
