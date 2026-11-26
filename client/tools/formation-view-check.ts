/** 出阵真实Prefab专项：核对草稿交互、阵型和元素子窗归属，以及权威状态恢复。 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Color, Label, Mask, Node, Prefab, ScrollView, Sprite, SpriteFrame, UITransform, Vec2, Vec3 } from "cc";
import { PrefabLoader } from "../assets/scripts/framework/assets/PrefabLoader";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { FormationHeroCellView } from "../assets/scripts/features/hero/ui/FormationHeroCellView";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { FormationEvent } from "../assets/scripts/features/hero/utils/FormationEvent";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { FormationView } from "../assets/scripts/features/hero/ui/FormationView";
import { FormationElementView, type FormationElementArgs } from "../assets/scripts/features/hero/ui/FormationElementView";
import { FormationMatrixView } from "../assets/scripts/features/hero/ui/FormationMatrixView";
import { FormationSlotView } from "../assets/scripts/features/hero/ui/FormationSlotView";
import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";
import { HeroCatalog } from "../assets/scripts/features/hero/utils/HeroCatalog";
import type { FormationSaveRequest, FormationState } from "../assets/scripts/features/hero/data/FormationData";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";

const PAGE = "client/assets/bundles/module/hero/prefabs/FormationView.prefab";
const CELL = "client/assets/bundles/module/hero/prefabs/FormationHeroCellView.prefab";
/** 手动推进测试实例中的去抖任务，不让旧保存用例同时发出无人处理的预览。 */
const scheduledPreviews = new WeakMap<FormationView, () => void>();
/** 读取仓库真实Prefab/meta，不把测试重建结果写回资源。 */
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
/** 按Creator序列化规则压缩脚本UUID，供真实Prefab找到相应组件类型。 */
function classId(path: string): string {
    const hex = read(path).uuid.replace(/-/g, ""), alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let id = hex.slice(0, 5);
    for (let i = 5; i < hex.length; i += 3) { const value = parseInt(hex.slice(i, i + 3), 16); id += alphabet[value >> 6] + alphabet[value & 63]; }
    return id;
}
const scrollType = classId("client/assets/scripts/framework/ui/SuperScroll.ts.meta");
const contentType = classId("client/assets/scripts/framework/ui/SuperContent.ts.meta");
const viewType = classId("client/assets/scripts/features/hero/ui/FormationView.ts.meta");
const slotType = classId("client/assets/scripts/features/hero/ui/FormationSlotView.ts.meta");
const cellType = classId("client/assets/scripts/features/hero/ui/FormationHeroCellView.ts.meta");
const classes: Record<string, any> = { "cc.Button": Button, "cc.Label": Label, "cc.Sprite": Sprite,
    "cc.UITransform": UITransform, "cc.Mask": Mask, "cc.ScrollView": ScrollView,
    [scrollType]: SuperScroll, [contentType]: SuperContent, [viewType]: FormationView, [slotType]: FormationSlotView, [cellType]: FormationHeroCellView };

/** 按服务器站位编号取得本轮预制上的阵位，避免依赖节点数组顺序。 */
function slotAt(editor: FormationView, position: number): FormationSlotView {
    const slot = editor.slots.find(item => item.position === position);
    assert(slot, "预制应绑定阵位 " + position);
    return slot;
}

/** 从当前可见列表取得格子，避开重绘前已回收的Cell。 */
function heroCellAt(editor: FormationView, index: number): HeroIconCellView {
    return editor.heroScroll!.content!.children[index].getComponent(HeroIconCellView)!;
}

/** 对当前可见列表格派发点击。 */
function clickHero(editor: FormationView, index: number): void {
    heroCellAt(editor, index).button!.node.emit(Button.EventType.CLICK);
}

/** 核对真实列表的英雄排序、元素筛选与草稿选择互不干扰。 */
function checkHeroSorting(): void {
    const heroes = Object.freeze([
        { id: "level-first", templateId: 10105010, star: 4, level: 100 },
        { id: "template-low", templateId: 10105008, star: 5, level: 20 },
        { id: "deployed", templateId: 10205020, star: 5, level: 1, deployed: true },
        { id: "template-high", templateId: 10105010, star: 5, level: 20 },
        { id: "higher-level", templateId: 10105008, star: 5, level: 21 },
        { id: "equal-template", templateId: 10105008, star: 5, level: 21 },
    ]);
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView)!;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const controller = new FormationController(saves, roster);
    roster.replace({ status: "ready", heroes, error: "", mainFormation: {
        formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 0,
        slots: [{ position: 2, heroId: "deployed" }],
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    } });
    editor.configure(controller, roster, saves);
    const listNode = editor.heroScroll!.list.node;
    const rendered = new Map<number, string>();
    /** 保存格子实际收到的英雄身份，按列表索引覆盖同一轮重复渲染。 */
    const collect = (_node: Node, hero: (typeof heroes)[number], index: number) => {
        rendered.set(index, hero.id);
    };
    /** 按列表实际索引读取最近一轮绑定，忽略虚拟化的渲染顺序。 */
    const ids = () => [...rendered.keys()].sort((left, right) => left - right).map(index => rendered.get(index));
    listNode.on(SuperContent.RENDER_ITEM, collect);
    const expected = ["deployed", "higher-level", "equal-template", "template-high", "template-low", "level-first"];
    try {
        editor.runOpen({ complete: () => {} });
        assert.deepEqual(ids(), expected, "已保存出阵优先，同组按星级、等级、模板降序且相同项稳定");
        rendered.clear();
        clickHero(editor, 4);
        assert.deepEqual(ids(), expected, "编辑草稿只更新选择状态，英雄顺序不跳动");
        assert.equal(heroCellAt(editor, 4).battle!.active, true);
        rendered.clear();
        editor.elementButtons[1].node.emit(Button.EventType.CLICK);
        assert.deepEqual(ids(), expected.slice(1), "筛选火系后保留同一排序口径");
        assert.deepEqual(roster.snapshot.heroes.map(hero => hero.id), heroes.map(hero => hero.id), "不重排权威名册");
    } finally {
        editor.runClose();
        listNode.off(SuperContent.RENDER_ITEM, collect);
        controller.dispose();
        root.destroy();
    }
}

/** 补足本专项用到的向量运算，保持公共引擎替身不变。 */
class FixtureVec3 extends Vec3 {
    /** 返回独立的坐标，供拖动保留原位置。 */
    public clone(): FixtureVec3 {
        return new FixtureVec3(this.x, this.y, this.z);
    }

    /** 按Creator的原地加法更新位移和位置。 */
    public add(point: Vec3): this {
        this.x += point.x;
        this.y += point.y;
        this.z += point.z;
        return this;
    }

