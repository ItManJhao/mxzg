/** 账号会话服务：统一登录、恢复和失效处理；失效后仅保留本次应用内的账号提示，不保留授权。 */
import { EventDispatcher } from "../../framework/EventDispatcher";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { SessionChanged } from "../../framework/SessionChanged";
import { AccountModel } from "./AccountModel";
import type { RoleProfile } from "./AccountModel";
import { AccountApi } from "./AccountApi";
import type { AccountGateway, AccountSession, LoginResult } from "./AccountApi";
import { SocketFailure } from "../../platform/GameSocketClient";

export interface SessionStore {
    read(): AccountSession | null;

    write(session: AccountSession): void;

    clear(): void;
}


export class AccountController {
    /** 应用安装的统一状态交付口，接纳身份与资产提交处于同一通知批次。 */
    onInitialized: ((frame: GameFrame) => void) | null = null;
    /** 每次登录、恢复或退出时递增，区分同一账号的不同登录过程。 */
    private operation = 0;
    /** 场景退出后停止受理登录、恢复和迟到的操作，保留持久凭证供下次启动。 */
    private disposed = false;
    /** 已接纳的登录凭证，退出或失效时清空。 */
    private session: AccountSession | null = null;
    private expiredAccount = "";

    constructor(private readonly model: AccountModel, private readonly api: AccountGateway,
        private readonly store: SessionStore, private readonly now: () => number = Date.now) {
    }

    /** 返回当前身份或失效前的账号，供重建的登录页面预填；该提示不授予访问权限。 */
    get accountName(): string {
        return this.session?.account || this.model.snapshot.role?.nickname || this.expiredAccount;
    }

    /** 当前是否持有登录凭证，角色资料仍可能在恢复中。 */
    get hasSession(): boolean {
        return !!this.session;
    }

    /** 返回同步完成的角色资料；等待登录或退出后返回 null。 */
    public get currentRole(): Readonly<RoleProfile> | null {
        const state = this.model.snapshot;
        return this.disposed || state.busy ? null : state.role;
    }

    /** 通知或业务回执须属于当前已就绪角色，缺少归属或不匹配时整笔拒绝交付。 */
    public requireRoleOwner(roleId: unknown): void {
        const role = this.currentRole;
        if (!role || role.id !== roleId) {
            throw new SocketFailure("INVALID_MESSAGE", "业务结果不属于当前角色");
        }
    }

    /** 用此刻已确认的区服及角色一次选定原操作日志；后续打开存储不会改用另一角色的主键。 */
    public openRoleJournal<T>(journal: { forRole(serverId: string, roleId: string): Promise<T> }): Promise<T> {
        const role = this.currentRole;
        if (!role?.serverId) {
            return Promise.reject(new SessionChanged());
        }
        return journal.forRole(role.serverId, role.id);
    }

    /** 进入所选账号和区服。仅账号、区服均匹配时复用已同步的当前角色。 */
    public async enterServer(account: string, serverId: string | undefined, entered: () => void): Promise<void> {
        if (this.disposed) {
            return;
        }
        const role = this.currentRole;
        const requestedAccount = account.trim().toLowerCase() || this.accountName;
        if (role && requestedAccount === this.accountName && (!serverId || (role.serverId || "local-1") === serverId)) {
            entered();
            return;
        }
        const login = this.login(requestedAccount, serverId);
        const operation = this.operation;
        if (await login && operation === this.operation) {
            entered();
        }
    }

    /** 清理旧传输后开始显式登录。仅当首包与角色状态共同提交且仍为本次登录时返回成功。 */
    async login(account: string, serverId?: string): Promise<boolean> {
        if (this.disposed) {
            return false;
        }
        const normalized = account.trim().toLowerCase();
        const operation = ++this.operation;
        // 显式登录失败后保留登录页，不能恢复刚退出的账号。
        this.session = null;
        this.api.disconnect?.();
        this.safely(() => this.store.clear());
        if (!/^[a-z0-9_-]{3,32}$/.test(normalized)) {
            this.model.replace({ busy: false, role: null, error: "账号需为 3–32 位英文、数字、下划线或连字符" });
            return false;
        }
        this.model.replace({ busy: true, role: null, error: "" });
        try {
            const result = await this.api.developmentLogin(normalized, serverId);
            if (operation !== this.operation) return false;
            return this.accept({ ...result, session: { ...result.session, account: normalized } }, operation);
        } catch (error) {
            return this.fail(operation, error);
        }
    }

    /** 恢复已保存的凭证；临时网络失败允许重试，初始资料成功交付才进入当前角色。 */
    async restore(): Promise<boolean> {
        if (this.disposed) {
            return false;
        }
        const operation = ++this.operation;
        let session = this.session;
        try {
            session = session || this.store.read();
            if (session) session = AccountApi.readSession(session);
        } catch {
            this.safely(() => this.store.clear());
            session = null;
        }
        if (!session) {
            this.logout();
            return false;
        }
        this.expiredAccount = session.account || "";
        if (Date.parse(session.expiresAt) <= this.now()) {
            this.expire();
            return false;
        }
        this.model.replace({ busy: true, role: null, error: "" });
        try {
            const role = await this.api.currentRole(session.accessToken);
            if (operation !== this.operation) return false;
            return this.accept({ session, role }, operation);
        } catch (error) {
            if (operation !== this.operation) return false;
            if (this.isUnauthorized(error)) {
                this.session = null;
                this.api.disconnect?.();
                this.safely(() => this.store.clear());
            }
            return this.fail(operation, error);
        }
    }

