/**
 * 战斗表现专项独享的确定性Tween时钟，模拟生产Preview使用的延迟、更新回调、数值渐变和取消。
 * 统一检查仅为battle-opening替换cc入口，其他专项继续拒绝动画替身，不能据此宣布Creator渲染通过。
 * 时钟不定义业务阶段或出场时长；所有动画指令来自被测BattleReplayPreview。
 */
export * from "./cc-runtime";
import { AudioSource, Label, Sprite, Vec3 as BaseVec3 } from "./cc-runtime";

/** 出场生产代码使用clone保存原位，基础替身不提供坐标计算，本专项仅补值复制。 */
export class Vec3 extends BaseVec3 {
    /** 返回独立坐标值，不模拟矩阵或真实世界坐标。 */
    public clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }
}

/** 持续控制专项只记录材质归属与销毁，不模拟shader像素或Creator渲染。 */
export class Material {
    /** true表示材质仍由当前战场持有；destroy后仅用于验证清理。 */
    public isValid = true;
    /** 记录真实生产选择的效果资产，便于区分石化与冰冻。 */
    public effectAsset: unknown = null;

    /** 保存生产加载的唯一效果，不在替身中定义颜色或控制规则。 */
    public initialize(options: { effectAsset: unknown }): void {
        this.effectAsset = options.effectAsset;
    }

    /** 标记本战场的材质已释放，禁止误称真实GPU释放验收。 */
    public destroy(): void {
        this.isValid = false;
    }
}

/** 一段由真实生产调用创建的延迟、数值渐变或即时回调。 */
type ClockStep = {
    duration: number;
    values?: Record<string, number>;
    callback?: () => void;
    onUpdate?: (target: Record<string, any>, progress: number) => void;
};

/** 正在运行的Tween片段；起止值仅供确定性插值，不保存游戏状态。 */
interface RunningStep {
    /** 拥有该片段的Tween，决定取消与下一片段的归属。 */
    tween: Tween;
    /** 本片段开始的测试秒数，供数值插值使用。 */
    started: number;
    /** 本片段应完成的测试秒数，不读取墙钟。 */
    ends: number;
    /** 生产链式调用传入的当前指令。 */
    step: ClockStep;
    /** 渐变开始前的各目标数字值，不能引用后续已修改的值。 */
    before: Record<string, number>;
}

/** 当前专项的数字时钟及任务集，测试结束必须明确清空。 */
export class OpeningClockRuntime {
    /** 测试累计推进的秒数，不读取或替换系统墙钟。 */
    public static now = 0;
    /** 用例可为指定目标/时长的delay增加调度耗时；reset清空，不改变生产传入时长或渐变公式。 */
    public static delayDispatchOffset: ((target: Readonly<Record<string, any>>, seconds: number) => number) | null = null;
    /** 等待结束的Tween片段；由生产tween调用添加、完成或stop移除。 */
    private static running = new Set<RunningStep>();

    /** 只允许静态使用，避免出现另一份时钟或隐式计时器。 */
    private constructor() {
    }

    /** 清空本用例的任务和时间，不操作真实引擎或系统计时器。 */
    public static reset(): void {
        OpeningClockRuntime.running.clear();
        OpeningClockRuntime.now = 0;
        OpeningClockRuntime.delayDispatchOffset = null;
    }

    /** 返回尚未结束的Tween片段数，验证取消后没有迟到调度。 */
    public static pending(): number {
        return OpeningClockRuntime.running.size;
    }

    /** 挂入生产提供的动画；可控额外delay只模拟调度，哪些等待受影响由用例决定，不识别业务阶段。 */
    public static schedule(tween: Tween, step: ClockStep): void {
        const extra = step.values ? 0
            : OpeningClockRuntime.delayDispatchOffset?.(tween.target, step.duration) ?? 0;
        if (!Number.isFinite(extra) || extra < 0) {
            throw new Error("测试调度附加耗时必须是非负有限秒数");
        }
        const scheduled = extra ? { ...step, duration: step.duration + extra } : step;
        const before = Object.fromEntries(Object.keys(step.values || {}).map(key => [key, tween.target[key]]));
        OpeningClockRuntime.running.add({
            tween,
            step: scheduled,
            before,
            started: OpeningClockRuntime.now,
            ends: OpeningClockRuntime.now + scheduled.duration,
        });
    }

    /** 终止目标的所有Tween，保持生产stopAllByTarget的归属边界。 */
    public static stop(target: object): void {
        for (const row of OpeningClockRuntime.running) {
            if (row.tween.target === target) {
                row.tween.cancelled = true;
                OpeningClockRuntime.running.delete(row);
            }
        }
    }

