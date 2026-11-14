/** 主线客户端回归：初始化、历史回执不倒退资产、未知结果原键重试、身份切换不被旧请求复活。 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { MainChapterHeroTalk } from "../assets/scripts/features/battle/ui/MainChapterHeroTalk";

/** 离线展示帧按Bundle的实际meta目录读取，客户端仍用原包名/包内路径。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
import { IdleChestUtils } from "../assets/scripts/features/battle/utils/IdleChestUtils";
import { ChapterRewardInfoUtils } from "../assets/scripts/features/battle/utils/ChapterRewardInfoUtils";
import { ChapterRewardInfoCell } from "../assets/scripts/features/battle/ui/ChapterRewardInfoCell";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent, SuperLayout } from "../assets/scripts/framework/ui/SuperContent";
import { MainChapterIdleDisplay } from "../assets/scripts/features/battle/ui/MainChapterIdleDisplay";
import { HeroTalkUtils } from "../assets/scripts/features/battle/utils/HeroTalkUtils";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { Button, Label, Mask, Node, Prefab, SpriteFrame, Tween, UITransform, view as screenView } from "cc";
import { MainChapterView } from "../assets/scripts/features/battle/ui/MainChapterView";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";
import { MainChapterBattleView } from "../assets/scripts/features/battle/ui/MainChapterBattleView";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { ChapterEndView } from "../assets/scripts/features/battle/ui/ChapterEndView";
import { BattleInfoUtils } from "../assets/scripts/features/battle/utils/BattleInfoUtils";
import { ChapterSettlementUtils } from "../assets/scripts/features/battle/utils/ChapterSettlementUtils";
import { BattleHeroStarView } from "../assets/scripts/features/battle/ui/BattleHeroStarView";
import { Sprite } from "cc";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { BattleStatisticsUtils } from "../assets/scripts/features/battle/utils/BattleStatisticsUtils";
import { BattleAttackUtils } from "../assets/scripts/features/battle/utils/BattleAttackUtils";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";
import { GameProtocolCodecUtils, GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";
import { GameLog } from "../assets/scripts/core/GameLog";
const battleId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const original = { maxCleared: 1, pendingBattleId: battleId, assetRevision: 3 };
const latest = { maxCleared: 2, assetRevision: 8 };
/** 构造真实方向信封，经生成编码往返，不直接绕过协议约束。 */
function frame(name: string, body: unknown, kind = "response"): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({ version: 1, name, kind, ...(kind === "response" ? {ok: true} : {}), body }));
}

/** 构造包含普通与碎片必需绑定的物品格替身，真实布局及资源绑定另由Prefab专项检查。 */
function rewardItemNode(): Node {
    const node = new Node("RewardItem");
    node.addComponent(UITransform).setContentSize(96, 96);
    const cell = node.addComponent(BagItemView);
    cell.emptyFrame = new SpriteFrame();
    cell.button = node.addComponent(Button);
    cell.frame = new Node("Frame");
    cell.frame.parent = node;
    cell.frame.addComponent(Sprite);
    cell.icon = new Node("Icon");
    cell.icon.parent = node;
    cell.icon.addComponent(Sprite);
    cell.shardIcon = new Node("ShardIcon");
    cell.shardIcon.parent = node;
    cell.shardIcon.addComponent(Sprite);
    cell.shardCorner = new Node("ShardCorner");
    cell.shardCorner.parent = node;
    cell.shardStars = Array.from({ length: 5 }, (_, index) => {
        const star = new Node("ShardStar" + (index + 1));
        star.parent = node;
        return star;
    });
    cell.shardProgress = new Node("ShardProgress");
    cell.shardProgress.parent = node;
    cell.shardProgressFill = new Node("ShardProgressFill").addComponent(Sprite);
    cell.shardProgressFill.node.parent = cell.shardProgress;
    cell.shardProgressLabel = new Node("ShardProgressLabel").addComponent(Label);
    cell.shardProgressLabel.node.parent = cell.shardProgress;
    cell.count = new Node("Count").addComponent(Label);
    cell.count.node.parent = node;
    cell.selectMark = new Node("Selected");
    cell.selectMark.parent = node;
    return node;
}