    /** 按Creator的原地减法求出触摸的相对偏移。 */
    public subtract(point: Vec3): this {
        this.x -= point.x;
        this.y -= point.y;
        this.z -= point.z;
        return this;
    }
}

/** 从实际Prefab的父链计算平移与缩放，供专项模拟没有旋转的UI节点。 */
function uiTransformOf(node: Node): { x: number; y: number; scaleX: number; scaleY: number } {
    let x = 0, y = 0, scaleX = 1, scaleY = 1;
    for (let current: Node | null = node; current; current = current.parent) {
        x = x * current.scale.x + current.position.x;
        y = y * current.scale.y + current.position.y;
        scaleX *= current.scale.x;
        scaleY *= current.scale.y;
    }
    return { x, y, scaleX, scaleY };
}

/** 从页面草稿读取格位实例，验证换位时无需依赖显示属性的标签。 */
function draftHeroAt(editor: FormationView, position: number): string | undefined {
    const state = Reflect.get(editor, "state") as FormationState;
    return state.lineup.slots.find(slot => slot.position === position)?.heroId;
}

/** 在Prefab的阵位触摸区派发手势，落点取目标格中心或两个格子间的空隙。 */
function dragSlot(editor: FormationView, from: number, to: number | null, end = Node.EventType.TOUCH_END): void {
    const input = editor.slotInput!;
    const start = uiTransformOf(slotAt(editor, from).node);
    const startPoint = new Vec2(start.x, start.y);
    let dropPoint: Vec2;
    if (to === null) {
        const right = uiTransformOf(slotAt(editor, 2).node);
        const left = uiTransformOf(slotAt(editor, 3).node);
        dropPoint = new Vec2((right.x + left.x) / 2, right.y);
    } else {
        const target = uiTransformOf(slotAt(editor, to).node);
        dropPoint = new Vec2(target.x, target.y);
    }
    assert(input.hitTest(startPoint, 0) && input.hitTest(dropPoint, 0), "出阵触摸区应覆盖拖动路径的两端");
    if (to === null) {
        assert(editor.slots.every(slot => !slot.node.getComponent(UITransform)!.hitTest(dropPoint, 0)), "空隙应未命中任何阵位");
    }
    const first = { getID: () => 1, getLocation: () => startPoint, getUILocation: () => startPoint, windowId: 0 };
    const after = { getID: () => 1, getLocation: () => dropPoint, getUILocation: () => dropPoint, windowId: 0 };
    input.node.emit(Node.EventType.TOUCH_START, first);
    input.node.emit(Node.EventType.TOUCH_MOVE, after);
    input.node.emit(end, after);
}

/** 在本次重建的节点树中查找组件，补齐轻量引擎替身未提供的子节点查找能力。 */
function findComponentInChildren(node: Node, type: any): any {
    const component = node.getComponent(type);
    if (component) {
        return component;
    }
    for (const child of node.children) {
        const found = findComponentInChildren(child, type);
        if (found) {
            return found;
        }
    }
    return null;
}

/** 等待已登记保存任务进入交付或完成，不代替受控的回执和鉴权结果。 */
async function settleTasks(): Promise<void> {
    await new Promise<void>(resolve => setImmediate(resolve));
}

/** 从真实Prefab恢复专项所需节点与组件；不另造布局，模块注入只包含Model和保存控制器。 */
function instantiateData(data: any[]): Node {
    const objects = new Map<number, any>();
    data.forEach((row, id) => {
        if (row.__type__ !== "cc.Node") {
            return;
        }
        const node = new Node(row._name);
        const originalSetPosition = node.setPosition.bind(node);
        node.active = row._active;
        node.setScale(row._lscale.x, row._lscale.y, row._lscale.z);
        // 能力仅安装在本次重建实例，不改共享Node原型或其他专项环境。
        Object.assign(node, {
            getComponentInChildren: (type: any) => findComponentInChildren(node, type),
            setPosition(point: Vec3 | number, y = 0, z = 0): void {
                if (typeof point === "number") {
                    point = new FixtureVec3(point, y, z);
                }
                originalSetPosition(point.x, point.y, point.z);
                Object.assign(node, { position: new FixtureVec3(point.x, point.y, point.z) });
            },
            setParent(parent: Node, keepWorldTransform: boolean): void {
                const current = uiTransformOf(node);
                node.parent = parent;
                if (keepWorldTransform) {
                    const host = uiTransformOf(parent);
                    node.setPosition((current.x - host.x) / host.scaleX, (current.y - host.y) / host.scaleY, node.position.z);
                    node.setScale(current.scaleX / host.scaleX, current.scaleY / host.scaleY, node.scale.z);
                }
            },
        });
        node.setPosition(row._lpos.x, row._lpos.y, row._lpos.z);
        objects.set(id, node);
    });
    data.forEach((row, id) => {
        if (!classes[row.__type__]) return;
        const value: any = objects.get(row.node.__id__).addComponent(classes[row.__type__]); objects.set(id,value);
        if (value instanceof UITransform) {
            value.setContentSize(row._contentSize.width, row._contentSize.height);
            value.setAnchorPoint(row._anchorPoint.x, row._anchorPoint.y);
            // 专项的引擎替身没有坐标换算，用实际预制的节点位置和大小模拟命中。
            Object.assign(value, {
                convertToNodeSpaceAR(point: Vec3): FixtureVec3 {
                    const transform = uiTransformOf(value.node);
                    return new FixtureVec3((point.x - transform.x) / transform.scaleX, (point.y - transform.y) / transform.scaleY, point.z);
                },
                hitTest(point: Vec2): boolean {
                    const transform = uiTransformOf(value.node);
                    const x = (point.x - transform.x) / transform.scaleX + value.width * value.anchorX;
                    const y = (point.y - transform.y) / transform.scaleY + value.height * value.anchorY;
                    return x >= 0 && x <= value.width && y >= 0 && y <= value.height;
                },
            });
        }
        if (value instanceof Label) { value.string=row._string; value.fontSize=row._fontSize; value.lineHeight=row._lineHeight; value.color=new Color(row._color.r,row._color.g,row._color.b,row._color.a); }
    });
    const reference = (value: any): any => {
        if (Array.isArray(value)) return value.map(reference);
        if (value && typeof value === "object" && "__id__" in value) return objects.get(value.__id__);
        if (value && typeof value === "object" && "__uuid__" in value) {
            if (value.__expectedType__ === "cc.SpriteFrame") {
                return new SpriteFrame();
            }
            const prefab = new Prefab() as any; prefab.data = instantiateData(read(CELL)); prefab._instantiate = () => instantiateData(read(CELL)); return prefab;
        }
        return value;
    };
    data.forEach((row, id) => {
        const value = objects.get(id); if (!value) return;
        if (row.__type__ === "cc.Node") { if (objects.has(row._parent?.__id__)) value.parent=objects.get(row._parent.__id__); return; }
        if (row.__type__ === "cc.ScrollView" || row.__type__ === scrollType) { value.content=reference(row._content); value.horizontal=row.horizontal; value.vertical=row.vertical; }
        if (row.__type__ === contentType) {
            // SuperContent 沿用 Creator Layout 的持久字段，测试须读取引擎实际使用的值。
            for (const field of ["spacingX", "spacingY", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) {
                value[field] = row["_" + field];
            }
        }
        if ([viewType,slotType,cellType,contentType].includes(row.__type__)) for (const [key, field] of Object.entries(row)) {
            if (!key.startsWith("_") && key !== "node") value[key]=reference(field);
        }
    });
    const root = objects.get(1);
    const screen = root.getComponent(FormationView) as FormationView | null;
    if (screen) {
        Object.assign(screen, {
            scheduleOnce(callback: () => void): void {
                scheduledPreviews.set(screen, callback);
            },
            unschedule(): void {
                scheduledPreviews.delete(screen);
            },
        });
        const roster = new HeroRosterModel(), saves = new FormationSaveModel();
        roster.reset(); saves.reset();
        roster.replace({ status: "ready", heroes: [], error: "", mainFormation: { formationId: 1,
            unlockedIds: [1, 2], assistanceUnlocked: false, version: 0, slots: [],
            options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }, { formationId: 2, openPositions: [1, 2, 3, 5, 6, 7] }] } });
        screen.configure(new FormationController(saves, roster), roster, saves);
    }
    return root;
}

