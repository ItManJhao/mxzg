/**
 * 主城六频道聊天窗口。根据 ChatModel 展示当前会话，发言、历史和已读交给 ChatController。
 * Prefab 保存页签、输入栏、表情和三个裁切列表，窗口只保留草稿及好友侧栏的展示选择。
 */
import { _decorator, Button, Label, Node, RichText, ScrollView, SpriteAtlas, SpriteFrame, sys, UITransform, Vec2 } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { RedDotBinding } from "../../../framework/ui/RedDotBinding";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { AccountModel } from "../../account/AccountModel";
import { TextInputView } from "../../common/ui/TextInputView";
import type { FriendEntry } from "../../friend/data/FriendData";
import { FriendView } from "../../friend/ui/FriendView";
import { ChatController } from "../ChatController";
import { ChatModel } from "../ChatModel";
import type { ChatChannel, ChatMessage, ChatNoticeDestination, ChatScope } from "../data/ChatData";
import { ChatFriendCell, type ChatFriendItem } from "./ChatFriendCell";
import { ChatNoticeLink } from "./ChatNoticeLink";
import { ChatWorldCell, type ChatMessageLine } from "./ChatWorldCell";

/** 导航提供当前角色及可选的好友会话或公会入口。 */
export interface ChatWorldViewArgs {
    readonly account: AccountModel;
    readonly initialScope?: ChatScope;
    readonly initialPeer?: FriendEntry;
    readonly onJoinGuild?: () => void;
    readonly onDestination?: (destination: ChatNoticeDestination) => void;
}

const { ccclass, property } = _decorator;
/** 页签布局与正式服一致，阅读顺序从左到右。 */
const CHANNELS: readonly ChatChannel[] = ["global", "cross", "world", "guild", "private", "system"];
/** 需要独立入场等级的原策划入口键。 */
const CHANNEL_GATES: Partial<Record<ChatChannel, string>> = { cross: "main_chat_cross_share", global: "main_chat_city" };
/** 各列表正文的最长行宽，单位为设计像素。 */
const BODY_WIDTH = { public: 386, private: 276, system: 424 };
/** 视口离边缘至多此距离时，视为已到达该边缘。 */
const EDGE_DISTANCE = 24;
/** 一组旧表情图。 */
const EMOJI_COUNT = 24;
/** 全服开关为本机界面偏好，首次打开默认关闭。 */
const GLOBAL_PREFERENCE = "mxzg.remake.chat.global.enabled";
/** 仅原公告配置中已接入的游戏内跳转可以生成链接。 */
const NOTICE_DESTINATIONS: Readonly<Partial<Record<number, ChatNoticeDestination>>> = { 1: "clan", 171: "battle", 172: "tower" };

