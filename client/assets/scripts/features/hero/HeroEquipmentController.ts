/** 普通装备的协议入口。提交穿脱操作并通知页面，库存和槽位由统一快照更新。 */
import { BaseController } from "../../framework/BaseController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import type { HeroEquipment } from "./utils/HeroEquipmentUtils";

/** 指令数据中的装备编号取自库存或当前已穿槽位。 */
type EquipmentChange = { heroId: string } & (
    { action: "EQUIP"; equipmentId: string }
    | { action: "UNEQUIP"; equipmentId: string; slot: number; expectedTemplateId: number }
    | { action: "EQUIP_ALL" | "UNEQUIP_ALL" }
);

/** 只用于请求结束和反馈，实际资产由原 Model 持有。 */
type EquipmentReceipt = EquipmentChange & { readonly changed: boolean };

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 按钮等待状态变化或收到本次装备操作结果。 */
        "hero-equipment:updated": EquipmentReceipt | undefined;
    }
}

export class HeroEquipmentController extends BaseController {
    /** 提供详情页和装备子窗共用的协议入口。 */
    public static readonly instance = new HeroEquipmentController();
    /** 应用装配的认证请求通道，退出场景后释放。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 当前有装备指令在途时为 true，回包或会话重置后解除。 */
    private waiting = false;

    /** 供装备按钮显示本次提交进度。 */
    public get busy(): boolean {
        return this.waiting;
    }

    /** 使用应用共用的账号通道。 */
    public configure(operations: Pick<AccountOperations, "send">): void {
        this.operations = operations;
    }

    /** 登记装备操作的成功回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.HERO_EQUIPMENT_CHANGE]));
    }

    /** 穿戴库存中的一件装备，部位和替换由服务端决定。 */
    public equip(heroId: string, equipmentId: string): void {
        this.send({ heroId, action: "EQUIP", equipmentId });
    }

    /** 卸下当前槽位选中的装备，服务端核对槽位和装备配置。 */
    public unequip(heroId: string, equipment: HeroEquipment): void {
        this.send({ heroId, action: "UNEQUIP", equipmentId: equipment.instanceId,
            slot: equipment.slot, expectedTemplateId: equipment.templateId });
    }

    /** 一次提交全部普通槽位，由服务端择优穿装或完整卸下。 */
    public changeAll(heroId: string, wear: boolean): void {
        this.send({ heroId, action: wear ? "EQUIP_ALL" : "UNEQUIP_ALL" });
    }

    /** 成功只结束操作并发布反馈，槽位和库存等待统一资产快照。 */
    public onNotify(name: ProtocolName, body: unknown): void {
        if (name === Protocol.HERO_EQUIPMENT_CHANGE) {
            const receipt = body as EquipmentReceipt;
            this.waiting = false;
            EventDispatcher.instance.emit("hero-equipment:updated", receipt);
            if (!receipt.changed) {
                UIManager.instance.toast(receipt.action === "EQUIP_ALL" ? "没有可提升的装备" : "装备未发生变化");
            }
        }
    }

    /** 每次点击只发一包；账号层校验请求编号，再核对此次选择。 */
    private send(request: EquipmentChange): void {
        if (this.waiting || !this.operations) {
            return;
        }
        this.waiting = true;
        EventDispatcher.instance.emit("hero-equipment:updated", undefined);
        this.operations.send(this, Protocol.HERO_EQUIPMENT_CHANGE, request, error => {
            this.waiting = false;
            EventDispatcher.instance.emit("hero-equipment:updated", undefined);
            UIManager.instance.toast(error instanceof Error ? error.message : "装备操作失败");
        }, value => {
            const receipt = value as EquipmentReceipt;
            if (Object.entries(request).some(([key, expected]) => Reflect.get(receipt, key) !== expected)) {
                throw new Error("装备回包与本次操作不符");
            }
        });
    }

    /** 账号变化时结束当前等待；连接层负责隔离旧回包。 */
    protected onResetSession(): void {
        this.waiting = false;
    }

    /** 应用退出时释放账号请求通道。 */
    protected onDispose(): void {
        this.operations = null;
    }
}
