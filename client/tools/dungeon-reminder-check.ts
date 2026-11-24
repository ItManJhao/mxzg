/**
 * 验证日常副本的红点资格、类型隔离、后台合并、首次读取恢复及挑战画面切换。
 * 使用真实控制器和路由，替换认证通道以控制交付顺序与连接失败。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, director, Director, Label, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { RedDotFixture } from "./RedDotFixture";
import { ApplicationRedDots } from "../assets/scripts/app/remake/ApplicationRedDots";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol } from "../assets/scripts/platform/Protocol";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { RulesView, type RulesArgs } from "../assets/scripts/features/common/ui/RulesView";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { DailyDungeonController } from "../assets/scripts/features/dungeon/DailyDungeonController";
import { DailyDungeonModel, type DailyDungeonStage, type DailyDungeonState } from "../assets/scripts/features/dungeon/DailyDungeonModel";
import { DungeonHallCardView, type DungeonHallCard } from "../assets/scripts/features/dungeon/ui/DungeonHallCardView";
import { GoldDungeonStageCell } from "../assets/scripts/features/dungeon/ui/GoldDungeonStageCell";
import { GoldDungeonView } from "../assets/scripts/features/dungeon/ui/GoldDungeonView";

/** 测试手动交付的一次已认证读取或写操作。 */
interface TestRequest {
    readonly name: AuthenticatedGameProtocol;
    readonly body: unknown;
    readonly received: (frame: GameFrame) => void;
    readonly failed: (error: unknown) => void;
}

const requests: TestRequest[] = [];
const operations = {
    /** 记录实际发送的协议，测试随后选择回包顺序。 */
    deliver(name: AuthenticatedGameProtocol, body: unknown, received: TestRequest["received"], failed: TestRequest["failed"]): Promise<void> {
        requests.push({ name, body, received, failed });
        return Promise.resolve();
    },
};
const controller = DailyDungeonController.instance;
const model = DailyDungeonModel.instance;
const manager = RedDotManager.instance;
const canPlay: DailyDungeonState = {
    stageId: 1, titleLanguageId: 10, wins: 0, freeLimit: 2, totalLimit: 5, nextCostDiamonds: 0,
    resetAtSeconds: 600, power: 5000, requiredPower: 3000, cleared: false, unlocked: true,
    canChallenge: true, rewardPreview: [],
};

/** 交付一份合约形状和真实协议名均匹配的确认状态。 */
function resolveList(request: TestRequest, state: DailyDungeonState,
    name: AuthenticatedGameProtocol = Protocol.DAILY_DUNGEON_LIST): void {
    assert.equal(request.name, name);
    assert.deepEqual(request.body, {});
    request.received({ version: 1, kind: "response", name: request.name, ok: true, body: state });
}

/** 查看底栏是否汇总了任一副本叶子的提醒。 */
function ready(): boolean {
    return manager.isVisible(GameRedDotKey.DUNGEON);
}

