/**
 * 护盾耗尽贯通专项：校验真实战报的移除原因、实例身份、命中时序及冻结统计。
 * 默认只运行独立PB夹具；--java=<文件>额外读取本轮后端导出的真实BattleReplay二进制。
 * 不连接玩家服务器、不重算护盾规则、不修改资产或开放新技能。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { BattleReplayPlayer } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import type { BattleReplayStep } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { BattleStatisticsUtils } from "../assets/scripts/features/battle/utils/BattleStatisticsUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 独立实例使用超出JS安全整数的合法int64，确保全链保留十进制身份。 */
const INSTANCE = "9007199254740993";

/** 构造两单位边界战报；数值只用于区分实际扣血100、原报告90和护盾10，不代表新玩法。 */
function fixture(): any {
    return {
        schemaVersion: 1,
        scenario: "main:1:1:1",
        rounds: 1,
        outcome: "ATTACKER_WIN",
        units: [
            { unitId: 1, faction: 1, templateId: 10101001, level: 1, position: 2,
                initialHp: 100, maxHp: 100, finalHp: 100, totalDamage: 90, totalTakenDamage: 0, totalRecovery: 0 },
            { unitId: 2, faction: 2, templateId: 10101001, level: 1, position: 2,
                initialHp: 100, maxHp: 100, finalHp: 0, totalDamage: 0, totalTakenDamage: 100, totalRecovery: 0 },
        ],
        phases: [
            { round: 1, sourceId: 0, events: [] },
            { round: 1, sourceId: 2, events: [
                { kind: "skill.begin", sourceId: 2, targetId: 2, configId: 300100001, skillLevel: 0, skillType: 1 },
                { kind: "buff.upsert", sourceId: 2, targetId: 2, configId: 10011201,
                    buffInstanceId: INSTANCE, expiresAtRound: 2, buffValue: 10 },
                { kind: "skill.end", sourceId: 2, targetId: 2, configId: 300100001, skillLevel: 0, skillType: 1 },
            ] },
            { round: 1, sourceId: 1, events: [
                { kind: "skill.begin", sourceId: 1, targetId: 1, configId: 101010011, skillLevel: 0, skillType: 2 },
                { kind: "buff.remove", sourceId: 2, targetId: 2, configId: 10011201,
                    buffInstanceId: INSTANCE, expiresAtRound: 2, buffValue: 10, removalReason: "shield-depleted" },
                { kind: "damage", sourceId: 1, targetId: 2, configId: 1011101,
                    actualHpChange: -100, reportedHpChange: -90, dead: true },
                { kind: "skill.end", sourceId: 1, targetId: 1, configId: 101010011, skillLevel: 0, skillType: 2 },
            ] },
        ],
    };
}

/** 使用生成PB编码器，保持可选字段存在性及64位整数，不用JSON代替协议输入。 */
function encode(report: any): Uint8Array {
    return mxzg.game.BattleReplay.encode(mxzg.game.BattleReplay.fromObject(report)).finish();
}

/** 分开保留移除前生命、实际扣血、报告飘字和原实例；不因移除事件额外扣血。 */
function parsing(): void {
    const bytes = encode(fixture());
    const steps = BattleReplayUtils.decode(bytes);
    const removal = steps.find(step => step.removalReason === "shield-depleted")!;
    const hit = steps.find(step => step.kind === "damage")!;
    assert(removal && hit);
    assert.equal(removal.buffInstanceId, INSTANCE);
    assert.equal(removal.buffValue, "10");
    assert.equal(removal.hpByUnit[2], 100, "移除事件不能提前改变血条");
    assert.equal(hit.actualHpChange, -100);
    assert.equal(hit.reportedHpChange, -90);
    assert.equal(hit.hpByUnit[2], 0);
    assert(Object.isFrozen(removal) && Object.isFrozen(removal.hpByUnit));

    // 当前服务端真实产出的九种原因都可读；不把任意字符串当作已实现的移除。
    for (const reason of ["expire", "death", "replace", "dispel", "trigger-limit",
        "shield-depleted", "break-ice", "pure-heart", "counter-crit"]) {
        const report = fixture();
        report.phases[2].events[1].removalReason = reason;
        assert(BattleReplayUtils.decode(encode(report)).some(step => step.removalReason === reason));
    }

    // 回合流血没有skill.begin；同阶段的耗尽仍必须关联真实目标的后续伤害。
    const round = fixture();
    const upsert = round.phases[1].events[1];
    round.phases = [{ round: 1, sourceId: 0,
        events: [upsert, ...round.phases[2].events.slice(1, 3)] }];
    const roundSteps = BattleReplayUtils.decode(encode(round));
    assert.equal(roundSteps.filter(step => step.removalReason === "shield-depleted").length, 1);
    assert.equal(roundSteps.find(step => step.kind === "damage")!.hpByUnit[2], 0);
}

