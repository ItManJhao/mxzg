/** 战斗视图行为回归：检查请求阶段、关闭后的资源释放及真实骨架动作能力；引擎替身不代替视觉验收。 */
import { strict as assert } from "node:assert";
import { Button, Label, Node, resources, sp } from "cc";
import { mountBattleSpine } from "../assets/scripts/features/battle/ui/battleSpine";
import { CampaignView } from "../assets/scripts/features/battle/ui/CampaignView";
import { mountIdleSkirmish } from "../assets/scripts/features/battle/ui/idleHangSkirmish";
import { CampaignField } from "../assets/scripts/features/battle/ui/CampaignField";
import type { CampaignState } from "../assets/scripts/features/battle/CampaignApi";
import { floatHurtText, visibleFloats, beatShowsCrit, overheadLevelText } from "../assets/scripts/features/battle/ui/battlePresentation";
import { readFileSync } from "node:fs";
import { hangFormationPoint, hangStageScale, IDLE_SKIRMISH_SPOTS } from "../assets/scripts/features/battle/ui/idleHangSkirmishPlan";

/** 八个站位两侧都必须给等级/血条留足边距，宽屏不放大；非法尺寸不能产生 NaN。 */
function checkCombatBounds(): void {
 for(const width of [360,576,640,960]) {
  const scale=hangStageScale(width);
  for(let position=1;position<=8;position++)for(const ally of [true,false]) {
   const point=hangFormationPoint(position,ally);
   assert((Math.abs(point.x)+90)*scale<=width/2,"最外侧血条超出视口");
  }
 }
 assert.equal(hangStageScale(960),1);assert(Number.isFinite(hangStageScale(NaN)));
}
/** 使用实际资源动作表验证可选动作查询及销毁边界，不伪造资源具备的动作。 */
async function checkOptionalClips(): Promise<void> {
 const originalLoad=resources.load, originalFind=sp.Skeleton.prototype.findAnimation;
 let clips: Record<string, unknown>={};
 try {
  resources.load=(_path,_type,done)=>done(null,new sp.SkeletonData());
  sp.Skeleton.prototype.findAnimation=function(name){return clips[name]?{name}:null;};
  for(const stem of ["10101001","10201001","10301001"]){
   clips=JSON.parse(readFileSync(`client/assets/bundles/spine/${stem}.json`,"utf8")).animations;
   const host=new Node("actor-test");let failed=0;const actor=mountBattleSpine(host,stem,()=>failed++);
   for (let flush=0;flush<10;flush++) await Promise.resolve();
   assert(actor.hasGesture("attack"));assert(!actor.hasGesture("attack2"));assert(!actor.hasGesture("die"));
   actor.play("die");assert.equal(failed,0);host.destroy();assert(!actor.hasGesture("attack"));
  }
 } finally {resources.load=originalLoad;sp.Skeleton.prototype.findAnimation=originalFind;}
}

/** 两个节点共享转换骨架，关闭一个不得释放另一份；最后关闭才销毁副本。 */
async function checkSharedSkeleton(): Promise<void> {
 const original = resources.load;
 const asset = new sp.SkeletonData();
 Object.assign(asset, { uuid: "shared-copy", skeletonJson: JSON.parse(readFileSync("client/assets/bundles/spine/10101001.json", "utf8")), atlasText: "fixture", textures: [], textureNames: [] });
 resources.load = (_path, _type, done) => done(null, asset);
 const a = new Node("one"), b = new Node("two");
 try {
  const first = mountBattleSpine(a, "shared-copy", () => { throw new Error("first failed"); });
  const second = mountBattleSpine(b, "shared-copy", () => { throw new Error("second failed"); });
  for (let i=0;i<10;i++) await Promise.resolve();
  const copy = first.node.getComponent(sp.Skeleton)!.skeletonData!;
  assert.notEqual(copy, asset);
  assert.equal(second.node.getComponent(sp.Skeleton)!.skeletonData, copy);
  a.destroy(); assert.equal(copy.isValid, true); assert.equal(asset.refCount, 1);
  b.destroy(); assert.equal(copy.isValid, false); assert.equal(asset.refCount, 0);
 } finally { a.destroy(); b.destroy(); resources.load = original; }
}

