/** 校验副本共用的旧动作覆盖和资源，并核对日常副本战报与可选的真实服务端样本。 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 真实Bundle路径由工具统一定位，配置和音效使用项目当前源文件。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 校验秒数和锚点，容许小数运算误差。 */
function near(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < 1e-12, actual + " != " + expected);
}

/** 从正式战斗配置取动作，再按旧覆盖生成播放器使用的各动作段。 */
function actionRows() {
    const { rows } = JSON.parse(readFileSync(resolveBundleFile("config/buff.json"), "utf8"));
    return (id: number) => {
        const found = rows.find((value: { idx: number }) => value.idx === id);
        assert(found, "战斗动作缺失 " + id);
        return BattleAttackUtils.legacyActions(found);
    };
}

/** 校验首关新增旧动作覆盖，确保投掷终点、帧序和出声时点正确。 */
function actions(): void {
    const action = actionRows();
    const parts = action(2041401);
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

    const normal = action(4050100);
    const basic = BattleAttackUtils.plan(normal[0]);
    assert.deepEqual(normal.map(value => [value.type, value.delay, value.dimly]), [[3, 0, 0]]);
    assert.equal(basic.effect!.paths.length, 7);
    near(basic.effect!.interval, 0.06);
    assert.deepEqual(basic.sounds, ["skill-104050050"]);
    const goddess = action(4051101);
    assert.deepEqual(goddess.map(value => [value.type, value.delay, value.dimly]), [[3, 0, 1], [6, 20, 0], [7, 70, 1]]);
    const [gesture, cast, target] = goddess.map(value => BattleAttackUtils.plan(value));
    assert.equal(gesture.action, "attack2");
    assert(cast.effectOnly && cast.onSource);
    assert(target.effectOnly && !target.onSource);
    assert.equal(cast.effect!.paths.length, 45);
    assert.equal(target.effect!.paths.length, 11);
    assert.deepEqual(target.sounds, ["skill-104050051"]);
}

/** 校验第二关的近身普攻、施法暗屏、各段时间、定位和原音效，还要逐张核对帧资源。 */
function checkSecondStagePresentation(): void {
    const action = actionRows();
    const cases = [
        { id: 4040100, segments: [[2, 0, 0], [6, 40, 0]] },
        { id: 4041101, segments: [[3, 0, 1], [7, 100, 0], [6, 90, 0]] },
        { id: 5060100, segments: [[2, 0, 0], [6, 15, 0]] },
        { id: 5061201, segments: [[3, 0, 0], [7, 50, 0]] },
    ];
    for (const { id, segments } of cases) {
        assert.deepEqual(action(id).map(value => [value.type, value.delay, value.dimly]), segments);
    }

    const [kaiAttack, kaiSwing] = action(4040100).map(value => BattleAttackUtils.plan(value));
    assert.deepEqual(kaiAttack.sounds, ["skill-104050040"]);
    assert.deepEqual(kaiSwing.sounds, []);
    assert.deepEqual(kaiSwing.effect!.paths, verifiedFrames("skill-104050040", 6));
    near(kaiSwing.effect!.scaleX, -2);

    const [doomAttack, doomSwing] = action(5060100).map(value => BattleAttackUtils.plan(value));
    assert.deepEqual(doomAttack.sounds, ["skill-105050060"]);
    assert.deepEqual(doomSwing.sounds, ["skill-105050060"]);
    assert.deepEqual(doomSwing.effect!.paths, verifiedFrames("skill-105050060", 8));
    near(doomSwing.effect!.anchorX, 0.77);

    for (const attack of [kaiAttack, doomAttack]) {
        assert(attack.melee && !attack.effect);
        near(attack.moveSeconds, 0.1);
        near(attack.attackDelaySeconds, 0.3);
        near(attack.beforeReturnSeconds, 1);
    }

    const [kaiCast, kaiTarget, kaiSource] = action(4041101).map(value => BattleAttackUtils.plan(value));
    assert.equal(kaiCast.action, "attack2");
    near(kaiCast.attackSeconds, 0.6);
    near(kaiCast.actionSeconds, 1);
    assert.deepEqual(kaiTarget.sounds, ["skill-104050041"]);
    assert.deepEqual(kaiSource.sounds, []);
    assert.deepEqual(kaiTarget.effect!.paths, verifiedFrames("skill-104050041", 11));
    assert.deepEqual(kaiSource.effect!.paths, verifiedFrames("skill-104050041-1", 13));
    near(kaiTarget.effect!.anchorX, 0.8);
    near(kaiSource.effect!.interval, 0.025);

    const [doomCast, doomTarget] = action(5061201).map(value => BattleAttackUtils.plan(value));
    assert.equal(doomCast.action, "attack3");
    assert.deepEqual(doomTarget.sounds, ["skill-105050063"]);
    assert.deepEqual(doomTarget.effect!.paths, verifiedFrames("skill-105050063", 11));
    near(doomTarget.effect!.scaleX, 3);
    assert(!kaiCast.effect && !doomCast.effect);
    assert([kaiSwing, doomSwing, kaiSource].every(value => value.effectOnly && value.onSource));
    assert([kaiTarget, doomTarget].every(value => value.effectOnly && !value.onSource));

    for (const [model, actionName] of [[10405004, kaiCast.action], [10505006, doomCast.action]]) {
        const spine = JSON.parse(readFileSync(resolveBundleFile(`spine/${model}.json`), "utf8"));
        assert(spine.animations[actionName], `动作 ${actionName} 不在模型 ${model} 中`);
    }
    for (const sound of [...kaiAttack.sounds, ...kaiTarget.sounds, ...doomAttack.sounds, ...doomTarget.sounds]) {
        assert(resolveBundleFile(`audio/${sound}.mp3`));
    }
}

