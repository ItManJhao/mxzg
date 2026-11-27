/** 区服选择：读取应用注入的 WebSocket 目录，保存用户选择。 */
import type { GameSocketClient } from "../../platform/GameSocketClient";

export interface GameServer {
    readonly id: string;
    readonly regionId: string;
    readonly regionName: string;
    readonly name: string;
    readonly enabled: boolean;
    /** 由内网目录登记的个人服地址。省略时由目录所在实例处理登录。 */
    readonly socketUrl?: string;
}

export class ServerSelectionController {
    private rows: readonly GameServer[] = [];
    private selectedId = "local-1";
    private listeners = new Set<() => void>();
    /** 每次请求目录时递增，防止较慢的旧响应覆盖更新后的路由。 */
    private loadGeneration = 0;

    /** 应用注入匿名目录连接、选择保存函数与上次区服，构造时不联网。 */
    constructor(private readonly socket: Pick<GameSocketClient, "catalog">, private readonly save: (id: string) => void, saved?: string | null) {
        if (saved)
            this.selectedId = saved;
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

    /** 通过 WS 获取实际区服，校验全部区服、唯一编号和地址后一次更新页面。 */
    async load(): Promise<void> {
        const generation = ++this.loadGeneration;
        const data = await this.socket.catalog();
        if (generation !== this.loadGeneration) {
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
                ...(row.socketUrl === undefined ? {} : { socketUrl: this.readSocketUrl(row.socketUrl) }),
            });
        });
        if (!rows.some(row => row.enabled)) {
            throw new Error("暂时没有开放的服务器");
        }
        this.rows = Object.freeze(rows);
        if (!this.selected?.enabled) {
            this.selectedId = rows.find(row => row.enabled)!.id;
        }
        this.publish();
    }

    /** 查找一个已开放区服的游戏地址。共享区服返回 undefined，由账号层沿用目录入口。 */
    public socketUrlFor(id: string): string | undefined {
        const row = this.rows.find(server => server.id === id && server.enabled);
        if (!row) {
            throw new Error("该服务器暂未开放，请重新选择");
        }
        return row.socketUrl;
    }

    /** 个人服只接受目录声明的绝对 WSS 游戏入口，拒绝凭证、查询参数、片段或其他业务路径。 */
    private readSocketUrl(value: unknown): string {
        if (typeof value !== "string" || !/^wss:\/\/[^\s/?#@\\]+\/api\/v1\/game\/socket$/.test(value)) {
            throw new Error("个人服连接地址无效");
        }
        return new URL(value).href;
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
