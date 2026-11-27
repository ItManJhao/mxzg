/** 统一登录与资产同步回归：只使用受控二进制连接和内存 Model，不访问任何数据库。 */
import {strict as assert} from "node:assert";
import {GameSocketClient,SocketPort,SocketFailure} from "../assets/scripts/platform/GameSocketClient";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL, GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { AccountApi, type AccountSession } from "../assets/scripts/features/account/AccountApi";
import { ServerSelectionController, type GameServer } from "../assets/scripts/features/account/ServerSelectionController";
import {AccountModel} from "../assets/scripts/features/account/AccountModel";
import {AccountController} from "../assets/scripts/features/account/AccountController";
import {AccountComposition} from "../assets/scripts/app/remake/AccountComposition";
import {HomePageBinding} from "../assets/scripts/features/home/ui/HomePageBinding";
import { AccountLoginBinding, type AccountActions } from "../assets/scripts/features/account/ui/AccountLoginBinding";
import {RoleController} from "../assets/scripts/features/account/RoleController";
import {BagController} from "../assets/scripts/features/bag/BagController";
import {BagModel} from "../assets/scripts/features/bag/BagModel";
import {BagEvent} from "../assets/scripts/features/bag/utils/BagEvent";
import { BagItemDataUtils } from "../assets/scripts/features/bag/data/BagItemDataUtils";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import { IsolatedSocketPreviewUtils } from "../assets/scripts/app/remake/IsolatedSocketPreviewUtils";
import {AssetStateBinding} from "../assets/scripts/app/remake/AssetStateBinding";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import {FormationController} from "../assets/scripts/features/hero/FormationController";
import {FormationSaveModel} from "../assets/scripts/features/hero/FormationSaveModel";
import {HeroRosterModel} from "../assets/scripts/features/hero/HeroRosterModel";
import type {FormationSaveRequest} from "../assets/scripts/features/hero/data/FormationData";
/** 给真实客户端提供合法二进制服务器帧，记录请求以检查重复读取。 */
class Wire {
 onopen:any=null;onmessage:any=null;onerror:any=null;onclose:any=null;readyState=0;binaryType="";protocol=GAME_SOCKET_PROTOCOL;
 constructor(readonly server:Server,readonly connection:string){queueMicrotask(()=>{this.readyState=1;this.onopen?.({});});}
 send(data:unknown){this.server.receive(this,GameProtocolCodecUtils.decodeGameFrame(data));}
 close(){this.readyState=3;}
 push(frame:GameFrame){this.onmessage?.({data:GameProtocolCodecUtils.encodeGameFrame({...frame,connectionId:this.connection})});}
 drop(){this.readyState=3;this.onclose?.({});}
}
class Server {
 /** 可控制的鉴权繁忙次数，用于验证后台恢复遇到 BUSY 后仍自动重连。 */
 busyAuthentications=0;
 /** 当前GM拒绝码，由真实二进制回包路径验证错误反馈。 */
 gmFailure="UNKNOWN_MESSAGE";
 /** 登录、鉴权和心跳回包中的 Unix 毫秒，测试可以独立于库存快照修改。 */
 serverTimeMs = 100_000;
 /** 捕获待投递的心跳回包，模拟客户端关闭连接时已排队的消息。 */
 delayHeartbeat: ((deliver: () => void) => void) | null = null;
 readonly wires:Wire[]=[];readonly requests:string[]=[];state:any=null;
 create=()=>{const wire=new Wire(this,"connection-"+this.wires.length);this.wires.push(wire);return wire as unknown as SocketPort;};
 receive(wire:Wire,frame:GameFrame){
  this.requests.push(frame.name);const data=frame.body as any;
  if(frame.name==="gm.status"){queueMicrotask(()=>wire.push({version:1,kind:"response",name:frame.name,id:frame.id,ok:false,body:null,error:{code:this.gmFailure,message:this.gmFailure,retryable:false}}));return;}
  if(frame.name==="session.authenticate" && this.busyAuthentications>0){this.busyAuthentications--;queueMicrotask(()=>wire.push({version:1,kind:"response",name:frame.name,id:frame.id,ok:false,body:null,error:{code:"BUSY",message:"BUSY",retryable:true}}));return;}
  if(frame.name==="session.login" && data.serverId==="missing-world") {queueMicrotask(()=>wire.push({version:1,kind:"response",name:frame.name,id:frame.id,ok:false,body:null,error:{code:"SERVER_UNAVAILABLE",message:"SERVER_UNAVAILABLE",retryable:false}}));return;}
  if(frame.name==="session.login")this.state={role:{id:"role-"+data.account,nickname:data.account,serverId:data.serverId,level:1,gold:0,diamonds:0,basics:{experience:0,cup:1000,headId:0,imageId:410304012,borderId:0,language:1,createdAtSeconds:100,lastLoginAtSeconds:100,experienceToNextLevel:120}},inventory:[],heroes:[],revision:0};
  const heartbeat = frame.name === "session.heartbeat";
  const body = heartbeat ? { serverTimeMs: this.serverTimeMs } : {
   connectionId: wire.connection, roleId: this.state.role.id, serverTimeMs: this.serverTimeMs, initial: this.state,
   ...(frame.name === "session.login" ? { session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" } } : {}),
  };
  const response: GameFrame = { version: 1, kind: "response", name: frame.name, id: frame.id, ok: true, body };
  if (heartbeat && this.delayHeartbeat) {
   const receive = wire.onmessage;
   const data = GameProtocolCodecUtils.encodeGameFrame({ ...response, connectionId: wire.connection });
   this.delayHeartbeat(() => receive?.({ data }));
   return;
  }
  queueMicrotask(() => wire.push(response));
 }
 push(revision:number,gold:number,quantity:number){this.state={...this.state,revision,role:{...this.state.role,gold},inventory:quantity?[{itemId:900101,quantity}]:[]};this.wires[this.wires.length-1].push({version:1,kind:"event",name:"state.changed",body:this.state});}
}
/** 等待事件循环和有界重连，超时不能假通过。 */
async function until(check:()=>boolean){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}assert.fail("等待状态超时");}
/** 独立预览参数不能绕过实例核验或污染日常会话；仅模拟测试探针。 */
async function checkPreviewIsolation(){
 const context=globalThis as any,previous=Object.getOwnPropertyDescriptor(context,"location"),fetchBefore=context.fetch,values=new Map<string,string>();
 const storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
 let calls=0;const run="a".repeat(32);
 context.fetch=async()=>{calls++;return {ok:true,json:async()=>({kind:"mxzg-owned-mysql-it",run})};};
 const address=(value:string)=>Object.defineProperty(context,"location",{value:{href:value},configurable:true});
 try {
  address("http://localhost:7456/");const normal=await IsolatedSocketPreviewUtils.isolatedSocketPreview("ws://127.0.0.1:18080/api/v1/game/socket",storage);assert.equal(normal.storage,storage);assert.equal(normal.storageNamespace,"default");assert.equal(calls,0);
  address("http://localhost:7456/?mxzgTestRun="+run);await assert.rejects(IsolatedSocketPreviewUtils.isolatedSocketPreview("ws://127.0.0.1:18080/api/v1/game/socket",storage));assert.equal(calls,0);
  address("http://localhost:7456/?mxzgTestRun="+run+"&mxzgTestApi="+encodeURIComponent("http://127.0.0.1:39001"));
  const isolated=await IsolatedSocketPreviewUtils.isolatedSocketPreview("ws://127.0.0.1:18080/api/v1/game/socket",storage);assert.equal(isolated.socketUrl,"ws://127.0.0.1:39001/api/v1/game/socket");assert.equal(isolated.storageNamespace,"isolated:"+run);isolated.storage.setItem("session","test");assert.equal(storage.getItem("session"),null);assert.equal(isolated.storage.getItem("session"),"test");
  context.fetch=async()=>({ok:true,json:async()=>({kind:"mxzg-owned-mysql-it",run:"wrong"})});await assert.rejects(IsolatedSocketPreviewUtils.isolatedSocketPreview(normal.socketUrl,storage));
  address("http://localhost:7456/?mxzgTestRun="+run+"&mxzgTestApi="+encodeURIComponent("http://127.0.0.1:18080"));await assert.rejects(IsolatedSocketPreviewUtils.isolatedSocketPreview(normal.socketUrl,storage));
 }finally{context.fetch=fetchBefore;if(previous)Object.defineProperty(context,"location",previous);else delete context.location;}
}
/** 逐件期限数据不按配置合并；字符串 ID 无精度损失，非法数据不污染整包。 */
function checkInventoryIdentity(){
 const id="9223372036854775807",timed={serverTimeSeconds:100,items:[{instanceId:id,itemId:123,activeAtSeconds:50,expiresAtSeconds:200},{instanceId:"second",itemId:123,activeAtSeconds:60,expiresAtSeconds:300}]};
 assert.equal(BagItemDataUtils.readBagItems([{itemId:900102,quantity:1,instanceId:id}])[0].instanceId,id);
 assert.equal(BagItemDataUtils.readTimedItems(timed).length,2);
 assert.throws(()=>BagItemDataUtils.readTimedItems({...timed,serverTimeSeconds:200}));
 assert.throws(()=>BagItemDataUtils.readTimedItems({...timed,items:[timed.items[0],timed.items[0]]}));
 const model = new BagModel();
 model.replaceAll([], timed);
 assert.equal(model.snapshot.timedItems.length, 2);
 const before=model.snapshot;assert.throws(()=>model.replaceAll([{itemId:900102,quantity:9}],{...timed,serverTimeSeconds:300}));assert.equal(model.snapshot,before);
 model.reset();assert.equal(model.snapshot.timedItems.length,0);
}

/** 验证当前连接的心跳校时，旧连接的迟到心跳在后台和新鉴权后都不能校时。 */
async function checkServerClockHeartbeat(): Promise<void> {
 const server = new Server();
 const heartbeats: Array<() => void> = [];
 server.delayHeartbeat = deliver => { heartbeats.push(deliver); };
 let elapsedMs = 1_000;
 const clock = new ServerClock(() => elapsedMs);
 const socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
  create: server.create,
  validateSnapshot: () => {},
  heartbeatMs: 10,
  clock,
 });
 try {
  assert.equal(clock.nowSeconds(), null);
  await socket.login("player", "local-1");
  assert.equal(clock.nowSeconds(), 100, "登录回包确立公共服务器时间");
  elapsedMs += 2_500;
  assert.equal(clock.nowSeconds(), 102, "公共时钟按本地流逝时间推算");
  server.serverTimeMs = 103_000;
  await until(() => heartbeats.length === 1);
  heartbeats[0]();
  await until(() => clock.nowSeconds() === 103);
  server.serverTimeMs = 110_000;
  await until(() => heartbeats.length === 2);
  socket.setBackground(true);
  assert.equal(clock.nowSeconds(), null, "后台等待新鉴权校时");
  heartbeats[1]();
  assert.equal(clock.nowSeconds(), null, "后台的旧心跳不能恢复时钟");
  server.serverTimeMs = 150_000;
  socket.setBackground(false);
  await until(() => clock.nowSeconds() === 150);
  heartbeats[1]();
  assert.equal(clock.nowSeconds(), 150, "新鉴权后忽略旧连接的迟到心跳");
 } finally {
  socket.disconnect();
 }
 assert.equal(clock.nowSeconds(), null, "断开会话后清除公共钟");
}

