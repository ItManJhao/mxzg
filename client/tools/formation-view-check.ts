import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Color, Label, Mask, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";
import { FormationView } from "../assets/scripts/features/hero/ui/FormationView";
import { FormationSlotView } from "../assets/scripts/features/hero/ui/FormationSlotView";
import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";
import { HeroCatalog } from "../assets/scripts/features/hero/HeroCatalog";

const PAGE = "client/assets/prefabs/ui/hero/HeroSelectLayer.prefab";
const CELL = "client/assets/prefabs/ui/hero/HeroIconCell.prefab";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
function classId(path: string): string {
    const hex = read(path).uuid.replace(/-/g, ""), alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let id = hex.slice(0, 5);
    for (let i = 5; i < hex.length; i += 3) { const value = parseInt(hex.slice(i, i + 3), 16); id += alphabet[value >> 6] + alphabet[value & 63]; }
    return id;
}
const viewType = classId("client/assets/scripts/features/hero/ui/FormationView.ts.meta");
const slotType = classId("client/assets/scripts/features/hero/ui/FormationSlotView.ts.meta");
const cellType = classId("client/assets/scripts/features/hero/ui/HeroIconCellView.ts.meta");
const classes: Record<string, any> = { "cc.Button": Button, "cc.Label": Label, "cc.Sprite": Sprite,
    "cc.UITransform": UITransform, "cc.Mask": Mask, "cc.ScrollView": ScrollView,
    [viewType]: FormationView, [slotType]: FormationSlotView, [cellType]: HeroIconCellView };

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
        if (row.__type__ === "cc.ScrollView") { value.content=reference(row._content); value.horizontal=row.horizontal; value.vertical=row.vertical; }
        if ([viewType,slotType,cellType].includes(row.__type__)) for (const [key, field] of Object.entries(row)) {
            if (!key.startsWith("_") && key !== "node") value[key]=reference(field);
        }
    });
    return objects.get(1);
}

function main(): void {
    const data = read(PAGE), authored = data.find((row: any) => row.__type__ === viewType);
    // Simulate ordinary Inspector edits in serialized authoring data.
    const title = data[authored.titleLabel.__id__]; title._fontSize=44; title._string="人工修改标题";
    const button = data[data[authored.confirmButton.__id__].node.__id__]; button._lpos.x=344; button._lpos.y=96;
    authored.columns=2; authored.cellStep={__type__:"cc.Vec2",x:124,y:148};
    const root=instantiateData(data), view=root.getComponent(FormationView) as FormationView;
    const fixedChildren=root.children.map(node=>node.name);
    const catalog=new HeroCatalog({rows:[{type:10101001,note:"Test",elem:1}]},{rows:[]});
    const heroes=[1,2,3].map(id=>({id:"00000000-0000-4000-8000-"+String(id).padStart(12,"0"),templateId:10101001,level:1,star:1}));
    const state={heroes,lineup:{version:1,slots:[{position:2,heroId:heroes[0].id}]},busy:false,message:"已加载"};
    let cancels=0;
    for (let reopen=0;reopen<3;reopen++) {
        view.runOpen({complete:()=>{cancels++;}});
        const off=view.bind({toggle:()=>{},remove:()=>{},confirm:()=>{},cancel:()=>{},retry:()=>{}},catalog);
        view.render(state); view.render({...state,busy:true}); view.render(state);
        assert.equal(view.titleLabel!.fontSize,44); assert.equal(view.titleLabel!.string,"人工修改标题");
        assert.equal(view.confirmButton!.node!.position.x,344); assert.equal(view.confirmButton!.node!.position.y,96);
        assert.deepEqual(root.children.map(node=>node.name),fixedChildren,"opening must not create/reparent static UI");
        const cells=view.grid!.children;
        assert.equal(cells.length,3); assert.equal(cells[1].position.x-cells[0].position.x,124);
        assert.equal(cells[0].position.y-cells[2].position.y,148);
        assert.equal((view.scrollContent!.getComponent(UITransform) as UITransform).width,580,"content width remains authored");
        assert.equal((view.scrollPort!.getComponent(Mask) as Mask).node,view.scrollPort);
        off(); view.runClose();
    }
    assert.equal(cancels,3);
    const broken=instantiateData(read(PAGE)).getComponent(FormationView) as FormationView;
    broken.confirmButton=null;
    assert.throws(()=>broken.runOpen({complete:()=>{throw Error("binding failure must not be swallowed as Cancel");}}),/HeroSelectLayer.prefab.*confirmButton/);
    broken.runClose();
    const badCellPage=instantiateData(read(PAGE)).getComponent(FormationView) as FormationView;
    ((badCellPage.cellPrefab as any).data.getComponent(HeroIconCellView) as HeroIconCellView).button=null;
    assert.throws(()=>badCellPage.runOpen({complete:()=>{}}),/HeroIconCell.prefab.*button/);
    const brokenCell=instantiateData(read(CELL)).getComponent(HeroIconCellView) as HeroIconCellView;
    brokenCell.button=null;
    assert.throws(()=>brokenCell.show({} as any,null),/HeroIconCell.prefab.*button/);
    const cellData=read(CELL);
    assert.equal(cellData.find((row:any)=>row.__type__==="cc.Node"&&row._name==="Stars")._active,true,"the star Layout container must remain visible when individual stars toggle");
    assert(cellData.some((row:any)=>row.__type__==="cc.Layout"&&row._layoutType===1),"stars use an authored horizontal Layout");
    console.log("formation-view-check passed: serialized Inspector edits survive render/reopen, authored Mask/ScrollView, dynamic grid and explicit binding errors");
}
main();
