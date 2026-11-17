/**
 * 挂机领取恢复的应用集成专项：真实账号交付、统一资产入口和二进制Socket共用受控服务端。
 * 仅在内存中模拟持久端口与服务端回包，并检查玩家入口仍经应用绑定；不访问日常服或运行发布构建。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type {
    IdleClaimConfirmation, IdleClaimJournalPort, IdleClaimPending,
} from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { IdleClaimBinding } from "../assets/scripts/app/remake/IdleClaimBinding";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL, GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient, SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 本批旧意图的固定业务UUID，不与Frame.id混用。 */
const requestId = "12345678-1234-4234-8234-123456789abc";
/** 登录时原意图版本为1，服务端提交后版本为2。 */
const pending: IdleClaimPending = Object.freeze({schemaVersion: 1, requestId, expectedOperationVersion: 1});

/** 通知经过实际PB往返；原请求关联可省略，通用回执编号与领取历史保持同一份。 */
function rewardFrame(sourceRequestId: string | null = requestId,
    receiptId = "22345678-1234-4234-8234-123456789abc", roleId = "role-player"): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1,
        kind: "event",
        name: Protocol.REWARD_GRANTED,
        body: {
            schemaVersion: 1,
            receiptId,
            ...(sourceRequestId === null ? {} : {requestId: sourceRequestId}),
            roleId,
            assetRevision: 8,
            mode: "POPUP",
            items: [{itemId: 900001, credited: 10}],
        },
    }));
}

/** 冻结历史回执；其中历史钱包故意不同于当前资产，防止误当快照提交。 */
function receipt(roleId: string): Record<string, unknown> {
    return {
        schemaVersion: 1, requestId, receiptId: "22345678-1234-4234-8234-123456789abc",
        expectedOperationVersion: 1, beforeOperationVersion: 1, afterOperationVersion: 2,
        committedAtSeconds: 160, previousStartedAtSeconds: 100, seconds: 60,
        maxSeconds: 43200, rewardStage: 1, assetRevision: 8,
        theoreticalRewards: [{itemId: 900001, quantity: 10}],
        actual: {
            roleId, items: [{itemId: 900001, requested: 10, credited: 10, ignored: 0, reason: "NONE"}],
            wallet: {goldBefore: 0, diamondsBefore: 0, goldAfter: 10, diamondsAfter: 0},
            stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [],
            spirits: {schemaVersion: 1, items: []},
            heroes: [],
        },
    };
}

/** 生成合法统一快照；真实资产值与历史回执分开，READ_ONLY仍可恢复历史提交。 */
function snapshot(account: string, serverId: string, revision = 8, operationVersion = 2): any {
    return {
        role: {id: "role-" + account, nickname: account, serverId, level: 2, gold: 50, diamonds: 7},
        inventory: [], heroes: [], revision,
        mainFormation: {formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 0, slots: [], options: []},
        mainChapter: {maxCleared: 1, pendingBattleId: null, assetRevision: revision},
        mainChapterIdle: {
            serverTime: 200, startedAt: 160, maxSeconds: 43200, frequency: 60, rewardStage: 1,
            rates: [{itemId: 900001, quantity: 10}], slots: [], lineupVersion: 0,
            claimState: {schemaVersion: 1, operationVersion, requestMode: "READ_ONLY"},
        },
    };
}

/** 仅模拟事务端口：不同身份有各自记录，clear必须完整指纹匹配，不保存资产。 */
class Journal {
    /** 区服/角色键到原请求，仅测试夹具可直接seed。 */
    public readonly records = new Map<string, IdleClaimPending>();
    /** 正式记录口按键复用，让旧角色的慢IO与新激活明确分开。 */
    private readonly ports = new Map<string, IdleClaimJournalPort>();
    /** 实际条件删除次数，确认未被换号/旧回包触发。 */
    public cleared = 0;
    /** 应用销毁应关闭一次存储，不删除所有记录。 */
    public closed = 0;
    /** 指定身份的打开可暂停，用于核对换号后的存储迟到。 */
    public delayedRole: string | null = null;
    /** 当前被暂停的打开任务，由测试显式释放。 */
    public release: (() => void) | null = null;
    /** 后续forRole按次数拒绝，模拟浏览器暂时拒绝持久存储。 */
    public openFailures = 0;
    /** 所有身份累计打开次数，用于检查普通状态推送没有重复激活存储。 */
    public openAttempts = 0;

