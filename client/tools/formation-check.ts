import { strict as assert } from "node:assert";
import { JsonClient } from "../assets/scripts/platform/http/JsonClient";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { HeroApi } from "../assets/scripts/features/hero/HeroApi";
import { HeroCatalog } from "../assets/scripts/features/hero/HeroCatalog";
import { FormationController,FormationActions,FormationState } from "../assets/scripts/features/hero/FormationController";
import { LineupApi,readMainLineup } from "../assets/scripts/features/hero/LineupApi";
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
const hero={id:"00000000-0000-4000-8000-000000000001",templateId:10101001,level:1,star:1};
const second={...hero,id:"00000000-0000-4000-8000-000000000002"};
async function main(){
 let version=1,slots=[{position:2,heroId:hero.id}],saves=0,conflict=false;
 const session={accessToken:"A".repeat(43),expiresAt:new Date(Date.now()+60000).toISOString()};
 const role={id:"role-1",nickname:"formation",level:1,gold:0,diamonds:0,serverId:"local-1"};
 const http=new JsonClient("http://local",async request=>{
  if(request.url.endsWith("/development/login"))return {status:200,data:{session,role}};
  if(request.url.endsWith("/heroes"))return {status:200,data:[hero,second]};
  if(request.method==="PUT"){
   saves++;const body=JSON.parse(request.body!);assert.equal(body.expectedVersion,version);
   if(conflict){conflict=false;version++;return {status:409,data:{}};}
   slots=body.slots;version++;return {status:200,data:{version,slots}};
  }
  return {status:200,data:{version,slots}};
 });
 const account=new AccountModel();const service=new AccountService(account,new AccountApi(http),{read:()=>null,write:()=>{},clear:()=>{}});await service.login("formation");
 const catalog=new HeroCatalog({rows:[{type:10101001,note:"Test",elem:1}]},{rows:[]});
 let actions!:FormationActions,state!:FormationState,completed:boolean[]=[];
 const controller=new FormationController(account,service,new HeroApi(http),new LineupApi(http),catalog,{
  bind:value=>{actions=value;return()=>{};},render:value=>{state=value;},complete:value=>{completed.push(value);},
 });
 controller.show();await settle();await settle();assert.equal(state.lineup.slots.length,1);
 actions.toggle(second.id);assert.equal(state.lineup.slots.length,2);assert.equal(saves,0,"editing stays local until confirmation");
 actions.remove(2);actions.remove(3);actions.confirm();await settle();assert.equal(saves,0,"empty draft cannot start a battle");
 actions.toggle(hero.id);actions.toggle(second.id);conflict=true;actions.confirm();actions.cancel();actions.confirm();await settle();await settle();
 assert.equal(saves,1,"double confirm never saves twice");assert.equal(state.lineup.version,2);assert.equal(completed.length,0);assert.match(state.message,/更新/);
 actions.toggle(second.id);actions.confirm();await settle();assert.deepEqual(completed,[true]);assert.equal(saves,2);controller.close();
 assert.throws(()=>readMainLineup({version:0,slots:[{position:1,heroId:hero.id}]}),/站位/);
 assert.throws(()=>readMainLineup({version:0,slots:[{position:2,heroId:hero.id},{position:3,heroId:hero.id}]}),/站位/);
 console.log("formation-check passed: UUID ownership, PUT contract, editable draft, empty gate, double-submit guard, conflict reload and confirmed save");
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
