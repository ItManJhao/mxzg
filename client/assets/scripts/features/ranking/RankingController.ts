/** 排行榜的认证业务入口。只提交服务端总览、榜单和点赞回执，资产同步由统一账号状态处理。 */
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
import { RankingModel } from "./RankingModel";
import type { RankingBoardKind, RankingDetail, RankingOverview } from "./data/RankingData";

/** 冻结回执使用相同反馈编号，恢复重试时由通用奖励队列去重。 */
interface RankingLikeReceipt {
    readonly requestId: string;
    readonly overview: RankingOverview;
    readonly notice: RewardNotice;
}

export class RankingController extends BaseController {
    /** 该场景共用的排行榜控制器。 */
    public static readonly instance = new RankingController();
    /** 当前应用注入的认证请求通道，卸载后清空。 */
    private operations: AccountOperations | null = null;
    /** 统一奖励回执恢复能力，复用原有飘字与去重。 */
    private restoreReward: ((notice: RewardNotice) => void) | null = null;
    /** 主城显示后才能读取榜单入口和刷新红点。 */
    private ready = false;
    /** 根据角色等级和入口配置判断当前是否开放排行榜。 */
    private unlocked = false;
    /** 总览打开时弹出读取错误，未打开时只记录日志。 */
    private visible = false;
    /** 唯一在途总览，失效或换号后清空。 */
    private overviewRequest: object | null = null;
    /** 榜单详情按类型去重，每个榜只保留一个在途查询。 */
    private readonly detailRequests = new Map<RankingBoardKind, object>();
    /** 当前显示的详情榜，关闭时清除，供重连刷新。 */
    private visibleDetail: RankingBoardKind | null = null;
    /** 尚未完成的主动点赞编号，防止连续提交。 */
    private pendingLike: string | null = null;
    /** 最近一次校验过的服务端日界定时器，换号及退出时清理。 */
    private resetTimer: ReturnType<typeof setTimeout> | null = null;

    /** 绑定当前会话的账号通道和奖励入口。 */
    public configure(operations: AccountOperations, restoreReward: (notice: RewardNotice) => void): void {
        this.operations = operations;
        this.restoreReward = restoreReward;
    }

    /** 是否有点赞正在提交，供所有榜单卡片统一禁用按钮。 */
    public get busy(): boolean {
        return this.pendingLike !== null;
    }

    /** 主城进入后读取入口红点；离开时撤销日界刷新。 */
    public setHomeReady(ready: boolean): void {
        this.ready = ready;
        if (ready) {
            this.refreshOverview();
        } else {
            this.clearTimer();
        }
    }

    /** 准入首次满足时读取排行榜，关闭资格时清除该角色的旧展示。 */
    public setUnlocked(unlocked: boolean): void {
        if (this.unlocked === unlocked) {
            return;
        }
        this.unlocked = unlocked;
        if (unlocked) {
            this.refreshOverview();
        } else {
            this.clearState();
        }
    }

    /** 打开总览时刷新榜首，详情上方的榜单窗口关闭后不再展示查询失败。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshOverview();
        }
    }

    /** 重连成功后重新读取榜首、当日点赞及当前打开的详细排行。 */
    public refreshVisible(): void {
        this.refreshOverview();
        if (this.visibleDetail) {
            this.loadDetail(this.visibleDetail);
        }
    }

