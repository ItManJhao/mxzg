/**
 * 挂机战斗主面板竖切的检查。不启动 Creator。
 * 核对开关、预制绑定、关卡收益，以及经 UIManager 打开和关掉。
 *
 * npx --yes esbuild client/tools/battle-view-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-battle-view-check.js && node /tmp/mxzg-battle-view-check.js
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { assetManager, Button, Label, Node, Prefab, Sprite, UITransform } from "cc";
import { ConfigDb, ConfigTableFile } from "../assets/scripts/config/ConfigLoader";
import { bindGameCatalog, chapterEnemies, chapterStageEnemies } from "../assets/scripts/config/gameCatalog";
import { GameLog } from "../assets/scripts/core/GameLog";
import { GameStore } from "../assets/scripts/core/GameStore";
import { Session } from "../assets/scripts/core/Session";
import { battleViewFromSearch, setUseBattleView, useBattleView } from "../assets/scripts/features/battle/config/BattleFeatureFlag";
import { hangFace } from "../assets/scripts/features/battle/model/hangFace";
import { BattleHangView } from "../assets/scripts/features/battle/ui/BattleHangView";
import { HangMissionChipView } from "../assets/scripts/features/battle/ui/HangMissionChipView";
import { isOpenCancelled, UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { viewCtorById, viewSpecOf } from "../assets/scripts/framework/ui/UIRegistry";
import { NetClient } from "../assets/scripts/net/NetClient";
import { ITransport, NetHandler } from "../assets/scripts/net/NetTypes";
import { WireSession } from "../assets/scripts/net/WireSession";
import { beginHangBattle, finishHangBattle, setHangSpeed, showHangStrike, stopHangBattle, HangBar } from "../assets/scripts/ui/hangBattle";
import { decodeWireBattleReport, wireBattleActionCount } from "../assets/scripts/net/protocol/wireBattle";
import { hangAppearAnchor, hangFightStageId, HANG_APPEAR_BODY, planHangFightLine } from "../assets/scripts/ui/idleHangSkirmishPlan";
import { PAGE_SHELL_FIGHT } from "../assets/scripts/ui/prefabShellMap";
import { clearPrefabCache } from "../assets/scripts/ui/prefabLoad";
import { barIndex, barSlideDir, pageContentReady, selectedBarId } from "../assets/scripts/ui/barSlide";

const root = process.cwd();

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function classId(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  let out = hex.slice(0, 5);
  for (let i = 5; i < hex.length; i += 3) {
    const h1 = parseInt(hex[i], 16);
    const h2 = parseInt(hex[i + 1], 16);
    const h3 = parseInt(hex[i + 2], 16);
    out += BASE64[(h1 << 2) | (h2 >> 2)];
    out += BASE64[((h2 & 3) << 4) | h3];
  }
  return out;
}

function metaUuid(path: string): string {
  const meta = JSON.parse(read(path)) as { uuid?: string };
  if (!meta.uuid) throw new Error("缺少 uuid " + path);
  return meta.uuid;
}

interface PrefabObj {
  __type__?: string;
  _name?: string;
  _components?: { __id__?: number }[];
  [key: string]: unknown;
}

function loadPrefab(path: string): PrefabObj[] {
  return JSON.parse(read(path)) as PrefabObj[];
}

function component(data: PrefabObj[], typeId: string): { index: number; comp: PrefabObj } {
  for (let i = 0; i < data.length; i++) {
    if (data[i].__type__ === typeId) return { index: i, comp: data[i] };
  }
  throw new Error("预制上没有组件 " + typeId);
}

function idOf(value: unknown): number {
  const ref = value as { __id__?: number } | null;
  if (!ref || typeof ref.__id__ !== "number") return -1;
  return ref.__id__;
}

function assertNode(data: PrefabObj[], comp: PrefabObj, field: string, nodeId: number, nodeName: string): void {
  const id = idOf(comp[field]);
  assert(id === nodeId, field + " 应指向 " + nodeName + " #" + nodeId + "，实际 " + id);
  const node = data[nodeId];
  assert(node && node.__type__ === "cc.Node" && node._name === nodeName, field + " 指向的不是 " + nodeName);
}

function assertComp(data: PrefabObj[], comp: PrefabObj, field: string, compId: number, typeName: string): void {
  const id = idOf(comp[field]);
  assert(id === compId, field + " 应指向 " + typeName + " #" + compId + "，实际 " + id);
  const target = data[compId];
  assert(target && target.__type__ === typeName, field + " 指向的不是 " + typeName);
}

function checkFlag(): void {
  assert(battleViewFromSearch("") === true, "没有参数走新战斗页");
  assert(battleViewFromSearch("?battle=old") === false, "?battle=old 走旧挂机壳");
  assert(battleViewFromSearch("?battle=0") === false, "battle=0 走旧挂机壳");
  assert(battleViewFromSearch("?battle=false") === false, "battle=false 走旧挂机壳");
  assert(battleViewFromSearch("?battle=new") === true, "battle=new 仍走新战斗页");
  assert(battleViewFromSearch("?hero=old") === true, "英雄开关不关战斗");
  assert(battleViewFromSearch("?dev=wire&battle=old") === false, "battle=old 夹在别的参数里也生效");
  setUseBattleView(false);
  assert(useBattleView() === false, "关掉开关应回到旧挂机壳");
  setUseBattleView(true);
  assert(useBattleView() === true, "打开开关走新战斗页");
}

function checkSources(): void {
  const views = [
    "client/assets/scripts/features/battle/ui/BattleHangView.ts",
    "client/assets/scripts/features/battle/ui/HangMissionChipView.ts",
  ];
  for (let i = 0; i < views.length; i++) {
    const text = read(views[i]);
    assert(text.indexOf("getChildByName") < 0, views[i] + " 不应 getChildByName");
    assert(text.indexOf("findNamed") < 0, views[i] + " 不应 findNamed");
    assert(text.indexOf("findNode") < 0, views[i] + " 不应 findNode");
    assert(text.indexOf("findDescendant") < 0, views[i] + " 不应 findDescendant");
    assert(text.indexOf("decodeWire") < 0, views[i] + " 不应解协议");
  }
  const face = read("client/assets/scripts/features/battle/model/hangFace.ts");
  assert(face.indexOf("GameStore.idle") >= 0, "计时读 GameStore");
  assert(face.indexOf("chapterIdleMinute") >= 0, "三格读 chapterreward");
  assert(face.indexOf("decodeWire") < 0, "面板数据不解字节");
  assert(face.indexOf("主线未同步") >= 0, "没同步不编关卡名");
  const mount = read("client/assets/scripts/features/battle/ui/battleMount.ts");
  assert(mount.indexOf("mountIdleHang") >= 0, "新壳仍铺殿堂");
  assert(mount.indexOf("findDescendant") < 0, "挂载不递归搜树");
  const fill = read("client/assets/scripts/ui/screenFill.ts");
  assert(fill.indexOf("export function dressHangPanel") >= 0, "旧 dressHangPanel 还在");
  const shell = read("client/assets/scripts/ui/pagePrefabShell.ts");
  assert(shell.indexOf("export async function mountHangBattleShell") >= 0, "旧挂机壳还在");
  assert(shell.indexOf("beginHangBattle") >= 0, "旧战斗入口还在");
  assert(shell.indexOf("export function bindHangProbe") >= 0, "空地长按仍能打开探针");
  assert(shell.indexOf("hangLineupReady") < 0, "每次点战斗都先出阵，不因 hangLineupReady 跳过");
  assert(shell.indexOf("开战先出阵") >= 0, "开战先打出阵日志");
  assert(shell.indexOf("开战入口=") >= 0 && shell.indexOf("出阵=开") >= 0, "开战入口要打出阵日志");
  const hangView = read("client/assets/scripts/features/battle/ui/BattleHangView.ts");
  assert(hangView.indexOf("face.ring") >= 0, "圆环只写关号");
  assert(hangView.indexOf("this.chip.show(face.caption)") >= 0, "章关长文案写在左侧关卡标");
  assert(hangView.indexOf("HorizontalTextAlignment.RIGHT") >= 0, "收益条右对齐");
  assert(hangView.indexOf("开战入口=挂机计时 出阵=跳过原因=只刷新收益") >= 0, "挂机计时不开战");
  const main = read("client/assets/scripts/ui/MainApp.ts");
  assert(main.indexOf("useBattleView") >= 0, "MainApp 有战斗开关");
  assert(main.indexOf("UIManager.instance.open(BattleHangView)") >= 0, "开关打开时走 BattleHangView");
  assert(main.indexOf("mountHangBattleShell") >= 0, "旧壳路径还在");
  assert(main.indexOf("dropWaitingBarSlide(\"mainline\")") >= 0, "战斗打开失败丢掉未开始的过场");
  assert(main.indexOf("holdBarSlide") >= 0, "预制加载期间留着过场");
  assert(main.indexOf("USE_BATTLE_PREFAB") < 0, "MainApp 不另长一个战斗预制开关");
  assert(main.indexOf('Session.source === "wire" && wireDebugEnabled()') >= 0, "探针条件还在");
  const openAt = main.indexOf("private openMainline");
  const branch = main.slice(openAt, openAt + 700);
  assert(branch.indexOf("this.openChild(\"mainline\")") >= 0, "旧开关仍 openChild");
  assert(branch.indexOf("BattleHangView") >= 0, "新开关打开战斗视图");
  assert(branch.indexOf("useBattleView") >= 0, "打开挂机看开关");
  assert(branch.indexOf("开战入口=城内按钮 出阵=跳过原因=只打开挂机页") >= 0, "城内按钮只打开挂机");
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  assert(manager.indexOf("BattleHang") < 0 && manager.indexOf("mountBattle") < 0, "UIManager 不写死战斗");
  assert(!existsSync(join(root, "client/assets/prefabs/ui/battle/WireBattlePage.prefab")), "不恢复 WireBattlePage");
  assert(existsSync(join(root, "client/assets/prefabs/ui/battle/BattlePage.prefab")), "BattlePage 还在");
  assert(existsSync(join(root, "client/assets/prefabs/ui/battle/BattleEndLayer.prefab")), "BattleEndLayer 还在");
  assert(selectedBarId("mainline", "city") === "battle", "当前是挂机时只亮战斗");
  assert(selectedBarId("hero", "mainline") === "hero", "英雄不跟战斗一起亮");
  assert(barSlideDir(barIndex("city"), barIndex("battle")) === 1, "主城到战斗从右进");
  assert(barSlideDir(barIndex("bag"), barIndex("battle")) === 1, "背包到战斗从右进");
  assert(barSlideDir(barIndex("dungeon"), barIndex("battle")) === -1, "副本到战斗从左进");
  assert(pageContentReady(["PagePrefabShell"]) === true, "挂机壳挂上就能滑");
  assert(pageContentReady(["IdleHang"]) === true, "殿堂挂上就能滑");
  const hang = read("client/assets/scripts/ui/hangBattle.ts");
  assert(hang.indexOf("seatHangEnemies") >= 0, "开战要摆敌方");
  assert(hang.indexOf("开战敌方没有摆上") >= 0, "敌方摆不上要有日志");
  assert(hang.indexOf("开战敌方 spine/") >= 0, "spine 没挂上要有日志");
  assert(hang.indexOf("chapterStageEnemies") >= 0, "开战守方按关卡号");
  assert(hang.indexOf("这一侧没有模型") >= 0, "没有模型的一侧不播出场光");
  assert(hang.indexOf("beginHangBattle") >= 0, "开战演出还在");
  assert(hang.indexOf("开战入口=PAGE_SHELL_FIGHT 出阵=跳过原因=没有出阵确认") >= 0, "战报驱动没有出阵确认就不开");
  assert(hang.indexOf("startShellFight") >= 0, "下一关也先出阵");
  assert(hang.indexOf("PAGE_SHELL_FIGHT") >= 0 && hang.indexOf("showMockRound") >= 0, "开战要听战报驱动并播 Mock 回合");
  assert(hang.indexOf("开战没有进战报") >= 0, "没有战报要打日志");
  assert(hang.indexOf("不复用已有战报") >= 0 && hang.indexOf("改播本场回合") >= 0, "3001 没回到不能复用上一局");
  assert(hang.indexOf("来自战报") >= 0 && hang.indexOf("来自本关") >= 0, "胜负要写明来自战报或本关");
  assert(hang.indexOf("不留胜负未带") >= 0, "战报没胜负不能静默");
  assert(shell.indexOf("开战发出 PAGE_SHELL_FIGHT") >= 0, "开战要发出战报驱动");
  assert(hang.indexOf("mountBattleEnd") >= 0 && hang.indexOf("开战结算 盖上结算页") >= 0, "打完要盖结算页，不能静默拆层");
  assert(hang.indexOf("noteMockVictory") >= 0, "Mock 胜利要写本地进度");
  assert(hang.indexOf("pullChapterProbe") >= 0, "真服胜利要拉 3007");
  assert(hang.indexOf("开战结算 3007 没有发出") >= 0, "3007 发不出要有日志");
  assert(hang.indexOf("开战结算 失败") >= 0, "失败要有日志");
  const plan = read("client/assets/scripts/ui/idleHangSkirmishPlan.ts");
  const fightPlan = plan.slice(plan.indexOf("export function planHangFightLine"));
  assert(fightPlan.indexOf("export function planHangFightLine") === 0, "开战敌方有单独规则");
  assert(fightPlan.indexOf("IDLE_SKIRMISH_FALLBACK") < 0, "开战敌方不用演武 fallback");
  assert(fightPlan.indexOf("WIRE_SPINE_ENEMY") < 0, "开战敌方不补默认三套");
}

function checkFightLine(): void {
  const stand = (stem: string) => stem === "10101001" || stem === "10405006";
  assert(hangFightStageId(null, null, null, true) === null, "真服未同步不用第 1 关冒充");
  assert(hangFightStageId(4, 9, 12, false) === 4, "Mock 用本机关号");
  assert(hangFightStageId(null, 3, 9, true) === 3, "真服用 nowIdx");
  assert(hangFightStageId(null, null, 0, true) === 1, "max_idx 0 是已同步，进战是下一关");
  assert(hangFightStageId(null, null, 9, true) === 10, "只有 max_idx 时打 chapterId+1");
  assert(hangFightStageId(null, 0, null, true) === 1, "now_idx 0 仍是已同步");
  assert(hangFightStageId(null, null, null, false) === 1, "Mock 没有关号时仍读第 1 关");
  const onAlly = hangAppearAnchor([{ x: -120, y: 24 }]);
  assert(onAlly !== null && onAlly.x === -120 && onAlly.y === 24 + HANG_APPEAR_BODY, "出场光落在模型上");
  assert(hangAppearAnchor([]) === null, "没有模型不给出场光锚点");
  const missing = planHangFightLine(null, [], stand, null);
  assert(missing.source === "none" && missing.foes.length === 0 && missing.reason.indexOf("主线未同步") >= 0, "未同步不造敌方");
  const empty = planHangFightLine(2, [], stand, null);
  assert(empty.source === "none" && empty.reason.indexOf("守方表是空的") >= 0, "空表要说明");
  const chapter = planHangFightLine(1, [{ heroType: 10101001, hp: 900, name: "前哨" }, { heroType: 9, hp: 1, name: "没套" }], stand, null);
  assert(chapter.source === "chapter" && chapter.foes.length === 1 && chapter.foes[0].stem === "10101001", "只摆有 stand 的关卡怪");
  assert(chapter.foes[0].face === -1 && chapter.foes[0].spot === 0 && chapter.foes[0].maxHp === 900, "敌方站右侧第一格");
  const report = planHangFightLine(1, [{ heroType: 10101001, hp: 900, name: "前哨" }], stand, [{ heroId: 10405006, hp: 40, maxHp: 80 }]);
  assert(report.source === "report" && report.foes.length === 1 && report.foes[0].stem === "10405006" && report.foes[0].maxHp === 80, "战报守方优先");
  const badReport = planHangFightLine(1, [{ heroType: 10101001, hp: 900, name: "前哨" }], stand, [{ heroId: 999, hp: 1, maxHp: 1 }]);
  assert(badReport.source === "chapter" && badReport.foes[0].stem === "10101001" && badReport.reason.indexOf("对不上 stand") >= 0, "战报对不上就退回关卡表");
  const none = planHangFightLine(1, [{ heroType: 999, hp: 1, name: "没套" }], stand, null);
  assert(none.foes.length === 0 && none.reason.indexOf("没有 stand") >= 0, "没有 stand 不补默认怪");
  checkChapterStage();
}

function checkChapterStage(): void {
  const file = JSON.parse(read("client/assets/resources/config/chapter.json")) as ConfigTableFile<Record<string, unknown>>;
  const tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tables.set("chapter", file);
  bindGameCatalog(tables);
  try {
    const stage1 = chapterStageEnemies(1);
    assert(stage1.length === 1 && stage1[0].heroType === 10101001, "第1关守方是 10101001");
    const stage2 = chapterStageEnemies(2);
    assert(stage2.length === 1 && stage2[0].heroType === 10505005, "第2关读 note，不读空的行 idx");
    assert(chapterEnemies(2).length === 0, "行 idx 2 的 hero_type 是 0");
    const stage5 = chapterStageEnemies(5);
    assert(stage5.length === 3 && stage5[0].heroType === 10102002, "第5关三只怪");
    assert(chapterStageEnemies(null).length === 0, "没有关号不造怪");
    const line = planHangFightLine(
      2,
      stage2.map((row) => ({ heroType: row.heroType, hp: row.hp, name: row.name })),
      (stem) => stem === "10505005",
      null
    );
    assert(line.source === "chapter" && line.foes.length === 1 && line.foes[0].stem === "10505005", "第2关能摆上");
  } finally {
    bindGameCatalog(new Map());
  }
}

function checkPrefab(): void {
  const viewType = classId(metaUuid("client/assets/scripts/features/battle/ui/BattleHangView.ts.meta"));
  const chipType = classId(metaUuid("client/assets/scripts/features/battle/ui/HangMissionChipView.ts.meta"));
  const layer = loadPrefab("client/assets/prefabs/ui/battle/BattlePanelLayer.prefab");
  const view = component(layer, viewType);
  assert((layer[1]._components || []).some((row) => row.__id__ === view.index), "BattlePanelLayer 根上有 BattleHangView");
  assertComp(layer, view.comp, "btnBattle", 46, "cc.Button");
  assertComp(layer, view.comp, "btnLineup", 60, "cc.Button");
  assertComp(layer, view.comp, "btnSpeed", 74, "cc.Button");
  assertComp(layer, view.comp, "battleTitle", 52, "cc.Label");
  assertComp(layer, view.comp, "lineupTitle", 66, "cc.Label");
  assertComp(layer, view.comp, "speedTitle", 80, "cc.Label");
  assertComp(layer, view.comp, "clockLabel", 156, "cc.Label");
  assertComp(layer, view.comp, "goldLabel", 162, "cc.Label");
  assertComp(layer, view.comp, "soulsLabel", 168, "cc.Label");
  assertComp(layer, view.comp, "expLabel", 174, "cc.Label");
  assertComp(layer, view.comp, "bubbleLabel", 190, "cc.Label");
  assertNode(layer, view.comp, "worldMap", 11, "spr_world");
  assertNode(layer, view.comp, "mapLabel", 23, "lbl_map");
  assertNode(layer, view.comp, "worldIcon", 29, "spr_world_icon");
  assertNode(layer, view.comp, "missionName", 97, "lbl_mission_name");
  assertNode(layer, view.comp, "hitMenu", 35, "menu");
  const chipPrefab = view.comp.chipPrefab as { __uuid__?: string };
  assert(chipPrefab.__uuid__ === "4d270a16-c38e-45b9-f277-80e134c3b2a6", "chipPrefab 是 HangMissionChip");

  const chipData = loadPrefab("client/assets/prefabs/ui/battle/HangMissionChip.prefab");
  const chip = component(chipData, chipType);
  assert((chipData[1]._components || []).some((row) => row.__id__ === chip.index), "HangMissionChip 根上有 HangMissionChipView");
  assertComp(chipData, chip.comp, "caption", 17, "cc.Label");
  assertNode(chipData, chip.comp, "icon", 7, "icon");
}

function checkRegistry(): void {
  const spec = viewSpecOf(BattleHangView);
  assert(spec !== null, "BattleHangView 未注册");
  assert(spec.id === "mainline", "页面 id 应是 mainline");
  assert(spec.prefab === "prefabs/ui/battle/BattlePanelLayer", "预制路径");
  assert(spec.layer === UILayer.Page, "层应是 Page");
  assert(spec.cache === false, "挂机主面板不缓存");
  assert(spec.allowMultiple === false, "挂机主面板不叠两份");
  assert(typeof spec.mount === "function", "挂载在 ViewSpec 上");
  assert(viewCtorById("mainline") === BattleHangView, "id mainline 应对回 BattleHangView");
  assert(UIManager.instance.createPageHost("mainline") === null, "没 open 时 presentPage 继续走旧壳");
}

function labelOn(node: Node, text: string): Label {
  const label = node.addComponent(Label);
  label.string = text;
  return label;
}

function buttonOn(name: string): Button {
  const node = new Node(name);
  node.addComponent(Sprite);
  return node.addComponent(Button);
}

function fakePrefab(build: (node: Node) => void): Prefab {
  const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
  prefab._instantiate = () => {
    const node = new Node("inst");
    build(node);
    return node;
  };
  return prefab;
}

function makeChip(node: Node): HangMissionChipView {
  node.name = "HangMissionChip";
  node.addComponent(Button);
  const chip = node.addComponent(HangMissionChipView);
  chip.icon = new Node("icon");
  chip.icon.addComponent(Sprite);
  chip.icon.parent = node;
  const caption = new Node("HangMissionLabel");
  chip.caption = labelOn(caption, "999");
  caption.parent = node;
  return chip;
}

function makeView(): BattleHangView {
  const scene = new Node("scene");
  const host = new Node("BattlePanelLayer");
  host.parent = scene;
  host.addComponent(UITransform).setContentSize(640, 1280);
  const view = host.addComponent(BattleHangView);
  view.btnBattle = buttonOn("btn_battle");
  view.btnLineup = buttonOn("btn_lineup");
  view.btnSpeed = buttonOn("btn_speed_battle");
  if (view.btnBattle.node) view.btnBattle.node.parent = host;
  if (view.btnLineup.node) view.btnLineup.node.parent = host;
  if (view.btnSpeed.node) view.btnSpeed.node.parent = host;
  view.battleTitle = labelOn(new Node("battleTitle"), "");
  view.lineupTitle = labelOn(new Node("lineupTitle"), "");
  view.speedTitle = labelOn(new Node("speedTitle"), "");
  view.clockLabel = labelOn(new Node("lbl_progress_time"), "999");
  view.goldLabel = labelOn(new Node("lbl_gold"), "999");
  view.soulsLabel = labelOn(new Node("lbl_souls"), "999");
  view.expLabel = labelOn(new Node("lbl_exp"), "999");
  view.bubbleLabel = labelOn(new Node("lbl_progress_time2"), "999");
  view.worldMap = new Node("spr_world");
  view.worldMap.parent = host;
  view.mapLabel = new Node("lbl_map");
  view.mapLabel.parent = host;
  view.worldIcon = new Node("spr_world_icon");
  view.worldIcon.parent = host;
  view.missionName = new Node("lbl_mission_name");
  labelOn(view.missionName, "999");
  view.missionName.parent = host;
  view.hitMenu = new Node("menu");
  view.hitMenu.addComponent(UITransform).setContentSize(640, 960);
  view.hitMenu.parent = host;
  view.chipPrefab = fakePrefab((node) => {
    makeChip(node);
  });
  return view;
}

function missionLabel(view: BattleHangView): Label {
  const node = view.missionName;
  const label = node ? (node.getComponent(Label) as Label | null) : null;
  if (!label) throw new Error("lbl_mission_name 上没有 Label");
  return label;
}

function chipOf(view: BattleHangView): HangMissionChipView {
  const shell = view.node.parent;
  const host = shell || view.node;
  const kids = host.children;
  for (let i = 0; i < kids.length; i++) {
    const chip = kids[i].getComponent(HangMissionChipView) as HangMissionChipView | null;
    if (chip) return chip;
  }
  throw new Error("没有挂上 HangMissionChip");
}

function noteProgress(nowIdx: number | null, maxIdx: number | null): void {
  GameStore.noteWire({
    enabled: true,
    account: "battle-check",
    serverId: 1,
    roleId: 1,
    name: "battle-check",
    nameSynced: true,
    level: 1,
    gold: null,
    diamond: null,
    nowIdx,
    maxIdx,
    heroes: null,
    bag: null,
    lineUp: null,
    unlockIds: null,
    rewardTime: 1_700_000_000,
    maxRewardTime: null,
    battle: null,
  });
}

function noteChapter(nowIdx: number | null, rewardTime: number | null): void {
  GameStore.noteWire({
    enabled: true,
    account: "battle-check",
    serverId: 1,
    roleId: 1,
    name: "battle-check",
    nameSynced: true,
    level: 1,
    gold: null,
    diamond: null,
    nowIdx,
    maxIdx: nowIdx,
    heroes: null,
    bag: null,
    lineUp: null,
    unlockIds: null,
    rewardTime,
    maxRewardTime: null,
    battle: null,
  });
}

function bindChapter(): void {
  const chapterreward: ConfigTableFile<Record<string, unknown>> = {
    table: "chapterreward",
    rows: [
      {
        idx: 1,
        reward_base: "[{\"item_type\":900001,\"item_num\":200},{\"item_type\":900003,\"item_num\":10},{\"item_type\":900101,\"item_num\":25}]",
      },
      {
        idx: 5,
        chapter_id: 1,
        mission_id: 5,
        reward_base: "[{\"item_type\":900001,\"item_num\":500},{\"item_type\":900003,\"item_num\":20},{\"item_type\":900101,\"item_num\":40}]",
      },
    ],
  };
  const tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tables.set("chapterreward", chapterreward);
  const db = new ConfigDb();
  db.tables = tables;
  ConfigDb.current = db;
  bindGameCatalog(tables);
}

function clearChapter(): void {
  ConfigDb.current = null;
  bindGameCatalog(new Map());
}

const toasts: string[] = [];

function installNav(): { current: { id: string | null }; backs: { n: number } } {
  const current = { id: "city" as string | null };
  const backs = { n: 0 };
  UIManager.instance.install(
    {
      get current() {
        return current.id;
      },
      openChild(id: string) {
        current.id = id;
      },
      back() {
        if (!current.id || current.id === "city") return false;
        current.id = "city";
        backs.n += 1;
        return true;
      },
    },
    {
      showToast(text: string) {
        toasts.push(text);
      },
    }
  );
  return { current, backs };
}

async function openView(): Promise<BattleHangView> {
  const view = makeView();
  view.onOpen();
  await view.whenReady();
  return view;
}

function checkData(): void {
  const previous = Session.source;
  try {
    GameStore.reset();
    clearChapter();
    Session.source = "wire";
    const missing = hangFace(1_700_000_000_000, 1_700_000_000_000);
    assert(missing.synced === false && missing.caption === "主线未同步", "未同步不编关卡名");
    assert(missing.gold === "—/m" && missing.souls === "—/m" && missing.exp === "—/m", "真服没表写破折号");
    assert(missing.clock !== "999", "计时不留预制占位");

    Session.source = "mock";
    const mock = hangFace(1_700_000_000_000, 1_700_000_000_000);
    assert(mock.caption === "主线未同步", "Mock 没关卡也不编名字");
    assert(mock.gold === "6/m" && mock.souls === "2/m" && mock.exp === "每30s", "Mock 没表才退回旧节奏");
    assert(mock.clock === "00:00", "刚打开的 Mock 计时从 0 起");

    bindChapter();
    Session.source = "wire";
    noteChapter(null, null);
    const bare = hangFace(1_700_000_000_000, 1_700_000_000_000);
    assert(bare.synced === false && bare.caption === "主线未同步", "空关卡号仍写未同步");
    assert(bare.clock === "未同步", "reward_time 没有就写未同步");
    assert(bare.gold === "200/m" && bare.souls === "25/m" && bare.exp === "10/m", "没关卡号时三格仍按旧规则用第 1 关的表");

    const now = 1_700_000_090_000;
    noteChapter(1, 1_700_000_000);
    const live = hangFace(now, now);
    assert(live.synced === true && live.caption === "第1关", "关卡字来自 nowIdx");
    assert(live.gold === "200/m" && live.souls === "25/m" && live.exp === "10/m", "三格来自这一关 reward_base");
    noteProgress(null, 4);
    const moved = hangFace(now, now);
    assert(moved.caption.indexOf("第5关") >= 0 && moved.caption.indexOf("第1关") < 0, "只有最高 idx 时标题是进战关 " + moved.caption);
    assert(moved.gold === "500/m" && moved.souls === "40/m" && moved.exp === "20/m", "收益跟进战关，不留第 1 关");
    assert(live.clock === "01:30", "计时是 reward_time 到现在的 90 秒");
  } finally {
    Session.source = previous;
    GameStore.reset();
    clearChapter();
  }
}

async function checkPaint(): Promise<void> {
  const previous = Session.source;
  const previousNow = Date.now;
  const paintTime = previousNow();
  // Prefab loading may cross a second. Compare a deterministic clock, not two wall times.
  Date.now = () => paintTime;
  try {
    bindChapter();
    Session.source = "wire";
    noteChapter(1, Math.floor(Date.now() / 1000) - 90);
    const nav = installNav();
    const view = await openView();
    const shown = view.clockLabel ? view.clockLabel.string : "";
    assert(shown === "01:30", "面板计时跟 reward_time 的 90 秒，实际 " + shown);
    assert(shown.indexOf("999") < 0, "不留 999");
    assert(view.goldLabel !== null && view.goldLabel.string === "200/m", "金币是表里的每分钟");
    assert(view.soulsLabel !== null && view.soulsLabel.string === "25/m", "英雄经验是表里的每分钟");
    assert(view.expLabel !== null && view.expLabel.string === "10/m", "角色经验是表里的每分钟");
    assert(view.bubbleLabel !== null && view.bubbleLabel.string === shown, "泡上的计时和条上一样");
    Date.now = previousNow;
    const chip = chipOf(view);
    assert(chip.caption !== null && chip.caption.string === "第1关", "章关长文案在左侧小标");
    assert(view.worldMap !== null && view.worldMap.active === false, "缩略图收起");
    assert(view.mapLabel !== null && view.mapLabel.active === false, "地图字收起");
    const mission = missionLabel(view);
    assert(view.missionName !== null && view.missionName.active === true, "关号留在预制 lbl_mission_name");
    assert(mission.string === "1", "圆环只写关号");
    GameLog.shared.clear();
    noteProgress(null, 4);
    assert(missionLabel(view).string === "5", "Store 变了立刻重绑关号 " + missionLabel(view).string);
    assert(chipOf(view).caption !== null && chipOf(view).caption!.string.indexOf("第5关") >= 0, "长文案跟着进战关");
    assert(view.goldLabel !== null && view.goldLabel.string === "500/m", "收益立刻跟着进战关");
    assert(sawMainline("挂机关卡刷新"), "进度变化要打挂机关卡刷新");
    assert(mission.fontSize === 45, "关卡字号按 CCBI 45");
    assert(view.missionName.scale.x === 0.8 && view.missionName.scale.y === 0.8, "关卡字缩放按 CCBI 0.8");
    assert(mission.color.r === 254 && mission.color.g === 255 && mission.color.b === 255, "关卡字颜色按 CCBI 白");
    assert(view.battleTitle !== null && view.battleTitle.string === "战斗", "中间钮写战斗");
    assert(view.lineupTitle !== null && view.lineupTitle.string === "战力UP", "左侧钮写战力UP");
    assert(view.speedTitle !== null && view.speedTitle.string === "高速战斗", "右侧钮写高速战斗");
    const menu = view.hitMenu ? view.hitMenu.getComponent(UITransform) : null;
    assert(menu !== null && menu.contentSize.width === 0 && menu.contentSize.height === 0, "全屏 menu 收成 0");
    const toastAt = toasts.length;
    if (view.btnSpeed && view.btnSpeed.node) view.btnSpeed.node.emit(Button.EventType.CLICK);
    if (view.btnLineup && view.btnLineup.node) view.btnLineup.node.emit(Button.EventType.CLICK);
    chip.node.emit(Button.EventType.CLICK);
    assert(toasts[toastAt] === "高速战斗仍走旧挂机", "快速战斗不在这一刀");
    assert(toasts[toastAt + 1] === "战力UP仍走旧挂机", "战力UP不在这一刀");
    assert(toasts[toastAt + 2] === "章节地图仍走旧挂机", "章节地图不在这一刀");
    const page = new Node("LiveShell");
    const shell = new Node("PagePrefabShell");
    shell.parent = page;
    view.node.parent = shell;
    if (view.btnBattle && view.btnBattle.node) view.btnBattle.node.emit(Button.EventType.CLICK);
    assert(page.getChildByName("PagePrefabShell") !== null, "战斗钮留在挂机壳上");

    nav.current.id = "city";
    view.close();
    assert(nav.backs.n === 0, "不在挂机页时关闭不拆栈");
    nav.current.id = "mainline";
    view.close();
    assert(nav.backs.n === 1 && nav.current.id === "city", "在挂机页时关闭走页面栈返回");
    view.node.destroy();

    GameStore.reset();
    clearChapter();
    Session.source = "wire";
    const unsynced = await openView();
    assert(missionLabel(unsynced).string === "", "未同步圆环不编关号");
    assert(chipOf(unsynced).caption !== null && chipOf(unsynced).caption!.string === "主线未同步", "未同步长文案在左侧小标");
    assert(unsynced.clockLabel !== null && unsynced.clockLabel.string !== "999", "未同步也不留 999");
    assert(unsynced.goldLabel !== null && unsynced.goldLabel.string === "—/m", "未同步且没进 Store 时三格是破折号");
    unsynced.node.destroy();
  } finally {
    Date.now = previousNow;
    Session.source = previous;
    GameStore.reset();
    clearChapter();
  }
}

async function checkManager(): Promise<void> {
  const previous = Session.source;
  try {
    bindChapter();
    Session.source = "wire";
    noteChapter(1, Math.floor(Date.now() / 1000) - 90);
    const stack: string[] = ["city"];
    const rootNode = new Node("pageLayer");
    let opens = 0;
    const highlights: string[] = [];
    UIManager.instance.install(
      {
        get current() {
          return stack[stack.length - 1] || null;
        },
        openChild(id: string) {
          opens += 1;
          const host = UIManager.instance.createPageHost(id);
          assert(host !== null && host.isValid && host.name === "LiveShell", "进栈的是已经装好的壳");
          assert(host.getChildByName("PagePrefabShell") !== null, "挂机先铺 PagePrefabShell");
          const shell = host.getChildByName("PagePrefabShell");
          assert(shell !== null && shell.getChildByName("IdleHang") !== null, "殿堂在面板下面");
          assert(shell !== null && shell.getChildByName("BattlePanelLayer") !== null, "底栏是 BattlePanelLayer");
          const names: string[] = [];
          for (let i = 0; i < host.children.length; i++) names.push(host.children[i].name);
          assert(pageContentReady(names) === true, "壳挂上之后过场可以播");
          host.parent = rootNode;
          stack.push(id);
        },
        back() {
          if (stack.length <= 1) return false;
          const id = stack.pop() || "";
          const host = rootNode.getChildByName("LiveShell");
          if (host) host.destroy();
          if (id) UIManager.instance.noteClosed(id);
          return true;
        },
      },
      {
        showToast(text: string) {
          toasts.push(text);
        },
        onPageOpened(id: string) {
          highlights.push(id);
        },
      }
    );
    clearPrefabCache();
    assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
      cb(null, {
        load(inner: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
          const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
          prefab._instantiate = () => {
            if (inner.indexOf("BattlePanelLayer") >= 0) {
              const view = makeView();
              view.node.name = "BattlePanelLayer";
              view.node.removeFromParent();
              return view.node;
            }
            if (inner.indexOf("HangMissionChip") >= 0) {
              const node = new Node("HangMissionChip");
              makeChip(node);
              return node;
            }
            if (inner.indexOf("PagePrefabShell") >= 0) {
              const node = new Node("PagePrefabShell");
              const spot = new Node("HangProbeHotspot");
              spot.parent = node;
              return node;
            }
            return new Node(inner.split("/").pop() || "prefab");
          };
          done(null, prefab);
        },
      });
    };
    const opened = await UIManager.instance.open(BattleHangView);
    assert(opens === 1, "打开只压一层");
    assert(highlights[0] === "mainline", "打开之后才通知底栏");
    assert(stack[stack.length - 1] === "mainline", "栈顶是挂机");
    assert(opened.goldLabel !== null && opened.goldLabel.string === "200/m", "UIManager 打开后写出收益");
    assert(missionLabel(opened).string === "1", "UIManager 打开后圆环写出关号");
    assert(UIManager.instance.close(opened) === true, "装好的挂机页可以关");
    assert(stack[stack.length - 1] === "city", "关掉回到主城");
    assert(UIManager.instance.createPageHost("mainline") === null, "关掉之后不再交出旧壳");

    clearPrefabCache();
    assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: null) => void) => {
      cb(new Error("bundle down"), null);
    };
    assetManager.loadAny = (_request: unknown, cb: (err: Error | null, asset: null) => void) => {
      cb(new Error("uuid down"), null);
    };
    const toastAt = toasts.length;
    const opensBefore = opens;
    let failed = false;
    try {
      await UIManager.instance.open(BattleHangView);
    } catch (err) {
      failed = !isOpenCancelled(err);
    }
    assert(failed, "预制加载失败要拒绝打开");
    assert(opens === opensBefore, "失败不能压栈");
    assert(toasts[toastAt] === "页面没有打开", "失败要有可见提示");
    assert(UIManager.instance.createPageHost("mainline") === null, "失败后不能再交出空壳");
  } finally {
    Session.source = previous;
    GameStore.reset();
    clearChapter();
  }
}

function sawMainline(fragment: string): boolean {
  const recent = GameLog.shared.recent();
  for (let i = 0; i < recent.length; i++) {
    if (recent[i].tag === "Mainline" && recent[i].message.indexOf(fragment) >= 0) return true;
  }
  return false;
}

function waitLine(match: (text: string) => boolean, ms: number): Promise<string> {
  const recent = GameLog.shared.recent();
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].tag === "Mainline" && match(recent[i].message)) return Promise.resolve(recent[i].message);
  }
  return new Promise((resolve, reject) => {
    let off = (): void => {};
    const timer = setTimeout(() => {
      off();
      const recent = GameLog.shared.recent();
      const tail: string[] = [];
      for (let i = 0; i < recent.length; i++) {
        if (recent[i].tag === "Mainline") tail.push(recent[i].level + " " + recent[i].message);
      }
      reject(new Error("没有等到开战回合\n" + tail.join("\n")));
    }, ms);
    off = GameLog.shared.subscribe((line) => {
      if (line.tag !== "Mainline" || !match(line.message)) return;
      clearTimeout(timer);
      off();
      resolve(line.message);
    });
  });
}

function struck(text: string): boolean {
  return /开战回合 \d+\/\d+ 技能开 血条 [1-9]/.test(text) && /飘字 [1-9]/.test(text);
}

class SilentTransport implements ITransport {
  connect(): Promise<void> {
    return Promise.resolve();
  }
  send(): void {}
  close(): void {}
  onMessage(_handler: NetHandler): void {}
  onClose(_handler: () => void): void {}
}

function noteStaleBattle(): void {
  GameStore.noteWire({
    enabled: true,
    account: "battle-check",
    serverId: 1,
    roleId: 7,
    name: "battle-check",
    nameSynced: true,
    level: 4,
    gold: null,
    diamond: null,
    nowIdx: 4,
    maxIdx: 3,
    heroes: null,
    bag: null,
    lineUp: null,
    unlockIds: null,
    rewardTime: null,
    maxRewardTime: null,
    battle: {
      empty: false,
      marks: [],
      report: {
        battleId: 4,
        battleType: 1,
        atkId: null,
        defId: null,
        winId: null,
        rounds: [{ index: 1, marks: [], actions: [] }],
        atkHeroes: [{ pos: 1, heroId: 10101001, hp: 80, maxHp: null, marks: [] }],
        defHeroes: [{ pos: 1, heroId: 10101001, hp: 40, maxHp: null, marks: [] }],
        marks: [],
      },
    },
  });
}

/** 上一局没有攻击、也没有胜负。发不出 3001 时不能补一拍就结算。 */
async function checkStaleReport(pages: Node[]): Promise<void> {
  Session.source = "wire";
  noteStaleBattle();
  const stale = new Node("LiveShell");
  pages.push(stale);
  beginHangBattle(stale, "我方", "第4关");
  GameLog.shared.clear();
  stale.emit(PAGE_SHELL_FIGHT);
  const opened = await waitLine(struck, 800);
  assert(!/血条 0/.test(opened), "本场第一拍要有血条 " + opened);
  const second = await waitLine((text) => text.indexOf("开战回合 2/") >= 0, 2500);
  assert(second.indexOf("2/") >= 0, "本场要播到第二回合 " + second);
  assert(sawMainline("不复用已有战报") && sawMainline("改播本场回合"), "没有攻击拍不能复用旧战报");
  assert(sawMainline("开战胜负 胜利 来自本关"), "胜负要按本关写成胜利");
  assert(sawMainline("4 回合"), "本场要有完整回合");
  assert(!sawMainline("补一拍攻击") && !sawMainline("胜负未带") && !sawMainline("改播已有战报"), "不能补一拍或静默胜负未带");
  const layer = stale.getChildByName("HangBattle");
  const skip = layer ? layer.getChildByName("HangSkipBg") : null;
  if (!skip) throw new Error("跳过钮还在");
  skip.emit(Button.EventType.CLICK);
  const settled = await waitLine((text) => text.indexOf("开战结算 盖上结算页") >= 0, 4000);
  assert(settled.indexOf("胜利") >= 0, "结算页写胜利 " + settled);
  assert(sawMainline("开战结算 3007 没有发出") && sawMainline("进度不改"), "没连上时胜利也要写明 3007 没发出");
  assert(GameStore.chapter().nowIdx === 4, "3007 没发出时关号不动");
  stopHangBattle(stale);

  const again = new Node("LiveShell");
  pages.push(again);
  beginHangBattle(again, "我方", "第4关");
  GameLog.shared.clear();
  again.emit(PAGE_SHELL_FIGHT);
  const againLine = await waitLine((text) => text.indexOf("开战本场") >= 0 && text.indexOf("4 回合") >= 0, 800);
  assert(againLine.indexOf("4 回合") >= 0, "二次开战仍是完整回合 " + againLine);
  const againHit = await waitLine(struck, 800);
  assert(!/血条 0/.test(againHit), "二次开战第一拍要有血条 " + againHit);
  assert(!sawMainline("补一拍攻击") && !sawMainline("改播已有战报"), "二次开战不复用上一局");
  stopHangBattle(again);
}

