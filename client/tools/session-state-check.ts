/** 统一登录与资产同步回归：只使用受控二进制连接和内存 Model，不访问任何数据库。 */
import {strict as assert} from "node:assert";
import {GameSocketClient,SocketPort} from "../assets/scripts/platform/GameSocketClient";
import {encodeGameFrame,decodeGameFrame,GAME_SOCKET_PROTOCOL,GameFrame} from "../assets/scripts/platform/GameProtocolCodec";
import {AccountApi,readRole} from "../assets/scripts/features/account/AccountApi";
import {AccountModel} from "../assets/scripts/features/account/AccountModel";
import {AccountService} from "../assets/scripts/features/account/AccountService";
import {HomeController} from "../assets/scripts/features/home/HomeController";
import {AccountController} from "../assets/scripts/features/account/AccountController";
import {RoleController} from "../assets/scripts/features/account/RoleController";
import {BagController} from "../assets/scripts/features/Bag/BagController";
import {BagModel} from "../assets/scripts/features/Bag/BagModel";
import {BagEvent} from "../assets/scripts/features/Bag/BagEvent";
import {readBagItems,readTimedItems} from "../assets/scripts/features/Bag/data/BagItemData";
import {isolatedSocketPreview} from "../assets/scripts/app/remake/IsolatedSocketPreview";
import {AssetStateBinding} from "../assets/scripts/app/remake/AssetStateBinding";
import {EventDispatcher} from "../assets/scripts/framework/EventDispatcher";
/** 给真实客户端提供合法二进制服务器帧，记录请求以检查重复读取。 */
class Wire {
 onopen:any=null;onmessage:any=null;onerror:any=null;onclose:any=null;readyState=0;binaryType="";protocol=GAME_SOCKET_PROTOCOL;
 constructor(readonly server:Server,readonly connection:string){queueMicrotask(()=>{this.readyState=1;this.onopen?.({});});}
 send(data:unknown){this.server.receive(this,decodeGameFrame(data));}
 close(){this.readyState=3;}
 push(frame:GameFrame){this.onmessage?.({data:encodeGameFrame({...frame,connectionId:this.connection})});}
 drop(){this.readyState=3;this.onclose?.({});}
}
class Server {
 /** 可控制的鉴权繁忙次数，用于验证后台恢复遇到 BUSY 后仍自动重连。 */
 busyAuthentications=0;
 readonly wires:Wire[]=[];readonly requests:string[]=[];state:any=null;
 create=()=>{const wire=new Wire(this,"connection-"+this.wires.length);this.wires.push(wire);return wire as unknown as SocketPort;};
 receive(wire:Wire,frame:GameFrame){
  this.requests.push(frame.name);const data=frame.body as any;
  if(frame.name==="session.authenticate" && this.busyAuthentications>0){this.busyAuthentications--;queueMicrotask(()=>wire.push({version:1,kind:"response",name:frame.name,id:frame.id,ok:false,body:null,error:{code:"BUSY",message:"BUSY",retryable:true}}));return;}
  if(frame.name==="session.login" && data.serverId==="missing-world") {queueMicrotask(()=>wire.push({version:1,kind:"response",name:frame.name,id:frame.id,ok:false,body:null,error:{code:"SERVER_UNAVAILABLE",message:"SERVER_UNAVAILABLE",retryable:false}}));return;}
  if(frame.name==="session.login")this.state={role:{id:"role-"+data.account,nickname:data.account,serverId:data.serverId,level:1,gold:0,diamonds:0,basics:{experience:0,cup:1000,headId:0,imageId:410304012,borderId:0,language:1,createdAtSeconds:100,lastLoginAtSeconds:100,experienceToNextLevel:120}},inventory:[],heroes:[],revision:0};
  const body=frame.name==="session.heartbeat"?{serverTimeMs:1}:{connectionId:wire.connection,roleId:this.state.role.id,serverTimeMs:1,initial:this.state,...(frame.name==="session.login"?{session:{accessToken:"a".repeat(43),expiresAt:"2099-01-01T00:00:00Z"}}:{})};
  queueMicrotask(()=>wire.push({version:1,kind:"response",name:frame.name,id:frame.id,ok:true,body}));
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
  address("http://localhost:7456/");const normal=await isolatedSocketPreview("ws://127.0.0.1:18080/api/v1/game/socket",storage);assert.equal(normal.storage,storage);assert.equal(calls,0);
  address("http://localhost:7456/?mxzgTestRun="+run);await assert.rejects(isolatedSocketPreview("ws://127.0.0.1:18080/api/v1/game/socket",storage));assert.equal(calls,0);
  address("http://localhost:7456/?mxzgTestRun="+run+"&mxzgTestApi="+encodeURIComponent("http://127.0.0.1:39001"));
  const isolated=await isolatedSocketPreview("ws://127.0.0.1:18080/api/v1/game/socket",storage);assert.equal(isolated.socketUrl,"ws://127.0.0.1:39001/api/v1/game/socket");isolated.storage.setItem("session","test");assert.equal(storage.getItem("session"),null);assert.equal(isolated.storage.getItem("session"),"test");
  context.fetch=async()=>({ok:true,json:async()=>({kind:"mxzg-owned-mysql-it",run:"wrong"})});await assert.rejects(isolatedSocketPreview(normal.socketUrl,storage));
  address("http://localhost:7456/?mxzgTestRun="+run+"&mxzgTestApi="+encodeURIComponent("http://127.0.0.1:18080"));await assert.rejects(isolatedSocketPreview(normal.socketUrl,storage));
 }finally{context.fetch=fetchBefore;if(previous)Object.defineProperty(context,"location",previous);else delete context.location;}
}
/** 逐件期限数据不按配置合并；字符串 ID 无精度损失，非法数据不污染整包。 */
function checkInventoryIdentity(){
 const id="9223372036854775807",timed={serverTimeSeconds:100,items:[{instanceId:id,itemId:123,activeAtSeconds:50,expiresAtSeconds:200},{instanceId:"second",itemId:123,activeAtSeconds:60,expiresAtSeconds:300}]};
 assert.equal(readBagItems([{itemId:900102,quantity:1,instanceId:id}])[0].instanceId,id);
 assert.equal(readTimedItems(timed).length,2);
 assert.throws(()=>readTimedItems({...timed,serverTimeSeconds:200}));
 assert.throws(()=>readTimedItems({...timed,items:[timed.items[0],timed.items[0]]}));
 let elapsed=1000;const model=new BagModel(()=>elapsed);model.reset("role");model.replaceAll([],timed);assert.equal(model.snapshot.timedItems.length,2);assert.equal(model.snapshot.timedServerTimeSeconds,100);elapsed+=2500;assert.equal(model.serverTimeSeconds(),102);
 model.suspendClock();elapsed+=100000;assert.equal(model.serverTimeSeconds(),null,"后台不能沿用旧时钟");
 model.replaceAll([], {...timed,serverTimeSeconds:150});assert.equal(model.serverTimeSeconds(),150,"单调时钟暂停后按服务器首包校准");
 const fallback=new BagModel(null);fallback.reset("role");fallback.replaceAll([],timed);fallback.advanceClock(2);assert.equal(fallback.serverTimeSeconds(),102);
 fallback.suspendClock();fallback.advanceClock(30);assert.equal(fallback.serverTimeSeconds(),null);fallback.replaceAll([], {...timed,serverTimeSeconds:150});assert.equal(fallback.serverTimeSeconds(),150,"无单调时钟也以恢复首包校准");
 const before=model.snapshot;assert.throws(()=>model.replaceAll([{itemId:900102,quantity:9}],{...timed,serverTimeSeconds:300}));assert.equal(model.snapshot,before);
 model.reset(null);assert.equal(model.snapshot.timedItems.length,0);
}
/** 基础角色资料不可缺字段、取负数或混淆时间顺序；唯一 Model 深层只读。 */
function checkRoleBasics(){
 const basics={experience:66,cup:1000,headId:0,imageId:410304012,borderId:0,language:1,createdAtSeconds:100,lastLoginAtSeconds:120,experienceToNextLevel:120};
 const raw={id:"role-basic",nickname:"测试",serverId:"local-1",level:1,gold:0,diamonds:0,basics};
 const role=readRole(raw);assert.deepEqual(role.basics,basics);assert(Object.isFrozen(role.basics));
 for(const key of Object.keys(basics)){assert.throws(()=>readRole({...raw,basics:{...basics,[key]:-1}}));const incomplete:any={...basics};delete incomplete[key];assert.throws(()=>readRole({...raw,basics:incomplete}));}
 assert.throws(()=>readRole({...raw,basics:{...basics,lastLoginAtSeconds:99}}));assert.throws(()=>readRole({...raw,basics:{...basics,experience:120}}));
 assert.throws(()=>readRole({...raw,basics:null}));assert.throws(()=>readRole([]));
 const account=new AccountModel();account.replace({busy:false,role:raw,error:""});basics.experience=99;assert.equal(account.snapshot.role!.basics!.experience,66);assert(Object.isFrozen(account.snapshot.role!.basics));
}
async function main(){
 checkRoleBasics();
 checkInventoryIdentity();
 await checkPreviewIsolation();
 const server=new Server(),account=new AccountModel(),model=new BagModel(),bag=new BagController(model);
 const socket=new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket",{create:server.create,validateSnapshot:value=>{const row=value as any;readRole(row.role);readBagItems(row.inventory);assert(Number.isSafeInteger(row.revision));},retryDelay:()=>1,heartbeatMs:100000});
 const service=new AccountService(account,new AccountApi(socket),{read:()=>null,write:()=>{},clear:()=>{}});bag.initialize();
 const assets=new AssetStateBinding(account,bag,new RoleController(value=>service.acceptRole(value)));
 service.onInitialized=frame=>assets.apply(frame);socket.onState=frame=>assets.apply(frame);socket.onReady=()=>{if(account.snapshot.role&&socket.latestState)assets.apply(socket.latestState);};
 let events=0;const target={};const stop=EventDispatcher.instance.on(BagEvent.BagUpdate,target,()=>{events++;if(model.snapshot.synced)assert.equal(account.snapshot.role?.gold,server.state.role.gold);});
 try{
  let homeActions:any;const opened:string[]=[];const notices:string[]=[];
  const home=new HomeController(account,service,{bind:value=>{homeActions=value;return()=>{};},render:()=>{},showNotice:value=>notices.push(value)},id=>{opened.push(id);return true;});
  home.show();homeActions.openFeature("bag");homeActions.openFeature("city");homeActions.openFeature("hero");homeActions.openFeature("battle");assert.deepEqual(opened,["bag","city"]);assert.equal(notices.length,2);home.close();
  const unwatch=account.subscribe(state=>{if(state.role&&!state.busy)assert(model.snapshot.synced,"角色通知前库存已提交");});
  assert(await service.login("player","local-1"));assert.equal(model.snapshot.synced,true);assert.deepEqual(server.requests,["session.login"]);
  server.state.role.basics={...server.state.role.basics,experience:66};
  server.push(1,7,5);assert.equal(account.snapshot.role!.basics!.experience,66);assert.equal(account.snapshot.role!.gold,7);assert.equal(model.quantity(900101),5);
  const count=events;server.push(1,7,5);server.push(0,0,0);assert.equal(events,count);assert.equal(model.quantity(900101),5);
  server.state={...server.state,revision:2,role:{...server.state.role,gold:9},inventory:[{itemId:900101,quantity:8}]};
  const oldMessage=server.wires[0].onmessage;server.wires[0].drop();await until(()=>server.wires.length===2&&model.quantity(900101)===8);assert.deepEqual(server.requests,["session.login","session.authenticate"]);
  let actions:any,entered=0;const page=new AccountController(account,service,{bind:value=>{actions=value;return()=>{};},render:()=>{}},()=>entered++);page.show();actions.login("player");await until(()=>entered===1);page.close();assert.equal(server.requests.length,2,"开始按钮不重新查询");
  // 同版本恢复也更新服务器秒；不额外请求背包，重复 show/hide 不建立多条连接。
  const timed={serverTimeSeconds:100,items:[{instanceId:"timed-a",itemId:902025,activeAtSeconds:50,expiresAtSeconds:200}]};
  server.state={...server.state,timedInventory:timed};server.push(3,9,8);assert.equal(model.serverTimeSeconds(),100);
  const oldWire=server.wires[server.wires.length-1],lateMessage=oldWire.onmessage;
  model.suspendClock();socket.setBackground(true);socket.setBackground(true);assert.equal(model.serverTimeSeconds(),null);assert.equal(oldWire.readyState,3);
  const requestsBefore=server.requests.length,wiresBefore=server.wires.length;
  await new Promise(r=>setTimeout(r,20));assert.equal(server.wires.length,wiresBefore,"后台停止重试");
  server.state={...server.state,timedInventory:{...timed,serverTimeSeconds:150}};
  server.busyAuthentications=1;socket.setBackground(false);socket.setBackground(false);
  await until(()=>model.serverTimeSeconds()===150);assert.deepEqual(server.requests.slice(requestsBefore),["session.authenticate","session.authenticate"],"BUSY 只重试鉴权，不补查库存");
  lateMessage({data:encodeGameFrame({version:1,kind:"event",name:"state.changed",connectionId:oldWire.connection,body:{...server.state,revision:999,timedInventory:timed}})});assert.equal(model.serverTimeSeconds(),150,"后台旧连接回包不能倒退时钟");
  model.suspendClock();socket.setBackground(true);
  server.state={...server.state,revision:4,timedInventory:{serverTimeSeconds:250,items:[]}};
  socket.setBackground(false);await until(()=>model.serverTimeSeconds()===250);assert.equal(model.snapshot.timedItems.length,0,"后台跨过期限后恢复到服务器有效列表");
  unwatch();assert(await service.login("other","local-2"));assert.equal(model.quantity(900101),0);assert.equal(model.snapshot.roleKey,"local-2/role-other");
  oldMessage({data:encodeGameFrame({version:1,kind:"event",name:"state.changed",connectionId:"connection-0",body:{revision:999,role:{id:"role-player",nickname:"old",level:1,gold:999,diamonds:0,serverId:"local-1"},inventory:[{itemId:900101,quantity:999}],heroes:[]}})});
  assert.equal(model.quantity(900101),0);assert.equal(account.snapshot.role!.id,"role-other");
  const before=model.snapshot;const validBasics=server.state.role.basics;server.state.role.basics={...validBasics,experience:120};
  server.push(1,3,9);assert.equal(model.snapshot,before,"非法角色资料不得部分写入合法库存");assert.equal(account.snapshot.role!.basics!.experience,0);
  server.state.role.basics=validBasics;server.push(1,3,-1);assert.equal(model.snapshot,before,"非法整包不得部分更新角色或背包");assert.equal(account.snapshot.role!.gold,0);
  socket.setBackground(true);service.logout();assert.equal(model.snapshot.roleKey,null);assert.equal(model.items.length,0);
  const loggedOutWires=server.wires.length;socket.setBackground(false);await new Promise(r=>setTimeout(r,20));assert.equal(server.wires.length,loggedOutWires,"后台退出后不能恢复旧账号");
  assert.equal(await service.login("player","missing-world"),false);assert(account.snapshot.error.includes("服务器暂未开放"));assert.equal(model.snapshot.roleKey,null);
  console.log("PASS unified initialization, no duplicate requests, atomic role/bag events, monotonic revision, reconnect, old-wire isolation, invalid payload, logout");
 }finally{stop();socket.onReady=socket.onState=null;socket.disconnect();assets.dispose();bag.dispose();EventDispatcher.instance.offTarget(target);}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
