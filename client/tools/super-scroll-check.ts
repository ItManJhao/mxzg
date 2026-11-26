/** 通用列表回归：验证虚拟池、静态布局、短行居中、滚动边界、当前选择、结算奖励区域及编辑器隔离。 */
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

/** 变高聊天行保持真实间距，前插时的索引偏移可保持原消息位置，池量仍受视口限制。 */
function checkVariableRows(): void {
    const { list, scroll } = fixture(true);
    list.layoutType = SuperLayout.Vertical;
    const paint = (cell: Node, value: string): void => { cell.name = value; };
    list.setData(["短", "长", "第三行"], paint, [40, 80, 120]);
    const first = list.node.children.find(cell => cell.name === "短")!;
    const second = list.node.children.find(cell => cell.name === "长")!;
    assert.equal(first.getComponent(UITransform)!.height, 40);
    assert.equal(second.getComponent(UITransform)!.height, 80);
    assert.equal(first.position.y - second.position.y, 66);
    assert.equal(scroll.getMaxScrollOffset().y, 158);
    const before = list.centeredOffset(1).y;
    list.setData(["补拉旧页", "短", "长", "第三行"], paint, [28, 40, 80, 120]);
    assert.equal(list.centeredOffset(2).y - before, 34, "索引保位包含前插行自己的高度和间距");
    assert.throws(() => list.setData(["无效"], undefined, [0]), /变高条目/);

    const rows = data(10000);
    list.setData(rows, paint, rows.map((_, index) => 25 + index % 21));
    scroll.restorePosition(scroll.getMaxScrollOffset());
    assert(list.node.children.some(cell => cell.active && cell.name === "Cell 9999"));
    assert(list.pooledCount < 12, "变高条目依然只保留视口和缓冲格");
    list.setData(["默认"], paint);
    assert.equal(list.node.children[0].getComponent(UITransform)!.height, 30, "等尺寸列表不继承上一批变高配置");
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

/** 短行只按全量逻辑数量居中，虚拟/静态一致，满行和多行末尾保持原左对齐。 */
function checkShortLineCentering(): void {
    for (const virtual of [false, true]) {
        const { list, scroll } = fixture(virtual);
        list.columns = 4;
        assert.equal(list.centerShortLine, false, "新参数默认不改变既有列表");
        list.setData(data(2), (cell, item) => { cell.name = item; });
        assert.equal(list.node.children[0].position.x, 32);
        list.centerShortLine = true;
        list.updateLayout(true);
        assert.equal(list.node.children[0].position.x, 95);
        assert.equal(list.node.children[1].position.x, 143);
        list.node.parent!.getComponent(UITransform)!.setContentSize(320, 120);
        assert.equal(list.node.children[0].position.x, 135, "视口变化后在两侧边距内重新居中");
        list.node.parent!.getComponent(UITransform)!.setContentSize(240, 120);
        list.setData(data(1));
        assert.equal(list.node.children[0].position.x, 119, "单格居中，左右不同边距仍保留");
        list.setData(data(4));
        assert.equal(list.node.children[0].position.x, 32, "满行不改变原布局");
        list.setData(data(5), (cell, item) => { cell.name = item; });
        assert.equal(list.node.children.find(cell => cell.name === "Cell 4")!.position.x, 32,
            "只剩一个格子的末行也不单独居中");
        list.setData(data(2));
        list.centerShortLine = false;
        list.updateLayout(true);
        assert.equal(list.node.children[0].position.x, 32, "关闭参数立即恢复原生留白");
        list.centerShortLine = true;
        list.gridAxis = SuperAxis.Horizontal;
        list.rows = 3;
        list.setData(data(2));
        assert.equal(list.node.children[0].position.y, -39);
        assert.equal(list.node.children[1].position.y, -75, "横滚短列复用转置后的上下边距规则");
        if (virtual) {
            list.gridAxis = SuperAxis.Vertical;
            list.setData(data(1001), (cell, item) => { cell.name = item; });
            scroll.restorePosition(scroll.getMaxScrollOffset());
            const last = list.node.children.find(cell => cell.active && cell.name === "Cell 1000");
            assert(last);
            assert.equal(last.position.x, 32, "虚拟池末端数量少，仍必须使用全量1001条计算");
            assert(list.pooledCount < 50, "短行参数不扩大虚拟节点池");
        }
        list.clear();
        assert.equal(list.pooledCount, 0);
    }
}

/** 使用完整物品格绑定核对复用、迟到图片和销毁边界，保留原有异步行为断言。 */
async function checkCellReuse(): Promise<void> {
    const root = node("BagItemView", 96, 96);
    const cell = root.addComponent(BagItemView) as BagItemView;
    cell.emptyFrame = new SpriteFrame();
    cell.button = root.addComponent(Button);
    cell.frame = node("frame", 96, 96, root);
    cell.frame.addComponent(Sprite);
    cell.icon = node("icon", 64, 64, root);
    cell.icon.addComponent(Sprite);
    cell.shardIcon = node("ShardIcon", 90, 90, root);
    cell.shardIcon.addComponent(Sprite);
    cell.shardCorner = node("ShardCorner", 30, 30, root);
    cell.shardStars = Array.from({ length: 5 }, (_, index) => node("ShardStar" + (index + 1), 12, 12, root));
    cell.shardProgress = node("ShardProgress", 96, 16, root);
    cell.shardProgressFill = node("ShardProgressFill", 96, 16, cell.shardProgress).addComponent(Sprite);
    cell.shardProgressLabel = node("ShardProgressLabel", 96, 16, cell.shardProgress).addComponent(Label);
    cell.count = node("count", 96, 24, root).addComponent(Label);
    cell.selectMark = node("selected", 96, 96, root);
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
        list.columns = 4;
        list.previewCount = 2;
        list.centerShortLine = true;
        (list as any).update();
        assert.equal(list.node.children[0].position.x, 95, "编辑器按样板数量居中，不使用运行数据量0");
        list.centerShortLine = false;
        (list as any).update();
        assert.equal(list.node.children[0].position.x, 32, "编辑器切换参数后恢复原留白");
        list.previewCount=0;(list as any).update();assert.equal(list.node.children.length,0);
        setEditorContext(false,true);list.previewCount=6;(list as any).update();assert.equal(list.node.children.length,0,"preview samples cannot become player inventory");
        const source=JSON.parse(readFileSync("client/assets/bundles/module/bag/prefabs/BagView.prefab","utf8"));
        assert.equal(source.find((row:any)=>"previewCount"in row).previewCount,0);
        assert(!source.some((row:any)=>row._name?.startsWith("__SuperContentPreview__")));
    } finally {setEditorContext(false,true);}
}

