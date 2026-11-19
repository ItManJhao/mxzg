/** 校验金币副本首关的动作展开、原资源以及战报契约；可额外读取真实服务端的战报原始字节。 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";

/** 真实Bundle路径由工具统一定位，配置和音效使用项目当前源文件。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 校验秒数和锚点，容许小数运算误差。 */
function near(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < 1e-12, actual + " != " + expected);
}

/** 校验两个新增旧覆盖，确保可见投掷、固定终点、帧序和出声时点正确。 */
function actions(): void {
    const bytes = readFileSync(resolveBundleFile("config/buff.json"), "utf8");
    const { rows } = JSON.parse(bytes);
    const row = (id: number) => {
        const found = rows.find((value: { idx: number }) => value.idx === id);
        assert(found, "战斗动作缺失 " + id);
        return found;
    };
    const parts = BattleAttackUtils.legacyActions(row(2041401));
    assert.deepEqual(parts.map(value => [value.type, value.delay, value.dimly]), [[6, 15, 1], [10, 30, 0]]);
    const attached = BattleAttackUtils.plan(parts[0]);
    assert(attached.effectOnly && attached.onSource && !attached.projectile);
    assert.equal(attached.effect!.paths.length, 8);
    near(attached.effect!.anchorX, 30.7);
    near(attached.effect!.scaleX, 2.3);
    assert.deepEqual(attached.sounds, ["skill-102040041"]);
    const projectile = BattleAttackUtils.plan(parts[1]);
    assert(projectile.projectile && !projectile.effectOnly && !projectile.onSource);
    assert.deepEqual(projectile.projectileOffset, [0.8, 0.4]);
    assert.equal(projectile.battlefieldOffset, null);
    assert.equal(projectile.action, "attack");
    near(projectile.attackSeconds, 0.3);
    near(projectile.actionSeconds, 0.5);
    near(projectile.effect!.scaleX, 1.5);
    near(projectile.effect!.interval, 0.1);
    near(projectile.effect!.flightSeconds, 0.6);
    assert.deepEqual(projectile.effect!.paths, Array.from({ length: 5 }, (_, index) =>
        `effects/skill/skill-102040041/skill-102040041_arrow-${index}/spriteFrame`));
    assert.deepEqual(projectile.sounds, []);
    const projectileBase = JSON.parse(parts[1].ani_base);
    assert.throws(() => BattleAttackUtils.plan({ ...parts[1], ani_base: JSON.stringify({ ...projectileBase, offset_x: 2 }) }), /超出战场范围/);
    assert.throws(() => BattleAttackUtils.plan({ ...parts[1], ani_base: JSON.stringify({ ...projectileBase, offset_y: undefined }) }), /缺少显式双轴比例/);
    assert.throws(() => BattleAttackUtils.plan({ ...parts[1], file: '["skill-102040041"]' }), /帧资源尚未核对/);

    const normal = BattleAttackUtils.legacyActions(row(4050100));
    const basic = BattleAttackUtils.plan(normal[0]);
    assert.deepEqual(normal.map(value => [value.type, value.delay, value.dimly]), [[3, 0, 0]]);
    assert.equal(basic.effect!.paths.length, 7);
    near(basic.effect!.interval, 0.06);
    assert.deepEqual(basic.sounds, ["skill-104050050"]);
    const goddess = BattleAttackUtils.legacyActions(row(4051101));
    assert.deepEqual(goddess.map(value => [value.type, value.delay, value.dimly]), [[3, 0, 1], [6, 20, 0], [7, 70, 1]]);
    const [gesture, cast, target] = goddess.map(value => BattleAttackUtils.plan(value));
    assert.equal(gesture.action, "attack2");
    assert(cast.effectOnly && cast.onSource);
    assert(target.effectOnly && !target.onSource);
    assert.equal(cast.effect!.paths.length, 45);
    assert.equal(target.effect!.paths.length, 11);
    assert.deepEqual(target.sounds, ["skill-104050051"]);
}

/** 校验服务端策划投影的六个冻结守军可进入通用播放，拒绝未知关卡或缺失、伪造单位。 */
function replay(): void {
    const { enemies } = JSON.parse(readFileSync("backend/src/main/resources/gameplay/daily-gold-rules.json", "utf8"));
    const units = [{ unitId: 2, faction: 1, position: 2, templateId: 10101001, level: 1,
        star: 1, initialHp: 100, maxHp: 100, finalHp: 0 },
        ...enemies.map((enemy: { position: number; template: number; level: number; star: number }) => ({
            unitId: 8 + enemy.position, faction: 2, position: enemy.position, templateId: enemy.template,
            level: enemy.level, star: enemy.star, initialHp: 100, maxHp: 100, finalHp: 100,
        }))];
    const report = { schemaVersion: 1, scenario: "dungeon:gold:1", rounds: 1, outcome: "DEFENDER_WIN", units, phases: [
        { round: 1, sourceId: 0, events: [] },
        { round: 1, sourceId: 14, events: [
            { kind: "skill.begin", sourceId: 14, targetId: 2, configId: 102040041, skillLevel: 1, skillType: 1 },
            { kind: "presentation", sourceId: 14, targetId: 2, configId: 2041401 },
            { kind: "damage", sourceId: 14, targetId: 2, configId: 2041201, actualHpChange: -100, reportedHpChange: -100, dead: true },
            { kind: "skill.end", sourceId: 14, targetId: 2, configId: 102040041, skillLevel: 1, skillType: 1 },
        ] },
    ] };
    const parsed = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(report));
    assert.equal(parsed.units.length, 7);
    assert.equal(parsed.steps.filter(step => step.kind === "presentation" && step.configId === 2041401).length, 1);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, scenario: "dungeon:gold:2" }), /场景不支持/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, units: units.slice(0, -1) }), /金币副本首关战报名册不符/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, units: [...units.slice(0, -1), { ...units.at(-1), star: 1 }] }), /金币副本首关战报名册不符/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, units: [{ ...units[0], unitId: 99 }, ...units.slice(1)] }), /阵容战报身份无效/);

    const sample = process.argv.find(value => value.startsWith("--java="));
    if (sample) {
        const parsedSample = BattleReplayUtils.parse(readFileSync(sample.slice("--java=".length)));
        assert.equal(parsedSample.units.filter(unit => unit.faction === 2).length, 6);
        assert(parsedSample.steps.some(step => step.kind === "presentation" && step.configId === 2041401));
    }
}

/** 核验旧资源恢复证据对应当前本地文件，帧、音效和原图UUID分别检查。 */
function assets(): void {
    const evidence = JSON.parse(readFileSync("docs/validation/gold-dungeon-action-assets-20261119.json", "utf8"));
    const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(evidence.assetsTotal, 76);
    assert.equal(evidence.files.length, evidence.assetsTotal);
    assert.equal(evidence.audio.length, 3);
    for (const frame of evidence.files) {
        assert(frame.afterPixelsMatchSource && !frame.beforePixelsMatchSource);
        assert.equal(hash(frame.path), frame.afterSha256);
        assert.equal(JSON.parse(readFileSync(frame.path + ".meta", "utf8")).uuid, frame.imageUuid);
    }
    for (const audio of evidence.audio) {
        assert.equal(hash(audio.local), audio.sha256);
    }
}

actions();
replay();
assets();
console.log("PASS gold dungeon actions, six-enemy replay and original 76 frames plus three audio files");
