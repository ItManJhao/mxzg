/** 背包唯一库存状态：由 Controller 提交服务端快照，View 只读；本地版本仅用于界面通知。 */
import { BaseModel } from "../../framework/BaseModel";
import { BagItemDataUtils } from "./data/BagItemDataUtils";
import type { BagItemData } from "./data/BagItemDataUtils";
import type { BagChangeSet, BagQuantityChange } from "./data/BagChangeSet";
import type { BagState } from "./data/BagState";

/** Model 内部内容；本地展示版本由 BaseModel 维护，角色归属由应用层校验。 */
type BagContents = Omit<BagState, "revision">;

/** 当前角色唯一库存 Model，负责校验和保存；协议处理与事件由 Controller 负责。 */
export class BagModel extends BaseModel {
    /** 应用唯一库存状态，页面关闭不销毁，换号由应用层重置。 */
    static readonly instance = new BagModel();
    /** 当前完整库存和同步状态；整批校验后替换，重置时清空。 */
    private data: BagContents = this.emptyData();
    /** 冻结快照缓存；每次提交或重置失效，同版本读取时复用。 */
    private cachedSnapshot: BagState | null = null;

    /** 收到期限快照时的本地计时锚点，重置时清空；不保存本机日历时间。 */
    private timedAnchorMs = 0;
    /** 注入只用于计算流逝时间的时钟；默认使用单调时钟，不用本机日期推算服务器日切。
     * @param elapsedMs 测试可注入时钟；缺少 performance 的平台按帧累计，由应用每帧调用 advanceClock。 */
    constructor(private readonly elapsedMs: (() => number) | null = typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : null) { super(); }
    /** 后台暂停后时钟失效，只有新的服务器快照才能重新校准；不修改库存。 */
    private clockValid = false;
    /** 应用进入后台时停止使用旧计时基准，恢复期间详情显示同步提示。 */
    suspendClock(): void { this.clockValid = false; }
    /** 无单调时钟的平台累计前台帧时间；后台时间等待重连快照校正，不以本机日期猜测。 */
    private frameElapsedMs = 0;
    /** 仅无单调时钟时累积非负帧时间，不改变库存或持久版本。 */
    advanceClock(seconds: number): void { if (!this.elapsedMs && Number.isFinite(seconds) && seconds > 0) this.frameElapsedMs += seconds * 1000; }
    /** 服务器秒加本地流逝时长；未收到期限快照返回 null，窗口关闭不重新计时。 */
    serverTimeSeconds(): number | null {
        if (!this.clockValid || this.data.timedServerTimeSeconds === null) return null;
        return this.data.timedServerTimeSeconds + Math.max(0, Math.floor(((this.elapsedMs ? this.elapsedMs() : this.frameElapsedMs) - this.timedAnchorMs) / 1000));
    }

    /** 返回带本地版本的只读快照，同一次提交复用同一对象。 */
    get snapshot(): BagState {
        if (!this.cachedSnapshot) {
            this.cachedSnapshot = Object.freeze({ ...this.data, revision: this.version });
        }
        return this.cachedSnapshot;
    }

    /** 返回服务器完整库存，包含界面隐藏的条目。 */
    get items(): readonly BagItemData[] {
        return this.data.items;
    }

    /** 按当前协议物品配置 ID 查找；不存在时返回 undefined。 */
    getItem(itemId: number): Readonly<BagItemData> | undefined {
        return this.items.find(item => item.itemId === itemId);
    }

    /** 读取指定配置 ID 的库存数量，未持有时返回 0。 */
    quantity(itemId: number): number {
        return this.getItem(itemId)?.quantity || 0;
    }

    /** 按应用指令清空库存，返回空变更集；由 Controller 发事件。 */
    reset(): BagChangeSet {
        super.reset();
        return this.changeSet(false, [], [], []);
    }

    /** 释放库存，返回清空后的变更集，不发送请求。 */
    dispose(): BagChangeSet {
        super.dispose();
        return this.changeSet(false, [], [], []);
    }

    /** 整批校验后替换绝对数量及独立实例；首次同步不生成获得条目，任何一类非法均不修改状态。
     * @param timedInventory 同帧逐件期限列表及服务器秒；与普通库存一起校验后提交。
     * @param spiritInventory 同帧精灵完整快照；缺失保留明确未提供状态，不伪造已同步空列表。 */
    replaceAll(items: readonly BagItemData[], timedInventory?: unknown, spiritInventory?: unknown): BagChangeSet {
        const rows = BagItemDataUtils.readBagItems(items);
        const timedItems = BagItemDataUtils.readTimedItems(timedInventory);
        const spiritItems = BagItemDataUtils.readSpiritItems(spiritInventory);
        const timedServerTimeSeconds = timedInventory === undefined ? null : (timedInventory as { serverTimeSeconds: number }).serverTimeSeconds;
        const initialSync = !this.data.synced;
        const added: BagItemData[] = [], removed: BagItemData[] = [], quantityChanged: BagQuantityChange[] = [];
        if (!initialSync) {
            const previous = new Map(this.items.map(item => [item.itemId, item] as const));
            for (const item of rows) {
                const old = previous.get(item.itemId);
                if (!old) added.push(item);
                else if (old.quantity !== item.quantity) quantityChanged.push(Object.freeze({
                    itemId: item.itemId,
                    oldQuantity: old.quantity, newQuantity: item.quantity, delta: item.quantity - old.quantity
                }));
                previous.delete(item.itemId);
            }
            removed.push(...Array.from(previous.values()));
        }
        this.clockValid = true;
        this.timedAnchorMs = this.elapsedMs ? this.elapsedMs() : this.frameElapsedMs;
        this.commit({ status: "ready", synced: true, items: rows, timedItems, timedServerTimeSeconds,
            spiritItems, spiritSynced: spiritInventory !== undefined });
        return this.changeSet(initialSync, added, quantityChanged, removed);
    }

    /** 响应基类重置，清空库存、同步状态和快照缓存。 */
    protected onReset(): void {
        this.clockValid = false;
        this.timedAnchorMs = 0;
        this.frameElapsedMs = 0;
        this.data = this.emptyData();
        this.cachedSnapshot = null;
    }

    /** 封装已提交状态的只读差异，关联本地版本，不派发事件。 */
    private changeSet(initialSync: boolean, added: BagItemData[], quantityChanged: BagQuantityChange[], removed: BagItemData[]): BagChangeSet {
        return Object.freeze({
            revision: this.version,
            initialSync,
            added: Object.freeze(added),
            quantityChanged: Object.freeze(quantityChanged),
            removed: Object.freeze(removed)
        });
    }

    /** 创建未同步的空状态；idle 与已同步空背包 ready 含义不同。 */
    private emptyData(): BagContents {
        return Object.freeze({ status: "idle", synced: false, items: Object.freeze([]), timedItems: Object.freeze([]),
            timedServerTimeSeconds: null, spiritItems: Object.freeze([]), spiritSynced: false });
    }

    /** 整体保存状态、递增本地版本并清除快照缓存；不修改服务端资产版本。 */
    private commit(data: BagContents): void {
        this.data = Object.freeze(data);
        this.incrementVersion();
        this.cachedSnapshot = null;
    }
}
