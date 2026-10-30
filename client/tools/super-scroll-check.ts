import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Label, Mask, Node, Prefab, resources, Sprite, SpriteFrame, UITransform, Vec2 } from "cc";
import { setEditorContext } from "./cc-env";
import { SuperAxis, SuperContent, SuperLayout } from "../assets/scripts/framework/ui/SuperContent";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { BagItemView } from "../assets/scripts/features/Bag/ui/BagItemView";

function node(name: string, width: number, height: number, parent?: Node): Node {
    const result = new Node(name); const ui = result.addComponent(UITransform);
    ui.setContentSize(width,height); ui.setAnchorPoint(0,1); if(parent) result.parent=parent; return result;
}
function prefab(width=40,height=30): Prefab {
    const result = new Prefab() as any;
    const make=()=>{const cell=node("Cell",width,height);(cell.getComponent(UITransform) as UITransform).setAnchorPoint(0.5,0.5);return cell;};
    result.data=make(); result._instantiate=make; return result;
}
function fixture(): {list:SuperContent;scroll:SuperScroll} {
    const host=node("TestScroll",240,120), view=node("view",240,120,host), content=node("content",240,120,view);
    view.addComponent(Mask);
    const list=content.addComponent(SuperContent) as SuperContent;
    list.cellPrefab=prefab();list.spacingX=8;list.spacingY=6;list.paddingLeft=12;list.paddingRight=14;list.paddingTop=10;list.paddingBottom=16;
    list.columns=3;list.rows=2;
    const scroll=host.addComponent(SuperScroll) as SuperScroll;scroll.content=content;scroll.onEnable();
    return {list,scroll};
}
const data=(count:number)=>Array.from({length:count},(_,index)=>"Cell "+index);

function checkLayouts(): void {
    const {list,scroll}=fixture();
    const cases=[
        {mode:SuperLayout.Vertical,axis:SuperAxis.Vertical,width:240,height:668},
        {mode:SuperLayout.Horizontal,axis:SuperAxis.Horizontal,width:882,height:120},
        {mode:SuperLayout.Grid,axis:SuperAxis.Vertical,width:240,height:236},
        {mode:SuperLayout.Grid,axis:SuperAxis.Horizontal,width:450,height:120},
    ];
    for(const spec of cases) {
        list.layoutType=spec.mode;list.gridAxis=spec.axis;
        for(const count of [0,1,3,18]) {
            list.setData(data(count),(cell,item)=>{cell.name=item;});
            assert.equal(list.length,count);assert.equal(list.node.children.length,count);
            assert.equal(scroll.vertical,spec.axis===SuperAxis.Vertical);assert.equal(scroll.horizontal,!scroll.vertical);
            const ui=list.node.getComponent(UITransform) as UITransform;
            if(count===18) {assert.equal(ui.width,spec.width);assert.equal(ui.height,spec.height);}
            if(count<=1) {assert.equal(ui.width,240);assert.equal(ui.height,120);}
            if(count) {assert.equal(list.node.children[0].position.x,32);assert.equal(list.node.children[0].position.y,-25);}
        }
        scroll.restorePosition(new Vec2(100,90));
        const before=scroll.readPosition();list.setData(data(18),()=>{});
        assert.deepEqual(scroll.readPosition(),before,"same-size refresh retains scroll position");
        list.setData(data(1),()=>{});assert.deepEqual(scroll.readPosition(),new Vec2(0,0),"shorter data clamps to legal range");
    }
    list.layoutType=SuperLayout.Grid;list.gridAxis=SuperAxis.Vertical;
    let renders:number[]=[];
    list.setData(data(3),(_,__,index)=>renders.push(index));
    const original=list.node.children.slice();renders=[];list.refresh(1);
    assert.deepEqual(renders,[1]);list.refresh();assert.deepEqual(renders,[1,0,1,2]);
    assert.deepEqual(list.node.children,original,"refresh reuses nodes");
    assert.throws(()=>list.refresh(3),/refresh\(index\)/);
    list.cellPrefab=prefab(64,44);list.setData(data(3),()=>{});
    assert(original.every(cell=>!cell.isValid),"replacing the Prefab invalidates old cells");
    assert.equal((list.node.children[0].getComponent(UITransform) as UITransform).width,64);
    list.overrideCellSize=true;list.explicitCellSize.width=80;list.explicitCellSize.height=50;list.refresh();
    assert.equal((list.node.children[0].getComponent(UITransform) as UITransform).width,80);
    assert.equal(list.node.children[0].scale.x,1,"size override does not scale Cell artwork");
    list.overrideCellSize=false;list.refresh();
    assert.equal((list.node.children[0].getComponent(UITransform) as UITransform).width,64,"turning the override off restores the Prefab size");
    list.clear();assert.equal(list.node.children.length,0);
    list.cellPrefab=prefab();
    (list.cellPrefab as any).data.getComponent(UITransform).setAnchorPoint(0,1);
    (list.cellPrefab as any)._instantiate=()=>node("NonCentredCell",40,30);
    for(const mode of [SuperLayout.Vertical,SuperLayout.Horizontal,SuperLayout.Grid]) {
        list.layoutType=mode;list.gridAxis=SuperAxis.Horizontal;
        list.setData(data(5),()=>{});
        assert.equal(list.node.children[0].position.x,12);assert.equal(list.node.children[0].position.y,-10);
    }
    list.cellPrefab=null;assert.throws(()=>list.setData([],()=>{}),/content.*cellPrefab/);
    scroll.content=null;assert.throws(()=>scroll.validateBindings(),/TestScroll.*Content/);
}