    /** 将一条真实原意图放入指定身份夹具。 */
    public seed(serverId: string, roleId: string): void {
        this.records.set(JSON.stringify([serverId, roleId]), pending);
    }

    /** 返回身份绑定的端口；延迟只影响应用激活，不写模块账号字段。 */
    public async forRole(serverId: string, roleId: string): Promise<IdleClaimJournalPort> {
        this.openAttempts++;
        if (this.openFailures > 0) {
            this.openFailures--;
            throw new Error("测试存储暂时不可用");
        }
        const key = JSON.stringify([serverId, roleId]);
        if (this.delayedRole === roleId) {
            await new Promise<void>(resolve => { this.release = resolve; });
        }
        let port = this.ports.get(key);
        if (!port) {
            port = {
                read: async () => this.records.get(key) || null,
                create: async request => {
                    const stored = this.records.get(key);
                    if (stored) {
                        return stored;
                    }
                    this.records.set(key, request);
                    return request;
                },
                clear: async request => {
                    const stored = this.records.get(key);
                    if (stored?.requestId !== request.requestId
                        || stored.expectedOperationVersion !== request.expectedOperationVersion
                        || stored.schemaVersion !== request.schemaVersion) {
                        return false;
                    }
                    this.records.delete(key);
                    this.cleared++;
                    return true;
                },
            };
            this.ports.set(key, port);
        }
        return port;
    }

    /** 应用关闭只结束句柄，保留所有身份的持久原意图。 */
    public dispose(): void {
        this.closed++;
    }
}

/** 传输端口仍经过实际PB编解码，不将JSON测试数据直接路由给模块。 */
class Wire {
    /** 平台回调由GameSocketClient安装，关闭时置空。 */
    public onopen: any = null;
    /** 二进制消息回调，由测试服务端投递。 */
    public onmessage: any = null;
    /** 连接错误回调，用于模拟平台失败。 */
    public onerror: any = null;
    /** 关闭回调，由真实通信层负责重连。 */
    public onclose: any = null;
    /** 0等待、1打开、3关闭，遵守浏览器基础状态。 */
    public readyState = 0;
    /** 通信层必须设置为arraybuffer。 */
    public binaryType = "";
    /** 子协议必须与客户端严格相同。 */
    public protocol = GAME_SOCKET_PROTOCOL;

    /** 创建后异步打开，保证通信层先安装回调。 */
    public constructor(
        /** 受控服务端拥有请求记录及回包。 */
        private readonly server: Server,
        /** 每条连接唯一，不等同资产或领取操作版本。 */
        public readonly connection: string,
    ) {
        queueMicrotask(() => {
            this.readyState = 1;
            this.onopen?.({});
        });
    }

    /** 客户端只发送真实二进制帧，解码后交给受控服务端。 */
    public send(value: unknown): void {
        this.server.receive(this, GameProtocolCodecUtils.decodeGameFrame(value));
    }

    /** 模拟平台关闭，不主动抛出业务拒绝。 */
    public close(): void {
        this.readyState = 3;
    }

    /** 回包也做真实编码，错误结构不能绕过协议校验。 */
    public push(frame: GameFrame): void {
        this.onmessage?.({data: GameProtocolCodecUtils.encodeGameFrame({...frame, connectionId: this.connection})});
    }
}