/** 产物行复用后选择当前关卡物品，停用解除内部事件，重新显示不叠加详情入口。 */
function checkRewardRowEvents(): void {
    const owner = new Node("StageContent");
    const node = new Node("RewardRow");
    node.parent = owner;
    const row = node.addComponent(ChapterRewardInfoCell);
    row.title = new Node("StageTitle").addComponent(Label);
    row.title.node.parent = node;
    const scrollNode = new Node("Items");
    scrollNode.parent = node;
    scrollNode.addComponent(UITransform).setContentSize(192, 96);
    row.items = scrollNode.addComponent(SuperScroll);
    const port = new Node("view");
    port.parent = scrollNode;
    port.addComponent(UITransform).setContentSize(192, 96);
    port.addComponent(Mask);
    const content = new Node("content");
    content.parent = port;
    content.addComponent(UITransform).setContentSize(192, 96);
    row.items.content = content;
    const list = content.addComponent(SuperContent);
    list.layoutType = SuperLayout.Horizontal;
    const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
    prefab.data = rewardItemNode();
    prefab._instantiate = rewardItemNode;
    list.cellPrefab = prefab;
    row.items.onEnable();
    const picked: number[] = [];
    owner.on(ChapterRewardInfoCell.ITEM_SELECTED, (id: number) => picked.push(id));
    const original = ResManager.setSprite;
    ResManager.setSprite = () => {};
    try {
        row.bind(1, [900401, 900001]);
        content.children[0].emit(Button.EventType.CLICK);
        assert.deepEqual(picked, [900401]);
        row.items.restorePosition({ x: 96, y: 0 } as any);
        row.bind(850, [900001]);
        assert.equal(row.title.string, "关卡850");
        assert.equal(row.items.readPosition().x, 0, "行复用重置横向起点");
        content.children[0].emit(Button.EventType.CLICK);
        assert.deepEqual(picked, [900401, 900001], "复用后的点击只读取当前物品");
        (row as any).onDisable();
        content.emit(SuperContent.SELECT_ITEM, 900401);
        assert.equal(picked.length, 2, "隐藏行不再向页面报告物品选择");
        row.bind(2, [900401]);
        content.children[0].emit(Button.EventType.CLICK);
        assert.deepEqual(picked, [900401, 900001, 900401], "重新显示只登记一次选择");
        (row as any).onDisable();
        (row as any).onEnable();
        content.children[0].emit(Button.EventType.CLICK);
        assert.deepEqual(picked, [900401, 900001, 900401, 900401], "同一行临时停用后恢复当前数据和单次选择");
    } finally {
        (row as any).onDisable();
        ResManager.setSprite = original;
        owner.destroy();
    }
}
/** 核对战斗按钮每种不可操作状态有清晰文案；阶段上限不影响旧请求/待结算恢复，也不误开第四关布阵。 */
async function checkChallengeButtonAvailability(page: any): Promise<void> {
    const model = MainChapterModel.instance;
    const before = { state: model.state, requestId: model.requestId, busy: model.busy,
        message: model.message, playing: page.playing, closed: page.closed };
    const originalOpen = UIManager.instance.openById;
    const originalToast = UIManager.instance.toast;
    const originalChallenge = page.challenge;
    const openings: { id: string; args: any }[] = [];
    const notices: string[] = [];
    let recoveries = 0;
    try {
        UIManager.instance.openById = (async (id: string, args: unknown) => {
            openings.push({ id, args });
        }) as typeof UIManager.instance.openById;
        UIManager.instance.toast = text => notices.push(text);
        page.challenge = async () => { recoveries++; };
        page.closed = false;
        page.playing = false;
        model.busy = false;
        model.message = "";
        model.requestId = null;
        for (const maxCleared of [0, 2]) {
            model.state = { maxCleared, pendingBattleId: null, assetRevision: 1 };
            page.render();
            assert.equal(page.challengeButton.interactable, true, "开放范围内仍允许出战确认");
            assert.equal(page.challengeLabel.string, "战斗");
            await page.prepareChallenge();
        }
        assert.equal(openings.length, 2);
        assert(openings.every(row => row.id === "remake-formation" && row.args.closeAfterSave
            && typeof row.args.complete === "function"), "正常挑战进入实际阵容确认流程");
        model.state = { maxCleared: 3, pendingBattleId: null, assetRevision: 1 };
        page.render();
        assert.equal(page.challengeLabel.string, "已通关", "封顶不能仍显示普通战斗文案而无响应");
        assert.equal(page.challengeButton.interactable, false, "不因修复点击体验而开放第四关");
        assert.equal(page.statusLabel.string, "当前开放的前三关已全部通关");
        await page.prepareChallenge();
        assert.equal(openings.length, 2, "迟到点击也不误开已超范围的布阵");
        assert.deepEqual(notices, ["当前开放的前三关已全部通关"]);
        model.state = { ...model.state, pendingBattleId: "11111111-1111-4111-8111-111111111111" };
        page.render();
        assert.equal(page.challengeLabel.string, "恢复战斗");
        assert.equal(page.challengeButton.interactable, true, "第三关待结算仍可恢复");
        await page.prepareChallenge();
        model.state = { ...model.state, pendingBattleId: null };
        model.requestId = "22222222-2222-4222-8222-222222222222";
        page.render();
        assert.equal(page.challengeLabel.string, "确认挑战");
        assert.equal(page.challengeButton.interactable, true, "结果未知时仍保留原编号确认入口");
        await page.prepareChallenge();
        assert.equal(recoveries, 2, "恢复原操作，不再开启新阵容确认或第四关");
        model.busy = true;
        page.render();
        assert.equal(page.challengeLabel.string, "处理中");
        assert.equal(page.challengeButton.interactable, false);
        await page.prepareChallenge();
        model.busy = false;
        model.requestId = null;
        model.state = null;
        page.render();
        assert.equal(page.challengeLabel.string, "等待同步");
        assert.equal(page.challengeButton.interactable, false);
        await page.prepareChallenge();
        model.state = { maxCleared: 2, pendingBattleId: null, assetRevision: 1 };
        page.playing = true;
        page.render();
        assert.equal(page.challengeLabel.string, "战斗中");
        assert.equal(page.challengeButton.interactable, false);
        await page.prepareChallenge();
        assert.equal(openings.length, 2);
        assert.equal(recoveries, 2, "同步/忙碌/播放期均不重复发起操作");
        page.playing = false;
        model.message = "当前阵容技能尚未支持，请调整阵容";
        page.render();
        page.render();
        assert.equal(notices.filter(text => text === model.message).length, 1, "主线失败只飘字一次");
        assert(!page.statusLabel.string.includes(model.message), "固定主线状态不承载操作错误");
        model.busy = true;
        page.render();
        model.busy = false;
        page.render();
        assert.equal(notices.filter(text => text === model.message).length, 2, "新操作允许反馈同一失败");
    } finally {
        UIManager.instance.openById = originalOpen;
        UIManager.instance.toast = originalToast;
        page.challenge = originalChallenge;
        model.state = before.state;
        model.requestId = before.requestId;
        model.busy = before.busy;
        model.message = before.message;
        page.playing = before.playing;
        page.closed = before.closed;
    }
}

