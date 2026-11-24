/**
 * 通用红点显示绑定，按红点树路径或页面提供的显隐状态挂载公共预制体。
 * 普通按钮沿用公共布局，特殊位置由页面预制体提供锚点。复用格可更换数据并保留节点。
 */
import { Node, UITransform } from "cc";
import { GameLog } from "../../core/GameLog";
import { PrefabLoader } from "../assets/PrefabLoader";
import { RedDotManager } from "./RedDotManager";

/** 同一份预制体供各入口实例化，资源和在途加载由 PrefabLoader 共享。 */
const RED_DOT_PREFAB = "bundles/module/common/prefabs/RedDot";

export class RedDotBinding {
    /** 首次点亮时创建，熄灭时复用，解绑时销毁。 */
    private dot: Node | null = null;
    /** 等待公共预制体时为 true，合并同一绑定的重复刷新。 */
    private loading = false;
    /** 解绑后为 true，关闭前发起的加载即使完成也不再挂载。 */
    private disposed = false;
    /** 当前订阅路径；为空时读取调用方给定的显隐。 */
    private path: string | null = null;
    /** 无订阅路径时的显隐，列表格停用或复用时会清空。 */
    private visible = false;
    /** 当前树路径的解除函数，换绑和销毁时释放。 */
    private stopWatching: (() => void) | null = null;

    /**
     * 绑定当前树状态并订阅后续变化，由调用方登记解绑。
     * @param host 公共红点实例的父节点。
     * @param path 红点树的汇总分支或叶子；未提供时由调用方更新显隐。
     * @param canDisplay 宿主自身的显示条件，例如入口未锁定；条件变化时调用 refresh。
     * @param useAnchorLayout 由 atAnchor 启用，使用宿主已有的位置和尺寸。
     */
    public constructor(
        private readonly host: Node,
        path: string | null = null,
        private readonly canDisplay: () => boolean = () => true,
        private readonly useAnchorLayout = false,
    ) {
        this.bindPath(path);
    }

    /** 将公共红点居中放入预制体锚点，保留锚点原有的尺寸、位置和层级。 */
    public static atAnchor(anchor: Node, path: string | null = null, canDisplay?: () => boolean): RedDotBinding {
        return new RedDotBinding(anchor, path, canDisplay, true);
    }

    /** 读取并订阅当前条目；传 null 清除显隐和订阅，已创建的实例供下次复用。 */
    public bindPath(path: string | null): void {
        if (this.disposed) {
            return;
        }
        this.visible = false;
        if (path !== this.path) {
            this.detachPath();
            if (path !== null) {
                this.path = path;
                this.stopWatching = RedDotManager.instance.watch(path, () => this.refresh());
                return;
            }
        }
        this.refresh();
    }

    /** 使用调用方已经计算好的显隐状态，同时撤销此前的树路径订阅。 */
    public setVisible(visible: boolean): void {
        if (this.disposed) {
            return;
        }
        this.detachPath();
        this.visible = visible;
        this.refresh();
    }

    /** 按树状态和宿主条件刷新，首次可见时才加载红点。 */
    public refresh(): void {
        const visible = this.shouldShow();
        if (this.dot?.isValid) {
            this.dot.active = visible;
        } else if (visible && !this.loading) {
            void this.loadDot();
        }
    }

    /** 停止更新并移除实例，可重复调用；并行加载仍可供其他绑定使用。 */
    public dispose(): void {
        this.disposed = true;
        this.detachPath();
        if (this.dot?.isValid) {
            this.dot.active = false;
            this.dot.removeFromParent();
            this.dot.destroy();
        }
        this.dot = null;
    }

    /** 释放当前树路径，供换绑或销毁时复用。 */
    private detachPath(): void {
        this.stopWatching?.();
        this.stopWatching = null;
        this.path = null;
    }

    /** 读取最新条目的显隐以及入口条件，关闭或销毁后禁止显示。 */
    private shouldShow(): boolean {
        const visible = this.path === null ? this.visible : RedDotManager.instance.isVisible(this.path);
        return !this.disposed && this.host.isValid
            && visible && this.canDisplay();
    }

    /** 异步加载后复核可见性；资源缺失只记录一次，后续刷新可重试。 */
    private async loadDot(): Promise<void> {
        this.loading = true;
        try {
            const prefab = await PrefabLoader.loadPrefab(RED_DOT_PREFAB);
            if (this.shouldShow()) {
                this.dot = PrefabLoader.spawnPrefab(prefab, this.host);
                if (this.useAnchorLayout) {
                    this.positionAtAnchor(this.dot);
                }
                this.dot.active = true;
            }
        } catch (error) {
            if (!this.disposed && this.host.isValid) {
                GameLog.shared.warnOnce("FRAMEWORK", "RedDotBinding", "PREFAB_LOAD",
                    "公共红点加载失败 " + RED_DOT_PREFAB + "：" + String(error));
            }
        } finally {
            this.loading = false;
        }
    }

    /** 锚点自身保留偏移和缩放，实例只贴合它的矩形和轴心。 */
    private positionAtAnchor(dot: Node): void {
        dot.setPosition(0, 0, 0);
        dot.layer = this.host.layer;
        const anchor = this.host.getComponent(UITransform);
        const icon = dot.getComponent(UITransform);
        if (anchor && icon) {
            icon.setContentSize(anchor.width, anchor.height);
            icon.setAnchorPoint(anchor.anchorX, anchor.anchorY);
        }
    }
}
