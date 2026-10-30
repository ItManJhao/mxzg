import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { director, Director, Node, UIOpacity } from "cc";
import { runStartup, StartupCancelled } from "../assets/scripts/app/remake/StartupFlow";
import { RemakeApp } from "../assets/scripts/app/remake/RemakeApp";
import { BootChrome } from "../assets/scripts/ui/bootChrome";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
async function main() {
  const restore = deferred();
  const events: string[] = []; const ratios: number[] = [];
  let lateProgress!: (done: number, total: number) => void;
  const startup = runStartup([
    { label: "config", weight: 50, run: async progress => {
      events.push("config"); lateProgress = progress;
      progress(1, 2); progress(0, 2); progress(2, 2);
    } },
    { label: "restore", weight: 10, run: async () => { events.push("restore"); await restore.promise; } },
    { label: "page", weight: 40, run: async () => { events.push("page"); } },
  ], (_label, ratio) => ratios.push(ratio), () => true);
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(events, ["config", "restore"], "page cannot appear while restoring data");
  assert(ratios.every(ratio => ratio < 1), "do not report completion early");
  const count = ratios.length; lateProgress(1, 1);
  assert.equal(ratios.length, count, "ignore late callbacks from completed tasks");
  restore.resolve(); await startup;
  assert.equal(ratios.at(-1), 1);
  assert(ratios.every((ratio, i) => i === 0 || ratio >= ratios[i - 1]), "progress never moves backwards");

  let opened = false;
  await assert.rejects(runStartup([
    { label: "required-config", weight: 1, run: async () => { throw new Error("missing core config"); } },
    { label: "page", weight: 1, run: async () => { opened = true; } },
  ], () => {}, () => true), /missing core config/);
  assert.equal(opened, false);
  let alive = true;
  await assert.rejects(runStartup([
    { label: "config", weight: 1, run: async () => { alive = false; } },
    { label: "page", weight: 1, run: async () => { opened = true; } },
  ], () => {}, () => alive), StartupCancelled);
  assert.equal(opened, false, "destroyed startup cannot open a page");

  // Exercise cancellation of the reused visual transition, rather than sleeping
  // to simulate asset progress. Showing a new load must interrupt the old fade.
  const overlay = new Node("LoadingLayer");
  const chrome: any = new BootChrome(new Node("StartupHost"));
  chrome.root = overlay;
  const fading = chrome.fadeOut(10);
  chrome.show(); await fading;
  assert.equal(overlay.getComponent(UIOpacity)!.opacity, 255);
  chrome.destroy();

  const app: any = new RemakeApp(); app.alive = true;
  const fade = deferred(); let fades = 0; let hides = 0;
  app.chrome = { fadeOut: () => { fades++; return fade.promise; }, hide: () => { hides++; }, destroy: () => {} };
  const reveal = app.reveal(0, false);
  director.emit(Director.EVENT_AFTER_DRAW); await Promise.resolve();
  assert.equal(fades, 0, "wait for two actual paint events");
  director.emit(Director.EVENT_AFTER_DRAW); await Promise.resolve();
  assert.equal(fades, 1);
  app.routeEpoch++; fade.resolve(); await reveal;
  assert.equal(hides, 0, "a stale reveal must not hide the next load");
  const waiting = app.afterPaint(); app.onDestroy(); await waiting;
  assert.equal(app.paintWaiters.size, 0, "shutdown settles frame waiters");

  const scene = JSON.parse(readFileSync("client/assets/scenes/Remake.scene", "utf8"));
  const binding = scene.find((row: any) => row.loginPrefab && row.apiBaseUrl);
  assert(binding.pageHost && binding.startupHost && binding.loadingPrefab);
  const accountMeta = JSON.parse(readFileSync("client/assets/prefabs/ui/account/AccountLogin.prefab.meta", "utf8"));
  const legacyMeta = JSON.parse(readFileSync("client/assets/prefabs/ui/legacy-login/LoginPanel.prefab.meta", "utf8"));
  assert.equal(binding.loginPrefab.__uuid__, accountMeta.uuid, "Remake uses only the account login page");
  assert.notEqual(accountMeta.uuid, legacyMeta.uuid, "old login is a separate compatibility reference");
  assert.equal(binding.homePrefab, undefined, "scene must not eagerly reference the lazy home feature");
  const layer = JSON.parse(readFileSync("client/assets/prefabs/ui/login/LoadingLayer.prefab.meta", "utf8"));
  assert.equal(binding.loadingPrefab.__uuid__, layer.uuid, "reuse existing LoadingLayer");
  const children = scene[scene[binding.pageHost.__id__]._parent.__id__]._children;
  assert(children.findIndex((ref: any) => ref.__id__ === binding.startupHost.__id__) > children.findIndex((ref: any) => ref.__id__ === binding.pageHost.__id__), "loading layer covers page host");
  console.log("startup-check passed: task/data gates, real progress, failure/cancel, reused loading/fade, paint readiness, stale transitions and shutdown cleanup");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
