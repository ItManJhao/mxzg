/**
 * 宝箱收取轨道专项：受控骨骼端口检查旧队列参数、两秒保护、最新档恢复和页面关闭。
 * 动作集合读取现有原骨骼，测试不创建游戏页面、不联网、不改资产或玩家入口。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameLog } from "../assets/scripts/core/GameLog";
import { MainChapterIdleChest } from "../assets/scripts/features/battle/ui/MainChapterIdleChest";
import type { IdleChestAnimation } from "../assets/scripts/features/battle/ui/MainChapterIdleChest";

/** 测试端口实际收到的一次轨道调用；没有额外的动画推进或资产副作用。 */
interface Call {
    /** set切动作、add排队、clear关闭轨道。 */
    kind: "set" | "add" | "clear";
    /** 旧宝箱始终使用轨道0；clear时没有此字段。 */
    track?: number;
    /** 来自真实资源的动作名，clear时没有此字段。 */
    action?: string;
    /** 旧收取和待机均循环，clear时没有此字段。 */
    loop?: boolean;
    /** 仅排队动作有旧1.5秒延迟。 */
    delay?: number;
}

/** 用现有动作集合模拟引擎端口，可显式注入失败，不提供第二套表现算法。 */
class Animation implements IdleChestAnimation {
    /** 每个实例有自己的真实动作集合，测试缺图不会影响其他案例。 */
    public readonly actions = new Set<string>(Object.keys(JSON.parse(readFileSync(
        "client/assets/bundles/resources/spine/res-block.json", "utf8")).animations));
    /** 实际轨道调用记录，用于确认高频render没有覆盖收取。 */
    public readonly calls: Call[] = [];
    /** true模拟引擎动作索引损坏，关闭后可恢复正常检查。 */
    public failFind = false;
    /** true模拟setAnimation失败，不记录成功调用。 */
    public failSet = false;
    /** true模拟收取已set但排队失败，检查是否恢复待机。 */
    public failAdd = false;
    /** true模拟关闭时骨骼已失效，dispose仍需完成。 */
    public failClear = false;

    /** 返回真实资源是否包含动作；失败由显式测试标记触发。 */
    public findAnimation(name: string): unknown {
        if (this.failFind) {
            throw new Error("index failure");
        }
        return this.actions.has(name) ? { name } : null;
    }

    /** 只记录正式类要求的轨道切换，不自行推导任何档位或动画。 */
    public setAnimation(track: number, action: string, loop: boolean): unknown {
        if (this.failSet) {
            throw new Error("set failure");
        }
        this.calls.push({ kind: "set", track, action, loop });
        return {};
    }

    /** 保留排队原始参数，不能用立即播放伪装旧队列延迟。 */
    public addAnimation(track: number, action: string, loop: boolean, delay: number): unknown {
        if (this.failAdd) {
            throw new Error("queue failure");
        }
        this.calls.push({ kind: "add", track, action, loop, delay });
        return {};
    }

    /** 记录关闭清理，失败不代表测试允许销毁整个骨骼或页面。 */
    public clearTracks(): void {
        if (this.failClear) {
            throw new Error("clear failure");
        }
        this.calls.push({ kind: "clear" });
    }
}

/** 本文件独立用例计数，不把多个断言或历史批次累加成新用例。 */
let checks = 0;

/** 每组独立清理日志去重，失败时补上场景名以便人工定位。 */
function check(name: string, action: () => void): void {
    GameLog.shared.clear();
    try {
        action();
    } catch (error) {
        throw new Error(name + "：" + String(error instanceof Error ? error.stack : error));
    }
    checks++;
}