/** 只实现登录、鉴权和两条挂机协议；出现其他请求即让专项失败。 */
class Server {
    /** 当前测试角色最新完整状态，登录时由快照工厂建立。 */
    public state: any = null;
    /** 全部真实请求，用于核实没有重复库存/HTTP链。 */
    public readonly requests: GameFrame[] = [];
    /** 连接列表便于投递旧通道迟到帧。 */
    public readonly wires: Wire[] = [];
    /** 登录快照可设为提交前版本，测试丢失state.changed。 */
    public loginRevision = 8;
    /** 登录消费版本与统一revision分开，双条件分别检查。 */
    public loginOperation = 2;
    /** status可返回未提交；READ_ONLY时不能误发送领取。 */
    public committed = true;
    /** 非空时故意制造跨角色历史回执。 */
    public receiptOwner: string | null = null;
    /** 暂停指定角色的status，模拟换号前的在途结果。 */
    public holdStatusRole: string | null = null;
    /** 被暂停的回包列表；切换连接后释放应由真实通信层丢弃。 */
    public readonly delayed: Array<() => void> = [];
    /** 鉴权时才推进状态，模拟已提交但通知丢失。 */
    public beforeAuthenticate: (() => void) | null = null;

    /** 连接创建口注入真实GameSocketClient。 */
    public create = (): SocketPort => {
        const wire = new Wire(this, "idle-connection-" + this.wires.length);
        this.wires.push(wire);
        return wire as unknown as SocketPort;
    };

    /** 处理二进制请求，成功响应始终回显原Frame.id和协议名。 */
    public receive(wire: Wire, frame: GameFrame): void {
        this.requests.push(frame);
        const body = frame.body as any;
        if (frame.name === Protocol.SESSION_LOGIN) {
            this.state = snapshot(body.account, body.serverId, this.loginRevision, this.loginOperation);
        } else if (frame.name === Protocol.SESSION_AUTHENTICATE) {
            this.beforeAuthenticate?.();
        } else if (frame.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
            const owner = this.state.role.id;
            const response = this.committed ? {requestId: body.requestId, status: "COMMITTED",
                receipt: receipt(this.receiptOwner || owner)} : {requestId: body.requestId, status: "NOT_FOUND"};
            const deliver = () => this.respond(wire, frame, response);
            if (owner === this.holdStatusRole) {
                this.delayed.push(deliver);
            } else {
                queueMicrotask(deliver);
            }
            return;
        } else {
            assert.fail("恢复专项出现未授权请求：" + frame.name);
        }
        const accepted = {connectionId: wire.connection, roleId: this.state.role.id, serverTimeMs: 200000,
            initial: this.state, ...(frame.name === Protocol.SESSION_LOGIN ? {
                session: {accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z"},
            } : {})};
        queueMicrotask(() => this.respond(wire, frame, accepted));
    }

    /** 真实信封成功回包，不直接调用模块onNotify。 */
    private respond(wire: Wire, request: GameFrame, body: unknown): void {
        wire.push({version: 1, kind: "response", name: request.name, id: request.id, ok: true, body});
    }

    /** 推送新统一状态，当前连接自行做版本、归属及信封校验。 */
    public pushState(revision: number, operationVersion: number): void {
        this.state = {...this.state, revision,
            mainChapter: {...this.state.mainChapter, assetRevision: revision},
            mainChapterIdle: {...this.state.mainChapterIdle,
                claimState: {...this.state.mainChapterIdle.claimState, operationVersion}}};
        this.wires[this.wires.length - 1].push({version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: this.state});
    }
}

/** 一次独立应用装配，共用真实状态入口；释放时退出连接，不能保留测试定时器。 */
class Application {
    /** 受控服务端，每个案例独立实例。 */
    public readonly server = new Server();
    /** 测试持久端口；应用析构不删除记录。 */
    public readonly journal = new Journal();
    /** 唯一账号Model，历史回执不得改变其余额。 */
    public readonly account = new AccountModel();
    /** 唯一主线Model，领取状态与权威快照分开保存。 */
    public readonly chapterModel = new MainChapterModel();
    /** 真实连接负责旧通道隔离和请求关联。 */
    public readonly socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: this.server.create, validateSnapshot: () => {}, heartbeatMs: 100000,
        retryDelay: () => 100000, timeoutMs: 1000,
    });
    /** 账号服务交付当前身份结果，测试不绕过它直接提交领取回执。 */
    public readonly service = new AccountService(this.account, new AccountApi(this.socket), {
        read: () => null, write: () => {}, clear: () => {},
    });
    /** 应用转交到通用奖励模块的双确认结果，不根据其中的历史余额写资产。 */
    public readonly feedbacks: RewardNotice[] = [];
    /** 完整确认信号供应用同时协调零到账、现场收取及历史反馈。 */
    public readonly confirmations: IdleClaimConfirmation[] = [];
    /** 领取恢复应用绑定，对当前状态只读。 */
    public readonly binding = new IdleClaimBinding(this.account, this.service, this.socket, this.journal,
        this.chapterModel, confirmation => {
            this.confirmations.push(confirmation);
            if (confirmation.receipt.feedback) {
                this.feedbacks.push(confirmation.receipt.feedback);
            }
        });
    /** 背包实例只接受统一状态，不查询库存。 */
    private readonly bag = new BagController(new BagModel());
    /** 原主线模块负责权威idle快照。 */
    private readonly chapter = new MainChapterController(this.chapterModel);
    /** 实际整包提交入口，绑定身份变化时先撤销领取内存。 */
    private readonly assets = new AssetStateBinding(this.account, this.bag,
        new RoleController(role => this.service.acceptRole(role)), undefined, undefined,
        () => this.binding.deactivate(), this.chapter);

    /** 安装和正式应用同一顺序的首包、事件和重连交付。 */
    public constructor() {
        this.bag.initialize();
        this.chapter.initialize();
        const accept = (frame: GameFrame) => {
            if (this.assets.apply(frame)) {
                this.binding.afterSnapshot(frame.name);
            }
        };
        this.service.onInitialized = accept;
        this.socket.onState = accept;
        this.socket.onReady = () => {
            if (!this.account.snapshot.busy && this.account.snapshot.role && this.socket.latestState) {
                accept(this.socket.latestState);
            }
        };
    }

    /** 测试结束解除所有模块和计时器，不清理原请求。 */
    public dispose(): void {
        this.binding.dispose();
        this.socket.onReady = this.socket.onState = null;
        this.socket.disconnect();
        this.assets.dispose();
        this.bag.dispose();
    }
}

