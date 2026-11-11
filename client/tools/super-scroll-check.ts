/** 通用列表回归：验证布局、滚动边界、当前条目渲染/选择和编辑器隔离；当前列表尚未虚拟化。 */
import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { Button, Label, Mask, Node, Prefab, resources, Sprite, SpriteFrame, UITransform, Vec2 } from "cc";
import { setEditorContext } from "./cc-env";
import { SuperAxis, SuperContent, SuperLayout } from "../assets/scripts/framework/ui/SuperContent";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";

/** 本轮通用夹具的实际节点统计，供验收记录区分逻辑量和池量，不代表真机内存。 */
const virtualSamples: Array<{ layout: number; axis: number; data: number; nodes: number; renders: number }> = [];

function node(name: string, width: number, height: number, parent?: Node): Node {
    const result = new Node(name); const ui = result.addComponent(UITransform);
    ui.setContentSize(width,height); ui.setAnchorPoint(0,1); if(parent) result.parent=parent; return result;
}
function prefab(width=40,height=30): Prefab {
    const result = new Prefab() as any;
    const make=()=>{const cell=node("Cell",width,height);(cell.getComponent(UITransform) as UITransform).setAnchorPoint(0.5,0.5);return cell;};
    result.data=make(); result._instantiate=make; return result;
}
/** 原布局断言显式使用全量模式；虚拟化专项传true，复用同一Inspector参数。 */
function fixture(virtual = false): {list:SuperContent;scroll:SuperScroll} {
    const host=node("TestScroll",240,120), view=node("view",240,120,host), content=node("content",240,120,view);
    view.addComponent(Mask);
    const list=content.addComponent(SuperContent) as SuperContent;
    list.virtual=virtual;
    list.cellPrefab=prefab();list.spacingX=8;list.spacingY=6;list.paddingLeft=12;list.paddingRight=14;list.paddingTop=10;list.paddingBottom=16;
    list.columns=3;list.rows=2;
    const scroll=host.addComponent(SuperScroll) as SuperScroll;scroll.content=content;scroll.onEnable();
    (list as any).onEnable();
    return {list,scroll};
}

/** 大数据时节点数由视口决定，末项可达，滚动换绑后点击只提交当前逻辑条目。 */
function checkVirtualLists(): void {
    for (const layout of [SuperLayout.Vertical, SuperLayout.Horizontal, SuperLayout.Grid]) {
        for (const axis of [SuperAxis.Vertical, SuperAxis.Horizontal]) {
            const { list, scroll } = fixture(true);
            list.layoutType = layout;
            list.gridAxis = axis;
            const selected: string[] = [];
            list.node.on(SuperContent.SELECT_ITEM, (item: string) => selected.push(item));
            let renders = 0;
            const render = (cell: Node, item: string) => {
                renders++;
                cell.name = item;
            };
            list.setData(data(1000), render);
            assert.equal(list.length, 1000);
            assert(list.pooledCount < 50, "千条数据不能创建千个节点");
            virtualSamples.push({ layout, axis, data: 1000, nodes: list.pooledCount, renders });
            scroll.restorePosition(new Vec2(0, 0));
            const pool = list.node.children.slice();
            const before = renders;
            list.updateLayout();
            assert.equal(renders, before, "几何和范围不变时不重复渲染");
            const max = scroll.getMaxScrollOffset();
            scroll.restorePosition(max);
            const last = list.node.children.find(cell => cell.active && cell.name === "Cell 999");
            assert(last, "末项必须可滚到且实际渲染");
            last.emit(Button.EventType.CLICK);
            assert.equal(selected.pop(), "Cell 999", "选择读取换绑后的数据，不读池下标");
            assert(list.node.children.some(cell => pool.includes(cell)), "大跨度跳转复用已有节点");

            list.setData(data(10000), render);
            scroll.restorePosition(scroll.getMaxScrollOffset());
            assert(list.node.children.some(cell => cell.active && cell.name === "Cell 9999"));
            assert(list.pooledCount < 50, "一万条数据池量仍受视口限制");
            assert(renders < 200, "跳到远端不能逐条渲染中间一万条");
            virtualSamples.push({ layout, axis, data: 10000, nodes: list.pooledCount, renders });
            const offscreen = renders;
            list.refresh(0);
            assert.equal(renders, offscreen, "离屏单条刷新等待进入视口，不创建节点");

            let stops = 0;
            scroll.stopAutoScroll = () => { stops++; };
            const position = list.node.position;
            list.node.setPosition(position.x + 1, position.y - 1, position.z);
            list.updateLayout();
            assert.equal(stops, 0, "滚动和原生布局帧不应停止惯性");
            list.setData(data(1), render);
            assert.equal(list.pooledCount, 1);
            assert.equal(list.node.children[0].name, "Cell 0");
            assert.equal(scroll.readPosition().x, 0);
            assert.equal(scroll.readPosition().y, 0);
            list.clear();
            assert.equal(list.pooledCount, 0);
        }
    }
}

