/** 普通升级协调验证：使用隔离内存夹具覆盖重复点击、超时重放、旧查询和换号；不连接任何业务服务。 */
import { strict as assert } from "node:assert";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { HeroRosterService } from "../assets/scripts/features/hero/HeroRosterService";
import { HeroLevelController } from "../assets/scripts/features/hero/HeroLevelController";
import { HeroLevelApi, readHeroLevelPreview } from "../assets/scripts/features/hero/HeroLevelApi";
import { JsonClient } from "../assets/scripts/platform/http/JsonClient";
import { isolatedPreview } from "../assets/scripts/app/remake/IsolatedPreview";

/** 控制真实异步顺序，让两个请求在首个结果返回前重叠。 */
function deferred<T=any>() { let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; }
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const hero=(level=1)=>({id:"11111111-1111-4111-8111-111111111111",templateId:10101001,level,star:1});
const role=(name="test_one",gold=1000)=>({id:name,nickname:name,serverId:"one",level:1,gold,diamonds:0});
/** 仅用于协调器边界的合成回包；消耗/属性真值由后端与 MySQL 集成测试覆盖。 */
function result(level=2,gold=947,experience=988){return {operation:{},preview:{hero:hero(level),stage:0,levelLimit:30,current:{hp:253,atk:59,def:25,spd:46},next:{hp:269,atk:62,def:27,spd:48},cost:{gold:60,experience:15},gold,experience,status:"READY",configVersion:"hero-growth-0123456789abcdef"},heroes:[hero(level)],role:role("test_one",gold),inventory:[{itemId:900101,quantity:experience}]};}

/** 复用真实 Account、Bag 和名册协调器，断言所有观察者在同一个完整状态后收到通知。 */
async function coordination(){
 const account=new AccountModel(),bagModel=new BagModel(),bag=new BagController(bagModel),rosterModel=new HeroRosterModel();
 const auth=new AccountService(account,{developmentLogin:async name=>({role:role(name),session:{accessToken:name[0].repeat(43),expiresAt:"2099-01-01T00:00:00Z"}}),currentRole:async()=>account.snapshot.role!},{read:()=>null,write:()=>{},clear:()=>{}});
 bag.initialize({account,authorization:auth,api:{list:async()=>[{itemId:900101,quantity:1000}]}});
 const queries:ReturnType<typeof deferred>[]=[];
 const roster=new HeroRosterService(rosterModel,account,auth,{list:()=>{const d=deferred();queries.push(d);return d.promise;}});
 const calls:{id:string;level:number;d:ReturnType<typeof deferred>}[]=[];
 const api={preview:async()=>result().preview,upgrade:(_token:string,_hero:string,id:string,level:number)=>{const d=deferred();calls.push({id,level,d});return d.promise;}} as unknown as HeroLevelApi;
 const controller=new HeroLevelController(account,auth,roster,api,bag);
 try {
  await auth.login("test_one","one");await bag.refresh();roster.accept([hero()]);
  const oldQuery=roster.refresh();await tick();
  const first=controller.upgrade("11111111-1111-4111-8111-111111111111",1),duplicate=controller.upgrade("11111111-1111-4111-8111-111111111111",1);assert.equal(first,duplicate);await tick();assert.equal(calls.length,1);
  const stop=rosterModel.subscribe(state=>{if(state.heroes[0]?.level===2){assert.equal(account.snapshot.role?.gold,947);assert.equal(bagModel.quantity(900101),988);}});
  calls[0].d.resolve(result());await first;stop();queries[0].resolve([hero()]);assert.equal(await oldQuery,false);assert.equal(rosterModel.snapshot.heroes[0].level,2);
  const uncertain=controller.upgrade("11111111-1111-4111-8111-111111111111",2);await tick();calls[1].d.reject(new Error("timeout"));await assert.rejects(uncertain,/timeout/);assert(controller.needsConfirmation);
  const replay=controller.upgrade("11111111-1111-4111-8111-111111111111",3);await tick();assert.equal(calls[2].id,calls[1].id);assert.equal(calls[2].level,2);calls[2].d.resolve(result(3,887,973));await replay;assert(!controller.needsConfirmation);
  // 页面不持有 Controller；没有页面订阅时回包仍提交，同步后再打开读取唯一状态。
  const closed=controller.upgrade("11111111-1111-4111-8111-111111111111",3);await tick();calls[3].d.resolve(result(4,800,950));await closed;assert.equal(rosterModel.snapshot.heroes[0].level,4);
  const late=controller.upgrade("11111111-1111-4111-8111-111111111111",4);const rejected=assert.rejects(late,/会话/);await tick();await auth.login("test_two","two");await bag.refresh();calls[4].d.resolve(result(5,700,900));await rejected;
  assert.equal(account.snapshot.role?.id,"test_two");assert.equal(account.snapshot.role?.gold,1000);assert.equal(bagModel.quantity(900101),1000);assert.equal(rosterModel.snapshot.heroes.length,0);
 } finally {controller.dispose();roster.dispose();bag.dispose();}
}

/** 断言错误回包不能部分提交，隔离预览身份检查发生在任何登录请求之前。 */
async function boundaries(){
 const good=result();assert.equal(readHeroLevelPreview(good.preview).hero.level,2);
 assert.throws(()=>readHeroLevelPreview({...good.preview,cost:null}));assert.throws(()=>readHeroLevelPreview({...good.preview,gold:0}));
 const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
 const response={...good,operation:{requestId:id,heroId:"11111111-1111-4111-8111-111111111111",fromLevel:1,toLevel:2,configVersion:good.preview.configVersion}};
 const api=new HeroLevelApi(new JsonClient("http://isolated.invalid",async request=>{assert.deepEqual(JSON.parse(request.body!),{requestId:id,expectedLevel:1});return {status:200,data:response};}));
 await api.upgrade("test","11111111-1111-4111-8111-111111111111",id,1);response.role={...response.role,gold:999};await assert.rejects(api.upgrade("test","11111111-1111-4111-8111-111111111111",id,1),/快照/);
 const store=new Map<string,string>(),storage={getItem:(k:string)=>store.get(k)||null,setItem:(k:string,v:string)=>{store.set(k,v);},removeItem:(k:string)=>{store.delete(k);}};
 let requests=0;const run="a".repeat(32);const adapter=async()=>{requests++;return {status:200,data:{kind:"mxzg-owned-mysql-it",run}};};
 Object.defineProperty(globalThis,"location",{configurable:true,value:{hostname:"localhost",search:"?mxzgTestApi=http://127.0.0.1:18080&mxzgTestRun="+run}});
 await assert.rejects(isolatedPreview("http://daily.invalid",adapter,storage));assert.equal(requests,0);
 (globalThis as any).location.search="?mxzgTestApi=http://127.0.0.1:45678&mxzgTestRun="+run;
 const isolated=await isolatedPreview("http://daily.invalid",adapter,storage);assert.equal(requests,1);isolated.storage.setItem("session","isolated");assert.equal(store.get("session"),undefined);assert.equal(store.get("mxzg.it."+run+".session"),"isolated");
 await assert.rejects(isolatedPreview("http://daily.invalid",async()=>({status:200,data:{kind:"mxzg-owned-mysql-it",run:"wrong"}}),storage));delete (globalThis as any).location;
}
/** 顺序运行有共享事件总线的测试，失败时设置统一入口可识别的退出码。 */
async function main(){await coordination();await boundaries();console.log("hero-level: duplicate/timeout replay/atomic observers/late query/closed page/session switch/API validation/isolated target passed");}
void main().catch(error=>{console.error(error);process.exitCode=1;});
