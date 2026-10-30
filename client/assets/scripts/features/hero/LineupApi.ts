import { JsonClient } from "../../platform/http/JsonClient";
export const MAIN_POSITIONS = [2, 3, 5, 6, 7, 8, 9] as const;
export interface LineupSlot {
    position: number;
    heroId: string;
}
export interface MainLineup {
    version: number;
    slots: LineupSlot[];
}
export function readMainLineup(value: unknown): MainLineup {
    const row = value as MainLineup;
    if (!row || !Number.isSafeInteger(row.version) || row.version < 0 || !Array.isArray(row.slots) || row.slots.length > 7)
        throw new Error("阵容数据无效");
    const ids = new Set<string>(), positions = new Set<number>();
    const slots = row.slots.map(slot => {
        if (!slot || !MAIN_POSITIONS.includes(slot.position as any) || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(slot.heroId) || ids.has(slot.heroId) || positions.has(slot.position))
            throw new Error("阵容站位无效");
        ids.add(slot.heroId);
        positions.add(slot.position);
        return { ...slot };
    });
    return { version: row.version, slots: slots.sort((a, b) => a.position - b.position) };
}
export class LineupApi {
    constructor(private readonly http: JsonClient) { }
    /** GET: the version returned here is required by the subsequent PUT. */
    async current(token: string): Promise<MainLineup> {
        return readMainLineup(await this.http.request("/api/v1/lineups/main", undefined, token));
    }
    async save(token: string, lineup: MainLineup): Promise<MainLineup> {
        return readMainLineup(await this.http.request("/api/v1/lineups/main", { expectedVersion: lineup.version, slots: lineup.slots }, token, "PUT"));
    }
}
