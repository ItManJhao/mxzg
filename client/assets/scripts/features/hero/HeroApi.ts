/** 英雄名册 DTO 校验：供统一 Protobuf 快照使用；旧查询类保持停用，不作为新版数据入口。 */
import { readHeroEquipment, HeroEquipment } from "./utils/HeroEquipment";
import { featureUnavailable } from "../PausedFeatures";

/** 服务端英雄实例 ID 保持字符串 UUID，templateId 为独立的英雄类型配置键。 */
export interface OwnedHero {
    /** 持久进化分支/等级及已核验技能；undefined未同步，0/0明确未进化。 */
    readonly evolution?: Readonly<{ type: number; level: number; skill?: Readonly<{ skillId: number; level: number }> }>;
    readonly id: string;
    readonly templateId: number;
    readonly level: number;
    readonly star: number;
    /** 服务端面板属性及来源覆盖；complete=false 时仍有旧版加成未恢复。 */
    readonly panelStats?: Readonly<{ values: Readonly<{ hp: number; atk: number; def: number; spd: number }>; includedSources: readonly string[]; pendingSources: readonly string[]; complete: boolean }>;
    /** 普通装备完整状态；undefined 未同步，items 空数组明确未穿戴。 */
    readonly equipment?: Readonly<{ items: readonly HeroEquipment[] }>;
    /** 服务端当前强化阶段；缺失表示未同步。 */
    readonly stage?: number;
    /** 服务端基础成长属性，不包含未恢复的装备和天赋加成。 */
    readonly baseStats?: Readonly<{ hp: number; atk: number; def: number; spd: number }>;
    /** 自身持久锁定；undefined 表示旧快照未同步，不能当作未锁定。 */
    readonly locked?: boolean;
    /** 主线阵容占用标记；缺失表示未同步，不等于未上阵。 */
    readonly deployed?: boolean;
}
export interface HeroGateway { list(token: string): Promise<readonly OwnedHero[]>; }

/** 校验单个持久英雄的基础字段并返回冻结副本，不接收客户端自建英雄。 */
export function readOwnedHero(value: unknown): OwnedHero {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("英雄资料无效");
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id) ||
        !positiveInteger(row.templateId) || !positiveInteger(row.level) || !positiveInteger(row.star)) throw new Error("英雄资料无效");
    if (row.locked !== undefined && typeof row.locked !== "boolean") throw new Error("英雄锁定状态无效");
    if (row.deployed !== undefined && typeof row.deployed !== "boolean") throw new Error("英雄上阵状态无效");
    let baseStats: OwnedHero["baseStats"];
    if (row.stage !== undefined && (!Number.isSafeInteger(row.stage) || Number(row.stage) < 0)) throw new Error("英雄阶段无效");
    if (row.baseStats !== undefined) { const b = row.baseStats as Record<string, unknown>; if (!b || typeof b !== "object" || Array.isArray(b) || ![b.hp, b.atk, b.def, b.spd].every(positiveInteger)) throw new Error("英雄基础属性无效"); baseStats = Object.freeze({ hp: b.hp as number, atk: b.atk as number, def: b.def as number, spd: b.spd as number }); }
    let equipment: OwnedHero["equipment"];
    if (row.equipment !== undefined) { const state = row.equipment as Record<string, unknown>; if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("英雄装备状态无效"); equipment = Object.freeze({ items: readHeroEquipment(state.items) }); }
    const panelStats = readPanelStats(row.panelStats);
    return Object.freeze({ evolution: readEvolution(row.evolution), panelStats, equipment, stage: row.stage as number | undefined, baseStats, deployed: row.deployed as boolean | undefined, locked: row.locked as boolean | undefined, id: row.id, templateId: row.templateId, level: row.level, star: row.star });
}

