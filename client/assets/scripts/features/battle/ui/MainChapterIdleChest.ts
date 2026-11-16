/**
 * 主线宝箱收取表现：复用页面已有骨骼，保护旧collect轨道并在两秒后恢复最新待机档。
 * 页面在合法展示上下文中调用collect，逐帧调用update；本类不联网、不读资产，也不修改挂机起点。
 * 骨骼与节点归页面资源作用域持有，关闭时只撤销本类状态和仍归本类使用的轨道。
 */
import { GameLog } from "../../../core/GameLog";
import { IdleChestUtils } from "../utils/IdleChestUtils";

/** 页面提供的已就绪骨骼能力；返回值沿用实际引擎，不要求本类拥有引擎对象。 */
export interface IdleChestAnimation {
    /** 查找真实动作，缺失返回空值；不能把不存在的动作报告为已播放。 */
    findAnimation(name: string): unknown;
    /** 将指定轨道切换为旧收取或待机动作。 */
    setAnimation(track: number, name: string, loop: boolean): unknown;
    /** 保留旧队列延迟参数，不能按资源总时长自行重算。 */
    addAnimation(track: number, name: string, loop: boolean, delay: number): unknown;
    /** 关闭时可清理已有轨道；不具备该能力时仍撤销本类状态，不销毁骨骼。 */
    clearTracks?(): void;
}

/** 一页一个表现实例，页面关闭即dispose；不跨角色缓存播放意图。 */
export class MainChapterIdleChest {
    /** 旧Lua传给addAnimation的延迟，单位秒；原值1.5，不按collect帧长改写。 */
    private static readonly EMPTY_CHEST_DELAY_SECONDS = 1.5;
    /** 旧collect_time保护区间，单位秒；期间普通render不能覆盖收取轨道。 */
    private static readonly COLLECTION_PROTECTION_SECONDS = 2;
    /** 页面读取当前有效骨骼的入口；null表示本类已释放，避免迟到更新再读页面。 */
    private readAnimation: (() => IdleChestAnimation | null) | null;
    /** 最新一次render得到的待机档；尚未render时为null，collect可提供首个已知档。 */
    private targetStage: number | null = null;
    /** 上次成功使用的骨骼对象，只用于去重和关闭轨道，不承担资源所有权。 */
    private appliedAnimation: IdleChestAnimation | null = null;
    /** 上次成功应用的待机档；0表示尚未应用或正在收取，需要下次明确恢复。 */
    private appliedStage = 0;
    /** true表示收取保护尚未结束；重复collect直接返回false，不缓存新收取。 */
    private collectionActive = false;
    /** 本次保护已推进的显示秒数，只由有效正dt推进，结束或关闭归零。 */
    private collectionSeconds = 0;
    /** 页面已关闭后拒绝render、collect及update，不能复活迟到的骨骼表现。 */
    private disposed = false;

    /** @param readAnimation 仅返回当前仍有效且资源已就绪的骨骼；加载中或节点失效时返回null。 */
    public constructor(readAnimation: () => IdleChestAnimation | null) {
        this.readAnimation = readAnimation;
    }

    /** true表示仍处于旧两秒保护，页面据此保留计时、进度和气泡，不等同领取事务忙状态。 */
    public get collecting(): boolean {
        return this.collectionActive;
    }

    /** 保存当前服务器时钟对应的最新档位；收取保护期间只记档位，不覆盖collect轨道。 */
    public render(seconds: number, maxSeconds: number): void {
        if (this.disposed) {
            return;
        }
        this.targetStage = IdleChestUtils.stage(seconds, maxSeconds);
        if (!this.collectionActive) {
            this.applyIdle();
        }
    }

