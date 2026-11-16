/** 出阵真实Prefab专项：核对静态绑定、未保存草稿的同版恢复，以及ACK缺状态后的同步重试和页面生命周期。 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Color, Label, Mask, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { FormationHeroCellView } from "../assets/scripts/features/hero/ui/FormationHeroCellView";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { FormationView } from "../assets/scripts/features/hero/ui/FormationView";
import { FormationSlotView } from "../assets/scripts/features/hero/ui/FormationSlotView";
import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";
import { HeroCatalog } from "../assets/scripts/features/hero/utils/HeroCatalog";
import type { FormationSaveRequest } from "../assets/scripts/features/hero/data/FormationData";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";

const PAGE = "client/assets/bundles/module/hero/prefabs/FormationView.prefab";
const CELL = "client/assets/bundles/module/hero/prefabs/FormationHeroCellView.prefab";
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
        node.active = row._active;
        node.setPosition(row._lpos.x, row._lpos.y, row._lpos.z);
        node.setScale(row._lscale.x, row._lscale.y, row._lscale.z);
        // 能力仅安装在本次重建实例，不改共享Node原型或其他专项环境。
        (node as any).getComponentInChildren = (type: any) => findComponentInChildren(node, type);
        objects.set(id, node);
    });
    data.forEach((row, id) => {
        if (!classes[row.__type__]) return;
        const value: any = objects.get(row.node.__id__).addComponent(classes[row.__type__]); objects.set(id,value);
        if (value instanceof UITransform) { value.setContentSize(row._contentSize.width,row._contentSize.height); value.setAnchorPoint(row._anchorPoint.x,row._anchorPoint.y); }
        if (value instanceof Label) { value.string=row._string; value.fontSize=row._fontSize; value.lineHeight=row._lineHeight; value.color=new Color(row._color.r,row._color.g,row._color.b,row._color.a); }
    });
    const reference = (value: any): any => {
        if (Array.isArray(value)) return value.map(reference);
        if (value && typeof value === "object" && "__id__" in value) return objects.get(value.__id__);
        if (value && typeof value === "object" && "__uuid__" in value) {
            const prefab = new Prefab() as any; prefab.data = instantiateData(read(CELL)); prefab._instantiate = () => instantiateData(read(CELL)); return prefab;
        }
        return value;
    };
    data.forEach((row, id) => {
        const value = objects.get(id); if (!value) return;
        if (row.__type__ === "cc.Node") { if (objects.has(row._parent?.__id__)) value.parent=objects.get(row._parent.__id__); return; }
        if (row.__type__ === "cc.ScrollView" || row.__type__ === scrollType) { value.content=reference(row._content); value.horizontal=row.horizontal; value.vertical=row.vertical; }
        if ([viewType,slotType,cellType,contentType].includes(row.__type__)) for (const [key, field] of Object.entries(row)) {
            if (!key.startsWith("_") && key !== "node") value[key]=reference(field);
        }
    });
    const root = objects.get(1);
    const screen = root.getComponent(FormationView) as FormationView | null;
    if (screen) {
        const roster = new HeroRosterModel(), saves = new FormationSaveModel();
        roster.reset(); saves.reset();
        roster.replace({ status: "ready", heroes: [], error: "", mainFormation: { formationId: 1,
            unlockedIds: [1, 2], assistanceUnlocked: false, version: 0, slots: [],
            options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }, { formationId: 2, openPositions: [1, 2, 3, 5, 6, 7] }] } });
        screen.configure(new FormationController(saves, roster), roster, saves);
    }
    return root;
}

/** 验证同版鉴权与重复名册事件保留未保存站位、选择及筛选；关页丢弃草稿且没有写请求或出战。 */
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
        slots: [{ position: 2, heroId: hero.id }],
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    };
    roster.replace({ status: "ready", heroes: [hero], error: "", mainFormation: asset });
    const module = new FormationController(saves, roster);
    module.initialize();
    let saveCalls = 0;
    let refreshes = 0;
    let confirmed = 0;
    let cancelled = 0;
    module.configure(async () => {
        saveCalls++;
        assert.fail("未保存草稿或同版状态通知不得发送formation.save");
    }, async () => {
        refreshes++;
        assert.fail("仅接纳同版状态不得反向创建一次鉴权任务");
    });
    editor.configure(module, roster, saves);

    /** 用当前实际列表格子派发选择，避免引用重绘前已经回收的Cell。 */
    const selectHero = (): void => {
        editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!
            .button!.node.emit(Button.EventType.CLICK);
    };
    /** 只确认真实Prefab的显示和交互，不直接修改View私有草稿。 */
    const assertDraftAt = (position: number): void => {
        assert(editor.countLabel!.string.includes("1 / 6"));
        assert.equal(editor.slots.find(slot => slot.position === position)!.portrait!.active, true);
        assert.equal(editor.slots.find(slot => slot.position === 2)!.portrait!.active, false);
        assert.equal(editor.filterMark!.position.x, editor.elementButtons[elem].node.position.x);
        assert.equal(editor.filterMark!.position.y, editor.elementButtons[elem].node.position.y);
        assert.equal(editor.heroScroll!.content!.children.length, 1);
        assert.equal(editor.confirmButton!.interactable, true);
        assert.equal(roster.snapshot.mainFormation!.slots[0].position, 2, "未保存站位不能改权威阵容");
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
        selectHero();
        editor.slots.find(slot => slot.position === 3)!.button!.node.emit(Button.EventType.CLICK);
        editor.elementButtons[elem].node.emit(Button.EventType.CLICK);
        selectHero();
        assertDraftAt(3);
        assert(editor.tipLabel!.string.includes("已选英雄"));

        // 模拟统一鉴权首包已接纳后的同版名册提交，其他展示字段更新不能冲掉本页未保存输入。
        roster.replace({ status: "ready", heroes: [{ ...hero, level: hero.level + 1 }], error: "", mainFormation: asset });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        assertDraftAt(3);
        assert(editor.tipLabel!.string.includes("已选英雄"), "同版恢复保留当前英雄选择");
        for (let index = 0; index < 3; index++) {
            EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
            assertDraftAt(3);
            assert(editor.tipLabel!.string.includes("已选英雄"), "重复名册通知不能清掉选择");
        }
        editor.slots.find(slot => slot.position === 5)!.button!.node.emit(Button.EventType.CLICK);
        assertDraftAt(5);
        assert.equal(editor.slots.find(slot => slot.position === 3)!.portrait!.active, false,
            "恢复后点击空阵位仍使用之前选中的英雄，不能变成无选择撤下操作");
        selectHero();
        assert(editor.tipLabel!.string.includes("已选英雄"));
        await settleTasks();
        assert.equal(saveCalls, 0);
        assert.equal(refreshes, 0);
        assert.equal(confirmed, 0);
        assert.equal(saves.snapshot.pending, null);

        editor.runClose();
        assert.equal(cancelled, 1);
        assert.equal(EventDispatcher.instance.targetListenerCount(editor), 0);
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        editor.runOpen({ closeAfterSave: true, complete });
        assert.equal(editor.slots.find(slot => slot.position === 2)!.portrait!.active, true,
            "关页重开只读服务器站位，不恢复未保存草稿");
        assert.equal(editor.slots.find(slot => slot.position === 5)!.portrait!.active, false);
        assert.equal(editor.filterMark!.position.x, editor.elementButtons[0].node.position.x,
            "重开回到全部筛选，不复活旧筛选交互");
        assert(!editor.tipLabel!.string.includes("已选英雄"));
        assert.equal(Reflect.get(editor, "submitted"), null, "未保存草稿不得生成或复活出战提交意图");
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        await settleTasks();
        assert.equal(confirmed, 0, "重开及同版通知不自动出战");
        assert.equal(saveCalls, 0);
        assert.equal(refreshes, 0);
    } finally {
        editor.runClose();
        module.dispose();
        root.destroy();
    }
}

