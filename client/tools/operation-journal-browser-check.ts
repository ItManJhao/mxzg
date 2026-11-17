/**
 * 原生浏览器持久日志回归：复用原挂机完整事务专项，并验证里程碑稳定键竞争、条件删除和跨连接恢复。
 * 只创建随机isolated数据库，结束后关闭并删除本次测试库，不登录、不读日常空间或存储资产。
 */
import { MilestoneClaimJournal } from "../assets/scripts/app/remake/MilestoneClaimJournal";
import { IdleClaimJournalBrowserCheck } from "./idle-claim-journal-browser-check";

/** 运行原生IndexedDB；只在被测试页按钮显式调用后执行。 */
async function run(): Promise<readonly string[]> {
    const results = await IdleClaimJournalBrowserCheck.run();
    const namespace = "isolated:" + crypto.randomUUID();
    const journals: MilestoneClaimJournal[] = [];
    /** 每次创建独立连接，真实并发由同一浏览器IDB事务协调。 */
    const create = () => {
        const journal = new MilestoneClaimJournal(namespace);
        journals.push(journal);
        return journal;
    };
    /** 明确失败，不将控制台观察当事务结果。 */
    const check = (condition: boolean, message: string) => { if (!condition) { throw new Error(message); } };
    try {
        const [left, right] = await Promise.all([create().forRole("local-1", "milestone-a"),
            create().forRole("local-1", "milestone-a")]);
        const a = { schemaVersion: 1 as const, rewardId: 100 };
        const b = { schemaVersion: 1 as const, rewardId: 150 };
        const values = await Promise.all([left.create(a), right.create(b)]);
        check(values[0].rewardId === values[1].rewardId, "跨连接并发不能覆盖原稳定键");
        const stored = values[0];
        const other = stored.rewardId === a.rewardId ? b : a;
        check(!await right.clear(other), "旧回执不能清另一原意图");
        check((await left.read())?.rewardId === stored.rewardId, "条件删除必须保留原文");
        results.push("里程碑原生跨连接竞争及完整稳定键条件清理通过");
        check(await left.clear(stored), "原稳定键应成功清理");
        await right.create(other);
        check(!await left.clear(stored), "旧A不能清后来B");
        for (const journal of journals) {
            journal.dispose();
        }
        const reopened = await create().forRole("local-1", "milestone-a");
        check((await reopened.read())?.rewardId === other.rewardId, "关闭全部连接后原意图应保留");
        check(await reopened.clear(other), "恢复原键后应能条件清理");
        check(await reopened.read() === null, "清理完成应读空");
        check(await (await create().forRole("local-2", "milestone-a")).read() === null, "区服必须隔离");
        check(await (await create().forRole("local-1", "milestone-b")).read() === null, "角色必须隔离");
        results.push("里程碑跨连接重开、原意图保存和区服角色隔离通过");
        let rejected = false;
        try {
            await reopened.create({ ...a, token: "must-not-store" } as typeof a);
        } catch {
            rejected = true;
        }
        check(rejected && await reopened.read() === null, "额外敏感字段必须拒绝且不落库");
        results.push("里程碑未知字段拒绝且事务未存储通过");
        return results;
    } finally {
        for (const journal of journals) {
            journal.dispose();
        }
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase("mxzg.remake.milestone-claims.v1." + namespace);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("独立里程碑连接未释放"));
        });
    }
}

/** 测试页只显示本次结果，失败不写游戏日志或启动任何业务。 */
document.getElementById("RunJournalChecks")?.addEventListener("click", () => {
    const output = document.getElementById("Output")!;
    output.textContent = "运行中";
    void run().then(results => {
        output.textContent = "PASS " + results.length + "\n" + results.join("\n");
        document.body.dataset.result = "passed";
    }, error => {
        output.textContent = "FAIL\n" + String(error instanceof Error ? error.stack || error.message : error);
        document.body.dataset.result = "failed";
    });
});
