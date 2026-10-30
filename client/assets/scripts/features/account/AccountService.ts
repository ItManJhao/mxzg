import { AccountModel } from "./AccountModel";
import type { RoleProfile } from "./AccountModel";
import { readSession } from "./AccountApi";
import type { AccountGateway, AccountSession, LoginResult } from "./AccountApi";
import { HttpFailure } from "../../platform/http/JsonClient";

export interface SessionStore {
  read(): AccountSession | null;
  write(session: AccountSession): void;
  clear(): void;
}

export class SessionChanged extends Error {
  constructor() { super("会话已切换，请重新请求"); this.name = "SessionChanged"; }
}

/** Features use this capability instead of reading storage or owning a token. */
export interface AccountAuthorization {
  authenticated<T>(request: (token: string) => Promise<T>): Promise<T>;
}

export class AccountService implements AccountAuthorization {
  private operation = 0;
  private session: AccountSession | null = null;
  private profileRevision = 0;
  constructor(private readonly model: AccountModel, private readonly api: AccountGateway,
    private readonly store: SessionStore, private readonly now: () => number = Date.now) {}

  get accountName(): string { return this.session?.account || this.model.snapshot.role?.nickname || ""; }
  get hasSession(): boolean { return !!this.session; }

  async login(account: string, serverId?: string): Promise<boolean> {
    const normalized = account.trim().toLowerCase();
    const operation = ++this.operation;
    // A new identity attempt must not restore a previous account after a failure.
    this.session = null;
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
    } catch (error) { return this.fail(operation, error); }
  }

  async restore(): Promise<boolean> {
    const operation = ++this.operation;
    let session = this.session;
    try { session = session || this.store.read(); if (session) session = readSession(session); }
    catch { this.safely(() => this.store.clear()); session = null; }
    if (!session || Date.parse(session.expiresAt) <= this.now()) { this.logout(); return false; }
    this.model.replace({ busy: true, role: null, error: "" });
    try {
      const role = await this.api.currentRole(session.accessToken);
      if (operation !== this.operation) return false;
      this.accept({ session, role });
      return true;
    } catch (error) {
      if (operation !== this.operation) return false;
      if (error instanceof HttpFailure && error.status === 401) {
        this.session = null;
        this.safely(() => this.store.clear());
      }
      return this.fail(operation, error);
    }
  }

  logout(): void {
    this.invalidate("");
  }

  /** Refresh wallet/profile after an authoritative settlement, without reopening the session root. */
  async refreshRole(): Promise<void> {
    const operation = this.operation;
    const revision = this.profileRevision;
    const role = await this.authenticated(token => this.api.currentRole(token));
    if (operation !== this.operation) throw new SessionChanged();
    if (revision !== this.profileRevision) return;
    this.model.replace({ busy: false, role, error: "" });
  }

  /** Validated authoritative role payload; notifications can be batched with other module commits. */
  acceptRole(role: RoleProfile): void {
    const current = this.model.snapshot.role;
    if (!this.session || this.model.snapshot.busy || !current || current.id !== role.id ||
      (current.serverId && role.serverId && current.serverId !== role.serverId)) throw new SessionChanged();
    this.profileRevision++;
    this.model.replace({ busy: false, role, error: "" });
  }

  private invalidate(error: string): void {
    this.operation++;
    this.session = null;
    this.safely(() => this.store.clear());
    this.model.replace({ busy: false, role: null, error });
  }

  async authenticated<T>(request: (token: string) => Promise<T>): Promise<T> {
    const session = this.session;
    const operation = this.operation;
    if (!session || this.model.snapshot.busy || !this.model.snapshot.role) throw new SessionChanged();
    if (Date.parse(session.expiresAt) <= this.now()) {
      this.expire();
      throw new HttpFailure(401, "登录已失效，请重新登录");
    }
    const current = () => operation === this.operation && session === this.session;
    try {
      const value = await request(session.accessToken);
      if (!current()) throw new SessionChanged();
      if (Date.parse(session.expiresAt) <= this.now()) {
        throw new HttpFailure(401, "登录已失效，请重新登录");
      }
      return value;
    } catch (error) {
      // An old account's 401 must never log out the new account.
      if (!current()) throw new SessionChanged();
      if (error instanceof HttpFailure && error.status === 401) this.expire();
      throw error;
    }
  }

  private expire(): void {
    this.invalidate("登录已失效，请重新登录");
  }

  private accept(result: LoginResult): void {
    this.session = result.session;
    this.safely(() => this.store.write(result.session));
    this.model.replace({ busy: false, role: result.role, error: "" });
  }
  private fail(operation: number, error: unknown): false {
    if (operation === this.operation) this.model.replace({ busy: false, role: null,
      error: error instanceof Error ? error.message : "登录失败，请重试" });
    return false;
  }
  private safely(action: () => void): void { try { action(); } catch { /* Storage denial must not discard a valid live session. */ } }
}
