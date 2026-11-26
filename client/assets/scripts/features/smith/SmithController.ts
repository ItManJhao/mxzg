/**
 * 铁匠铺装备请求入口。使用当前会话预演一键合成，提交已确认的配方及原资产版本。
 * 断线时保留未确认的原请求号；货币、库存和奖励结果由应用统一交付。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { SmithModel, type SmithPreview, type SmithReceipt } from "./SmithModel";

/** 同一个业务请求号和原字段在重连时原样重发。 */
type SmithCommand =
    | { readonly name: typeof Protocol.SMITH_FORGE; readonly body: { requestId: string; itemId: number; count: number } }
    | { readonly name: typeof Protocol.SMITH_FORGE_ALL; readonly body: { requestId: string; slot: number; expectedRevision: number } };

/** 预演可丢弃，成交需要确认最终回执。 */
type SmithOperation = SmithCommand
    | { readonly name: typeof Protocol.SMITH_PREVIEW; readonly body: { slot: number } };

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        /** 预演、提交或重连改变了当前铁匠铺按钮或确认状态。 */
        "smith:updated": undefined;
    }
}

export class SmithController extends BaseController {
    /** 主城铁匠铺已装配的共享入口。 */
    public static readonly instance = new SmithController();

    /** 应用注入的认证连接，应用销毁后释放。 */
    private operations: Pick<AccountOperations, "deliver"> | null = null;
    /** 读取统一资产的真实持久版本，未完成初始化时为空。 */
    private readAssetRevision: (() => number) | null = null;
    /** 当前在途预演或成交，回复、失败或换号后清空。 */
    private pending: SmithOperation | null = null;
    /** 尚未收到确定回执的成交，准备在同角色重连时恢复。 */
    private unconfirmed: SmithCommand | null = null;

    /** 注入统一认证和当前已接纳的资产版本读口。 */
    public configure(operations: Pick<AccountOperations, "deliver">, readAssetRevision: () => number): void {
        this.operations = operations;
        this.readAssetRevision = readAssetRevision;
    }

    /** 返回应用已经接纳的服务端资产版本，供宝石预览确认时使用。 */
    public get assetRevision(): number {
        return this.readAssetRevision?.() ?? 0;
    }

    /** 有待交付的预演或结算时，等待原操作结束后才接受新的提交。 */
    public get busy(): boolean {
        return this.pending !== null || this.unconfirmed !== null;
    }

    /** 请求服务端计算一次已有资产可完成的一键合成。 */
    public previewAll(slot: number): void {
        if (this.busy || !this.operations) {
            return;
        }
        SmithModel.instance.replacePreview(null);
        this.send({ name: Protocol.SMITH_PREVIEW, body: { slot } });
    }

    /** 提交选中的目标配置及次数，材料和金币均由服务端按配方重算。 */
    public forge(itemId: number, count: number): void {
        if (this.busy || !this.operations) {
            return;
        }
        this.submit({ name: Protocol.SMITH_FORGE, body: { requestId: RequestIdUtils.create(), itemId, count } });
    }

    /** 按当前确认窗口的原资产版本尝试结算，服务端再次检查时效。 */
    public forgeAll(slot: number, expectedRevision: number): void {
        if (this.busy || !this.operations) {
            return;
        }
        const preview = SmithModel.instance.preview;
        if (!preview || preview.slot !== slot || preview.assetRevision !== expectedRevision
                || preview.rewards.length === 0 || expectedRevision !== this.assetRevision) {
            SmithModel.instance.replacePreview(null);
            this.emit("smith:updated", undefined);
            UIManager.instance.toast("库存已变化，请重新预览合成");
            return;
        }
        this.submit({
            name: Protocol.SMITH_FORGE_ALL,
            body: { requestId: RequestIdUtils.create(), slot, expectedRevision },
        });
    }

    /** 应用重新认证同一角色后，用原编号恢复尚未确定的成交。 */
    public resume(): void {
        if (this.operations && !this.pending && this.unconfirmed) {
            this.send(this.unconfirmed);
        }
    }

    /** 分发已认证且已核对原请求的预演或回执。 */
    public onNotify(protocol: ProtocolName, body: unknown): void {
        switch (protocol) {
            case Protocol.SMITH_PREVIEW:
                this.onPreview(body as SmithPreview);
                break;
            case Protocol.SMITH_FORGE:
            case Protocol.SMITH_FORGE_ALL:
                this.onSettled();
                break;
        }
    }

    /** 初始化只注册协议，预览和结算由玩家操作驱动。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.SMITH_PREVIEW, Protocol.SMITH_FORGE, Protocol.SMITH_FORGE_ALL,
        ]));
    }

    /** 换号时清理原角色的报价和未结算意图，连接层隔离迟到回包。 */
    protected onResetSession(): void {
        this.pending = null;
        this.unconfirmed = null;
        SmithModel.instance.replacePreview(null);
    }

    /** 仅应用退出时撤销统一认证和版本读口。 */
    protected onDispose(): void {
        this.operations = null;
        this.readAssetRevision = null;
    }

    /** 在发出成交前冻结原业务请求，避免断线后重新生成编号。 */
    private submit(command: SmithCommand): void {
        SmithModel.instance.replacePreview(null);
        this.unconfirmed = command;
        this.send(command);
    }

    /** 发出当前操作，只接受仍属于该操作的预演或回执。 */
    private send(operation: SmithOperation): void {
        this.pending = operation;
        this.emit("smith:updated", undefined);
        void this.operations!.deliver(operation.name, operation.body, frame => {
            if (this.pending !== operation) {
                return;
            }
            this.validateReply(operation, frame.body);
            ProtocolRouter.instance.dispatch(this, frame);
        }, error => this.onFailed(operation, error));
    }

    /** 预演核部位，结算核请求号及原配方或资产版本。 */
    private validateReply(operation: SmithOperation, body: unknown): void {
        if (operation.name === Protocol.SMITH_PREVIEW) {
            if ((body as SmithPreview).slot !== operation.body.slot) {
                throw new SocketFailure("INVALID_MESSAGE", "合成预演与所选部位不符");
            }
            return;
        }
        const receipt = body as SmithReceipt;
        if (receipt.requestId !== operation.body.requestId
                || (operation.name === Protocol.SMITH_FORGE
                    && (receipt.itemId !== operation.body.itemId || receipt.count !== operation.body.count))
                || (operation.name === Protocol.SMITH_FORGE_ALL
                    && (receipt.slot !== operation.body.slot || receipt.assetRevision <= operation.body.expectedRevision))) {
            throw new SocketFailure("INVALID_MESSAGE", "装备合成回执与原请求不符");
        }
    }

    /** 存放当前服务端预演，通知界面选择是否打开确认窗口。 */
    private onPreview(preview: SmithPreview): void {
        this.pending = null;
        SmithModel.instance.replacePreview(preview);
        this.emit("smith:updated", undefined);
    }

    /** 完成操作，资产快照和实际到账奖励由服务端在提交后统一交付。 */
    private onSettled(): void {
        this.pending = null;
        this.unconfirmed = null;
        this.emit("smith:updated", undefined);
    }

    /** 确定拒绝后释放原操作，断线导致结果未知时用原编号恢复。 */
    private onFailed(operation: SmithOperation, error: unknown): void {
        if (this.pending !== operation) {
            return;
        }
        this.pending = null;
        if (!(error instanceof SocketFailure && error.interrupted)) {
            this.unconfirmed = null;
        }
        this.emit("smith:updated", undefined);
        UIManager.instance.toast(error instanceof Error ? error.message : "装备合成请求失败");
    }
}
