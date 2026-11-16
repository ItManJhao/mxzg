/**
 * 通用奖励协议专项：校验真实到账投影、通知信封及长连接的角色/连接隔离。
 * 使用内存受控二进制连接；可显式读取本轮Java输出互通，不查询数据库或启动玩家入口。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { RewardUtils } from "../assets/scripts/features/reward/utils/RewardUtils";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameSocketClient, SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 无资产写入的合法实际回执；历史钱包故意与明细不等，防止使用钱包差。 */
const actual = {
    roleId: "isolated-role",
    items: [{ itemId: 900002, credited: 3, requested: 100 }, { itemId: 900001, credited: 0 },
        { itemId: 900002, credited: 4 }, { itemId: 2000002, credited: 1 }],
    bonuses: [{ itemId: 900002, quantity: 2 }],
    wallet: { goldBefore: 0, goldAfter: 99999 },
};
/** 持久成功编号，与网络往返id不同。 */
const receiptId = "11223344-1122-4122-8122-112233441122";

/** 校验客户端恢复投影与真实通知完全同构，不将理论/附赠或实例多计。 */
function projection(): void {
    const before = JSON.stringify(actual);
    const notice = RewardUtils.fromActual(receiptId, 5, actual)!;
    assert.deepEqual(notice.items, [{ itemId: 900002, credited: 9 }, { itemId: 2000002, credited: 1 }]);
    assert.equal(JSON.stringify(actual), before);
    assert(Object.isFrozen(notice) && Object.isFrozen(notice.items) && Object.isFrozen(notice.items[0]));
    assert.equal(RewardUtils.fromActual(receiptId, 5, { ...actual, items: [{ itemId: 1, credited: 0 }], bonuses: [] }), null);
    for (const value of [
        { ...actual, items: undefined }, { ...actual, bonuses: undefined },
        { ...actual, items: [{ itemId: 1, credited: -1 }] },
        { ...actual, bonuses: [{ itemId: 1, quantity: "2" }] },
        { ...actual, items: [{ itemId: 1, credited: Number.MAX_SAFE_INTEGER }], bonuses: [{ itemId: 1, quantity: 1 }] },
    ]) {
        assert.throws(() => RewardUtils.fromActual(receiptId, 5, value));
    }
    const frame: GameFrame = { version: 1, kind: "event", name: Protocol.REWARD_GRANTED,
        connectionId: "connection", body: notice };
    assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(frame)), frame);
    for (const changes of [{ kind: "request" }, { kind: "response", ok: true }, { id: "unrelated-rpc" },
        { ok: true }, { body: { ...notice, items: [] } }, { body: { ...notice, mode: "NORMAL" } }]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...frame, ...changes }));
    }
    const Frame = (mxzg as any).game.Frame;
    const invalid = Frame.encode({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED,
        rewardNotice: { ...notice, items: [{ itemId: 1, credited: 0 }] } }).finish();
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(invalid));
}

/** 内存连接只响应真实鉴权帧，不自行交付资产增量或奖励业务命令。 */
class Wire {
    /** 模拟浏览器事件句柄，关闭后保留以便显式验证旧连接迟到。 */
    public onopen: any = null;
    /** 真实客户端接收入口，push必须经过Protobuf。 */
    public onmessage: any = null;
    /** 没有额外错误模拟，符合SocketPort形状。 */
    public onerror: any = null;
    /** 由断开路径使用的回调，不启动自动重连计时。 */
    public onclose: any = null;
    /** 浏览器连接状态：初始0，连接后1，关闭后3。 */
    public readyState = 0;
    /** 客户端设置二进制模式，不接受文本奖励。 */
    public binaryType = "";
    /** 与实际服务端相同的二进制子协议。 */
    public protocol = GAME_SOCKET_PROTOCOL;

    /** 本次受控连接标识随连接变化，不能混用旧标识。 */
    public constructor(public readonly id: string) {
        queueMicrotask(() => { this.readyState = 1; this.onopen?.({}); });
    }

    /** 仅对鉴权返回合法统一首包，业务通知由用例明确发送。 */
    public send(data: unknown): void {
        const request = GameProtocolCodecUtils.decodeGameFrame(data);
        assert.equal(request.name, Protocol.SESSION_AUTHENTICATE);
        queueMicrotask(() => this.push({ version: 1, kind: "response", name: request.name, id: request.id, ok: true,
            body: { connectionId: this.id, roleId: actual.roleId, serverTimeMs: 1000,
                initial: { revision: 3, role: { id: actual.roleId, nickname: "隔离", serverId: "isolated", level: 1, gold: 0, diamonds: 0 },
                    inventory: [], heroes: [] } } }));
    }

    /** 通知通过真实编码，不跳过客户端信封和角色校验。 */
    public push(frame: GameFrame): void {
        this.onmessage?.({ data: GameProtocolCodecUtils.encodeGameFrame({ ...frame, connectionId: this.id }) });
    }

    /** 关闭受控连接，不触发其他测试资源清理。 */
    public close(): void {
        this.readyState = 3;
    }
}

/** 已认证的奖励事件不改变latestState；其他角色及旧连接事件不能进入应用。 */
async function transport(): Promise<void> {
    const wires: Wire[] = [];
    const received: GameFrame[] = [];
    const client = new GameSocketClient("ws://127.0.0.1:39999/api/v1/game/socket", {
        create: () => {
            const wire = new Wire("connection-" + wires.length);
            wires.push(wire);
            return wire as unknown as SocketPort;
        },
        validateSnapshot: () => undefined,
        heartbeatMs: 100000,
    });
    client.onReward = frame => received.push(frame);
    try {
        await client.connect("a".repeat(43));
        const state = client.latestState;
        const notice = RewardUtils.fromActual(receiptId, 5, actual)!;
        wires[0].push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: notice });
        assert.equal(received.length, 1);
        assert.equal(client.latestState, state, "奖励不能冒充统一资产快照");
        client.disconnect();
        await client.connect("b".repeat(43));
        wires[0].push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED, body: notice });
        assert.equal(received.length, 1, "旧连接回调不得交付");
        wires[1].push({ version: 1, kind: "event", name: Protocol.REWARD_GRANTED,
            body: { ...notice, roleId: "other-role" } });
        assert.equal(received.length, 1, "其他角色的奖励不得交付");
        assert.equal(wires[1].readyState, 3, "跨角色协议须拒绝连接");
    } finally {
        client.disconnect();
    }
}

/** 可选参数仅读本轮Java真实帧，默认专项不依赖历史target产物。 */
async function main(): Promise<void> {
    projection();
    await transport();
    const path = process.argv.find(value => value.startsWith("--java="))?.slice(7);
    if (path) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync(path));
        assert.equal(frame.name, Protocol.REWARD_GRANTED);
        GameProtocolCodecUtils.validateRewardNotice(frame.body);
        console.log("Java实际reward.granted二进制互通通过");
    }
    console.log("通用奖励实际投影、协议和连接隔离检查通过");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
