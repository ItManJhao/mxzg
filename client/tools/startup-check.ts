/** 启动、取消、独立提示与资源结束后的行为检查；渲染仍由Creator验收。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createdNodes, director, Director, Node, Overflow, UIOpacity, UITransform } from "cc";
import { StartupFlowUtils, StartupCancelled } from "../assets/scripts/app/remake/StartupFlowUtils";
import { RemakeApp } from "../assets/scripts/app/remake/RemakeApp";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { LogoSplashUtils, LOGO_BGM } from "../assets/scripts/app/remake/LogoSplashUtils";
import { resources, AudioClip, AudioSource } from "cc";
import { ToastManager } from "../assets/scripts/framework/ui/ToastManager";
import { TrackedTimers } from "../assets/scripts/framework/TrackedTimers";
import { Label } from "cc";
import { DevelopmentPreview } from "../assets/scripts/app/remake/DevelopmentPreview";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { BootChrome } from "../assets/scripts/app/remake/BootChrome";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
};
async function main() {
  const restore = deferred();
  const events: string[] = []; const ratios: number[] = [];
  let lateProgress!: (done: number, total: number) => void;
  const startup = StartupFlowUtils.runStartup([
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
  await assert.rejects(StartupFlowUtils.runStartup([
    { label: "required-config", weight: 1, run: async () => { throw new Error("missing core config"); } },
    { label: "page", weight: 1, run: async () => { opened = true; } },
  ], () => {}, () => true), /missing core config/);
  assert.equal(opened, false);
  let alive = true;
  await assert.rejects(StartupFlowUtils.runStartup([
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
  noticeNode.setPosition(0, -435, 0);
  const noticeBox = noticeNode.addComponent(UITransform);
  noticeBox.setContentSize(540, 54);
  const textNode = new Node("Notice");
  textNode.parent = noticeNode;
  const textBox = textNode.addComponent(UITransform);
  textBox.setContentSize(520, 50);
  const noticeLabel = textNode.addComponent(Label);
  // 用明确的引擎测量结果夹具验证背景撑高，不用字符估算冒充实际字体换行。
  noticeLabel.updateRenderData = (force = false) => {
    assert.equal(force, true);
    textBox.setContentSize(520, noticeLabel.string.includes("\n") ? 100 : 50);
  };
  const nodesBeforeToast = createdNodes.length;
  const notices = new ToastManager(noticeNode, noticeLabel);
  const opacity = noticeNode.getComponent(UIOpacity)!;
  for (let cycle = 0; cycle < 20; cycle++) {
    notices.show("登录前可见", 1000);
    assert.equal(noticeNode.active, true);
    assert.equal(noticeLabel.string, "登录前可见");
    assert.equal(opacity.opacity, 0, "首帧从透明开始淡入");
    notices.show("登录前可见", 1000);
    notices.show("后续提示", 1000);
    notices.show("后续提示", 1000);
    notices.update(0.18);
    assert.equal(opacity.opacity, 255);
    assert(noticeNode.position.y > -435, "淡入期间从场景原位置上浮");
    notices.update(0.72);
    assert(opacity.opacity > 0 && opacity.opacity < 255, "结束前逐步淡出");
    notices.update(0.11);
    assert.equal(noticeLabel.string, "后续提示", "当前和待播重复文字均不延长或重复播放");
    notices.update(2);
    assert.equal(noticeNode.active, false);
    assert.equal(noticeNode.position.y, -435);
    assert.equal(TrackedTimers.snapshot(), timerBaseline, "飘字仅由update推进，不创建计时器");
  }
  notices.show("当前提示", 1000);
  for (let index = 1; index <= 10; index++) {
    notices.show("排队" + index, 1000);
  }
  notices.update(1.01);
  assert.equal(noticeLabel.string, "排队4", "队列总上限八条，满时保留当前及最近七条");
  for (let index = 5; index <= 10; index++) {
    notices.update(1);
    assert.equal(noticeLabel.string, "排队" + index);
  }
  notices.update(1);
  assert.equal(noticeNode.active, false);
  notices.show("先前有限提示", 1000);
  notices.show("排队中的常驻错误", 0);
  notices.show("已进入队列的新结果", 1000);
  notices.update(1.01);
  assert.equal(noticeLabel.string, "已进入队列的新结果", "入队的常驻项也不能堵住更新结果");
  notices.update(1);
  const fullReason = "发放失败：精灵单次最多1000件。\n请减少数量后重试，原请求未写入任何实例。";
  notices.show(fullReason, 1000);
  assert.equal(noticeLabel.string, fullReason, "完整原因不截断、不被统一失败文案替换");
  assert.equal(noticeLabel.enableWrapText, true);
  assert.equal(noticeLabel.overflow, Overflow.RESIZE_HEIGHT);
  assert.equal(noticeBox.contentSize.width, 540, "宽度继续由场景控制");
  assert.equal(noticeBox.contentSize.height, 104, "背景按引擎测出的多行高度保留场景留白");
  notices.update(1.01);
  notices.show("常驻错误", 0);
  notices.update(100);
  assert.equal(noticeNode.active, true);
  notices.show("恢复成功", 1000);
  assert.equal(noticeLabel.string, "恢复成功", "新结果可替换常驻错误，不堵塞队列");
  assert.equal(noticeBox.contentSize.height, 54, "短文字恢复场景最小高度");
  notices.show("旧角色待播结果", 1000);
  notices.clear();
  notices.update(10);
  assert.equal(noticeNode.active, false, "换号清空旧角色当前和待播文字");
  assert.equal(noticeLabel.string, "");
  assert.equal(noticeNode.position.y, -435);
  assert.equal(opacity.opacity, 255);
  notices.show("新角色提示", 1000);
  assert.equal(noticeLabel.string, "新角色提示", "clear后下一角色仍可使用同一场景提示");
  notices.show("销毁前待播", 1000);
  notices.dispose();
  notices.dispose();
  notices.update(100);
  notices.show("销毁后迟到结果");
  assert.equal(noticeNode.active, false);
  assert.equal(noticeLabel.string, "");
  assert.equal(noticeBox.contentSize.height, 54);
  assert.equal(TrackedTimers.snapshot(), timerBaseline);
  assert.equal(createdNodes.length, nodesBeforeToast, "所有提示复用唯一场景节点，不能另造面板");
  noticeNode.destroy();
  const destroyedNotice = new Node("DestroyedNotice");
  const destroyedToast = new ToastManager(destroyedNotice, destroyedNotice.addComponent(Label));
  destroyedToast.show("宿主销毁前提示");
  destroyedNotice.destroy();
  assert.doesNotThrow(() => {
    destroyedToast.update(1);
    destroyedToast.dispose();
    destroyedToast.show("宿主销毁后迟到结果");
    assert.equal(TrackedTimers.snapshot(), timerBaseline);
  });

  const originalLoad = resources.load;
  const pendingAssets: Array<{ path: string; done: Function }> = [];
  resources.load = ((path: string, _type: unknown, done: Function) => pendingAssets.push({ path, done })) as typeof resources.load;
  const splashParent = new Node("SplashHost"), audioHost = new Node("AudioHost");
  const splash = LogoSplashUtils.playLogoSplash(splashParent, audioHost);
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
  for (const group of ["module", "resources"]) {
    const meta = JSON.parse(readFileSync("client/assets/bundles/" + group + ".meta", "utf8"));
    assert.equal(meta.userData.isBundle, false, "两个物理分组只组织源文件，不能新增Bundle：" + group);
  }
  const binding = scene.find((row: any) => row.loadingPrefab && row.socketUrl);
  assert(binding.pageHost && binding.startupHost && binding.loadingPrefab);
  assert(binding.noticePanel && binding.noticeLabel, "提示静态绑定在场景，不依赖主城");
  const accountMeta = JSON.parse(readFileSync("client/assets/bundles/module/login/prefabs/AccountLoginView.prefab.meta", "utf8"));
  const cleanup = JSON.parse(readFileSync("docs/validation/current-resource-scope-cleanup-20261111.json", "utf8"));
  assert.equal(binding.loginPrefab, undefined, "启动场景不直接依赖远程登录页");
  assert(!cleanup.removed.prefabs.some((row: { uuid: string }) => row.uuid === accountMeta.uuid), "正式登录Prefab不能误列入旧兼容资源删除范围");
  assert.equal(binding.homePrefab, undefined, "scene must not eagerly reference the lazy home feature");
  const layer = JSON.parse(readFileSync("client/assets/bundles/module/bootstrap/prefabs/LoadingLayer.prefab.meta", "utf8"));
  assert.equal(binding.loadingPrefab.__uuid__, layer.uuid, "reuse existing LoadingLayer");
  const children = scene[scene[binding.pageHost.__id__]._parent.__id__]._children;
  assert(children.findIndex((ref: any) => ref.__id__ === binding.startupHost.__id__) > children.findIndex((ref: any) => ref.__id__ === binding.pageHost.__id__), "loading layer covers page host");
  console.log("startup-check passed: task/data gates, real progress, failure/cancel, reused loading/fade, paint readiness, stale transitions and shutdown cleanup");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
