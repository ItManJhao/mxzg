/**
 * 追猎者与诺亚旧动作贯通专项：读取真实Buff、已恢复序列帧和冻结战报，检查动作拆分及时序参数。
 * 仅验证本批必要表现与共享资源池，不计算伤害、不开放关卡或写玩家数据。
 * --java=<raw BattleReplay>可检查后端真实第4关完整动作链；像素恢复依据见本批独立资源证据。
 */
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { assetManager, Node, SpriteFrame } from "cc";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import type { BattleAttackPlan } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

/** 工具读取真实Bundle地址，不维护另一份运行时资源路径表。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
/** 当前登录包同源Buff表，业务仍从GameConfig直接读取。 */
const buffs: any[] = JSON.parse(readFileSync(resolveBundleFile("config/buff.json"), "utf8")).rows;

/** 读取已有动作配置；缺行失败，不能构造同名替代动作掩盖源缺口。 */
function row(id: number): any {
    const found = buffs.find(value => value.idx === id);
    assert(found, "真实Buff缺失：" + id);
    return found;
}

/** 浮点锚点沿旧减0.07规则比较，不因二进制小数舍入误报。 */
function near(actual: number, expected: number): void {
    assert(Math.abs(actual - expected) < 1e-12, actual + " != " + expected);
}

/** 原动作覆盖由ID选择旧定义，实际帧能力由格式及原资源验证，不按关卡或任意ID放行。 */
function plans(): readonly BattleAttackPlan[] {
    const before = JSON.stringify([row(3020100), row(3021101), row(3050300), row(3051101)]);
    const hunter = BattleAttackUtils.legacyActions(row(3020100));
    assert.deepEqual(hunter.map(action => [action.type, action.delay]), [[2, 0], [6, 30]]);
    const move = BattleAttackUtils.plan(hunter[0]);
    assert(move.melee && !move.effect && !move.effectOnly);
    assert.deepEqual(move.sounds, ["skill-103030030"]);
    near(move.moveSeconds, 0.1);
    near(move.attackDelaySeconds, 0.4);
    near(move.beforeReturnSeconds, 1.5);
    const source = BattleAttackUtils.plan(hunter[1]);
    assert(source.effectOnly && source.onSource && !source.melee);
    assert.equal(source.effect!.paths.length, 12);
    assert.deepEqual(source.sounds, [], "施法者帧不能重复播放近身动作已负责的音效");
    near(BattleAttackUtils.delaySeconds(hunter[1]), 0.5);
    near(source.effect!.interval, 0.06);
    near(source.effect!.scaleX, 1.4);
    near(source.effect!.anchorX, 0.6);
    near(source.effect!.anchorY, 0.35 - 0.07);
    assert(
        0.5 + source.effect!.paths.length * source.effect!.interval
            < move.moveSeconds * 2 + move.attackDelaySeconds + move.beforeReturnSeconds,
        "本批独立施法者特效不延长原近身完成时点",
    );

    const hunterActive = BattleAttackUtils.plan(row(3021101));
    assert(!hunterActive.melee && !hunterActive.effectOnly && !hunterActive.onSource);
    assert.equal(hunterActive.action, "attack", "旧默认攻击骨骼不能擅自替换成attack2");
    assert.equal(hunterActive.effect!.paths.length, 15);
    near(hunterActive.attackSeconds, 0.3);
    near(hunterActive.actionSeconds, 1.5);
    near(hunterActive.effect!.anchorX, 0.45);
    near(hunterActive.effect!.anchorY, 0.14 - 0.07);
    assert.deepEqual(hunterActive.sounds, ["skill-103020021"]);

    const noah = BattleAttackUtils.legacyActions(row(3050300));
    assert.deepEqual(noah.map(action => [action.type, action.delay]), [[7, 30], [11, 0]]);
    const target = BattleAttackUtils.plan(noah[0]);
    assert(target.effectOnly && !target.onSource && !target.melee);
    assert.equal(target.effect!.paths.length, 8);
    near(target.effect!.anchorX, 0.25);
    near(target.effect!.anchorY, 0.21 - 0.07);
    near(BattleAttackUtils.delaySeconds(noah[0]), 0.5);
    assert.deepEqual(target.sounds, ["skill-103040050"]);
    const close = BattleAttackUtils.plan(noah[1]);
    assert(close.melee && !close.effect && !close.effectOnly);
    assert.equal(close.battlefieldOffset, null, "旧type11未消费offset，不按type9比例移动");
    near(close.moveSeconds, 0.1);
    near(close.attackDelaySeconds, 0.2);
    near(close.beforeReturnSeconds, 2);
    assert.deepEqual(close.sounds, []);
    assert(
        0.5 + target.effect!.paths.length * target.effect!.interval
            < close.moveSeconds * 2 + close.attackDelaySeconds + close.beforeReturnSeconds,
        "本批独立目标特效不延长原type11完成时点",
    );

    const noahActive = BattleAttackUtils.plan(row(3051101));
    assert.equal(noahActive.action, "attack");
    assert.equal(noahActive.effect!.paths.length, 10);
    near(noahActive.attackSeconds, 0.3);
    near(noahActive.actionSeconds, 1.8);
    near(noahActive.effect!.anchorX, 0.5);
    near(noahActive.effect!.anchorY, 0.15 - 0.07);
    assert.deepEqual(noahActive.sounds, ["skill-103040051"]);
    assert.deepEqual(BattleAttackUtils.dimly(row(3051101)), [0.5, 1, 0.5]);
    for (const active of [hunterActive, noahActive]) {
        assert(active.effect!.paths.length * active.effect!.interval < active.actionSeconds,
            "本批目标帧寿命短于角色动作，不以截帧缩短旧完成时点");
    }
    assert.equal(JSON.stringify([row(3020100), row(3021101), row(3050300), row(3051101)]), before);
    assert.throws(() => BattleAttackUtils.plan(row(3020100)), /帧资源尚未核对/,
        "原type2 file只预载，不能直接把它当目标序列帧播放");
    assert.throws(() => BattleAttackUtils.plan({ ...row(3021101), file: '["future-skill"]' }), /帧资源尚未核对/);
    assert.throws(() => BattleAttackUtils.plan({ ...row(3021101),
        ani_base: '{"format":"skill-103020021/other.png"}' }), /帧资源尚未核对/);
    assert.throws(() => BattleAttackUtils.plan({ ...row(3021101),
        ani_base: '{"format":"skill-103020021/%d.png","duration":0}' }), /帧间隔无效/);
    return [move, source, hunterActive, target, close, noahActive];
}

