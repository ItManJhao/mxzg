/**
 * 主线配置化范围专项：新挑战只信最新服务端范围，旧回执和高关卡只读战报不能扩大开放。
 * 通过真实Controller/View及生成PB校验全局关卡身份、通用名册和恢复优先，不加载配置或写玩家数据。
 * --java=<文件>可额外读取本轮Java首包、状态或只读试战/战报帧，不启动服务或构建发布包。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Node } from "cc";
import { BattlePreviewController } from "../assets/scripts/features/battle/BattlePreviewController";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterSession } from "../assets/scripts/features/battle/MainChapterSession";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterState } from "../assets/scripts/features/battle/MainChapterModel";
import { MainChapterView } from "../assets/scripts/features/battle/ui/MainChapterView";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import { FormationView } from "../assets/scripts/features/hero/ui/FormationView";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 独立恢复夹具使用合法原战斗编号，不触碰任何测试服或正式角色。 */
const BATTLE_ID = "11111111-1111-4111-8111-111111111111";

/** 构造权威状态；故意允许缺challengeLimit，不能在测试入口替生产补默认范围。 */
function state(maxCleared = 0, challengeLimit?: number, pendingBattleId: string | null = null): MainChapterState {
    return { maxCleared, pendingBattleId, assetRevision: 1,
        ...(challengeLimit !== undefined ? { challengeLimit } : {}) };
}

/** 经过同一生成PB编码/解码入口，保留可选字段缺失，不用直接对象替代网络字段契约。 */
function frame(name: string, body: unknown): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1, name, kind: "response", ok: true, body,
    }));
}

/** 配置全局idx与新挑战范围分开；缺失和坏字段分开，历史回执不能改最新范围。 */
function readScope(): void {
    const old = MainChapterModel.readState(state())!;
    assert.equal(old.challengeLimit, undefined);
    assert(!Object.prototype.hasOwnProperty.call(old, "challengeLimit"));
    for (const index of [0, 3, 4, 850, 0xffffffff]) {
        const accepted = MainChapterModel.readState(state(index, 3))!;
        assert.equal(accepted.maxCleared, index, "降范围不抹去真实历史进度");
        assert.equal(accepted.challengeLimit, 3);
        assert(Object.isFrozen(accepted));
    }
    assert.equal(MainChapterModel.readState(state(0, 0xffffffff))!.challengeLimit, 0xffffffff);
    for (const value of [0, -1, 1.5, "3", null, 0x100000000, NaN]) {
        assert.throws(() => MainChapterModel.readState({ ...state(), challengeLimit: value }));
    }
    for (const value of [-1, 1.5, "4", 0x100000000, NaN]) {
        assert.throws(() => MainChapterModel.readState({ ...state(), maxCleared: value }));
    }
    const current = state(2, 3);
    const wire = frame(Protocol.CHAPTER_CHALLENGE, {
        action: "BATTLE", battleId: BATTLE_ID, state: current, rewards: [],
    });
    assert.equal((wire.body as any).state.challengeLimit, 3, "可选范围须真实穿过生成PB");
    const historical = frame(Protocol.CHAPTER_CLAIM, {
        action: "SETTLED", battleId: BATTLE_ID, state: state(1), rewards: [],
    });
    assert(!Object.prototype.hasOwnProperty.call((historical.body as any).state, "challengeLimit"),
        "旧二进制缺字段不能被PB默认0冒充为已同步范围");
    assert.equal(MainChapterModel.readState((historical.body as any).state)!.challengeLimit, undefined);
}