/** 校验第三关原动作的多段顺序、附身和战场位置、骨骼与全部恢复帧。 */
function checkThirdStagePresentation(): void {
    const action = actionRows();
    const cases = [
        { id: 1070100, segments: [[2, 0, 0]] },
        { id: 1071101, segments: [[3, 0, 0], [6, 30, 0]] },
        { id: 3070100, segments: [[3, 0, 0]] },
        { id: 3071101, segments: [[3, 0, 1], [9, 20, 0], [6, 55, 0]] },
        { id: 5040100, segments: [[3, 0, 0]] },
        { id: 5041101, segments: [[3, 0, 1], [9, 20, 1], [6, 0, 0]] },
        { id: 5042201, segments: [[3, 0, 0]] },
    ];
    for (const { id, segments } of cases) {
        assert.deepEqual(action(id).map(value => [value.type, value.delay, value.dimly]), segments);
    }
    const [knightAttack] = action(1070100).map(value => BattleAttackUtils.plan(value));
    assert(knightAttack.melee && knightAttack.effect === null);
    near(knightAttack.moveSeconds, 0.1);
    near(knightAttack.attackDelaySeconds, 0.2);
    near(knightAttack.beforeReturnSeconds, 0.8);
    assert.deepEqual(knightAttack.sounds, ["skill-102050060"]);
    const [knightCast, knightSource] = action(1071101).map(value => BattleAttackUtils.plan(value));
    assert.equal(knightCast.action, "attack3");
    assert.deepEqual(knightCast.sounds, []);
    assert(knightSource.effectOnly && knightSource.onSource);
    assert.deepEqual(knightSource.effect!.paths, verifiedFrames("skill-101050073", 19));
    near(knightSource.effect!.interval, 0.03);

    const [holyAttack] = action(3070100).map(value => BattleAttackUtils.plan(value));
    assert(!holyAttack.melee && !holyAttack.onSource && !holyAttack.effectOnly);
    near(holyAttack.attackSeconds, 0.3);
    near(holyAttack.actionSeconds, 1.7);
    near(holyAttack.effect!.interval, 0.04);
    near(holyAttack.effect!.anchorY, 0.15);
    assert.deepEqual(holyAttack.effect!.paths, verifiedFrames("skill-103050070", 16));
    const [holyCast, holyField, holySource] = action(3071101).map(value => BattleAttackUtils.plan(value));
    assert.equal(holyCast.action, "attack2");
    assert.deepEqual(holyCast.sounds, ["skill-103050071"]);
    assert.deepEqual(holyField.battlefieldOffset, [0.8, 0.4]);
    assert(holySource.effectOnly && holySource.onSource);
    assert.deepEqual(holyField.effect!.paths, verifiedFrames("skill-103050071", 14));
    assert.deepEqual(holySource.effect!.paths, verifiedFrames("skill-103050071-1", 20));

    const [edwardAttack] = action(5040100).map(value => BattleAttackUtils.plan(value));
    assert.deepEqual(action(5042201).map(value => BattleAttackUtils.plan(value)), [edwardAttack]);
    assert.deepEqual(edwardAttack.effect!.paths, verifiedFrames("skill-105050040", 10));
    near(edwardAttack.effect!.scaleX, 2);
    near(edwardAttack.effect!.anchorY, 0.28);
    const [edwardCast, edwardField, edwardSource] = action(5041101).map(value => BattleAttackUtils.plan(value));
    assert.equal(edwardCast.action, "attack2");
    assert.equal(edwardCast.effect, null);
    near(edwardCast.attackSeconds, 0.6);
    near(edwardCast.actionSeconds, 2);
    assert.deepEqual(edwardCast.sounds, ["skill-105050041"]);
    assert.deepEqual(edwardField.battlefieldOffset, [0.6, 0.5]);
    assert.deepEqual(edwardField.effect!.paths, verifiedFrames("skill-105050041", 18));
    assert.deepEqual(edwardSource.effect!.paths, verifiedFrames("skill-105050041-1", 57));
    assert(edwardSource.effectOnly && edwardSource.onSource);
    assert.deepEqual(edwardField.sounds, []);
    assert.deepEqual(edwardSource.sounds, []);
    near(edwardSource.effect!.interval, 0.035);

    for (const [model, actionName] of [[10105007, knightCast.action], [10305007, holyCast.action], [10505004, edwardCast.action]]) {
        const spine = JSON.parse(readFileSync(resolveBundleFile(`spine/${model}.json`), "utf8"));
        assert(spine.animations[actionName], `动作 ${actionName} 不在模型 ${model} 中`);
    }
    for (const sound of [knightAttack, holyAttack, holyCast, edwardAttack, edwardCast].flatMap(value => value.sounds)) {
        assert(resolveBundleFile(`audio/${sound}.mp3`));
    }
}

