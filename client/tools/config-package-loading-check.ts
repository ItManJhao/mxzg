/**
 * 配置压缩包与应用加载链专项：读取真实生成产物，核对ZIP目录、源CRC和两阶段安装。
 * 引擎替身只提供实际源JSON/二进制包与引用计数，不伪造解码或配置安装结果。
 * 不启动服务、Creator或浏览器，不写配置源文件；纯解码反例不会修改应用唯一GameConfig。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { Asset, BufferAsset, JsonAsset, assetManager } from "cc";
import { ApplicationResources } from "../assets/scripts/app/remake/ApplicationResources";
import { LOADING_PLAN } from "../assets/scripts/app/remake/LoadingPlan";
import { ConfigPackageUtils } from "../assets/scripts/config/ConfigPackageUtils";
import { CONFIG_SCHEMA, GConfig } from "../assets/scripts/config/GConfig";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

/** 源文件及真实生成包按现有Bundle定位器读取，不新增配置文件清单。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs") as {
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

/** 用真实启动源CRC验证生产解码器，覆盖缺目录、篡改内容、重复路径、额外文件和启动不同版。 */
async function checkDecode(bytes: Uint8Array, manifest: TestManifest): Promise<Uint8Array> {
    const startup = new Map(manifest.startup.map(entry => [entry.path,
        ConfigPackageUtils.sourceChecksum(JSON.parse(readFileSync(resolveBundleFile(entry.path + ".json"), "utf8")))]));
    const readStartup = (path: string) => startup.get(path);
    const progress: { done: number; total: number }[] = [];
    const decoded = await ConfigPackageUtils.decode(bytes, readStartup, (done, total) => progress.push({ done, total }));
    assert.equal(decoded.version, manifest.version);
    assert.deepEqual(decoded.startupPaths, manifest.startup.map(entry => entry.path), "安装边界使用已校验目录中的启动路径");
    assert.equal(manifest.files.length, 47, "当前真实产物包含47张非启动配置，不使用空包或微型假包");
    assert.equal(Object.keys(decoded.files).length, manifest.files.length);
    assert.deepEqual(progress.map(value => value.done), Array.from({ length: manifest.files.length + 1 }, (_, index) => index));
    assert(progress.every(value => value.total === manifest.files.length), "逐张进度报告实际包内文件数");
    assert.deepEqual(decoded.files["config/buff"], JSON.parse(readFileSync(resolveBundleFile("config/buff.json"), "utf8")));

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

/**
 * 保持同一应用和GameConfig单例，依次取消、接收坏包、重试完整两阶段，再核对重登复用与引用释放。
 * 观察生产decode计数和真实首表完成点以触发取消，所有字节校验、解析和安装仍执行真实实现。
 */
async function checkApplication(bytes: Uint8Array, badContent: Uint8Array, manifest: TestManifest): Promise<void> {
    const originalBundle = assetManager.getBundle;
    const originalDecode = ConfigPackageUtils.decode;
    const requests: { bundle: string; path: string; type: unknown }[] = [];
    const binaryAssets: BufferAsset[] = [];
    const loadedAssets: { refCount: number }[] = [];
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
        assert.equal(startupNames.length, 2, "完整应用登录阶段只读取当前声明的两个启动表");
        assert.deepEqual(manifest.startup.map(entry => entry.path), startupNames.map(name => CONFIG_SCHEMA[name].path),
            "压缩包启动目录与唯一加载方案保持一致");
        const loginProgress: { label: string; ratio: number }[] = [];
        await app.prepareStage("login", (label, ratio) => loginProgress.push({ label, ratio }), () => true);
        checkProgress(loginProgress);
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
        assert(!enterProgress.some(value => value.label.includes("/" + manifest.files.length)),
            "玩家文案不将包内表数显示成资源下载数量，进度仍按真实任务推进");

        const beforeRead = requests.length;
        assert(config.getConfig(GConfig.HeroType).length > 0);
        assert(config.getConfig(GConfig.Item).length > 0);
        assert((config.getFileByPath("config/buff") as { rows: unknown[] }).rows.length > 0);
        assert((config.getFileByPath("config/chapterreward") as { rows: unknown[] }).rows.length > 0);
        assert.strictEqual(config.getFileByPath("config/herotype"), config.getFile(GConfig.HeroType));
        assert.equal(requests.length, beforeRead, "英雄、背包、战斗与关卡查询直接读取同一已安装快照");
        const jsonRequests = requests.filter(request => request.type === JsonAsset);
        assert.equal(jsonRequests.length, 2, "游戏包安装及页面配置读取不补发逐张JSON请求");
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
    console.log("PASS config package loading: real 47-file archive, manifest/CRC failures, boot2, cancellation, retry, shared queries, re-login reuse and released binary refs");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
