/**
 * 配置包唯一仓库专项：独立验证整包原子提交、只读引用、启动复用和异步取消/版本隔离。
 * 先用最小规范夹具覆盖失败边界，再安装当前全部源 JSON，检查类型与无类型文件共用存储。
 * 本工具只读取本地配置，不启动 Creator、不联网、不修改源 JSON。
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { CONFIG_SCHEMA, ConfigName, GConfig } from "../assets/scripts/config/GConfig";
import { ConfigPackageCancelled, ConfigPackageUtils } from "../assets/scripts/config/ConfigPackageUtils";
import { ConfigUnavailable, ConfigVersionSuperseded, GameConfig } from "../assets/scripts/config/GameConfig";
import { LOADING_PLAN } from "../assets/scripts/app/remake/LoadingPlan";

/** 逻辑包名定位唯一源目录，避免工具维护第二份物理路径清单。 */
const { bundleRoot } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 启动表只从唯一阶段计划派生，夹具不再维护独立表名清单。 */
const startupNames = LOADING_PLAN.login.flatMap(target => "config" in target ? [target.config] : []);

/** 模拟已校验 manifest 交付的启动路径，由同一启动计划生成。 */
const startupPaths = startupNames.map(name => CONFIG_SCHEMA[name].path);

/** 创建全部类型化空表与一张嵌套无类型表；启动表由 prepare 独立准备。 */
function createFiles(marker = "first"): Record<string, unknown> {
    const files: Record<string, unknown> = Object.create(null);
    for (const name of Object.keys(CONFIG_SCHEMA) as ConfigName[]) {
        if (startupNames.includes(name)) {
            continue;
        }
        const rule = CONFIG_SCHEMA[name];
        files[rule.path] = { [rule.container]: rule.container === "act" ? {} : [] };
    }
    files["config/untyped-check"] = { rows: [{ marker, nested: { values: [1, 2] } }] };
    return files;
}

/** 创建有可核对说明行的启动源；它应被复制且源校验和必须包含说明行。 */
async function createStore(): Promise<{ store: GameConfig; calls: string[]; language: unknown }> {
    const calls: string[] = [];
    const language = { rows: [{ key: "#", value: "源说明" }, { key: 11, value: "确定" }] };
    const store = new GameConfig(async path => {
        calls.push(path);
        return path === "config/language" ? language : { rows: [{ idx: 1, tips: 11 }] };
    });
    await store.prepare(startupNames);
    return { store, calls, language };
}

/** 成功快照应持续持有原启动表，失败或取消都不能改变任何旧查询引用与版本。 */
function assertSnapshot(store: GameConfig, marker: string, version: string, language: unknown, raw: unknown): void {
    assert.equal(store.getPackageVersion(), version);
    assert.equal(store.status(GConfig.HeroType).version, version);
    assert.equal(store.getFile(GConfig.Language), language);
    assert.equal(store.getFileByPath("config/untyped-check"), raw);
    assert.equal((raw as { rows: { marker: string }[] }).rows[0].marker, marker);
}

