export interface StartupTask {
  label: string;
  weight: number;
  run(progress: (completed: number, total: number) => void): Promise<void>;
}

export class StartupCancelled extends Error {}

/** Task completion progress, not elapsed-time simulation or download byte counts. */
export async function runStartup(tasks: StartupTask[], update: (label: string, ratio: number) => void,
  alive: () => boolean): Promise<void> {
  const total = tasks.reduce((sum, task) => sum + task.weight, 0);
  if (!(total > 0) || tasks.some(task => !(task.weight > 0))) throw new Error("启动任务权重无效");
  let completedWeight = 0;
  const check = () => { if (!alive()) throw new StartupCancelled("启动已取消"); };
  for (const task of tasks) {
    check();
    let fraction = 0;
    let acceptingProgress = true;
    update(task.label, completedWeight / total);
    try { await task.run((done, count) => {
      if (!alive() || !acceptingProgress || !Number.isFinite(done) || !Number.isFinite(count)) return;
      const next = count > 0 ? Math.max(0, Math.min(1, done / count)) : 0;
      if (!Number.isFinite(next)) return;
      fraction = Math.max(fraction, next);
      update(task.label, (completedWeight + task.weight * fraction) / total);
    }); } finally { acceptingProgress = false; }
    check();
    completedWeight += task.weight;
    update(task.label, completedWeight / total);
  }
}
