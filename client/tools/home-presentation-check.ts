/** 主城与角色详情回归：验证真实资料、头像入口、全局操作反馈和关闭清理，不连接数据库。 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

import { Button, EditBox, Label, Node, Prefab, Sprite } from "cc";
import { RemakeHomeView } from "../assets/scripts/features/home/ui/RemakeHomeView";
import { RoleProfileView } from "../assets/scripts/features/account/ui/RoleProfileView";
import { CityHubView } from "../assets/scripts/features/city/ui/CityHubView";
import { ServerPickerView } from "../assets/scripts/features/account/ui/ServerPickerView";
import { ServerCellView } from "../assets/scripts/features/account/ui/ServerCellView";
import { ServerSelection } from "../assets/scripts/features/account/ServerSelection";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { CityChromeView } from "../assets/scripts/features/city/ui/CityChromeView";
import { SkillAuditView } from "../assets/scripts/features/battle/ui/SkillAuditView";
import { ConfigUnavailable } from "../assets/scripts/config/GameConfig";

class CityFixture extends CityHubView {
  closedCount = 0; disposedCount = 0; refreshCount = 0;
  onOpen(): void { this.beginOpen(); }
  completeLoading(): void { this.finishOpen(); }
  refreshLocks(): void { this.refreshCount++; }
  onClose(): void { this.closedCount++; }
  dispose(): void { this.disposedCount++; }
}
class ChromeFixture extends CityChromeView {
  closedCount = 0; disposedCount = 0;
  identity = ""; currencies: string[] = []; level = ""; power = ""; tabs: any[] = [];
  onOpen(): void {}
  setIdentity(name: string): void { this.identity = name; }
  setCurrencies(gold: string, diamonds: string): void { this.currencies = [gold, diamonds]; }
  setLevelBadge(level: string): void { this.level = level; }
  setPower(power: string): void { this.power = power; }
  setAvatar(): void {}
  setCityExtras(): void {}
  setTabs(tabs: any[]): void { this.tabs = tabs; }
  onClose(): void { this.closedCount++; }
  dispose(): void { this.disposedCount++; }
}
function fixture() {
  const home = new Node("Home").addComponent(RemakeHomeView);
  const cityNode = new Node("CityHubView"); const city = cityNode.addComponent(CityFixture);
  const chromeNode = new Node("CityChromeView"); const chrome = chromeNode.addComponent(ChromeFixture);
  home.cityPrefab = { _instantiate: () => cityNode } as unknown as Prefab;
  home.chromePrefab = { _instantiate: () => chromeNode } as unknown as Prefab;
  home.cityHost = new Node("CityMapHost"); home.chromeHost = new Node("CityChromeHost");
  const profileNode=new Node("RoleProfileView"),profile=profileNode.addComponent(RoleProfileView);
  profile.nickname=new Node("Name").addComponent(Label);profile.roleId=new Node("Id").addComponent(Label);profile.level=new Node("Level").addComponent(Label);
  profile.closeButton=new Node("Close").addComponent(Button);profile.settingsButton=new Node("Settings").addComponent(Button);
  profile.logoutButton=new Node("Logout").addComponent(Button);profile.settingsClose=new Node("Back").addComponent(Button);profile.settingsPanel=new Node("SettingsPanel");
  chrome.experienceFill = new Node("ExperienceFill").addComponent(Sprite);
  chrome.avatar=new Node("Avatar");chrome.avatar.addComponent(Button);
  return { home, city, chrome, profile };
}

/** 两种存量入口共用全局反馈；切页空串、异步迟到失败和重复播放均不能覆盖其他窗口提示。 */
async function checkGlobalFeedback(): Promise<void> {
    const notices: string[] = [];
    const releaseNotice = UIManager.instance.bindNotice(text => notices.push(text));
    const home = new Node("FeedbackHome").addComponent(RemakeHomeView);
    const audit = new Node("FeedbackAudit").addComponent(SkillAuditView);
    try {
        home.showNotice("该模块暂未开放");
        home.showNotice("");
        assert.deepEqual(notices, ["该模块暂未开放"], "主城提示转入全局，空串不清全局队列");
        home.onClose();
        home.showNotice("已关闭页面的迟到提示");
        assert.equal(notices.length, 1, "关闭后的主城不再追加操作反馈");

        audit.owner = new Node("Owner").addComponent(Label);
        audit.selection = new Node("Selection").addComponent(Label);
        audit.message = new Node("Status").addComponent(Label);
        // 离线替身只补此窗口需要的引擎事件，不改实际 Creator 组件行为。
        (EditBox as any).EventType ||= { TEXT_CHANGED: "text-changed" };
        audit.search = new Node("Search").addComponent(EditBox);
        audit.kindButtons = [new Node("HeroTab").addComponent(Button), new Node("SkillTab").addComponent(Button)];
        for (const button of audit.kindButtons) {
            (button as any).getComponent = (type: any) => button.node.getComponent(type);
        }
        audit.playButton = new Node("Play").addComponent(Button);
        audit.closeButton = new Node("Close").addComponent(Button);
        audit.options = { list: { setData: () => {} }, toStart: () => {} } as any;
        let calls = 0;
        let rejectLate!: (error: Error) => void;
        audit.runOpen({ play: async () => {
            calls++;
            if (calls === 1) {
                throw new Error("演示资源测试失败");
            }
            await new Promise<void>((_resolve, reject) => { rejectLate = reject; });
        } });
        await (audit as any).play();
        assert.equal(notices[notices.length - 1], "请先选择英雄和技能等级");
        assert.equal(calls, 0, "未选择时只提示，不发起播放");
        (audit as any).selected = { fixture: null, reason: "该等级尚未接入演示" };
        await (audit as any).play();
        assert.equal(notices[notices.length - 1], "该等级尚未接入演示");
        audit.message.string = "当前等级的规则状态与说明";
        (audit as any).selected = { fixture: "feedback-fixture" };
        await (audit as any).play();
        assert.equal(notices[notices.length - 1], "演示打开失败：演示资源测试失败");
        assert.equal(audit.message.string, "当前等级的规则状态与说明", "失败反馈不占用技能状态区域");
        const late = (audit as any).play();
        await (audit as any).play();
        assert.equal(calls, 2, "播放在途时不重复发起或追加提示");
        const noticeCount = notices.length;
        audit.runClose();
        rejectLate(new Error("关闭后的迟到失败"));
        await late;
        assert.equal(notices.length, noticeCount, "关闭不清全局队列，迟到失败不追加提示");

        for (const file of ["module/home/prefabs/RemakeHomeView", "module/battle/prefabs/SkillAuditView"]) {
            const prefab = JSON.parse(readFileSync("client/assets/bundles/" + file + ".prefab", "utf8"));
            assert(!prefab.some((row: any) => row.noticeLabel || row.noticePanel), "页面不残留旧提示属性绑定");
            assert(!prefab.some((row: any) => ["Notice", "NoticePanel", "NoticeLabel"].includes(row._name)), "页面不另存旧提示节点");
        }
    } finally {
        audit.runDispose();
        home.runDispose();
        releaseNotice();
    }
}