/** 锁定全日常副本补入的动作顺序、实际帧、音效独立段和骨骼挂点。 */
function checkExpandedDungeonPresentation(): void {
    const resolve = actionRows();
    for (const [id, segments] of [
        [1010100, [[2, 0, 0], [6, 25, 0]]],
        [1073101, [[3, 0, 0], [6, 60, 0]]],
        [1075101, [[2, 0, 0], [6, 30, 0]]],
        [1083101, [[3, 0, 0], [7, 70, 0]]],
        [3010100, [[2, 0, 0], [6, 30, 0]]],
        [3073101, [[3, 0, 0], [9, 60, 0]]],
        [4053101, [[3, 0, 0], [7, 60, 0]]],
        [4060100, [[2, 0, 0], [6, 20, 0]]],
        [4061101, [[3, 0, 1], [6, 40, 0]]],
        [4063101, [[3, 0, 0], [7, 80, 0]]],
        [5050100, [[2, 0, 0], [6, 30, 0]]],
        [5063101, [[3, 0, 0], [9, 50, 1], [6, 50, 0]]],
    ] as const) {
        assert.deepEqual(resolve(id).map(row => [row.type, row.delay, row.dimly]), segments);
    }
    const [brawlerSwing, brawlerSound] = resolve(1010100).map(row => BattleAttackUtils.plan(row));
    assert(brawlerSwing.melee && brawlerSound.effectOnly && brawlerSound.onSource);
    assert.equal(brawlerSound.effect, null);
    assert.deepEqual(brawlerSound.sounds, ["skill-101030030"]);
    for (const [id, part, name, count] of [
        [1073101, 1, "skill-101050073", 19],
        [1075101, 1, "skill-101050071", 26],
        [1083101, 1, "skill-101050083", 11],
        [3010100, 1, "skill-103030030", 12],
        [3073101, 1, "skill-103050073", 17],
        [4053101, 1, "skill-104050053", 10],
        [4060100, 1, "skill-104050060", 14],
        [4061101, 0, "skill-104050061", 18],
        [4061101, 1, "skill-104050061-1", 42],
        [4063101, 1, "skill-104050063", 11],
        [5050100, 1, "skill-105050050", 12],
        [5063101, 1, "skill-105050061", 9],
        [5063101, 2, "skill-105050061-1", 24],
    ] as const) {
        assert.deepEqual(BattleAttackUtils.plan(resolve(id)[part]).effect?.paths, verifiedFrames(name, count));
    }
    const [warGoddess, goddessTarget] = resolve(4053101).map(row => BattleAttackUtils.plan(row));
    assert.equal(warGoddess.action, "attack3");
    assert.equal(warGoddess.moveOffset, null);
    assert(goddessTarget.effectOnly && !goddessTarget.onSource);
    const [masterCast, masterSource] = resolve(4061101).map(row => BattleAttackUtils.plan(row));
    near(masterCast.effect!.scaleX, 2.6);
    near(masterSource.effect!.interval, 0.025);
    assert(masterSource.effectOnly && masterSource.onSource);
    for (const [model, id] of [
        [10105007, 1073101], [10105007, 1075101], [10105008, 1083101], [10305007, 3073101],
        [10405005, 4053101], [10405006, 4061101], [10405006, 4063101], [10505006, 5063101],
    ] as const) {
        const spine = JSON.parse(readFileSync(resolveBundleFile(`spine/${model}.json`), "utf8"));
        const clip = BattleAttackUtils.plan(resolve(id)[0]).action;
        assert(spine.animations[clip], `动作 ${clip} 不在模型 ${model} 中`);
    }
}

