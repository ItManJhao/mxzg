import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService, SessionChanged } from "../assets/scripts/features/account/AccountService";
import { HttpFailure } from "../assets/scripts/platform/http/JsonClient";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import type { BagItemData } from "../assets/scripts/features/Bag/data/BagItemData";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagEvent } from "../assets/scripts/features/Bag/BagEvent";
import { BaseController } from "../assets/scripts/framework/BaseController";
import { BaseModel } from "../assets/scripts/framework/BaseModel";
import { EventScope } from "../assets/scripts/framework/EventScope";
import { EventDispatcher, batchNotifications } from "../assets/scripts/framework/EventDispatcher";

function deferred<T>() {
    let resolve!: (value:T)=>void, reject!: (error:unknown)=>void;
    const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const items=(quantity:number):readonly BagItemData[]=>quantity?[{itemId:900101,quantity}]:[];
const profile={id:"same-role",nickname:"player_one",level:1,gold:0,diamonds:0,serverId:"one"};

function fixture() {
    const account=new AccountModel(),model=new BagModel(),c=new BagController(model);
    let role={...profile};let roleRead:Promise<typeof role>|null=null;
    const service=new AccountService(account,{
        developmentLogin:async(name,server)=>({role:{...role,nickname:name,serverId:server||"one"},
            session:{accessToken:name[0].repeat(43),expiresAt:"2099-01-01T00:00:00Z"}}),
        currentRole:async()=>roleRead?await roleRead:role,
    },{read:()=>null,write:()=>{},clear:()=>{}});
    const requests:ReturnType<typeof deferred<readonly BagItemData[]>>[]=[];
    const dependencies={account,authorization:service,api:{list:()=>{const request=deferred<readonly BagItemData[]>();requests.push(request);return request.promise;}}};
    c.initialize(dependencies);c.initialize(dependencies);c.initialize();
    const stop=()=>c.dispose();
    return {account,model,c,service,requests,stop,setRoleRead:(value:Promise<typeof role>|null)=>{roleRead=value;}};
}

function checkModel():void {
    const m=new BagModel();assert(m instanceof BaseModel);assert.equal(m.snapshot.status,"idle");assert.equal(m.snapshot.synced,false);
    m.reset("one/role");m.beginSync();assert.equal(m.snapshot.status,"loading");
    m.replaceAll([]);assert.equal(m.snapshot.status,"ready");assert.equal(m.snapshot.synced,true);assert.equal(m.items.length,0);
    const input=[{itemId:1,quantity:3}];m.replaceAll(input);input[0].quantity=99;
    assert.equal(m.quantity(1),3);assert(Object.isFrozen(m.snapshot)&&Object.isFrozen(m.items)&&Object.isFrozen(m.items[0]));
    assert.equal(Reflect.set(m.items[0],"quantity",100),false);
    m.applyDelta([{itemId:1,delta:2},{itemId:2,delta:1}]);assert.equal(m.quantity(1),5);
    const before=m.snapshot;
    assert.throws(()=>m.applyDelta([{itemId:1,delta:1},{itemId:2,delta:-2}]),/无效/);assert.equal(m.snapshot,before);
    assert.throws(()=>m.replaceAll([{itemId:1,quantity:1},{itemId:1,quantity:2}]),/无效/);
    m.applyDelta([{itemId:2,delta:-1}]);assert.equal(m.getItem(2),undefined);
    m.fail("offline");assert.equal(m.snapshot.status,"error");assert.equal(m.snapshot.synced,true);assert.equal(m.quantity(1),5);
    m.reset(null);assert.equal(m.items.length,0);assert.equal(m.snapshot.synced,false);
    assert.throws(()=>m.applyDelta([{itemId:1,delta:1}]),/角色/);
    const version=m.version;m.dispose();assert(m.version>version);const disposed=m.version;m.dispose();assert.equal(m.version,disposed);
    m.reset("new/role");assert.equal(m.roleKey,"new/role");assert.equal(m.snapshot.revision,m.version);
}

function checkBaseController():void {
    class ProbeController extends BaseController {
        starts=0;stops=0;changes=0;
        protected onInitialize():void {this.starts++;this.ownListener(EventDispatcher.instance.on("check.other",()=>this.changes++));}
        protected onResetSession():void {}
        protected onDispose():void {this.stops++;}
    }
    const c=new ProbeController();assert.equal(c.starts,0,"construction must not initialize listeners");
    assert.equal(c.isCurrent(c.captureSession()),false);
    c.initialize();c.initialize();assert.equal(c.starts,1);
    assert.equal(c.isCurrent(c.captureSession()),false,"a null role is not a valid session");
    c.resetSession("one/role");const old=c.captureSession();assert(c.isCurrent(old));
    c.resetSession("two/role");assert.equal(c.isCurrent(old),false);
    EventDispatcher.instance.emit("check.other","one");assert.equal(c.changes,1);
    c.dispose();c.dispose();assert.equal(c.stops,1);assert.equal(c.isCurrent(old),false);
    EventDispatcher.instance.emit("check.other","closed");assert.equal(c.changes,1);
    c.initialize();c.resetSession("three/role");EventDispatcher.instance.emit("check.other","again");assert.equal(c.changes,2);c.dispose();
}

declare module "../assets/scripts/framework/EventDispatcher" {
    interface EventPayloads { "check.changed": number; "check.other": string; }
}

function checkEvents():void {
    const events=EventDispatcher.instance;let calls=0;
    const handler=()=>calls++;
    const a=events.on("check.changed",handler),b=events.on("check.changed",handler);
    a();a();events.emit("check.changed",1);assert.equal(calls,1,"one owner cannot remove another identical handler");b();
    const old=events.on("check.changed",handler);old();const next=events.on("check.changed",handler);old();events.emit("check.changed",2);assert.equal(calls,2);next();
    let state=0,observed=0;
    const stop=events.on("check.changed",()=>{observed=state;});
    batchNotifications(()=>{state=1;events.emit("check.changed",1);state=2;events.emit("check.changed",2);assert.equal(observed,0);});
    assert.equal(observed,2);stop();assert.equal(events.listenerCount("check.changed"),0);
    let once=0;
    events.once("check.changed",()=>{once++;events.emit("check.changed",2);});events.emit("check.changed",1);assert.equal(once,1,"once unsubscribes before a reentrant emit");
    const cancel=events.once("check.changed",()=>once++);cancel();cancel();events.emit("check.changed",3);assert.equal(once,1);
    const values:number[]=[];const one=events.once("check.changed",value=>values.push(value));
    batchNotifications(()=>{events.emit("check.changed",4);events.emit("check.changed",5);});one();assert.deepEqual(values,[4],"once receives the first event, not a coalesced last payload");
    const scope=new EventScope("verification");
    scope.add(events.on("check.changed",()=>calls++));
    let external=0;const outside=events.on("check.other",()=>external++);
    const errors:unknown[][]=[];const previous=console.error;console.error=(...args)=>{errors.push(args);};
    try {
        scope.add(()=>{throw Error("cleanup failure");});scope.add(()=>{calls++;});
        const throwing=events.on("check.changed",()=>{throw Error("subscriber failure");});
        const healthy=events.on("check.changed",()=>calls++);const before=calls;
        events.emit("check.changed",1);assert.equal(calls,before+2,"throwing subscriber cannot stop healthy subscribers");throwing();healthy();
        scope.clear();scope.clear();events.emit("check.other","still alive");assert.equal(external,1);
        assert(errors.some(row=>String(row[0]).includes("check.changed")));assert(errors.some(row=>String(row[0]).includes("verification")));
    } finally {console.error=previous;outside();scope.clear();}
    assert.equal(events.listenerCount("check.changed"),0);assert.equal(events.listenerCount("check.other"),0);
}

async function checkSessionAndQuery():Promise<void> {
    const f=fixture();let notices=0;
    const stop=EventDispatcher.instance.on(BagEvent.BagUpdate,event=>{notices++;assert(event.revision<=f.model.snapshot.revision);assert(event.reason==="session-reset"||f.model.snapshot.status==="ready");});
    await f.service.login("player_one","one");assert.equal(f.model.snapshot.status,"loading");
    f.requests[0].resolve(items(4));await tick();assert.equal(f.model.quantity(900101),4,"query updates without any View");
    let reentrant:Promise<boolean>|undefined;
    EventDispatcher.instance.once(BagEvent.BagSyncStateChanged,()=>{reentrant=f.c.refresh();});
    const old=f.c.refresh();assert.equal(reentrant,old,"synchronous observers share an already recorded query");
    const newer=f.c.refresh(true);await tick();
    f.requests[2].resolve(items(7));assert.equal(await newer,true);
    f.requests[1].resolve(items(2));assert.equal(await old,false);assert.equal(f.model.quantity(900101),7,"old full snapshot cannot replace the newer read");
    const failed=f.c.refresh();await tick();f.requests[3].reject(new Error("offline"));await failed;
    assert.equal(f.model.snapshot.status,"error");assert.equal(f.model.quantity(900101),7);
    const retry=f.c.refresh();await tick();f.requests[4].resolve([]);await retry;
    assert.equal(f.model.snapshot.status,"ready");assert.equal(f.model.items.length,0);
    const previous=f.c.refresh();await tick();const oldScope=f.c.captureSession();
    await f.service.login("player_two","two");assert.equal(f.model.items.length,0);
    f.requests[6].resolve(items(20));await tick();assert.equal(f.model.snapshot.roleKey,"two/same-role");
    f.requests[5].reject(new HttpFailure(401,"expired old user"));await previous;
    assert.equal(f.model.quantity(900101),20);assert.equal(f.account.snapshot.role?.serverId,"two");
    assert.equal(await f.c.applyDelta(oldScope,"old-push",[{itemId:900101,delta:10}]),false);
    const scope=f.c.captureSession();assert(await f.c.applyDelta(scope,"push-1",[{itemId:900101,delta:2}]));
    const count=notices,revision=f.model.snapshot.revision;
    assert.equal(await f.c.applyDelta(scope,"push-1",[{itemId:900101,delta:2}]),false);
    assert.equal(notices,count);assert.equal(f.model.snapshot.revision,revision);assert.equal(f.model.quantity(900101),22);
    stop();f.service.logout();assert.equal(f.model.snapshot.roleKey,null);assert.equal(f.model.quantity(900101),0);f.stop();f.stop();
}

async function checkOperation():Promise<void> {
    const f=fixture();await f.service.login("player_one","one");f.requests[0].resolve(items(5));await tick();
    const staleRead=f.c.refresh();await tick();
    const claim=deferred<{inventory:readonly BagItemData[];gold:number}>();let requests=0,commits=0;
    const update=()=>f.c.runInventoryUpdate("campaign-claim:one",()=>{requests++;return claim.promise;},result=>result.inventory,
        result=>{commits++;f.service.acceptRole({...f.account.snapshot.role!,gold:result.gold});});
    let reentrant:Promise<unknown>|undefined;
    EventDispatcher.instance.once(BagEvent.BagSyncStateChanged,()=>{reentrant=update();});
    const operation=update(),duplicatePending=update();assert.equal(operation,duplicatePending);
    let bagSawWallet=false,walletSawBag=false;
    const offBag=EventDispatcher.instance.on(BagEvent.BagUpdate,event=>{if(event.reason!=="session-reset"){assert.equal(f.account.snapshot.role!.gold,100);bagSawWallet=true;}});
    const offAccount=f.account.subscribe(state=>{if(state.role?.gold===100){assert.equal(f.model.quantity(900101),9);walletSawBag=true;}});
    const oldRole=deferred<typeof profile>();f.setRoleRead(oldRole.promise);const refreshingRole=f.service.refreshRole();
    claim.resolve({inventory:items(9),gold:100});await operation;assert.equal(operation,reentrant,"state notification reentry shares the recorded operation");
    assert.equal(requests,1);assert.equal(commits,1);assert(bagSawWallet&&walletSawBag,"related Models commit before either event is delivered");
    oldRole.resolve({...profile,gold:0});await refreshingRole;assert.equal(f.account.snapshot.role!.gold,100,"late wallet GET cannot undo settlement");
    f.requests[1].resolve(items(5));await staleRead;assert.equal(f.model.quantity(900101),9,"read started before settlement cannot roll it back");
    offAccount();offBag();
    const before=f.model.snapshot;
    await f.c.runInventoryUpdate("campaign-claim:one",async()=>({inventory:items(1),gold:1}),result=>result.inventory,()=>{commits++;});
    assert.equal(f.model.snapshot,before);assert.equal(commits,1,"duplicate result must neither reapply related Models nor broadcast");

    const first=deferred<readonly BagItemData[]>(),second=deferred<readonly BagItemData[]>();let secondStarted=false;
    const a=f.c.runInventoryUpdate("reward:two",()=>first.promise,value=>value,()=>{});
    const b=f.c.runInventoryUpdate("reward:three",()=>{secondStarted=true;return second.promise;},value=>value,()=>{});
    const afterWrites=f.c.refresh();await tick();assert.equal(secondStarted,false);
    first.resolve(items(10));await a;await tick();assert(secondStarted);
    second.resolve(items(12));await b;await tick();
    assert.equal(f.requests.length,3,"reads during writes wait until both operations complete");
    f.requests[2].resolve(items(12));await afterWrites;assert.equal(f.model.quantity(900101),12);

    const late=deferred<readonly BagItemData[]>();let staleCommit=false;
    const pending=f.c.runInventoryUpdate("reward:old-session",()=>late.promise,value=>value,()=>{staleCommit=true;});
    const rejected=assert.rejects(pending,SessionChanged);await tick();
    await f.service.login("player_two","two");f.requests[3].resolve(items(30));await tick();
    late.resolve(items(99));await rejected;assert.equal(staleCommit,false);assert.equal(f.model.quantity(900101),30);f.stop();
}

function checkSingleRuntimeChain():void {
    assert(!existsSync("client/assets/scripts/features/Bag/InventoryController.ts"));
    assert(!existsSync("client/assets/scripts/features/Bag/ui/BackpackView.ts"));
    assert(!existsSync("client/assets/scripts/features/backpack"));
    assert(!existsSync("client/assets/scripts/framework/TypedEvents.ts"));
    const view=readFileSync("client/assets/scripts/features/Bag/ui/BagView.ts","utf8");
    assert(!/GameStore|WireSession|useInventory|InventorySource/.test(view),"BagView cannot select a legacy or injected state chain");
    assert(view.includes("EventDispatcher.instance.on"));
    const controller=readFileSync("client/assets/scripts/features/Bag/BagController.ts","utf8");
    assert(controller.includes("extends BaseController")&&!controller.includes("new EventDispatcher")&&!controller.includes("get events()"));
    const model=readFileSync("client/assets/scripts/features/Bag/BagModel.ts","utf8");
    assert(!model.includes("BagApi")&&!model.includes("BagController"),"Model data validation must not depend on HTTP or Controller");
    const app=readFileSync("client/assets/scripts/app/remake/RemakeApp.ts","utf8");
    assert(app.includes("BagController.instance.initialize")&&!app.includes("InventoryController"));
    const cls=app.slice(app.indexOf("registerView(BagView"),app.indexOf("registerView(CampaignView"));
    assert(!cls.includes("createController"),"opening the bag must not construct a second business controller");
    const meta=JSON.parse(readFileSync("client/assets/scripts/features/Bag/ui/BagView.ts.meta","utf8"));
    assert.equal(meta.uuid,"7b14e0a2-3c58-4d1f-8e6a-9f0b2c4d5e61","moved View preserves the bound script UUID");
}

const unexpectedErrors:unknown[][]=[];const originalError=console.error;console.error=(...args)=>{unexpectedErrors.push(args);originalError(...args);};
(async()=>{checkModel();checkBaseController();checkEvents();await checkSessionAndQuery();await checkOperation();checkSingleRuntimeChain();assert.equal(unexpectedErrors.length,0,"no unexpected subscriber errors");
    console.log("bag-mvc-check passed: persistent role scope, immutable state, snapshots/deltas/dedupe, typed subscriptions, atomic wallet/inventory, serialized operations, stale requests and legacy retirement");
})().catch(error=>{console.error(error);process.exitCode=1;});
