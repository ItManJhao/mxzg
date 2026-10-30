import { JsonClient } from "../../platform/http/JsonClient";
import { readRole } from "../account/AccountApi";
import type { RoleProfile } from "../account/AccountModel";
import { readBagItems } from "../Bag/data/BagItemData";
import type { BagItemData } from "../Bag/data/BagItemData";
export interface CampaignUnit {
    id: string;
    ally: boolean;
    position: number;
    templateId: number;
    name: string;
    level: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
}
export interface CampaignHit {
    round: number;
    attackerId: string;
    targetId: string;
    damage: number;
    remainingHp: number;
}
export interface CampaignReward {
    itemId: number;
    quantity: number;
}
export interface CampaignReport {
    id: string;
    rulesVersion: string;
    stageId: number;
    won: boolean;
    units: CampaignUnit[];
    hits: CampaignHit[];
    rewards: CampaignReward[];
    claimed: boolean;
}
export interface CampaignState {
    stageId: number;
    initialized: boolean;
    pending: CampaignReport | null;
    rewards: CampaignReward[];
    units: CampaignUnit[];
    available: boolean;
}
export interface CampaignSettlement {
    battle: CampaignReport;
    role: RoleProfile;
    inventory: readonly BagItemData[];
    stageId: number;
}
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("战斗数据结构无效");
    return value as Record<string, unknown>;
}
function integer(value: unknown, min = 0): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min)
        throw new Error("战斗数值无效");
    return value;
}
function text(value: unknown): string { if (typeof value !== "string" || !value)
    throw new Error("战斗标识无效"); return value; }
function boolean(value: unknown): boolean { if (typeof value !== "boolean")
    throw new Error("战斗状态无效"); return value; }
function array(value: unknown): unknown[] { if (!Array.isArray(value))
    throw new Error("战斗列表无效"); return value; }
function readUnit(value: unknown): CampaignUnit {
    const u = object(value);
    return { id: text(u.id), ally: boolean(u.ally), position: integer(u.position, 1), templateId: integer(u.templateId, 1),
        name: text(u.name), level: integer(u.level, 1), maxHp: integer(u.maxHp, 1), attack: integer(u.attack), defense: integer(u.defense), speed: integer(u.speed) };
}
function readReward(value: unknown): CampaignReward { const r = object(value); return { itemId: integer(r.itemId, 1), quantity: integer(r.quantity, 1) }; }
export function readCampaignReport(value: unknown): CampaignReport {
    const row = object(value);
    const units = array(row.units).map(readUnit);
    const hp = new Map(units.map(unit => [unit.id, unit.maxHp]));
    if (hp.size !== units.length || !units.some(u => u.ally) || !units.some(u => !u.ally) || units.length > 14 ||
        units.filter(u => u.ally).length > 7 || units.filter(u => !u.ally).length > 7 ||
        new Set(units.map(u => `${u.ally}:${u.position}`)).size !== units.length)
        throw new Error("战斗站位无效");
    let round = 0;
    const hits = array(row.hits).map(value => {
        const h = object(value);
        const hit = { round: integer(h.round, 1), attackerId: text(h.attackerId), targetId: text(h.targetId), damage: integer(h.damage, 1), remainingHp: integer(h.remainingHp) };
        const attacker = units.find(u => u.id === hit.attackerId), target = units.find(u => u.id === hit.targetId);
        if (!attacker || !target || attacker.ally === target.ally || !hp.get(attacker.id) || hit.round < round || hit.round > 15 ||
            hp.get(target.id)! - hit.damage !== hit.remainingHp)
            throw new Error("战报血量或顺序无效");
        hp.set(target.id, hit.remainingHp);
        round = hit.round;
        return hit;
    });
    const rewards = array(row.rewards).map(readReward);
    const won = boolean(row.won);
    if (hits.length > 1000 || (!won && rewards.length) || won !== (units.some(u => u.ally && hp.get(u.id)! > 0) && units.every(u => u.ally || hp.get(u.id) === 0)))
        throw new Error("战斗结果无效");
    return { id: text(row.id), rulesVersion: text(row.rulesVersion), stageId: integer(row.stageId, 1), won, units, hits, rewards, claimed: boolean(row.claimed) };
}
function readState(value: unknown): CampaignState {
    const row = object(value);
    return { stageId: integer(row.stageId, 1), initialized: boolean(row.initialized), pending: row.pending === null ? null : readCampaignReport(row.pending),
        rewards: array(row.rewards).map(readReward), units: array(row.units).map(readUnit), available: boolean(row.available) };
}
export class CampaignApi {
    constructor(private readonly http: JsonClient) { }
    async initialize(token: string): Promise<CampaignState> { return readState(await this.http.request("/api/v1/campaign/initialize", {}, token)); }
    async current(token: string): Promise<CampaignState> { return readState(await this.http.request("/api/v1/campaign", undefined, token)); }
    async challenge(token: string, requestId: string): Promise<CampaignReport> { return readCampaignReport(await this.http.request("/api/v1/campaign/battles", { requestId }, token)); }
    async claim(token: string, id: string): Promise<CampaignSettlement> {
        const row = object(await this.http.request("/api/v1/campaign/battles/" + encodeURIComponent(id) + "/claim", {}, token));
        return { battle: readCampaignReport(row.battle), role: readRole(row.role), inventory: readBagItems(row.inventory), stageId: integer(row.stageId, 1) };
    }
}
