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
assert.equal(steps.filter(step => step.kind !== "round.ready").at(-1).removalReason, "death");
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
        file: '["unverified-effect"]'}), /支持范围|尚未核对/);
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
assert.throws(() => melee.exports.BattleAttackUtils.plan({...buffRows.find(row => row.idx === 5051101), file: '["unknown"]'}), /支持范围|尚未核对/);
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

// 不能仅修改scenario或塞入第三单位绕过已核实的阵容边界。
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

// 数据层独立覆盖多单位、重复模板及任意本场ID；播放入口仍只开放已核实的场景。
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

// 第3关真实资源帧数、默认帧间隔及旧飞行计数，不以life字段代替。
for (const [id, count, interval] of [[1040100, 7, .05], [1041101, 11, .1]]) {
    const plan = melee.exports.BattleAttackUtils.plan(buffRows.find(row => row.idx === id));
    assert.equal(plan.projectile, id === 1040100);
    assert.equal(plan.effect.paths.length, count);
    near(plan.effect.interval, interval);
    near(plan.effect.flightSeconds, (count + 1) * interval);
    near(plan.effect.anchorY, id === 1040100 ? .43 : .28);
    for (const resource of plan.effect.paths) {
        assert.ok(fs.existsSync(path.join(root, "client/assets/resources", resource.replace("/spriteFrame", ".png"))));
    }
}
console.log("PASS third chapter real frame resources and legacy projectile timing");

/** 人工扩展目标的协议夹具，只验证分组，不冒充服务端生成的额外伤害。 */
async function checkMultiTargetPresentation() {
    const data = protocol.decode(fs.readFileSync(path.join(root, "backend/target/chapter-1-1-3-replay.pb")));
    const phase = data.phases.find(phase => phase.sourceId === 1 && phase.events.some(event => event.kind === "presentation"));
    const index = phase.events.findIndex(event => event.kind === "presentation");
    const original = phase.events[index];
    phase.events.splice(index + 1, 0, {...original, targetId: 3});
    const seen = [];
    const player = new playerModule.exports.BattleReplayPlayer({
        play: async (step, targets) => { if (step.kind === "presentation") seen.push({step, targets}); },
        stop: () => {}
    });
    await player.play(protocol.encode(data).finish());
    const grouped = seen.filter(value => value.step.sourceId === 1 && value.targets.length === 2);
    assert.equal(grouped.length, 1);
    assert.deepEqual(grouped[0].targets.map(value => value.targetId), [original.targetId, 3]);
    assert.ok(Object.isFrozen(grouped[0].targets));
    console.log("PASS one casting animation per effect with separate target presentations");
}
checkMultiTargetPresentation().catch(error => { console.error(error); process.exitCode = 1; });

/** 用服务端真实四单位战报检查同次施法分组及独立血量、眩晕生命周期。 */
async function checkControlTeamPlayback() {
    const data = fs.readFileSync(path.join(root, "backend/target/independent-control-teams-replay.pb"));
    const plan = decode(data);
    const seen = [];
    const player = new playerModule.exports.BattleReplayPlayer({
        play: async (step, targets) => { seen.push({step, targets}); },
        stop: () => {}
    });
    assert.equal(await player.play(data), true);
    const grouped = seen.filter(value => value.step.kind === "presentation" && value.step.configId === 1041101);
    assert.ok(grouped.some(value => value.targets.length === 2 && value.targets.map(target => target.targetId).sort().join() === "1,4"));
    for (const id of [1, 4]) {
        assert.ok(plan.some(step => step.kind === "buff.upsert" && step.configId === 1041301 && step.targetId === id));
        assert.ok(plan.some(step => step.kind === "buff.remove" && step.targetId === id));
        assert.equal(plan[plan.length - 1].hpByUnit[id], 0);
    }
    const wrong = protocol.decode(data);
    wrong.units[1].position = 2;
    assert.throws(() => decode(protocol.encode(wrong).finish()));
    console.log("PASS real four-unit multi-target casting, independent HP and stun removal");
}
for (const resource of melee.exports.BattleAttackUtils.dizzyFrames()) {
    assert.ok(fs.existsSync(path.join(root, "client/assets/resources", resource.replace("/spriteFrame", ".png"))));
}
checkControlTeamPlayback().catch(error => { console.error(error); process.exitCode = 1; });