/** 无单调计时器时，以前台帧时间续算最近一次服务器回包的毫秒。 */
function checkServerClockFrameTime(): void {
 const clock = new ServerClock(null);
 clock.synchronize(100_250);
 clock.advance(1.75);
 assert.equal(clock.nowSeconds(), 102);
 clock.invalidate();
 clock.advance(30);
 assert.equal(clock.nowSeconds(), null);
 clock.synchronize(150_000);
 assert.equal(clock.nowSeconds(), 150, "恢复鉴权重新选取帧时间锚点");
}

/** 精灵逐件保存生成结果；能力缺失与真实空列表不同，任一非法实例不得部分提交普通库存。 */
function checkSpiritInventory(): void {
 const items = [
  {instanceId:"9223372036854775807",itemId:2000002,abilityId:1,skills:[{sort:1,skillId:301,level:1}]},
  {instanceId:"spirit-second",itemId:2000002,abilityId:2,skills:[{sort:1,skillId:302,level:2}]},
 ];
 const inventory={schemaVersion:1,items}, model=new BagModel();
 model.replaceAll([]);
 assert.equal(model.snapshot.spiritSynced,false,"旧快照缺字段不能冒充精灵已同步");
 model.replaceAll([],undefined,{schemaVersion:1,items:[]});
 assert.equal(model.snapshot.spiritSynced,true);assert.equal(model.snapshot.spiritItems.length,0);
 model.replaceAll([{itemId:900102,quantity:2}],undefined,inventory);
 const before=model.snapshot;
 assert.equal(before.spiritItems.length,2,"同物品ID精灵不合并");
 assert.equal(before.spiritItems[0].instanceId,"9223372036854775807","实例字符串保留全部精度");
 assert(Object.isFrozen(before.spiritItems)&&Object.isFrozen(before.spiritItems[0])
  &&Object.isFrozen(before.spiritItems[0].skills)&&Object.isFrozen(before.spiritItems[0].skills[0]));
 items[0].skills[0].level=9;items[0].abilityId=999;
 assert.equal(before.spiritItems[0].skills[0].level,1);assert.equal(before.spiritItems[0].abilityId,1);
 const valid=before.spiritItems[0];
 const invalid:unknown[]=[null,{items:[]},{schemaVersion:0,items:[]},{schemaVersion:2,items:[]},
  {schemaVersion:1,items:[valid,valid]},
  ...[
   {instanceId:""},{instanceId:123},{itemId:2000003},{abilityId:0},{abilityId:5},{abilityId:0x100000000},
   {skills:[]},{skills:[valid.skills[0],valid.skills[0]]},{skills:[{sort:0,skillId:301,level:1}]},
   {skills:[{sort:1,skillId:0,level:1}]},{skills:[{sort:1,skillId:301,level:0}]},
   {skills:[{sort:1,skillId:301,level:1.5}]},{skills:[{sort:2,skillId:301,level:1}]},
   {skills:[{sort:1,skillId:301,level:3}]},
  ].map(fields=>({schemaVersion:1,items:[{...valid,...fields}]}))];
 for(const value of invalid){
  assert.throws(()=>model.replaceAll([{itemId:900102,quantity:99}],undefined,value));
  assert.equal(model.snapshot,before,"精灵非法时整批保持原状态");
 }
 assert.throws(()=>model.replaceAll([{itemId:2000002,quantity:1}],undefined,inventory),/独立精灵/);
 assert.equal(model.snapshot,before);
 model.reset();assert.equal(model.snapshot.spiritItems.length,0);assert.equal(model.snapshot.spiritSynced,false);
}

