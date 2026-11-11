/** 登录展示回归：验证静态背景、已移除组件无残留、登录控件和预制体引用；独立保留骨骼转换回归。 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { upgradeSpine37Json, SPINE_RUNTIME_VERSION } from "../assets/scripts/framework/assets/SpineJson";
import { upgradeSpine37Json as legacyUpgrade } from "../assets/scripts/framework/ui/spineUpgrade";

const assets = join(process.cwd(), "client/assets");
const read = (path: string): any => JSON.parse(readFileSync(join(assets, path), "utf8"));
const prefab = read("bundles/module/login/prefabs/AccountLoginView.prefab") as any[];
const cleanup = JSON.parse(readFileSync("docs/validation/current-resource-scope-cleanup-20261111.json", "utf8"));
const artwork = cleanup.legacyLoginArtworkBaseline;
assert(!existsSync(join(assets, "bundles/legacy-login")), "未使用的旧登录兼容资源不再随项目保留");
/** Creator脚本类ID支持保留UUID前2位或前5位的压缩格式；两种均纳入绑定核对。 */
function scriptClassIds(uuid: string): string[] {
  const hex = uuid.replace(/-/g, "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  return [2, 5].map(prefix => {
    let value = hex.slice(0, prefix);
    for (let offset = prefix; offset < hex.length; offset += 3) {
      const block = parseInt(hex.slice(offset, offset + 3), 16);
      value += alphabet[block >> 6] + alphabet[block & 63];
    }
    return value;
  });
}
const compatibleIds = scriptClassIds("2c34e9e9-f2b4-47bf-8e49-4470b984b6f9");
assert(!prefab.some(row => compatibleIds.includes(row.__type__)), "静态登录页不可遗留已删除动画组件绑定");
assert(!prefab.some(row => row._name === "LoginCast"), "移除旧人物节点，避免静态背景上重复叠加");
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

// 原美术按钮与按压态在资源清理前冻结为证据，不为测试继续保留未使用旧页面。
const start = component(prefab, node(prefab, "StartGame"), "cc.Button");
const oldStart = artwork.startButton;
for (const key of ["_normalSprite", "_pressedSprite", "_hoverSprite", "_disabledSprite", "_transition"]) {
  if (key === "_transition") assert.equal(start[key], oldStart[key]);
  else {
    assert.equal(start[key].__uuid__, oldStart[key].__uuid__, "existing start button " + key);
    assert([undefined, "cc.SpriteFrame"].includes(start[key].__expectedType__), "valid Creator round-trip type annotation");
  }
}
assert.equal(component(prefab, node(prefab, "ServerBg"), "cc.Sprite")._spriteFrame.__uuid__,
  artwork.serverFrame.__uuid__);
const background = component(prefab, node(prefab, "Background"), "cc.Sprite");
assert.equal(background._spriteFrame.__uuid__.split("@")[0], read("bundles/module/login/ui/jp-login-static.png.meta").uuid);

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
const character = read("bundles/resources/spine/jiemian.json");
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
assert(!prefab.some(row => row.source?.__uuid__ === read("bundles/resources/spine/jiemian.json.meta").uuid), "登录页不再依赖人物骨骼；加载页独立保留");
const png = readFileSync(join(assets, "bundles/module/login/ui/jp-login-static.png"));
assert.equal(png.readUInt32BE(16), 1080);
assert.equal(png.readUInt32BE(20), 2340);

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
console.log("login-presentation-check passed: static background, no stale script binding, login controls, Spine converter and Prefab graph");