/** 破坏原因、实例、命中归属、生命和数值时必须整包拒绝，不能为展示补猜或跳事件。 */
function rejected(): void {
    const reject = (mutate: (report: any) => void, message: RegExp) => {
        const report = fixture();
        mutate(report);
        assert.throws(() => BattleReplayUtils.decode(encode(report)), message);
    };
    reject(report => { report.phases[2].events[1].removalReason = "future-shield"; }, /Buff移除原因无效/);
    reject(report => { delete report.phases[2].events[1].removalReason; }, /缺少事件字段/);
    reject(report => { report.phases[2].events[1].buffInstanceId = "9"; }, /不存在的Buff/);
    reject(report => { report.phases[2].events[1].buffInstanceId = "0"; }, /Buff实例无效/);
    reject(report => { report.phases[2].events[1].configId = 10011202; }, /不存在的Buff/);
    reject(report => { delete report.phases[2].events[1].expiresAtRound; }, /缺少事件字段/);
    reject(report => { report.phases[2].events[1].expiresAtRound = 0; }, /Buff期限无效/);
    reject(report => { report.phases[2].events.splice(2, 1); }, /护盾耗尽缺少同阶段命中/);
    reject(report => { report.phases[2].events[1].targetId = 1; }, /护盾耗尽缺少同阶段命中/);
    reject(report => { report.phases[2].events.splice(2, 0, report.phases[2].events[3]); }, /护盾耗尽缺少同阶段命中/);
    reject(report => { report.phases[2].events[2].actualHpChange = "-9007199254740992"; }, /整数越界/);
    reject(report => { report.phases[2].events[2].reportedHpChange = "-9007199254740992"; }, /整数越界/);
    reject(report => { report.phases[2].events[2].dead = false; }, /扣血或死亡状态无效/);
    reject(report => { report.units[1].finalHp = 1; }, /最终血量不匹配/);
    reject(report => { report.units[0].totalDamage = -1; }, /整数越界/);
    reject(report => { report.units[0].totalDamage = "9007199254740992"; }, /整数越界/);
    reject(report => { report.phases[2].events.splice(2, 0, report.phases[2].events[1]); }, /不存在的Buff/);
}

/** 统计直接消费服务器冻结总量；BUFF移除和血条/飘字差异均不能被客户端二次累计。 */
function statistics(bytes: Uint8Array): void {
    const units = BattleReplayUtils.units(bytes);
    const rows = BattleStatisticsUtils.rows(units);
    for (const row of rows) {
        assert.equal(row.damage.value, row.unit.totalDamage);
        assert.equal(row.taken.value, row.unit.totalTakenDamage);
        assert.equal(row.recovery.value, row.unit.totalRecovery);
    }
    const synthetic = BattleStatisticsUtils.rows(BattleReplayUtils.units(encode(fixture())));
    assert.equal(synthetic[0].damage.value, 90);
    assert.equal(synthetic[1].taken.value, 100);
    assert.equal(synthetic[0].damage.ratio, 1);
    assert.equal(synthetic[1].taken.ratio, 1);
    assert.equal(synthetic[1].damage.value, 0, "被移除的护盾不能变成持有者输出");
}

/** 清空微任务队列以观测受控命中；不引入真实动画定时或阻塞睡眠。 */
async function flush(): Promise<void> {
    for (let index = 0; index < 12; index++) {
        await Promise.resolve();
    }
}

