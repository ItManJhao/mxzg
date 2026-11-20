/**
 * 配置压缩包与应用加载链专项：读取真实生成产物，核对ZIP目录、源CRC、两阶段安装和主城特效。
 * 引擎替身只提供实际源JSON/二进制包与引用计数，不伪造解码或配置安装结果。
 * 不启动服务、Creator或浏览器，不写配置源文件；纯解码反例不会修改应用唯一GameConfig。
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { Asset, BufferAsset, JsonAsset, Node, Sprite, assetManager } from "cc";
import { ApplicationResources } from "../assets/scripts/app/remake/ApplicationResources";
import { LOADING_PLAN } from "../assets/scripts/app/remake/LoadingPlan";
import { ConfigPackageUtils } from "../assets/scripts/config/ConfigPackageUtils";
import { CONFIG_SCHEMA, GConfig } from "../assets/scripts/config/GConfig";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { CityEffectPlayUtils } from "../assets/scripts/features/city/ui/CityEffectPlayUtils";
import { CITY_SPINE_FRAME_FALLBACK, CityMapLayoutUtils, type MainCityEffectFile } from "../assets/scripts/features/city/ui/CityMapLayoutUtils";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

/** 源文件及真实生成包按现有Bundle定位器读取，不新增配置文件清单。 */
const { bundleRoot, resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs") as {
    bundleRoot(name: string): string;
    resolveBundleFile(path: string): string;
};

/** 测试只读取或定向损坏manifest字段，完整格式校验仍由生产解码器执行。 */
interface TestManifest {
    /** 当前包的同源内容版本。 */
    version: string;
    /** 生成器登记的启动源，不能重复放入游戏包。 */
    startup: { path: string; crc32: string }[];
    /** 生成器登记的游戏文件，测试不手写表名清单。 */
    files: { path: string; file: string; crc32: string; bytes: number }[];
}

/** 从生成产物提取目录，仅供制造真实ZIP反例；不替代生产格式校验。 */
function manifestOf(bytes: Uint8Array): TestManifest {
    return JSON.parse(strFromU8(unzipSync(bytes)["manifest.json"])) as TestManifest;
}

/** 递归扫描真实源JSON路径，独立于ZIP目录派生期望集合，不能用小包清单自证完整。 */
function currentSourcePaths(): string[] {
    const directory = bundleRoot("config");
    const paths: string[] = [];
    const pending = [directory];
    while (pending.length) {
        const current = pending.pop()!;
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            assert(!entry.isSymbolicLink(), "配置源目录不能由链接替代真实源：" + entry.name);
            const absolute = join(current, entry.name);
            if (entry.isDirectory()) {
                pending.push(absolute);
            } else if (entry.name.endsWith(".json")) {
                paths.push("config/" + relative(directory, absolute).replace(/\\/g, "/").slice(0, -5));
            }
        }
    }
    return paths.sort();
}

/**
 * 解包后定向篡改，再生成ZIP自身CRC正确的新包，让生产解码器核对独立的源CRC与目录。
 * 删除manifest时不重新补回；其他情况重新写入修改后的目录。
 */
function changedPackage(bytes: Uint8Array,
    change: (files: Record<string, Uint8Array>, manifest: TestManifest) => void): Uint8Array {
    const files = unzipSync(bytes);
    const manifest = JSON.parse(strFromU8(files["manifest.json"])) as TestManifest;
    change(files, manifest);
    if (files["manifest.json"]) {
        files["manifest.json"] = strToU8(JSON.stringify(manifest));
    }
    return zipSync(files, { level: 6 });
}