/** 初始化、推送和恢复共用完整校验；精灵错误不污染角色，旧版本/换号回包不能恢复旧实例。 */
function checkSpiritAssetDelivery(): void {
 const account=new AccountModel(), model=new BagModel(), bag=new BagController(model);
 const role={id:"spirit-owner",nickname:"精灵测试",serverId:"local-1",level:1,gold:0,diamonds:0};
 const spirit={instanceId:"spirit-a",itemId:2000002,abilityId:1,skills:[{sort:1,skillId:301,level:1}]};
 account.replace({busy:false,role,error:""});bag.initialize();
 let roleCommits=0, updates=0;
 const stopRole=account.subscribe(()=>{roleCommits++;});
 const assets=new AssetStateBinding(account,bag,new RoleController(account));
 const target={}, stop=EventDispatcher.instance.on(BagEvent.BagUpdate,target,()=>{
  updates++;
  if(model.snapshot.synced){
   assert.equal(account.snapshot.role!.gold,model.quantity(900102),"事件可见时角色与背包已同批提交");
  }
 });
 const state=(revision:number,gold:number,spiritInventory:unknown):any=>({
  revision,role:{...role,gold},inventory:gold?[{itemId:900102,quantity:gold}]:[],heroes:[],spiritInventory,
 });
 const changed=(body:unknown):GameFrame=>({version:1,kind:"event",name:"state.changed",body});
 try {
  const initial=state(1,1,{schemaVersion:1,items:[spirit]});
  assert(assets.apply({version:1,kind:"response",name:"session.login",ok:true,body:{initial}}));
  assert.equal(model.snapshot.spiritItems[0].instanceId,"spirit-a");
  const before=model.snapshot, committed=roleCommits;
  assert.throws(()=>assets.apply(changed(state(2,99,{schemaVersion:1,items:[{...spirit,abilityId:0}]}))));
  assert.equal(model.snapshot,before);assert.equal(roleCommits,committed);assert.equal(account.snapshot.role!.gold,1);
  const replacement=state(2,2,{schemaVersion:1,items:[{...spirit,abilityId:2}]});
  assert(assets.apply(changed(replacement)));assert.equal(model.snapshot.spiritItems[0].abilityId,2);
  const seen=updates;
  assert(!assets.apply(changed(initial)));assert.equal(updates,seen);assert.equal(model.snapshot.spiritItems[0].abilityId,2);
  assert(assets.apply({version:1,kind:"response",name:"session.authenticate",ok:true,body:{initial:replacement}}));
  account.replace({busy:false,role:null,error:""});assert.equal(model.snapshot.spiritItems.length,0);
  assert.equal(model.snapshot.spiritSynced,false);
  account.replace({busy:false,role:{...role,id:"other-owner"},error:""});
  assert.throws(()=>assets.apply(changed({...initial,revision:999})));
  assert.equal(model.snapshot.spiritItems.length,0,"旧角色迟到资产不能重建精灵实例");
 } finally {stopRole();stop();assets.dispose();bag.dispose();EventDispatcher.instance.offTarget(target);}
}
/** 基础角色资料不可缺字段、取负数或混淆时间顺序；唯一 Model 深层只读。 */
function checkRoleBasics(){
 const basics={experience:66,cup:1000,headId:0,imageId:410304012,borderId:0,language:1,createdAtSeconds:100,lastLoginAtSeconds:120,experienceToNextLevel:120};
 const raw={id:"role-basic",nickname:"测试",serverId:"local-1",level:1,gold:0,diamonds:0,basics};
 const role=AccountApi.readRole(raw);assert.deepEqual(role.basics,basics);assert(Object.isFrozen(role.basics));
 for(const key of Object.keys(basics)){assert.throws(()=>AccountApi.readRole({...raw,basics:{...basics,[key]:-1}}));const incomplete:any={...basics};delete incomplete[key];assert.throws(()=>AccountApi.readRole({...raw,basics:incomplete}));}
 assert.throws(()=>AccountApi.readRole({...raw,basics:{...basics,lastLoginAtSeconds:99}}));assert.throws(()=>AccountApi.readRole({...raw,basics:{...basics,experience:120}}));
 assert.throws(()=>AccountApi.readRole({...raw,basics:null}));assert.throws(()=>AccountApi.readRole([]));
 const account=new AccountModel();account.replace({busy:false,role:raw,error:""});basics.experience=99;assert.equal(account.snapshot.role!.basics!.experience,66);assert(Object.isFrozen(account.snapshot.role!.basics));
}
/** 应用统一隔离成功与失败；等待保存微任务实际发出后再切换身份或交付结果，保证覆盖在途回包。 */
async function checkApplicationDelivery(): Promise<void> {
 const server=new Server(), account=new AccountModel(), inventory=new BagModel(), bag=new BagController(inventory);
 const saves=new FormationSaveModel(), formation=new FormationController(saves,new HeroRosterModel());
 const socket=new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket",{create:server.create,validateSnapshot:()=>{},heartbeatMs:100000});
 const service=new AccountController(account,new AccountApi(socket),{read:()=>null,write:()=>{},clear:()=>{}});
 let closePages=0;
 bag.initialize();formation.initialize();
 const assets=new AssetStateBinding(account,bag,new RoleController(account),undefined,formation,()=>{closePages++;});
 service.onInitialized=frame=>assets.apply(frame);
 let resolve!: (frame:GameFrame)=>void, reject!: (error:unknown)=>void, sent!:FormationSaveRequest;
 let sentCount = 0;
 formation.configure({
  deliver: (name,body,received,failed)=>service.deliverAuthenticated(()=>{
   assert.equal(name,"formation.save");
   sent = body as FormationSaveRequest;
   sentCount++;
   return new Promise<GameFrame>((yes,no)=>{
    resolve = yes;
    reject = no;
   });
  },received,failed),
 });
 const draft={expectedVersion:0,formationId:1,slots:[{position:3,heroId:"hero-one"}]};
 const receipt=():GameFrame=>({version:1,kind:"response",name:"formation.save",ok:true,body:{requestId:sent.requestId,version:1}});
 try {
  assert(await service.login("player","local-1"));
  let done=formation.save(draft);
  await until(()=>sentCount===1);
  assert(await service.login("other","local-2"));
  const switched=saves.snapshot, pages=closePages;
  resolve(receipt());await done;
  assert.equal(saves.snapshot,switched,"旧成功结果不进入模块");
  assert.equal(account.snapshot.role!.id,"role-other");assert.equal(inventory.snapshot.synced,true);
  server.state={...server.state,revision:1};socket.onState=frame=>assets.apply(frame);
  server.push(1,0,0);assert.equal(closePages,pages,"同角色状态同步不关页");
  done=formation.save(draft);
  await until(()=>sentCount===2);
  service.logout();assert(await service.login("other","local-2")); // 同角色重新登录也是新身份周期。
  const relogged=saves.snapshot;
  reject(new SocketFailure("UNAUTHENTICATED"));await done;
  assert.equal(saves.snapshot,relogged,"旧失败不能修改当前保存进度");assert(account.snapshot.role);
  done=formation.save(draft);
  await until(()=>sentCount===3);
  reject(new Error("网络断开"));
  await done;
  const original=sent;
  assert.deepEqual(saves.snapshot,{busy:false,savedVersion:null});
  done=formation.save({...draft,slots:[{position:5,heroId:"hero-one"}]});
  await until(()=>sentCount===4);
  assert.notEqual(sent.requestId,original.requestId,"再次点击发送当前草稿和新的请求编号");
  assert.equal(sent.slots[0].position,5);
  resolve(receipt());await done;assert.equal(saves.snapshot.savedVersion,1);
  assert(closePages>=3,"角色页面由应用统一关闭");
 } finally { socket.onState=null;socket.disconnect();assets.dispose();bag.dispose(); }
}
/** 就绪连接显式刷新必须重新鉴权交付首包，不能沿用connect的就绪短路或发起资产查询。 */
async function checkExplicitSnapshotRefresh(): Promise<void> {
 const server = new Server();
 const socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
  create: server.create, validateSnapshot: () => {}, heartbeatMs: 100000,
 });
 let initialized = 0;
 socket.onReady = () => { initialized++; };
 try {
  await socket.login("player", "local-1");
  const wires = server.wires.length;
  await socket.connect("a".repeat(43));
  assert.equal(server.wires.length, wires, "普通connect复用就绪通道");
  server.state = {...server.state, revision: 3, role: {...server.state.role, gold: 23}};
  await socket.refreshSnapshot("a".repeat(43));
  assert.equal(server.wires.length, wires + 1);
  assert.equal(server.wires[0].readyState, 3, "刷新先关闭旧通道");
  assert.equal(initialized, 2);
  assert.equal(socket.latestState!.name, "session.authenticate");
  assert.equal((socket.latestState!.body as any).initial.revision, 3);
  assert.equal((socket.latestState!.body as any).initial.role.gold, 23);
  assert.deepEqual(server.requests, ["session.login", "session.authenticate"]);
  const snapshot = socket.latestState;
  server.wires[0].push({version: 1, kind: "event", name: "state.changed", body: {...server.state, revision: 100}});
  assert.equal(socket.latestState, snapshot, "旧通道迟到不能覆盖显式刷新首包");
  await assert.rejects(socket.refreshSnapshot("b".repeat(43)), (error: SocketFailure) => error.code === "NOT_READY");
  assert.equal(server.wires.length, wires + 1, "错误凭证不能切换刷新目标");
  socket.setBackground(true);
  await assert.rejects(socket.refreshSnapshot("a".repeat(43)), (error: SocketFailure) => error.code === "NOT_READY");
  assert.equal(server.wires.length, wires + 1, "后台不新建刷新通道");
 } finally {
  socket.onReady = null;
  socket.disconnect();
 }
}