/** 验证可选领取能力的严格已知格式、未来格式降级、深冻结及整包失败不覆盖当前主线状态。 */
function checkIdleClaimStateProjection(): void {
    const chapter = { maxCleared: 1, pendingBattleId: null, assetRevision: 7 };
    const idle = { serverTime: 1000, startedAt: 900, maxSeconds: 43200, frequency: 60,
        rewardStage: 1, rates: [{ itemId: 900001, quantity: 10 }] };
    const beforeLog = GameLog.shared;
    const log = new GameLog();
    log.mirrorConsole = false;
    GameLog.shared = log;
    try {
        assert.equal(MainChapterController.readIdle(idle, chapter)!.claimState, undefined);
        for (const requestMode of ["READ_ONLY", "ENABLED"]) {
            const claimState = { schemaVersion: 1, operationVersion: Number.MAX_SAFE_INTEGER, requestMode };
            const projected = MainChapterController.readIdle({ ...idle, claimState }, chapter)!;
            assert.deepEqual(projected.claimState, claimState);
            assert(Object.isFrozen(projected.claimState));
            assert.notEqual(projected.claimState, claimState);
            claimState.operationVersion = 1;
            assert.equal(projected.claimState!.operationVersion, Number.MAX_SAFE_INTEGER);
        }
        for (const claimState of [null, [], {},
            { schemaVersion: 1, operationVersion: 0, requestMode: "READ_ONLY" },
            { schemaVersion: 1, operationVersion: "1", requestMode: "READ_ONLY" },
            { schemaVersion: 1, operationVersion: Number.MAX_SAFE_INTEGER + 1, requestMode: "READ_ONLY" },
            { schemaVersion: 1, operationVersion: 1, requestMode: "UNSPECIFIED" },
            { schemaVersion: 1, operationVersion: 1 },
        ]) {
            assert.throws(() => MainChapterController.readIdle({ ...idle, claimState }, chapter));
        }
        for (const schemaVersion of [0, 2, 2]) {
            const projected = MainChapterController.readIdle({ ...idle,
                claimState: { schemaVersion, operationVersion: 1, requestMode: "ENABLED" } }, chapter)!;
            assert.equal(projected.claimState, undefined, "未来未知领取格式只能保持只读");
            assert.equal(projected.startedAt, idle.startedAt, "领取能力降级不能抹掉原有挂机时钟");
        }
        const warnings = log.recent().filter(line => line.tag === "MainChapterController");
        assert.equal(warnings.length, 2, "同来源同未知格式只记录一次");
        assert(warnings.every(line => line.layer === "MODULE" && line.level === "warn"));

        const model = new MainChapterModel();
        const controller = new MainChapterController(model);
        controller.onNotify(Protocol.STATE_CHANGED, { revision: 7, mainChapter: chapter,
            mainChapterIdle: { ...idle, claimState: { schemaVersion: 1, operationVersion: 3, requestMode: "READ_ONLY" } } });
        const acceptedIdle = model.idle;
        const acceptedState = model.state;
        assert.throws(() => controller.onNotify(Protocol.STATE_CHANGED, { revision: 8,
            mainChapter: { ...chapter, assetRevision: 8 }, mainChapterIdle: { ...idle,
                claimState: { schemaVersion: 1, operationVersion: 0, requestMode: "ENABLED" } } }));
        assert.equal(model.idle, acceptedIdle);
        assert.equal(model.state, acceptedState);
    } finally {
        GameLog.shared = beforeLog;
    }
}

