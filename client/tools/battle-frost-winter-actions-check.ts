/**
 * 第5关必要旧表现专项：核对玛蒙、冰霜元素、寒冬的普攻/主动、真正空type1及旧覆盖重复项。
 * 只读取真实配置、原资源恢复证据和可选Java战报，不计算伤害、不开放关卡或发奖励。
 * --java=<raw BattleReplay>检查本轮三怪六技能完整样本，解码通过不替代Creator画面验收。
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import type { BattleAttackPlan } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

/** 从真实Bundle定位表与帧；不维护另一份运行时资源清单。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 同源Buff用于检查旧覆盖优先级和原始声明，游戏页面仍直接读GameConfig。 */
const buffs: any[] = JSON.parse(readFileSync(resolveBundleFile("config/buff.json"), "utf8")).rows;

/** 真实配置缺失即失败，不在测试中补一份假动作或默认参数。 */
function row(id: number): any {
    const found = buffs.find(value => value.idx === id);
    assert(found, "动作配置缺失：" + id);
    return found;
}

/** 锚点运算允许浮点表示误差，业务参数仍精确沿旧定义比较。 */
function near(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < 1e-12, actual + " != " + expected);
}

/** 真正空type1无动作、资源、音效或计时；life只属旧Buff字段，不能当播放时长。 */
function empty(): void {
    const source = row(2050100);
    const plan = BattleAttackUtils.plan(source);
    assert(plan.effectOnly && !plan.effect && !plan.melee && !plan.projectile && !plan.onSource);
    assert.equal(plan.action, "");
    assert.equal(plan.battlefieldOffset, null);
    assert.deepEqual(plan.sounds, []);
    assert.deepEqual([plan.moveSeconds, plan.attackSeconds, plan.attackDelaySeconds,
        plan.actionSeconds, plan.beforeReturnSeconds], [0, 0, 0, 0, 0]);
    assert.equal(source.life, 10);
    assert.deepEqual(BattleAttackUtils.plan({ ...source, life: 99999 }), plan,
        "旧life不参与动作时长或触发额外演出");
    for (const changes of [
        { ani_base: '{"move_time":0}' },
        { ani_base: '{"format":"skill-102040050/%d.png"}' },
        { file: '["skill-102040050"]' },
        { sound: '["god01"]' },
        { shake: 1 },
        { dimly: 2 },
    ]) {
        assert.throws(() => BattleAttackUtils.plan({ ...source, ...changes }), /空动作包含尚未恢复/);
    }
    assert.deepEqual(BattleAttackUtils.plan({ ...source, dimly: 1 }), plan,
        "公共暗屏在空动作开始前发出，不改变空段自身的骨骼或特效");
    const inherited = { ...source };
    delete inherited.shake;
    delete inherited.dimly;
    assert.deepEqual(BattleAttackUtils.plan(inherited), plan, "已有手工夹具未声明画面标志时仍按0处理");
}

