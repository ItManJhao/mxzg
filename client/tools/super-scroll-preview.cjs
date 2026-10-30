/** Called by the real preview harness after login and opening the real bag. No server data is fabricated. */
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
module.exports = async function checkSuperScroll(page, { clickTarget, snap, state, prefix }) {
    const expected = process.env.MXZG_SUPER_EXPECT ? JSON.parse(readFileSync(process.env.MXZG_SUPER_EXPECT,'utf8')) : null;
    await page.evaluate(() => {
        window.__bagForCheck = () => {
            let found;
            function walk(node) { if(!node?.activeInHierarchy)return; for(const c of node._components||[]) if(c.constructor?.name==='BagView')found=c; node.children.forEach(walk); }
            walk(window.cc.director.getScene());return found;
        };
        window.__bagSnapshot = () => {
            const bag=window.__bagForCheck(),scroll=bag.bagScroll,list=scroll.list,cc=window.cc;
            const port=scroll.content.parent.getComponent(cc.UITransform),ui=scroll.content.getComponent(cc.UITransform);
            return {tab:bag.tab,columns:list.columns,rows:list.rows,layoutType:list.layoutType,gridAxis:list.gridAxis,
                spacingX:list.spacingX,spacingY:list.spacingY,paddingLeft:list.paddingLeft,paddingRight:list.paddingRight,paddingTop:list.paddingTop,paddingBottom:list.paddingBottom,
                viewport:{width:port.width,height:port.height,mask:scroll.content.parent.getComponent(cc.Mask)?.enabled},content:{width:ui.width,height:ui.height},
                position:scroll.readPosition(),length:list.length,ids:scroll.content.children.map(node=>node.uuid),
                cells:scroll.content.children.map(node=>({name:node.name,x:node.position.x,y:node.position.y,width:node.getComponent(cc.UITransform).width,scale:node.scale.x})),
                owned:scroll.content.children.filter(node=>node._components.find(c=>c.constructor?.name==='BagItemView')?.icon.active).length,
                actualRows:bag.visibleItems().length,details:bag.__detailOpens||0};
        };
    });
    await page.waitForFunction(()=>window.__bagSnapshot().owned>0,null,{timeout:30000});
    const first=await page.evaluate(()=>window.__bagSnapshot());
    const authored = value => {
        if(expected) for(const key of Object.keys(expected)) assert.equal(value[key],expected[key],'Inspector '+key+' must survive opening');
        assert.equal(value.viewport.mask,true);assert.equal(value.owned,value.actualRows,'real inventory must match visible owned Cells');
    };
    authored(first);
    await page.evaluate(()=>{
        const bag=window.__bagForCheck();const original=bag.showInfo;
        bag.__detailOpens=0;bag.showInfo=function(...args){this.__detailOpens++;return original.apply(this,args);};
        bag.bagScroll.toStart();
    });
    async function point(kind,index=0) {
        const target=await page.evaluate(({kind,index})=>{
            const bag=window.__bagForCheck(),cc=window.cc;
            const node=kind==='tab'?bag.tabContent.children[index]:bag.bagScroll.content.children.find(node=>node._components.find(c=>c.constructor?.name==='BagItemView')?.icon.active);
            const b=node.getComponent(cc.UITransform).getBoundingBoxToWorld(),size=cc.view.getVisibleSize();
            return {x:b.x+b.width/2,y:b.y+b.height/2,size};
        },{kind,index});
        const canvas=await page.locator('canvas').boundingBox();
        return {x:canvas.x+target.x*canvas.width/target.size.width,y:canvas.y+canvas.height-target.y*canvas.height/target.size.height};
    }
    const start=await point('item');
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    await page.mouse.move(start.x,start.y-90,{steps:12});await page.mouse.up();await page.waitForTimeout(1300);
    const dragged=await page.evaluate(()=>window.__bagSnapshot());
    assert.equal(dragged.details,0,'drag must cancel item click');assert(dragged.position.y>10,'native drag must actually scroll');
    await page.evaluate(()=>{for(let i=0;i<5;i++)window.__bagForCheck().refreshFromModel();});
    const refreshed=await page.evaluate(()=>window.__bagSnapshot());
    assert(Math.abs(refreshed.position.y-dragged.position.y)<1,'same-category refresh must retain scroll position');
    assert.deepEqual(refreshed.ids,dragged.ids,'same data refresh reuses Cell nodes');
    await page.evaluate(()=>window.__bagForCheck().bagScroll.toStart());
    const item=await point('item');await page.mouse.click(item.x,item.y);await page.waitForTimeout(500);
    assert.equal((await page.evaluate(()=>window.__bagSnapshot())).details,1,'five refreshes still produce one detail click');
    assert((await state()).some(row=>row.view==='BagInfoView'));
    assert.equal(await page.evaluate(()=>window.__bagForCheck().bagScroll.content.children.filter(node=>node._components.find(c=>c.constructor?.name==='BagItemView')?.selectMark.active).length),1,'selected item state survives refresh');
    await snap('bag-detail');await clickTarget('BagInfoView','btnClose');
    for(const index of [0,2,3,1]) {
        await page.evaluate(()=>window.__bagForCheck().bagScroll.restorePosition(new window.cc.Vec2(0,40)));
        const tab=await point('tab',index);await page.mouse.click(tab.x,tab.y);await page.waitForTimeout(250);
        const result=await page.evaluate(()=>window.__bagSnapshot());
        assert.equal(result.tab,['equip','item','shard','spirit'][index]);assert(Math.abs(result.position.y)<1,'category switch resets scroll');authored(result);
    }
    const compatible=await page.evaluate(()=>{
        const bag=window.__bagForCheck(),list=bag.bagScroll.list,cc=window.cc,original=list.cellPrefab;
        const alternative=new cc.Prefab();alternative.data=cc.instantiate(original.data);alternative.data.name='CompatibleBagCell';
        alternative.data.getComponent(cc.UITransform).setContentSize(104,104);
        list.cellPrefab=alternative;bag.refreshFromModel();
        const widths=list.node.children.map(node=>node.getComponent(cc.UITransform).width);
        const owned=window.__bagSnapshot().owned;
        list.cellPrefab=original;bag.refreshFromModel();alternative.data.destroy();
        return {widths,owned};
    });
    assert(compatible.widths.every(width=>width===104));assert.equal(compatible.owned,first.owned);

    // Detached test dataset: neutral numbered cards, no inventory/ID/protocol components.
    const matrix=await page.evaluate(()=>{
        const cc=window.cc,bag=window.__bagForCheck(),live=bag.bagScroll;
        const sized=(name,w,h,parent)=>{const n=new cc.Node(name);const ui=n.addComponent(cc.UITransform);ui.setContentSize(w,h);ui.setAnchorPoint(0,1);if(parent){n.layer=parent.layer;n.parent=parent;}return n;};
        const host=sized('__SuperScrollVerification__',240,120);host.active=false;host.layer=live.node.layer;host.parent=live.node.parent;
        host.getComponent(cc.UITransform).setAnchorPoint(0.5,1);host.setPosition(live.node.position);
        const view=sized('view',240,120,host);view.setPosition(-120,0,0);view.addComponent(cc.Mask);
        const content=sized('content',240,120,view),list=content.addComponent(live.list.constructor),scroll=host.addComponent(live.constructor);
        const template=sized('NeutralCell',40,30);template.getComponent(cc.UITransform).setAnchorPoint(0.5,0.5);template.layer=host.layer;
        const sprite=template.addComponent(cc.Sprite);sprite.sizeMode=cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame=live.content.children[0]._components.find(c=>c.constructor?.name==='BagItemView').frame.getComponent(cc.Sprite).spriteFrame;
        const label=sized('Caption',40,30,template);label.getComponent(cc.UITransform).setAnchorPoint(0.5,0.5);
        const caption=label.addComponent(cc.Label);caption.fontSize=18;caption.lineHeight=20;caption.color=new cc.Color(255,255,255,255);
        const neutral=new cc.Prefab();neutral.data=template;list.cellPrefab=neutral;
        list.spacingX=8;list.spacingY=6;list.paddingLeft=12;list.paddingRight=14;list.paddingTop=10;list.paddingBottom=16;list.columns=3;list.rows=2;
        scroll.content=content;host.active=true;
        const results=[];
        for(const [mode,axis]of [[0,0],[1,1],[2,0],[2,1]]) {
            list.layoutType=mode;list.gridAxis=axis;
            for(const count of [0,1,3,18]) {
                list.setData(Array.from({length:count},(_,i)=>i),(cell,item)=>{cell.name='Neutral '+item;});
                const bounds=content.getComponent(cc.UITransform);
                results.push({mode,axis,count,width:bounds.width,height:bounds.height,vertical:scroll.vertical,horizontal:scroll.horizontal,
                    first:content.children[0]?{x:content.children[0].position.x,y:content.children[0].position.y}:null});
            }
            scroll.restorePosition(new cc.Vec2(100,90));const before=scroll.readPosition();list.refresh();const after=scroll.readPosition();
            list.setData([0],()=>{});const shorter=scroll.readPosition();
            results.push({mode,axis,before:{x:before.x,y:before.y},after:{x:after.x,y:after.y},shorter:{x:shorter.x,y:shorter.y}});
        }
        const nonCentred=new cc.Prefab();nonCentred.data=sized('NonCentredCell',40,30);
        list.cellPrefab=nonCentred;
        for(const [mode,axis]of [[0,0],[1,1],[2,0],[2,1]]) {
            list.layoutType=mode;list.gridAxis=axis;
            list.setData([0,1,2,3,4],()=>{});
            const cell=content.children[0];
            results.push({nonCentred:true,mode,axis,first:{x:cell.position.x,y:cell.position.y}});
        }
        list.clear();list.cellPrefab=neutral;nonCentred.data.destroy();
        window.__superProbe={host,list,scroll,template,live};
        return results;
    });
    for(const result of matrix) {
        if(result.nonCentred) {assert.equal(result.first.x,12);assert.equal(result.first.y,-10);}
        else if(result.count!==undefined) {
            assert.equal(result.vertical,result.axis===0);assert.equal(result.horizontal,result.axis===1);
            if(result.first) {assert.equal(result.first.x,32);assert.equal(result.first.y,-25);}
            if(result.count<=1) {assert.equal(result.width,240);assert.equal(result.height,120);}
            if(result.count===18) {
                const sizes=result.mode===0?[240,668]:result.mode===1?[882,120]:result.axis===0?[240,236]:[450,120];
                assert.deepEqual([result.width,result.height],sizes);
            }
        } else {assert.deepEqual(result.after,result.before);assert(Math.abs(result.shorter.x)<1&&Math.abs(result.shorter.y)<1);}
    }
    for(const [name,mode,axis] of [['vertical',0,0],['horizontal',1,1],['grid-vertical',2,0],['grid-horizontal',2,1]]) {
        await page.evaluate(({mode,axis})=>{
            const p=window.__superProbe;p.live.node.active=false;p.list.layoutType=mode;p.list.gridAxis=axis;
            p.list.setData(Array.from({length:18},(_,i)=>i),(node,index)=>{node.getChildByName('Caption').getComponent(window.cc.Label).string=String(index+1);});p.scroll.toStart();
        },{mode,axis});
        await page.waitForTimeout(200);await snap('layout-'+name);
    }
    await page.evaluate(()=>{const p=window.__superProbe;p.host.destroy();p.template.destroy();p.live.node.active=true;delete window.__superProbe;});
    await clickTarget('CityChromeShell','tabHero');await clickTarget('CityChromeShell','tabBag');
    await page.waitForFunction(()=>window.__bagForCheck()?.bagScroll.list.length===20,null,{timeout:30000});
    const reopened=await page.evaluate(()=>window.__bagSnapshot());authored(reopened);
    await snap('bag-reopened');
    writeFileSync('client/temp/project-checks/'+prefix+'-list.json',JSON.stringify({first,dragged,refreshed,compatible,matrix,reopened},null,2));
    console.log('PASS SuperScroll real engine: V/H/grid axes, 0/1/3/18 items, shrink/clamp, drag suppression, preserved refresh, one detail click, four categories, compatible Cell and reopen');
};
