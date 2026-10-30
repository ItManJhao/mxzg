/**
 * 主城竖切的静态检查。不启动 Creator。
 * 核对开关、预制上的节点引用，以及框架没有写死主城。
 */
import { readFileSync } from "fs";
import { join } from "path";
import { cityViewFromSearch, setUseCityView, useCityView } from "../assets/scripts/features/city/config/CityFeatureFlag";
import { buildCityMapLayout, CITY_EDGE_BLEED, findCityNode, layerAnchorX, layerCoverX } from "../assets/scripts/ui/cityMapLayout";
import { BAR_SLIDE_MS, barIndex, barPageId, barSlideDir, expoOut, pageContentReady, selectedBarId, slideOffset, slideTravel, SlideCapture } from "../assets/scripts/ui/barSlide";
import { TAB_SELECTED_SCALE, tabPaintState, tabVisualScale } from "../assets/scripts/ui/cityTabScale";

const root = process.cwd();

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function classId(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  let out = hex.slice(0, 5);
  for (let i = 5; i < hex.length; i += 3) {
    const h1 = parseInt(hex[i], 16);
    const h2 = parseInt(hex[i + 1], 16);
    const h3 = parseInt(hex[i + 2], 16);
    out += BASE64[(h1 << 2) | (h2 >> 2)];
    out += BASE64[((h2 & 3) << 4) | h3];
  }
  return out;
}

function metaUuid(path: string): string {
  const meta = JSON.parse(read(path)) as { uuid?: string };
  if (!meta.uuid) throw new Error("缺少 uuid " + path);
  return meta.uuid;
}

interface PrefabObj {
  __type__?: string;
  _name?: string;
  _children?: { __id__?: number }[];
  _components?: { __id__?: number }[];
  node?: { __id__?: number };
}

function loadPrefab(path: string): PrefabObj[] {
  return JSON.parse(read(path)) as PrefabObj[];
}

function component(data: PrefabObj[], typeId: string): PrefabObj {
  for (let i = 0; i < data.length; i++) {
    if (data[i].__type__ === typeId) return data[i];
  }
  throw new Error("预制上没有组件 " + typeId);
}

function nodeAt(data: PrefabObj[], ref: { __id__?: number } | null | undefined): PrefabObj {
  if (!ref || typeof ref.__id__ !== "number") throw new Error("节点引用是空的");
  const node = data[ref.__id__];
  if (!node || node.__type__ !== "cc.Node" || !node._name) throw new Error("引用不是节点 " + ref.__id__);
  return node;
}

function nodeName(data: PrefabObj[], ref: { __id__?: number } | null | undefined): string {
  return nodeAt(data, ref)._name || "";
}

function parentName(data: PrefabObj[], ref: { __id__?: number } | null | undefined): string {
  const node = nodeAt(data, ref) as PrefabObj & { _parent?: { __id__?: number } };
  if (!node._parent || typeof node._parent.__id__ !== "number") return "";
  const parent = data[node._parent.__id__];
  return parent && parent._name ? parent._name : "";
}

function checkFlag(): void {
  assert(cityViewFromSearch("") === true, "empty search uses the new city view");
  assert(cityViewFromSearch("?city=old") === false, "city=old keeps the old city");
  assert(cityViewFromSearch("?city=0") === false, "city=0 keeps the old city");
  assert(cityViewFromSearch("?city=false") === false, "city=false keeps the old city");
  assert(cityViewFromSearch("?city=new") === true, "other city values stay on the new view");
  assert(cityViewFromSearch("?bag=old") === true, "bag flag does not turn the city off");
  assert(cityViewFromSearch("?foo=1&city=old") === false, "city=old is found among other params");
  setUseCityView(false);
  assert(useCityView() === false, "setUseCityView(false) sticks");
  setUseCityView(true);
  assert(useCityView() === true, "setUseCityView(true) sticks");
}