/** 验证原ACK在鉴权失败/旧首包后保留草稿，关页不出战，明确重试同步成功才完成一次。 */
async function checkMissingStateRecovery(heroes: Parameters<FormationView["render"]>[0]["heroes"]): Promise<void> {
    const root = instantiateData(read(PAGE));
    const editor = root.getComponent(FormationView) as FormationView;
    const roster = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const asset = {
        formationId: 1, unlockedIds: [1, 2], assistanceUnlocked: false, version: 0, slots: [],
        options: [
            { formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] },
            { formationId: 2, openPositions: [1, 2, 3, 5, 6, 7] },
        ],
    };
    roster.replace({ status: "ready", heroes, error: "", mainFormation: asset });
    const module = new FormationController(saves, roster);
    module.initialize();
    let saveCalls = 0;
    let refreshes = 0;
    let confirmed = 0;
    let cancelled = 0;
    let original: FormationSaveRequest | null = null;
    let finishRefresh: ((result: "failure" | "old" | "current") => void) | null = null;
    const notices: string[] = [];
    const offFeedback = UIManager.instance.bindNotice(text => notices.push(text));

    /** 模拟已校验快照提交及同步名册事件；旧版本保持空阵，不伪造ACK资产。 */
    const sync = (version: number): void => {
        roster.replace({ status: "ready", heroes, error: "", mainFormation: {
            ...asset, version, slots: version === 0 ? [] : original!.slots,
        } });
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
    };
    /** 核对页面仍显示原提交位置，编辑控件锁定，而明确同步重试按钮保持可用。 */
    const assertRetryableDraft = (): void => {
        assert(original);
        assert.deepEqual(saves.snapshot.pending, original);
        assert.equal(saves.snapshot.acknowledged, 1);
        assert.equal(roster.snapshot.mainFormation!.version, 0, "失败或旧首包不改变权威阵容");
        assert.equal(roster.snapshot.mainFormation!.slots.length, 0);
        assert(editor.countLabel!.string.includes("1 / 6"));
        assert.equal(editor.slots.find(slot => slot.position === 3)!.portrait!.active, true);
        assert.equal(editor.slots.find(slot => slot.position === 2)!.portrait!.active, false);
        assert.equal(editor.formationButton!.interactable, false);
        assert(editor.slots.every(slot => !slot.button!.interactable));
        assert(editor.heroScroll!.content!.children.every(node => !node.getComponent(HeroIconCellView)!.button!.interactable));
        assert.equal(editor.confirmButton!.interactable, true);
        assert.equal(findComponentInChildren(editor.confirmButton!.node, Label).string, "重试同步");
    };
    /** 只把明确true计为出战确认；关闭、重开和等待中的状态通知均不能代替玩家确认。 */
    const complete = (ok: boolean): void => {
        if (ok) {
            confirmed++;
        } else {
            cancelled++;
        }
    };
    module.configure(async (body, received) => {
        saveCalls++;
        original = structuredClone(body);
        const frame: GameFrame = { version: 1, kind: "response", name: Protocol.FORMATION_SAVE,
            ok: true, body: { requestId: body.requestId, version: 1 } };
        received(frame);
    }, async (received, failed) => {
        refreshes++;
        await new Promise<void>(resolve => {
            finishRefresh = result => {
                finishRefresh = null;
                if (result === "failure") {
                    failed(new Error("受控鉴权同步失败"));
                } else {
                    sync(result === "old" ? 0 : 1);
                    received();
                }
                resolve();
            };
        });
    });
    editor.configure(module, roster, saves);
    try {
        editor.runOpen({ closeAfterSave: true, complete });
        editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!.button!.node.emit(Button.EventType.CLICK);
        editor.slots.find(slot => slot.position === 3)!.button!.node.emit(Button.EventType.CLICK);
        editor.confirmButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(saveCalls, 1);
        assert.equal(refreshes, 1);
        assert.equal(confirmed, 0, "ACK本身不能开始挑战");
        assert(saves.snapshot.busy);
        assert(finishRefresh);
        finishRefresh("failure");
        await settleTasks();
        assertRetryableDraft();

        // 即使直接派发按钮事件绕过引擎禁用判断，View仍拒绝修改待确认的原草稿。
        editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!.button!.node.emit(Button.EventType.CLICK);
        editor.slots.find(slot => slot.position === 2)!.button!.node.emit(Button.EventType.CLICK);
        editor.formationButton!.node.emit(Button.EventType.CLICK);
        assertRetryableDraft();

        editor.confirmButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(saveCalls, 1, "ACK后的按钮只重试鉴权同步");
        assert.equal(refreshes, 2);
        assert(finishRefresh);
        finishRefresh("old");
        await settleTasks();
        assert.equal(refreshes, 2, "同步首包事件不能递归触发下一轮鉴权");
        assert.equal(confirmed, 0);
        assertRetryableDraft();

        editor.confirmButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(refreshes, 3);
        editor.runClose();
        assert.equal(cancelled, 1);
        assert.equal(EventDispatcher.instance.targetListenerCount(editor), 0);
        sync(0);
        assert.equal(confirmed, 0, "关页期间状态通知不能继续挑战");
        editor.runOpen({ closeAfterSave: true, complete });
        assert.deepEqual(saves.snapshot.pending, original);
        assert(editor.countLabel!.string.includes("1 / 6"));
        assert.equal(editor.slots.find(slot => slot.position === 3)!.portrait!.active, true);
        assert.equal(editor.confirmButton!.interactable, false, "刷新在途重开仍等待当前任务");
        assert.equal(findComponentInChildren(editor.confirmButton!.node, Label).string, "同步中");
        assert(finishRefresh);
        finishRefresh("old");
        await settleTasks();
        assert.equal(confirmed, 0, "关页重开已清理原出战意图，鉴权结束不能继续挑战");
        assertRetryableDraft();
        assert.equal(confirmed, 0, "重开仅恢复原待确认草稿，不自动出战");

        editor.confirmButton!.node.emit(Button.EventType.CLICK);
        await settleTasks();
        assert.equal(refreshes, 4);
        assert.equal(saveCalls, 1);
        assert(finishRefresh);
        finishRefresh("current");
        await settleTasks();
        assert.equal(confirmed, 1, "本页明确重试后，ACK与统一阵容确认才完成出战");
        assert.equal(saves.snapshot.pending, null);
        assert.equal(saves.snapshot.acknowledged, null);
        EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: roster.version });
        assert.equal(confirmed, 1, "重复统一状态不能重复出战");
        assert(notices.some(text => text.includes("已保存")));
    } finally {
        editor.runClose();
        if (finishRefresh) {
            finishRefresh("old");
            await settleTasks();
        }
        module.dispose();
        offFeedback();
    }
}

