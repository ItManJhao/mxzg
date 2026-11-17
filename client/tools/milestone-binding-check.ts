/**
 * 里程碑领取的应用装配专项：真实AccountService、Controller和PB Socket共用受控二进制服务端。
 * 只替换持久口和反馈展示能力，验证原意图、快照双确认与身份生命周期；不连接日常库或运行构建。
 */
import { strict as assert } from "node:assert";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { MainChapterMilestoneReceipt } from "../assets/scripts/features/battle/data/MainChapterMilestoneData";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { MainChapterMilestoneBinding } from "../assets/scripts/app/remake/MainChapterMilestoneBinding";
import { MilestoneClaimJournal } from "../assets/scripts/app/remake/MilestoneClaimJournal";
import type { MilestoneClaimPending } from "../assets/scripts/app/remake/MilestoneClaimJournal";
import type { OperationJournalPort } from "../assets/scripts/framework/PersistentOperationJournal";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import type { SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { GameLog } from "../assets/scripts/core/GameLog";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";

/** 同一个稳定目标贯穿持久化、请求、历史回执与反馈，不创建第二个业务ID。 */
const pending: MilestoneClaimPending = Object.freeze({ schemaVersion: 1, rewardId: 1 });
/** 模拟服务端首次成功冻结的唯一回执；重复恢复仍保留原编号。 */
const receiptId = "22345678-1234-4234-8234-123456789abc";

/** 生成统一首包；历史奖励不能把当前钱包50改成其到账明细中的10。 */
function snapshot(account: string, serverId: string, committed: boolean): any {
    const revision = committed ? 8 : 7;
    return {
        role: { id: "role-" + account, nickname: account, serverId, level: 2, gold: 50, diamonds: 7 },
        inventory: [], heroes: [], revision,
        mainFormation: { formationId: 1, unlockedIds: [1], assistanceUnlocked: false, version: 0, slots: [], options: [] },
        mainChapter: { maxCleared: 15, pendingBattleId: null, assetRevision: revision, challengeLimit: 20,
            milestoneProgress: { schemaVersion: 1, claimedIds: committed ? [1] : [] } },
    };
}

/** PB回执仅描述原提交的冻结结果；构造合法历史进度，不借它更新当前快照。 */
function receipt(roleId: string): Record<string, unknown> {
    return { schemaVersion: 1, rewardId: 1, receiptId, roleId, assetRevision: 8, targetChapter: 15,
        rulesVersion: "chapter-milestone-v1:" + "a".repeat(64),
        state: { maxCleared: 15, pendingBattleId: null, assetRevision: 8, challengeLimit: 20,
            milestoneProgress: { schemaVersion: 1, claimedIds: [1] } },
        actual: { roleId, items: [{ itemId: 900001, requested: 10, credited: 10, ignored: 0, reason: "NONE" }],
            bonuses: [], experience: [], heroes: [], stacks: [], tavern: [], timedItems: [],
            wallet: { goldBefore: 0, goldAfter: 10, diamondsBefore: 0, diamondsAfter: 0 },
            spirits: { schemaVersion: 1, items: [] } } };
}

/** 可控存储能力只实现事务端口合同，不复制IndexedDB实现；真实原生日志另有浏览器专项。 */
class Journal {
    /** 每个身份的原稳定意图；seed仅供独立夹具准备冷恢复。 */
    public readonly records = new Map<string, MilestoneClaimPending>();
    /** 成功的条件删除次数，旧身份不能触发它。 */
    public cleared = 0;
    /** 失败后重试仍要对同一意图清理，不能借重试创建下一目标。 */
    public clearFailures = 0;
    /** 暂停下一次create，检查存储提交前绝无网络请求。 */
    public holdCreate = false;
    /** 下一次create拒绝，模拟存储配额/权限暂时失败。 */
    public createFailures = 0;
    /** 测试显式释放持久化操作，不用固定睡眠猜完成。 */
    public releaseCreate: (() => void) | null = null;
    /** 指定身份的打开可暂停，核实换号后慢存储不接管新身份。 */
    public holdRole: string | null = null;
    /** 释放旧身份的打开任务。 */
    public releaseOpen: (() => void) | null = null;
    /** 打开失败次数，认证时可有界重试。 */
    public openFailures = 0;
    /** 记录dispose归属，不删除已提交记录。 */
    public closed = 0;

    /** 准备隔离角色的旧意图，不生成玩家资产。 */
    public seed(account = "player", serverId = "local-1"): void {
        this.records.set(JSON.stringify([serverId, "role-" + account]), pending);
    }

    /** 按真实身份建立不可变条件口，create保留已有意图而不覆盖。 */
    public async forRole(serverId: string, roleId: string): Promise<OperationJournalPort<MilestoneClaimPending>> {
        if (this.openFailures-- > 0) {
            throw new Error("测试存储打开失败");
        }
        if (this.holdRole === roleId) {
            await new Promise<void>(resolve => { this.releaseOpen = resolve; });
        }
        const key = JSON.stringify([serverId, roleId]);
        return Object.freeze({
            read: async () => this.records.get(key) || null,
            create: async (candidate: MilestoneClaimPending) => {
                if (this.holdCreate) {
                    await new Promise<void>(resolve => { this.releaseCreate = resolve; });
                }
                if (this.createFailures-- > 0) {
                    throw new Error("测试持久化失败");
                }
                const current = this.records.get(key) || Object.freeze({ ...candidate });
                this.records.set(key, current);
                return current;
            },
            clear: async (expected: MilestoneClaimPending) => {
                if (this.clearFailures-- > 0) {
                    throw new Error("测试清理失败");
                }
                const current = this.records.get(key);
                if (!current || current.schemaVersion !== expected.schemaVersion || current.rewardId !== expected.rewardId) {
                    return false;
                }
                this.records.delete(key);
                this.cleared++;
                return true;
            },
        });
    }

    /** 应用销毁只关闭句柄，保留各身份原意图。 */
    public dispose(): void {
        this.closed++;
    }
}

/** 仍传真实PB二进制的隔离连接，旧通道隔离由生产GameSocketClient完成。 */
class Wire {
    /** 平台连接、二进制、错误和关闭回调由真实通信层安装。 */
    public onopen: any = null;
    /** 收到真实二进制帧时调用。 */
    public onmessage: any = null;
    /** 平台连接错误回调。 */
    public onerror: any = null;
    /** 平台连接关闭回调。 */
    public onclose: any = null;
    /** 0连接中、1打开、3关闭，沿浏览器合同。 */
    public readyState = 0;
    /** 真实Socket必须设arraybuffer。 */
    public binaryType = "";
    /** 只接受项目当前子协议。 */
    public protocol = GAME_SOCKET_PROTOCOL;

    /** 为独立服务端建立可识别连接，不持玩家凭证。 */
    public constructor(private readonly server: Server, public readonly connection: string) {
        queueMicrotask(() => { this.readyState = 1; this.onopen?.({}); });
    }

    /** 双向都经正式编解码，未知合同不能绕过Controller或Socket校验。 */
    public send(value: unknown): void {
        this.server.receive(this, GameProtocolCodecUtils.decodeGameFrame(value));
    }

    /** 模拟平台关闭，不另造请求或清理业务意图。 */
    public close(): void {
        this.readyState = 3;
    }

    /** 绑定本连接身份投递真实PB帧。 */
    public push(frame: GameFrame): void {
        this.onmessage?.({ data: GameProtocolCodecUtils.encodeGameFrame({ ...frame, connectionId: this.connection }) });
    }
}

/** 只服务登录/鉴权及里程碑两条请求，真实资产入口与客户端连接逻辑保持生产实现。 */
class Server {
    /** 当前认证角色的最新完整快照，历史回执不会直接写它。 */
    public state: any = null;
    /** 全部真实请求，断言原键和发送时序。 */
    public readonly requests: GameFrame[] = [];
    /** 保存旧连接，用于释放换号前迟到回包。 */
    public readonly wires: Wire[] = [];
    /** 冷登录时已提交状态；false用于回执先于快照场景。 */
    public loginCommitted = false;
    /** status是否找到原成功回执；false只代表原稳定键尚未找到。 */
    public found = true;
    /** 状态先到时先真实推送，再释放领取回执。 */
    public stateFirst = false;
    /** 领取成功是否立即推送状态；false核实有界重新鉴权后仍等待。 */
    public autoState = true;
    /** 暂停领取/查询回包，测试不同交付先后和换号。 */
    public holdReply = false;
    /** 待显式释放的原回包，闭包冻结其角色归属。 */
    public readonly delayed: Array<() => void> = [];
    /** 恶意旧回执的错误归属，生产应用应拒绝它。 */
    public wrongRole = false;
    /** 领取失败信封次数，检查网络拒绝后仍保留原键而不是改成下一目标。 */
    public claimFailures = 0;
    /** 是否在持久化完成前提前发送，由夹具独立断言。 */
    public beforeClaim: (() => void) | null = null;

    /** 实际通信层的连接创建入口。 */
    public create = (): SocketPort => {
        const wire = new Wire(this, "milestone-connection-" + this.wires.length);
        this.wires.push(wire);
        return wire as unknown as SocketPort;
    };

    /** 处理已解码请求，查询与领取不混用业务状态，其他消息直接使专项失败。 */
    public receive(wire: Wire, frame: GameFrame): void {
        this.requests.push(frame);
        const body = frame.body as any;
        if (frame.name === Protocol.SESSION_LOGIN || frame.name === Protocol.SESSION_AUTHENTICATE) {
            if (frame.name === Protocol.SESSION_LOGIN) {
                this.state = snapshot(body.account, body.serverId, this.loginCommitted);
            }
            const accepted = { connectionId: wire.connection, roleId: this.state.role.id, serverTimeMs: 200000,
                initial: this.state, ...(frame.name === Protocol.SESSION_LOGIN ? {
                    session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" },
                } : {}) };
            queueMicrotask(() => this.respond(wire, frame, accepted));
            return;
        }
        assert([Protocol.CHAPTER_MILESTONE_CLAIM, Protocol.CHAPTER_MILESTONE_STATUS].includes(frame.name as any), frame.name);
        assert.equal(body.rewardId, 1, "本轮只能发送持久化的原稳定键");
        if (frame.name === Protocol.CHAPTER_MILESTONE_CLAIM && this.claimFailures-- > 0) {
            queueMicrotask(() => wire.push({ version: 1, kind: "response", name: frame.name,
                id: frame.id, ok: false,
                error: { code: "TEMPORARY_UNAVAILABLE", message: "测试原命令暂时失败", retryable: true } }));
            return;
        }
        const roleId = this.wrongRole ? "role-other" : this.state.role.id;
        const response = frame.name === Protocol.CHAPTER_MILESTONE_STATUS
            ? { rewardId: 1, found: this.found, ...(this.found ? { receipt: receipt(roleId) } : {}) } : receipt(roleId);
        if (frame.name === Protocol.CHAPTER_MILESTONE_CLAIM) {
            this.beforeClaim?.();
        }
        if (frame.name === Protocol.CHAPTER_MILESTONE_CLAIM && this.stateFirst) {
            this.pushCommitted();
        }
        const deliver = () => {
            this.respond(wire, frame, response);
            if (frame.name === Protocol.CHAPTER_MILESTONE_CLAIM && this.autoState && !this.stateFirst) {
                this.pushCommitted();
            }
        };
        if (this.holdReply) {
            this.delayed.push(deliver);
        } else {
            queueMicrotask(deliver);
        }
    }

    /** 使用原Frame.id回显成功信封，不直接调用模块onNotify。 */
    private respond(wire: Wire, frame: GameFrame, body: unknown): void {
        wire.push({ version: 1, kind: "response", name: frame.name, id: frame.id, ok: true, body });
    }

    /** 只从服务端夹具推进统一快照；主线Model仍由真实AssetStateBinding接纳。 */
    public pushCommitted(): void {
        this.state = { ...this.state, revision: 8, mainChapter: { ...this.state.mainChapter,
            assetRevision: 8, milestoneProgress: { schemaVersion: 1, claimedIds: [1] } } };
        this.wires[this.wires.length - 1].push({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: this.state });
    }
}

/** 与应用相同的装配顺序，唯一资产入口、Controller和账号交付均为真实类。 */
class Application {
    /** 每个案例隔离服务端请求和资产，不访问网络。 */
    public readonly server = new Server();
    /** 只有存储能力用可控端口替换。 */
    public readonly journal = new Journal();
    /** 唯一账号状态，校验历史奖励不回写钱包。 */
    public readonly account = new AccountModel();
    /** 唯一权威主线状态与确认进度。 */
    public readonly model = new MainChapterModel();
    /** 真正的PB连接负责超时/关联和旧通道隔离。 */
    public readonly socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: this.server.create, validateSnapshot: () => {}, heartbeatMs: 100000,
        retryDelay: () => 100000, timeoutMs: 1000,
    });
    /** 真实认证交付边界，不让测试绕过会话隔离。 */
    public readonly service = new AccountService(this.account, new AccountApi(this.socket), {
        read: () => null, write: () => {}, clear: () => {},
    });
    /** 交付到原通用反馈能力的历史回执，不代表已经展示。 */
    public readonly queued: MainChapterMilestoneReceipt[] = [];
    /** 模拟通用队列暂时不可用，恢复仍必须使用原回执。 */
    public enqueueFailures = 0;
    /** 正式应用Binding，测试只替换展示能力。 */
    public readonly binding = new MainChapterMilestoneBinding(this.account, this.service, this.socket, this.journal,
        value => {
            if (this.enqueueFailures-- > 0) {
                throw new Error("测试通用反馈暂时不可用");
            }
            this.queued.push(value);
            return "queued";
        }, this.model);
    /** 背包仍由唯一整包入口更新，无额外查询。 */
    private readonly bag = new BagController(new BagModel());
    /** 主线Controller提交权威快照，里程碑Controller只读它。 */
    private readonly chapter = new MainChapterController(this.model);
    /** 唯一整包校验/提交入口，身份变化先撤销旧确认内存。 */
    private readonly assets = new AssetStateBinding(this.account, this.bag,
        new RoleController(role => this.service.acceptRole(role)), undefined, undefined,
        () => this.binding.deactivate(), this.chapter);

    /** 安装原首包、状态事件和鉴权恢复交付。 */
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

    /** 正式登录后等待本次持久口激活完成，不能在未激活时伪造点击。 */
    public async login(account = "player", serverId = "local-1"): Promise<void> {
        assert(await this.service.login(account, serverId), this.account.snapshot.error);
        await until(() => !!(this.binding as any).port || !!(this.binding as any).activationFailed,
            "持久日志未完成激活");
    }

    /** 真实反馈显示后通知原Binding，不以入队代替展示。 */
    public async present(): Promise<void> {
        await until(() => this.queued.length > 0, "通用反馈未收到双确认结果");
        this.binding.presented(receiptId);
    }

    /** 全部模块和连接由本案例释放，避免测试定时器/监听泄漏。 */
    public dispose(): void {
        this.binding.dispose();
        this.socket.onReady = this.socket.onState = null;
        this.socket.disconnect();
        this.assets.dispose();
        this.bag.dispose();
        this.chapter.dispose();
    }
}

