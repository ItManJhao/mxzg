/** 应用导航回归：检查替换、缓存复用、注销清空及异步取消，不连接游戏服务器。 */
import { strict as assert } from "node:assert";
import { Node, Prefab } from "cc";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { GameLog } from "../assets/scripts/core/GameLog";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { RemakeNavigation } from "../assets/scripts/app/remake/RemakeNavigation";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { HomeController, HomeActions } from "../assets/scripts/features/home/HomeController";
import { readFileSync } from "node:fs";
import { join } from "node:path";

class LoginFixture extends BaseView {}
class HomeFixture extends BaseView {}
class FailedFixture extends BaseView {}
class SlowFixture extends BaseView {}
class ThrowingFixture extends BaseView {}
class ResidentFixture extends BaseView {}
class FeatureFixture extends BaseView {}
class PreparedFixture extends BaseView {}
class PreparingFixture extends BaseView {}

/** 换号先关页的真实导航回归：动画中的功能页立即退订，缓存及迟到开窗不得保留旧页面。 */
async function checkIdentityCleanup(): Promise<void> {
  const ui = new UIManager();
  const root = new Node("IdentityCanvas");
  const content = new Node("HomeContent");
  let listening = false;
  let animations = 0;
  let stopped = 0;
  class IdentityHome extends BaseView {}
  class IdentityFeature extends BaseView {
    /** 模拟页面已经订阅Model，关闭必须在下一次数据重置前解除。 */
    onOpen(): void { listening = true; }
    /** 用可观察的订阅状态验证同步关页，不检查框架内部实现。 */
    onClose(): void { listening = false; }
  }
  class IdentityPopup extends BaseView {}
  const nav = new RemakeNavigation(ui, root, {
    parent: id => id === "identity-feature" ? root : null,
    content: () => content,
    changed: () => {},
  }, (_from, _to, _fromId, _toId, done) => {
    animations++;
    return () => { stopped++; done(); };
  });
  ui.install(nav, { showToast: () => {} });
  const prefab = (ctor: new () => BaseView) => Object.assign(new Prefab(), {
    _instantiate: () => { const node = new Node("IdentityPage"); node.addComponent(ctor); return node; },
  });
  const unregister = [
    UIRegistry.registerView(IdentityHome, { id: "identity-home", prefab: "test", layer: UILayer.Page,
      cache: false, allowMultiple: false, load: async () => prefab(IdentityHome) }),
    UIRegistry.registerView(IdentityFeature, { id: "identity-feature", prefab: "test", layer: UILayer.Page,
      cache: true, allowMultiple: false, load: async () => prefab(IdentityFeature) }),
  ];
  await ui.open(IdentityHome);
  const feature = await ui.open(IdentityFeature);
  assert.equal(listening, true);
  assert.equal(animations, 1, "普通切页仍播放动画");
  ui.invalidatePending();
  assert.equal(nav.back(false), true);
  assert.equal(stopped, 1, "身份变化先结束上一段动画");
  assert.equal(animations, 1, "身份变化不再启动返回动画");
  assert.equal(listening, false, "Model清空之前页面已经退订");
  assert.equal(content.active, true, "立即返回恢复主城内容");
  ui.clearCached();
  assert.equal(feature.node.isValid, false, "旧身份闲置实例同步销毁");
  let finishPopup!: (value: Prefab) => void;
  ui.setResidentHost("identity-modal", () => root);
  unregister.push(UIRegistry.registerView(IdentityPopup, { id: "identity-popup", prefab: "test", layer: UILayer.Popup,
    hostId: "identity-modal", cache: false, allowMultiple: false,
    load: () => new Promise(resolve => { finishPopup = resolve; }) }));
  const opening = ui.open(IdentityPopup);
  ui.closeById("identity-popup");
  finishPopup(prefab(IdentityPopup));
  await assert.rejects(opening, UIManager.isOpenCancelled);
  assert.equal(ui.snapshot().residents, 0, "迟到的旧身份弹窗不得重新出现");
  nav.dispose();
  for (const stop of unregister) stop();
  content.destroy();
  root.destroy();
}

