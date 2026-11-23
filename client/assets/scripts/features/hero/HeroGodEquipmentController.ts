/**
 * 英雄神装操作由共用认证通道发送。穿卸、探宝和商城的实际结果只写服务端，
 * 回包结束按钮等待，持有实例与每日状态由统一快照刷新。
 */
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { BagItemCatalog } from "../bag/utils/BagItemCatalog";
import type { HeroRosterModel } from "./HeroRosterModel";
import { HeroGodEquipmentUtils } from "./utils/HeroGodEquipmentUtils";

/** 一次穿戴或卸下的真实选择，换装同时核对已见槽位实例。 */
interface GodEquipmentChange {
    readonly heroId: string;
    readonly slot: number;
    readonly action: "EQUIP" | "UNEQUIP";
    readonly instanceId: string;
    readonly expectedInstanceId?: string;
}

/** 探宝真实扣钻和到账摘要，用于本次反馈。 */
interface GodEquipmentDrawReceipt {
    readonly count: number;
    readonly diamondsPaid: number;
    readonly rewards: readonly { templateId: number; quantity: number }[];
}

/** 商城确认和成功回包共用的请求参数。 */
interface GodEquipmentShopBuy {
    readonly productId: number;
    readonly count: number;
    readonly resetAt: number;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 神装操作等待状态变化，页面仍读同一名册快照。 */
        "hero-god-equipment:updated": undefined;
    }
}

export class HeroGodEquipmentController extends BaseController {
    /** 英雄详情和神装选择共用的单一协议入口。 */
    public static readonly instance = new HeroGodEquipmentController();
    /** 应用装配的认证长连接，销毁时解除。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 唯一英雄名册与神装状态，选择及卸下不会读缓存副本。 */
    private roster: HeroRosterModel | null = null;
    /** 唯一角色状态，用于展示真实解锁等级，销毁时解除。 */
    private account: AccountModel | null = null;
    /** 穿卸、探宝或商城在途为 true；回包、失败或账号重置后解除。 */
    private waiting = false;

    /** 让按钮避免重复提交。 */
    public get busy(): boolean {
        return this.waiting;
    }

    /** 注入共享账号、角色及英雄资产状态。 */
    public configure(operations: Pick<AccountOperations, "send">, model: HeroRosterModel, account: AccountModel): void {
        this.operations = operations;
        this.roster = model;
        this.account = account;
    }

    /** 读取真实解锁状态；只传星级时会额外检查英雄穿戴门槛。 */
    public gate(star?: number): string | null {
        const state = this.roster?.snapshot.godEquipment;
        const role = this.account?.snapshot.role;
        if (!state || !role) {
            return "神装状态待同步";
        }
        return HeroGodEquipmentUtils.gate(state, role.level, star);
    }

    /** 登记神装、探宝及商店的成功消息。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.HERO_GOD_EQUIPMENT_CHANGE,
            Protocol.HERO_GOD_EQUIPMENT_DRAW,
            Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY,
        ]));
    }

    /** 提交背包里的真实同位置神装，旧已穿实例随意图一起提交。 */
    public wear(heroId: string, slot: number, itemId: string): void {
        const state = this.roster?.snapshot.godEquipment;
        if (!HeroGodEquipmentUtils.candidates(state, slot).some(item => item.instanceId === itemId)) {
            UIManager.instance.toast("神装状态已变化");
            return;
        }
        const expected = HeroGodEquipmentUtils.worn(state, heroId, slot);
        this.change({ heroId, slot, action: "EQUIP", instanceId: itemId, expectedInstanceId: expected?.instanceId });
    }

    /** 提交当前已穿实例，服务器重新检查关联后返还到同一背包。 */
    public remove(heroId: string, slot: number): void {
        const current = HeroGodEquipmentUtils.worn(this.roster?.snapshot.godEquipment, heroId, slot);
        if (!current) {
            UIManager.instance.toast("当前部位未穿神装");
            return;
        }
        this.change({ heroId, slot, action: "UNEQUIP", instanceId: current.instanceId });
    }