/** 有界推进真实Promise/二进制队列，不用长睡眠假定完成。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 250; index++) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert.fail(message);
}

/** 入队不能清原意图；冷启动先查历史，只有真实展示才清，历史钱包不覆盖当前资产。 */
async function coldRecovery(): Promise<void> {
    const app = new Application();
    app.journal.seed();
    app.server.loginCommitted = true;
    try {
        await app.login();
        await until(() => app.queued.length === 1, "冷恢复未复用原成功回执");
        assert.equal(app.model.milestoneClaim.phase, "delivering");
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
        assert.deepEqual(app.server.requests.map(frame => frame.name), [Protocol.SESSION_LOGIN, Protocol.CHAPTER_MILESTONE_STATUS]);
        app.binding.presented("32345678-1234-4234-8234-123456789abc");
        assert.equal(app.journal.cleared, 0);
        await app.present();
        await until(() => app.model.milestoneClaim.phase === "confirmed", "已展示后没有完成原意图");
        app.binding.presented(receiptId);
        app.server.pushCommitted();
        assert.equal(app.journal.cleared, 1);
        assert.equal(app.queued.length, 1);
        assert.equal(app.account.snapshot.role!.gold, 50);
    } finally {
        app.dispose();
    }
}

/** 原意图先持久化；两种先后都双确认，重复点击共享同一次请求与交付。 */
async function orderAndPersistence(stateFirst: boolean): Promise<void> {
    const app = new Application();
    app.journal.holdCreate = true;
    app.server.stateFirst = stateFirst;
    app.server.holdReply = stateFirst;
    app.server.autoState = stateFirst;
    app.server.beforeClaim = () => assert.deepEqual([...app.journal.records.values()], [pending]);
    try {
        await app.login();
        const first = app.binding.begin(1);
        assert.equal(first, app.binding.begin(1));
        await until(() => !!app.journal.releaseCreate, "create未暂停");
        assert.equal(app.server.requests.length, 1, "存储完成前已经发领取");
        app.journal.releaseCreate!();
        if (stateFirst) {
            await until(() => app.server.delayed.length === 1, "状态先到未暂停原回执");
            assert.deepEqual(app.model.state!.milestoneProgress!.claimedIds, [1]);
            assert.equal(app.queued.length, 0, "只到状态不能补造原奖励");
            app.server.delayed.shift()!();
        } else {
            await until(() => app.server.requests.some(frame => frame.name === Protocol.SESSION_AUTHENTICATE),
                "缺快照时没有有界鉴权");
            assert.equal(app.queued.length, 0, "回执单独到达不能提前反馈");
            assert.deepEqual(app.model.state!.milestoneProgress!.claimedIds, []);
            app.server.pushCommitted();
        }
        await app.present();
        await first;
        await until(() => app.model.milestoneClaim.phase === "confirmed", "后到快照的反馈尚未完成");
        assert.equal(app.server.requests.filter(frame => frame.name === Protocol.CHAPTER_MILESTONE_CLAIM).length, 1);
        assert.equal(app.queued.length, 1);
        assert.equal(app.journal.cleared, 1);
    } finally {
        app.dispose();
    }
}

