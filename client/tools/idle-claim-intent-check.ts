/**
 * 挂机宝箱专项：通过真实账号服务、统一资产入口和 Protobuf 连接检查一次领取。
 * 通过受控传输验证提交、确认和重新鉴权的快照，窗口使用独立夹具。
 */
import { strict as assert } from "node:assert";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import { IdleClaimBinding } from "../assets/scripts/features/battle/IdleClaimBinding";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { AccountModel, type TavernPointState } from "../assets/scripts/features/account/AccountModel";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { IdleClaimConfirmation } from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";
import { ConfirmView, type ConfirmArgs } from "../assets/scripts/features/common/ui/ConfirmView";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL, type GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient, type SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 生成合法持久回执；历史钱包与当前权威钱包分别传递，不用历史结果覆盖Model。 */
function receipt(roleId: string, request: { requestId: string; expectedOperationVersion: number }, revision: number): Record<string, unknown> {
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
            heroes: [],
        },
    };
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

/** 服务端只实现登录、鉴权及一次领取，其他请求会使案例失败。 */
class Server {
    /** 当前测试角色的完整快照，提交时推进持久版本。 */
    public state: any = null;
    /** 真实请求历史，用于核对每次确认只提交一次。 */
    public readonly requests: GameFrame[] = [];
    /** 已创建的连接，关闭后不得再交付旧回调。 */
    public readonly wires: Wire[] = [];
    /** 登录时已累计的显示秒数，64和65分别验证旧频率加5秒的边界。 */
    public elapsed = 65;
    /** 登录时的服务端领取模式，客户端不能覆盖。 */
    public mode = "ENABLED";
    /** null表示旧快照尚未同步冒险点，不用库存或零值代替。 */
    public points: TavernPointState | null = { schemaVersion: 1, adventureCount: 10999, limit: 11000 };
    /** 保留已提交状态，测试重连时可独立丢弃回包和状态事件。 */
    public disconnectAfterClaim = false;
    /** 成功回包先到时，延迟状态通知直至测试显式发送。 */
    public holdState = false;

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
        } else if (frame.name === Protocol.CHAPTER_IDLE_CLAIM) {
            if (body.expectedOperationVersion !== this.state.mainChapterIdle.claimState.operationVersion) {
                queueMicrotask(() => wire.push({
                    version: 1, kind: "response", name: frame.name, id: frame.id, ok: false, body: null,
                    error: { code: "IDLE_VERSION_CONFLICT", message: "版本已更新", retryable: false },
                }));
                return;
            }
            assert.equal(this.state.mainChapterIdle.claimState.requestMode, "ENABLED");
            const committed = receipt(this.state.role.id, body, this.state.revision + 1);
            this.state = {
                ...this.state, revision: this.state.revision + 1,
                role: { ...this.state.role, gold: 60 },
                mainChapter: { ...this.state.mainChapter, assetRevision: this.state.revision + 1 },
                mainChapterIdle: { ...this.state.mainChapterIdle, startedAt: this.state.mainChapterIdle.serverTime,
                    claimState: { ...this.state.mainChapterIdle.claimState,
                        operationVersion: body.expectedOperationVersion + 1 } },
            };
            queueMicrotask(() => {
                if (this.disconnectAfterClaim) {
                    wire.close();
                    wire.onclose?.({});
                    return;
                }
                this.respond(wire, frame, committed);
                if (!this.holdState) {
                    this.pushCurrent();
                }
            });
            return;
        } else if (frame.name !== Protocol.SESSION_AUTHENTICATE) {
            assert.fail("意图专项出现额外请求：" + frame.name);
        }
        const accepted = { connectionId: wire.connection, roleId: this.state.role.id,
            serverTimeMs: (100 + this.elapsed) * 1000,
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
    public pushCurrent(): void {
        this.wires[this.wires.length - 1].push({ version: 1, kind: "event", name: Protocol.STATE_CHANGED,
            body: this.state });
    }

    /** 模拟另一笔权威变化；确认期间版本变化交由服务端比较点击时的版本。 */
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

/** 窗口只替换引擎能力，确认回调仍由真实领取入口组织。 */
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

    /** 取消按钮和空白关闭均转交通用取消。 */
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
    /** 唯一账号状态由真实RoleController提交。 */
    public readonly account = new AccountModel();
    /** 主线 Model 保存服务端快照。 */
    public readonly chapterModel = new MainChapterModel();
    /** 真实二进制连接，测试结束解除所有计时器。 */
    public readonly socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: this.server.create, validateSnapshot: value => { AccountApi.readSnapshotRole(value); },
        clock: ServerClock.instance,
        heartbeatMs: 100000, retryDelay: () => 100000, timeoutMs: 1000,
    });
    /** 账号服务负责凭证及旧身份的成功、失败隔离。 */
    public readonly service = new AccountController(this.account, new AccountApi(this.socket), {
        read: () => null, write: () => {}, clear: () => {},
    });
    /** 真实宝箱入口。 */
    public readonly binding: IdleClaimBinding;
    /** 完整确认信号，核对现场引用只与真正创建的原请求绑定。 */
    public readonly confirmations: IdleClaimConfirmation[] = [];
    /** 测试结束时解除领取演出监听。 */
    private readonly stopCollection = EventDispatcher.instance.on("main-chapter.idle-collection", confirmation => {
        this.confirmations.push(confirmation);
    });
    /** 背包唯一模块只接受统一状态。 */
    private readonly bag = new BagController(new BagModel());
    /** 原主线Controller接纳服务端累计起点及操作版本。 */
    private readonly chapter = new MainChapterController(this.chapterModel);
    /** 应用唯一整包提交入口，身份变化先取消旧确认。 */
    private readonly assets: AssetStateBinding;

    /** 只替换窗口和传输，公共时钟由鉴权回包校准。 */
    public constructor() {
        const operations = new AccountOperations(this.service, this.socket);
        this.chapter.configure(operations);
        this.binding = new IdleClaimBinding(this.service, this.chapterModel, this.chapter);
        this.assets = new AssetStateBinding(this.account, this.bag,
            new RoleController(this.account), undefined, undefined,
            () => this.binding.deactivate(), this.chapter);
        this.bag.initialize();
        this.chapter.initialize();
        const accept = (frame: GameFrame): void => {
            this.assets.apply(frame);
        };
        this.service.onInitialized = accept;
        this.socket.onState = accept;
        this.socket.onReady = () => {
            if (!this.account.snapshot.busy && this.account.snapshot.role && this.socket.latestState) {
                accept(this.socket.latestState);
            }
        };
    }

    /** 等待角色真实登录。 */
    public async login(account = "player"): Promise<void> {
        assert(await this.service.login(account, "local-1"));
    }

    /** 释放连接、订阅和窗口替身。 */
    public dispose(): void {
        this.stopCollection();
        this.binding.deactivate();
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


/** 公共计时和服务端能力让界面给出准备提示。 */
async function checkUnavailable(): Promise<void> {
    for (const reason of ["short", "missing-points", "read-only", "no-clock"] as const) {
        const app = new Application();
        try {
            if (reason === "short") {
                app.server.elapsed = 64;
            } else if (reason === "missing-points") {
                app.server.points = null;
            } else if (reason === "read-only") {
                app.server.mode = "READ_ONLY";
            }
            await app.login();
            if (reason === "no-clock") {
                ServerClock.instance.invalidate();
            }
            await app.binding.begin();
            assert.equal(app.server.claims().length, 0);
            assert.equal(app.windows.toasts.length, 1, reason);
        } finally {
            app.dispose();
        }
    }
}

/** 即时回包提供显示信息，角色资产仍只跟随服务端快照。 */
async function checkDirectClaim(): Promise<void> {
    const app = new Application();
    try {
        app.server.holdState = true;
        await app.login();
        const context = {};
        await app.binding.begin(context);
        assert.deepEqual(app.server.requests.map(frame => frame.name), [Protocol.SESSION_LOGIN, Protocol.CHAPTER_IDLE_CLAIM]);
        const confirmation = app.confirmations[0];
        assert.equal(app.confirmations.length, 1);
        assert.equal(confirmation.presentationContext, context);
        assert.equal(confirmation.receipt.seconds, 60);
        assert.equal(confirmation.receipt.maxSeconds, 43200);
        assert.equal(app.account.snapshot.role?.gold, 50);
        assert.equal(app.chapterModel.idle?.startedAt, 100);
        app.server.pushCurrent();
        assert.equal(app.account.snapshot.role?.gold, 60);
        assert.equal(app.chapterModel.idle?.claimState?.operationVersion, 2);
    } finally {
        app.dispose();
    }
}

/** 满额取消无请求，连点和重复确认共用一次提交。 */
async function checkCapacityConfirmation(): Promise<void> {
    const app = new Application();
    try {
        app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
        await app.login();
        const cancelled = app.binding.begin();
        app.windows.cancel();
        await cancelled;
        assert.equal(app.server.claims().length, 0);

        const request = app.binding.begin();
        assert.equal(app.binding.begin(), request);
        const confirm = app.windows.confirms.at(-1)!;
        app.windows.confirm(confirm);
        confirm.args.onConfirm();
        await request;
        assert.equal(app.windows.confirms.length, 2);
        assert.equal(app.server.claims().length, 1);
        assert.equal(app.confirmations.length, 1);
    } finally {
        app.dispose();
    }
}

/** 确认期间快照变化，发送点击时的版本并展示服务端拒绝。 */
async function checkServerVersionConflict(): Promise<void> {
    const app = new Application();
    try {
        app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
        await app.login();
        const request = app.binding.begin();
        app.server.pushOperation(2);
        app.windows.confirm();
        await request;
        const claims = app.server.claims();
        assert.equal(claims.length, 1);
        assert.equal((claims[0].body as { expectedOperationVersion: number }).expectedOperationVersion, 1);
        assert.equal(app.confirmations.length, 0);
        assert(app.windows.toasts.some(message => !!message));
        assert.deepEqual(app.server.requests.map(frame => frame.name), [Protocol.SESSION_LOGIN, Protocol.CHAPTER_IDLE_CLAIM]);
    } finally {
        app.dispose();
    }
}

/** 换号或窗口尚在准备时取消旧确认，迟到的打开只能关闭自己。 */
async function checkLateConfirmation(): Promise<void> {
    for (const opening of [false, true]) {
        const app = new Application();
        try {
            app.server.points = { schemaVersion: 1, adventureCount: 11000, limit: 11000 };
            await app.login();
            app.windows.deferOpen = opening;
            const request = app.binding.begin();
            const old = app.windows.confirms[0];
            await app.login("other");
            await request;
            app.windows.otherConfirm = true;
            old.releaseOpen?.();
            await Promise.resolve();
            old.args.onConfirm();
            assert.equal(app.server.claims().length, 0);
            assert.equal(app.windows.otherConfirm, true);
            assert.equal(app.windows.otherCloses, 0);
        } finally {
            app.dispose();
        }
    }
}

/** 已提交但丢回包时，普通鉴权恢复数据，不查询、重发或补播收取。 */
async function checkDisconnectedClaim(): Promise<void> {
    const app = new Application();
    try {
        app.server.disconnectAfterClaim = true;
        await app.login();
        await app.binding.begin();
        assert.equal(app.account.snapshot.role?.gold, 50);
        assert.equal(app.confirmations.length, 0);
        assert.equal(app.server.claims().length, 1);

        app.socket.setBackground(true);
        app.socket.setBackground(false);
        await until(() => app.account.snapshot.role?.gold === 60, "鉴权首包没有恢复实际到账");
        assert.equal(app.chapterModel.idle?.claimState?.operationVersion, 2);
        assert.equal(app.confirmations.length, 0);
        assert.deepEqual(app.server.requests.map(frame => frame.name),
            [Protocol.SESSION_LOGIN, Protocol.CHAPTER_IDLE_CLAIM, Protocol.SESSION_AUTHENTICATE]);
    } finally {
        app.dispose();
    }
}

/** 64 秒切后台，鉴权回包将公共时钟校到 65 秒后可领取。 */
async function checkReconnectedClock(): Promise<void> {
    const app = new Application();
    try {
        app.server.elapsed = 64;
        await app.login();
        await app.binding.begin();
        assert.equal(app.server.claims().length, 0);
        assert(app.windows.toasts.includes("请再等待1秒"));

        app.socket.setBackground(true);
        assert.equal(ServerClock.instance.nowSeconds(), null);
        app.server.elapsed = 65;
        app.socket.setBackground(false);
        await until(() => ServerClock.instance.nowSeconds() === 165, "前台鉴权没有更新公共时钟");
        await app.binding.begin();
        assert.equal(app.server.claims().length, 1);
    } finally {
        app.dispose();
    }
}

/** 依次验证普通操作、满额确认、服务器拒绝及断线后的统一快照。 */
async function main(): Promise<void> {
    await checkUnavailable();
    await checkDirectClaim();
    await checkCapacityConfirmation();
    await checkServerVersionConflict();
    await checkLateConfirmation();
    await checkDisconnectedClaim();
    await checkReconnectedClock();
    console.log("idle-claim-intent-check passed: single claim, capacity confirmation, server rejection and reconnect snapshots");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
