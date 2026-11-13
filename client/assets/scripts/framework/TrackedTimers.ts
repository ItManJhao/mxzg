/** 原生计时器登记：主城轮播和加载超时使用，取消/完成时计数归零；不管理引擎调度和Tween。 */
export class TrackedTimers {
    /** 仍在运行的原生计时器及其取消函数。 */
    private static readonly active = new Map<ReturnType<typeof setTimeout>, () => void>();
    private constructor() { }
    /** 注册一次性超时，调用业务回调前先从统计中移除。 */
    public static timeout(callback: () => void, milliseconds: number): ReturnType<typeof setTimeout> {
        const handle = setTimeout(() => { TrackedTimers.active.delete(handle); callback(); }, milliseconds);
        TrackedTimers.active.set(handle, () => clearTimeout(handle));
        return handle;
    }

    /** 注册循环计时器，由所属页面停止时显式clear。 */
    public static interval(callback: () => void, milliseconds: number): ReturnType<typeof setInterval> {
        const handle = setInterval(callback, milliseconds);
        TrackedTimers.active.set(handle, () => clearInterval(handle));
        return handle;
    }

    /** 重复安全地取消该计时器，不影响其他页面。 */
    public static clear(handle: ReturnType<typeof setTimeout>): void {
        TrackedTimers.active.get(handle)?.();
        TrackedTimers.active.delete(handle);
    }

    /** 返回已接入计时器数量，不包含未迁移模块与Cocos调度。 */
    public static snapshot(): number { return TrackedTimers.active.size; }
}
