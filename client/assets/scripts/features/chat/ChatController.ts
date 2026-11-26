/**
 * 聊天业务入口。按频道和私聊对象组织分页、发送与已读，公共账号通道负责隔离旧会话。
 * 账号层统一调度重连和权限变更，各窗口及主城红点共用 ChatModel。
 */
import { ErrorUtils } from "../../core/ErrorUtils";
import { GameLog } from "../../core/GameLog";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { ChatModel } from "./ChatModel";
import {
    CHAT_CHANNEL_IDS, type ChatChannel, type ChatScope, type ChatWireHistory,
    type ChatWireMessage, type ChatWireOverview, type ChatWireSendResult,
} from "./data/ChatData";

/** 本服世界仍是主城预读的频道；实际打开页签由 View 选择。 */
const worldScope: ChatScope = { channel: "world" };

/** 当前同步请求；权限变化时标记过期，等待旧请求结束后再提交下一项。 */
type ChatSync = { readonly mode: "overview"; obsolete: boolean }
    | { readonly mode: "latest"; readonly scope: ChatScope; obsolete: boolean }
    | {
        readonly mode: "newer" | "older" | "read";
        readonly scope: ChatScope;
        readonly cursor: string;
        obsolete: boolean;
    };

/** 单个频道的补读意图。权限或有效范围变化后需重新取得最新页。 */
interface ChatRefresh {
    readonly scope: ChatScope;
    readonly replace: boolean;
}

/** 等待服务端确认的发言；同一范围重试时沿用业务编号。 */
interface PendingChatSend {
    readonly scope: ChatScope;
    readonly requestId: string;
    readonly text: string;
}

export class ChatController extends BaseController {
    /** 场景接入的唯一聊天 Controller。 */
    public static readonly instance = new ChatController();
    /** 应用注入的认证操作，销毁时释放。 */
    private operations: AccountOperations | null = null;
    /** 主城就绪后允许请求频道摘要和消息历史。 */
    private ready = false;
    /** 聊天窗打开时允许翻页及发送；关窗仍保留对后台未读的订阅。 */
    private visible = false;
    /** 聊天窗选中的范围；私聊页未选中对象时为空。 */
    private selection: ChatScope | null = worldScope;
    /** 摘要、历史和已读共用的在途操作，避免旧摘要覆盖较新的已读结果。 */
    private activeSync: ChatSync | null = null;
    /** 合并等待中的摘要失效通知，开始请求时清除。 */
    private overviewPending = false;
    /** 每个范围最多保留一次补读，按入队顺序执行。 */
    private readonly refreshes = new Map<string, ChatRefresh>();
    /** 用户可见的向上翻页意图，换页签或关窗时清空。 */
    private olderPending: ChatScope | null = null;
    /** 键为当前范围，保存该范围已经显示的最大待确认游标。 */
    private readonly pendingReads = new Map<string, { scope: ChatScope; cursor: string }>();
    /** 发言在途时禁用重复发送，结束或换号时清除。 */
    private sending: PendingChatSend | null = null;
    /** 键为当前范围，缓存未收到确定回执的发言编号，换号或权限变化时清除。 */
    private readonly retrySends = new Map<string, PendingChatSend>();

    /** 注入当前应用的公共认证通道。 */
    public configure(operations: AccountOperations): void {
        this.operations = operations;
    }

    /** 当前有发言在途，提示 View 忽略连续确认。 */
    public get busy(): boolean {
        return this.sending !== null;
    }

    /** 当前所选范围是否正在向上翻页，避免重复滚动触发。 */
    public get loadingOlder(): boolean {
        return this.olderPending !== null || (this.activeSync?.mode === "older" && this.isSelected(this.activeSync.scope));
    }

    /** 主城可用时预读历史与未读，未就绪期间只记录同步意图。 */
    public setHomeReady(ready: boolean): void {
        if (this.ready !== ready) {
            this.ready = ready;
            if (ready) {
                this.refresh();
            }
        }
    }