controller.configure(operations as unknown as AccountOperations, {
    /** 本专项不发放奖励。 */
    restoreActual() { assert.fail("提醒查询不能触发奖励反馈"); },
});
controller.initialize();
try {
    // 资格变化合并一次跟读，第一份旧结果不刷新红点或前台状态。
    controller.refreshReminder("gold");
    controller.refreshReminder("gold");
    assert.equal(controller.busy("gold"), false);
    assert.equal(requests.length, 1);
    resolveList(requests[0], { ...canPlay, canChallenge: false });
    assert.equal(requests.length, 2);
    assert.equal(model.stateFor("gold"), null);
    resolveList(requests[1], canPlay);
    assert.equal(model.stateFor("gold"), canPlay);
    assert.equal(ready(), true);

    // 打开前台不会挂在后台等回包；旧的免费次数不能覆盖之后的权威结果。
    controller.refreshReminder("gold");
    controller.setVisible("gold");
    assert.equal(requests.length, 4);
    assert.equal(controller.busy("gold"), true);
    resolveList(requests[2], canPlay);
    assert.equal(controller.busy("gold"), true);
    const paidOnly = { ...canPlay, wins: canPlay.freeLimit, nextCostDiamonds: 10 };
    resolveList(requests[3], paidOnly);
    assert.equal(model.stateFor("gold"), paidOnly);
    assert.equal(ready(), false);

    // 后台失败无前台等待。挑战断线时，只有原入口能再次提交同一命令。
    controller.setVisible(null);
    controller.refreshReminder("gold");
    requests[4].failed(new Error("后台读取失败"));
    assert.equal(controller.busy("gold"), false);
    assert.equal(model.stateFor("gold"), paidOnly);
    controller.challenge("gold", 1);
    assert.equal(requests[5].name, Protocol.DAILY_DUNGEON_CHALLENGE);
    requests[5].failed(new SocketFailure("DISCONNECTED"));
    controller.refreshReminder("gold");
    assert.equal(requests.length, 6);
    controller.setVisible("gold");
    assert.equal(requests[6].name, Protocol.DAILY_DUNGEON_CHALLENGE);
    assert.deepEqual(requests[6].body, requests[5].body);

    // 隔离账号切换后，即使通道还交付一份旧读取，也不能重新点亮入口。
    controller.resetSession();
    manager.reset();
    controller.refreshReminder("gold");
    controller.resetSession();
    resolveList(requests[7], canPlay);
    assert.equal(ready(), false);
    assert.equal(model.stateFor("gold"), null);
} finally {
    controller.dispose();
    manager.reset();
}

/** 第二关恢复只能确认原关，扫荡交付的新回包同时刷新整个金币列表的次数。 */
function checkStagesAndRecovery(): void {
    requests.length = 0;
    const stageOne: DailyDungeonStage = {
        stageId: 1, titleLanguageId: 2951, minimumLevel: 15, requiredPower: 1, ribbon: 1,
        cleared: false, unlocked: true, canChallenge: true, rewardPreview: [{ itemId: 900001, quantity: 100_000 }],
    };
    const stageTwo: DailyDungeonStage = {
        stageId: 2, titleLanguageId: 2952, minimumLevel: 15, requiredPower: 30_000, ribbon: 2,
        cleared: false, unlocked: false, canChallenge: false, rewardPreview: [{ itemId: 900001, quantity: 150_000 }],
    };
    const grants: string[] = [];
    controller.configure(operations as unknown as AccountOperations, {
        restoreActual(id) { grants.push(id); },
    });
    controller.initialize();
    try {
        controller.setVisible("gold");
        resolveList(requests[0], { ...canPlay, stages: [stageOne, stageTwo] });
        controller.challenge("gold", 2);
        assert.equal(requests.length, 1, "第二关未开时不发送挑战");

        const openOne = { ...stageOne, cleared: true };
        const openTwo = { ...stageTwo, unlocked: true, canChallenge: true };
        const next = { ...canPlay, power: 31_000, wins: 1, cleared: true, stages: [openOne, openTwo] };
        controller.refreshVisible();
        resolveList(requests[1], next);
        controller.challenge("gold", 2);
        const challenge = requests[2].body as { requestId: string; stageId: number; sweep: boolean };
        assert.equal(challenge.stageId, 2);
        assert.equal(challenge.sweep, false);
        requests[2].failed(new SocketFailure("DISCONNECTED"));
        assert.equal(controller.pendingStageId("gold"), 2);
        controller.challenge("gold", 1);
        assert.equal(requests.length, 3, "上一关按钮不能启动或串改在途挑战");
        controller.challenge("gold", 2);
        assert.deepEqual(requests[3].body, challenge);
        assert.throws(() => requests[3].received({
            kind: "response", version: 1, name: Protocol.DAILY_DUNGEON_CHALLENGE, ok: true,
            body: { ...challenge, state: { ...next, stageId: 1 } },
        }), /本次操作不符/);
        assert.equal(model.stateFor("gold"), next);
        requests[3].failed(new Error("拒绝操作"));

        const clearedTwo = { ...openTwo, cleared: true };
        resolveList(requests[4], { ...next, stages: [openOne, clearedTwo] });
        controller.challenge("gold", 2);
        const sweep = requests[5].body as { requestId: string; stageId: number; sweep: boolean };
        assert.equal(sweep.stageId, 2);
        assert.equal(sweep.sweep, true);
        const state = { ...next, stageId: 2, wins: 2, nextCostDiamonds: 50, stages: [openOne, clearedTwo] };
        requests[5].received({
            kind: "response", version: 1, name: Protocol.DAILY_DUNGEON_CHALLENGE, ok: true,
            body: { ...sweep, battleId: "sweep-two", state, assetRevision: 7 },
        });
        assert.equal(model.stateFor("gold")?.wins, 2);
        assert.deepEqual(model.stagesFor("gold"), [openOne, clearedTwo]);
        assert.deepEqual(grants, ["sweep-two"]);
        assert.equal(ready(), false, "两关共享免费次数，用完后同步熄灭入口");
    } finally {
        controller.dispose();
        manager.reset();
    }
}

