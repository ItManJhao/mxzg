/** 账号边界：WebSocket 交换身份；统一初始化通过鉴权/同步后才交付角色，不持有玩家状态。 */
import type { GameFrame } from "../../platform/GameProtocolCodec";
import type { RoleProfile } from "./AccountModel";
import type { GameSocketClient } from "../../platform/GameSocketClient";

export interface AccountSession { accessToken: string; expiresAt: string; account?: string; }
export interface LoginResult { session: AccountSession; role: RoleProfile; }
export interface AccountGateway {
  developmentLogin(account: string, serverId?: string): Promise<LoginResult>;
  currentRole(token: string): Promise<RoleProfile>;
  /** 本次连接完整状态，由应用交给模块 onNotify。 */
  initialization?(): GameFrame | null;
  disconnect?(): void;
  assertReady?(token: string): void;
}

/** 只接受对象资料，不将缺失数据解释成空角色或空会话。 */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("服务器返回的数据结构无效");
  return value as Record<string, unknown>;
}

/** 校验并拷贝持久凭证，拒绝非法令牌或无法解析的过期时间。 */
export function readSession(value: unknown): AccountSession {
  const row = record(value);
  if (typeof row.accessToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(row.accessToken) ||
      typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) throw new Error("会话数据无效");
  if (row.account !== undefined && (typeof row.account !== "string" || !/^[a-z0-9_-]{3,32}$/.test(row.account))) throw new Error("会话账号无效");
  return { accessToken: row.accessToken, expiresAt: row.expiresAt, ...(typeof row.account === "string" ? { account: row.account } : {}) };
}

/** 校验角色归属字段及非负钱包，零余额是合法资料。 */
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

/** WebSocket 账号入口：登录回包包含统一初始化，角色与背包由应用协调提交。 */
export class AccountApi implements AccountGateway {
  /** 应用注入唯一长连接，不持有资产副本。 */
  constructor(private readonly socket: GameSocketClient) {}
  /** 本地身份交换成功后直接读取首包，不追加角色或背包查询。 */
  async developmentLogin(account: string, serverId="local-1"): Promise<LoginResult> {
    const frame=await this.socket.login(account,serverId), body=record(frame.body), initial=record(body.initial);
    const role=readRole(initial.role);
    if(role.serverId!==serverId) throw new Error("角色区服与所选区服不一致");
    return {session:readSession(body.session),role};
  }
  /** 恢复连接直接使用鉴权首包；已连接则读取同连接最近的权威状态，不发送额外查询。 */
  async currentRole(token: string): Promise<RoleProfile> {
    await this.socket.connect(token);
    const frame=this.socket.latestState;
    if(!frame) throw new Error("缺少登录初始化数据");
    const body=record(frame.body);
    return readRole(record(frame.kind==="event"?body:body.initial).role);
  }
  /** 应用在接纳账号的同一通知批次中交付初始化状态。 */
  initialization(): GameFrame|null {return this.socket.latestState;}
  /** 换号、退出使旧连接和在途请求失效。 */
  disconnect(): void {this.socket.disconnect();}
  /** 断线期间拒绝业务请求，等待统一恢复。 */
  assertReady(token: string): void {this.socket.assertReady(token);}
}
