/**
 * 普通单抽客户端专项，覆盖免费与用券点击、按钮状态和实际英雄展示。
 * 通过真实二进制协议、控制器和资产快照验证发包回报，只替换网络和渲染宿主。
 */
import { strict as assert } from "node:assert";
import { Button, Label, Node, Sprite, UITransform } from "cc";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { FirstSummonView } from "../assets/scripts/features/hero/ui/FirstSummonView";
import { FirstSummonData } from "../assets/scripts/features/hero/data/FirstSummonData";
import { SummonReferenceUtils } from "../assets/scripts/features/hero/utils/SummonReferenceUtils";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import type { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

const role = Object.freeze({ id: "role-A", nickname: "独立首抽", serverId: "local-1", level: 1, gold: 0, diamonds: 0 });
const receiptId = "10304012-2222-4222-8222-222222222222";
const heroId = "10304012-3333-4333-8333-333333333333";
const hero = Object.freeze({ instanceId: heroId, templateId: 10304012, star: 4, level: 1, stage: 1 });
type SummonProtocol = typeof Protocol.HERO_NORMAL_SUMMON;
const serverNow = 1794966800;
const state = Object.freeze({ schemaVersion: 1, normalFreeAtSeconds: serverNow + 43200, firstNormalCompleted: true });

/** 使用发布协议的二进制投影，测试调用不得绕过打包及解码。 */
function encoded(frame: GameFrame): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(frame));
}

/** 同次英雄与非固定数量积分来自服务端真实回执，验证展示只投影英雄。 */
function receipt(requestId: string, roleId = role.id) {
    return {
        schemaVersion: 1, requestId, receiptId, roleId, assetRevision: 8, state,
        actual: {
            roleId,
            items: [
                { itemId: hero.templateId, requested: 1, credited: 1, ignored: 0, reason: "NONE" },
                { itemId: 900302, requested: 3, credited: 3, ignored: 0, reason: "NONE" },
            ],
            heroes: [hero], bonuses: [], experience: [], stacks: [], tavern: [], timedItems: [],
            wallet: { goldBefore: 0, goldAfter: 0, diamondsBefore: 0, diamondsAfter: 0 },
            spirits: { schemaVersion: 1, items: [] },
        },
    };
}

/** 固定协议帧，不重新计算历史奖励。 */
function response(name: SummonProtocol, body: unknown): GameFrame {
    return encoded({ version: 1, kind: "response", name, id: "stub-frame", ok: true, body });
}

/** 有界等待业务进度，避免以固定延时猜测异步顺序。 */
async function waitFor(check: () => boolean, message: string): Promise<void> {
    for (let i = 0; i < 80 && !check(); i++) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert(check(), message);
}

/** 独立测试应用，保留统一资产和协议；不访问日常浏览器存储或玩家服务器。 */
class Harness {
    /** 应用唯一认证状态，供资产入口验证回执及角色归属。 */
    public readonly account = new AccountModel();
    /** 使用真实的登录／换号保护，测试传输只控制回包时序。 */
    private readonly service: AccountController;
    /** 应用唯一实际背包，确保回执不直接写积分。 */
    public readonly bag = new BagModel();
    /** 回执排队历史，只记录真实交付，不自动视为窗已显示。 */
    public readonly queued: RewardNotice[] = [];
    /** 每次主动操作发送的请求，观察其协议和业务编号。 */
    public readonly requests: Array<{ name: SummonProtocol; requestId: string }> = [];
    /** 用例选择应答时机和真实结果，默认返回一个有效成功回包。 */
    public onRequest: (name: SummonProtocol, key: string) => Promise<GameFrame> = async (name, key) =>
        response(name, receipt(key));
    /** 供资产协议和召唤入口共用的英雄名册。 */
    public readonly roster = new HeroRosterModel();
    /** 当前应用的召唤入口，复用真实的认证请求交付。 */
    public readonly summons = new HeroRosterController(this.roster, this.bag);
    /** 唯一资产同步装配，测试登入或不完整数据以这里是否接纳为准。 */
    private readonly assets: AssetStateBinding;

