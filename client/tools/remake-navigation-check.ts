import { strict as assert } from "node:assert";
import { Node, Prefab } from "cc";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { UIManager, isOpenCancelled } from "../assets/scripts/framework/ui/UIManager";
import { registerView, viewCtorById } from "../assets/scripts/framework/ui/UIRegistry";
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

async function main() {
  const ui = new UIManager();
  const parent = new Node("Canvas");
  const nav = new RemakeNavigation(ui, parent);
  ui.install(nav, { showToast: () => {} });
  const counters = new Map<string, { created: number; shown: number; closed: number }>();
  const hosts = new Map<string, Node>();
  function register(ctor: new () => BaseView, id: string, load: () => Promise<Prefab> = async () => new Prefab(), throwOnShow = false, resident = false) {
    const count = { created: 0, shown: 0, closed: 0 }; counters.set(id, count);
    registerView(ctor, { id, prefab: "prefabs/test/" + id, layer: resident ? UILayer.Popup : UILayer.Page,
      cache: false, allowMultiple: false, hostId: resident ? "popup" : undefined, load,
      mount: shell => { const node = new Node(id); node.parent = shell; node.addComponent(ctor); hosts.set(id, node); return node; },
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

  let finish!: (prefab: Prefab) => void;
  register(SlowFixture, "test-remake-slow", () => new Promise(resolve => { finish = resolve; }));
  const pending = ui.open(SlowFixture);
  ui.keepOnly("test-remake-home");
  finish(new Prefab());
  await assert.rejects(pending, isOpenCancelled);
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
  assert.throws(() => registerView(LoginFixture, { id: "second-id", prefab: "unused", layer: UILayer.Page, cache: false, allowMultiple: false }), /多个页面/);
  const unregisterOld = registerView(LoginFixture, { id: "test-remake-login", prefab: "old", layer: UILayer.Page, cache: false, allowMultiple: false });
  const unregisterCurrent = registerView(LoginFixture, { id: "test-remake-login", prefab: "current", layer: UILayer.Page, cache: false, allowMultiple: false });
  unregisterOld(); assert.equal(viewCtorById("test-remake-login"), LoginFixture, "old application cleanup must not unregister the new owner");
  unregisterCurrent(); assert.equal(viewCtorById("test-remake-login"), null);

  let slot: Node | null = null;
  const changes: Array<string | null> = [];
  const featureNav = new RemakeNavigation(ui, parent, {
    parent: id => id === "test-remake-feature" ? slot : null,
    changed: id => { changes.push(id); },
  });
  ui.install(featureNav, { showToast: () => {} });
  const keptHome = register(HomeFixture, "test-remake-home");
  const feature = register(FeatureFixture, "test-remake-feature");
  register(LoginFixture, "test-remake-login");
  await ui.open(HomeFixture);
  const keptHomeNode = hosts.get("test-remake-home")!;
  slot = new Node("MiddleContent"); slot.parent = keptHomeNode;
  await ui.open(FeatureFixture);
  assert.equal(hosts.get("test-remake-feature")!.parent!.parent, slot);
  assert(ui.isOpen("test-remake-home") && keptHomeNode.isValid);
  assert.equal(keptHome.closed, 0, "feature keeps the shared home and HUD controller alive");
  assert.equal(featureNav.back(), true);
  assert.equal(feature.closed, 1); assert.equal(keptHome.closed, 0);
  assert.equal(featureNav.current, "test-remake-home");
  assert.equal(featureNav.back(), false, "home cannot return to a previous session");
  await ui.open(FeatureFixture);
  await ui.open(LoginFixture);
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
  await assert.rejects(cancelledFeature, isOpenCancelled);
  assert.equal(featureNav.current, "test-remake-home"); assert.equal(slowFeature.closed, 1);
  register(FeatureFixture, "test-remake-feature");
  await ui.open(FeatureFixture); featureNav.dispose();
  assert.equal(parent.children.length, 0, "application disposal removes feature and root hosts");

  const model = new AccountModel();
  const service = new AccountService(model, { developmentLogin: async () => { throw new Error("not used"); }, currentRole: async () => { throw new Error("not used"); } }, { read: () => null, write: () => {}, clear: () => {} });
  let renders = 0; let actions: HomeActions | null = null;
  let notice = "";
  const controller = new HomeController(model, service, { bind: callbacks => { actions = callbacks; return () => { actions = null; }; }, render: () => { renders++; }, showNotice: text => { notice = text; } });
  model.replace({ busy: false, role: { id: "one", nickname: "one", level: 1, gold: 0, diamonds: 0 }, error: "" });
  controller.show(); controller.show(); assert.equal(renders, 1);
  assert(actions);
  (actions as HomeActions).openFeature("hero"); assert.equal(notice, "该功能暂未开放");
  (actions as HomeActions).openFeature("city"); assert.equal(notice, "");
  (actions as HomeActions).logout(); assert.equal(model.snapshot.role, null);
  controller.close(); const closedRenders = renders;
  model.replace({ busy: false, role: null, error: "later" }); assert.equal(renders, closedRenders);
  assert.equal(actions, null);

  const picked: string[] = [];
  const enabled = new HomeController(model, service, { bind: callbacks => { actions = callbacks; return () => { actions = null; }; },
    render: () => {}, showNotice: text => { notice = text; } }, id => {
      if (id !== "hero" && id !== "city") return false;
      picked.push(id); return true;
    });
  enabled.show();
  assert((actions as HomeActions).heroAvailable);
  (actions as HomeActions).openFeature("hero"); assert.deepEqual(picked, ["hero"]);
  (actions as HomeActions).openFeature("bag"); assert.equal(notice, "该功能暂未开放");
  enabled.close();

  const assets = join(process.cwd(), "client/assets");
  const prefab = JSON.parse(readFileSync(join(assets, "bundles/remake-home/RemakeHome.prefab"), "utf8"));
  const view = prefab.find((row: Record<string, unknown>) => row.logoutButton && row.profileLabel);
  assert.equal(prefab[view.profileLabel.__id__].__type__, "cc.Label");
  assert.equal(prefab[view.logoutButton.__id__].__type__, "cc.Button");
  const scene = JSON.parse(readFileSync(join(assets, "scenes/Remake.scene"), "utf8"));
  assert(scene.some((row: Record<string, unknown>) => row.loginPrefab && row.apiBaseUrl));
  console.log("remake-navigation-check passed: explicit registration, shared UIManager, controller cleanup, replacement, failure/cancellation, logout and Prefab bindings");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