/** 从真实源集合及启动计划核对完整ZIP，再验证源CRC、缺目录、篡改及启动不同版等反例。 */
async function checkDecode(bytes: Uint8Array, manifest: TestManifest): Promise<Uint8Array> {
    const sourcePaths = currentSourcePaths();
    const plannedStartup = LOADING_PLAN.login.flatMap(target => "config" in target ? [CONFIG_SCHEMA[target.config].path] : []);
    assert(plannedStartup.length > 0, "真实LoadingPlan.login必须声明启动配置");
    assert.equal(new Set(plannedStartup).size, plannedStartup.length, "启动配置路径不能重复");
    assert(plannedStartup.every(path => sourcePaths.includes(path)), "启动配置必须存在于真实源目录");
    const startupSet = new Set<string>(plannedStartup);
    const expectedPackagePaths = sourcePaths.filter(path => !startupSet.has(path));
    assert(expectedPackagePaths.length > 0, "真实源目录必须含有非启动配置");
    assert.deepEqual(manifest.startup.map(entry => entry.path).sort(), [...plannedStartup].sort(),
        "真实ZIP启动集合必须与LoadingPlan.login一致");
    assert.deepEqual(manifest.files.map(entry => entry.path).sort(), expectedPackagePaths,
        "实际ZIP必须覆盖真实源JSON集合的全部非启动项，空包或微型夹具不能代替真实产物");
    const startup = new Map(manifest.startup.map(entry => [entry.path,
        ConfigPackageUtils.sourceChecksum(JSON.parse(readFileSync(resolveBundleFile(entry.path + ".json"), "utf8")))]));
    const readStartup = (path: string) => startup.get(path);
    const progress: { done: number; total: number }[] = [];
    const decoded = await ConfigPackageUtils.decode(bytes, readStartup, (done, total) => progress.push({ done, total }));
    assert.equal(decoded.version, manifest.version);
    assert.deepEqual(decoded.startupPaths, manifest.startup.map(entry => entry.path), "安装边界使用已校验目录中的启动路径");
    assert.deepEqual(Object.keys(decoded.files).sort(), expectedPackagePaths);
    assert.equal(Object.keys(decoded.files).length, manifest.files.length);
    assert.deepEqual(progress.map(value => value.done), Array.from({ length: manifest.files.length + 1 }, (_, index) => index));
    assert(progress.every(value => value.total === manifest.files.length), "逐张进度报告实际包内文件数");
    for (const path of expectedPackagePaths) {
        assert.deepEqual(decoded.files[path], JSON.parse(readFileSync(resolveBundleFile(path + ".json"), "utf8")),
            path + " 解码内容必须与真实源JSON一致");
    }

    const missingManifest = changedPackage(bytes, files => { delete files["manifest.json"]; });
    await assert.rejects(ConfigPackageUtils.decode(missingManifest, readStartup), /缺少manifest/);
    const badContent = changedPackage(bytes, (files, directory) => {
        // ZIP重新压缩会更新其自身CRC；保留源CRC，确保独立内容校验能发现损坏。
        const file = directory.files[0].file;
        files[file][0] ^= 1;
    });
    await assert.rejects(ConfigPackageUtils.decode(badContent, readStartup), /内容校验失败/);
    const duplicatePath = changedPackage(bytes, (_files, directory) => {
        directory.files[1].path = directory.files[0].path;
    });
    await assert.rejects(ConfigPackageUtils.decode(duplicatePath, readStartup), /源信息无效/);
    const undeclaredFile = changedPackage(bytes, files => {
        files["undeclared.json"] = strToU8('{"rows":[]}');
    });
    await assert.rejects(ConfigPackageUtils.decode(undeclaredFile, readStartup), /文件数量不一致|未声明文件/);
    const firstStartup = manifest.startup[0].path;
    await assert.rejects(ConfigPackageUtils.decode(bytes, path => path === firstStartup
        ? (startup.get(path) === "00000000" ? "ffffffff" : "00000000") : startup.get(path)), /启动配置与游戏配置包不同版/);
    return badContent;
}

/** 核对阶段进度单调且确实结束于1，不以下载次数或人工延时伪造解析进度。 */
function checkProgress(values: readonly { label: string; ratio: number }[]): void {
    assert(values.length > 1);
    assert.equal(values[0].ratio, 0);
    assert.equal(values[values.length - 1].ratio, 1);
    assert(values.every((value, index) => Number.isFinite(value.ratio) && value.ratio >= 0 && value.ratio <= 1
        && (index === 0 || value.ratio >= values[index - 1].ratio)), "实际阶段进度必须单调且位于0到1");
}

/** 对照实际使用的特效配置和源图，核对完整连续帧、骨骼与回退素材均已列入准备。 */
function cityEffectPaths(): string[] {
    const sourcePath = CONFIG_SCHEMA[GConfig.CityEffect].path;
    const config = JSON.parse(readFileSync(resolveBundleFile(sourcePath + ".json"), "utf8")) as MainCityEffectFile;
    const sourceFrames = readdirSync(join(bundleRoot("home"), "ui"));
    const paths: string[] = [];
    const appendFrames = (stem: string) => {
        const prefix = stem.split("/").at(-1) + "-";
        const indices = sourceFrames.filter(file => file.startsWith(prefix) && file.endsWith(".png"))
            .map(file => Number(file.slice(prefix.length, -4))).sort((a, b) => a - b);
        assert(indices.length > 0, "主城帧组缺失：" + stem);
        assert.deepEqual(indices, indices.map((_, index) => index), "主城帧组必须连续：" + stem);
        paths.push(...indices.map(index => `${stem}-${index}/spriteFrame`));
    };
    for (const spot of CityMapLayoutUtils.buildCityMapLayout(null, null, config).effects) {
        if (spot.kind === "spine" && spot.spine) {
            paths.push("spine/" + spot.spine);
            resolveBundleFile(`spine/${spot.spine}.json`);
            resolveBundleFile(`spine/${spot.spine}.atlas`);
            const fallback = CITY_SPINE_FRAME_FALLBACK[spot.spine];
            if (fallback) {
                appendFrames(fallback);
            }
        } else {
            const stem = CityMapLayoutUtils.effectFrameStem(spot.name);
            assert(stem, "配置动画缺少帧组：" + spot.name);
            appendFrames(stem);
        }
    }
    assert(paths.length > 0, "主城特效测试不能以空计划通过");
    assert.equal(new Set(paths).size, paths.length);
    const planned = CityEffectPlayUtils.preloadAssets().map(asset => `${asset.bundle}/${asset.loadPath}`).sort();
    assert.deepEqual(planned, paths.sort(), "登录后的特效准备须覆盖真实帧组和回退资源");
    return paths;
}