/** 逐帧核对本包资源与本批像素证据，完整首末帧连续；元数据身份保持原值而非重新生成UUID。 */
function resources(plans: readonly BattleAttackPlan[]): void {
    const evidence = JSON.parse(readFileSync("docs/validation/chapter-stage4-assets-20261117.json", "utf8"));
    assert.deepEqual(evidence.result, { frames: 45, beforeMismatches: 45, afterMismatches: 0,
        preservedIdentityFiles: 45, creatorReimportedMetaFiles: evidence.result.creatorReimportedMetaFiles,
        audioFilesByteIdentical: 4 });
    const paths = new Set(plans.flatMap(plan => plan.effect?.paths || []));
    assert.equal(paths.size, 45);
    for (const path of paths) {
        const file = resolveBundleFile(path.replace("/spriteFrame", ".png"));
        const bytes = readFileSync(file);
        const source = evidence.files.find((entry: any) => file.replace(/\\/g, "/").endsWith(entry.path));
        assert(source, "本批恢复证据缺帧：" + path);
        assert.equal(createHash("sha256").update(bytes).digest("hex"), source.afterSha256);
        assert.equal(bytes.readUInt32BE(16), source.canvasSize[0]);
        assert.equal(bytes.readUInt32BE(20), source.canvasSize[1]);
        const meta = JSON.parse(readFileSync(file + ".meta", "utf8"));
        assert.equal(meta.uuid, source.preservedIdentity.image);
        assert.deepEqual(Object.fromEntries(Object.entries(meta.subMetas).map(([key, value]: [string, any]) =>
            [key, value.uuid])), source.preservedIdentity.subMetas);
        assert.equal(ResourceAssetsUtils.address(path, "SpriteFrame").bundle, "effects");
    }
    for (const plan of plans.filter(plan => plan.effect)) {
        const first = resolveBundleFile(plan.effect!.paths[0].replace("/spriteFrame", ".png"));
        assert.equal(readdirSync(dirname(first)).filter(name => name.endsWith(".png")).length, plan.effect!.paths.length);
    }
    for (const plan of plans) {
        for (const sound of plan.sounds) {
            assert(existsSync(resolveBundleFile("audio/" + sound + ".mp3")));
        }
    }
    for (const actor of [10302002, 10304005]) {
        const skeleton = JSON.parse(readFileSync(resolveBundleFile("spine/" + actor + ".json"), "utf8"));
        assert(skeleton.animations.attack, "旧默认attack必须在真实英雄骨骼中存在：" + actor);
    }
}

