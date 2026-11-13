/**
 * 模块生命周期基类：管理显式初始化、应用通知的数据重置和模块自有监听。
 * 不持有界面或协议状态，页面关闭不释放模块。
 */
import { EventDispatcher } from "./EventDispatcher";
import type { EventPayloads } from "./EventDispatcher";
import {EventScope} from "./EventScope";
import type {Unsubscribe} from "./EventScope";

/** 模块生命周期；连接与身份隔离归通信层和应用层。 */
export abstract class BaseController {
    /** 是否已完成初始化；销毁后不再接收模块协议。 */
    private initialized = false;
    /** 模块拥有的监听，统一在销毁时释放。 */
    private readonly eventScope = new EventScope(this.constructor.name);

    /** 供业务入口检查模块是否可用，不承担账号校验。 */
    protected get isInitialized(): boolean {
        return this.initialized;
    }

    /** 登记模块协议与监听，重复调用不重复登记。 */
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

    /** 应用要求模块重置业务数据，不在此维护第二套会话代次。 */
    resetSession(): void {
        this.onResetSession();
    }

    /** 释放模块监听和业务状态，不操作连接或凭证。 */
    dispose(): void {
        if (!this.initialized) return;
        this.initialized = false;
        EventDispatcher.instance.offTarget(this);
        this.eventScope.clear();
        this.resetSession();
        this.onDispose();
    }

    /** 将解除函数纳入模块生命周期。 */
    protected ownListener(unsubscribe: Unsubscribe): Unsubscribe {
        return this.eventScope.add(unsubscribe);
    }

    /** 发布业务状态事件，不向具体View发送回调。 */
    protected emit<K extends keyof EventPayloads>(event: K, payload: EventPayloads[K]): void {
        EventDispatcher.instance.emit(event, payload);
    }

    /** 子类登记自身协议和业务事件。 */
    protected abstract onInitialize(): void;

    /** 子类按应用指令清空业务数据。 */
    protected abstract onResetSession(): void;

    /** 子类释放注入的业务能力。 */
    protected onDispose(): void {
    }
}
