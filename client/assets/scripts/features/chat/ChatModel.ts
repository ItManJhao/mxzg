/**
 * 聊天页签与私聊会话的唯一展示状态。按消息范围合并服务端记录和已读状态，
 * 每个列表最多保留 100 行，同步主城红点与会话摘要，换号时由应用重置。
 */
import { BaseModel } from "../../framework/BaseModel";
import type { ChatChannel, ChatConversation, ChatHistory, ChatMessage, ChatOverview, ChatScope, ChatState } from "./data/ChatData";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "chat.updated": undefined;
    }
}

/** 对应服务端保留的单范围消息窗口大小。 */
const maximumMessages = 100;

export type ChatHistoryMode = "latest" | "newer" | "older" | "read";

export class ChatModel extends BaseModel {
    /** 频道、主城红点与 Controller 共用的实例。 */
    public static readonly instance = new ChatModel();
    /** 键为频道或「私聊:对方 ID」，值为已成功载入的消息窗口；权限变化时失效。 */
    private readonly snapshots = new Map<string, ChatState>();
    /** 按频道组织的权威未读与可用状态，首读成功前为空。 */
    private overview: ChatOverview | null = null;

    /** 返回所选频道或会话的展示窗口；尚未加载时返回 null。 */
    public read(scope: ChatScope): ChatState | null {
        return this.snapshots.get(ChatModel.scopeKey(scope)) ?? null;
    }

    /** 返回最近会话，顺序沿用服务端最近消息顺序。 */
    public get conversations(): readonly ChatConversation[] {
        return this.overview?.conversations ?? [];
    }

    /** 返回服务器给出的页签可用状态；首次摘要回包前返回 null。 */
    public available(channel: ChatChannel): boolean | null {
        return this.overview?.channels.find(row => row.channel === channel)?.available ?? null;
    }

    /** 获取单页签或所有页签的总未读数，供会话入口及主城红点使用。 */
    public unread(channel?: ChatChannel): number {
        if (channel !== undefined) {
            return this.overview?.channels.find(row => row.channel === channel)?.unreadCount
                ?? this.read({ channel })?.unreadCount ?? 0;
        }
        return this.overview?.channels.reduce((total, row) => total + row.unreadCount, 0)
            ?? [...this.snapshots.values()].reduce((total, state) => total + state.unreadCount, 0);
    }

    /** 生成会话在客户端内的键，私聊对象互相隔离。 */
    public static scopeKey(scope: ChatScope): string {
        return scope.channel === "private" ? `private:${scope.peerRoleId ?? ""}` : scope.channel;
    }

    /** 比较已完成协议校验的十进制编号，避免超过 JavaScript 数字精度。 */
    public static compareId(left: string, right: string): number {
        if (left.length !== right.length) {
            return left.length - right.length;
        }
        if (left < right) {
            return -1;
        }
        return left > right ? 1 : 0;
    }

    /**
     * 提交指定范围的一页或已读回包。已读响应只刷新元数据，
     * 增量补读保留当前列表前端的历史翻页资格。
     */
    public apply(scope: ChatScope, mode: ChatHistoryMode, page: ChatHistory): void {
        const previous = this.read(scope);
        const messages = mode === "latest"
            ? page.messages.slice()
            : this.merge(previous?.messages ?? [], page.messages);
        const bounded = messages.slice(Math.max(0, messages.length - maximumMessages));
        const hasMore = mode === "latest" || mode === "older" ? page.hasMore : previous?.hasMore ?? false;
        this.snapshots.set(ChatModel.scopeKey(scope), {
            messages: bounded,
            readThroughId: page.readThroughId,
            latestId: page.latestId,
            unreadCount: page.unreadCount,
            hasMore: bounded.length < maximumMessages && hasMore,
            canSend: page.canSend,
            scopeId: page.scopeId,
        });
        this.updateUnread(scope, page.unreadCount);
        this.incrementVersion();
    }

    /** 提交服务端页签及私聊摘要，并移除失去访问资格的历史窗口。 */
    public applyOverview(overview: ChatOverview): void {
        const currentPeers = new Set(overview.conversations.map(row => row.roleId));
        for (const previous of this.overview?.conversations ?? []) {
            if (!currentPeers.has(previous.roleId)) {
                this.snapshots.delete(ChatModel.scopeKey({ channel: "private", peerRoleId: previous.roleId }));
            }
        }
        this.overview = overview;
        for (const channel of overview.channels) {
            if (!channel.available) {
                this.clearChannel(channel.channel);
            }
        }
        this.incrementVersion();
    }

    /** 删除单个不可继续复用的历史窗口，保留同页签的其他会话。 */
    public invalidateScope(scope: ChatScope): void {
        if (this.snapshots.delete(ChatModel.scopeKey(scope))) {
            this.incrementVersion();
        }
    }

    /** 公会等关系变化后清空该频道窗口和摘要，等待新资格返回。 */
    public invalidateChannel(channel: ChatChannel): void {
        this.clearChannel(channel);
        if (this.overview) {
            this.overview = {
                channels: this.overview.channels.filter(row => row.channel !== channel),
                conversations: channel === "private" ? [] : this.overview.conversations,
            };
        }
        this.incrementVersion();
    }

    /** 清除角色的消息与阅读状态，下一次查询重新取得最新一页。 */
    protected onReset(): void {
        this.snapshots.clear();
        this.overview = null;
    }

    /** 删除一个频道及其会话缓存，摘要保持由调用方更新。 */
    private clearChannel(channel: ChatChannel): void {
        for (const key of this.snapshots.keys()) {
            if (key === channel || key.startsWith(`${channel}:`)) {
                this.snapshots.delete(key);
            }
        }
    }

    /** 历史或已读回包更新同一范围的摘要，已选私聊只改变其对应未读。 */
    private updateUnread(scope: ChatScope, unreadCount: number): void {
        if (!this.overview) {
            return;
        }
        const { channels, conversations } = this.overview;
        if (scope.channel === "private") {
            const peer = conversations.find(row => row.roleId === scope.peerRoleId);
            if (!peer) {
                return;
            }
            const delta = unreadCount - peer.unreadCount;
            this.overview = {
                channels: channels.map(row => row.channel === "private" ? { ...row, unreadCount: row.unreadCount + delta } : row),
                conversations: conversations.map(row => row === peer ? { ...row, unreadCount } : row),
            };
        } else {
            this.overview = {
                channels: channels.map(row => row.channel === scope.channel ? { ...row, unreadCount } : row),
                conversations,
            };
        }
    }

    /** 按服务端消息编号去重，本页的新副本可替换本地已见过的消息。 */
    private merge(previous: readonly ChatMessage[], received: readonly ChatMessage[]): ChatMessage[] {
        const combined = new Map(previous.map(message => [message.id, message]));
        for (const message of received) {
            combined.set(message.id, message);
        }
        return [...combined.values()].sort((left, right) => ChatModel.compareId(left.id, right.id));
    }
}