function checkFramework(): void {
  const files = [
    "client/assets/scripts/framework/ui/UIManager.ts",
    "client/assets/scripts/framework/ui/UIRegistry.ts",
    "client/assets/scripts/framework/ui/UILayer.ts",
    "client/assets/scripts/framework/ui/BaseView.ts",
    "client/assets/scripts/framework/ui/ViewClose.ts",
  ];
  const banned = ["CityHub", "CityChrome", "features/city", "BackpackView"];
  for (let i = 0; i < files.length; i++) {
    const text = read(files[i]);
    for (let j = 0; j < banned.length; j++) {
      assert(text.indexOf(banned[j]) < 0, files[i] + " mentions " + banned[j]);
    }
  }
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  assert(manager.indexOf("setResidentHost") >= 0, "UIManager can host a resident view");
  assert(manager.indexOf("openById") >= 0 && manager.indexOf("closeById") >= 0, "UIManager opens and closes by id");
  assert(manager.indexOf("back()") >= 0, "UIManager can go back");
  const layer = read("client/assets/scripts/framework/ui/UILayer.ts");
  assert(layer.indexOf("Hud") >= 0, "HUD layer exists");
}

const NARROW_VIEWS = [576, 590, 640, 720, 996];

/** 拖到最右时，树/柱右缘比视口右缘多出的像素。 */
function rightTreeOverhang(viewW: number): number {
  const layout = buildCityMapLayout(null, null, null, { viewW, viewH: 1280 });
  const plate = findCityNode(layout, "spr_map_bg1_2");
  const layer = findCityNode(layout, "spr_map_bg1");
  assert(plate !== null && layer !== null && layer.parallax, "right foreground plate is on the near layer");
  const scroll = layout.minScroll;
  const layerX = layerAnchorX(scroll, layer.parallax.ratio, layer.parallax.ox);
  const right = layerX + plate.x * layer.scale;
  return right - (-scroll + viewW);
}