/** 真实二进制推送及同版恢复共用冒险点校验；坏扩展在传输状态版本前拒绝，不污染角色或背包。 */
async function checkTavernSnapshotTransport(): Promise<void> {
    const server = new Server();
    const account = new AccountModel();
    const inventory = new BagModel();
    const bag = new BagController(inventory);
    const socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: server.create,
        validateSnapshot: value => {
            const state = value as Record<string, unknown>;
            AccountApi.readSnapshotRole(value);
            BagItemDataUtils.readBagItems(state.inventory);
            assert(Number.isSafeInteger(state.revision));
        },
        heartbeatMs: 100000,
    });
    const service = new AccountController(account, new AccountApi(socket), {
        read: () => null,
        write: () => {},
        clear: () => {},
    });
    bag.initialize();
    const assets = new AssetStateBinding(account, bag, new RoleController(account));
    service.onInitialized = frame => { assets.apply(frame); };
    socket.onState = frame => { assets.apply(frame); };
    socket.onReady = () => {
        if (account.snapshot.role && socket.latestState) {
            assets.apply(socket.latestState);
        }
    };
    try {
        assert(await service.login("player", "local-1"));
        assert.equal(account.snapshot.role!.tavernPoints, undefined, "旧首包缺字段保持未同步");
        server.state.tavernPoints = { schemaVersion: 1, adventureCount: 12000, limit: 11000 };
        server.push(1, 7, 5);
        assert.deepEqual(account.snapshot.role!.tavernPoints, server.state.tavernPoints);
        assert.equal(inventory.quantity(900101), 5);
        const accepted = account.snapshot;
        server.state.tavernPoints = { schemaVersion: 1, adventureCount: 1, limit: 11000 };
        server.push(1, 99, 99);
        assert.equal(account.snapshot, accepted, "同版推送不覆盖已接纳点数");
        delete server.state.tavernPoints;
        await service.authenticated(token => socket.refreshSnapshot(token));
        assert.equal(account.snapshot.role!.tavernPoints, undefined, "同版鉴权缺字段清除旧点数");
        server.state.tavernPoints = { schemaVersion: 1, adventureCount: 0, limit: 0 };
        server.push(2, 8, 6);
        assert.equal(account.snapshot.role!.tavernPoints!.adventureCount, 0);
        const before = account.snapshot;
        const bagBefore = inventory.snapshot;
        const latest = socket.latestState;
        server.state.tavernPoints = { schemaVersion: 1, adventureCount: -1, limit: 11000 };
        server.push(3, 100, 100);
        assert.equal(account.snapshot, before);
        assert.equal(inventory.snapshot, bagBefore);
        assert.equal(socket.latestState, latest, "非法扩展不能先推进连接快照或版本");
        assert.equal(server.wires[server.wires.length - 1].readyState, 3, "非法快照停止连接，不自动循环恢复");
        assert.deepEqual(server.requests, ["session.login", "session.authenticate"]);
    } finally {
        socket.onReady = socket.onState = null;
        socket.disconnect();
        assets.dispose();
        bag.dispose();
    }
}

