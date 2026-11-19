/**
 * 首通和里程碑领取沿真实账号交付及二进制连接验证。
 * 只替换网络对端和奖励窗，区分即时回执、服务端推送和重连首包。
 */
import { strict as assert } from "node:assert";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { MainChapterModel } from "../assets/scripts/features/battle/MainChapterModel";
import { MainChapterSession } from "../assets/scripts/features/battle/MainChapterSession";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL, type GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient, type SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

const milestoneReceipt = "22345678-1234-4234-8234-123456789abc";
const chapterReceipt = "32345678-1234-4234-8234-123456789abc";

/** 测试帧只使用各窗口实际依赖的角色和主线字段。 */
function snapshot(account: string, serverId: string, claimedMilestone: boolean, claimedChapter: boolean, revision: number) {
    return {
        role: { id: "role-" + account, nickname: account, serverId, level: 2, gold: 50, diamonds: 7 },
        inventory: [],
        heroes: [],
        revision,
        mainChapter: {
            maxCleared: 15, pendingBattleId: null, assetRevision: revision, challengeLimit: 20,
            milestoneProgress: { schemaVersion: 1, claimedIds: claimedMilestone ? [100] : [] },
            firstRewardProgress: { schemaVersion: 1, claimedChapters: claimedChapter ? [1] : [],
                eligibleChapters: claimedChapter ? [] : [1] },
        },
    };
}

/** 用正式编解码模拟 WebSocket 两端，每次连接有独立编号。 */
class Wire {
    /** 由真实连接安装的打开回调，在创建后的微任务触发。 */
    public onopen: (() => void) | null = null;
    /** 当前连接收到二进制响应或推送的入口。 */
    public onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
    /** 模拟 WebSocket 错误所需的回调槽。 */
    public onerror: (() => void) | null = null;
    /** 模拟 WebSocket 主动关闭所需的回调槽。 */
    public onclose: (() => void) | null = null;
    /** 浏览器合同，0 正在打开、1 已打开、3 已关闭。 */
    public readyState = 0;
    /** 真实连接注册时设置为 arraybuffer。 */
    public binaryType = "";
    /** 客户端握手必需的项目协议。 */
    public protocol = GAME_SOCKET_PROTOCOL;

    /** 为模拟服务端打开独立编号的异步通道。 */
    public constructor(private readonly server: Server, public readonly connection: string) {
        queueMicrotask(() => {
            this.readyState = 1;
            this.onopen?.();
        });
    }

    /** 解码真实请求，再交模拟服务端。 */
    public send(data: ArrayBuffer): void {
        this.server.receive(this, GameProtocolCodecUtils.decodeGameFrame(data));
    }

    /** 关闭该通道，将状态标记为 3。 */
    public close(): void {
        this.readyState = 3;
    }

    /** 携带本通道编号投递编码后的消息。 */
    public push(frame: GameFrame): void {
        this.onmessage?.({ data: GameProtocolCodecUtils.encodeGameFrame({ ...frame, connectionId: this.connection }) });
    }
}

/** 服务端夹具独立推进已领集合和回包投递，便于模拟两种到达顺序或断线。 */
class Server {
    /** 当前案例发出的所有协议名，用于检查只有用户点击才发送领取。 */
    public readonly requests: string[] = [];
    /** 当前案例使用过的连接，旧连接可能仍有夹具延迟应答。 */
    public readonly wires: Wire[] = [];
    /** 下一条推送或鉴权返回的服务端状态。 */
    public state = snapshot("player", "local-1", false, false, 7);
    /** 显式释放的旧连接应答，用于模拟后台断线。 */
    public reply: (() => void) | null = null;
    /** 测试指定该次领取如何返回，允许延迟成功应答。 */
    public next: "success" | "reject" | "hold" = "success";

    /** 提供真实 GameSocketClient 的平台创建入口。 */
    public readonly create = (): SocketPort => {
        const wire = new Wire(this, "chapter-reward-" + this.wires.length);
        this.wires.push(wire);
        return wire as unknown as SocketPort;
    };