/** 新请求检查scope；已生成编号、原pending及结算仍复用原流程，不受范围缩小或旧字段缺失阻断。 */
async function requests(): Promise<void> {
    const model = new MainChapterModel();
    const controller = new MainChapterController(model);
    const sent: Array<{ name: string; body: any }> = [];
    controller.configure({
        deliver: async (name, body, _received, failed) => {
            sent.push({ name, body });
            failed(new Error("受控断线，保留原编号"));
        },
    });
    controller.initialize();
    try {
        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(0) });
        await controller.challenge();
        assert.equal(sent.length, 0);
        assert.equal(model.requestId, null);
        assert.equal(model.message, "挑战范围尚未同步");

        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(3, 3) });
        await controller.challenge();
        assert.equal(sent.length, 0, "默认范围不能因通用战报支持850而扩大");
        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(2, 3) });
        await controller.challenge();
        assert.equal(sent.length, 1);
        const requestId = model.requestId;
        assert(requestId);
        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(2) });
        const latest = model.state;
        await controller.challenge();
        assert.equal(sent.length, 2);
        assert.equal(sent[1].body.requestId, requestId, "范围缺失仍可确认原请求，不生成新编号");

        controller.onNotify(Protocol.CHAPTER_CHALLENGE, {
            action: "BATTLE", battleId: BATTLE_ID, state: state(2, 850), rewards: [],
        });
        assert.equal(model.state, latest);
        assert.equal(model.state!.challengeLimit, undefined, "历史回执不能给最新快照补范围");
        assert.equal(model.receipt!.state.challengeLimit, 850, "历史值只留在回执内");
        assert.equal(model.requestId, null);

        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(9, 3) });
        await controller.challenge();
        assert.equal(sent.length, 2);
        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(9, 3, BATTLE_ID) });
        await controller.challenge();
        assert.equal(sent.length, 3, "范围以外原pending仍交服务端结算，不是开放第10关");
        model.requestId = null;
        controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, mainChapter: state(9) });
        await controller.claim(BATTLE_ID);
        assert.equal(sent[3].name, Protocol.CHAPTER_CLAIM);
        assert.equal(sent[3].body.battleId, BATTLE_ID);
    } finally {
        controller.dispose();
    }
}

/** 使用真实主页渲染/点击方法检查动态范围；布阵和恢复调用仅记录边界，不制造另一个页面实现。 */
async function pageScope(): Promise<void> {
    const model = MainChapterModel.instance;
    const before = { state: model.state, busy: model.busy, requestId: model.requestId,
        settlement: model.settlement, message: model.message, idle: model.idle, receipt: model.receipt };
    const originalOpen = UIManager.instance.openChild;
    const originalToast = UIManager.instance.toast;
    const host = new Node("ChapterScopeFixture");
    const page: any = host.addComponent(MainChapterView);
    const opened: Function[] = [];
    const formationArgs: any[] = [];
    const notices: string[] = [];
    let restored = 0;
    const actualChallenge = page.challenge;
    for (const name of ["stageLabel", "statusLabel", "challengeLabel", "idleTimeLabel",
        "goldRateLabel", "roleExpRateLabel", "heroExpRateLabel"]) {
        page[name] = { string: "" };
    }
    for (const name of ["challengeButton", "quickBattleButton", "powerButton"]) {
        page[name] = { interactable: false };
    }
    page.challenge = async () => { restored++; };
    try {
        UIManager.instance.openChild = async (owner, ctor, args) => {
            assert.equal(owner, page, "阵容窗应随本次主线页面关闭");
            opened.push(ctor);
            formationArgs.push(args);
            return page;
        };
        UIManager.instance.toast = text => { notices.push(text); };
        model.busy = false;
        model.requestId = null;
        model.settlement = null;
        model.message = "";
        model.idle = null;

        model.state = state(2, 3);
        page.render();
        assert.equal(page.stageLabel.string, "3");
        assert.equal(page.challengeButton.interactable, true);
        await page.prepareChallenge();
        assert.deepEqual(opened, [FormationView]);

        model.state = state(3, 3);
        page.render();
        assert.equal(page.challengeButton.interactable, false);
        assert.equal(page.statusLabel.string, "当前开放的3关已全部通关");
        await page.prepareChallenge();
        assert.equal(opened.length, 1);

        model.state = state(5, 7);
        page.render();
        assert.equal(page.stageLabel.string, "6");
        assert.equal(page.challengeButton.interactable, true, "显示服端可信范围，不在View硬编码3");
        await page.prepareChallenge();
        assert.equal(opened.length, 2);

        model.state = state(9, 3);
        page.render();
        assert.equal(page.stageLabel.string, "9", "降范围仍显示真实历史进度，不将其压成3");
        assert.equal(page.challengeButton.interactable, false);

        model.state = state(2);
        page.render();
        assert.equal(page.challengeLabel.string, "等待范围");
        assert.equal(page.challengeButton.interactable, false);
        await page.prepareChallenge();
        assert.equal(opened.length, 2);
        assert(notices.includes("挑战范围尚未同步"));
        model.state = state(2, undefined, BATTLE_ID);
        page.render();
        assert.equal(page.challengeLabel.string, "恢复战斗");
        assert.equal(page.challengeButton.interactable, true);
        await page.prepareChallenge();
        model.state = state(2);
        model.requestId = BATTLE_ID;
        page.render();
        assert.equal(page.challengeLabel.string, "确认挑战");
        await page.prepareChallenge();
        assert.equal(restored, 2, "缺范围仍只恢复原操作，不打开新布阵");

        // 真实布阵保存回调不持有旧范围；降范围后调用原challenge也不能重播旧receipt。
        let staleReports = 0;
        model.requestId = null;
        model.state = state(2, 3);
        model.receipt = { action: "BATTLE", battleId: BATTLE_ID, state: state(2, 3), rewards: [] };
        const originalReceipt = model.receipt;
        page.challenge = actualChallenge;
        page.play = async () => { staleReports++; };
        await page.prepareChallenge();
        const saved = formationArgs[formationArgs.length - 1].complete;
        model.state = state(3, 3);
        saved(true);
        for (let index = 0; index < 8; index++) {
            await Promise.resolve();
        }
        assert.equal(model.requestId, null, "缩限后的布阵回调不生成新挑战编号");
        assert.equal(model.receipt, originalReceipt);
        assert.equal(staleReports, 0, "范围拒绝不能被旧BATTLE回执误触发播放");
    } finally {
        UIManager.instance.openChild = originalOpen;
        UIManager.instance.toast = originalToast;
        Object.assign(model, before);
        host.destroy();
    }
}

