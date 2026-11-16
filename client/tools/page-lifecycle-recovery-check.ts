/**
 * 页面前后台恢复的通信集成专项：真实长连接客户端、账号交付和统一资产入口共同处理暂停与恢复。
 * 用受控Protobuf服务器交付保存/结算及重复通知，检查原请求、快照和反馈去重；不访问日常服务或数据库。
 * View草稿、RewardBinding实际开窗与真实画面由其他专项和Creator复验承担；本文件不是完整应用装配验收。
 */
import { strict as assert } from "node:assert";
import { GameLog } from "../assets/scripts/core/GameLog";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { RewardController } from "../assets/scripts/features/reward/RewardController";
import { RewardModel } from "../assets/scripts/features/reward/RewardModel";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import type { SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";

/** 合法实例、战斗和反馈标识；只用于受控通信，不创建玩家数据。 */
const HERO_ID = "11111111-1111-4111-8111-111111111111";
/** 旧待结算原战斗标识，各次恢复必须原样复用。 */
const BATTLE_ID = "22222222-2222-4222-8222-222222222222";
/** 受控本地身份凭据，只存在进程内，测试不读取真实凭据。 */
const TOKEN = "a".repeat(43);

/** 已收到但尚未决定交付时机的请求，不代表服务端是否已提交。 */
interface Request {
    /** 请求所属的原连接，关闭后仍可核对迟到帧隔离。 */
    wire: Wire;
    /** 通过真实Protobuf解码的请求，保留关联id和业务参数。 */
    frame: GameFrame;
}

/** 受控双向通道；生产客户端仍负责连接代次、请求表和暂停清理。 */
class Wire {
    /** 生产客户端安装的打开回调，关闭后由客户端解除。 */
    public onopen: ((event: unknown) => void) | null = null;
    /** 生产客户端安装的二进制消息回调，用于真实信封接收。 */
    public onmessage: ((event: { data: Uint8Array }) => void) | null = null;
    /** 生产客户端安装的失败回调，测试不替代其重连规则。 */
    public onerror: ((event: unknown) => void) | null = null;
    /** 生产客户端安装的关闭回调，暂停时必须解绑。 */
    public onclose: ((event: unknown) => void) | null = null;
    /** 0连接中、1可发送、3已关闭，与原生WebSocket取值一致。 */
    public readyState = 0;
    /** 由生产客户端选择二进制模式，不参与业务断言。 */
    public binaryType = "";
    /** 模拟已协商正确子协议，错误协议另由既有专项覆盖。 */
    public protocol = GAME_SOCKET_PROTOCOL;

    /** 注入唯一受控服务端及当前连接标识，微任务交付打开。 */
    public constructor(private readonly server: ControlledServer, public readonly connectionId: string) {
        queueMicrotask(() => {
            if (this.readyState === 0) {
                this.readyState = 1;
                this.onopen?.({});
            }
        });
    }

    /** 发送经过生产编码的请求，关闭连接禁止继续发送。 */
    public send(bytes: unknown): void {
        assert.equal(this.readyState, 1, "关闭的连接不能发送新命令");
        this.server.receive({ wire: this, frame: GameProtocolCodecUtils.decodeGameFrame(bytes) });
    }

    /** 仅改变通道状态；是否重连及何时鉴权由生产客户端决定。 */
    public close(): void {
        this.readyState = 3;
    }

    /** 经真实编码交付帧，不绕过信封关联或连接代次检查。 */
    public push(frame: GameFrame): void {
        this.onmessage?.({ data: this.bytes(frame) });
    }

    /** 为当前连接附加标识，供显式调用已捕获旧回调的反例使用。 */
    public bytes(frame: GameFrame): Uint8Array {
        return GameProtocolCodecUtils.encodeGameFrame({ ...frame, connectionId: this.connectionId });
    }
}

/** 只决定信封交付顺序，所有资产变化由案例显式提供，不复刻后端保存或发奖逻辑。 */
class ControlledServer {
    /** 所有创建过的连接，暂停恢复后旧连接仍保留用于检查迟到隔离。 */
    public readonly wires: Wire[] = [];
    /** 解码后的请求顺序，包括鉴权和业务；不依赖客户端私有pending表。 */
    public readonly requests: Request[] = [];
    /** true时暂缓鉴权回包，允许在恢复连接过程中再次切后台。 */
    public holdAuthentication = false;
    /** 接下来以真实BUSY信封拒绝的鉴权次数；只控制故障交付，不改生产重连逻辑。 */
    public authenticationFailuresRemaining = 0;
    /** 本案例已经交付的BUSY鉴权次数，成功或普通状态帧不增加。 */
    public rejectedAuthentications = 0;
    /** 案例提供的最新完整状态，服务端替身不计算业务奖励。 */
    public state: any = {
        revision: 3,
        role: {
            id: "lifecycle-role", nickname: "lifecycle", serverId: "local-1", level: 1, gold: 0, diamonds: 0,
            basics: { experience: 0, cup: 1000, headId: 0, imageId: 410304012, borderId: 0,
                language: 1, createdAtSeconds: 100, lastLoginAtSeconds: 100, experienceToNextLevel: 120 },
        },
        inventory: [],
        heroes: [{ id: HERO_ID, templateId: 10105008, level: 1, star: 5 }],
        mainFormation: { version: 1, formationId: 1, slots: [{ position: 2, heroId: HERO_ID }],
            unlockedIds: [1], assistanceUnlocked: false,
            options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }] },
        mainChapter: { maxCleared: 1, pendingBattleId: BATTLE_ID, assetRevision: 3 },
    };

    /** 创建一个新通道；生产GameSocketClient独立决定是否创建。 */
    public create = (): SocketPort => {
        const wire = new Wire(this, "lifecycle-connection-" + this.wires.length);
        this.wires.push(wire);
        return wire as unknown as SocketPort;
    };

    /** 自动完成身份首包或按案例拒绝鉴权，业务帧仍由案例明确控制交付。 */
    public receive(request: Request): void {
        this.requests.push(request);
        if (request.frame.name === Protocol.SESSION_AUTHENTICATE && this.authenticationFailuresRemaining > 0) {
            this.authenticationFailuresRemaining--;
            this.rejectedAuthentications++;
            queueMicrotask(() => request.wire.push({
                version: 1,
                kind: "response",
                name: request.frame.name,
                id: request.frame.id,
                ok: false,
                body: null,
                error: { code: "BUSY", message: "鉴权暂忙", retryable: true },
            }));
            return;
        }
        if (request.frame.name === Protocol.SESSION_LOGIN
            || (request.frame.name === Protocol.SESSION_AUTHENTICATE && !this.holdAuthentication)) {
            queueMicrotask(() => this.authenticate(request));
        }
    }

    /** 交付当前完整状态，可用于恢复旧版或新版首包，不代表客户端已接纳。 */
    public authenticate(request: Request): void {
        this.reply(request, {
            connectionId: request.wire.connectionId,
            roleId: this.state.role.id,
            serverTimeMs: 100000,
            initial: this.state,
            ...(request.frame.name === Protocol.SESSION_LOGIN
                ? { session: { accessToken: TOKEN, expiresAt: "2099-01-01T00:00:00Z" } } : {}),
        });
    }

    /** 回包沿用原关联编号和真实协议名称，重复回包仍交生产请求表过滤。 */
    public reply(request: Request, body: unknown): void {
        request.wire.push({ version: 1, kind: "response", name: request.frame.name,
            id: request.frame.id, ok: true, body });
    }

    /** 将案例给定状态作为真实事件发到最新连接。 */
    public pushState(): void {
        this.wires[this.wires.length - 1].push({ version: 1, kind: "event",
            name: Protocol.STATE_CHANGED, body: this.state });
    }

    /** 只读筛选已发送协议，不通过内部Model推测是否发过命令。 */
    public matching(name: string): Request[] {
        return this.requests.filter(row => row.frame.name === name);
    }

    /** 案例显式提供保存后的完整状态，阵容版本和资产版本保持各自含义。 */
    public savedFormation(position = 3): void {
        this.state = { ...this.state, revision: 4,
            mainFormation: { ...this.state.mainFormation, version: 2, slots: [{ position, heroId: HERO_ID }] },
            mainChapter: { ...this.state.mainChapter, assetRevision: 4 } };
    }

    /** 案例显式提供原战斗已经结算的状态，不由客户端回执反推钱包。 */
    public settledState(): void {
        this.state = { ...this.state, revision: 4, role: { ...this.state.role, gold: 4000 },
            mainChapter: { maxCleared: 1, pendingBattleId: null, assetRevision: 4 } };
    }
}