/** 召唤、装备、历史查询和新手赠礼共用连接的回包归属检查。 */
async function checkAuthenticatedReceipts(): Promise<void> {
    const requestId = "10304012-1111-4111-8111-111111111111";
    for (const name of [Protocol.HERO_SUMMON, "hero.summon.normal", "hero.summon.first",
        "hero.summon.first.status", "role.welcome.claim", Protocol.HERO_EQUIPMENT_CHANGE] as const) {
        const server = new Server();
        const socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
            create: server.create, validateSnapshot: () => {}, heartbeatMs: 100000,
        });
        try {
            await socket.login("player", "local-1");
            let roleId = "role-player";
            const query = name === "hero.summon.first.status";
            const welcome = name === "role.welcome.claim";
            const summon = name === Protocol.HERO_SUMMON;
            const equipment = name === Protocol.HERO_EQUIPMENT_CHANGE;
            const choice = { pool: "ADVANCED", count: 1 };
            const equipmentChoice = { heroId: "10304012-2222-4222-8222-222222222222", action: "UNEQUIP_ALL" };
            let found = !query;
            server.receive = (wire, request) => {
                const receipt = {
                    schemaVersion: 1, requestId, receiptId: requestId, roleId, assetRevision: 2,
                    state: { schemaVersion: 1, firstNormalCompleted: true, normalFreeAtSeconds: 100 },
                    actual: {
                        roleId,
                        items: [{ itemId: 10304012, requested: 1, credited: 1, ignored: 0, reason: "NONE" }],
                        heroes: [{ instanceId: "10304012-3333-4333-8333-333333333333",
                            templateId: 10304012, star: 4, level: 1, stage: 1 }],
                        wallet: { goldBefore: 0, goldAfter: 0, diamondsBefore: 0, diamondsAfter: 0 },
                        spirits: { schemaVersion: 1, items: [] },
                    },
                };
                const body = welcome ? {
                    schemaVersion: 1, receiptId: requestId, roleId, assetRevision: 2,
                    mode: "POPUP", items: [{ itemId: 900002, credited: 492 }],
                } : query ? { requestId, found, ...(found ? {receipt} : {}) }
                    : equipment ? { requestId, ...equipmentChoice, roleId, assetRevision: 2, changed: false }
                    : summon ? { ...receipt, ...choice } : receipt;
                wire.push({ version: 1, kind: "response", id: request.id, name, ok: true, body });
            };
            const send = () => socket.requestFrame("a".repeat(43), name,
                welcome ? {} : summon ? { requestId, ...choice }
                    : equipment ? { requestId, ...equipmentChoice } : { requestId });
            if (!found) {
                const missing = await send();
                assert.equal((missing.body as { found: boolean }).found, false);
                found = true;
            }
            assert.equal((await send()).name, name);
            roleId = "role-other";
            await assert.rejects(send(), (error: unknown) => error instanceof SocketFailure && error.code === "INVALID_MESSAGE");
            assert.equal(server.wires[0].readyState, 3);
        } finally {
            socket.disconnect();
        }
    }
}

/** 收包日志的同步订阅者可退出；已经解码的旧资产事件也应停止，不能在退出后重新提交。 */
async function checkLogoutDuringNotification(): Promise<void> {
    const server = new Server();
    let delivered = false;
    const socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: server.create,
        validateSnapshot: () => {},
        onReceive: frame => {
            if (frame.name === "state.changed") {
                socket.disconnect();
            }
        },
    });
    try {
        await socket.login("player", "local-1");
        socket.onState = () => { delivered = true; };
        server.push(1, 100, 1);
        assert.equal(delivered, false);
        assert.equal(socket.latestState, null);
    } finally {
        socket.disconnect();
    }
}

/** 真实二进制目录回包决定探测结果；超时、取消和错误身份只关闭短连接，保留共享服登录。 */
async function checkPersonalServerProbe(): Promise<void> {
    const directory = "wss://shared.test/api/v1/game/socket";
    const address = "wss://personal.test/api/v1/game/socket";
    const row: GameServer = { id: "dev-hao", enabled: true, regionId: "lan", regionName: "内网", name: "个人服" };
    const shared = new Server();
    const personal = new Server();
    const requests: GameFrame[] = [];
    let rows = [row];
    let reply = true;
    let mismatch = false;
    personal.receive = (wire: Wire, frame: GameFrame): void => {
        requests.push(frame);
        if (reply) {
            wire.push({
                version: 1, kind: "response", name: Protocol.SERVERS_LIST,
                id: mismatch ? "other-request" : frame.id, ok: true, body: { items: rows },
            });
        }
    };
    const observed: string[] = [];
    const socket = new GameSocketClient(directory, {
        create: url => (url === directory ? shared : personal).create(),
        onReceive: frame => observed.push(frame.name),
        validateSnapshot() {}, timeoutMs: 100, heartbeatMs: 100000,
    });
    const signal = new AbortController().signal;
    try {
        await socket.login("player", "local-1");
        const state = socket.latestState;
        assert.equal(await socket.probePersonalServer(address, row.id, signal), true);
        rows = [{ ...row, id: "someone-else" }];
        assert.equal(await socket.probePersonalServer(address, row.id, signal), false);
        rows = [{ ...row, socketUrl: address }];
        assert.equal(await socket.probePersonalServer(address, row.id, signal), false, "共享目录登记不能证明目标自持此区服");
        rows = [{ ...row, enabled: false }];
        assert.equal(await socket.probePersonalServer(address, row.id, signal), false);
        rows = [row];
        mismatch = true;
        assert.equal(await socket.probePersonalServer(address, row.id, signal), false);
        mismatch = false;
        reply = false;
        assert.equal(await socket.probePersonalServer(address, row.id, signal), false, "已握手但无业务回包也须超时");
        const cancel = new AbortController();
        const count = requests.length;
        const pending = socket.probePersonalServer(address, row.id, cancel.signal);
        await until(() => requests.length > count);
        cancel.abort();
        assert.equal(await pending, false);
        const connections = personal.wires.length;
        assert.equal(await socket.probePersonalServer(address, row.id, cancel.signal), false);
        await assert.rejects(socket.catalog(cancel.signal), (error: SocketFailure) => error.code === "CANCELLED");
        assert.equal(await socket.probePersonalServer(address.replace("wss:", "ws:"), row.id, signal), false);
        assert.equal(personal.wires.length, connections, "已取消或地址无效时不新建连接");
        reply = true;
        assert.equal(await socket.probePersonalServer(address, row.id, signal), true, "恢复后下一轮重新检测");
        assert(personal.wires.every(wire => wire.readyState === 3));
        for (const frame of requests) {
            assert.deepEqual(frame, { version: 1, kind: "request", name: Protocol.SERVERS_LIST, id: frame.id, body: {} });
        }
        assert.deepEqual(shared.requests, [Protocol.SESSION_LOGIN]);
        assert(!observed.includes(Protocol.SERVERS_LIST), "临时探测不进入会话协议日志");
        assert.equal(socket.latestState, state);
        socket.assertReady("a".repeat(43));
    } finally {
        socket.disconnect();
    }
}

