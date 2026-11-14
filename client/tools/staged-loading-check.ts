/** 显式三段加载行为回归：目标配置、前后台共享、失败重试与取消；不代替Creator实机验收。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Asset, JsonAsset, Prefab, assetManager, resources } from "cc";
import { ApplicationResources } from "../assets/scripts/app/remake/ApplicationResources";
import { LOADING_PLAN } from "../assets/scripts/app/remake/LoadingPlan";
import { ResourceDescriptor } from "../assets/scripts/framework/assets/ResourceTypes";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { PrefabLoader } from "../assets/scripts/framework/assets/PrefabLoader";
import { GConfig } from "../assets/scripts/config/GConfig";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";

/** 仅离线测试解析源文件位置，运行时始终按原Bundle名加载。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs") as {
    resolveBundleFile(path: string): string;
};

/** 仅声明页面地址，预载检查不实例化此测试窗口。 */
class PlannedPage extends BaseView { }
class UnregisteredPage extends BaseView { }

/** 通过受控完成回调验证进度，不使用延时伪造网络完成。 */
async function main(): Promise<void> {
    const bag = ResourceAssetsUtils.describe("bag", "prefabs/BagView", "Prefab", "bundles/module/bag/prefabs/BagView");
    const detail = ResourceAssetsUtils.describe("bag", "prefabs/BagInfoView", "Prefab", "bundles/module/bag/prefabs/BagInfoView");
    const spine = ResourceAssetsUtils.describe("spine", "jiemian", "SkeletonData");
    const icon = ResourceAssetsUtils.describe("common", "ui/other_rare-4", "SpriteFrame");
    const uuid: ResourceDescriptor = {
        bundle: "main", path: "fixture-frame", assetPath: "fixture-frame",
        loadPath: "", type: "SpriteFrame", uuid: "fixture-frame-uuid",
    };
    const raw: ResourceDescriptor = {
        bundle: "main", path: "fixture-native", assetPath: "fixture-native",
        loadPath: "", type: "Asset", uuid: "fixture-native-uuid",
    };
    let nativeMissing = true;
    const requests: string[] = [];
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    let failDetail = true;
    const load = (bundle: string, path: string, type: any, done: Function) => {
        requests.push(bundle + ":" + path);
        if (type === JsonAsset) {
            const value = new JsonAsset();
            value.json = JSON.parse(readFileSync(resolveBundleFile(bundle + "/" + path + ".json"), "utf8"));
            done(null, value);
        } else if (path === detail.loadPath && failDetail) {
            done(new Error("fixture retry"));
        } else if (path === bag.loadPath) {
            void gate.then(() => done(null, new Prefab()));
        } else {
            done(null, type === Prefab ? new Prefab() : new Asset());
        }
    };
    resources.load = ((path: string, type: any, done: Function) => load("resources", path, type, done)) as any;
    Object.assign(assetManager, {
        getBundle: (name: string) => ({ load: (path: string, type: any, done: Function) => load(name, path, type, done) }),
        loadAny: (options: { uuid: string }, done: Function) => {
            requests.push("uuid:" + options.uuid);
            done(null, options.uuid === raw.uuid
                ? Object.assign(new Asset(), { nativeUrl: "fixture.csv", nativeAsset: nativeMissing ? null : "content" })
                : new Asset());
        },
    });
    const old = { login: LOADING_PLAN.login, enterGame: LOADING_PLAN.enterGame, background: LOADING_PLAN.background };
    const app = new ApplicationResources();
    const scope = ResourceAssetsUtils.createAssetScope();
    let pagePrepares = 0;
    let customPageLoads = 0;
    const unregisterPage = UIRegistry.registerView(PlannedPage, {
        id: "planned-page", prefab: bag.assetPath, layer: UILayer.Page, cache: false, allowMultiple: false,
        prepare: async () => { pagePrepares++; },
        load: async () => { customPageLoads++; return new Prefab(); },
    });
    try {
        await assert.rejects(scope.load(raw), /原生资源内容缺失/, "引擎只返回空壳不能记为成功");
        nativeMissing = false;
        await scope.load(raw);
        const rawLanguage = ResourceAssetsUtils.describe("config", "language", "JsonAsset");
        assert.equal(GameConfig.instance.status(GConfig.Language).state, "unloaded");
        LOADING_PLAN.login = [rawLanguage];
        await app.prepareStage("login", () => {}, () => true);
        assert.equal(GameConfig.instance.status(GConfig.Language).state, "unloaded",
            "原始JSON资源准备不隐式安装配置");
        LOADING_PLAN.login = [{ config: GConfig.Language }];
        await app.prepareStage("login", () => {}, () => true);
        assert.equal(GameConfig.instance.status(GConfig.Language).state, "ready",
            "先准备同路径JsonAsset不能让后续配置提交被提前跳过");
        assert(GameConfig.instance.getConfig(GConfig.Language).length > 0);
        assert.equal(requests.filter(value => value === "config:language").length, 1,
            "完成语义分开仍复用资源池，只下载同一张启动源一次");
        LOADING_PLAN.enterGame = [{ page: PlannedPage }, { bundle: spine.bundle, path: spine.loadPath, type: spine.type }];
        LOADING_PLAN.background = [bag, detail, icon, uuid, { config: GConfig.Language }];
        const ratios: number[] = [];
        const pending = app.prepareStage("enterGame", (_label, ratio) => ratios.push(ratio), () => true);
        for (let i = 0; i < 20; i++) { await Promise.resolve(); }
        assert.deepEqual(ratios, [0]);
        const foreground = PrefabLoader.loadPrefab(bag.assetPath);
        for (let i = 0; i < 20; i++) { await Promise.resolve(); }
        assert.equal(requests.filter(value => value === bag.bundle + ":" + bag.loadPath).length, 1);
        finish();
        await Promise.all([pending, foreground]);
        assert.equal(ratios[ratios.length - 1], 1);
        assert.equal(pagePrepares, 0, "页面预载只读取@UIRegistry.view.prefab，不执行配置前置条件");
        assert.equal(customPageLoads, 0, "预载不调用开页load或实例化窗口");
        assert(!requests.some(value => value.startsWith("module:") || value.startsWith("resources:")),
            "物理父目录不参与前后台Bundle加载键");
        assert(!requests.includes(detail.bundle + ":" + detail.loadPath), "阶段不扩大到详情");
        let yields = 0;
        await app.prepareBackground(async () => { yields++; }, () => true);
        assert.equal(yields, 3);
        assert.deepEqual(app.backgroundStatus(), { total: 3, completed: 2, failed: 1, running: false });
        assert(requests.includes("uuid:" + uuid.uuid), "合图帧按UUID加载");
        const before = requests.length;
        await scope.load(icon);
        assert.equal(requests.length, before, "前台复用后台图片");
        const uuidRequests = requests.filter(value => value.startsWith("uuid:")).length;
        await assert.rejects(PrefabLoader.loadPrefab(detail.assetPath), /fixture retry/, "远程页面失败必须保留失败状态");
        assert.equal(requests.filter(value => value.startsWith("uuid:")).length, uuidRequests,
            "远程Bundle失败不能绕过下载路径按UUID加载");
        failDetail = false;
        await app.prepareBackground(async () => {}, () => true);
        assert.deepEqual(app.backgroundStatus(), { total: 1, completed: 1, failed: 0, running: false });
        await app.prepareBackground(async () => {}, () => true);
        assert.equal(app.backgroundStatus().total, 0);
        LOADING_PLAN.login = [{ bundle: "", path: "missing", type: "SpriteFrame" }];
        await assert.rejects(app.prepareStage("login", () => {}, () => true), /必须指定Bundle/);
        LOADING_PLAN.login = [{ page: UnregisteredPage }];
        await assert.rejects(app.prepareStage("login", () => {}, () => true), /未通过@UIRegistry.view登记/);
        await assert.rejects(app.prepareStage("enterGame", () => {}, () => false), /取消/);
    } finally {
        LOADING_PLAN.login = old.login;
        LOADING_PLAN.enterGame = old.enterGame;
        LOADING_PLAN.background = old.background;
        scope.dispose();
        unregisterPage();
        app.dispose();
        PrefabLoader.clearPrefabCache();
        ResourceAssetsUtils.releaseResidents();
    }
    const stopped = new ApplicationResources();
    const before = requests.length;
    await stopped.prepareBackground(async () => { stopped.stopBackground(); }, () => true);
    assert.equal(requests.length, before, "停止后不继续排队，也不读取全目录索引");
    const deferredImage = ResourceAssetsUtils.describe("common", "ui/other_rare-6", "SpriteFrame");
    assert(!requests.includes(deferredImage.bundle + ":" + deferredImage.loadPath), "未配置资源不提前加载");
    const demand = ResourceAssetsUtils.createAssetScope();
    await demand.load(deferredImage);
    assert(requests.includes(deferredImage.bundle + ":" + deferredImage.loadPath), "未配置资源仍可在实际使用时加载");
    demand.dispose();
    stopped.dispose();
    assert.equal(ResourceAssetsUtils.snapshot().owners, 0);
    console.log("staged-loading-check passed: explicit phases, raw JSON versus config commit, shared download, on-demand boundary, real progress, retry, atlas UUID and cancellation");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