/** 3001 发得出但没有回包。不能改播上一局，打完胜利要拉 3007。 */
async function checkFreshPull(pages: Node[]): Promise<void> {
  const net = new NetClient(new SilentTransport());
  try {
    await net.connect("silent://battle");
    WireSession.watch(net);
    WireSession.nowIdx = 4;
    WireSession.maxIdx = 3;
    WireSession.battleSerial = 0;
    noteStaleBattle();
    const slow = new Node("LiveShell");
    pages.push(slow);
    beginHangBattle(slow, "我方", "第4关");
    GameLog.shared.clear();
    slow.emit(PAGE_SHELL_FIGHT);
    const missed = await waitLine((text) => text.indexOf("开战 3001 没有回到") >= 0, 9000);
    assert(missed.indexOf("不复用已有战报") >= 0 && missed.indexOf("改播本场回合") >= 0, "超时不能复用旧战报 " + missed);
    const planned = await waitLine((text) => text.indexOf("开战本场") >= 0 && text.indexOf("4 回合") >= 0, 800);
    assert(planned.indexOf("4 回合") >= 0, "超时后改播完整回合 " + planned);
    assert(sawMainline("开战胜负 胜利 来自本关"), "超时后胜负按本关写成胜利");
    const layer = slow.getChildByName("HangBattle");
    const skip = layer ? layer.getChildByName("HangSkipBg") : null;
    if (!skip) throw new Error("超时后跳过钮还在");
    skip.emit(Button.EventType.CLICK);
    const settled = await waitLine((text) => text.indexOf("开战结算 盖上结算页") >= 0, 4000);
    assert(settled.indexOf("胜利") >= 0, "超时后结算页写胜利 " + settled);
    assert(sawMainline("已拉 3007"), "胜利要拉 3007");
    assert(!sawMainline("胜负未带") && !sawMainline("补一拍攻击") && !sawMainline("改播已有战报"), "超时不能补一拍或静默胜负未带");
    assert(GameStore.chapter().nowIdx === 4, "3007 还没回时本地关号不动");
    stopHangBattle(slow);
  } finally {
    WireSession.release(net);
    net.close();
    WireSession.nowIdx = null;
    WireSession.maxIdx = null;
    WireSession.battleMatch = null;
    WireSession.battleSerial = 0;
  }
}

