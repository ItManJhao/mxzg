/** 战斗表现回归：检查站位边界、骨架资源释放、飘字轨迹和多目标战报的并行交付。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Node, resources, sp } from "cc";
import { BattleReplayPlayer } from "../assets/scripts/features/battle/BattleReplayPlayer";
import { BattlePresentationUtils } from "../assets/scripts/features/battle/ui/BattlePresentationUtils";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";
import { IdleHangSkirmishPlanUtils } from "../assets/scripts/features/battle/ui/IdleHangSkirmishPlanUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 八个站位两侧都必须给等级/血条留足边距，宽屏不放大；非法尺寸不能产生 NaN。 */
function checkCombatBounds(): void {
 for(const width of [360,576,640,960]) {
  const scale=IdleHangSkirmishPlanUtils.hangStageScale(width);
  for(let position=1;position<=8;position++)for(const ally of [true,false]) {
   const point=IdleHangSkirmishPlanUtils.hangFormationPoint(position,ally);
   assert((Math.abs(point.x)+90)*scale<=width/2,"最外侧血条超出视口");
  }
 }
 assert.equal(IdleHangSkirmishPlanUtils.hangStageScale(960),1);assert(Number.isFinite(IdleHangSkirmishPlanUtils.hangStageScale(NaN)));
}
/** 使用实际资源动作表验证可选动作查询及销毁边界，不伪造资源具备的动作。 */
async function checkOptionalClips(): Promise<void> {
 const originalLoad=resources.load, originalFind=sp.Skeleton.prototype.findAnimation;
 let clips: Record<string, unknown>={};
 try {
  resources.load=(_path,_type,done)=>done(null,new sp.SkeletonData());
  sp.Skeleton.prototype.findAnimation=function(name){return clips[name]?{name}:null;};
  for(const stem of ["10101001","10201001","10301001"]){
   clips=JSON.parse(readFileSync(`client/assets/bundles/resources/spine/${stem}.json`,"utf8")).animations;
   const host=new Node("actor-test");let failed=0;const actor=BattleSpineService.instance.mountBattleSpine(host,stem,()=>failed++);
   for (let flush=0;flush<10;flush++) await Promise.resolve();
   assert(actor.hasGesture("attack"));assert(!actor.hasGesture("attack2"));assert(!actor.hasGesture("die"));
   actor.play("die");assert.equal(failed,0);host.destroy();assert(!actor.hasGesture("attack"));
  }
 } finally {resources.load=originalLoad;sp.Skeleton.prototype.findAnimation=originalFind;}
}

/** 两个节点共享转换骨架，关闭一个不得释放另一份；最后关闭才销毁副本。 */
async function checkSharedSkeleton(): Promise<void> {
 const original = resources.load;
 const asset = new sp.SkeletonData();
 Object.assign(asset, { uuid: "shared-copy", skeletonJson: JSON.parse(readFileSync("client/assets/bundles/resources/spine/10101001.json", "utf8")), atlasText: "fixture", textures: [], textureNames: [] });
 resources.load = (_path, _type, done) => done(null, asset);
 const a = new Node("one"), b = new Node("two");
 try {
  const first = BattleSpineService.instance.mountBattleSpine(a, "shared-copy", () => { throw new Error("first failed"); });
  const second = BattleSpineService.instance.mountBattleSpine(b, "shared-copy", () => { throw new Error("second failed"); });
  for (let i=0;i<10;i++) await Promise.resolve();
  const copy = first.node.getComponent(sp.Skeleton)!.skeletonData!;
  assert.notEqual(copy, asset);
  assert.equal(second.node.getComponent(sp.Skeleton)!.skeletonData, copy);
  a.destroy(); assert.equal(copy.isValid, true); assert.equal(asset.refCount, 1);
  b.destroy(); assert.equal(copy.isValid, false); assert.equal(asset.refCount, 0);
 } finally { a.destroy(); b.destroy(); resources.load = original; }
}

/** 按战斗秒数采样飘字轨迹，核对高度、缩放、渐隐和双方位移方向。 */
function checkFloatMotion(): void {
    const samples = Array.from({ length: 17 }, (_, index) =>
        BattlePresentationUtils.bounceAt(index / 10, 1, 20));
    const first = samples[0];
    const last = samples[samples.length - 1];
    assert(samples.every(pose => Object.values(pose).every(Number.isFinite)));
    for (const [seconds, height] of [[0.15, 100], [0.45, 60], [0.75, 20]]) {
        assert(Math.abs(BattlePresentationUtils.bounceAt(seconds, 1, 20).y - height) < 0.001,
            "飘字应产生三次逐渐降低的弹跳");
    }
    assert(samples.some(pose => pose.scale > first.scale), "受击数字需要放大");
    assert.equal(samples[9].opacity, 255, "三次弹跳期间保留完整透明度");
    assert(samples[13].opacity > 0 && samples[13].opacity < samples[9].opacity, "离场时逐渐淡隐");
    assert.equal(last.opacity, 0, "轨迹结束后数字应完全透明");
    const opposite = BattlePresentationUtils.bounceAt(0.8, -1, 20);
    assert.notEqual(samples[8].x, opposite.x, "双方飘字应沿不同方向位移");
    assert.equal(samples[8].y, opposite.y);
    assert.equal(BattlePresentationUtils.floatHurtText(0), "");
    assert.equal(BattlePresentationUtils.floatHurtText(-123), "-123");
    assert.equal(BattlePresentationUtils.floatHurtText(25), "+25");
}

