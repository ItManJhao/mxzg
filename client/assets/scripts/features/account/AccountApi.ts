/** 账号边界：HTTP 交换身份；显式长连接试点通过鉴权/同步后才交付角色，不持有玩家状态。 */
import type { RoleProfile } from "./AccountModel";
import { JsonClient } from "../../platform/http/JsonClient";
import type { GameSocketClient } from "../../platform/GameSocketClient";

export interface AccountSession { accessToken: string; expiresAt: string; account?: string; }
export interface LoginResult { session: AccountSession; role: RoleProfile; }
export interface AccountGateway {
  developmentLogin(account: string, serverId?: string): Promise<LoginResult>;
  currentRole(token: string): Promise<RoleProfile>;
  disconnect?(): void;
  assertReady?(token: string): void;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("服务器返回的数据结构无效");
  return value as Record<string, unknown>;
}

export function readSession(value: unknown): AccountSession {
  const row = record(value);
  if (typeof row.accessToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(row.accessToken) ||
      typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) throw new Error("会话数据无效");
  if (row.account !== undefined && (typeof row.account !== "string" || !/^[a-z0-9_-]{3,32}$/.test(row.account))) throw new Error("会话账号无效");
  return { accessToken: row.accessToken, expiresAt: row.expiresAt, ...(typeof row.account === "string" ? { account: row.account } : {}) };
}

export function readRole(value: unknown): RoleProfile {
  const row = record(value);
  if (typeof row.id !== "string" || !row.id || typeof row.nickname !== "string" ||
      !Number.isSafeInteger(row.level) || Number(row.level) < 1 ||
      !Number.isSafeInteger(row.gold) || Number(row.gold) < 0 ||
      !Number.isSafeInteger(row.diamonds) || Number(row.diamonds) < 0) throw new Error("角色资料无效");
  const serverId = row.serverId;
  if (serverId !== undefined && (typeof serverId !== "string" || !/^[a-z0-9_-]{1,32}$/.test(serverId))) throw new Error("角色区服无效");
  return { id: row.id, nickname: row.nickname, level: Number(row.level), gold: Number(row.gold), diamonds: Number(row.diamonds),
    ...(typeof serverId === "string" ? { serverId } : {}) };
}

/** Boundary for the first two backend endpoints, independent of legacy wire opcodes. */
export class AccountApi implements AccountGateway {
  private epoch = 0;
  /** 应用选择唯一通信方式；关闭试点时保留现有 HTTP 行为。 */
  constructor(private readonly http: JsonClient, private readonly socket?: GameSocketClient) {}
  /** 交换开发身份并校验所选区服，等待长连接快照；旧登录任务不能接管新账号连接。 */
  async developmentLogin(account: string, serverId?: string): Promise<LoginResult> {
    const epoch = this.epoch;
    const data = record(await this.http.request("/api/v1/development/login", { account, ...(serverId ? { serverId } : {}) }));
    const session = readSession(data.session);
    const role = readRole(data.role);
    if (serverId && role.serverId !== serverId) throw new Error("服务器返回的角色区服与所选区服不一致，请重新选择服务器");
    if (epoch !== this.epoch) throw new Error("会话已切换");
    if (!this.socket) return { session, role };
    const current = await this.currentRole(session.accessToken);
    if (epoch !== this.epoch || current.id !== role.id || current.serverId !== role.serverId) throw new Error("会话角色不一致");
    return { session, role: current };
  }
  /** 重新读取权威角色；长连接重建后再次查询，避免拿连接建立时的旧钱包快照。 */
  async currentRole(token: string): Promise<RoleProfile> {
    if (this.socket) {
      const epoch = this.epoch;
      await this.socket.connect(token);
      if (epoch !== this.epoch) throw new Error("会话已切换");
      const snapshot = record(await this.socket.request(token, "session.sync"));
      return readRole(snapshot.role);
    }
    return readRole(await this.http.request("/api/v1/roles/me", undefined, token));
  }
  /** 登出/换号终止在途连接与登录任务，不等待窗口销毁。 */
  disconnect(): void { this.epoch++; this.socket?.disconnect(); }
  /** 试点断线期间拒绝新业务；现有 HTTP 写入口也不能绕过会话恢复门槛。 */
  assertReady(token: string): void { this.socket?.assertReady(token); }
}