/** 实际生产模块的组合；窗口可用性只影响通用展示，不改变账号或资产。 */
class Fixture {
    /** 每例独立受控服务端，所有帧均用真实Protobuf。 */
    public readonly server = new ControlledServer();
    /** 唯一账号Model，恢复同身份时不进入busy或重置页面。 */
    public readonly account = new AccountModel();
    /** 唯一背包Model，不从反馈或历史回执推导资产。 */
    public readonly bagModel = new BagModel();
    /** 唯一背包协议控制器。 */
    public readonly bag = new BagController(this.bagModel);
    /** 唯一权威英雄及阵容。 */
    public readonly heroes = new HeroRosterModel();
    /** 实际名册协议入口，统一快照校验后才更新Model。 */
    public readonly roster = new HeroRosterController(this.heroes);
    /** 保存过程状态，后台或页面关闭不清空。 */
    public readonly saves = new FormationSaveModel();
    /** 实际保存控制器，应用只注入现有交付口。 */
    public readonly formation = new FormationController(this.saves, this.heroes);
    /** 唯一主线状态及原回执。 */
    public readonly chapterModel = new MainChapterModel();
    /** 实际主线控制器，不由测试重写恢复顺序。 */
    public readonly chapter = new MainChapterController(this.chapterModel);
    /** 原通用反馈Model，计数只反映真实队列接纳。 */
    public readonly rewards = new RewardModel();
    /** 实际反馈控制器，所有重复通知仍由原去重链处理。 */
    public readonly rewardController = new RewardController(this.rewards);
    /** 已开始展示的反馈编号，窗口替身只提供异步关闭能力。 */
    public readonly shown: string[] = [];
    /** 显式关闭当前窗口的完成口，测试结束前全部释放。 */
    public closeFeedback: (() => void) | null = null;
    /** 身份清理页面次数，普通恢复不应增加。 */
    public identityChanges = 0;
    /** 真正完成鉴权并接纳完整首包的次数，包括初次登录。 */
    public readyCount = 0;
    /** 普通断线与鉴权失败触发的生产退避尝试编号；测试只把等待缩为1毫秒，不替代调度。 */
    public readonly retryAttempts: number[] = [];
    /** 实际传输客户端，所有暂停与恢复均调用公开setBackground。 */
    public readonly socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: this.server.create, validateSnapshot: () => {}, heartbeatMs: 100000, timeoutMs: 1000,
        retryDelay: attempt => {
            this.retryAttempts.push(attempt);
            return 1;
        },
    });
    /** 实际账号交付入口，测试不绕过在途身份检查。 */
    public readonly service = new AccountService(this.account, new AccountApi(this.socket), {
        read: () => null, write: () => {}, clear: () => {},
    });
    /** 唯一整包提交入口，所有模块都在同一通知批次更新。 */
    public readonly assets: AssetStateBinding;

    /** 装配实际模块，初始化仅登记协议，不触发额外业务。 */
    public constructor() {
        this.bag.initialize();
        this.roster.initialize();
        this.formation.initialize();
        this.chapter.initialize();
        this.rewardController.initialize();
        this.rewardController.configure(args => {
            this.shown.push(args.receiptId);
            return new Promise<void>(resolve => { this.closeFeedback = resolve; });
        }, () => assert.fail("本专项只准备POPUP反馈"));
        this.assets = new AssetStateBinding(this.account, this.bag,
            new RoleController(role => this.service.acceptRole(role)), this.roster, this.formation,
            () => { this.identityChanges++; this.rewardController.resetSession(); }, this.chapter);
        this.service.onInitialized = frame => this.accept(frame);
        this.socket.onState = frame => this.accept(frame);
        this.socket.onReady = () => {
            this.readyCount++;
            if (this.account.snapshot.role && this.socket.latestState) {
                this.accept(this.socket.latestState);
            }
        };
        this.socket.onReward = frame => ProtocolRouter.instance.dispatch(this.rewardController, frame);
        this.formation.configure((body, received, failed) => this.service.deliverAuthenticated(
            token => this.socket.saveFormation(token, body), received, failed),
        (received, failed) => this.service.deliverAuthenticated(token => this.socket.refreshSnapshot(token), received, failed));
        this.chapter.configure((name, body, received, failed) => this.service.deliverAuthenticated(
            token => this.socket.chapter(token, name, body), received, failed), undefined, undefined,
        (received, failed) => this.service.deliverAuthenticated(token => this.socket.refreshSnapshot(token), received, failed));
        this.chapter.configureRecoveryFeedback(receipt => {
            this.rewardController.restore(this.notice(receipt.state.assetRevision));
            return "queued";
        }, () => this.rewardController.retry());
    }

    /** 整包真正接纳后交付版本和已有恢复意图，不因重复推送伪造确认。 */
    public accept(frame: GameFrame): void {
        if (this.assets.apply(frame)) {
            const body = frame.body as any;
            this.rewardController.observeRevision((frame.name === Protocol.STATE_CHANGED ? body : body.initial).revision);
            this.chapter.afterSnapshot(frame.name);
        }
    }

    /** 返回唯一草稿参数，提交后其副本归FormationSaveModel保管。 */
    public draft(): { expectedVersion: number; formationId: number; slots: { position: number; heroId: string }[] } {
        return { expectedVersion: 1, formationId: 1, slots: [{ position: 3, heroId: HERO_ID }] };
    }

    /** 原战斗的历史结果，只有统一快照也达到4才确认。 */
    public settledReceipt(): object {
        return { action: "SETTLED", battleId: BATTLE_ID,
            state: { maxCleared: 1, pendingBattleId: null, assetRevision: 4 },
            rewards: [{ itemId: 900001, quantity: 4000 }] };
    }

    /** 同编号实时事件与历史恢复共用同内容，用于实际反馈去重。 */
    public notice(revision = 4): object {
        return { schemaVersion: 1, receiptId: BATTLE_ID, roleId: this.server.state.role.id,
            assetRevision: revision, mode: "POPUP", items: [{ itemId: 900001, credited: 4000 }] };
    }

    /** 精确调用生产后台入口并重复hide，不额外改变页面宿主或奖励就绪状态。 */
    public hide(): void {
        this.socket.setBackground(true);
        this.socket.setBackground(true);
    }

    /** 重复show只恢复一次连接；是否可以展示仍由案例的宿主决定。 */
    public show(): void {
        this.socket.setBackground(false);
        this.socket.setBackground(false);
    }

    /** 清理计时器、在途窗口及协议监听，失败案例也不留下后台任务。 */
    public dispose(): void {
        this.socket.onReady = this.socket.onState = this.socket.onReward = null;
        this.socket.disconnect();
        this.closeFeedback?.();
        this.assets.dispose();
        this.bag.dispose();
        this.rewardController.dispose();
    }
}