    /** 打开窗口时补齐所选范围，关闭时只丢弃尚未发出的翻页意图。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refresh();
        } else {
            this.olderPending = null;
        }
    }

    /** 切换频道或私聊对象；空范围只展示页签界面，不发历史请求。 */
    public setScope(scope: ChatScope | null): void {
        const selection = scope?.channel === "private" && !scope.peerRoleId ? null : scope;
        if (selection ? this.isSelected(selection) : this.selection === null) {
            return;
        }
        if (this.selection) {
            this.refreshes.delete(ChatModel.scopeKey(this.selection));
        }
        this.selection = selection;
        this.olderPending = null;
        if (this.visible && this.selection) {
            this.queueRefresh(this.selection);
            this.pullNext();
        }
        this.emit("chat.updated", undefined);
    }

    /** 主城初始化、重连及提交后通知统一刷新真实摘要，并从可见历史尾部补齐。 */
    public refresh(): void {
        this.overviewPending = true;
        const scope = this.visible ? this.selection : worldScope;
        if (scope) {
            this.queueRefresh(scope);
        }
        this.pullNext();
    }

    /** 黑名单或好友关系变化后清空旧可见窗口，丢弃尚未交付的旧结果。 */
    public refreshVisibility(): void {
        if (this.activeSync) {
            this.activeSync.obsolete = true;
        }
        this.refreshes.clear();
        this.pendingReads.clear();
        this.olderPending = null;
        ChatModel.instance.reset();
        this.emit("chat.updated", undefined);
        this.refresh();
    }

    /** 公会关系变化后立即撤下旧公会历史，其他频道的记录及阅读位置继续保留。 */
    public refreshGuildVisibility(): void {
        const key = "guild";
        if (this.activeSync && (this.activeSync.mode === "overview" || this.activeSync.scope.channel === key)) {
            this.activeSync.obsolete = true;
        }
        this.refreshes.delete(key);
        this.pendingReads.delete(key);
        this.retrySends.delete(key);
        if (this.sending?.scope.channel === key) {
            this.sending = null;
        }
        if (this.olderPending?.channel === key) {
            this.olderPending = null;
        }
        ChatModel.instance.invalidateChannel(key);
        this.emit("chat.updated", undefined);
        this.refresh();
    }

    /** 当前频道的列表到顶且存在较早历史时，排队读取前一页。 */
    public loadOlder(): void {
        const scope = this.selection;
        if (scope && this.visible && !this.loadingOlder && ChatModel.instance.read(scope)?.hasMore) {
            this.olderPending = scope;
            this.pullNext();
        }
    }

    /** 仅确认当前已显示的消息游标；未加载记录和较旧游标无需提交。 */
    public markRead(throughId: string): void {
        const scope = this.selection;
        const state = scope && ChatModel.instance.read(scope);
        if (!scope || !this.visible || !state?.unreadCount
            || ChatModel.compareId(throughId, state.readThroughId) <= 0
            || !state.messages.some(message => message.id === throughId)) {
            return;
        }
        const key = ChatModel.scopeKey(scope);
        const pending = this.pendingReads.get(key)?.cursor;
        const active = this.activeSync;
        const cursor = pending ?? (active?.mode === "read" && ChatModel.scopeKey(active.scope) === key ? active.cursor : undefined);
        if (!cursor || ChatModel.compareId(throughId, cursor) > 0) {
            this.pendingReads.set(key, { scope, cursor: throughId });
            this.pullNext();
        }
    }

