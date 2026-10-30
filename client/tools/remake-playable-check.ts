import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { director, Director, Node, view } from "cc";
import { JsonClient } from "../assets/scripts/platform/http/JsonClient";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService, SessionChanged } from "../assets/scripts/features/account/AccountService";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import type { AccountActions } from "../assets/scripts/features/account/AccountController";
import { ServerSelection } from "../assets/scripts/features/account/ServerSelection";
import { BagApi } from "../assets/scripts/features/Bag/BagApi";
import { readBagItems } from "../assets/scripts/features/Bag/data/BagItemData";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { BagItemCatalog } from "../assets/scripts/features/Bag/BagItemCatalog";
import { CampaignApi, readCampaignReport } from "../assets/scripts/features/battle/CampaignApi";
import type { CampaignReport, CampaignState } from "../assets/scripts/features/battle/CampaignApi";
import { CampaignController } from "../assets/scripts/features/battle/CampaignController";
import type { CampaignActions, CampaignScreen, CampaignPhase } from "../assets/scripts/features/battle/CampaignController";
import { loginLayout } from "../assets/scripts/features/account/ui/LoginLayout";
import { cityTabLayout } from "../assets/scripts/ui/cityTabScale";
import { slideFeaturePage, PAGE_TRANSITION_MS } from "../assets/scripts/app/remake/PageTransition";
import { hangFormationPoint } from "../assets/scripts/ui/idleHangSkirmishPlan";

