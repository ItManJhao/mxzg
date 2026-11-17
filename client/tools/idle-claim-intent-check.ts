/**
 * 挂机新领取意图专项：通过真实账号服务、统一资产入口和Protobuf连接检查应用入口。
 * 只替换通用窗口和持久存储的外部能力；不连接服务器、不打开浏览器、不替代模块的幂等及恢复流程。
 */
import { strict as assert } from "node:assert";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { IdleClaimBinding, type IdleClaimEntryOptions } from "../assets/scripts/app/remake/IdleClaimBinding";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel, type TavernPointState } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type {
    IdleClaimConfirmation, IdleClaimJournalPort, IdleClaimPending,
} from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";
import { ConfirmView, type ConfirmArgs } from "../assets/scripts/features/common/ui/ConfirmView";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL, type GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient, type SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 仅为恢复案例预置的原请求，不能由新点击改写编号或消费版本。 */
const originalPending: IdleClaimPending = Object.freeze({ schemaVersion: 1,
    requestId: "12345678-1234-4234-8234-123456789abc", expectedOperationVersion: 1 });

/** 生成合法持久回执；历史钱包与当前权威钱包分别传递，不用历史结果覆盖Model。 */
function receipt(roleId: string, request: IdleClaimPending, revision: number): Record<string, unknown> {
    return {
        schemaVersion: 1, requestId: request.requestId,
        receiptId: "22345678-1234-4234-8234-123456789abc",
        expectedOperationVersion: request.expectedOperationVersion,
        beforeOperationVersion: request.expectedOperationVersion,
        afterOperationVersion: request.expectedOperationVersion + 1,
        committedAtSeconds: 165, previousStartedAtSeconds: 100, seconds: 60,
        maxSeconds: 43200, rewardStage: 1, assetRevision: revision,
        theoreticalRewards: [{ itemId: 900001, quantity: 10 }],
        actual: {
            roleId, items: [{ itemId: 900001, requested: 10, credited: 10, ignored: 0, reason: "NONE" }],
            wallet: { goldBefore: 50, diamondsBefore: 7, goldAfter: 60, diamondsAfter: 7 },
            stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [],
            spirits: { schemaVersion: 1, items: [] },
        },
    };
}

/** 内存只模拟持久事务端口；记录实际创建次数，读取和条件清理不算创建新意图。 */
class Journal {
    /** 区服及角色键到原请求，切换角色不共享记录。 */
    public readonly records = new Map<string, IdleClaimPending>();
    /** 身份端口按键复用，符合生产激活口的稳定引用。 */
    private readonly ports = new Map<string, IdleClaimJournalPort>();
    /** 已执行读取次数，用于等待首次激活真正完成。 */
    public reads = 0;
    /** 真正调用create的次数；确认前和取消后必须保持零。 */
    public creates = 0;
    /** 持久条件清理次数，只有回执和快照双确认才递增。 */
    public clears = 0;
    /** 应用销毁关闭句柄次数，不能借此删除记录。 */
    public closes = 0;
    /** true仅暂停下一次读，用于检查确认后异步存储期间的版本变化。 */
    public deferRead = false;
    /** 当前暂停读取的释放口；测试释放后清空，避免重复交付。 */
    public releaseRead: (() => void) | null = null;

    /** 在登录前为当前测试角色准备原请求，模拟上次进程留下的真实待确认记录。 */
    public seed(): void {
        this.records.set(JSON.stringify(["local-1", "role-player"]), originalPending);
    }

    /** 仅应用持有身份键；返回的模块口不携带账号、凭证或玩家资产。 */
    public async forRole(serverId: string, roleId: string): Promise<IdleClaimJournalPort> {
        const key = JSON.stringify([serverId, roleId]);
        let port = this.ports.get(key);
        if (!port) {
            port = {
                read: async () => {
                    this.reads++;
                    if (this.deferRead) {
                        this.deferRead = false;
                        await new Promise<void>(resolve => {
                            this.releaseRead = () => {
                                this.releaseRead = null;
                                resolve();
                            };
                        });
                    }
                    return this.records.get(key) || null;
                },
                create: async request => {
                    this.creates++;
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
                    this.clears++;
                    return true;
                },
            };
            this.ports.set(key, port);
        }
        return port;
    }

