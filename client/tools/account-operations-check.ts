/**
 * 角色操作通道回归。使用真实账号服务和操作通道，将网络回复精确延迟到登录或切页之后，
 * 检查真实账号切换与断线响应的交付行为。
 */
import { strict as assert } from "node:assert";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import type { AccountGateway, AccountSession } from "../assets/scripts/features/account/AccountApi";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import { SessionChanged } from "../assets/scripts/framework/SessionChanged";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure, type GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import { Protocol, type RoleOperationProtocol } from "../assets/scripts/platform/Protocol";

/** 明确控制发包和解锁时机，避免按毫秒等待猜测并发次序。 */
function gate(): { wait: Promise<void>; open: () => void } {
    let open!: () => void;
    const wait = new Promise<void>(resolve => { open = resolve; });
    return { wait, open };
}

/** 收到的成功帧已经过传输解码，此处只关心回执交付给谁。 */
function success(name: RoleOperationProtocol, body: unknown): GameFrame {
    return { version: 1, kind: "response", name, ok: true, id: "test", body };
}

/** 两次登录可得相同令牌；切换测试必须依赖真实登录轮次隔离。 */
function fixture() {
    const model = new AccountModel();
    const service = new AccountController(model, {
        developmentLogin: async (account, serverId) => ({
            session: { accessToken: "same-test-token", expiresAt: "2099-01-01T00:00:00Z" },
            role: { id: account, serverId, nickname: account, level: 1, gold: 0, diamonds: 0 },
        }),
        currentRole: async () => { throw new Error("测试用独立登录切换角色"); },
    }, { read: () => null, write: () => {}, clear: () => {} });
    const sent: RoleOperationProtocol[] = [];
    const socket = {
        requestFrame: async (_token: string, name: RoleOperationProtocol, _body: unknown): Promise<GameFrame> => {
            sent.push(name);
            return success(name, { found: false });
        },
    };
    const ops = new AccountOperations(service, socket as unknown as GameSocketClient);
    return { model, service, sent, ops, socket };
}

/** 回包晚于换号或同账号重新登录时，由账号层终止原请求。 */
async function filtersLateCompletion(kind: "success" | "reject", account: string): Promise<void> {
    const { service, model, ops, socket } = fixture();
    assert(await service.login("alpha", "world-1"));
    const issued = gate();
    const answer = gate();
    socket.requestFrame = async (_token, name) => {
        issued.open();
        await answer.wait;
        if (kind === "reject") {
            throw new SocketFailure("UNAUTHENTICATED");
        }
        return success(name, { roleId: "alpha" });
    };
    const pending = ops.request(Protocol.HERO_FIRST_SUMMON, {});
    await issued.wait;
    assert(await service.login(account, "world-1"));
    answer.open();
    await assert.rejects(pending, SessionChanged);
    assert.equal(model.snapshot.role?.id, account);
    assert(service.hasSession);
}

/** 业务合法拒绝应保留具体错误；跨角色回执由真实二进制连接专项覆盖。 */
async function deliversBusinessFailure(): Promise<void> {
    const { service, ops, socket } = fixture();
    assert(await service.login("alpha", "world-1"));
    const failure = new SocketFailure("SUMMON_CAPACITY_FULL");
    socket.requestFrame = async () => { throw failure; };
    await assert.rejects(ops.request(Protocol.HERO_FIRST_SUMMON, {}),
        (error: unknown) => error === failure);
}

/** 迟到的通知处理在同一登录可交付；重新登录同一账号或销毁场景时，成功和失败均结束。 */
async function checksEventDelivery(): Promise<void> {
    for (const change of ["none", "relogin", "dispose"] as const) {
        for (const reject of [true, false]) {
            const { service } = fixture();
            assert(await service.login("alpha", "world-1"));
            const pending = gate();
            const delivered: string[] = [];
            const work = service.deliverWhileCurrent(async () => {
                await pending.wait;
                if (reject) {
                    throw new Error("通知等待失败");
                }
                return "success";
            }, value => delivered.push(value), () => delivered.push("failure"));
            if (change === "relogin") {
                await service.login("beta", "world-1");
                await service.login("alpha", "world-1");
            } else if (change === "dispose") {
                service.dispose();
                assert.equal(await service.restore(), false);
                assert.equal(await service.login("beta", "world-1"), false);
            }
            pending.open();
            await work;
            assert.deepEqual(delivered, change === "none" ? [reject ? "failure" : "success"] : []);
        }
    }
}

/** 首包被拒绝时不保存或发布角色，网络中断仍可用原凭证重试，订阅者重入退出也不能复活原登录。 */
async function requiresAcceptedInitialState(): Promise<void> {
    const model = new AccountModel();
    const role = { id: "alpha", serverId: "world-1", nickname: "alpha", level: 1, gold: 0, diamonds: 0 };
    const session: AccountSession = { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z", account: "alpha" };
    const stored: { session: AccountSession | null; writes: number } = { session: null, writes: 0 };
    let offline = false;
    const api: AccountGateway = {
        developmentLogin: async () => ({ session, role }),
        currentRole: async () => {
            if (offline) {
                throw new SocketFailure("DISCONNECTED");
            }
            return role;
        },
        initialization: () => ({ version: 1, kind: "response", name: Protocol.SESSION_AUTHENTICATE, ok: true, body: {} }),
    };
    const service = new AccountController(model, api, {
        read: () => stored.session,
        write: value => {
            stored.session = value;
            stored.writes++;
        },
        clear: () => { stored.session = null; },
    });
    let published = 0;
    const stop = model.subscribe(state => {
        if (state.role) {
            published++;
        }
    });
    try {
        service.onInitialized = () => { throw new Error("首包校验失败"); };
        assert.equal(await service.login("alpha"), false);
        assert.equal(service.hasSession, false);
        assert.equal(model.snapshot.role, null);
        assert.match(model.snapshot.error, /首包校验失败/);
        assert.equal(stored.session, null);
        assert.equal(stored.writes, 0);
        assert.equal(published, 0);

        stored.session = session;
        offline = true;
        assert.equal(await service.restore(), false);
        assert.equal(stored.session, session, "临时断线应保留已保存的凭证");
        offline = false;
        assert.equal(await service.restore(), false);
        assert.equal(service.hasSession, false);
        assert.equal(stored.session, null, "首包内容被拒绝，下一次冷启动不应自动接纳该凭证");
        assert.equal(published, 0);

        stored.session = session;
        service.onInitialized = null;
        assert(await service.restore(), "已恢复的网络和正确资料应允许重试登录");
        assert.equal(published, 1);
        const stopOnLogin = model.subscribe(state => {
            if (state.role) {
                service.logout();
            }
        });
        try {
            assert.equal(await service.login("alpha"), false);
            assert.equal(service.hasSession, false);
            assert.equal(stored.session, null, "订阅者退出后不能写回刚结束的登录");
        } finally {
            stopOnLogin();
        }
    } finally {
        stop();
        service.dispose();
    }
}

/** 顺序执行账号交付检查，每例都有独立账号状态。 */
async function main(): Promise<void> {
    await requiresAcceptedInitialState();
    for (const account of ["alpha", "beta"]) {
        await filtersLateCompletion("success", account);
        await filtersLateCompletion("reject", account);
    }
    await deliversBusinessFailure();
    await checksEventDelivery();
    console.log("角色操作：换号及同角色重新登录、迟到成功与拒绝和账号归属通过");
}

// 未兑现的 Promise 不会自行维持 Node 进程；阻断后续阶段的回归也必须以失败结束。
const deadline = setTimeout(() => { console.error("角色操作检查未完成"); process.exit(1); }, 8000);
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
