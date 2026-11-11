/** 主城共享Bundle回归：以构建依赖元数据准备资源，不维护模块预加载清单。 */
import { ResourceAssetsUtils, createAssetScope } from "../assets/scripts/framework/assets/ResourceAssets";
import { strict as assert } from "node:assert";
import { assetManager, Prefab } from "cc";
import { loadPrefab, clearPrefabCache } from "../assets/scripts/framework/assets/PrefabLoader";

/** 验证依赖先加载、失败重试及作用域引用释放。 */
async function main(): Promise<void> {
    const descriptor = ResourceAssetsUtils.describe("remake-home", "RemakeHomeView", "Prefab", "bundles/remake-home/RemakeHomeView");
    const ready = new Map<string, object>();
    const order: string[] = [];
    const prefab = new Prefab();
    let attempts = 0;
    Object.assign(assetManager, {
        getBundle: (name: string) => ready.get(name),
        loadBundle: (name: string, done: Function) => {
            order.push(name);
            const bundle = {
                deps: name === descriptor.bundle ? ["resources", "prefabs"] : [],
                load: (path: string, type: unknown, callback: Function) => {
                    assert.equal(path, descriptor.loadPath);
                    assert.equal(type, Prefab);
                    assert(ready.has("resources") && ready.has("prefabs"));
                    attempts++;
                    callback(attempts === 1 ? new Error("fixture missing") : null, attempts === 1 ? null : prefab);
                },
            };
            ready.set(name, bundle);
            done(null, bundle);
        },
    });
    const first = createAssetScope();
    const second = createAssetScope();
    assert.deepEqual(order, []);
    await assert.rejects(first.load(descriptor), /fixture missing/);
    const results = await Promise.all([first.load(descriptor), second.load(descriptor)]);
    assert.equal(results[0], prefab);
    assert.equal(results[1], prefab);
    assert.equal(attempts, 2);
    assert.equal(prefab.refCount, 1);
    first.dispose();
    assert.equal(prefab.refCount, 1);
    second.dispose();
    assert.equal(prefab.refCount, 0);
    // 页面使用源路径，预加载使用Bundle内路径；两者必须落到同一个包和资源。
    assert.equal(await loadPrefab(descriptor.assetPath), prefab);
    assert.equal(attempts, 3);
    assert.equal(await loadPrefab(descriptor.assetPath), prefab);
    assert.equal(attempts, 3, "重开页面复用已有预制体，不再请求");
    clearPrefabCache();
    assert.equal(prefab.refCount, 0, "预制体缓存及作用域均释放自己的引用");
    console.log("home-bundle-check passed: metadata dependencies, sharing, retry and release");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