/** 使用真实配置和应用红点接线，按指定服务器秒执行一次副本计时检查。 */
async function checkFirstReadRecovery(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    requests.length = 0;
    const account = new AccountModel();
    const role = { id: "dungeon-reminder-role", nickname: "副本红点检查", level: 1, gold: 0, diamonds: 0 };
    account.replace({ busy: false, role, error: "" });
    const clock = ServerClock.instance;
    const redDots = new ApplicationRedDots(account);
    const timer = redDots as unknown as { refreshDungeonIfNeeded(): void };
    const tick = (seconds: number): void => {
        clock.synchronize(seconds * 1_000);
        timer.refreshDungeonIfNeeded();
    };
    controller.configure(operations as unknown as AccountOperations, {
        restoreActual() { assert.fail("补读仅用于资格显示"); },
    });
    controller.initialize();
    try {
        clock.synchronize(100_000);
        redDots.setReady(true);
        tick(101);
        assert.equal(requests.length, 0, "未解锁时不请求金币副本状态");

        account.replace({ busy: false, role: { ...role, level: 16 }, error: "" });
        redDots.refreshSnapshot();
        assert.equal(requests.length, 1, "解锁后立即读取资格");
        tick(102);
        tick(103);
        requests[0].failed(new Error("首次资格读取失败"));
        assert.equal(requests.length, 1, "计时检查不为已有后台请求追加跟读");
        assert.equal(model.stateFor("gold"), null);
        assert.equal(ready(), false);

        tick(104);
        assert.equal(requests.length, 2, "无快照时在后台补读，玩家无需打开副本或重连");
        requests[1].failed(new Error("补读仍失败"));
        tick(163);
        assert.equal(requests.length, 2, "补读失败后在 60 秒窗口内不再次发包");
        tick(164);
        assert.equal(requests.length, 3);
        resolveList(requests[2], canPlay);
        assert.equal(model.stateFor("gold"), canPlay);
        assert.equal(ready(), true, "只在服务端确认资格后点亮红点");

        tick(canPlay.resetAtSeconds);
        assert.equal(requests.length, 3, "沿用零点边界，此秒资格仍有效");
        tick(canPlay.resetAtSeconds + 1);
        assert.equal(requests.length, 4, "跨日后及时复核资格");
        assert.equal(ready(), false, "过期资格先熄灭");
    } finally {
        redDots.dispose();
        controller.dispose();
        clock.invalidate();
    }
}