/** 模拟一台共享目录和两台个人实例，用实际二进制帧检查登录、重连、换服及旧凭证的归属。 */
async function checkLanServerRouting(): Promise<void> {
    const directory = "wss://shared.test/api/v1/game/socket";
    const first = "wss://one.test/api/v1/game/socket";
    const second = "wss://two.test/api/v1/game/socket";
    const sharedRow = { id: "local-1", regionId: "lan", regionName: "联调", name: "共享验收服", enabled: true };
    const personalRow = { ...sharedRow, id: "dev-one", name: "个人服", socketUrl: first };
    let rows: GameServer[] = [sharedRow, personalRow];
    class DirectoryServer extends Server {
        /** 记录公开目录请求；其余登录与鉴权交给共享服的二进制响应实现。 */
        public override receive(wire: Wire, frame: GameFrame): void {
            if (frame.name !== Protocol.SERVERS_LIST) {
                super.receive(wire, frame);
                return;
            }
            this.requests.push(frame.name);
            queueMicrotask(() => wire.push({
                version: 1, kind: "response", name: frame.name, id: frame.id, ok: true, body: { items: rows },
            }));
        }
    }
    const shared = new DirectoryServer();
    const a = new Server();
    const b = new Server();
    const hosts = new Map([[directory, shared], [first, a], [second, b]]);
    const storage = {
        session: null as AccountSession | null,
        read(): AccountSession | null { return this.session; },
        write(session: AccountSession): void { this.session = session; },
        clear(): void { this.session = null; },
    };
    const attempts: string[] = [];
    /** 创建新的应用连接；存储、服务端状态和目录跨页面刷新保留。 */
    function page() {
        const socket = new GameSocketClient(directory, {
            create(url) {
                attempts.push(url);
                const server = hosts.get(url);
                if (!server) throw new Error("个人服离线");
                return server.create();
            },
            validateSnapshot() {}, retryDelay: () => 0, heartbeatMs: 100000,
        });
        const selection = new ServerSelectionController(socket, () => {});
        const api = new AccountApi(socket, id => selection.socketUrlFor(id));
        const account = new AccountController(new AccountModel(), api, storage);
        return { socket, selection, account };
    }
    const journal = { forRole: async (serverKey: string) => serverKey };
    let client = page();
    try {
        await client.selection.load();
        assert(await client.account.login("player", sharedRow.id));
        assert.equal(await client.account.openRoleJournal(journal), sharedRow.id);
        assert(await client.account.login("player", personalRow.id));
        const personalKey = await client.account.openRoleJournal(journal);
        assert.notEqual(personalKey, personalRow.id);
        await client.selection.load();
        assert.deepEqual(shared.requests, [Protocol.SERVERS_LIST, Protocol.SESSION_LOGIN, Protocol.SERVERS_LIST]);
        assert.deepEqual(a.requests, [Protocol.SESSION_LOGIN]);
        a.wires[a.wires.length - 1].drop();
        await until(() => a.requests.includes(Protocol.SESSION_AUTHENTICATE));
        client.socket.setBackground(true);
        client.socket.setBackground(false);
        await until(() => a.requests.filter(name => name === Protocol.SESSION_AUTHENTICATE).length === 2);
        client.account.dispose();
        client = page();
        await client.selection.load();
        assert(await client.account.restore());
        assert.equal(await client.account.openRoleJournal(journal), personalKey);
        const saved = storage.read()!;
        assert.equal(saved.route?.serverId, personalRow.id);
        assert.equal(saved.route?.socketUrl, first);

        rows = [sharedRow, { ...personalRow, socketUrl: second }];
        await client.selection.load();
        let entered = false;
        await client.account.enterServer("player", personalRow.id, () => { entered = true; });
        assert(entered);
        assert.deepEqual(b.requests, [Protocol.SESSION_LOGIN], "同编号换地址后必须显式登录新的实例");
        client.account.dispose();
        client = page();
        await client.selection.load();
        storage.write(saved);
        assert.equal(await client.account.restore(), false);
        assert.equal(storage.read(), null);
        assert(!b.requests.includes(Protocol.SESSION_AUTHENTICATE), "换地址后不能把旧凭证发送到新实例");
        assert(await client.account.login("player", personalRow.id));
        assert.notEqual(await client.account.openRoleJournal(journal), personalKey);
        assert.deepEqual(b.requests, [Protocol.SESSION_LOGIN, Protocol.SESSION_LOGIN]);

        rows = [sharedRow];
        await client.selection.load();
        assert.equal(await client.account.restore(), false);
        assert(!b.requests.includes(Protocol.SESSION_AUTHENTICATE), "已经移除的个人服不能恢复");
        rows = [sharedRow, personalRow, personalRow];
        await assert.rejects(client.selection.load());
        for (const socketUrl of ["ws://one.test/api/v1/game/socket", first + "?token=x", "wss://user@one.test/api/v1/game/socket"]) {
            rows = [sharedRow, { ...personalRow, socketUrl }];
            await assert.rejects(client.selection.load());
        }
        assert.deepEqual(client.selection.servers.map(row => row.id), [sharedRow.id], "非法目录不得覆盖上一版");
        rows = [sharedRow, { ...personalRow, socketUrl: "wss://offline.test/api/v1/game/socket" }];
        await client.selection.load();
        const before = attempts.length;
        assert.equal(await client.account.login("player", personalRow.id), false);
        assert.deepEqual(attempts.slice(before), [rows[1].socketUrl], "个人服离线不能回落到共享服");

        storage.write({ accessToken: saved.accessToken, expiresAt: saved.expiresAt });
        assert(await client.account.restore());
        assert.equal(storage.read()!.route?.socketUrl, directory, "旧版共享凭证在原服务确认后绑定地址");
        assert.equal(storage.read()!.route?.serverId, sharedRow.id);
    } finally {
        client.account.dispose();
    }
}