/** 真实阵容视图仅显示当前选人对应的回包，不因拖换位置或筛选重复预估。 */
function checkDraftPower(): void {
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView)!;
    const roster = new HeroRosterModel();
    const model = new FormationSaveModel();
    const controller = new FormationController(model, roster);
    const heroes = ["a", "b"].map((id, index) => ({ id, templateId: 10105008 + index, star: 5, level: 20 }));
    const mainFormation = { version: 1, formationId: 1, unlockedIds: [1], assistanceUnlocked: false,
        slots: [{ position: 2, heroId: "a" }], options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }] };
    roster.replace({ status: "ready", heroes, mainFormation, error: "" });
    const requests: Array<{ body: { requestId: string; heroIds: string[] }; reply: (frame: GameFrame) => void }> = [];
    controller.initialize();
    controller.configure({
        async deliver(name, body, reply) {
            assert.equal(name, Protocol.FORMATION_POWER);
            requests.push({ body: body as typeof requests[number]["body"], reply });
        },
    });
    editor.configure(controller, roster, model);
    /** 用本轮窗口记录的任务推进一轮输入，不自行替换草稿。 */
    const flush = (): void => {
        const callback = scheduledPreviews.get(editor);
        scheduledPreviews.delete(editor);
        callback?.();
    };
    /** 构造与真实路由匹配的服务端同序回包。 */
    const answer = (index: number, power: number): void => {
        const { body, reply } = requests[index];
        reply({ version: 1, kind: "response", name: Protocol.FORMATION_POWER, ok: true,
            body: { ...body, power, assetRevision: 13 } });
    };
    try {
        editor.runOpen({ complete: () => {} });
        assert.equal(editor.confirmText!.string, "保存");
        flush();
        assert.deepEqual(requests[0].body.heroIds, ["a"]);
        const draft: FormationState = { heroes, lineup: { version: 1, slots: [
            { position: 2, heroId: "a" }, { position: 3, heroId: "b" },
        ] }, busy: false, message: "", formationId: 1, openPositions: mainFormation.options[0].openPositions };
        editor.render(draft);
        flush();
        assert.deepEqual(requests[1].body.heroIds, ["a", "b"]);
        answer(1, 3000);
        answer(0, 750);
        assert.equal(editor.powerLabel!.string, "3000", "迟到的单人战力不能覆盖双人草稿");
        editor.render({ ...draft, lineup: { version: 1, slots: [
            { position: 2, heroId: "b" }, { position: 3, heroId: "a" },
        ] } });
        editor.elementButtons[1].node.emit(Button.EventType.CLICK);
        flush();
        assert.equal(requests.length, 2);
        assert.equal(editor.powerLabel!.string, "3000");
        editor.render({ ...draft, lineup: { version: 1, slots: [] } });
        flush();
        answer(2, 0);
        assert.equal(editor.powerLabel!.string, "0");
        assert.equal(roster.snapshot.mainFormation!.slots.length, 1, "草稿战力不能保存站位");
    } finally {
        editor.runClose();
        controller.dispose();
        root.destroy();
    }
}

/** 验证同版鉴权与重复名册事件保留未保存站位及筛选；关页丢弃草稿且没有写请求或出战。 */
async function checkUnsavedDraftRecovery(heroes: Parameters<FormationView["render"]>[0]["heroes"]): Promise<void> {
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView) as FormationView;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const hero = heroes[0];
    const elem = HeroCatalog.find(hero.templateId)?.elem;
    assert(elem, "真实英雄配置必须提供元素，才能验证原筛选状态");
    const asset = {
        formationId: 1,
        unlockedIds: [1],
        assistanceUnlocked: false,
        version: 5,
        slots: [{ position: 3, heroId: hero.id }],
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    };
    roster.replace({ status: "ready", heroes: [hero], error: "", mainFormation: asset });
    const module = new FormationController(saves, roster);
    module.initialize();
    let saveCalls = 0;
    let confirmed = 0;
    let cancelled = 0;
    module.configure({
        async deliver(name) {
            assert.equal(name, Protocol.FORMATION_SAVE);
            saveCalls++;
            assert.fail("未保存草稿或同版状态通知不得发送formation.save");
        },
    });
    editor.configure(module, roster, saves);

    /** 同版恢复保持阵位草稿与筛选，未保存位置不进入Model。 */
    const assertDraft = (): void => {
        assert(editor.countLabel!.string.includes("1 / 6"));
        assert.equal(slotAt(editor, 2).portrait!.active, true);
        assert.equal(slotAt(editor, 3).portrait!.active, false);
        assert.equal(editor.filterMark!.position.x, editor.elementButtons[elem].node.position.x);
        assert.equal(editor.filterMark!.position.y, editor.elementButtons[elem].node.position.y);
        assert.equal(editor.heroScroll!.content!.children.length, 1);
        assert.equal(editor.confirmButton!.interactable, true);
        assert.equal(roster.snapshot.mainFormation!.slots[0].position, 3, "未保存站位不能改权威阵容");
    };
    /** 关闭不算确认，重新打开后必须由玩家重新提交才可能继续出战。 */
    const complete = (ok: boolean): void => {
        if (ok) {
            confirmed++;
        } else {
            cancelled++;
        }
    };
    try {
        editor.runOpen({ closeAfterSave: true, complete });
        editor.elementButtons[elem].node.emit(Button.EventType.CLICK);
        clickHero(editor, 0);
        assert.equal(slotAt(editor, 3).portrait!.active, false, "点击已上阵英雄应撤下该实例");
        clickHero(editor, 0);
        assertDraft();

        // 模拟统一鉴权首包已接纳后的同版名册提交，其他展示字段更新不能冲掉本页未保存输入。
        roster.replace({ status: "ready", heroes: [{ ...hero, level: hero.level + 1 }], error: "", mainFormation: asset });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        assertDraft();
        for (let index = 0; index < 3; index++) {
            EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
            assertDraft();
        }
        clickHero(editor, 0);
        assert.equal(slotAt(editor, 2).portrait!.active, false, "同版恢复后仍可撤下当前草稿中的英雄");
        clickHero(editor, 0);
        assertDraft();
        await settleTasks();
        assert.equal(saveCalls, 0);
        assert.equal(confirmed, 0);
        assert.deepEqual(saves.snapshot, { busy: false, savedVersion: null });

        editor.runClose();
        assert.equal(cancelled, 1);
        assert.equal(EventDispatcher.instance.targetListenerCount(editor), 0);
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        editor.runOpen({ closeAfterSave: true, complete });
        assert.equal(slotAt(editor, 3).portrait!.active, true,
            "关页重开只读服务器站位，不恢复未保存草稿");
        assert.equal(slotAt(editor, 2).portrait!.active, false);
        assert.equal(editor.filterMark!.position.x, editor.elementButtons[0].node.position.x,
            "重开回到全部筛选，不复活旧筛选交互");
        assert.equal(Reflect.get(editor, "submittedForBattle"), false, "未保存草稿不恢复出战操作");
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        await settleTasks();
        assert.equal(confirmed, 0, "重开及同版通知不自动出战");
        assert.equal(saveCalls, 0);
    } finally {
        editor.runClose();
        module.dispose();
        root.destroy();
    }
}

