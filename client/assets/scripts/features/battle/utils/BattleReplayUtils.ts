/** 校验配置关卡、竞技场和历史样本的 Protobuf 战报，整理有序播放步骤；服务端负责伤害和奖励。 */
import { ARENA_REPLAY_ROSTERS } from "../../../config/ArenaReplayRoster.generated";
import { DAILY_DUNGEON_REPLAY_ROSTERS } from "../../../config/DailyGoldReplayRoster.generated";
import { DREAMLAND_REPLAY_ROSTERS } from "../../../config/DreamlandReplayRoster.generated";
import { TOWER_REPLAY_ROSTERS } from "../../../config/TowerReplayRoster.generated";
import { mxzg } from "../../../platform/GameProtocol.generated";

/** 生成器运行时64位值；校验时显式转换，实例身份保持字符串。 */
type WireLong = number | { toString(): string };
/** Protobuf解码形状；可选字段存在性仍须通过hasOwnProperty检查。 */
interface WireEvent {
    kind: string; sourceId: number; targetId: number; configId: number;
    skillLevel: number; skillType: number; actualHpChange: WireLong;
    reportedHpChange: WireLong; dead: boolean; buffInstanceId: WireLong;
    expiresAtRound: number; buffValue: WireLong; removalReason: string;
}
/** 协议单位：身份、阵营和生命各自独立，不用模板或ID推断阵营。 */
interface WireUnit {
    unitId: number; faction: number; templateId: number; level: number; position: number;
    initialHp: WireLong; maxHp: WireLong; finalHp: WireLong;
    /** 新战报的旧口径输出总量，须区分字段缺失和0。 */
    totalDamage?: WireLong;
    /** 新战报的实际承伤总量，须独立校验安全整数范围。 */
    totalTakenDamage?: WireLong;
    /** 施法者的旧口径治疗量，包含溢出治疗并保留符号。 */
    totalRecovery?: WireLong;
    /** 本场冻结星级，旧战报允许缺失。 */
    star?: number;
    /** 开战时冻结的头像资源ID，旧战报可缺失。 */
    portraitIconId?: number;
}

/** 校验后的只读展示单位；生命为可精确显示的安全整数。 */
export interface BattleReplayUnit {
    readonly unitId: number;
    readonly faction: number;
    readonly templateId: number;
    readonly level: number;
    readonly position: number;
    readonly initialHp: number;
    readonly maxHp: number;
    readonly finalHp: number;
    /** 服务端按旧护盾口径冻结的伤害输出；旧战报缺失为null，不能显示成0。 */
    readonly totalDamage?: number | null;
    /** 服务端冻结的实际承伤；与输出伤害口径不同。 */
    readonly totalTakenDamage?: number | null;
    /** 服务端冻结的治疗输出；缺失不补零，负治疗不取绝对值。 */
    readonly totalRecovery?: number | null;
    /** 历史星级；缺失时隐藏星级，不读取当前英雄。 */
    readonly star?: number | null;
    /** 历史头像资源ID；缺失时不读取当前英雄外观。 */
    readonly portraitIconId?: number | null;
}

/** 仅声明本适配器使用的解码字段，不手改生成代码。 */
interface WireReplay {
    /** 开战名称字段；缺失与空字符串不同，空串保留原战报语义。 */
    attackerName?: string;
    defenderName?: string;
    schemaVersion: number; scenario: string; rounds: number; outcome: string;
    units: WireUnit[];
    phases: Array<{ round: number; sourceId: number; events: WireEvent[] }>;
}

/** 每步保留真实事件及执行后的逐单位血量，供播放器按顺序消费。 */
export interface BattleReplayStep {
    /** 本地回合准备步骤的旧版停顿秒数，不属于服务端业务事件。 */
    readonly readySeconds?: number;
    readonly round: number;
    readonly kind: string;
    readonly sourceId: number;
    readonly targetId: number;
    readonly configId: number;
    /** 技能起止使用真实等级和类型，非技能事件为null。 */
    readonly skillLevel: number | null;
    readonly skillType: number | null;
    /** 扣血、治疗或复活的实际变更用于血条，报告变更用于飘字。 */
    readonly actualHpChange: number | null;
    readonly reportedHpChange: number | null;
    /** 伤害是否来自战报明确的主动技能段，供飘字选用技能字体。 */
    readonly activeSkillDamage?: boolean;
    readonly dead: boolean | null;
    /** Buff身份为字符串，期限为绝对回合；非Buff事件为null。 */
    readonly buffInstanceId: string | null;
    readonly expiresAtRound: number | null;
    readonly buffValue: string | null;
    readonly removalReason: string | null;
    /** 按本场unitId索引的冻结生命快照，不固定为攻守双方各一个数。 */
    readonly hpByUnit: Readonly<Record<number, number>>;
}