    /** 只关闭本实例句柄，保留待确认记录。 */
    public dispose(): void {
        this.closes++;
    }
}

/** 受控平台连接仍对所有请求和响应执行真实Protobuf编解码。 */
class Wire {
    /** 由真实GameSocketClient安装的平台打开回调。 */
    public onopen: any = null;
    /** 服务端二进制推送口，失效连接由通信层解除。 */
    public onmessage: any = null;
    /** 平台错误回调，本专项不伪造业务失败。 */
    public onerror: any = null;
    /** 平台关闭回调，后台暂停由真实连接管理。 */
    public onclose: any = null;
    /** 浏览器基础连接状态：0准备、1打开、3关闭。 */
    public readyState = 0;
    /** 通信层装配的二进制类型。 */
    public binaryType = "";
    /** 固定真实业务子协议。 */
    public protocol = GAME_SOCKET_PROTOCOL;

    /** 等待通信层安装回调后才异步打开连接。 */
    public constructor(
        /** 受控服务端接收真实帧，不直接调用业务Controller。 */
        private readonly server: Server,
        /** 当前连接唯一标识，不是角色资产版本。 */
        public readonly connection: string,
    ) {
        queueMicrotask(() => {
            this.readyState = 1;
            this.onopen?.({});
        });
    }

    /** 解码二进制请求后由受控服务端按协议响应。 */
    public send(value: unknown): void {
        this.server.receive(this, GameProtocolCodecUtils.decodeGameFrame(value));
    }

    /** 平台关闭只改变连接状态，不产生新业务请求。 */
    public close(): void {
        this.readyState = 3;
    }

    /** 编码服务端信封，不能用对象直送绕过协议边界。 */
    public push(frame: GameFrame): void {
        this.onmessage?.({ data: GameProtocolCodecUtils.encodeGameFrame({ ...frame, connectionId: this.connection }) });
    }
}

/** 服务端只实现登录、鉴权、原请求查询及领取，出现其他业务请求即失败。 */
class Server {
    /** 当前测试角色最新完整快照，登录时重建，提交时显式推进两种版本。 */
    public state: any = null;
    /** 全部真实请求，供检查确认前零领取及原编号恢复。 */
    public readonly requests: GameFrame[] = [];
    /** 已创建的连接，关闭后不得再交付旧回调。 */
    public readonly wires: Wire[] = [];
    /** 登录时已累计的显示秒数，64和65分别验证旧频率加5秒的边界。 */
    public elapsed = 65;
    /** 登录时的服务端领取模式，客户端不能覆盖。 */
    public mode = "ENABLED";
    /** null表示旧快照尚未同步冒险点，不用库存或零值代替。 */
    public points: TavernPointState | null = { schemaVersion: 1, adventureCount: 10999, limit: 11000 };
    /** 当前角色已提交的回执，按请求编号查询，不伪造另一笔新奖励。 */
    private committed: Record<string, unknown> | null = null;

    /** 创建受控传输端口，由真实Socket完成连接和鉴权。 */
    public create = (): SocketPort => {
        const wire = new Wire(this, "idle-intent-connection-" + this.wires.length);
        this.wires.push(wire);
        return wire as unknown as SocketPort;
    };