async function checkFightRounds(): Promise<void> {
  const previous = Session.source;
  const file = JSON.parse(read("client/assets/resources/config/chapter.json")) as ConfigTableFile<Record<string, unknown>>;
  const tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tables.set("chapter", file);
  bindGameCatalog(tables);
  const pages: Node[] = [];
  try {
    Session.source = "mock";
    GameStore.reset();
    const page = new Node("LiveShell");
    pages.push(page);
    beginHangBattle(page, "我方", "敌方");
    GameLog.shared.clear();
    page.emit(PAGE_SHELL_FIGHT);
    const opened = await waitLine(struck, 800);
    assert(opened.indexOf("技能开") >= 0, "Mock 第一拍要有技能、血条和飘字 " + opened);
    const layer = page.getChildByName("HangBattle");
    const foes = layer ? layer.getChildByName("HangFoes") : null;
    assert(!!foes && foes.children.length > 0, "回合演出不能拆掉已经摆上的敌方");
    const banner = layer ? layer.getChildByName("HangSkill") : null;
    assert(!!banner && banner.active, "技能条开着");
    stopHangBattle(page);

    Session.source = "wire";
    GameStore.reset();
    const bare = new Node("LiveShell");
    pages.push(bare);
    beginHangBattle(bare, "我方", "敌方");
    GameLog.shared.clear();
    bare.emit(PAGE_SHELL_FIGHT);
    const missed = await waitLine((text) => text.indexOf("开战没有进战报") >= 0, 800);
    assert(missed.indexOf("不播回合") >= 0, "真服没有战报要写明不播");
    stopHangBattle(bare);

    GameStore.noteWire({
      enabled: true,
      account: "battle-check",
      serverId: 1,
      roleId: 7,
      name: "battle-check",
      nameSynced: true,
      level: 1,
      gold: null,
      diamond: null,
      nowIdx: 1,
      maxIdx: 0,
      heroes: null,
      bag: null,
      lineUp: null,
      unlockIds: null,
      rewardTime: null,
      maxRewardTime: null,
      battle: {
        empty: false,
        marks: [],
        report: {
          battleId: 1,
          battleType: 1,
          atkId: 7,
          defId: 8,
          winId: 7,
          rounds: [
            {
              index: 1,
              marks: [],
              actions: [
                {
                  atkPos: 1,
                  skillId: 101010011,
                  camp: 1,
                  marks: [],
                  hits: [{ defPos: 1, hurt: 30, hp: 70, marks: [] }],
                },
              ],
            },
          ],
          atkHeroes: [{ pos: 1, heroId: 10101001, hp: 100, maxHp: 100, marks: [] }],
          defHeroes: [{ pos: 1, heroId: 10101001, hp: 100, maxHp: 100, marks: [] }],
          marks: [],
        },
      },
    });
    const wired = new Node("LiveShell");
    pages.push(wired);
    beginHangBattle(wired, "我方", "敌方");
    setHangSpeed(wired, 3);
    GameLog.shared.clear();
    wired.emit(PAGE_SHELL_FIGHT);
    const played = await waitLine(struck, 4000);
    assert(played.indexOf("技能开") >= 0, "真服战报要播技能、血条和飘字 " + played);
    const wiredLayer = wired.getChildByName("HangBattle");
    const wiredFoes = wiredLayer ? wiredLayer.getChildByName("HangFoes") : null;
    assert(!!wiredFoes && wiredFoes.children.length > 0, "战报回合不能拆掉右侧敌方");
    stopHangBattle(wired);

    await checkStaleReport(pages);
    await checkFreshPull(pages);
  } finally {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].isValid) stopHangBattle(pages[i]);
    }
    Session.source = previous;
    GameStore.reset();
    bindGameCatalog(new Map());
  }
}