/** 未安装配置包时主城必须明确开页失败，不能吞掉缺表后使用默认位置继续展示。 */
async function checkCityConfigGate(): Promise<void> {
  const node = new Node("CityBeforeConfiguration");
  const city: any = node.addComponent(CityHubView);
  // 此例只验证配置就绪门槛，节点绑定由下方既有Prefab检查覆盖。
  city.collect = () => {};
  city.requireBound = () => {};
  city.runOpen({
    onAtom: () => {},
    onMainline: () => {},
    query: { level: () => 1, openDay: () => 0, db: () => null },
  });
  await assert.rejects(city.whenReady(), ConfigUnavailable);
  city.runClose();
  city.runDispose();
  node.destroy();
}

/** 先验证配置就绪门槛，再安装真实配置并检查主城子视图、资料与关闭生命周期。 */
async function main() {
  await checkCityConfigGate();
  await ConfigFixtureUtils.installReal();
  await checkGlobalFeedback();
  const { home, city, chrome, profile } = fixture();
  // 验证正常经验、升级清零、满级及缺失数据，避免沿用上一角色比例。
  chrome.setExperience(66,120); assert.equal(chrome.experienceFill!.fillRange,0.55);
  chrome.setExperience(0,150); assert.equal(chrome.experienceFill!.fillRange,0);
  chrome.setExperience(99,0); assert.equal(chrome.experienceFill!.fillRange,0);
  chrome.setExperience(150,120); assert.equal(chrome.experienceFill!.fillRange,1);
  chrome.setExperience(-1,120); assert.equal(chrome.experienceFill!.fillRange,0);
  chrome.setExperience(undefined,undefined); assert.equal(chrome.experienceFill!.fillRange,0);
  let logouts = 0;
  const unbind = home.bind({ logout: () => { logouts++; }, openFeature: () => {} });
  home.runOpen();
  home.render({ busy: false, error: "", role: { id: "role-id", nickname: "玩家甲", level: 7, gold: 0, diamonds: 123 } });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(chrome.identity, "玩家甲");
  assert.deepEqual(chrome.currencies, ["0", "123"], "zero is real data, not an unavailable placeholder");
  assert.equal(chrome.level, "7"); assert.equal(chrome.power, "", "do not invent power");
  assert(chrome.tabs.every(tab => tab.state === (tab.id === "city" ? "selected" : "locked")));
  city.completeLoading(); await home.whenReady();
  const featureUnbind = home.bind({ logout: () => { logouts++; }, openFeature: () => {}, heroAvailable: true });
  assert.equal(chrome.tabs.find(tab => tab.id === "hero").state, "open");
  home.showFeature("hero");
  assert.equal(home.featureHost, home.cityHost);
  assert.equal(city.node.active, false, "feature hides only the city, preserving shared chrome");
  assert.equal(chrome.tabs.find(tab => tab.id === "hero").state, "selected");
  assert.equal(chrome.tabs.find(tab => tab.id === "city").state, "open");
  home.showFeature("city"); assert.equal(city.node.active, true);
  featureUnbind();
  const model = new AccountModel();
  model.replace({busy:false,error:"",role:{id:"role-id",nickname:"玩家甲",level:7,gold:0,diamonds:123}});
  const ui = UIManager.instance;
  const releaseHost = ui.setResidentHost("test-role-modal",()=>new Node("ModalHost"));
  const unregister = UIRegistry.registerView(RoleProfileView,{id:"role-profile",prefab:"bundles/module/login/prefabs/RoleProfileView",layer:UILayer.Popup,cache:false,allowMultiple:false,hostId:"test-role-modal",load:async()=>Object.assign(new Prefab(), {_instantiate:()=>profile.node})});
  let opening: Promise<unknown> | undefined;
  const rebound=home.bind({logout:()=>{logouts++;},openFeature:id=>{assert.equal(id,"role-profile");opening=ui.openById(id,{model,logout:()=>{logouts++;},notice:()=>{}});}});
  chrome.avatar!.emit(Button.EventType.CLICK); await opening;
  assert.equal(profile.nickname!.string,"玩家甲");
  const same=await ui.openById("role-profile",{model,logout:()=>{logouts++;},notice:()=>{}});
  assert.equal(same,profile,"重复点击只保留一个资料窗口");
  model.replace({busy:false,error:"",role:{id:"role-new",nickname:"玩家乙",level:9,gold:5,diamonds:8}});
  assert.equal(profile.nickname!.string,"玩家乙");
  profile.settingsButton!.node.emit(Button.EventType.CLICK);assert.equal(profile.settingsPanel!.active,true);
  profile.logoutButton!.node.emit(Button.EventType.CLICK);assert.equal(logouts,1);
  profile.closeButton!.node.emit(Button.EventType.CLICK);
  model.replace({busy:false,error:"",role:{id:"late",nickname:"迟到",level:1,gold:0,diamonds:0}});
  assert.equal(profile.nickname!.string,"玩家乙","关闭后已退订，不能继续刷新销毁的页面");
  rebound();unbind();unregister();releaseHost();
  home.runDispose(); home.onDestroy();
  assert.equal(city.closedCount, 1); assert.equal(city.disposedCount, 1);
  assert.equal(chrome.closedCount, 1); assert.equal(chrome.disposedCount, 1);

  // 配置已在进入页面前安装；关闭时释放已创建但尚未就绪的子View，并忽略其迟到完成。
  const slow = fixture(); slow.home.runOpen();
  const cancelled = assert.rejects(slow.home.whenReady(), /页面已关/);
  slow.home.runDispose(); await cancelled;
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(slow.city.disposedCount, 1, "等待主城子View就绪期间关闭，必须释放已创建页面");
  assert.equal(slow.chrome.disposedCount, 1, "关闭同时释放顶栏子View");
  slow.city.completeLoading();
  await Promise.resolve();
  assert.equal(slow.home.cityHost!.children.length, 0);

  // 引擎先销毁按钮组件时其 node 会被清空，资料页稍后释放也不应抛错。
  const teardown = fixture(); teardown.profile.bind(()=>{},()=>{});
  (teardown.profile.closeButton as any).node = null;
  assert.doesNotThrow(()=>teardown.profile.onDestroy());
  // 选服真实数据分组与选择由页面处理，列表排列留给 SuperContent。
  const servers=[{id:"a1",regionId:"a",regionName:"一区",name:"一服",enabled:true},{id:"b1",regionId:"b",regionName:"二区",name:"二服",enabled:true}];
  const selection = new ServerSelection({catalog:async()=>servers},()=>{});
  await selection.load();
  const picker=new Node("Picker").addComponent(ServerPickerView);
  picker.closeButton=new Node("Close").addComponent(Button);
  const groups: Array<{row:any,tap:()=>void}> = [], entries: Array<{row:any,tap:()=>void}> = [];
  class CellFixture extends ServerCellView { destination:any[]=[]; show(row:any,_chosen:boolean,tap:()=>void):void{this.destination.push({row,tap});} }
  const makeList=(destination:any[])=>({validateBindings:()=>{},toStart:()=>{},list:{setData:(rows:any[],render:Function)=>{destination.length=0;for(const row of rows){const n=new Node("Cell");const c=n.addComponent(CellFixture);c.destination=destination;render(n,row);}}}});
  picker.regionScroll=makeList(groups) as any;picker.serverScroll=makeList(entries) as any;
  picker.runOpen(selection);assert.equal(groups.length,2);assert.equal(entries[0].row.id,"a1");
  groups[1].tap();assert.equal(entries[0].row.id,"b1");entries[0].tap();assert.equal(selection.selected?.id,"b1");
  picker.runClose();const oldRow=entries[0];await selection.load();assert.equal(entries[0],oldRow,"关闭选服后不再渲染");
  const serverPrefab=JSON.parse(readFileSync("client/assets/bundles/module/login/prefabs/ServerPickerView.prefab","utf8"));
  assert(!serverPrefab.some((r:any)=>r.__type__==="cc.ScrollView"),"选服不再使用原生 ScrollView");
  const pickerBinding=serverPrefab.find((r:any)=>r.serverScroll&&r.regionScroll);
  for(const field of ["serverScroll","regionScroll"]){
    const scroll=serverPrefab[pickerBinding[field].__id__],content=serverPrefab[scroll._content.__id__];
    const port=serverPrefab[content._parent.__id__];
    assert.equal(port._parent.__id__,scroll.node.__id__,"Scroll → view → content 层级");
    assert(port._components.some((r:any)=>serverPrefab[r.__id__].__type__==="cc.Mask"));
    assert(content._components.some((r:any)=>serverPrefab[r.__id__].cellPrefab));
  }
  const hud = JSON.parse(readFileSync("client/assets/bundles/module/home/prefabs/CityChromeView.prefab","utf8"));
  const top = hud.find((row:any)=>row._name==="TopBar");
  const order = top._children.map((ref:any)=>hud[ref.__id__]._name);
  assert(order.indexOf("ExperienceBg")>order.indexOf("Bg"),"经验条不能被背景盖住");
  assert(order.indexOf("ExperienceFill")>order.indexOf("ExperienceBg"),"填充绘制在经验底图之上");
  const prefab = JSON.parse(readFileSync("client/assets/bundles/module/home/prefabs/RemakeHomeView.prefab", "utf8"));
  const binding = prefab.find((row: any) => row.cityPrefab && row.chromePrefab);
  assert(binding, "existing city Prefabs are serialized references, not copied layouts");
  for (const [key, name] of [["cityPrefab", "CityHubView"], ["chromePrefab", "CityChromeView"]]) {
    const meta = JSON.parse(readFileSync(`client/assets/bundles/module/home/prefabs/${name}.prefab.meta`, "utf8"));
    assert.equal(binding[key].__uuid__, meta.uuid);
  }
  assert(!prefab.some((row:any)=>row._name==="AccountButton"||row._name==="AccountPanel"),"临时账号框已从预制移除");
  const profileMeta=JSON.parse(readFileSync("client/assets/bundles/module/login/prefabs/RoleProfileView.prefab.meta","utf8"));
  assert.equal(profileMeta.uuid,"1aedb5a3-4e33-552f-843c-c419fd8174a4");
  assert.equal(binding.profilePrefab,undefined,"主城不能再私自持有资料预制体");
  const config = JSON.parse(readFileSync("client/settings/v2/packages/project.json", "utf8"));
  assert.deepEqual(config.general.designResolution, { width: 640, height: 1280, fitWidth: false, fitHeight: true });
  const citySource = readFileSync("client/assets/scripts/features/city/ui/CityHubView.ts", "utf8");
  assert(!/\b(?:async\s+)?start\s*\(/.test(citySource), "view initialization must not collide with engine start");
  console.log("home-presentation-check passed: canonical city/HUD assets, live role values, unavailable entries, close/cancel cleanup, resolution baseline and no duplicate engine start");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
