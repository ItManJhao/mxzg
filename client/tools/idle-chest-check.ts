/**
 * 宝箱领取表现纯规则检查：覆盖旧65秒显示门槛、封顶不可判定与真实四档收取动作。
 * 只读取现有骨骼资源和纯计算，不连接服务端、不改资产，也不开放玩家领取按钮。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { IdleChestUtils } from "../assets/scripts/features/battle/utils/IdleChestUtils";

/** 每个用例只计算一次独立输入，不累计前批主线或恢复专项的数量。 */
let cases = 0;

// 服务端60秒与客户端显示65秒各有用途；60秒不能提前显示为已到客户端门槛。
const waits: readonly (readonly [number, number, number, number | null])[] = [
    [0, 60, 21600, 65],
    [59, 60, 21600, 6],
    [60, 60, 21600, 5],
    [64, 60, 21600, 1],
    [64.999, 60, 21600, 1],
    [65, 60, 21600, 0],
    [66, 60, 21600, 0],
    [-20, 60, 21600, 65],
    [30000, 60, 21600, 0],
    [0, 120, 21600, 125],
    [124, 120, 21600, 1],
    [125, 120, 21600, 0],
    [64, 60, 65, 1],
    [65, 60, 65, 0],
    [100, 60, 64, null],
    [0, 60, 64, null],
];
for (const [seconds, frequency, maxSeconds, expected] of waits) {
    assert.equal(IdleChestUtils.claimWaitSeconds(seconds, frequency, maxSeconds), expected,
        "领取显示等待不一致：" + JSON.stringify({ seconds, frequency, maxSeconds }));
    cases++;
}

// 配置不变量坏损不能显示假ready，也不能以无限等待隐藏错误。
const invalidTimes: readonly (readonly [number, number, number])[] = [
    [Number.NaN, 60, 21600],
    [Number.POSITIVE_INFINITY, 60, 21600],
    [0, 0, 21600],
    [0, -1, 21600],
    [0, 60.5, 21600],
    [0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    [0, 60, 0],
    [0, 60, -1],
    [0, 60, Number.POSITIVE_INFINITY],
    [0, 60, 21600.5],
];
for (const [seconds, frequency, maxSeconds] of invalidTimes) {
    assert.throws(() => IdleChestUtils.claimWaitSeconds(seconds, frequency, maxSeconds), /显示时间非法/);
    cases++;
}

// 直接检查当前随工程保留的原资源，而非只比较代码字符串本身。
const spine = JSON.parse(readFileSync("client/assets/bundles/resources/spine/res-block.json", "utf8"));
assert(spine.animations["normal-0"], "旧收取队列的空宝箱normal-0动作必须存在");
cases++;
for (const stage of [1, 2, 3, 4]) {
    const action = IdleChestUtils.collectAnimation(stage);
    assert(spine.animations[action], "缺少真实旧收取动作：" + action);
    assert(spine.animations["normal-" + stage], "收取前的同档待机动作必须存在");
    cases++;
}
for (const stage of [0, -1, 5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => IdleChestUtils.collectAnimation(stage), /收取档位无效/);
    cases++;
}

console.log("PASS " + cases + " idle chest display cases: legacy wait threshold, inconclusive cap and real collect animations");