/** 真实主页把当前显示期交给唯一领取绑定；关闭、战斗或收取中不会再请求，缺注入只给可恢复提示。 */
async function playerIdleEntry(): Promise<void> {
    const originalSession = MainChapterSession.current;
    const originalToast = UIManager.instance.toast;
    const host = new Node("PlayerIdleEntryFixture");
    const page: any = host.addComponent(MainChapterView);
    const calls: object[] = [];
    const notices: string[] = [];
    try {
        UIManager.instance.toast = text => { notices.push(text); };
        MainChapterSession.current = {
            idleClaim: { async begin(context: object) { calls.push(context); } },
        } as MainChapterSession;
        page.closed = false;
        const context = page.idleCollectionContext();
        page.collectIdleRewards();
        await Promise.resolve();
        assert.deepEqual(calls, [context], "页面只交当前显示期，不自己构造领取请求或修改累计");

        page.closed = true;
        page.collectIdleRewards();
        page.closed = false;
        page.playing = true;
        page.collectIdleRewards();
        page.playing = false;
        page.idleChest = { collecting: true };
        page.collectIdleRewards();
        assert.equal(calls.length, 1, "关闭、正式战斗及已有收取不能创建新意图");
        page.idleChest = null;
        MainChapterSession.current = null;
        page.collectIdleRewards();
        assert.deepEqual(notices, ["挂机领取正在准备，请稍后重试"]);
        assert.equal(calls.length, 1);
    } finally {
        MainChapterSession.current = originalSession;
        UIManager.instance.toast = originalToast;
        host.destroy();
    }
}