/** 等待生产异步链结束，超时即失败，不用无限轮询掩盖停滞。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 200; index++) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    assert.fail(message);
}

/** 案例结束前始终释放真实模块与定时器。 */
async function withFixture(check: (test: Fixture) => Promise<void>): Promise<void> {
    const test = new Fixture();
    try {
        assert(await test.service.login("lifecycle", "local-1"));
        await check(test);
    } finally {
        test.dispose();
    }
}

/** 重复hide/show不清同身份业务，也不自动重放普通写请求。 */
async function checkRepeatedLifecycle(): Promise<void> {
    await withFixture(async test => {
        const changes = test.identityChanges;
        test.hide();
        assert.equal(test.server.wires[0].readyState, 3);
        test.show();
        await until(() => test.readyCount === 2, "恢复鉴权未完成");
        assert.equal(test.identityChanges, changes, "暖重连不能关闭角色页面或重置业务");
        assert.equal(test.account.snapshot.busy, false);
        assert.equal(test.heroes.snapshot.mainFormation!.version, 1);
        assert.deepEqual(test.server.requests.map(row => row.frame.name), [Protocol.SESSION_LOGIN, Protocol.SESSION_AUTHENTICATE]);
    });
}

/** 在途保存后台中断后保留原编号和参数，前台鉴权不自动保存。 */
async function checkSaveInterrupted(committed: boolean): Promise<void> {
    await withFixture(async test => {
        const saving = test.formation.save(test.draft());
        await until(() => test.server.matching(Protocol.FORMATION_SAVE).length === 1, "保存未实际发送");
        const original = test.server.matching(Protocol.FORMATION_SAVE)[0];
        const oldMessage = original.wire.onmessage!;
        if (committed) {
            test.server.savedFormation();
        }
        test.hide();
        await saving;
        const pending = test.saves.snapshot.pending!;
        assert(pending);
        assert.equal(test.saves.snapshot.busy, false);
        test.show();
        await until(() => test.readyCount === 2, "恢复首包未接纳");
        assert.equal(test.server.matching(Protocol.FORMATION_SAVE).length, 1, "前台不能自动重放保存");
        assert.deepEqual(test.saves.snapshot.pending, pending);
        oldMessage({ data: original.wire.bytes({ version: 1, kind: "response", name: Protocol.FORMATION_SAVE,
            id: original.frame.id, ok: true, body: { requestId: pending.requestId, version: 99 } }) });
        assert.equal(test.saves.snapshot.acknowledged, null, "旧通道迟到不能确认新连接");
        const retry = test.formation.save({ ...test.draft(), slots: [] });
        await until(() => test.server.matching(Protocol.FORMATION_SAVE).length === 2, "原保存未重试");
        const request = test.server.matching(Protocol.FORMATION_SAVE)[1];
        assert.deepEqual(request.frame.body, original.frame.body, "重试必须原编号、原参数");
        test.server.savedFormation();
        test.server.pushState();
        test.server.reply(request, { requestId: pending.requestId, version: 2 });
        await retry;
        assert.equal(test.saves.snapshot.pending, null);
        assert.equal(test.saves.snapshot.acknowledged, null);
        assert.equal(test.saves.snapshot.busy, false);
        assert.equal(test.server.matching(Protocol.SESSION_AUTHENTICATE).length, 1, "状态已足够不额外刷新");
    });
}