/** 切换五类副本时只刷新对应列表，原副本的断线命令和各类型红点保持独立。 */
function checkTypeIsolation(): void {
    requests.length = 0;
    const experience = { ...canPlay, rewardPreview: [{ itemId: 900101, quantity: 60_000 }] };
    const paidGold = { ...canPlay, wins: canPlay.freeLimit, nextCostDiamonds: 50 };
    controller.configure(operations as unknown as AccountOperations, {
        restoreActual() { assert.fail("本次只提交与恢复原挑战"); },
    });
    controller.initialize();
    try {
        controller.setVisible("gold");
        resolveList(requests[0], paidGold);
        controller.challenge("gold", 1);
        const original = requests[1].body;
        requests[1].failed(new SocketFailure("DISCONNECTED"));
        controller.setVisible("experience");
        resolveList(requests[2], experience, Protocol.EXPERIENCE_DUNGEON_LIST);
        assert.equal(model.stateFor("gold"), paidGold);
        assert.equal(model.stateFor("experience"), experience);
        assert.equal(controller.pendingStageId("gold"), 1);
        assert.equal(controller.pendingStageId("experience"), null);
        assert(!manager.isVisible(GameRedDotKey.GOLD_DUNGEON));
        assert(manager.isVisible(GameRedDotKey.EXPERIENCE_DUNGEON));
        assert(manager.isVisible(GameRedDotKey.DAILY_DUNGEON));
        controller.challenge("experience", 1);
        assert.equal(requests[3].name, Protocol.EXPERIENCE_DUNGEON_CHALLENGE);
        assert.notDeepEqual(requests[3].body, original);
        assert.equal((requests[3].body as { maxDiamonds: number }).maxDiamonds, 0);
        controller.setVisible("gold");
        assert.equal(requests[4].name, Protocol.DAILY_DUNGEON_CHALLENGE);
        assert.deepEqual(requests[4].body, original);
        const extraTypes = [
            { kind: "hero", name: Protocol.HERO_DUNGEON_LIST, path: GameRedDotKey.HERO_DUNGEON, item: 20_003_000 },
            { kind: "fetter", name: Protocol.FETTER_DUNGEON_LIST, path: GameRedDotKey.FETTER_DUNGEON, item: 901501 },
            { kind: "spirit", name: Protocol.SPIRIT_DUNGEON_LIST, path: GameRedDotKey.SPIRIT_DUNGEON, item: 901401 },
        ] as const;
        for (const [index, { kind, name, path, item }] of extraTypes.entries()) {
            controller.setVisible(kind);
            const state = { ...canPlay, rewardPreview: [{ itemId: item, quantity: 1 }] };
            resolveList(requests[index + 5], state, name);
            assert.equal(model.stateFor(kind), state);
            assert(manager.isVisible(path));
        }
        assert.equal(model.stateFor("gold"), paidGold);
        assert.equal(controller.pendingStageId("gold"), 1);
    } finally {
        controller.dispose();
        manager.reset();
    }
}