    /**
     * 播放指定旧档位收取并排入normal-0；仅已就绪且不在收取时返回true。
     * 未就绪、动作缺失或播放失败均返回false，不保存等待资源完成后补播的意图。
     * 调用方负责确认可展示的操作上下文及同一结果去重，本类不判断领取资格。
     */
    public collect(stage: number): boolean {
        if (this.disposed || this.collectionActive) {
            return false;
        }
        const action = IdleChestUtils.collectAnimation(stage);
        const animation = this.currentAnimation();
        if (!animation) {
            this.warn("NOT_READY", "挂机宝箱资源尚未就绪，本次收取表现未播放");
            return false;
        }
        if (!this.hasAnimation(animation, action) || !this.hasAnimation(animation, "normal-0")) {
            return false;
        }
        if (this.targetStage === null) {
            this.targetStage = stage;
        }
        try {
            animation.setAnimation(0, action, true);
            animation.addAnimation(0, "normal-0", true, MainChapterIdleChest.EMPTY_CHEST_DELAY_SECONDS);
        } catch (error) {
            this.appliedStage = 0;
            this.warn("COLLECT_FAILED:" + action, "挂机宝箱收取动作失败", error);
            // 引擎可能已执行set而在add时失败，立即回到已知待机，不能留下半段收取或假成功。
            this.applyIdle();
            return false;
        }
        this.appliedAnimation = animation;
        this.appliedStage = 0;
        this.collectionActive = true;
        this.collectionSeconds = 0;
        return true;
    }

    /** 推进两秒显示保护；无效、零或负dt不推进，结束后只应用一次最近render保存的待机档。 */
    public update(dt: number): void {
        if (this.disposed || !this.collectionActive || !Number.isFinite(dt) || dt <= 0) {
            return;
        }
        this.collectionSeconds = Math.min(MainChapterIdleChest.COLLECTION_PROTECTION_SECONDS,
            this.collectionSeconds + dt);
        if (this.collectionSeconds < MainChapterIdleChest.COLLECTION_PROTECTION_SECONDS) {
            return;
        }
        this.collectionActive = false;
        this.collectionSeconds = 0;
        this.applyIdle();
    }

    /** 跨档或骨骼替换时才设置待机；资源尚未就绪时保留最新档，待页面onReady再次render。 */
    private applyIdle(): void {
        if (this.targetStage === null) {
            return;
        }
        const animation = this.currentAnimation();
        if (!animation || (animation === this.appliedAnimation && this.targetStage === this.appliedStage)) {
            return;
        }
        const action = "normal-" + this.targetStage;
        if (!this.hasAnimation(animation, action)) {
            return;
        }
        try {
            animation.setAnimation(0, action, true);
            this.appliedAnimation = animation;
            this.appliedStage = this.targetStage;
        } catch (error) {
            this.warn("IDLE_FAILED:" + action, "挂机宝箱待机动作失败", error);
        }
    }

    /** 页面入口可能因引擎销毁时序失效；展示读取失败只停止本次播放并记录，不中断资产流程。 */
    private currentAnimation(): IdleChestAnimation | null {
        try {
            return this.readAnimation?.() || null;
        } catch (error) {
            this.warn("READ_FAILED", "挂机宝箱骨骼读取失败", error);
            return null;
        }
    }

    /** 播放前检查真实资源，按动作名限频记录；缺失不能返回播放成功。 */
    private hasAnimation(animation: IdleChestAnimation, action: string): boolean {
        try {
            if (animation.findAnimation(action)) {
                return true;
            }
            this.warn("ACTION_MISSING:" + action, "挂机宝箱缺少动作：" + action);
        } catch (error) {
            this.warn("ACTION_FAILED:" + action, "挂机宝箱动作检查失败：" + action, error);
        }
        return false;
    }

    /** 复用全局分类日志的有界去重，保留引擎失败原因和堆栈，不在本类另建日志缓存。 */
    private warn(code: string, message: string, error?: unknown): void {
        const detail = error instanceof Error ? error.stack || error.message
            : error === undefined ? "" : String(error);
        GameLog.shared.warnOnce("MODULE", "MainChapterIdleChest", code,
            detail ? message + "\n" + detail : message);
    }

    /** 关闭时仅清理仍是本类最后使用的骨骼轨道，释放读取入口；重复调用安全，不销毁节点。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        const current = this.currentAnimation();
        this.disposed = true;
        this.readAnimation = null;
        this.targetStage = null;
        this.collectionActive = false;
        this.collectionSeconds = 0;
        this.appliedStage = 0;
        const applied = this.appliedAnimation;
        this.appliedAnimation = null;
        if (current && current === applied) {
            try {
                current.clearTracks?.();
            } catch (error) {
                this.warn("CLEAR_FAILED", "挂机宝箱轨道清理失败", error);
            }
        }
    }
}