/** 冷日志未找到历史时才以同稳定键领取，不能换ID跳过原意图。 */
async function coldNotFound(): Promise<void> {
    const app = new Application();
    app.journal.seed();
    app.server.found = false;
    try {
        await app.login();
        await app.present();
        await until(() => app.model.milestoneClaim.phase === "confirmed", "未找到历史后未用原键完成");
        assert.deepEqual(app.server.requests.map(frame => frame.name),
            [Protocol.SESSION_LOGIN, Protocol.CHAPTER_MILESTONE_STATUS, Protocol.CHAPTER_MILESTONE_CLAIM]);
    } finally {
        app.dispose();
    }
}

/** 保存失败不发送，显式重试才继续；通用反馈/删除失败也保留原意图和原回执而不再发奖。 */
async function retryFailures(): Promise<void> {
    const app = new Application();
    app.journal.createFailures = 1;
    app.enqueueFailures = 1;
    try {
        await app.login();
        await app.binding.begin(1);
        assert.equal(app.server.requests.length, 1);
        assert.equal(app.journal.records.size, 0);
        await app.binding.begin(1);
        assert.equal(app.model.milestoneClaim.phase, "pending");
        assert.equal(app.journal.records.size, 1);
        const requestCount = app.server.requests.length;
        const retry = app.binding.begin(1);
        await until(() => app.queued.length === 1, "原反馈没有重试");
        app.journal.clearFailures = 1;
        await app.present();
        await retry;
        assert.equal(app.model.milestoneClaim.phase, "pending");
        assert.equal(app.journal.records.size, 1);
        const clearRetry = app.binding.begin(1);
        await until(() => app.model.milestoneClaim.phase === "confirmed",
            "已实际展示后的清理失败应只重试条件删除，不能再等不会重复触发的展示回调");
        await clearRetry;
        assert.equal(app.journal.records.size, 0);
        assert.equal(app.server.requests.length, requestCount, "反馈或清理重试不应重新请求发奖");
        assert.equal(app.queued.length, 1, "原结果已显示后清理重试不能重新入队");
    } finally {
        app.dispose();
    }
}