function checkMockProgress(): void {
  const previous = Session.source;
  try {
    Session.source = "mock";
    GameStore.reset();
    const before = hangFace(0, 0);
    assert(before.caption === "主线未同步", "结算前没有关号");
    const wrote = GameStore.noteMockVictory(1);
    assert(wrote.ok === true && wrote.next === 2, "Mock 胜利写下下一关");
    assert(GameStore.source === "empty", "本地进度不把空仓库改成整份 Mock");
    assert(GameStore.mockStageId() === 2, "下一关能被挂机读到");
    const after = hangFace(0, 0);
    assert(after.synced === true && after.caption !== before.caption, "关卡名跟着变 " + after.caption);
    assert(after.gold !== before.gold, "收益跟着关卡变 " + before.gold + " → " + after.gold);
    const again = GameStore.noteMockVictory(1);
    assert(again.ok === false && GameStore.mockStageId() === 2, "重复通关不倒退");

    GameStore.fillFromMock({
      account: "battle-check",
      serverId: 1,
      roleId: 9,
      name: "旧号",
      level: 4,
      gold: 77,
      diamond: 5,
      openDay: 2,
      stageId: 4,
      clearedStage: 3,
      idleAnchorMs: 1234,
      heroes: [{ heroId: 10001, heroType: null, name: "光耀骑士", level: 2, star: 3, fighting: null, weaponLevel: 1 }],
      items: [{ id: 101, count: 6 }],
    });
    const moved = GameStore.noteMockVictory(4);
    assert(moved.ok === true && moved.next === 5 && GameStore.mockStageId() === 5, "已有 Mock 进度往前一关");
    const heroes = GameStore.heroes();
    assert(GameStore.source === "mock" && heroes !== null && heroes.length === 1, "写关卡不改英雄");
    assert(GameStore.bag() !== null && GameStore.bag()!.length === 1, "写关卡不改背包");

    noteChapter(1, null);
    const blocked = GameStore.noteMockVictory(3);
    assert(blocked.ok === false && GameStore.chapter().nowIdx === 1 && GameStore.source === "wire", "真服不在本地改 idx");
  } finally {
    Session.source = previous;
    GameStore.reset();
  }
}