function checkSources(): void {
  const hub = read("client/assets/scripts/features/city/ui/CityHubView.ts");
  const chrome = read("client/assets/scripts/features/city/ui/CityChromeView.ts");
  assert(hub.indexOf("findNode") < 0 && chrome.indexOf("findNode") < 0, "new city views do not findNode");
  assert(hub.indexOf("indexByName") < 0 && chrome.indexOf("indexByName") < 0, "new city views do not index the tree");
  assert(hub.indexOf('@view(') >= 0 && chrome.indexOf('@view(') >= 0, "both city views register");
  assert(hub.indexOf('id: CITY_VIEW_ID') >= 0, "hub id is the city page id");
  assert(chrome.indexOf("UILayer.Hud") >= 0 && hub.indexOf("UILayer.Hud") >= 0, "city stays on the HUD layer");
  assert(hub.indexOf("onCityAtom") < 0, "hub does not reimplement routing");
  assert(hub.indexOf("cityAtomLocked") >= 0, "hub still locks buildings from the query");
  assert(chrome.indexOf("setCityExtras") >= 0, "chrome still hides the activity row");
  assert(chrome.indexOf('createRect("BgPad"') < 0, "new chrome does not paint a BgPad");
  assert(chrome.indexOf('getChildByName("BgPad")') >= 0, "new chrome turns an existing BgPad off");
  const oldChrome = read("client/assets/scripts/ui/CityChrome.ts");
  assert(oldChrome.indexOf('createRect("BgPad"') < 0, "old chrome does not paint a BgPad");
  assert(oldChrome.indexOf('setCityTabSelected(button, state === "selected")') >= 0, "old chrome scales the selected tab");
  assert(oldChrome.indexOf("tabPaintState") >= 0, "old chrome keeps a single selected tab");
  assert(oldChrome.indexOf("layoutCityTab") >= 0 && oldChrome.indexOf("prepareCityTab") >= 0, "old chrome normalizes battle then scales the selection");
  assert(hub.indexOf("layerCoverX") >= 0, "hub keeps far layers over the viewport");
  const skyLeft = layerCoverX(0, 0.63, 750, 0.5, 1200, 1.2, 640);
  const skyLeftEdge = skyLeft - 0.5 * 1200 * 1.2;
  assert(skyLeftEdge <= 0, "sky covers the left edge at scroll 0");
  assert(skyLeftEdge + 1200 * 1.2 >= 640, "sky still covers the view when pulled left");
  const skyMid = layerCoverX(-430, 0.63, 750, 0.5, 1200, 1.2, 640);
  assert(Math.abs(skyMid - layerAnchorX(-430, 0.63, 750)) < 0.001, "sky stays put while the view is covered");
  const farLeft = layerCoverX(0, 0.82, 750, 0.5, 1428, 1, 640);
  assert(farLeft - 0.5 * 1428 <= 0, "far city covers the left edge");
  const near = layerCoverX(-860, 1.3, 0, 0, 1500, 1, 640);
  assert(near === layerAnchorX(-860, 1.3, 0), "near layer is not dragged to hide its box");
  const ground = layerCoverX(0, 1, 750, 0.5, 1500, 1, 640);
  assert(ground === layerAnchorX(0, 1, 750), "ground anchor stays when it already fills the content");
  for (let i = 0; i < NARROW_VIEWS.length; i++) {
    const overhang = rightTreeOverhang(NARROW_VIEWS[i]);
    assert(overhang >= CITY_EDGE_BLEED - 0.01, "right tree passes the viewport at width " + NARROW_VIEWS[i]);
    assert(overhang < 64, "right tree stays on the cut building at width " + NARROW_VIEWS[i]);
  }
  const leftPlate = findCityNode(buildCityMapLayout(null, null, null, { viewW: 590, viewH: 1280 }), "spr_map_bg1_1");
  assert(leftPlate !== null && leftPlate.x === 0 && leftPlate.ax === 0, "left foreground plate stays on the content left");
  assert(chrome.indexOf("main-scene-lang_lbl-fetters-unlock") >= 0, "chrome keeps the VIP caption");
  assert(Math.abs(TAB_SELECTED_SCALE - 1.5) < 1e-6, "selected tab matches MainSceneCtr 1.5x checked size");
  assert(tabVisualScale(true) > tabVisualScale(false) * 1.2 && tabVisualScale(false) === 1, "only the selected tab grows");
  assert(chrome.indexOf('setCityTabSelected(button, state === "selected")') >= 0, "new chrome scales the selected tab");
  assert(chrome.indexOf("tabPaintState") >= 0, "new chrome keeps a single selected tab");
  assert(chrome.indexOf("layoutCityTab") >= 0, "new chrome keeps the selected scale after fit");
  const oldHub = read("client/assets/scripts/ui/CityHub.ts");
  assert(oldHub.indexOf("export async function mountCityHubPrefab") >= 0, "old hub mount stays");
  assert(oldHub.indexOf("export function primeCityHub") >= 0, "primeCityHub stays");
  const main = read("client/assets/scripts/ui/MainApp.ts");
  const start = main.indexOf("private buildCity()");
  const end = main.indexOf("private async mountCityHub(");
  const body = start >= 0 && end > start ? main.slice(start, end) : "";
  assert(body.indexOf("mountCityHub") >= 0, "buildCity still mentions the old hub mount");
  assert(body.indexOf("openMainline()") < 0, "buildCity does not place the mainline call");
  assert(main.indexOf("mountCityHubPrefab") >= 0, "old hub prefab mount stays in MainApp");
  assert(main.indexOf("mountCityChromePrefab") >= 0, "old chrome prefab mount stays in MainApp");
  assert(main.indexOf("mountCityChrome(") < 0, "MainApp does not call the thrown chrome builder");
  assert(main.indexOf("useCityView()") >= 0, "MainApp switches on the city flag");
  assert(main.indexOf("export const USE_CITY_HUB_PREFAB = true") >= 0, "hub prefab default stays");
  const buildAt = main.indexOf("private async build()");
  const buildFnEnd = main.indexOf("private onTab(");
  const buildFn = buildAt >= 0 && buildFnEnd > buildAt ? main.slice(buildAt, buildFnEnd) : "";
  const cityPos = buildFn.indexOf("this.panels.start(this.buildCity())");
  const chromePos = buildFn.indexOf("mountCityChromePrefab");
  assert(cityPos >= 0 && chromePos > cityPos, "city page still starts before the chrome mount string");
}

function checkHubPrefab(): void {
  const uuid = metaUuid("client/assets/scripts/features/city/ui/CityHubView.ts.meta");
  const data = loadPrefab("client/assets/prefabs/ui/city/CityHub.prefab");
  const comp = component(data, classId(uuid)) as {
    parallax?: { __id__?: number };
    mapNodes?: { __id__?: number }[];
    spots?: { __id__?: number }[];
    effects?: { __id__?: number }[];
    btnMainline?: { __id__?: number };
  };
  assert(nodeName(data, comp.parallax) === "CityParallax", "parallax is bound");
  const maps = (comp.mapNodes || []).map((ref) => nodeName(data, ref));
  const need = ["CityParallax", "spr_map_bg1", "spr_map_bg2", "spr_map_bg1_1", "spr_map_bg1_2"];
  for (let i = 0; i < need.length; i++) assert(maps.indexOf(need[i]) >= 0, "map node bound " + need[i]);
  const spots = (comp.spots || []).map((ref) => nodeName(data, ref));
  assert(spots.indexOf("spot-main_summon") >= 0, "summon building is bound");
  assert(spots.indexOf("spot-main_smith_shop") >= 0, "smith building is bound");
  assert(nodeName(data, comp.btnMainline) === "BtnMainline", "mainline button is bound");
  assert((comp.effects || []).length >= 1, "city effects are bound");
}