/** 构造不同等级、模板及多目标的通用战报，验证编解码职责而非某关固定敌人；不用于真实玩法。 */
function replay(index = 850, prefix = "chapter:lineup"): any {
    const units = [
        { unitId: 2, faction: 1, templateId: 10105011, level: 100, position: 2, initialHp: 100, maxHp: 100, finalHp: 100 },
        { unitId: 7, faction: 1, templateId: 10205023, level: 80, position: 7, initialHp: 200, maxHp: 200, finalHp: 200 },
        ...[1, 4, 8].map((position, order) => ({ unitId: position + 8, faction: 2,
            templateId: [10505005, 10101001, 10205023][order], level: 120 + order, position,
            initialHp: 100, maxHp: 100, finalHp: 0 })),
    ];
    return {
        schemaVersion: 1, scenario: prefix + ":" + index, rounds: 1, outcome: "ATTACKER_WIN", units,
        phases: [
            { round: 1, sourceId: 0, events: [] },
            { round: 1, sourceId: 2, events: [
                { kind: "skill.begin", sourceId: 2, targetId: 2, configId: 101010011, skillLevel: 0, skillType: 2 },
                ...units.filter(unit => unit.faction === 2).map(unit => ({ kind: "damage", sourceId: 2,
                    targetId: unit.unitId, configId: 1011101, actualHpChange: -100, reportedHpChange: -100, dead: true })),
                { kind: "skill.end", sourceId: 2, targetId: 2, configId: 101010011, skillLevel: 0, skillType: 2 },
            ] },
        ],
    };
}

/** 使用生成器原二进制，不让测试对象绕过PB的可选字段和64位规则。 */
function bytes(report: any): Uint8Array {
    return mxzg.game.BattleReplay.encode(mxzg.game.BattleReplay.fromObject(report)).finish();
}

/** 挂机只改全局关卡定位，仍保留最多三人、单敌1生命和普攻的既有只读演出契约。 */
function idleReplay(index = 850): any {
    const report = replay(index, "idle:chapter");
    report.units = report.units.filter((unit: any) => unit.faction === 1 || unit.unitId === 9);
    Object.assign(report.units.find((unit: any) => unit.unitId === 9), { initialHp: 1, maxHp: 1 });
    const events = report.phases[1].events;
    report.phases[1].events = [events[0], { ...events[1], actualHpChange: -1, reportedHpChange: -1 }, events[events.length - 1]];
    return report;
}

/** 检查完整解析一次交付三个冻结结果，兼容旧名称缺失，并保留所有场景、名册和事件校验。 */
function genericReplay(): void {
    for (const index of [1, 3, 4, 21, 850, 0xffffffff]) {
        for (const prefix of ["chapter:lineup", "audit:lineup"]) {
            const parsed = BattleReplayUtils.parse(bytes(replay(index, prefix)));
            assert.equal(parsed.units.length, 5);
            assert.equal(parsed.steps.filter(step => step.kind === "damage").length, 3);
        }
    }
    const named = replay();
    named.attackerName = "";
    named.defenderName = "冻结对手";
    const namedBytes = bytes(named);
    const parsed = BattleReplayUtils.parse(namedBytes);
    assert.deepEqual(parsed.names, { attacker: "", defender: "冻结对手" });
    assert(Object.isFrozen(parsed) && Object.isFrozen(parsed.steps) && Object.isFrozen(parsed.units) && Object.isFrozen(parsed.names));
    assert.deepEqual(BattleReplayUtils.decode(namedBytes), parsed.steps);
    assert.deepEqual(BattleReplayUtils.units(namedBytes), parsed.units);
    assert.deepEqual(BattleReplayUtils.names(namedBytes), parsed.names);
    delete named.attackerName;
    assert.equal(BattleReplayUtils.parse(bytes(named)).names.attacker, null);
    named.units[2].finalHp = 1;
    const invalidNamed = bytes(named);
    assert.throws(() => BattleReplayUtils.units(invalidNamed), /最终血量/);
    assert.throws(() => BattleReplayUtils.names(invalidNamed), /最终血量/);
    const full = replay();
    full.units = [1, 2].flatMap(faction => Array.from({ length: 8 }, (_, index) => ({
        unitId: index + 1 + (faction === 2 ? 8 : 0), faction, templateId: 10101001,
        level: 30, position: index + 1, initialHp: 100, maxHp: 100, finalHp: faction === 1 ? 100 : 0,
    })));
    const first = full.phases[1].events[0];
    const last = full.phases[1].events[full.phases[1].events.length - 1];
    full.phases[1].events = [first, ...full.units.filter((unit: any) => unit.faction === 2).map((unit: any) => ({
        kind: "damage", sourceId: 2, targetId: unit.unitId, configId: 1011101,
        actualHpChange: -100, reportedHpChange: -100, dead: true,
    })), last];
    assert.equal(BattleReplayUtils.units(bytes(full)).length, 16, "通用名册允许双方各8个有效站位");
    for (const scenario of ["chapter:lineup:0", "chapter:lineup:01", "chapter:lineup:+4", "chapter:lineup:4.0",
        "chapter:lineup:4e1", "chapter:lineup:4suffix", "chapter:lineup:4294967296",
        "idle:chapter:0", "idle:chapter:01", "main:1:1:850", "main:1:1:1"]) {
        const report = replay();
        report.scenario = scenario;
        assert.throws(() => BattleReplayUtils.decode(bytes(report)), /场景|关卡|单位/);
    }
    const reject = (change: (report: any) => void) => {
        const report = replay();
        change(report);
        assert.throws(() => BattleReplayUtils.decode(bytes(report)));
    };
    reject(report => { report.units[2].unitId = 99; });
    reject(report => { report.units[3].position = report.units[2].position; });
    reject(report => { report.units[0].faction = 3; });
    reject(report => { report.units = report.units.filter((unit: any) => unit.faction === 1); });
    reject(report => { report.units = Array.from({ length: 17 }, () => report.units[0]); });
    reject(report => { report.units[0].templateId = 0; });
    reject(report => { delete report.units[0].level; });
    reject(report => { report.units[2].finalHp = 1; });
    reject(report => { report.phases[1].events[1].actualHpChange = "-9007199254740992"; });
    reject(report => { report.phases[1].events[1].kind = "unknown-damage"; });
    assert(BattleReplayUtils.decode(bytes(idleReplay())).length > 0);
    const invalidIdle = (change: (report: any) => void) => {
        const report = idleReplay();
        change(report);
        assert.throws(() => BattleReplayUtils.decode(bytes(report)));
    };
    invalidIdle(report => { report.phases[1].events[0].skillType = 1; });
    invalidIdle(report => { report.units[2].initialHp = 2; report.units[2].maxHp = 2; });
    invalidIdle(report => { report.units.push({ ...report.units[0], unitId: 1, position: 1 },
        { ...report.units[0], unitId: 3, position: 3 }); });
    const tooManyEnemies = replay(850, "idle:chapter");
    assert.throws(() => BattleReplayUtils.decode(bytes(tooManyEnemies)));
}

