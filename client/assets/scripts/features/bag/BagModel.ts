/** 背包唯一库存状态：由 Controller 提交服务端快照，View 只读；本地版本仅用于界面通知。 */
import {BaseModel} from "../../framework/BaseModel";
import {BagItemDataUtils} from "./data/BagItemDataUtils";
import type {BagItemData} from "./data/BagItemDataUtils";
import type {BagChangeSet, BagQuantityChange} from "./data/BagChangeSet";
import type {BagState} from "./data/BagState";

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

    /** 返回带本地版本的只读快照，同一次提交复用同一对象。 */
    get snapshot(): BagState {
        if (!this.cachedSnapshot) {
            this.cachedSnapshot = Object.freeze({...this.data, revision: this.version});
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
     * @param items 服务端普通库存，由 Model 完整校验后提交。
     * @param timedInventory 同帧逐件期限列表及该快照的服务器秒，用于校验下发时物品是否有效。
     * @param spiritInventory 同帧精灵完整快照；缺失保留明确未提供状态，不伪造已同步空列表。 */
    replaceAll(items: unknown, timedInventory?: unknown, spiritInventory?: unknown): BagChangeSet {
        const rows = BagItemDataUtils.readBagItems(items);
        const timedItems = BagItemDataUtils.readTimedItems(timedInventory);
        const spiritItems = BagItemDataUtils.readSpiritItems(spiritInventory);
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
        this.commit({
            status: "ready",
            synced: true,
            items: rows,
            timedItems,
            spiritItems,
            spiritSynced: spiritInventory !== undefined,
        });
        return this.changeSet(initialSync, added, quantityChanged, removed);
    }

    /** 响应基类重置，清空库存、同步状态和快照缓存。 */
    protected onReset(): void {
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
        return Object.freeze({
            status: "idle",
            synced: false,
            items: Object.freeze([]),
            timedItems: Object.freeze([]),
            spiritItems: Object.freeze([]),
            spiritSynced: false,
        });
    }

    /** 整体保存状态、递增本地版本并清除快照缓存；不修改服务端资产版本。 */
    private commit(data: BagContents): void {
        this.data = Object.freeze(data);
        this.incrementVersion();
        this.cachedSnapshot = null;
    }
}