function checkChromePrefab(): void {
  const uuid = metaUuid("client/assets/scripts/features/city/ui/CityChromeView.ts.meta");
  const data = loadPrefab("client/assets/prefabs/ui/city/CityChrome.prefab");
  const comp = component(data, classId(uuid)) as { [key: string]: { __id__?: number } | { __id__?: number }[] };
  const one = (key: string, name: string) => {
    const ref = comp[key];
    if (!ref || Array.isArray(ref)) throw new Error(key + " 不是单节点");
    assert(nodeName(data, ref) === name, key + " bound to " + name);
  };
  one("lblName", "LblName");
  one("goldValue", "Value");
  one("gemValue", "Value");
  one("powerValue", "Value");
  const gold = comp.goldValue;
  const gem = comp.gemValue;
  const power = comp.powerValue;
  const bottom = comp.bottomBg;
  if (!gold || Array.isArray(gold) || !gem || Array.isArray(gem) || !power || Array.isArray(power) || !bottom || Array.isArray(bottom)) {
    throw new Error("chrome value refs missing");
  }
  assert(parentName(data, gold) === "CurrencyGold", "gold value sits under CurrencyGold");
  assert(parentName(data, gem) === "CurrencyGem", "gem value sits under CurrencyGem");
  assert(parentName(data, power) === "PowerSlot", "power value sits under PowerSlot");
  assert(parentName(data, bottom) === "BottomBar", "bottom pad targets BottomBar/Bg");
  one("avatar", "Avatar");
  one("actGroup", "ActGroup");
  one("utilityRow", "UtilityRow");
  one("bottomBg", "Bg");
  one("tabCity", "TabCity");
  one("tabFetter", "TabFetter");
  one("btnMail", "BtnMail");
  const activity = comp.activityButtons;
  if (!Array.isArray(activity)) throw new Error("activity buttons missing");
  assert(activity.length === 8, "eight activity buttons");
  const names = activity.map((ref) => nodeName(data, ref));
  assert(names.indexOf("ActRecommend") >= 0 && names.indexOf("BtnActExpand") >= 0, "activity row is bound");
  const shell = "c4e8aHSe2NOkI8Vai2cC0fj";
  const text = read("client/assets/prefabs/ui/city/CityChrome.prefab");
  assert(text.split(shell).length === 2, "CityChromeShell class id stays once");
}