/** 一次完整解码和校验后交付的只读战报，统一提供播放步骤、名册和双方名称。 */
export interface ParsedBattleReplay {
    /** 按服务端顺序整理的播放步骤，含本地回合准备步骤。 */
    readonly steps: readonly BattleReplayStep[];
    /** 已校验的本场冻结名册，不依赖玩家现有阵容。 */
    readonly units: readonly BattleReplayUnit[];
    /** 开战时保存的双方名称，缺失为null，保留已记录的空串。 */
    readonly names: Readonly<{ attacker: string | null; defender: string | null }>;
    /** 当前战斗类型的最大回合数，用于显示播放进度。 */
    readonly maxRounds: number;
}

export class BattleReplayUtils {
    /** 将协议内的战报编码为播放器使用的字节；字段和完整事件链都通过后才交付。 */
    public static encodeVerified(replay: object): Uint8Array {
        const codec = (mxzg as unknown as { game: { BattleReplay: {
            verify(value: object): string | null;
            encode(value: object): { finish(): Uint8Array };
        } } }).game.BattleReplay;
        const error = codec.verify(replay);
        if (error) {
            throw new Error("战报协议字段无效：" + error);
        }
        const bytes = codec.encode(replay).finish();
        this.parse(bytes);
        return bytes;
    }

    /** 读取已校验战报的冻结名称；缺失返回null，不读取当前角色资料。 */
    public static names(bytes: Uint8Array): ParsedBattleReplay["names"] {
        return this.parse(bytes).names;
    }
    /** 校验整包后保留服务器单位身份、模板及站位，展示层不再把所有人塞入首槽。 */
    public static units(bytes: Uint8Array): readonly BattleReplayUnit[] {
        return this.parse(bytes).units;
    }

    /** 完整校验原始战报，只向仅需播放步骤的调用方返回步骤。 */
    public static decode(bytes: Uint8Array): readonly BattleReplayStep[] {
        return this.parse(bytes).steps;
    }

    /** 校验最多双方各8个单位；只有永恒梦境允许已阵亡的己方单位沿用0起始生命。 */
    public static validateUnits(units: readonly WireUnit[], carriesDefeatedAllies = false): readonly BattleReplayUnit[] {
        if (units.length < 2 || units.length > 16) throw new Error("战报单位数量无效");
        const ids = new Set<number>();
        const seats = new Set<string>();
        const factions = new Set<number>();
        const result = units.map(unit => {
            this.required(unit, ["level", "faction", "maxHp"]);
            if (!Number.isInteger(unit.unitId) || unit.unitId <= 0 || ids.has(unit.unitId)
                || (unit.faction !== 1 && unit.faction !== 2)
                || !Number.isInteger(unit.position) || unit.position < 1 || unit.position > 8
                || !Number.isInteger(unit.templateId) || unit.templateId <= 0) {
                throw new Error("战报单位身份或阵营站位无效");
            }
            if (!Number.isInteger(unit.level) || unit.level < 1) throw new Error("战报单位等级无效");
            const seat = unit.faction + ":" + unit.position;
            if (seats.has(seat)) throw new Error("战报同侧站位重复");
            ids.add(unit.unitId);
            seats.add(seat);
            factions.add(unit.faction);
            const initialHp = this.integer(unit.initialHp);
            const maxHp = this.integer(unit.maxHp);
            const finalHp = this.integer(unit.finalHp);
            const totalDamage = Object.prototype.hasOwnProperty.call(unit, "totalDamage") ? this.integer(unit.totalDamage!) : null;
            const totalTakenDamage = Object.prototype.hasOwnProperty.call(unit, "totalTakenDamage") ? this.integer(unit.totalTakenDamage!) : null;
            const totalRecovery = Object.prototype.hasOwnProperty.call(unit, "totalRecovery") ? this.integer(unit.totalRecovery!, true) : null;
            const portraitIconId = Object.prototype.hasOwnProperty.call(unit, "portraitIconId") ? this.integer(unit.portraitIconId!) : null;
            if (portraitIconId !== null && portraitIconId <= 0) {
                throw new Error("战报历史头像ID无效");
            }
            const star = Object.prototype.hasOwnProperty.call(unit, "star") ? this.integer(unit.star!) : null;
            if (star !== null && (star < 1 || star > 14)) {
                throw new Error("战报星级范围无效");
            }
            const lowHpAllowed = carriesDefeatedAllies && unit.faction === 1;
            if (maxHp <= 0 || (initialHp === 0 && !lowHpAllowed) || initialHp > maxHp || finalHp > maxHp) {
                throw new Error("战报单位生命范围无效");
            }
            return Object.freeze({unitId: unit.unitId, faction: unit.faction, templateId: unit.templateId,
                level: unit.level, position: unit.position, initialHp, maxHp, finalHp, totalDamage, totalTakenDamage,
                totalRecovery, star, portraitIconId});
        });
        if (factions.size !== 2) throw new Error("战报缺少对战阵营");
        return Object.freeze(result);
    }