/** 使用真实主城播放器挂载首帧，验证登录阶段的缓存能直接供显示复用。 */
async function checkCityEffectPlayback(): Promise<void> {
    const effects = CityMapLayoutUtils.buildCityMapLayout(null, null, GameConfig.instance.getFile(GConfig.CityEffect)).effects;
    const parent = new Node("CityEffectCheck");
    const views = new Map(effects.map(spot => [spot.parent, parent]));
    const handle = CityEffectPlayUtils.startCityEffects(views, effects, () => {});
    try {
        await new Promise<void>(resolve => setImmediate(resolve));
        for (const spot of effects.filter(spot => spot.kind === "anim")) {
            const frame = views.get("fx-" + spot.name)?.getComponent(Sprite)?.spriteFrame;
            assert(frame, "预载的主城动画应可从缓存开始播放：" + spot.name);
        }
    } finally {
        handle.stop();
        parent.destroy();
    }
}

/**
 * 保持同一应用和GameConfig单例，依次取消、接收坏包、重试完整两阶段，再核对重登复用与引用释放。
 * 观察生产decode计数和真实首表完成点以触发取消，所有字节校验、解析和安装仍执行真实实现。
 */
async function checkApplication(bytes: Uint8Array, badContent: Uint8Array, manifest: TestManifest): Promise<void> {
    const plannedCityEffects = cityEffectPaths();
    const cityEffectSet = new Set(plannedCityEffects);
    const originalBundle = assetManager.getBundle;
    const originalDecode = ConfigPackageUtils.decode;
    const requests: { bundle: string; path: string; type: unknown }[] = [];
    const binaryAssets: BufferAsset[] = [];
    const loadedAssets: { refCount: number }[] = [];
    const cityRequests = () => requests.map(request => `${request.bundle}/${request.path}`).filter(path => cityEffectSet.has(path));
    let badPackage = false;
    let decodeCount = 0;
    let cancelAfterFirstParsed = false;
    let active = true;
    assetManager.getBundle = (name: string) => ({
        load: (path: string, type: any, done: (error: Error | null, asset: unknown) => void) => {
            requests.push({ bundle: name, path, type });
            if (type === JsonAsset) {
                assert.equal(name, "config");
                const asset = new JsonAsset();
                asset.json = JSON.parse(readFileSync(resolveBundleFile(name + "/" + path + ".json"), "utf8"));
                loadedAssets.push(asset);
                done(null, asset);
            } else if (type === BufferAsset) {
                assert.equal(name + "/" + path, "config/game-config");
                const asset = new BufferAsset();
                asset.data = Uint8Array.from(badPackage ? badContent : bytes).buffer;
                binaryAssets.push(asset);
                loadedAssets.push(asset);
                done(null, asset);
            } else {
                const asset = new type() as Asset;
                loadedAssets.push(asset);
                done(null, asset);
            }
        },
    });
    ConfigPackageUtils.decode = async (...args: Parameters<typeof originalDecode>) => {
        decodeCount++;
        const originalProgress = args[2];
        return originalDecode.call(ConfigPackageUtils, args[0], args[1], (done, total) => {
            originalProgress?.(done, total);
            if (cancelAfterFirstParsed && done === 1) {
                active = false;
            }
        }, args[3]);
    };
    const app = new ApplicationResources();
    const config = GameConfig.instance;
    try {
        const startupNames = LOADING_PLAN.login.flatMap(target => "config" in target ? [target.config] : []);
        assert(startupNames.length > 0, "完整应用登录阶段读取唯一计划声明的启动表");
        assert.deepEqual(manifest.startup.map(entry => entry.path).sort(), startupNames.map(name => CONFIG_SCHEMA[name].path).sort(),
            "压缩包启动目录与唯一加载方案保持一致");
        const loginProgress: { label: string; ratio: number }[] = [];
        await app.prepareStage("login", (label, ratio) => loginProgress.push({ label, ratio }), () => true);
        checkProgress(loginProgress);
        assert.deepEqual(cityRequests(), [], "登录前不读取主城特效");
        assert.deepEqual(requests.filter(request => request.type === JsonAsset).map(request => "config/" + request.path),
            startupNames.map(name => CONFIG_SCHEMA[name].path));
        assert.equal(config.getPackageVersion(), null);
        assert.equal(config.status(GConfig.HeroType).state, "unloaded");

        cancelAfterFirstParsed = true;
        await assert.rejects(app.prepareStage("enterGame", () => {}, () => active), /取消/);
        cancelAfterFirstParsed = false;
        assert.equal(binaryAssets.length, 1, "取消发生在真实包下载并开始解析后");
        assert.equal(binaryAssets[0].refCount, 0, "取消撤回短期二进制持有");
        assert.equal(config.getPackageVersion(), null);
        assert.throws(() => config.getFileByPath("config/buff"), /尚未加载/);

        badPackage = true;
        await assert.rejects(app.prepareStage("enterGame", () => {}, () => true), /内容校验失败/);
        assert.equal(binaryAssets.length, 2, "失败没有被登记成已完成，重新加载坏包");
        assert.equal(binaryAssets[1].refCount, 0, "坏包失败撤回短期二进制持有");
        assert.equal(config.getPackageVersion(), null);
        assert.equal(config.status(GConfig.Item).state, "unloaded");
        assert.deepEqual(cityRequests(), [], "配置安装失败时不开始准备主城特效");

        badPackage = false;
        await app.prepareStage("login", () => {}, () => true);
        const enterProgress: { label: string; ratio: number }[] = [];
        await app.prepareStage("enterGame", (label, ratio) => enterProgress.push({ label, ratio }), () => true);
        checkProgress(enterProgress);
        assert.equal(config.getPackageVersion(), manifest.version);
        assert.equal(binaryAssets.length, 3);
        assert.equal(decodeCount, 3, "取消、坏包及成功各执行真实解码一次");
        assert(binaryAssets.every(asset => asset.refCount === 0), "安装后也不常驻压缩包资产");
        assert(enterProgress.some(value => value.label === "整理游戏数据"));
        assert(enterProgress.some(value => value.label === "准备游戏数据"));
        assert(enterProgress.some(value => value.label === "准备主城特效"));
        assert.deepEqual(cityRequests().sort(), plannedCityEffects, "登录后阶段结束前每项主城特效实际加载一次");
        assert(!enterProgress.some(value => value.label.includes("/" + manifest.files.length)),
            "玩家文案不将包内表数显示成资源下载数量，进度仍按真实任务推进");

        const beforeRead = requests.length;
        await checkCityEffectPlayback();
        assert.equal(requests.length, beforeRead, "主城播放复用已准备的帧和骨骼，无新增缺帧探测或资源加载");
        assert(config.getConfig(GConfig.HeroType).length > 0);
        assert(config.getConfig(GConfig.Item).length > 0);
        assert((config.getFileByPath("config/buff") as { rows: unknown[] }).rows.length > 0);
        assert((config.getFileByPath("config/chapterreward") as { rows: unknown[] }).rows.length > 0);
        assert.strictEqual(config.getFileByPath("config/herotype"), config.getFile(GConfig.HeroType));
        assert.equal(requests.length, beforeRead, "英雄、背包、战斗与关卡查询直接读取同一已安装快照");
        const jsonRequests = requests.filter(request => request.type === JsonAsset);
        assert.equal(jsonRequests.length, startupNames.length, "游戏包安装及页面配置读取不补发逐张JSON请求");
        const stableHero = config.getFile(GConfig.HeroType);
        await app.prepareStage("login", () => {}, () => true);
        await app.prepareStage("enterGame", () => {}, () => true);
        assert.equal(requests.length, beforeRead, "重登复用应用已完成的资源目标");
        assert.equal(decodeCount, 3, "重登不重新解压已安装版本");
        assert.strictEqual(config.getFile(GConfig.HeroType), stableHero);
    } finally {
        app.dispose();
        ConfigPackageUtils.decode = originalDecode;
        assetManager.getBundle = originalBundle;
    }
    assert(loadedAssets.every(asset => asset.refCount === 0), "应用结束后启动源、压缩包和计划美术持有全部释放");
    assert.equal(ResourceAssetsUtils.snapshot().owners, 0);
    assert.equal(ResourceAssetsUtils.snapshot().pending, 0);
}

/** 读取当前生成包，依次验证纯解码反例与完整应用链，最后报告实际配置数量。 */
async function main(): Promise<void> {
    const bytes = Uint8Array.from(readFileSync(resolveBundleFile("config/game-config.bin")));
    const manifest = manifestOf(bytes);
    const badContent = await checkDecode(bytes, manifest);
    await checkApplication(bytes, badContent, manifest);
    console.log(`PASS config package loading: real ${manifest.files.length}-file archive, manifest/CRC failures, boot${manifest.startup.length}, cancellation, retry, city effect preload and playback reuse, shared queries, re-login reuse and released binary refs`);
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