/** 只测试当前模块的状态、领取能力只读投影、按钮边界和展示；完整资产绑定另由session-state回归覆盖。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkIdleClaimStateProjection();
    const rewardInfo = ChapterRewardInfoUtils.rows(JSON.parse(readFileSync(
        "client/assets/bundles/resources/config/chapterreward.json", "utf8")));
    assert.equal(rewardInfo.length, 850, "说明配置投影不得静默截断旧关卡");
    assert.deepEqual(rewardInfo[0].firstItems, [900401, 900001, 900003, 900101, 900102, 20204004, 1004001]);
    assert.deepEqual(rewardInfo[0].idleItems, [900001, 900003, 900101, 900002, 900102, 20005000, 1001001, 2000001]);
    const duplicateItems = { idx: 1, first_reward: '[{"item_type":1},{"item_type":1}]',
        reward_base: '[{"item_type":2},{"item_type":1}]', reward_unique: '[{"type":1},{"type":3}]' };
    assert.deepEqual(ChapterRewardInfoUtils.rows({ rows: [duplicateItems] })[0].idleItems, [2, 1, 3]);
    assert.deepEqual(ChapterRewardInfoUtils.rows({ rows: [duplicateItems] })[0].firstItems, [1, 1]);
    assert.throws(() => ChapterRewardInfoUtils.rows({ rows: [duplicateItems, duplicateItems] }));
    assert.throws(() => ChapterRewardInfoUtils.rows({ rows: [{ ...duplicateItems, reward_unique: null }] }));
    checkRewardRowEvents();
    // 旧版先取整百分比；2.9%仍属于第一档，不能提前升级宝箱。
    for (const [seconds, expected] of [[0, 1], [20, 1], [29, 1], [30, 2],
        [50, 2], [59, 2], [60, 3], [100, 3], [109, 3], [110, 4], [1000, 4]]) {
        assert.equal(IdleChestUtils.stage(seconds, 1000), expected);
    }
    assert.equal(IdleChestUtils.showBubble(600), false);
    assert.equal(IdleChestUtils.showBubble(601), true);
    assert.equal(IdleChestUtils.elapsed(1000, 900, 21600, 5000, 4000), 100);
    assert.equal(IdleChestUtils.elapsed(1000, 900, 21600, 5000, 99999999), 21600);
    assert.equal(IdleChestUtils.time(21600), "06:00");
    assert.throws(() => IdleChestUtils.stage(0, 0));
    assert.equal(IdleChestUtils.percentage(29, 1000), 2);
    assert.equal(IdleChestUtils.percentage(-10, 1000), 0);
    assert.equal(IdleChestUtils.percentage(2000, 1000), 100);
    const firstFlight = IdleChestUtils.flights(() => 0);
    const lastFlight = IdleChestUtils.flights(() => 0.999999);
    assert.equal(firstFlight.length, 8);
    assert.equal(lastFlight.length, 12);
    assert.deepEqual(firstFlight[0], { icon: 0, order: 1000, scale: 0.605, x: -49, y: -49, scaleSeconds: 0.905 });
    assert.deepEqual(lastFlight[0], { icon: 3, order: 10000, scale: 0.8, x: 50, y: 50, scaleSeconds: 1 });
    const chestResource = JSON.parse(readFileSync("client/assets/bundles/resources/spine/res-block.json", "utf8"));
    for (const stage of [1, 2, 3, 4]) {
        assert(chestResource.animations["normal-" + stage], "宝箱档位必须有真实旧动画");
    }
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
    // 模拟Creator延迟销毁：归还时home仍有效，也不得重挂到即将销毁的行军树。
    (heroNode as any).position = { x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0 }) };
    const closingLease = idleDisplay.borrow(1, borrowedSlot);
    const destroyIdleRoot = idleRoot.destroy.bind(idleRoot);
    idleRoot.destroy = () => {};
    sceneView.stopIdleEncounter = () => closingLease.release();
    sceneView.clearIdleDisplay();
    closingLease.release();
    assert.equal(home.isValid, true);
    assert.equal(heroNode.parent, borrowedSlot, "关页归还不得向待销毁站位提交引擎排序请求");
    idleRoot.destroy = destroyIdleRoot;
    idleRoot.destroy();
    borrowedSlot.destroy();
    // 用户阵容布鲁：从实际配置经过旧覆盖到资源解析，避免只测固定验收英雄漏掉正常遇敌。
    const buffRows = JSON.parse(readFileSync("client/assets/bundles/resources/config/buff.json", "utf8")).rows;
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
            readFileSync(resolveBundleFile(path.replace("/spriteFrame", ".png")));
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
    // 跨级动画直接查当前已安装的等级行，不依赖开窗时复制的等级Map。
    const experienceView: any = new Node("ExperienceResult").addComponent(ChapterEndView);
    experienceView.panel = new Node("ExperiencePanel");
    for (const name of ["RoleLevel", "RoleExperience", "ExperienceFill"]) {
        const child = new Node(name);
        child.parent = experienceView.panel;
        child.addComponent(name === "ExperienceFill" ? Sprite : Label);
    }
    experienceView.args = {
        experience: { beforeLevel: 1, beforeExp: 100, beforeThreshold: 120,
            afterLevel: 3, afterExp: 40, afterThreshold: 720 },
    };
    const readFile = GameConfig.instance.getFileByPath;
    let middleThreshold = 360;
    let thresholdReads = 0;
    GameConfig.instance.getFileByPath = path => {
        assert.equal(path, "config/mainlevel");
        thresholdReads++;
        return { rows: [{ level: 2, exp: middleThreshold }] };
    };
    try {
        experienceView.paintExperience(0.5);
        assert.equal(experienceView.panel.getChildByName("RoleLevel").getComponent(Label).string, "Lv 2");
        assert.equal(experienceView.panel.getChildByName("RoleExperience").getComponent(Label).string, "190/360");
        middleThreshold = 600;
        experienceView.paintExperience(0.5);
        assert.equal(experienceView.panel.getChildByName("RoleExperience").getComponent(Label).string, "310/600",
            "后续绘制使用唯一仓库当前结果，不读取旧页面索引");
        assert.equal(thresholdReads, 2);
    } finally {
        GameConfig.instance.getFileByPath = readFile;
        experienceView.node.destroy();
    }
    const destroyedSettlement: any = new Node("DestroyedSettlement").addComponent(ChapterEndView);
    destroyedSettlement.released = false;
    destroyedSettlement.unscheduleAllCallbacks = () => {};
    destroyedSettlement.panel = { isValid: false, getComponent: () => { throw new Error("已销毁子节点不能查询组件"); } };
    destroyedSettlement.audio = { isValid: false, stop: () => { throw new Error("已销毁音源不能停止"); } };
    destroyedSettlement.mainAudio = destroyedSettlement.audio;
    let destroyedClosed = 0;
    destroyedSettlement.args = { onClosed: () => destroyedClosed++ };
    destroyedSettlement.onClose();
    destroyedSettlement.onClose();
    assert.equal(destroyedClosed, 1, "子节点先销毁时仍安全且只通知关闭一次");
    const talkRows = [{ level_min: 1, level_max: 300, lan: 70901 }];
    const talkLanguage = new Map([[70901, "旧文案"]]);
    const readTalkLanguage = (id: number) => talkLanguage.get(id);
    assert.deepEqual(HeroTalkUtils.candidates(1, talkRows, readTalkLanguage), []);
    assert.deepEqual(HeroTalkUtils.candidates(300, talkRows, readTalkLanguage), []);
    assert.deepEqual(HeroTalkUtils.candidates(2, talkRows, readTalkLanguage), ["旧文案"]);
    assert.deepEqual(HeroTalkUtils.candidates(2, talkRows, () => undefined), []);
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
    controller.resetSession();
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
    assert.equal(BattleReplayUtils.validateUnits(oldUnits)[0].portraitIconId, null);
    const portraitUnit = BattleReplayUtils.validateUnits([{ ...oldUnits[0], portraitIconId: 20101001 }, oldUnits[1]])[0];
    assert.equal(portraitUnit.portraitIconId, 20101001);
    assert.ok(BattleStatisticsUtils.portrait(portraitUnit)?.endsWith("hero-icon_20101001"));
    assert.equal(BattleStatisticsUtils.portrait(oldUnits[0]), null);
    const evolutionRows = JSON.parse(readFileSync("client/assets/bundles/resources/config/heroevolvelevel.json", "utf8")).rows;
    for (const row of evolutionRows) assert.ok(ResManager.portrait(row.evolve_icon_id), "进化头像必须收录：" + row.evolve_icon_id);
    assert.equal(BattleStatisticsUtils.stars(6).row, 5);
    assert.equal(BattleStatisticsUtils.stars(9).row, 8);
    assert.equal(BattleStatisticsUtils.stars(10).number, 0);
    assert.equal(BattleStatisticsUtils.stars(13).number, 3);
    assert.equal(BattleStatisticsUtils.stars(14).awakened, true);
    assert.equal(BattleStatisticsUtils.stars(null).row, -1);
    assert.throws(() => BattleStatisticsUtils.stars(15));
    assert.equal(BattleStatisticsUtils.starFrame(0.24), 2);
    assert.equal(BattleStatisticsUtils.starFrame(2.5), 12);
    assert.equal(BattleStatisticsUtils.starFrame(3.061), 0);
    const starView = new BattleHeroStarView();
    starView.rows = Array.from({ length: 9 }, () => new Node());
    starView.numbers = Array.from({ length: 3 }, () => new Node());
    starView.highBadge = new Node(); starView.awakenedBadge = new Node();
    starView.border = new Node().addComponent(Sprite); starView.effect = new Node().addComponent(Sprite);
    starView.borders = Array.from({ length: 6 }, (_, id) => ({ id })) as any;
    starView.frames = Array.from({ length: 13 }, (_, id) => ({ id })) as any;
    starView.show(14); starView.update(0.24);
    assert.equal(starView.effect.spriteFrame, starView.frames[2]);
    assert.equal(starView.awakenedBadge.active, true);
    starView.show(11);
    assert.equal(starView.numbers[0].active, true);
    assert.equal(starView.awakenedBadge.active, false);
    starView.show(5); starView.update(1);
    assert.equal(starView.rows[4].active, true);
    assert.equal(starView.effect.node.active, false);
    assert.ok(starView.numbers.every(node => !node.active));
    starView.show(null);
    assert.ok(starView.rows.every(node => !node.active));

    assert.equal(BattleStatisticsUtils.portrait({ ...portraitUnit, portraitIconId: 900001 }), "hero/ui/hero-icon_900001");
    assert.equal(BattleStatisticsUtils.portrait({ ...portraitUnit, portraitIconId: 99999999 }), "hero/ui/hero-icon_99999999");
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], portraitIconId: 0 }, oldUnits[1]]));
    assert.equal(BattleReplayUtils.validateUnits([{ ...oldUnits[0], totalRecovery: -25, star: 5 }, oldUnits[1]])[0].totalRecovery, -25);
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], totalRecovery: Number.MAX_SAFE_INTEGER + 1 }, oldUnits[1]]));
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], star: 0 }, oldUnits[1]]));
    assert.throws(() => BattleReplayUtils.validateUnits([{ ...oldUnits[0], totalDamage: -1 }, oldUnits[1]]));
    const ranked = [{ ...oldUnits[0], totalDamage: 70 }, { ...oldUnits[0], unitId: 3, totalDamage: 70 },
        { ...oldUnits[1], totalDamage: 999 }];
    assert.equal(ChapterSettlementUtils.highestDamage(ranked)!.unitId, 1, "同伤害保持名册顺序且不选敌方");
    const appearanceSkins = JSON.parse(readFileSync("client/assets/bundles/resources/config/skin.json", "utf8")).rows;
    const appearanceEvolutions = JSON.parse(readFileSync("client/assets/bundles/resources/config/heroevolvelevel.json", "utf8")).rows;
    assert.equal(ChapterSettlementUtils.historicalSpine(null, appearanceSkins, appearanceEvolutions), null);
    assert.equal(ChapterSettlementUtils.historicalSpine(99999999, appearanceSkins, appearanceEvolutions), null);
    assert.equal(ChapterSettlementUtils.historicalSpine(20104004, appearanceSkins, appearanceEvolutions), "10104004");
    assert.equal(ChapterSettlementUtils.historicalSpine(20105004, appearanceSkins, appearanceEvolutions), "10105004");
    // 遍历真实进化配置，避免只验证两张头像；必须有对应骨骼与胜利页使用的stand动作。
    for (const row of appearanceEvolutions) {
        const stem = ChapterSettlementUtils.historicalSpine(row.evolve_icon_id, appearanceSkins, appearanceEvolutions);
        assert.equal(stem, String(row.evolve_fashion_id));
        const skeleton = JSON.parse(readFileSync("client/assets/bundles/resources/spine/" + stem + ".json", "utf8"));
        assert(skeleton.animations.stand, "历史进化骨骼必须具备stand动作：" + stem);
    }
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
        controller.resetSession();
    });
    await controller.challenge();
    assert.equal(model.state, null);
    assert.equal(model.requestId, null);
    assert.equal(model.busy, false);
    assert.equal(model.receipt, null);
    controller.dispose();
    if (process.argv.includes("--healing-wire")) {
        // 使用真实Java持久化战斗导出的二进制；破坏恢复量后必须拒绝，不能让错误血量进入播放。
        const bytes = new Uint8Array(readFileSync("client/temp/healing-review/replay.bin"));
        const steps = BattleReplayUtils.decode(bytes);
        const heals = steps.filter(step => step.kind === "recovery");
        assert(heals.some(step => step.actualHpChange! > 0));
        const report = mxzg.game.BattleReplay.decode(bytes);
        assert.equal(BattleReplayUtils.names(bytes).defender, "羽嘉森林2");
        const oldNames = mxzg.game.BattleReplay.decode(bytes);
        delete oldNames.attackerName;
        delete oldNames.defenderName;
        assert.deepEqual(BattleReplayUtils.names(mxzg.game.BattleReplay.encode(oldNames).finish()), { attacker: null, defender: null });
        oldNames.attackerName = "";
        assert.equal(BattleReplayUtils.names(mxzg.game.BattleReplay.encode(oldNames).finish()).attacker, "");
        oldNames.attackerName = "非法\n名称";
        assert.throws(() => BattleReplayUtils.names(mxzg.game.BattleReplay.encode(oldNames).finish()));
        const event = report.phases.flatMap(phase => phase.events).find(event => event.kind === "recovery")!;
        event.actualHpChange = 999999;
        assert.throws(() => BattleReplayUtils.decode(mxzg.game.BattleReplay.encode(report).finish()));
        const row = { idx: 2031101, type: 3, ani_base: "{}", file: "[]", sound: "[]", delay: 0, dimly: 0 };
        const actions = BattleAttackUtils.legacyActions(row);
        assert.equal(actions.length, 2);
        assert.equal(BattleAttackUtils.plan(actions[0]).effect, null);
        const effect = BattleAttackUtils.plan(actions[1]);
        assert.deepEqual(effect.battlefieldOffset, [0.6, 0.4]);
        assert.equal(effect.effect!.paths.length, 8);
        assert.equal(effect.effect!.interval, 0.1);
    }
    if (process.argv.includes("--wire")) {
        {
        const encounter = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-encounter.pb")));
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
            const read = (kind: string) => GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/chapter-" + kind + "-" + mission + ".pb")));
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
    await checkChallengeButtonAvailability(rewardView);
    shared.receipt = null;
    const idle = { serverTime: 1000, startedAt: 900, maxSeconds: 120, frequency: 5,
        rewardStage: shared.state!.maxCleared, rates: [{ itemId: 900001, quantity: 10 },
            { itemId: 900003, quantity: 3 }, { itemId: 900101, quantity: 4 }] };
    shared.idle = MainChapterController.readIdle(idle, shared.state);
    shared.idleReceivedAt = Date.now() - 60000;
    rewardView.renderIdle();
    assert.equal(rewardView.idleTimeLabel.string, "00:02", "后台恢复显示封顶时长，沿用旧版小时分钟格式");
    assert.equal(rewardView.goldRateLabel.string, "120/分", "周期收益换算为每分钟");
    for (const invalid of [{ ...idle, frequency: 0 }, { ...idle, rewardStage: 99 },
        { ...idle, rates: [idle.rates[0], idle.rates[0]] }, { ...idle, serverTime: NaN }]) {
        assert.throws(() => MainChapterController.readIdle(invalid, shared.state));
    }
    if (process.argv.includes("--wire")) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-snapshot.pb")));
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
    const originalNames = BattleReplayUtils.names;
    // 此段只测试结算调度；真实二进制统计由上面的Java→TS互通检查验证。
    BattleReplayUtils.units = () => ranked;
    BattleReplayUtils.names = () => ({ attacker: "开战昵称", defender: "羽嘉森林1" });
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
        assert.deepEqual(resultArgs.names, { attacker: "开战昵称", defender: "羽嘉森林1" });
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
        BattleReplayUtils.names = originalNames;
        shared.reset();
    }
    const chapterPrefab = JSON.parse(readFileSync("client/assets/bundles/module/battle/prefabs/MainChapterView.prefab", "utf8"));
    const chapterRoot = chapterPrefab[chapterPrefab[0].data.__id__];
    const children = chapterRoot._children.map((ref: any) => chapterPrefab[ref.__id__]._name);
    assert(children.indexOf("BattleHost") > children.indexOf("PalaceFloor"));
    assert(children.indexOf("BattleHost") < children.indexOf("Panel"), "战场必须位于底部面板之下");
    const fieldPrefab = JSON.parse(readFileSync("client/assets/bundles/module/battle/prefabs/MainChapterBattleView.prefab", "utf8"));
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