async function main() {
  await checkIdentityCleanup();
  const ui = new UIManager();
  const parent = new Node("Canvas");
  const nav = new RemakeNavigation(ui, parent);
  ui.install(nav, { showToast: () => {} });
  const counters = new Map<string, { created: number; shown: number; closed: number }>();
  const hosts = new Map<string, Node>();
  /** 返回生命周期计数；夹具只提供可实例化Prefab，挂载与拥有者保护走生产spawn路径。 */
  function register(ctor: new () => BaseView, id: string, load: () => Promise<Prefab> = async () => new Prefab(), throwOnShow = false, resident = false, cache = false,
    prepare?: () => Promise<void>) {
    const count = { created: 0, shown: 0, closed: 0 }; counters.set(id, count);
    /** 保留注入加载器的失败/取消时序，成功时由引擎替身实例化真实View节点。 */
    async function loadFixturePrefab(): Promise<Prefab> {
      const prefab = await load();
      return Object.assign(prefab, {
        _instantiate: () => {
          const node = new Node(id);
          node.addComponent(ctor);
          hosts.set(id, node);
          return node;
        },
      });
    }
    UIRegistry.registerView(ctor, { id, prefab: "prefabs/test/" + id, layer: resident ? UILayer.Popup : UILayer.Page,
      cache, allowMultiple: false, hostId: resident ? "popup" : undefined, load: loadFixturePrefab, prepare,
      createController: () => { count.created++; return {
        show: () => { count.shown++; if (throwOnShow) throw new Error("Controller initialization failed"); },
        close: () => { count.closed++; },
      }; },
    });
    return count;
  }
  const login = register(LoginFixture, "test-remake-login");
  const home = register(HomeFixture, "test-remake-home");
  await ui.open(LoginFixture);
  const originalLoginHost = hosts.get("test-remake-login")!;
  await ui.open(LoginFixture);
  assert.equal(login.created, 1, "repeated open does not create a second controller");
  await ui.open(HomeFixture);
  assert.equal(nav.current, "test-remake-home");
  assert.equal(login.closed, 1);
  assert.equal(originalLoginHost.isValid, false);
  assert.equal(parent.children.length, 1);
  const originalHomeHost = hosts.get("test-remake-home")!;

  register(FailedFixture, "test-remake-failed", async () => { throw new Error("Prefab load failed"); });
  await assert.rejects(ui.open(FailedFixture), /Prefab load failed/);
  assert.equal(nav.current, "test-remake-home");
  assert(originalHomeHost.isValid, "a failed next page preserves the existing visible page");

  let preparedLoads = 0;
  register(PreparedFixture, "test-config-failed", async () => { preparedLoads++; return new Prefab(); },
    false, false, false, async () => { throw new Error("page configuration failed"); });
  await assert.rejects(ui.open(PreparedFixture), /page configuration failed/);
  assert.equal(preparedLoads, 0, "页面配置失败不下载Prefab，不实例化Controller");
  assert.equal(counters.get("test-config-failed")!.created, 0);
  assert.equal(nav.current, "test-remake-home");
  assert(originalHomeHost.isValid, "配置失败保留当前页");

  let finishConfiguration!: () => void;
  register(PreparingFixture, "test-config-cancelled", async () => { preparedLoads++; return new Prefab(); },
    false, false, false, () => new Promise(resolve => { finishConfiguration = resolve; }));
  const preparing = ui.open(PreparingFixture);
  const cancelledPreparation = assert.rejects(preparing, UIManager.isOpenCancelled);
  ui.keepOnly("test-remake-home");
  finishConfiguration();
  await cancelledPreparation;
  assert.equal(preparedLoads, 0, "配置等待期间取消后不继续下载页面");
  assert.equal(counters.get("test-config-cancelled")!.created, 0);
  assert.equal(nav.current, "test-remake-home");

  let finish!: (prefab: Prefab) => void;
  register(SlowFixture, "test-remake-slow", () => new Promise(resolve => { finish = resolve; }));
  const pending = ui.open(SlowFixture);
  ui.keepOnly("test-remake-home");
  finish(new Prefab());
  await assert.rejects(pending, UIManager.isOpenCancelled);
  assert.equal(counters.get("test-remake-slow")!.closed, 1, "cancelled controller unsubscribes");
  assert.equal(hosts.get("test-remake-slow")!.isValid, false);
  assert.equal(nav.current, "test-remake-home");

  const broken = register(ThrowingFixture, "test-remake-throwing", undefined, true);
  await assert.rejects(ui.open(ThrowingFixture), /Controller initialization failed/);
  assert.equal(broken.closed, 1, "a show failure cleans up partially initialized controllers");
  assert.equal(hosts.get("test-remake-throwing")!.isValid, false);

  const popup = new Node("PopupHost");
  ui.setResidentHost("popup", () => popup);
  const resident = register(ResidentFixture, "test-remake-resident", undefined, false, true);
  await ui.open(ResidentFixture);
  ui.closeById("test-remake-resident");
  assert.equal(resident.created, 1); assert.equal(resident.closed, 1);
  assert.equal(nav.current, "test-remake-home");

  nav.dispose();
  assert.equal(home.closed, 1);
  assert.equal(parent.children.length, 0);
  await assert.rejects(ui.open(LoginFixture), /页面栈/);
  assert.throws(() => UIRegistry.registerView(LoginFixture, { id: "second-id", prefab: "unused", layer: UILayer.Page, cache: false, allowMultiple: false }), /多个页面/);
  const unregisterOld = UIRegistry.registerView(LoginFixture, { id: "test-remake-login", prefab: "old", layer: UILayer.Page, cache: false, allowMultiple: false });
  const unregisterCurrent = UIRegistry.registerView(LoginFixture, { id: "test-remake-login", prefab: "current", layer: UILayer.Page, cache: false, allowMultiple: false });
  unregisterOld(); assert.equal(UIRegistry.viewCtorById("test-remake-login"), LoginFixture, "old application cleanup must not unregister the new owner");
  unregisterCurrent(); assert.equal(UIRegistry.viewCtorById("test-remake-login"), null);

  let slot: Node | null = null;
  const changes: Array<string | null> = [];
  const featureNav = new RemakeNavigation(ui, parent, {
    parent: id => id === "test-remake-feature" ? slot : null,
    changed: id => { changes.push(id); },
  });
  ui.install(featureNav, { showToast: () => {} });
  const keptHome = register(HomeFixture, "test-remake-home");
  const feature = register(FeatureFixture, "test-remake-feature", undefined, false, false, true);
  register(LoginFixture, "test-remake-login");
  await ui.open(HomeFixture);
  const keptHomeNode = hosts.get("test-remake-home")!;
  slot = new Node("MiddleContent"); slot.parent = keptHomeNode;
  await ui.open(FeatureFixture);
  assert.equal(hosts.get("test-remake-feature")!.parent!.parent, slot);
  assert(ui.isOpen("test-remake-home") && keptHomeNode.isValid);
  assert.equal(keptHome.closed, 0, "feature keeps the shared home and HUD controller alive");
  const cachedFeature = hosts.get("test-remake-feature")!;
  assert.equal(featureNav.back(), true);
  assert(cachedFeature.isValid, "实际导航不能销毁已缓存功能页");
  assert.equal(ui.snapshot().cached, 1);
  assert.equal(feature.closed, 1); assert.equal(keptHome.closed, 0);
  assert.equal(featureNav.current, "test-remake-home");
  assert.equal(featureNav.back(), false, "home cannot return to a previous session");
  await ui.open(FeatureFixture);
  assert.equal(hosts.get("test-remake-feature"), cachedFeature, "重新打开复用原实例");
  assert.equal(cachedFeature.parent!.active, true, "缓存宿主重开恢复激活");
  await ui.open(LoginFixture);
  assert.equal(ui.snapshot().cached, 0, "根页面替换清空旧会话缓存");
  assert.equal(cachedFeature.isValid, false);
  assert.equal(feature.closed, 2); assert.equal(keptHome.closed, 1, "logout disposes both feature and home");
  assert.equal(featureNav.current, "test-remake-login");
  assert.equal(parent.children.length, 1);
  assert(changes.includes("test-remake-feature") && changes[changes.length - 1] === null);
  await ui.open(HomeFixture);
  slot = new Node("NextMiddleContent"); slot.parent = hosts.get("test-remake-home")!;
  let finishFeature!: (prefab: Prefab) => void;
  const slowFeature = register(FeatureFixture, "test-remake-feature", () => new Promise(resolve => { finishFeature = resolve; }));
  const cancelledFeature = ui.open(FeatureFixture);
  ui.keepOnly("test-remake-home"); finishFeature(new Prefab());
  await assert.rejects(cancelledFeature, UIManager.isOpenCancelled);
  assert.equal(featureNav.current, "test-remake-home"); assert.equal(slowFeature.closed, 1);
  register(FeatureFixture, "test-remake-feature");
  await ui.open(FeatureFixture); featureNav.dispose();
  assert.equal(parent.children.length, 0, "application disposal removes feature and root hosts");

  // 独立导航验证闲置时长和数量上限，不等待真实两分钟。
  const cacheUi = new UIManager();
  const cacheRoot = new Node("CacheRoot");
  const cacheNav = new RemakeNavigation(cacheUi, cacheRoot, {
    parent: id => id.startsWith("cache-") ? cacheRoot : null,
    changed: () => {},
  });
  cacheUi.install(cacheNav, { showToast: () => {} });
  class CacheRootView extends BaseView {}
  UIRegistry.registerView(CacheRootView, { id: "cache-root", prefab: "test", layer: UILayer.Page,
    cache: false, allowMultiple: false,
    load: async () => Object.assign(new Prefab(), {
      _instantiate: () => {
        const node = new Node("Root");
        node.addComponent(CacheRootView);
        return node;
      },
    }),
  });
  await cacheUi.open(CacheRootView);
  const instances: BaseView[] = [];
  for (let i = 0; i < 3; i++) {
    class CachedView extends BaseView {}
    UIRegistry.registerView(CachedView, { id: "cache-" + i, prefab: "test", layer: UILayer.Page,
      cache: true, allowMultiple: false,
      load: async () => Object.assign(new Prefab(), {
        _instantiate: () => {
          const node = new Node("Cached");
          node.addComponent(CachedView);
          return node;
        },
      }),
    });
    const instance = await cacheUi.open(CachedView);
    instances.push(instance);
    if (i === 0) assert.equal(cacheUi.collectCached(GameLog.monoNow() + UIManager.cacheIdleMs), 0);
    assert(instance.node.isValid, "在屏幕上的实例不受闲置清理影响");
    cacheNav.back();
  }
  assert.equal(cacheUi.snapshot().cached, UIManager.maxCachedPages, "闲置页面不超过数量上限");
  assert(!instances[0].node.isValid, "超过上限先淘汰最早关闭的页面");
  assert(instances[1].node.isValid && instances[2].node.isValid);
  assert.equal(cacheUi.collectCached(GameLog.monoNow() + UIManager.cacheIdleMs), 2);
  assert.equal(cacheUi.snapshot().cached, 0);
  for (const instance of instances) assert(!instance.node.isValid, "过期界面节点被销毁");
  cacheNav.dispose();

  const model = new AccountModel();
  const service = new AccountService(model, { developmentLogin: async () => { throw new Error("not used"); }, currentRole: async () => { throw new Error("not used"); } }, { read: () => null, write: () => {}, clear: () => {} });
  let renders = 0; let actions: HomeActions | null = null;
  let notice = "";
  const controller = new HomeController(model, service, { bind: callbacks => { actions = callbacks; return () => { actions = null; }; }, render: () => { renders++; }, showNotice: text => { notice = text; } });
  model.replace({ busy: false, role: { id: "one", nickname: "one", level: 1, gold: 0, diamonds: 0 }, error: "" });
  controller.show(); controller.show(); assert.equal(renders, 1);
  assert(actions);
  (actions as HomeActions).openFeature("hero"); assert.equal(notice, "该模块暂停，待登录和背包完善后按原项目重做");
  (actions as HomeActions).openFeature("city"); assert.equal(notice, "");
  (actions as HomeActions).logout(); assert.equal(model.snapshot.role, null);
  controller.close(); const closedRenders = renders;
  model.replace({ busy: false, role: null, error: "later" }); assert.equal(renders, closedRenders);
  assert.equal(actions, null);

  const picked: string[] = [];
  const enabled = new HomeController(model, service, { bind: callbacks => { actions = callbacks; return () => { actions = null; }; },
    render: () => {}, showNotice: text => { notice = text; } }, id => {
      if (id !== "bag" && id !== "city" && id !== "hero") return false;
      picked.push(id); return true;
    });
  enabled.show();
  assert.equal((actions as HomeActions).heroAvailable,true);
  (actions as HomeActions).openFeature("bag"); assert.deepEqual(picked, ["bag"]);
  (actions as HomeActions).openFeature("hero"); assert.deepEqual(picked,["bag","hero"]);
  enabled.close();

  const assets = join(process.cwd(), "client/assets");
  const prefab = JSON.parse(readFileSync(join(assets, "bundles/module/home/prefabs/RemakeHomeView.prefab"), "utf8"));
  const view = prefab.find((row: Record<string, unknown>) => row.cityHost && row.chromeHost);
  assert.equal(view.noticeLabel, undefined, "主城操作反馈统一使用全局飘字");
  assert.equal(view.noticePanel, undefined, "主城不再保留独立提示面板");
  assert.equal(prefab[view.cityHost.__id__].__type__, "cc.Node");
  const scene = JSON.parse(readFileSync(join(assets, "scenes/Remake.scene"), "utf8"));
  assert(scene.some((row: Record<string, unknown>) => row.loadingPrefab && row.socketUrl));
  console.log("remake-navigation-check passed: explicit registration, shared UIManager, controller cleanup, replacement, failure/cancellation, logout and Prefab bindings");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
