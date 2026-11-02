/** 会话级英雄名册协调：查询、鉴权、去重、升级结果提交与换号隔离；不持有 View，页面关闭不销毁。 */
import type {AccountModel} from "../account/AccountModel";
import type {AccountAuthorization} from "../account/AccountService";
import {SessionChanged} from "../account/AccountService";
import {BaseController} from "../../framework/BaseController";
import {publishNotification} from "../../framework/EventDispatcher";
import {readOwnedHeroes} from "./HeroApi";
import type {HeroGateway, OwnedHero} from "./HeroApi";
import {HeroRosterModel} from "./HeroRosterModel";
import type {HeroRosterState} from "./HeroRosterModel";
import {HeroRosterEvent} from "./HeroRosterEvent";

export interface HeroRosterDependencies {
    account: AccountModel;
    authorization: AccountAuthorization;
    api: HeroGateway;
}

export class HeroRosterController extends BaseController {
    static readonly instance = new HeroRosterController(HeroRosterModel.instance);
    private dependencies: HeroRosterDependencies | null = null;
    private epoch = 0;
    private pending: Promise<boolean> | null = null;

    /** 构造仅注入状态容器，不监听账号、不联网。 */
    constructor(private readonly model: HeroRosterModel) {
        super();
    }

    /** 应用显式初始化；重复同依赖不叠加监听，替换依赖必须先销毁。 */
    initialize(dependencies?: HeroRosterDependencies): void {
        if (this.isInitialized) {
            if (dependencies && (dependencies.account !== this.dependencies?.account || dependencies.authorization !== this.dependencies?.authorization || dependencies.api !== this.dependencies?.api)) throw new Error("英雄名册请先 dispose 再替换依赖");
            return;
        }
        if (!dependencies) throw new Error("英雄名册缺少初始化依赖");
        this.dependencies = Object.freeze({...dependencies});
        super.initialize();
    }

    /** 登记模块账号监听并同步角色归属；查询由明确 refresh 发起。 */
    protected onInitialize(): void {
        this.ownListener(this.dependencies!.account.subscribe(() => this.syncSession()));
        this.syncSession();
    }

    /** 角色与区服共同决定归属，退出/失效立即清空并废弃旧查询。 */
    private syncSession(): void {
        const state = this.dependencies!.account.snapshot;
        const key = !state.busy && state.role ? (state.role.serverId || "") + ":" + state.role.id : null;
        if (key !== this.model.roleKey) this.resetSession(key);
    }

    /** 会话切换或销毁时只重置本模块状态，不清理全局派发器。 */
    protected onResetSession(roleKey: string | null): void {
        this.invalidateQueries();
        this.model.reset(roleKey);
        this.notify();
    }

    /** 释放依赖；基类先解除监听和重置会话。 */
    protected onDispose(): void {
        this.dependencies = null;
    }

    /** 升级开始/提交时废弃旧读取，防止迟到名册覆盖新等级。 */
    invalidateQueries(): void {
        this.epoch++;
        this.pending = null;
    }

    /** 已鉴权资产事务提交权威名册；不计算等级或改库存。 */
    accept(heroes: readonly OwnedHero[]): void {
        if (!this.isInitialized || !this.model.roleKey) throw new SessionChanged();
        const rows = readOwnedHeroes(heroes);
        this.invalidateQueries();
        this.commit({status: "ready", heroes: rows, error: ""});
    }

    /** 查询共用在途请求；先登记 Promise 再通知，避免同步观察者重复请求。 */
    refresh(): Promise<boolean> {
        if (!this.isInitialized || !this.model.roleKey || !this.dependencies) return Promise.resolve(false);
        if (this.pending) return this.pending;
        const epoch = ++this.epoch, session = this.captureSession(), dependencies = this.dependencies;
        const request = Promise.resolve().then(() => this.load(epoch, session, dependencies));
        this.pending = request;
        void request.then(() => {
            if (this.pending === request) this.pending = null;
        });
        this.commit({status: "loading", heroes: [], error: ""});
        return request;
    }

    /** 明确废弃本角色当前查询，保留有效会话，可再次刷新。 */
    clear(): void {
        this.invalidateQueries();
        this.model.reset(this.model.roleKey);
        this.notify();
    }

    /** 查询完成前后均核对会话/查询代次；旧错误不能清空新角色。 */
    private async load(epoch: number, session: ReturnType<BaseController["captureSession"]>, dependencies: HeroRosterDependencies): Promise<boolean> {
        try {
            if (!this.isCurrent(session) || epoch !== this.epoch) return false;
            const heroes = await dependencies.authorization.authenticated(token => dependencies.api.list(token));
            if (!this.isCurrent(session) || epoch !== this.epoch) return false;
            this.commit({status: "ready", heroes: readOwnedHeroes(heroes), error: ""});
            return true;
        } catch (error) {
            if (!this.isCurrent(session) || epoch !== this.epoch || error instanceof SessionChanged) return false;
            this.commit({
                status: "error",
                heroes: [],
                error: error instanceof Error ? error.message : "英雄列表加载失败，请重试"
            });
            return false;
        }
    }

    /** 先提交唯一状态，再发布允许与库存事务一起延后的全局通知。 */
    private commit(state: HeroRosterState): void {
        this.model.replace(state);
        this.notify();
    }

    /** 延后通知读取最新状态，避免事务内英雄已升级而库存尚未提交。 */
    private notify(): void {
        publishNotification(() => this.emit(HeroRosterEvent.Updated, {
            roleKey: this.model.roleKey,
            revision: this.model.version
        }));
    }
}