/** 验证拖放变更只写本页草稿，确认发出最终站位并继续等待权威状态。 */
async function checkDragDraft(heroes: Parameters<FormationView["render"]>[0]["heroes"]): Promise<void> {
    const [first, second] = heroes;
    const rosterHeroes = [first, { ...second, templateId: 10304012 }];
    assert.notEqual(first.id, second.id, "换位夹具需要两个不同的英雄实例");
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView) as FormationView;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const module = new FormationController(saves, roster);
    const original = [{ position: 2, heroId: first.id }, { position: 3, heroId: second.id }];
    const asset = {
        formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 5, slots: original,
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    };
    roster.replace({ status: "ready", heroes: rosterHeroes, error: "", mainFormation: asset });
    const submissions: FormationSaveRequest[] = [];
    let confirmed = 0;
    let acknowledge: ((frame: GameFrame) => void) | undefined;
    module.initialize();
    module.configure({
        async deliver(name, request, received) {
            assert.equal(name, Protocol.FORMATION_SAVE);
            submissions.push(request as FormationSaveRequest);
            received(await new Promise<GameFrame>(resolve => { acknowledge = resolve; }));
        },
    });
    editor.configure(module, roster, saves);
    try {
        editor.runOpen({ closeAfterSave: true, complete: ok => { if (ok) confirmed++; } });
        const source = slotAt(editor, 8).portrait!;
        const sourceParent = source.parent;
        const sourcePosition = { ...source.position };

        dragSlot(editor, 2, 8);
        assert.equal(slotAt(editor, 2).portrait!.active, false, "前排原位移到后排后应为空");
        assert.equal(draftHeroAt(editor, 8), first.id, "可拖到不同排的开放空位");

        dragSlot(editor, 3, 8);
        assert.equal(draftHeroAt(editor, 8), second.id, "命中已有英雄时目标位得到拖动的英雄");
        assert.equal(draftHeroAt(editor, 3), first.id, "原位得到刚才目标位的英雄");

        dragSlot(editor, 8, 4);
        dragSlot(editor, 3, null);
        dragSlot(editor, 8, 6, Node.EventType.TOUCH_CANCEL);
        assert.equal(draftHeroAt(editor, 3), first.id, "未命中时回到拖动前阵位");
        assert.equal(draftHeroAt(editor, 8), second.id, "锁位或触摸取消不得改变草稿");
        assert.equal(slotAt(editor, 4).portrait!.active, false, "拖放不能写入关闭位");
        assert.equal(slotAt(editor, 6).portrait!.active, false, "取消拖放不能写入原目标位");
        assert.equal(source.parent, sourceParent, "无效拖放应恢复头像节点归属");
        assert.deepEqual({ ...source.position }, sourcePosition, "无效拖放应恢复头像节点坐标");
        assert.deepEqual(roster.snapshot.mainFormation!.slots, original);
        assert.equal(submissions.length, 0, "拖放不会自动提交保存");

        editor.confirmButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(submissions.length, 1);
        const [request] = submissions;
        assert.equal(request.expectedVersion, asset.version);
        assert.deepEqual([...request.slots].sort((a, b) => a.position - b.position), [
            { position: 3, heroId: first.id }, { position: 8, heroId: second.id },
        ]);
        acknowledge!({ version: 1, kind: "response", name: Protocol.FORMATION_SAVE,
            ok: true, body: { requestId: request.requestId, version: asset.version + 1 } });
        await settleTasks();
        assert.equal(confirmed, 0, "拖放结果仍需权威快照确认才能出战");
        roster.replace({ status: "ready", heroes: rosterHeroes, error: "", mainFormation: {
            ...asset, version: asset.version + 1, slots: request.slots,
        } });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        assert.equal(confirmed, 1);
    } finally {
        editor.runClose();
        module.dispose();
        root.destroy();
    }
}