/** 真实失败信封结束本轮但保留稳定意图；重复点击和稍后重试不改变业务ID。 */
async function failedWireRetry(): Promise<void> {
    const app = new Application();
    app.server.claimFailures = 1;
    try {
        await app.login();
        await app.binding.begin(1);
        assert.equal(app.model.milestoneClaim.phase, "pending");
        assert.equal(app.journal.records.size, 1);
        assert.equal(app.queued.length, 0);
        const retry = app.binding.begin(1);
        await app.present();
        await retry;
        await until(() => app.model.milestoneClaim.phase === "confirmed", "原键失败后没有恢复");
        const commands = app.server.requests.filter(frame => frame.name === Protocol.CHAPTER_MILESTONE_CLAIM);
        assert.equal(commands.length, 2);
        assert(commands.every(frame => (frame.body as any).rewardId === 1));
        assert.equal(app.journal.cleared, 1);
    } finally {
        app.dispose();
    }
}

/** 应用在等待旧回包时销毁，迟到二进制/展示回调都不能重新激活或删除原意图。 */
async function disposedWire(): Promise<void> {
    const app = new Application();
    try {
        await app.login();
        app.server.holdReply = true;
        app.server.autoState = false;
        const old = app.binding.begin(1);
        await until(() => app.server.delayed.length === 1, "销毁测试的请求未暂停");
        app.binding.dispose();
        app.server.delayed.shift()!();
        app.binding.presented(receiptId);
        await old;
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
        assert.equal(app.queued.length, 0);
        assert.equal(app.journal.closed, 1);
    } finally {
        app.dispose();
    }
}

