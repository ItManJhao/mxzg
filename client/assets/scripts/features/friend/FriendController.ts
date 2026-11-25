/** 好友请求与服务器回包入口。社交快照、搜索结果和到账反馈分别交给既有状态所有者。 */
import { ErrorUtils } from "../../core/ErrorUtils";
import { GameLog } from "../../core/GameLog";
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { ServerClock } from "../../core/ServerClock";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import type { RewardNotice } from "../reward/data/RewardNoticeData";
import { FriendModel } from "./FriendModel";
import type { FriendAction, FriendSearchResult, FriendState } from "./data/FriendData";

/** 成功状态文案仅用于没有统一到账反馈的主动操作。 */
const feedback: Partial<Record<FriendAction, string>> = {
    APPLY: "好友申请已发送", ACCEPT: "已添加好友", REJECT: "已拒绝申请", REMOVE: "已删除好友",
    BLOCK: "已加入黑名单", UNBLOCK: "已解除拉黑", SEND: "已赠送友情点", SEND_ALL: "已赠送友情点",
};

/** 当前玩家的一次操作及可能附带的统一奖励回执。 */
interface FriendChangeResult {
    readonly requestId: string;
    readonly state: FriendState;
    readonly notice?: RewardNotice;
}

export class FriendController extends BaseController {
    /** 场景级唯一好友业务入口。 */
    public static readonly instance = new FriendController();
    /** 当前应用注入的认证操作，销毁后清空。 */
    private operations: AccountOperations | null = null;
    /** 复用统一到账队列，当前角色收到具名奖励时调用。 */
    private restoreReward: ((notice: RewardNotice) => void) | null = null;
    /** 主城就绪后读取快捷入口提示。 */
    private ready = false;
    /** 主窗口可见时允许显示前台读取失败。 */
    private visible = false;
    /** 最近一次刷新尚未完成的请求身份。 */
    private reading: object | null = null;
    /** 多条推送合并成一次补读，完成后清零。 */
    private dirty = false;
    /** 当前显示的搜索查询，null 表示已关窗。 */
    private currentQuery: string | null = null;
    /** 搜索请求的临时引用，换查询、关窗或换号时失效。 */
    private searchRequest: object | null = null;
    /** 当前操作的业务编号，完成、失败或换号时清除。 */
    private pendingChange: string | null = null;
    /** 日界定时刷新，当前会话结束或换快照时清理。 */
    private timer: ReturnType<typeof setTimeout> | null = null;

    /** 注入公共账号通道及发奖回执处理。 */
    public configure(operations: AccountOperations, restoreReward: (notice: RewardNotice) => void): void {
        this.operations = operations;
        this.restoreReward = restoreReward;
    }

    /** 有关系或礼物操作在途时禁用重复动作。 */
    public get busy(): boolean {
        return this.pendingChange !== null;
    }

    /** 仅主城就绪后预读好友和礼物提示。 */
    public setHomeReady(ready: boolean): void {
        this.ready = ready;
        if (ready) {
            this.refresh();
        } else {
            this.clearTimer();
        }
    }

    /** 打开窗口时取得服务端四页签快照。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refresh();
        }
    }

    /** 首读或重连后重新读取好友关系，保留已打开的搜索查询。 */
    public refreshVisible(): void {
        this.refresh();
        if (this.currentQuery !== null) {
            this.search(this.currentQuery);
        }
    }

