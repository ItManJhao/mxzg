/** 背包唯一库存状态：由 Controller 提交服务端快照，View 只读；本地版本仅用于界面通知。 */
import {BaseModel} from "../../framework/BaseModel";
import {readBagItems} from "./data/BagItemData";
import type {BagItemData, BagItemDelta} from "./data/BagItemData";
import type {BagChangeSet, BagQuantityChange} from "./data/BagChangeSet";
import type {BagState} from "./data/BagState";

/** Model 内部内容，角色归属和本地版本由 BaseModel 维护。 */
type BagContents = Omit<BagState, "roleKey" | "revision">;

/** 当前角色唯一库存 Model，负责校验和保存；协议处理与事件由 Controller 负责。 */
export class BagModel extends BaseModel {
    /** 应用唯一库存状态，页面关闭不销毁，换号由应用层重置。 */
    static readonly instance = new BagModel();
    /** 当前完整库存和同步状态；整批校验后替换，重置时清空。 */
    private data: BagContents = this.emptyData();
    /** 冻结快照缓存；每次提交或重置失效，同版本读取时复用。 */
    private cachedSnapshot: BagState | null = null;

    /** 返回带角色归属、本地版本的只读快照，同一次提交复用同一对象。 */
    get snapshot(): BagState {
        if (!this.cachedSnapshot) {
            this.cachedSnapshot = Object.freeze({...this.data, roleKey: this.roleKey, revision: this.version});
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

    /** 切换角色归属并清空库存，返回空变更集；由 Controller 发事件。 */
    reset(roleKey: string | null): BagChangeSet {
        super.reset(roleKey);
        return this.changeSet(false, [], [], []);
    }

    /** 释放角色归属和库存，返回清空后的变更集，不发送请求。 */
    dispose(): BagChangeSet {
        super.dispose();
        return this.changeSet(false, [], [], []);
    }

    /** 标为等待同步并清空错误，保留库存；当前统一首包链不调用此预留入口。 */
    beginSync(): void {
        this.requireRole();
        this.commit({...this.data, status: "loading", error: ""});
    }

    /** 记录错误并保留上次库存；当前统一首包链由应用处理失败，不调用此预留入口。 */
    fail(error: string): void {
        this.requireRole();
        this.commit({...this.data, status: "error", error});
    }

    /** 整批校验后替换绝对数量并计算增删改；首次同步不生成获得条目，空数组为合法空背包。校验失败不修改状态。 */
    replaceAll(items: readonly BagItemData[]): BagChangeSet {
        this.requireRole();
        const rows = readBagItems(items);
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
        this.commit({status: "ready", synced: true, items: rows, error: ""});
        return this.changeSet(initialSync, added, quantityChanged, removed);
    }

    /** 预留的有符号增量入口，整批校验后提交，要求已完成首次同步。当前完整快照链不调用，不能用作客户端发奖入口。 */
    applyDelta(changes: readonly BagItemDelta[]): BagChangeSet {
        this.requireRole();
        if (!this.data.synced) throw new Error("背包尚未同步，不能应用增量");
        const next = new Map(this.items.map(item => [item.itemId, item.quantity] as [number, number]));
        const seen = new Set<number>();
        for (const change of changes) {
            if (!Number.isSafeInteger(change.itemId) || change.itemId <= 0 || !Number.isSafeInteger(change.delta) || seen.has(change.itemId)) {
                throw new Error("背包增量无效");
            }
            seen.add(change.itemId);
            const quantity = (next.get(change.itemId) || 0) + change.delta;
            if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("背包增量数量无效");
            if (quantity) next.set(change.itemId, quantity);
            else next.delete(change.itemId);
        }
        return this.replaceAll(Array.from(next, ([itemId, quantity]) => ({itemId, quantity})));
    }

    /** 响应基类重置，清空库存、同步状态和快照缓存。 */
    protected onReset(): void {
        this.data = this.emptyData();
        this.cachedSnapshot = null;
    }

    /** 封装已提交状态的只读差异，关联角色和本地版本，不派发事件。 */
    private changeSet(initialSync: boolean, added: BagItemData[], quantityChanged: BagQuantityChange[], removed: BagItemData[]): BagChangeSet {
        return Object.freeze({
            roleKey: this.roleKey,
            revision: this.version,
            initialSync,
            added: Object.freeze(added),
            quantityChanged: Object.freeze(quantityChanged),
            removed: Object.freeze(removed)
        });
    }

    /** 创建未同步的空状态；idle 与已同步空背包 ready 含义不同。 */
    private emptyData(): BagContents {
        return Object.freeze({status: "idle", synced: false, items: Object.freeze([]), error: ""});
    }

    /** 检查应用是否设置角色归属，缺失时抛错，拒绝接收无所属库存。 */
    private requireRole(): void {
        if (!this.roleKey) throw new Error("背包没有当前角色");
    }

    /** 整体保存状态、递增本地版本并清除快照缓存；不修改服务端资产版本。 */
    private commit(data: BagContents): void {
        this.data = Object.freeze(data);
        this.incrementVersion();
        this.cachedSnapshot = null;
    }
}