@UIRegistry.view({
    id: "chat-world",
    prefab: "bundles/module/chat/prefabs/ChatWorldView",
    layer: UILayer.Popup,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("ChatWorldView")
export class ChatWorldView extends BaseView<ChatWorldViewArgs> {
    /** 聊天主体和页签的等比缩放容器。 */
    @property(UITransform) private panel: UITransform | null = null;
    /** 公开、好友、系统的虚拟消息列表。 */
    @property(SuperScroll) private rows: SuperScroll | null = null;
    @property(SuperScroll) private privateRows: SuperScroll | null = null;
    @property(SuperScroll) private systemRows: SuperScroll | null = null;
    /** 好友频道左侧当前会话和添加入口的虚拟列表。 */
    @property(SuperScroll) private friendRows: SuperScroll | null = null;
    /** 对应公开、好友、系统三个独立的静态内容区。 */
    @property([Node]) private messageAreas: Node[] = [];
    /** 点击后打开通用文本编辑弹窗。 */
    @property(Button) private inputButton: Button | null = null;
    /** 只读草稿预览，由编辑弹窗或表情选择刷新。 */
    @property(Label) private draftText: Label | null = null;
    /** 空草稿保留的原输入说明。 */
    @property(Node) private placeholder: Node | null = null;
    /** 底部统一输入区，系统和未选择好友时隐藏。 */
    @property(Node) private composer: Node | null = null;
    /** 提交当前草稿，发送期间禁用。 */
    @property(Button) private sendButton: Button | null = null;
    /** 当前页签显示时才可展开的表情开关。 */
    @property(Button) private emojiToggle: Button | null = null;
    /** 位于消息区下部的原表情盘。 */
    @property(Node) private emojiPanel: Node | null = null;
    /** 24 个预制表情选项，旧文本码依次为 #1# 到 #24#。 */
    @property([Button]) private emojiButtons: Button[] = [];
    /** 与表情按钮同序的 SpriteFrame，供 RichText 使用。 */
    @property([SpriteFrame]) private emojiFrames: SpriteFrame[] = [];
    /** 六个频道按钮，顺序固定为全服、跨服、世界、公会、好友、系统。 */
    @property([Button]) private tabButtons: Button[] = [];
    /** 与频道按钮同序的浅色高亮。 */
    @property([Node]) private tabHighlights: Node[] = [];
    /** 非活动频道的未读锚点，与频道按钮同序。 */
    @property([Node]) private unreadAnchors: Node[] = [];
    /** 全服频道显示的本地收听开关。 */
    @property(Button) private globalToggle: Button | null = null;
    /** 开关图标高亮层，关闭状态使用已经绑定的旧底图。 */
    @property(Node) private globalEnabledFrame: Node | null = null;
    /** 全服关闭状态显示的短说明。 */
    @property(Node) private globalStatus: Node | null = null;
    /** 记录顶部的历史入口，列表过短时也能手动请求。 */
    @property(Button) private olderButton: Button | null = null;
    /** 列表离开尾部时回到最新一条。 */
    @property(Button) private latestButton: Button | null = null;
    /** 回到最新入口显示当前会话未读数。 */
    @property(Label) private latestText: Label | null = null;
    /** 频道状态行，显示读取进度和发言资格。 */
    @property(Label) private statusText: Label | null = null;
    /** 公会资格提示旁的跳转入口。 */
    @property(Button) private joinGuildButton: Button | null = null;
    /** 同字体的透明排版器，只在收到新消息时量度实际富文本大小。 */
    @property(RichText) private measureText: RichText | null = null;

    /** 窗口已打开时为 true，用于防止关闭后的回执写入草稿。 */
    private opened = false;
    /** 当前显示的页签，首次打开全服。 */
    private channel: ChatChannel = "global";
    /** 本机是否收听全服频道，切换时写入本地偏好。 */
    private globalEnabled = false;
    /** 选中的私聊对象 ID，未开启会话时为 undefined。 */
    private selectedPeer?: string;
    /** 权威列表尚无记录的本窗会话，按对方角色标识保存。 */
    private readonly manualPeers = new Map<string, ChatFriendItem>();
    /** 本窗收起的对话及收起时最新消息编号，新消息可恢复显示。 */
    private readonly dismissed = new Map<string, string>();
    /** 预制侧栏的展示摘要，避免未改变而重复刷新格子。 */
    private friendSignature = "";
    /** 依据频道与私聊对象隔离草稿，关闭窗口后清空。 */
    private readonly drafts = new Map<string, string>();
    /** 当前列表所渲染的会话键，切换时重建行高和滚动位置。 */
    private renderedKey = "";
    /** 当前列表可见数据，前插历史时用原首条位置维持视口。 */
    private rendered: readonly ChatMessageLine[] = [];
    /** 由窗口持有的表情图集，关窗时释放。 */
    private emojiAtlas: SpriteAtlas | null = null;
    /** 所有页签的未读绑定，关闭时撤销。 */
    private dots: RedDotBinding[] = [];
    /** 本轮窗口的原策划发言最低等级，首次打开时从配置读取。 */
    private sendLevel = 0;
    /** 单行编辑允许的 UTF‑16 单元数，打开窗口时读取原策划长度。 */
    private draftLimit = 0;

    /** 校验布局，回到默认频道或导航指定的私聊对象。 */
    public onOpen(args: ChatWorldViewArgs): void {
        super.onOpen(args);
        if (!args.account || !this.panel || !this.rows || !this.privateRows || !this.systemRows || !this.friendRows
            || !this.inputButton || !this.draftText || !this.placeholder || !this.composer || !this.sendButton || !this.emojiToggle
            || !this.emojiPanel || !this.globalToggle || !this.globalEnabledFrame || !this.globalStatus || !this.olderButton
            || !this.latestButton || !this.latestText || !this.statusText || !this.joinGuildButton || !this.measureText
            || this.messageAreas.length !== 3 || this.tabButtons.length !== CHANNELS.length
            || this.tabHighlights.length !== CHANNELS.length || this.unreadAnchors.length !== CHANNELS.length
            || this.emojiButtons.length !== EMOJI_COUNT || this.emojiFrames.length !== EMOJI_COUNT) {
            throw new Error("ChatWorldView.prefab 缺少频道控件绑定");
        }
        this.readComposerRules();
        this.opened = true;
        this.globalEnabled = this.readGlobalPreference();
        for (const rows of this.lists()) {
            rows.validateBindings();
        }
        this.emojiAtlas = new SpriteAtlas();
        this.emojiFrames.forEach((frame, index) => {
            this.emojiAtlas!.spriteFrames[`emoji${index + 1}`] = frame;
        });
        this.measureText.imageAtlas = this.emojiAtlas;
        this.dots = this.unreadAnchors.map(anchor => RedDotBinding.atAnchor(anchor));
        this.bindControls();
        if (args.initialPeer) {
            this.rememberPeer(args.initialPeer);
        }
        this.channel = args.initialScope?.channel ?? "global";
        this.selectedPeer = args.initialScope?.peerRoleId ?? args.initialPeer?.roleId;
        this.syncChannel();
        ChatController.instance.setVisible(true);
    }

    /** 发言门槛与输入长度从共用系统表读取，缺失的策划规则在开窗边界报错。 */
    private readComposerRules(): void {
        const system = GameConfig.instance.getFileByPath("config/system") as {
            readonly rows: readonly { readonly key: string; readonly value: unknown }[];
        };
        const level = system.rows.find(row => row.key === "chat_unlock_main_level")?.value;
        const limit = system.rows.find(row => row.key === "chat_num")?.value;
        if (typeof level !== "number" || typeof limit !== "number" || !Number.isInteger(level) || !Number.isInteger(limit)
            || level <= 0 || limit <= 0) {
            throw new Error("聊天发言配置不完整");
        }
        this.sendLevel = level;
        this.draftLimit = limit;
    }

    /** 关窗释放格子、图集、监听与草稿，模块继续接收在线更新。 */
    public onClose(): void {
        this.opened = false;
        ChatController.instance.setVisible(false);
        ChatController.instance.setScope(null);
        for (const dot of this.dots.splice(0)) {
            dot.dispose();
        }
        for (const rows of this.lists()) {
            if (rows.content?.isValid) {
                rows.list.clear();
            }
        }
        this.drafts.clear();
        this.manualPeers.clear();
        this.dismissed.clear();
        this.rendered = [];
        this.renderedKey = "";
        this.friendSignature = "";
        if (this.measureText) {
            this.measureText.imageAtlas = null;
        }
        this.emojiAtlas?.destroy();
        this.emojiAtlas = null;
    }

    /** 所有预制虚拟列表，各自保留适合本页的裁切尺寸。 */
    private lists(): SuperScroll[] {
        return [this.rows, this.privateRows, this.systemRows, this.friendRows].filter(rows => rows !== null);
    }

    /** 登记本窗的页签、列表和输入监听。 */
    private bindControls(): void {
        this.bindClick(this.inputButton!, this.openInput);
        this.bindClick(this.sendButton!, this.submit);
        this.bindClick(this.olderButton!, () => ChatController.instance.loadOlder());
        this.bindClick(this.latestButton!, this.toLatest);
        this.bindClick(this.emojiToggle!, this.toggleEmoji);
        this.bindClick(this.globalToggle!, this.toggleGlobal);
        this.bindClick(this.joinGuildButton!, this.openGuild);
        this.tabButtons.forEach((button, index) => this.bindClick(button, () => this.selectChannel(CHANNELS[index])));
        this.emojiButtons.forEach((button, index) => this.bindClick(button, () => this.insertEmoji(index)));
        for (const rows of [this.rows!, this.privateRows!, this.systemRows!]) {
            rows.list.node.on(SuperContent.RENDER_ITEM, this.renderCell, this);
            rows.list.node.on(ChatNoticeLink.OPEN, this.followNotice, this);
            rows.node.on(ScrollView.EventType.SCROLL_ENDED, () => this.onScrollEnd(rows), this);
        }
        const friends = this.friendRows!.list.node;
        friends.on(SuperContent.RENDER_ITEM, this.renderFriend, this);
        friends.on(SuperContent.SELECT_ITEM, this.selectFriend, this);
        friends.on(ChatFriendCell.DISMISS, this.dismissFriend, this);
        this.ownListener(() => {
            for (const rows of this.lists()) {
                if (rows.node.isValid) {
                    rows.node.targetOff(this);
                }
                if (rows.content?.isValid) {
                    rows.content.targetOff(this);
                }
            }
        });
        this.ownListener(EventDispatcher.instance.on("chat.updated", this, this.render));
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, this.fitPanel));
    }

    /** 保持主体和顶部页签在窄视口内，设计坐标保留在预制体。 */
    private fitPanel = (): void => {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.97 / panel.width, box.height * 0.9 / (panel.height + 90));
        panel.node.setScale(scale, scale, 1);
    };

    /** 注册与本次显示期一起清理的预制按钮监听。 */
    private bindClick(button: Button, listener: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, listener);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, listener);
            }
        });
    }

    /** 选择正式服页签。等级不足时保持当前页并反馈开放条件。 */
    private selectChannel(channel: ChatChannel): void {
        const atom = CHANNEL_GATES[channel];
        const level = atom ? GameConfig.instance.getConfig(GConfig.OpenCondition, atom)?.level : undefined;
        if (level && this.roleLevel() < level) {
            UIManager.instance.toast(`角色达到${level}级后开放该频道`);
            return;
        }
        if (this.channel !== channel) {
            this.currentRows().list.clear();
            this.channel = channel;
            this.syncChannel();
        }
    }

    /** 按新页签切换布局、计算可见会话并通知控制器读取。 */
    private syncChannel(): void {
        this.hideEmoji();
        if (this.channel === "private" && !this.selectedPeer) {
            this.selectedPeer = this.visiblePeers()[0]?.roleId;
        }
        this.messageAreas.forEach((area, index) => {
            area.active = index === (this.channel === "private" ? 1 : this.channel === "system" ? 2 : 0);
        });
        ChatController.instance.setScope(this.activeScope());
        this.render();
    }

    /** 取得当前选中的可读范围。收听关闭或无私聊对象时没有可拉取范围。 */
    private activeScope(): ChatScope | null {
        if (this.channel === "global" && !this.globalEnabled) {
            return null;
        }
        if (this.channel === "private") {
            return this.selectedPeer ? { channel: "private", peerRoleId: this.selectedPeer } : null;
        }
        return { channel: this.channel };
    }

    /** 根据页签选择对应的静态列表尺寸。 */
    private currentRows(): SuperScroll {
        switch (this.channel) {
            case "private": return this.privateRows!;
            case "system": return this.systemRows!;
            default: return this.rows!;
        }
    }

    /** 键包含频道和私聊角色，确保草稿及回执不会跨会话。 */
    private scopeKey(): string {
        return `${this.channel}:${this.channel === "private" ? this.selectedPeer ?? "" : ""}`;
    }

    /** 当前角色等级来自统一账号快照。 */
    private roleLevel(): number {
        return this.args?.account.snapshot.role?.level ?? 0;
    }

    /** 消息仅来自当前频道快照。前插历史优先保位，贴底用户继续跟随最新消息。 */
    private render = (): void => {
        if (!this.opened) {
            return;
        }
        if (this.channel === "private") {
            const firstPeer = this.selectedPeer ? undefined : this.visiblePeers()[0]?.roleId;
            if (firstPeer) {
                this.selectedPeer = firstPeer;
                ChatController.instance.setScope(this.activeScope());
            }
            this.renderFriends();
        }
        const scope = this.activeScope();
        const messages = scope ? ChatModel.instance.read(scope)?.messages ?? [] : [];
        const key = this.scopeKey();
        const previous = this.rendered;
        const sameScope = this.renderedKey === key;
        if (!sameScope || messages.length !== previous.length
            || messages.some((message, index) => message.id !== previous[index].message.id)) {
            this.renderMessages(messages, key, sameScope ? previous : []);
        }
        this.refreshControls();
    };

    /** 递交实际行高给列表，保留原首条的位置或对齐到当前会话末尾。 */
    private renderMessages(messages: readonly ChatMessage[], key: string, previous: readonly ChatMessageLine[]): void {
        const rows = this.currentRows();
        const position = rows.readPosition();
        const followLatest = previous.length === 0 || this.nearEnd();
        const head = previous[0]?.message.id;
        const offsetBefore = head ? rows.list.centeredOffset(0).y : 0;
        const reuse = new Map(previous.map(line => [line.message.id, line]));
        this.rendered = messages.map(message => reuse.get(message.id) ?? this.measureMessage(message));
        this.renderedKey = key;
        rows.list.setData(this.rendered, undefined, this.rendered.map(line => line.height));
        const oldHead = head ? messages.findIndex(message => message.id === head) : -1;
        if (oldHead > 0) {
            const newTop = rows.list.centeredOffset(oldHead).y;
            rows.restorePosition(new Vec2(position.x, position.y + newTop - offsetBefore));
        } else if (followLatest) {
            this.toLatest();
        }
    }

    /** 用透明的同字体 RichText 测实际宽高，短消息气泡贴合文字，长消息安全换行。 */
    private measureMessage(message: ChatMessage): ChatMessageLine {
        const measure = this.measureText!;
        const bounds = measure.getComponent(UITransform)!;
        const text = this.formatMessage(message);
        const notice = this.channel === "system";
        const maxWidth = notice ? BODY_WIDTH.system : this.channel === "private" ? BODY_WIDTH.private : BODY_WIDTH.public;
        measure.maxWidth = 0;
        measure.string = text;
        const width = Math.max(1, Math.min(maxWidth, Math.ceil(bounds.width) + 1));
        measure.maxWidth = width;
        const height = notice ? Math.max(49, Math.ceil(bounds.height) + 20) : Math.max(81, Math.ceil(bounds.height) + 54);
        return { message, text, width, height, notice,
            own: this.args?.account.snapshot.role?.id === message.roleId };
    }

    /** 只为服务端系统公告拼接受控链接，玩家正文始终当普通文字转义。 */
    private formatMessage(message: ChatMessage): string {
        const text = ChatWorldCell.messageText(message.text);
        const id = message.noticeId ?? 0;
        if (message.roleId || !NOTICE_DESTINATIONS[id] || !this.args?.onDestination) {
            return text;
        }
        return `${text} <color=#489318><on click="openNotice" param="${id}">立即前往</on></color>`;
    }

    /** 链接只在仍显示该公告且目标已注册时生效。 */
    private followNotice(id: number): void {
        const destination = NOTICE_DESTINATIONS[id];
        const go = this.args?.onDestination;
        if (this.opened && destination && go && this.rendered.some(({ message }) => !message.roleId && message.noticeId === id)) {
            this.close();
            go(destination);
        }
    }

    /** 由复用格子绘制当前条目的角色、正文和表情。 */
    private renderCell(node: Node, line: ChatMessageLine): void {
        node.getComponent(ChatWorldCell)!.paint(line, this.emojiAtlas!);
    }

    /** 绑定好友会话格，空项作为打开好友列表的加号。 */
    private renderFriend(node: Node, peer: ChatFriendItem | null): void {
        const selected = peer ? peer.roleId === this.selectedPeer : !this.selectedPeer;
        node.getComponent(ChatFriendCell)!.paint(peer, selected);
    }

    /** 合并真实会话与本次窗口刚选择的好友，隐藏已收起且暂无新消息的记录。 */
    private visiblePeers(): readonly ChatFriendItem[] {
        const saved = ChatModel.instance.conversations;
        const seen = new Set(saved.map(peer => peer.roleId));
        return [...saved.filter(peer => this.dismissed.get(peer.roleId) !== peer.latestId),
            ...[...this.manualPeers.values()].filter(peer => !seen.has(peer.roleId))];
    }

    /** 只有角色资料、未读或选中状态变化时刷新侧栏。 */
    private renderFriends(): void {
        const peers = this.visiblePeers();
        const signature = JSON.stringify([this.selectedPeer, peers]);
        if (signature !== this.friendSignature) {
            this.friendSignature = signature;
            this.friendRows!.list.setData([...peers, null]);
        }
    }

    /** 点击当前会话切换私聊；加号打开原好友四页签窗口。 */
    private selectFriend(peer: ChatFriendItem | null): void {
        if (peer) {
            this.selectedPeer = peer.roleId;
            this.syncChannel();
            return;
        }
        void UIManager.instance.openChild(this, FriendView, { onOpenChat: entry => {
            if (this.opened) {
                this.rememberPeer(entry);
                this.selectedPeer = entry.roleId;
                this.syncChannel();
            }
        } }).catch(error => this.showOpenFailure(error, "好友窗口打开失败"));
    }

    /** 基于好友公开快照登记新打开的会话，真实历史仍由服务端确认。 */
    private rememberPeer(peer: FriendEntry): void {
        this.dismissed.delete(peer.roleId);
        this.manualPeers.set(peer.roleId, { roleId: peer.roleId, name: peer.name, level: peer.level,
            avatarId: peer.headId, borderId: peer.borderId, unreadCount: 0 });
    }

    /** 仅将选中的私聊收出侧栏，已有消息保留供以后再次打开。 */
    private dismissFriend(roleId: string): void {
        const peer = ChatModel.instance.conversations.find(row => row.roleId === roleId);
        if (peer) {
            this.dismissed.set(roleId, peer.latestId);
        }
        this.manualPeers.delete(roleId);
        if (this.selectedPeer === roleId) {
            this.selectedPeer = this.visiblePeers()[0]?.roleId;
            this.syncChannel();
        }
    }

    /** 停在消息顶部可继续翻页，停在尾部确认实际展示过的最后一条。 */
    private onScrollEnd(rows: SuperScroll): void {
        if (!this.opened || rows !== this.currentRows()) {
            return;
        }
        if (rows.readPosition().y < EDGE_DISTANCE && rows.getMaxScrollOffset().y > EDGE_DISTANCE) {
            ChatController.instance.loadOlder();
        }
        if (this.nearEnd()) {
            this.readLatest();
        }
        this.refreshControls();
    }

    /** 回到当前会话最新消息，并提交可见游标。 */
    private toLatest = (): void => {
        const rows = this.currentRows();
        rows.restorePosition(new Vec2(0, rows.getMaxScrollOffset().y));
        this.readLatest();
        this.refreshControls();
    };

    /** 判断当前会话是否已滚到末尾。 */
    private nearEnd(): boolean {
        const rows = this.currentRows();
        return rows.getMaxScrollOffset().y - rows.readPosition().y < EDGE_DISTANCE;
    }

    /** 只确认已渲染的最后一项，后台水位不用于已读。 */
    private readLatest(): void {
        const last = this.rendered[this.rendered.length - 1];
        if (last) {
            ChatController.instance.markRead(last.message.id);
        }
    }

    /** 按当前页签显示输入资格、未读、全服开关与历史按钮。 */
    private refreshControls = (): void => {
        const scope = this.activeScope();
        const model = ChatModel.instance;
        const state = scope ? model.read(scope) : null;
        const controller = ChatController.instance;
        const global = this.channel === "global";
        const privateEmpty = this.channel === "private" && !this.selectedPeer;
        const guildClosed = this.channel === "guild" && model.available("guild") === false;
        this.tabHighlights.forEach((node, index) => { node.active = this.channel === CHANNELS[index]; });
        this.dots.forEach((dot, index) => dot.setVisible((index !== 0 || this.globalEnabled) && model.unread(CHANNELS[index]) > 0));
        this.globalToggle!.node.active = global;
        this.globalEnabledFrame!.active = this.globalEnabled;
        this.globalStatus!.active = global && !this.globalEnabled;
        this.composer!.active = this.channel !== "system" && !privateEmpty && !guildClosed;
        this.joinGuildButton!.node.active = guildClosed && !!this.args?.onJoinGuild;
        this.statusText!.string = this.statusLine(!!state, guildClosed, controller.loadingOlder);
        const draft = this.drafts.get(this.scopeKey()) ?? "";
        this.draftText!.string = draft;
        this.placeholder!.active = draft.length === 0;
        this.sendButton!.interactable = draft.trim().length > 0 && !controller.busy;
        const atTop = this.currentRows().readPosition().y < EDGE_DISTANCE;
        this.olderButton!.node.active = !!state?.hasMore && atTop && !controller.loadingOlder;
        this.latestButton!.node.active = !this.nearEnd();
        this.latestText!.string = state?.unreadCount ? `${state.unreadCount} 条未读` : "回到最新";
    };

    /** 为只读、未开放或正在读取的频道给出预制说明，正常历史只显示消息。 */
    private statusLine(loaded: boolean, guildClosed: boolean, loadingOlder: boolean): string {
        if (this.channel === "system") {
            return "系统频道仅展示公告";
        }
        if (guildClosed) {
            return "加入公会后可使用公会频道";
        }
        if (!this.activeScope()) {
            return "";
        }
        if (ChatModel.instance.available(this.channel) === false) {
            return "当前频道未开放";
        }
        if (loadingOlder) {
            return "加载较早消息…";
        }
        return loaded ? "" : "加载聊天记录…";
    }

    /** 通过原弹窗编辑文本。确定只写当前会话草稿，发送由底部按钮处理。 */
    private openInput = (): void => {
        this.hideEmoji();
        const key = this.scopeKey();
        void UIManager.instance.openChild(this, TextInputView, { initialValue: this.drafts.get(key) ?? "",
            maxLength: this.draftLimit, onConfirm: value => {
                if (this.opened && this.scopeKey() === key) {
                    this.drafts.set(key, value);
                    this.refreshControls();
                }
            } }).catch(error => this.showOpenFailure(error, "输入窗口打开失败"));
    };

    /** 已由框架报告或关窗取消的开窗不再重复提示。 */
    private showOpenFailure(error: unknown, feedback: string): void {
        if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
            UIManager.instance.toast(feedback);
        }
    }

    /** 向本窗草稿追加旧编号表情，关闭表情盘等待手动发送。 */
    private insertEmoji(index: number): void {
        const key = this.scopeKey();
        const next = (this.drafts.get(key) ?? "") + `#${index + 1}#`;
        if (next.length <= this.draftLimit) {
            this.drafts.set(key, next);
            this.refreshControls();
        }
        this.hideEmoji();
    }

    /** 切换当前的原表情盘。 */
    private toggleEmoji = (): void => {
        this.emojiPanel!.active = !this.emojiPanel!.active;
    };

    /** 选中表情、进入编辑或切换频道时收起表情盘。 */
    private hideEmoji(): void {
        this.emojiPanel!.active = false;
    }

    /** 读取本机收听偏好，存储不可用时仍可以用当前窗口操作开关。 */
    private readGlobalPreference(): boolean {
        try {
            return sys.localStorage.getItem(GLOBAL_PREFERENCE) === "1";
        } catch {
            return false;
        }
    }

    /** 切换全服本地收听，关闭时停止读取和已读，打开后按既有游标补齐。 */
    private toggleGlobal = (): void => {
        this.globalEnabled = !this.globalEnabled;
        try {
            sys.localStorage.setItem(GLOBAL_PREFERENCE, this.globalEnabled ? "1" : "0");
        } catch {
            // 隐私模式限制存储时，本窗的收听开关仍生效。
        }
        this.syncChannel();
        UIManager.instance.toast(this.globalEnabled ? "已开启全服频道" : "已关闭全服频道");
    };

    /** 通过应用传入的公会入口导航，当前聊天先关闭。 */
    private openGuild = (): void => {
        const callback = this.args?.onJoinGuild;
        if (callback) {
            this.close();
            callback();
        }
    };

    /** 真实发送成功时只清理本次会话的原稿，失败保留并提示发言条件。 */
    private submit = (): void => {
        const scope = this.activeScope();
        const key = this.scopeKey();
        const source = this.drafts.get(key) ?? "";
        if (!source.trim()) {
            return;
        }
        if (!scope) {
            UIManager.instance.toast("请先开启全服频道");
            return;
        }
        if (this.roleLevel() < this.sendLevel) {
            UIManager.instance.toast(`角色达到${this.sendLevel}级后可发言`);
            return;
        }
        const state = ChatModel.instance.read(scope);
        if (ChatModel.instance.available(this.channel) === false || state?.canSend === false) {
            UIManager.instance.toast("当前频道暂时无法发言");
            return;
        }
        if (!state) {
            UIManager.instance.toast("正在加载聊天记录");
            return;
        }
        this.hideEmoji();
        void ChatController.instance.send(source).then(accepted => {
            if (!this.opened || !accepted) {
                return;
            }
            if (this.drafts.get(key) === source) {
                this.drafts.delete(key);
            }
            if (this.scopeKey() === key) {
                this.toLatest();
            }
        });
    };
}