/** 实际复用卡只订阅当前可玩副本，清除旧条目并保留原手工布局。 */
async function checkCardReuse(): Promise<void> {
    const rows = JSON.parse(readFileSync("client/assets/bundles/module/dungeon/prefabs/DungeonHallCardView.prefab", "utf8"));
    const owner = rows.find((row: Record<string, unknown>) => row._reminderAnchor);
    const authored = rows[owner._reminderAnchor.__id__];
    assert.equal(authored._name, "DailyDungeonReminderAnchor");
    assert.equal(authored._active, true);
    assert.deepEqual([authored._lpos.x, authored._lpos.y], [276, 90.8]);
    assert.equal(authored._components.length, 1);
    const ui = rows[authored._components[0].__id__];
    assert.equal(ui.__type__, "cc.UITransform");
    assert.deepEqual([ui._contentSize.width, ui._contentSize.height], [28, 28]);

    const restoreRedDot = RedDotFixture.stubLoad();
    const root = new Node("Card");
    root.addComponent(Button);
    const anchor = new Node("DailyDungeonReminderAnchor");
    anchor.parent = root;
    anchor.addComponent(UITransform).setContentSize(28, 28);
    const card = root.addComponent(DungeonHallCardView);
    Object.assign(card, {
        enabledInHierarchy: true,
        _reminderAnchor: anchor,
        _cardArt: new Node().addComponent(Sprite),
        _descriptionLabel: new Node().addComponent(Label),
        _lockLabel: new Node().addComponent(Label),
        _lockOverlay: new Node(),
    });
    const playable: DungeonHallCard = { art: new SpriteFrame(), title: "日常副本", description: "", lockText: "",
        reminderPath: GameRedDotKey.DAILY_DUNGEON, rewards: [] };
    try {
        manager.set(GameRedDotKey.GOLD_DUNGEON, true);
        card.render(playable, () => {});
        // 资源还未返回，当前格已复用为锁定卡，不允许迟到后误亮。
        card.render({ ...playable, lockText: "尚未开放", reminderPath: undefined }, () => {});
        await Promise.resolve();
        assert.equal(anchor.getChildByName("RedDot"), null);
        card.render(playable, () => {});
        await Promise.resolve();
        const dot = anchor.getChildByName("RedDot")!;
        assert.equal(dot.active, true);
        Reflect.get(card, "onDisable").call(card);
        assert.equal(dot.active, false);
        manager.set(GameRedDotKey.GOLD_DUNGEON, false);
        manager.set(GameRedDotKey.GOLD_DUNGEON, true);
        assert.equal(dot.active, false, "离屏格不再响应旧红点路径");
        Reflect.get(card, "onEnable").call(card);
        assert.equal(anchor.getChildByName("RedDot"), dot, "回到视口使用已有实例");
        assert.equal(dot.active, true);
    } finally {
        Reflect.get(card, "onDestroy").call(card);
        assert.equal(anchor.children.length, 0);
        root.destroy();
        manager.reset();
        restoreRedDot();
    }
}