/** 正式回放与独立只读试战都按全局idx匹配；错关回包仍拒绝，解码高关卡不修改玩家范围。 */
async function routes(): Promise<void> {
    const model = new MainChapterModel();
    const controller = new MainChapterController(model);
    model.state = MainChapterModel.readState(state(2, 3));
    const current = model.state;
    controller.onNotify(Protocol.CHAPTER_REPLAY, { battleId: BATTLE_ID, mission: 850, pending: [], replay: replay() });
    assert.equal(model.replay!.mission, 850);
    assert.equal(model.state, current);
    assert.equal(model.state!.challengeLimit, 3);
    assert.throws(() => controller.onNotify(Protocol.CHAPTER_REPLAY,
        { battleId: BATTLE_ID, mission: 849, pending: [], replay: replay() }));
    model.state = MainChapterModel.readState(state(850, 3));
    model.idle = MainChapterModel.readIdle({ serverTime: 1000, startedAt: 900,
        maxSeconds: 120, frequency: 5, rewardStage: 850, rates: [{ itemId: 900001, quantity: 1 }],
        lineupVersion: 1 }, model.state);
    controller.onNotify(Protocol.CHAPTER_IDLE_ENCOUNTER, { stage: 850, assetRevision: 1,
        lineupVersion: 1, replay: idleReplay() });
    assert.equal(model.idleReplay!.stage, 850);
    assert.equal(model.state!.challengeLimit, 3, "高关卡挂机只读演出不扩大挑战范围");
    const preview = new BattlePreviewController({
        deliver: async (protocol, body, received) => {
            assert.equal(protocol, Protocol.BATTLE_PREVIEW);
            const { mission } = body as { mission: number };
            assert.equal(mission, 850);
            received(frame(protocol, { mission, assetRevision: 1, lineupVersion: 1,
                formationId: 1, pending: [], replay: replay(mission, "audit:lineup") }));
        },
    });
    try {
        assert.equal((await preview.preview(850))!.mission, 850);
        for (const value of [0, -1, 1.5, 0x100000000]) {
            await assert.rejects(preview.preview(value));
        }
    } finally {
        preview.dispose();
        controller.dispose();
    }
}

