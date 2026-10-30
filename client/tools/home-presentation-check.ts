import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, JsonAsset, Label, Node, Prefab, resources } from "cc";
import { RemakeHomeView } from "../assets/scripts/features/home/ui/RemakeHomeView";
import { CityHubView } from "../assets/scripts/features/city/ui/CityHubView";
import { CityChromeView } from "../assets/scripts/features/city/ui/CityChromeView";

class CityFixture extends CityHubView {
  closedCount = 0; disposedCount = 0; refreshCount = 0;
  onOpen(): void { this.beginOpen(); }
  completeLoading(): void { this.finishOpen(); }
  refreshLocks(): void { this.refreshCount++; }
  onClose(): void { this.closedCount++; }
  dispose(): void { this.disposedCount++; }
}
class ChromeFixture extends CityChromeView {
  closedCount = 0; disposedCount = 0;
  identity = ""; currencies: string[] = []; level = ""; power = ""; tabs: any[] = [];
  onOpen(): void {}
  setIdentity(name: string): void { this.identity = name; }
  setCurrencies(gold: string, diamonds: string): void { this.currencies = [gold, diamonds]; }
  setLevelBadge(level: string): void { this.level = level; }
  setPower(power: string): void { this.power = power; }
  setAvatar(): void {}
  setCityExtras(): void {}
  setTabs(tabs: any[]): void { this.tabs = tabs; }
  onClose(): void { this.closedCount++; }
  dispose(): void { this.disposedCount++; }
}
function fixture() {
  const home = new Node("Home").addComponent(RemakeHomeView);
  const cityNode = new Node("CityHub"); const city = cityNode.addComponent(CityFixture);
  const chromeNode = new Node("CityChrome"); const chrome = chromeNode.addComponent(ChromeFixture);
  home.cityPrefab = { _instantiate: () => cityNode } as unknown as Prefab;
  home.chromePrefab = { _instantiate: () => chromeNode } as unknown as Prefab;
  home.cityHost = new Node("CityMapHost"); home.chromeHost = new Node("CityChromeHost");
  home.profileLabel = new Node("Profile").addComponent(Label);
  home.logoutButton = new Node("Logout").addComponent(Button);
  home.accountButton = new Node("Account").addComponent(Button);
  home.accountPanel = new Node("AccountPanel"); home.accountPanel.active = false;
  home.noticeLabel = new Node("Notice").addComponent(Label);
  home.noticePanel = new Node("NoticePanel"); home.noticePanel.active = false;
  return { home, city, chrome };
}
async function main() {
  resources.load = (path: string, _type: unknown, done: Function) => {
    const asset = new JsonAsset();
    asset.json = JSON.parse(readFileSync(`client/assets/resources/${path}.json`, "utf8"));
    done(null, asset);
  };
  const { home, city, chrome } = fixture();
  let logouts = 0;
  const unbind = home.bind({ logout: () => { logouts++; }, openFeature: () => {} });
  home.runOpen();
  home.render({ busy: false, error: "", role: { id: "role-id", nickname: "玩家甲", level: 7, gold: 0, diamonds: 123 } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(chrome.identity, "玩家甲");
  assert.deepEqual(chrome.currencies, ["0", "123"], "zero is real data, not an unavailable placeholder");
  assert.equal(chrome.level, "7"); assert.equal(chrome.power, "", "do not invent power");
  assert(chrome.tabs.every(tab => tab.state === (tab.id === "city" ? "selected" : "locked")));
  city.completeLoading(); await home.whenReady();
  const featureUnbind = home.bind({ logout: () => { logouts++; }, openFeature: () => {}, heroAvailable: true });
  assert.equal(chrome.tabs.find(tab => tab.id === "hero").state, "open");
  home.showFeature("hero");
  assert.equal(home.featureHost, home.cityHost);
  assert.equal(city.node.active, false, "feature hides only the city, preserving shared chrome");
  assert.equal(chrome.tabs.find(tab => tab.id === "hero").state, "selected");
  assert.equal(chrome.tabs.find(tab => tab.id === "city").state, "open");
  home.showFeature("city"); assert.equal(city.node.active, true);
  featureUnbind();
  home.accountButton!.node.emit(Button.EventType.CLICK);
  assert.equal(home.accountPanel!.active, true);
  home.showNotice("该功能暂未开放"); assert.equal(home.noticePanel!.active, true);
  home.logoutButton!.node.emit(Button.EventType.CLICK); assert.equal(logouts, 1);
  unbind(); home.logoutButton!.node.emit(Button.EventType.CLICK); assert.equal(logouts, 1);
  home.runDispose(); home.onDestroy();
  assert.equal(city.closedCount, 1); assert.equal(city.disposedCount, 1);
  assert.equal(chrome.closedCount, 1); assert.equal(chrome.disposedCount, 1);

  const slow = fixture(); slow.home.runOpen();
  const cancelled = assert.rejects(slow.home.whenReady(), /页面已关/);
  slow.home.runDispose(); await cancelled;
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(slow.city.disposedCount, 0, "closing during config loading prevents child instantiation entirely");
  assert.equal(slow.home.cityHost!.children.length, 0);

  const prefab = JSON.parse(readFileSync("client/assets/bundles/remake-home/RemakeHome.prefab", "utf8"));
  const binding = prefab.find((row: any) => row.cityPrefab && row.chromePrefab);
  assert(binding, "existing city Prefabs are serialized references, not copied layouts");
  for (const [key, name] of [["cityPrefab", "CityHub"], ["chromePrefab", "CityChrome"]]) {
    const meta = JSON.parse(readFileSync(`client/assets/prefabs/ui/city/${name}.prefab.meta`, "utf8"));
    assert.equal(binding[key].__uuid__, meta.uuid);
  }
  const config = JSON.parse(readFileSync("client/settings/v2/packages/project.json", "utf8"));
  assert.deepEqual(config.general.designResolution, { width: 640, height: 1280, fitWidth: false, fitHeight: true });
  const citySource = readFileSync("client/assets/scripts/features/city/ui/CityHubView.ts", "utf8");
  assert(!/\b(?:async\s+)?start\s*\(/.test(citySource), "view initialization must not collide with engine start");
  console.log("home-presentation-check passed: canonical city/HUD assets, live role values, unavailable entries, close/cancel cleanup, resolution baseline and no duplicate engine start");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