    /** 首次或重新打开详情时读取指定榜单，原列表不会被异榜回包覆盖。 */
    public loadDetail(kind: RankingBoardKind): void {
        this.visibleDetail = kind;
        if (!this.operations || !this.ready || !this.unlocked || this.detailRequests.has(kind)) {
            return;
        }
        const operation = {};
        this.detailRequests.set(kind, operation);
        const finish = (): void => {
            if (this.detailRequests.get(kind) === operation) {
                this.detailRequests.delete(kind);
            }
        };
        void this.operations.deliver(Protocol.RANKING_LIST, { kind }, frame => {
            if (this.detailRequests.get(kind) === operation) {
                if ((frame.body as RankingDetail).kind !== kind) {
                    throw new Error("榜单回包与本次查询不符");
                }
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => {
            if (this.detailRequests.get(kind) === operation && this.visibleDetail === kind) {
                UIManager.instance.toast(ErrorUtils.messageOf(error));
            }
        }).then(finish, finish);
    }

    /** 忽略已经关闭或被其他榜替换的详情刷新意图。 */
    public closeDetail(kind: RankingBoardKind): void {
        if (this.visibleDetail === kind) {
            this.visibleDetail = null;
        }
    }

    /** 点赞使用已展示的榜首与期次，资格和金币均以服务端结果为准。 */
    public like(kind: RankingBoardKind): void {
        const snapshot = RankingModel.instance.state;
        const board = snapshot?.boards.find(entry => entry.kind === kind);
        if (!this.operations || !this.ready || !this.unlocked || this.pendingLike || !snapshot || !board?.leader || board.liked) {
            return;
        }
        const requestId = RequestIdUtils.create();
        this.pendingLike = requestId;
        this.emit("ranking.updated", undefined);
        let refresh = false;
        const finish = (): void => {
            if (this.pendingLike === requestId) {
                this.pendingLike = null;
                this.emit("ranking.updated", undefined);
                if (refresh) {
                    this.refreshOverview();
                }
            }
        };
        void this.operations.deliver(Protocol.RANKING_LIKE,
            { requestId, kind, targetId: board.leader.id, resetAt: snapshot.resetAt }, frame => {
                if (this.pendingLike === requestId) {
                    if ((frame.body as RankingLikeReceipt).requestId !== requestId) {
                        throw new Error("点赞回执与本次操作不符");
                    }
                    ProtocolRouter.instance.dispatch(this, frame);
                }
            }, error => {
                if (this.pendingLike === requestId) {
                    refresh = true;
                    UIManager.instance.toast(ErrorUtils.messageOf(error));
                }
            }).then(finish, finish);
    }

    /** 分发已校验的当前连接回包，先更新唯一 Model，再通知页面与红点。 */
    public onNotify(protocol: ProtocolName, payload: unknown): void {
        switch (protocol) {
            case Protocol.RANKING_LIST:
                RankingModel.instance.setDetail(payload as RankingDetail);
                this.emit("ranking.updated", undefined);
                break;
            case Protocol.RANKING_OVERVIEW:
                this.acceptOverview(payload as RankingOverview);
                break;
            case Protocol.RANKING_LIKE: {
                const receipt = payload as RankingLikeReceipt;
                this.acceptOverview(receipt.overview);
                this.restoreReward?.(receipt.notice);
                break;
            }
        }
    }

    /** 注册该模块接收的三种排行榜协议。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.RANKING_OVERVIEW, Protocol.RANKING_LIST, Protocol.RANKING_LIKE]));
    }

    /** 由应用切换角色时清理数据和迟到操作。 */
    protected onResetSession(): void {
        this.unlocked = false;
        this.visible = false;
        this.clearState();
    }

    /** 场景卸载时撤销认证通道与通用奖励引用。 */
    protected onDispose(): void {
        this.ready = false;
        this.operations = null;
        this.restoreReward = null;
    }

    /** 合并在途总览，请求只携带当前连接身份。 */
    private refreshOverview(): void {
        if (!this.operations || !this.ready || !this.unlocked || this.overviewRequest || this.pendingLike) {
            return;
        }
        const operation = {};
        this.overviewRequest = operation;
        const finish = (): void => {
            if (this.overviewRequest === operation) {
                this.overviewRequest = null;
            }
        };
        void this.operations.deliver(Protocol.RANKING_OVERVIEW, {}, frame => {
            if (this.overviewRequest === operation && !this.pendingLike) {
                ProtocolRouter.instance.dispatch(this, frame);
            }
        }, error => {
            if (this.overviewRequest !== operation) {
                return;
            }
            if (this.visible) {
                UIManager.instance.toast(ErrorUtils.messageOf(error));
            } else {
                GameLog.shared.classified("MODULE", "warn", "RankingController", ErrorUtils.messageOf(error));
            }
        }).then(finish, finish);
    }

    /** 提交服务端总览，并在次日零点重新读取点赞资格。 */
    private acceptOverview(overview: RankingOverview): void {
        RankingModel.instance.setOverview(overview);
        this.emit("ranking.updated", undefined);
        this.clearTimer();
        const now = ServerClock.instance.nowSeconds();
        if (this.ready && now !== null && overview.resetAt > now) {
            this.resetTimer = setTimeout(() => {
                this.resetTimer = null;
                this.refreshOverview();
            }, (overview.resetAt - now) * 1_000 + 100);
        }
    }

    /** 清除已安排的日界刷新。 */
    private clearTimer(): void {
        if (this.resetTimer !== null) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }

    /** 清理旧角色或已失去访问资格时的查询、点赞和快照。 */
    private clearState(): void {
        this.clearTimer();
        this.overviewRequest = null;
        this.detailRequests.clear();
        this.visibleDetail = null;
        this.pendingLike = null;
        RankingModel.instance.reset();
        this.emit("ranking.updated", undefined);
    }
}