/** 使用胜利页和原Cell的实际Prefab几何，验证奖励裁剪区、可见首末行及滚动保位。 */
function checkRewardLayout(): void {
    const source = JSON.parse(readFileSync("client/assets/bundles/module/battle/prefabs/ChapterEndView.prefab", "utf8"));
    const scrollNode = source.find((row: any) => row.__type__ === "cc.Node" && row._name === "MainVictoryRewards");
    const portNode = source[scrollNode._children[0].__id__];
    const contentNode = source[portNode._children[0].__id__];
    const config = contentNode._components.map((ref: any) => source[ref.__id__])
        .find((row: any) => row.columns !== undefined && row.layoutType === SuperLayout.Grid);
    const uiOf = (row: any) => row._components.map((ref: any) => source[ref.__id__])
        .find((component: any) => component.__type__ === "cc.UITransform");
    const scrollUi = uiOf(scrollNode);
    const portUi = uiOf(portNode);
    const contentUi = uiOf(contentNode);
    const area = {
        left: scrollNode._lpos.x - scrollUi._anchorPoint.x * scrollUi._contentSize.width,
        right: scrollNode._lpos.x + (1 - scrollUi._anchorPoint.x) * scrollUi._contentSize.width,
        bottom: scrollNode._lpos.y - scrollUi._anchorPoint.y * scrollUi._contentSize.height,
        top: scrollNode._lpos.y + (1 - scrollUi._anchorPoint.y) * scrollUi._contentSize.height,
    };
    const background = source.find((row: any) => row.__type__ === "cc.Node" && row._name === "VictoryBackground");
    const backgroundUi = uiOf(background);
    const divider = source.find((row: any) => row.__type__ === "cc.Node" && row._name === "RewardDivider");
    const confirm = source.find((row: any) => row.__type__ === "cc.Node" && row._name === "ConfirmButton"
        && source[row._parent.__id__]._name === "VictoryButtons");
    const confirmUi = uiOf(confirm);
    const backgroundLeft = background._lpos.x - backgroundUi._anchorPoint.x * backgroundUi._contentSize.width;
    const backgroundBottom = background._lpos.y - backgroundUi._anchorPoint.y * backgroundUi._contentSize.height;
    const dividerBottom = divider._lpos.y - uiOf(divider)._anchorPoint.y * uiOf(divider)._contentSize.height;
    const confirmTop = confirm._lpos.y + (1 - confirmUi._anchorPoint.y) * confirmUi._contentSize.height;
    assert(area.left >= backgroundLeft && area.right <= backgroundLeft + backgroundUi._contentSize.width,
        "奖励视口的左右边界必须留在胜利底板内");
    assert(area.bottom >= backgroundBottom, "顶锚点奖励视口不能误用居中坐标而越过底板下沿");
    assert(area.bottom >= confirmTop + 8, "奖励裁剪区不能覆盖确认按钮");
    assert(area.top <= dividerBottom - 2, "奖励视口必须位于本次获得标题下方");
    assert.equal(portNode._name, "view");
    assert.equal(contentNode._name, "content");
    assert(portNode._components.some((ref: any) => source[ref.__id__].__type__ === "cc.Mask"));
    assert.equal(contentNode._lpos.y + (1 - contentUi._anchorPoint.y) * contentUi._contentSize.height,
        (1 - portUi._anchorPoint.y) * portUi._contentSize.height,
        "序列化content顶边应直接对齐view，不依赖运行时纠正半个视口偏移");

    const cellSource = JSON.parse(readFileSync("client/assets/bundles/module/common/prefabs/BagItemView.prefab", "utf8"));
    const cellMeta = JSON.parse(readFileSync("client/assets/bundles/module/common/prefabs/BagItemView.prefab.meta", "utf8"));
    assert.equal(config.cellPrefab.__uuid__, cellMeta.uuid, "边界检查必须使用列表实际绑定的Cell");
    const cellNode = cellSource.find((row: any) => row.__type__ === "cc.Node" && row._parent === null);
    const cellUi = cellNode._components.map((ref: any) => cellSource[ref.__id__])
        .find((component: any) => component.__type__ === "cc.UITransform");
    const { list, scroll } = fixture(true);
    const nodes = [scroll.node, list.node.parent!, list.node];
    for (let index = 0; index < nodes.length; index++) {
        const raw = [scrollNode, portNode, contentNode][index];
        const transform = [scrollUi, portUi, contentUi][index];
        const ui = nodes[index].getComponent(UITransform)!;
        ui.setContentSize(transform._contentSize.width, transform._contentSize.height);
        ui.setAnchorPoint(transform._anchorPoint.x, transform._anchorPoint.y);
        nodes[index].setPosition(raw._lpos.x, raw._lpos.y, 0);
    }
    const cell = new Prefab() as any;
    // 仅构造真实Cell的根几何，内部美术不由离线替身渲染，也不改动原Prefab。
    const createRewardCell = () => {
        const value = node("RewardCell", cellUi._contentSize.width, cellUi._contentSize.height);
        value.getComponent(UITransform)!.setAnchorPoint(cellUi._anchorPoint.x, cellUi._anchorPoint.y);
        value.setScale(cellNode._lscale.x, cellNode._lscale.y, cellNode._lscale.z);
        return value;
    };
    cell.data = createRewardCell();
    cell._instantiate = createRewardCell;
    list.cellPrefab = cell;
    list.overrideCellSize = config.overrideCellSize;
    list.explicitCellSize.width = config.explicitCellSize.width;
    list.explicitCellSize.height = config.explicitCellSize.height;
    for (const field of ["columns", "rows", "layoutType", "gridAxis"] as const) {
        list[field] = config[field];
    }
    for (const field of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "spacingX", "spacingY"] as const) {
        list[field] = config["_" + field];
    }
    // 实际布局由SuperContent完成；这里只将渲染后的Cell边界投回同一胜利面板坐标用于断言。
    const visibleBounds = (value: Node) => {
        const ui = value.getComponent(UITransform)!;
        const y = scroll.node.position.y + list.node.parent!.position.y + list.node.position.y + value.position.y;
        const height = ui.height * value.scale.y;
        return { top: y + (1 - ui.anchorY) * height, bottom: y - ui.anchorY * height };
    };
    for (const count of [1, 4, 5, 8, 12, 20]) {
        list.setData(data(count), (value, item) => { value.name = item; });
        scroll.toStart();
        const first = list.node.children.find(value => value.active && value.name === "Cell 0")!;
        assert(first, "首个真实奖励必须可见并渲染");
        assert(visibleBounds(first).top <= area.top && visibleBounds(first).bottom >= area.bottom,
            "首行奖励必须完整落在标题下方的裁剪区内");
        scroll.restorePosition(scroll.getMaxScrollOffset());
        const last = list.node.children.find(value => value.active && value.name === "Cell " + (count - 1))!;
        assert(last, "奖励末项必须实际渲染并可滚到");
        assert(visibleBounds(last).top <= area.top && visibleBounds(last).bottom >= area.bottom,
            "滚到底部时末行完整留在底板内，不能落到确认按钮区域");
    }
    const before = scroll.readPosition();
    list.refresh();
    assert.deepEqual(scroll.readPosition(), before, "刷新奖励必须保留合法滚动位置");
    list.setData(data(7), () => {});
    assert.equal(scroll.readPosition().y, 0, "缩短奖励后不能停留空白区域");
}

