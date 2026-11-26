/**
 * 通用奖励窗专项：验证实际到账投影、同回执展示一致性、原Prefab结构及资源迟到关闭。
 * 使用引擎替身检查生命周期；真实原图、动画速度和触摸区域仍由Creator预览复验。
 */
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { AudioClip, AudioSource, Button, Label, Node, Size, Sprite, SpriteFrame, Tween, UIOpacity, UITransform, view as screenView } from "cc";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GameLog } from "../assets/scripts/core/GameLog";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { RewardView } from "../assets/scripts/features/reward/ui/RewardView";
import { HeroRewardView } from "../assets/scripts/features/reward/ui/HeroRewardView";
import { RewardUtils } from "../assets/scripts/features/reward/utils/RewardUtils";
import type { RewardArgs, RewardRow } from "../assets/scripts/features/reward/data/RewardData";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { BattleSpineService } from "../assets/scripts/features/battle/ui/BattleSpineService";

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
    const path = "client/assets/bundles/module/reward/prefabs/RewardView.prefab";
    const objects: any[] = read(path);
    const type = classId("client/assets/scripts/features/reward/ui/RewardView.ts.meta");
    const view = objects.find(row => row.__type__ === type);
    assert(view && view.panel && view.rewards && view.titleEffect && view.confetti && view.rewardAudio);
    assert.equal(objects[view.panel.__id__]._name, "Panel");
    assert(objects[view.panel.__id__]._components.some((row: any) => objects[row.__id__].__type__ === "cc.UIOpacity"));
    const titleSprite = objects[view.titleEffect.__id__];
    const titleNode = objects[titleSprite.node.__id__];
    const titleTransform = objects[titleNode._components[0].__id__];
    assert.equal(titleSprite._isTrimmedMode, false, "标题对齐依赖原始尺寸和透明裁边");
    assert.equal(titleNode._lpos.y, 242);
    assert.equal(titleTransform._contentSize.height, 130);
    assert(!objects.some(row => row._name === "Title"), "标题由完整动画帧独立绘制，静态字样不会叠在下方");
    const scroll = objects[view.rewards.__id__];
    const repeat = objects[view.repeatButton.__id__];
    const confirm = objects[view.confirmButton.__id__];
    assert.equal(repeat.__type__, "cc.Button");
    assert.equal(confirm.__type__, "cc.Button");
    assert.equal(objects[repeat.node.__id__]._name, "RepeatSummonButton");
    assert.equal(objects[confirm.node.__id__]._name, "ConfirmButton");
    assert.equal(objects[repeat.node.__id__]._active, false);
    assert.equal(objects[confirm.node.__id__]._active, false);
    assert.equal(objects[view.summonIntro.__id__]._active, false);
    assert.equal(objects[view.summonBackdrop.__id__].__type__, "cc.Sprite");
    assert.deepEqual(objects[view.summonEffects.__id__]._children.map((row: any) => objects[row.__id__]._name),
        ["Lizi", "Shangcheng"]);
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
    for (const [folder, stem, count] of [
        ["reward", "item-reward_effect-", 10],
        ["common", "item-reward-effect-2_effect-bomb-", 11],
    ] as const) {
        for (let frame = 0; frame < count; frame++) {
            assert(existsSync(`client/assets/bundles/module/${folder}/ui/${stem}${frame}.png`));
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
    view.rewards = { list: {
        node: content, explicitCellSize: new Size(124, 134), setData: (value: unknown) => paints.push(value),
    }, toStart: () => {} } as any;
    const title = new Node("TitleEffect");
    title.parent = view.panel;
    title.addComponent(UITransform).setContentSize(356, 130);
    title.setPosition(0, 242, 0);
    view.titleEffect = title.addComponent(Sprite);
    const confetti = new Node("Confetti");
    confetti.parent = view.panel;
    view.confetti = confetti.addComponent(Sprite);
    const empty = new Node("EmptyState");
    empty.parent = view.panel;
    view.emptyLabel = empty.addComponent(Label);
    view.closeHint = new Node("CloseHint");
    view.closeHint.parent = view.panel;
    const repeat = new Node("RepeatSummonButton");
    repeat.parent = view.panel;
    view.repeatButton = repeat.addComponent(Button);
    const confirm = new Node("ConfirmButton");
    confirm.parent = view.panel;
    view.confirmButton = confirm.addComponent(Button);
    view.summonIntro = new Node("SummonIntro");
    view.summonIntro.parent = root;
    view.summonIntro.addComponent(UITransform);
    const backdrop = new Node("Backdrop");
    backdrop.parent = view.summonIntro;
    backdrop.addComponent(UITransform);
    view.summonBackdrop = backdrop.addComponent(Sprite);
    view.summonEffects = new Node("Effects");
    view.summonEffects.parent = view.summonIntro;
    for (const name of ["Lizi", "Shangcheng"]) {
        const effect = new Node(name);
        effect.parent = view.summonEffects;
    }
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

/** 同一回执只展示一次，检查标题对齐、标题和彩带的原帧间隔及关闭清理。 */
async function checkLifecycle(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const loaded: SpriteFrame[] = [];
    ResManager.getSpriteFrame = async (_node, path) => {
        const frame = new SpriteFrame();
        assert(typeof path === "string" && existsSync(`client/assets/bundles/module/${path}.png`));
        if (path.startsWith("reward/ui/item-reward_effect-")) {
            const meta = read(`client/assets/bundles/module/${path}.png.meta`).subMetas.f9941.userData;
            Object.assign(frame, {
                originalSize: { width: meta.rawWidth, height: meta.rawHeight },
                rect: { height: meta.height },
                offset: { y: meta.offsetY },
            });
        }
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
        const title = fixture.view.titleEffect!;
        const transform = title.node.getComponent(UITransform)!;
        for (let frame = 1; frame <= 10; frame++) {
            assert.equal(title.spriteFrame, loaded[frame % 10], "每0.12秒切换至下一完整标题帧");
            const geometry = title.spriteFrame as SpriteFrame & { offset: { y: number }; rect: { height: number } };
            const trimTop = 0.5 + (geometry.offset.y + geometry.rect.height / 2) / geometry.originalSize.height;
            assert(Math.abs(title.node.position.y + transform.height * (trimTop - transform.anchorY) - 242) < 1e-8,
                "标题每帧裁切区域的顶部保持在同一预制体位置");
            if (frame === 7) {
                assert.equal(fixture.view.confetti!.node.active, true, "彩带未满0.88秒仍显示");
                fixture.view.update(0.04);
                assert.equal(fixture.view.confetti!.node.active, false, "彩带0.88秒后结束");
                fixture.view.update(0.08);
            } else {
                fixture.view.update(0.12);
            }
        }
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
            }
            assert.doesNotThrow(() => fixture.view.onDestroy());
            await Promise.resolve();
            fixture.view.onDestroy();
            await Promise.resolve();
            assert.equal(closed, 1);
            assert.equal(GameLog.shared.recent().filter(line => line.tag === "BaseView" && line.level === "error"
                && line.message.includes("audio teardown fixture")).length, brokenAudio ? 1 : 0);
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

/** 再召唤先关闭结果再发出原奖池与抽数，重复点击和普通奖励不会重新发出。 */
async function checkSummonRepeat(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const close = UIManager.instance.close;
    const getConfig = GameConfig.instance.getConfig;
    let heroLoad: ((frame: SpriteFrame) => void) | undefined;
    let heroRequests = 0;
    GameConfig.instance.getConfig = (() => ({ item_id: 20104004 })) as typeof getConfig;
    ResManager.getSpriteFrame = async (_owner, source) => {
        if (source === "hero/ui/hero-icon_20104004") {
            heroRequests++;
            return new Promise<SpriteFrame>(resolve => { heroLoad = resolve; });
        }
        return new SpriteFrame();
    };
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    const fixture = windowFixture();
    const ordinary = windowFixture();
    let closed = false;
    const repeats: unknown[] = [];
    UIManager.instance.close = view => {
        assert.equal(view, fixture.view);
        fixture.view.runClose();
        closed = true;
        return true;
    };
    const stop = EventDispatcher.instance.on("summon.repeat", value => {
        assert.equal(closed, true);
        repeats.push(value);
    });
    try {
        ordinary.view.runOpen(args);
        await ordinary.view.whenReady();
        assert.equal(ordinary.view.repeatButton!.node.active, false);
        assert.equal(ordinary.view.confirmButton!.node.active, false);
        assert.equal(ordinary.view.closeHint!.active, true);
        assert.equal(ordinary.view.rewards!.list.explicitCellSize.height, 134);
        const repeatSummon = { pool: "ADVANCED", count: 10 } as const;
        const templateId = 10104004;
        const heroes = Array.from({ length: 10 }, (_, index) => ({
            instanceId: "12345678-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
            templateId, level: 1, star: 4, stage: 0,
        }));
        fixture.view.runOpen({
            ...args, items: [{ itemId: templateId, credited: 10 }], heroes, repeatSummon, summonBatch: true,
        });
        assert.equal(fixture.view.rewards!.list.explicitCellSize.height, 104);
        assert.equal(fixture.view.panel!.active, false);
        assert.equal(heroRequests, 1, "同模板头像只等一份");
        heroLoad!(new SpriteFrame());
        assert.equal(fixture.view.panel!.active, false, "头像准备完成前不显示空白头像格");
        await fixture.view.whenReady();
        assert.equal(fixture.view.panel!.active, true);
        assert.equal(fixture.view.repeatButton!.node.active, true);
        assert.equal(fixture.view.confirmButton!.node.active, true);
        assert.equal(fixture.view.closeHint!.active, false);
        fixture.view.repeatButton!.node.emit(Button.EventType.CLICK);
        fixture.view.repeatButton!.node.emit(Button.EventType.CLICK);
        assert.deepEqual(repeats, [repeatSummon]);
    } finally {
        stop();
        fixture.root.destroy();
        ordinary.root.destroy();
        UIManager.instance.close = close;
        GameConfig.instance.getConfig = getConfig;
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
    }
}

/** 开场两路骨骼一起开始，正常三秒关闭，也可直接点按跳过。 */
async function checkSummonIntro(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const close = UIManager.instance.close;
    const mount = BattleSpineService.instance.mountNamedSpine;
    const mounted: string[] = [];
    ResManager.getSpriteFrame = async () => new SpriteFrame();
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    BattleSpineService.instance.mountNamedSpine = (_host, stem, clip, play) => {
        mounted.push(stem + "/" + clip);
        play?.onReady?.();
    };
    try {
        for (const skip of [true, false]) {
            const fixture = windowFixture();
            UIManager.instance.close = view => {
                assert.equal(view, fixture.view);
                fixture.view.runClose();
                return true;
            };
            fixture.view.runOpen({ ...args, summonIntro: true });
            await fixture.view.whenReady();
            await Promise.resolve();
            assert.equal(fixture.view.summonIntro!.active, true);
            assert.equal(fixture.view.panel!.active, false);
            assert.equal(fixture.audio.plays, 1);
            if (skip) {
                fixture.view.summonIntro!.emit(Node.EventType.TOUCH_END);
            } else {
                fixture.view.update(2.9);
                assert.equal(fixture.audio.stops, 1);
                fixture.view.update(0.2);
            }
            assert.equal(fixture.audio.stops, 2);
            fixture.root.destroy();
        }
        assert.deepEqual(mounted, ["lizi/stand", "shangcheng/act2", "lizi/stand", "shangcheng/act2"]);
    } finally {
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
        BattleSpineService.instance.mountNamedSpine = mount;
        UIManager.instance.close = close;
    }
}

/** 连点不同格子不会替换准备中或已打开的英雄，详情关闭后可看下一位。 */
async function checkSummonDetails(): Promise<void> {
    const getFrame = ResManager.getSpriteFrame;
    const forNode = ResourceAssetsUtils.forNode;
    const ui = UIManager.instance;
    const { openChild, isOpen } = ui;
    const fixture = windowFixture();
    const calls: string[] = [];
    let opened = false;
    let finish: () => void;
    ResManager.getSpriteFrame = async () => new SpriteFrame();
    ResourceAssetsUtils.forNode = (() => ({ loadPath: async () => new AudioClip() })) as any;
    ui.isOpen = ctor => ctor === HeroRewardView && opened;
    ui.openChild = ((_owner, ctor, detail) => {
        assert.equal(_owner, fixture.view);
        assert.equal(ctor, HeroRewardView);
        calls.push(detail.hero.instanceId);
        return new Promise(resolve => { finish = () => { opened = true; resolve({}); }; });
    }) as typeof ui.openChild;
    const rows: RewardRow[] = [1, 2].map(index => ({
        itemId: 10104004,
        quantity: 1,
        hero: {
            instanceId: "12345678-0000-4000-8000-" + String(index).padStart(12, "0"),
            templateId: 10104004, level: 1, star: 4, stage: 0,
        },
    }));
    try {
        fixture.view.runOpen(args);
        await fixture.view.whenReady();
        const select = (row: RewardRow) => (fixture.view as any).onSelect(row);
        select(rows[0]);
        select(rows[1]);
        assert.deepEqual(calls, [rows[0].hero!.instanceId]);
        finish!();
        await Promise.resolve();
        await Promise.resolve();
        select(rows[1]);
        assert.equal(calls.length, 1);
        opened = false;
        select(rows[1]);
        assert.deepEqual(calls, rows.map(row => row.hero!.instanceId));
        finish!();
        fixture.view.runClose();
        select(rows[0]);
        assert.equal(calls.length, 2);
    } finally {
        fixture.root.destroy();
        ResManager.getSpriteFrame = getFrame;
        ResourceAssetsUtils.forNode = forNode;
        ui.openChild = openChild;
        ui.isOpen = isOpen;
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
        await checkSummonRepeat();
        await checkSummonIntro();
        await checkSummonDetails();
        console.log("PASS generic reward credited projection, prefab/modal/list bindings, exact frame/entrance timing, virtual-cell replay guards and once-only close/teardown notification");
    } finally {
        tweens.restore();
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
