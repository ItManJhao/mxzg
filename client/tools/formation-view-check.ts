/** 出阵 Prefab 绑定与编辑参数回归；同时拒绝头像空按钮截获阵位点击。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Color, Label, Mask, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";
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

const PAGE = "client/assets/bundles/hero/prefabs/FormationView.prefab";
const CELL = "client/assets/bundles/hero/prefabs/FormationHeroCellView.prefab";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
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

/** Read authoring data rather than a second hand-built layout fixture. Not an engine replacement. */
function instantiateData(data: any[]): Node {
    const objects = new Map<number, any>();
    data.forEach((row, id) => { if (row.__type__ === "cc.Node") { const node = new Node(row._name); node.active = row._active; node.setPosition(row._lpos.x,row._lpos.y,row._lpos.z); node.setScale(row._lscale.x,row._lscale.y,row._lscale.z); objects.set(id,node); } });
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
        roster.reset("role-test"); saves.reset("role-test");
        roster.replace({ status: "ready", heroes: [], error: "", mainFormation: { formationId: 1,
            unlockedIds: [1, 2], assistanceUnlocked: false, version: 0, slots: [],
            options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }, { formationId: 2, openPositions: [1, 2, 3, 5, 6, 7] }] } });
        screen.configure(new FormationController(saves, roster), roster, saves,
            new HeroCatalog({rows:[{type:10101001,note:"Test",elem:1}]},{rows:[]}));
    }
    return root;
}

/** 核对真实序列化绑定、阵位点击归属及现有编辑参数行为。 */
async function main(): Promise<void> {
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
    const catalog=new HeroCatalog({rows:[{type:10101001,note:"Test",elem:1}]},{rows:[]});
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
    const editRoot=instantiateData(read(PAGE)), editor=editRoot.getComponent(FormationView) as FormationView;
    const roster=new HeroRosterModel(), saves=new FormationSaveModel(); roster.reset("edit-role");
    const asset={formationId:1,unlockedIds:[1,2],assistanceUnlocked:false,version:0,slots:[],
        options:[{formationId:1,openPositions:[2,3,5,6,7,8]},{formationId:2,openPositions:[1,2,3,5,6,7]}]};
    roster.replace({status:"ready",heroes,error:"",mainFormation:asset});
    const module=new FormationController(saves,roster);module.initialize();module.resetSession("edit-role");
    let request:any,resolveSave!: (value:any)=>void;
    module.configure(async (body,received,failed)=>{
        request=body;
        try { received(await new Promise(resolve=>{resolveSave=resolve;})); } catch(error) { failed(error); }
    });
    editor.configure(module,roster,saves,catalog);editor.runOpen({complete:()=>{}});
    editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!.button!.node.emit(Button.EventType.CLICK);
    editor.slots.find(slot=>slot.position===3)!.button!.node.emit(Button.EventType.CLICK);
    assert.equal(roster.snapshot.mainFormation!.slots.length,0,"选位不能提前修改资产");
    assert(editor.countLabel!.string.includes("1 / 6"));
    editor.confirmButton!.node.emit(Button.EventType.CLICK);assert(saves.snapshot.busy);
    editor.runClose();assert.equal(EventDispatcher.instance.targetListenerCount(editor),0);
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:1}});
    await Promise.resolve();await Promise.resolve();
    assert.equal(saves.snapshot.acknowledged,1,"关闭窗口不销毁保存回执处理");
    roster.replace({status:"ready",heroes,error:"",mainFormation:{...asset,version:1,slots:request.slots}});
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{roleKey:roster.roleKey,revision:roster.version});
    editor.runOpen({complete:()=>{}});assert(editor.tipLabel!.string.includes("已保存"));assert(editor.countLabel!.string.includes("1 / 6"));
    editor.heroScroll!.content!.children[0].getComponent(HeroIconCellView)!.button!.node.emit(Button.EventType.CLICK);
    editor.slots.find(slot=>slot.position===2)!.button!.node.emit(Button.EventType.CLICK);
    assert.equal(roster.snapshot.mainFormation!.slots[0].position,3,"再次编辑仍只修改页面草稿");
    editor.runClose();editor.runOpen({complete:()=>{}});
    assert(editor.countLabel!.string.includes("1 / 6"));
    editor.runClose();
    let confirmed = 0;
    editor.runOpen({closeAfterSave:true, complete:ok=>{if(ok)confirmed++;}});
    editor.confirmButton!.node.emit(Button.EventType.CLICK);
    assert.equal(confirmed,0,"提交出战草稿不能立即开始挑战");
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:2}});
    await Promise.resolve();await Promise.resolve();
    assert.equal(confirmed,0,"仅回执未同步权威阵容不能开始挑战");
    roster.replace({status:"ready",heroes,error:"",mainFormation:{...asset,version:2,slots:request.slots}});
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{roleKey:roster.roleKey,revision:roster.version});
    assert.equal(confirmed,1,"回执与权威阵容都确认后只通知一次出战");
    EventDispatcher.instance.emit(HeroRosterEvent.Updated,{roleKey:roster.roleKey,revision:roster.version});
    assert.equal(confirmed,1);
    editor.runClose();
    editor.runOpen({closeAfterSave:true, complete:ok=>{if(ok)confirmed++;}});
    editor.confirmButton!.node.emit(Button.EventType.CLICK);
    resolveSave({version:1,kind:"response",name:Protocol.FORMATION_SAVE,ok:true,body:{requestId:request.requestId,version:2}});
    await Promise.resolve();await Promise.resolve();
    assert.equal(confirmed,2,"阵容不变时成功回执允许相同版本出战");
    editor.runClose();module.dispose();
    const broken=instantiateData(read(PAGE)).getComponent(FormationView) as FormationView;
    broken.confirmButton=null;
    assert.throws(()=>broken.runOpen({complete:()=>{throw Error("binding failure must not be swallowed as Cancel");}}),/FormationView.prefab.*confirmButton/);
    broken.runClose();
    const badCellPage=instantiateData(read(PAGE)).getComponent(FormationView) as FormationView;
    ((badCellPage.heroScroll!.list.cellPrefab as any).data.getComponent(HeroIconCellView) as HeroIconCellView).button=null;
    assert.throws(()=>badCellPage.runOpen({complete:()=>{}}),/button/);
    const brokenCell=instantiateData(read(CELL)).getComponent(HeroIconCellView) as HeroIconCellView;
    brokenCell.button=null;
    assert.throws(()=>brokenCell.show({} as any,null),/button/);
    const cellData=read(CELL);
    assert.equal(cellData.find((row:any)=>row.__type__==="cc.Node"&&row._name==="Stars")._active,true,"the star Layout container must remain visible when individual stars toggle");
    assert(cellData.some((row:any)=>row.__type__==="cc.Layout"&&row._layoutType===1),"stars use an authored horizontal Layout");
    console.log("formation-view-check passed: SuperScroll/Content serialized binding, serialized Inspector edits survive render/reopen, authored Mask/ScrollView, dynamic grid and explicit binding errors");
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
