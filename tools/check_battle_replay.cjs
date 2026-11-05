/** 校验Java测试输出的真实战报二进制可被Creator使用的生成编解码器读取；先运行后端测试。 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const esbuild = require(path.join(root, "client/node_modules/esbuild"));
const source = fs.readFileSync(path.join(root, "client/assets/scripts/platform/GameProtocol.generated.ts"), "utf8");
const code = esbuild.transformSync(source, { loader: "ts", format: "cjs" }).code;
const generated = { exports: {} };
new Function("module", "exports", "require", code)(generated, generated.exports, require);
const protocol = generated.exports.mxzg.game.BattleReplay;
const bytes = fs.readFileSync(path.join(root, "backend/target/chapter-1-1-1-replay.pb"));
const report = protocol.decode(bytes);
assert.equal(report.schemaVersion, 1);
assert.equal(report.units[0].level, 1);
assert.equal(report.units[1].level, 1);
assert.equal(report.scenario, "main:1:1:1");
assert.equal(report.outcome, "ATTACKER_WIN");
assert.equal(report.phases.length, 7);
assert.equal(report.units[0].finalHp.toString(), "56");
assert.equal(report.phases[1].events[2].actualHpChange.toString(), "-53");
assert.deepEqual(report.phases[1].events.map(event => event.kind),
    ["skill.begin", "presentation", "damage", "buff.upsert", "skill.end"]);
assert.equal(report.phases[1].events[3].buffInstanceId.toString(), "1");
assert.deepEqual(Buffer.from(protocol.encode(report).finish()), bytes);
console.log("PASS Java -> Creator battle replay binary, ordered events and exact roundtrip");

// 使用真正客户端适配器验证成功和损坏数据，不在测试内复制校验算法。
const built = esbuild.buildSync({ entryPoints: [path.join(root,
    "client/assets/scripts/features/battle/utils/BattleReplayUtils.ts")],
    bundle: true, platform: "node", format: "cjs", write: false });
const adapter = { exports: {} };
new Function("module", "exports", "require", built.outputFiles[0].text)(adapter, adapter.exports, require);
const decode = data => adapter.exports.BattleReplayUtils.decode(data);
const steps = decode(bytes);
assert.equal(steps[steps.length - 1].hpByUnit[1], 56);
assert.equal(steps[steps.length - 1].hpByUnit[2], 0);
assert.ok(Object.isFrozen(steps));
const noLevel = protocol.decode(bytes);
delete noLevel.units[0].level;
assert.throws(() => decode(protocol.encode(noLevel).finish()), /缺少事件字段/);
const badLevel = protocol.decode(bytes);
badLevel.units[0].level = 0;
assert.throws(() => decode(protocol.encode(badLevel).finish()), /等级无效/);
const broken = protocol.decode(bytes);
broken.phases[1].events[0].kind = "unknown";
assert.throws(() => decode(protocol.encode(broken).finish()), /尚未支持/);
const badHp = protocol.decode(bytes);
badHp.units[0].finalHp = 57;
assert.throws(() => decode(protocol.encode(badHp).finish()), /最终血量/);
const missing = protocol.decode(bytes);
missing.phases.splice(3, 1);
assert.throws(() => decode(protocol.encode(missing).finish()), /回合|阶段/);
console.log("PASS client replay plan, unknown effect, final HP and missing phase rejection");

assert.equal(steps.find(step => step.kind === "skill.begin").skillLevel, 1);
assert.equal(steps.find(step => step.kind === "damage").reportedHpChange, -53);
assert.equal(steps.find(step => step.kind === "buff.upsert").expiresAtRound, 3);
assert.equal(steps[steps.length - 1].removalReason, "death");
const noSkillType = protocol.decode(bytes);
delete noSkillType.phases[1].events[0].skillType;
assert.throws(() => decode(protocol.encode(noSkillType).finish()), /缺少事件字段/);
const playerCode = esbuild.buildSync({entryPoints: [path.join(root,
    "client/assets/scripts/features/battle/BattleReplayPlayer.ts")], bundle: true,
    platform: "node", format: "cjs", write: false}).outputFiles[0].text;
const playerModule = {exports: {}};
new Function("module", "exports", "require", playerCode)(playerModule, playerModule.exports, require);
/** 顺序、页面取消和表现失败均用真实战报驱动，不依赖Creator窗口。 */
async function checkPlayback() {
    const shown = [];
    let stopped = 0;
    const player = new playerModule.exports.BattleReplayPlayer({
        play: async step => { shown.push(step.kind); }, stop: () => { stopped++; }
    });
    assert.equal(await player.play(bytes), true);
    assert.deepEqual(shown, steps.map(step => step.kind));
    assert.equal(stopped, 1);
    let release;
    let count = 0;
    const cancelled = new playerModule.exports.BattleReplayPlayer({
        play: () => { count++; return new Promise(resolve => {release = resolve;}); },
        stop: () => release()
    });
    const pending = cancelled.play(bytes);
    cancelled.stop();
    assert.equal(await pending, false);
    assert.equal(count, 1);
    let cleaned = false;
    const failed = new playerModule.exports.BattleReplayPlayer({
        play: async () => { throw new Error("resource unavailable"); },
        stop: () => { cleaned = true; }
    });
    await assert.rejects(failed.play(bytes), /resource unavailable/);
    assert.equal(cleaned, true);
    console.log("PASS replay payload, sequential playback, cancellation and failure cleanup");
}
checkPlayback().catch(error => { console.error(error); process.exitCode = 1; });