/** ACK后快照刷新在途再次hide，保留确认意图，下一次前台首包即可确认且不再保存。 */
async function checkSaveRefreshSuspended(): Promise<void> {
    await withFixture(async test => {
        test.server.holdAuthentication = true;
        const saving = test.formation.save(test.draft());
        await until(() => test.server.matching(Protocol.FORMATION_SAVE).length === 1, "保存未发送");
        const request = test.server.matching(Protocol.FORMATION_SAVE)[0];
        test.server.savedFormation();
        test.server.reply(request, { requestId: (request.frame.body as any).requestId, version: 2 });
        await until(() => test.server.matching(Protocol.SESSION_AUTHENTICATE).length === 1, "ACK后没有一次快照刷新");
        assert.equal(test.saves.snapshot.acknowledged, 2);
        assert.equal(test.heroes.snapshot.mainFormation!.version, 1);
        const refreshing = test.server.matching(Protocol.SESSION_AUTHENTICATE)[0];
        const oldMessage = refreshing.wire.onmessage!;
        test.hide();
        await saving;
        assert.equal(test.saves.snapshot.busy, false);
        assert.equal(test.saves.snapshot.acknowledged, 2);
        test.server.holdAuthentication = false;
        test.show();
        await until(() => test.readyCount === 2, "前台未完成新鉴权");
        assert.equal(test.saves.snapshot.pending, null);
        assert.equal(test.heroes.snapshot.mainFormation!.version, 2);
        oldMessage({ data: refreshing.wire.bytes({ version: 1, kind: "response", name: Protocol.SESSION_AUTHENTICATE,
            id: refreshing.frame.id, ok: true, body: { connectionId: refreshing.wire.connectionId,
                roleId: test.server.state.role.id, serverTimeMs: 100000, initial: { ...test.server.state, revision: 99 } } }) });
        assert.equal(test.heroes.snapshot.mainFormation!.version, 2);
        assert.equal(test.server.matching(Protocol.FORMATION_SAVE).length, 1);
        assert.equal(test.server.matching(Protocol.SESSION_AUTHENTICATE).length, 2, "一次刷新被中断后，仅一次前台鉴权");
    });
}