/** 等待真实Promise/消息队列，有界失败而不使用长睡眠假定结果。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 200; index++) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert.fail(message);
}

/** 旧回执可在当前READ_ONLY下恢复，确认不会将历史钱包写回当前账号。 */
async function checkReadOnlyCommitted(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    try {
        assert(await app.service.login("player", "local-1"), app.account.snapshot.error);
        await until(() => app.chapterModel.idleClaim.phase === "confirmed", "只读历史回执未完成双确认");
        assert.equal(app.journal.cleared, 1);
        assert.equal(app.feedbacks.length, 1);
        assert.equal(app.confirmations.length, 1);
        assert.equal(app.confirmations[0].presentationContext, null, "冷恢复不凭空借用显示现场");
        assert.equal(app.confirmations[0].receipt.seconds, 60);
        assert.equal(app.confirmations[0].receipt.maxSeconds, 43200);
        assert.deepEqual(app.feedbacks[0].items, [{ itemId: 900001, credited: 10 }]);
        assert.equal(app.account.snapshot.role!.gold, 50);
        assert.equal(app.account.snapshot.role!.diamonds, 7);
        assert.equal(app.chapterModel.idle!.startedAt, 160);
        assert.equal(app.chapterModel.idle!.claimState!.requestMode, "READ_ONLY");
        assert.deepEqual(app.server.requests.map(row => row.name), [Protocol.SESSION_LOGIN, Protocol.CHAPTER_IDLE_CLAIM_STATUS]);
    } finally {
        app.dispose();
    }
}