async function checkSettlePage(): Promise<void> {
  const previous = Session.source;
  const pages: Node[] = [];
  try {
    Session.source = "mock";
    GameStore.reset();
    const page = new Node("LiveShell");
    pages.push(page);
    beginHangBattle(page, "我方", "敌方");
    GameLog.shared.clear();
    const pending = waitLine((text) => text.indexOf("开战结算 盖上结算页") >= 0, 800);
    finishHangBattle(page, true);
    assert(GameStore.mockStageId() === 2, "打完立刻写下下一关");
    assert(page.getChildByName("HangBattle") !== null, "结算出来之前战斗层还在");
    const line = await pending;
    assert(line.indexOf("胜利") >= 0, "结算页写明胜利 " + line);
    assert(page.getChildByName("BattleEndHold") !== null, "结算页留在画面上");
    assert(page.getChildByName("HangBattle") !== null, "结算页还在时不拆战斗层");
    stopHangBattle(page);
    assert(page.getChildByName("BattleEndHold") === null, "回挂机才收结算页");
    assert(page.getChildByName("HangBattle") === null, "回挂机才拆战斗层");

    GameStore.reset();
    const lost = new Node("LiveShell");
    pages.push(lost);
    beginHangBattle(lost, "我方", "敌方");
    GameLog.shared.clear();
    const loseWait = waitLine((text) => text.indexOf("开战结算 盖上结算页") >= 0, 800);
    finishHangBattle(lost, false);
    assert(GameStore.mockStageId() === null, "失败不写关号");
    const loseLine = await loseWait;
    assert(loseLine.indexOf("失败") >= 0, "失败结算页 " + loseLine);
    assert(sawMainline("开战结算 失败") && sawMainline("进度不变"), "失败要写明进度不变");
    assert(lost.getChildByName("BattleEndHold") !== null, "失败也要有结算页");
    stopHangBattle(lost);

    Session.source = "wire";
    noteChapter(1, null);
    const wired = new Node("LiveShell");
    pages.push(wired);
    beginHangBattle(wired, "我方", "敌方");
    GameLog.shared.clear();
    const wireWait = waitLine((text) => text.indexOf("开战结算 盖上结算页") >= 0, 800);
    finishHangBattle(wired, true);
    assert(GameStore.chapter().nowIdx === 1, "发不出 3007 时不改 nowIdx");
    const wireLine = await wireWait;
    assert(wireLine.indexOf("胜利") >= 0, "真服打完也盖胜利页 " + wireLine);
    assert(sawMainline("开战结算 3007 没有发出") && sawMainline("进度不改"), "真服发不出 3007 要写明");
    assert(wired.getChildByName("BattleEndHold") !== null, "真服打完也盖结算页");
    stopHangBattle(wired);
  } finally {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].isValid) stopHangBattle(pages[i]);
    }
    Session.source = previous;
    GameStore.reset();
  }
}