/** 验证一次成功安装、同版复用、启动隔离，以及坏表/缺表失败后的完整重试。 */
async function checkAtomicAndReferences(): Promise<void> {
    const { store, calls, language: source } = await createStore();
    const language = store.getFile(GConfig.Language);
    assert.notEqual(language, source, "启动表继续复制隔离读取器对象");
    assert.equal((source as { rows: unknown[] }).rows.length, 2, "过滤说明行不修改资源原对象");
    assert.equal(store.getConfig(GConfig.Language).length, 1);
    assert.equal(store.getSourceChecksum("config/language"), ConfigPackageUtils.sourceChecksum(source));
    assert.notEqual(store.getSourceChecksum("config/language"), ConfigPackageUtils.sourceChecksum(language));
    assert.equal(store.getSourceChecksum("config/missing"), undefined);
    assert.equal(store.getPackageVersion(), null);

    const files = createFiles();
    const heroFile = { rows: [] };
    files["config/herotype"] = heroFile;
    const progress: number[] = [];
    await store.installPackage("v1", files, startupPaths, (done, total) => {
        assert.equal(total, Object.keys(files).length);
        progress.push(done);
        assert.equal(store.getPackageVersion(), null, "进度回调时尚未部分提交");
        assert.throws(() => store.getFileByPath("config/untyped-check"), ConfigUnavailable);
    });
    assert.deepEqual(progress, Array.from({ length: Object.keys(files).length + 1 }, (_, i) => i));
    assert.equal(store.getFile(GConfig.HeroType), heroFile, "包对象直接移交，不深复制大表");
    assert.equal(store.getFileByPath("config/herotype"), heroFile, "typed/raw 共用唯一源文件");
    assert.equal(store.getConfig(GConfig.HeroType), heroFile.rows, "无说明行时索引共用原行数组");
    const raw = store.getFileByPath("config/untyped-check");
    assert.equal(raw, files["config/untyped-check"]);
    const nested = raw as { rows: { nested: { values: number[] } }[] };
    assert(Object.isFrozen(raw) && Object.isFrozen(nested.rows[0].nested.values));
    assert.throws(() => nested.rows[0].nested.values.push(3), TypeError);
    assertSnapshot(store, "first", "v1", language, raw);

    await store.prepare([...startupNames, GConfig.HeroType]);
    assert.equal(calls.length, 2, "成功清除请求 Promise 后通过 ready 复用，不再次 fetch");
    await store.installPackage("v1", createFiles("same-version"), startupPaths);
    assertSnapshot(store, "first", "v1", language, raw);
    const invalidSameVersion = createFiles();
    invalidSameVersion["config/language"] = source;
    await assert.rejects(store.installPackage("v1", invalidSameVersion, startupPaths), /启动表不得重复/);
    assertSnapshot(store, "first", "v1", language, raw);

    const missing = createFiles("missing");
    delete missing["config/herotype"];
    await assert.rejects(store.installPackage("v2", missing, startupPaths), /配置包缺少/);
    assertSnapshot(store, "first", "v1", language, raw);

    const duplicate = createFiles("duplicate");
    duplicate["config/herolevel"] = { rows: [
        { level: 1, exp_need: 1, gold_need: 1 },
        { level: 1, exp_need: 2, gold_need: 2 },
    ] };
    await assert.rejects(store.installPackage("v2", duplicate, startupPaths), /重复主键/);
    assertSnapshot(store, "first", "v1", language, raw);

    const invalid = createFiles("invalid");
    invalid["config/herolevel"] = { rows: [{ level: "bad", exp_need: 1, gold_need: 1 }] };
    await assert.rejects(store.installPackage("v2", invalid, startupPaths), /HeroLevel.rows\[0\].level/);
    assertSnapshot(store, "first", "v1", language, raw);

    const repeatedStartup = createFiles();
    repeatedStartup["config/language"] = source;
    await assert.rejects(store.installPackage("v2", repeatedStartup, startupPaths), /启动表不得重复/);
    const invalidPath = createFiles();
    invalidPath["config/../escape"] = {};
    await assert.rejects(store.installPackage("v2", invalidPath, startupPaths), /路径非法/);
    assertSnapshot(store, "first", "v1", language, raw);

    const next = createFiles("second");
    next["config/herolevel"] = { rows: [{ level: 1, exp_need: 2, gold_need: 3 }] };
    await store.installPackage("v2", next, startupPaths);
    assert.equal(store.getPackageVersion(), "v2");
    assert.equal(store.getFile(GConfig.Language), language, "整包换版不清启动表");
    assert.equal(store.getFileByPath("config/herolevel"), store.getFile(GConfig.HeroLevel));
    assert.equal(store.requireConfig(GConfig.HeroLevel, 1).gold_need, 3);
    assert.notEqual(store.getFileByPath("config/untyped-check"), raw);

    await store.prepare([GConfig.LoadingTips], undefined, "framework-next");
    assert.equal(store.getPackageVersion(), null, "独立 prepare 成功切换版本后不能冒充整包就绪");
    assert.throws(() => store.getFileByPath("config/untyped-check"), ConfigUnavailable);
    const empty = new GameConfig();
    await assert.rejects(empty.installPackage("v1", createFiles(), startupPaths), /安装配置包前必须完成启动表加载/);
    assert.equal(empty.getPackageVersion(), null);
}

/** 启动路径完全由安装参数决定，新增启动表无需修改仓库且异常路径拒绝整包。 */
async function checkManifestStartupPaths(): Promise<void> {
    const store = new GameConfig(async () => ({ rows: [] }));
    await store.prepare([...startupNames, GConfig.HeroType]);
    const hero = store.getFile(GConfig.HeroType);
    const files = createFiles();
    const heroPath = CONFIG_SCHEMA.HeroType.path;
    delete files[heroPath];
    const expandedStartup = [...startupPaths, heroPath];
    await store.installPackage("expanded-startup", files, expandedStartup);
    assert.equal(store.getFile(GConfig.HeroType), hero, "调用方声明的额外启动表必须复用原引用");
    await assert.rejects(
        store.installPackage("duplicate-startup", createFiles(), [...startupPaths, startupPaths[0]]),
        /启动表路径重复/,
    );
    await assert.rejects(
        store.installPackage("unknown-startup", createFiles(), [...startupPaths, "config/untyped-startup"]),
        /启动表缺少类型规范/,
    );
    assert.equal(store.getPackageVersion(), "expanded-startup");
    assert.equal(store.getFile(GConfig.HeroType), hero);
}

