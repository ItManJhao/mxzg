/**
 * 应用页面导航：保留主城根页并切换功能页，根页替换时清理上一会话的闲置界面。
 * 功能页是否保留由 UIManager 的页面注册决定；不拥有业务 Model 或资源池。
 */
import type { Node } from "cc";
import { UIManager } from "../../framework/ui/UIManager";
import type { PageNav } from "../../framework/ui/UIManager";

/** 主城提供功能页挂点和选中状态入口；内容显隐由主城页面自己处理。 */
export interface FeaturePageHost {
    /** 功能页可挂载时返回主城内容区，非功能页或主城未准备好时返回null。 */
    parent(id: string): Node | null;

    /** 同步更新功能选中与主城内容显隐；null表示恢复主城内容。 */
    changed(id: string | null): void;
}

/** 登录根页互相替换；功能页保留主城根和共用顶底栏，准备成功后直接切换显示。 */
export class RemakeNavigation implements PageNav {
    /** 当前已经挂载的页面ID；初始化前和销毁后为null，不表示尚在准备的意图。 */
    current: string | null = null;
    /** 当前页面的真实宿主节点；替换或销毁时清理，不持有准备中的页面。 */
    private currentHost: Node | null = null;
    /** 打开功能页时保存的主城根，返回时恢复；会话根替换或应用销毁时释放。 */
    private root: { id: string; host: Node } | null = null;

    /**
     * 保存统一页面管理器、场景挂点与可选主城宿主，不创建动画或另存页面缓存。
     * @param ui 应用已装配的页面管理器，负责生命周期和实例缓存。
     * @param parent 登录/主城根页面的场景挂点。
     * @param features 主城的功能页挂点与显隐通知；未提供时所有页面按根页面替换。
     */
    constructor(
        private readonly ui: UIManager,
        private readonly parent: Node,
        private readonly features?: FeaturePageHost,
    ) {
    }

    /** 将准备好的页面挂入导航；更换登录/主城根时清空旧页面缓存。 */
    openChild(id: string): void {
        const featureParent = this.features?.parent(id);
        const next = this.ui.createPageHost(id);
        if (!next) {
            throw new Error("页面未准备好：" + id);
        }
        if (featureParent?.isValid && this.current && this.currentHost) {
            const previous = this.root ? this.current : null;
            if (!this.root) {
                this.root = {id: this.current, host: this.currentHost};
            }
            next.parent = featureParent;
            this.current = id;
            this.currentHost = next;
            this.features?.changed(id);
            if (previous) {
                this.ui.noteClosed(previous);
            }
            return;
        }
        // 准备失败不会进入挂载阶段，原可见页面继续保留，避免失败时出现空白。
        const previous = this.current;
        next.parent = this.parent;
        this.current = id;
        this.currentHost = next;
        if (previous) {
            this.ui.noteClosed(previous);
        }
        if (this.root) {
            this.ui.noteClosed(this.root.id);
            this.root = null;
        }
        this.ui.clearCached();
        this.features?.changed(null);
    }

    /** 同步返回主城并关闭功能页；返回false表示已在根页，身份重置可在关页完成后清空Model。 */
    back(): boolean {
        const root = this.root;
        if (!root) {
            return false;
        }
        this.ui.keepOnly(root.id);
        const previousId = this.current!;
        this.current = root.id;
        this.currentHost = root.host;
        this.root = null;
        this.features?.changed(null);
        this.ui.noteClosed(previousId);
        return true;
    }

    /** 应用退出时取消准备任务并释放当前页和保留根；不延迟关闭或继续保存旧会话宿主。 */
    dispose(): void {
        this.ui.invalidatePending();
        if (this.current) {
            this.ui.noteClosed(this.current);
        }
        if (this.root) {
            this.ui.noteClosed(this.root.id);
            this.root = null;
        }
        this.current = null;
        this.currentHost = null;
        this.ui.uninstall(this);
    }
}