    /** 总价由界面确认后发送，0 表示本次只允许免费或消耗道具。 */
    public draw(count: 1 | 10, maxDiamonds: number): void {
        if (!this.operations || this.waiting) {
            return;
        }
        this.setWaiting(true);
        this.operations.send(this, Protocol.HERO_GOD_EQUIPMENT_DRAW, { count, maxDiamonds },
            error => this.onFailure(error), value => {
                const receipt = value as GodEquipmentDrawReceipt;
                if (receipt.count !== count || receipt.diamondsPaid > maxDiamonds) {
                    throw new Error("神装探宝回包与本次支付意图不符");
                }
            });
    }

    /** 商城仅提交真实商品、份数及玩家所见的自然日周期。 */
    public buy(productId: number, count: number, resetAt: number): void {
        if (!this.operations || this.waiting) {
            return;
        }
        this.setWaiting(true);
        this.operations.send(this, Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY, { productId, count, resetAt },
            error => this.onFailure(error), value => {
                const receipt = value as GodEquipmentShopBuy & { purchased: number };
                if (receipt.productId !== productId || receipt.count !== count || receipt.resetAt !== resetAt
                        || !Number.isSafeInteger(receipt.purchased) || receipt.purchased < count) {
                    throw new Error("神装商城回包与本次购买不符");
                }
            });
    }

    /** 成功回包只处理操作反馈，库存和英雄属性由统一快照提交。 */
    public onNotify(name: ProtocolName, data: unknown): void {
        switch (name) {
            case Protocol.HERO_GOD_EQUIPMENT_CHANGE:
                this.onChanged(data as GodEquipmentChange);
                break;
            case Protocol.HERO_GOD_EQUIPMENT_DRAW:
                this.onDrawn(data as GodEquipmentDrawReceipt);
                break;
            case Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY:
                // 展示由通用发奖处理，商城购买次数随同一快照生效。
                this.setWaiting(false);
                break;
        }
    }

    /** 同样核对具体槽位及已见实例，错回包不触发任何 UI 成功反馈。 */
    private change(request: GodEquipmentChange): void {
        if (!this.operations || this.waiting) {
            return;
        }
        this.setWaiting(true);
        this.operations.send(this, Protocol.HERO_GOD_EQUIPMENT_CHANGE, request,
            error => this.onFailure(error), value => {
                const receipt = value as GodEquipmentChange;
                if (receipt.heroId !== request.heroId || receipt.slot !== request.slot || receipt.action !== request.action
                    || receipt.instanceId !== request.instanceId || receipt.expectedInstanceId !== request.expectedInstanceId) {
                    throw new Error("神装穿卸回包与本次选择不符");
                }
            });
    }

    /** 告知原操作已经提交，已有红点和属性随名册刷新。 */
    private onChanged(receipt: GodEquipmentChange): void {
        this.setWaiting(false);
        UIManager.instance.toast(receipt.action === "EQUIP" ? "已穿戴神装" : "已卸下神装");
    }

    /** 反馈实际得到的当次探宝结果，不从库存变动猜测。 */
    private onDrawn(receipt: GodEquipmentDrawReceipt): void {
        this.setWaiting(false);
        const rewards = receipt.rewards.map(reward => {
            const face = BagItemCatalog.face(reward.templateId, reward.quantity);
            return `${face.title} ×${reward.quantity}`;
        });
        UIManager.instance.toast("探宝获得 " + rewards.join("、"));
    }

    /** 普通业务或网络拒绝均释放本次等待并用通用提示。 */
    private onFailure(error: unknown): void {
        this.setWaiting(false);
        const message = error instanceof SocketFailure && error.interrupted
            ? "神装操作结果待同步，重连后请查看神装状态"
            : error instanceof Error ? error.message : "神装操作失败";
        UIManager.instance.toast(message);
    }

    /** 在途状态交给当前订阅页面，换号时不会留下可交付的旧请求。 */
    private setWaiting(waiting: boolean): void {
        this.waiting = waiting;
        this.emit("hero-god-equipment:updated", undefined);
    }

    /** 账号会话重置时清理等待标志。 */
    protected onResetSession(): void {
        this.setWaiting(false);
    }

    /** 整个应用销毁时释放认证及名册持有。 */
    protected onDispose(): void {
        this.operations = null;
        this.roster = null;
        this.account = null;
    }
}