/** 登录页用受控探针复现个人服停启；共享服可独立进入，关页取消在途点击和旧状态通知。 */
async function checkLanAvailability(): Promise<void> {
    const shared = { id: "local-1", regionId: "lan", regionName: "内网", name: "共享验收服", enabled: true };
    const personal = { ...shared, id: "dev-hao", name: "Hao 个人开发服", socketUrl: "wss://hao.test/api/v1/game/socket" };
    let rows = [shared, personal];
    let probe: ((online: boolean) => void) | undefined;
    let latestSignal: AbortSignal | undefined;
    let count = 0;
    const selection = new ServerSelectionController({
        catalog: async () => rows,
        probePersonalServer: (_url, _id, signal) => new Promise<boolean>(resolve => {
            count++;
            latestSignal = signal;
            probe = resolve;
        }),
    }, () => {}, personal.id);
    await selection.load();
    const model = new AccountModel();
    const entries: string[] = [];
    let actions: AccountActions;
    let canEnter = false;
    const page = new AccountLoginBinding(model, {
        enterServer: async (_account: string, id: string) => { entries.push(id); },
    } as AccountController, {
        bind(value) { actions = value; return () => {}; },
        render(_state, allowed) { canEnter = allowed; },
        showNotice() {},
    }, () => {}, selection);
    page.show();
    try {
        await until(() => !!probe);
        assert.equal(selection.selected?.checking, true);
        assert.equal(canEnter, false);
        selection.choose(shared.id);
        actions!.login("player");
        await until(() => entries.includes(shared.id));
        assert.equal(count, 1, "个人服探测尚未结束也能进入共享服");
        probe!(true);
        await until(() => !!selection.servers.find(row => row.id === personal.id)?.enabled);
        selection.choose(personal.id);
        assert.equal(canEnter, true);
        actions!.login("player");
        await until(() => count === 2);
        const simultaneous = selection.confirmEntry(personal.id);
        assert.equal(count, 2, "同一目标同时复核时复用探测");
        probe!(false);
        assert.equal(await simultaneous, false);
        assert.equal(canEnter, false);
        assert.equal(selection.selected?.id, personal.id, "个人服离线时保留已选区服");
        assert.equal(selection.selected?.checking, false);
        assert.throws(() => selection.choose(personal.id));
        assert.equal(selection.socketUrlFor(personal.id), personal.socketUrl, "暂时离线不能清除已登记的凭证归属");
        actions!.login("player");
        assert.deepEqual(entries, [shared.id], "维护期间不能通过程序点击进入或默默回落共享");

        // 实际等待下一轮五秒定时刷新，不手动重开页面。
        await new Promise(resolve => setTimeout(resolve, 5100));
        await until(() => count === 3);
        probe!(true);
        await until(() => canEnter);
        assert.equal(selection.selected?.id, personal.id);
        actions!.login("player");
        await until(() => count === 4);
        probe!(true);
        await until(() => entries.includes(personal.id));
        actions!.login("player");
        await until(() => count === 5);
        page.close();
        assert.equal(latestSignal!.aborted, true);
        probe!(false);
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.deepEqual(entries, [shared.id, personal.id], "恢复后可进入个人服，关页后的点击不能重复进入");
        assert.equal(selection.selected?.enabled, true, "关页后丢弃迟到结果");

        rows = [shared, personal].map(row => ({ ...row, enabled: false }));
        await selection.load();
        assert(selection.servers.every(row => !row.enabled), "全服显式维护时立即替换旧绿灯");
    } finally {
        page.close();
    }
}

