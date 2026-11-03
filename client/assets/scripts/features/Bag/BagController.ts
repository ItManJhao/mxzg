/** 背包协议控制器：统一初始化及服务端状态同步 → 唯一 BagModel → 界面事件。
 * 不持有账号、凭证或查询接口；不接受其他玩法在客户端写入库存，页面开关不请求背包。
 */
import {BaseController} from "../../framework/BaseController";
import {batchNotifications} from "../../framework/EventDispatcher";
import {Protocol} from "../../platform/Protocol";
import type {ProtocolName} from "../../platform/Protocol";
import {ProtocolRouter} from "../../platform/ProtocolRouter";
import {statePayload, STATE_PROTOCOLS} from "../../platform/ProtocolState";
import {BagModel} from "./BagModel";
import {BagEvent} from "./BagEvent";
import {readBagItems} from "./data/BagItemData";
import type {BagChangeReason} from "./data/BagEventData";
import type {BagChangeSet} from "./data/BagChangeSet";
import type {BagState} from "./data/BagState";

export class BagController extends BaseController {
    /** 应用唯一背包入口，与窗口生命周期无关。 */
    static readonly instance = new BagController(BagModel.instance);

    /** 注入唯一库存 Model，构造时不联网。
     * @param model 应用持有的唯一库存，控制器只提交服务端确认的数据。 */
    constructor(private readonly model: BagModel) {
        super();
    }

    /** 只声明模块处理的真实消息；网络身份与版本由应用统一检查。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, STATE_PROTOCOLS));
        this.resetSession(null);
    }

    /** 换号或退出时清空旧库存，不触发查询。 */
    protected onResetSession(roleKey: string | null): void {
        const previous = this.model.snapshot;
        const changes = this.isInitialized ? this.model.reset(roleKey) : this.model.dispose();
        this.notify(changes, "session-reset", previous);
    }

    /** 清楚列出背包接收的初始化、恢复与变化同步协议。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onInventoryState(protocol, data);
                break;
            default:
                throw new Error("背包未登记协议：" + protocol);
        }
    }

    /** 使用绝对数量完整替换库存，首次不播放获得演出；空列表也是有效初始化。 */
    private onInventoryState(protocol: ProtocolName, data: unknown): void {
        const items = readBagItems(statePayload(protocol, data).inventory), previous = this.model.snapshot;
        const changes = this.model.replaceAll(items);
        this.notify(changes, protocol === Protocol.STATE_CHANGED ? "unknown" : "initial-sync", previous);
    }

    /** Model 完成提交后通知状态/增删改及汇总；首次同步不触发获得物品演出。 */
    private notify(changes: BagChangeSet | null, reason: BagChangeReason, previous: BagState): void {
        batchNotifications(() => {
            const state = this.model.snapshot;
            if (previous.roleKey !== state.roleKey || previous.status !== state.status || previous.synced !== state.synced) {
                this.emit(BagEvent.BagSyncStateChanged, Object.freeze({
                    roleKey: state.roleKey, revision: state.revision,
                    status: state.status, synced: state.synced
                }));
            }
            if (changes && (changes.initialSync || reason === "session-reset" || changes.added.length || changes.quantityChanged.length || changes.removed.length)) {
                const update = Object.freeze({...changes, reason: changes.initialSync ? "initial-sync" : reason});
                const header = {roleKey: update.roleKey, revision: update.revision, reason: update.reason};
                if (update.added.length) this.emit(BagEvent.BagAdd, Object.freeze({...header, added: update.added}));
                if (update.removed.length) this.emit(BagEvent.BagRemove, Object.freeze({
                    ...header,
                    removed: update.removed
                }));
                if (update.quantityChanged.length) this.emit(BagEvent.BagQuantityChanged, Object.freeze({
                    ...header,
                    quantityChanged: update.quantityChanged
                }));
                this.emit(BagEvent.BagUpdate, update);
            }
        });
    }
}
