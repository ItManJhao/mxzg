/**
 * 第9关必要旧表现专项：核对荆棘之炎的场地移动/施法者特效、原普攻投射及整关三怪六技能依赖。
 * 只读取真实配置、原PVR恢复证据和可选Java原战报，不构建、不联网、不开放关卡或修改资产。
 * --java=<raw BattleReplay>复验真实三怪样本；解码和静态资源通过不替代Creator画面验收。
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import type { BattleAttackPlan } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

/** 使用真实Bundle路径入口，不新增另一份运行时资源地址清单。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 登录配置包的同源Buff表；测试旧覆盖展开，不替页面准备配置。 */
const buffs: any[] = table("buff");

/** 读取实际配置源表；缺文件/缺行直接使检查失败。 */
function table(name: string): any[] {
    return JSON.parse(readFileSync(resolveBundleFile("config/" + name + ".json"), "utf8")).rows;
}

/** 查真实Buff，不在测试中补造另一份荆棘配置。 */
function row(id: number): any {
    const found = buffs.find(value => value.idx === id);
    assert(found, "动作配置缺失：" + id);
    return found;
}

/** 时长与锚点仅允许浮点表达误差，不改变旧数值。 */
function near(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < 1e-12, actual + " != " + expected);
}

/** 确认实际第9关与主动一级来源，后续关卡不能借这份样本改变阵容或技能等级。 */
function configuration(): void {
    const chapter = table("chapter").filter(value => value.mode_id === 1 && value.chapter_id === 1
        && value.mission_id === 9 && value.hero_type > 0);
    assert.deepEqual(chapter.map(value => [value.pos, value.hero_type, value.hero_level, value.hero_star]),
        [[1, 10102002, 5, 2], [2, 10202002, 5, 2], [3, 10104005, 5, 4]]);
    const active = table("heroskill").find(value => value.type === 101040051 && value.level === 1);
    assert(active);
    assert.deepEqual(JSON.parse(active.art_list), [1051101]);
}

/** 旧type8按战场比例移动，不依赖某个命中目标；独立type6在原延迟读取施法者当下坐标。 */
function plans(): readonly BattleAttackPlan[] {
    const before = JSON.stringify(buffs);
    const parts = BattleAttackUtils.legacyActions(row(1051101));
    assert.deepEqual(parts.map(value => [value.type, value.delay, value.dimly]), [[8, 0, 0], [6, 15, 1]]);
    const moving = BattleAttackUtils.plan(parts[0]);
    assert(!moving.melee && !moving.effectOnly && !moving.projectile && !moving.effect && !moving.onSource);
    assert.equal(moving.battlefieldOffset, null);
    assert.deepEqual(moving.moveOffset, [0.55, 0.4]);
    assert(Object.isFrozen(moving.moveOffset));
    assert.equal(moving.action, "attack");
    near(moving.moveSeconds, 0.1);
    near(moving.attackSeconds, 0);
    near(moving.attackDelaySeconds, 0.3);
    near(moving.actionSeconds, 0);
    near(moving.beforeReturnSeconds, 1.7);
    near(moving.moveSeconds * 2 + moving.attackDelaySeconds + moving.beforeReturnSeconds, 2.2);
    assert.deepEqual(moving.sounds, ["skill-101040051"]);
    const effect = BattleAttackUtils.plan(parts[1]);
    assert(effect.effectOnly && effect.onSource && !effect.melee && !effect.projectile);
    assert.equal(effect.moveOffset, null);
    near(BattleAttackUtils.delaySeconds(parts[1]), 0.25);
    assert.equal(effect.effect!.paths.length, 6);
    near(effect.effect!.interval, 0.1);
    near(effect.effect!.scaleX, 1.3);
    near(effect.effect!.scaleY, 1.3);
    near(effect.effect!.anchorX, 0.5);
    near(effect.effect!.anchorY, 0.4 - 0.07);
    near(BattleAttackUtils.delaySeconds(parts[1]) + effect.effect!.paths.length * effect.effect!.interval, 0.85);
    assert.deepEqual(effect.sounds, []);

    const normal = BattleAttackUtils.plan(row(1050100));
    assert(normal.projectile && !normal.effectOnly && !normal.melee && !normal.onSource);
    assert.equal(normal.moveOffset, null);
    assert.equal(normal.action, "attack");
    near(normal.attackSeconds, 0.4);
    near(normal.actionSeconds, 0.4);
    assert.equal(normal.effect!.paths.length, 7);
    near(normal.effect!.interval, 0.05);
    near(normal.effect!.flightSeconds, 0.4);
    near(normal.effect!.scaleX, 2.6);
    near(normal.effect!.scaleY, 2.6);
    // 本例投射与角色名义上都在0.8秒完成，不能把通用边界修正伪称为该样本已观测额外延时。
    near(normal.attackSeconds + normal.effect!.flightSeconds, normal.attackSeconds + normal.actionSeconds);
    assert.deepEqual(normal.sounds, ["skill-101040050"]);

    // type8可用于其他已核实动作，不按技能ID特许；缺横坐标的旧镜像分支不同，当前严格拒绝缺轴。
    const other = BattleAttackUtils.plan({ type: 8, ani_base: '{"offset_x":0,"offset_y":0}', file: "[]", sound: "[]" });
    assert.deepEqual(other.moveOffset, [0, 0]);
    for (const base of [{}, { offset_x: 0.55 }, { offset_y: 0.4 }]) {
        assert.throws(() => BattleAttackUtils.plan({ ...parts[0], ani_base: JSON.stringify(base) }), /缺少显式双轴比例/);
    }
    for (const value of [-0.01, 1.01, "0.55", null]) {
        assert.throws(() => BattleAttackUtils.plan({ ...parts[0],
            ani_base: JSON.stringify({ offset_x: value, offset_y: 0.4 }) }));
    }
    for (const changes of [
        { file: '["skill-101040051"]' },
        { ani_base: '{"format":"skill-101040051/%d.png"}' },
        { ani_base: '{"unknown":1}' },
        { type: 4 },
    ]) {
        assert.throws(() => BattleAttackUtils.plan({ ...parts[0], ...changes }));
    }
    assert.throws(() => BattleAttackUtils.plan({ ...parts[1], file: '["future-unknown-frame"]' }), /帧资源尚未核对/);
    const all = [1020100, 1021101, 2020100, 2021101, 1050100, 1051101]
        .flatMap(id => BattleAttackUtils.legacyActions(row(id)).map(value => BattleAttackUtils.plan(value)));
    for (const plan of all.filter(value => value !== moving && !value.moveOffset)) {
        assert.equal(plan.moveOffset, null);
    }
    assert.equal(JSON.stringify(buffs), before, "旧覆盖不得修改登录配置映射或战报原ID");
    return all;
}