function checkJsonReport(): void {
  const body = new TextEncoder().encode(
    JSON.stringify({
      battle_type: 1,
      win_id: 7,
      attacker: { player_id: 7, heros: [{ unit_id: 1002, hero_id: 10101001, position: 1, hp: 100, max_hp: 100 }] },
      defender: { player_id: 8, heros: [{ unit_id: 1005, hero_id: 10101001, position: 2, hp: 80, max_hp: 80 }] },
      rounds: [
        {
          round: 1,
          attack_info: [
            {
              unit_id: 1002,
              skill: {
                skill_id: 11,
                effect_info: [{ buff_info: [{ target_unitId: 1005, hit: 1, update: [{ type: 223, value: -30 }] }] }],
              },
            },
          ],
        },
      ],
    })
  );
  const report = decodeWireBattleReport(body);
  assert(report !== null && wireBattleActionCount(report) === 1, "日服 JSON 战报要有攻击拍");
  const action = report && report.rounds[0] ? report.rounds[0].actions[0] : null;
  assert(action !== null && action.atkPos === 1 && action.skillId === 11 && action.camp === 1, "攻击者位置和技能来自 attack_info");
  assert(action !== null && action.hits.length === 1 && action.hits[0].hurt === 30 && action.hits[0].defPos === 2, "伤害来自 update 的负数");
  assert(report !== null && report.atkId === 7 && report.winId === 7, "胜负仍看 win_id");
}

