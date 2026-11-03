/** 账号与角色唯一只读状态：凭证由 AccountService 持有，RoleController 提交权威角色，订阅者刷新界面。 */
import { publishNotification } from "../../framework/EventDispatcher";

/** 对照旧 2001 的本批基础字段；不存在表示尚未同步，不用全零数据伪装。 */
export interface RoleBasics {
  /** 当前角色等级内经验，不是英雄经验或累计经验。 */
  readonly experience: number;
  /** 旧 cup 初始竞技场积分；本批不开放竞技场结算。 */
  readonly cup: number;
  /** 头像 ID，0 为尚未设置，不等同于角色形象。 */
  readonly headId: number;
  /** 角色形象 ID，由服务端配置初始化。 */
  readonly imageId: number;
  /** 已选择头像框，0 为未设置。 */
  readonly borderId: number;
  /** 角色语言编号；新版开发账号使用 1（简体中文）。 */
  readonly language: number;
  /** 创建时刻，Unix 秒；旧记录为 0 时表示未知。 */
  readonly createdAtSeconds: number;
  /** 最近显式登录时刻，Unix 秒；网络恢复不重置。 */
  readonly lastLoginAtSeconds: number;
  /** 当前级升级经验门槛，最高级为 0；不允许前端据此自行升级。 */
  readonly experienceToNextLevel: number;
}

export interface RoleProfile {
  /** 所属角色字符串 ID，不能转为 number。 */
  readonly id: string;
  /** 服务器确认的昵称。 */
  readonly nickname: string;
  /** 角色等级，不是英雄等级。 */
  readonly level: number;
  /** 当前金币绝对余额。 */
  readonly gold: number;
  /** 当前钻石绝对余额。 */
  readonly diamonds: number;
  /** 角色所属区服；旧快照可能不包含。 */
  readonly serverId?: string;
  /** 服务器基础资料扩展，缺失时界面显示未同步。 */
  readonly basics?: Readonly<RoleBasics>;
}

export interface AccountState {
  readonly busy: boolean;
  readonly role: Readonly<RoleProfile> | null;
  readonly error: string;
}

/** The account feature's single source of UI data. Tokens never enter view state. */
export class AccountModel {
  private state: AccountState = Object.freeze({ busy: false, role: null, error: "" });
  private readonly listeners = new Set<(state: AccountState) => void>();

  get snapshot(): AccountState { return this.state; }

  subscribe(listener: (state: AccountState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** 原子替换账号与角色，并冻结嵌套基础资料，防止 View 绕过控制器修改资产。 */
  replace(state: AccountState): void {
    this.state = Object.freeze({ ...state, role: state.role ? Object.freeze({ ...state.role, ...(state.role.basics ? {basics:Object.freeze({...state.role.basics})} : {}) }) : null });
    publishNotification(this.notify);
  }
  private notify = (): void => { for (const listener of Array.from(this.listeners)) listener(this.state); };
}