const meleeCode = esbuild.buildSync({entryPoints: [path.join(root,
    "client/assets/scripts/features/battle/utils/BattleAttackUtils.ts")], bundle: true,
    platform: "node", format: "cjs", write: false}).outputFiles[0].text;
const melee = {exports: {}};
new Function("module", "exports", "require", meleeCode)(melee, melee.exports, require);
const buffRows = JSON.parse(fs.readFileSync(path.join(root,
    "client/assets/resources/config/buff.json"), "utf8")).rows;
for (const id of [1010100, 1011101]) {
    const row = buffRows.find(row => row.idx === id);
    const plan = melee.exports.BattleAttackUtils.plan(row);
    assert.equal(plan.moveSeconds, 0.1);
    assert.equal(plan.beforeReturnSeconds, 1);
    assert.equal(plan.action, "attack");
    assert.equal(plan.attackSeconds, 0);
    assert.equal(plan.attackDelaySeconds, 0);
    assert.equal(plan.actionSeconds, 0);
    assert.deepEqual(plan.sounds, id === 1011101 ? ["skill-101010011"] : []);
    assert.throws(() => melee.exports.BattleAttackUtils.plan({...row,
        ani_base: '{"move_back":true}'}), /时间无效/);
    assert.throws(() => melee.exports.BattleAttackUtils.plan({...row,
        file: '["unverified-effect"]'}), /支持范围/);
}
console.log("PASS legacy melee timing from actual buff configuration");

// 旧Lua公式在640×637战场中的已核对坐标；覆盖前后排、镜像和非法站位。
const stageCode = esbuild.buildSync({entryPoints: [path.join(root,
    "client/assets/scripts/features/battle/utils/BattleStageUtils.ts")], bundle: true,
    platform: "node", format: "cjs", write: false}).outputFiles[0].text;
