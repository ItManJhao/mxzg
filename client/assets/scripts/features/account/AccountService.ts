/** 账号会话服务：统一登录、恢复和失效处理；失效后仅保留本次应用内的账号提示，不保留授权。 */
import { batchNotifications } from "../../framework/EventDispatcher";
import type { GameFrame } from "../../platform/GameProtocolCodec";
import { SessionChanged } from "../../framework/SessionChanged";
import { AccountModel } from "./AccountModel";
import type { RoleProfile } from "./AccountModel";
import { readSession } from "./AccountApi";
import type { AccountGateway, AccountSession, LoginResult } from "./AccountApi";
import { SocketFailure } from "../../platform/GameSocketClient";

export interface SessionStore {
    read(): AccountSession | null;

    write(session: AccountSession): void;

    clear(): void;
}


/** Features use this capability instead of reading storage or owning a token. */
export interface AccountAuthorization {
    authenticated<T>(request: (token: string) => Promise<T>): Promise<T>;
}

export class AccountService implements AccountAuthorization {
    /** 应用安装的统一状态交付口，接纳身份与资产提交处于同一通知批次。 */
    onInitialized: ((frame: GameFrame) => void) | null = null;
    private operation = 0;
    private session: AccountSession | null = null;
    private expiredAccount = "";

    constructor(private readonly model: AccountModel, private readonly api: AccountGateway,
        private readonly store: SessionStore, private readonly now: () => number = Date.now) {
    }

    /** 返回当前身份或失效前的账号，供重建的登录页面预填；该提示不授予访问权限。 */
    get accountName(): string {
        return this.session?.account || this.model.snapshot.role?.nickname || this.expiredAccount;
    }

    get hasSession(): boolean {
        return !!this.session;
    }

    /** 清理旧传输后开始显式登录，未完成长连接同步不接受新角色。 */
    async login(account: string, serverId?: string): Promise<boolean> {
        const normalized = account.trim().toLowerCase();
        const operation = ++this.operation;
        // A new identity attempt must not restore a previous account after a failure.
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
            this.accept({ ...result, session: { ...result.session, account: normalized } });
            return true;
        } catch (error) {
            return this.fail(operation, error);
        }
    }

    /** 恢复持久会话；过期时撤销授权并保留账号提示，临时网络失败仍允许重试。 */
    async restore(): Promise<boolean> {
        const operation = ++this.operation;
        let session = this.session;
        try {
            session = session || this.store.read();
            if (session) session = readSession(session);
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
            this.accept({ session, role });
            return true;
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
        this.expiredAccount = "";
        this.invalidate("");
    }

    /** 接受经过校验的权威角色； notifications can be batched with other module commits. */
    acceptRole(role: RoleProfile): void {
        const current = this.model.snapshot.role;
        if (!this.session || this.model.snapshot.busy || !current || current.id !== role.id ||
            (current.serverId && role.serverId && current.serverId !== role.serverId)) throw new SessionChanged();
        this.model.replace({ busy: false, role, error: "" });
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

    /** 统一会话检查和旧回包隔离；断线未恢复时不排队发送任何新业务。 */
    async authenticated<T>(request: (token: string) => Promise<T>): Promise<T> {
        const session = this.session;
        const operation = this.operation;
        if (!session || this.model.snapshot.busy || !this.model.snapshot.role) throw new SessionChanged();
        if (Date.parse(session.expiresAt) <= this.now()) {
            this.expire();
            throw new SocketFailure("UNAUTHENTICATED", "登录已失效，请重新登录");
        }
        const current = () => operation === this.operation && session === this.session;
        try {
            this.api.assertReady?.(session.accessToken);
            const value = await request(session.accessToken);
            if (!current()) throw new SessionChanged();
            if (Date.parse(session.expiresAt) <= this.now()) {
                throw new SocketFailure("UNAUTHENTICATED", "登录已失效，请重新登录");
            }
            return value;
        } catch (error) {
            // An old account's 401 must never log out the new account.
            if (!current()) throw new SessionChanged();
            if (this.isUnauthorized(error)) this.expire();
            throw error;
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

    private accept(result: LoginResult): void {
        this.session = result.session;
        this.safely(() => this.store.write(result.session));
        batchNotifications(() => {
            this.model.replace({ busy: false, role: result.role, error: "" });
            const frame = this.api.initialization?.();
            if (frame) this.onInitialized?.(frame);
        });
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