function checkStandingBars(): void {
  const page = new Node("LiveShell");
  const hang = new Node("IdleHang");
  hang.parent = page;
  const heroes = new Node("IdleHeroes");
  heroes.parent = hang;
  const hero = new Node("Hero");
  hero.parent = heroes;
  beginHangBattle(page, "我方", "敌方");
  const layer = page.getChildByName("HangBattle");
  if (!layer) throw new Error("没有 HangBattle");
  const foes = new Node("HangFoes");
  foes.parent = layer;
  const foe = new Node("HangFoe");
  foe.parent = foes;
  const bars: HangBar[] = [];
  for (let i = 0; i < 3; i++) bars.push({ x: i * 10, y: 0, hpRatio: 1, rageRatio: 0.2, ally: true });
  for (let i = 0; i < 3; i++) bars.push({ x: i * 10, y: 0, hpRatio: 0.5, rageRatio: 0.2, ally: false });
  showHangStrike(page, 1, 15, "攻击", [], bars);
  const host = layer.getChildByName("HangBars");
  assert(host !== null && host.children.length === 2, "站着两人就两根血条 " + (host ? host.children.length : 0));
  showHangStrike(page, 2, 15, "攻击", [], bars);
  assert(host !== null && host.children.length === 2, "下一拍清掉残留 " + (host ? host.children.length : 0));
  stopHangBattle(page);
}

async function main(): Promise<void> {
  GameLog.shared.mirrorConsole = false;
  checkFlag();
  checkSources();
  checkPrefab();
  checkRegistry();
  checkData();
  checkJsonReport();
  checkStandingBars();
  checkFightLine();
  checkMockProgress();
  await checkSettlePage();
  await checkFightRounds();
  await checkPaint();
  await checkManager();
  GameStore.reset();
  clearChapter();
  setUseBattleView(true);
  console.log("battle-view-check ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