// 冰冻演出来源独立标注，安装和移除均来自真实服务端事件。
const frozenBytes = fs.readFileSync(path.join(root, "backend/target/independent-frozen-replay.pb"));
const frozenWire = protocol.decode(frozenBytes);
assert.equal(frozenWire.scenario, "audit:frozen");
const frozenPlan = decode(frozenBytes);
assert.ok(frozenPlan.some(step => step.kind === "buff.upsert" && step.configId === 2234801));
assert.ok(frozenPlan.some(step => step.kind === "buff.remove" && step.configId === 2234801));
const wrongFrozen = protocol.decode(frozenBytes);
wrongFrozen.units[2].position = 4;
assert.throws(() => decode(protocol.encode(wrongFrozen).finish()));
console.log("PASS independent frozen replay lifecycle and strict roster");

// 完整奈奈子配置战报必须保留开场监听、真实施法、到期冰冻及移除。
const nanakoBytes = fs.readFileSync(path.join(root, "backend/target/independent-nanako-replay.pb"));
const nanakoPlan = decode(nanakoBytes);
for (const configId of [2234102, 2231303, 2233202, 2234802]) {
    assert.ok(nanakoPlan.some(step => step.configId === configId));
}
assert.ok(nanakoPlan.some(step => step.kind === "buff.remove" && step.configId === 2234802));
const wrongNanako = protocol.decode(nanakoBytes);
wrongNanako.units[0].templateId = 10101001;
assert.throws(() => decode(protocol.encode(wrongNanako).finish()), /单位无效/);
console.log("PASS full Nanako skills, opening passives, expiry freeze and strict roster");

assert.equal(nanakoPlan.find(step => step.kind === "round.ready" && step.round === 4).readySeconds, 3);
assert.equal(steps.filter(step => step.kind === "round.ready").length, report.rounds);

// 单独覆盖暴击分支：完整主技能之后才播放追加普攻，不合并为一个技能或漏掉追加。
const nanakoCriticalBytes = fs.readFileSync(path.join(root, "backend/target/independent-nanako-critical-replay.pb"));
const nanakoCriticalPlan = decode(nanakoCriticalBytes);
const firstNanakoSkills = nanakoCriticalPlan.filter(step => step.round === 1 && step.sourceId === 1
    && (step.kind === "skill.begin" || step.kind === "skill.end"));
assert.deepEqual(firstNanakoSkills.map(step => [step.kind, step.configId]), [
    ["skill.begin", 102050231], ["skill.end", 102050231],
    ["skill.begin", 102050230], ["skill.end", 102050230]
]);
console.log("PASS Nanako critical followup preserves two complete sequential skills");
/** 定位技能必须按序恢复此前权威状态；缺少技能或恢复能力时拒绝，取消后不再播放。 */
async function checkSkillFocus() {
    const focus = {skillId: 102050233, level: 2};
    const start = nanakoPlan.findIndex(step => step.kind === 'skill.begin' && step.configId === focus.skillId && step.skillLevel === focus.level);
    assert.ok(start > 0);
    const restored = [];
    const played = [];
    const player = new playerModule.exports.BattleReplayPlayer({
        restore: step => restored.push(step),
        play: async step => played.push(step),
        stop: () => {}
    });
    assert.equal(await player.play(nanakoBytes, focus), true);
    assert.deepEqual(restored, nanakoPlan.slice(0, start));
    assert.deepEqual(played[0], nanakoPlan[start]);
    assert.ok(restored.some(step => step.kind === 'buff.upsert'));
    assert.ok(restored.some(step => step.kind === 'damage'));
    const before = played.length;
    await assert.rejects(player.play(nanakoBytes, {skillId: 999, level: 1}), /没有选定技能/);
    assert.equal(played.length, before);
    const unsupported = new playerModule.exports.BattleReplayPlayer({play: async () => assert.fail('must not play'), stop: () => {}});
    await assert.rejects(unsupported.play(nanakoBytes, focus), /不支持状态定位/);
    let count = 0;
    const cancelled = new playerModule.exports.BattleReplayPlayer({
        restore: () => { count++; cancelled.stop(); },
        play: async () => assert.fail('cancelled focus must not play'),
        stop: () => {}
    });
    assert.equal(await cancelled.play(nanakoBytes, focus), false);
    assert.equal(count, 1);
    console.log('PASS selected skill restores prior HP/Buffs, rejects missing focus and cancels safely');
}
checkSkillFocus().catch(error => { console.error(error); process.exitCode = 1; });