    /** 注入可控连接，复用真实账号、名册和快照入口。 */
    public constructor() {
        this.service = new AccountController(this.account, {
            developmentLogin: async account => ({
                session: { accessToken: "test-token", expiresAt: "2099-01-01T00:00:00Z" },
                role: { ...role, id: account === "role-a" ? role.id : "role-B" },
            }),
            currentRole: async () => { throw new Error("本用例通过显式登录模拟角色切换"); },
        }, { read: () => null, write: () => {}, clear: () => {} });
        const socket = {
            requestFrame: async (_token: string, name: SummonProtocol, body: { requestId: string }): Promise<GameFrame> => {
                const { requestId } = body;
                const frame = encoded({ version: 1, kind: "request", name, id: "stub-frame", body });
                assert.deepEqual(frame.body, { requestId });
                assert.equal(name, Protocol.HERO_NORMAL_SUMMON);
                this.requests.push({ name, requestId });
                return this.onRequest(name, requestId);
            },
            refreshSnapshot: () => assert.fail("普通召唤不主动请求快照"),
        };
        const operations = new AccountOperations(this.service, socket as unknown as GameSocketClient);
        this.summons.configure(operations, {
            restore: notice => { this.queued.push(notice); },
        });
        this.summons.initialize();
        const bagController = new BagController(this.bag);
        const roleController = new RoleController(this.account);
        bagController.initialize();
        this.assets = new AssetStateBinding(this.account, bagController, roleController, this.summons, undefined,
            () => UIManager.instance.invalidatePending());
    }

    /** 投递已认证角色的资产快照，鉴权样本按线上连接的处理方式校准公共时钟。 */
    public async snapshot(completed: boolean | null, authenticate = true, roleId: string = role.id,
        templateId: number = hero.templateId, inventory = [{ itemId: 900302, quantity: 3 }],
        revision = completed ? 8 : 7): Promise<void> {
        const currentRole = { ...role, id: roleId };
        const initial = {
            role: currentRole, heroes: completed ? [{ ...hero, templateId, id: hero.instanceId }] : [],
            inventory: completed ? inventory : [], revision,
            ...(completed !== null ? { heroSummon: completed ? state :
                { schemaVersion: 1, firstNormalCompleted: false, normalFreeAtSeconds: 0 } } : {}),
        };
        if (this.account.snapshot.role?.id !== roleId) {
            assert(await this.service.login(roleId, role.serverId));
            assert.equal(this.account.snapshot.role?.id, roleId);
        }
        const frame = authenticate ? encoded({ version: 1, kind: "response", name: Protocol.SESSION_AUTHENTICATE,
            connectionId: "wire", id: "auth", ok: true,
            body: { connectionId: "wire", roleId, serverTimeMs: serverNow * 1000, initial } })
            : encoded({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: initial });
        if (authenticate) {
            ServerClock.instance.synchronize(serverNow * 1000);
        }
        this.assets.apply(frame);
    }

    /** 释放账号、资产入口和召唤事件。 */
    public dispose(): void {
        this.assets.dispose();
        this.service.dispose();
        ServerClock.instance.invalidate();
    }
}

/** 免费点击同步返回，快速双击只发一包；即时回包只展示实际所得。 */
async function submitsOnce(): Promise<void> {
    const app = new Harness();
    let answer!: () => void;
    app.onRequest = (name, key) => new Promise(resolve => {
        answer = () => resolve(response(name, receipt(key)));
    });
    try {
        await app.snapshot(false);
        assert.equal(app.summons.summon(), undefined);
        app.summons.summon();
        await waitFor(() => !!answer, "召唤请求未发出");
        assert(app.summons.summoning);
        answer();
        await waitFor(() => !app.summons.summoning, "召唤回包后仍在等待");
        assert.equal(app.requests.length, 1);
        assert.equal(app.bag.quantity(900302), 0);
        assert.equal(app.roster.snapshot.heroes.length, 0);
        assert.deepEqual(app.queued[0]?.heroes, [hero]);
        await app.snapshot(true);
        assert.equal(app.bag.quantity(900302), 3);
        assert.equal(app.roster.snapshot.heroes.length, 1);
        assert.equal(app.requests.length, 1, "快照不触发第二次操作");
    } finally {
        app.dispose();
    }
}