/** 结算在途暂停，前台重取原battleId回执；重复show和状态不额外结算。 */
async function checkClaimInterrupted(): Promise<void> {
    await withFixture(async test => {
        const claiming = test.chapter.claim(BATTLE_ID);
        await until(() => test.server.matching(Protocol.CHAPTER_CLAIM).length === 1, "结算未发送");
        const original = test.server.matching(Protocol.CHAPTER_CLAIM)[0];
        const oldMessage = original.wire.onmessage!;
        test.server.settledState();
        test.hide();
        await claiming;
        assert.equal(test.chapterModel.settlement!.phase, "pending");
        test.show();
        await until(() => test.server.matching(Protocol.CHAPTER_CLAIM).length === 2, "前台未确认原结算");
        const retry = test.server.matching(Protocol.CHAPTER_CLAIM)[1];
        assert.deepEqual(retry.frame.body, original.frame.body);
        oldMessage({ data: original.wire.bytes({ version: 1, kind: "response", name: Protocol.CHAPTER_CLAIM,
            id: original.frame.id, ok: true, body: test.settledReceipt() }) });
        assert.equal(test.chapterModel.receipt, null, "旧通道原结算回执仍须丢弃");
        test.server.reply(retry, test.settledReceipt());
        await until(() => !!test.chapter.confirmedSettlement(BATTLE_ID), "原结算双确认未完成");
        test.server.reply(retry, test.settledReceipt());
        test.server.pushState();
        await test.chapter.claim(BATTLE_ID);
        assert.equal(test.server.matching(Protocol.CHAPTER_CLAIM).length, 2);
        assert.equal(test.server.matching(Protocol.CHAPTER_CHALLENGE).length, 0);
        assert.equal(test.account.snapshot.role!.gold, 4000, "资产只来自恢复首包");
        assert.equal(test.chapterModel.settlement!.presentation, "battle");
    });
}

