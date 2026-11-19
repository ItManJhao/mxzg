/**
 * 独立 Java 服务端的挂机领取联调页，复用真实 WebSocket、统一状态提交和奖励展示。
 * 只验证随机run的H2测试夹具；按钮用于测试脚本，不绑定玩家领取View，也不使用发布构建。
 * 通过丢弃真实帧验证回包、推送以及重新鉴权后的资产更新。
 */
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterController } from "../assets/scripts/features/battle/MainChapterController";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import type { IdleClaimConfirmation } from "../assets/scripts/features/battle/data/MainChapterIdleClaimData";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { IdleClaimBinding } from "../assets/scripts/features/battle/IdleClaimBinding";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import type { SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { RewardDisplayFixture } from "./RewardDisplayFixture";
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

    /** 等待真实网络结果，失败显示当前场景而非无限等待。 */
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
    /** @param fault 本轮仅允许一种受控故障，后续连接恢复交给真实Socket。 */
    public constructor(private readonly fault: "none" | "receipt" | "state") {
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
            if (trace.fault === "receipt" && trace.claimSent && state && !trace.dropped.includes(frame.name)) {
                trace.dropped.push(frame.name);
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

/** 一次真实客户端装配，所有资产只经过AccountController及AssetStateBinding。 */
class LiveApplication {
    /** 通用反馈执行真实协议和展示队列，本测试只替换弹窗与飘字。 */
    public readonly feedback: RewardDisplayFixture;
    /** 通用Controller实际交付的奖励批次，不与库存快照混用。 */
    public readonly shown: RewardArgs[] = [];
    /** 唯一账号状态，历史回执不得覆盖其当前钱包。 */
    public readonly account = new AccountModel();
    /** 本场景唯一主线数据，不使用页面或全局单例中的旧状态。 */
    public readonly model = new MainChapterModel();
    /** 真实WS连接，消息均经过现行PB编解码。 */
    public readonly socket: GameSocketClient;
    /** 认证交付会过滤换号后的成功与失败。 */
    public readonly service: AccountController;
    /** 本测试应用的唯一背包数据，所有变化来自统一服务端状态。 */
    private readonly bagModel = new BagModel();
    /** 原背包控制器提交上述唯一Model，不创建其他库存副本。 */
    private readonly bag = new BagController(this.bagModel);
    /** 原主线控制器提交当前时钟、operation和资产版本。 */
    private readonly chapter = new MainChapterController(this.model);
    /** 真实单次领取入口。 */
    private readonly binding: IdleClaimBinding;
    /** 即时成功用于原页面的收取。 */
    public readonly confirmations: IdleClaimConfirmation[] = [];
    /** 联调结束时解除原页面收取事件的观察。 */
    private readonly stopCollection = EventDispatcher.instance.on("main-chapter.idle-collection", confirmation => {
        this.confirmations.push(confirmation);
    });
    /** 统一状态提交入口，销毁时负责解除模块监听。 */
    private readonly assets: AssetStateBinding;
    /** 防止真实提交观察后重复释放资源。 */
    private disposed = false;

    /** 注入已核实目标和故障观察口，日常配置不会进入此装配。 */
    public constructor(
        /** 随机测试宿主及明确区服，所有登录请求都使用它。 */
        private readonly target: Target,
        /** 仅保存真实字节的观察摘要，不成为任何Model数据源。 */
        public readonly trace: TransportTrace,
    ) {
        this.socket = new GameSocketClient(target.api.replace(/^http/, "ws") + "/api/v1/game/socket", {
            create: trace.create,
            clock: ServerClock.instance,
            timeoutMs: 1500,
            retryDelay: () => 100,
            heartbeatMs: 5000,
            validateSnapshot: value => {
                const state = value as any;
                AccountApi.readSnapshotRole(state);
                MainChapterModel.readState(state?.mainChapter, state?.revision);
            },
        });
        this.service = new AccountController(this.account, new AccountApi(this.socket), {
            read: () => null,
            write: () => {},
            clear: () => {},
        });
        this.bag.initialize();
        this.chapter.initialize();
        this.feedback = new RewardDisplayFixture(this.service);
        this.feedback.popup = async args => { this.shown.push(args); };
        this.feedback.tips = () => { throw new Error("挂机奖励应为获得窗"); };
        const operations = new AccountOperations(this.service, this.socket);
        this.chapter.configure(operations, this.feedback);
        this.binding = new IdleClaimBinding(this.service, this.model, this.chapter);
        this.assets = new AssetStateBinding(this.account, this.bag,
            new RoleController(this.account), undefined, undefined,
            () => {
                this.binding.deactivate();
                this.feedback.resetSession();
            }, this.chapter);
        const accept = (frame: GameFrame): void => {
            if (this.assets.apply(frame)) {
                this.feedback.controller.observeRevision(this.assets.acceptedRevision);
            }
        };
        this.service.onInitialized = accept;
        this.socket.onState = accept;
        this.socket.onReward = frame => this.feedback.controller.receive(frame);
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

    /** 在当前测试角色明确发起一次点击。 */
    public claim(): Promise<void> {
        return this.binding.begin({});
    }

    /** 回前台时使用正常鉴权首包同步账户和挂机数据。 */
    public reconnect(): void {
        this.socket.setBackground(true);
        this.socket.setBackground(false);
    }

    /**
     * 核对统一快照中的当前资产与本次真实到账，输出两者的测试摘要。
     */
    public proof(request: { requestId: string; expectedOperationVersion: number }, receipt: Record<string, any>): Record<string, unknown> {
        const state = this.model.state;
        const idle = this.model.idle;
        const role = this.account.snapshot.role;
        Verify.that(state && idle?.claimState && role, "确认后权威状态缺失");
        Verify.that(state.assetRevision >= receipt.assetRevision, "统一资产版本未达到回执");
        Verify.that(idle.claimState.operationVersion >= receipt.afterOperationVersion, "操作版本未达到回执");
        Verify.that(role.gold === receipt.actual.wallet.goldAfter && role.diamonds === receipt.actual.wallet.diamondsAfter,
            "真实统一钱包与本次发奖结果不一致");
        const changes = receipt.actual.tavern;
        Verify.that(Array.isArray(changes) && changes.length === 1
            && role.tavernPoints?.adventureCount === changes[0].afterQuantity
            && role.tavernPoints.limit === changes[0].limit,
            "权威冒险点未按真实独立领域结果同步");
        Verify.that(!this.bagModel.snapshot.items.some(item => item.itemId === 900401),
            "新快照仍把冒险点当作普通背包物品");
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
            rewardFeedback: { accepted: this.feedback.queue.snapshot.acceptedCount, shown: this.shown.map(row => ({
                receiptId: row.receiptId, items: row.items,
            })) },
        };
    }

    /** 释放网络、界面夹具及模块监听。 */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.stopCollection();
        this.binding.deactivate();
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

    /** 验证正常提交、丢回包和丢状态三个独立角色。 */
    public static async run(): Promise<Record<string, unknown>> {
        const target = await this.target();
        const results: Record<string, unknown>[] = [];
        for (const [account, fault] of [["idle_direct", "none"], ["idle_lost_receipt", "receipt"], ["idle_lost_state", "state"]] as const) {
            const app = new LiveApplication(target, new TransportTrace(fault));
            try {
                await app.login(account);
                const operationVersion = app.model.idle!.claimState!.operationVersion;
                Verify.that(app.model.idle!.claimState!.requestMode === "ENABLED", "本阶段需要仅测试宿主启用领取");
                await app.claim();
                Verify.that(app.trace.receipt, "服务端没有确认提交");
                const receipt = app.trace.receipt;
                const [claim, ...duplicates] = app.trace.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM);
                Verify.that(claim?.requestId && claim.expectedOperationVersion === operationVersion && !duplicates.length, "玩家应只发送一次领取");
                Verify.equal(receipt.requestId, claim.requestId, "服务端回执须匹配本次领取");
                if (fault === "state") {
                    await Verify.until(() => app.trace.dropped.includes(Protocol.STATE_CHANGED), "指定的状态事件未被丢弃");
                    Verify.equal(app.model.idle!.claimState!.operationVersion, operationVersion, "缺失推送时保持原快照");
                    Verify.that(app.trace.requests.every(row => row.name !== Protocol.SESSION_AUTHENTICATE), "缺少推送不能主动补鉴权");
                    app.reconnect();
                }
                await Verify.until(() => app.model.idle?.claimState?.operationVersion === operationVersion + 1,
                    "未收到服务端消费后的快照");
                Verify.that(app.trace.requests.every(row => row.name !== Protocol.CHAPTER_IDLE_CLAIM_STATUS), "快照恢复不能追查历史请求");
                Verify.equal(app.trace.requests.filter(row => row.name === Protocol.CHAPTER_IDLE_CLAIM).length, 1, "重连不能自动补发领取");
                Verify.equal(app.confirmations.length, fault === "receipt" ? 0 : 1, "只有即时成功回包才能播放收取");
                const feedbackCount = app.feedback.queue.snapshot.acceptedCount;
                Verify.that(feedbackCount <= 1 && (fault === "receipt" || feedbackCount === 1), "实时通知和回包应合并");
                app.feedback.setReady(true);
                await Verify.until(() => app.feedback.queue.snapshot.phase === "idle", "通用获得窗未完成展示");
                if (feedbackCount === 1) {
                    Verify.equal(app.shown, [{ receiptId: receipt.receiptId,
                        items: RewardUtils.fromActual(receipt.receiptId, receipt.assetRevision, receipt.actual)!.items }],
                        "通用获得窗应恰好展示一次实际到账");
                }
                results.push({case: account, ...app.proof({requestId: claim.requestId,
                    expectedOperationVersion: operationVersion}, receipt)});
            } finally {
                app.dispose();
            }
        }
        return {result: "PASS", scope: "真实 Java 与 TypeScript WebSocket", cases: results};
    }

    /** 玩家显式点击测试按钮后运行联调。 */
    public static bind(): void {
        const output = document.getElementById("Output")!;
        const button = document.getElementById("RunButton") as HTMLButtonElement;
        button.addEventListener("click", async () => {
            button.disabled = true;
            output.textContent = "运行中";
            try {
                output.textContent = JSON.stringify(await this.run(), null, 2);
                document.body.dataset.result = "passed";
            } catch (error) {
                output.textContent = String(error instanceof Error ? error.stack || error.message : error);
                document.body.dataset.result = "failed";
            } finally {
                button.disabled = false;
            }
        });
    }

}

LiveBrowserCheck.bind();