/** 验证五类导航的选中层、共用关卡卡片和当前条目的操作回调。 */
function checkStageCellReuse(): void {
    const directory = "client/assets/bundles/module/dungeon/prefabs/";
    const page = JSON.parse(readFileSync(directory + "GoldDungeonView.prefab", "utf8"));
    const cellAsset = JSON.parse(readFileSync(directory + "GoldDungeonStageCell.prefab.meta", "utf8"));
    const staticList = page.find((row: { cellPrefab?: { __uuid__: string } }) => row.cellPrefab);
    assert.equal(staticList.cellPrefab.__uuid__, cellAsset.uuid);
    const view = page.find((row: { _tabButtons?: unknown[] }) => row._tabButtons);
    const tabs = view._tabButtons.map((ref: { __id__: number }) => page[page[ref.__id__].node.__id__]);
    assert.deepEqual(tabs.map((tab: { _name: string }) => tab._name),
        ["GoldTabButton", "ExperienceTabButton", "HeroTabButton", "FetterTabButton", "SpiritTabButton"]);
    assert.deepEqual(tabs.map((tab: { _lpos: { x: number } }) => tab._lpos.x), [-240, -120, 0, 120, 240]);
    assert.equal(view._tabSelection.length, 5);
    const selectionMeta = JSON.parse(readFileSync(
        "client/assets/bundles/module/dungeon/ui/mission-cell-bg_icon-select.png.meta", "utf8"));
    const navigation = page[tabs[0]._parent.__id__];
    const panel = page[navigation._parent.__id__];
    const panelDrawOrder = panel._children.map((ref: { __id__: number }) => page[ref.__id__]._name);
    assert(panelDrawOrder.indexOf("DailyPanelArtwork") >= 0);
    assert(panelDrawOrder.indexOf("DailyTabsArtwork") > panelDrawOrder.indexOf("DailyPanelArtwork"),
        "选中光效允许伸到关卡面板边缘，不被面板遮住");
    const navDrawOrder = navigation._children.map((ref: { __id__: number }) => page[ref.__id__]);
    for (const [index, ref] of view._tabSelection.entries()) {
        const selection = page[ref.__id__];
        const tab = tabs[index];
        assert.equal(selection._active, index === 0, "初始只有金币页签选中");
        assert.equal(selection._parent.__id__, tab._parent.__id__);
        assert(navDrawOrder.indexOf(selection) >= 0 && navDrawOrder.indexOf(tab) > navDrawOrder.indexOf(selection),
            "光效置于页签图案后面，不覆盖入口图标和红点");
        assert.equal(selection._lpos.x, tab._lpos.x);
        assert.equal(selection._lpos.y, tab._lpos.y - 6);
        const components = selection._components.map((componentRef: { __id__: number }) => page[componentRef.__id__]);
        const transform = components.find((component: { __type__: string }) => component.__type__ === "cc.UITransform");
        const sprite = components.find((component: { __type__: string }) => component.__type__ === "cc.Sprite");
        assert.equal(sprite._spriteFrame.__uuid__, selectionMeta.uuid + "@f9941");
        assert.equal(transform._contentSize.width, selectionMeta.subMetas.f9941.userData.rawWidth);
        assert.equal(transform._contentSize.height, selectionMeta.subMetas.f9941.userData.rawHeight);
    }
    assert.equal(view._bannerFrames.length, 5);
    assert.equal(view._tabLocks.length, 5);
    assert.equal(view._battleFrames.length, 5);
    for (const [index, mapId] of [31, 32, 36, 38, 39].entries()) {
        const map = JSON.parse(readFileSync(`client/assets/bundles/resources/chapter/ui/map${mapId}.jpg.meta`, "utf8"));
        assert.equal(view._battleFrames[index].__uuid__, map.uuid + "@f9941");
        assert(tabs[index]._children.some((ref: { __id__: number }) => ref.__id__ === view._tabLocks[index].__id__));
    }
    const count = page[view._countLabel.__id__];
    const countNode = page[count.node.__id__];
    const rules = page[view._rulesButton.__id__];
    const rulesNode = page[rules.node.__id__];
    const rulesComponents = rulesNode._components.map((ref: { __id__: number }) => page[ref.__id__]);
    const buttonFrame = JSON.parse(readFileSync("client/assets/bundles/module/common/ui/button_btn-info-4.png.meta", "utf8"));
    const rulesTransform = rulesComponents.find((row: { __type__: string }) => row.__type__ === "cc.UITransform");
    assert.equal(rules.__type__, "cc.Button");
    assert.equal(rulesComponents.find((row: { __type__: string }) => row.__type__ === "cc.Sprite")._spriteFrame.__uuid__,
        `${buttonFrame.uuid}@f9941`, "金色说明入口沿用旧版图标");
    assert.equal(count._horizontalAlign, 2, "数字右对齐");
    assert.equal(countNode._lpos.y, rulesNode._lpos.y, "说明与次数同一水平线");
    assert(countNode._lpos.x < rulesNode._lpos.x - rulesTransform._contentSize.width / 2,
        "次数与右侧触摸区域不重叠");
    const asset = JSON.parse(readFileSync(directory + "GoldDungeonStageCell.prefab", "utf8"));
    const binding = asset.find((row: { _ribbons?: unknown[] }) => row._ribbons);
    assert.equal(binding._ribbons.length, 5);
    assert.equal(new Set(binding._ribbons.map((entry: { __uuid__: string }) => entry.__uuid__)).size, 5);

    const card = new Node("GoldDungeonStageCell");
    const cell = new GoldDungeonStageCell();
    const actionButton = new Node("ChallengeButton").addComponent(Button);
    actionButton.node.addComponent(Sprite);
    const firstReward = new Node("RewardSlot1").addComponent(Button);
    const price = new Node("Price").addComponent(Label);
    price.node.parent = new Node("PriceGroup");
    const ribbon = new Node("Ribbon").addComponent(Sprite);
    const firstArt = new SpriteFrame();
    const secondArt = new SpriteFrame();
    const label = new Node("Action").addComponent(Label);
    Object.assign(cell, {
        node: card,
        _title: new Node("Title").addComponent(Label),
        _ribbon: ribbon,
        _ribbons: [firstArt, secondArt],
        _condition: new Node("Condition").addComponent(Label),
        _price: price,
        _challenge: actionButton,
        _action: label,
        _rewardButtons: [firstReward],
        _rewardIcons: [new Node("Icon").addComponent(Sprite)],
        _rewardFrames: [new Node("Frame").addComponent(Sprite)],
        _rewardCounts: [new Node("Count").addComponent(Label)],
    });
    Reflect.get(cell, "onLoad").call(cell);
    const selections: unknown[] = [];
    const first = { title: "金币第1关", ribbon: 1, unlocked: true, cleared: false, canChallenge: true,
        condition: "", action: "挑战", price: 0, rewards: [{ itemId: 900001, quantity: 100_000 }] };
    cell.render(first, () => selections.push(1), reward => selections.push(reward.quantity));
    assert.equal(ribbon.spriteFrame, firstArt);
    assert.equal(price.node.parent.active, false);
    actionButton.node.emit(Button.EventType.CLICK);
    firstReward.node.emit(Button.EventType.CLICK);
    const second = { ...first, title: "金币第2关", ribbon: 2, unlocked: false,
        condition: "请先通关第1关", action: "未解锁", canChallenge: false, rewards: [{ itemId: 900001, quantity: 150_000 }] };
    cell.render(second, () => selections.push(2), reward => selections.push(reward.quantity));
    assert.equal(ribbon.spriteFrame, secondArt);
    actionButton.node.emit(Button.EventType.CLICK);
    firstReward.node.emit(Button.EventType.CLICK);
    cell.render({ ...second, unlocked: true, cleared: true, action: "扫荡", canChallenge: true, price: 50 },
        () => selections.push(2), () => {});
    assert.equal(label.string, "扫荡");
    assert.equal(price.node.parent.active, true);
    assert.equal(price.string, "50");
    actionButton.node.emit(Button.EventType.CLICK);
    assert.deepEqual(selections, [1, 100_000, 150_000, 2]);
    card.destroy();
}

