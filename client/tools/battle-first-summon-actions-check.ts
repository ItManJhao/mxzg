/**
 * 首抽布兰特的战斗播放检查。使用真实配置和帧路径核对旧动作，测试夹具只检查战报播放与取消。
 * 可传入真实首战 PB，检查它使用相同的播放入口。此工具不启动 Creator、不写入角色数据。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { BattleReplayPlayer } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 通过当前 Bundle 配置解析检查用的源文件路径，运行时仍走现有资源池。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 现有技能 Buff 配置，用于验证两个表现事件指向的原行。 */
const buffs = JSON.parse(readFileSync(resolveBundleFile("config/buff.json"), "utf8")).rows as Array<{
    idx: number; type: number; ani_base: string; file: string; sound: string; delay: number; dimly: number;
}>;

/** 从真实配置取得动作，缺失时直接报告原编号。 */
function row(id: number) {
    const result = buffs.find(value => value.idx === id);
    assert(result, "缺少动作配置 " + id);
    return result;
}

/** 核对实际会加载全部原帧，帧顺序及 SpriteFrame/纹理身份均来自已有资源。 */
function checkFrames(paths: readonly string[], name: string, count: number, width: number, height: number) {
    assert.equal(paths.length, count);
    const uuids = new Set<string>();
    paths.forEach((path, index) => {
        assert.equal(path, `effects/skill/${name}/${name}_${index}/spriteFrame`);
        const file = resolveBundleFile(path.replace("/spriteFrame", ".png"));
        const png = readFileSync(file);
        assert.equal(png.toString("ascii", 12, 16), "IHDR");
        assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height]);
        const meta = JSON.parse(readFileSync(file + ".meta", "utf8"));
        assert(!uuids.has(meta.uuid));
        uuids.add(meta.uuid);
        assert.equal(meta.subMetas["6c48a"].uuid, meta.uuid + "@6c48a");
        assert.equal(meta.subMetas["f9941"].uuid, meta.uuid + "@f9941");
    });
}

/** 根据旧 actions.lua 的 3120100、3121101 检查定位、延时、负缩放与暗屏。 */
function checkActions() {
    const normal = BattleAttackUtils.legacyActions(row(3120100));
    const active = BattleAttackUtils.legacyActions(row(3121101));
    assert.deepEqual(normal.map(action => [action.type, action.delay, action.dimly]),
        [[1, 0, 0], [6, 30, 0], [11, 0, 0]]);
    assert.deepEqual(active.map(action => [action.type, action.delay, action.dimly]), [[2, 0, 0], [7, 20, 1]]);
    const [empty, normalFrames, normalMove] = normal.map(action => BattleAttackUtils.plan(action));
    const [activeMove, activeFrames] = active.map(action => BattleAttackUtils.plan(action));
    assert.equal(empty.action, "");
    assert.equal(normalFrames.onSource, true);
    assert.equal(activeFrames.onSource, false);
    assert(normalFrames.effect && activeFrames.effect);
    assert.deepEqual([normalFrames.effect.interval, normalFrames.effect.scaleX, normalFrames.effect.scaleY,
        normalFrames.effect.anchorX], [0.04, 2.4, 2.4, 0.25]);
    assert.deepEqual([activeFrames.effect.interval, activeFrames.effect.scaleX, activeFrames.effect.scaleY],
        [0.04, -2.6, 2.6]);
    assert(Math.abs(normalFrames.effect.anchorY - 0.28) < 1e-12);
    assert(Math.abs(activeFrames.effect.anchorY - 0.18) < 1e-12);
    assert.deepEqual([normalMove.beforeReturnSeconds, normalMove.attackDelaySeconds,
        activeMove.beforeReturnSeconds], [2, 0.2, 1]);
    assert.throws(() => BattleAttackUtils.plan(row(3121101)), /帧资源尚未核对/);
    // 原覆盖的两份音效在旧资源目录缺失，所需帧仍全部加载。
    assert.deepEqual([...normalFrames.sounds, ...activeMove.sounds], []);
    checkFrames(normalFrames.effect.paths, "skill-103040120", 11, 128, 87);
    checkFrames(activeFrames.effect.paths, "skill-103040121", 21, 225, 125);
    const skeleton = JSON.parse(readFileSync(resolveBundleFile("spine/10304012.json"), "utf8"));
    assert(skeleton.animations[normalMove.action]);
    assert(skeleton.animations[activeMove.action]);
}