/** 用真实阵型配置检查子窗归属、草稿迁位，以及只有出阵才提交保存。 */
async function checkFormationMatrix(heroes: Parameters<FormationView["render"]>[0]["heroes"]): Promise<void> {
    const [first, second, assistance] = heroes;
    const rosterHeroes = [first, { ...second, templateId: 10304012 }, { ...assistance, templateId: 10105007 }];
    assert(rosterHeroes.every(hero => HeroCatalog.find(hero.templateId)), "切阵型夹具使用已配置的英雄");

    const { rows }: { rows: { type: number; position: number; is_open: number }[] } =
        read("client/assets/bundles/resources/config/battlematrixaddition.json");
    const options = [1, 2].map(formationId => ({
        formationId,
        openPositions: rows.filter(row => row.type === formationId && row.is_open > 0)
            .map(row => row.position).reverse(),
    }));
    const original = [
        { position: 8, heroId: first.id }, { position: 5, heroId: second.id }, { position: 9, heroId: assistance.id },
    ];
    const asset = { formationId: 1, unlockedIds: [1], assistanceUnlocked: true, version: 5, slots: original, options: [options[0]] };
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView) as FormationView;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const controller = new FormationController(saves, roster);
    const submissions: FormationSaveRequest[] = [];
    const ui = UIManager.instance;
    const host = new Node("FormationMatrixTestHost");
    host.addComponent(UITransform);
    const matrixSpec = UIRegistry.viewSpecOf(FormationMatrixView)!;
    const dropHost = ui.setResidentHost(matrixSpec.hostId!, () => host);
    const loadPrefab = PrefabLoader.loadPrefab;
    type Selection = { view: FormationMatrixView; args: NonNullable<Parameters<FormationMatrixView["onOpen"]>[0]> };
    const opened: Selection[] = [];
    // 只替换子窗展示，实际 UIManager 负责挂载、父窗归属与关闭。
    PrefabLoader.loadPrefab = async path => {
        assert.equal(path, matrixSpec.prefab);
        return Object.assign(new Prefab(), {
            _instantiate: () => {
                const node = new Node("FormationMatrixTestView");
                node.addComponent(UITransform);
                const view = node.addComponent(FormationMatrixView);
                view.runOpen = args => opened.push({ view, args: args! });
                return node;
            },
        });
    };
    /** 打开一个属于本出阵页的真实子窗实例，并等待假展示接收参数。 */
    async function openSelection(): Promise<Selection> {
        const previousCount = opened.length;
        editor.formationButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(opened.length, previousCount + 1);
        const selection = opened[previousCount];
        assert(ui.ownsChild(editor, selection.view), "阵型选择窗应归当前出阵页");
        return selection;
    }
    /** 模拟子窗关闭后交付一个确认 ID；父页仍要核对权威选项。 */
    function confirmSelection(selection: Selection, formationId: number): void {
        ui.close(selection.view);
        selection.args.onConfirm(formationId);
    }
    roster.replace({ status: "ready", heroes: rosterHeroes, error: "", mainFormation: asset });
    controller.initialize();
    controller.configure({
        async deliver(name, body, received) {
            assert.equal(name, Protocol.FORMATION_SAVE);
            const request = body as FormationSaveRequest;
            submissions.push(request);
            received({ version: 1, kind: "response", name: Protocol.FORMATION_SAVE,
                ok: true, body: { requestId: request.requestId, version: request.expectedVersion + 1 } });
        },
    });
    editor.configure(controller, roster, saves);
    try {
        editor.runOpen({ complete: () => {} });
        assert.equal(editor.formationButton!.interactable, true, "只有基础阵型解锁也可以预览");
        const bonus = (position: number): Label => slotAt(editor, position).caption!;
        assert.equal(bonus(1).node.active, false, "关闭格隐藏加成");
        assert.equal(draftHeroAt(editor, 2), undefined);
        assert.equal(bonus(2).string, "免伤+3%", "开放空格也显示旧阵型加成");
        assert.equal(bonus(2).node.active, true);
        assert.equal(bonus(5).string, "生命+3%");
        assert.equal(bonus(6).string, "治疗+5%");
        assert.equal(bonus(9).string, "助阵");
        const cancelled = await openSelection();
        assert.equal(cancelled.args.formationId, 1);
        assert.deepEqual(cancelled.args.unlockedIds, [1]);
        ui.close(cancelled.view);
        assert.equal(draftHeroAt(editor, 5), second.id, "取消预览不改出阵草稿");
        confirmSelection(await openSelection(), 2);
        assert.equal(editor.formationLabel!.string, "阵型 1 ▼", "锁定阵型的结果不能改草稿");
        assert.equal(submissions.length, 0);

        const unlocked = { ...asset, unlockedIds: [1, 2], options };
        roster.replace({ status: "ready", heroes: rosterHeroes, error: "", mainFormation: unlocked });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        confirmSelection(await openSelection(), 2);
        assert.equal(editor.formationLabel!.string, "阵型 2 ▼");
        assert.equal(draftHeroAt(editor, 7), first.id, "旧第六个开放普通位对应新第六个开放普通位");
        assert.equal(draftHeroAt(editor, 3), second.id, "旧第三个开放普通位对应新第三个开放普通位");
        assert.equal(slotAt(editor, 1).portrait!.active, false, "首个开放格仍保持空位");
        assert.equal(draftHeroAt(editor, 9), assistance.id, "双方允许的助战位保持独立");
        assert.equal(bonus(1).node.active, true);
        assert.equal(bonus(1).string, "免伤+8%", "切换阵型后立即显示新空格的加成");
        assert.equal(bonus(5).node.active, false);
        assert.equal(bonus(7).string, "免伤+6%");

        const reverse = await openSelection();
        assert.equal(reverse.args.formationId, 2, "重开选择窗从当前草稿阵型开始");
        confirmSelection(reverse, 1);
        assert.equal(editor.formationLabel!.string, "阵型 1 ▼");
        assert.equal(draftHeroAt(editor, 8), first.id, "反向切换恢复原序位");
        assert.equal(draftHeroAt(editor, 5), second.id);
        assert.equal(draftHeroAt(editor, 9), assistance.id);
        assert.equal(bonus(5).string, "生命+3%");

        const outdated = await openSelection();
        // 注入新版快照及较窄的目标选项，覆盖迟到确认和关闭格处理。
        const updated = { ...unlocked, version: 6, options: [options[0],
            { ...options[1], openPositions: options[1].openPositions.filter(pos => pos !== 7 && pos !== 9) }] };
        roster.replace({ status: "ready", heroes: rosterHeroes, error: "", mainFormation: updated });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        assert(!ui.isOpen(outdated.view), "权威快照换版取消旧选择窗");
        outdated.args.onConfirm(2);
        assert.equal(editor.formationLabel!.string, "阵型 1 ▼", "忽略旧草稿的迟到确认");

        const closing = await openSelection();
        editor.runClose();
        assert(!ui.isOpen(closing.view), "父窗关闭时释放子窗");
        editor.runOpen({ complete: () => {} });
        closing.args.onConfirm(2);
        assert.equal(editor.formationLabel!.string, "阵型 1 ▼", "重开后不接收上一轮确认");

        confirmSelection(await openSelection(), 2);
        assert.equal(draftHeroAt(editor, 3), second.id);
        assert.equal(slotAt(editor, 7).portrait!.active, false, "缺失同序位时保持关闭格为空");
        assert.equal(bonus(7).node.active, false, "服务端关闭格位时隐藏配置加成");
        assert.equal(slotAt(editor, 9).portrait!.active, false, "目标阵型关闭助战位时不保留助战英雄");
        assert.deepEqual(roster.snapshot.mainFormation!.slots, original);
        assert.equal(submissions.length, 0, "阵型往返和迁移不能提前保存");

        editor.confirmButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(submissions.length, 1);
        assert.equal(submissions[0].formationId, 2);
        assert.equal(submissions[0].expectedVersion, updated.version);
        assert.deepEqual(submissions[0].slots, [{ position: 3, heroId: second.id }]);
    } finally {
        editor.runClose();
        PrefabLoader.loadPrefab = loadPrefab;
        dropHost();
        host.destroy();
        controller.dispose();
        root.destroy();
    }
}