/** 基础等级、星级和配置 ID 必须是安全的正整数。 */
function positiveInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** 整组校验并拒绝重复实例 ID；空名册是有效状态。 */
export function readOwnedHeroes(value: unknown): readonly OwnedHero[] {
    if (!Array.isArray(value)) throw new Error("英雄列表无效");
    const heroes = value.map(readOwnedHero);
    if (new Set(heroes.map(hero => hero.id)).size !== heroes.length) throw new Error("英雄实例 ID 重复");
    const equipmentIds = new Set<string>();
    for (const hero of heroes) for (const item of hero.equipment?.items || []) { if (equipmentIds.has(item.instanceId)) throw new Error("装备实例跨英雄重复"); equipmentIds.add(item.instanceId); }
    return Object.freeze(heroes);
}

/** 英雄模块暂停，禁止继续调用旧业务接口。 */
export class HeroApi implements HeroGateway {
    /** 后续重做时再接入实际协议，目前明确拒绝。 */
    async list(_token: string): Promise<readonly OwnedHero[]> { return featureUnavailable(); }
}

/** 服务端最终容量和购买次数，容量已经包含 VIP；不在客户端计算消耗或上限。 */
export interface HeroRosterInfo {
    /** 最终总格数，已经包含扩容及 VIP 加成。 */
    readonly capacity: number;
    /** 已成功购买扩容的次数，不是额外格数。 */
    readonly buySpaceTimes: number;
}
/** 缺字段保留未同步状态；非法容量拒绝整包，不将旧快照解释为零容量。 */
export function readHeroRosterInfo(value: unknown): HeroRosterInfo | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("英雄容量无效");
    const row = value as Record<string, unknown>;
    if (!positiveInteger(row.capacity) || !Number.isSafeInteger(row.buySpaceTimes) || Number(row.buySpaceTimes) < 0) throw new Error("英雄容量无效");
    return Object.freeze({ capacity: row.capacity, buySpaceTimes: row.buySpaceTimes as number });
}

/** 校验服务端面板与覆盖声明；缺失保留未同步，不能前端自行把基础值当最终属性。 */
function readPanelStats(value: unknown): OwnedHero["panelStats"] {
    if (value === undefined) return undefined;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("英雄面板无效");
    const row = value as Record<string, unknown>, stats = row.values as Record<string, unknown>;
    if (!stats || typeof stats !== "object" || Array.isArray(stats) || ![stats.hp, stats.atk, stats.def, stats.spd].every(positiveInteger)) throw new Error("英雄面板数值无效");
    if (typeof row.complete !== "boolean" || !Array.isArray(row.includedSources) || !Array.isArray(row.pendingSources) || ![...row.includedSources, ...row.pendingSources].every(v => typeof v === "string" && !!v.trim())) throw new Error("英雄面板来源无效");
    const included = row.includedSources as string[], pending = row.pendingSources as string[];
    if (new Set([...included, ...pending]).size !== included.length + pending.length || !included.length || row.complete !== (pending.length === 0)) throw new Error("英雄面板覆盖状态矛盾");
    return Object.freeze({ values: Object.freeze({ hp: stats.hp as number, atk: stats.atk as number, def: stats.def as number, spd: stats.spd as number }), includedSources: Object.freeze([...included]), pendingSources: Object.freeze([...pending]), complete: row.complete });
}
/** 严格区分未同步/未进化/已进化，技能字段不得与状态矛盾。 */
function readEvolution(value: unknown): OwnedHero["evolution"] {
    if (value === undefined) return undefined;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("英雄进化状态无效");
    const row = value as Record<string, unknown>;
    if (!Number.isSafeInteger(row.type) || !Number.isSafeInteger(row.level) || Number(row.type) < 0 || Number(row.level) < 0 || (row.type === 0) !== (row.level === 0)) throw new Error("英雄进化状态无效");
    let skill: Readonly<{ skillId: number; level: number }> | undefined;
    if (row.type !== 0) {
        const source = row.skill as Record<string, unknown>;
        if (!source || typeof source !== "object" || Array.isArray(source) || !positiveInteger(source.skillId) || !positiveInteger(source.level)) throw new Error("进化技能无效");
        skill = Object.freeze({ skillId: source.skillId, level: source.level });
    } else if (row.skill !== undefined) throw new Error("未进化英雄不能附带进化技能");
    return Object.freeze({ type: row.type as number, level: row.level as number, skill });
}