/** 旧遇敌请求被连接层撤销后，新一轮相同版本的战报也只返回给真正收到它的调用。 */
async function encounterDelivery(): Promise<void> {
    const model = new MainChapterModel();
    const controller = new MainChapterController(model);
    let release!: () => void;
    const cancelled = new Promise<void>(done => { release = done; });
    let first = true;
    controller.configure({
        deliver: async (name, _body, received) => {
            assert.equal(name, Protocol.CHAPTER_IDLE_ENCOUNTER);
            if (first) {
                first = false;
                await cancelled;
                return;
            }
            received(frame(name, { stage: 850, assetRevision: 1, lineupVersion: 1, replay: idleReplay() }));
        },
    });
    const restore = (): void => {
        model.state = state(850, 3);
        model.idle = {
            serverTime: 1000, startedAt: 900, maxSeconds: 3600, frequency: 60,
            rewardStage: 850, lineupVersion: 1, rates: [], slots: [{ heroId: "hero-1", position: 1 }],
        };
    };
    controller.initialize();
    try {
        restore();
        const old = controller.encounter();
        controller.resetSession();
        restore();
        assert((await controller.encounter())?.length, "新请求应收到自己的战报");
        release();
        assert.equal(await old, null, "原请求未交付不能借用新请求的战报");
    } finally {
        release();
        controller.dispose();
    }
}

/** 可选真实 Java 帧验证保留服务端下发的范围，支持不同开放配置的测试产物。 */
async function interop(): Promise<void> {
    for (const argument of process.argv.filter(value => value.startsWith("--java="))) {
        const wire = GameProtocolCodecUtils.decodeGameFrame(readFileSync(argument.slice(7)));
        const body = wire.body as any;
        if (wire.name === Protocol.BATTLE_PREVIEW) {
            const controller = new BattlePreviewController({
                deliver: async (_protocol, _body, received) => { received(wire); },
            });
            try {
                const result = await controller.preview(body.mission);
                assert.equal(result!.mission, body.mission);
                assert(BattleReplayUtils.decode(result!.bytes).length > 0);
            } finally {
                controller.dispose();
            }
        } else if (wire.name === Protocol.CHAPTER_REPLAY) {
            const controller = new MainChapterController(new MainChapterModel());
            controller.onNotify(wire.name, body);
            controller.dispose();
        } else if (wire.name === Protocol.CHAPTER_CHALLENGE || wire.name === Protocol.CHAPTER_CLAIM) {
            const model = new MainChapterModel();
            const controller = new MainChapterController(model);
            model.state = MainChapterModel.readState(state(2, 3));
            const current = model.state;
            controller.onNotify(wire.name, body);
            assert.equal(model.state, current, "真实历史回执仍不能覆盖当前范围");
            assert.equal(model.receipt!.state.challengeLimit, body.state.challengeLimit);
            controller.dispose();
        } else {
            assert([Protocol.SESSION_LOGIN, Protocol.SESSION_AUTHENTICATE, Protocol.STATE_CHANGED].includes(wire.name as any));
            const snapshot = wire.name === Protocol.STATE_CHANGED ? body : body.initial;
            const chapter = snapshot.mainChapter;
            assert(Number.isSafeInteger(chapter.challengeLimit) && chapter.challengeLimit > 0);
            assert.equal(MainChapterModel.readState(chapter, snapshot.revision)!.challengeLimit, chapter.challengeLimit);
        }
        console.log("Java全局主线/挑战范围PB互通通过：" + wire.name + " " + argument.slice(7));
    }
}

/** 依次执行真实入口及严格战报边界，全部保持只读，不把测试850样本当玩家开放范围。 */
async function main(): Promise<void> {
    readScope();
    await requests();
    await pageScope();
    await playerIdleEntry();
    genericReplay();
    await routes();
    await encounterDelivery();
    await interop();
    console.log("PASS main chapter scope: server limit, historical recovery and strict global-index replay");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
