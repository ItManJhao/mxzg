import { strict as assert } from "node:assert";
import { assetManager, JsonAsset, Prefab, resources as engineResources } from "cc";
import { readFileSync } from "node:fs";
import { createHomeResourceScope, HOME_BUNDLE, HOME_PREFAB } from "../assets/scripts/app/remake/HomeResources";
import { createHeroResourceScope, loadHeroPage, HERO_PAGE_RESOURCES } from "../assets/scripts/app/remake/HeroResources";

async function main() {
  let failCityConfig = true;
  engineResources.load = (path: string, _type: unknown, done: Function) => {
    if (failCityConfig && path === "config/opencondition") { done(new Error("missing city config")); return; }
    const asset = new JsonAsset();
    asset.json = JSON.parse(readFileSync(`client/assets/resources/${path}.json`, "utf8"));
    done(null, asset);
  };
  const meta = (path: string) => JSON.parse(readFileSync(path, "utf8"));
  const feature = meta("client/assets/bundles/remake-home.meta").userData;
  const prefabs = meta("client/assets/prefabs.meta").userData;
  const resources = meta("client/assets/resources.meta").userData;
  assert(feature.isBundle && feature.bundleName === HOME_BUNDLE);
  assert(Number.isInteger(feature.priority) && feature.priority >= 1 && feature.priority <= 20, "custom bundle priority must be in Creator's supported range");
  assert(resources.priority > prefabs.priority && prefabs.priority > feature.priority, "shared bundle priority must exceed the feature");
  const loaded = new Map<string, object>(); const order: string[] = [];
  let attempts = 0, pins = 0, drops = 0;
  const prefab = Object.assign(new Prefab(), { addRef: () => { pins++; }, decRef: (free: boolean) => { assert.equal(free, false); drops++; } });
  Object.assign(assetManager, {
    getBundle: (name: string) => loaded.get(name) || null,
    loadBundle: (name: string, done: Function) => {
      order.push(name);
      const bundle = { load: (path: string, type: unknown, callback: Function) => {
        assert.equal(name, HOME_BUNDLE); assert.equal(path, HOME_PREFAB); assert.equal(type, Prefab);
        if (++attempts === 1) callback(new Error("missing home"));
        else callback(null, prefab);
      } };
      loaded.set(name, bundle); done(null, bundle);
    },
  });
  const scope = createHomeResourceScope();
  assert.deepEqual(order, [], "no home bundle work before an explicit load request");
  await assert.rejects(scope.load("home"), /missing city config/);
  assert.deepEqual(order, [], "failed required config prevents opening the home bundle");
  failCityConfig = false;
  await assert.rejects(scope.load("home"), /missing home/);
  assert.deepEqual(order, ["resources", "prefabs", HOME_BUNDLE], "shared dependencies load first");
  const second = createHomeResourceScope();
  const [one, two] = await Promise.all([scope.load("home"), second.load("home")]);
  assert.equal(one, prefab); assert.equal(two, prefab); assert.equal(attempts, 2); assert.equal(pins, 1);
  scope.dispose(); assert.equal(drops, 0);
  second.dispose(); assert.equal(drops, 1);
  let failHeroConfig = true;
  engineResources.load = (path: string, _type: unknown, done: Function) => {
    if (failHeroConfig && path === "config/herotype") { done(new Error("missing hero config")); return; }
    const asset = new JsonAsset();
    asset.json = JSON.parse(readFileSync(`client/assets/resources/${path}.json`, "utf8"));
    done(null, asset);
  };
  const heroLoads: string[] = []; let heroPins = 0, heroDrops = 0;
  const heroBundle = { load: (path: string, type: unknown, done: Function) => {
    heroLoads.push(path); assert.equal(type, Prefab);
    done(null, Object.assign(new Prefab(), { addRef: () => { heroPins++; }, decRef: (free: boolean) => { assert.equal(free, false); heroDrops++; } }));
  } };
  Object.assign(assetManager, {
    getBundle: (name: string) => name === "prefabs" ? heroBundle : null,
    loadBundle: (name: string, done: Function) => { assert.equal(name, "prefabs"); done(null, heroBundle); },
  });
  const heroScope = createHeroResourceScope();
  assert.equal(heroLoads.length, 0, "hero assets remain lazy");
  await assert.rejects(loadHeroPage(heroScope), /missing hero config/);
  assert.equal(heroLoads.length, 0, "failed hero config prevents Prefab loading");
  failHeroConfig = false;
  const otherHeroScope = createHeroResourceScope();
  const [heroOne, heroTwo] = await Promise.all([loadHeroPage(heroScope), loadHeroPage(otherHeroScope)]);
  assert.equal(heroOne, heroTwo);
  assert.deepEqual(heroLoads.sort(), Object.values(HERO_PAGE_RESOURCES).map(path => path.replace(/^prefabs\//, "")).sort());
  assert.equal(heroPins, 5, "list/board/cell/shell/backdrop share one retained asset each");
  heroScope.dispose(); assert.equal(heroDrops, 0);
  otherHeroScope.dispose(); assert.equal(heroDrops, 5);
  console.log("home-bundle-check passed: lazy entry, dependency order, failure retry and scoped shared Prefab");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
