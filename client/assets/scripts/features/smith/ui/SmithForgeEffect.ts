/**
 * 普通装备单次合成的三段逐帧演出。Prefab 提供材料、炉心和产物三个绘制位置。
 * 页面只在演出结束时提交原操作，切页或关闭时撤销未提交的演出。
 */
import { _decorator, Component, Sprite, SpriteFrame } from "cc";
import { GameLog } from "../../../core/GameLog";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";

const { ccclass, property } = _decorator;
/** 原 eff_runes_compose 各段完整帧数，帧号从零开始。 */
const frameCounts = [16, 11, 22] as const;
/** 原三段共用每帧 0.04 秒。 */
const frameSeconds = 0.04;

@ccclass("SmithForgeEffect")
export class SmithForgeEffect extends Component {
    /** 材料、炉心和产物三个静态 Sprite，任何时刻只显示正在播放的那一段。 */
    @property([Sprite]) private stages: Sprite[] = [];
    /** 首次播放读取的同一批资源，由本页资源作用域持有，失败后允许再次加载。 */
    private frames: Promise<readonly SpriteFrame[][]> | null = null;
    /** 本次已开始播放的画面帧，取消或完成时释放引用。 */
    private clips: readonly SpriteFrame[][] = [];
    /** 下一个要绘制的段与帧，开始每次演出时归零。 */
    private stage = 0;
    /** 当前段内下一个动画帧，从零开始。 */
    private frame = 0;
    /** 当前选中装备及数量对应的回调，取消后不会提交。 */
    private finish: (() => void) | null = null;

    /** 从开始准备到播放结束都视为忙碌。 */
    public get playing(): boolean {
        return this.finish !== null;
    }

    /** 播放静态挂点上的原素材。图片加载失败时仍允许完成已经确认的合成。 */
    public play(done: () => void): void {
        if (this.playing) {
            return;
        }
        this.finish = done;
        const load = this.frames ??= this.loadFrames();
        void load.then(clips => {
            if (this.finish !== done) {
                return;
            }
            this.clips = clips;
            this.stage = 0;
            this.frame = 0;
            this.advance();
            this.schedule(this.advance, frameSeconds);
        }, error => {
            if (this.frames === load) {
                this.frames = null;
            }
            if (this.finish === done) {
                GameLog.shared.warnOnce("MODULE", "SmithForgeEffect", "SMITH_FRAME", String(error));
                this.complete();
            }
        });
    }

    /** 切页或关页时停帧，忽略尚未加载完成的结果。 */
    protected onDisable(): void {
        this.cancel();
    }

    /** 清空一次演出，保留仍由页面持有的已加载资源。 */
    public cancel(): void {
        this.unschedule(this.advance);
        this.finish = null;
        this.clips = [];
        for (const sprite of this.stages) {
            if (sprite?.isValid) {
                sprite.enabled = false;
                sprite.spriteFrame = null;
            }
        }
    }

    /** 按旧素材编号加载所有帧，使用页面作用域管理引用。 */
    private async loadFrames(): Promise<readonly SpriteFrame[][]> {
        if (this.stages.length !== frameCounts.length || this.stages.some(sprite => !sprite)) {
            throw new Error("装备合成演出挂点缺失");
        }
        const assets = ResourceAssetsUtils.forNode(this.node);
        return Promise.all(frameCounts.map((count, stage) => Promise.all(
            Array.from({ length: count }, (_, frame) =>
                assets.load(ResourceAssetsUtils.sprite(`common/ui/runes-effect_${stage + 1}-${frame}`)))
        )));
    }

    /** 每拍替换一张图，段尾关闭原 Sprite 后切到下一个挂点。 */
    private advance(): void {
        if (this.frame === this.clips[this.stage].length) {
            this.stages[this.stage].enabled = false;
            this.frame = 0;
            this.stage++;
            if (this.stage === this.clips.length) {
                this.complete();
                return;
            }
        }
        const sprite = this.stages[this.stage];
        sprite.spriteFrame = this.clips[this.stage][this.frame++];
        sprite.enabled = true;
    }

    /** 停止播放后将唯一一次确认交回页面。 */
    private complete(): void {
        const done = this.finish;
        this.cancel();
        done?.();
    }
}