    /** 推进到各任务边界，放行原Promise继续创建后续片段；不自动填补缺失业务阶段。 */
    public static async advance(seconds: number): Promise<void> {
        const destination = OpeningClockRuntime.now + seconds;
        for (let guard = 0; guard < 1000; guard++) {
            await OpeningClockRuntime.flush();
            const next = Math.min(destination, ...Array.from(OpeningClockRuntime.running, row => row.ends));
            OpeningClockRuntime.now = next;
            for (const row of Array.from(OpeningClockRuntime.running)) {
                const progress = row.step.duration ? Math.min(1, (next - row.started) / row.step.duration) : 1;
                for (const [key, value] of Object.entries(row.step.values || {})) {
                    row.tween.target[key] = row.before[key] + (value - row.before[key]) * progress;
                }
                row.step.onUpdate?.(row.tween.target, progress);
                if (row.ends <= next + 1e-8) {
                    OpeningClockRuntime.running.delete(row);
                    row.tween.next();
                }
            }
            await OpeningClockRuntime.flush();
            if (OpeningClockRuntime.now >= destination - 1e-8) {
                return;
            }
        }
        throw new Error("出场时钟未在有限任务内收敛");
    }

    /** 放行有限微任务，不使用真实时间等待或模拟一份业务实现。 */
    public static async flush(): Promise<void> {
        for (let index = 0; index < 40; index++) {
            await Promise.resolve();
        }
    }
}

/** 仅此专项支持的Tween，生产仍使用Creator实现。 */
export class Tween {
    /** 动画归属的目标对象，由真实生产调用传入。 */
    public readonly target: Record<string, any>;
    /** 取消后禁止启动下一片段。 */
    public cancelled = false;
    /** 当前Tween指令列表，不创建业务阶段或默认等待。 */
    private steps: ClockStep[] = [];
    /** 下一条待执行指令的位置，stop后不再推进。 */
    private cursor = 0;
    /** 持续帧节点复用生产提供的完整序列，stop目标后不再循环。 */
    private repeating = false;

    /** 保存生产传来的目标，具体指令由链式调用登记。 */
    public constructor(target: Record<string, any>) {
        this.target = target;
    }

    /** 登记秒数延迟；推进时钟之前不会完成。 */
    public delay(seconds: number): this {
        this.steps.push({ duration: seconds });
        return this;
    }

    /** 登记数值渐变及进度回调，轨迹和显示规则由生产代码定义。 */
    public to(seconds: number, values: Record<string, number>, options?: Pick<ClockStep, "onUpdate">): this {
        if (Object.values(values).some(value => typeof value !== "number")) {
            throw new Error("出场专项只模拟数值渐变，不能模拟坐标或渲染");
        }
        this.steps.push({ duration: seconds, values, onUpdate: options?.onUpdate });
        return this;
    }

    /** 登记由生产代码提供的完成回调，取消时不执行。 */
    public call(callback: () => void): this {
        this.steps.push({ duration: 0, callback });
        return this;
    }

    /** 重复生产传入的子序列；没有计时片段的循环明确拒绝，避免测试自身空转。 */
    public repeatForever(sequence: Tween): this {
        if (!sequence.steps.some(step => step.duration > 0)) {
            throw new Error("专项不能循环没有等待的Tween");
        }
        this.steps.push(...sequence.steps);
        this.repeating = true;
        return this;
    }

    /** 启动本Tween，不改变其他任务的调度或完成结果。 */
    public start(): this {
        this.next();
        return this;
    }

    /** 执行即时回调或挂入下一计时片段；没有片段时正常结束。 */
    public next(): void {
        while (!this.cancelled) {
            if (this.cursor >= this.steps.length) {
                if (!this.repeating) {
                    return;
                }
                this.cursor = 0;
            }
            const step = this.steps[this.cursor++];
            if (step.callback) {
                step.callback();
            } else {
                OpeningClockRuntime.schedule(this, step);
                return;
            }
        }
    }

    /** 复用原目标归属取消所有计时，不伪造动画完成。 */
    public static stopAllByTarget(target: object): void {
        OpeningClockRuntime.stop(target);
    }
}

/** cc固定函数入口：专项将真实生产tween调用送入唯一测试时钟。 */
export function tween(target: Record<string, any>): Tween {
    return new Tween(target);
}

// 既有cc-runtime未模拟的枚举只在此专项补齐，不能改变其他专项的能力范围。
(AudioSource as any).EventType = { STARTED: "audio-started" };
(Label as any).Overflow = { NONE: 0 };
(Label as any).CacheMode = { NONE: 0 };
(Sprite as any).SizeMode = { RAW: 0 };