/** 结算回执已到时刷新被后台中断，前台只补快照而不再次claim。 */
async function checkClaimRefreshSuspended(): Promise<void> {
    await withFixture(async test => {
        test.server.holdAuthentication = true;
        const claiming = test.chapter.claim(BATTLE_ID);
        await until(() => test.server.matching(Protocol.CHAPTER_CLAIM).length === 1, "结算未发送");
        const original = test.server.matching(Protocol.CHAPTER_CLAIM)[0];
        test.server.settledState();
        test.server.reply(original, test.settledReceipt());
        await until(() => test.server.matching(Protocol.SESSION_AUTHENTICATE).length === 1, "结算缺状态未刷新");
        assert.equal(test.account.snapshot.role!.gold, 0, "历史回执不能改钱包");
        test.hide();
        await claiming;
        assert.equal(test.chapterModel.receipt!.battleId, BATTLE_ID);
        test.server.holdAuthentication = false;
        test.show();
        await until(() => !!test.chapter.confirmedSettlement(BATTLE_ID), "前台快照未完成双确认");
        test.server.pushState();
        await test.chapter.claim(BATTLE_ID);
        assert.equal(test.server.matching(Protocol.CHAPTER_CLAIM).length, 1, "已有回执不重发结算");
        assert.equal(test.server.matching(Protocol.SESSION_AUTHENTICATE).length, 2);
        assert.equal(test.account.snapshot.role!.gold, 4000);
    });
}

/**
 * 单独控制宿主就绪，验证前后台、重复通知与历史回执共用原RewardController队列。
 * shown仅记录展示能力调用及其完成，不代表RewardBinding或实际窗口打开。
 */
