/** Actual local UI + actual backend replies. Delay responses for races; never fabricate inventory. */
const fs=require('node:fs');const assert=require('node:assert/strict');
const mapPath='client/temp/programming/packer-driver/targets/preview/import-map.json';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
module.exports=async function verifyBagMvc(page,{clickTarget,snap,state,prefix}) {
    const rewardWhileOpen=process.env.MXZG_BAG_REWARD_OPEN==='1';
    const map=JSON.parse(fs.readFileSync(mapPath,'utf8'));
    const specs={};
    for(const name of ['BagController','BagModel','BagEvent']) {
        const key=Object.keys(map.imports).find(key=>key.endsWith('/features/Bag/'+name+'.ts'));
        assert(key,'Creator must import '+name+' before runtime verification');specs[name]=key;
    }
    specs.EventDispatcher=Object.keys(map.imports).find(key=>key.endsWith('/framework/EventDispatcher.ts'));
    assert(specs.EventDispatcher,'Creator must import the single global EventDispatcher');
    await page.evaluate(async specs=>{
        const modules=await Promise.all([System.import(specs.BagController),System.import(specs.BagModel),System.import(specs.BagEvent),System.import(specs.EventDispatcher)]);
        window.__bagController=modules[0].BagController.instance;window.__bagModel=modules[1].BagModel.instance;window.__bagEvent=modules[2].BagEvent;window.__events=modules[3].EventDispatcher.instance;
        if(window.__bagController.model!==window.__bagModel)throw Error('runtime loaded a second Bag Model');
        window.__mvcViews=()=>{
            const result=[];function walk(node){if(!node?.activeInHierarchy)return;for(const c of node._components||[])result.push(c);node.children.forEach(walk);}
            walk(window.cc.director.getScene());return result;
        };
        window.__mvcSnapshot=()=>({bag:window.__bagModel.snapshot,role:window.__bagController.account?.snapshot.role,
            bagViews:window.__mvcViews().filter(c=>c.constructor?.name==='BagView').length,
            statusSubscribers:window.__events.listenerCount(window.__bagEvent.BagSyncStateChanged),subscribers:window.__events.listenerCount(window.__bagEvent.BagUpdate)});
        window.__bagChanges=[];window.__bagDetails=[];window.__bagNotificationOrder=[];
        window.__detailStops=[window.__bagEvent.BagAdd,window.__bagEvent.BagRemove,window.__bagEvent.BagQuantityChanged].map(name=>
            window.__events.on(name,event=>{window.__bagNotificationOrder.push({name,revision:event.revision});window.__bagDetails.push({name,event,bag:window.__bagModel.snapshot,role:window.__bagController.account?.snapshot.role});}));
        window.__stopBagObservation=window.__events.on(window.__bagEvent.BagUpdate,event=>{
            window.__bagNotificationOrder.push({name:window.__bagEvent.BagUpdate,revision:event.revision});
            window.__bagChanges.push({event,bag:window.__bagModel.snapshot,role:window.__bagController.account?.snapshot.role});
        });
    },specs);
    const names=await page.evaluate(()=>window.__bagEvent);assert(names.BagUpdate&&names.BagAdd&&names.BagRemove&&names.BagQuantityChanged&&names.BagSyncStateChanged&&!names.Changed,'preview must run the new inventory event contract');const windowEventName=key=>names[key];
    const snapshot=()=>page.evaluate(()=>window.__mvcSnapshot());
    const ready=()=>page.waitForFunction(()=>window.__bagModel.snapshot.status==='ready',null,{timeout:30000});
    const normalized=rows=>rows.map(row=>({itemId:row.itemId,quantity:row.quantity})).sort((a,b)=>a.itemId-b.itemId);
    await ready();assert.equal((await snapshot()).bagViews,0,'inventory must be available before the window opens');
    const beforeOpen=await snapshot();assert(beforeOpen.bag.synced&&beforeOpen.bag.items.length>0);
    await page.evaluate(()=>window.__bagController.refresh());await ready();
    const closedQuery=await snapshot();assert.equal(closedQuery.bagViews,0);assert(closedQuery.bag.revision>beforeOpen.bag.revision);
    let inventoryReads=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/v1/inventory')inventoryReads++;});
    async function openBag(){await clickTarget('CityChromeShell','tabBag');await page.waitForFunction(()=>window.__mvcSnapshot().bagViews===1,null,{timeout:30000});}
    async function openHero(){
        await clickTarget('CityChromeShell','tabHero');
        await page.waitForFunction(()=>window.__mvcSnapshot().bagViews===0&&window.__mvcViews().some(c=>c.constructor?.name==='HeroListView'),null,{timeout:30000});
    }
    const beforeReads=inventoryReads;await openBag();
    const opened=await snapshot();assert.equal(inventoryReads,beforeReads,'opening does not construct a new requester');
    assert.equal(opened.subscribers,2,'one View and one external observer');assert.equal(opened.statusSubscribers,1);await snap('bag-opened');
    await page.evaluate(()=>{
        const view=window.__mvcViews().find(c=>c.constructor?.name==='BagView');
        view.__statusPaints=0;const status=view.writeTalk;view.writeTalk=function(){this.__statusPaints++;return status.call(this);};
        view.__renders=0;const render=view.refreshFromModel;view.refreshFromModel=function(){this.__renders++;return render.call(this);};
    });
    await page.evaluate(()=>window.__bagController.refresh());await ready();
    assert.equal(await page.evaluate(()=>window.__mvcViews().find(c=>c.constructor?.name==='BagView').__renders),0,'unchanged query sends no inventory update or list rerender');
    assert.equal(await page.evaluate(()=>window.__mvcViews().find(c=>c.constructor?.name==='BagView').__statusPaints),2,'loading and recovery only repaint status');
    await clickTarget('BagItemView');await snap('bag-detail');await clickTarget('BagInfoView','btnClose');
    for(let i=0;i<3;i++) {
        await openHero();
        assert.equal((await snapshot()).subscribers,1,'closing only removes the View subscription');assert.equal((await snapshot()).statusSubscribers,0);
        await openBag();assert.equal((await snapshot()).subscribers,2,'reopen cannot accumulate subscriptions');
    }
    await openHero();
    assert.equal((await snapshot()).bagViews,0);

    const staleGate=deferred(),staleCaptured=deferred(),staleFulfilled=deferred();let staleBody;
    const inventoryPattern=/\/api\/v1\/inventory(?:\?.*)?$/;
    const holdRead=async route=>{const response=await route.fetch();staleBody=await response.json();staleCaptured.resolve();await staleGate.promise;await route.fulfill({response});staleFulfilled.resolve();};

    await clickTarget('CityChromeShell','tabBattle');
    await page.waitForFunction(()=>window.__mvcViews().some(c=>c.constructor?.name==='CampaignView'&&c.last?.phase==='idle'),null,{timeout:30000});
    await page.evaluate(()=>{window.__claimController=window.__mvcViews().find(c=>c.constructor?.name==='CampaignView').controller;});
    await clickTarget('CampaignView','fightButton');
    await clickTarget('FormationView','confirmButton');
    await page.waitForFunction(()=>window.__mvcViews().some(c=>c.constructor?.name==='CampaignView'&&c.last?.phase==='result'&&c.result),null,{timeout:45000});
    await snap('before-claim');
    // Capture immediately before claim so the real transport timeout does not cancel the held GET during replay.
    await page.route(inventoryPattern,holdRead);
    await page.evaluate(()=>{window.__oldBagReadDone=false;window.__oldBagRead=window.__bagController.refresh(true).then(value=>{window.__oldBagReadDone=true;return value;});});await staleCaptured.promise;
    const claimGate=deferred(),claimCaptured=deferred();let settlement;
    const claimPattern=/\/api\/v1\/campaign\/battles\/[^/]+\/claim$/;
    const holdClaim=async route=>{const response=await route.fetch();settlement=await response.json();assert.equal(response.status(),200);claimCaptured.resolve();await claimGate.promise;await route.fulfill({response});};
    await page.route(claimPattern,holdClaim);
    const button=await page.evaluate(()=>{
        const view=window.__mvcViews().find(c=>c.constructor?.name==='CampaignView'),root=view.result;let target;
        function walk(n){if(!n?.activeInHierarchy)return;if(n.name==='btn_confirm')target=n;for(const child of n.children)walk(child);}walk(root);
        const b=target.getComponent(window.cc.UITransform).getBoundingBoxToWorld();return {x:b.x+b.width/2,y:b.y+b.height/2,size:window.cc.view.getVisibleSize()};
    });
    const canvas=await page.locator('canvas').boundingBox();
    await page.mouse.click(canvas.x+button.x*canvas.width/button.size.width,canvas.y+canvas.height-button.y*canvas.height/button.size.height);
    await claimCaptured.promise;
    if(rewardWhileOpen) {
        await openBag();
        await page.evaluate(()=>{const view=window.__mvcViews().find(c=>c.constructor?.name==='BagView');view.__rewardRenders=0;const render=view.refreshFromModel;view.refreshFromModel=function(){this.__rewardRenders++;return render.call(this);};});
    } else await openHero();
    assert.equal((await snapshot()).bagViews,rewardWhileOpen?1:0);assert.equal((await snapshot()).subscribers,rewardWhileOpen?2:1);
    claimGate.resolve();await ready();
    const claimedClosed=await snapshot();assert.equal(claimedClosed.bagViews,rewardWhileOpen?1:0,'settlement commits independent of bag lifetime');
    if(rewardWhileOpen) assert.equal(await page.evaluate(()=>window.__mvcViews().find(c=>c.constructor?.name==='BagView').__rewardRenders),1,'one summary causes one list render, no detail-event rerenders');
    assert.deepEqual(normalized(claimedClosed.bag.items),normalized(settlement.inventory));
    assert.equal(claimedClosed.role.gold,settlement.role.gold);
    assert(claimedClosed.bag.items.some(row=>row.quantity!==(staleBody.find(old=>old.itemId===row.itemId)?.quantity||0)),'real reward must change actual inventory');
    const operationEvents=await page.evaluate(()=>window.__bagChanges.filter(row=>row.event.reason==='reward'));
    assert.equal(operationEvents.length,1);
    const details=await page.evaluate(()=>window.__bagDetails);
    assert.equal(details.filter(row=>row.event.reason==='reward'&&row.name===windowEventName('BagAdd')).length,operationEvents[0].event.added.length?1:0);
    for(const row of details.filter(row=>row.event.reason==='reward')) {
        assert.deepEqual(normalized(row.bag.items),normalized(settlement.inventory));
        assert.equal(row.role.gold,settlement.role.gold);assert.equal(row.event.revision,operationEvents[0].event.revision);
    }
    const order=await page.evaluate(revision=>window.__bagNotificationOrder.filter(row=>row.revision===revision).map(row=>row.name),operationEvents[0].event.revision);
    const expectedOrder=[];if(operationEvents[0].event.added.length)expectedOrder.push(names.BagAdd);if(operationEvents[0].event.removed.length)expectedOrder.push(names.BagRemove);if(operationEvents[0].event.quantityChanged.length)expectedOrder.push(names.BagQuantityChanged);expectedOrder.push(names.BagUpdate);assert.deepEqual(order,expectedOrder);
    assert.deepEqual(normalized(operationEvents[0].bag.items),normalized(settlement.inventory));
    assert.equal(operationEvents[0].role.gold,settlement.role.gold,'event cannot expose a new inventory with an old wallet');
    assert.equal(await page.evaluate(()=>window.__oldBagReadDone),false,'old GET must still be live, not rejected by a transport timeout');
    staleGate.resolve();await staleFulfilled.promise;assert.equal(await page.evaluate(()=>window.__oldBagRead),false,'pre-reward inventory query must be rejected');
    assert.deepEqual(normalized((await snapshot()).bag.items),normalized(settlement.inventory));
    await page.unroute(inventoryPattern,holdRead);await page.unroute(claimPattern,holdClaim);
    const beforeDuplicate=await snapshot();
    await page.evaluate(async id=>{
        const c=window.__claimController;
        await window.__bagController.runInventoryUpdate('campaign-claim:'+id,()=>c.service.authenticated(token=>c.api.claim(token,id)),
            result=>result.inventory,result=>c.service.acceptRole(result.role),"reward");
    },settlement.battle.id);
    const duplicate=await snapshot();assert.equal(duplicate.bag.revision,beforeDuplicate.bag.revision);assert.equal(duplicate.role.gold,beforeDuplicate.role.gold);
    assert.equal(await page.evaluate(()=>window.__bagChanges.filter(row=>row.event.reason==='reward').length),1);
    await openBag();await snap('reward-in-bag');
    const displayed=await page.evaluate(()=>{
        const view=window.__mvcViews().find(c=>c.constructor?.name==='BagView');
        return {rows:view.visibleItems(),cells:view.bagScroll.content.children.map(node=>{
            const cell=node._components.find(c=>c.constructor?.name==='BagItemView');return cell.icon.active?cell.count.string:null;
        }).filter(Boolean)};
    });
    assert(displayed.cells.includes(String(settlement.inventory.find(row=>row.itemId===900101).quantity)));
    await clickTarget('BagItemView');
    const detail=await page.evaluate(()=>window.__mvcViews().find(c=>c.constructor?.name==='BagInfoView').propType.string);
    assert(detail.includes(String(settlement.inventory.find(row=>row.itemId===900101).quantity)),'detail reads the actual rewarded quantity');
    await snap('reward-detail');await clickTarget('BagInfoView','btnClose');

    async function logout() {
        await clickTarget('RemakeHomeView','accountButton');await clickTarget('RemakeHomeView','logoutButton');
        await page.waitForFunction(()=>window.__mvcViews().some(c=>c.constructor?.name==='AccountLoginView'),null,{timeout:30000});
        const cleared=await snapshot();assert.equal(cleared.bag.roleKey,null);assert.equal(cleared.bag.items.length,0);return cleared;
    }
    async function fillAccount(name) {
        await clickTarget('AccountLoginView','developerButton');await clickTarget('AccountLoginView','accountInput');
        const input=page.locator('input[type="text"]:visible');await input.fill(name);await input.press('Tab');await clickTarget('AccountLoginView','developerButton');
    }
    const oldRole=claimedClosed.role.id;
    const cleared=await logout();
    await clickTarget('AccountLoginView','serverButton');await clickTarget('ServerCellView',null,'开发一服');
    const nextAccount='mvc_next_'+Date.now();
    await fillAccount(nextAccount);await clickTarget('AccountLoginView','loginButton');await ready();
    await page.waitForFunction(()=>window.__mvcViews().some(c=>c.constructor?.name==='RemakeHomeView'),null,{timeout:30000});
    const another=await snapshot();assert.notEqual(another.role.id,oldRole);assert.equal(another.role.serverId,'local-1');
    assert.equal(another.bag.items.find(row=>row.itemId===900101).quantity,50,'new user cannot inherit prior rewards');
    await logout();await clickTarget('AccountLoginView','serverButton');await clickTarget('ServerCellView',null,'开发二服');
    await fillAccount(nextAccount);
    await clickTarget('AccountLoginView','loginButton');await ready();
    await page.waitForFunction(()=>window.__mvcViews().some(c=>c.constructor?.name==='RemakeHomeView'),null,{timeout:30000});
    const anotherWorld=await snapshot();assert.equal(anotherWorld.role.serverId,'local-2');assert.notEqual(anotherWorld.role.id,another.role.id);
    assert.equal(anotherWorld.role.nickname,another.role.nickname);
    assert.equal(anotherWorld.bag.items.find(row=>row.itemId===900101).quantity,50,'switching worlds resets inventory');
    await openBag();await snap('new-world-bag');
    await page.evaluate(()=>{window.__stopBagObservation();window.__detailStops.forEach(stop=>stop());});
    const proof={rewardWhileOpen,order,beforeOpen,closedQuery,opened,claimedClosed,settlement:{id:settlement.battle.id,inventory:settlement.inventory,gold:settlement.role.gold},
        operationEvents,details,duplicate,displayed,cleared,another,anotherWorld,inventoryReads};
    fs.writeFileSync('client/temp/project-checks/'+prefix+'-mvc.json',JSON.stringify(proof,null,2));
    console.log('PASS Bag MVC real backend ('+(rewardWhileOpen?'open-window reward':'closed-window reward')+'): closed-window query, atomic wallet+inventory, stale GET rejected, duplicate claim idempotent, immediate open, repeated lifecycle, real details, logout/new user/new world');
};