/** 返回预期帧路径，并检查每张原图的 SpriteFrame 已由 Creator 导入。 */
function verifiedFrames(name: string, count: number): readonly string[] {
    return Array.from({ length: count }, (_, index) => {
        const path = `effects/skill/${name}/${name}_${index}`;
        const image = resolveBundleFile(`${path}.png`);
        const metadata = JSON.parse(readFileSync(`${image}.meta`, "utf8")) as {
            subMetas: Record<string, { importer: string; imported: boolean }>;
        };
        assert(Object.values(metadata.subMetas).some(value => value.importer === "sprite-frame" && value.imported),
            `缺少 SpriteFrame ${path}`);
        return `${path}/spriteFrame`;
    });
}

/** 校验服务端策划投影的六个冻结守军可进入通用播放，拒绝未知关卡或缺失、伪造单位。 */
function replay(): void {
    const { stages } = JSON.parse(readFileSync("backend/src/main/resources/gameplay/daily-gold-rules.json", "utf8"));
    const units = stageUnits(stages[0].enemies);
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
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, scenario: "dungeon:gold:10" }), /场景不支持/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, scenario: "dungeon:gold:2" }), /日常副本战报名册与原关卡不符/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, units: units.slice(0, -1) }), /日常副本战报名册与原关卡不符/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, units: [...units.slice(0, -1), { ...units.at(-1), star: 1 }] }), /日常副本战报名册与原关卡不符/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...report, units: [{ ...units[0], unitId: 99 }, ...units.slice(1)] }), /阵容战报身份无效/);
    const stageTwo = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified({ ...report, scenario: "dungeon:gold:2", units: stageUnits(stages[1].enemies) }));
    assert.equal(stageTwo.units.filter(unit => unit.faction === 2 && unit.level === 20).length, 6);
    const thirdReport = {
        ...report, scenario: "dungeon:gold:3", units: stageUnits(stages[2].enemies), phases: [
            { round: 1, sourceId: 0, events: [] },
            { round: 1, sourceId: 15, events: [
                { kind: "skill.begin", sourceId: 15, targetId: 2, configId: 105050041, skillLevel: 1, skillType: 1 },
                { kind: "presentation", sourceId: 15, targetId: 2, configId: 5041101 },
                { kind: "damage", sourceId: 15, targetId: 2, configId: 5041201, actualHpChange: -100, reportedHpChange: -100, dead: true },
                { kind: "skill.end", sourceId: 15, targetId: 2, configId: 105050041, skillLevel: 1, skillType: 1 },
            ] },
        ],
    };
    const third = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(thirdReport));
    assert(third.steps.some(step => step.kind === "presentation" && step.configId === 5041101));
    assert.deepEqual(third.units.filter(unit => unit.faction === 2 && unit.level === 40).map(unit => unit.templateId),
        [10404003, 10205007, 10305007, 10105007, 10505004, 10104004]);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...thirdReport, scenario: "dungeon:gold:2" }),
        /日常副本战报名册与原关卡不符/);
    const experience = JSON.parse(readFileSync("backend/src/main/resources/gameplay/daily-experience-rules.json", "utf8")).stages[0];
    const experienceReport = { ...report, scenario: "dungeon:experience:1", units: stageUnits(experience.enemies), phases: [
        { round: 1, sourceId: 0, events: [] },
        { round: 1, sourceId: 14, events: [
            { kind: "skill.begin", sourceId: 14, targetId: 2, configId: 101020021, skillLevel: 1, skillType: 1 },
            { kind: "presentation", sourceId: 14, targetId: 2, configId: 1021101 },
            { kind: "damage", sourceId: 14, targetId: 2, configId: 1021201, actualHpChange: -100, reportedHpChange: -100, dead: true },
            { kind: "skill.end", sourceId: 14, targetId: 2, configId: 101020021, skillLevel: 1, skillType: 1 },
        ] },
    ] };
    const experienceParsed = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(experienceReport));
    assert.equal(experienceParsed.units.filter(unit => unit.faction === 2 && unit.level === 5).length, 6);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...experienceReport, units }), /日常副本战报名册与原关卡不符/);
    assert.throws(() => BattleReplayUtils.encodeVerified({ ...experienceReport, scenario: "dungeon:experience:10" }), /场景不支持/);

    const sample = process.argv.find(value => value.startsWith("--java="));
    if (sample) {
        const bytes = readFileSync(sample.slice("--java=".length));
        const scenario = mxzg.game.BattleReplay.decode(bytes).scenario;
        const parsedSample = BattleReplayUtils.parse(bytes);
        assert.equal(parsedSample.units.filter(unit => unit.faction === 2).length, 6);
        if (scenario === "dungeon:gold:1") {
            assert(parsedSample.steps.some(step => step.kind === "presentation" && step.configId === 2041401));
        } else if (scenario === "dungeon:experience:1") {
            assert.deepEqual(parsedSample.units.filter(unit => unit.faction === 2).map(unit => unit.templateId),
                [10504002, 10305008, 10404002, 10102002, 10505005, 10503001]);
            assert(parsedSample.steps.some(step => step.kind === "presentation"));
        } else if (scenario === "dungeon:gold:3") {
            assert.deepEqual(parsedSample.units.filter(unit => unit.faction === 2).map(unit => unit.templateId),
                [10404003, 10205007, 10305007, 10105007, 10505004, 10104004]);
            const resolveAction = actionRows();
            for (const step of parsedSample.steps) {
                if (step.kind === "presentation") {
                    resolveAction(step.configId).forEach(BattleAttackUtils.plan.bind(BattleAttackUtils));
                }
            }
        } else {
            assert.equal(scenario, "dungeon:gold:2");
            assert.deepEqual(parsedSample.units.filter(unit => unit.faction === 2).map(unit => unit.templateId),
                [10505006, 10405004, 10301001, 10202002, 10304005, 10301001]);
            assert(parsedSample.steps.some(step => step.kind === "presentation"));
        }
    }
}