/** 旧打开/保存/回包迟到均不能在新身份显示或删除原意图；连接隔离使用真实账号服务。 */
async function lateIdentity(kind: "open" | "create" | "wire"): Promise<void> {
    const app = new Application();
    try {
        let old: Promise<void> | null = null;
        if (kind === "open") {
            app.journal.seed();
            app.journal.holdRole = "role-player";
            assert(await app.service.login("player", "local-1"));
            await until(() => !!app.journal.releaseOpen, "旧日志打开未暂停");
        } else {
            await app.login();
            app.journal.holdCreate = kind === "create";
            app.server.holdReply = kind === "wire";
            app.server.autoState = false;
            old = app.binding.begin(1);
            await until(() => kind === "create" ? !!app.journal.releaseCreate : app.server.delayed.length === 1,
                "旧请求阶段没有暂停");
        }
        app.server.loginCommitted = false;
        await app.login("other", "local-2");
        app.journal.releaseOpen?.();
        app.journal.releaseCreate?.();
        app.server.delayed.splice(0).forEach(release => release());
        await old;
        await Promise.resolve();
        assert.equal(app.account.snapshot.role!.id, "role-other");
        assert.equal(app.model.milestoneClaim.phase, "idle");
        assert.equal(app.queued.length, 0);
        assert.equal(app.journal.cleared, 0);
        assert(app.journal.records.has(JSON.stringify(["local-1", "role-player"])));
    } finally {
        app.dispose();
    }
}