/** 不同锚点和Cell正缩放仍按原几何显示，视口改变后池量重新收敛。 */
function checkVirtualAnchorsAndResize(): void {
    const { list, scroll } = fixture(true);
    const port = list.node.parent!.getComponent(UITransform)!;
    port.setAnchorPoint(0.5, 0.5);
    list.node.getComponent(UITransform)!.setAnchorPoint(0.5, 1);
    const template = new Prefab() as any;
    const make = () => {
        const cell = node("AnchoredCell", 40, 30);
        cell.getComponent(UITransform)!.setAnchorPoint(0, 1);
        cell.setScale(2, 0.5, 1);
        return cell;
    };
    template.data = make();
    template._instantiate = make;
    list.cellPrefab = template;
    list.setData(data(10000), (cell, item) => { cell.name = item; });
    scroll.toStart();
    const first = list.node.children.find(cell => cell.active && cell.name === "Cell 0")!;
    assert.equal(first.position.x + list.node.position.x, -120 + list.paddingLeft);
    assert.equal(first.position.y + list.node.position.y, 60 - list.paddingTop);
    assert.equal(first.scale.x, 2, "保留Cell原缩放，不按视口压缩单格");
    port.setContentSize(243.25, 600);
    assert(list.pooledCount < 100, "视口增高只扩大可见池，不跟随一万条数据");
    scroll.restorePosition(scroll.getMaxScrollOffset());
    assert(list.node.children.some(cell => cell.active && cell.name === "Cell 9999"), JSON.stringify({
        max: scroll.getMaxScrollOffset(), position: list.node.position,
        geometry: (list as any).geometry,
        visible: list.node.children.filter(cell => cell.active).map(cell => cell.name),
    }));
    port.setContentSize(243.25, 117.75);
    assert(list.pooledCount < 40, "视口缩小释放多余池节点");
    list.node.parent!.setScale(0.5, 0.5, 1);
    assert.throws(() => list.validateBindings(), /view\/content局部缩放/);
    list.node.parent!.setScale(1, 1, 1);
    list.clear();
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

/** 验证页面只登记一次渲染/选择后提交数据，复用格子不会选中旧条目或重复回调。 */
function checkListEvents(): void {
    const { list } = fixture();
    const rendered: Array<{ item: string; index: number }> = [];
    const selected: Array<{ item: string; index: number }> = [];
    const onRender = (_cell: Node, item: string, index: number) => rendered.push({ item, index });
    const onSelect = (item: string, index: number) => selected.push({ item, index });
    list.node.on(SuperContent.RENDER_ITEM, onRender);
    list.node.on(SuperContent.SELECT_ITEM, onSelect);
    list.setData(["旧英雄A", "旧英雄B"]);
    assert.deepEqual(rendered, [{ item: "旧英雄A", index: 0 }, { item: "旧英雄B", index: 1 }]);
    const first = list.node.children[0];
    const removed = list.node.children[1];
    first.emit(Button.EventType.CLICK);
    list.setData(["新英雄"]);
    assert.equal(list.node.children[0], first);
    first.emit(Button.EventType.CLICK);
    removed.emit(Button.EventType.CLICK);
    assert.deepEqual(selected, [{ item: "旧英雄A", index: 0 }, { item: "新英雄", index: 0 }]);

    const button = first.addComponent(Button);
    button.interactable = false;
    first.emit(Button.EventType.CLICK);
    button.interactable = true;
    list.node.active = false;
    first.emit(Button.EventType.CLICK);
    list.node.active = true;
    assert.equal(selected.length, 2, "禁用按钮或隐藏列表不派发选择");

    list.node.off(SuperContent.RENDER_ITEM, onRender);
    list.node.off(SuperContent.SELECT_ITEM, onSelect);
    first.emit(Button.EventType.CLICK);
    list.setData(["关闭后数据"]);
    assert.equal(selected.length, 2, "关页解除监听后不再回调页面");
    list.node.on(SuperContent.SELECT_ITEM, onSelect);
    first.emit(Button.EventType.CLICK);
    assert.deepEqual(selected[2], { item: "关闭后数据", index: 0 });
    assert.equal(selected.length, 3, "重开只登记一次选择");
    list.clear();
    first.emit(Button.EventType.CLICK);
    assert.equal(selected.length, 3, "清空后旧格子不再选择");
    list.setData(["销毁前英雄"]);
    const last = list.node.children[0];
    (list as any).onDestroy();
    last.emit(Button.EventType.CLICK);
    assert.equal(selected.length, 3, "组件销毁后保留的旧节点不再回调页面");

    const destroyed = fixture().list;
    destroyed.setData(["引擎先销毁的子格子"]);
    const deadCell = destroyed.node.children[0];
    deadCell.destroy();
    deadCell.off = () => { throw new Error("已销毁节点不再有可访问的输入处理器"); };
    assert.doesNotThrow(() => (destroyed as any).onDestroy(), "引擎先销毁子节点时仍能清理列表");
}

async function checkCellReuse(): Promise<void> {
    const root=node("BagItemView",96,96), cell=root.addComponent(BagItemView) as BagItemView;
    cell.emptyFrame=new SpriteFrame();
    cell.button=root.addComponent(Button);cell.frame=node("frame",96,96,root);cell.frame.addComponent(Sprite);
    cell.icon=node("icon",64,64,root);cell.icon.addComponent(Sprite);cell.count=node("count",96,24,root).addComponent(Label);
    cell.selectMark=node("selected",96,96,root);
    const pending:Array<{path:string;done:(error:any,asset:any)=>void}>=[];const original=resources.load;
    resources.load=(path,type,done)=>{pending.push({path,done});};
    try {
        const face=(icon:string)=>({icon,frame:"frame/"+icon,title:icon,typeLine:"",body:"",fallback:"fixture/fallback"});
        cell.show({itemId:1,quantity:1},false,face("fixture/A"));
        for(let i=0;i<5;i++) cell.show({itemId:2,quantity:2},true,face("fixture/B"));
        assert.equal(cell.button.interactable,true,"selectable state belongs to the current display item");
        await new Promise(resolve => setImmediate(resolve));
        const b=new SpriteFrame(),a=new SpriteFrame();
        pending.filter(row=>row.path==="fixture/B/spriteFrame").forEach(row=>row.done(null,b));
        pending.filter(row=>row.path==="fixture/A/spriteFrame").forEach(row=>row.done(null,a));
        await new Promise(resolve => setImmediate(resolve));
        assert.equal((cell.icon.getComponent(Sprite) as Sprite).spriteFrame,b,"late A must not overwrite B");
        cell.show(null,false);assert.equal(cell.button.interactable,false);
        cell.show(null,false,undefined,true);assert.equal(cell.button.interactable,true,"empty bag slots may retain their page hint");
        pending.filter(row=>row.path==="fixture/B/spriteFrame").forEach(row=>row.done(null,b));
        assert.equal(cell.icon.active,false,"late responses cannot revive an empty cell");
        cell.show({itemId:3,quantity:1},false,face("fixture/C"));cell.onDestroy();
        pending.filter(row=>row.path==="fixture/C/spriteFrame").forEach(row=>row.done(null,a));
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
        const source=JSON.parse(readFileSync("client/assets/bundles/module/bag/prefabs/BagView.prefab","utf8"));
        assert.equal(source.find((row:any)=>"previewCount"in row).previewCount,0);
        assert(!source.some((row:any)=>row._name?.startsWith("__SuperContentPreview__")));
    } finally {setEditorContext(false,true);}
}

/** 使用当前胜利页实际网格参数，验证逻辑尺寸、末行可达、刷新保位与缩短归位。 */
function checkRewardLayout(): void {
    const source=JSON.parse(readFileSync("client/assets/bundles/module/battle/prefabs/ChapterEndView.prefab","utf8"));
    const config=source.find((row:any)=>row.columns!==undefined&&row.layoutType===SuperLayout.Grid);
    const {list,scroll}=fixture(true);
    list.node.parent!.getComponent(UITransform)!.setContentSize(580,250);
    list.cellPrefab=prefab(96,96);
    for(const field of ["columns","rows","layoutType","gridAxis"] as const)list[field]=config[field];
    for(const field of ["paddingLeft","paddingRight","paddingTop","paddingBottom","spacingX","spacingY"] as const)list[field]=config["_"+field];
    list.setData(data(20),(cell,item)=>{cell.name=item;});
    assert.equal(list.node.getComponent(UITransform)!.height,568);
    scroll.restorePosition(new Vec2(0,318));
    assert.equal(scroll.readPosition().y,318,"末行必须可达");
    list.refresh();assert.equal(scroll.readPosition().y,318,"刷新保留滚动位置");
    list.setData(data(7),()=>{});assert.equal(scroll.readPosition().y,0,"缩短后不能停留空白区域");
    const content=source[config.node.__id__];
    const port=source[content._parent.__id__];
    assert.equal(port._name,"view");assert(port._components.some((ref:any)=>source[ref.__id__].__type__==="cc.Mask"));
    assert.equal(content._name,"content");
}

/** 依次核对列表几何、页面监听生命周期、异步图标和实际奖励模板。 */
async function main(): Promise<void> {
    checkLayouts();
    checkVirtualLists();
    checkVirtualAnchorsAndResize();
    checkListEvents();
    await checkCellReuse();
    checkEditorPreview();
    checkRewardLayout();
    writeFileSync("client/temp/virtual-list-unit-metrics.json", JSON.stringify({
        source: "通用列表隔离夹具，不是真机或发布包性能测量",
        samples: virtualSamples,
    }, null, 2) + "\n");
}
void main().then(() => {
    console.log("super-scroll-check passed: virtual 1000/10000 items, bounded pools, current selection, geometry, resize, scroll preservation and async image races");
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
