/**
 * 界面打开耗时日志：由 UIManager 在页面 whenReady 完成后调用。
 * 起点和页面生命周期归 UIManager，本文件只格式化日志，不再保存另一套计时状态。
 */
import { GameLog, monoNow } from "../../core/GameLog";

/** 从预制体路径取显示名称，去掉目录和 .prefab 后缀。 */
function prefabBaseName(path: string): string {
    const name = path.split("/").pop() || path;
    return name.replace(/\.prefab$/, "");
}

/** 记录一次成功打开；耗时截至 whenReady 兑现，不包含后续切页动画或按需贴图。 */
export function logViewReady(viewName: string, prefabPath: string, started: number, tag = "UIManager"): void {
    const prefab = prefabBaseName(prefabPath);
    const elapsedMs = Math.max(0, Math.round(monoNow() - started));
    GameLog.shared.openView(viewName || prefab || "(none)", prefab || "(none)", { ms: elapsedMs, tag });
}
