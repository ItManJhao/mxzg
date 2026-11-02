/** 挂机客户端边界回归：隔离内存验证重复领取、超时重放、换号迟到及协议校验，不连接玩家服务。 */
import { strict as assert } from "node:assert";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { IdleController } from "../assets/scripts/features/battle/IdleController";
import { IdleApi, readIdleState } from "../assets/scripts/features/battle/IdleApi";
import { JsonClient } from "../assets/scripts/platform/http/JsonClient";
/** 手动控制回包顺序，覆盖页面离开后的在途请求。 */
function deferred<T=any>() {let resolve!:(v:T)=>void,reject!:(e:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const tick=()=>new Promise(r=>setTimeout(r,0));
const role=(id="idle_one",gold=0)=>({id,nickname:id,serverId:"one",level:1,gold,diamonds:0});
const state=(revision=0)=>({serverTime:1000,startedAt:940,revision,elapsedSeconds:60,maxSeconds:21600,frequency:60,rewardStage:1,rates:[{itemId:900001,quantity:200}],claimable:true,configVersion:"idle-0123456789abcdef"});
/** 合成协议快照只用于客户端协调测试，奖励规则由服务端测试覆盖。 */
function result(gold=200){return {state:state(1),receipt:{requestId:"",expectedRevision:0,claimedAt:1000,seconds:60,rewardStage:1,configVersion:state().configVersion,rewards:[{itemId:900001,quantity:200}]},role:role("idle_one",gold),inventory:[{itemId:900101,quantity:10}],roleExperience:10};}
/** 使用真实账号和库存协调器验证单次提交及会话隔离。 */
async function coordination(){
 const account=new AccountModel(),model=new BagModel(),bag=new BagController(model);
 const auth=new AccountService(account,{developmentLogin:async name=>({role:role(name),session:{accessToken:name[0].repeat(43),expiresAt:"2099-01-01T00:00:00Z"}}),currentRole:async()=>account.snapshot.role!},{read:()=>null,write:()=>{},clear:()=>{}});
 bag.initialize({account,authorization:auth,api:{list:async()=>[]}});
 const calls:{id:string;revision:number;d:ReturnType<typeof deferred>}[]=[];
 const api={current:async()=>state(),claim:(_token:string,id:string,revision:number)=>{const d=deferred();calls.push({id,revision,d});return d.promise;}} as unknown as IdleApi;
 const idle=new IdleController(account,auth,api,bag);
 try {
  await auth.login("idle_one","one");await bag.refresh();
  const a=idle.claim(0),b=idle.claim(0);assert.equal(a,b);await tick();assert.equal(calls.length,1);
  calls[0].d.resolve(result());await a;assert.equal(account.snapshot.role?.gold,200);assert.equal(model.quantity(900101),10);
  const uncertain=idle.claim(1);await tick();calls[1].d.reject(new Error("timeout"));await assert.rejects(uncertain,/timeout/);assert(idle.needsConfirmation);
  const replay=idle.claim(2);await tick();assert.equal(calls[2].id,calls[1].id);assert.equal(calls[2].revision,1);calls[2].d.resolve(result(400));await replay;assert(!idle.needsConfirmation);
  const late=idle.claim(2),rejected=assert.rejects(late,/会话/);await tick();await auth.login("idle_two","one");await bag.refresh();calls[3].d.resolve(result(600));await rejected;
  assert.equal(account.snapshot.role?.id,"idle_two");assert.equal(account.snapshot.role?.gold,0);assert.equal(model.quantity(900101),0);assert(!idle.needsConfirmation);
 } finally {idle.dispose();bag.dispose();}
}
/** 拒绝错误计时、重复物品和错配收据，不能用部分有效字段更新资产。 */
async function protocol(){
 assert.equal(readIdleState(state()).elapsedSeconds,60);
 assert.throws(()=>readIdleState({...state(),elapsedSeconds:61}));assert.throws(()=>readIdleState({...state(),claimable:false}));
 assert.throws(()=>readIdleState({...state(),rates:[...state().rates,...state().rates]}));
 const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",reply=result();reply.receipt.requestId=id;
 const api=new IdleApi(new JsonClient("http://isolated.invalid",async request=>{assert.deepEqual(JSON.parse(request.body!),{requestId:id,expectedRevision:0});return {status:200,data:reply};}));
 await api.claim("test",id,0);reply.receipt.expectedRevision=1;await assert.rejects(api.claim("test",id,0),/收据/);
}
/** 按顺序运行共享事件总线测试并为统一检查返回退出状态。 */
async function main(){await coordination();await protocol();console.log("idle: coalescing/timeout replay/session isolation/time and receipt validation passed");}
void main().catch(error=>{console.error(error);process.exitCode=1;});