/** 用真实出阵Prefab与共享子窗归属检查同一份草稿加成的实时投影。 */
async function checkElementDraft(heroes: Parameters<FormationView["render"]>[0]["heroes"]): Promise<void> {
    const rosterHeroes = [heroes[0], { ...heroes[1], templateId: 10102002 }, { ...heroes[2], templateId: 10105008 }];
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const controller = new FormationController(saves, roster);
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView)!;
    editor.configure(controller, roster, saves);
    roster.replace({ status: "ready", heroes: rosterHeroes, error: "", mainFormation: {
        formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 0, slots: [],
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    } });

    const ui = UIManager.instance;
    const host = new Node("FormationElementTestHost");
    host.addComponent(UITransform);
    const spec = UIRegistry.viewSpecOf(FormationElementView)!;
    const dropHost = ui.setResidentHost(spec.hostId!, () => host);
    const loadPrefab = PrefabLoader.loadPrefab;
    const refreshes: string[] = [];
    let child: FormationElementView | undefined;
    PrefabLoader.loadPrefab = async path => {
        assert.equal(path, spec.prefab);
        return Object.assign(new Prefab(), { _instantiate: () => {
            const node = new Node("FormationElementTestView");
            node.addComponent(UITransform);
            const view = node.addComponent(FormationElementView);
            let args: FormationElementArgs | undefined;
            view.onBind = () => {};
            view.onOpen = latest => { args = latest; };
            view.onClose = () => { args = undefined; };
            view.refresh = () => { refreshes.push(args!.readPreview().summary); };
            child = view;
            return node;
        } });
    };
    try {
        editor.runOpen({ complete: () => {} });
        assert(editor.elementBonusButton!.interactable, "未激活时仍可打开元素克制说明");
        assert.equal(editor.teamBonusLabel!.node.active, false);
        clickHero(editor, 0);
        clickHero(editor, 1);
        assert.match(editor.teamBonusLabel!.string, /生命\+3%.*攻击\+3%/);

        editor.elementBonusButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert(child && ui.ownsChild(editor, child), "元素说明应为当前出阵页的子窗");
        assert.equal(refreshes.at(-1), editor.teamBonusLabel!.string);
        clickHero(editor, 2);
        assert.match(editor.teamBonusLabel!.string, /生命\+5%.*攻击\+5%/);
        assert.equal(refreshes.at(-1), editor.teamBonusLabel!.string, "同一子窗随草稿立即刷新");
        dragSlot(editor, 2, 8);
        assert.match(editor.teamBonusLabel!.string, /生命\+5%.*攻击\+5%/, "单纯拖换普通格位不改变元素人数");
        clickHero(editor, 1);
        clickHero(editor, 2);
        assert.equal(editor.teamBonusLabel!.node.active, false);
        assert.equal(refreshes.at(-1), "", "撤下后子窗同时清除激活汇总");
        assert.equal(roster.snapshot.mainFormation!.slots.length, 0, "展示加成只读取草稿");
        editor.runClose();
        assert(!ui.isOpen(child), "关闭出阵页时同步关闭元素子窗");
    } finally {
        editor.runClose();
        PrefabLoader.loadPrefab = loadPrefab;
        dropHost();
        host.destroy();
        controller.dispose();
        root.destroy();
    }
}

/** 幻境沿用原出阵交互，但另存专用站位；关闭后不因迟到保存回复启动战斗。 */
function checkIndependentFormation(heroes: Parameters<FormationView["render"]>[0]["heroes"]): void {
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView) as FormationView;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const main = {
        formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 4,
        slots: [{ position: 3, heroId: heroes[0].id }],
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    };
    roster.replace({ status: "ready", heroes, error: "", mainFormation: main });
    const module = new FormationController(saves, roster);
    editor.configure(module, roster, saves);
    let confirmed = 0;
    let pending: ((saved: boolean) => void) | undefined;
    editor.runOpen({
        title: "幻境之塔出阵",
        formation: {
            read: () => ({ ...main, version: 9, slots: [{ position: 2, heroId: heroes[0].id }] }),
            save(draft, done) {
                assert.equal(draft.expectedVersion, 9);
                assert.equal(draft.formationId, 1);
                assert.deepEqual(draft.slots, [{ position: 5, heroId: heroes[0].id }]);
                pending = done;
            },
        },
        complete: saved => { if (saved) { confirmed++; } },
    });
    assert.equal(editor.titleLabel!.string, "幻境之塔出阵");
    assert.equal(slotAt(editor, 2).portrait!.active, true);
    assert.equal(slotAt(editor, 3).portrait!.active, false);
    dragSlot(editor, 2, 5);
    editor.confirmButton!.node.emit(Button.EventType.CLICK);
    assert.equal(confirmed, 0);
    assert.equal(editor.confirmButton!.interactable, false);
    assert.equal(roster.snapshot.mainFormation!.slots[0].position, 3);
    editor.runClose();
    pending?.(true);
    assert.equal(confirmed, 0);
    root.destroy();
}

/** 梦境借将使用专属战力请求，迟到回包不覆盖新版本，失效助战撤下后立即预估。 */
function checkDreamlandAssistDraft(): void {
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView)!;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const controller = new FormationController(saves, roster);
    const own = { id: "own", templateId: 10105011, level: 140, star: 9 };
    const assist = { id: "assist", templateId: 10105008, level: 60, star: 5 };
    const main = {
        formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 4,
        slots: [{ position: 2, heroId: own.id }],
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    };
    roster.replace({ status: "ready", heroes: [own], error: "", mainFormation: main });
    editor.configure(controller, roster, saves);
    let assistValid = true;
    let authority = { ...main, version: 7, slots: [...main.slots, { position: 3, heroId: assist.id }] };
    let refresh: (() => void) | undefined;
    const calls: Omit<FormationSaveRequest, "requestId">[] = [];
    /** 只触发真实视图刚为当前草稿创建的去抖请求。 */
    const flush = (): void => {
        const task = scheduledPreviews.get(editor);
        scheduledPreviews.delete(editor);
        task?.();
    };
    try {
        editor.runOpen({
            title: "永恒梦境出阵",
            formation: {
                read: () => authority,
                save: () => assert.fail("预估不保存阵容"),
                additionalHero: () => assistValid ? assist : undefined,
                previewPower: draft => {
                    calls.push(draft);
                    return String(calls.length);
                },
                watch: changed => {
                    refresh = changed;
                    return () => { refresh = undefined; };
                },
            },
            complete: () => {},
        });
        assert(slotAt(editor, 3).portrait!.active);
        flush();
        assert.deepEqual(calls[0], { expectedVersion: 7, formationId: 1, slots: authority.slots });
        EventDispatcher.instance.emit(FormationEvent.PowerPreviewed, { requestId: "1", power: 17_451 });
        assert.equal(editor.powerLabel!.string, "17451");
        assistValid = false;
        authority = { ...authority, slots: main.slots };
        refresh?.();
        assert.equal(slotAt(editor, 3).portrait!.active, false);
        assert.equal(editor.powerLabel!.string, "-");
        flush();
        assert.deepEqual(calls[1], { expectedVersion: 7, formationId: 1, slots: main.slots });
        EventDispatcher.instance.emit(FormationEvent.PowerPreviewed, { requestId: "1", power: 17_451 });
        assert.equal(editor.powerLabel!.string, "-");
        EventDispatcher.instance.emit(FormationEvent.PowerPreviewed, { requestId: "2", power: 12_087 });
        assert.equal(editor.powerLabel!.string, "12087");
        assert.deepEqual(roster.snapshot.heroes, [own]);
    } finally {
        editor.runClose();
        assert.equal(refresh, undefined);
        controller.dispose();
        root.destroy();
    }
}

