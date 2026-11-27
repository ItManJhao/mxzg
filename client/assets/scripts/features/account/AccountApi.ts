/** 账号边界：WebSocket 交换身份，统一快照校验角色和独立冒险点后交付唯一账号Model。
 * 不持有玩家状态，不从普通库存或历史奖励回执反推当前冒险点。 */
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import type { RoleProfile, RoleBasics, TavernPointState } from "./AccountModel";
import { SocketFailure, type GameSocketClient } from "../../platform/GameSocketClient";

/** 本机保存的凭证归属。只有区服目录与游戏地址仍匹配时，才可把凭证发给对应实例。 */
export interface AccountRoute {
    /** 登录时获取清单的可信入口。 */
    readonly directoryUrl: string;
    /** 签发凭证的具体游戏实例地址。 */
    readonly socketUrl: string;
    /** 服务端登录首包确认的区服编号。 */
    readonly serverId: string;
}

export interface AccountSession {
    accessToken: string;
    expiresAt: string;
    account?: string;
    /** 新版凭证记录原始实例；旧版共享服凭证可在受信任的原入口迁移。 */
    route?: AccountRoute;
}
export interface LoginResult {
    session: AccountSession;
    role: RoleProfile;
}
export interface AccountGateway {
    developmentLogin(account: string, serverId?: string): Promise<LoginResult>;
    currentRole(token: string, route?: AccountRoute): Promise<RoleProfile>;
    /** 核对目录里的区服仍指向会话创建时的地址。 */
    matchesRoute?(route: AccountRoute): boolean;
    /** 取得当前目录的地址，用于把旧共享服凭证升级到明确的实例绑定。 */
    routeFor?(serverId: string): AccountRoute;
    /** 本次连接完整状态，由应用交给模块 onNotify。 */
    initialization?(): GameFrame | null;
    disconnect?(): void;
    assertReady?(token: string): void;
}
/** WebSocket 账号入口：登录回包包含统一初始化，角色与背包由应用协调提交。 */
export class AccountApi implements AccountGateway {
    /** @param socket 应用注入的唯一长连接，用于登录、鉴权和首包。
     * @param resolveSocketUrl 从已校验的最新目录取得个人服地址，返回 undefined 表示共享服。 */
    constructor(private readonly socket: GameSocketClient,
        private readonly resolveSocketUrl?: (serverId: string) => string | undefined) {
    }

    /** 凭据只写入当前选服地址的绑定，角色及冒险点来自同一登录首包。 */
    async developmentLogin(account: string, serverId = "local-1"): Promise<LoginResult> {
        const route = this.routeFor(serverId);
        const frame = await this.socket.login(account, serverId, route.socketUrl);
        const body = AccountApi.record(frame.body);
        const role = AccountApi.readSnapshotRole(body.initial);
        if (role.serverId !== serverId) {
            throw new Error("角色区服与所选区服不一致");
        }
        return { session: { ...AccountApi.readSession(body.session), route }, role };
    }

    /** 恢复前重新核对目录；已下架或地址变更时先拒绝，不把旧凭证交给其他实例。 */
    async currentRole(token: string, route?: AccountRoute): Promise<RoleProfile> {
        if (route && !this.matchesRoute(route)) {
            throw new SocketFailure("UNAUTHENTICATED", "区服地址已变更或已下架，请重新选服登录");
        }
        await this.socket.connect(token, route?.socketUrl ?? this.socket.directoryUrl, route?.serverId);
        const frame = this.socket.latestState;
        if (!frame) {
            throw new Error("缺少登录初始化数据");
        }
        const body = AccountApi.record(frame.body);
        return AccountApi.readSnapshotRole(frame.kind === "event" ? body : body.initial);
    }

    /** 判断同一区服能否复用已登录角色。目录未开放该条目也视为绑定已失效。 */
    public matchesRoute(route: AccountRoute): boolean {
        if (route.directoryUrl !== this.socket.directoryUrl) {
            return false;
        }
        try {
            return this.routeFor(route.serverId).socketUrl === route.socketUrl;
        } catch {
            return false;
        }
    }