    /**
     * 在当前范围发送纯文本，服务器确认后返回 true。
     * 连接异常时保留本次编号，重试同一范围和内容不会重复发布。
     */
    public async send(text: string): Promise<boolean> {
        const scope = this.selection;
        const value = text.trim();
        const state = scope && ChatModel.instance.read(scope);
        if (!this.operations || !this.ready || !this.visible || !scope || !state || this.sending || !value) {
            return false;
        }
        if (!state.canSend) {
            UIManager.instance.toast("当前频道不可发言");
            return false;
        }
        const key = ChatModel.scopeKey(scope);
        const retry = this.retrySends.get(key);
        const pending = retry?.text === value ? retry : { scope, requestId: RequestIdUtils.create(), text: value };
        this.sending = pending;
        this.retrySends.set(key, pending);
        this.emit("chat.updated", undefined);
        let accepted = false;
        try {
            const request = { ...this.wireScope(scope), requestId: pending.requestId, text: pending.text };
            await this.operations.deliver(Protocol.CHAT_SEND, request, frame => {
                if (this.sending !== pending) {
                    return;
                }
                const receipt = frame.body as ChatWireSendResult;
                if (receipt.requestId !== pending.requestId
                    || !this.matchesScope(pending.scope, receipt.message.channel, receipt.peerRoleId)) {
                    throw new Error("聊天回执与本次发言不符");
                }
                ProtocolRouter.instance.dispatch(this, frame);
                accepted = true;
                this.retrySends.delete(key);
            }, error => this.onSendFailed(pending, error));
        } finally {
            if (this.sending === pending) {
                this.sending = null;
                this.emit("chat.updated", undefined);
            }
        }
        return accepted;
    }

    /** 处理已匹配当前认证通道的业务回包及不携带正文的变更通知。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.CHAT_OVERVIEW:
                this.onOverview(payload as ChatWireOverview);
                break;
            case Protocol.CHAT_HISTORY:
            case Protocol.CHAT_READ:
                this.onHistory(payload as ChatWireHistory);
                break;
            case Protocol.CHAT_SEND:
                this.onSent();
                break;
            case Protocol.CHAT_CHANGED:
                this.onChanged();
                break;
        }
    }

    /** 登记真实聊天回包及提交后的状态变更通知。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.CHAT_OVERVIEW, Protocol.CHAT_HISTORY, Protocol.CHAT_READ, Protocol.CHAT_SEND, Protocol.CHAT_CHANGED,
        ]));
    }

    /** 换角色后清除所有频道缓存、草稿回执关联及尚未提交的游标。 */
    protected onResetSession(): void {
        this.activeSync = null;
        this.overviewPending = false;
        this.refreshes.clear();
        this.olderPending = null;
        this.pendingReads.clear();
        this.sending = null;
        this.retrySends.clear();
        this.visible = false;
        this.selection = worldScope;
        ChatModel.instance.reset();
        this.emit("chat.updated", undefined);
    }

    /** 应用销毁后释放公共认证操作，禁止启动下一项同步。 */
    protected onDispose(): void {
        this.ready = false;
        this.operations = null;
    }

    /** 比较当前选中的频道及私聊对象，用于可见操作与错误反馈。 */
    private isSelected(scope: ChatScope): boolean {
        return this.selection !== null && ChatModel.scopeKey(this.selection) === ChatModel.scopeKey(scope);
    }

    /** 频道首次查询期间尚无资格摘要；确认不可用的频道等待下次资格变化。 */
    private queueRefresh(scope: ChatScope, replace = false): void {
        if (ChatModel.instance.available(scope.channel) === false) {
            return;
        }
        const key = ChatModel.scopeKey(scope);
        this.refreshes.set(key, { scope, replace: replace || this.refreshes.get(key)?.replace === true });
    }

    /** 依次处理频道补读、已读、向上翻页和摘要，避免同一范围的投影互相覆盖。 */
    private takeNext(): ChatSync | null {
        for (const [key, { scope, replace }] of this.refreshes) {
            this.refreshes.delete(key);
            const messages = ChatModel.instance.read(scope)?.messages;
            const tail = messages?.[messages.length - 1]?.id;
            return !replace && tail ? { mode: "newer", scope, cursor: tail, obsolete: false }
                : { mode: "latest", scope, obsolete: false };
        }
        for (const [key, { scope, cursor }] of this.pendingReads) {
            this.pendingReads.delete(key);
            const state = ChatModel.instance.read(scope);
            if (state?.unreadCount && ChatModel.compareId(cursor, state.readThroughId) > 0) {
                return { mode: "read", scope, cursor, obsolete: false };
            }
        }
        if (this.olderPending) {
            const scope = this.olderPending;
            this.olderPending = null;
            const state = ChatModel.instance.read(scope);
            const head = state?.messages[0]?.id;
            if (state?.hasMore && head && this.visible && this.isSelected(scope)) {
                return { mode: "older", scope, cursor: head, obsolete: false };
            }
        }
        if (this.overviewPending) {
            this.overviewPending = false;
            return { mode: "overview", obsolete: false };
        }
        return null;
    }