/** 核对真实绑定与人工编辑参数，并验证未保存草稿同版恢复、ACK确认和缺状态同步恢复。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
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
    const listData=data.find((row:any)=>row.__type__===contentType);listData.columns=2;listData.spacingX=18;listData.spacingY=14;
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
        assert.equal((view.heroScroll!.content!.getComponent(UITransform) as UITransform).width,580,"content width remains authored");
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
        options:[{formationId:1,openPositions:[2,3,5,6,7,8]},{formationId:2,openPositions:[1,2,3,5,6,7]}]};
    roster.replace({status:"ready",heroes,error:"",mainFormation:asset});
    const module=new FormationController(saves,roster);module.initialize();module.resetSession();
    let request:any,resolveSave!: (value:any)=>void;
    module.configure(async (body,received,failed)=>{
        request=body;
        try { received(await new Promise(resolve=>{resolveSave=resolve;})); } catch(error) { failed(error); }
    });
    editor.configure(module,roster,saves);editor.runOpen({complete:()=>{}});
    editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!.button!.node.emit(Button.EventType.CLICK);
    editor.slots.find(slot=>slot.position===3)!.button!.node.emit(Button.EventType.CLICK);
    assert.equal(roster.snapshot.mainFormation!.slots.length,0,"选位不能提前修改资产");
    assert(editor.countLabel!.string.includes("1 / 6"));
    editor.confirmButton!.node.emit(Button.EventType.CLICK);assert(saves.snapshot.busy);
    await settleTasks();
    editor.runClose();assert.equal(EventDispatcher.instance.targetListenerCount(editor),0);
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:1}});
    await settleTasks();
    assert.equal(saves.snapshot.acknowledged,1,"关闭窗口不销毁保存回执处理");
    assert.deepEqual(saves.snapshot.pending, request, "ACK后原提交参数保留到统一状态确认");
    roster.replace({status:"ready",heroes,error:"",mainFormation:{...asset,version:1,slots:request.slots}});
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{revision:roster.version});
    editor.runOpen({complete:()=>{}});
    assert.equal(feedback.length, 0, "重开页面不重播历史保存结果");
    assert(!editor.tipLabel!.string.includes("已保存"), "固定操作说明不再充当结果提示区");
    assert(editor.countLabel!.string.includes("1 / 6"));
    editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!.button!.node.emit(Button.EventType.CLICK);
    editor.slots.find(slot=>slot.position===2)!.button!.node.emit(Button.EventType.CLICK);
    assert.equal(roster.snapshot.mainFormation!.slots[0].position,3,"再次编辑仍只修改页面草稿");
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
    assert.equal(cellData.find((row:any)=>row.__type__==="cc.Node"&&row._name==="Stars")._active,true,"the star Layout container must remain visible when individual stars toggle");
    assert(cellData.some((row:any)=>row.__type__==="cc.Layout"&&row._layoutType===1),"stars use an authored horizontal Layout");
    await checkUnsavedDraftRecovery(heroes);
    await checkMissingStateRecovery(heroes);
    console.log("formation-view-check passed: real Prefab bindings, Inspector edits, unsaved draft/selection/filter after same-version recovery, no implicit writes, original ACK draft, locked editing, explicit sync-only retry, close/reopen retention and exactly one battle confirmation");
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
