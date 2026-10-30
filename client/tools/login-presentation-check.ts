import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { upgradeSpine37Json, SPINE_RUNTIME_VERSION } from "../assets/scripts/framework/assets/SpineJson";
import { upgradeSpine37Json as legacyUpgrade } from "../assets/scripts/ui/spineUpgrade";
import { CompatibleSpine } from "../assets/scripts/framework/assets/CompatibleSpine";
import { Node, sp } from "cc";

const assets = join(process.cwd(), "client/assets");
const read = (path: string): any => JSON.parse(readFileSync(join(assets, path), "utf8"));
const prefab = read("prefabs/ui/account/AccountLogin.prefab") as any[];
const original = read("prefabs/ui/legacy-login/LoginPanel.prefab") as any[];
const node = (rows: any[], name: string) => {
  const found = rows.find(row => row.__type__ === "cc.Node" && row._name === name);
  assert(found, "missing node " + name);
  return found;
};
const component = (rows: any[], host: any, type: string) => {
  const found = host._components.map((ref: any) => rows[ref.__id__]).find((row: any) => row.__type__ === type);
  assert(found, "missing component " + type);
  return found;
};

// Preserve the authored artwork and pressed state, rather than another generic button.
const start = component(prefab, node(prefab, "StartGame"), "cc.Button");
const oldStart = component(original, node(original, "BtnEnter"), "cc.Button");
for (const key of ["_normalSprite", "_pressedSprite", "_hoverSprite", "_disabledSprite", "_transition"]) {
  if (key === "_transition") assert.equal(start[key], oldStart[key]);
  else {
    assert.equal(start[key].__uuid__, oldStart[key].__uuid__, "existing start button " + key);
    assert([undefined, "cc.SpriteFrame"].includes(start[key].__expectedType__), "valid Creator round-trip type annotation");
  }
}
assert.equal(component(prefab, node(prefab, "ServerBg"), "cc.Sprite")._spriteFrame.__uuid__,
  component(original, node(original, "ServerBg"), "cc.Sprite")._spriteFrame.__uuid__);
const background = component(prefab, node(prefab, "Background"), "cc.Sprite");
assert.equal(background._spriteFrame.__uuid__.split("@")[0], read("resources/ui/maps/map-bg-loading.jpg.meta").uuid);

const edit = component(prefab, node(prefab, "AccountInput"), "cc.EditBox");
for (const key of ["_textLabel", "_placeholderLabel"]) {
  const label = prefab[edit[key].__id__];
  const transform = component(prefab, prefab[label.node.__id__], "cc.UITransform");
  assert.equal(transform._anchorPoint.x, 0, "EditBox positions text from top-left");
  assert.equal(transform._anchorPoint.y, 1);
  assert.equal(label._horizontalAlign, 0);
  assert.equal(label._enableWrapText, false);
}
assert.equal(node(prefab, "DeveloperPanel")._active, false);
const view = prefab.find(row => row.accountInput && row.loginButton && row.statusLabel);
assert(view && view.developerPanel && view.developerButton, "all login controls are serialized bindings");
assert.equal(prefab[view.loginButton.__id__], start);

// Exercise the real old character data through the same converter used by both paths.
assert.equal(legacyUpgrade, upgradeSpine37Json, "one shared compatibility implementation");
const character = read("resources/spine/jiemian.json");
const untouched = JSON.stringify(character);
const converted: any = upgradeSpine37Json(character);
assert.equal(JSON.stringify(character), untouched, "source animation remains unchanged");
assert.equal(converted.skeleton.spine, SPINE_RUNTIME_VERSION);
assert(Array.isArray(converted.skins));
assert(converted.skins.some((skin: any) => skin.name === "default"));
function withoutCurves(value: any): any {
  if (Array.isArray(value)) return value.map(withoutCurves);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["curve", "c2", "c3", "c4"].includes(key))
    .map(([key, child]) => [key, withoutCurves(child)]));
}
assert.deepEqual(withoutCurves(converted.animations.stand), withoutCurves(character.animations.stand), "preserve all animation content apart from the required curve encoding change");
assert.equal(upgradeSpine37Json(converted), converted, "conversion is idempotent");
assert(prefab.some(row => row.source?.__uuid__ === read("resources/spine/jiemian.json.meta").uuid));

// Catch broken references when moving existing Prefab subtrees between assets.
function validateRefs(value: any): void {
  if (!value || typeof value !== "object") return;
  if ("__id__" in value) assert(prefab[value.__id__], "invalid Prefab reference " + value.__id__);
  for (const child of Object.values(value)) validateRefs(child);
}
validateRefs(prefab);
for (const host of prefab.filter(row => row.__type__ === "cc.Node")) {
  for (const child of host._children) assert.equal(prefab[prefab[child.__id__]._parent.__id__], host);
}
async function checkSpineTeardown(): Promise<void> {
  const released: string[] = [];
  const renderersDisposed = new Set<string>();
  // Simulate Creator's order: UITransform is torn down before this component,
  // while the Skeleton still reports isValid. Setting data at that point must fail.
  Object.assign(sp.SkeletonData.prototype, {
    isValid: true,
    destroy(this: any) {
      assert(renderersDisposed.has(this._uuid), "data must outlive its renderer teardown");
      assert(!released.includes(this._uuid), "data released only once");
      released.push(this._uuid);
      this.isValid = false;
    },
  });
  const make = () => {
    const host = new Node("LoginCast");
    const player: any = host.addComponent(sp.Skeleton);
    let transformAlive = true;
    let data: any;
    player.setSkin = () => {};
    Object.defineProperty(player, "skeletonData", {
      get: () => data,
      set: value => { assert(transformAlive, "cannot update a destroyed UITransform"); data = value; },
    });
    const owner = host.addComponent(CompatibleSpine);
    owner.source = { uuid: "same-source", skeletonJson: character, atlasText: "atlas", textures: [], textureNames: [], scale: 1 } as any;
    owner.onLoad();
    assert(data, "renderer initialized with converted data");
    return { owner, player, runtime: data, removeTransform: () => { transformAlive = false; } };
  };
  const first = make();
  first.removeTransform();
  assert.equal(first.player.isValid, true, "isValid alone does not protect teardown");
  first.owner.onDestroy();
  first.owner.onDestroy();
  assert.equal(released.length, 0, "release waits for the complete node teardown");
  renderersDisposed.add(first.runtime._uuid);
  // Reopening before the release callback must not share the old runtime/cache UUID.
  const reopened = make();
  assert.notEqual(reopened.runtime._uuid, first.runtime._uuid);
  reopened.removeTransform();
  reopened.owner.onDestroy();
  renderersDisposed.add(reopened.runtime._uuid);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(released.length, 2, "both runtime copies released once");
}
void checkSpineTeardown().then(() => {
  console.log("login-presentation-check passed: reused artwork, input anchors, real Spine conversion, Prefab graph, teardown order, reopen cache isolation and one-time release (rendering requires Creator preview)");
}).catch(error => { console.error(error); process.exitCode = 1; });