/** 通用奖励窗开启Inspector短行参数，1至3格居中、4格满行及5格末行保留原网格。 */
function checkCommonRewardShortLine(): void {
    const source = JSON.parse(readFileSync("client/assets/bundles/module/reward/prefabs/RewardView.prefab", "utf8"));
    const config = source.find((row: any) => row.columns !== undefined && row.layoutType === SuperLayout.Grid);
    assert.equal(config.centerShortLine, true, "奖励窗通过Prefab参数启用，不让业务View手排格子");
    const { list } = fixture(true);
    list.node.parent!.getComponent(UITransform)!.setContentSize(600, 332);
    list.overrideCellSize = config.overrideCellSize;
    list.explicitCellSize.width = config.explicitCellSize.width;
    list.explicitCellSize.height = config.explicitCellSize.height;
    for (const field of ["columns", "rows", "layoutType", "gridAxis", "centerShortLine"] as const) {
        list[field] = config[field];
    }
    for (const field of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "spacingX", "spacingY"] as const) {
        list[field] = config["_" + field];
    }
    for (const count of [1, 2, 3]) {
        list.setData(data(count));
        const first = list.node.children[0].position.x;
        const last = list.node.children[count - 1].position.x;
        assert.equal((first + last) / 2, 300, "不足4格的奖励整体居中");
    }
    list.setData(data(5), (cell, item) => { cell.name = item; });
    assert.equal(list.node.children.find(cell => cell.name === "Cell 4")!.position.x, 114,
        "第5个奖励从下一行原起点开始");
}

/** 依次核对列表几何、页面监听生命周期、异步图标和实际奖励模板。 */
async function main(): Promise<void> {
    checkLayouts();
    checkVirtualLists();
    checkVirtualAnchorsAndResize();
    checkVariableRows();
    checkListEvents();
    checkShortLineCentering();
    await checkCellReuse();
    checkEditorPreview();
    checkRewardLayout();
    checkCommonRewardShortLine();
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
