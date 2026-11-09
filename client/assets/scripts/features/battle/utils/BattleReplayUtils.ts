/** 选定主线场景的Protobuf战报校验与播放步骤整理；不请求网络、不重算伤害、不发奖励。 */
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
}

/** 仅声明本适配器使用的解码字段，不手改生成代码。 */
interface WireReplay {
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
    /** 实际血量用于血条，旧战报血量用于飘字，两者不得合并。 */
    readonly actualHpChange: number | null;
    readonly reportedHpChange: number | null;
    readonly dead: boolean | null;
    /** Buff身份为字符串，期限为绝对回合；非Buff事件为null。 */
    readonly buffInstanceId: string | null;
    readonly expiresAtRound: number | null;
    readonly buffValue: string | null;
    readonly removalReason: string | null;
    /** 按本场unitId索引的冻结生命快照，不固定为攻守双方各一个数。 */
    readonly hpByUnit: Readonly<Record<number, number>>;
}

export class BattleReplayUtils {
    /** 校验整包后保留服务器单位身份、模板及站位，展示层不再把所有人塞入首槽。 */
    public static units(bytes: Uint8Array): readonly BattleReplayUnit[] {
        this.decode(bytes);
        const report = (mxzg as unknown as {
            game: { BattleReplay: { decode(bytes: Uint8Array): WireReplay } }
        }).game.BattleReplay.decode(bytes);
        return this.validateUnits(report.units);
    }