    /** 处理真实帧；新领取先提交完整状态，再将同一回执和提交后事件发送到当前连接。 */
    public receive(wire: Wire, frame: GameFrame): void {
        this.requests.push(frame);
        const body = frame.body as any;
        if (frame.name === Protocol.SESSION_LOGIN) {
            this.state = {
                role: { id: "role-" + body.account, nickname: body.account, serverId: body.serverId,
                    level: 1, gold: 50, diamonds: 7 },
                inventory: [], heroes: [], revision: 1,
                mainFormation: { formationId: 1, unlockedIds: [1], assistanceUnlocked: false,
                    version: 0, slots: [], options: [] },
                mainChapter: { maxCleared: 1, pendingBattleId: null, assetRevision: 1 },
                mainChapterIdle: {
                    serverTime: 100 + this.elapsed, startedAt: 100, maxSeconds: 43200,
                    frequency: 60, rewardStage: 1, rates: [{ itemId: 900001, quantity: 10 }],
                    slots: [], lineupVersion: 0,
                    claimState: { schemaVersion: 1, operationVersion: 1, requestMode: this.mode },
                },
                ...(this.points ? { tavernPoints: this.points } : {}),
            };
            this.committed = null;
        } else if (frame.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
            const result = this.committed?.requestId === body.requestId
                ? { requestId: body.requestId, status: "COMMITTED", receipt: this.committed }
                : { requestId: body.requestId, status: "NOT_FOUND" };
            queueMicrotask(() => this.respond(wire, frame, result));
            return;
        } else if (frame.name === Protocol.CHAPTER_IDLE_CLAIM) {
            assert.equal(body.expectedOperationVersion, this.state.mainChapterIdle.claimState.operationVersion);
            assert.equal(this.state.mainChapterIdle.claimState.requestMode, "ENABLED");
            const request: IdleClaimPending = { schemaVersion: 1, requestId: body.requestId,
                expectedOperationVersion: body.expectedOperationVersion };
            this.committed = receipt(this.state.role.id, request, this.state.revision + 1);
            this.state = {
                ...this.state, revision: this.state.revision + 1,
                role: { ...this.state.role, gold: 60 },
                mainChapter: { ...this.state.mainChapter, assetRevision: this.state.revision + 1 },
                mainChapterIdle: { ...this.state.mainChapterIdle, startedAt: this.state.mainChapterIdle.serverTime,
                    claimState: { ...this.state.mainChapterIdle.claimState,
                        operationVersion: body.expectedOperationVersion + 1 } },
            };
            queueMicrotask(() => {
                this.respond(wire, frame, this.committed);
                this.pushCurrent();
            });
            return;
        } else if (frame.name !== Protocol.SESSION_AUTHENTICATE) {
            assert.fail("意图专项出现额外请求：" + frame.name);
        }
        const accepted = { connectionId: wire.connection, roleId: this.state.role.id, serverTimeMs: 165000,
            initial: this.state, ...(frame.name === Protocol.SESSION_LOGIN ? {
                session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" },
            } : {}) };
        queueMicrotask(() => this.respond(wire, frame, accepted));
    }

    /** 协议成功回包回显原传输编号，不直接完成模块Promise。 */
    private respond(wire: Wire, request: GameFrame, body: unknown): void {
        wire.push({ version: 1, kind: "response", name: request.name, id: request.id, ok: true, body });
    }

    /** 推送当前已提交完整快照，资产入口负责批量接纳和通知。 */
    private pushCurrent(): void {
        this.wires[this.wires.length - 1].push({ version: 1, kind: "event", name: Protocol.STATE_CHANGED,
            body: this.state });
    }

    /** 模拟另一笔权威变化；确认期间版本变化不能顺势创建新累计周期的原请求。 */
    public pushOperation(operationVersion: number, mode = this.mode): void {
        this.mode = mode;
        this.state = { ...this.state, revision: this.state.revision + 1,
            mainChapter: { ...this.state.mainChapter, assetRevision: this.state.revision + 1 },
            mainChapterIdle: { ...this.state.mainChapterIdle,
                claimState: { ...this.state.mainChapterIdle.claimState, operationVersion, requestMode: mode } } };
        this.pushCurrent();
    }

    /** 返回真实领取请求，不把状态查询或登录计为领取。 */
    public claims(): GameFrame[] {
        return this.requests.filter(frame => frame.name === Protocol.CHAPTER_IDLE_CLAIM);
    }
}