const stageModule = {exports: {}};
new Function("module", "exports", "require", stageCode)(stageModule, stageModule.exports, require);
const stage = stageModule.exports.BattleStageUtils;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001);
near(stage.position(2, 640, 637, true).x, 211.2);
near(stage.position(2, 640, 637, true).y, 193.84);
near(stage.position(8, 640, 637, true).x, 67.2);
near(stage.position(8, 640, 637, true).y, 448.64);
for (let position = 1; position <= 8; position++) {
    near(stage.position(position, 640, 637, true).x + stage.position(position, 640, 637, false).x, 640);
}
assert.throws(() => stage.position(0, 640, 637, true), /站位/);
assert.throws(() => stage.position(9, 640, 637, true), /站位/);
const serialized = JSON.parse(fs.readFileSync(path.join(root, "client/assets/prefabs/ui/battle/BattlePage.prefab"), "utf8"));
for (const side of ["A", "E"]) {
    for (let index = 0; index < 8; index++) {
        const slots = serialized.filter(node => node.__type__ === "cc.Node" && node._name === "Slot_" + side + index);
        assert.equal(slots.length, 1);
        const point = stage.position(index + 1, 640, 637, side === "A");
        near(slots[0]._lpos.x, point.x - 320);
        near(slots[0]._lpos.y, point.y - 340);
        assert.ok(slots[0]._children.some(ref => serialized[ref.__id__]._name === "HeadAnchor"));
    }
}
const displayUnits = adapter.exports.BattleReplayUtils.units(bytes);
assert.deepEqual(displayUnits.map(unit => [unit.unitId, unit.templateId, unit.position]),
    [[1, 10101001, 2], [2, 10101001, 2]]);
assert.ok(Object.isFrozen(displayUnits) && displayUnits.every(Object.isFrozen));
console.log("PASS legacy eight positions, mirroring and serialized slot coordinates");

// 服务器实际执行的独立败局可解码，但不能冒充已开放的主线播放场景。
const defeatBytes = fs.readFileSync(path.join(root, "backend/target/independent-reversed-duel-replay.pb"));
const defeat = protocol.decode(defeatBytes);
assert.equal(defeat.scenario, "audit:duel");
assert.equal(defeat.outcome, "DEFENDER_WIN");
assert.equal(defeat.units[0].finalHp.toString(), "0");
assert.ok(Number(defeat.units[1].finalHp.toString()) > 0);
assert.throws(() => decode(defeatBytes), /场景不支持/);
console.log("PASS independent defeat provenance and unsupported scene rejection");

// type3复用旧攻击序列但不移出/返回；本关无file，不捏造投射物。
const ranged = melee.exports.BattleAttackUtils.plan(buffRows.find(row => row.idx === 5051101));
assert.equal(ranged.melee, false);
assert.equal(ranged.moveSeconds, 0);
assert.equal(ranged.action, "attack2");
for (const [configured, clip] of [["attack", "attack"], ["skill", "attack2"], ["skill2", "attack3"], ["transform", "skill"]]) {
    assert.equal(melee.exports.BattleAttackUtils.plan({type: 3, ani_base: JSON.stringify({action: configured}), file: "[]", sound: "[]"}).action, clip);
}
assert.ok(Object.hasOwn(JSON.parse(fs.readFileSync(path.join(root, "client/assets/resources/spine/10505005.json"), "utf8")).animations, ranged.action));
assert.equal(ranged.attackSeconds, 0.6);
assert.equal(ranged.actionSeconds, 1.8);
assert.equal(ranged.beforeReturnSeconds, 0);
assert.deepEqual(ranged.sounds, []);
assert.throws(() => melee.exports.BattleAttackUtils.plan({...buffRows.find(row => row.idx === 5051101), file: '["unknown"]'}), /支持范围/);
assert.equal(melee.exports.BattleAttackUtils.plan(buffRows.find(row => row.idx === 5050100)).beforeReturnSeconds, 2);
const secondBytes = fs.readFileSync(path.join(root, "backend/target/chapter-1-1-2-replay.pb"));
const second = protocol.decode(secondBytes);
assert.equal(second.scenario, "main:1:1:2");
assert.equal(second.units[1].level, 2);
assert.deepEqual(melee.exports.BattleAttackUtils.damageSounds(buffRows.find(row => row.idx === 5051201)), ["skill-105050051"]);
assert.throws(() => melee.exports.BattleAttackUtils.damageSounds({type: 100, sound: '["../bad"]'}), /配置无效/);
assert.equal(second.outcome, "ATTACKER_WIN");
assert.equal(second.units[0].finalHp.toString(), "102");
assert.ok(second.phases.some(phase => phase.events.some(event => event.kind === "presentation" && event.configId === 5051101)));
assert.ok(!second.phases.some(phase => phase.events.some(event => event.configId === 5051301)));
assert.equal(decode(secondBytes).at(-1).hpByUnit[1], 102);
assert.equal(melee.exports.BattleAttackUtils.delaySeconds(buffRows.find(row => row.idx === 5051201)), 2.5);
assert.deepEqual(melee.exports.BattleAttackUtils.dimly(buffRows.find(row => row.idx === 5051201)), [0.5, 1, 0.5]);
console.log("PASS real second chapter wire, zero-probability bleed and stationary ranged timing");

