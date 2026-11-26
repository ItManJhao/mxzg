/**
 * 聊天客户端专项。使用真实 Controller、Model 和协议路由，
 * 覆盖世界频道补页、私聊范围隔离、公会范围失效和换号后的迟到结果。
 */
import { strict as assert } from "node:assert";
import { ChatController } from "../assets/scripts/features/chat/ChatController";
import { ChatModel } from "../assets/scripts/features/chat/ChatModel";
import { CHAT_CHANNEL_IDS, type ChatWireHistory, type ChatWireMessage, type ChatWireOverview } from "../assets/scripts/features/chat/data/ChatData";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";

/** 待测试用例交付成功或失败的一次认证请求。 */
interface Pending {
    readonly name: GameFrame["name"];
    readonly body: unknown;
    readonly reply: (body: unknown) => void;
    readonly reject: (error: Error) => void;
}

class Fixture {
    /** 真实业务 Controller，测试结束后释放协议登记。 */
    public readonly controller = new ChatController();
    /** 发起顺序中的请求；取出后由用例指定交付时机。 */
    private readonly pending: Pending[] = [];

    /** 建立一个可延迟成功或失败的认证测试通道。 */
    public constructor() {
        const account: Pick<AccountOperations, "deliver"> = {
            deliver: (name, body, received, failed) => new Promise<void>(resolve => {
                this.pending.push({
                    name,
                    body,
                    reply: data => {
                        try {
                            received({ version: 1, kind: "response", name, ok: true, body: data });
                        } catch (error) {
                            failed(error);
                        }
                        resolve();
                    },
                    reject: error => {
                        failed(error);
                        resolve();
                    },
                });
            }),
        };
        this.controller.configure(account as AccountOperations);
        this.controller.initialize();
    }

    /** 检查下一次调用的协议名和业务请求，取出用于交付。 */
    public next(name: GameFrame["name"], body?: object): Pending {
        const pending = this.pending.shift();
        assert.ok(pending, `缺少 ${name} 请求`);
        assert.equal(pending.name, name);
        if (body) {
            assert.deepEqual(pending.body, body);
        }
        return pending;
    }

    /** 向实际协议路由投递一次不包含正文的聊天变化通知。 */
    public changed(): void {
        ProtocolRouter.instance.dispatch(this.controller, {
            version: 1, kind: "event", name: Protocol.CHAT_CHANGED, body: {},
        });
    }

    /** 确定无重复查询待交付。 */
    public checkEmpty(): void {
        assert.equal(this.pending.length, 0);
    }

    /** 交付聊天摘要。默认频道均可用，单个用例可覆盖未读或最近会话。 */
    public async overview(extra: Partial<ChatWireOverview> = {}): Promise<void> {
        this.next(Protocol.CHAT_OVERVIEW, {}).reply({
            channels: Object.values(CHAT_CHANNEL_IDS).map(channel => ({ channel, available: true, unreadCount: 0 })),
            conversations: [],
            ...extra,
        });
        await Promise.resolve();
    }
}

/** 提供消息时间与原文，且 ID 大于 JavaScript 安全整数。 */
function message(id: string): ChatWireMessage {
    return { id, roleId: "role", name: "测试玩家", avatarId: 1,
        borderId: 0, level: 12, text: "你好", sentAtSeconds: 1800000000 };
}

/** 构造一页服务端数据，调用方可追加未读、游标和分页条件。 */
function history(ids: readonly string[], extra: Partial<Omit<ChatWireHistory, "messages">> = {}): ChatWireHistory {
    const messages = ids.map(id => extra.channel === undefined ? message(id) : { ...message(id), channel: extra.channel });
    return { messages, latestId: ids[ids.length - 1] ?? "0", readThroughId: "0",
        unreadCount: 0, hasMore: false, hasNewer: false, canSend: true, ...extra };
}

/** 确认 UI 当前读取的消息数组及顺序。 */
function shown(...ids: string[]): void {
    assert.deepEqual(ChatModel.instance.read({ channel: "world" })?.messages.map(row => row.id), ids);
}