    /** 主动退出时清除账号提示，允许用户明确选择其他身份。 */
    logout(): void {
        if (this.disposed) {
            return;
        }
        this.expiredAccount = "";
        this.invalidate("");
    }

    /** 场景退出时结束本次登录及连接，保留已保存的凭证供下次启动恢复。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.operation++;
        this.session = null;
        this.onInitialized = null;
        this.api.disconnect?.();
    }

    /** 顶号事件只撤销其对应的当前令牌，旧连接通知不能影响新账号。 */
    rejectSession(token: string, message: string): void {
        if (this.session?.accessToken !== token) return;
        this.expiredAccount = this.accountName;
        this.invalidate(message);
    }

    /** 结束当前账号及传输任务，先清身份再通知页面与模块。 */
    private invalidate(error: string): void {
        this.operation++;
        this.session = null;
        this.api.disconnect?.();
        this.safely(() => this.store.clear());
        this.model.replace({ busy: false, role: null, error });
    }

    /** 认证并隔离旧回包；多步操作在每次追加发送前可再次确认发起时的会话。 */
    async authenticated<T>(request: (token: string, ensureCurrent: () => void) => Promise<T>): Promise<T> {
        const session = this.session;
        const operation = this.operation;
        if (!session || !this.currentRole) {
            throw new SessionChanged();
        }
        if (Date.parse(session.expiresAt) <= this.now()) {
            this.expire();
            throw new SocketFailure("UNAUTHENTICATED", "登录已失效，请重新登录");
        }
        const current = () => operation === this.operation && session === this.session;
        try {
            this.api.assertReady?.(session.accessToken);
            const value = await request(session.accessToken, () => {
                if (!current()) {
                    throw new SessionChanged();
                }
            });
            if (!current()) throw new SessionChanged();
            if (Date.parse(session.expiresAt) <= this.now()) {
                throw new SocketFailure("UNAUTHENTICATED", "登录已失效，请重新登录");
            }
            return value;
        } catch (error) {
            // 切号期间才返回的鉴权错误只能结束原操作。
            if (!current()) throw new SessionChanged();
            if (this.isUnauthorized(error)) this.expire();
            throw error;
        }
    }

    /**
     * 应用层统一交付业务请求：只向发起请求的当前身份交付成功或失败。
     * 换号、退出或身份失效后两种结果均静默结束，不让模块恢复旧请求状态；
     * 普通断网仍交付失败，模块可保留原幂等请求。关窗不改变身份，不取消交付。
     */
    async deliverAuthenticated<T>(request: (token: string) => Promise<T>,
        received: (value: T) => void, failed: (error: unknown) => void): Promise<void> {
        return this.deliverWhileCurrent(() => this.authenticated(request), received, failed);
    }

    /** 将成功或失败交给启动这项工作的登录会话；同角色断线恢复仍可完成已收到的通知。 */
    public async deliverWhileCurrent<T>(
        task: () => Promise<T>,
        received: (value: T) => void,
        failed: (error: unknown) => void,
    ): Promise<void> {
        if (this.disposed) {
            return;
        }
        const operation = this.operation;
        const session = this.session;
        const current = () => operation === this.operation && session === this.session;
        try {
            const value = await task();
            if (current()) {
                received(value);
            }
        } catch (error) {
            if (current()) {
                failed(error);
            }
        }
    }

    /** 长连接身份失效语义，网络超时不触发账号清理。 */
    private isUnauthorized(error: unknown): boolean {
        return error instanceof SocketFailure && error.unauthorized;
    }

    /** 清除令牌之前记住账号，避免登录页面重建后误用 Prefab 的默认账号。 */
    private expire(): void {
        this.expiredAccount = this.accountName;
        this.invalidate("登录已失效，请重新登录");
    }

    /** 首包和模块数据在同一批次提交。校验失败时先撤销试用中的凭证和角色，再通知订阅者。 */
    private accept(result: LoginResult, operation: number): boolean {
        EventDispatcher.batchNotifications(() => {
            try {
                // 各模块提交首包时需要当前角色，订阅者在批次结束后才能看到最终结果。
                this.session = result.session;
                this.model.replace({ busy: false, role: result.role, error: "" });
                const frame = this.api.initialization?.();
                if (frame) {
                    this.onInitialized?.(frame);
                }
                if (operation === this.operation) {
                    this.safely(() => this.store.write(result.session));
                }
            } catch (error) {
                if (operation === this.operation) {
                    this.session = null;
                    this.safely(() => this.store.clear());
                    this.fail(operation, error);
                }
            }
        });
        // 订阅者可以在收到完整首包时立即退出或开始另一次登录。
        return operation === this.operation && this.session === result.session;
    }

    /** 仅当前登录失败可结束传输；保留可恢复凭证，但不在登录页后台自动重连。 */
    private fail(operation: number, error: unknown): false {
        if (operation === this.operation) {
            this.api.disconnect?.();
            this.model.replace({
                busy: false, role: null,
                error: error instanceof Error ? error.message : "登录失败，请重试"
            });
        }
        return false;
    }

    private safely(action: () => void): void {
        try {
            action();
        } catch { /* Storage denial must not discard a valid live session. */
        }
    }
}