/** 已排队但尚未显示时换号，旧展示回调也不能条件删除记录或向新身份补弹。 */
async function queuedThenLogout(): Promise<void> {
    const app = new Application();
    app.journal.seed();
    app.server.loginCommitted = true;
    try {
        await app.login();
        await until(() => app.queued.length === 1, "原反馈未排队");
        app.service.logout();
        app.binding.presented(receiptId);
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
        assert.equal(app.model.milestoneClaim.phase, "idle");
    } finally {
        app.dispose();
    }
}

/** 已展示A时另一连接已经创建B，旧条件清理不得误删B。 */
async function conditionalClear(): Promise<void> {
    const app = new Application();
    app.journal.seed();
    app.server.loginCommitted = true;
    try {
        await app.login();
        await until(() => app.queued.length === 1, "原反馈未排队");
        const next: MilestoneClaimPending = Object.freeze({ schemaVersion: 1, rewardId: 2 });
        const key = JSON.stringify(["local-1", "role-player"]);
        app.journal.records.set(key, next);
        await app.present();
        await until(() => app.model.milestoneClaim.phase === "confirmed", "A真实展示未完成");
        assert.deepEqual(app.journal.records.get(key), next);
        assert.equal(app.journal.cleared, 0);
    } finally {
        app.dispose();
    }
}