async function checkFeedbackAcrossLifecycle(): Promise<void> {
    await withFixture(async test => {
        // 宿主就绪独立于前后台事件；先模拟尚未进入可展示页面。
        test.rewardController.setReady(false);
        const recovering = test.chapter.recoverPendingOnEntry();
        await until(() => test.server.matching(Protocol.CHAPTER_CLAIM).length === 1, "首次主线结算未发送");
        const original = test.server.matching(Protocol.CHAPTER_CLAIM)[0];
        test.server.settledState();
        test.server.pushState();
        test.server.reply(original, test.settledReceipt());
        await recovering;
        assert.equal(test.chapterModel.settlement!.presentation, "reward");
        assert.equal(test.rewards.snapshot.acceptedCount, 1);
        assert.equal(test.shown.length, 0, "宿主未就绪不弹反馈");
        test.hide();
        test.show();
        await until(() => test.readyCount === 2, "前台鉴权未完成");
        test.server.wires[1].push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: test.notice() });
        test.server.pushState();
        await test.chapter.recoverPendingOnEntry();
        test.rewardController.setReady(true);
        assert.deepEqual(test.shown, [BATTLE_ID]);
        assert.equal(test.chapterModel.settlement!.feedbackQueued, true);
        // 明确模拟离开展示宿主，不把这一步隐藏在hide里冒充生产生命周期行为。
        test.rewardController.setReady(false);
        test.hide();
        test.show();
        await until(() => test.readyCount === 3, "第二次前台鉴权未完成");
        test.rewardController.setReady(true);
        test.server.wires[2].push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: test.notice() });
        assert.deepEqual(test.shown, [BATTLE_ID], "已有展示任务不能因恢复再次启动");
        test.closeFeedback!();
        await until(() => test.rewards.snapshot.phase === "idle", "关闭反馈未消费队首");
        test.server.wires[2].push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: test.notice() });
        test.server.pushState();
        await test.chapter.claim(BATTLE_ID);
        assert.equal(test.rewards.snapshot.acceptedCount, 1);
        assert.deepEqual(test.shown, [BATTLE_ID], "已经完成的同编号反馈不得复播");
        assert.equal(test.server.matching(Protocol.CHAPTER_CLAIM).length, 1);
        assert.equal(test.server.matching(Protocol.CHAPTER_CHALLENGE).length, 0);
    });
}

/**
 * 普通断线后连续三次真实BUSY鉴权失败，再由生产自动重连恢复一次。
 * 退避仅在测试中缩为1毫秒；此例检查多轮连接和队列不变，不冒称实际长时间离线或真实窗口验收。
 */
async function checkRepeatedAuthenticationFailures(): Promise<void> {
    await withFixture(async test => {
        const identityChanges = test.identityChanges;
        const originalWire = test.server.wires[0];
        const oldMessage = originalWire.onmessage!;
        test.rewardController.setReady(true);
        test.rewardController.restore(test.notice(3));
        assert.deepEqual(test.shown, [BATTLE_ID]);
        test.server.authenticationFailuresRemaining = 3;
        originalWire.onclose!({});
        await until(() => test.readyCount === 2, "三次鉴权失败后没有恢复");
        assert.equal(test.server.rejectedAuthentications, 3);
        assert.equal(test.server.matching(Protocol.SESSION_AUTHENTICATE).length, 4);
        assert.deepEqual(test.retryAttempts, [0, 1, 2, 3], "仅生产退避安排原断线和三次失败的重试");
        assert.equal(test.identityChanges, identityChanges, "多次暂忙不能当成身份变化");
        assert.equal(test.account.snapshot.busy, false);
        assert.equal(test.heroes.snapshot.mainFormation!.version, 1);
        assert.equal(test.chapterModel.state!.assetRevision, 3);
        assert.deepEqual(test.shown, [BATTLE_ID], "重连不能重新启动已有展示任务");
        assert.equal(test.rewards.snapshot.acceptedCount, 1);
        const authentication = test.server.matching(Protocol.SESSION_AUTHENTICATE)[3];
        test.server.authenticate(authentication);
        test.server.authenticate(authentication);
        oldMessage({ data: originalWire.bytes({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED,
            body: test.notice(99) }) });
        authentication.wire.push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: test.notice(3) });
        test.server.pushState();
        assert.equal(test.readyCount, 2, "相同鉴权响应重复交付不再次ready");
        assert.equal(test.rewards.snapshot.acceptedCount, 1, "旧连接迟到和当前重复反馈不增加队列");
        assert.deepEqual(test.shown, [BATTLE_ID]);
        assert(test.server.requests.every(row => row.frame.name === Protocol.SESSION_LOGIN
            || row.frame.name === Protocol.SESSION_AUTHENTICATE), "无写意图时多次重连只能鉴权");
        assert(test.server.wires.slice(0, -1).every(wire => wire.readyState === 3), "所有旧通道均已关闭");
        test.closeFeedback!();
        await until(() => test.rewards.snapshot.phase === "idle", "关闭原展示任务后队列未清理");
        test.rewardController.restore(test.notice(3));
        assert.deepEqual(test.shown, [BATTLE_ID], "已关闭的原反馈不能因重连重复弹出");
    });
}

