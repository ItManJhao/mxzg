/** 启动、取消、独立提示与资源结束后的行为检查；渲染仍由Creator验收。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { director, Director, Node, UIOpacity } from "cc";
import { runStartup, StartupCancelled } from "../assets/scripts/app/remake/StartupFlow";
import { RemakeApp } from "../assets/scripts/app/remake/RemakeApp";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { playLogoSplash, LOGO_BGM } from "../assets/scripts/app/remake/logoSplash";
import { resources, AudioClip, AudioSource } from "cc";
import { ApplicationNotice } from "../assets/scripts/app/remake/ApplicationNotice";
import { TrackedTimers } from "../assets/scripts/framework/TrackedTimers";
import { Label } from "cc";
import { DevelopmentPreview } from "../assets/scripts/app/remake/DevelopmentPreview";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { BootChrome } from "../assets/scripts/app/remake/bootChrome";

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

  const ui = UIManager.instance;
  let delivered = "";
  const oldNotice = ui.bindNotice(() => { throw new Error("旧绑定应被替换"); });
  const newNotice = ui.bindNotice(text => { delivered = text; });
  oldNotice(); ui.toast("无导航也能提示");
  assert.equal(delivered, "无导航也能提示"); newNotice();
  const timerBaseline = TrackedTimers.snapshot();
  const noticeNode = new Node("ApplicationNotice");
  const noticeLabel = noticeNode.addComponent(Label);
  const notices = new ApplicationNotice(noticeNode, noticeLabel);
  for (let cycle = 0; cycle < 20; cycle++) {
    notices.show("登录前可见");
    assert.equal(noticeNode.active, true);
    assert.equal(noticeLabel.string, "登录前可见");
    assert.equal(TrackedTimers.snapshot(), timerBaseline + 1);
    notices.show("替换提示");
    assert.equal(TrackedTimers.snapshot(), timerBaseline + 1, "替换提示不叠加计时器");
    notices.dispose(); notices.dispose();
    assert.equal(TrackedTimers.snapshot(), timerBaseline);
  }
  notices.show("常驻错误", 0);
  assert.equal(TrackedTimers.snapshot(), timerBaseline);
  notices.dispose(); noticeNode.destroy();

  const originalLoad = resources.load;
  const pendingAssets: Array<{ path: string; done: Function }> = [];
  resources.load = ((path: string, _type: unknown, done: Function) => pendingAssets.push({ path, done })) as typeof resources.load;
  const splashParent = new Node("SplashHost"), audioHost = new Node("AudioHost");
  const splash = playLogoSplash(splashParent, audioHost);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  splash.stopMusic(); splash.stop(); splash.stopMusic();
  const lateClip = new AudioClip();
  for (const row of pendingAssets) row.done(row.path === LOGO_BGM ? null : new Error("cancelled fixture"), row.path === LOGO_BGM ? lateClip : null);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(audioHost.getComponent(AudioSource), null, "停止音乐后迟到加载不能创建或启动音源");
  assert.equal(lateClip.refCount, 0, "迟到音频交还引擎");
  assert.equal(TrackedTimers.snapshot(), timerBaseline, "取消logo后没有遗留淡入/等待计时器");
  resources.load = originalLoad; splashParent.destroy(); audioHost.destroy();

  // 第一场取消后迟到失败，不能把已被第二场隐藏的主城再次显示；不模拟战斗渲染。
  const battleHost = new Node("BattleHost"), home = new Node("Home"); home.parent = battleHost;
  const preview = new DevelopmentPreview(battleHost, null, () => true);
  const originalOpen = BattleReplayPreview.open;
  let rejectFirst!: (error: Error) => void;
  let attempts = 0, disposed = 0;
  BattleReplayPreview.open = async () => {
    if (++attempts === 1) return await new Promise<() => void>((_, reject) => { rejectFirst = reject; });
    return () => { disposed++; };
  };
  try {
    const result = { mission: 1, assetRevision: 1, lineupVersion: 1, formationId: 1, pending: [], bytes: new Uint8Array() };
    const first = preview.openLineupBattle(result);
    assert.equal(home.active, false);
    preview.cancelReplay(); assert.equal(home.active, true);
    await preview.openLineupBattle(result); assert.equal(home.active, false);
    rejectFirst(new Error("first cancelled"));
    await assert.rejects(first, /first cancelled/);
    assert.equal(home.active, false, "迟到失败不得恢复第二场背后的主城");
    preview.cancelReplay(); preview.cancelReplay();
    assert.equal(home.active, true); assert.equal(disposed, 1);
  } finally { BattleReplayPreview.open = originalOpen; battleHost.destroy(); }

  const scene = JSON.parse(readFileSync("client/assets/scenes/Remake.scene", "utf8"));
  const binding = scene.find((row: any) => row.loadingPrefab && row.socketUrl);
  assert(binding.pageHost && binding.startupHost && binding.loadingPrefab);
  assert(binding.noticePanel && binding.noticeLabel, "提示静态绑定在场景，不依赖主城");
  const accountMeta = JSON.parse(readFileSync("client/assets/bundles/login/prefabs/AccountLoginView.prefab.meta", "utf8"));
  const legacyMeta = JSON.parse(readFileSync("client/assets/bundles/legacy-login/prefabs/LoginPanel.prefab.meta", "utf8"));
  assert.equal(binding.loginPrefab, undefined, "启动场景不直接依赖远程登录页");
  assert.notEqual(accountMeta.uuid, legacyMeta.uuid, "old login is a separate compatibility reference");
  assert.equal(binding.homePrefab, undefined, "scene must not eagerly reference the lazy home feature");
  const layer = JSON.parse(readFileSync("client/assets/bundles/bootstrap/prefabs/LoadingLayer.prefab.meta", "utf8"));
  assert.equal(binding.loadingPrefab.__uuid__, layer.uuid, "reuse existing LoadingLayer");
  const children = scene[scene[binding.pageHost.__id__]._parent.__id__]._children;
  assert(children.findIndex((ref: any) => ref.__id__ === binding.startupHost.__id__) > children.findIndex((ref: any) => ref.__id__ === binding.pageHost.__id__), "loading layer covers page host");
  console.log("startup-check passed: task/data gates, real progress, failure/cancel, reused loading/fade, paint readiness, stale transitions and shutdown cleanup");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