/** 用真实视图和协议事件检查次数、只读说明、开战、重连、扫荡和离页取消。 */
function checkBattleEntry(): void {
    const restoreRedDot = RedDotFixture.stubLoad();
    const oldWarm = BattleReplayPreview.warmChallengeOpening;
    const account = new AccountModel();
    const root = new Node("GoldDungeonView");
    const page = root.addComponent(GoldDungeonView);
    const panel = new Node("Panel");
    const host = new Node("BattleHost");
    const background = new Node("BattleBackground");
    background.addComponent(Sprite);
    const rulesButton = new Node("RulesButton").addComponent(Button);
    const count = new Node("AttemptsLabel").addComponent(Label);
    const five = Array.from({ length: 5 });
    let warmed = 0;
    let played = 0;
    BattleReplayPreview.warmChallengeOpening = owner => { assert.equal(owner, host); warmed++; };
    Object.assign(page, {
        _panel: panel.addComponent(UITransform), _battleHost: host, _battleBackground: background,
        _banner: new Node().addComponent(Sprite), _backButton: new Node().addComponent(Button),
        _retryButton: new Node().addComponent(Button), _countLabel: count, _rulesButton: rulesButton,
        _retryLabel: new Node().addComponent(Label), _list: { list: { node: new Node(), setData() {} } },
        _tabButtons: five.map(() => new Node().addComponent(Button)), _tabSelection: five.map(() => new Node()),
        _tabLocks: five.map(() => new Node()), _bannerFrames: five.map(() => new SpriteFrame()),
        _battleFrames: five.map(() => new SpriteFrame()), schedule() {}, unschedule() {},
        playBattle() { played++; },
    });
    const click = () => Reflect.get(page, "challenge").call(page, 1);
    const draw = () => director.emit(Director.EVENT_AFTER_DRAW);
    const ui = UIManager.instance;
    const openChild = ui.openChild;
    const openedRules: RulesArgs[] = [];
    ui.openChild = ((owner, view, args) => {
        assert.equal(owner, page, "说明随日常副本页关闭，不独立占用窗口");
        assert.equal(view, RulesView);
        openedRules.push(args as RulesArgs);
        return Promise.resolve(null);
    }) as typeof ui.openChild;
    controller.configure(operations as unknown as AccountOperations, { restoreActual() {} });
    controller.initialize();
    ServerClock.instance.synchronize(100_000);
    requests.length = 0;
    try {
        page.runOpen({ account, backToHall() {} });
        assert.equal(count.string, "次数待同步");
        resolveList(requests[0], { ...canPlay, wins: 1, canChallenge: false });
        assert.equal(count.string, "今日剩余次数：4", "只显示服务器上限减去当日已用次数");
        rulesButton.node.emit(Button.EventType.CLICK);
        assert.equal(openedRules.length, 1);
        assert.equal(openedRules[0].title, "日常副本");
        assert.match(openedRules[0].message, /2次免费挑战次数\n3/);
        assert.equal(requests.length, 1, "打开说明不会提交额外请求或消耗次数");
        draw();
        assert.equal(warmed, 0, "没有可挑战的关卡时不占用开场资源");
        controller.refreshVisible();
        resolveList(requests[1], { ...canPlay, nextCostDiamonds: 50 });
        assert.equal(warmed, 0, "列表首帧绘制前不加载开场");
        draw();
        assert.equal(warmed, 1);
        click();
        click();
        assert.equal(requests.length, 3, "连点只提交一次挑战");
        assert.equal((requests[2].body as { maxDiamonds: number }).maxDiamonds, 50);
        assert.equal(background.active, true, "点击事件返回时已经切到战场背景");
        assert.equal(panel.active || host.active, false, "等待战报时不播放模型和开场");
        requests[2].failed(new SocketFailure("DISCONNECTED"));
        assert.equal(panel.active, true, "断线恢复原列表及确认入口");
        click();
        assert.deepEqual(requests[3].body, requests[2].body);
        requests[3].failed(new Error("服务端拒绝"));
        assert.equal(background.active, false);
        resolveList(requests[4], { ...canPlay, cleared: true });
        click();
        assert.equal(panel.active && !background.active, true, "扫荡直接留在列表");
        draw();
        assert.equal(warmed, 1, "同一副本页只预热一套开场");
        model.applyBattle("gold", canPlay, { bytes: new Uint8Array(), won: true, rewards: [] });
        Reflect.get(page, "render").call(page);
        assert.equal(host.active && background.active, true);
        assert.equal(played, 0, "战报装配不抢战场背景首帧");
        page.runClose();
        rulesButton.node.emit(Button.EventType.CLICK);
        assert.equal(openedRules.length, 1, "离页后说明按钮不再响应");
        draw();
        assert.equal(played, 0, "背景显示后离页取消下一帧的播放");
    } finally {
        page.runClose();
        root.destroy();
        controller.dispose();
        manager.reset();
        ui.openChild = openChild;
        BattleReplayPreview.warmChallengeOpening = oldWarm;
        restoreRedDot();
    }
}

checkStagesAndRecovery();
checkTypeIsolation();
void checkFirstReadRecovery().then(checkCardReuse).then(checkStageCellReuse).then(checkBattleEntry).then(() => {
    console.log("dungeon-reminder passed: stage recovery and per-kind quotas, reminders, and reusable cards");
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