/** 只读主线阵型，仍属于英雄模块统一状态；undefined表示旧快照未同步。 */
export interface MainFormation {
    /** 可选阵型及允许站位；未同步时不开放编辑，禁止自行推算。 */
    readonly options?: readonly Readonly<{ formationId: number; openPositions: readonly number[] }>[];
    /** 服务端持久选中阵型。 */
    readonly formationId: number;
    /** 永久解锁阵型，包含默认1。 */
    readonly unlockedIds: readonly number[];
    /** true表示永久开放9号助战位，不根据当前名册自行撤销。 */
    readonly assistanceUnlocked: boolean;
    /** 阵容保存版本，与整包资产revision不同。 */
    readonly version: number;
    /** 持久站位和所属实例；本批只展示数据，不修改历史站位。 */
    readonly slots: readonly Readonly<{ position: number; heroId: string }>[];
}
/** 同时验证解锁、版本、站位与名册归属；不能接受半包或跨角色英雄。 */
export function readMainFormation(value: unknown, heroes: readonly OwnedHero[]): MainFormation | undefined {
    if (value === undefined) return undefined;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("阵型状态无效");
    const row = value as Record<string, unknown>;
    if (!positiveInteger(row.formationId) || !Array.isArray(row.unlockedIds) || !row.unlockedIds.every(positiveInteger) || new Set(row.unlockedIds).size !== row.unlockedIds.length || !row.unlockedIds.includes(1) || !row.unlockedIds.includes(row.formationId) || typeof row.assistanceUnlocked !== "boolean" || !Number.isSafeInteger(row.version) || Number(row.version) < 0 || !Array.isArray(row.slots)) throw new Error("阵型状态矛盾");
    const owned = new Set(heroes.map(hero => hero.id)), positions = new Set<number>(), ids = new Set<string>();
    const slots = row.slots.map(value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("阵容站位无效");
        const slot = value as Record<string, unknown>;
        if (!positiveInteger(slot.position) || slot.position > 9 || typeof slot.heroId !== "string" || !owned.has(slot.heroId) || positions.has(slot.position) || ids.has(slot.heroId)) throw new Error("阵容归属或站位无效");
        positions.add(slot.position); ids.add(slot.heroId); return Object.freeze({ position: slot.position, heroId: slot.heroId });
    });
    const unlockedIds = row.unlockedIds as number[];
    let options: MainFormation["options"];
    if (row.options !== undefined) {
        if (!Array.isArray(row.options)) throw new Error("阵型选项无效");
        const seen = new Set<number>();
        options = Object.freeze(row.options.map(value => {
            const option = value as { formationId: number; openPositions: number[] };
            if (!option || !unlockedIds.includes(option.formationId) || seen.has(option.formationId) ||
                !Array.isArray(option.openPositions) || option.openPositions.some(pos => !positiveInteger(pos) || pos > 9 || (pos === 9 && !row.assistanceUnlocked)) ||
                new Set(option.openPositions).size !== option.openPositions.length) throw new Error("阵型允许位置无效");
            seen.add(option.formationId);
            return Object.freeze({ formationId: option.formationId, openPositions: Object.freeze([...option.openPositions]) });
        }));
        if (options.length && seen.size !== row.unlockedIds.length) throw new Error("阵型选项不完整");
    }
    return Object.freeze({ options, formationId: row.formationId, unlockedIds: Object.freeze([...row.unlockedIds]), assistanceUnlocked: row.assistanceUnlocked, version: row.version as number, slots: Object.freeze(slots) });
}
