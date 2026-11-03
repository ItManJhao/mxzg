/** 此模块等待按原项目重做；旧业务通信已停用，保留 DTO 校验供后续恢复。 */
/** 普通升级 HTTP 边界：只提交实例、逻辑请求标识和预期等级，校验服务端权威条件及资产快照。 */
import { featureUnavailable } from "../PausedFeatures";
import {readOwnedHero, readOwnedHeroes} from "./HeroApi";
import type {OwnedHero} from "./HeroApi";
import {readRole} from "../account/AccountApi";
import type {RoleProfile} from "../account/AccountModel";
import {readBagItems} from "../Bag/data/BagItemData";
import type {BagItemData} from "../Bag/data/BagItemData";

export interface HeroStats {
    readonly hp: number;
    readonly atk: number;
    readonly def: number;
    readonly spd: number;
}

export interface HeroLevelPreview {
    readonly hero: OwnedHero;
    readonly stage: number;
    readonly levelLimit: number;
    readonly current: HeroStats;
    readonly next: HeroStats | null;
    readonly cost: { readonly gold: number; readonly experience: number } | null;
    readonly gold: number;
    readonly experience: number;
    readonly status: string;
    readonly configVersion: string;
}

export interface HeroLevelResult {
    readonly operation: {
        readonly requestId: string;
        readonly heroId: string;
        readonly fromLevel: number;
        readonly toLevel: number;
        readonly configVersion: string
    };
    readonly preview: HeroLevelPreview;
    readonly heroes: readonly OwnedHero[];
    readonly role: RoleProfile;
    readonly inventory: readonly BagItemData[];
}

/** 拒绝非对象结构，不使用强转掩盖无效回包。 */
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("升级响应结构无效");
    return value as Record<string, unknown>;
}

/** 升级涉及的所有数值必须为安全非负整数。 */
function number(value: unknown, min = 0): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw new Error("升级响应数值无效");
    return value;
}

/** 属性由服务端提供，客户端只校验，不另算一套成长公式。 */
function stats(value: unknown): HeroStats {
    const r = object(value);
    return Object.freeze({hp: number(r.hp, 1), atk: number(r.atk, 1), def: number(r.def, 1), spd: number(r.spd, 1)});
}

/** 条件、消耗和下一等级必须彼此一致，不能把缺失字段当作零消耗。 */
export function readHeroLevelPreview(value: unknown): HeroLevelPreview {
    const r = object(value), hero = readOwnedHero(r.hero), stage = number(r.stage),
        levelLimit = number(r.levelLimit, 1);
    if (typeof r.configVersion !== "string" || !/^hero-growth-[a-f0-9]{16}$/.test(r.configVersion) ||
        !["READY", "LEVEL_LIMIT", "INSUFFICIENT_GOLD", "INSUFFICIENT_HERO_EXP"].includes(String(r.status))) throw new Error("升级规则响应无效");
    const capped = r.status === "LEVEL_LIMIT", cost = capped ? null : object(r.cost);
    if (capped && (r.next !== null || r.cost !== null || hero.level < levelLimit)) throw new Error("升级上限响应无效");
    if (!capped && hero.level >= levelLimit) throw new Error("升级上限响应无效");
    const gold = number(r.gold), experience = number(r.experience);
    if (cost) {
        const expected = gold < number(cost.gold, 1) ? "INSUFFICIENT_GOLD" : experience < number(cost.experience, 1) ? "INSUFFICIENT_HERO_EXP" : "READY";
        if (r.status !== expected) throw new Error("升级余额与条件不一致");
    }
    return Object.freeze({
        hero, stage, levelLimit, current: stats(r.current), next: capped ? null : stats(r.next),
        cost: cost ? Object.freeze({gold: number(cost.gold, 1), experience: number(cost.experience, 1)}) : null,
        gold, experience, status: String(r.status), configVersion: r.configVersion
    });
}

export class HeroLevelApi {
    /** 暂停模块不再依赖网络客户端。 */
    constructor() {}

    /** 查询指定英雄实例的权威升级条件。 */
    async preview(token: string, heroId: string): Promise<HeroLevelPreview> {
        const result = readHeroLevelPreview(await featureUnavailable());
        if (result.hero.id !== heroId) throw new Error("升级条件实例不匹配");
        return result;
    }

    /** 升级固定一级；重复收据原等级不变，关联状态采用服务端本次事务中的最新快照。 */
    async upgrade(token: string, heroId: string, requestId: string, expectedLevel: number): Promise<HeroLevelResult> {
        const r = object(await featureUnavailable());
        const op = object(r.operation), preview = readHeroLevelPreview(r.preview), heroes = readOwnedHeroes(r.heroes);
        if (op.requestId !== requestId || op.heroId !== heroId || op.fromLevel !== expectedLevel || op.toLevel !== expectedLevel + 1 ||
            typeof op.configVersion !== "string" || preview.hero.id !== heroId || preview.hero.level < expectedLevel + 1 ||
            !heroes.some(hero => hero.id === heroId && hero.level === preview.hero.level)) throw new Error("升级收据与请求不匹配");
        const role = readRole(r.role), inventory = readBagItems(r.inventory);
        if (role.gold !== preview.gold || (inventory.find(item => item.itemId === 900101)?.quantity || 0) !== preview.experience)
            throw new Error("升级关联资产快照不一致");
        return {
            operation: {
                requestId,
                heroId,
                fromLevel: expectedLevel,
                toLevel: expectedLevel + 1,
                configVersion: op.configVersion
            },
            preview, heroes, role, inventory
        };
    }
}