/** 按旧覆盖展开并保留空本体之外的独立type3；不因同音效或同目标擅自去重。 */
function plans(): readonly BattleAttackPlan[] {
    const before = JSON.stringify(buffs);
    const emptyParts = BattleAttackUtils.legacyActions(row(2050100));
    assert.deepEqual(emptyParts.map(action => [action.type, action.delay]), [[1, 0], [3, 0]]);
    const normal = BattleAttackUtils.plan(row(2050300));
    assert.equal(BattleAttackUtils.plan(emptyParts[0]).action, "");
    assert.deepEqual(BattleAttackUtils.plan(emptyParts[1]), normal,
        "2050100旧覆盖第二项与独立2050300各保留原表现，不能删掉其中一份");
    assert.equal(BattleAttackUtils.legacyActions(row(2050300)).length, 1);
    assert(!normal.effectOnly && !normal.melee && !normal.projectile);
    assert.equal(normal.action, "attack");
    assert.equal(normal.effect!.paths.length, 11);
    near(normal.attackSeconds, 0.3);
    near(normal.actionSeconds, 0.8);
    near(normal.effect!.interval, 0.04);
    near(normal.effect!.anchorY, 0.2 - 0.07);
    assert.deepEqual(normal.sounds, ["skill-102040050"]);

    const frost = BattleAttackUtils.plan(row(2021101));
    assert.equal(frost.action, "attack");
    assert.equal(frost.effect!.paths.length, 14);
    near(frost.attackSeconds, 0.3);
    near(frost.actionSeconds, 1);
    near(frost.effect!.interval, 0.04);
    near(frost.effect!.scaleX, -0.8);
    near(frost.effect!.scaleY, 0.8);
    near(frost.effect!.anchorX, 0.7);
    near(frost.effect!.anchorY, 0.23 - 0.07);
    assert.deepEqual(frost.sounds, ["skill-102020021"]);

    const winter = BattleAttackUtils.plan(row(2051101));
    assert.equal(winter.action, "attack");
    assert.equal(winter.effect!.paths.length, 10);
    near(winter.attackSeconds, 0.3);
    near(winter.actionSeconds, 2);
    near(winter.effect!.interval, 0.1);
    near(winter.effect!.scaleX, 1.4);
    near(winter.effect!.anchorX, 0.5);
    near(winter.effect!.anchorY, 0.14 - 0.07);
    assert.deepEqual(winter.sounds, ["skill-102040051"]);
    assert.deepEqual(BattleAttackUtils.dimly(row(2051101)), [0.5, 1, 0.5]);

    const mammonParts = BattleAttackUtils.legacyActions(row(1020100));
    assert.deepEqual(mammonParts.map(action => [action.type, action.delay]), [[2, 0], [6, 25]]);
    const mammonMove = BattleAttackUtils.plan(mammonParts[0]);
    assert(mammonMove.melee && !mammonMove.effect);
    near(mammonMove.moveSeconds, 0.1);
    near(mammonMove.beforeReturnSeconds, 1);
    assert.deepEqual(mammonMove.sounds, []);
    const mammonEffect = BattleAttackUtils.plan(mammonParts[1]);
    assert(mammonEffect.effectOnly && mammonEffect.onSource);
    assert.equal(mammonEffect.effect!.paths.length, 6);
    near(BattleAttackUtils.delaySeconds(mammonParts[1]), 25 / 60);
    near(mammonEffect.effect!.interval, 0.06);
    near(mammonEffect.effect!.anchorX, 0.3);
    near(mammonEffect.effect!.anchorY, 0.5 - 0.07);
    near(mammonEffect.effect!.scaleX, 1.8);
    assert.deepEqual(mammonEffect.sounds, ["skill-101030030"]);

    const waterRow = BattleAttackUtils.legacyActions(row(2020100))[0];
    const water = BattleAttackUtils.plan(waterRow);
    assert.equal(waterRow.type, 3);
    near(BattleAttackUtils.delaySeconds(waterRow), 10 / 60);
    near(water.effect!.interval, 0.05);
    near(water.effect!.scaleX, 4);
    near(water.effect!.anchorX, 0.4);
    near(water.effect!.anchorY, 0.2 - 0.07);
    assert.deepEqual(water.sounds, ["skill-102040040"]);

    const mammonActive = BattleAttackUtils.plan(row(1021101));
    assert.equal(mammonActive.effect!.paths.length, 11);
    near(mammonActive.effect!.interval, 0.1);
    near(mammonActive.attackSeconds + mammonActive.actionSeconds, 1.3);
    near(mammonActive.attackSeconds + mammonActive.effect!.paths.length * mammonActive.effect!.interval, 1.4);
    assert.deepEqual(mammonActive.sounds, ["skill-101020021"]);
    assert.equal(JSON.stringify(buffs), before);
    assert.throws(() => BattleAttackUtils.plan({ ...row(2021101), file: '["future-unknown-frame"]' }), /帧资源尚未核对/);
    return [BattleAttackUtils.plan(emptyParts[0]), normal, frost, winter,
        mammonMove, mammonEffect, water, mammonActive];
}