/** 首次预读、连续推送、停线期间多页补齐、向上翻页及已读。 */
async function syncAndRead(fixture: Fixture): Promise<void> {
    const [older, start, next, tail] = ["9007199254740999", "9007199254741000", "9007199254741001", "9007199254741002"];
    fixture.controller.setHomeReady(true);
    fixture.next(Protocol.CHAT_HISTORY, {}).reply(history([start], { unreadCount: 1, hasMore: true }));
    await Promise.resolve();
    assert.equal(ChatModel.instance.read({ channel: "world" })?.unreadCount, 1);
    await fixture.overview();
    fixture.controller.setHomeReady(true);
    fixture.controller.markRead(start);
    fixture.checkEmpty();

    fixture.controller.refresh();
    const first = fixture.next(Protocol.CHAT_HISTORY, { afterId: start });
    fixture.changed();
    fixture.changed();
    fixture.checkEmpty();
    first.reply(history([next], { latestId: tail, unreadCount: 3, hasNewer: true }));
    await Promise.resolve();
    fixture.next(Protocol.CHAT_HISTORY, { afterId: next }).reply(history([tail], { unreadCount: 3 }));
    await Promise.resolve();
    await fixture.overview();
    fixture.checkEmpty();
    shown(start, next, tail);

    fixture.controller.setVisible(true);
    const opened = fixture.next(Protocol.CHAT_HISTORY, { afterId: tail });
    fixture.controller.loadOlder();
    fixture.controller.loadOlder();
    opened.reply(history([], { latestId: tail, unreadCount: 3 }));
    await Promise.resolve();
    fixture.next(Protocol.CHAT_HISTORY, { beforeId: start }).reply(history([older], { latestId: tail, unreadCount: 3 }));
    await Promise.resolve();
    await fixture.overview();
    shown(older, start, next, tail);
    assert.equal(ChatModel.instance.read({ channel: "world" })?.hasMore, false);

    fixture.controller.markRead(tail);
    const reading = fixture.next(Protocol.CHAT_READ, { throughId: tail });
    fixture.controller.markRead(tail);
    reading.reply(history([], { latestId: tail, readThroughId: tail }));
    await Promise.resolve();
    fixture.checkEmpty();
    assert.equal(ChatModel.instance.read({ channel: "world" })?.unreadCount, 0);
    shown(older, start, next, tail);
}

/** 断线重试原发言，只有历史回包可前进游标，保留其间发布的并发消息。 */
async function retrySend(fixture: Fixture): Promise<void> {
    const previous = ChatModel.instance.read({ channel: "world" })!.latestId;
    const sending = fixture.controller.send(" 测试发送 ");
    const first = fixture.next(Protocol.CHAT_SEND);
    const request = first.body as { requestId: string; text: string };
    assert.equal(request.text, "测试发送");
    first.reject(new SocketFailure("DISCONNECTED"));
    assert.equal(await sending, false);
    const retry = fixture.controller.send("测试发送");
    fixture.next(Protocol.CHAT_SEND, request).reply({
        requestId: request.requestId,
        message: message("9007199254741004"),
    });
    assert.equal(await retry, true);
    assert.equal(ChatModel.instance.read({ channel: "world" })?.latestId, previous);
    fixture.next(Protocol.CHAT_HISTORY, { afterId: previous }).reply(history(["9007199254741003", "9007199254741004"]));
    await Promise.resolve();
    await fixture.overview();
    assert.equal(ChatModel.instance.read({ channel: "world" })?.messages.length, 6);
}

/** 拉黑变更以及换号后，迟到的旧可见记录无法覆盖当前窗口。 */
async function ignoresStaleHistory(fixture: Fixture): Promise<void> {
    fixture.controller.refresh();
    const previous = fixture.next(Protocol.CHAT_HISTORY, { afterId: "9007199254741004" });
    fixture.controller.refreshVisibility();
    previous.reply(history(["9007199254741005"], { unreadCount: 1 }));
    await Promise.resolve();
    assert.equal(ChatModel.instance.read({ channel: "world" }), null);
    const visibility = fixture.next(Protocol.CHAT_HISTORY, {});
    fixture.controller.resetSession();
    fixture.controller.refresh();
    const current = fixture.next(Protocol.CHAT_HISTORY, {});
    visibility.reply(history(["9007199254741006"], { unreadCount: 1 }));
    assert.equal(ChatModel.instance.read({ channel: "world" }), null);
    current.reply(history(["9007199254741020"]));
    await Promise.resolve();
    await fixture.overview();
    shown("9007199254741020");
}