/** 用生成协议构造一次五目标命中，第一个目标多段受击，用于验证并行与同目标保序。 */
function multiTargetReplay(): Uint8Array {
    const skill = { sourceId: 1, targetId: 1, configId: 101050111, skillLevel: 1, skillType: 1 };
    const attacker = { unitId: 1, faction: 1, templateId: 10105011, position: 1, level: 1,
        initialHp: 100, maxHp: 100, finalHp: 100 };
    const targets = Array.from({ length: 5 }, (_, index) => ({
        unitId: index + 9, faction: 2, templateId: 10101001, position: index + 1, level: 1,
        initialHp: 100, maxHp: 100, finalHp: 0,
    }));
    const damage = { kind: "damage", sourceId: 1, configId: 1011401 };
    return mxzg.game.BattleReplay.encode(mxzg.game.BattleReplay.fromObject({
        schemaVersion: 1,
        scenario: "audit:lineup:1",
        outcome: "ATTACKER_WIN",
        rounds: 1,
        units: [attacker, ...targets],
        phases: [
            { round: 1, sourceId: 0, events: [] },
            { round: 1, sourceId: 1, events: [
                { kind: "skill.begin", ...skill },
                { ...damage, targetId: 9, actualHpChange: -40, reportedHpChange: -38, dead: false },
                ...targets.map(({ unitId }, index) => ({
                    ...damage, targetId: unitId, actualHpChange: index === 0 ? -60 : -100,
                    reportedHpChange: index === 0 ? -61 : -100 - index, dead: true,
                })),
                { kind: "skill.end", ...skill },
            ] },
        ],
    })).finish();
}

/** 在首个命中故意等待时观测其余目标已开始，每个目标保持来自战报的原显示量。 */
async function checkMultiTargetPlayback(): Promise<void> {
    const visible = new Map<number, number[]>();
    let finishFirstHit: (() => void) | undefined;
    const player = new BattleReplayPlayer({
        play: async step => {
            if (step.kind !== "damage") {
                return;
            }
            const hits = visible.get(step.targetId) ?? [];
            hits.push(step.reportedHpChange!);
            visible.set(step.targetId, hits);
            if (step.targetId === 9 && !step.dead) {
                await new Promise<void>(resolve => { finishFirstHit = resolve; });
            }
        },
        stop: () => {},
    });
    const completed = player.play(multiTargetReplay());
    for (let index = 0; index < 12; index++) {
        await Promise.resolve();
    }
    assert(finishFirstHit, "首个命中应已开始");
    try {
        assert.equal(visible.size, 5, "一个目标等待时，其余四个目标仍应独立提交飘字");
        assert.deepEqual(visible.get(9), [-38], "同目标的第二段应等首段完成");
        assert.deepEqual(visible.get(13), [-104], "每个受击者应收到自己的报告伤害");
    } finally {
        finishFirstHit();
    }
    assert.equal(await completed, true);
    assert.deepEqual(visible.get(9), [-38, -61]);
}

/** 末次飘字等待期间关闭，播放器应报告取消，并且只清理一次。 */
async function checkPlaybackFinishCancellation(): Promise<void> {
    let release: (() => void) | undefined;
    let stopped = 0;
    const player = new BattleReplayPlayer({
        play: async () => {},
        finish: () => new Promise<void>(resolve => { release = resolve; }),
        stop: () => { stopped++; release?.(); },
    });
    const playback = player.play(multiTargetReplay());
    for (let index = 0; index < 20; index++) {
        await Promise.resolve();
    }
    assert(release, "播放完成伤害事件后应继续等待画面收尾");
    assert.equal(stopped, 0);
    player.stop();
    assert.equal(await playback, false);
    assert.equal(stopped, 1, "主动关闭后不再重复执行自然结束清理");
}

/** 执行站位、资源、动画参数和战报交付回归，失败时以非零状态退出。 */
async function main() {
    checkCombatBounds();
    await checkOptionalClips();
    await checkSharedSkeleton();
    checkFloatMotion();
    await checkMultiTargetPlayback();
    await checkPlaybackFinishCancellation();
    assert.equal(BattlePresentationUtils.overheadLevelText(null), null);
    assert.equal(BattlePresentationUtils.overheadLevelText(7), "Lv.7");
    console.log("battle-view passed: authored bounds, skeleton actions/refcounts, number bounce and concurrent target playback");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