/** 检查原预制视口在列表首尾均能显示两整行英雄，包含头像和星级。 */
function checkDefaultListGeometry(): void {
    const root = instantiateData(read(PAGE));
    const scroll = (root.getComponent(FormationView) as FormationView).heroScroll!;
    const port = scroll.content!.parent!;
    const cells = new Map<number, Node>();
    /** 用锚点和父链缩放换算预制节点边界，比较同一坐标空间。 */
    const bounds = (node: Node) => {
        const transform = uiTransformOf(node);
        const ui = node.getComponent(UITransform)!;
        const width = ui.width * transform.scaleX;
        const height = ui.height * transform.scaleY;
        const left = transform.x - width * ui.anchorX;
        const bottom = transform.y - height * ui.anchorY;
        return { left, right: left + width, bottom, top: bottom + height };
    };
    const viewport = bounds(port);
    /** 检查指定范围内的格子及星级都处在裁剪边界以内。 */
    const assertVisibleRows = (first: number) => {
        for (let index = first; index < first + 8; index++) {
            const cell = cells.get(index)!;
            assert(cell.activeInHierarchy);
            for (const node of [cell, cell.getChildByName("Stars")!]) {
                const item = bounds(node);
                assert(item.left >= viewport.left && item.right <= viewport.right
                    && item.bottom >= viewport.bottom && item.top <= viewport.top,
                `第 ${index + 1} 格的 ${node.name} 不得超出裁剪区`);
            }
        }
    };
    scroll.onEnable();
    try {
        scroll.list.setData(Array.from({ length: 12 }, (_, index) => index), (node, index) => cells.set(index, node));
        assert.equal(scroll.list.columns, 4);
        assert(scroll.vertical && !scroll.horizontal && port.getComponent(Mask)?.enabled);
        assert.equal(scroll.getMaxScrollOffset().x, 0);
        assertVisibleRows(0);
        const end = scroll.getMaxScrollOffset();
        assert(end.y > 0, "第三行英雄可向上滑动查看");
        scroll.restorePosition(end);
        assertVisibleRows(4);
    } finally {
        scroll.onDisable();
        root.destroy();
    }
}

