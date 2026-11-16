/**
 * 挂机持久日志原生浏览器专项：使用随机独立namespace，验证真实IndexedDB事务和多连接竞争。
 * 编译为浏览器脚本后由含RunButton/Output的本机测试页运行；不登录、不连WS、不读取日常空间。
 */
import { IdleClaimJournal } from "../assets/scripts/app/remake/IdleClaimJournal";
import type { IdleClaimPending } from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";

/** 只用于原生浏览器检查的静态入口；测试结束释放连接并删除本次随机数据库。 */
export class IdleClaimJournalBrowserCheck {
    /** 跨页面重载检查的固定请求；仅写URL中明确指定的随机测试run。 */
    private static readonly persistedRequest: IdleClaimPending = Object.freeze({
        schemaVersion: 1,
        requestId: "f9ab0000-0000-4000-8000-000000000007",
        expectedOperationVersion: 7,
    });

    /** 纯工具入口，无需创建实例。 */
    private constructor() {
    }

    /** 保存一次真正跨页面刷新验证用的原请求；事务完成后关闭连接，保留记录等待手动刷新。 */
    public static async persist(): Promise<string> {
        const journal = new IdleClaimJournal(this.pageNamespace());
        try {
            const port = await journal.forRole("journal-browser", "persistent-refresh");
            const actual = await port.create(this.persistedRequest);
            if (JSON.stringify(actual) !== JSON.stringify(this.persistedRequest)) {
                throw new Error("跨刷新测试已存在其他待确认请求，未覆盖");
            }
            return "SAVED requestId=" + actual.requestId + " expectedOperationVersion=" + actual.expectedOperationVersion;
        } finally {
            journal.dispose();
        }
    }

    /** 刷新后从新连接读取原请求，核对全部内容后条件清理并删除仅本次URL随机测试库。 */
    public static async restore(): Promise<string> {
        const namespace = this.pageNamespace();
        const journal = new IdleClaimJournal(namespace);
        let text: string;
        try {
            const port = await journal.forRole("journal-browser", "persistent-refresh");
            const actual = await port.read();
            if (JSON.stringify(actual) !== JSON.stringify(this.persistedRequest)) {
                throw new Error("刷新后原请求缺失或内容变化: " + JSON.stringify(actual));
            }
            if (!await port.clear(this.persistedRequest)) {
                throw new Error("跨刷新原请求条件清理失败");
            }
            text = "RESTORED requestId=" + actual!.requestId + " expectedOperationVersion=" + actual!.expectedOperationVersion;
        } finally {
            journal.dispose();
        }
        await this.remove(namespace);
        return text + "\nCLEARED 本次随机测试库已删除";
    }

    /** 安装测试页按钮；不存在的可选按钮不影响原有专项，所有错误均显示而不抛到全局。 */
    public static bindButtons(): void {
        const output = document.getElementById("Output");
        if (!output) {
            return;
        }
        const actions: Array<[string, () => Promise<string>]> = [
            ["RunButton", async () => {
                const results = await this.run();
                return "PASS " + results.length + "\n" + results.join("\n");
            }],
            ["PersistButton", () => this.persist()],
            ["RestoreButton", () => this.restore()],
        ];
        for (const [id, action] of actions) {
            const button = document.getElementById(id) as HTMLButtonElement | null;
            button?.addEventListener("click", async () => {
                button.disabled = true;
                output.textContent = "运行中";
                try {
                    output.textContent = await action();
                    document.body.dataset.result = id === "PersistButton" ? "saved" : "passed";
                } catch (error) {
                    output.textContent = "FAIL\n" + String(error instanceof Error ? error.stack : error);
                    document.body.dataset.result = "failed";
                } finally {
                    button.disabled = false;
                }
            });
        }
    }

