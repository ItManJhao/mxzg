/** 账号与角色唯一只读状态：凭证由 AccountController 持有，RoleController 提交权威角色，订阅者刷新界面。 */
import { EventDispatcher } from "../../framework/EventDispatcher";

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

/** 统一快照中的酒馆冒险点；独立于900401普通库存，不使用历史发奖回执补余额。 */
export interface TavernPointState {
    /** 本批已实现的权威快照格式，其他版本不能按本格式解释。 */
    readonly schemaVersion: 1;
    /** 当前持久冒险点绝对余额；可能因历史规则超过当前上限，不在客户端扣减。 */
    readonly adventureCount: number;
    /** 服务端按当前已通关关卡冻结的上限，零是合法已同步值。 */
    readonly limit: number;
}

export interface RoleProfile {
    /** 所属角色字符串 ID，不能转为 number。 */
    readonly id: string;
    /** 个人空间展示的十进制角色编号，未同步时缺失。 */
    readonly publicId?: string;
    /** 服务端确认的公会名称。空串表示未加入，缺失表示旧快照未同步。 */
    readonly guildName?: string;
    /** 服务器确认的昵称。 */
    readonly nickname: string;
    /** false 表示服务器要求首次命名，未提供该字段时沿用原角色入口。 */
    readonly firstNamed?: boolean;
    /** true 表示当前角色已命名且还有一份新手赠礼可领。 */
    readonly welcomeGiftAvailable?: boolean;
    /** 角色等级，不是英雄等级。 */
    readonly level: number;
    /** 服务端已保存主阵容的当前战力，空阵为 0，旧快照缺失表示未同步。 */
    readonly power?: number;
    /** 当前金币绝对余额。 */
    readonly gold: number;
    /** 当前钻石绝对余额。 */
    readonly diamonds: number;
    /** 角色所属区服；旧快照可能不包含。 */
    readonly serverId?: string;
    /** 服务器基础资料扩展，缺失时界面显示未同步。 */
    readonly basics?: Readonly<RoleBasics>;
    /** 服务器冒险点扩展；旧快照缺失表示未同步，不能用普通库存或零余额代替。 */
    readonly tavernPoints?: Readonly<TavernPointState>;
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

    get snapshot(): AccountState {
        return this.state;
    }

    subscribe(listener: (state: AccountState) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** 原子替换账号与角色，复制并冻结基础资料及冒险点；缺失扩展覆盖旧值，不沿用上次快照。 */
    replace(state: AccountState): void {
        this.state = Object.freeze({
            ...state,
            role: state.role ? Object.freeze({
                ...state.role,
                ...(state.role.basics ? { basics: Object.freeze({ ...state.role.basics }) } : {}),
                ...(state.role.tavernPoints ? {
                    tavernPoints: Object.freeze({ ...state.role.tavernPoints }),
                } : {}),
            }) : null,
        });
        EventDispatcher.publishNotification(this.notify);
    }

    private notify = (): void => {
        for (const listener of Array.from(this.listeners)) listener(this.state);
    };
}
