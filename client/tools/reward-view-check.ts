/**
 * 通用奖励窗专项：验证实际到账投影、同回执展示一致性、原Prefab结构及资源迟到关闭。
 * 使用引擎替身检查生命周期；真实原图、动画速度和触摸区域仍由Creator预览复验。
 */
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { AudioClip, AudioSource, Label, Node, Sprite, SpriteFrame, Tween, UIOpacity, view as screenView } from "cc";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { RewardView } from "../assets/scripts/features/reward/ui/RewardView";
import { RewardUtils } from "../assets/scripts/features/reward/utils/RewardUtils";
import type { RewardArgs } from "../assets/scripts/features/reward/data/RewardData";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";

/** 本地只读显示夹具，不是领取请求或玩家库存。 */
const args: RewardArgs = {
    receiptId: "fabc0000-0000-4000-8000-000000000001",
    items: [{ itemId: 900003, credited: 5 }, { itemId: 900001, credited: 3 }, { itemId: 900002, credited: 0 }],
};

/** 读取真实工作区资源，不复制第二份Prefab配置。 */
function read(path: string): any {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

/** 用正式meta计算Creator类标识，避免脚本类名相同却绑错UUID。 */
function classId(path: string): string {
    const hex = read(path).uuid.replace(/-/g, "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let value = hex.slice(0, 5);
    for (let index = 5; index < 32; index += 3) {
        const number = Number.parseInt(hex.slice(index, index + 3), 16);
        value += alphabet[number >> 6] + alphabet[number & 63];
    }
    return value;
}

/** 实际到账保持原顺序且只过滤零值，requested和ignored均不能冒充获得量。 */
function checkProjection(): void {
    const before = JSON.stringify(args);
    const rows = RewardUtils.rows(args);
    assert.deepEqual(rows, [{ itemId: 900003, quantity: 5 }, { itemId: 900001, quantity: 3 }]);
    assert.equal(JSON.stringify(args), before);
    assert(Object.isFrozen(rows) && Object.isFrozen(rows[0]));
    const credited = RewardUtils.rows({ ...args,
        items: [{ itemId: 900001, requested: 100, credited: 3, ignored: 97 } as any] });
    assert.equal(credited[0].quantity, 3);
    assert.deepEqual(RewardUtils.rows({ ...args, items: [{ itemId: 900001, credited: 0 }] }), []);
    for (const items of [[{ itemId: 1, credited: -1 }], [{ itemId: 1, credited: 1.5 }],
        [{ itemId: 1, credited: Number.MAX_SAFE_INTEGER + 1 }], [{ itemId: 0, credited: 1 }],
        [{ itemId: 1, credited: 1 }, { itemId: 1, credited: 0 }]]) {
        assert.throws(() => RewardUtils.rows({ ...args, items }));
    }
    assert.throws(() => RewardUtils.rows({ ...args, receiptId: "" }));
}

/** 检查完整Prefab、共享模态和虚拟列表参数，不将替身几何结果当实际画面。 */
function checkPrefab(): void {
    const path = "client/assets/bundles/module/common/prefabs/RewardView.prefab";
    const objects: any[] = read(path);
    const type = classId("client/assets/scripts/features/reward/ui/RewardView.ts.meta");
    const view = objects.find(row => row.__type__ === type);
    assert(view && view.panel && view.rewards && view.titleEffect && view.confetti && view.rewardAudio);
    assert.equal(objects[view.panel.__id__]._name, "Panel");
    assert(objects[view.panel.__id__]._components.some((row: any) => objects[row.__id__].__type__ === "cc.UIOpacity"));
    const scroll = objects[view.rewards.__id__];
    const content = objects[scroll.content.__id__];
    const port = objects[content._parent.__id__];
    assert.equal(objects[port._parent.__id__]._name, "Rewards");
    const layout = objects.find(row => row.columns === 4 && row.cellPrefab);
    assert(layout && layout.virtual && layout.overrideCellSize);
    assert.deepEqual(layout.explicitCellSize, { __type__: "cc.Size", width: 124, height: 134 });
    assert.equal(layout.cellPrefab.__uuid__, read("client/assets/bundles/module/common/prefabs/BagItemView.prefab.meta").uuid);
    const cell = read("client/assets/bundles/module/common/prefabs/BagItemView.prefab");
    assert(cell[1]._components.some((row: any) => cell[row.__id__].__type__ === "cc.UIOpacity"));
    assert.equal(objects.filter(row => row.__type__ === "cc.Mask").length, 1, "只保留列表裁剪，不在Prefab造模态蒙版");
    const spec = UIRegistry.viewSpecOf(RewardView)!;
    assert.deepEqual(spec.modal, { mask: true, closeOnOutside: true });
    assert.equal(spec.prefab, path.replace(/^client\/assets\//, "").replace(/\.prefab$/, ""));
    for (const [stem, count] of [["item-reward_effect-", 10], ["item-reward-effect-2_effect-bomb-", 11]] as const) {
        for (let frame = 0; frame < count; frame++) {
            assert(existsSync("client/assets/bundles/module/common/ui/" + stem + frame + ".png"));
        }
    }
    assert(existsSync("client/assets/bundles/resources/audio/item-get.mp3"));
}

/** 只替身节点引用和列表数据口，页面、Promise及关闭逻辑使用实际被测代码。 */
function windowFixture(): { view: RewardView; root: Node; paints: unknown[]; audio: { plays: number; stops: number } } {
    const root = new Node("RewardRoot");
    const view = root.addComponent(RewardView);
    view.panel = new Node("Panel");
    view.panel.parent = root;
    view.panel.addComponent(UIOpacity);
    const content = new Node("content");
    const paints: unknown[] = [];
    view.rewards = { list: { node: content, setData: (value: unknown) => paints.push(value) }, toStart: () => {} } as any;
    const title = new Node("TitleEffect");
    title.parent = view.panel;
    view.titleEffect = title.addComponent(Sprite);
    const confetti = new Node("Confetti");
    confetti.parent = view.panel;
    view.confetti = confetti.addComponent(Sprite);
    const empty = new Node("EmptyState");
    empty.parent = view.panel;
    view.emptyLabel = empty.addComponent(Label);
    view.rewardAudio = root.addComponent(AudioSource);
    const audio = { plays: 0, stops: 0 };
    view.rewardAudio.play = () => { audio.plays++; };
    view.rewardAudio.stop = () => { audio.stops++; };
    return { view, root, paints, audio };
}

/** 仅记录真实页面交给引擎的Tween参数；不模拟动画插值或冒充Creator观感验收。 */
function recordTweens(): {
    records: { target: object; seconds: number; properties: any; options: any }[];
    stops: object[];
    restore: () => void;
} {
    const prototype = Tween.prototype as any;
    const originals = new Map(["target", "to", "start"].map(key => [key, Object.getOwnPropertyDescriptor(prototype, key)]));
    const stop = Tween.stopAllByTarget;
    const records: { target: object; seconds: number; properties: any; options: any }[] = [];
    const stops: object[] = [];
    prototype.target = function(target: object): object {
        this.recordedTarget = target;
        return this;
    };
    prototype.to = function(seconds: number, properties: any, options: any): object {
        records.push({ target: this.recordedTarget, seconds, properties, options });
        return this;
    };
    prototype.start = function(): object {
        return this;
    };
    Tween.stopAllByTarget = ((target: object) => { stops.push(target); }) as any;
    return { records, stops, restore: () => {
        Tween.stopAllByTarget = stop;
        for (const [key, descriptor] of originals) {
            if (descriptor) {
                Object.defineProperty(prototype, key, descriptor);
            } else {
                delete prototype[key];
            }
        }
    } };
}

/** 主体和格子的入场参数沿用旧时长；提前绑定须等主体显示，虚拟复用同一物品不重播。 */
async function checkEntranceAnimations(tweens: ReturnType<typeof recordTweens>): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const face = BagItemCatalog.face;
    ResManager.getSpriteFrame = async () => new SpriteFrame();
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    BagItemCatalog.face = (() => ({})) as any;
    const fixture = windowFixture();
    const cell = new Node("RewardCell");
    cell.parent = fixture.view.panel;
    const item = cell.addComponent(BagItemView);
    item.show = () => {};
    const opacity = cell.addComponent(UIOpacity);
    const rows = RewardUtils.rows(args);
    try {
        fixture.view.runOpen(args);
        (fixture.view as any).onRender(cell, rows[0]);
        assert.equal(tweens.records.filter(row => row.target === cell).length, 0, "加载期间不提前播完格子入场");
        await fixture.view.whenReady();
        const panel = tweens.records.find(row => row.target === fixture.view.panel)!;
        assert.equal(panel.seconds, 0.15);
        assert.equal(panel.options.easing, "backOut");
        assert.equal(fixture.view.panel!.scale.x, 1.01 * panel.properties.scale.x);
        const panelOpacity = fixture.view.panel!.getComponent(UIOpacity)!;
        assert.equal(tweens.records.find(row => row.target === panelOpacity)!.seconds, 0.08);
        assert.equal(tweens.records.find(row => row.target === panelOpacity)!.properties.opacity, 255);
        assert.equal(tweens.records.filter(row => row.target === cell).length, 1);
        assert.equal(tweens.records.find(row => row.target === cell)!.seconds, 0.1);
        assert.equal(tweens.records.find(row => row.target === cell)!.properties.scale.x, 1);
        assert.equal(tweens.records.find(row => row.target === opacity)!.seconds, 0.15);
        assert.equal(cell.scale.x, 2);
        assert.equal(opacity.opacity, 0);
        (fixture.view as any).onRender(cell, rows[0]);
        assert.equal(tweens.records.filter(row => row.target === cell).length, 1);
        assert.equal(cell.scale.x, 1, "同一行重渲染恢复终态，不重复缩放");
        assert.equal(opacity.opacity, 255);
        (fixture.view as any).onRender(cell, rows[1]);
        assert.equal(tweens.records.filter(row => row.target === cell).length, 2, "虚拟格复用给首次出现的新行仍有入场");
        (fixture.view as any).onRender(cell, rows[0]);
        assert.equal(tweens.records.filter(row => row.target === cell).length, 2, "滚动返回已演出行不重播");
        const beforeClose = tweens.stops.length;
        fixture.view.runClose();
        const stopped = tweens.stops.slice(beforeClose);
        assert(stopped.includes(fixture.view.panel!) && stopped.includes(panelOpacity));
        assert(stopped.includes(cell) && stopped.includes(opacity));
    } finally {
        fixture.view.runDispose();
        fixture.root.destroy();
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
        BagItemCatalog.face = face;
    }
}

/** 可见区域绑定返回的清理句柄应在关闭时撤销，而非等节点最终销毁才撤销。 */
async function checkViewportCleanup(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const on = screenView.on;
    const off = screenView.off;
    const listeners = new Set<unknown>();
    screenView.on = (_type: string, listener: unknown) => { listeners.add(listener); };
    screenView.off = (_type: string, listener: unknown) => { listeners.delete(listener); };
    ResManager.getSpriteFrame = async () => new SpriteFrame();
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    const fixture = windowFixture();
    try {
        fixture.view.runOpen({ ...args, onClosed: () => { assert.equal(listeners.size, 0); } });
        await fixture.view.whenReady();
        assert.equal(listeners.size, 1);
        fixture.view.runClose();
        await Promise.resolve();
        assert.equal(listeners.size, 0);
    } finally {
        fixture.view.runDispose();
        fixture.root.destroy();
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
        screenView.on = on;
        screenView.off = off;
    }
}

/** 同一回执只展示一次，并核对旧标题/彩带的真实百分秒帧间隔与关闭清理。 */
async function checkLifecycle(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const loaded: SpriteFrame[] = [];
    ResManager.getSpriteFrame = async () => {
        const frame = new SpriteFrame();
        loaded.push(frame);
        return frame;
    };
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    const fixture = windowFixture();
    try {
        fixture.view.runOpen(args);
        await fixture.view.whenReady();
        assert.equal(loaded.length, 21);
        assert.equal(fixture.audio.plays, 1);
        assert.equal(fixture.paints.length, 1);
        assert.equal(fixture.view.panel!.active, true);
        const first = fixture.view.titleEffect!.spriteFrame;
        fixture.view.update(0.119);
        assert.equal(fixture.view.titleEffect!.spriteFrame, first);
        fixture.view.update(0.002);
        assert.notEqual(fixture.view.titleEffect!.spriteFrame, first);
        fixture.view.update(0.76);
        assert.equal(fixture.view.confetti!.node.active, false, "彩带0.88秒后结束");
        let originalClosed = 0;
        let replacementClosed = 0;
        let listenersCleared = false;
        (fixture.view as any).ownListener(() => { listenersCleared = true; });
        fixture.view.runOpen({ ...args, onClosed: () => { originalClosed++; } });
        fixture.view.runOpen({ ...args, onClosed: () => {
            assert(listenersCleared, "关闭通知必须晚于BaseView退订");
            assert.equal(fixture.view.rewardAudio!.clip, null);
            assert.equal(fixture.view.titleEffect!.spriteFrame, null);
            replacementClosed++;
        } });
        fixture.view.runOpen(args);
        await Promise.resolve();
        assert.equal(fixture.audio.plays, 1);
        assert.equal(loaded.length, 21);
        assert.throws(() => fixture.view.onOpen({ ...args, items: [{ itemId: 900001, credited: 9 }] }));
        assert.throws(() => fixture.view.onOpen({ ...args, receiptId: "fabc0000-0000-4000-8000-000000000002" }), /不能替换另一回执/);
        fixture.view.runClose();
        assert.equal(replacementClosed, 0, "同步关闭阶段不提前启动下一窗");
        await Promise.resolve();
        fixture.view.runClose();
        fixture.view.runDispose();
        fixture.view.onDestroy();
        await Promise.resolve();
        assert.equal(originalClosed, 0, "同回执更新后的回调不应遗留旧通知");
        assert.equal(replacementClosed, 1, "重复关闭、释放和销毁仅通知一次");
        assert.equal(fixture.view.rewardAudio!.clip, null);
        assert.equal(fixture.view.titleEffect!.spriteFrame, null);
        assert.equal(fixture.view.confetti!.spriteFrame, null);
        assert(fixture.audio.stops > 0);
    } finally {
        fixture.root.destroy();
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
    }
}

/** 页面关掉后才到达的资源只能结束等待，不能重新显示、播音效或提交资产。 */
async function checkLateResources(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const waiters: ((frame: SpriteFrame) => void)[] = [];
    ResManager.getSpriteFrame = () => new Promise(resolve => waiters.push(resolve));
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    const fixture = windowFixture();
    let closed = 0;
    try {
        fixture.view.runOpen({ ...args, onClosed: () => { closed++; } });
        fixture.view.runClose();
        for (const done of waiters) {
            done(new SpriteFrame());
        }
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(fixture.audio.plays, 0);
        assert.equal(fixture.view.panel!.active, false);
        assert.equal(fixture.view.titleEffect!.spriteFrame, null);
        assert.equal(fixture.view.confetti!.spriteFrame, null);
        assert.equal(closed, 1, "资源迟到不改变已交付的单次关闭通知");
    } finally {
        fixture.root.destroy();
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
    }
}

/** 引擎直接销毁和音源清理异常也不能遗留关闭等待，且其余显示引用仍清空。 */
async function checkAbnormalClose(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    ResManager.getSpriteFrame = async () => new SpriteFrame();
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    try {
        for (const brokenAudio of [false, true]) {
            const fixture = windowFixture();
            let closed = 0;
            let listenersCleared = false;
            fixture.view.runOpen({ ...args, onClosed: () => {
                assert(listenersCleared);
                closed++;
            } });
            await fixture.view.whenReady();
            (fixture.view as any).ownListener(() => { listenersCleared = true; });
            if (brokenAudio) {
                fixture.view.rewardAudio!.stop = () => { throw new Error("audio teardown fixture"); };
                assert.throws(() => fixture.view.onDestroy(), /audio teardown fixture/);
            } else {
                fixture.view.onDestroy();
            }
            await Promise.resolve();
            fixture.view.onDestroy();
            await Promise.resolve();
            assert.equal(closed, 1);
            assert.equal(fixture.view.rewardAudio!.clip, null);
            assert.equal(fixture.view.titleEffect!.spriteFrame, null);
            assert.equal(fixture.view.confetti!.spriteFrame, null);
            fixture.root.destroy();
        }
    } finally {
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
    }
}

/** 执行无网络、无资产写入的显示与生命周期专项。 */
async function main(): Promise<void> {
    const tweens = recordTweens();
    try {
        checkProjection();
        checkPrefab();
        await checkLifecycle();
        await checkLateResources();
        await checkAbnormalClose();
        await checkEntranceAnimations(tweens);
        await checkViewportCleanup();
        console.log("PASS generic reward credited projection, prefab/modal/list bindings, exact frame/entrance timing, virtual-cell replay guards and once-only close/teardown notification");
    } finally {
        tweens.restore();
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