/** 验证取消、最后一表回调取消、旧版本迟到，以及同版本并发的取消互不传播。 */
async function checkCancellationAndRaces(): Promise<void> {
    const { store } = await createStore();
    await store.installPackage("v1", createFiles(), startupPaths);
    const language = store.getFile(GConfig.Language);
    const raw = store.getFileByPath("config/untyped-check");
    let active = true;
    let reports = 0;
    await assert.rejects(store.installPackage("v2", createFiles("cancelled"), startupPaths, done => {
        reports++;
        if (done === 2) {
            active = false;
        }
    }, () => active), ConfigPackageCancelled);
    assert.equal(reports, 3, "取消后不再报告后续表进度");
    assertSnapshot(store, "first", "v1", language, raw);

    active = true;
    await assert.rejects(store.installPackage("v2", createFiles("last-cancelled"), startupPaths, (done, total) => {
        if (done === total) {
            active = false;
        }
    }, () => active), ConfigPackageCancelled);
    assertSnapshot(store, "first", "v1", language, raw);

    let releaseFirst!: () => void;
    const firstTable = new Promise<void>(resolve => { releaseFirst = resolve; });
    const older = store.installPackage("v2", createFiles("late"), startupPaths, done => {
        if (done === 1) {
            releaseFirst();
        }
    });
    const rejected = assert.rejects(older, ConfigVersionSuperseded);
    await firstTable;
    await store.installPackage("v3", createFiles("latest"), startupPaths);
    await rejected;
    assert.equal(store.getPackageVersion(), "v3");
    assert.equal((store.getFileByPath("config/untyped-check") as { rows: { marker: string }[] }).rows[0].marker, "latest");

    let cancelOne = false;
    const cancelled = store.installPackage("v4", createFiles("one"), startupPaths, done => {
        if (done === 2) {
            cancelOne = true;
        }
    }, () => !cancelOne);
    const cancelledResult = assert.rejects(cancelled, ConfigPackageCancelled);
    await store.installPackage("v4", createFiles("survivor"), startupPaths);
    await cancelledResult;
    assert.equal(store.getPackageVersion(), "v4");
    assert.equal((store.getFileByPath("config/untyped-check") as { rows: { marker: string }[] }).rows[0].marker, "survivor");

    const concurrentFirst = createFiles("winner");
    const concurrentSecond = createFiles("same-version-late");
    await Promise.all([
        store.installPackage("v5", concurrentFirst, startupPaths),
        store.installPackage("v5", concurrentSecond, startupPaths),
    ]);
    assert.equal(store.getFileByPath("config/untyped-check"), concurrentFirst["config/untyped-check"], "后完成的同版安装不替换先提交引用");
}

/** 递归读取实际配置目录，只枚举 JSON；包布局无需在工具中人工复制。 */
function readSourceFiles(): Record<string, unknown> {
    const directory = bundleRoot("config");
    const files: Record<string, unknown> = Object.create(null);
    const pending = [directory];
    while (pending.length) {
        const current = pending.pop()!;
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const absolute = join(current, entry.name);
            if (entry.isDirectory()) {
                pending.push(absolute);
            } else if (entry.name.endsWith(".json")) {
                const path = "config/" + relative(directory, absolute).replace(/\\/g, "/").slice(0, -5);
                files[path] = JSON.parse(readFileSync(absolute, "utf8"));
            }
        }
    }
    return files;
}

/** 安装当前真实配置闭包并核对全部类型表、原始文件引用与深冻结。 */
async function checkCurrentSourcePackage(): Promise<void> {
    const source = readSourceFiles();
    const store = new GameConfig(async path => source[path]);
    await store.prepare(startupNames);
    const packageFiles = { ...source };
    for (const path of startupPaths) {
        delete packageFiles[path];
    }
    const count = Object.keys(packageFiles).length;
    assert.equal(count, 47, "当前49张源表中只有启动两表独立读取");
    await store.installPackage("actual-source", packageFiles, startupPaths);
    for (const name of Object.keys(CONFIG_SCHEMA) as ConfigName[]) {
        assert.equal(store.getFileByPath(CONFIG_SCHEMA[name].path), store.getFile(name));
        assert.equal(store.status(name).state, "ready");
    }
    for (const path of Object.keys(packageFiles)) {
        assert.equal(store.getFileByPath(path), packageFiles[path], path + " 不复制第二份原表");
        assert(Object.isFrozen(store.getFileByPath(path)), path + " 必须冻结");
    }
    assert(store.getConfig(GConfig.HeroType).length > 0);
    assert.equal(store.requireConfig(GConfig.Language, 11).value, "确 定");
    assert(Object.isFrozen(store.requireConfig(GConfig.SpiritDisplay, 2000002).skills[0]));
}

/** 顺序运行纯仓库专项，任一边界失败时以非零退出码报告。 */
async function main(): Promise<void> {
    await checkAtomicAndReferences();
    await checkManifestStartupPaths();
    await checkCancellationAndRaces();
    await checkCurrentSourcePackage();
    console.log("config-package-store-check passed (47 package files + 2 startup files)");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