/** 以服务端原配置构建测试名册，动作结构由专项样本独立验证。 */
function stageUnits(enemies: readonly { position: number; template: number; level: number; star: number }[]) {
    return [{ unitId: 2, faction: 1, position: 2, templateId: 10101001, level: 1,
        star: 1, initialHp: 100, maxHp: 100, finalHp: 0 },
        ...enemies.map(enemy => ({
            unitId: 8 + enemy.position, faction: 2, position: enemy.position, templateId: enemy.template,
            level: enemy.level, star: enemy.star, initialHp: 100, maxHp: 100, finalHp: 100,
        }))];
}

/** 核验旧资源恢复证据对应当前本地文件，帧、音效和原图UUID分别检查。 */
function assets(): void {
    const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
    const proofs = [
        { file: "gold-dungeon-action-assets-20261119.json", frames: 76, audio: 3 },
        { file: "gold-dungeon-stage3-action-assets-20261123.json", frames: 154, audio: 5 },
        { file: "daily-dungeon-action-assets-20261123.json", frames: 193, audio: 8 },
        { file: "dreamland-astrologer-action-assets-20261126.json", frames: 66, audio: 3 },
        { file: "trial-flame-witch-action-assets-20261126.json", frames: 115, audio: 4 },
    ];
    for (const proof of proofs) {
        const evidence = JSON.parse(readFileSync("docs/validation/" + proof.file, "utf8"));
        assert.equal(evidence.assetsTotal, proof.frames);
        assert.equal(evidence.files.length, proof.frames);
        assert.equal(evidence.audio.length, proof.audio);
        for (const frame of evidence.files) {
            assert(frame.afterPixelsMatchSource && !frame.beforePixelsMatchSource);
            assert.equal(hash(frame.path), frame.afterSha256);
            assert.equal(JSON.parse(readFileSync(frame.path + ".meta", "utf8")).uuid, frame.imageUuid);
        }
        for (const audio of evidence.audio) {
            assert.equal(hash(audio.local), audio.sha256);
        }
        for (const icon of evidence.icons ?? []) {
            assert.equal(hash(icon.path), icon.afterSha256);
            assert.equal(JSON.parse(readFileSync(icon.path + ".meta", "utf8")).uuid, icon.imageUuid);
        }
    }
}