/** 丢回包时，无论是否已经完成，一律以鉴权首包刷新且不会主动追查或补发。 */
async function reconnectWithSnapshot(completed: boolean): Promise<void> {
    const app = new Harness();
    app.onRequest = async () => { throw new SocketFailure("DISCONNECTED"); };
    try {
        await app.snapshot(false);
        app.summons.summon();
        await waitFor(() => app.requests.length === 1 && !app.summons.summoning, "断开连接后按钮尚未恢复");
        await app.snapshot(completed);
        assert.equal(app.requests.length, 1);
        assert.equal(app.roster.snapshot.normalFreeAtSeconds, completed ? state.normalFreeAtSeconds : 0);
        assert.equal(app.bag.quantity(900302), completed ? 3 : 0);
        assert.equal(app.queued.length, 0);
    } finally {
        app.dispose();
    }
}

/** 上一角色迟到的成功回包不能显示英雄，也不能解锁下一角色正在等待的按钮。 */
async function ignoresPreviousCharacter(): Promise<void> {
    const app = new Harness();
    const answers: Array<() => void> = [];
    app.onRequest = (name, key) => new Promise(resolve => {
        const roleId = app.account.snapshot.role!.id;
        answers.push(() => resolve(response(name, receipt(key, roleId))));
    });
    try {
        await app.snapshot(false);
        app.summons.summon();
        await waitFor(() => answers.length === 1, "旧角色请求未发出");
        await app.snapshot(false, true, "role-B");
        assert(!app.summons.summoning);
        app.summons.summon();
        await waitFor(() => answers.length === 2, "新角色请求未发出");
        answers[0]();
        await new Promise<void>(resolve => setImmediate(resolve));
        assert.equal(app.requests.length, 2);
        assert.equal(app.queued.length, 0);
        assert(app.summons.summoning);
        assert.equal(app.account.snapshot.role?.id, "role-B");
        answers[1]();
        await waitFor(() => app.queued.length === 1, "当前角色的召唤回包未显示");
        assert(!app.summons.summoning);
    } finally {
        app.dispose();
    }
}

/** 改变服务器产出的英雄和附带物品，获得窗仍只展示该回执中的英雄；窗口不要求指定积分到账。 */
async function followsServerResult(): Promise<void> {
    const app = new Harness();
    const drawn = { ...hero, templateId: 10101001 };
    const extra = { itemId: 101, quantity: 7 };
    app.onRequest = async (name, key) => {
        const result = receipt(key);
        const items = [
            { ...result.actual.items[0], itemId: drawn.templateId },
            { ...result.actual.items[1], itemId: extra.itemId, requested: extra.quantity, credited: extra.quantity },
        ];
        await app.snapshot(true, false, role.id, drawn.templateId, [extra]);
        return response(name, { ...result, actual: { ...result.actual, items, heroes: [drawn] } });
    };
    try {
        await app.snapshot(false);
        app.summons.summon();
        await waitFor(() => app.queued.length === 1, "服务端给出的英雄未显示");
        assert.equal(app.requests.length, 1);
        assert.deepEqual(app.queued[0]?.heroes, [drawn]);
        assert.deepEqual(app.queued[0]?.items, [{ itemId: drawn.templateId, credited: 1 }]);
        assert.equal(app.bag.quantity(extra.itemId), extra.quantity);
        assert.equal(app.bag.quantity(900302), 0);
    } finally {
        app.dispose();
    }
}

