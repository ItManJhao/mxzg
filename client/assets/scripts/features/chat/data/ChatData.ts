/**
 * 聊天窗口的数据契约。消息编号和阅读游标使用服务端十进制字符串。
 * Controller 接收历史及操作回包，View 从唯一 Model 读取整理后的消息窗口。
 */

/** 页签所对应的消息范围。私聊再由一个对方角色 ID 定位。 */
export type ChatChannel = "world" | "global" | "cross" | "guild" | "private" | "system";

/** 已有玩法入口中可由服务端具名公告跳转的目标。 */
export type ChatNoticeDestination = "clan" | "battle" | "tower";

/** 沿用旧策划频道编号；省略编号的旧世界请求按 2 解读。 */
export const CHAT_CHANNEL_IDS = { system: 1, world: 2, guild: 3, private: 5, cross: 6, global: 7 } as const;

/** 独立的历史、已读和发送范围；只有私聊需要对方角色 ID。 */
export interface ChatScope {
    readonly channel: ChatChannel;
    readonly peerRoleId?: string;
}

/** 最近会话的对方角色资料与服务端未读计数，不含私聊正文。 */
export interface ChatConversation {
    readonly roleId: string;
    readonly name: string;
    readonly avatarId: number;
    readonly borderId: number;
    readonly level: number;
    readonly unreadCount: number;
    readonly latestId: string;
}

/** 尚未打开的页签也可通过此摘要展示可用状态和未读提醒。 */
export interface ChatChannelSummary {
    readonly channel: ChatChannel;
    readonly available: boolean;
    readonly unreadCount: number;
}

/** 当前角色可见的频道能力和会话摘要。 */
export interface ChatOverview {
    readonly channels: readonly ChatChannelSummary[];
    readonly conversations: readonly ChatConversation[];
}

/** 冻结发送时身份资料的纯文本消息，服务器公告带通知编号；时间以 Unix 秒表示。 */
export interface ChatMessage {
    readonly id: string;
    readonly roleId: string;
    readonly name: string;
    readonly avatarId: number;
    readonly borderId: number;
    readonly level: number;
    readonly text: string;
    readonly sentAtSeconds: number;
    readonly channel?: ChatChannel;
    readonly serverId?: string;
    readonly noticeId?: number;
}

/** 服务端的单页记录及当前角色在频道中的阅读状态。 */
export interface ChatHistory {
    readonly messages: readonly ChatMessage[];
    readonly readThroughId: string;
    readonly latestId: string;
    readonly unreadCount: number;
    readonly hasMore: boolean;
    readonly hasNewer: boolean;
    readonly canSend: boolean;
    readonly scopeId?: string;
}

/** 玩家点击发送的回执；显示顺序仍以历史查询为准。 */
export interface ChatSendResult {
    readonly requestId: string;
    readonly message: ChatMessage;
}

/** 当前角色的展示窗口；hasMore 表示还能向上翻阅更早消息。 */
export type ChatState = Omit<ChatHistory, "hasNewer">;

/** Protobuf 原始消息投影；控制器将频道编号转换为 View 使用的频道名。 */
export type ChatWireMessage = Omit<ChatMessage, "channel"> & { readonly channel?: number };

/** 历史回包明确所属频道、私聊对象及当前有效范围。 */
export type ChatWireHistory = Omit<ChatHistory, "messages"> & {
    readonly messages: readonly ChatWireMessage[];
    readonly channel?: number;
    readonly peerRoleId?: string;
};

/** 发送回包由真实消息确认频道，由额外字段确认私聊对象。 */
export type ChatWireSendResult = Omit<ChatSendResult, "message"> & {
    readonly message: ChatWireMessage;
    readonly peerRoleId?: string;
};

/** 线上摘要保留频道编号和服务端的最新消息字段名。 */
export interface ChatWireOverview {
    readonly channels: readonly (Omit<ChatChannelSummary, "channel"> & { readonly channel: number })[];
    readonly conversations: readonly (Omit<ChatConversation, "latestId"> & { readonly latestMessageId: string })[];
}