    /** 请求新查询，只有当前输入对应的回执可以刷新搜索窗口。 */
    public search(query: string): void {
        if (!this.operations || !this.ready) {
            return;
        }
        const value = query.trim();
        if (this.currentQuery !== value) {
            FriendModel.instance.setSearch(null);
            this.emit("friend.search.updated", undefined);
        }
        this.currentQuery = value;
        const operation = {};
        this.searchRequest = operation;
        const finish = (): void => {
            if (this.searchRequest === operation) {
                this.searchRequest = null;
            }
        };
        void this.operations.deliver(Protocol.FRIEND_SEARCH, { query: value }, frame => {
            if (this.searchRequest === operation) {
                if ((frame.body as FriendSearchResult).query !== value) {
                    throw new Error("好友搜索回包与本次查询不符");
                }
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => {
            if (this.searchRequest === operation) {
                UIManager.instance.toast(ErrorUtils.messageOf(error));
            }
        }).then(finish, finish);
    }

    /** 搜索页关闭时释放结果，忽略迟到的匹配列表。 */
    public closeSearch(): void {
        this.currentQuery = null;
        this.searchRequest = null;
        FriendModel.instance.setSearch(null);
    }

    /** 提交定向或批量好友操作，赠领时携带玩家看到的日界。 */
    public change(action: FriendAction, targetId?: string): void {
        const state = FriendModel.instance.state;
        if (!this.operations || !this.ready || !state || this.pendingChange) {
            return;
        }
        const requestId = RequestIdUtils.create();
        const giftAction = action.startsWith("SEND") || action.startsWith("CLAIM");
        this.pendingChange = requestId;
        this.emit("friend.updated", undefined);
        const finish = (): void => {
            if (this.pendingChange === requestId) {
                this.pendingChange = null;
                this.emit("friend.updated", undefined);
                this.readIfNeeded();
            }
        };
        void this.operations.deliver(Protocol.FRIEND_CHANGE, {
            action, requestId, ...(targetId ? { targetId } : {}), resetAt: giftAction ? state.resetAt : 0,
        }, frame => {
            if (this.pendingChange !== requestId) {
                return;
            }
            const receipt = frame.body as FriendChangeResult;
            if (receipt.requestId !== requestId) {
                throw new Error("好友回包与当前操作不符");
            }
            ProtocolRouter.instance.dispatch(this, frame);
            if (!receipt.notice && feedback[action]) {
                UIManager.instance.toast(feedback[action]!);
            }
            if (this.currentQuery !== null) {
                this.search(this.currentQuery);
            }
        }, error => {
            if (this.pendingChange === requestId) {
                this.dirty = true;
                UIManager.instance.toast(ErrorUtils.messageOf(error));
            }
        }).then(finish, finish);
    }

    /** 接纳当前会话的状态、操作回执与提交后失效事件。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.FRIEND_STATE:
                this.acceptState(payload as FriendState);
                break;
            case Protocol.FRIEND_CHANGED:
                this.refresh();
                break;
            case Protocol.FRIEND_SEARCH:
                FriendModel.instance.setSearch(payload as FriendSearchResult);
                this.emit("friend.search.updated", undefined);
                break;
            case Protocol.FRIEND_CHANGE: {
                const receipt = payload as FriendChangeResult;
                this.acceptState(receipt.state);
                if (receipt.notice) {
                    this.restoreReward?.(receipt.notice);
                }
                break;
            }
        }
    }

    /** 注册认证后的好友业务协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.FRIEND_STATE, Protocol.FRIEND_CHANGED,
            Protocol.FRIEND_SEARCH, Protocol.FRIEND_CHANGE]));
    }

    /** 离开角色后清空所有好友状态，拒绝迟到的旧操作。 */
    protected onResetSession(): void {
        this.visible = false;
        this.reading = null;
        this.dirty = false;
        this.pendingChange = null;
        this.closeSearch();
        this.clearTimer();
        FriendModel.instance.setState(null);
        this.emit("friend.updated", undefined);
    }

    /** 场景退出时解除认证和发奖依赖。 */
    protected onDispose(): void {
        this.ready = false;
        this.operations = null;
        this.restoreReward = null;
    }

    /** 标记列表需要重新读取，在途查询和操作完成后合并。 */
    private refresh(): void {
        this.dirty = true;
        this.readIfNeeded();
    }

    /** 查询时令旧快照无法覆盖在途好友操作的结果。 */
    private readIfNeeded(): void {
        if (!this.ready || !this.operations || this.reading || this.pendingChange || !this.dirty) {
            return;
        }
        this.dirty = false;
        const operation = {};
        this.reading = operation;
        const finish = (): void => {
            if (this.reading === operation) {
                this.reading = null;
                this.readIfNeeded();
            }
        };
        void this.operations.deliver(Protocol.FRIEND_STATE, {}, frame => {
            if (this.reading === operation && !this.pendingChange) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => {
            if (this.reading === operation && this.visible) {
                UIManager.instance.toast(ErrorUtils.messageOf(error));
            } else if (this.reading === operation) {
                GameLog.shared.classified("MODULE", "warn", "FriendController", ErrorUtils.messageOf(error));
            }
        }).then(finish, finish);
    }

    /** 提交一次好友状态，并按服务器时钟安排日界更新。 */
    private acceptState(state: FriendState): void {
        FriendModel.instance.setState(state);
        this.emit("friend.updated", undefined);
        this.clearTimer();
        const now = ServerClock.instance.nowSeconds();
        if (this.ready && now !== null && state.resetAt > now) {
            this.timer = setTimeout(() => {
                this.timer = null;
                this.refresh();
            }, (state.resetAt - now) * 1000 + 100);
        }
    }

    /** 清除上次快照的日界更新计划。 */
    private clearTimer(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
