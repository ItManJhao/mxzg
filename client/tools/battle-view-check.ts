/** 战斗视图行为回归：检查请求阶段、关闭后的资源释放及真实骨架动作能力；引擎替身不代替视觉验收。 */
import { strict as assert } from "node:assert";
import { Button, Label, Node, resources, sp } from "cc";
import { mountBattleSpine } from "../assets/scripts/features/battle/ui/battleSpine";
import { CampaignView } from "../assets/scripts/features/battle/ui/CampaignView";
import { CampaignField } from "../assets/scripts/features/battle/ui/CampaignField";
import type { CampaignState } from "../assets/scripts/features/battle/CampaignApi";
import { floatHurtText, visibleFloats, beatShowsCrit, overheadLevelText } from "../assets/scripts/features/battle/ui/battlePresentation";
import { readFileSync } from "node:fs";
/** 使用实际资源动作表验证可选动作查询及销毁边界，不伪造资源具备的动作。 */
function checkOptionalClips(): void {
 const originalLoad=resources.load, originalFind=sp.Skeleton.prototype.findAnimation;
 let clips: Record<string, unknown>={};
 try {
  resources.load=(_path,_type,done)=>done(null,new sp.SkeletonData());
  sp.Skeleton.prototype.findAnimation=function(name){return clips[name]?{name}:null;};
  for(const stem of ["10101001","10201001","10301001"]){
   clips=JSON.parse(readFileSync(`client/assets/resources/spine/${stem}.json`,"utf8")).animations;
   const host=new Node("actor-test");let failed=0;const actor=mountBattleSpine(host,stem,()=>failed++);
   assert(actor.hasGesture("attack"));assert(!actor.hasGesture("attack2"));assert(!actor.hasGesture("die"));
   actor.play("die");assert.equal(failed,0);host.destroy();assert(!actor.hasGesture("attack"));
  }
 } finally {resources.load=originalLoad;sp.Skeleton.prototype.findAnimation=originalFind;}
}
/** 执行视图交互、关闭清理和资源迟到回归，失败时由调用方返回非零状态。 */
async function main() {
 checkOptionalClips();
 const root = new Node("scene"), node = new Node("CampaignView"); node.parent=root;
 const view=node.addComponent(CampaignView);
 for(const key of ["fightButton","speedButton","growButton"] as const) view[key]=new Node(key).addComponent(Button);
 for(const key of ["stageLabel","statusLabel","goldLabel","heroExpLabel","roleExpLabel"] as const) view[key]=new Node(key).addComponent(Label);
 let fights=0,speeds=0;
 const stop=view.bind({fight:()=>{fights++;},speed:()=>{speeds++;},skip:()=>{}});
 view.fightButton!.node.emit(Button.EventType.CLICK);view.speedButton!.node.emit(Button.EventType.CLICK);
 assert.equal(fights,1);assert.equal(speeds,1);assert.equal(view.growButton!.node.active,false);
 const state:CampaignState={stageId:4,initialized:true,pending:null,rewards:[{itemId:900001,quantity:17}],units:[],available:true};
 view.render(state,"idle","");assert.equal(view.stageLabel!.string,"第 4 关");assert.equal(view.goldLabel!.string,"17");assert.equal(view.fightButton!.interactable,true);
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
