/**
 * 战报复活与阶段顺序专项。校验生成协议、死亡清理与反击，以及关页后不显示迟到复活。
 * 测试只使用独立内存数据，游戏血量与奖励仍以真实服务端为准。
 */
import { strict as assert } from "node:assert";
import { BattleReplayPlayer } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 生成同技能受击、清除两个状态和复活的独立夹具；报告值超过实际可恢复量。 */
function fixture() {
    const skill = { sourceId: 2, targetId: 3, configId: 101050103, skillLevel: 1, skillType: 1 };
    const buff = { sourceId: 2, targetId: 3, configId: 1081301, expiresAtRound: 1, buffValue: 1 };
    const health = { actualHpChange: -100, reportedHpChange: -100, dead: true };
    const hit = { kind: "damage", ...health, sourceId: 2, targetId: 3, configId: 1010200 };
    const revival = { kind: "revival", sourceId: 2, targetId: 3, configId: 1103201,
        actualHpChange: 100, reportedHpChange: 145, dead: false };
    const removed = { ...buff, kind: "buff.remove", removalReason: "death" };
    return {
        schemaVersion: 1, scenario: "audit:lineup:99", rounds: 1, outcome: "ATTACKER_WIN",
        units: [
            { unitId: 2, faction: 1, position: 2, templateId: 10105010, level: 20, initialHp: 100, maxHp: 100, finalHp: 100 },
            { unitId: 3, faction: 1, position: 3, templateId: 10101001, level: 20, initialHp: 100, maxHp: 100, finalHp: 100 },
            { unitId: 10, faction: 2, position: 2, templateId: 10101001, level: 20, initialHp: 100, maxHp: 100, finalHp: 0 },
        ],
        phases: [
            { round: 1, sourceId: 0, events: [] },
            { round: 1, sourceId: 2, events: [
                { kind: "skill.begin", ...skill },
                { ...buff, kind: "buff.upsert", buffInstanceId: 1 },
                { ...buff, kind: "buff.upsert", buffInstanceId: 2 },
                hit,
                { ...removed, buffInstanceId: 1 },
                { ...removed, buffInstanceId: 2 },
                revival,
                { ...hit, targetId: 10 },
                { kind: "skill.end", ...skill },
            ] },
        ],
    };
}

/** 用实际生成的 Protobuf 编码器保留可选字段和真假布尔值。 */
function encode(source: object): Uint8Array {
    return mxzg.game.BattleReplay.encode(mxzg.game.BattleReplay.fromObject(source)).finish();
}

/** 分别检查死亡后的普通治疗、跨阵营、溢出量、死亡标志及缺技能上下文。 */
function checkDecode(): void {
    const source = fixture();
    const revival = BattleReplayUtils.decode(encode(source)).find(step => step.kind === "revival");
    assert(revival);
    assert.equal(revival.hpByUnit[3], 100);
    assert.equal(revival.reportedHpChange, 145);
    assert.equal(revival.dead, false);
    for (const [changes, pattern] of [
        [{ kind: "recovery" }, /治疗血量/],
        [{ sourceId: 10 }, /复活目标/],
        [{ targetId: 2 }, /复活目标/],
        [{ actualHpChange: 0 }, /复活目标/],
        [{ reportedHpChange: 99 }, /复活血量/],
        [{ actualHpChange: 101 }, /复活血量/],
        [{ dead: true }, /复活血量/],
    ] as const) {
        const broken = fixture();
        const index = broken.phases[1].events.findIndex(event => event.kind === "revival");
        Object.assign(broken.phases[1].events[index], changes);
        assert.throws(() => BattleReplayUtils.decode(encode(broken)), pattern);
    }
    const events = source.phases[1].events;
    events.push(events.splice(events.findIndex(event => event.kind === "revival"), 1)[0]);
    assert.throws(() => BattleReplayUtils.decode(encode(source)), /技能上下文/);
}