/** 模拟后台节流：超时先于八段进场回调执行，已加载敌人仍应到位；真未加载仍清理。 */
async function checkThrottledEntry():Promise<void> {
 const nativeTimer=globalThis.setTimeout,nativeNow=Date.now,nativeLoad=resources.load;
 try {
  for(const ready of [true,false]) {
   let now=0;const queue:Array<{at:number;delay:number;run:()=>void}>=[];
   globalThis.setTimeout=((run:()=>void,delay=0)=>{queue.push({at:now+delay,delay,run});return {unref(){}};}) as any;
   Date.now=()=>now;
   resources.load=((path:any,type:any,done:any)=>{if(ready && path==="spine/test-idle-entry")done(null,new sp.SkeletonData());}) as any;
   const parent=new Node("test"),hang=new Node("hang");hang.parent=parent;
   const home=new Node("home"),actor=new Node("actor");home.parent=hang;actor.parent=home;
   const idle=mountIdleSkirmish(hang,{plans:()=>[{stem:"test-idle-entry",spot:0,face:1,maxHp:100}]});
   idle.retarget([{node:actor,stem:"test-ally",play(){},burst(){},gesture:()=>true,hasGesture:()=>true}]);
   for(let i=0;i<20 && !hang.getChildByName("IdleFoes")!.children.length;i++) {
    queue.sort((a,b)=>a.at-b.at);const task=queue.shift()!;now=task.at;task.run();
   }
   const foe=hang.getChildByName("IdleFoes")!.children[0];assert(foe,"本波应已创建");
   for (let flush=0;flush<10;flush++) await Promise.resolve();
   const timeout=queue.find(task=>task.delay===2600)!;assert(timeout);now=timeout.at;timeout.run();
   assert.equal(foe.isValid,ready,"已加载敌人不能因进场回调节流被超时删除；真正未加载应清理");
   if(ready){assert.equal(foe.position.x,IDLE_SKIRMISH_SPOTS[0].x);assert.equal(foe.position.y,IDLE_SKIRMISH_SPOTS[0].y);}
   idle.stop();parent.destroy();
  }
 }finally {globalThis.setTimeout=nativeTimer;Date.now=nativeNow;resources.load=nativeLoad;}
}

/** 执行视图交互、关闭清理和资源迟到回归，失败时由调用方返回非零状态。 */
async function main() {
 await checkThrottledEntry();
 checkCombatBounds();
 await checkOptionalClips();
 await checkSharedSkeleton();
 const root = new Node("scene"), node = new Node("CampaignView"); node.parent=root;
 const view=node.addComponent(CampaignView);
 for(const key of ["fightButton","speedButton","growButton","idleClaimButton"] as const) view[key]=new Node(key).addComponent(Button);
 for(const key of ["stageLabel","statusLabel","goldLabel","heroExpLabel","roleExpLabel"] as const) view[key]=new Node(key).addComponent(Label);
 let fights=0,speeds=0;
 const stop=view.bind({fight:()=>{fights++;},speed:()=>{speeds++;},skip:()=>{}});
 view.fightButton!.node.emit(Button.EventType.CLICK);view.speedButton!.node.emit(Button.EventType.CLICK);
 assert.equal(fights,1);assert.equal(speeds,1);assert.equal(view.growButton!.node.active,false);
 const state:CampaignState={stageId:4,initialized:true,pending:null,rewards:[{itemId:900001,quantity:17}],units:[],available:true};
 view.render(state,"idle","");assert.equal(view.stageLabel!.string,"第 4 关");assert.equal(view.goldLabel!.string,"—");assert.equal(view.fightButton!.interactable,true);
 view.renderIdle({serverTime:1000,startedAt:940,revision:0,elapsedSeconds:60,maxSeconds:21600,frequency:60,rewardStage:3,rates:[{itemId:900001,quantity:200}],claimable:true,configVersion:"idle-0123456789abcdef"},false,"",false);
 assert.equal(view.goldLabel!.string,"200/分");assert.equal(view.idleClaimButton!.interactable,true);
 view.renderIdle(null,false,"读取失败",false);
 for(const phase of ["loading","formation","challenging","replaying","result","claiming"] as const){view.render(state,phase,"");assert.equal(view.fightButton!.interactable,false);}
 view.render(null,"error","网络失败");assert.equal(view.statusLabel!.string,"网络失败");assert.equal(view.fightButton!.interactable,true);assert.equal(view.goldLabel!.string,"—");
 stop();view.fightButton!.node.emit(Button.EventType.CLICK);assert.equal(fights,1);
 view.onClose();view.render(state,"idle","");assert.equal(view.goldLabel!.string,"—");
 assert.equal(overheadLevelText(null),null);assert.equal(overheadLevelText(7),"Lv.7");
 const cues=[{anchor:0,hurt:25,crit:true},{anchor:null,hurt:0,crit:false}];assert.equal(visibleFloats(cues).length,2);assert.equal(floatHurtText(0),"");assert.equal(visibleFloats([...cues,...cues,...cues]).length,4);assert.equal(beatShowsCrit(cues),true);assert(floatHurtText(25).includes("25"));
 for(const name of ["CampaignView","CampaignField"]){const code=readFileSync("client/assets/scripts/features/battle/ui/"+name+".ts","utf8");assert(!/GameStore|WireSession|module\//.test(code));}
 // A field that finishes opening after its page closes must be disposed, never adopted.
 let finish!:(field:CampaignField)=>void;const original=CampaignField.open;
 CampaignField.open=()=>new Promise(resolve=>{finish=resolve;});
 try {const late=new Node("late");late.parent=root;const page=late.addComponent(CampaignView);page.fightButton=new Node().addComponent(Button);page.stageLabel=new Node().addComponent(Label);page.statusLabel=new Node().addComponent(Label);page.onOpen();const ready=page.whenReady().catch(error=>error);let disposed=0;page.onClose();finish({dispose:()=>disposed++} as CampaignField);await Promise.resolve();assert.equal(disposed,1);assert(await ready instanceof Error);}
 finally{CampaignField.open=original;}
 root.destroy();console.log("battle-view passed: current reward display, request phases, actions, listener release, closed view protection, late field disposal and display cues");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
