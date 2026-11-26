/**
 * 英雄宝石的认证请求和完成提示。提交后由现有英雄名册和背包快照刷新已镶状态。
 * 只持有待回包按钮状态，账号通道负责连接隔离和已有回包关联。
 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { BagItemCatalog } from "../bag/utils/BagItemCatalog";

/** 发给服务端的实际操作，单槽提交选择时的原宝石配置。 */
type JewelRequest =
    { action: "EQUIP"; heroId: string; itemId: number; slot: number; expectedItemId?: number }
    | { action: "UNEQUIP"; heroId: string; slot: number; expectedItemId: number }
    | { action: "EQUIP_ALL" | "UNEQUIP_ALL"; heroId: string }
    | { action: "COMBINE"; itemId: number; count: number }
    | { action: "COMBINE_ALL"; slot: number; expectedRevision?: number };

/** 本次回执供按钮与提示使用；资产仍由统一快照持有。 */
type JewelReceipt = JewelRequest & {
    readonly changed: boolean;
    readonly rewards: readonly { itemId: number; quantity: number }[];
};

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 宝石操作开始或失败时为空，成功时携带本次回执。 */
        "hero-jewel:updated": JewelReceipt | undefined;
    }
}

export class HeroJewelController extends BaseController {
    /** 详情页、宝石选择和合成使用同一个宝石协议入口。 */
    public static readonly instance = new HeroJewelController();

    /** 由现有应用装配的账号请求通道，销毁后释放。 */
    private operations: Pick<AccountOperations, "send"> | null = null;

    /** 等待单次宝石请求完成时为 true；回包或重置账号后清空。 */
    private waiting = false;

    /** 当前请求在途时，界面暂停重复提交。 */
    public get busy(): boolean {
        return this.waiting;
    }

    /** 装配统一认证与回包入口。 */
    public configure(operations: Pick<AccountOperations, "send">): void {
        this.operations = operations;
    }

    /** 这里只登记真实宝石回包，资产更新由名册和背包订阅同一快照。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.HERO_JEWEL_CHANGE]));
    }

    /** 用库存的一枚宝石镶入对应槽位，替换时提交所见原模板。 */
    public wear(heroId: string, itemId: number, slot: number, expectedItemId = 0): void {
        this.send({ action: "EQUIP", heroId, itemId, slot, ...(expectedItemId ? { expectedItemId } : {}) });
    }

    /** 卸下所见镶嵌槽中的原宝石，服务端核对后归还库存。 */
    public remove(heroId: string, slot: number, expectedItemId: number): void {
        this.send({ action: "UNEQUIP", heroId, slot, expectedItemId });
    }

    /** 一键镶嵌由服务端决定真实最优候选，卸下则处理全部已镶槽。 */
    public changeAll(heroId: string, wear: boolean): void {
        this.send({ action: wear ? "EQUIP_ALL" : "UNEQUIP_ALL", heroId });
    }

    /** 提交配方的目标宝石类型和目标数量，材料成本由服务端读表。 */
    public combine(itemId: number, count: number): void {
        this.send({ action: "COMBINE", itemId, count });
    }

    /** 连锁合成指定槽位的背包库存，提供版本时绑定玩家已确认的预览。 */
    public combineAll(slot: number, expectedRevision?: number): void {
        this.send({ action: "COMBINE_ALL", slot, ...(expectedRevision === undefined ? {} : { expectedRevision }) });
    }

    /** 成功结束按钮进度，提示本次合成净产物或穿脱结果。 */
    public onNotify(protocol: ProtocolName, body: unknown): void {
        switch (protocol) {
            case Protocol.HERO_JEWEL_CHANGE:
                this.onChanged(body as JewelReceipt);
                break;
        }
    }

    /** 切换账号时仅清理模块按钮，拒收旧回包由连接层负责。 */
    protected onResetSession(): void {
        this.waiting = false;
    }

    /** 应用退出后撤销请求入口。 */
    protected onDispose(): void {
        this.operations = null;
    }

    /** 同一操作只发一次，认证通道核对请求编号后再核对本次选择。 */
    private send(request: JewelRequest): void {
        if (this.waiting || !this.operations) {
            return;
        }
        this.waiting = true;
        EventDispatcher.instance.emit("hero-jewel:updated", undefined);
        this.operations.send(this, Protocol.HERO_JEWEL_CHANGE, request, error => {
            this.waiting = false;
            EventDispatcher.instance.emit("hero-jewel:updated", undefined);
            UIManager.instance.toast(error instanceof Error ? error.message : "宝石操作失败");
        }, value => {
            if (Object.entries(request).some(([key, expected]) => Reflect.get(value as object, key) !== expected)) {
                throw new Error("宝石回包与本次操作不符");
            }
        });
    }

    /** 显示实际结果，重复请求或库存变化从新版快照恢复。 */
    private onChanged(receipt: JewelReceipt): void {
        this.waiting = false;
        EventDispatcher.instance.emit("hero-jewel:updated", receipt);
        const combining = receipt.action === "COMBINE" || receipt.action === "COMBINE_ALL";
        if (!receipt.changed) {
            UIManager.instance.toast(combining ? "没有可合成的宝石" : "当前宝石无需调整");
            return;
        }
        if (combining) {
            const summary = receipt.rewards.map(item =>
                `${BagItemCatalog.face(item.itemId, item.quantity).title}×${item.quantity}`).join("、");
            UIManager.instance.toast(`合成获得 ${summary}`);
            return;
        }
        UIManager.instance.toast(receipt.action === "EQUIP" || receipt.action === "EQUIP_ALL" ? "宝石已镶嵌" : "宝石已卸下");
    }
}
