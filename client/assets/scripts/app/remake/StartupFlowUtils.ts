/**
 * 启动任务执行：RemakeApp按真实配置、身份恢复及开页任务推进加载进度。
 * 只组织执行顺序与取消，不持有资源、创建界面或按耗时模拟百分比。
 */
export interface StartupTask {
    /** 当前任务的玩家可读说明。 */
    label: string;
    /** 在本轮进度中所占任务权重，不代表字节数。 */
    weight: number;
    /** 完成一个实际准备任务，progress仅报告已完成份数。 */
    run(progress: (completed: number, total: number) => void): Promise<void>;
}
/** 应用或当前准备阶段已失效时中断后续任务，交由调用边界结束旧流程。 */
export class StartupCancelled extends Error {
}
/** 启动任务工具：每轮进度和取消状态仅属于本次调用，不保存应用或账号实例。 */
export class StartupFlowUtils {
    /** 仅提供静态入口，禁止创建工具实例。 */
    private constructor() {
    }

    /** 顺序执行加权任务；失败停止后续开页，完成任务的迟到进度与失效应用的结果不再上报。 */
    public static async runStartup(tasks: StartupTask[], update: (label: string, ratio: number) => void, alive: () => boolean): Promise<void> {
        const total = tasks.reduce((sum, task) => sum + task.weight, 0);
        if (!(total > 0) || tasks.some(task => !(task.weight > 0))) {
            throw new Error("启动任务权重无效");
        }
        let completedWeight = 0;
        for (const task of tasks) {
            StartupFlowUtils.checkAlive(alive);
            let fraction = 0;
            let acceptingProgress = true;
            update(task.label, completedWeight / total);
            try {
                await task.run((done, count) => {
                    if (!alive() || !acceptingProgress || !Number.isFinite(done) || !Number.isFinite(count)) {
                        return;
                    }
                    const next = count > 0 ? Math.max(0, Math.min(1, done / count)) : 0;
                    if (!Number.isFinite(next)) {
                        return;
                    }
                    fraction = Math.max(fraction, next);
                    update(task.label, (completedWeight + task.weight * fraction) / total);
                });
            }
            finally {
                acceptingProgress = false;
            }
            StartupFlowUtils.checkAlive(alive);
            completedWeight += task.weight;
            update(task.label, completedWeight / total);
        }
    }

    /** 每个任务前后检查所属应用；失效时拒绝继续开页和交付进度。 */
    private static checkAlive(alive: () => boolean): void {
        if (!alive()) {
            throw new StartupCancelled("启动已取消");
        }
    }
}
