/** 主线客户端回归：初始化、历史回执不倒退资产、未知结果原键重试、身份切换不被旧请求复活。 */
import { MainChapterHeroTalk } from "../assets/scripts/features/battle/ui/MainChapterHeroTalk";
import { MainChapterIdleDisplay } from "../assets/scripts/features/battle/ui/MainChapterIdleDisplay";
import { HeroTalkUtils } from "../assets/scripts/features/battle/utils/HeroTalkUtils";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { Node, Tween, UITransform, view as screenView } from "cc";
import { MainChapterView } from "../assets/scripts/features/battle/ui/MainChapterView";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";
import { MainChapterBattleView } from "../assets/scripts/features/battle/ui/MainChapterBattleView";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { ChapterEndView } from "../assets/scripts/features/battle/ui/ChapterEndView";
import { BattleInfoUtils } from "../assets/scripts/features/battle/utils/BattleInfoUtils";
import { ChapterSettlementUtils } from "../assets/scripts/features/battle/utils/ChapterSettlementUtils";
import { BattleStatisticsUtils } from "../assets/scripts/features/battle/utils/BattleStatisticsUtils";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
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
    // 遇敌借用和归还同一节点，重复关闭不得销毁行军英雄或重新创建显示。
    const idleRoot = new Node("Idle");
    const field = new Node("LayerField");
    field.parent = idleRoot;
    const allies = new Node("AllySlots");
    allies.parent = field;
    const home = new Node("Slot_A0");
    home.parent = allies;
    const heroNode = new Node("Hero");
    heroNode.parent = home;
    (heroNode as any).position = { x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0 }) };
    const gestures: string[] = [];
    const idleDisplay = new (MainChapterIdleDisplay as any)(idleRoot,
        [{ node: heroNode, gesture: (name: string) => gestures.push(name) }]);
    const borrowedSlot = new Node("EncounterSlot");
    const lease = idleDisplay.borrow(1, borrowedSlot);
    assert.equal(lease.actor.node, heroNode);
    assert.equal(heroNode.parent, borrowedSlot);
    lease.release();
    lease.release();
    idleDisplay.resume();
    assert.equal(heroNode.parent, home);
    assert.equal(gestures.at(-1), "run");
    const sceneView: any = new Node("IdleView").addComponent(MainChapterView);
    let returned = 0;
    sceneView.idleDisplay = idleDisplay;
    sceneView.stopIdleEncounter = () => returned++;
    sceneView.idleEncounterActive = true;
    sceneView.finishIdleEncounter();
    sceneView.finishIdleEncounter();
    assert.equal(returned, 1);
    assert.equal(sceneView.idleDisplay, idleDisplay);
    assert.equal(sceneView.idleEncounterActive, false);
    // 用户阵容布鲁：从实际配置经过旧覆盖到资源解析，避免只测固定验收英雄漏掉正常遇敌。
    const buffRows = JSON.parse(readFileSync("client/assets/resources/config/buff.json", "utf8")).rows;
    for (const id of [3011101, 3011102, 3011103]) {
        const row = buffRows.find((value: { idx: number }) => value.idx === id);
        const actions = BattleAttackUtils.legacyActions(row);
        assert.equal(actions.length, 2);
        const melee = BattleAttackUtils.plan(actions[0]);
        const effect = BattleAttackUtils.plan(actions[1]);
        assert.equal(melee.melee, true);
        assert.equal(melee.effect, null);
        assert.equal(effect.onSource, true);
        assert.equal(effect.effect!.paths.length, 7);
        assert.equal(BattleAttackUtils.delaySeconds(actions[1]), 0.25);
    }
    for (const id of [2010100, 2011101, 2011102, 2011103]) {
        const row = buffRows.find((value: { idx: number }) => value.idx === id);
        assert.ok(row, "布鲁表现配置必须存在");
        const plan = BattleAttackUtils.plan(BattleAttackUtils.legacyActions(row)[0]);
        assert.equal(plan.projectile, id !== 2010100);
        assert.equal(plan.effect!.paths.length, id === 2010100 ? 14 : 4);
        assert.equal(plan.effect!.interval, 0.05);
        if (id === 2010100) {
            assert.equal(plan.effect!.scaleX, 4, "旧actions覆盖优先于buff基础缩放");
            assert.equal(plan.effect!.anchorX, 0.4);
        }
        for (const path of plan.effect!.paths) {
            readFileSync("client/assets/resources/" + path.replace("/spriteFrame", ".png"));
        }
    }
    assert.equal(BattleInfoUtils.mainChapterSkipVisible(), false, "旧主线配置禁止展示跳过，不能套用等级50条件直接开放");
    assert.equal(BattleInfoUtils.defaultTimeScale(), 1.5, "默认档不是图标上的数学1倍");
    assert.match(BattleInfoUtils.speedLockedNotice(), /VIP 1.*VIP 5/);
    // 确认与定时关闭可能同帧触发：实际onClose必须只通知一次并停止两个结算音源。
    const settlement: any = new Node("Settlement").addComponent(ChapterEndView);
    let closedSettlements = 0;
    let stoppedSounds = 0;
    let unscheduled = 0;
    settlement.released = false;
    settlement.args = { won: true, onClosed: () => closedSettlements++ };
    settlement.seconds = 4;
    settlement.closeHint = { string: "4 秒后关闭" };
    settlement.audio = { isValid: true, stop: () => stoppedSounds++ };
    settlement.mainAudio = { isValid: true, stop: () => stoppedSounds++ };
    settlement.unscheduleAllCallbacks = () => unscheduled++;
    settlement.finishOpen = () => {};
    settlement.close = () => settlement.onClose();
    for (let second = 1; second < 4; second++) {
        settlement.tickClose();
        assert.equal(closedSettlements, 0);
        assert.equal(settlement.closeHint.string, (4 - second) + " 秒后关闭");
    }
    settlement.tickClose();
    settlement.onClose();
    assert.equal(closedSettlements, 1);
    assert.equal(stoppedSounds, 2);
    assert.equal(unscheduled, 1);
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
    const historicalExperience = { beforeLevel: 1, beforeExp: 0, beforeThreshold: 100,
        afterLevel: 2, afterExp: 20, afterThreshold: 200 };
    controller.onNotify(Protocol.CHAPTER_CLAIM, { action: "SETTLED", battleId, state: original,
        rewards: [], experience: historicalExperience });
    assert.deepEqual(model.receipt!.experience, historicalExperience);
    assert.equal(model.state!.assetRevision, 8, "经验动画快照不能覆盖当前资产版本");
    const acceptedReceipt = model.receipt;
    assert.throws(() => controller.onNotify(Protocol.CHAPTER_CLAIM, { action: "SETTLED", battleId,
        state: original, rewards: [], experience: { ...historicalExperience, afterExp: -1 } }));
    assert.equal(model.receipt, acceptedReceipt, "非法经验必须拒绝整包，不先提交奖励");
    const oldUnits = [
        { unitId: 1, faction: 1, templateId: 10101001, level: 1, position: 1, initialHp: 10, maxHp: 10, finalHp: 10 },
        { unitId: 2, faction: 2, templateId: 10101001, level: 1, position: 1, initialHp: 10, maxHp: 10, finalHp: 0 },
    ];
    assert.equal(BattleReplayUtils.validateUnits(oldUnits)[0].totalDamage, null, "旧战报缺失统计不能当作零");
    assert.equal(BattleReplayUtils.validateUnits(oldUnits)[0].totalRecovery, null);
    assert.equal(BattleReplayUtils.validateUnits([{ ...oldUnits[0], totalRecovery: -25, star: 5 }, oldUnits[1]])[0].totalRecovery, -25);
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], totalRecovery: Number.MAX_SAFE_INTEGER + 1 }, oldUnits[1]]));
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], star: 0 }, oldUnits[1]]));
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], totalDamage: -1 }, oldUnits[1]]));
    const ranked = [{ ...oldUnits[0], totalDamage: 70 }, { ...oldUnits[0], unitId: 3, totalDamage: 70 },
        { ...oldUnits[1], totalDamage: 999 }];
    assert.equal(ChapterSettlementUtils.highestDamage(ranked)!.unitId, 1, "同伤害保持名册顺序且不选敌方");
    const statisticUnits = [
        { ...oldUnits[0], totalDamage: 20, totalTakenDamage: 8, totalRecovery: 100 },
        { ...oldUnits[0], unitId: 3, totalDamage: 0, totalTakenDamage: 0, totalRecovery: -5 },
        { ...oldUnits[1], totalDamage: 40, totalTakenDamage: 4, totalRecovery: 200 },
    ];
    const statisticRows = BattleStatisticsUtils.rows(statisticUnits);
    assert.equal(statisticRows.length, 3, "重复模板不能合并");
    assert.deepEqual(statisticRows[0].damage, { value: 20, ratio: 0.5 }, "最大值跨双方计算");
    assert.deepEqual(statisticRows[0].taken, { value: 8, ratio: 1 });
    assert.deepEqual(statisticRows[0].recovery, { value: 100, ratio: 0.5 });
    assert.deepEqual(statisticRows[1].recovery, { value: -5, ratio: 0 });
    const missingRows = BattleStatisticsUtils.rows([statisticUnits[0], { ...statisticUnits[2], totalRecovery: null }]);
    assert.deepEqual(missingRows[0].recovery, { value: 100, ratio: 0 }, "缺失一方时不伪造完整比例");
    assert.deepEqual(missingRows[1].recovery, { value: null, ratio: 0 });
    assert.deepEqual(BattleStatisticsUtils.rows([{ ...statisticUnits[0], totalRecovery: 0 }])[0].recovery, { value: 0, ratio: 0 });
    assert(Object.isFrozen(statisticRows) && Object.isFrozen(statisticRows[0]));
    assert.equal(ChapterSettlementUtils.highestDamage(oldUnits), null);
    const multiLevel = { beforeLevel: 1, beforeExp: 100, beforeThreshold: 120, afterLevel: 3, afterExp: 120, afterThreshold: 720 };
    assert.deepEqual(ChapterSettlementUtils.experienceFrame(multiLevel, 0, () => 360),
        { level: 1, exp: 100, threshold: 120, ratio: 100 / 120 });
    assert.equal(ChapterSettlementUtils.experienceFrame(multiLevel, 0.5, () => 360).level, 2);
    assert.deepEqual(ChapterSettlementUtils.experienceFrame(multiLevel, 1, () => 360),
        { level: 3, exp: 120, threshold: 720, ratio: 1 / 6 });
    assert.throws(() => ChapterSettlementUtils.experienceFrame(multiLevel, 0.5, () => 0));
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
            for (const unit of BattleReplayUtils.units(model.replay!.bytes)) {
                assert.equal(typeof unit.totalDamage, "number");
                assert.equal(typeof unit.totalTakenDamage, "number");
                assert.equal(typeof unit.totalRecovery, "number");
                assert.equal(typeof unit.star, "number");
            }
            ProtocolRouter.instance.dispatch(live, read("claimed"));
            const current = model.state;
            ProtocolRouter.instance.dispatch(live, read("receipt"));
            assert.equal(model.state, current);
            assert.equal(model.state!.pendingBattleId, null);
            assert(model.receipt!.rewards.length > 0);
            assert(model.receipt!.experience);
            assert(model.receipt!.experience!.afterLevel >= model.receipt!.experience!.beforeLevel);
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
    const originalStopTween = Tween.stopAllByTarget;
    // 此段只断言重排几何；动画中断及播放效果另在Creator实测，不把替身当作引擎验收。
    Tween.stopAllByTarget = () => {};
    rewardView.panel = new Node("Panel");
    rewardView.panel.parent = rewardNode;
    for (const name of ["PalaceBackground", "PalaceFloor"]) {
        const background = new Node(name);
        background.parent = rewardNode;
        background.addComponent(UITransform);
    }
    try {
        const result: any = new Node("Result").addComponent(ChapterEndView);
        result.panel = new Node("Panel");
        result.panel.parent = result.node;
        result.backdrop = new Node("Backdrop");
        result.backdrop.parent = result.node;
        result.backdrop.addComponent(UITransform);
        for (const [width, height] of [[360, 720], [360, 840], [393, 852], [768, 1024], [852, 393], [393, 852]]) {
            const visibleWidth = width / height * 1280;
            screenView.getVisibleSize = () => ({ width: visibleWidth, height: 1280 });
            rewardView.fitViewport();
            assert(rewardView.panel.scale.x * 620 <= visibleWidth - 24 + 0.001);
            assert.equal(rewardNode.getChildByName("PalaceFloor")!.getComponent(UITransform)!.contentSize.width, visibleWidth);
            result.fitViewport();
            assert(result.panel.scale.x * 640 <= visibleWidth - 24 + 0.001);
            assert.equal(result.panel.scale.x, result.panel.scale.y, "主体不能横向挤压");
            assert.equal(result.panel.position.x, -320 * result.panel.scale.x, "结算原点随等比缩放保持居中");
            assert.equal(result.backdrop.getComponent(UITransform).contentSize.width, visibleWidth);
        }
        result.mainVictoryPanel = result.panel;
        result.mainVictoryPanel.active = true;
        for (const [width, height] of [[360, 720], [360, 840], [393, 852], [768, 1024], [393, 852]]) {
            const visibleWidth = width / height * 1280;
            screenView.getVisibleSize = () => ({ width: visibleWidth, height: 1280 });
            result.fitViewport();
            assert(result.panel.scale.x * 640 <= visibleWidth - 24 + 0.001);
            assert.equal(result.panel.position.y, -365 * result.panel.scale.x, "旧胜利页使用独立高度居中，重复重排不累积偏移");
        }
    } finally {
        screenView.getVisibleSize = originalVisibleSize;
        Tween.stopAllByTarget = originalStopTween;
    }
    // 正常战斗完成自动结算；历史重播、失败及关闭后均不发起领奖。
    const originalClaim = MainChapterController.instance.claim;
    const originalUiOpen = UIManager.instance.open;
    const originalUnits = BattleReplayUtils.units;
    // 此段只测试结算调度；真实二进制统计由上面的Java→TS互通检查验证。
    BattleReplayUtils.units = () => ranked;
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
        BattleReplayUtils.units = originalUnits;
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
