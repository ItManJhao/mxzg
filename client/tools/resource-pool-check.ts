import { strict as assert } from "node:assert";
import { ResourcePool, ResourceScopeClosed } from "../assets/scripts/framework/assets/ResourcePool";
import { assetManager, Prefab } from "cc";
import { loadPrefab } from "../assets/scripts/ui/prefabLoad";
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
    assert.equal(name, "prefabs");
    done(null, { load: (path: string, type: unknown, callback: Function) => {
      assert.equal(path, "ui/login/LoadingLayer"); assert.equal(type, Prefab); callback(null, planned);
    } });
  } });
  const manifest = JSON.parse(readFileSync("docs/prefab-cleanup-manifest.json", "utf8"));
  await assert.rejects(loadPrefab(manifest.removed[0].path.slice(0, -7)), /不在当前重做计划/);
  assert.equal(bundleRequests, 0, "retired Prefabs are rejected before any engine request");
  assert.equal(await loadPrefab("prefabs/ui/login/LoadingLayer"), planned);
  assert.equal(bundleRequests, 1, "planned core Prefabs still load normally");
  console.log("resource-pool-check passed: shared ownership, retry/cancel/reopen and Prefab plan runtime guard");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