/** 使用真实第二关战报阻塞攻击动作，证明伤害已并行启动且下一技能必须等待整组完成。 */
async function checkParallelEffects() {
    const seen = [];
    let unblock;
    const gate = new Promise(resolve => { unblock = resolve; });
    let held = false;
    const player = new playerModule.exports.BattleReplayPlayer({
        play: async step => {
            seen.push(step);
            if (step.kind === "presentation" && !held) {
                held = true;
                await gate;
            }
        },
        stop: () => unblock()
    });
    const pending = player.play(secondBytes);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(seen.filter(step => step.kind === "skill.begin").length, 1);
    assert.ok(seen.some(step => step.kind === "damage" && step.configId === 5051201));
    assert.ok(!seen.some(step => step.kind === "skill.end"));
    player.stop();
    assert.equal(await pending, false);
    assert.ok(!seen.some(step => step.kind === "skill.end"));
    const releases = [];
    const multi = new playerModule.exports.BattleReplayPlayer({
        play: step => step.kind === "presentation" || step.kind === "damage"
            ? new Promise(resolve => releases.push(resolve)) : Promise.resolve(),
        stop: () => releases.splice(0).forEach(resolve => resolve())
    });
    const multiPending = multi.play(secondBytes);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    assert.equal(releases.length, 2);
    multi.stop();
    assert.equal(await multiPending, false);
    assert.equal(releases.length, 0);
    let releaseAttack;
    let attackReleased = false;
    let ended = false;
    const failure = new playerModule.exports.BattleReplayPlayer({
        play: async step => {
            if (step.kind === "presentation") {
                await new Promise(resolve => { releaseAttack = resolve; });
                attackReleased = true;
            }
            if (step.kind === "damage") throw new Error("parallel damage failed");
            if (step.kind === "skill.end") ended = true;
        },
        stop: () => releaseAttack?.()
    });
    await assert.rejects(failure.play(secondBytes), /parallel damage failed/);
    await Promise.resolve();
    assert.equal(attackReleased, true);
    assert.equal(ended, false);
    console.log("PASS same-skill parallel damage, skill barrier and cancellation of all branches");
}
checkParallelEffects().catch(error => { console.error(error); process.exitCode = 1; });