/** 核本批58帧真实摘要/身份/画布及6音效；Creator重导裁剪允许变化，pivot与九宫格不能变。 */
function resources(plans: readonly BattleAttackPlan[]): void {
    const evidence = JSON.parse(readFileSync("docs/validation/chapter-stage9-assets-20261117.json", "utf8"));
    const paths = new Set(plans.flatMap(plan => plan.effect?.paths || []));
    assert.equal(paths.size, 58);
    assert.equal(evidence.result.frames, 58);
    assert.equal(evidence.result.restoredFrames, 6);
    assert.equal(evidence.result.reusedFrames, 52);
    assert.equal(evidence.result.afterMismatches, 0);
    for (const path of paths) {
        const file = resolveBundleFile(path.replace("/spriteFrame", ".png"));
        const source = evidence.files.find((entry: any) => file.replace(/\\/g, "/").endsWith(entry.path));
        assert(source, "原帧证据缺失：" + path);
        const png = readFileSync(file);
        assert.equal(createHash("sha256").update(png).digest("hex"), source.afterSha256);
        assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], source.canvasSize);
        const meta = JSON.parse(readFileSync(file + ".meta", "utf8"));
        assert.equal(meta.uuid, source.preservedIdentity.image);
        assert.deepEqual(Object.fromEntries(Object.entries(meta.subMetas).map(([key, value]: [string, any]) =>
            [key, value.uuid])), source.preservedIdentity.subMetas);
        for (const [key, fields] of Object.entries(source.preservedGeometry)) {
            for (const [field, value] of Object.entries(fields as Record<string, unknown>)) {
                assert.equal(meta.subMetas[key].userData[field], value, path + " : " + field);
            }
        }
        assert.equal(ResourceAssetsUtils.address(path, "SpriteFrame").bundle, "effects");
    }
    for (const plan of plans.filter(value => value.effect)) {
        const first = resolveBundleFile(plan.effect!.paths[0].replace("/spriteFrame", ".png"));
        assert.equal(readdirSync(dirname(first)).filter(name => name.endsWith(".png")).length, plan.effect!.paths.length);
    }
    for (const source of evidence.sources) {
        assert(source.continuousFromZero);
        assert.equal(createHash("sha256").update(readFileSync(source.legacyPvr)).digest("hex"), source.pvrSha256);
        assert.equal(createHash("sha256").update(readFileSync(source.legacyPlist)).digest("hex"), source.plistSha256);
    }
    for (const sound of evidence.audio) {
        const data = readFileSync(resolveBundleFile("audio/" + sound.name + ".mp3"));
        assert.equal(createHash("sha256").update(data).digest("hex"), sound.sha256);
        assert.deepEqual(data, readFileSync(sound.legacyPath));
    }
    for (const actor of [10102002, 10202002, 10104005]) {
        const skeleton = JSON.parse(readFileSync(resolveBundleFile("spine/" + actor + ".json"), "utf8"));
        assert(skeleton.animations.attack, "默认attack必须存在于原骨骼：" + actor);
    }
}

/** 真实PB必须保留三怪六技能和全部原表现；本工具仅播放计划预检，不改变伤害、技能或顺序。 */
function interop(): void {
    const argument = process.argv.find(value => value.startsWith("--java="));
    if (!argument) {
        return;
    }
    const bytes = readFileSync(argument.slice(7));
    const units = BattleReplayUtils.units(bytes).filter(unit => unit.faction === 2);
    assert.deepEqual(units.map(unit => [unit.templateId, unit.level]), [[10102002, 5], [10202002, 5], [10104005, 5]]);
    const steps = BattleReplayUtils.decode(bytes);
    for (const id of [1020100, 1021101, 2020100, 2021101, 1050100, 1051101]) {
        assert(steps.some(step => step.kind === "presentation" && step.configId === id), "真实样本缺动作：" + id);
    }
    for (const step of steps.filter(value => value.kind === "presentation")) {
        for (const action of BattleAttackUtils.legacyActions(row(step.configId))) {
            BattleAttackUtils.plan(action);
        }
    }
    console.log("Java第9关三怪六技能与荆棘场地移动/独立特效互通通过：" + argument.slice(7));
}

/** 执行同源配置、严格动作、资源与可选PB检查，不连接玩家库或构建发布。 */
function main(): void {
    configuration();
    resources(plans());
    interop();
    console.log("PASS thorn actions: strict field movement, caster effect, original projectile and 58 verified frames");
}

try {
    main();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