/** 原命中未完成前图标仍在；完成后仅移除原实例，播放取消不得继续交付清理。 */
async function playback(): Promise<void> {
    let finishHit: (() => void) | undefined;
    let removed = 0;
    const active = new Set<string>();
    const player = new BattleReplayPlayer({
        play: async (step: BattleReplayStep) => {
            if (step.kind === "buff.upsert") {
                active.add(step.buffInstanceId!);
            } else if (step.kind === "damage") {
                await new Promise<void>(resolve => { finishHit = resolve; });
            } else if (step.kind === "buff.remove") {
                removed++;
                active.delete(step.buffInstanceId!);
            }
        },
        stop: () => {},
    });
    const task = player.play(encode(fixture()));
    await flush();
    assert(finishHit, "已进入原命中等待");
    assert(active.has(INSTANCE));
    assert.equal(removed, 0, "护盾图标不能在真实命中前消失");
    finishHit();
    assert.equal(await task, true);
    assert.equal(removed, 1);
    assert.equal(active.size, 0);

    finishHit = undefined;
    const cancelled = player.play(encode(fixture()));
    await flush();
    assert(finishHit);
    player.stop();
    finishHit();
    assert.equal(await cancelled, false);
    assert.equal(removed, 1, "关页取消后不交付迟到的护盾移除");
}

/**
 * 同技能两次命中各自消费护盾；第一份移除不能等第二次命中，也不能误清后续重施。
 * 不同实例覆盖真实新护盾；复用身份另测播放器允许的同实例生命周期顺序，不宣称服务端耗尽后会复用编号。
 */
async function repeatedShield(nextInstance: string): Promise<void> {
    const report = fixture();
    const begin = report.phases[2].events[0];
    const removal = report.phases[2].events[1];
    const end = report.phases[2].events[3];
    report.units[0].totalDamage = 80;
    report.phases[2].events = [
        begin,
        removal,
        { kind: "damage", sourceId: 1, targetId: 2, configId: 1011101,
            actualHpChange: -40, reportedHpChange: -30, dead: false },
        { kind: "buff.upsert", sourceId: 2, targetId: 2, configId: 10011201,
            buffInstanceId: nextInstance, expiresAtRound: 2, buffValue: 10 },
        { ...removal, buffInstanceId: nextInstance },
        { kind: "damage", sourceId: 1, targetId: 2, configId: 1011101,
            actualHpChange: -60, reportedHpChange: -50, dead: true },
        end,
    ];
    const hits: Array<() => void> = [];
    const removed: string[] = [];
    const active = new Set<string>();
    const player = new BattleReplayPlayer({
        play: async (step: BattleReplayStep) => {
            if (step.kind === "buff.upsert") {
                active.add(step.buffInstanceId!);
            } else if (step.kind === "damage") {
                await new Promise<void>(resolve => { hits.push(resolve); });
            } else if (step.kind === "buff.remove") {
                removed.push(step.buffInstanceId!);
                active.delete(step.buffInstanceId!);
            }
        },
        stop: () => {},
    });
    const task = player.play(encode(report));
    await flush();
    assert.equal(hits.length, 1, "同目标命中顺序保留，不并发覆盖中间血条");
    assert.deepEqual(removed, []);
    hits[0]();
    await flush();
    assert.equal(hits.length, 2);
    assert.deepEqual(removed, [INSTANCE], "第一层必须随自己的原命中结束，不等整招其他命中");
    assert(active.has(nextInstance), "旧实例耗尽不能清掉相同配置的新护盾");
    hits[1]();
    assert.equal(await task, true);
    assert.deepEqual(removed, [INSTANCE, nextInstance]);
    assert.equal(active.size, 0);
}

/** 回合流血没有技能包装，仍应先完成原伤害表现再移除护盾，不按裸事件先删图标。 */
async function roundDamage(): Promise<void> {
    const report = fixture();
    report.phases = [{ round: 1, sourceId: 0,
        events: [report.phases[1].events[1], ...report.phases[2].events.slice(1, 3)] }];
    let finishHit: (() => void) | undefined;
    let removed = 0;
    const player = new BattleReplayPlayer({
        play: async (step: BattleReplayStep) => {
            if (step.kind === "damage") {
                await new Promise<void>(resolve => { finishHit = resolve; });
            } else if (step.kind === "buff.remove") {
                removed++;
            }
        },
        stop: () => {},
    });
    const task = player.play(encode(report));
    await flush();
    assert(finishHit);
    assert.equal(removed, 0, "无技能上下文的耗尽也不能先于命中");
    finishHit();
    assert.equal(await task, true);
    assert.equal(removed, 1);
}