// 五星/六星独立战报必须使用各自等级，且能恢复前置状态定位第二主动。
async function checkLowerNanakoLevels() {
    for (const star of [5, 6]) {
        const level = star - 4;
        const data = fs.readFileSync(path.join(root, `backend/target/independent-nanako-star-${star}-replay.pb`));
        const plan = decode(data);
        for (const skill of [102050231, 102050233]) {
            assert.ok(plan.some(step => step.kind === 'skill.begin' && step.configId === skill && step.skillLevel === level));
            assert.ok(!plan.some(step => step.kind === 'skill.begin' && step.configId === skill && step.skillLevel !== level));
        }
        assert.ok(plan.some(step => step.kind === 'buff.upsert' && step.configId === 2234800 + level));
        const played = [];
        const player = new playerModule.exports.BattleReplayPlayer({
            restore: () => {}, play: async step => played.push(step), stop: () => {}
        });
        assert.equal(await player.play(data, {skillId: 102050233, level}), true);
        assert.equal(played[0].configId, 102050233);
        assert.equal(played[0].skillLevel, level);
    }
    console.log('PASS real five/six-star Nanako levels, freeze and exact-level focus');
}
checkLowerNanakoLevels().catch(error => { console.error(error); process.exitCode = 1; });
// 执行实际预览清理闭包：模拟退出按钮已关闭及应用再次关闭，防止操作已销毁节点。
const previewSource = fs.readFileSync(path.join(root, 'client/assets/scripts/features/battle/ui/BattleReplayPreview.ts'), 'utf8');
const cleanupStart = previewSource.lastIndexOf('return () =>');
const cleanupEnd = previewSource.indexOf('\n        };', cleanupStart) + '\n        };'.length;
assert.ok(cleanupStart > 0 && cleanupEnd > cleanupStart);
const cleanupFactory = new Function('closed', 'releaseSettlement', 'player', 'stop', 'shell',
    previewSource.slice(cleanupStart, cleanupEnd));
let cleanupCalls = 0;
const countCleanup = () => cleanupCalls++;
const cleanup = cleanupFactory(false, countCleanup, {stop: countCleanup}, countCleanup,
    {root: {isValid: true, destroy: countCleanup}});
cleanup();
assert.equal(cleanupCalls, 4);
cleanup();
assert.equal(cleanupCalls, 4, '重复调用必须无副作用');
cleanupFactory(true, () => assert.fail('已退出不可再次释放'), null,
    () => assert.fail('已退出不可操作节点'), null)();
console.log('PASS preview cleanup is idempotent after exit and application switching');
// 旧actions覆盖表含独立特效，不能因基础Buff.file为空就判定无特效。
const nanakoActionRows = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/resources/config/buff.json'), 'utf8')).rows;
for (const id of [2230100,2231101,2231102,2231103,2233101,2233102,2233103]) {
    const row = nanakoActionRows.find(row => row.idx === id);
    const actions = melee.exports.BattleAttackUtils.legacyActions(row);
    assert.equal(actions.length, id >= 2233101 ? 3 : 2);
    assert.equal(actions[0].type, id === 2230100 ? 2 : 3);
    assert.equal(melee.exports.BattleAttackUtils.plan(actions[0]).action, id >= 2233101 ? 'attack3' : id === 2230100 ? 'attack' : 'attack2');
    const effects = actions.slice(1);
    assert.deepEqual(effects.map(value => value.delay), id >= 2233101 ? [0,120] : [id === 2230100 ? 40 : 90]);
    for (const effect of effects) {
        const plan = melee.exports.BattleAttackUtils.plan(effect);
        assert.ok(plan.effectOnly);
        assert.equal(plan.onSource, effect.type === 6);
        for (const resource of plan.effect.paths) {
            assert.ok(fs.existsSync(path.join(root,'client/assets/resources',resource.replace('/spriteFrame','.png'))));
        }
    }
    if (id >= 2233101) assert.equal(melee.exports.BattleAttackUtils.plan(actions[2]).effect.scaleX,-1);
}
console.log('PASS legacy Nanako override actions, complete frame assets, source/target and signed scale');