/** 被真实应用请求打开的一次通用窗口，测试按实例关闭并保留旧回调用于迟到检查。 */
interface WindowIntent {
    /** 调用方给ConfirmView的原参数，不重写业务判断。 */
    readonly args: ConfirmArgs;
    /** 仅表示真实窗口归属，避免closeById误伤其他业务。 */
    readonly view: object;
    /** 仅准备中保存打开完成口；身份撤销后仍可模拟迟到成功，检查关闭按实例归属。 */
    releaseOpen: (() => void) | null;
}

/** 窗口只替换引擎外部能力，不替换IdleClaimBinding的确认或持久流程。 */
class Windows {
    /** 实际打开的确认窗口，包括已经关闭的原窗口。 */
    public readonly confirms: WindowIntent[] = [];
    /** 当前仍显示的确认实例。 */
    private readonly active = new Set<WindowIntent>();
    /** 玩家提示明细，用于确认拒绝有明确原因。 */
    public readonly toasts: string[] = [];
    /** 其他业务已经打开确认，当前领取不能替换或关闭它。 */
    public otherConfirm = false;
    /** 其他业务正在准备窗口的数量。 */
    public otherOpening = 0;
    /** 错误关闭其他业务确认的次数，所有案例应为零。 */
    public otherCloses = 0;
    /** true暂停下一次通用确认准备，调用方必须可取消在途打开而不触碰后来窗口。 */
    public deferOpen = false;
    /** 退出时恢复真实全局能力，防止专项之间共享替身。 */
    private readonly original = {
        open: UIManager.instance.open, close: UIManager.instance.close,
        closeById: UIManager.instance.closeById, isOpen: UIManager.instance.isOpen,
        snapshot: UIManager.instance.snapshot, toast: UIManager.instance.toast,
        getConfig: GameConfig.instance.getConfig,
    };

    /** 安装只处理通用确认的窗口替身，旧四项文案仍由真实调用方按语言ID读取。 */
    public constructor() {
        const ui = UIManager.instance;
        ui.open = ((ctor: unknown, args: ConfirmArgs) => {
            assert.equal(ctor, ConfirmView);
            const row: WindowIntent = { args, view: {}, releaseOpen: null };
            this.confirms.push(row);
            this.active.add(row);
            if (this.deferOpen) {
                this.deferOpen = false;
                return new Promise(resolve => {
                    row.releaseOpen = () => {
                        row.releaseOpen = null;
                        resolve(row.view);
                    };
                });
            }
            return Promise.resolve(row.view);
        }) as typeof ui.open;
        ui.isOpen = ((id: string) => id === "confirm" && (this.otherConfirm
            || Array.from(this.active).some(row => !row.releaseOpen))) as typeof ui.isOpen;
        ui.snapshot = () => ({ opening: this.otherOpening
            + Array.from(this.active).filter(row => !!row.releaseOpen).length });
        ui.toast = ((message: string) => { this.toasts.push(message); }) as typeof ui.toast;
        ui.close = ((view: object) => {
            const row = Array.from(this.active).find(value => value.view === view);
            if (!row) {
                return false;
            }
            this.cancel(row);
            return true;
        }) as typeof ui.close;
        ui.closeById = ((id: string) => {
            if (id !== "confirm") {
                return false;
            }
            if (this.otherConfirm) {
                this.otherCloses++;
                this.otherConfirm = false;
            }
            for (const row of Array.from(this.active)) {
                this.cancel(row);
            }
            return true;
        }) as typeof ui.closeById;
        const language: Record<number, string> = { 3500: "提示", 2220: "冒险点已满，继续领取？",
            47589: "确定", 47703: "取消" };
        GameConfig.instance.getConfig = ((table: unknown, id: number) => {
            assert.equal(table, GConfig.Language);
            assert(language[id], "只允许读取旧确认四项文案");
            return { value: language[id] };
        }) as typeof GameConfig.instance.getConfig;
    }

    /** 模拟通用确认先关闭，再单次交付明确确认；案例可另行调用旧回调检查重复和迟到。 */
    public confirm(row = this.confirms[this.confirms.length - 1]): void {
        this.active.delete(row);
        row.args.onConfirm();
    }

