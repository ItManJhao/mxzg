/** 区服选择：读取应用注入的 WebSocket 目录，保存用户选择。 */
import type {GameSocketClient} from "../../platform/GameSocketClient";

export interface GameServer {
    readonly id: string;
    readonly regionId: string;
    readonly regionName: string;
    readonly name: string;
    readonly enabled: boolean;
}

export class ServerSelection {
    private rows: readonly GameServer[] = [];
    private selectedId = "local-1";
    private listeners = new Set<() => void>();

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

    /** 通过 WS 获取实际区服，整表校验后更新选择并通知页面。 */
    async load(): Promise<void> {
        const data = await this.socket.catalog();
        if (!Array.isArray(data))
            throw new Error("区服列表无效");
        const seen = new Set<string>();
        const rows: GameServer[] = data.map(value => {
            if (!value || typeof value !== "object")
                throw new Error("区服资料无效");
            const row = value as Record<string, unknown>;
            for (const key of ["id", "regionId", "regionName", "name"])
                if (typeof row[key] !== "string" || !row[key])
                    throw new Error("区服资料无效");
            if (typeof row.enabled !== "boolean" || seen.has(row.id as string))
                throw new Error("区服资料重复或无效");
            seen.add(row.id as string);
            return Object.freeze({
                id: row.id as string, regionId: row.regionId as string,
                regionName: row.regionName as string, name: row.name as string, enabled: row.enabled
            });
        });
        if (!rows.some(row => row.enabled))
            throw new Error("暂时没有开放的服务器");
        this.rows = Object.freeze(rows);
        if (!this.selected?.enabled)
            this.selectedId = rows.find(row => row.enabled)!.id;
        this.publish();
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
