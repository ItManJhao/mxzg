/** 英雄名册统一状态回归：验证初始化、增删改、版本丢弃、非法整包回滚和退出清理；不连接数据库。 */
import { strict as assert } from "node:assert";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { encodeGameFrame,decodeGameFrame } from "../assets/scripts/platform/GameProtocolCodec";
import {readMainFormation} from "../assets/scripts/features/hero/HeroApi";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodec";
const account=new AccountModel(), bagModel=new BagModel(), bag=new BagController(bagModel);
const model=new HeroRosterModel(), heroes=new HeroRosterController(model);
const role={id:"role-one",nickname:"测试",serverId:"local-1",level:1,gold:0,diamonds:0};
account.replace({busy:false,error:"",role});bag.initialize();heroes.initialize();
const binding=new AssetStateBinding(account,bag,new RoleController(value=>account.replace({busy:false,error:"",role:value})),heroes);
const hero={id:"00000000-0000-4000-8000-000000000001",templateId:410304012,level:1,star:4,locked:true,deployed:true,stage:0,baseStats:{hp:120,atk:30,def:10,spd:100}};
/** 构造应用已接纳的真实统一状态信封，全部资产共享同一个持久版本。 */
function frame(revision:number, rows:unknown[], name="state.changed"):GameFrame {
 const state={role,heroes:rows,inventory:[],revision,heroRoster:{capacity:300,buySpaceTimes:0}};
 return {version:1,kind:name==="state.changed"?"event":"response",ok:true,name,body:name==="state.changed"?state:{initial:state}};
}
let updates=0;const target={};const off=EventDispatcher.instance.on(HeroRosterEvent.Updated,target,()=>{
 updates++;if(model.snapshot.status==="ready")assert(bagModel.snapshot.synced,"同批英雄通知前背包已提交");
});
try {
 const initial=frame(1,[hero],"session.login");
 (initial.body as any).initial.mainFormation={formationId:1,unlockedIds:[1],assistanceUnlocked:false,version:0,slots:[{position:2,heroId:hero.id}]};
 assert(binding.apply(initial));assert.equal(model.snapshot.mainFormation?.slots[0].heroId,hero.id);assert(Object.isFrozen(model.snapshot.mainFormation?.slots));
 const formation=(initial.body as any).initial.mainFormation;
 assert.deepEqual((decodeGameFrame(encodeGameFrame({version:1,kind:"event",name:"state.changed",body:(initial.body as any).initial})).body as any).mainFormation,formation);
 for(const bad of [{...formation,formationId:2},{...formation,unlockedIds:[1,1]},{...formation,unlockedIds:[2]},{...formation,version:-1},{...formation,assistanceUnlocked:1},{...formation,slots:[formation.slots[0],formation.slots[0]]},{...formation,slots:[{position:10,heroId:hero.id}]}])assert.throws(()=>readMainFormation(bad,[hero]));
 const malformed=frame(2,[hero]);(malformed.body as any).mainFormation={formationId:1,unlockedIds:[1],assistanceUnlocked:false,version:0,slots:[{position:2,heroId:"foreign"}]};
 const beforeFormation=model.snapshot.revision;assert.throws(()=>binding.apply(malformed));assert.equal(model.snapshot.revision,beforeFormation);
assert.equal(model.snapshot.heroes.length,1);
 assert.equal(model.snapshot.heroes[0].locked,true);assert.equal(model.snapshot.heroes[0].deployed,true);
 assert.throws(()=>binding.apply(frame(2,[{...hero,locked:1}])));
 assert.throws(()=>binding.apply(frame(2,[{...hero,deployed:"true"}])));
 assert(Object.isFrozen(model.snapshot.heroes[0]));assert(Object.isFrozen(model.snapshot.heroes[0].baseStats));
 assert.throws(()=>binding.apply(frame(2,[{...hero,baseStats:{hp:0,atk:1,def:1,spd:1}}])),/属性/);
 assert.equal(model.snapshot.rosterInfo?.capacity,300);
 const invalid=frame(2,[hero]);(invalid.body as any).heroRoster={capacity:0,buySpaceTimes:0};
 const beforeInvalid=model.snapshot.revision;assert.throws(()=>binding.apply(invalid),/容量/);assert.equal(model.snapshot.revision,beforeInvalid);
 assert(binding.apply(frame(2,[{...hero,level:2}])));assert.equal(model.snapshot.heroes[0].level,2);
 const before=updates;assert.equal(binding.apply(frame(1,[hero])),false);assert.equal(updates,before);
 const snapshot=model.snapshot,bagBefore=bagModel.snapshot,roleBefore=account.snapshot;
 assert.throws(()=>binding.apply(frame(3,[hero,hero])),/重复/);
 assert.equal(model.snapshot.revision,snapshot.revision);assert.equal(bagModel.snapshot,bagBefore);assert.equal(account.snapshot,roleBefore);
 assert.throws(()=>binding.apply(frame(3,[{...hero,level:-1}])));
 assert(binding.apply(frame(3,[])));assert.equal(model.snapshot.heroes.length,0);
 const recovery=frame(3,[],"session.authenticate");(recovery.body as any).initial.heroRoster={capacity:326,buySpaceTimes:1};
 assert(binding.apply(recovery),"同版本恢复允许重新初始化");
 assert.equal(model.snapshot.rosterInfo?.capacity,326);assert.equal(model.snapshot.rosterInfo?.buySpaceTimes,1);
 account.replace({busy:false,error:"",role:null});assert.equal(model.snapshot.roleKey,null);assert.equal(model.snapshot.heroes.length,0);assert.equal(model.snapshot.rosterInfo,undefined);assert.equal(model.snapshot.mainFormation,undefined);
 assert.equal(binding.apply(frame(4,[hero])),false,"退出后拒绝迟到数据");
 const untouchedBag=bagModel.snapshot,untouchedHeroes=model.snapshot;
 assert.doesNotThrow(()=>bag.onNotify("session.heartbeat" as any,{}));
 assert.doesNotThrow(()=>heroes.onNotify("session.heartbeat" as any,{}));
 assert.deepEqual(bagModel.snapshot,untouchedBag);assert.deepEqual(model.snapshot,untouchedHeroes);
 let roleNotifications=0;const ignoredRole=new RoleController(()=>roleNotifications++);
 try {assert.doesNotThrow(()=>ignoredRole.onNotify("session.heartbeat" as any,{}));assert.equal(roleNotifications,0);}
 finally {ignoredRole.dispose();}
 console.log("hero-state passed: unified initialization/change/recovery, immutable Model, atomic validation and logout");
} finally {off();binding.dispose();bag.dispose();}