/** 核对真实绑定与人工编辑参数，并验证未保存草稿同版恢复、ACK确认和缺状态同步恢复。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkDraftPower();
    checkDefaultListGeometry();
    checkHeroSorting();
    const data = read(PAGE), authored = data.find((row: any) => row.__type__ === viewType);
    for (const slot of data.filter((row: any) => row.__type__ === slotType)) {
        const portrait = data[slot.portrait.__id__];
        for (const ref of portrait._components) {
            const component = data[ref.__id__];
            assert.ok(component.__type__ !== "cc.Button" || component._enabled === false, "阵位头像不得启用空按钮截获父节点撤下点击");
        }
    }
    // Simulate ordinary Inspector edits in serialized authoring data.
    const title = data[authored.titleLabel.__id__]; title._fontSize=44; title._string="人工修改标题";
    const button = data[data[authored.confirmButton.__id__].node.__id__]; button._lpos.x=344; button._lpos.y=96;
    const listData = data.find((row: any) => row.__type__ === contentType);
    listData.columns = 2;
    listData._spacingX = 18;
    listData._spacingY = 14;
    const root=instantiateData(data), view=root.getComponent(FormationView) as FormationView;
    const fixedChildren=root.children.map(node=>node.name);
    const heroes=[1,2,3].map(id=>({id:"00000000-0000-4000-8000-"+String(id).padStart(12,"0"),templateId:10101001,level:1,star:1}));
    const state={heroes,formationId:1,unlockedIds:[1],openPositions:[2,3,5,6,7,8],lineup:{version:1,slots:[{position:2,heroId:heroes[0].id}]},busy:false,message:"已加载"};
    let cancels=0;
    for (let reopen=0;reopen<3;reopen++) {
        view.runOpen({complete:()=>{cancels++;}});

        view.render(state); view.render({...state,busy:true}); view.render(state);
        assert.equal(view.titleLabel!.fontSize,44); assert.equal(view.titleLabel!.string,"人工修改标题");
        assert.equal(view.confirmButton!.node!.position.x,344); assert.equal(view.confirmButton!.node!.position.y,96);
        assert.deepEqual(root.children.map(node=>node.name),fixedChildren,"opening must not create/reparent static UI");
        const cells=view.heroScroll!.content!.children;
        assert.equal(cells.length,3); assert.equal(view.heroScroll!.list.columns,2);
        assert.equal(view.heroScroll!.list.spacingY,14);
        assert.equal(view.heroScroll!.content!.getComponent(UITransform)!.width,
            view.heroScroll!.content!.parent!.getComponent(UITransform)!.width, "内容宽度维持预制视口值");
        assert.equal((view.heroScroll!.content!.parent!.getComponent(Mask) as Mask).node,view.heroScroll!.content!.parent);
        view.runClose();
    }
    assert.equal(cancels,3);
    // 用真实按钮事件验证草稿属于View；模块回执只经事件刷新，关闭不销毁模块。
    const feedback: string[] = [];
    const offFeedback = UIManager.instance.bindNotice(text => feedback.push(text));
    const editRoot=instantiateData(read(PAGE)), editor=editRoot.getComponent(FormationView) as FormationView;
    const roster=new HeroRosterModel(), saves=new FormationSaveModel(); roster.reset();
    const asset={formationId:1,unlockedIds:[1,2],assistanceUnlocked:false,version:0,slots:[],
        options:[{formationId:1,openPositions:[8,2,5,3,7,6]},{formationId:2,openPositions:[1,2,3,5,6,7]}]};
    roster.replace({status:"ready",heroes,error:"",mainFormation:asset});
    const module=new FormationController(saves,roster);module.initialize();module.resetSession();
    let request:any,resolveSave!: (value:any)=>void;
    module.configure({
        async deliver(name, body, received, failed) {
            assert.equal(name, Protocol.FORMATION_SAVE);
            request=body;
            try { received(await new Promise(resolve=>{resolveSave=resolve;})); } catch(error) { failed(error); }
        },
    });
    editor.configure(module,roster,saves);editor.runOpen({complete:()=>{}});
    assert.equal(heroCellAt(editor, 0).battle!.active, false, "未上阵头像保持完整亮度");
    clickHero(editor, 0);
    assert.equal(slotAt(editor, 2).portrait!.active, true, "优先按开放站位编号升序找空位");
    assert.equal(slotAt(editor, 8).portrait!.active, false, "服务器数组首项并非最低开放站位");
    const deployed = heroCellAt(editor, 0).battle!;
    assert.equal(deployed.name, "DeploymentOverlay");
    assert(deployed.getChildByName("DeploymentShade")?.activeInHierarchy, "上阵草稿应遮暗头像");
    assert(deployed.getChildByName("DeploymentCheck")?.activeInHierarchy, "上阵草稿应显示绿勾");
    assert.equal(heroCellAt(editor, 0).button!.interactable, true, "已上阵格子仍支持点按撤下");
    clickHero(editor, 1);
    assert.equal(heroCellAt(editor, 1).battle!.active, false, "被拒的同模板实例不得显示已上阵");
    assert.equal(roster.snapshot.mainFormation!.slots.length,0,"选位不能提前修改资产");
    assert(editor.countLabel!.string.includes("1 / 6"), "另一同模板实例不能占第二个位置");
    editor.confirmButton!.node.emit(Button.EventType.CLICK);assert(saves.snapshot.busy);
    await settleTasks();
    assert.deepEqual(request.slots, [{position: 2, heroId: heroes[0].id}], "同模板点击不能替换已上阵的原实例");
    editor.runClose();assert.equal(EventDispatcher.instance.targetListenerCount(editor),0);
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:1}});
    await settleTasks();
    assert.deepEqual(saves.snapshot, { busy: true, savedVersion: 1 }, "关闭窗口不销毁等待权威阵容的模块");
    roster.replace({status:"ready",heroes,error:"",mainFormation:{...asset,version:1,slots:request.slots}});
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{revision:roster.version});
    const priorFeedbackCount = feedback.length;
    editor.runOpen({complete:()=>{}});
    assert.equal(feedback.length, priorFeedbackCount, "重开页面不重播历史保存结果");
    assert(!editor.tipLabel!.string.includes("已保存"), "固定操作说明不再充当结果提示区");
    assert(editor.countLabel!.string.includes("1 / 6"));
    clickHero(editor, 0);
    assert.equal(slotAt(editor, 2).portrait!.active, false, "关闭前可从草稿撤下已上阵实例");
    assert.equal(heroCellAt(editor, 0).battle!.active, false, "撤下后遮暗与绿勾随草稿清理");
    assert.equal(roster.snapshot.mainFormation!.slots[0].position, 2, "再次编辑仍只修改页面草稿");
    editor.runClose();editor.runOpen({complete:()=>{}});
    assert(editor.countLabel!.string.includes("1 / 6"));
    editor.runClose();
    let confirmed = 0;
    editor.runOpen({closeAfterSave:true, complete:ok=>{if(ok)confirmed++;}});
    editor.confirmButton!.node.emit(Button.EventType.CLICK);
    await settleTasks();
    assert.equal(confirmed,0,"提交出战草稿不能立即开始挑战");
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:2}});
    await settleTasks();
    assert.equal(confirmed,0,"仅回执未同步权威阵容不能开始挑战");
    roster.replace({status:"ready",heroes,error:"",mainFormation:{...asset,version:2,slots:request.slots}});
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{revision:roster.version});
    assert.equal(confirmed,1,"回执与权威阵容都确认后只通知一次出战");
    assert(feedback.some(text => text.includes("已保存")), "本次实际保存结果通过全局飘字反馈");
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{revision:roster.version});
    assert.equal(confirmed,1);
    editor.runClose();
    editor.runOpen({closeAfterSave:true, complete:ok=>{if(ok)confirmed++;}});
    editor.confirmButton!.node.emit(Button.EventType.CLICK);
    await settleTasks();
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:2}});
    await settleTasks();
    assert.equal(confirmed,2,"阵容不变时成功回执允许相同版本出战");
    editor.runClose();module.dispose();offFeedback();
    const broken=instantiateData(read(PAGE)).getComponent(FormationView) as FormationView;
    broken.confirmButton=null;
    assert.throws(()=>broken.runOpen({complete:()=>{throw Error("binding failure must not be swallowed as Cancel");}}),/FormationView.prefab.*confirmButton/);
    broken.runClose();
    const badCellPage=instantiateData(read(PAGE)).getComponent(FormationView) as FormationView;
    ((badCellPage.heroScroll!.list.cellPrefab as any).data.getComponent(HeroIconCellView) as HeroIconCellView).button=null;
    assert.throws(()=>badCellPage.runOpen({complete:()=>{}}),/button/);
    const brokenCell=instantiateData(read(CELL)).getComponent(HeroIconCellView) as HeroIconCellView;
    brokenCell.button=null;
    assert.throws(()=>brokenCell.show({} as any),/button/);
    const cellData=read(CELL);
    const deploymentOverlay = cellData.find((row: any) => row.__type__ === "cc.Node" && row._name === "DeploymentOverlay");
    assert(deploymentOverlay, "已上阵状态应绑定预制体上的覆盖节点");
    assert.deepEqual(deploymentOverlay._children.map((ref: { __id__: number }) => cellData[ref.__id__]._name),
        ["DeploymentShade", "DeploymentCheck"], "绿勾应绘制在暗层上方，保持原颜色");
    assert.equal(cellData.find((row:any)=>row.__type__==="cc.Node"&&row._name==="Stars")._active,true,"the star Layout container must remain visible when individual stars toggle");
    assert(cellData.some((row:any)=>row.__type__==="cc.Layout"&&row._layoutType===1),"stars use an authored horizontal Layout");
    await checkUnsavedDraftRecovery(heroes);
    await checkDragDraft(heroes);
    await checkFormationMatrix(heroes);
    await checkElementDraft(heroes);
    checkIndependentFormation(heroes);
    checkDreamlandAssistDraft();
    console.log("formation-view-check passed: real Prefab bindings, automatic placement, drag, matrix, live draft bonuses and authoritative save confirmation");
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