/** 依次执行本文件的会话与统一状态检查；全部使用受控连接，不访问日常服务。 */
async function main(){
 await checkLanAvailability();
 await checkPersonalServerProbe();
 await checkLanServerRouting();
 checkServerClockFrameTime();
 await checkServerClockHeartbeat();
 await checkAuthenticatedReceipts();
 await checkLogoutDuringNotification();
 await checkTavernSnapshotTransport();
 await checkExplicitSnapshotRefresh();
 await checkApplicationDelivery();
 const oldServer=new Server(),oldSocket=new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket",{create:oldServer.create,validateSnapshot:()=>{},heartbeatMs:100000});
 try {
  await oldSocket.login("player","local-1");
  const failures = [
   ["UNKNOWN_MESSAGE", "更新并重启后端"],
   ["GM_UNSUPPORTED_ITEM_TYPE", "真实实例生成"],
   ["GM_SPIRIT_LIMIT", "1000"],
   ["GM_CAPACITY_FULL", "容量不足"],
   ["GM_TIMED_LIMIT", "100"],
   ["GM_REQUEST_CONFLICT", "参数发生变化"],
   ["NEW_BUSINESS_ERROR", "NEW_BUSINESS_ERROR"],
  ];
  for (const [code, expected] of failures) {
   oldServer.gmFailure = code;
   await assert.rejects(oldSocket.request("a".repeat(43), "gm.status"), (error: any) =>
    error.code === code && error.message.includes(expected) && !error.message.includes("连接请求失败"));
  }
 } finally {
  oldSocket.disconnect();
 }
 checkRoleBasics();
 checkInventoryIdentity();
 checkSpiritInventory();
 checkSpiritAssetDelivery();
 await checkPreviewIsolation();
 const server=new Server(),account=new AccountModel(),model=new BagModel(),bag=new BagController(model);
 const clock = new ServerClock(() => 0);
 const socket=new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket",{create:server.create,validateSnapshot:value=>{const row=value as any;AccountApi.readSnapshotRole(value);BagItemDataUtils.readBagItems(row.inventory);assert(Number.isSafeInteger(row.revision));},retryDelay:()=>1,heartbeatMs:100000,clock});
 const service=new AccountController(account,new AccountApi(socket),{read:()=>null,write:()=>{},clear:()=>{}});bag.initialize();
 const assets=new AssetStateBinding(account,bag,new RoleController(account));
 const connectionNotices: string[] = [];
 const unbind = AccountComposition.bind({model: account, socket, controller: service},
    frame => { assets.apply(frame); }, () => {}, text => connectionNotices.push(text));
 let events=0;const target={};const stop=EventDispatcher.instance.on(BagEvent.BagUpdate,target,()=>{events++;if(model.snapshot.synced)assert.equal(account.snapshot.role?.gold,server.state.role.gold);});
 try{
  let homeActions:any;const opened:string[]=[];const notices:string[]=[];
  const home=new HomePageBinding(account,{bind:value=>{homeActions=value;return()=>{};},render:()=>{},showNotice:value=>notices.push(value)},{
   tabs:["hero","bag","battle"],open:id=>{opened.push(id);return true;}
  });
  home.show();homeActions.openFeature("bag");homeActions.openFeature("city");homeActions.openFeature("hero");homeActions.openFeature("battle");assert.deepEqual(opened,["bag","city","hero","battle"]);assert.equal(notices.length,0);home.close();
  const unwatch=account.subscribe(state=>{if(state.role&&!state.busy)assert(model.snapshot.synced,"角色通知前库存已提交");});
  assert(await service.login("player","local-1"));assert.equal(model.snapshot.synced,true);assert.deepEqual(server.requests,["session.login"]);
  server.state.role.basics={...server.state.role.basics,experience:66};
  server.push(1,7,5);assert.equal(account.snapshot.role!.basics!.experience,66);assert.equal(account.snapshot.role!.gold,7);assert.equal(model.quantity(900101),5);
  const count=events;server.push(1,7,5);server.push(0,0,0);assert.equal(events,count);assert.equal(model.quantity(900101),5);
  server.state={...server.state,revision:2,role:{...server.state.role,gold:9},inventory:[{itemId:900101,quantity:8}]};
  const oldMessage=server.wires[0].onmessage;server.wires[0].drop();await until(()=>server.wires.length===2&&model.quantity(900101)===8);assert.deepEqual(server.requests,["session.login","session.authenticate"]);
  assert.deepEqual(connectionNotices, ["网络已断开，正在重新连接…", ""], "同一绑定报告断线，重新鉴权时清除提示");
  let actions!: AccountActions;
  let entered = 0;
  const routeErrors: string[] = [];
  const page = new AccountLoginBinding(account, service, {
    bind: value => { actions = value; return () => {}; },
    render: () => {},
    showNotice: text => routeErrors.push(text),
  }, () => {
    if (++entered === 2) {
      throw new Error("主城挂载失败");
    }
  });
  page.show();
  actions.login("player");
  await until(() => entered === 1);
  await Promise.resolve();
  actions.login("player");
  await until(() => routeErrors.length === 1);
  assert.deepEqual(routeErrors, ["主城挂载失败"]);
  assert.equal(account.snapshot.error, "", "界面跳转失败只在登录页提示");
  page.close();
  assert.equal(server.requests.length, 2, "开始按钮不重新查询");
  // 库存包的时间只校验期限数据。同版本鉴权用回包的公共时间校准，重复 show/hide 不建立多条连接。
  const timed={serverTimeSeconds:95,items:[{instanceId:"timed-a",itemId:902025,activeAtSeconds:50,expiresAtSeconds:200}]};
  server.state={...server.state,timedInventory:timed};server.push(3,9,8);
  assert.equal(model.snapshot.timedItems.length, 1);
  assert.equal(clock.nowSeconds(), 100, "库存推送不改变公共服务器时间");
  const oldWire=server.wires[server.wires.length-1],lateMessage=oldWire.onmessage;
  socket.setBackground(true);socket.setBackground(true);assert.equal(clock.nowSeconds(),null);assert.equal(oldWire.readyState,3);
  const requestsBefore=server.requests.length,wiresBefore=server.wires.length;
  await new Promise(r=>setTimeout(r,20));assert.equal(server.wires.length,wiresBefore,"后台停止重试");
  server.state={...server.state,timedInventory:{...timed,serverTimeSeconds:150}};
  server.serverTimeMs = 151_000;
  server.busyAuthentications=1;socket.setBackground(false);socket.setBackground(false);
  await until(()=>clock.nowSeconds()===151);assert.deepEqual(server.requests.slice(requestsBefore),["session.authenticate","session.authenticate"],"BUSY 只重试鉴权，不补查库存");
  lateMessage({data:GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"event",name:"state.changed",connectionId:oldWire.connection,body:{...server.state,revision:999,timedInventory:timed}})});assert.equal(clock.nowSeconds(),151,"后台旧连接回包不能倒退时钟");
  socket.setBackground(true);
  server.state={...server.state,revision:4,timedInventory:{serverTimeSeconds:250,items:[]}};
  server.serverTimeMs = 250_000;
  socket.setBackground(false);await until(()=>clock.nowSeconds()===250);assert.equal(model.snapshot.timedItems.length,0,"后台跨过期限后恢复到服务器有效列表");
  unwatch();assert(await service.login("other","local-2"));assert.equal(model.quantity(900101),0);assert.equal(account.snapshot.role!.id,"role-other");assert.equal(model.snapshot.synced,true);
  oldMessage({data:GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"event",name:"state.changed",connectionId:"connection-0",body:{revision:999,role:{id:"role-player",nickname:"old",level:1,gold:999,diamonds:0,serverId:"local-1"},inventory:[{itemId:900101,quantity:999}],heroes:[]}})});
  assert.equal(model.quantity(900101),0);assert.equal(account.snapshot.role!.id,"role-other");
  const before=model.snapshot;const validBasics=server.state.role.basics;server.state.role.basics={...validBasics,experience:120};
  server.push(1,3,9);assert.equal(model.snapshot,before,"非法角色资料不得部分写入合法库存");assert.equal(account.snapshot.role!.basics!.experience,0);
  server.state.role.basics=validBasics;server.push(1,3,-1);assert.equal(model.snapshot,before,"非法整包不得部分更新角色或背包");assert.equal(account.snapshot.role!.gold,0);
  socket.setBackground(true);service.logout();assert.equal(model.snapshot.status,"idle");assert.equal(model.snapshot.synced,false);assert.equal(model.items.length,0);
  const loggedOutWires=server.wires.length;socket.setBackground(false);await new Promise(r=>setTimeout(r,20));assert.equal(server.wires.length,loggedOutWires,"后台退出后不能恢复旧账号");
  assert.equal(await service.login("player","missing-world"),false);assert(account.snapshot.error.includes("服务器暂未开放"));assert.equal(model.snapshot.status,"idle");assert.equal(model.snapshot.synced,false);
  console.log("PASS unified initialization, no duplicate requests, atomic role/bag events, monotonic revision, reconnect, old-wire isolation, invalid payload, logout");
 } finally {
    stop();
    unbind();
    assert.equal(service.onInitialized, null);
    assert.equal(socket.onState, null);
    assert.equal(socket.onReady, null);
    assert.equal(socket.onReward, null);
    assert.equal(socket.onRejected, null);
    assert.equal(socket.onDisconnected, null);
    socket.disconnect();
    assets.dispose();
    bag.dispose();
    EventDispatcher.instance.offTarget(target);
 }
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
