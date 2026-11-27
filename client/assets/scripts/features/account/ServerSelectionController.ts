/**
 * 区服选择：从共享目录读取登记信息，并在登录页打开期间检查各实例的匿名 WSS 响应。
 * 玩家可选状态随探测结果刷新；恢复凭证时仍按目录登记的实例地址核对归属。
 */
import { GameSocketClient } from "../../platform/GameSocketClient";

export interface GameServer {
    readonly id: string;
    readonly regionId: string;
    readonly regionName: string;
    readonly name: string;
    readonly enabled: boolean;
    /** 尚未收到此个人服的第一次探测结果时为 true，此时不能选择或进入。 */
    readonly checking?: boolean;
    /** 由内网目录登记的个人服地址。省略时由目录所在实例处理登录。 */
    readonly socketUrl?: string;
}

export class ServerSelectionController {
    /** 已校验的共享目录，登记开关和地址用于校验会话归属，不随暂时离线失效。 */
    private directory: readonly GameServer[] = [];
    /** 登录页与列表订阅的快照，enabled 同时要求已开放和可达。 */
    private rows: readonly GameServer[] = [];
    /** 最近一次共享目录请求是否成功；各个人服另行检测。 */
    private directoryOnline = false;
    /** 本次登录页已探测的个人服，键为区服 ID，结果只适用于记录的地址。 */
    private readonly health = new Map<string, { url: string; online: boolean }>();
    /** 当前登录页的取消句柄，离开时中止匿名探测及后续轮询。 */
    private monitor: AbortController | null = null;
    /** 同一轮询与点击进入可复用同一已登记实例的在途探测，结束或关页后移除。 */
    private readonly probes = new Map<string, Promise<boolean>>();
    /** 本页正在检查共享目录时，点击进入可等待同一结果。 */
    private directoryCheck: Promise<boolean> | null = null;
    private selectedId = "local-1";
    private listeners = new Set<() => void>();
    /** 每次请求目录时递增，防止较慢的旧响应覆盖更新后的路由。 */
    private loadGeneration = 0;

    /**
     * @param socket 应用注入的匿名目录与个人服探测连接，独立于已登录角色。
     * @param save 在玩家主动选服时保存区服编号。
     * @param saved 上次在本机选择的区服编号，首次启动可省略。
     */
    constructor(
        private readonly socket: Pick<GameSocketClient, "catalog" | "probePersonalServer">,
        private readonly save: (id: string) => void,
        saved?: string | null,
    ) {
        if (saved) {
            this.selectedId = saved;
        }
    }

    get servers(): readonly GameServer[] {
        return this.rows;
    }

