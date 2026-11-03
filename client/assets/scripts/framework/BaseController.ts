/**
 * 模块生命周期基类：管理会话代次、显式初始化和模块自有监听。
 * 不持有界面或协议状态，页面关闭不释放模块。
 */
import {EventDispatcher} from "./EventDispatcher";
import type {EventPayloads} from "./EventDispatcher";
import {EventScope} from "./EventScope";
import type {Unsubscribe} from "./EventScope";

export interface ControllerSession {
    readonly generation: number;
    readonly roleKey: string | null;
}

/** Module lifetime. No View, protocol registration, inventory queue or reward policy. */
export abstract class BaseController {
    private initialized = false;
    private roleKey: string | null = null;
    private generation = 0;
    private readonly eventScope = new EventScope(this.constructor.name);

    protected get isInitialized(): boolean {
        return this.initialized;
    }

    initialize(): void {
        if (this.initialized) return;
        this.initialized = true;
        try {
            this.onInitialize();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    resetSession(roleKey: string | null): void {
        this.generation++;
        this.roleKey = roleKey;
        this.onResetSession(roleKey);
    }

    captureSession(): Readonly<ControllerSession> {
        return Object.freeze({generation: this.generation, roleKey: this.roleKey});
    }

    isCurrent(session: ControllerSession): boolean {
        return this.initialized && this.roleKey !== null && session.generation === this.generation && session.roleKey === this.roleKey;
    }

    dispose(): void {
        if (!this.initialized) return;
        this.initialized = false;
        EventDispatcher.instance.offTarget(this);
        this.eventScope.clear();
        this.resetSession(null);
        this.onDispose();
    }

    protected ownListener(unsubscribe: Unsubscribe): Unsubscribe {
        return this.eventScope.add(unsubscribe);
    }

    protected emit<K extends keyof EventPayloads>(event: K, payload: EventPayloads[K]): void {
        EventDispatcher.instance.emit(event, payload);
    }

    protected abstract onInitialize(): void;

    protected abstract onResetSession(roleKey: string | null): void;

    protected onDispose(): void {
    }
}
