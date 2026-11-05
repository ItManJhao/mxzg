/** 主线只读结算回归：运行真实 View 的胜负、倒计时、关闭及迟到资源分支，并校验预制体引用。 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const esbuild = require(path.join(root, "client/node_modules/esbuild"));
const source = fs.readFileSync(path.join(root, "client/assets/scripts/features/battle/ui/ChapterEndView.ts"), "utf8");
const output = esbuild.transformSync(source, {loader: "ts", format: "cjs", tsconfigRaw: {compilerOptions: {experimentalDecorators: true}}}).code;
let pending = [], autoLoad = true, spineCalls = 0;
class AudioSource { play() { this.played = true; } stop() { this.stopped = true; } }
AudioSource.EventType = {STARTED: "started"};
class UIOpacity {}
class UITransform {}
class BaseView {
    constructor() { this.node = makeNode(); this.scheduled = new Set(); this.intervals = new Map(); this.listeners = []; }
    onOpen(args) { this.args = args; }
    beginOpen() { this.ready = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); }
    finishOpen() { this.resolve?.(); }
    failOpen(error) { this.reject(error); }
    ownListener(stop) { this.listeners.push(stop); }
    schedule(fn, interval) { this.scheduled.add(fn); this.intervals.set(fn, interval); }
    unschedule(fn) { this.scheduled.delete(fn); }
    unscheduleAllCallbacks() { this.scheduled.clear(); }
    close() { this.closed = true; this.onClose(); this.listeners.forEach(fn => fn()); }
}
function makeNode() {
    const opacity = {opacity: 255};
    return {isValid: true, active: true, handlers: new Map(), setScale() {},
        on(type, fn) { this.handlers.set(type, fn); }, off(type) { this.handlers.delete(type); },
        getComponent(type) { return type === UIOpacity ? opacity : type === UITransform ? {setContentSize() {}} : null; }, addComponent(type) { return new type(); }};
}
const cc = {_decorator: {ccclass: () => type => type, property: () => () => {}}, AudioSource, UIOpacity, UITransform, view: {getVisibleSize: () => ({width: 640, height: 1280})},
    AudioClip: class {}, Button: {EventType: {CLICK: "click"}}, Label: class {}, Node: class {}, Sprite: {SizeMode: {RAW: 0}}, SpriteFrame: class {},
    Vec3: class {}, Tween: {stopAllByTarget() {}}, tween: () => ({to() { return this; }, start() {}}),
    resources: {load(path, type, cb) { const done = () => cb(null, {name: path}); if (autoLoad) done(); else pending.push(done); }}};
const moduleView = {exports: {}};
new Function("module", "exports", "require", output)(moduleView, moduleView.exports, name => {
    if (name === "cc") return cc;
    if (name.endsWith("BaseView")) return {BaseView};
    if (name.endsWith("GameLog")) return {GameLog: {shared: {classified() {}}}};
    if (name.endsWith("battleSpine")) return {mountNamedSpine(host, stem, clip, options) { spineCalls++; assert.equal(stem, "chibang"); assert.equal(clip, "idle"); assert.equal(options.loop, true); options.onReady(); }};
    throw Error("unexpected dependency " + name);
});
function create() {
    const view = new moduleView.exports.ChapterEndView();
    for (const key of ["panel", "backdrop", "victory", "defeatWing", "defeatTitle", "defeatContent", "readonlyNotice"]) view[key] = makeNode();
    view.closeHint = {string: ""}; view.confetti = {node: makeNode(), spriteFrame: null}; return view;
}
(async () => {
    const win = create(); win.onOpen({won: true}); await win.ready;
    const effect = JSON.parse(fs.readFileSync(path.join(root, "client/assets/resources/config/effect2.json"))).rows.find(row => row.name === "eff_reward_bomb");
    assert.equal(win.intervals.get(win.advanceConfetti), effect.speed / 100);
    assert.equal(spineCalls, 1); assert.equal(win.audio.clip.name, "audio/battle-end-1");
    assert.equal(win.defeatContent.active, false); assert.equal(win.scheduled.has(win.tickClose), false);
    for (let i = 0; i < 11; i++) win.advanceConfetti();
    assert.equal(win.confetti.node.active, false); win.close(); assert.equal(win.audio.stopped, true);
    assert.equal(win.scheduled.size, 0); assert.equal(win.backdrop.handlers.size, 0);
    const loss = create(); loss.onOpen({won: false, presentationOnly: true}); await loss.ready;
    assert.equal(spineCalls, 1); assert.equal(loss.audio.clip.name, "audio/battle-end-0");
    assert.equal(loss.intervals.get(loss.tickClose), 1);
    assert.equal(loss.victory.active, false); assert.equal(loss.defeatContent.active, true);
    for (let i = 0; i < 4; i++) loss.tickClose();
    assert.equal(loss.closed, undefined); assert.match(loss.closeHint.string, /1 秒/);
    loss.tickClose(); assert.equal(loss.closed, true); assert.equal(loss.audio.stopped, true);
    autoLoad = false; const cancelled = create(); cancelled.onOpen({won: true}); cancelled.close();
    pending.forEach(done => done()); await cancelled.ready; await Promise.resolve(); await Promise.resolve();
    assert.equal(cancelled.audio, null); assert.equal(spineCalls, 1);
    const prefab = JSON.parse(fs.readFileSync(path.join(root, "client/assets/prefabs/ui/chapter/ChapterEndView.prefab")));
    const nodes = prefab.filter(value => value.__type__ === "cc.Node");
    assert.equal(nodes[0]._name, "ChapterEndView");
    assert.ok(nodes.every(n => !/[\u4e00-\u9fff]/.test(n._name)));
    assert.ok(!prefab.some(c => c.__type__ === "cc.ScrollView"));
    assert.equal(prefab.filter(c => c.__type__ === "cc.Button").length, 1);
    const meta = JSON.parse(fs.readFileSync(path.join(root, "client/assets/scripts/features/battle/ui/ChapterEndView.ts.meta")));
    const hex = meta.uuid.replace(/-/g, ""), keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let id = hex.slice(0, 5); for (let i = 5; i < 32; i += 3) { const n = parseInt(hex.slice(i, i + 3), 16); id += keys[n >> 6] + keys[n & 63]; }
    const binding = prefab.find(c => c.__type__ === id); assert.ok(binding);
    for (const key of ["panel", "backdrop", "victory", "defeatWing", "defeatTitle", "defeatContent", "readonlyNotice", "closeHint", "confetti"]) assert.ok(prefab[binding[key].__id__]);
    for (const [i, node] of prefab.entries()) if (node.__type__ === "cc.Node") {
        const info = prefab[node._prefab.__id__];
        assert.equal(info.__type__, "cc.PrefabInfo"); assert.equal(info.root.__id__, 1); assert.equal(info.asset.__id__, 0);
        for (const component of node._components) assert.equal(prefab[prefab[component.__id__].__prefab.__id__].__type__, "cc.CompPrefabInfo");
        for (const child of node._children) assert.equal(prefab[child.__id__]._parent.__id__, i);
        for (const component of node._components) assert.equal(prefab[component.__id__].node.__id__, i);
    }
    console.log("PASS ChapterEnd win/loss audio, spine, countdown, close, late load and prefab bindings");
})().catch(error => { console.error(error); process.exitCode = 1; });