function checkCellReuse(): void {
    const root=node("BackpackItemCell",96,96), cell=root.addComponent(BagItemView) as BagItemView;
    cell.button=root.addComponent(Button);cell.frame=node("frame",96,96,root);cell.frame.addComponent(Sprite);
    cell.icon=node("icon",64,64,root);cell.icon.addComponent(Sprite);cell.count=node("count",96,24,root).addComponent(Label);
    cell.selectMark=node("selected",96,96,root);
    const pending:Array<{path:string;done:(error:any,asset:any)=>void}>=[];const original=resources.load;
    resources.load=(path,type,done)=>{pending.push({path,done});};
    try {
        let old=0,current=0;
        const face=(icon:string)=>({icon,frame:"frame/"+icon,title:icon,typeLine:"",body:"",fallback:""});
        cell.show({itemId:1,quantity:1},false,()=>old++,face("A"));
        for(let i=0;i<5;i++) cell.show({itemId:2,quantity:2},true,()=>current++,face("B"));
        root.emit(Button.EventType.CLICK);assert.equal(old,0);assert.equal(current,1,"a refresh cannot duplicate click callbacks");
        const b=new SpriteFrame(),a=new SpriteFrame();
        pending.filter(row=>row.path==="B/spriteFrame").forEach(row=>row.done(null,b));
        pending.filter(row=>row.path==="A/spriteFrame").forEach(row=>row.done(null,a));
        assert.equal((cell.icon.getComponent(Sprite) as Sprite).spriteFrame,b,"late A must not overwrite B");
        cell.show(null,false,null);root.emit(Button.EventType.CLICK);assert.equal(current,1);assert.equal(cell.button.interactable,false);
        pending.filter(row=>row.path==="B/spriteFrame").forEach(row=>row.done(null,b));
        assert.equal(cell.icon.active,false,"late responses cannot revive an empty cell");
        cell.show({itemId:3,quantity:1},false,null,face("C"));cell.onDestroy();
        pending.filter(row=>row.path==="C/spriteFrame").forEach(row=>row.done(null,a));
        assert.equal((cell.icon.getComponent(Sprite) as Sprite).spriteFrame,null,"destroy cancels pending paints");
    } finally {resources.load=original;}
}

function checkEditorPreview(): void {
    const {list}=fixture();
    try {
        setEditorContext(true,false);list.previewCount=6;(list as any).update();
        assert.equal(list.node.children.length,6);
        assert(list.node.children.every(cell=>cell.name.startsWith("__SuperContentPreview__")&&(cell.hideFlags&24)===24));
        assert.equal(list.length,0,"editor samples are not runtime data");
        list.previewCount=0;(list as any).update();assert.equal(list.node.children.length,0);
        setEditorContext(false,true);list.previewCount=6;(list as any).update();assert.equal(list.node.children.length,0,"preview samples cannot become player inventory");
        const source=JSON.parse(readFileSync("client/assets/prefabs/ui/backpack/BackpackLayer.prefab","utf8"));
        assert.equal(source.find((row:any)=>"previewCount"in row).previewCount,0);
        assert(!source.some((row:any)=>row._name?.startsWith("__SuperContentPreview__")));
    } finally {setEditorContext(false,true);}
}
checkLayouts();checkCellReuse();checkEditorPreview();
console.log("super-scroll-check passed: layout boundaries, reuse, offset preservation/clamp, compatible Prefab, explicit bindings, async icon races and editor-only samples");