/** 跨角色历史结果拒绝且保留原意图；存储打开失败只在下次认证重试。 */
async function ownerAndActivationFailure(): Promise<void> {
    const app = new Application();
    app.journal.seed();
    app.journal.openFailures = 1;
    app.server.loginCommitted = true;
    app.server.wrongRole = true;
    try {
        await app.login();
        assert.equal(app.server.requests.length, 1);
        await app.service.authenticated(token => app.socket.refreshSnapshot(token));
        await until(() => app.server.requests.some(frame => frame.name === Protocol.CHAPTER_MILESTONE_STATUS),
            "认证后未重试打开旧意图");
        await until(() => !!(app.binding as any).activationFailed, "跨角色回执应停止恢复");
        assert.equal(app.queued.length, 0);
        assert.equal(app.journal.cleared, 0);
        assert.equal(app.journal.records.size, 1);
        assert.equal(app.account.snapshot.role!.id, "role-player");
    } finally {
        app.dispose();
    }
}

/** 真实原生日志缺IndexedDB必须拒绝，不能默默降级内存后允许发送资产请求。 */
async function nativeStorageUnavailable(): Promise<void> {
    const journal = new MilestoneClaimJournal("isolated:12345678-1234-4234-8234-123456789abc");
    try {
        await assert.rejects(() => journal.forRole("local-1", "role-player"));
    } finally {
        journal.dispose();
    }
}

/** 所有失败都为预期注入；保留真实日志通道但避免专项污染用户控制台，最终恢复原共享对象。 */
async function main(): Promise<void> {
    const previous = GameLog.shared;
    const originalToast = UIManager.instance.toast;
    GameLog.shared = new GameLog();
    GameLog.shared.mirrorConsole = false;
    UIManager.instance.toast = () => {};
    try {
        await coldRecovery();
        await orderAndPersistence(false);
        await orderAndPersistence(true);
        await coldNotFound();
        await retryFailures();
        await failedWireRetry();
        await disposedWire();
        await lateIdentity("open");
        await lateIdentity("create");
        await lateIdentity("wire");
        await queuedThenLogout();
        await conditionalClear();
        await ownerAndActivationFailure();
        await nativeStorageUnavailable();
        console.log("PASS milestone application binding: 14 cases, real account/PB/controller, persist-before-send, dual confirmation, presented-only clear, cold status, retries, late identities, dispose and native storage refusal");
    } finally {
        GameLog.shared = previous;
        UIManager.instance.toast = originalToast;
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