    /** 处理真实请求，并从测试对端的状态给出合法回包。 */
    public receive(wire: Wire, frame: GameFrame): void {
        this.requests.push(frame.name);
        const succeed = (body: unknown): void => {
            wire.push({ version: 1, kind: "response", name: frame.name, id: frame.id, ok: true, body });
        };
        if (frame.name === Protocol.SESSION_LOGIN || frame.name === Protocol.SESSION_AUTHENTICATE) {
            if (frame.name === Protocol.SESSION_LOGIN) {
                const body = frame.body as { account: string; serverId: string };
                this.state = snapshot(body.account, body.serverId, false, false, 7);
            }
            const accepted = { connectionId: wire.connection, roleId: this.state.role.id, serverTimeMs: 200000,
                initial: this.state, ...(frame.name === Protocol.SESSION_LOGIN ? {
                    session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" },
                } : {}) };
            queueMicrotask(() => succeed(accepted));
            return;
        }

        const milestone = frame.name === Protocol.CHAPTER_MILESTONE_CLAIM;
        assert(milestone || frame.name === Protocol.CHAPTER_FIRST_REWARD_CLAIM, frame.name);
        assert.deepEqual(frame.body, milestone ? { rewardId: 100 } : { chapter: 1 });
        if (this.next === "reject") {
            queueMicrotask(() => wire.push({
                version: 1, kind: "response", name: frame.name, id: frame.id, ok: false,
                error: { code: "FIRST_REWARD_NOT_REACHED", message: "尚未达到指定关卡", retryable: false },
            }));
            return;
        }

        this.state = snapshot(this.state.role.nickname, this.state.role.serverId,
            milestone || this.state.mainChapter.milestoneProgress.claimedIds.length > 0,
            !milestone || this.state.mainChapter.firstRewardProgress.claimedChapters.length > 0,
            this.state.revision + 1);
        const body = {
            ...(milestone ? {
                rewardId: 100, targetChapter: 15, rulesVersion: "chapter-milestone-v1:" + "a".repeat(64),
                state: this.state.mainChapter,
            } : { chapter: 1 }),
            schemaVersion: 1, roleId: this.state.role.id, assetRevision: this.state.revision,
            receiptId: milestone ? milestoneReceipt : chapterReceipt,
            actual: {
                roleId: this.state.role.id,
                items: [{ itemId: 900001, requested: 10, credited: 10, ignored: 0, reason: "NONE" }],
                bonuses: [], experience: [], heroes: [], stacks: [], tavern: [], timedItems: [],
                wallet: { goldBefore: 0, goldAfter: 10, diamondsBefore: 0, diamondsAfter: 0 },
                spirits: { schemaVersion: 1, items: [] },
            },
        };
        if (this.next === "hold") {
            this.reply = () => succeed(body);
        } else {
            queueMicrotask(() => succeed(body));
        }
    }

    /** 在当前连接推送最新领取状态。 */
    public push(): void {
        this.wires.at(-1)!.push({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: this.state });
    }
}

/** 通过现有登录、连接与统一提交处理所有测试对端消息。 */
class Application {
    /** 本案例唯一模拟服务端，保存本次权威状态与协议记录。 */
    public readonly server = new Server();
    /** 由正式账号服务维护的当前角色状态。 */
    public readonly account = new AccountModel();
    /** 从实际资产入口接收的主线状态。 */
    public readonly model = MainChapterModel.instance;
    /** 负责关联协议、重连及旧通道隔离的生产连接。 */
    public readonly socket = new GameSocketClient("ws://127.0.0.1:18080/api/v1/game/socket", {
        create: this.server.create, validateSnapshot: () => {}, heartbeatMs: 100000, retryDelay: () => 100000,
    });
    /** 登录、认证请求及回包的真实账号边界，存储只用本案例替身。 */
    public readonly service = new AccountController(this.account, new AccountApi(this.socket), {
        read: () => null, write: () => {}, clear: () => {},
    });
    /** 即时收到并交给通用展示的回执编号及资产版本。 */
    public readonly feedback: { id: string; revision: number }[] = [];
    /** 主线装配入口，只替换奖励弹窗能力。 */
    public readonly chapter = new MainChapterSession(this.service, new AccountOperations(this.service, this.socket), {
        restoreActual: (id, revision) => {
            this.feedback.push({ id, revision });
            return "queued";
        },
        restoreItems: () => "empty",
        retry: () => {},
    });
    /** 快照同时提交到真实库存控制器。 */
    private readonly bag = new BagController(new BagModel());
    /** 连接和账号统一通过它更新已领状态。 */
    private readonly assets = new AssetStateBinding(this.account, this.bag, new RoleController(this.account),
        undefined, undefined, () => this.chapter.resetSession(), this.chapter.controller);