/** 匹配原请求的提前通知等待双确认；无关联、其他请求及完成后的迟到通知交回通用入口。 */
async function checkRewardRouting(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.server.loginRevision = 7;
    app.server.loginOperation = 1;
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => app.chapterModel.idleClaim.phase === "waiting-state", "提前奖励测试未进入双确认等待");
        assert.equal(app.confirmations.length, 0);
        assert.equal(await app.binding.receiveReward(rewardFrame()), true,
            "同原请求通知不能绕开回执及两种状态版本确认");
        assert.equal(await app.binding.receiveReward(rewardFrame(null)), false, "通用无关联奖励不能被挂机吞掉");
        assert.equal(await app.binding.receiveReward(rewardFrame("32345678-1234-4234-8234-123456789abc")), false,
            "其他请求奖励继续走通用队列");
        await assert.rejects(
            () => app.binding.receiveReward(rewardFrame(requestId, "42345678-1234-4234-8234-123456789abc")),
            (error: any) => error.code === "INVALID_MESSAGE",
            "同请求不同回执不能被当作同一成功反馈",
        );
        await assert.rejects(
            () => app.binding.receiveReward(rewardFrame(requestId, undefined, "role-other")),
            (error: any) => error.code === "INVALID_MESSAGE",
            "跨角色提前通知必须在应用边界拒绝",
        );
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.confirmations.length, 0);
        app.server.pushState(9, 2);
        await until(() => app.confirmations.length === 1, "后到状态未交付完整确认");
        assert.equal(app.chapterModel.idleClaim.phase, "confirmed");
        assert.equal(await app.binding.receiveReward(rewardFrame()), false,
            "已确认的迟到通知复用通用回执去重，不另存挂机去重表");
        assert.equal(app.confirmations.length, 1);
        assert.equal(app.feedbacks.length, 1);
    } finally {
        app.dispose();
    }
}

/** 持久口尚未打开时通知先等待；等待期间换号后直接丢弃旧通知，不交给新角色通用反馈。 */
async function checkDelayedRewardAcrossIdentity(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.journal.delayedRole = "role-player";
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => !!app.journal.release, "通知测试未暂停持久口打开");
        let completed = false;
        const receiving = app.binding.receiveReward(rewardFrame()).then(consumed => {
            completed = true;
            return consumed;
        });
        await Promise.resolve();
        assert.equal(completed, false, "原日志尚未打开时不能提前把未知通知交给通用队列");
        assert(await app.service.login("other", "local-2"));
        app.journal.release!();
        assert.equal(await receiving, true, "旧激活代次结束后直接丢弃通知");
        assert.equal(app.account.snapshot.role!.id, "role-other");
        assert.equal(app.confirmations.length, 0);
        assert.equal(app.feedbacks.length, 0);
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
    } finally {
        app.dispose();
    }
}

/** 回执先于资产时只能补一次鉴权首包；资产/操作版本任一落后都不得清理。 */
async function checkMissingStateAndDualVersions(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.server.loginRevision = 7;
    app.server.loginOperation = 1;
    app.server.beforeAuthenticate = () => {
        app.server.state = {...app.server.state, revision: 8,
            mainChapter: {...app.server.state.mainChapter, assetRevision: 8}};
    };
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => app.chapterModel.idleClaim.phase === "waiting-state", "缺少操作版本时应等待状态");
        assert.equal(app.journal.cleared, 0, "资产版本达到，但操作版本未达到仍不可清理");
        assert.equal(app.server.requests.filter(row => row.name === Protocol.SESSION_AUTHENTICATE).length, 1);
        app.server.pushState(9, 2);
        await until(() => app.chapterModel.idleClaim.phase === "confirmed", "后到统一状态未完成确认");
        assert.equal(app.journal.cleared, 1);
        assert.equal(app.server.requests.filter(row => row.name === Protocol.SESSION_AUTHENTICATE).length, 1);
        assert(!app.server.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM));
    } finally {
        app.dispose();
    }
}

/** 未提交加READ_ONLY仅保留原意图；退出清内存、保留记录，重登仍查原编号。 */
async function checkReadOnlyNotFoundAndRelogin(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.server.committed = false;
    app.server.loginOperation = 1;
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => app.chapterModel.idleClaim.phase === "paused", "只读未提交应保留原意图");
        assert.equal(app.journal.cleared, 0);
        assert.deepEqual(app.chapterModel.idleClaim.pending, pending);
        app.service.logout();
        assert.equal(app.chapterModel.idleClaim.pending, null);
        assert.equal(app.journal.records.size, 1);
        app.server.committed = true;
        app.server.loginOperation = 2;
        assert(await app.service.login("player", "local-1"));
        await until(() => app.chapterModel.idleClaim.phase === "confirmed", "重登未继续恢复原意图");
        const status = app.server.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS);
        assert.equal(status.length, 2);
        assert(status.every(row => (row.body as any).requestId === requestId));
        assert(!app.server.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM));
    } finally {
        app.dispose();
    }
}

