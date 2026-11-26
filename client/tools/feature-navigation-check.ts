/**
 * 主城导航专项：直接调用生产导航，以可控时钟验证350毫秒真实等待和缓存瞬开不提示。
 * 同时检查切页、返回、身份重置、失败去重及黑市任务跳转，不加载资源或连接服务。
 */
import { strict as assert } from "node:assert";
import { HomeFeatureNavigation } from "../assets/scripts/app/remake/HomeFeatureNavigation";
import { CityNavigationUtils } from "../assets/scripts/config/CityNavigationUtils";
import type { OpenConditionRow } from "../assets/scripts/config/GConfig";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { CityMapLayoutUtils } from "../assets/scripts/features/city/ui/CityMapLayoutUtils";
import type { QuestViewArgs } from "../assets/scripts/features/quest/ui/QuestView";
import { OpenCancelled, UIManager } from "../assets/scripts/framework/ui/UIManager";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 创建可控Promise，测试只决定真实then/catch何时运行，不伪造导航结果。 */
function deferred() {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

/** 等原Promise续段及取消重试完成，不通过实际睡眠掩盖计时边界。 */
async function settle(): Promise<void> {
    for (let index = 0; index < 6; index++) {
        await Promise.resolve();
    }
}

/** 临时接管本进程计时器，观察真实clearTimeout清理；返回恢复口，退出时必须调用。 */
function controlledClock() {
    let now = 0;
    let nextId = 1;
    const jobs = new Map<number, { at: number; run: () => void }>();
    const originalSet = globalThis.setTimeout;
    const originalClear = globalThis.clearTimeout;
    globalThis.setTimeout = ((run: () => void, milliseconds = 0) => {
        const id = nextId++;
        jobs.set(id, { at: now + milliseconds, run });
        return id;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = ((id: number) => {
        jobs.delete(id);
    }) as unknown as typeof clearTimeout;
    return {
        /** 推进毫秒并运行到期任务，同一回调不能执行两次。 */
        advance(milliseconds: number): void {
            now += milliseconds;
            for (;;) {
                const next = Array.from(jobs).filter(([, job]) => job.at <= now)
                    .sort((left, right) => left[1].at - right[1].at)[0];
                if (!next) {
                    return;
                }
                jobs.delete(next[0]);
                next[1].run();
            }
        },
        /** 返回未清理任务数，不能仅靠代次判断来掩盖悬挂计时器。 */
        pending: () => jobs.size,
        /** 恢复Node原计时器，不影响后续专项或错误退出。 */
        restore(): void {
            globalThis.setTimeout = originalSet;
            globalThis.clearTimeout = originalClear;
        },
    };
}

/** 页面宿主只提供当前页面和原Promise，不复制UIManager或资源缓存实现。 */
function fixture(account?: AccountModel) {
    const state = {
        current: "remake-home", authorized: true, instant: false, backs: 0,
        shared: null as ReturnType<typeof deferred> | null,
        opens: [] as { id: string; args?: unknown; job: ReturnType<typeof deferred> }[],
        notices: [] as string[], intents: [] as string[],
    };
    const flow = new HomeFeatureNavigation({
        keepOnly: id => {
            state.intents.push(id);
        },
        back: () => {
            state.backs++;
            state.current = "remake-home";
            return true;
        },
        openById: (id, args) => {
            const job = state.shared || deferred();
            state.opens.push({ id, args, job });
            if (state.instant) {
                state.current = id;
                job.resolve();
            }
            return job.promise;
        },
    }, {
        account,
        current: () => state.current,
        authorized: () => state.authorized,
        notice: text => {
            state.notices.push(text);
        },
    });
    return {
        flow, state,
        /** 模拟框架已挂载请求页面，再兑现等待。 */
        complete(index = state.opens.length - 1): void {
            state.current = state.opens[index].id;
            state.opens[index].job.resolve();
        },
        /** 空串是原接口清理调用，不算玩家可见消息。 */
        messages: () => state.notices.filter(text => text.trim()),
    };
}

/** 检查底栏门槛、VIP 正常进入、缓存瞬开和当前页去重，打开完成须撤销提示计时器。 */
async function timing(clock: ReturnType<typeof controlledClock>): Promise<void> {
    const gate = fixture();
    gate.state.authorized = false;
    assert.equal(gate.flow.open("clan"), true);
    assert.equal(gate.flow.open("hero"), true);
    assert.equal(gate.state.opens.length, 0);
    assert.equal(clock.pending(), 0);
    gate.flow.dispose();

    const account = new AccountModel();
    const role = { id: "player", nickname: "公会测试", gold: 0, diamonds: 0, level: 17 };
    account.replace({ busy: false, error: "", role });
    const guild = fixture(account);
    const originalGate = CityNavigationUtils.bottomGate;
    CityNavigationUtils.bottomGate = id => {
        assert.equal(id, "clan");
        return { condition_type: 1, level: 18, open_server_day: 0 } as OpenConditionRow;
    };
    try {
        guild.flow.open("clan");
        assert.deepEqual(guild.messages(), ["角色达到 18 级开启公会"]);
        assert.equal(guild.state.opens.length, 0);
        account.replace({ busy: false, error: "", role: { ...role, level: 18 } });
        guild.state.instant = true;
        guild.flow.open("clan");
        await settle();
        assert.equal(guild.state.opens[0].id, "guild");
        assert.equal(HomeFeatureNavigation.tabForPage("guild"), "clan");
    } finally {
        guild.flow.dispose();
        CityNavigationUtils.bottomGate = originalGate;
    }

    account.replace({ busy: false, error: "", role: { ...role, level: 1 } });
    const vip = fixture(account);
    vip.state.instant = true;
    assert.equal(vip.flow.open("fetter"), true);
    await settle();
    assert.equal(vip.state.opens[0].id, "vip");
    assert.equal(HomeFeatureNavigation.tabForPage("vip"), "fetter");
    assert.deepEqual(vip.messages(), [], "角色一级即可进入 VIP 契约任务");
    vip.flow.dispose();

    const cached = fixture();
    cached.state.instant = true;
    cached.flow.open("bag");
    await settle();
    clock.advance(1000);
    assert.deepEqual(cached.messages(), [], "缓存瞬开不应先排队准备提示");
    cached.flow.open("bag");
    assert.equal(cached.state.opens.length, 1, "当前页不重复打开");
    assert.equal(clock.pending(), 0);
    cached.flow.dispose();

    const quick = fixture();
    quick.flow.open("hero");
    clock.advance(349);
    assert.deepEqual(quick.messages(), []);
    quick.complete();
    await settle();
    clock.advance(1000);
    assert.deepEqual(quick.messages(), [], "门槛前完成不发准备提示");
    assert.equal(clock.pending(), 0);
    quick.flow.dispose();

    const slow = fixture();
    slow.flow.open("hero");
    clock.advance(349);
    assert.deepEqual(slow.messages(), []);
    clock.advance(1);
    assert.deepEqual(slow.messages(), ["正在准备英雄界面…"]);
    clock.advance(2000);
    assert.equal(slow.messages().length, 1, "同次等待只提示一次");
    slow.complete();
    await settle();
    assert.equal(clock.pending(), 0);
    slow.flow.dispose();
}

/** 旧完成不得撤新计时，返回/当前页/换号/销毁必须实质清理并拒绝迟到重开。 */
async function lifecycle(clock: ReturnType<typeof controlledClock>): Promise<void> {
    const changed = fixture();
    changed.flow.open("hero");
    clock.advance(100);
    changed.flow.open("bag");
    changed.state.opens[0].job.reject(new Error("旧请求迟到失败"));
    await settle();
    assert.equal(clock.pending(), 1, "旧请求不得撤掉新页面计时器");
    clock.advance(349);
    assert.deepEqual(changed.messages(), []);
    clock.advance(1);
    assert.deepEqual(changed.messages(), ["正在准备背包界面…"]);
    changed.complete();
    await settle();
    changed.flow.dispose();

    for (const action of ["city", "selected", "reset", "dispose", "unauthorized", "mounted"]) {
        const test = fixture();
        if (action === "selected") {
            test.state.current = "bag";
        }
        test.flow.open("hero");
        clock.advance(100);
        if (action === "city") {
            test.flow.open("city");
            assert.equal(test.state.backs, 1);
            assert.equal(test.state.intents[test.state.intents.length - 1], "remake-home");
        } else if (action === "selected") {
            test.flow.open("bag");
        } else if (action === "reset") {
            test.flow.reset();
        } else if (action === "dispose") {
            test.flow.dispose();
        } else if (action === "unauthorized") {
            test.state.authorized = false;
        } else {
            // 页面已挂载但外层Promise仍等待时，不应误报正在准备。
            test.state.current = "hero";
        }
        if (!["unauthorized", "mounted"].includes(action)) {
            assert.equal(clock.pending(), 0, action + "必须撤销计时器");
        }
        clock.advance(1000);
        test.state.opens[0].job.reject(new OpenCancelled());
        await settle();
        assert.deepEqual(test.messages(), [], action + "不能发迟到提示");
        assert.equal(test.state.opens.length, 1, action + "不能重开旧请求");
        assert.equal(clock.pending(), 0);
        test.flow.dispose();
    }

    const shared = fixture();
    shared.flow.open("hero");
    const first = shared.state.opens[0].job;
    shared.state.shared = first;
    shared.flow.open("city");
    shared.flow.open("hero");
    shared.state.shared = null;
    first.reject(new OpenCancelled());
    await settle();
    assert.equal(shared.state.opens.length, 3, "仅末次有效意图重试共享取消任务");
    assert.equal(clock.pending(), 1);
    shared.complete();
    await settle();
    clock.advance(1000);
    assert.deepEqual(shared.messages(), []);
    shared.flow.dispose();
}

/** 真实失败仍统一提示，框架已报告的同一异常不再额外排队一条导航错误。 */
async function failures(clock: ReturnType<typeof controlledClock>): Promise<void> {
    const failed = fixture();
    failed.flow.open("hero");
    failed.state.opens[0].job.reject(new Error("专项受控加载失败"));
    await settle();
    assert.deepEqual(failed.messages(), ["英雄界面加载失败，请再次点击重试"]);
    clock.advance(1000);
    assert.equal(failed.messages().length, 1);
    assert.equal(clock.pending(), 0);
    failed.flow.dispose();

    const report = new Error("框架已反馈的受控错误");
    const original = UIManager.isFailureReported;
    UIManager.isFailureReported = error => error === report || original(error);
    const reported = fixture();
    try {
        reported.flow.open("bag");
        reported.state.opens[0].job.reject(report);
        await settle();
        clock.advance(1000);
        assert.deepEqual(reported.messages(), [], "原UIManager报告后不再重复提示");
        assert.equal(clock.pending(), 0);
    } finally {
        UIManager.isFailureReported = original;
        reported.flow.dispose();
    }
}

/** 复验地图与副本入口、彩虹圣殿到竞技场、铁匠铺返回及任务直达黑市。 */
async function cityPlays(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    const account = new AccountModel();
    const role = { id: "player", nickname: "主城玩法测试", gold: 0, diamonds: 0, level: 7 };
    const city = fixture(account);
    city.state.instant = true;
    try {
        account.replace({ busy: false, error: "", role });
        assert.equal(city.flow.open("main_pvp"), true);
        assert.equal(city.flow.open("main_fantasy_tower"), true);
        assert.equal(city.flow.open("gold-dungeon"), true);
        assert.deepEqual(city.messages(), [
            "角色达到 8 级开启竞技场",
            "角色达到 16 级开启幻境之塔",
            "角色达到 15 级开启日常副本",
        ]);
        assert.equal(city.state.opens.length, 0);
        account.replace({ busy: false, error: "", role: { ...role, level: 8 } });
        city.flow.open("main_pvp");
        await settle();
        assert.equal(city.state.opens[0].id, "arena");
        account.replace({ busy: false, error: "", role: { ...role, level: 15 } });
        city.flow.open("gold-dungeon");
        await settle();
        assert.equal(city.state.opens[1].id, "gold-dungeon");
        city.flow.open("main_summon");
        await settle();
        assert.equal(city.state.opens[2].id, "first-summon");
        account.replace({ busy: false, error: "", role: { ...role, level: 16 } });
        city.flow.open("main_fantasy_tower");
        await settle();
        assert.equal(city.state.opens[3].id, "tower");
        assert.equal(CityMapLayoutUtils.cityAtomRoute("main_black_market")?.panel, "main_black_market");
        assert.equal(city.flow.open("main_black_market"), true);
        await settle();
        const market = city.state.opens[4];
        assert.equal(market.id, "black-market");
        (market.args as { backToCity: () => void }).backToCity();
        assert.equal(city.state.current, "remake-home");
        assert.equal(city.flow.openQuest("daily"), true);
        const quest = city.state.opens[5].args as QuestViewArgs;
        assert.equal(quest.canNavigate?.("main_black_market"), true);
        assert.equal(quest.canNavigate?.("main_smith_shop"), true);
        assert.equal(quest.navigate?.("main_black_market"), true);
        await settle();
        assert.equal(city.state.opens[6].id, "black-market");
        assert.equal(city.flow.open("main_shop"), true);
        await settle();
        assert.equal(city.state.opens[7].id, "market");

        account.replace({ busy: false, error: "", role: { ...role, level: 4 } });
        assert.equal(CityMapLayoutUtils.cityAtomRoute("main_smith_shop")?.panel, "smith");
        assert.equal(city.flow.open("main_smith_shop"), true);
        await settle();
        assert.equal(city.state.opens.length, 8);
        assert.equal(city.messages().at(-1), "角色达到 5 级开启铁匠铺");
        account.replace({ busy: false, error: "", role: { ...role, level: 5 } });
        assert.equal(city.flow.open("main_smith_shop"), true);
        await settle();
        const smith = city.state.opens[8];
        assert.equal(smith.id, "smith");
        assert.equal(HomeFeatureNavigation.tabForPage("smith"), "market");
        const smithArgs = smith.args as { backToCity: () => void; openFeature: (id: string) => boolean };
        assert.equal(smithArgs.openFeature("main_black_market"), true);
        await settle();
        assert.equal(city.state.opens[9].id, "black-market");
        smithArgs.backToCity();
        assert.equal(city.state.current, "remake-home");

        account.replace({ busy: false, error: "", role: { ...role, level: 34 } });
        assert.equal(city.flow.open("main_chsd"), true);
        await settle();
        assert.equal(city.state.opens.length, 10);
        assert.equal(city.messages().at(-1), "角色达到 35 级开启彩虹圣殿");
        account.replace({ busy: false, error: "", role: { ...role, level: 35 } });
        city.flow.open("dungeon");
        await settle();
        const hall = city.state.opens[10];
        assert.equal(hall.id, "dungeon-hall");
        (hall.args as { openRainbow: () => void }).openRainbow();
        await settle();
        const rainbow = city.state.opens[11];
        assert.equal(rainbow.id, "rainbow");
        assert.equal(HomeFeatureNavigation.tabForPage("rainbow"), "dungeon");
        const rainbowArgs = rainbow.args as { openArena: () => void; backToHall: () => void };
        rainbowArgs.openArena();
        await settle();
        assert.equal(city.state.opens[12].id, "arena");
        rainbowArgs.backToHall();
        await settle();
        assert.equal(city.state.opens[13].id, "dungeon-hall");
    } finally {
        city.flow.dispose();
    }
}

/** 控制计时不改变生产路径，成功和失败退出均恢复全局入口。 */
async function main(): Promise<void> {
    const clock = controlledClock();
    try {
        await timing(clock);
        await lifecycle(clock);
        await failures(clock);
        await cityPlays();
        assert.equal(clock.pending(), 0, "专项结束没有导航计时器残留");
        console.log("feature-navigation-check passed: real wait threshold, instant cache, stale intent, lifecycle cleanup, shared retry and failure deduplication");
    } finally {
        clock.restore();
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