function checkBarSlide(): void {
  assert(barIndex("city") === 0 && barIndex("hero") === 1 && barIndex("battle") === 3, "bar order matches the seven tabs");
  assert(barPageId("city") === null, "city slide reveals the resident page");
  assert(barPageId("battle") === "mainline" && barPageId("dungeon") === "daily", "battle and dungeon map onto their pages");
  assert(barSlideDir(0, 1) === 1 && barSlideDir(4, 1) === -1 && barSlideDir(2, 2) === 0, "higher tab enters from the right");
  assert(selectedBarId("bag", "hero") === "bag", "bag on top of hero selects only bag");
  assert(selectedBarId("hero", "hero") === "hero" && selectedBarId("hero-detail", "hero") === "hero", "hero list and detail select hero");
  assert(selectedBarId("mail", "hero") === "hero", "a hero subpage still selects hero");
  assert(selectedBarId("mail", "city") === null, "a city subpage does not light another tab");
  assert(selectedBarId("mainline", "hero") === "battle", "mainline selects battle even if hero is the root");
  assert(selectedBarId("city", "city") === "city" && selectedBarId("daily", "city") === "dungeon", "city and daily map to their own tabs");
  assert(selectedBarId("fetterData", "fetter") === "fetter", "fetter subpages select fetter");
  const paint = tabPaintState(["selected", "selected", "open", "locked"]);
  assert(paint.join(",") === "open,selected,open,locked", "two selected states collapse to the later tab");
  assert(pageContentReady([]) === false && pageContentReady(["ListBackdrop"]) === false, "backdrop alone is not a ready page");
  assert(pageContentReady(["ListBackdrop", "PagePrefabShell"]) && pageContentReady(["bg"]), "shell or city content can slide");
  assert(expoOut(0) === 0 && expoOut(1) === 1 && expoOut(0.5) > 0.9, "exponential out eases ahead of linear");
  assert(BAR_SLIDE_MS === 280, "bar slide lasts 280ms");
  const travel = slideTravel(640, 720, 720);
  assert(travel === 680, "wider pages travel far enough to clear");
  assert(travel <= (720 + 720) / 2, "two full pages do not leave a gap");
  assert(slideTravel(640, 0, 0) === 640, "unknown page size slides one viewport");
  const fromRight = slideOffset(1, 680, 0);
  const landed = slideOffset(1, 680, 1);
  assert(fromRight.outX === 0 && fromRight.inX === 680, "incoming starts on the right");
  assert(landed.outX === -680 && landed.inX === 0, "outgoing leaves to the left");
  assert(slideOffset(-1, 680, 1).outX === 680, "lower tab leaves to the right");

  const open = new SlideCapture<string>(1, "hero");
  open.hide("city");
  open.show("hero");
  assert(open.outgoing === "city" && open.incoming() === "hero", "city to hero slides those two pages");

  const back = new SlideCapture<string>(-1, null);
  back.drop("hero");
  back.show("city");
  assert(back.outgoing === "hero" && back.incoming() === "city" && !back.wasDropped("city"), "back to city reveals the resident page");

  const stacked = new SlideCapture<string>(1, "hero");
  stacked.drop("bag");
  stacked.show("old-hero");
  stacked.drop("old-hero");
  stacked.show("city");
  stacked.hide("city");
  stacked.show("hero");
  assert(stacked.outgoing === "bag" && stacked.incoming() === "hero", "stacked switch slides the visible top, not the pages under it");
  assert(stacked.immediateDrops().indexOf("old-hero") >= 0, "covered pages are dropped without a slide");
  assert(stacked.nodesToHide("hero").indexOf("city") >= 0, "city stays hidden when a new tab covers it");

  const main = read("client/assets/scripts/ui/MainApp.ts");
  const onTab = main.slice(main.indexOf("private onTab("), main.indexOf("private beginBarSlide("));
  assert(onTab.indexOf("fromBar") >= 0 && onTab.indexOf("barSlideBusy") >= 0 && onTab.indexOf("beginBarSlide") >= 0 && onTab.indexOf("sealBarSlide") >= 0, "bottom bar arms the slide and ignores taps while it plays");
  assert(main.indexOf("this.onTab(id, true)") >= 0, "chrome callback is the bar path");
  const atom = main.slice(main.indexOf("private onCityAtom("), main.indexOf("private barSelected("));
  assert(atom.indexOf("this.onTab(route.panel)") >= 0 && atom.indexOf("onTab(route.panel, true)") < 0, "building clicks stay instant");
  const openMail = main.slice(main.indexOf("private openMail("), main.indexOf("private openIdle("));
  const openBag = main.slice(main.indexOf("private openBag("), main.indexOf("private openMail("));
  assert(openMail.indexOf("armBarSlide") < 0 && openBag.indexOf("armBarSlide") < 0, "mail and the bag button do not arm a bar slide");
  const backFn = main.slice(main.indexOf("private back("), main.indexOf("private allow("));
  assert(backFn.indexOf("this.panels?.back()") >= 0 && backFn.indexOf("UIManager") < 0, "back stays on the page stack");
  assert(backFn.indexOf("cancelBarSlide") >= 0, "back cancels a bar slide instead of animating");
  const shell = read("client/assets/scripts/ui/UIShell.ts");
  assert(shell.indexOf("markPageShown(") >= 0 && shell.indexOf("console.log") < 0, "page show still goes through GameLog");
  assert(shell.indexOf("armBarSlide") >= 0 && shell.indexOf("pageContentReady") >= 0 && shell.indexOf("scheduleReady") >= 0, "the shell waits until the next page is ready");
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  const nav = read("client/assets/scripts/ui/PanelNav.ts");
  assert(manager.indexOf("armBarSlide") < 0 && nav.indexOf("armBarSlide") < 0, "bar slide does not rewrite UIManager or PanelNav");
}

checkFlag();
checkFramework();
checkSources();
checkHubPrefab();
checkChromePrefab();
checkBarSlide();
console.log("city-view-check ok");