    /** 取消按钮和空白关闭均转交通用取消，不调用确认，也不产生持久意图。 */
    public cancel(row = this.confirms[this.confirms.length - 1]): void {
        if (this.active.delete(row)) {
            row.args.onCancel?.();
        }
    }

    /** 释放真实应用后恢复UI与配置能力，不影响其他专项。 */
    public dispose(): void {
        const { getConfig, ...ui } = this.original;
        Object.assign(UIManager.instance, ui);
        GameConfig.instance.getConfig = getConfig;
    }
}

/** 独立应用按正式顺序装配账号、权威快照及领取绑定，不把测试状态直接写入业务Model。 */
class Application {
    /** 只替换外部窗口能力，应用销毁后恢复。 */
    public readonly windows = new Windows();
    /** 受控服务端保存本案例权威快照及历史回执。 */
    public readonly server = new Server();
    /** 测试持久事务端口，记录确认前是否出现写入。 */
    public readonly journal = new Journal();
    /** 唯一账号状态由真实RoleController提交。 */
    public readonly account = new AccountModel();
    /** 主线Model同时保存权威状态和原意图进度。 */
    public readonly chapterModel = new MainChapterModel();
    /** 真实二进制连接，测试结束解除所有计时器。 */
    public readonly socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: this.server.create, validateSnapshot: value => { AccountApi.readSnapshotRole(value); },
        heartbeatMs: 100000, retryDelay: () => 100000, timeoutMs: 1000,
    });
    /** 账号服务负责凭证及旧身份的成功、失败隔离。 */
    public readonly service = new AccountService(this.account, new AccountApi(this.socket), {
        read: () => null, write: () => {}, clear: () => {},
    });
    /** 真实领取入口及恢复绑定，默认策略分支确实不传第七参数。 */
    public readonly binding: IdleClaimBinding;
    /** 实际双确认后的通用反馈，不能将历史钱包写回账号。 */
    public readonly feedbacks: RewardNotice[] = [];
    /** 完整确认信号，核对现场引用只与真正创建的原请求绑定。 */
    public readonly confirmations: IdleClaimConfirmation[] = [];
    /** 背包唯一模块只接受统一状态。 */
    private readonly bag = new BagController(new BagModel());
    /** 原主线Controller负责权威时钟及操作版本。 */
    private readonly chapter = new MainChapterController(this.chapterModel);
    /** 应用唯一整包提交入口，身份变化先取消旧确认。 */
    private readonly assets: AssetStateBinding;

    /** 显式启用只影响本案例新意图；显示时钟固定在已接纳快照，不靠真实等待通过65秒门槛。 */
    public constructor(options?: IdleClaimEntryOptions) {
        const feedback = (confirmation: IdleClaimConfirmation): void => {
            this.confirmations.push(confirmation);
            if (confirmation.receipt.feedback) {
                this.feedbacks.push(confirmation.receipt.feedback);
            }
        };
        this.binding = options === undefined
            ? new IdleClaimBinding(this.account, this.service, this.socket, this.journal, this.chapterModel, feedback)
            : new IdleClaimBinding(this.account, this.service, this.socket, this.journal, this.chapterModel, feedback,
                { ...options, now: () => this.chapterModel.idleReceivedAt });
        this.assets = new AssetStateBinding(this.account, this.bag,
            new RoleController(role => this.service.acceptRole(role)), undefined, undefined,
            () => this.binding.deactivate(), this.chapter);
        this.bag.initialize();
        this.chapter.initialize();
        const accept = (frame: GameFrame): void => {
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

    /** 等待真实登录和首次存储恢复结束，不访问绑定私有字段判断激活。 */
    public async login(account = "player"): Promise<void> {
        const before = this.journal.reads;
        assert(await this.service.login(account, "local-1"));
        await until(() => this.journal.reads > before
            && ["idle", "paused", "confirmed"].includes(this.chapterModel.idleClaim.phase), "领取端口未完成激活");
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    /** 只检查真正创建及领取；查询、已存在记录和通用确认不能伪装成新意图。 */
    public assertNoIntent(): void {
        assert.equal(this.journal.creates, 0);
        assert.equal(this.server.claims().length, 0);
    }

    /** 释放全部连接、订阅和窗口替身，不删除旧请求。 */
    public dispose(): void {
        this.binding.dispose();
        this.socket.onReady = this.socket.onState = null;
        this.socket.disconnect();
        this.assets.dispose();
        this.bag.dispose();
        this.windows.dispose();
    }
}

/** 有界等待真实消息和Promise队列，不能依赖长睡眠推断成功。 */
async function until(check: () => boolean, message: string): Promise<void> {
    for (let index = 0; index < 200; index++) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert.fail(message);
}

/** 默认关闭及状态不足都只给明确提示，不创建持久原请求或发送业务查询/领取。 */
async function checkRejectedEntry(): Promise<void> {
    for (const reason of ["default", "short", "missing-points", "read-only", "disconnected"] as const) {
        const app = new Application(reason === "default" ? undefined : { enabled: true });
        try {
            if (reason === "short") {
                app.server.elapsed = 64;
            }
            if (reason === "missing-points") {
                app.server.points = null;
            }
            if (reason === "read-only") {
                app.server.mode = "READ_ONLY";
            }
            await app.login();
            if (reason === "disconnected") {
                app.socket.setBackground(true);
            }
            const before = app.server.requests.length;
            await app.binding.begin();
            app.assertNoIntent();
            assert.equal(app.server.requests.length, before, reason + "不能触发状态查询");
            assert.equal(app.windows.confirms.length, 0);
            assert(app.windows.toasts.length > 0, reason + "必须明确拒绝原因");
        } finally {
            app.dispose();
        }
    }
}

/** 65秒且未满时走真实查询、原编号领取和统一状态双确认，不弹多余确认。 */
async function checkDirectClaim(): Promise<void> {
    const app = new Application({ enabled: true });
    try {
        await app.login();
        const context = Object.freeze({ source: "main-chapter-display" });
        await app.binding.begin(context);
        assert.equal(app.windows.confirms.length, 0);
        assert.equal(app.journal.creates, 1);
        assert.equal(app.server.claims().length, 1);
        assert.equal(app.journal.clears, 1);
        assert.equal(app.journal.records.size, 0);
        assert.equal(app.chapterModel.idleClaim.phase, "confirmed");
        assert.equal(app.account.snapshot.role!.gold, 60);
        assert.equal(app.feedbacks.length, 1);
        assert.equal(app.confirmations.length, 1);
        assert.equal(app.confirmations[0].presentationContext, context);
        assert.equal(app.confirmations[0].receipt.seconds, 60);
        assert.equal(app.confirmations[0].receipt.maxSeconds, 43200);
        assert.equal(app.confirmations[0].receipt.feedback, app.feedbacks[0]);
        assert.deepEqual(app.server.requests.map(frame => frame.name),
            [Protocol.SESSION_LOGIN, Protocol.CHAPTER_IDLE_CLAIM_STATUS, Protocol.CHAPTER_IDLE_CLAIM]);
    } finally {
        app.dispose();
    }
}

/** 已满和历史超上限都先询问；取消按钮及空白关闭均不保存意图或发送领取。 */
async function checkCapacityCancellation(): Promise<void> {
    for (const count of [11000, 12000]) {
        for (const exit of ["cancel", "outside"] as const) {
            const app = new Application({ enabled: true });
            try {
                app.server.points = { schemaVersion: 1, adventureCount: count, limit: 11000 };
                await app.login();
                const done = app.binding.begin();
                await until(() => app.windows.confirms.length === 1, "满额没有通用确认");
                app.assertNoIntent();
                assert.equal(app.server.requests.length, 1, "确认前不能查询或创建领取");
                const prompt = app.windows.confirms[0];
                assert.equal(prompt.args.title, "提示");
                assert.equal(prompt.args.message, "冒险点已满，继续领取？");
                assert.equal(prompt.args.confirmText, "确定");
                assert.equal(prompt.args.cancelText, "取消");
                if (exit === "outside") {
                    UIManager.instance.close(prompt.view as any);
                } else {
                    app.windows.cancel(prompt);
                }
                await done;
                prompt.args.onConfirm();
                await Promise.resolve();
                app.assertNoIntent();
                assert.equal(app.journal.records.size, 0);
            } finally {
                app.dispose();
            }
        }
    }
}

/** 双击共用同一Promise和窗口；重复确认回调只能建立一笔持久请求和一次实际领取。 */
async function checkSingleConfirmation(): Promise<void> {
    const app = new Application({ enabled: true });
    try {
        app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
        await app.login();
        const first = app.binding.begin();
        assert.equal(app.binding.begin(), first);
        await until(() => app.windows.confirms.length === 1, "没有等待确认");
        assert.equal(app.binding.begin(), first);
        app.assertNoIntent();
        const prompt = app.windows.confirms[0];
        app.windows.confirm(prompt);
        prompt.args.onConfirm();
        await first;
        assert.equal(app.windows.confirms.length, 1);
        assert.equal(app.journal.creates, 1);
        assert.equal(app.server.claims().length, 1);
        assert.equal(app.journal.clears, 1);
        assert.equal(app.feedbacks.length, 1);
    } finally {
        app.dispose();
    }
}

/** 确认期间或确认后的慢存储读取期间版本变化，都不能把旧点击用于新的累计周期。 */
async function checkVersionChanges(): Promise<void> {
    for (const timing of ["confirming", "reading"] as const) {
        const app = new Application({ enabled: true });
        try {
            app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
            await app.login();
            const done = app.binding.begin();
            await until(() => app.windows.confirms.length === 1, "未显示版本变化前的确认");
            if (timing === "confirming") {
                app.server.pushOperation(2);
                app.windows.confirm();
            } else {
                app.journal.deferRead = true;
                app.windows.confirm();
                await until(() => !!app.journal.releaseRead, "确认后没有读取持久原意图");
                app.server.pushOperation(2);
                app.journal.releaseRead!();
            }
            await done;
            app.assertNoIntent();
            assert.equal(app.journal.records.size, 0);
        } finally {
            app.dispose();
        }
    }
}

/** 换号与销毁都撤销旧确认；窗口保留的迟到确认不能为新角色或已销毁应用创建请求。 */
async function checkLateConfirmation(): Promise<void> {
    for (const action of ["switch", "confirmed-switch", "dispose"] as const) {
        const app = new Application({ enabled: true });
        try {
            app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
            await app.login();
            const done = app.binding.begin();
            await until(() => app.windows.confirms.length === 1, "旧身份没有等待确认");
            const old = app.windows.confirms[0];
            const notices = app.windows.toasts.length;
            if (action === "confirmed-switch") {
                app.windows.confirm(old);
                app.service.logout();
                await app.login("other");
            } else if (action === "switch") {
                await app.login("other");
            } else {
                app.binding.dispose();
            }
            await done;
            const before = app.server.requests.length;
            old.args.onConfirm();
            old.args.onConfirm();
            await new Promise(resolve => setTimeout(resolve, 0));
            app.assertNoIntent();
            assert.equal(app.server.requests.length, before);
            assert.equal(app.journal.records.size, 0);
            assert.equal(app.windows.otherCloses, 0);
            assert.equal(app.windows.toasts.length, notices, "旧身份确认失效不能向新身份或已销毁应用飘字");
        } finally {
            app.dispose();
        }
    }
}

/** 在途确认被撤销后才到达的打开成功，只关闭旧实例，不关闭后来其他业务拥有的共享确认。 */
async function checkLateOpeningOwnership(): Promise<void> {
    for (const action of ["switch", "dispose"] as const) {
        const app = new Application({ enabled: true });
        try {
            app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
            app.windows.deferOpen = true;
            await app.login();
            const done = app.binding.begin();
            await until(() => !!app.windows.confirms[0]?.releaseOpen, "确认准备未暂停");
            const old = app.windows.confirms[0];
            const notices = app.windows.toasts.length;
            if (action === "switch") {
                await app.login("other");
            } else {
                app.binding.dispose();
            }
            await done;
            app.windows.otherConfirm = true;
            old.releaseOpen!();
            await new Promise(resolve => setTimeout(resolve, 0));
            old.args.onConfirm();
            await Promise.resolve();
            app.assertNoIntent();
            assert.equal(app.windows.otherCloses, 0);
            assert.equal(app.windows.otherConfirm, true, "旧打开完成不能按id关闭后来共享确认");
            assert.equal(app.windows.toasts.length, notices, "旧打开成功或确认迟到不能飘字");
        } finally {
            app.dispose();
        }
    }
}

/** 已有其他确认或正在打开的窗口时，不替换原意图、不关闭其他业务窗口。 */
async function checkExistingWindow(): Promise<void> {
    for (const busy of ["confirm", "opening"] as const) {
        const app = new Application({ enabled: true });
        try {
            app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
            await app.login();
            app.windows.otherConfirm = busy === "confirm";
            app.windows.otherOpening = busy === "opening" ? 1 : 0;
            await app.binding.begin();
            app.assertNoIntent();
            assert.equal(app.windows.confirms.length, 0);
            assert.equal(app.windows.otherCloses, 0);
            assert.equal(app.windows.otherConfirm, busy === "confirm");
        } finally {
            app.dispose();
        }
    }
}

/** 满额确认期间断线后再确定仍不能落新意图，避免离线点击留下未被玩家在线提交的请求。 */
async function checkDisconnectedConfirmation(): Promise<void> {
    const app = new Application({ enabled: true });
    try {
        app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
        await app.login();
        const done = app.binding.begin();
        await until(() => app.windows.confirms.length === 1, "断线前没有显示确认");
        app.socket.setBackground(true);
        app.windows.confirm();
        await done;
        app.assertNoIntent();
        assert.equal(app.journal.records.size, 0);
    } finally {
        app.dispose();
    }
}

/** 已存在的原请求按原编号恢复，即使当前满额也不重新询问、不调用create建立第二笔。 */
async function checkPendingRecovery(): Promise<void> {
    const app = new Application({ enabled: true });
    try {
        app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
        app.server.mode = "READ_ONLY";
        app.journal.seed();
        await app.login();
        assert.equal(app.chapterModel.idleClaim.phase, "paused");
        app.assertNoIntent();
        app.server.pushOperation(1, "ENABLED");
        await app.binding.begin(Object.freeze({ source: "later-click" }));
        assert.equal(app.windows.confirms.length, 0);
        assert.equal(app.journal.creates, 0);
        assert.equal(app.server.claims().length, 1);
        assert.equal((app.server.claims()[0].body as any).requestId, originalPending.requestId);
        assert.equal(app.journal.clears, 1);
        assert.equal(app.chapterModel.idleClaim.phase, "confirmed");
        assert.equal(app.confirmations.length, 1);
        assert.equal(app.confirmations[0].presentationContext, null,
            "恢复已有持久原请求不能借用新点击的现场引用");
    } finally {
        app.dispose();
    }
}

/** 顺序执行所有案例，全局UI替身在每例结束后恢复，不并发运行应用夹具。 */
async function main(): Promise<void> {
    await checkRejectedEntry();
    await checkDirectClaim();
    await checkCapacityCancellation();
    await checkSingleConfirmation();
    await checkVersionChanges();
    await checkLateConfirmation();
    await checkLateOpeningOwnership();
    await checkExistingWindow();
    await checkPendingRecovery();
    await checkDisconnectedConfirmation();
    console.log("PASS idle claim intent gates, generic capacity confirmation, once-only persistence, version/session isolation and original-pending recovery");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