    /** 串行交付当前请求，结束后读取合并好的下一项。 */
    private pullNext(): void {
        if (!this.ready || !this.operations || this.activeSync) {
            return;
        }
        const sync = this.takeNext();
        if (!sync) {
            return;
        }
        this.activeSync = sync;
        if (sync.mode === "older") {
            this.emit("chat.updated", undefined);
        }
        const protocol = sync.mode === "overview" ? Protocol.CHAT_OVERVIEW
            : sync.mode === "read" ? Protocol.CHAT_READ : Protocol.CHAT_HISTORY;
        const finish = (): void => {
            if (this.activeSync === sync) {
                this.activeSync = null;
                if (sync.mode === "older") {
                    this.emit("chat.updated", undefined);
                }
                this.pullNext();
            }
        };
        void this.operations.deliver(protocol, this.syncFields(sync), frame => {
            if (this.activeSync === sync && !sync.obsolete) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => this.onSyncFailed(sync, error)).then(finish, finish);
    }

    /** 本服世界兼容旧请求，其他频道携带真实编号，私聊额外携带对方角色 ID。 */
    private wireScope(scope: ChatScope): { channel?: number; peerRoleId?: string } {
        if (scope.channel === "world") {
            return {};
        }
        return { channel: CHAT_CHANNEL_IDS[scope.channel], ...(scope.peerRoleId ? { peerRoleId: scope.peerRoleId } : {}) };
    }

    /** 根据本次操作加入对应游标；空范围摘要无需请求参数。 */
    private syncFields(sync: ChatSync): object {
        switch (sync.mode) {
            case "newer":
                return { ...this.wireScope(sync.scope), afterId: sync.cursor };
            case "older":
                return { ...this.wireScope(sync.scope), beforeId: sync.cursor };
            case "read":
                return { ...this.wireScope(sync.scope), throughId: sync.cursor };
            case "latest":
                return this.wireScope(sync.scope);
            default:
                return {};
        }
    }

    /** 双重核对业务范围，避免旧频道或另一私聊对象的结果进入当前列表。 */
    private matchesScope(scope: ChatScope, channel: number | undefined, peerRoleId: string | undefined): boolean {
        return CHAT_CHANNEL_IDS[scope.channel] === (channel ?? CHAT_CHANNEL_IDS.world)
            && (scope.peerRoleId ?? "") === (peerRoleId ?? "");
    }

    /** 将已验证的频道编号映射成展示键，服务器未知编号无法进入 Model。 */
    private channelName(id: number): ChatChannel {
        const match = (Object.keys(CHAT_CHANNEL_IDS) as ChatChannel[]).find(name => CHAT_CHANNEL_IDS[name] === id);
        if (!match) {
            throw new Error("聊天频道无效");
        }
        return match;
    }

    /** 转换服务器的频道编号，保留作者身份与原消息正文。 */
    private convertMessage(message: ChatWireMessage) {
        return { ...message, channel: this.channelName(message.channel ?? CHAT_CHANNEL_IDS.world) };
    }

    /** 保存最新摘要，并在有新访问资格时补读当前页签的历史。 */
    private onOverview(payload: ChatWireOverview): void {
        if (this.activeSync?.mode !== "overview" || this.activeSync.obsolete) {
            return;
        }
        const scope = this.selection;
        const wasUnavailable = scope && ChatModel.instance.available(scope.channel) === false;
        ChatModel.instance.applyOverview({
            channels: payload.channels.map(row => ({ ...row, channel: this.channelName(row.channel) })),
            conversations: payload.conversations.map(({ latestMessageId, ...row }) => ({ ...row, latestId: latestMessageId })),
        });
        if (scope && this.visible && wasUnavailable && ChatModel.instance.available(scope.channel)) {
            this.queueRefresh(scope);
        }
        this.emit("chat.updated", undefined);
    }

    /** 合并当前查询，必要时继续补页；服务器范围变化时先清空原窗口。 */
    private onHistory(page: ChatWireHistory): void {
        const sync = this.activeSync;
        if (!sync || sync.mode === "overview" || sync.obsolete) {
            return;
        }
        const scope = sync.scope;
        if (!this.matchesScope(scope, page.channel, page.peerRoleId)) {
            throw new Error("聊天历史与本次查询范围不符");
        }
        const previous = ChatModel.instance.read(scope);
        if (sync.mode !== "latest" && previous && previous.scopeId !== page.scopeId) {
            ChatModel.instance.invalidateScope(scope);
            this.pendingReads.delete(ChatModel.scopeKey(scope));
            this.queueRefresh(scope, true);
            this.emit("chat.updated", undefined);
            return;
        }
        this.checkHistoryCursor(sync, page);
        ChatModel.instance.apply(scope, sync.mode, { ...page, messages: page.messages.map(row => this.convertMessage(row)) });
        if (sync.mode === "newer" && page.hasNewer) {
            this.queueRefresh(scope);
        }
        this.emit("chat.updated", undefined);
    }

    /** 成功发送后从已有历史尾部补齐，不能用回执消息跳过同时发送的其他记录。 */
    private onSent(): void {
        if (this.sending) {
            this.queueRefresh(this.sending.scope);
        }
        this.overviewPending = true;
        this.pullNext();
    }

    /** 只在窗口打开时读取消息，主城后台刷新轻量未读摘要。 */
    private onChanged(): void {
        this.overviewPending = true;
        if (this.visible && this.selection) {
            this.queueRefresh(this.selection);
        }
        this.pullNext();
    }

    /** 校验下一页的方向与可推进性，阻止非法的补页回包继续触发循环查询。 */
    private checkHistoryCursor(sync: Exclude<ChatSync, { mode: "overview" }>, page: ChatWireHistory): void {
        const first = page.messages[0];
        const last = page.messages[page.messages.length - 1];
        if (sync.mode === "newer" && (first ? ChatModel.compareId(first.id, sync.cursor) <= 0 : page.hasNewer)) {
            throw new Error("聊天增量没有前进");
        }
        if (sync.mode === "older" && last && ChatModel.compareId(last.id, sync.cursor) >= 0) {
            throw new Error("聊天历史与本次翻页位置不符");
        }
        if (sync.mode === "read" && first) {
            throw new Error("聊天已读回包不应含历史记录");
        }
    }

    /** 只给前台所选范围显示失败反馈，后台摘要和失效请求不打扰界面。 */
    private onSyncFailed(sync: ChatSync, error: unknown): void {
        if (this.activeSync !== sync || sync.obsolete) {
            return;
        }
        if (this.visible && sync.mode !== "overview" && this.isSelected(sync.scope)) {
            UIManager.instance.toast(ErrorUtils.messageOf(error));
        } else {
            GameLog.shared.classified("MODULE", "warn", "ChatController", ErrorUtils.messageOf(error));
        }
    }

    /** 服务器已明确拒绝时丢弃旧发言编号；只为当前会话展示失败反馈。 */
    private onSendFailed(pending: PendingChatSend, error: unknown): void {
        if (this.sending !== pending) {
            return;
        }
        if (error instanceof SocketFailure && error.code.startsWith("CHAT_")) {
            this.retrySends.delete(ChatModel.scopeKey(pending.scope));
            if (error.code === "CHAT_CHANNEL_UNAVAILABLE") {
                ChatModel.instance.invalidateScope(pending.scope);
                this.refresh();
            }
        }
        if (this.visible && this.isSelected(pending.scope)) {
            UIManager.instance.toast(ErrorUtils.messageOf(error));
        }
    }
}
