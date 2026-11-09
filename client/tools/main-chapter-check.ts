/** 主线客户端回归：初始化、历史回执不倒退资产、未知结果原键重试、身份切换不被旧请求复活。 */
import { MainChapterHeroTalk } from "../assets/scripts/features/battle/ui/MainChapterHeroTalk";
import { HeroTalkUtils } from "../assets/scripts/features/battle/utils/HeroTalkUtils";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { Node, UITransform, view as screenView } from "cc";
import { MainChapterView } from "../assets/scripts/features/battle/ui/MainChapterView";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";
import { MainChapterBattleView } from "../assets/scripts/features/battle/ui/MainChapterBattleView";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";
import { encodeGameFrame, decodeGameFrame, GameFrame } from "../assets/scripts/platform/GameProtocolCodec";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
const battleId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const original = { maxCleared: 1, pendingBattleId: battleId, assetRevision: 3 };
const latest = { maxCleared: 2, assetRevision: 8 };
/** 构造真实方向信封，经生成编码往返，不直接绕过协议约束。 */
function frame(name: string, body: unknown, kind = "response"): GameFrame {
    return decodeGameFrame(encodeGameFrame({ version: 1, name, kind, ...(kind === "response" ? {ok: true} : {}), body }));
}
/** 只测试当前模块；完整资产绑定另由session-state回归覆盖。 */
async function main(): Promise<void> {
    const talkRows = [{ level_min: 1, level_max: 300, lan: 70901 }];
    const talkLanguage = new Map([[70901, "旧文案"]]);
    assert.deepEqual(HeroTalkUtils.candidates(1, talkRows, talkLanguage), []);
    assert.deepEqual(HeroTalkUtils.candidates(300, talkRows, talkLanguage), []);
    assert.deepEqual(HeroTalkUtils.candidates(2, talkRows, talkLanguage), ["旧文案"]);
    assert.deepEqual(HeroTalkUtils.candidates(2, talkRows, new Map()), []);
    assert.equal(HeroTalkUtils.richText("<font color='#ec4529'>五星</font>"), "<color=#ec4529>五星</color>");
    // 用最小节点替身验证跨宿主空档不提前清除台词；不模拟引擎排版。
    const talk = Object.create(MainChapterHeroTalk.prototype) as any;
    let removed = 0;
    Object.assign(talk, { closed: false, elapsed: 3, remaining: 7,
        speaker: { name: "Slot_A2", isValid: false, activeInHierarchy: false },
        bubble: { isValid: true, active: true, destroy: () => removed++ },
        activeHeroes: () => [] });
    talk.update(1, true);
    assert.equal(removed, 0);
    assert.equal(talk.bubble.active, false);
    assert.equal(talk.remaining, 6);
    talk.update(0, false);
    assert.equal(removed, 1);
    assert.equal(talk.bubble, null);
    assert.equal(talk.elapsed, 4);
    talk.update(0, false);
    assert.equal(removed, 1);
    const model = new MainChapterModel();
    const controller = new MainChapterController(model);
    controller.initialize();
    controller.resetSession("test/role");
    controller.onNotify(Protocol.STATE_CHANGED, { revision: 3, mainChapter: original });
    assert.deepEqual(model.state, original);
    assert.equal(MainChapterController.readState(undefined), null);
    for (const value of [{...original, maxCleared: 4}, {...original, pendingBattleId: "bad"}, {...original, assetRevision: -1}]) {
        assert.throws(() => MainChapterController.readState(value));
    }
    assert.throws(() => MainChapterController.readState(original, 4));
    const requests: object[] = [];
    controller.configure(async (name, body, received, failed) => {
        requests.push(body);
        if (requests.length === 1) { failed(new Error("模拟提交后断网")); return; }
        received(frame(name, { action: "BATTLE", battleId, state: original, rewards: [] }));
    });
    await controller.challenge();
    assert(model.requestId);
    assert.equal(model.busy, false);
    await controller.challenge();
    assert.deepEqual(requests[0], requests[1]);
    assert.equal(model.requestId, null);
    assert.equal(model.receipt?.battleId, battleId);
    controller.onNotify(Protocol.STATE_CHANGED, { revision: 8, mainChapter: latest });
    ProtocolRouter.instance.dispatch(controller, frame(Protocol.CHAPTER_CHALLENGE,
        { action: "BATTLE", battleId, state: original, rewards: [] }));
    assert.equal(model.state!.assetRevision, 8, "历史回执不能覆盖新快照");
    assert.equal(model.state!.maxCleared, 2);
    assert.equal(model.state!.pendingBattleId, null);
    const receiptBefore = model.receipt;
    assert.throws(() => controller.onNotify(Protocol.CHAPTER_CLAIM,
        { action: "BATTLE", battleId, state: original, rewards: [] }));
    assert.equal(model.receipt, receiptBefore);
    controller.configure(async (_name, _body, _received, _failed) => {
        // 应用换号后不交付旧成功或失败；控制器不得在finally里恢复旧业务状态。
        controller.resetSession("test/other");
    });
    await controller.challenge();
    assert.equal(model.state, null);
    assert.equal(model.requestId, null);
    assert.equal(model.busy, false);
    assert.equal(model.receipt, null);
    controller.dispose();
    if (process.argv.includes("--wire")) {
        {
        const encounter = decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-encounter.pb")));
        assert.equal(encounter.name, Protocol.CHAPTER_IDLE_ENCOUNTER);
        const body = encounter.body as any;
        const idleModel = new MainChapterModel();
        const idleController = new MainChapterController(idleModel);
        idleController.initialize();
        idleModel.state = { maxCleared: body.stage, assetRevision: body.assetRevision, pendingBattleId: null };
        idleModel.idle = { serverTime: 1000, startedAt: 900, maxSeconds: 3600, frequency: 60,
            rewardStage: body.stage, lineupVersion: body.lineupVersion, rates: [], slots: [] };
        idleController.onNotify(Protocol.CHAPTER_IDLE_ENCOUNTER, body);
        assert(idleModel.idleReplay);
        const idleUnits = BattleReplayUtils.units(idleModel.idleReplay.bytes);
        assert.equal(idleUnits.filter(unit => unit.faction === 1).length, 3);
        assert.equal(idleUnits.filter(unit => unit.faction === 2).length, 1);
        assert(BattleReplayUtils.decode(idleModel.idleReplay.bytes).length > 0);
        idleModel.idleReplay = null;
        idleController.onNotify(Protocol.CHAPTER_IDLE_ENCOUNTER, { ...body, lineupVersion: body.lineupVersion + 1 });
        assert.equal(idleModel.idleReplay, null, "不同阵容版本的演出不得播放");
        assert.throws(() => idleController.onNotify(Protocol.CHAPTER_IDLE_ENCOUNTER,
            { ...body, replay: { ...body.replay, scenario: "chapter:lineup:3" } }));
        idleController.dispose();
        console.log("PASS 三英雄挂机Java→TS战报及版本校验");
        }
        const live = new MainChapterController(model);
        live.initialize();
        for (let mission = 1; mission <= 3; mission++) {
            const read = (kind: string) => decodeGameFrame(new Uint8Array(readFileSync("backend/target/chapter-" + kind + "-" + mission + ".pb")));
            const restored = read("restore");
            ProtocolRouter.instance.dispatch(live, restored);
            assert.equal(model.state!.maxCleared, mission);
            assert(model.state!.pendingBattleId);
            const replay = read("replay");
            ProtocolRouter.instance.dispatch(live, replay);
            assert.equal(model.replay!.mission, mission);
            BattleReplayUtils.decode(model.replay!.bytes);
            ProtocolRouter.instance.dispatch(live, read("claimed"));
            const current = model.state;
            ProtocolRouter.instance.dispatch(live, read("receipt"));
            assert.equal(model.state, current);
            assert.equal(model.state!.pendingBattleId, null);
            assert(model.receipt!.rewards.length > 0);
        }
        live.dispose();
        console.log("PASS 三关真实Java→TS初始化/战报/结算/快照互通");
    }
    // 主页不再把首通奖励冒充挂机收益，三个正式入口和四项收益保持独立。
    const rewardNode = new Node("ChapterHomeTest");
    const rewardView = rewardNode.addComponent(MainChapterView) as any;
    const shared = MainChapterModel.instance;
    for (const key of ["stageLabel", "statusLabel", "challengeLabel", "idleTimeLabel", "goldRateLabel", "heroExpRateLabel", "roleExpRateLabel"]) {
        rewardView[key] = { string: "" };
    }
    for (const key of ["challengeButton", "powerButton", "quickBattleButton"]) {
        rewardView[key] = { interactable: false };
    }
    shared.state = { ...latest, pendingBattleId: null };
    shared.receipt = { action: "SETTLED", battleId, state: shared.state,
        rewards: [{ itemId: 900001, quantity: 4000 }] };
    rewardView.render();
    assert.equal(rewardView.goldRateLabel.string, "—/分", "不能用通关奖励代替挂机金币速率");
    assert.equal(rewardView.idleTimeLabel.string, "未接入", "没有权威挂机时间不能显示虚假计时");
    assert.equal(rewardView.challengeLabel.string, "战斗");
    shared.state = { ...shared.state, pendingBattleId: battleId };
    rewardView.render();
    assert.equal(rewardView.challengeLabel.string, "恢复战斗");
    const realPlay = rewardView.play;
    let restored = "";
    rewardView.play = async (id: string) => { restored = id; };
    await rewardView.challenge();
    assert.equal(restored, battleId, "待结算从战斗按钮恢复，不依赖已移除的重播按钮");
    rewardView.play = realPlay;
    shared.receipt = null;
    const idle = { serverTime: 1000, startedAt: 900, maxSeconds: 120, frequency: 5,
        rewardStage: shared.state!.maxCleared, rates: [{ itemId: 900001, quantity: 10 },
            { itemId: 900003, quantity: 3 }, { itemId: 900101, quantity: 4 }] };
    shared.idle = MainChapterController.readIdle(idle, shared.state);
    shared.idleReceivedAt = Date.now() - 60000;
    rewardView.renderIdle();
    assert.equal(rewardView.idleTimeLabel.string, "0:02:00", "后台恢复显示封顶时长");
    assert.equal(rewardView.goldRateLabel.string, "120/分", "周期收益换算为每分钟");
    for (const invalid of [{ ...idle, frequency: 0 }, { ...idle, rewardStage: 99 },
        { ...idle, rates: [idle.rates[0], idle.rates[0]] }, { ...idle, serverTime: NaN }]) {
        assert.throws(() => MainChapterController.readIdle(invalid, shared.state));
    }
    if (process.argv.includes("--wire")) {
        const frame = decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-snapshot.pb")));
        const body = frame.body as any;
        const chapter = MainChapterController.readState(body.mainChapter, body.revision);
        assert.equal(MainChapterController.readIdle(body.mainChapterIdle, chapter)!.rewardStage, 2);
    }
    assert.throws(() => MainChapterController.readIdle({ ...idle, lineupVersion: 1,
        slots: [{ heroId: "one", position: 1 }, { heroId: "one", position: 2 }] }, shared.state));
    let disposedIdle = 0;
    rewardView.idleDisplay = { dispose: () => disposedIdle++ };
    rewardView.idleDisplayKey = "previous";
    shared.idle = null;
    rewardView.refreshIdleDisplay();
    assert.equal(disposedIdle, 1, "空挂机快照必须清除旧英雄");

    // 三种实际屏幕比例投影至设计高度，主线纸张不越出左右安全边距，背景铺满。
    const originalVisibleSize = screenView.getVisibleSize;
    rewardView.panel = new Node("Panel");
    rewardView.panel.parent = rewardNode;
    for (const name of ["PalaceBackground", "PalaceFloor"]) {
        const background = new Node(name);
        background.parent = rewardNode;
        background.addComponent(UITransform);
    }
    try {
        for (const [width, height] of [[360, 720], [360, 840], [768, 1024]]) {
            const visibleWidth = width / height * 1280;
            screenView.getVisibleSize = () => ({ width: visibleWidth, height: 1280 });
            rewardView.fitViewport();
            assert(rewardView.panel.scale.x * 620 <= visibleWidth - 24 + 0.001);
            assert.equal(rewardNode.getChildByName("PalaceFloor")!.getComponent(UITransform)!.contentSize.width, visibleWidth);
        }
    } finally {
        screenView.getVisibleSize = originalVisibleSize;
    }
    // 正常战斗完成自动结算；历史重播、失败及关闭后均不发起领奖。
    const originalClaim = MainChapterController.instance.claim;
    const originalUiOpen = UIManager.instance.open;
    const resultNode = new Node("MainChapterBattleView");
    const resultView: any = resultNode.addComponent(MainChapterBattleView);
    resultView.args = { report: { battleId, mission: 1 }, onClosed: () => {} };
    resultView.closed = false;
    let claimCount = 0;
    let resultArgs: any;
    UIManager.instance.open = (async (_view: any, args: any) => { resultArgs = args; }) as any;
    MainChapterController.instance.claim = async id => {
        claimCount++;
        shared.receipt = { action: "SETTLED", battleId: id, state: shared.state!, rewards: [{ itemId: 900001, quantity: 4000 }] };
        shared.state = { ...shared.state!, pendingBattleId: null };
    };
    try {
        shared.state = { maxCleared: 1, pendingBattleId: battleId, assetRevision: 1 };
        await resultView.completeBattle(true);
        assert.equal(claimCount, 1);
        assert.equal(resultArgs.rewards[0].quantity, 4000, "结算窗口消费真实回执");
        await resultView.completeBattle(true);
        assert.equal(claimCount, 1, "历史重播不再次发起结算");
        assert.deepEqual(resultArgs.rewards, []);
        await resultView.completeBattle(false);
        assert.equal(claimCount, 1, "失败不发奖");
        shared.state = { ...shared.state!, pendingBattleId: battleId };
        shared.receipt = null;
        MainChapterController.instance.claim = async () => { claimCount++; };
        await resultView.completeBattle(true);
        assert.match(resultArgs.notice, /尚未确认/);
        assert.deepEqual(resultArgs.rewards, [], "失败或断线不能伪造奖励");
        resultView.closed = true;
        await resultView.completeBattle(true);
        assert.equal(claimCount, 2, "提前关闭不触发结算");
        resultView.closed = false;
        MainChapterController.instance.claim = async () => { throw new Error("offline"); };
        await resultView.completeBattle(true);
        assert.match(resultArgs.notice, /尚未确认/, "请求异常保留领奖恢复入口");
        let releaseClaim!: () => void;
        MainChapterController.instance.claim = async () => new Promise<void>(resolve => { releaseClaim = resolve; });
        const beforeClose = resultArgs;
        const finishing = resultView.completeBattle(true);
        resultView.closed = true;
        releaseClaim();
        await finishing;
        assert.equal(resultArgs, beforeClose, "结算在途退出后不弹出迟到窗口");
    } finally {
        MainChapterController.instance.claim = originalClaim;
        UIManager.instance.open = originalUiOpen;
        shared.reset(null);
    }
    const chapterPrefab = JSON.parse(readFileSync("client/assets/prefabs/ui/battle/MainChapterView.prefab", "utf8"));
    const chapterRoot = chapterPrefab[chapterPrefab[0].data.__id__];
    const children = chapterRoot._children.map((ref: any) => chapterPrefab[ref.__id__]._name);
    assert(children.indexOf("BattleHost") > children.indexOf("PalaceFloor"));
    assert(children.indexOf("BattleHost") < children.indexOf("Panel"), "战场必须位于底部面板之下");
    const fieldPrefab = JSON.parse(readFileSync("client/assets/prefabs/ui/battle/MainChapterBattleView.prefab", "utf8"));
    assert(!fieldPrefab.some((row: any) => row.__type__ === "cc.BlockInputEvents"), "页内战场不能阻断共享导航");
    assert(!fieldPrefab.some((row: any) => row._name === "PalaceBackground"), "全屏重复背景应退役");
    const realEncounter = MainChapterController.instance.encounter;
    let deliverEncounter!: (bytes: Uint8Array) => void;
    MainChapterController.instance.encounter = () => new Promise(resolve => { deliverEncounter = resolve; });
    let encounterOpens = 0;
    const beforeEncounterOpen = BattleReplayPreview.open;
    BattleReplayPreview.open = async () => { encounterOpens++; return () => {}; };
    rewardView.closed = false;
    rewardView.playing = false;
    rewardView.idleDisplay = { stand: () => {}, dispose: () => {}, root: new Node("March") };
    const pendingEncounter = rewardView.beginIdleEncounter();
    rewardView.playing = true;
    rewardView.clearIdleDisplay();
    deliverEncounter(new Uint8Array([1]));
    await pendingEncounter;
    assert.equal(encounterOpens, 0, "挑战切换后到达的挂机战报不应打开播放器");
    assert.equal(rewardView.idleEncounterActive, false);
    MainChapterController.instance.encounter = realEncounter;
    BattleReplayPreview.open = beforeEncounterOpen;
    const realOpen = BattleReplayPreview.open;
    let finish: (stop: () => void) => void;
    BattleReplayPreview.open = async () => new Promise(resolve => { finish = resolve; });
    const node = new Node("MainChapterBattleView");
    node.addComponent(UITransform);
    const view = node.addComponent(MainChapterBattleView);
    let released = 0, closed = 0;
    view.onOpen({ report: { battleId, mission: 1, pending: [], bytes: new Uint8Array() }, onClosed: () => closed++ });
    screenView.getVisibleSize = () => ({ width: 960, height: 1280 });
    (view as any).fitViewport();
    screenView.getVisibleSize = originalVisibleSize;
    assert.equal(node.getComponent(UITransform)!.contentSize.width, 960);
    assert.equal(node.getChildByName("PalaceBackground"), null, "页内战场不另造全屏背景");
    const ready = view.whenReady().catch(() => {});
    view.onClose(); view.onClose();
    finish!(() => released++);
    await ready; await Promise.resolve(); await Promise.resolve();
    assert.equal(closed, 1, "重复关闭只通知一次");
    assert.equal(released, 1, "迟到的播放器必须释放");
    BattleReplayPreview.open = realOpen;
    console.log("PASS 主线客户端状态、重试、回执、身份清理及窗口迟到取消");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
