/** 资源所有权回归：覆盖共享、迟到取消、预制体实例保护及预加载与闲置淘汰的独立持有。 */
import { strict as assert } from "node:assert";
import { ResourcePool, ResourceScopeClosed } from "../assets/scripts/framework/assets/ResourcePool";
import { assetManager, Prefab, Node } from "cc";
import { loadPrefab, clearPrefabCache, prefabCacheSnapshot, retainPrefabForNode, collectPrefabCache, PREFAB_IDLE_MS, MAX_IDLE_PREFABS } from "../assets/scripts/framework/assets/PrefabLoader";
import { monoNow } from "../assets/scripts/core/GameLog";
import { createAssetScope, ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssets";
import { readFileSync } from "node:fs";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function main() {
  const pending = deferred<object>(); const asset = {};
  let loads = 0, pins = 0, releases = 0;
  const pool = new ResourcePool({ load: async () => { loads++; return pending.promise; },
    retain: () => { pins++; }, release: () => { releases++; } });
  const first = pool.createScope(); const second = pool.createScope();
  const one = first.load("cast"); assert.equal(first.load("cast"), one);
  const two = second.load("cast");
  await Promise.resolve(); assert.equal(loads, 1, "deduplicate across scopes");
  pending.resolve(asset); assert.equal(await one, asset); assert.equal(await two, asset);
  assert.equal(pins, 1);
  first.dispose(); first.dispose(); assert.equal(releases, 0, "other owner still needs it");
  second.dispose(); assert.equal(releases, 1);
  await assert.rejects(first.load("cast"), ResourceScopeClosed);

  let attempt = 0;
  const retryPool = new ResourcePool({ load: async () => {
    if (++attempt === 1) throw new Error("missing asset"); return asset;
  }, retain: () => {}, release: () => {} });
  const retry = retryPool.createScope();
  await assert.rejects(retry.load("backdrop"), /missing asset/);
  assert.equal(await retry.load("backdrop"), asset, "failure can retry within same scope");
  retry.dispose();

  const late = deferred<object>(); let latePins = 0;
  const latePool = new ResourcePool({ load: () => late.promise, retain: () => { latePins++; }, release: () => {} });
  const closed = latePool.createScope();
  const ignored = assert.rejects(closed.load("music"), ResourceScopeClosed);
  closed.dispose(); late.resolve(asset); await ignored;
  assert.equal(latePins, 0, "late completion must not pin a closed owner's asset");

  const shared = deferred<object>(); let sharedPins = 0, sharedReleases = 0, sharedLoads = 0;
  const sharedPool = new ResourcePool({ load: () => { sharedLoads++; return shared.promise; },
    retain: () => { sharedPins++; }, release: () => { sharedReleases++; } });
  const cancelled = sharedPool.createScope();
  const cancelledLoad = assert.rejects(cancelled.load("bar"), ResourceScopeClosed);
  cancelled.dispose();
  const reopened = sharedPool.createScope(); const reopenedLoad = reopened.load("bar");
  shared.resolve(asset); await cancelledLoad; assert.equal(await reopenedLoad, asset);
  assert.equal(sharedLoads, 1); assert.equal(sharedPins, 1);
  reopened.dispose(); assert.equal(sharedReleases, 1, "cancelled waiter does not release another owner");
  let bundleRequests = 0;
  const planned = new Prefab();
  Object.assign(assetManager, { loadBundle: (name: string, done: Function) => {
    bundleRequests++;
    assert.equal(name, "bootstrap");
    done(null, { load: (path: string, type: unknown, callback: Function) => {
      assert.equal(path, "prefabs/LoadingLayer"); assert.equal(type, Prefab); callback(null, planned);
    } });
  } });
  const manifest = JSON.parse(readFileSync("docs/prefab-cleanup-manifest.json", "utf8"));
  await assert.rejects(loadPrefab(manifest.removed[0].path.slice(0, -7)), /不在当前重做计划/);
  assert.equal(bundleRequests, 0, "retired Prefabs are rejected before any engine request");
  assert.equal(await loadPrefab("bundles/bootstrap/prefabs/LoadingLayer"), planned);
  assert.equal(bundleRequests, 1, "planned core Prefabs still load normally");
  assert.deepEqual(prefabCacheSnapshot(), { pending: 0, cached: 1 });
  assert.equal(planned.refCount, 2, "共享资源池和页面缓存分别持有，清理时必须全部撤回");
  const instance = new Node("PrefabOwner");
  retainPrefabForNode(planned, instance);
  retainPrefabForNode(planned, instance);
  assert.equal(planned.refCount, 3, "同节点重复保护不重复引用");
  assert.equal(collectPrefabCache(monoNow() + PREFAB_IDLE_MS), 0, "活动/缓存实例仍持有时不得淘汰");
  instance.destroy();
  assert.equal(planned.refCount, 2);
  const preload = createAssetScope();
  await preload.load(ResourceAssetsUtils.describe("bootstrap", "prefabs/LoadingLayer", "Prefab"));
  assert.equal(collectPrefabCache(monoNow() + PREFAB_IDLE_MS), 1);
  assert.deepEqual(prefabCacheSnapshot(), { pending: 0, cached: 0 });
  assert.equal(planned.refCount, 1, "预加载仍通过共享池持有，闲置淘汰不得释放它");
  assert.equal(await loadPrefab("bundles/bootstrap/prefabs/LoadingLayer"), planned);
  assert.equal(bundleRequests, 1, "预加载仍在时重开复用资源池，不重新请求");
  preload.dispose();
  clearPrefabCache();
  assert.equal(planned.refCount, 0);
  assert.equal(await loadPrefab("bundles/bootstrap/prefabs/LoadingLayer"), planned);
  assert.equal(bundleRequests, 2, "全部拥有者释放后允许重新加载");
  assert.equal(collectPrefabCache(monoNow() + PREFAB_IDLE_MS), 1);
  assert.equal(planned.refCount, 0, "未预加载资源在到期后真正撤回全部加载器持有");

  await loadPrefab("bundles/bootstrap/prefabs/LoadingLayer");
  const survivingNode = new Node("SurvivingOwner");
  retainPrefabForNode(planned, survivingNode);
  clearPrefabCache();
  assert.equal(planned.refCount, 1, "撤回加载器缓存不能撤回活着的实例持有");
  survivingNode.destroy();
  assert.equal(planned.refCount, 0);
  let lateCallback!: (error: unknown, asset: Prefab) => void;
  Object.assign(assetManager, { loadBundle: (_name: string, done: Function) => done(null, {
    load: (_path: string, _type: unknown, callback: typeof lateCallback) => { lateCallback = callback; }
  }) });
  const obsolete = assert.rejects(loadPrefab("bundles/bootstrap/prefabs/LoadingLayer"), /应用已关闭/);
  // 统一资源池和Bundle依赖查询是异步流程，等待请求进入引擎后再模拟迟到。
  for (let i = 0; i < 20; i++) { await Promise.resolve(); }
  assert.equal(collectPrefabCache(monoNow() + PREFAB_IDLE_MS), 0, "在途加载不能被闲置淘汰");
  clearPrefabCache();
  const latePrefab = new Prefab(); lateCallback(null, latePrefab); await obsolete;
  assert.equal(latePrefab.refCount, 0, "关闭应用后的迟到预制体不重新占用缓存");
  assert.deepEqual(prefabCacheSnapshot(), { pending: 0, cached: 0 });
  assert.deepEqual(pool.snapshot(), { scopes: 0, entries: 0, pending: 0, owners: 0, retained: 0 });
  let discarded = 0;
  const lateDiscard = deferred<object>();
  const discardPool = new ResourcePool({ load: () => lateDiscard.promise, retain: () => {},
    release: () => {}, discard: () => { discarded++; } });
  const discardedScope = discardPool.createScope();
  const rejected = assert.rejects(discardedScope.load("late"), ResourceScopeClosed);
  discardedScope.dispose(); lateDiscard.resolve({}); await rejected;
  assert.equal(discarded, 1, "无人接收的迟到资源仍交还引擎");
  assert.deepEqual(discardPool.snapshot(), { scopes: 0, entries: 0, pending: 0, owners: 0, retained: 0 });
  for (let i = 0; i < 20; i++) {
    const scope = retryPool.createScope();
    await scope.load("cycle"); scope.dispose();
  }
  assert.deepEqual(retryPool.snapshot(), { scopes: 0, entries: 0, pending: 0, owners: 0, retained: 0 });
  clearPrefabCache();
  const capacityAssets = new Map<string, Prefab>();
  Object.assign(assetManager, { loadBundle: (_name: string, done: Function) => done(null, {
    load: (path: string, _type: unknown, callback: Function) => {
      const prefab = new Prefab();
      capacityAssets.set("bundles/" + _name + "/" + path, prefab);
      callback(null, prefab);
    },
  }) });
  const capacityPaths = Array.from(readFileSync("client/assets/scripts/config/PrefabPlan.ts", "utf8")
    .matchAll(/"([^"]+)"/g), match => match[1])
    .filter(path => path.startsWith("bundles/")).slice(0, MAX_IDLE_PREFABS + 3);
  for (const path of capacityPaths) await loadPrefab(path);
  const protectedNode = new Node("CapacityProtected");
  retainPrefabForNode(capacityAssets.get(capacityPaths[0])!, protectedNode);
  await loadPrefab(capacityPaths[1]);
  assert.equal(collectPrefabCache(), 2, "只按闲置数量淘汰到上限，活动资源不计入");
  assert.equal(capacityAssets.get(capacityPaths[2])!.refCount, 0, "最久未使用资源先释放");
  assert.equal(capacityAssets.get(capacityPaths[3])!.refCount, 0);
  assert.equal(capacityAssets.get(capacityPaths[1])!.refCount, 2, "最近再次获取的资源保留");
  assert.equal(capacityAssets.get(capacityPaths[0])!.refCount, 3, "活动实例及缓存引用均受保护");
  assert.equal(prefabCacheSnapshot().cached, MAX_IDLE_PREFABS + 1);
  protectedNode.destroy();
  assert.equal(collectPrefabCache(), 1, "实例退出后纳入闲置数量限制");
  clearPrefabCache();
  for (const prefab of capacityAssets.values()) assert.equal(prefab.refCount, 0);
  console.log("resource-pool-check passed: shared ownership, retry/cancel/reopen and Prefab plan runtime guard");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