/** 新帧继续使用节点资源池：双窗口只加载一次、最后拥有者释放，真实加载失败向调用方传播。 */
async function sharedPool(path: string): Promise<void> {
    const original = assetManager.getBundle;
    const asset = new SpriteFrame();
    let calls = 0;
    let fail = false;
    const a = new Node("HunterFrameOwner");
    const b = new Node("NoahFrameOwner");
    assetManager.getBundle = ((bundle: string) => {
        assert.equal(bundle, "effects");
        return { deps: [], load: (_path: string, type: unknown, done: Function) => {
            assert.equal(type, SpriteFrame);
            calls++;
            done(fail ? new Error("本批帧下载失败") : null, fail ? null : asset);
        } };
    }) as any;
    try {
        const [one, two] = await Promise.all([ResourceAssetsUtils.forNode(a).loadPath(path, "SpriteFrame"),
            ResourceAssetsUtils.forNode(b).loadPath(path, "SpriteFrame")]);
        assert.equal(one, two);
        assert.equal(calls, 1);
        a.destroy();
        assert.equal(asset.refCount, 1);
        b.destroy();
        assert.equal(asset.refCount, 0);
        const retry = ResourceAssetsUtils.createAssetScope();
        fail = true;
        await assert.rejects(retry.loadPath(path, "SpriteFrame"), /本批帧下载失败/);
        fail = false;
        assert.equal(await retry.loadPath(path, "SpriteFrame"), asset, "失败不缓存为成功或换通用特效");
        retry.dispose();
        assert.equal(asset.refCount, 0);
    } finally {
        a.destroy();
        b.destroy();
        assetManager.getBundle = original;
    }
}

/** 本轮真实第4关PB包含完整原动作；逐项走同一计划与帧路径，不在测试里替换敌人或重排伤害。 */
function interop(): void {
    const argument = process.argv.find(value => value.startsWith("--java="));
    if (!argument) {
        return;
    }
    const steps = BattleReplayUtils.decode(readFileSync(argument.slice(7)));
    const actions = steps.filter(step => step.kind === "presentation");
    for (const id of [3020100, 3021101, 3050300, 3051101]) {
        assert.equal(actions.filter(step => step.configId === id).length, 1);
    }
    for (const step of actions) {
        for (const action of BattleAttackUtils.legacyActions(row(step.configId))) {
            const plan = BattleAttackUtils.plan(action);
            for (const path of plan.effect?.paths || []) {
                assert(existsSync(resolveBundleFile(path.replace("/spriteFrame", ".png"))));
            }
        }
    }
    const damage = steps.findIndex(step => step.kind === "damage" && step.configId === 3050200);
    const normal = steps.findIndex(step => step.kind === "presentation" && step.configId === 3050300);
    assert(damage >= 0 && normal > damage, "保留旧Noah普攻先伤害后表现的原buff_list顺序");
    console.log("Java第4关完整动作PB互通通过：" + argument.slice(7));
}

/** 运行原动作参数、45帧身份、共享池及可选真实PB检查；错误明确失败，不宣称浏览器或真机验收。 */
async function main(): Promise<void> {
    const selected = plans();
    resources(selected);
    await sharedPool(selected.find(plan => plan.effect)!.effect!.paths[0]);
    interop();
    console.log("PASS hunter/noah old actions, 45 original frames, timing and shared resource ownership");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
