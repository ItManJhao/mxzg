/**
 * 背包协议控制器，接收统一快照并交给 BagModel 提交库存，通知背包和详情页刷新。
 * 精英碎片合成由这里提交，成功回执交给通用奖励队列，库存始终由快照更新。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import type { AccountOperations } from "../account/AccountOperations";
import type { RewardBinding } from "../reward/RewardBinding";
import { BagModel } from "./BagModel";
import { BagEvent } from "./utils/BagEvent";
import type { BagChangeReason } from "./data/BagEventData";
import type { BagChangeSet } from "./data/BagChangeSet";
import type { BagState } from "./data/BagState";

/** 已完成协议格式校验的合成回执，含原选择和服务端实际发放明细。 */
interface FragmentCombineReceipt {
    readonly itemId: number;
    readonly quantity: number;
    readonly receiptId: string;
    readonly assetRevision: number;
    readonly actual: unknown;
}

export class BagController extends BaseController {
    /** 应用唯一背包入口，与窗口生命周期无关。 */
    static readonly instance = new BagController(BagModel.instance);

    /** 应用装配的认证请求入口；仅展示背包的环境可省略，销毁时清空。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 已确认的合成回执交给应用共用的奖励队列，等待对应快照后展示。 */
    private rewards: Pick<RewardBinding, "restoreActual"> | null = null;

    /** 注入唯一库存 Model，构造时不联网。
     * @param model 应用持有的唯一库存，控制器只提交服务端确认的数据。 */
    constructor(private readonly model: BagModel) {
        super();
    }

    /** 接入应用的角色请求与奖励队列，供详情和数量窗提交合成。 */
    public configure(operations: Pick<AccountOperations, "send">, rewards: Pick<RewardBinding, "restoreActual">): void {
        this.operations = operations;
        this.rewards = rewards;
    }

    /** 当前模块可以受理合成请求时为 true，库存、等级和容量由服务端决定。 */
    public get canComposeHeroPieces(): boolean {
        return this.isInitialized && this.operations !== null;
    }

    /** 发送玩家选定的碎片和合成次数，回包与本次选择一致时才交给奖励窗。 */
    public composeHeroPieces(itemId: number, quantity: number): void {
        if (!this.operations || !this.isInitialized) {
            UIManager.instance.toast("该碎片合成暂未开放");
            return;
        }
        this.operations.send(this, Protocol.HERO_FRAGMENT_COMBINE, { itemId, quantity }, this.onComposeFailed, data => {
            const receipt = data as FragmentCombineReceipt;
            if (receipt.itemId !== itemId || receipt.quantity !== quantity) {
                throw new Error("碎片合成回执与请求不符");
            }
        });
    }

    /** 合成失败时显示服务端原因，断线时提示玩家等待背包同步。 */
    private onComposeFailed(error: unknown): void {
        const message = error instanceof SocketFailure && error.interrupted
            ? "合成结果待同步，恢复连接后请查看背包"
            : error instanceof Error ? error.message : "碎片合成请求失败";
        UIManager.instance.toast(message);
    }

    /** 只声明模块处理的真实消息；网络身份与版本由应用统一检查。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [...STATE_PROTOCOLS, Protocol.HERO_FRAGMENT_COMBINE]));
        this.resetSession();
    }

    /** 换号或退出时清空旧库存，不触发查询。 */
    protected onResetSession(): void {
        const previous = this.model.snapshot;
        const changes = this.isInitialized ? this.model.reset() : this.model.dispose();
        this.notify(changes, "session-reset", previous);
    }

    /** 将库存快照交给 Model，合成成功回执交给通用奖励展示。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onInventoryState(protocol, data);
                break;
            case Protocol.HERO_FRAGMENT_COMBINE: {
                const receipt = data as FragmentCombineReceipt;
                this.rewards?.restoreActual(receipt.receiptId, receipt.assetRevision, receipt.actual);
                break;
            }
            default:
                // 路由会拒绝非法回包；模块仅忽略不属于自身的通知，不触碰Model。
                GameLog.shared.warnOnce("MODULE", "BagController", "UNHANDLED_PROTOCOL:" + protocol,
                    "背包未登记协议：" + protocol + "；已忽略，未更新数据");
                return;
        }
    }

    /** 应用卸载背包时释放认证通道与奖励队列引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.rewards = null;
    }

    /** 同帧提交普通库存、期限及精灵实例；首次不播放获得演出，未知精灵能力不伪装成空库存。 */
    private onInventoryState(protocol: ProtocolName, data: unknown): void {
        const state = ProtocolStateUtils.statePayload(protocol, data);
        const previous = this.model.snapshot;
        const changes = this.model.replaceAll(state.inventory, state.timedInventory, state.spiritInventory);
        this.notify(changes, protocol === Protocol.STATE_CHANGED ? "unknown" : "initial-sync", previous);
    }

    /** Model 完成提交后通知状态/增删改及汇总；首次同步不触发获得物品演出。 */
    private notify(changes: BagChangeSet | null, reason: BagChangeReason, previous: BagState): void {
        EventDispatcher.batchNotifications(() => {
            const state = this.model.snapshot;
            if (reason === "session-reset" || previous.status !== state.status || previous.synced !== state.synced) {
                this.emit(BagEvent.BagSyncStateChanged, Object.freeze({
                    revision: state.revision,
                    status: state.status, synced: state.synced
                }));
            }
            // 每个已接纳版本均刷新汇总，期限列表或实例身份变化也必须可见。
            if (changes) {
                const update = Object.freeze({ ...changes, reason: changes.initialSync ? "initial-sync" : reason });
                const header = { revision: update.revision, reason: update.reason };
                if (update.added.length) this.emit(BagEvent.BagAdd, Object.freeze({ ...header, added: update.added }));
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