/** 核对梦境守军的高等级动作展开，保留原样式和等级间的延迟差异。 */
function checkHigherLevelDungeonPresentation(): void {
    const action = actionRows();
    const goddess = action(4053101).map(row => BattleAttackUtils.plan(row));
    for (const id of [4053102, 4053103]) {
        const rows = action(id);
        assert.deepEqual(rows.map(row => [row.type, row.delay, row.dimly]), [[3, 0, 0], [7, 60, 0]]);
        assert.deepEqual(rows.map(row => BattleAttackUtils.plan(row)), goddess);
        near(BattleAttackUtils.delaySeconds(rows[1]), 1);
    }

    const edward = action(5041101).map(row => BattleAttackUtils.plan(row));
    for (const [id, frames] of [[5041102, 20], [5041103, 60]]) {
        const rows = action(id);
        assert.deepEqual(rows.map(row => [row.type, row.delay, row.dimly]), [[3, 0, 1], [9, frames, 1], [6, 0, 0]]);
        assert.deepEqual(rows.map(row => BattleAttackUtils.plan(row)), edward);
        near(BattleAttackUtils.delaySeconds(rows[1]), frames / 60);
    }
    for (const [id, frames] of [[2181101, 70], [2181102, 80], [2181103, 80], [2191101, 70], [2191103, 80]]) {
        assert.equal(action(id)[1].delay, frames);
    }
    for (const [id, effectRows, vocalRows] of [[3221101, 6, 5], [3221103, 6, 1], [5111101, 5, 4], [5111102, 5, 1]]) {
        const plans = action(id).map(row => BattleAttackUtils.plan(row));
        assert.equal(plans.filter(plan => plan.effectOnly && plan.effect).length, effectRows);
        assert.equal(plans.filter(plan => plan.sounds.length !== 0).length, vocalRows);
    }
}

/** 锁定喵莉丝的普攻、两种主动和被动图标，验证各段位置、播放时点和原资源。 */
function checkAstrologerPresentation(): void {
    const action = actionRows();
    const basic = action(2210100);
    assert.deepEqual(basic.map(row => [row.type, row.delay]), [[3, 0], [7, 25]]);
    assert.deepEqual(BattleAttackUtils.plan(basic[1]).effect?.paths, verifiedFrames("skill-102050210", 11));

    for (const id of [2211101, 2211102, 2211103]) {
        const rows = action(id);
        assert.deepEqual(rows.map(row => [row.type, row.delay]), [[3, 0], [9, 70], [6, 60]]);
        const [cast, field, attached] = rows.map(row => BattleAttackUtils.plan(row));
        assert.equal(cast.action, "attack2");
        assert.deepEqual(field.battlefieldOffset, [0.8, 0.45]);
        assert.deepEqual(field.effect?.paths, verifiedFrames("skill-102050211", 13));
        assert(attached.onSource);
        near(attached.effect!.interval, 0.025);
        assert.deepEqual(attached.effect?.paths, verifiedFrames("skill-102050211-1", 22));
    }

    for (const id of [2213101, 2213102, 2213103]) {
        const rows = action(id);
        assert.deepEqual(rows.map(row => [row.type, row.delay]), [[3, 0], [7, 50]]);
        const [cast, target] = rows.map(row => BattleAttackUtils.plan(row));
        assert.equal(cast.action, "attack3");
        assert(!target.onSource && target.effectOnly);
        assert.deepEqual(target.effect?.paths, verifiedFrames("skill-102050213", 20));
    }
    const icon = BattleAttackUtils.buffIconPath(102050214);
    assert.equal(icon, "hero/ui/skill-icon_102050214/spriteFrame");
    assert(resolveBundleFile(icon!.replace(/\/spriteFrame$/, ".png")));
}