    get selected(): GameServer | null {
        return this.rows.find(row => row.id === this.selectedId) || null;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** 获取共享目录并校验整包后更新各区服；已选区服临时维护时保留玩家选择。 */
    async load(signal?: AbortSignal): Promise<void> {
        const generation = ++this.loadGeneration;
        const data = await this.socket.catalog(signal, signal ? 3000 : undefined);
        if (signal?.aborted || generation !== this.loadGeneration) {
            return;
        }
        if (!Array.isArray(data)) {
            throw new Error("区服列表无效");
        }
        const seen = new Set<string>();
        const rows: GameServer[] = data.map(value => {
            if (!value || typeof value !== "object") {
                throw new Error("区服资料无效");
            }
            const row = value as Record<string, unknown>;
            for (const key of ["id", "regionId", "regionName", "name"]) {
                if (typeof row[key] !== "string" || !row[key]) {
                    throw new Error("区服资料无效");
                }
            }
            const id = row.id as string;
            if (typeof row.enabled !== "boolean" || !/^[a-z0-9_-]{1,32}$/.test(id) || seen.has(id)) {
                throw new Error("区服资料重复或无效");
            }
            seen.add(id);
            return Object.freeze({
                id,
                regionId: row.regionId as string,
                regionName: row.regionName as string,
                name: row.name as string,
                enabled: row.enabled,
                ...(row.socketUrl === undefined ? {} : { socketUrl: GameSocketClient.readPersonalSocketUrl(row.socketUrl) }),
            });
        });
        for (const [id, status] of this.health) {
            if (!rows.some(row => row.id === id && row.enabled && row.socketUrl === status.url)) {
                this.health.delete(id);
            }
        }
        this.directory = Object.freeze(rows);
        this.directoryOnline = true;
        if (rows.length && !rows.some(row => row.id === this.selectedId)) {
            this.selectedId = (rows.find(row => row.enabled) ?? rows[0]).id;
        }
        this.refreshRows();
    }

    /** 登录页打开时启动匿名轮询，每轮结束五秒后再查；关闭时释放定时器与本次监听的连接。 */
    public watchAvailability(): () => void {
        this.monitor?.abort();
        const scope = new AbortController();
        this.monitor = scope;
        this.directoryCheck = null;
        this.probes.clear();
        this.health.clear();
        this.refreshRows();
        let timer: ReturnType<typeof setTimeout> | undefined;
        scope.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        const refresh = async () => {
            await this.checkDirectory(scope.signal);
            if (scope.signal.aborted) {
                return;
            }
            const pending = this.directory.filter(row => row.enabled && row.socketUrl).values();
            // 最多四个并行连接，各行收到回包就独立刷新，慢实例不阻塞共享条目。
            const worker = async () => {
                for (const row of pending) {
                    if (scope.signal.aborted) {
                        return;
                    }
                    await this.checkPersonal(row, scope.signal);
                }
            };
            await Promise.all(Array.from({ length: Math.min(this.directory.length, 4) }, worker));
            if (!scope.signal.aborted) {
                timer = setTimeout(refresh, 5000);
            }
        };
        void refresh();
        return () => {
            scope.abort();
            if (scope === this.monitor) {
                this.monitor = null;
                this.probes.clear();
                this.directoryCheck = null;
            }
        };
    }

    /** 开始游戏时复核本次点击的实例；中途换服、关页或实例变更均取消本次进入。 */
    public async confirmEntry(id: string): Promise<boolean> {
        const row = this.selected;
        const signal = this.monitor?.signal;
        if (!row?.enabled || row.id !== id || !signal || signal.aborted) {
            return false;
        }
        const online = row.socketUrl
            ? await this.checkPersonal(row, signal)
            : await this.checkDirectory(signal);
        const current = this.selected;
        return online && !signal.aborted && !!current?.enabled && current.id === id && current.socketUrl === row.socketUrl;
    }

    /** 检查共享目录是否可达，失败时保留登记资料以便继续独立检测个人服。 */
    private checkDirectory(signal: AbortSignal): Promise<boolean> {
        if (!this.directoryCheck) {
            this.directoryCheck = this.load(signal).then(() => !signal.aborted, () => {
                if (!signal.aborted) {
                    this.directoryOnline = false;
                    this.refreshRows();
                }
                return false;
            }).then(online => {
                if (!signal.aborted) {
                    this.directoryCheck = null;
                }
                return online;
            });
        }
        return this.directoryCheck;
    }

    /** 同一已登记地址和编号共用一次匿名身份检查，过期的结果不能覆盖新路由。 */
    private checkPersonal(row: GameServer, signal: AbortSignal): Promise<boolean> {
        const url = row.socketUrl!;
        const key = row.id + ":" + url;
        const active = this.probes.get(key);
        if (active) {
            return active;
        }
        const check = this.socket.probePersonalServer(url, row.id, signal).then(online => {
            if (this.probes.get(key) === check) {
                this.probes.delete(key);
            }
            if (signal.aborted || !this.directory.some(server => server.id === row.id && server.enabled && server.socketUrl === url)) {
                return false;
            }
            this.health.set(row.id, { url, online });
            this.refreshRows();
            return online;
        });
        this.probes.set(key, check);
        return check;
    }

    /** 将已登记开关与当前可达性合并成页面快照，只在内容变化时通知，保留列表滚动状态。 */
    private refreshRows(): void {
        const next = this.directory.map(row => {
            const status = row.socketUrl ? this.health.get(row.id) : undefined;
            return Object.freeze({
                ...row,
                enabled: row.enabled && (row.socketUrl ? status?.online === true : this.directoryOnline),
                checking: !!(row.enabled && row.socketUrl && !status),
            });
        });
        if (next.length === this.rows.length && next.every((row, index) => {
            const previous = this.rows[index];
            return row.id === previous.id && row.regionId === previous.regionId && row.regionName === previous.regionName
                && row.name === previous.name && row.enabled === previous.enabled && row.socketUrl === previous.socketUrl
                && row.checking === previous.checking;
        })) {
            return;
        }
        this.rows = Object.freeze(next);
        this.publish();
    }

    /** 核对目录中已开放区服的游戏地址；临时离线保留凭证绑定，共享服沿用目录入口。 */
    public socketUrlFor(id: string): string | undefined {
        const row = this.directory.find(server => server.id === id && server.enabled);
        if (!row) {
            throw new Error("该服务器暂未开放，请重新选择");
        }
        return row.socketUrl;
    }

    choose(id: string): void {
        if (!this.rows.some(row => row.id === id && row.enabled))
            throw new Error("该服务器暂未开放");
        this.selectedId = id;
        try {
            this.save(id);
        } catch { /* live choice survives denied storage */
        }
        this.publish();
    }

    private publish(): void {
        for (const listener of this.listeners)
            listener();
    }
}