/** 已完成首抽的角色，冷却内检查普通券；到期的同一秒可再次免费召唤。 */
async function drawsAfterFirst(secondsUntilFree: number, tickets: number): Promise<void> {
    const app = new Harness();
    const notices: string[] = [];
    const stopNotice = UIManager.instance.bindNotice(text => notices.push(text));
    const inventory = tickets ? [{ itemId: 900201, quantity: tickets }] : [];
    try {
        await app.snapshot(true, true, role.id, hero.templateId, inventory);
        ServerClock.instance.synchronize((state.normalFreeAtSeconds - secondsUntilFree) * 1000);
        assert.equal(app.roster.normalSummonFree, secondsUntilFree <= 0);
        assert.equal(app.summons.summon(), undefined);
        if (secondsUntilFree > 0 && tickets === 0) {
            assert.deepEqual(notices, ["普通召唤券不足"]);
            assert.equal(app.summons.summoning, false);
            assert.equal(app.requests.length, 0);
            return;
        }
        await waitFor(() => app.queued.length === 1, "普通单抽没有展示收到的英雄");
        assert.deepEqual(notices, []);
        assert.equal(app.requests.length, 1);
        assert.equal(app.bag.quantity(900201), tickets, "回包展示期间不预扣背包");
        const remaining = secondsUntilFree <= 0 ? tickets : tickets - 1;
        const after = remaining ? [{ itemId: 900201, quantity: remaining }] : [];
        await app.snapshot(true, false, role.id, hero.templateId, after, 9);
        assert.equal(app.bag.quantity(900201), remaining, "统一快照更新券余额");
    } finally {
        stopNotice();
        app.dispose();
    }
}

/** 切换角色时取消在途召唤页，迟到失败不提示下一角色；本角色的失败由页面管理器报告。 */
async function cancelsPendingWindow(): Promise<void> {
    const app = new Harness();
    const ui = UIManager.instance;
    const root = new Node("Canvas");
    const navigation = { current: "home", openChild: () => {}, back: () => false };
    const notices: string[] = [];
    const spec = UIRegistry.viewSpecOf(FirstSummonView)!;
    let fail: ((error: Error) => void) | null = null;
    ui.install(navigation, { showToast: text => { notices.push(text); } });
    UIRegistry.registerView(FirstSummonView, {
        ...spec,
        load: () => new Promise((_resolve, reject) => { fail = reject; }),
    });
    const rejectLoad = async () => {
        await waitFor(() => !!fail, "预制体加载未开始");
        const reject = fail!;
        fail = null;
        reject(new Error("受控的首抽窗口加载失败"));
    };
    try {
        await app.snapshot(false);
        const oldOpen = ui.open(FirstSummonView).catch(error => error);
        await waitFor(() => !!fail, "旧角色首抽窗口尚未开始加载");
        await app.snapshot(false, true, "role-B");
        await rejectLoad();
        assert(UIManager.isOpenCancelled(await oldOpen));
        assert.deepEqual(notices, []);
        assert.equal(ui.isOpen(FirstSummonView), false);
        const currentOpen = ui.open(FirstSummonView).catch(error => error);
        await rejectLoad();
        assert(UIManager.isFailureReported(await currentOpen));
        assert.equal(notices.length, 1, "当前角色的失败由框架提示一次");
    } finally {
        app.dispose();
        ui.uninstall(navigation);
        UIRegistry.registerView(FirstSummonView, spec);
        root.destroy();
    }
}