    /** 将登录、重连和推送接到唯一资产提交入口。 */
    public constructor() {
        this.bag.initialize();
        const accept = (frame: GameFrame) => { this.assets.apply(frame); };
        this.service.onInitialized = accept;
        this.socket.onState = accept;
        this.socket.onReady = () => {
            if (!this.account.snapshot.busy && this.account.snapshot.role && this.socket.latestState) {
                accept(this.socket.latestState);
            }
        };
    }

    /** 释放本案例占用的连接和模块状态。 */
    public dispose(): void {
        this.socket.onReady = this.socket.onState = null;
        this.service.dispose();
        this.assets.dispose();
        this.chapter.dispose();
        this.bag.dispose();
    }
}

/** 等待可观测的连接条件，超时让测试明确失败。 */
async function until(check: () => boolean): Promise<void> {
    for (let step = 0; step < 40 && !check(); step++) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert(check(), "连接状态未推进");
}

/** 覆盖每次提交、拒绝提示、推送顺序及无回包重连。 */
async function main(): Promise<void> {
    const toast = UIManager.instance.toast;
    const notes: string[] = [];
    UIManager.instance.toast = message => { notes.push(message); };
    const app = new Application();
    try {
        assert(await app.service.login("player", "local-1"));
        app.server.next = "reject";
        await app.chapter.controller.claimFirstReward(1);
        assert.equal(notes.length, 1);
        assert.equal(app.feedback.length, 0);
        assert.deepEqual(app.model.state?.firstRewardProgress?.claimedChapters, []);

        app.server.next = "success";
        await app.chapter.controller.claimFirstReward(1);
        assert.deepEqual(app.feedback, [{ id: chapterReceipt, revision: 8 }]);
        assert.deepEqual(app.model.state?.firstRewardProgress?.claimedChapters, [], "即时回执不替代快照");
        app.server.push();
        assert.deepEqual(app.model.state?.firstRewardProgress?.claimedChapters, [1]);
        assert.equal(app.account.snapshot.role?.gold, 50, "奖励明细不覆盖快照钱包");

        app.server.next = "hold";
        const milestone = app.chapter.controller.claimMilestone(100);
        await until(() => app.server.reply !== null);
        const lateReply = app.server.reply!;
        app.socket.setBackground(true);
        await milestone;
        app.socket.setBackground(false);
        await until(() => app.model.state?.milestoneProgress?.claimedIds.includes(100) === true);
        lateReply();
        assert.deepEqual(app.feedback, [{ id: chapterReceipt, revision: 8 }], "断线的旧回执不补弹");
        assert.deepEqual(app.server.requests, [
            Protocol.SESSION_LOGIN, Protocol.CHAPTER_FIRST_REWARD_CLAIM, Protocol.CHAPTER_FIRST_REWARD_CLAIM,
            Protocol.CHAPTER_MILESTONE_CLAIM, Protocol.SESSION_AUTHENTICATE,
        ], "每次用户确认只发一笔，重连仅重新鉴权");
        assert(await app.service.login("another-player", "local-1"));
        app.server.next = "success";
        await app.chapter.controller.claimMilestone(100);
        assert.deepEqual(app.feedback.at(-1), { id: milestoneReceipt, revision: 8 });
        app.server.push();
        assert.deepEqual(app.model.state?.milestoneProgress?.claimedIds, [100]);
        console.log("首通与里程碑单次请求、拒绝提示、即时奖励和断线快照通过");
    } finally {
        app.dispose();
        UIManager.instance.toast = toast;
    }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