/** 旧受击反击紧跟原技能结束，并拒绝未经命中的出手、主动技能和错误起止来源。 */
function checkCounterReplay(): void {
    const source = fixture();
    const strike = { sourceId: 2, targetId: 10, configId: 101010010, skillLevel: 0, skillType: 2 };
    const counter = { sourceId: 10, targetId: 2, configId: 101050090, skillLevel: 0, skillType: 2 };
    const events = [
        { kind: "skill.begin", ...strike },
        { kind: "damage", sourceId: 2, targetId: 10, configId: 1010200,
            actualHpChange: -25, reportedHpChange: -25, dead: false },
        { kind: "skill.end", ...strike },
        { kind: "skill.begin", ...counter },
        { kind: "damage", sourceId: 10, targetId: 2, configId: 1090200,
            actualHpChange: -10, reportedHpChange: -10, dead: false },
        { kind: "skill.end", ...counter },
        { kind: "skill.begin", ...strike },
        { kind: "damage", sourceId: 2, targetId: 10, configId: 1010200,
            actualHpChange: -75, reportedHpChange: -75, dead: true },
        { kind: "skill.end", ...strike },
    ];
    source.units[0].finalHp = 90;
    const report = { ...source, phases: [source.phases[0], { round: 1, sourceId: 2, events }] };
    const steps = BattleReplayUtils.decode(encode(report));
    assert.deepEqual(steps.filter(step => step.kind === "skill.begin").map(step => step.sourceId), [2, 10, 2]);
    for (const [index, patch, failure] of [
        [1, { targetId: 3 }, /技能开始顺序无效/],
        [3, { skillType: 1 }, /技能开始顺序无效/],
        [3, { targetId: 3 }, /技能开始顺序无效/],
        [5, { sourceId: 2 }, /技能结束不匹配/],
    ] as const) {
        const invalid = events.map((event, offset) => offset === index ? { ...event, ...patch } : event);
        const broken = { ...report, phases: [report.phases[0], { ...report.phases[1], events: invalid }] };
        assert.throws(() => BattleReplayUtils.decode(encode(broken)), failure);
    }
}

/** 回合前定期伤害可先于同回合的到期清理，只有已死亡目标可移除原期限实例。 */
function checkRoundDeathBeforeExpiry(): void {
    const source = fixture();
    const buff = { sourceId: 10, targetId: 10, configId: 3103402, expiresAtRound: 1,
        buffInstanceId: 35, buffValue: 0 };
    const damage = { kind: "damage", sourceId: 2, targetId: 10, configId: 3101403,
        actualHpChange: -100, reportedHpChange: -100, dead: true };
    const remove = { ...buff, kind: "buff.remove", removalReason: "death" };
    const initial = { round: 1, sourceId: 0, events: [{ ...buff, kind: "buff.upsert" }] };
    const phase = { round: 2, sourceId: 0, events: [damage, remove] };
    const report = { ...source, rounds: 2, phases: [initial, phase] };
    const steps = BattleReplayUtils.decode(encode(report));
    const cleanup = steps.find(step => step.kind === "buff.remove");
    assert.equal(cleanup?.round, 2);
    assert.equal(cleanup?.expiresAtRound, 1);
    assert.equal(cleanup?.removalReason, "death");
    for (const events of [[remove, damage], [damage, { ...remove, kind: "buff.upsert" }]]) {
        assert.throws(() => BattleReplayUtils.decode(encode({ ...report, phases: [initial, { ...phase, events }] })),
            /Buff期限无效/);
    }
}

/** 给生产播放器的微任务依赖一个有限窗口；挂起渲染由用例显式放行。 */
async function flush(until: () => boolean): Promise<void> {
    for (let index = 0; index < 50 && !until(); index++) {
        await Promise.resolve();
    }
    assert(until());
}

/** 同目标死亡后等已完成的受击和两个状态清理；并行伤害可先呈现，取消后停止复活。 */
async function checkPlayer(cancel: boolean): Promise<void> {
    let releaseHit!: () => void;
    let releaseCleanup!: () => void;
    const hit = new Promise<void>(resolve => { releaseHit = resolve; });
    const cleanup = new Promise<void>(resolve => { releaseCleanup = resolve; });
    const shown: string[] = [];
    const player = new BattleReplayPlayer({
        async play(step) {
            if (step.kind === "damage" && step.targetId === 3) {
                shown.push("hit.begin");
                await hit;
                shown.push("hit.end");
            } else if (step.kind === "damage") {
                shown.push("other.hit");
            } else if (step.kind === "buff.remove") {
                shown.push("cleanup." + step.buffInstanceId);
                if (step.buffInstanceId === "1") {
                    await cleanup;
                }
            } else if (step.kind === "revival") {
                shown.push("revival");
            }
        },
        stop() {
            releaseHit();
            releaseCleanup();
        },
    });
    const result = player.play(encode(fixture()));
    await flush(() => shown.includes("hit.begin") && shown.includes("other.hit"));
    assert(!shown.includes("cleanup.1"));
    releaseHit();
    await flush(() => shown.includes("cleanup.1"));
    assert(!shown.includes("cleanup.2"));
    assert(!shown.includes("revival"));
    if (cancel) {
        player.stop();
    } else {
        releaseCleanup();
    }
    assert.equal(await result, !cancel);
    const target = shown.filter(effect => effect !== "other.hit");
    assert.deepEqual(target, cancel ? ["hit.begin", "hit.end", "cleanup.1"]
        : ["hit.begin", "hit.end", "cleanup.1", "cleanup.2", "revival"]);
}

/** 运行复活、受击反击、到期前死亡清理和两种播放结局。 */
async function main(): Promise<void> {
    checkDecode();
    checkCounterReplay();
    checkRoundDeathBeforeExpiry();
    await checkPlayer(false);
    await checkPlayer(true);
    console.log("PASS revival, queued counterattack, periodic death cleanup and cancellation");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