// 第3关尚未接阵营和多单位回放；不能仅修改scenario或塞入第三单位绕过验收范围。
const thirdUnsupported = protocol.decode(secondBytes);
thirdUnsupported.scenario = "main:1:1:3";
assert.throws(() => decode(protocol.encode(thirdUnsupported).finish()), /场景不支持/);
const extraUnit = protocol.decode(secondBytes);
extraUnit.units.push({...extraUnit.units[1], unitId: 3, templateId: 10104004, position: 3});
assert.throws(() => decode(protocol.encode(extraUnit).finish()), /场景不支持/);
console.log("PASS wrong third-chapter roster and extra-unit rejection");
for (const name of ["chapter-1-1-3", "chapter-1-1-3-control"]) {
    const data = fs.readFileSync(path.join(root, "backend/target/" + name + "-replay.pb"));
    const wire = protocol.decode(data);
    const plan = decode(data);
    assert.equal(wire.units.length, 3);
    assert.deepEqual(wire.units.map(unit => unit.position), [2, 2, 3]);
    assert.deepEqual(Buffer.from(protocol.encode(wire).finish()), data);
    for (const unit of wire.units) {
        assert.equal(plan[plan.length - 1].hpByUnit[unit.unitId], Number(unit.finalHp.toString()));
    }
    assert.equal(plan.some(step => step.kind === "buff.upsert" && step.configId === 1041301), name.endsWith("control"));
    const wrong = protocol.decode(data);
    wrong.units[2].position = 4;
    assert.throws(() => decode(protocol.encode(wrong).finish()), /单位无效/);
    const outcome = protocol.decode(data);
    outcome.outcome = outcome.outcome === "ATTACKER_WIN" ? "DEFENDER_WIN" : "ATTACKER_WIN";
    assert.throws(() => decode(protocol.encode(outcome).finish()), /胜负无效/);
}
console.log("PASS real third-chapter control branches, three-unit HP and team outcome");

// 数据层独立覆盖多单位、重复模板及任意本场ID；播放入口仍只开放第1/2关。
const validateRoster = adapter.exports.BattleReplayUtils.validateUnits.bind(adapter.exports.BattleReplayUtils);
const rosterFixture = [
    {...report.units[0], unitId: 10, faction: 1, initialHp: 50, maxHp: 100, finalHp: 40},
    {...report.units[1], unitId: 20, faction: 2, initialHp: 80, maxHp: 100, finalHp: 0},
    {...report.units[1], unitId: 30, faction: 2, position: 3, initialHp: 90, maxHp: 100, finalHp: 80}
];
assert.equal(validateRoster(rosterFixture).length, 3);
assert.equal(validateRoster(rosterFixture)[0].maxHp, 100);
assert.throws(() => validateRoster([...rosterFixture, {...rosterFixture[2], unitId: 40}]), /站位重复/);
assert.throws(() => validateRoster([...rosterFixture, {...rosterFixture[2], position: 4}]), /身份/);
for (const patch of [{faction: 3}, {maxHp: 49}, {finalHp: 101}, {position: 9}]) {
    assert.throws(() => validateRoster([{...rosterFixture[0], ...patch}, ...rosterFixture.slice(1)]));
}
assert.ok(Object.isFrozen(steps[0].hpByUnit));
const missingFaction = protocol.decode(bytes);
delete missingFaction.units[0].faction;
assert.throws(() => decode(protocol.encode(missingFaction).finish()), /缺少事件字段/);
console.log("PASS explicit factions, multi-unit roster, per-unit HP and maximum HP boundaries");

// 服务端四单位真实计算审计可以二进制往返，但不借此开放尚未支持的多单位画面。
const teamsBytes = fs.readFileSync(path.join(root, "backend/target/independent-teams-replay.pb"));
const teamsWire = protocol.decode(teamsBytes);
assert.equal(teamsWire.scenario, "audit:teams");
assert.equal(teamsWire.units.length, 4);
assert.deepEqual(teamsWire.units.map(unit => [unit.unitId, unit.faction]), [[10, 1], [11, 1], [20, 2], [21, 2]]);
assert.deepEqual(teamsWire.units.map(unit => Number(unit.finalHp.toString())), [0, 176, 0, 0]);
assert.equal(teamsWire.rounds, 4);
assert.deepEqual(Buffer.from(protocol.encode(teamsWire).finish()), teamsBytes);
assert.throws(() => decode(teamsBytes), /场景不支持/);
console.log("PASS four-unit server replay roundtrip and client boundary rejection");