    /** 区服编号取自已开放的目录行，老协议的同实例条目统一使用目录入口。 */
    public routeFor(serverId: string): AccountRoute {
        const directoryUrl = this.socket.directoryUrl;
        return { serverId, directoryUrl, socketUrl: this.resolveSocketUrl?.(serverId) ?? directoryUrl };
    }

    /** 应用在接纳账号的同一通知批次中交付初始化状态。 */
    initialization(): GameFrame | null {
        return this.socket.latestState;
    }

    /** 换号、退出使旧连接和在途请求失效。 */
    disconnect(): void {
        this.socket.disconnect();
    }

    /** 断线期间拒绝业务请求，等待统一恢复。 */
    assertReady(token: string): void {
        this.socket.assertReady(token);
    }

    /** 只接受对象资料，不将缺失数据解释成空角色或空会话。 */
    private static record(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("服务器返回的数据结构无效");
        }
        return value as Record<string, unknown>;
    }

    /** 校验并拷贝持久凭证及可选归属；损坏的路由不按旧版共享服凭证解释。 */
    public static readSession(value: unknown): AccountSession {
        const row = AccountApi.record(value);
        if (typeof row.accessToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(row.accessToken) ||
            typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) {
            throw new Error("会话数据无效");
        }
        if (row.account !== undefined && (typeof row.account !== "string" || !/^[a-z0-9_-]{3,32}$/.test(row.account))) {
            throw new Error("会话账号无效");
        }
        let route: AccountRoute | undefined;
        if (row.route !== undefined) {
            const saved = AccountApi.record(row.route);
            if (typeof saved.serverId !== "string" || !/^[a-z0-9_-]{1,32}$/.test(saved.serverId)
                || typeof saved.socketUrl !== "string" || !saved.socketUrl
                || typeof saved.directoryUrl !== "string" || !saved.directoryUrl) {
                throw new Error("会话区服地址无效");
            }
            route = { serverId: saved.serverId, socketUrl: saved.socketUrl, directoryUrl: saved.directoryUrl };
        }
        return {
            accessToken: row.accessToken,
            expiresAt: row.expiresAt, ...(typeof row.account === "string" ? { account: row.account } : {}),
            ...(route ? { route } : {}),
        };
    }

    /**
     * 从统一快照一次投影角色和独立冒险点；扩展缺失保持未同步，合法超上限余额原样保留。
     * 新快照同时携带900401普通库存属于重复资产表达，整包拒绝；旧快照保留其原库存且不推导点数。
     */
    public static readSnapshotRole(value: unknown): RoleProfile {
        const snapshot = AccountApi.record(value);
        const role = AccountApi.readRole(snapshot.role);
        if (snapshot.tavernPoints === undefined) {
            return role;
        }
        const tavernPoints = AccountApi.readTavernPoints(snapshot.tavernPoints);
        if (Array.isArray(snapshot.inventory)
            && snapshot.inventory.some(item => item?.itemId === 900401)) {
            throw new Error("冒险点不能同时放入普通库存：900401");
        }
        return { ...role, tavernPoints };
    }

    /** 已提供的冒险点扩展必须完整且格式受支持；零余额、零上限和历史超上限余额均有效。 */
    private static readTavernPoints(value: unknown): Readonly<TavernPointState> {
        const row = AccountApi.record(value);
        if (row.schemaVersion !== 1 || !Number.isSafeInteger(row.adventureCount)
            || Number(row.adventureCount) < 0 || !Number.isSafeInteger(row.limit) || Number(row.limit) < 0) {
            throw new Error("冒险点快照版本、余额或上限无效");
        }
        return Object.freeze({
            schemaVersion: 1,
            adventureCount: Number(row.adventureCount),
            limit: Number(row.limit),
        });
    }

    /** 严格校验整组角色基础字段；时间单位为秒，不能用缺省零掩盖缺字段。 */
    private static readBasics(value: unknown): Readonly<RoleBasics> {
        const row = AccountApi.record(value);
        const keys = ["experience", "cup", "headId", "imageId", "borderId", "language", "createdAtSeconds", "lastLoginAtSeconds", "experienceToNextLevel"] as const;
        for (const key of keys) {
            if (!Number.isSafeInteger(row[key]) || Number(row[key]) < 0) {
                throw new Error("角色基础字段无效：" + key);
            }
        }
        for (const key of ["cup", "headId", "imageId", "borderId"] as const) {
            if (Number(row[key]) > 2147483647) {
                throw new Error("角色基础字段超限：" + key);
            }
        }
        if (Number(row.language) > 8 || Number(row.lastLoginAtSeconds) < Number(row.createdAtSeconds)
            || (Number(row.experienceToNextLevel) > 0 && Number(row.experience) >= Number(row.experienceToNextLevel))) {
            throw new Error("角色基础资料范围无效");
        }
        return Object.freeze({
            experience: Number(row.experience),
            cup: Number(row.cup),
            headId: Number(row.headId),
            imageId: Number(row.imageId),
            borderId: Number(row.borderId),
            language: Number(row.language),
            createdAtSeconds: Number(row.createdAtSeconds),
            lastLoginAtSeconds: Number(row.lastLoginAtSeconds),
            experienceToNextLevel: Number(row.experienceToNextLevel)
        });
    }

    /** 校验身份、钱包、当前战力、命名和公会资料；可选字段缺失按未同步处理。 */
    public static readRole(value: unknown): RoleProfile {
        const row = AccountApi.record(value);
        if (typeof row.id !== "string" || !row.id || typeof row.nickname !== "string" ||
            !Number.isSafeInteger(row.level) || Number(row.level) < 1 ||
            !Number.isSafeInteger(row.gold) || Number(row.gold) < 0 ||
            !Number.isSafeInteger(row.diamonds) || Number(row.diamonds) < 0) {
            throw new Error("角色资料无效");
        }
        const serverId = row.serverId;
        if (serverId !== undefined && (typeof serverId !== "string" || !/^[a-z0-9_-]{1,32}$/.test(serverId))) {
            throw new Error("角色区服无效");
        }
        const publicId = row.publicId;
        if (publicId !== undefined && (typeof publicId !== "string" || !/^[1-9][0-9]{9,18}$/.test(publicId)
            || (publicId.length === 19 && publicId > "9223372036854775807"))) {
            throw new Error("角色公开编号无效");
        }
        if (row.firstNamed !== undefined && typeof row.firstNamed !== "boolean") {
            throw new Error("角色首次命名状态无效");
        }
        if ((row.welcomeGiftAvailable !== undefined && typeof row.welcomeGiftAvailable !== "boolean")
            || (row.welcomeGiftAvailable === true && row.firstNamed !== true)) {
            throw new Error("角色新手赠礼资格无效");
        }
        if (row.guildName !== undefined && (typeof row.guildName !== "string" || row.guildName.length > 128)) {
            throw new Error("角色公会资料无效");
        }
        if (row.power !== undefined && (typeof row.power !== "number"
            || !Number.isSafeInteger(row.power) || row.power < 0 || row.power > 2147483647)) {
            throw new Error("角色当前战力无效");
        }
        return {
            id: row.id,
            ...(typeof publicId === "string" ? { publicId } : {}),
            ...(typeof row.guildName === "string" ? { guildName: row.guildName } : {}),
            nickname: row.nickname,
            ...(typeof row.firstNamed === "boolean" ? { firstNamed: row.firstNamed } : {}),
            ...(typeof row.welcomeGiftAvailable === "boolean" ? { welcomeGiftAvailable: row.welcomeGiftAvailable } : {}),
            level: Number(row.level),
            ...(typeof row.power === "number" ? { power: row.power } : {}),
            gold: Number(row.gold),
            diamonds: Number(row.diamonds),
            ...(typeof serverId === "string" ? { serverId } : {}), ...(row.basics !== undefined ? { basics: AccountApi.readBasics(row.basics) } : {})
        };
    }
}
