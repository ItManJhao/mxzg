/** 真实 TS→Java 联调，仅对核验运行标识的独立测试后端创建合成账号；不调用游戏 HTTP。 */
import {strict as assert} from "node:assert";
import {randomUUID} from "node:crypto";
import {GameSocketClient} from "../assets/scripts/platform/GameSocketClient";
import {GAME_SOCKET_PROTOCOL} from "../assets/scripts/platform/GameProtocolCodec";
import {AccountApi,readRole} from "../assets/scripts/features/account/AccountApi";
import {AccountModel} from "../assets/scripts/features/account/AccountModel";
import {AccountService} from "../assets/scripts/features/account/AccountService";
import {RoleController} from "../assets/scripts/features/account/RoleController";
import {BagController} from "../assets/scripts/features/Bag/BagController";
import {BagModel} from "../assets/scripts/features/Bag/BagModel";
import {readBagItems} from "../assets/scripts/features/Bag/data/BagItemData";
import {AssetStateBinding} from "../assets/scripts/app/remake/AssetStateBinding";
/** 等待真实连接状态，超时明确失败。 */
async function until(check:()=>boolean):Promise<void>{for(let i=0;i<300;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail("真实客户端状态超时");}
/** 装配真实模块，只有网络适配为 Node 原生 WebSocket。 */
function fixture(port:string){
 const account=new AccountModel(),model=new BagModel(),bag=new BagController(model),wires:WebSocket[]=[];
 const socket=new GameSocketClient("ws://127.0.0.1:"+port+"/api/v1/game/socket",{
  create:url=>{const wire=new WebSocket(url,GAME_SOCKET_PROTOCOL);wires.push(wire);return wire;},retryDelay:()=>20,
  validateSnapshot:value=>{const row=value as any;readRole(row.role);readBagItems(row.inventory);assert(Number.isSafeInteger(row.revision));},
 });
 const service=new AccountService(account,new AccountApi(socket),{read:()=>null,write:()=>{},clear:()=>{}});
 bag.initialize();const role=new RoleController(value=>service.acceptRole(value)),assets=new AssetStateBinding(account,bag,role);
 service.onInitialized=frame=>assets.apply(frame);socket.onState=frame=>assets.apply(frame);
 socket.onReady=()=>{if(account.snapshot.role && socket.latestState)assets.apply(socket.latestState);};
 socket.onRejected=(token,message)=>service.rejectSession(token,message);
 return {service,account,model,socket,wires,stop:()=>{socket.onReady=socket.onState=socket.onRejected=null;socket.disconnect();assets.dispose();bag.dispose();}};
}
/** 登录首包、无额外查询、重连首包、换服和顶号均在合成账号上验证。 */
async function main(){
 const [port,run]=process.argv.slice(2);assert(/^\d{4,5}$/.test(port)&&![18080,18081,3306].includes(Number(port)));assert(/^[0-9a-f-]{36}$/.test(run));
 // 测试身份探针不是游戏业务接口，只有测试上下文存在。
 const identity=await(await fetch("http://127.0.0.1:"+port+"/api/v1/socket-test-identity")).json() as any;
 assert.equal(identity.kind,"mxzg-owned-socket-it");assert.equal(identity.run,run);
 const one=fixture(port),two=fixture(port);
 try{
  const servers=await one.socket.catalog() as any[];assert(servers.some(row=>row.id==="local-2"));
  const account="wsclient_"+randomUUID().slice(0,12);
  assert(await one.service.login(account,"local-1"),one.account.snapshot.error);assert.equal(one.model.snapshot.synced,true);
  assert.deepEqual(one.model.items,[]);const role=one.account.snapshot.role!.id,count=one.wires.length;
  one.wires[one.wires.length-1].close();await until(()=>one.wires.length>count && one.socket.latestState?.name==="session.authenticate" && one.model.snapshot.synced);
  // 使用第二个连接登录同角色，旧客户端不能自动抢回。
  assert(await two.service.login(account,"local-1"),two.account.snapshot.error);await until(()=>!one.service.hasSession);
  assert.equal(one.model.items.length,0);assert.equal(two.account.snapshot.role!.id,role);
  assert(await two.service.login(account,"local-2"),two.account.snapshot.error);assert.notEqual(two.account.snapshot.role!.id,role);assert.equal(two.model.snapshot.synced,true);
  two.service.logout();assert.equal(two.model.snapshot.roleKey,null);
  console.log("PASS real TS client → isolated H2: WS catalog/login, unified empty bag, reconnect, kick, world isolation, logout");
 }finally{one.stop();two.stop();}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