    /** 校验最多双方各8个单位；支持重复模板与跨侧同站位，拒绝缺字段、重复身份和同侧重叠。 */
    public static validateUnits(units: readonly WireUnit[]): readonly BattleReplayUnit[] {
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
            if (maxHp <= 0 || initialHp <= 0 || initialHp > maxHp || finalHp > maxHp) {
                throw new Error("战报单位生命范围无效");
            }
            return Object.freeze({unitId: unit.unitId, faction: unit.faction, templateId: unit.templateId,
                level: unit.level, position: unit.position, initialHp, maxHp, finalHp});
        });
        if (factions.size !== 2) throw new Error("战报缺少对战阵营");
        return Object.freeze(result);
    }

    /** 接受已核对的前三关战报数据；第3关解码成功不代表投射资源与画面已验收。 */
    public static decode(bytes: Uint8Array): readonly BattleReplayStep[] {
        if (!bytes.length || bytes.length > 256 * 1024) {
            throw new Error("战报大小无效");
        }
        const codec = (mxzg as unknown as {
            game: { BattleReplay: { decode(bytes: Uint8Array): WireReplay } }
        }).game.BattleReplay;
        const report = codec.decode(bytes);
        const idleMission = /^idle:chapter:[123]$/.test(report.scenario) ? Number(report.scenario.slice(-1)) : 0;
        const lineupMission = /^(audit|chapter):lineup:[123]$/.test(report.scenario) ? Number(report.scenario.slice(-1)) : 0;
        if (report.schemaVersion !== 1 || (!lineupMission && !idleMission && ["main:1:1:1", "main:1:1:2", "main:1:1:3", "audit:charm", "audit:charm-death", "audit:control-teams", "audit:frozen", "audit:nanako", "audit:dark-cutter-bleed"].indexOf(report.scenario) < 0)
            || (!lineupMission && !idleMission && report.units.length !== ((["audit:control-teams", "audit:charm", "audit:charm-death"].includes(report.scenario)) ? 4 : (report.scenario === "main:1:1:3" || report.scenario === "audit:frozen") ? 3 : 2)) || report.rounds < 1 || report.rounds > 15) {
            throw new Error("战报版本或场景不支持");
        }
        const roster = this.validateUnits(report.units);
        const hp = new Map<number, number>();
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
            if (lineupMission || idleMission) {
                if (unit.unitId !== unit.position + (unit.faction === 2 ? 8 : 0)) throw new Error("阵容战报身份无效");
                if (unit.faction === 2) {
                    const template = unit.position === 2 ? ((lineupMission || idleMission) === 2 ? 10505005 : 10101001)
                        : (lineupMission || idleMission) === 3 && unit.position === 3 ? 10104004 : 0;
                    if (unit.templateId !== template || unit.level !== ((lineupMission || idleMission) === 1 ? 1 : 2)) {
                        throw new Error("阵容战报敌方与关卡不符");
                    }
                }
            } else {
                const entry = expected.find(value => value[0] === unit.unitId);
                if (!entry || unit.faction !== entry[1] || unit.templateId !== entry[2]
                    || unit.position !== entry[3] || unit.level !== entry[4]) {
                    throw new Error("战报单位无效");
                }
            }
            hp.set(unit.unitId, unit.initialHp);
        }
        if (lineupMission && roster.filter(unit => unit.faction === 2).length !== (lineupMission === 3 ? 2 : 1)) {
            throw new Error("阵容战报敌方数量不符");
        }
        if (idleMission && (roster.filter(unit => unit.faction === 1).length > 3
            || roster.filter(unit => unit.faction === 2).length !== 1
            || roster.some(unit => unit.faction === 2 && unit.initialHp !== 1))) {
            throw new Error("挂机战报名册不符");
        }
        const steps: BattleReplayStep[] = [];
        const buffs = new Map<string, number>();
        let round = 0;
        for (const phase of report.phases) {
            if (phase.sourceId === 0) {
                if (phase.round !== round + 1) throw new Error("战报回合不连续");
                round = phase.round;
            } else if (!hp.has(phase.sourceId) || phase.round !== round || round === 0) {
                throw new Error("战报出手阶段无效");
            }
            let skill = 0;
            for (const event of phase.events) {
                if (!hp.has(event.sourceId) || !hp.has(event.targetId) || event.configId <= 0) {
                    throw new Error("战报事件单位或配置无效");
                }
                const isSkill = event.kind === "skill.begin" || event.kind === "skill.end";
                const isDamage = event.kind === "damage";
                const isBuff = event.kind === "buff.upsert" || event.kind === "buff.remove";
                if (idleMission && isSkill && event.skillType !== 2) throw new Error("挂机战报只能使用普攻");
                if (isSkill) {
                    this.required(event, ["skillLevel", "skillType"]);
                    if (!Number.isInteger(event.skillLevel) || event.skillLevel < 0
                        || (event.skillType !== 1 && event.skillType !== 2)) {
                        throw new Error("战报技能等级或类型无效");
                    }
                }
                if (isDamage) this.required(event, ["actualHpChange", "reportedHpChange", "dead"]);
                if (isBuff) {
                    this.required(event, ["buffInstanceId", "expiresAtRound", "buffValue"]);
                    if (!Number.isInteger(event.expiresAtRound) || event.expiresAtRound < round) {
                        throw new Error("Buff期限无效");
                    }
                }
                if (event.kind === "buff.remove") {
                    this.required(event, ["removalReason"]);
                    if (["expire", "death", "replace", "dispel", "trigger-limit"].indexOf(event.removalReason) < 0) {
                        throw new Error("Buff移除原因无效");
                    }
                }
                switch (event.kind) {
                    case "skill.begin":
                        if (!phase.sourceId || skill || event.sourceId !== phase.sourceId) throw new Error("技能开始顺序无效");
                        skill = event.configId;
                        break;
                    case "skill.end":
                        if (!skill || event.configId !== skill) throw new Error("技能结束不匹配");
                        skill = 0;
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
                        break;
                    }
                    case "buff.upsert": {
                        const key = event.targetId + ":" + this.instance(event.buffInstanceId);
                        buffs.set(key, event.configId);
                        break;
                    }
                    case "buff.remove": {
                        const key = event.targetId + ":" + this.instance(event.buffInstanceId);
                        if (buffs.get(key) !== event.configId) throw new Error("移除了不存在的Buff");
                        buffs.delete(key);
                        break;
                    }
                    default: throw new Error("战报效果尚未支持：" + event.kind);
                }
                steps.push(Object.freeze({ round, kind: event.kind, sourceId: event.sourceId,
                    targetId: event.targetId, configId: event.configId,
                    skillLevel: isSkill ? event.skillLevel : null,
                    skillType: isSkill ? event.skillType : null,
                    actualHpChange: isDamage ? this.integer(event.actualHpChange, true) : null,
                    reportedHpChange: isDamage ? this.integer(event.reportedHpChange, true) : null,
                    dead: isDamage ? event.dead : null,
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
            : round === 15 ? "DEFENDER_WIN" : "ONGOING";
        if (outcome === "ONGOING" || report.outcome !== outcome) throw new Error("战报胜负无效");
        return Object.freeze(steps);
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