/** 旧身份慢存储与旧网络成功都不能激活新身份或清理原身份持久记录。 */
async function checkIdentityAndLateResults(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.journal.delayedRole = "role-player";
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => !!app.journal.release, "未产生可控慢存储任务");
        assert(await app.service.login("other", "local-2"));
        app.journal.release!();
        await new Promise(resolve => setTimeout(resolve, 10));
        await until(() => app.chapterModel.idleClaim.phase === "idle", "新身份应无旧意图");
        assert.equal(app.account.snapshot.role!.id, "role-other");
        assert.equal(app.journal.records.size, 1);
        assert(!app.server.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS));
        app.journal.delayedRole = null;
        app.server.holdStatusRole = "role-player";
        assert(await app.service.login("player", "local-1"));
        await until(() => app.server.delayed.length === 1, "未暂停旧身份状态请求");
        assert(await app.service.login("other", "local-2"));
        await until(() => app.chapterModel.idleClaim.phase === "idle", "新身份的空记录读取尚未完成");
        const current = app.chapterModel.idleClaim;
        app.server.delayed[0]();
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(app.chapterModel.idleClaim, current);
        assert.equal(app.account.snapshot.role!.id, "role-other");
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
    } finally {
        app.dispose();
    }
    assert.equal(app.journal.closed, 1);
    assert.equal(app.journal.records.size, 1, "应用销毁不能删除旧身份记录");
}

/** 服务端回执结构合法但属于另一角色时，应用必须在路由前拒绝并保留原请求。 */
async function checkCrossRoleReceipt(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.server.receiptOwner = "role-other";
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => app.chapterModel.idleClaim.phase === "blocked",
            "跨角色回执没有被拒绝");
        assert.equal(app.chapterModel.idleClaim.receipt, null);
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.account.snapshot.role!.gold, 50);
        assert.equal(app.journal.records.size, 1);
        assert.equal(app.server.requests.filter(row => row.name === Protocol.SESSION_AUTHENTICATE).length, 0);
        const statusCount = app.server.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS).length;
        await app.service.authenticated(token => app.socket.refreshSnapshot(token));
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(app.chapterModel.idleClaim.phase, "blocked", "同身份重新认证不能自动清除非法回执阻断");
        assert.equal(app.server.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS).length, statusCount,
            "非法回执阻断后不自动重查或重发");
    } finally {
        app.dispose();
    }
}

/** 持久存储暂不可用时，普通状态事件不反复告警；只有下一次真实鉴权首包重试激活。 */
async function checkJournalActivationRetry(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.journal.openFailures = 1;
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => app.journal.openAttempts === 1, "未尝试激活持久记录");
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
        assert.deepEqual(app.server.requests.map(row => row.name), [Protocol.SESSION_LOGIN]);
        app.server.pushState(9, 2);
        app.server.pushState(10, 2);
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(app.journal.openAttempts, 1, "普通state.changed不应反复激活不可用存储");
        assert.equal(app.account.snapshot.role!.gold, 50, "存储失败不影响普通统一状态提交");
        await app.service.authenticated(token => app.socket.refreshSnapshot(token));
        await until(() => app.chapterModel.idleClaim.phase === "confirmed", "重新鉴权没有恢复存储激活");
        assert.equal(app.journal.openAttempts, 2);
        assert.equal(app.journal.cleared, 1);
        assert.equal(app.server.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS).length, 1);
        assert(!app.server.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM));
    } finally {
        app.dispose();
    }
}

/**
 * 旧回执A仍待状态时，其他标签页已确认A并保存B；同身份新鉴权必须直接恢复B。
 * 鉴权先做普通本地观察会占住confirm流程，随后recover复用它，导致只暂停B而没有查询。
 */