const settle = () => new Promise(resolve => setTimeout(resolve,0));
function deferred<T>() {
  let resolve!: (value:T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const session = { accessToken:"a".repeat(43),expiresAt:"2099-01-01T00:00:00Z" };
const role = { id:"role-one",nickname:"night_player",level:1,gold:0,diamonds:0,serverId:"local-1" };
const serverRows = [{ id:"local-1",regionId:"local",regionName:"本地开发区",name:"开发一服",enabled:true },
  { id:"local-2",regionId:"local",regionName:"本地开发区",name:"开发二服",enabled:true }];
const report: CampaignReport = { id:"00000000-0000-4000-8000-000000000001",rulesVersion:"basic-attacks-v1",stageId:1,won:true,claimed:false,
  units:[{ id:"ally",ally:true,position:2,templateId:10101001,name:"独眼梦魇",level:1,maxHp:238,attack:56,defense:24,speed:45 },
    { id:"enemy",ally:false,position:2,templateId:10101001,name:"独眼梦魇",level:1,maxHp:20,attack:10,defense:1,speed:30 }],
  hits:[{ round:1,attackerId:"ally",targetId:"enemy",damage:20,remainingHp:0 }],rewards:[{ itemId:900001,quantity:4000 }] };
const initialState: CampaignState = { stageId:1,initialized:true,pending:null,rewards:report.rewards,units:report.units,available:true };

async function checkLoginAndWorlds() {
  let selected = "", currentRole = { ...role }, logins = 0, initialized = 0, entries = 0;
  const http = new JsonClient("http://test",async request => {
    if (request.url.endsWith("/servers")) return { status:200,data:serverRows };
    const body = JSON.parse(request.body!); logins++;
    currentRole = { ...role,id:body.serverId || "local-1",serverId:body.serverId || "local-1" };
    assert.equal(body.account,"night_player");
    return { status:200,data:{ session,role:currentRole } };
  });
  const worlds = new ServerSelection(http,id => { selected = id; },"no-longer-listed");
  await worlds.load(); assert.equal(worlds.selected!.id,"local-1");
  worlds.choose("local-2"); assert.equal(selected,"local-2");
  assert.throws(() => worlds.choose("invalid"),/暂未开放/);
  worlds.choose("local-1");
  const model = new AccountModel(); let saved: any = null;
  const service = new AccountService(model,{ developmentLogin:(account,serverId) => new AccountApi(http).developmentLogin(account,serverId),
    currentRole:async () => currentRole },{ read:() => saved,write:value => { saved = value; },clear:() => { saved = null; } });
  let actions!:AccountActions, busy = false, shownServer = "";
  const init = deferred<void>();
  const controller = new AccountController(model,service,{
    bind:value => { actions = value;return () => {}; },render:state => { busy = state.busy; },
    renderServer:server => { shownServer = server!.id; },
  },() => { entries++; },{ selection:worlds,openPicker:() => {} },async () => { initialized++;await init.promise; });
  controller.show(); actions.login("night_player"); actions.login("night_player"); await settle();
  assert.equal(logins,1); assert.equal(initialized,1); assert.equal(entries,0); assert.equal(busy,true);
  init.resolve(); await settle(); assert.equal(entries,1); assert.equal(saved.account,"night_player");
  worlds.choose("local-2"); assert.equal(shownServer,"local-2");
  actions.login("wrong_default_input"); await settle();
  assert.equal(logins,2); assert.equal(model.snapshot.role!.serverId,"local-2"); assert.equal(entries,2);
  controller.close();
}

async function checkCampaign() {
  assert.deepEqual(readCampaignReport(report),report);
  assert.throws(() => readCampaignReport({ ...report,hits:[{ ...report.hits[0],remainingHp:1 }] }),/血量/);
  assert.throws(() => readCampaignReport({ ...report,won:false }),/结果/);
  const account = new AccountModel(); let profile = { ...role };
  const service = new AccountService(account,{ developmentLogin:async () => ({ session,role:profile }),currentRole:async () => profile },
    { read:() => null,write:() => {},clear:() => {} });
  await service.login("night_player");
  const bag = new BagController(new BagModel()); bag.initialize({account,authorization:service,api:{list:async()=>[]}}); const stopBag = () => bag.dispose();
  let state = { ...initialState }, requests = 0, claims = 0;
  const api = new CampaignApi(new JsonClient("http://test",async request => {
    assert.equal(request.headers.Authorization,"Bearer "+session.accessToken);
    if (request.url.endsWith("/claim")) {
      claims++; profile = { ...role,gold:4000 };state = { ...initialState,stageId:2,pending:null };
      return { status:200,data:{ battle:{ ...report,claimed:true },role:profile,inventory:[],stageId:2 } };
    }
    if (request.method === "POST") {
      requests++;assert.match(JSON.parse(request.body!).requestId,/^[0-9a-f-]{36}$/);
      state = { ...initialState,pending:report };return { status:200,data:report };
    }
    return { status:200,data:state };
  }));
  let actions!:CampaignActions, confirm!:() => void, phase:CampaignPhase = "loading", results = 0, plays = 0;
  let playback = deferred<void>();
  const screen: CampaignScreen = {
    bind:value => { actions = value;return () => {}; },render:(_state,value) => { phase = value; },
    replay:async value => { assert.deepEqual(value,report);plays++;await playback.promise; },
    showResult:async (_value,callback) => { results++;confirm = callback; },dismissResult:() => {},nextSpeed:() => {},skipReplay:() => playback.resolve(),
  };
  const controller = new CampaignController(account,service,api,screen,() => {},bag);
  controller.show(); await settle(); assert.equal(phase,"idle");
  actions.fight();actions.fight();await settle();assert.equal(requests,1);assert.equal(plays,1);assert.equal(results,0);
  controller.close(); await settle(); assert.equal(results,0,"closed replay cannot open settlement");
  playback = deferred<void>();
  const reopened = new CampaignController(account,service,api,screen,() => {},bag);
  reopened.show();await settle();assert.equal(plays,2,"pending server battle resumes without another challenge");
  playback.resolve();await settle();assert.equal(results,1);
  confirm();confirm();await settle();await settle();
  assert.equal(claims,1);assert.equal(account.snapshot.role!.gold,4000);assert.equal(phase,"idle");
  assert.equal(requests,1);reopened.close();stopBag();
  // A profile refresh that completes after logout cannot resurrect identity.
  const pendingRole = deferred<typeof role>();
  const racingModel = new AccountModel();
  const racingService = new AccountService(racingModel,{ developmentLogin:async () => ({ session,role }),currentRole:() => pendingRole.promise },
    { read:() => null,write:() => {},clear:() => {} });
  await racingService.login("night_player");const refresh = racingService.refreshRole();racingService.logout();pendingRole.resolve(role);
  await assert.rejects(refresh,SessionChanged);assert.equal(racingModel.snapshot.role,null);
}

function checkVisualGeometry() {
  const seats = [2,3,5,6,7,8,9].map(position => hangFormationPoint(position,true));
  assert.equal(new Set(seats.map(point => `${point.x}:${point.y}`)).size,7,"all seven allowed formation positions must remain distinct");
  for (const [width,height] of [[590,1280],[640,1280],[720,1280],[900,1280]]) {
    const layout = loginLayout(width,height);
    assert.equal(layout.castScale,width/770);assert.equal(layout.castY,height*0.05);
    assert(layout.backgroundWidth>=width && layout.backgroundHeight>=height);
    const first = cityTabLayout(width,0,false), last = cityTabLayout(width,6,false), selected = cityTabLayout(width,3,true);
    assert(Math.abs((last.x-first.x)-width*0.9/7*6)<0.001);
    assert.equal(selected.scale/cityTabLayout(width,3,false).scale,1.5);
  }
  const previous = Date.now; let now = 0; Date.now = () => now;
  try {
    const outgoing = new Node("City"), incoming = new Node("Hero"); let completed = 0;
    const stop = slideFeaturePage(outgoing,incoming,"remake-home","hero",() => { completed++; });
    assert.equal(incoming.position.x,view.getVisibleSize().width);
    now = PAGE_TRANSITION_MS/2;director.emit(Director.EVENT_AFTER_UPDATE);
    assert(incoming.position.x>0 && incoming.position.x<view.getVisibleSize().width*0.1,"exponential ease reaches destination smoothly");
    stop();stop();assert.equal(completed,1);assert.equal(incoming.position.x,0);assert.equal(outgoing.position.x,0);
    assert.equal((incoming as any).mxzgPageAnimating,false);
  } finally { Date.now = previous; }
  const prefab = JSON.parse(readFileSync("client/assets/prefabs/ui/login/ChooseServerLayer.prefab","utf8"));
  assert(prefab.some((row:any) => row.serverContent && row.regionContent && row.cellPrefab && row.dimPrefab));
  const cell = JSON.parse(readFileSync("client/assets/prefabs/ui/login/ChooseServerCell.prefab","utf8"));
  assert(cell.some((row:any) => row.button && row.caption && row.backgrounds));
}
async function main() {
  await checkLoginAndWorlds();await checkCampaign();checkVisualGeometry();
  console.log("remake-playable-check passed: world selection, Start gate, inventory catalog/read/retry, authoritative battle replay/claim/resume, identity races and shared geometry/transition cancellation");
}
void main().catch(error => { console.error(error);process.exitCode = 1; });