/** 验证试炼圣焰女巫的原投掷、施法触发及后续目标段使用独立资源。 */
function checkFlameWitchPresentation(): void {
    const action = actionRows();
    const basic = action(1220100);
    assert.deepEqual(basic.map(row => [row.type, row.delay]), [[5, 0], [7, 28]]);
    const [arrow, hit] = basic.map(row => BattleAttackUtils.plan(row));
    assert(arrow.projectile);
    assert.deepEqual(arrow.effect?.paths, verifiedFrames("skill-101050220-1", 4));
    assert.deepEqual(hit.effect?.paths, verifiedFrames("skill-101050220-2", 16));

    for (const id of [1221101, 1221102, 1221103]) {
        const rows = action(id);
        assert.deepEqual(rows.map(row => [row.type, row.delay]), [[3, 0], [7, 100], [6, 0]]);
        const [cast, target, source] = rows.map(row => BattleAttackUtils.plan(row));
        assert.equal(cast.action, "attack2");
        assert.deepEqual(target.sounds, ["skill-101050221"]);
        assert.deepEqual(target.effect?.paths, verifiedFrames("skill-101050221", 15));
        assert.deepEqual(source.effect?.paths, verifiedFrames("skill-101050221-1", 68));
    }

    for (const id of [1223101, 1223102, 1223103]) {
        const rows = action(id);
        assert.deepEqual(rows.map(row => [row.type, row.delay]), [[3, 0], [7, 90]]);
        const [cast, target] = rows.map(row => BattleAttackUtils.plan(row));
        assert.equal(cast.action, "attack3");
        assert.deepEqual(target.effect?.paths, verifiedFrames("skill-101050223", 12));
    }
}

/** 校验试炼提米三档替换普攻的原目标特效和骨骼并发，逐帧核对现有资源入口。 */
function checkTimiReplacementPresentation(): void {
    const action = actionRows();
    const frames = verifiedFrames("skill-103050150", 7);
    assert(resolveBundleFile("audio/skill-103050150.mp3"));
    const spine = JSON.parse(readFileSync(resolveBundleFile("spine/10305015.json"), "utf8"));
    for (const id of [3155201, 3155202, 3155203]) {
        const rows = action(id);
        assert.deepEqual(rows.map(value => [value.type, value.delay, value.dimly]), [[7, 0, 1], [3, 0, 1]]);
        const [target, attack] = rows.map(value => BattleAttackUtils.plan(value));
        assert(target.effectOnly && !target.onSource && !target.projectile);
        assert.deepEqual(target.effect?.paths, frames);
        assert.deepEqual(target.sounds, ["skill-103050150"]);
        near(target.effect!.anchorX, 0.5);
        near(target.effect!.anchorY, 0.13 - 0.07);
        near(target.effect!.interval, 0.08);
        near(target.effect!.scaleX, 3);
        near(target.effect!.scaleY, 3);
        assert(!attack.effectOnly && !attack.effect);
        assert.deepEqual(attack.sounds, []);
        assert.equal(attack.action, "attack");
        assert(spine.animations[attack.action]);
        near(attack.attackSeconds, 0.6);
        near(attack.actionSeconds, 1.8);
    }
}

