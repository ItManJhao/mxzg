/**
 * 新客户端与独立Java服务端的挂机领取恢复联调页：真实WS/PB、应用状态入口及原生IndexedDB。
 * 只验证随机run的H2测试夹具；按钮用于测试脚本，不绑定玩家领取View，也不使用发布构建。
 * 网络故障只丢弃真实帧，不编造回执/资产；页面刷新仅保留无凭证的原请求证据。
 */
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import type { IdleClaimJournalPort, IdleClaimPending } from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { IdleClaimBinding } from "../assets/scripts/app/remake/IdleClaimBinding";
import { IdleClaimJournal } from "../assets/scripts/app/remake/IdleClaimJournal";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import type { SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";
import { RewardController } from "../assets/scripts/features/reward/RewardController";
import { RewardModel } from "../assets/scripts/features/reward/RewardModel";
import { RewardUtils } from "../assets/scripts/features/reward/utils/RewardUtils";
import type { RewardArgs } from "../assets/scripts/features/reward/data/RewardData";

/** 已核实测试宿主，端口可在同run服务端重启后改变。 */
interface Target {
    /** 仅本机随机端口，禁止日常18080/18081。 */
    api: string;
    /** 本次宿主随机身份，不是账号、连接或资产版本。 */
    run: string;
    /** Java夹具准备的明确区服。 */
    serverId: string;
}

/** 仅保存可公开的请求关联信息，登录凭证及完整鉴权回包从不记录。 */
interface RequestSummary {
    /** 实际客户端发送的协议名。 */
    name: string;
    /** 网络往返标识，仅供验证每次重试仍为独立Frame。 */
    frameId?: string;
    /** 仅领取及status携带的原业务ID。 */
    requestId?: string;
    /** 仅领取请求携带的冻结消费版本。 */
    expectedOperationVersion?: number;
}

/** 页面刷新前保存的测试证据；不保存session或任何凭证。 */
interface ReloadRecord {
    /** 本轮隔离run及固定夹具账号。 */
    run: string;
    /** 同区服重新登录，避免错误绑定到别的服务端。 */
    serverId: string;
    /** 原领取请求，完整指纹必须在刷新后保持。 */
    pending: IdleClaimPending;
    /** 原成功事务的冻结摘要，重启恢复必须保持同一回执。 */
    receipt: Record<string, any>;
}

/** 断言和有界等待只作用于测试页，失败明确中止，不靠长延时推断成功。 */
class Verify {
    /** 无需实例化的检查辅助。 */
    private constructor() {
    }

    /** 条件失败终止当前场景，保留具体原因。 */
    public static that(condition: unknown, message: string): asserts condition {
        if (!condition) {
            throw new Error(message);
        }
    }

    /** 对原请求和回执摘要作完整结构比较，不只比较一部分字段。 */
    public static equal(actual: unknown, expected: unknown, message: string): void {
        Verify.that(JSON.stringify(actual) === JSON.stringify(expected), message);
    }

    /** 等待真实网络/IDB结果，失败显示当前场景而非无限等待。 */
    public static async until(condition: () => boolean, message: string): Promise<void> {
        const deadline = Date.now() + 20000;
        while (!condition()) {
            if (Date.now() >= deadline) {
                throw new Error(message);
            }
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
}

/** 单个场景的观察口；故障仅抑制特定真实帧，没有假回包或本地发奖。 */
class TransportTrace {
    /** 实际请求的无凭证摘要，跨连接保留。 */
    public readonly requests: RequestSummary[] = [];
    /** 本场景捕获的真实成功回执，不作为当前状态提交。 */
    public receipt: Record<string, any> | null = null;
    /** 实际丢弃的真实帧说明，供证据区展示。 */
    public readonly dropped: string[] = [];
    /** 真实state推送数，不与应用已接受的统一快照数混用。 */
    public stateEvents = 0;
    /** 已创建的底层连接数，用于验证缺快照只重新鉴权一次。 */
    public connections = 0;
    /** 首个领取请求已发后才允许丢state，避免误丢准备阶段通知。 */
    private claimSent = false;
    /** 首次真实领取成功时的受控停止入口，仅跨页面刷新场景使用。 */
    public onCommitted: (() => void) | null = null;

    /** @param fault 本轮仅允许一种受控故障，后续连接恢复交给真实Socket。 */
    public constructor(private readonly fault: "none" | "receipt" | "state" | "reload") {
    }

    /** 返回原生WebSocket的薄观察包装，所有传输字节保持原样。 */
    public create = (url: string): SocketPort => {
        this.connections++;
        const native = new WebSocket(url, GAME_SOCKET_PROTOCOL);
        const trace = this;
        const port = {
            onopen: null as ((event: Event) => void) | null,
            onmessage: null as ((event: MessageEvent) => void) | null,
            onerror: null as ((event: Event) => void) | null,
            onclose: null as ((event: CloseEvent) => void) | null,
            /** 就绪状态由原生连接决定，测试不伪造已连接。 */
            get readyState() { return native.readyState; },
            /** 转交服务端实际协商的子协议，继续使用正式校验。 */
            get protocol() { return native.protocol; },
            /** 返回原生二进制格式，不能绕过arraybuffer约束。 */
            get binaryType() { return native.binaryType; },
            /** 正式通信层设置的接收格式直接传给原生连接。 */
            set binaryType(value: BinaryType) { native.binaryType = value; },
            /** 仅记录无凭证的请求关联摘要，然后原样发送真实PB字节。 */
            send(value: string | ArrayBufferLike | Blob | ArrayBufferView): void {
                const frame = GameProtocolCodecUtils.decodeGameFrame(value);
                const row: RequestSummary = {name: frame.name, frameId: frame.id};
                if (frame.name === Protocol.CHAPTER_IDLE_CLAIM || frame.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS) {
                    const body = frame.body as any;
                    row.requestId = body.requestId;
                    if (frame.name === Protocol.CHAPTER_IDLE_CLAIM) {
                        row.expectedOperationVersion = body.expectedOperationVersion;
                        trace.claimSent = true;
                    }
                }
                trace.requests.push(row);
                native.send(value);
            },
            /** 关闭真实通道，后续鉴权及重连仍由正式通信层协调。 */
            close(): void {
                native.close();
            },
        };
        native.onopen = event => port.onopen?.(event);
        native.onerror = event => port.onerror?.(event);
        native.onclose = event => port.onclose?.(event);
        native.onmessage = event => {
            const frame = GameProtocolCodecUtils.decodeGameFrame(event.data);
            const claimReceipt = frame.name === Protocol.CHAPTER_IDLE_CLAIM && frame.kind === "response" && frame.ok === true;
            const state = frame.name === Protocol.STATE_CHANGED && frame.kind === "event";
            if (claimReceipt) {
                trace.receipt = frame.body as Record<string, any>;
            }
            if (state) {
                trace.stateEvents++;
            }
            if (trace.fault === "reload" && trace.claimSent && (state || claimReceipt)) {
                trace.dropped.push(frame.name);
                if (claimReceipt) {
                    trace.onCommitted?.();
                }
                return;
            }
            if (trace.fault === "receipt" && claimReceipt && !trace.dropped.includes(frame.name)) {
                trace.dropped.push(frame.name);
                native.close();
                return;
            }
            if (trace.fault === "state" && trace.claimSent && state && !trace.dropped.includes(frame.name)) {
                trace.dropped.push(frame.name);
                return;
            }
            port.onmessage?.(event);
        };
        return port as unknown as SocketPort;
    };
}

/** 一次真实客户端装配，所有资产只经过AccountService及AssetStateBinding。 */
class LiveApplication {
    /** 本场唯一共享反馈Model，只观察展示队列，不作资产数据来源。 */
    public readonly rewards = new RewardModel();
    /** 通用反馈使用正式Controller；此无引擎检查只记录开窗交付，实际画面另由Creator复验。 */
    public readonly feedback = new RewardController(this.rewards);
    /** 通用Controller实际交付的奖励批次，不与库存快照混用。 */
    public readonly shown: RewardArgs[] = [];
    /** 唯一账号状态，历史回执不得覆盖其当前钱包。 */
    public readonly account = new AccountModel();
    /** 本场景唯一主线数据，不使用页面或全局单例中的旧状态。 */
    public readonly model = new MainChapterModel();
    /** 原生持久记录连接，退出仅关闭不删除。 */
    public readonly journal: IdleClaimJournal;
    /** 真实WS连接，消息均经过现行PB编解码。 */
    public readonly socket: GameSocketClient;
    /** 认证交付会过滤换号后的成功与失败。 */
    public readonly service: AccountService;
    /** 当前测试身份的持久端口，仅用于核验原意图保存/清理。 */
    public port: IdleClaimJournalPort | null = null;
    /** 本测试应用的唯一背包数据，所有变化来自统一服务端状态。 */
    private readonly bagModel = new BagModel();
    /** 原背包控制器提交上述唯一Model，不创建其他库存副本。 */
    private readonly bag = new BagController(this.bagModel);
    /** 原主线控制器提交当前时钟、operation和资产版本。 */
    private readonly chapter = new MainChapterController(this.model);
    /** 按应用身份激活的恢复入口，首次登录后才显式装配以便先保存测试意图。 */
    private binding: IdleClaimBinding | null = null;
    /** 统一状态提交入口，销毁时负责解除模块监听。 */
    private readonly assets: AssetStateBinding;
    /** 最近接纳的初始化信封；不向证据区输出其中的凭证。 */
    private initialized: GameFrame | null = null;
    /** 防止真实提交观察后重复释放资源。 */
    private disposed = false;

    /** 注入已核实目标和故障观察口，日常配置不会进入此装配。 */
    public constructor(
        /** 随机测试宿主及明确区服，所有登录请求都使用它。 */
        private readonly target: Target,
        /** 仅保存真实字节的观察摘要，不成为任何Model数据源。 */
        public readonly trace: TransportTrace,
    ) {
        this.journal = new IdleClaimJournal("isolated:" + target.run);
        this.socket = new GameSocketClient(target.api.replace(/^http/, "ws") + "/api/v1/game/socket", {
            create: trace.create,
            timeoutMs: 1500,
            retryDelay: () => 100,
            heartbeatMs: 5000,
            validateSnapshot: value => {
                const state = value as any;
                AccountApi.readSnapshotRole(state);
                MainChapterController.readState(state?.mainChapter, state?.revision);
            },
        });
        this.service = new AccountService(this.account, new AccountApi(this.socket), {
            read: () => null,
            write: () => {},
            clear: () => {},
        });
        this.bag.initialize();
        this.chapter.initialize();
        this.feedback.configure(async args => { this.shown.push(args); }, () => {
            throw new Error("本批挂机真实反馈应为POPUP");
        });
        this.feedback.initialize();
        this.assets = new AssetStateBinding(this.account, this.bag,
            new RoleController(role => this.service.acceptRole(role)), undefined, undefined,
            () => {
                this.binding?.deactivate();
                this.feedback.resetSession();
            }, this.chapter);
        const accept = (frame: GameFrame): void => {
            if (this.assets.apply(frame)) {
                this.initialized = frame;
                this.feedback.observeRevision(this.model.state!.assetRevision);
                this.binding?.afterSnapshot(frame.name);
            }
        };
        this.service.onInitialized = accept;
        this.socket.onState = accept;
        this.socket.onReward = frame => ProtocolRouter.instance.dispatch(this.feedback, frame);
        this.socket.onRejected = (token, message) => this.service.rejectSession(token, message);
        this.socket.onReady = () => {
            if (!this.account.snapshot.busy && this.account.snapshot.role && this.socket.latestState) {
                accept(this.socket.latestState);
            }
        };
    }

    /** 登录Java可信夹具，当前状态仍由真实统一首包提供。 */
    public async login(account: string): Promise<void> {
        Verify.that(await this.service.login(account, this.target.serverId), this.account.snapshot.error || "独立登录失败");
        Verify.that(this.model.idle?.claimState, "夹具缺少挂机累计能力");
        const points = this.account.snapshot.role?.tavernPoints;
        Verify.that(points?.schemaVersion === 1 && Number.isSafeInteger(points.adventureCount)
            && Number.isSafeInteger(points.limit), "真实统一首包没有权威冒险点");
    }

    /**
     * 先原子保存原请求，再安装正式应用恢复绑定；不调用私有controller或玩家View。
     * @param requireExisting 刷新恢复必须先读到原记录，不能从测试元数据重建掩盖日志丢失。
     */
    public async startRecovery(request?: IdleClaimPending, requireExisting = false): Promise<IdleClaimPending> {
        const role = this.account.snapshot.role;
        Verify.that(role?.serverId && this.initialized && this.model.idle?.claimState, "恢复前必须接受真实首包");
        this.port = await this.journal.forRole(role.serverId, role.id);
        const original: IdleClaimPending = request || {schemaVersion: 1, requestId: crypto.randomUUID(),
            expectedOperationVersion: this.model.idle.claimState.operationVersion};
        if (requireExisting) {
            Verify.equal(await this.port.read(), original, "刷新后的原生持久记录缺失或已变化，不能从页面元数据重建掩盖问题");
        }
        Verify.equal(await this.port.create(original), original, "同一测试身份已存在其他原请求");
        Verify.equal(await this.port.read(), original, "发包前原请求未持久化");
        if (!this.binding) {
            this.binding = new IdleClaimBinding(this.account, this.service, this.socket, this.journal, this.model,
                confirmation => {
                    if (confirmation.receipt.feedback) {
                        this.feedback.restore(confirmation.receipt.feedback);
                    }
                });
        }
        this.binding.afterSnapshot(this.initialized.name);
        return original;
    }

    /** 等待本场原请求与最新状态双向确认，检查期间不创建第二个新意图。 */
    public async confirmed(): Promise<void> {
        await Verify.until(() => this.model.idleClaim.phase === "confirmed", "恢复未确认：" + this.model.idleClaim.message);
        Verify.that(this.port, "恢复记录口缺失");
        Verify.equal(await this.port.read(), null, "成功双确认后仍残留原请求");
    }

    /** 从真实status读取冻结回执；仅查询历史结果，不提交其中的资产。 */
    public async status(requestId: string): Promise<Record<string, any>> {
        const frame = await this.service.authenticated(token => this.socket.chapter(token, Protocol.CHAPTER_IDLE_CLAIM_STATUS, {requestId}));
        const status = frame.body as any;
        Verify.that(status.status === "COMMITTED" && status.receipt.requestId === requestId, "真实status没有返回原提交");
        return status.receipt;
    }

    /**
     * 输出当前状态与历史回执各自摘要，确认钱包来自最新统一首包而非回执重放。
     * @param latestIsThisCommit 新提交案例需逐币种匹配本次实际到账；历史恢复允许当前资产已再次变化。
     */
    public proof(request: IdleClaimPending, receipt: Record<string, any>, latestIsThisCommit = true): Record<string, unknown> {
        const state = this.model.state;
        const idle = this.model.idle;
        const role = this.account.snapshot.role;
        Verify.that(state && idle?.claimState && role, "确认后权威状态缺失");
        Verify.that(state.assetRevision >= receipt.assetRevision, "统一资产版本未达到回执");
        Verify.that(idle.claimState.operationVersion >= receipt.afterOperationVersion, "操作版本未达到回执");
        if (latestIsThisCommit) {
            Verify.that(role.gold === receipt.actual.wallet.goldAfter && role.diamonds === receipt.actual.wallet.diamondsAfter,
                "真实统一钱包与本次发奖结果不一致");
            const changes = receipt.actual.tavern;
            Verify.that(Array.isArray(changes) && changes.length === 1
                && role.tavernPoints?.adventureCount === changes[0].afterQuantity
                && role.tavernPoints.limit === changes[0].limit,
                "权威冒险点未按真实独立领域结果同步");
            Verify.that(!this.bagModel.snapshot.items.some(item => item.itemId === 900401),
                "新快照仍把冒险点当作普通背包物品");
        }
        return {
            original: request,
            receipt: LiveBrowserCheck.receiptSummary(receipt),
            current: {assetRevision: state.assetRevision, operationVersion: idle.claimState.operationVersion,
                requestMode: idle.claimState.requestMode, startedAt: idle.startedAt,
                wallet: {gold: role.gold, diamonds: role.diamonds}},
            tavernPoints: role.tavernPoints,
            requests: this.trace.requests,
            dropped: this.trace.dropped,
            stateEvents: this.trace.stateEvents,
            connections: this.trace.connections,
            rewardFeedback: { accepted: this.rewards.snapshot.acceptedCount, shown: this.shown.map(row => ({
                receiptId: row.receiptId, items: row.items,
            })) },
        };
    }

    /** 主动结束所有网络和IDB任务，但不删除已提交的待确认原记录。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.binding?.dispose();
        if (!this.binding) {
            this.journal.dispose();
        }
        this.socket.onReady = this.socket.onState = this.socket.onRejected = null;
        this.socket.onReward = null;
        this.socket.disconnect();
        this.feedback.dispose();
        this.assets.dispose();
        this.bag.dispose();
    }
}

/** 通过本机测试页按钮驱动本批实际联调，不从浏览器自动运行后台领取。 */
export class LiveBrowserCheck {
    /** 工具只提供显式按钮入口。 */
    private constructor() {
    }

    /** 校验测试身份与本机目标，失败不发游戏登录，也不回退日常地址。 */
    private static async target(): Promise<Target> {
        const query = new URL(location.href).searchParams;
        const api = query.get("api") || "";
        const run = query.get("run") || "";
        const serverId = query.get("serverId") || "local-1";
        Verify.that(/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(api) && /^[a-f0-9]{32}$/.test(run), "测试参数无效");
        const port = Number(new URL(api).port);
        Verify.that(port <= 65535 && ![18080, 18081, 3306].includes(port), "禁止连接日常端口");
        const response = await fetch(api + "/api/v1/test-identity", {credentials: "omit", redirect: "error"});
        Verify.that(response.ok, "独立测试探针不可用");
        const identity = await response.json();
        Verify.that(identity.kind === "mxzg-owned-socket-it" && identity.run === run, "测试服务端身份不匹配");
        return {api, run, serverId};
    }

    /** 冻结无凭证的回执摘要，整个验证过程不打印登录帧或session。 */
    public static receiptSummary(receipt: Record<string, any>): Record<string, any> {
        return {
            requestId: receipt.requestId, receiptId: receipt.receiptId,
            beforeOperationVersion: receipt.beforeOperationVersion, afterOperationVersion: receipt.afterOperationVersion,
            assetRevision: receipt.assetRevision, committedAtSeconds: receipt.committedAtSeconds,
            previousStartedAtSeconds: receipt.previousStartedAtSeconds, seconds: receipt.seconds,
            theoreticalRewards: receipt.theoreticalRewards,
            actual: {roleId: receipt.actual.roleId, items: receipt.actual.items, wallet: receipt.actual.wallet,
                tavern: receipt.actual.tavern,
                bonuses: receipt.actual.bonuses,
                spirits: receipt.actual.spirits, timedItems: receipt.actual.timedItems},
        };
    }

    /** 运行正常、丢回执、丢通知三种真实提交，每个固定夹具角色只执行一笔。 */
    public static async run(): Promise<Record<string, unknown>> {
        const target = await this.target();
        const results: Record<string, unknown>[] = [];
        for (const [account, fault] of [["idle_direct", "none"], ["idle_lost_receipt", "receipt"], ["idle_lost_state", "state"]] as const) {
            const app = new LiveApplication(target, new TransportTrace(fault));
            try {
                await app.login(account);
                Verify.that(app.account.snapshot.role?.tavernPoints?.adventureCount === 2000,
                    "独立新角色未按旧同源配置初始化2000冒险点");
                Verify.that(app.model.idle!.claimState!.requestMode === "ENABLED", "本阶段需要仅测试宿主启用领取");
                const original = await app.startRecovery();
                await app.confirmed();
                const claims = app.trace.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM);
                Verify.that(claims.length === 1 && claims[0].requestId === original.requestId
                    && claims[0].expectedOperationVersion === original.expectedOperationVersion, "原请求被重复编号或改写");
                const authenticates = app.trace.requests.filter(row => row.name === Protocol.SESSION_AUTHENTICATE).length;
                Verify.that(fault === "none" || authenticates === 1, "故障恢复鉴权次数应恰好一次");
                if (fault !== "none") {
                    Verify.that(app.trace.dropped.length === 1, "指定故障未实际触发");
                }
                const receipt = await app.status(original.requestId);
                Verify.that(receipt.afterOperationVersion === original.expectedOperationVersion + 1, "单笔提交未恰好消费一次版本");
                Verify.that(app.rewards.snapshot.acceptedCount === 1 && app.shown.length === 0,
                    "实时通知及历史恢复没有合并为等待主城的一笔反馈");
                app.feedback.setReady(true);
                await Verify.until(() => app.rewards.snapshot.phase === "idle", "通用奖励批次未完成展示交付");
                Verify.equal(app.shown, [{ receiptId: receipt.receiptId,
                    items: RewardUtils.fromActual(receipt.receiptId, receipt.assetRevision, receipt.actual)!.items }],
                    "通用奖励未恰好交付一次实际到账及升级附赠");
                results.push({case: account, ...app.proof(original, receipt)});
            } finally {
                app.dispose();
            }
        }
        return {result: "PASS", scope: "真实JavaWS + 新客户端 + 原生IDB", cases: results};
    }

    /** 观察真实事务已提交后立即释放应用，故意不交付回执或通知，留下跨刷新原意图。 */
    public static async prepareReload(): Promise<Record<string, unknown>> {
        const target = await this.target();
        const trace = new TransportTrace("reload");
        const app = new LiveApplication(target, trace);
        trace.onCommitted = () => app.dispose();
        let original: IdleClaimPending;
        try {
            await app.login("idle_reload");
            Verify.that(app.model.idle!.claimState!.requestMode === "ENABLED", "准备阶段测试宿主必须启用领取");
            original = await app.startRecovery();
            await Verify.until(() => trace.receipt !== null, "未观察到真实成功领取回执");
        } finally {
            app.dispose();
        }
        const journal = new IdleClaimJournal("isolated:" + target.run);
        try {
            const receipt = trace.receipt!;
            const port = await journal.forRole(target.serverId, receipt.actual.roleId);
            Verify.equal(await port.read(), original!, "销毁应用不应删除未交付的原意图");
            Verify.that(!trace.requests.some(row => row.name === Protocol.SESSION_AUTHENTICATE), "准备阶段不应自动恢复");
            Verify.that(trace.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS).length === 1,
                "准备阶段只能有提交前NOT_FOUND查询");
            const record: ReloadRecord = {run: target.run, serverId: target.serverId,
                pending: original!, receipt: LiveBrowserCheck.receiptSummary(receipt)};
            sessionStorage.setItem("mxzg.idle.live.reload." + target.run, JSON.stringify(record));
            return {result: "PREPARED", record, requests: trace.requests, dropped: trace.dropped,
                next: "停止测试Java宿主后以同run只读重启，换新api参数并刷新，再恢复原请求"};
        } finally {
            journal.dispose();
        }
    }

    /** 新服务端进程只读模式下，重新登录后从真实历史COMMITTED恢复原ID，不再发领取。 */
    public static async restoreReload(): Promise<Record<string, unknown>> {
        const target = await this.target();
        const saved = sessionStorage.getItem("mxzg.idle.live.reload." + target.run);
        Verify.that(saved, "本标签页缺少刷新前记录");
        const record = JSON.parse(saved) as ReloadRecord;
        Verify.that(record.run === target.run && record.serverId === target.serverId, "刷新记录不属于当前测试宿主");
        const app = new LiveApplication(target, new TransportTrace("none"));
        let history: Record<string, unknown>;
        try {
            await app.login("idle_reload");
            Verify.that(app.model.idle!.claimState!.requestMode === "READ_ONLY", "重启恢复阶段必须为只读");
            const acceptedBeforeRecovery = {
                wallet: {gold: app.account.snapshot.role!.gold, diamonds: app.account.snapshot.role!.diamonds},
                assetRevision: app.model.state!.assetRevision,
                operationVersion: app.model.idle!.claimState!.operationVersion,
                startedAt: app.model.idle!.startedAt,
            };
            await app.startRecovery(record.pending, true);
            await app.confirmed();
            const receipt = await app.status(record.pending.requestId);
            Verify.equal(LiveBrowserCheck.receiptSummary(receipt), record.receipt, "跨Java进程重启后的历史回执发生变化");
            Verify.that(!app.trace.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM), "只读历史恢复误发新领取");
            const acceptedAfterRecovery = {
                wallet: {gold: app.account.snapshot.role!.gold, diamonds: app.account.snapshot.role!.diamonds},
                assetRevision: app.model.state!.assetRevision,
                operationVersion: app.model.idle!.claimState!.operationVersion,
                startedAt: app.model.idle!.startedAt,
            };
            Verify.equal(acceptedAfterRecovery, acceptedBeforeRecovery, "历史回执改变了已接纳的最新统一状态");
            history = {...app.proof(record.pending, receipt, false), acceptedBeforeRecovery};
        } finally {
            app.dispose();
        }
        const pending = await this.readOnlyPending(target);
        sessionStorage.removeItem("mxzg.idle.live.reload." + target.run);
        await this.clearTestDatabase(target.run);
        return {result: "PASS", scope: "页面刷新 + Java进程重启 + READ_ONLY历史恢复", history, pending,
            isolatedDatabaseDeleted: true};
    }

    /** 只读NOT_FOUND保留原意图，换号不串记录，回原号仍查询原ID且不发领取。 */
    private static async readOnlyPending(target: Target): Promise<Record<string, unknown>> {
        const app = new LiveApplication(target, new TransportTrace("none"));
        try {
            await app.login("idle_pending");
            Verify.that(app.model.idle!.claimState!.requestMode === "READ_ONLY", "NOT_FOUND检查需只读状态");
            const request = await app.startRecovery();
            await Verify.until(() => app.model.idleClaim.phase === "paused", "只读NOT_FOUND应暂停保留");
            Verify.equal(await app.port!.read(), request, "只读NOT_FOUND删除了原意图");
            const currentRole = app.account.snapshot.role!;
            const originalPort = app.port!;
            await app.login("idle_other");
            await Verify.until(() => app.model.idleClaim.phase === "idle", "新身份不应带入旧意图");
            Verify.equal(await originalPort.read(), request, "换号删除了原身份记录");
            await app.login("idle_pending");
            await Verify.until(() => app.model.idleClaim.phase === "paused", "原身份重登没有继续原意图");
            Verify.equal(app.model.idleClaim.pending, request, "重登改写了原请求");
            Verify.equal(await originalPort.read(), request, "重登未保留原意图");
            Verify.that(app.account.snapshot.role!.id === currentRole.id, "原号重登角色变化");
            Verify.that(!app.trace.requests.some(row => row.name === Protocol.CHAPTER_IDLE_CLAIM), "只读NOT_FOUND错误重发领取");
            const statuses = app.trace.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM_STATUS);
            Verify.that(statuses.length === 2 && statuses.every(row => row.requestId === request.requestId), "换号恢复查询没有保持原编号");
            return {original: request, phase: app.model.idleClaim.phase, requests: app.trace.requests,
                assetRevision: app.model.state!.assetRevision, operationVersion: app.model.idle!.claimState!.operationVersion};
        } finally {
            app.dispose();
        }
    }

    /** 仅删除本次随机测试run数据库；所有连接必须先由场景finally释放。 */
    private static clearTestDatabase(run: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase("mxzg.remake.idle-claims.v1.isolated:" + run);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("测试数据库仍被占用，不能清理"));
        });
    }

    /** 只绑定测试页真实按钮，异步失败受控显示，不产生未捕获异常或后台自动领取。 */
    public static bind(): void {
        const output = document.getElementById("Output")!;
        const entries: [string, () => Promise<Record<string, unknown>>][] = [
            ["RunButton", () => this.run()],
            ["PrepareReloadButton", () => this.prepareReload()],
            ["RestoreReloadButton", () => this.restoreReload()],
        ];
        const buttons = entries.map(([id]) => document.getElementById(id) as HTMLButtonElement);
        entries.forEach(([, action], index) => {
            buttons[index].addEventListener("click", async () => {
                buttons.forEach(button => { button.disabled = true; });
                output.textContent = "RUNNING";
                document.body.dataset.result = "running";
                try {
                    const proof = await action();
                    output.textContent = JSON.stringify(proof, null, 2);
                    document.body.dataset.result = String(proof.result).toLowerCase();
                } catch (error) {
                    output.textContent = JSON.stringify({result: "FAIL", error: String(error instanceof Error ? error.stack : error)}, null, 2);
                    document.body.dataset.result = "failed";
                } finally {
                    buttons.forEach(button => { button.disabled = false; });
                }
            });
        });
    }
}

LiveBrowserCheck.bind();