/** 重播接管在途旧场，旧命中即使稍后结束也不能移除新场同编号的护盾。 */
async function replayWhileHitPending(): Promise<void> {
    const hits: Array<() => void> = [];
    let removed = 0;
    const active = new Set<string>();
    const player = new BattleReplayPlayer({
        play: async (step: BattleReplayStep) => {
            if (step.kind === "buff.upsert") {
                active.add(step.buffInstanceId!);
            } else if (step.kind === "damage") {
                await new Promise<void>(resolve => { hits.push(resolve); });
            } else if (step.kind === "buff.remove") {
                removed++;
                active.delete(step.buffInstanceId!);
            }
        },
        stop: () => { active.clear(); },
    });
    const old = player.play(encode(fixture()));
    await flush();
    assert.equal(hits.length, 1);
    const latest = player.play(encode(fixture()));
    await flush();
    assert.equal(hits.length, 2);
    assert(active.has(INSTANCE));
    hits[0]();
    assert.equal(await old, false);
    assert.equal(removed, 0);
    assert(active.has(INSTANCE), "旧场finally或迟到移除不能清理新场实例");
    hits[1]();
    assert.equal(await latest, true);
    assert.equal(removed, 1);
    assert.equal(active.size, 0);
}

/** 可选读取本轮后端生存重施/同击致死PB，核对真实实例、治疗及过量伤害统计，不以手写事件替代互通。 */
function interop(): void {
    for (const argument of process.argv.filter(value => value.startsWith("--java="))) {
        const path = argument.slice(7);
        assert(path, "--java必须给出后端二进制文件");
        const bytes = new Uint8Array(readFileSync(path));
        const steps = BattleReplayUtils.decode(bytes);
        const units = BattleReplayUtils.units(bytes);
        assert.equal(units.length, 2);
        const attacker = units.find(unit => unit.unitId === 2)!;
        const defender = units.find(unit => unit.unitId === 10)!;
        assert(attacker && defender, "本轮真实引擎夹具使用原audit:lineup:1合法站位身份");
        const survived = defender.initialHp === 1500;
        assert(survived || defender.initialHp === 400, "必须使用本轮生存重施或同击致死样本");
        const hits = steps.filter(step => step.kind === "damage" && step.targetId === 10);
        const depleted = steps.filter(step => step.removalReason === "shield-depleted");
        assert.deepEqual(hits.map(step => step.targetId), survived ? [10, 10] : [10]);
        assert.deepEqual(hits.map(step => step.actualHpChange), survived ? [-1000, -500] : [-400]);
        assert.deepEqual(hits.map(step => step.reportedHpChange), survived ? [-900, -900] : [-900]);
        assert.equal(depleted.length, survived ? 2 : 1);
        assert(depleted.every(step => step.buffValue === "100"),
            "耗尽移除保留原Entry数值，并不是另一次扣血或数值归零事件");
        assert.equal(new Set(depleted.map(step => step.buffInstanceId)).size, depleted.length,
            "真实耗尽后重施使用新实例，不能只按Buff配置清理");
        assert.equal(attacker.totalDamage, survived ? 1300 : 300,
            "冻结输出保持旧口径；不把报告900、实际量或移除100重复相加");
        assert.equal(attacker.totalTakenDamage, survived ? 100 : 0);
        assert.equal(attacker.totalRecovery, survived ? 1000 : 500);
        assert.equal(defender.totalDamage, survived ? 100 : 0);
        assert.equal(defender.totalTakenDamage, survived ? 1500 : 400);
        assert.equal(defender.finalHp, 0);
        const source = mxzg.game.BattleReplay.decode(bytes);
        assert.deepEqual(BattleReplayUtils.decode(mxzg.game.BattleReplay.encode(source).finish()), steps);
        statistics(bytes);
        console.log("Java护盾耗尽PB互通通过：" + path);
    }
}

/** 顺序执行协议边界、冻结统计、命中时序及可选真实互通；任何失败返回非零。 */
async function main(): Promise<void> {
    parsing();
    rejected();
    statistics(encode(fixture()));
    await playback();
    await repeatedShield("9007199254740994");
    await repeatedShield(INSTANCE);
    await roundDamage();
    await replayWhileHitPending();
    interop();
    console.log("PASS shield-depleted: strict reasons/instances, original hit timing and frozen damage statistics");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