async function checkAuthenticatedRecoveryAfterJournalReplacement(): Promise<void> {
    const app = new Application();
    app.journal.seed("local-1", "role-player");
    app.server.loginRevision = 7;
    app.server.loginOperation = 1;
    app.server.beforeAuthenticate = () => {
        app.server.state = {...app.server.state, revision: 8,
            mainChapter: {...app.server.state.mainChapter, assetRevision: 8}};
    };
    try {
        assert(await app.service.login("player", "local-1"));
        await until(() => app.chapterModel.idleClaim.phase === "waiting-state"
            && app.server.requests.filter(row => row.name === Protocol.SESSION_AUTHENTICATE).length === 1,
            "旧回执A应在一次鉴权后继续等待操作版本");
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(app.chapterModel.idleClaim.receipt!.requestId, requestId);
        assert.equal(app.chapterModel.idle!.claimState!.operationVersion, 1);

        const next: IdleClaimPending = Object.freeze({schemaVersion: 1,
            requestId: "32345678-1234-4234-8234-123456789abc", expectedOperationVersion: 2});
        // 仅改变测试持久口，代表另一个连接已完成A并原子保存B；不在本页伪造普通状态事件。
        app.journal.records.set(JSON.stringify(["local-1", "role-player"]), next);
        app.server.committed = false;
        app.server.beforeAuthenticate = () => {
            app.server.state = {...app.server.state, revision: 9,
                mainChapter: {...app.server.state.mainChapter, assetRevision: 9},
                mainChapterIdle: {...app.server.state.mainChapterIdle,
                    claimState: {...app.server.state.mainChapterIdle.claimState, operationVersion: 2}}};
        };
        await app.service.authenticated(token => app.socket.refreshSnapshot(token));
        await until(() => app.server.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS
            && (row.body as {requestId?: string}).requestId === next.requestId),
            "同身份鉴权被普通观察占用，未恢复新的原请求B");
        await until(() => app.chapterModel.idleClaim.phase === "paused"
            && app.chapterModel.idleClaim.pending?.requestId === next.requestId,
            "B未提交且READ_ONLY时应暂停原记录");
        assert.equal(app.server.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS
            && (row.body as {requestId?: string}).requestId === next.requestId).length, 1);
        assert.equal(app.chapterModel.idleClaim.receipt, null, "旧回执A不能当成B的确认");
        assert.equal(app.journal.cleared, 0, "本页不得借A回执删除后来B");
        assert.deepEqual(app.journal.records.get(JSON.stringify(["local-1", "role-player"])), next);
        assert(!app.server.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM));
        assert.equal(app.account.snapshot.role!.gold, 50);
    } finally {
        app.dispose();
    }
}

/** 玩家页只转交意图、不创建第二个领取控制器；只有local默认启用，通用服务配置仍保留显式开关。 */
function checkPlayerEntryBoundary(): void {
    const source = readFileSync("client/assets/scripts/features/battle/ui/MainChapterView.ts", "utf8");
    assert(!source.includes("MainChapterIdleClaimController"));
    const properties = readFileSync("backend/src/main/resources/application.yml", "utf8");
    assert.match(properties, /idle-claim-enabled:\s*\$\{MXZG_MAIN_CHAPTER_IDLE_CLAIM_ENABLED:false\}/);
    const local = readFileSync("backend/src/main/resources/application-local.yml", "utf8");
    assert.match(local, /idle-claim-enabled:\s*\$\{MXZG_MAIN_CHAPTER_IDLE_CLAIM_ENABLED:true\}/);
}

/** 全部案例均走本机受控二进制通信，不要求Creator刷新或发布构建。 */
async function main(): Promise<void> {
    checkPlayerEntryBoundary();
    await checkReadOnlyCommitted();
    await checkMissingStateAndDualVersions();
    await checkReadOnlyNotFoundAndRelogin();
    await checkIdentityAndLateResults();
    await checkCrossRoleReceipt();
    await checkJournalActivationRetry();
    await checkAuthenticatedRecoveryAfterJournalReplacement();
    await checkRewardRouting();
    await checkDelayedRewardAcrossIdentity();
    console.log("PASS idle claim application binding: readonly history, dual versions, bounded reauth, logout/relogin, late storage/wire, owner blocking, storage activation retry, authenticated A/B replacement, reward routing and local entry boundary");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
