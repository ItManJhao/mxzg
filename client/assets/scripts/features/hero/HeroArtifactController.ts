/**
 * 圣器界面唯一的交易协议入口。
 * 回执释放在途操作，背包与佩戴只由同步后的角色快照刷新。
 */
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { BagModel } from "../bag/BagModel";

/** 与服务端圣器操作一一对应。 */
export type HeroArtifactAction = "ACTIVATE" | "EQUIP" | "UNEQUIP" | "UPGRADE" | "TRANSFORM";

/** 请求只包含界面选择到的英雄、实例和素材，成本由服务端查表。 */
export interface HeroArtifactRequest {
    readonly action: HeroArtifactAction;
    readonly heroId: string;
    readonly slot: number;
    readonly instanceId?: string;
    readonly expectedInstanceId?: string;
    readonly targetTemplateId?: number;
    readonly materialInstanceIds?: readonly string[];
    readonly materialHeroIds?: readonly string[];
    readonly replacementItemIds?: readonly number[];
}

/** 每条回包与本次真实圣器动作关联。 */
interface HeroArtifactReceipt {
    readonly action: HeroArtifactAction;
    readonly heroId: string;
    readonly slot: number;
    readonly instanceId: string;
    readonly templateId: number;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 交易等待状态变化，实际穿戴仍由名册通知更新。 */
        "hero.artifact.updated": undefined;
    }
}

export class HeroArtifactController extends BaseController {
    /** 应用唯一圣器模块；多个详情窗不会重复注册协议。 */
    public static readonly instance = new HeroArtifactController();
    /** 暴露给英雄页和圣器窗的在途状态事件名。 */
    public static readonly Updated = "hero.artifact.updated";
    /** 失败反馈使用前端可读统一提示。 */
    private static readonly feedback: Readonly<Record<HeroArtifactAction, string>> = {
        ACTIVATE: "圣器槽已激活", EQUIP: "已佩戴圣器", UNEQUIP: "已卸下圣器",
        UPGRADE: "圣器升星成功", TRANSFORM: "圣器转换成功",
    };

    /** 当前统一认证通道，模块退出后清除。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 当前角色钻石钱包，未同步时消费入口等待。 */
    private account: AccountModel | null = null;
    /** 交易已发未结束，回执、失败和账号重置后释放。 */
    private waiting = false;

    /** 应用装配注入唯一账号通道和角色状态。 */
    public configure(operations: Pick<AccountOperations, "send">, account: AccountModel): void {
        this.operations = operations;
        this.account = account;
    }

    /** 提供当前动作正在提交的状态。 */
    public get busy(): boolean {
        return this.waiting;
    }

    /** 取唯一钱包或实际普通库存，未同步按无可用金额显示。 */
    public balance(itemId: number): number {
        if (itemId === 900002) {
            return this.account?.snapshot.role?.diamonds ?? 0;
        }
        return itemId > 0 ? BagModel.instance.quantity(itemId) : 0;
    }

    /** 提交已由页面选择的真实实例，确认收据仍对应相同英雄和动作。 */
    public change(request: HeroArtifactRequest): void {
        const operations = this.operations;
        if (!operations || this.waiting) {
            return;
        }
        this.setWaiting(true);
        operations.send(this, Protocol.HERO_ARTIFACT_CHANGE, request, error => this.onFailure(error), value => {
            const receipt = value as HeroArtifactReceipt;
            if (receipt.action !== request.action || receipt.heroId !== request.heroId || receipt.slot !== request.slot
                || (request.instanceId !== undefined && receipt.instanceId !== request.instanceId)
                || (request.targetTemplateId !== undefined && receipt.templateId !== request.targetTemplateId)) {
                throw new Error("圣器回包与本次请求不符");
            }
        });
    }

    /** 根据登记的操作回包反馈结果，数据面板由后续统一快照维护。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.HERO_ARTIFACT_CHANGE:
                this.onChanged(data as HeroArtifactReceipt);
                break;
        }
    }

    /** 将圣器业务回包登记到应用共享路由。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.HERO_ARTIFACT_CHANGE]));
    }

    /** 清除该模块的交易等待，旧会话回包由共享通道取消交付。 */
    protected onResetSession(): void {
        this.setWaiting(false);
    }

    /** 退出模块时解除应用注入的认证和余额引用。 */
    protected onDispose(): void {
        this.operations = null;
        this.account = null;
    }

    /** 交易真实成功后交付操作结果文案。 */
    private onChanged(receipt: HeroArtifactReceipt): void {
        this.setWaiting(false);
        UIManager.instance.toast(HeroArtifactController.feedback[receipt.action]);
    }

    /** 失败释放重复点击保护，保留服务端反馈，不预写资产状态。 */
    private onFailure(error: unknown): void {
        this.setWaiting(false);
        UIManager.instance.toast(error instanceof Error ? error.message : "圣器操作失败");
    }

    /** 向当前界面广播操作等待状态。 */
    private setWaiting(waiting: boolean): void {
        this.waiting = waiting;
        this.emit(HeroArtifactController.Updated, undefined);
    }
}