/** 对照三位试炼守军的旧动作时序、目标、现存音效及全部连续帧。 */
function checkSharedGuardPresentation(): void {
    const action = actionRows();
    const cases = [
        { ids: [3150200], timing: [[7, 0, 0], [3, 0, 0]], files: ["103050150", ""], sounds: ["103050150", ""] },
        { ids: [3151201, 3151202, 3151203], timing: [[7, 50, 1], [3, 0, 1], [6, 10, 0]],
            files: ["103050151", "", "103050151-1"], sounds: ["103050151", "", ""] },
        { ids: [4070200], timing: [[7, 10, 0], [11, 0, 0]], files: ["104050070", ""], sounds: ["104050070", ""] },
        { ids: [4071201, 4071202, 4071203], timing: [[3, 0, 1], [6, 85, 0]],
            files: ["104050071", "104050071-1"], sounds: ["104050071", ""] },
        { ids: [4073101, 4073102, 4073103], timing: [[3, 0, 0], [7, 30, 0]],
            files: ["", "104050073"], sounds: ["", "104050073"] },
        { ids: [5100100], timing: [[3, 0, 0]], files: ["105050100"], sounds: ["105050100"] },
        { ids: [5101101, 5101102, 5101103], timing: [[3, 0, 0], [9, 120, 1], [6, 0, 0]],
            files: ["", "105050101", "105050101-1"], sounds: ["", "105050101", ""] },
        { ids: [5103101, 5103102, 5103103], timing: [[3, 0, 0], [7, 120, 0]],
            files: ["", "105050103"], sounds: ["", "105050103"] },
    ];
    const frameCounts: Record<string, number> = {
        "103050150": 7, "103050151": 23, "103050151-1": 36,
        "104050070": 11, "104050071": 6, "104050071-1": 20, "104050073": 12,
        "105050100": 10, "105050101": 26, "105050101-1": 63, "105050103": 17,
    };
    for (const entry of cases) {
        for (const id of entry.ids) {
            const rows = action(id);
            assert.deepEqual(rows.map(row => [row.type, row.delay, row.dimly]), entry.timing, String(id));
            rows.forEach((row, index) => {
                const plan = BattleAttackUtils.plan(row);
                const file = entry.files[index];
                const sound = entry.sounds[index];
                assert.deepEqual(plan.effect?.paths ?? [], file ? verifiedFrames("skill-" + file, frameCounts[file]) : []);
                assert.deepEqual(plan.sounds, sound ? ["skill-" + sound] : []);
                if (sound) {
                    assert(resolveBundleFile("audio/skill-" + sound + ".mp3"));
                }
            });
        }
    }
    assert.deepEqual(BattleAttackUtils.plan(action(5101103)[1]).battlefieldOffset, [0.75, 0.5]);
    assert.equal(BattleAttackUtils.plan(action(3151203)[0]).effect?.scaleX, -3.4);
    assert.equal(BattleAttackUtils.plan(action(4070200)[1]).melee, true);
}

/** 梦境高星守军第三档继续播放同源的替换普攻和伊狸施法特效。 */
function checkDreamlandHighStarPresentation(): void {
    const action = actionRows();
    const colai = action(3135203);
    assert.deepEqual(colai.map(row => [row.type, row.delay]), [[7, 20], [3, 0]]);
    assert.deepEqual(BattleAttackUtils.plan(colai[0]).effect?.paths, verifiedFrames("skill-103050130", 14));
    const ellie = action(3211103);
    assert.deepEqual(ellie.map(row => [row.type, row.delay]), [[5, 0], [9, 95], [6, 10]]);
    assert.deepEqual(BattleAttackUtils.plan(ellie[1]).effect?.paths, verifiedFrames("skill-103050211", 17));
    assert.deepEqual(BattleAttackUtils.plan(ellie[2]).effect?.paths, verifiedFrames("skill-103050211-1", 52));
    assert(resolveBundleFile("audio/skill-103050130.mp3"));
    assert(resolveBundleFile("audio/skill-103050211.mp3"));
}

actions();
checkSecondStagePresentation();
checkThirdStagePresentation();
checkExpandedDungeonPresentation();
checkHigherLevelDungeonPresentation();
checkAstrologerPresentation();
checkFlameWitchPresentation();
checkTimiReplacementPresentation();
checkSharedGuardPresentation();
checkDreamlandHighStarPresentation();
replay();
assets();
console.log("PASS daily dungeon actions, six-enemy replays and verified frames/audio");