    /** 运行真实IDB检查，返回逐项证据；失败中止并在finally清理本次独立数据库。 */
    public static async run(): Promise<string[]> {
        const namespaces = ["isolated:" + crypto.randomUUID(), "isolated:" + crypto.randomUUID()];
        const journals: IdleClaimJournal[] = [];
        const results: string[] = [];
        const journal = (namespace = namespaces[0], factory = indexedDB) => {
            const value = new IdleClaimJournal(namespace, factory);
            journals.push(value);
            return value;
        };
        const a: IdleClaimPending = { schemaVersion: 1, requestId: crypto.randomUUID(), expectedOperationVersion: 7 };
        const b: IdleClaimPending = { schemaVersion: 1, requestId: crypto.randomUUID(), expectedOperationVersion: 8 };
        const assert = (condition: unknown, message: string) => {
            if (!condition) {
                throw new Error(message);
            }
        };
        const equal = (actual: unknown, expected: unknown) => {
            assert(JSON.stringify(actual) === JSON.stringify(expected), "不一致: " + JSON.stringify({ actual, expected }));
        };
        const rejects = async (operation: () => unknown, expected: string) => {
            try {
                await operation();
            } catch (error) {
                assert(String(error).includes(expected), "失败原因应包含 " + expected + "，实际" + String(error));
                return;
            }
            throw new Error("预期拒绝但通过: " + expected);
        };
        try {
            const one = journal();
            const two = journal();
            const [first, second] = await Promise.all([one.forRole("1", "role-a"), two.forRole("1", "role-a")]);
            equal(await first.read(), null);
            equal(await first.create(a), a);
            equal(await second.read(), a);
            results.push("新建日志、持久后读取、独立连接共享稳定实例通过");

            const [left, right] = await Promise.all([one.forRole("1", "race"), two.forRole("1", "race")]);
            const race = await Promise.all([left.create(a), right.create(b)]);
            equal(race[0], race[1]);
            equal(await left.read(), race[0]);
            results.push("两个连接并发create只保留同一原请求通过");

            assert(!await first.clear({ ...a, expectedOperationVersion: 9 }), "不同指纹不能清理");
            equal(await second.read(), a);
            assert(await first.clear(a), "当前原请求应清理");
            equal(await second.create(b), b);
            assert(!await first.clear(a), "旧A不能清理后来B");
            equal(await first.read(), b);
            results.push("完整原请求指纹与A/B交错条件清理通过");

            equal(await (await one.forRole("2", "role-a")).read(), null);
            equal(await (await one.forRole("1", "role-b")).read(), null);
            equal(await (await journal(namespaces[1]).forRole("1", "role-a")).read(), null);
            results.push("区服、角色及测试namespace隔离通过");

            one.dispose();
            two.dispose();
            const reopened = await journal().forRole("1", "role-a");
            equal(await reopened.read(), b);
            results.push("全部原连接关闭后重新打开保留原请求通过");

            const meta = await this.rawValue(namespaces[0], "meta", "client") as { clientId: string };
            const key = ["1", "role-a", meta.clientId];
            const corrupt = { schemaVersion: 2, requestId: a.requestId, expectedOperationVersion: 7 };
            await this.rawValue(namespaces[0], "pending", key, corrupt, true);
            await rejects(() => reopened.read(), "格式未支持");
            await rejects(() => reopened.create(a), "格式未支持");
            await rejects(() => reopened.clear(a), "格式未支持");
            equal(await this.rawValue(namespaces[0], "pending", key), corrupt);
            results.push("坏记录read/create/clear均拒绝且保留原文通过");

            await rejects(() => reopened.create({ ...a, expectedOperationVersion: 0 }), "记录损坏");
            await rejects(() => reopened.create({ ...a, token: "must-not-store" } as IdleClaimPending), "记录损坏");
            results.push("无效消费版本和额外敏感字段拒绝通过");

            await this.rawValue(namespaces[0], "meta", "client", { schemaVersion: 2, clientId: meta.clientId }, true);
            await rejects(() => journal().forRole("1", "role-a"), "稳定实例记录损坏");
            equal(await this.rawValue(namespaces[0], "meta", "client"), { schemaVersion: 2, clientId: meta.clientId });
            results.push("稳定实例未知格式拒绝且不重置通过");

            let attempts = 0;
            const unreliable = {
                open: (name: string, version: number) => {
                    if (++attempts === 1) {
                        throw new Error("injected-open-failure");
                    }
                    return indexedDB.open(name, version);
                },
            } as IDBFactory;
            const retry = journal(namespaces[1], unreliable);
            await rejects(() => retry.forRole("1", "retry"), "injected-open-failure");
            equal(await (await retry.forRole("1", "retry")).read(), null);
            results.push("同步打开故障后显式再次恢复通过");

            const closing = journal(namespaces[1]);
            const pendingOpen = closing.forRole("1", "dispose");
            closing.dispose();
            await rejects(() => pendingOpen, "已关闭");
            await rejects(() => closing.forRole("1", "dispose"), "已关闭");
            results.push("打开期间销毁及销毁后旧口拒绝通过");

            const emptyFactory = { open: () => { throw new Error("storage-unavailable"); } } as unknown as IDBFactory;
            await rejects(() => journal(namespaces[1], emptyFactory).forRole("1", "failed"), "storage-unavailable");
            results.push("存储不可用明确失败、不降级到内存通过");

            for (const value of journals) {
                value.dispose();
            }
            const upgradeJournal = journal(namespaces[1]);
            const oldPort = await upgradeJournal.forRole("1", "upgrade");
            equal(await oldPort.create(a), a);
            await this.upgrade(namespaces[1]);
            await rejects(() => oldPort.read(), "version");
            results.push("数据库升级关闭原连接，旧版本不悄悄改写通过");
            return results;
        } finally {
            for (const value of journals) {
                value.dispose();
            }
            for (const namespace of namespaces) {
                await this.remove(namespace);
            }
        }
    }

    /** 测试直接访问随机独立数据库，以制造未知格式并核对故障后原记录未被删除。 */
    private static rawValue(namespace: string, storeName: string, key: IDBValidKey, value?: unknown, write = false): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const open = indexedDB.open("mxzg.remake.idle-claims.v1." + namespace, 1);
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
                const database = open.result;
                const transaction = database.transaction(storeName, write ? "readwrite" : "readonly");
                const store = transaction.objectStore(storeName);
                const request = write ? store.put(value, key) : store.get(key);
                transaction.oncomplete = () => {
                    database.close();
                    resolve(request.result);
                };
                transaction.onabort = () => {
                    database.close();
                    reject(transaction.error);
                };
            };
        });
    }

    /** 升级本次随机数据库，核验原Journal的versionchange生命周期。 */
    private static upgrade(namespace: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("mxzg.remake.idle-claims.v1." + namespace, 2);
            request.onsuccess = () => {
                request.result.close();
                resolve();
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("测试连接未及时响应versionchange"));
        });
    }

    /** 删除本次唯一随机数据库，不触及日常或其他测试run；阻塞亦视为检查失败。 */
    private static remove(namespace: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase("mxzg.remake.idle-claims.v1." + namespace);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("独立测试日志连接未释放"));
        });
    }

    /** URL必须显式带本次随机32位run；不允许省略后退到日常空间。 */
    private static pageNamespace(): string {
        const run = new URL(location.href).searchParams.get("run") || "";
        if (!/^[a-f0-9]{32}$/.test(run)) {
            throw new Error("跨刷新测试需要URL显式提供随机32位run");
        }
        return "isolated:" + run;
    }
}

IdleClaimJournalBrowserCheck.bindButtons();