/** 窗口随快照显示免费或用券操作，在途时禁用；关闭窗口不影响本次交付。 */
async function rendersOnlyAvailableAction(): Promise<void> {
    const app = new Harness();
    const root = new Node("FirstSummon");
    const panel = new Node("Panel");
    panel.parent = root;
    const view = root.addComponent(FirstSummonView);
    view.panel = panel.addComponent(UITransform);
    view.panel.setContentSize(518, 494);
    view.closeButton = new Node("Close").addComponent(Button);
    view.drawButtons = Array.from({ length: 6 }, (_, index) => new Node(`Draw${index}`).addComponent(Button));
    view.drawCosts = Array.from({ length: 6 }, (_, index) => new Node(`Cost${index}`).addComponent(Label));
    view.drawCostIcons = Array.from({ length: 6 }, (_, index) => new Node(`CostIcon${index}`).addComponent(Sprite));
    view.poolBalances = Array.from({ length: 3 }, (_, index) => new Node(`Balance${index}`).addComponent(Label));
    view.stateLabel = new Node("Message").addComponent(Label);
    view.pointsLabel = new Node("Points").addComponent(Label);
    // 离线引擎没有帧调度器，保留原回调和注册周期，通过手动推进一帧核对到期与关闭。
    const timers = new Set<(dt: number) => void>();
    view.schedule = (callback, seconds) => {
        assert.equal(seconds, 1);
        assert(!timers.has(callback), "同一刷新回调重复登记");
        timers.add(callback);
    };
    view.unschedule = callback => { timers.delete(callback); };
    try {
        view.configure(app.summons, app.roster, app.bag);
        view.runOpen();
        const [normalDraw] = view.drawButtons;
        assert.equal(normalDraw.interactable, false, "尚未同步召唤时间时不可点击");
        assert.equal(timers.size, 1);
        await app.snapshot(false);
        await waitFor(() => normalDraw.interactable, "有免费资格时未启用按钮");
        assert.equal(view.drawCosts[0].string, "免费");
        let answer!: () => void;
        app.onRequest = (name, key) => new Promise(resolve => {
            answer = () => resolve(response(name, receipt(key)));
        });
        normalDraw.node.emit(Button.EventType.CLICK);
        assert.equal(normalDraw.interactable, false);
        await waitFor(() => !!answer, "召唤请求未发出");
        view.runClose();
        assert.equal(timers.size, 0, "窗口关闭后应移除计时刷新");
        answer();
        await waitFor(() => !app.summons.summoning, "关闭窗口后的回包未处理");
        assert.equal(app.queued.length, 1, "关窗不撤销正在发送的请求");
        await app.snapshot(true);
        view.runOpen();
        assert.equal(normalDraw.node.active, true, "完成首抽后仍可点击普通单抽");
        assert.equal(normalDraw.interactable, true, "缺券时应可点击查看缺券提示");
        assert.equal(view.drawCosts[0].string, "1");
        assert.match(view.stateLabel.string, /后免费$/);
        assert.equal(view.poolBalances[0].string, "0");
        assert.equal(view.pointsLabel.string, "3/1000");
        ServerClock.instance.synchronize(state.normalFreeAtSeconds * 1000);
        for (const callback of timers) {
            callback.call(view, 1);
        }
        assert.equal(view.drawCosts[0].string, "免费", "窗口留在前台也能在到期秒切换");
        view.runClose();
        assert.equal(timers.size, 0);
    } finally {
        root.destroy();
        app.dispose();
    }
}

/** 用真实配置包核对高级钻石预算、积分和概率源。 */
function checksSummonConfiguration(): void {
    assert.deepEqual(FirstSummonData.quote("ADVANCED", 1, true, 0),
        { itemId: 900202, items: 0, diamonds: 0, free: true });
    assert.equal(FirstSummonData.quote("ADVANCED", 1, false, 0).diamonds, 220);
    assert.equal(FirstSummonData.quote("ADVANCED", 10, false, 0).diamonds, 1980);
    assert.deepEqual(FirstSummonData.quote("ADVANCED", 10, false, 3),
        { itemId: 900202, items: 3, diamonds: 1386, free: false });
    assert.equal(FirstSummonData.quote("ADVANCED", 10, false, 10).diamonds, 0);
    assert.equal(FirstSummonData.cost("FRIENDSHIP", 10).item_num, 1000);
    assert.equal(FirstSummonData.cost("POINTS", 1).item_num, 1000);
    assert(SummonReferenceUtils.rates("NORMAL").some(row => row.text === "5 星英雄  0.4%"));
    assert(SummonReferenceUtils.rates("ADVANCED").some(row => row.text === "首次高级十连保底"));
    assert(SummonReferenceUtils.lineups().some(row => row.text === "三系平衡队"));
}

/** 顺序运行共享协议路由与事件环境中的独立案例。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checksSummonConfiguration();
    await submitsOnce();
    await followsServerResult();
    await drawsAfterFirst(1, 0);
    await drawsAfterFirst(1, 1);
    await drawsAfterFirst(0, 0);
    await drawsAfterFirst(0, 1);
    await reconnectWithSnapshot(true);
    await reconnectWithSnapshot(false);
    await ignoresPreviousCharacter();
    await rendersOnlyAvailableAction();
    await cancelsPendingWindow();
    console.log("普通单抽客户端：免费、用券、券不足、到期边界、实际英雄、断线换号及窗口检查通过");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