/** 校验本批四套修复与两套复用的完整帧、原身份和音效；仅依赖当前证据，不覆写历史覆盖报告。 */
function resources(plans: readonly BattleAttackPlan[]): void {
    const evidence = JSON.parse(readFileSync("docs/validation/chapter-stage5-assets-20261117.json", "utf8"));
    const paths = new Set(plans.flatMap(plan => plan.effect?.paths || []));
    assert.equal(paths.size, 66);
    assert.equal(evidence.result.frames, 66);
    assert.equal(evidence.result.restoredFrames, 41);
    assert.equal(evidence.result.beforeMismatches, 41);
    assert.equal(evidence.result.afterMismatches, 0);
    for (const path of paths) {
        const file = resolveBundleFile(path.replace("/spriteFrame", ".png"));
        const source = evidence.files.find((entry: any) => file.replace(/\\/g, "/").endsWith(entry.path));
        assert(source, "本批资源证据缺帧：" + path);
        const data = readFileSync(file);
        assert.equal(createHash("sha256").update(data).digest("hex"), source.afterSha256);
        assert.deepEqual([data.readUInt32BE(16), data.readUInt32BE(20)], source.canvasSize);
        const meta = JSON.parse(readFileSync(file + ".meta", "utf8"));
        assert.equal(meta.uuid, source.preservedIdentity.image);
        assert.deepEqual(Object.fromEntries(Object.entries(meta.subMetas).map(([key, value]: [string, any]) =>
            [key, value.uuid])), source.preservedIdentity.subMetas);
        assert.equal(ResourceAssetsUtils.address(path, "SpriteFrame").bundle, "effects");
    }
    for (const plan of plans) {
        if (plan.effect) {
            const first = resolveBundleFile(plan.effect.paths[0].replace("/spriteFrame", ".png"));
            assert.equal(readdirSync(dirname(first)).filter(name => name.endsWith(".png")).length, plan.effect.paths.length);
        }
        for (const sound of plan.sounds) {
            assert(existsSync(resolveBundleFile("audio/" + sound + ".mp3")));
        }
    }
}

/** 三怪六技能使用真实后端原结果；本体空步骤不扣血，两个旧type3来源均保留，不伪造去重结果。 */
function interop(): void {
    const argument = process.argv.find(value => value.startsWith("--java="));
    if (!argument) {
        return;
    }
    const bytes = readFileSync(argument.slice(7));
    const steps = BattleReplayUtils.decode(bytes);
    assert.equal(BattleReplayUtils.units(bytes).filter(unit => unit.faction === 2).length, 3);
    for (const id of [1020100, 1021101, 2020100, 2021101, 2050100, 2050300, 2051101]) {
        assert.equal(steps.filter(step => step.kind === "presentation" && step.configId === id).length, 1);
    }
    for (const step of steps.filter(value => value.kind === "presentation")) {
        for (const action of BattleAttackUtils.legacyActions(row(step.configId))) {
            BattleAttackUtils.plan(action);
        }
    }
    const emptyIndex = steps.findIndex(step => step.kind === "presentation" && step.configId === 2050100);
    const noop = steps[emptyIndex];
    assert.equal(noop.actualHpChange, null);
    assert.equal(noop.reportedHpChange, null);
    assert.deepEqual(noop.hpByUnit, steps[emptyIndex - 1].hpByUnit);
    const separate = steps.find(step => step.kind === "presentation" && step.configId === 2050300)!;
    assert.equal(noop.sourceId, separate.sourceId);
    assert.equal(noop.targetId, separate.targetId);
    assert.equal(noop.round, separate.round);
    console.log("Java第5关三怪六技能及空本体/双旧type3互通通过：" + argument.slice(7));
}

/** 执行旧语义、静态资源及可选真实PB；不构建发布、不启动服务器、不写反馈或资产。 */
function main(): void {
    empty();
    resources(plans());
    interop();
    console.log("PASS frost/winter/mammon actions: strict empty step, original expanded effects and 66 verified frames");
}

try {
    main();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