/** 取得只含两个表现事件的测试 PB，编号与真实动作相同，测试结束/取消无需修改任何资产。 */
function fixture() {
    const sourceId = 2;
    const targetId = 10;
    const units = [
        { unitId: sourceId, faction: 1, templateId: 10304012, level: 1, position: 2, initialHp: 469, maxHp: 469, finalHp: 469 },
        { unitId: targetId, faction: 2, templateId: 10101001, level: 1, position: 2, initialHp: 238, maxHp: 238, finalHp: 0 },
    ];
    const active = { sourceId, targetId, configId: 103040121, skillLevel: 1, skillType: 1 };
    const normal = { sourceId, targetId, configId: 103040120, skillLevel: 0, skillType: 2 };
    const events = [
        { kind: "skill.begin", ...active },
        { kind: "presentation", sourceId, targetId, configId: 3121101 },
        { kind: "skill.end", ...active },
        { kind: "skill.begin", ...normal },
        { kind: "presentation", sourceId, targetId, configId: 3120100 },
        { kind: "damage", sourceId, targetId, configId: 3120300, actualHpChange: -238, reportedHpChange: -238, dead: true },
        { kind: "skill.end", ...normal },
    ];
    return mxzg.game.BattleReplay.encode(mxzg.game.BattleReplay.fromObject({
        schemaVersion: 1, scenario: "audit:lineup:1", rounds: 1, outcome: "ATTACKER_WIN", units,
        phases: [{ round: 1, sourceId: 0, events: [] }, { round: 1, sourceId, events }],
    })).finish();
}

/** 动作播放实际等待当前回调，关闭后不会继续播下一条动作。 */
async function checkPlayback() {
    for (const cancel of [false, true]) {
        let finish: () => void = () => {};
        const held = new Promise<void>(resolve => { finish = resolve; });
        let signalStarted: () => void = () => {};
        const started = new Promise<void>(resolve => { signalStarted = resolve; });
        const seen: number[] = [];
        let stopped = 0;
        const player = new BattleReplayPlayer({
            play: async step => {
                if (step.kind === "presentation") {
                    seen.push(step.configId);
                    if (step.configId === 3121101) {
                        signalStarted();
                        await held;
                    }
                }
            },
            stop: () => { stopped++; finish(); },
        });
        const done = player.play(fixture());
        await Promise.race([started, done]);
        assert.deepEqual(seen, [3121101]);
        if (cancel) player.stop(); else finish();
        assert.equal(await done, !cancel);
        assert.deepEqual(seen, cancel ? [3121101] : [3121101, 3120100]);
        assert.equal(stopped, 1);
    }
}

/** 可选真实战报仍进入原解析器和相同播放配置，不生成战斗。 */
function checkReplayFile(file: string) {
    const steps = BattleReplayUtils.decode(readFileSync(file));
    const actions = steps.filter(step => step.kind === "presentation");
    for (const id of [3121101, 3120100]) {
        assert(actions.some(step => step.configId === id), "真实战报缺布兰特动作 " + id);
        for (const action of BattleAttackUtils.legacyActions(row(id))) BattleAttackUtils.plan(action);
    }
}

/** 运行同源动作、资源、关闭及可选真实战报检查。 */
async function main() {
    checkActions();
    await checkPlayback();
    for (const argument of process.argv.filter(value => value.startsWith("--java="))) {
        checkReplayFile(argument.slice(7));
    }
    console.log("PASS 布兰特普攻和主动技能、32张原帧及播放关闭");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