    /**
     * 解码并校验各玩法战报、真人竞技场阵容及旧具名样本，一次返回步骤、名册、冻结名称及上限。
     * 死亡到可行动的血量变化只给有技能上下文的同阵营复活事件。
     * 同阶段保留权威反击顺序，回合伤害先于过期时按死亡移除已登记实例。
     * 校验失败保留原错误，不交付部分结果。成功仅确认战报数据有效，技能表现资源另行核对。
     */
    public static parse(bytes: Uint8Array): ParsedBattleReplay {
        if (!bytes.length || bytes.length > 256 * 1024) {
            throw new Error("战报大小无效");
        }
        const codec = (mxzg as unknown as {
            game: { BattleReplay: { decode(bytes: Uint8Array): WireReplay } }
        }).game.BattleReplay;
        const report = codec.decode(bytes);
        for (const name of ["attackerName", "defenderName"] as const) {
            if (Object.prototype.hasOwnProperty.call(report, name)
                && (typeof report[name] !== "string" || report[name]!.length > 128
                    || /[\u0000-\u001f\u007f]/.test(report[name]!))) {
                throw new Error("战报双方名称无效");
            }
        }
        const chapter = this.chapterScenario(report.scenario);
        const idleMission = chapter?.idle ? chapter.index : 0;
        const configuredRoster = this.configuredRoster(report.scenario);
        const dreamland = !!configuredRoster && report.scenario.startsWith("dreamland:");
        const playerArena = /^arena:pvp:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report.scenario);
        const indexedRoster = !!chapter || !!configuredRoster || playerArena;
        const maxRounds = dreamland ? 10 : playerArena || (configuredRoster && report.scenario.startsWith("arena:")) ? 20 : 15;
        if (report.schemaVersion !== 1 || (!indexedRoster && ["main:1:1:1", "main:1:1:2", "main:1:1:3", "audit:charm", "audit:charm-death", "audit:control-teams", "audit:frozen", "audit:nanako", "audit:dark-cutter-bleed"].indexOf(report.scenario) < 0)
            || (!indexedRoster && report.units.length !== ((["audit:control-teams", "audit:charm", "audit:charm-death"].includes(report.scenario)) ? 4 : (report.scenario === "main:1:1:3" || report.scenario === "audit:frozen") ? 3 : 2)) || report.rounds < 1 || report.rounds > maxRounds) {
            throw new Error("战报版本或场景不支持");
        }
        const roster = this.validateUnits(report.units, dreamland);
        if (configuredRoster) {
            this.validateConfiguredRoster(report.scenario, roster, configuredRoster);
        }
        const hp = new Map<number, number>();
        const faction = new Map(roster.map(unit => [unit.unitId, unit.faction]));
        const expected = report.scenario === "audit:charm-death"
            ? [[1, 1, 10105011, 2, 50], [2, 2, 10101001, 5, 25], [3, 2, 10101001, 6, 25], [4, 2, 10101001, 7, 25]]
            : report.scenario === "audit:charm"
            ? [[1, 1, 10105011, 2, 100], [2, 2, 10101001, 5, 100], [3, 2, 10101001, 6, 100], [4, 2, 10101001, 7, 100]]
            : report.scenario === "audit:dark-cutter-bleed"
            ? [[1, 1, 10505005, 2, 100], [2, 2, 10505005, 2, 100]]
            : report.scenario === "audit:nanako"
            ? [[1, 1, 10205023, 2, 100], [2, 2, 10205023, 2, 100]]
            : report.scenario === "audit:control-teams"
            ? [[1, 1, 10101001, 2, 1], [4, 1, 10101001, 1, 1], [2, 2, 10101001, 2, 2], [3, 2, 10104004, 3, 2]]
            : (report.scenario === "main:1:1:3" || report.scenario === "audit:frozen")
            ? [[1, 1, 10101001, 2, 1], [2, 2, 10101001, 2, 2], [3, 2, 10104004, 3, 2]]
            : [[1, 1, 10101001, 2, 1], [2, 2, report.scenario === "main:1:1:2" ? 10505005 : 10101001, 2,
                report.scenario === "main:1:1:2" ? 2 : 1]];
        for (const unit of roster) {
            if (indexedRoster) {
                if (unit.unitId !== unit.position + (unit.faction === 2 ? 8 : 0)) throw new Error("阵容战报身份无效");
            } else {
                const entry = expected.find(value => value[0] === unit.unitId);
                if (!entry || unit.faction !== entry[1] || unit.templateId !== entry[2]
                    || unit.position !== entry[3] || unit.level !== entry[4]) {
                    throw new Error("战报单位无效");
                }
            }
            hp.set(unit.unitId, unit.initialHp);
        }
        if (idleMission && (roster.filter(unit => unit.faction === 1).length > 3
            || roster.filter(unit => unit.faction === 2).length !== 1
            || roster.some(unit => unit.faction === 2 && unit.initialHp !== 1))) {
            throw new Error("挂机战报名册不符");
        }
        const steps: BattleReplayStep[] = [];
        // 记录真实实例施加时点和原期限；一次属性仍有实例，下一回合过期不能凭配置ID猜测。
        const buffs = new Map<string, { configId: number; appliedRound: number; expiresAtRound: number }>();
        let round = 0;
        for (const phase of report.phases) {
            if (phase.sourceId === 0) {
                if (phase.round !== round + 1) throw new Error("战报回合不连续");
                round = phase.round;
            } else if (!hp.has(phase.sourceId) || phase.round !== round || round === 0) {
                throw new Error("战报出手阶段无效");
            }
            let skill: WireEvent | null = null;
            const hitByPhaseSource = new Set<number>();
            const deathsInPhase = new Set<number>();
            for (const [eventIndex, event] of phase.events.entries()) {
                if (!hp.has(event.sourceId) || !hp.has(event.targetId) || event.configId <= 0) {
                    throw new Error("战报事件单位或配置无效");
                }
                const isSkill = event.kind === "skill.begin" || event.kind === "skill.end";
                const isHealthChange = event.kind === "damage" || event.kind === "recovery" || event.kind === "revival";
                const isBuff = event.kind === "buff.upsert" || event.kind === "buff.remove";
                if (idleMission && isSkill && event.skillType !== 2) throw new Error("挂机战报只能使用普攻");
                if (isSkill) {
                    this.required(event, ["skillLevel", "skillType"]);
                    if (!Number.isInteger(event.skillLevel) || event.skillLevel < 0
                        || (event.skillType !== 1 && event.skillType !== 2)) {
                        throw new Error("战报技能等级或类型无效");
                    }
                }
                if (isHealthChange) this.required(event, ["actualHpChange", "reportedHpChange", "dead"]);
                if (isBuff) {
                    this.required(event, ["buffInstanceId", "expiresAtRound", "buffValue"]);
                    const previousRoundExpiry = event.kind === "buff.remove" && phase.sourceId === 0
                        && event.expiresAtRound === round - 1 && (event.removalReason === "expire"
                            || (event.removalReason === "death" && deathsInPhase.has(event.targetId)
                                && hp.get(event.targetId) === 0));
                    if (!Number.isInteger(event.expiresAtRound) || event.expiresAtRound <= 0
                        || (event.expiresAtRound < round && !previousRoundExpiry)) {
                        throw new Error("Buff期限无效");
                    }
                }
                if (event.kind === "buff.remove") {
                    this.required(event, ["removalReason"]);
                    // 仅接纳服务端真实产出的原因，诅咒被引爆时由服务端消费现有实例。
                    if (["expire", "death", "replace", "dispel", "trigger-limit", "shield-depleted",
                        "break-ice", "pure-heart", "counter-crit", "wake", "detonate"].indexOf(event.removalReason) < 0) {
                        throw new Error("Buff移除原因无效");
                    }
                    if (event.removalReason === "shield-depleted"
                        && !this.hasShieldHit(phase.events, eventIndex, event.targetId)) {
                        throw new Error("护盾耗尽缺少同阶段命中");
                    }
                }
                switch (event.kind) {
                    case "skill.begin": {
                        // 旧受击反击在原技能结束后出队，只能由刚受击的活敌方单位普攻击回阶段行动者。
                        const counter = event.skillType === 2 && event.targetId === phase.sourceId
                            && hitByPhaseSource.has(event.sourceId) && faction.get(event.sourceId) !== faction.get(phase.sourceId)
                            && hp.get(event.sourceId)! > 0 && hp.get(event.targetId)! > 0;
                        if (!phase.sourceId || skill || (event.sourceId !== phase.sourceId && !counter)) {
                            throw new Error("技能开始顺序无效");
                        }
                        skill = event;
                        break;
                    }
                    case "skill.end":
                        if (!skill || event.configId !== skill.configId || event.sourceId !== skill.sourceId) {
                            throw new Error("技能结束不匹配");
                        }
                        skill = null;
                        break;
                    case "presentation":
                        if (!skill) throw new Error("表现缺少技能上下文");
                        break;
                    case "damage": {
                        if (!Object.prototype.hasOwnProperty.call(event, "actualHpChange")) {
                            throw new Error("战报缺少实际扣血");
                        }
                        const change = this.integer(event.actualHpChange, true);
                        const next = hp.get(event.targetId)! + change;
                        if (change > 0 || next < 0 || !Number.isSafeInteger(next)
                            || !Object.prototype.hasOwnProperty.call(event, "dead") || event.dead !== (next === 0)) {
                            throw new Error("战报扣血或死亡状态无效");
                        }
                        hp.set(event.targetId, next);
                        if (skill?.sourceId === phase.sourceId && event.sourceId === phase.sourceId) {
                            hitByPhaseSource.add(event.targetId);
                        }
                        if (event.dead) {
                            deathsInPhase.add(event.targetId);
                        }
                        break;
                    }
                    case "recovery":
                    case "revival": {
                        const before = hp.get(event.targetId)!;
                        const target = roster.find(unit => unit.unitId === event.targetId)!;
                        const maximum = target.maxHp;
                        const change = this.integer(event.actualHpChange, true);
                        const reported = this.integer(event.reportedHpChange, true);
                        const next = before + change;
                        const reviving = event.kind === "revival";
                        if (reviving) {
                            const source = roster.find(unit => unit.unitId === event.sourceId)!;
                            if (!skill || before !== 0 || change <= 0 || source.faction !== target.faction) {
                                throw new Error("战报复活目标或技能上下文无效");
                            }
                        }
                        if ((!reviving && before <= 0) || next <= 0 || next > maximum || !Number.isSafeInteger(next)
                            || event.dead || change !== Math.min(reported, maximum - before)) {
                            throw new Error(reviving ? "战报复活血量或溢出量无效" : "战报治疗血量或溢出量无效");
                        }
                        hp.set(event.targetId, next);
                        break;
                    }
                    case "buff.upsert": {
                        const key = event.targetId + ":" + this.instance(event.buffInstanceId);
                        buffs.set(key, { configId: event.configId, appliedRound: round, expiresAtRound: event.expiresAtRound });
                        break;
                    }
                    case "buff.remove": {
                        const key = event.targetId + ":" + this.instance(event.buffInstanceId);
                        const previous = buffs.get(key);
                        if (!previous || previous.configId !== event.configId) throw new Error("移除了不存在的Buff");
                        if (previous.expiresAtRound !== event.expiresAtRound
                            || (event.removalReason === "expire" && event.expiresAtRound < round
                                && previous.appliedRound !== event.expiresAtRound)) {
                            throw new Error("Buff移除期限与原实例不一致");
                        }
                        buffs.delete(key);
                        break;
                    }
                    default: throw new Error("战报效果尚未支持：" + event.kind);
                }
                steps.push(Object.freeze({ round, kind: event.kind, sourceId: event.sourceId,
                    targetId: event.targetId, configId: event.configId,
                    skillLevel: isSkill ? event.skillLevel : null,
                    skillType: isSkill ? event.skillType : null,
                    actualHpChange: isHealthChange ? this.integer(event.actualHpChange, true) : null,
                    reportedHpChange: isHealthChange ? this.integer(event.reportedHpChange, true) : null,
                    activeSkillDamage: event.kind === "damage" && skill?.skillType === 1,
                    dead: isHealthChange ? event.dead : null,
                    buffInstanceId: isBuff ? this.instance(event.buffInstanceId) : null,
                    expiresAtRound: isBuff ? event.expiresAtRound : null,
                    buffValue: isBuff ? event.buffValue.toString() : null,
                    removalReason: event.kind === "buff.remove" ? event.removalReason : null,
                    hpByUnit: Object.freeze(Array.from(hp).reduce((snapshot, [id, value]) => {
                        snapshot[id] = value;
                        return snapshot;
                    }, {} as Record<number, number>)) }));
            }
            if (skill) throw new Error("战报技能未结束");
            if (phase.sourceId === 0) {
                // 旧BattleController：回合准备1秒，有回合前Buff再停2秒；控制跳过行动也保留可见状态。
                steps.push(Object.freeze({
                    round, kind: "round.ready", sourceId: 0, targetId: 0, configId: 0,
                    readySeconds: phase.events.some(event => event.kind === "buff.upsert" || event.kind === "buff.remove") ? 3 : 1,
                    skillLevel: null, skillType: null, actualHpChange: null, reportedHpChange: null,
                    dead: null, buffInstanceId: null, expiresAtRound: null, buffValue: null, removalReason: null,
                    hpByUnit: Object.freeze(Array.from(hp).reduce((snapshot, [id, value]) => {
                        snapshot[id] = value;
                        return snapshot;
                    }, {} as Record<number, number>))
                }));
            }
        }
        if (round !== report.rounds) throw new Error("战报总回合不匹配");
        for (const unit of roster) {
            if (hp.get(unit.unitId) !== this.integer(unit.finalHp)) throw new Error("战报最终血量不匹配");
        }
        const attackersAlive = roster.some(unit => unit.faction === 1 && hp.get(unit.unitId)! > 0);
        const defendersAlive = roster.some(unit => unit.faction === 2 && hp.get(unit.unitId)! > 0);
        const outcome = !attackersAlive ? "DEFENDER_WIN" : !defendersAlive ? "ATTACKER_WIN"
            : round === maxRounds ? "DEFENDER_WIN" : "ONGOING";
        if (outcome === "ONGOING" || report.outcome !== outcome) throw new Error("战报胜负无效");
        return Object.freeze({
            steps: Object.freeze(steps),
            units: roster,
            maxRounds,
            names: Object.freeze({
                attacker: Object.prototype.hasOwnProperty.call(report, "attackerName") ? report.attackerName! : null,
                defender: Object.prototype.hasOwnProperty.call(report, "defenderName") ? report.defenderName! : null,
            }),
        });
    }

    /** 按场景定位日常副本、塔楼、永恒梦境和竞技场的同源守军，未知挑战无对应名册。 */
    private static configuredRoster(scenario: string): readonly (readonly [number, number, number, number])[] | undefined {
        const dreamland = /^dreamland:([1-9][0-9]*)$/.exec(scenario);
        if (dreamland) {
            return DREAMLAND_REPLAY_ROSTERS[Number(dreamland[1])];
        }
        const indexed = /^(tower|arena):([1-9][0-9]*)$/.exec(scenario);
        if (indexed) {
            const source = indexed[1] === "tower" ? TOWER_REPLAY_ROSTERS : ARENA_REPLAY_ROSTERS;
            return source[Number(indexed[2])];
        }
        const match = /^dungeon:([a-z]+):([1-9][0-9]*)$/.exec(scenario);
        if (!match) {
            return undefined;
        }
        const kind = match[1] as keyof typeof DAILY_DUNGEON_REPLAY_ROSTERS;
        return Object.prototype.hasOwnProperty.call(DAILY_DUNGEON_REPLAY_ROSTERS, kind)
            ? DAILY_DUNGEON_REPLAY_ROSTERS[kind][Number(match[2])]
            : undefined;
    }

    /** 按同源配置核对冻结的守军；我方沿用出战阵容的通用身份校验。 */
    private static validateConfiguredRoster(scenario: string, roster: readonly BattleReplayUnit[],
        expected: readonly (readonly [number, number, number, number])[]): void {
        const enemies = roster.filter(unit => unit.faction === 2);
        if (enemies.length !== expected.length || expected.some(([position, template, level, star]) => {
            const unit = enemies.find(enemy => enemy.position === position);
            return !unit || unit.templateId !== template || unit.star !== star || unit.level !== level;
        })) {
            throw new Error(scenario.startsWith("dungeon:") ? "日常副本战报名册与原关卡不符" : "战报守军与原配置不符");
        }
    }

    /**
     * 通用主线身份使用同源表全局idx；只接受规范正uint32十进制，不把章节内序号或含糊后缀当关卡。
     * 此处不读GameConfig，登录首包和历史回放不依赖页面配置准备，也不据战报身份开放新挑战。
     */
    private static chapterScenario(scenario: string): Readonly<{ index: number; idle: boolean }> | null {
        const match = /^(idle:chapter|(?:audit|chapter):lineup):([1-9][0-9]*)$/.exec(scenario);
        if (!match) {
            return null;
        }
        const index = Number(match[2]);
        if (!Number.isInteger(index) || index > 0xffffffff) {
            throw new Error("战报关卡索引无效");
        }
        return { index, idle: match[1] === "idle:chapter" };
    }

    /**
     * 服务端先记录护盾耗尽，再记录原命中；同技能或回合流血均须在本阶段找到对应目标。
     * 不跨技能起止借用后续伤害，避免播放器把无关命中当作旧护盾的移除时点。
     */
    private static hasShieldHit(events: readonly WireEvent[], removedIndex: number, targetId: number): boolean {
        for (let index = removedIndex + 1; index < events.length; index++) {
            const event = events[index];
            if (event.kind === "skill.begin" || event.kind === "skill.end") {
                return false;
            }
            if (event.kind === "damage" && event.targetId === targetId) {
                return true;
            }
        }
        return false;
    }

    /** 可选协议字段在对应业务事件中必须存在，不能把protobuf默认值误当真实下发。 */
    private static required(event: object, fields: readonly string[]): void {
        for (const field of fields) {
            if (!Object.prototype.hasOwnProperty.call(event, field)) {
                throw new Error("战报缺少事件字段：" + field);
            }
        }
    }

    /** 血量须可精确显示；超出JS安全整数明确拒绝，不静默舍入。 */
    private static integer(value: { toString(): string } | number, signed = false): number {
        const text = value.toString();
        if (!/^-?\d+$/.test(text)) throw new Error("战报整数无效");
        const number = Number(text);
        if (!Number.isSafeInteger(number) || (!signed && number < 0)) throw new Error("战报整数越界");
        return number;
    }

    /** Buff实例保持十进制字符串，不转换为number丢失精度。 */
    private static instance(value: { toString(): string } | number): string {
        const text = value.toString();
        if (!/^[1-9]\d*$/.test(text)) throw new Error("Buff实例无效");
        return text;
    }
}