/** 仅测试进程暂时关闭控制台镜像，日志内容仍真实保存并逐项断言。 */
const mirrorBefore = GameLog.shared.mirrorConsole;
GameLog.shared.mirrorConsole = false;
try {
    check("同档去重及跨档", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        chest.render(0, 1000);
        chest.render(29, 1000);
        chest.render(30, 1000);
        chest.render(59, 1000);
        assert.deepEqual(animation.calls.map(call => call.action), ["normal-1", "normal-2"]);
    });

    for (const stage of [1, 2, 3, 4]) {
        check("旧收取队列档" + stage, () => {
            const animation = new Animation();
            const chest = new MainChapterIdleChest(() => animation);
            assert.equal(chest.collect(stage), true);
            assert.deepEqual(animation.calls, [
                { kind: "set", track: 0, action: "collect-" + stage, loop: true },
                { kind: "add", track: 0, action: "normal-0", loop: true, delay: 1.5 },
            ]);
            chest.update(2);
            assert.equal(animation.calls[2].action, "normal-" + stage);
        });
    }

    check("两秒保护与最新待机", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        chest.render(110, 1000);
        assert(chest.collect(4));
        assert.equal(chest.collecting, true);
        chest.render(0, 1000);
        chest.update(1.5);
        chest.render(60, 1000);
        assert.equal(animation.calls.length, 3);
        chest.update(0.5);
        assert.equal(chest.collecting, false);
        assert.equal(animation.calls[3].action, "normal-3");
        chest.update(10);
        chest.render(100, 1000);
        assert.equal(animation.calls.length, 4);
    });

    check("高频render及tick不覆盖收取", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        chest.render(200, 1000);
        assert(chest.collect(4));
        for (let index = 0; index < 119; index++) {
            chest.render(index % 20, 1000);
            chest.update(1 / 60);
        }
        assert.equal(animation.calls.length, 3);
        chest.update(0.1);
        assert.equal(animation.calls[3].action, "normal-1");
        for (let index = 0; index < 100; index++) {
            chest.update(1 / 60);
            chest.render(10, 1000);
        }
        assert.equal(animation.calls.length, 4);
    });

    check("重复收取互斥及保护后可显式再次收取", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        assert(chest.collect(1));
        assert.equal(chest.collect(4), false);
        chest.update(1.999);
        assert.equal(chest.collect(2), false);
        assert.equal(animation.calls.length, 2);
        chest.update(0.0011);
        assert(chest.collect(3));
        assert.equal(animation.calls.filter(call => call.kind === "add").length, 2);
    });

    check("无效dt不推进保护", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        assert(chest.collect(1));
        for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
            chest.update(dt);
        }
        assert.equal(animation.calls.length, 2);
        chest.update(2);
        assert.equal(animation.calls[2].action, "normal-1");
    });

    check("大dt只恢复一次", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        assert(chest.collect(2));
        chest.update(Number.MAX_VALUE);
        chest.update(Number.MAX_VALUE);
        assert.deepEqual(animation.calls.map(call => call.action), ["collect-2", "normal-0", "normal-2"]);
    });

    check("未就绪不缓存迟到收取", () => {
        let current: Animation | null = null;
        const chest = new MainChapterIdleChest(() => current);
        chest.render(110, 1000);
        assert.equal(chest.collect(4), false);
        assert.equal(chest.collect(4), false);
        assert.equal(GameLog.shared.recent().length, 1);
        current = new Animation();
        chest.render(110, 1000);
        chest.update(10);
        assert.deepEqual(current.calls.map(call => call.action), ["normal-4"]);
    });

    check("收取中资源失效后不补播collect", () => {
        const before = new Animation();
        let current: Animation | null = before;
        const chest = new MainChapterIdleChest(() => current);
        assert(chest.collect(4));
        current = null;
        chest.render(0, 1000);
        chest.update(2);
        const after = current = new Animation();
        chest.render(0, 1000);
        assert.deepEqual(after.calls.map(call => call.action), ["normal-1"]);
        assert.equal(before.calls.length, 2);
    });

    check("替换骨骼后同档仍需设置一次", () => {
        let current = new Animation();
        const before = current;
        const chest = new MainChapterIdleChest(() => current);
        chest.render(60, 1000);
        current = new Animation();
        chest.render(60, 1000);
        chest.render(60, 1000);
        assert.equal(before.calls.length, 1);
        assert.equal(current.calls.length, 1);
    });

    for (const missing of ["collect-3", "normal-0"]) {
        check("缺真实动作不假成功" + missing, () => {
            const animation = new Animation();
            animation.actions.delete(missing);
            const chest = new MainChapterIdleChest(() => animation);
            assert.equal(chest.collect(3), false);
            assert.equal(chest.collect(3), false);
            assert.equal(animation.calls.length, 0);
            const warnings = GameLog.shared.recent();
            assert.equal(warnings.length, 1);
            assert.equal(warnings[0].layer, "MODULE");
            assert.equal(warnings[0].tag, "MainChapterIdleChest");
            assert.equal(warnings[0].level, "warn");
            chest.update(2);
            assert.equal(animation.calls.length, 0);
        });
    }

    check("待机缺失限频并允许资源修正后重渲染", () => {
        const animation = new Animation();
        animation.actions.delete("normal-4");
        const chest = new MainChapterIdleChest(() => animation);
        for (let index = 0; index < 10; index++) {
            chest.render(110, 1000);
        }
        assert.equal(animation.calls.length, 0);
        assert.equal(GameLog.shared.recent().length, 1);
        animation.actions.add("normal-4");
        chest.render(110, 1000);
        assert.equal(animation.calls[0].action, "normal-4");
    });

    check("动作检查异常不污染收取状态", () => {
        const animation = new Animation();
        animation.failFind = true;
        const chest = new MainChapterIdleChest(() => animation);
        assert.equal(chest.collect(1), false);
        assert.equal(animation.calls.length, 0);
        animation.failFind = false;
        assert(chest.collect(1));
    });

    check("排队失败恢复已知待机", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        chest.render(60, 1000);
        animation.failAdd = true;
        assert.equal(chest.collect(3), false);
        assert.deepEqual(animation.calls.map(call => call.action), ["normal-3", "collect-3", "normal-3"]);
        chest.update(2);
        assert.equal(animation.calls.length, 3);
        animation.failAdd = false;
        assert(chest.collect(3));
    });

    check("设置轨道失败不假成功", () => {
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => animation);
        animation.failSet = true;
        assert.equal(chest.collect(1), false);
        chest.update(2);
        assert.equal(animation.calls.length, 0);
        animation.failSet = false;
        assert(chest.collect(1));
    });

    check("首次收取排队失败仍恢复传入已知档", () => {
        const animation = new Animation();
        animation.failAdd = true;
        const chest = new MainChapterIdleChest(() => animation);
        assert.equal(chest.collect(4), false);
        assert.equal(chest.collecting, false);
        assert.deepEqual(animation.calls.map(call => call.action), ["collect-4", "normal-4"]);
        chest.update(2);
        assert.equal(animation.calls.length, 2);
    });

    check("读取入口异常只记录一次", () => {
        const chest = new MainChapterIdleChest(() => { throw new Error("destroyed host"); });
        chest.render(0, 1000);
        chest.render(0, 1000);
        assert.equal(chest.collect(1), false);
        assert.equal(GameLog.shared.recent().filter(line => line.message.includes("读取失败")).length, 1);
        chest.dispose();
    });

    check("关闭清理且迟到更新不再读页面", () => {
        const animation = new Animation();
        let reads = 0;
        const chest = new MainChapterIdleChest(() => { reads++; return animation; });
        chest.render(0, 1000);
        assert(chest.collect(1));
        chest.dispose();
        const before = reads;
        chest.update(2);
        chest.render(Number.NaN, 0);
        assert.equal(chest.collect(4), false);
        chest.dispose();
        assert.equal(reads, before);
        assert.equal(animation.calls.filter(call => call.kind === "clear").length, 1);
    });

    check("关闭不碰已替换的旧骨骼或未使用的新骨骼", () => {
        let current: Animation | null = new Animation();
        const before = current;
        const chest = new MainChapterIdleChest(() => current);
        chest.render(0, 1000);
        current = new Animation();
        const after = current;
        chest.dispose();
        assert.equal(before.calls.filter(call => call.kind === "clear").length, 0);
        assert.equal(after.calls.length, 0);
    });

    check("清轨道异常不阻止重复关闭", () => {
        const animation = new Animation();
        animation.failClear = true;
        const chest = new MainChapterIdleChest(() => animation);
        chest.render(0, 1000);
        assert.doesNotThrow(() => chest.dispose());
        assert.doesNotThrow(() => chest.dispose());
        assert.equal(GameLog.shared.recent().filter(line => line.message.includes("清理失败")).length, 1);
        assert.equal(chest.collect(1), false);
    });

    check("无clear能力也可释放状态", () => {
        const animation = new Animation();
        const port: IdleChestAnimation = {
            findAnimation: name => animation.findAnimation(name),
            setAnimation: (track, action, loop) => animation.setAnimation(track, action, loop),
            addAnimation: (track, action, loop, delay) => animation.addAnimation(track, action, loop, delay),
        };
        const chest = new MainChapterIdleChest(() => port);
        assert(chest.collect(2));
        assert.doesNotThrow(() => chest.dispose());
        assert.equal(chest.collect(2), false);
    });

    check("非法收取档位拒绝且不读骨骼", () => {
        let reads = 0;
        const animation = new Animation();
        const chest = new MainChapterIdleChest(() => { reads++; return animation; });
        for (const stage of [0, 5, -1, Number.NaN, 1.5]) {
            assert.throws(() => chest.collect(stage), /收取档位无效/);
        }
        assert.equal(reads, 0);
        assert.equal(animation.calls.length, 0);
    });
} finally {
    GameLog.shared.mirrorConsole = mirrorBefore;
}
console.log("PASS " + checks + " idle chest presentation cases: legacy queue, protected collection, latest idle and disposal");