/** 快速切换好友后到达的消息只能进入原会话，读取游标只作用于当前私聊。 */
async function privateScopes(fixture: Fixture): Promise<void> {
    const firstPeer = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const secondPeer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const firstScope = { channel: "private", peerRoleId: firstPeer } as const;
    const secondScope = { channel: "private", peerRoleId: secondPeer } as const;
    const firstFields = { channel: CHAT_CHANNEL_IDS.private, peerRoleId: firstPeer };
    const secondFields = { channel: CHAT_CHANNEL_IDS.private, peerRoleId: secondPeer };
    fixture.controller.setScope(firstScope);
    fixture.controller.setVisible(true);
    const first = fixture.next(Protocol.CHAT_HISTORY, firstFields);
    fixture.controller.setScope(secondScope);
    first.reply(history(["101"], { ...firstFields, scopeId: firstPeer, unreadCount: 1 }));
    await Promise.resolve();
    const second = fixture.next(Protocol.CHAT_HISTORY, secondFields);
    second.reply(history(["102"], { ...secondFields, scopeId: secondPeer, unreadCount: 1 }));
    await Promise.resolve();
    await fixture.overview({
        channels: Object.values(CHAT_CHANNEL_IDS).map(channel => ({
            channel, available: true, unreadCount: channel === CHAT_CHANNEL_IDS.private ? 2 : 0,
        })),
        conversations: [{ ...message("102"), latestMessageId: "102", roleId: secondPeer, unreadCount: 1 },
            { ...message("101"), latestMessageId: "101", roleId: firstPeer, unreadCount: 1 }],
    });
    assert.deepEqual(ChatModel.instance.read(firstScope)?.messages.map(row => row.id), ["101"]);
    assert.deepEqual(ChatModel.instance.read(secondScope)?.messages.map(row => row.id), ["102"]);
    fixture.controller.markRead("101");
    fixture.checkEmpty();
    fixture.controller.markRead("102");
    fixture.next(Protocol.CHAT_READ, { ...secondFields, throughId: "102" }).reply(history([], {
        ...secondFields, scopeId: secondPeer, latestId: "102", readThroughId: "102", unreadCount: 0,
    }));
    await Promise.resolve();
    assert.deepEqual(ChatModel.instance.conversations.map(row => row.unreadCount), [0, 1]);
    assert.equal(ChatModel.instance.unread("private"), 1);
    assert.equal(ChatModel.instance.unread(), 1);
}

/** 服务端公会范围变更时重新加载最新页，旧公会消息不能拼接到新公会。 */
async function guildScopeReplacement(fixture: Fixture): Promise<void> {
    const scope = { channel: "guild" } as const;
    const fields = { channel: CHAT_CHANNEL_IDS.guild };
    fixture.controller.setScope(scope);
    fixture.next(Protocol.CHAT_HISTORY, fields).reply(history(["110"], { ...fields, scopeId: "guild-a" }));
    await Promise.resolve();
    fixture.changed();
    fixture.next(Protocol.CHAT_HISTORY, { ...fields, afterId: "110" }).reply(history(["112"], {
        ...fields, scopeId: "guild-b",
    }));
    await Promise.resolve();
    assert.equal(ChatModel.instance.read(scope), null);
    fixture.next(Protocol.CHAT_HISTORY, fields).reply(history(["111", "112"], { ...fields, scopeId: "guild-b" }));
    await Promise.resolve();
    await fixture.overview();
    assert.deepEqual(ChatModel.instance.read(scope)?.messages.map(row => row.id), ["111", "112"]);
    fixture.checkEmpty();
}

/** 运行客户端场景并释放模块，全程使用测试通道。 */
async function check(): Promise<void> {
    const fixture = new Fixture();
    try {
        await syncAndRead(fixture);
        await retrySend(fixture);
        await ignoresStaleHistory(fixture);
        await privateScopes(fixture);
        await guildScopeReplacement(fixture);
        console.log("PASS 聊天补页、已读、断线重发、迟到记录、私聊隔离和公会范围变更");
    } finally {
        fixture.controller.dispose();
    }
}

void check().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