/** 结算回包缺失后经历三次失败鉴权，最终只确认原battleId并拒绝旧通道与重复回包。 */
async function checkClaimAfterRepeatedAuthenticationFailures(): Promise<void> {
    await withFixture(async test => {
        test.rewardController.setReady(true);
        const recovering = test.chapter.recoverPendingOnEntry();
        await until(() => test.server.matching(Protocol.CHAPTER_CLAIM).length === 1, "原结算未实际发送");
        const original = test.server.matching(Protocol.CHAPTER_CLAIM)[0];
        const oldMessage = original.wire.onmessage!;
        const identityChanges = test.identityChanges;
        test.server.settledState();
        test.server.authenticationFailuresRemaining = 3;
        original.wire.onclose!({});
        await recovering;
        await until(() => test.server.matching(Protocol.CHAPTER_CLAIM).length === 2, "多轮鉴权后未恢复原结算");
        const retry = test.server.matching(Protocol.CHAPTER_CLAIM)[1];
        assert.equal(test.server.rejectedAuthentications, 3);
        assert.equal(test.readyCount, 2, "失败的首包不交付ready");
        assert.equal(test.identityChanges, identityChanges);
        assert.deepEqual(retry.frame.body, original.frame.body, "最终恢复仍使用原战斗编号");
        assert.equal(test.account.snapshot.role!.gold, 4000, "最新资产只由鉴权首包写入");
        oldMessage({ data: original.wire.bytes({ version: 1, kind: "response", name: Protocol.CHAPTER_CLAIM,
            id: original.frame.id, ok: true, body: test.settledReceipt() }) });
        assert.equal(test.chapterModel.receipt, null, "旧通道结算回执不能完成当前确认");
        assert.equal(test.rewards.snapshot.acceptedCount, 0);
        test.server.reply(retry, test.settledReceipt());
        await until(() => !!test.chapter.confirmedSettlement(BATTLE_ID), "最终原回执没有完成双确认");
        test.server.reply(retry, test.settledReceipt());
        test.server.pushState();
        retry.wire.push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: test.notice() });
        await test.chapter.claim(BATTLE_ID);
        assert.equal(test.server.matching(Protocol.CHAPTER_CLAIM).length, 2, "只有原中断和最终同编号重取两次");
        assert.equal(test.server.matching(Protocol.CHAPTER_CHALLENGE).length, 0);
        assert.equal(test.server.matching(Protocol.SESSION_AUTHENTICATE).length, 4);
        assert.deepEqual(test.shown, [BATTLE_ID]);
        assert.equal(test.rewards.snapshot.acceptedCount, 1);
        assert.equal(test.chapterModel.state!.assetRevision, 4);
        test.closeFeedback!();
        await until(() => test.rewards.snapshot.phase === "idle", "关闭后没有消费原反馈");
        test.rewardController.restore(test.notice());
        assert.deepEqual(test.shown, [BATTLE_ID]);
    });
}

/** 只执行本文件的组合边界；既有View草稿和真实画面检查不在此重复实现。 */
async function main(): Promise<void> {
    GameLog.shared.mirrorConsole = false;
    const checks: [string, () => Promise<void>][] = [
        ["repeated hide/show keeps identity and authenticates once", checkRepeatedLifecycle],
        ["in-flight save before commit retains original intent", () => checkSaveInterrupted(false)],
        ["save committed without ACK retries original request", () => checkSaveInterrupted(true)],
        ["ACK snapshot refresh interrupted by hide", checkSaveRefreshSuspended],
        ["claim in flight resumes original battleId", checkClaimInterrupted],
        ["claim ACK snapshot refresh interrupted by hide", checkClaimRefreshSuspended],
        ["feedback dedupe across host changes and foreground snapshots", checkFeedbackAcrossLifecycle],
        ["three authentication failures recover once without replay or duplicate feedback", checkRepeatedAuthenticationFailures],
        ["claim recovers original battle after three authentication failures", checkClaimAfterRepeatedAuthenticationFailures],
    ];
    for (const [label, check] of checks) {
        await check();
        console.log("PASS " + label);
    }
    console.log("页面前后台通信组合专项：" + checks.length + "/" + checks.length + " passed");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
