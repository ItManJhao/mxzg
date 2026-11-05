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
assert.equal(steps[steps.length - 1].attackerHp, 56);
assert.equal(steps[steps.length - 1].defenderHp, 0);
assert.ok(Object.isFrozen(steps));
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
    "client/assets/scripts/features/battle/utils/BattleMeleeUtils.ts")], bundle: true,
    platform: "node", format: "cjs", write: false}).outputFiles[0].text;
const melee = {exports: {}};
new Function("module", "exports", "require", meleeCode)(melee, melee.exports, require);
const buffRows = JSON.parse(fs.readFileSync(path.join(root,
    "client/assets/resources/config/buff.json"), "utf8")).rows;
for (const id of [1010100, 1011101]) {
    const row = buffRows.find(row => row.idx === id);
    const plan = melee.exports.BattleMeleeUtils.plan(row);
    assert.equal(plan.moveSeconds, 0.1);
    assert.equal(plan.beforeReturnSeconds, 1);
    assert.equal(plan.action, "attack");
    assert.equal(plan.attackSeconds, 0);
    assert.equal(plan.attackDelaySeconds, 0);
    assert.equal(plan.actionSeconds, 0);
    assert.deepEqual(plan.sounds, id === 1011101 ? ["skill-101010011"] : []);
    assert.throws(() => melee.exports.BattleMeleeUtils.plan({...row,
        ani_base: '{"move_back":true}'}), /时间无效/);
    assert.throws(() => melee.exports.BattleMeleeUtils.plan({...row,
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
