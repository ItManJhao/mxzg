/**
 * 应用页面导航：保留主城根页并切换功能页，根页替换时清理上一会话的闲置界面。
 * 功能页是否保留由 UIManager 的页面注册决定；不拥有业务 Model 或资源池。
 */
import type {Node} from "cc";
import { UIManager } from "../../framework/ui/UIManager";
import type { PageNav } from "../../framework/ui/UIManager";
import type { PageTransition } from "./PageTransitionUtils";

export interface FeaturePageHost {
    parent(id: string): Node | null;

    changed(id: string | null): void;

    content?(): Node | null;
}

/** Session roots replace each other; a feature keeps its home root and shared chrome. */
export class RemakeNavigation implements PageNav {
    current: string | null = null;
    private currentHost: Node | null = null;
    private root: { id: string; host: Node } | null = null;
    private stopTransition: (() => void) | null = null;

    constructor(private readonly ui: UIManager, private readonly parent: Node,
                private readonly features?: FeaturePageHost, private readonly transition?: PageTransition) {
    }

    /** 将准备好的页面挂入导航；更换登录/主城根时清空旧页面缓存。 */
    openChild(id: string): void {
        this.finishTransition();
        const featureParent = this.features?.parent(id);
        const next = this.ui.createPageHost(id);
        if (!next) throw new Error("页面未准备好：" + id);
        if (featureParent?.isValid && this.current && this.currentHost) {
            const previousId = this.current;
            const previous = this.root ? {id: this.current, host: this.currentHost} : null;
            const outgoing = previous?.host || this.features?.content?.() || null;
            if (!this.root) this.root = {id: this.current, host: this.currentHost};
            next.parent = featureParent;
            this.current = id;
            this.currentHost = next;
            this.features?.changed(id);
            this.animate(outgoing, next, previousId, id, () => {
                if (previous) this.closePage(previous.id, previous.host);
                else if (outgoing?.isValid) outgoing.active = false;
            });
            return;
        }
        // A failed load never reaches here, so the visible page survives loading failures.
        const previous = this.current;
        const previousHost = this.currentHost;
        next.parent = this.parent;
        this.current = id;
        this.currentHost = next;
        if (previous) this.ui.noteClosed(previous);
        if (previousHost?.isValid) previousHost.destroy();
        if (this.root) {
            this.ui.noteClosed(this.root.id);
            if (this.root.host.isValid) this.root.host.destroy();
            this.root = null;
        }
        this.ui.clearCached();
        this.features?.changed(null);
    }

    /** 返回主城根页；身份切换时animate=false，同步关页解除监听后才能清空模块数据。 */
    back(animate = true): boolean {
        this.finishTransition();
        const root = this.root;
        if (!root) return false;
        this.ui.keepOnly(root.id);
        const previousId = this.current!;
        const previousHost = this.currentHost!;
        this.current = root.id;
        this.currentHost = root.host;
        this.root = null;
        this.features?.changed(null);
        const incoming = this.features?.content?.();
        if (incoming && animate) {
            this.animate(previousHost, incoming, previousId, root.id, () => this.closePage(previousId, previousHost));
        } else {
            if (incoming?.isValid) {
                incoming.active = true;
            }
            this.closePage(previousId, previousHost);
        }
        return true;
    }

    dispose(): void {
        this.finishTransition();
        this.ui.invalidatePending();
        if (this.current) this.ui.noteClosed(this.current);
        if (this.currentHost?.isValid) this.currentHost.destroy();
        if (this.root) {
            this.ui.noteClosed(this.root.id);
            if (this.root.host.isValid) this.root.host.destroy();
            this.root = null;
        }
        this.current = null;
        this.currentHost = null;
        this.ui.uninstall(this);
    }

    /** 过渡结束后关闭功能页；缓存页交回管理器，其他页面销毁并释放节点作用域。 */
    private closePage(id: string, host: Node): void {
        const retained = this.ui.retainOnClose(host);
        this.ui.noteClosed(id);
        if (!retained && host.isValid) {
            host.destroy();
        }
    }

    private finishTransition(): void {
        const stop = this.stopTransition;
        this.stopTransition = null;
        stop?.();
    }

    private animate(from: Node | null, to: Node, fromId: string, toId: string, cleanup: () => void): void {
        if (!this.transition) {
            cleanup();
            return;
        }
        let completed = false;
        const finish = () => {
            if (!completed) {
                completed = true;
                cleanup();
            }
        };
        const stop = this.transition(from, to, fromId, toId, finish);
        if (!completed) this.stopTransition = () => {
            stop();
            finish();
        };
    }
}
