/** 背包协议控制器：统一初始化及服务端状态同步 → 唯一 BagModel → 界面事件。
 * 不持有账号、凭证或查询接口；不接受其他玩法在客户端写入库存，页面开关不请求背包。
 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { Protocol } from "../../platform/Protocol";
import type { ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import { BagModel } from "./BagModel";
import { BagEvent } from "./utils/BagEvent";
import { BagItemDataUtils } from "./data/BagItemDataUtils";
import type { BagChangeReason } from "./data/BagEventData";
import type { BagChangeSet } from "./data/BagChangeSet";
import type { BagState } from "./data/BagState";
import { HeroPieceComposeUtils } from "./utils/HeroPieceComposeUtils";
import type { HeroPieceComposeState } from "./utils/HeroPieceComposeUtils";
import { UIManager } from "../../framework/ui/UIManager";

export class BagController extends BaseController {
    /** 应用唯一背包入口，与窗口生命周期无关。 */
    static readonly instance = new BagController(BagModel.instance);

    /** 应用注入的持久合成动作，成功完成权威回执/快照双确认及通用反馈；关闭窗口不撤销。 */
    private combineHeroPieces: ((itemId: number, quantity: number) => Promise<void>) | null = null;
    /** 从应用唯一角色Model读取等级，未装配时返回0，不在背包另存角色副本。 */
    private readRoleLevel: () => number = () => 0;
    /** 可选的应用支持判定，不复制候选池清单；最终支持资格由服务端校验。 */
    private supportsHeroPiece: ((itemId: number) => boolean) | null = null;
    /** 应用按唯一英雄名册计算的剩余容量；null表示未知，仅旧单次详情分支做本地前检。 */
    private readHeroRemainingSlots: () => number | null = () => null;

    /** 注入唯一库存 Model，构造时不联网。
     * @param model 应用持有的唯一库存，控制器只提交服务端确认的数据。 */
    constructor(private readonly model: BagModel) {
        super();
    }

    /** 注入原请求持久化/身份交付及角色等级读取，动作只接物品ID和合成次数，不持View或凭证。 */
    public configurePieceCompose(
        combine: (itemId: number, quantity: number) => Promise<void>,
        readRoleLevel: () => number,
        supports?: (itemId: number) => boolean,
        readHeroRemainingSlots?: () => number | null,
    ): void {
        this.combineHeroPieces = combine;
        this.readRoleLevel = readRoleLevel;
        this.supportsHeroPiece = supports || null;
        this.readHeroRemainingSlots = readHeroRemainingSlots || (() => null);
    }

    /** 从真实配置和唯一库存现算可选次数；未同步仍返回明确不可操作，不读取待发奖回执补库存。 */
    public pieceComposeState(itemId: number): HeroPieceComposeState | null {
        const definition = HeroPieceComposeUtils.definition(itemId);
        if (!definition) {
            return null;
        }
        const owned = this.model.getItem(itemId)?.quantity || 0;
        const maximum = HeroPieceComposeUtils.maximum(owned, definition.required);
        if (maximum === null) {
            return null;
        }
        const remaining = this.readHeroRemainingSlots();
        return {
            ...definition,
            owned,
            maximum,
            roleLevel: this.readRoleLevel(),
            remainingHeroSlots: remaining !== null && Number.isSafeInteger(remaining) ? Math.max(0, remaining) : null,
            available: this.isInitialized && this.model.snapshot.synced && !!this.combineHeroPieces
                && (!this.supportsHeroPiece || this.supportsHeroPiece(itemId)),
        };
    }

    /**
     * 核对当前持有量与等级后交应用发起持久合成；null表示本地拒绝且已统一提示，不应关闭数量窗。
     * 返回Promise只属于应用原请求流程，View关闭不取消；业务/网络错误由应用统一提示，不在此重复报告。
     * @param checkSingleCapacity true仅用于旧详情直接合成一份的分支；数量窗仍沿旧逻辑交服务端检查容量。
     */
    public composeHeroPieces(itemId: number, quantity: number, checkSingleCapacity = false): Promise<void> | null {
        const state = this.pieceComposeState(itemId);
        let reason = "";
        if (!state?.available) {
            reason = "该碎片合成暂未开放";
        } else if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > state.maximum) {
            reason = "碎片数量不足，请重新选择合成次数";
        } else if (state.roleLevel < state.minimumLevel) {
            reason = "角色达到" + state.minimumLevel + "级后才可合成";
        } else if (checkSingleCapacity && state.remainingHeroSlots === 0) {
            reason = "英雄背包已满";
        }
        if (reason) {
            UIManager.instance.toast(reason);
            return null;
        }
        return this.combineHeroPieces!(itemId, quantity);
    }

    /** 应用销毁时撤回动作和角色读取引用，页面关闭及普通换号不自行取消持久合成。 */
    protected onDispose(): void {
        this.combineHeroPieces = null;
        this.readRoleLevel = () => 0;
        this.supportsHeroPiece = null;
        this.readHeroRemainingSlots = () => null;
    }

    /** 只声明模块处理的真实消息；网络身份与版本由应用统一检查。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, STATE_PROTOCOLS));
        this.resetSession();
    }

    /** 换号或退出时清空旧库存，不触发查询。 */
    protected onResetSession(): void {
        const previous = this.model.snapshot;
        const changes = this.isInitialized ? this.model.reset() : this.model.dispose();
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
                // 路由会拒绝非法回包；模块仅忽略不属于自身的通知，不触碰Model。
                GameLog.shared.warnOnce("MODULE", "BagController", "UNHANDLED_PROTOCOL:" + protocol,
                    "背包未登记协议：" + protocol + "；已忽略，未更新数据");
                return;
        }
    }

    /** 同帧提交普通库存、期限及精灵实例；首次不播放获得演出，未知精灵能力不伪装成空库存。 */
    private onInventoryState(protocol: ProtocolName, data: unknown): void {
        const state = ProtocolStateUtils.statePayload(protocol, data);
        const items = BagItemDataUtils.readBagItems(state.inventory), previous = this.model.snapshot;
        const changes = this.model.replaceAll(items, state.timedInventory, state.spiritInventory);
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
