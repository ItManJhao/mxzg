/**
 * 公会科技的协议入口，通过认证通道收发服务端整树与操作回执。
 * 中断时保留原请求号，确认钱包、背包和战力版本到达后再展示操作结果。
 */
import { RequestIdUtils } from "../../core/RequestIdUtils";
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type GuildTechnologyReceipt, type GuildTechnologyState, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountOperations } from "../account/AccountOperations";
import { GuildTechnologyModel } from "./GuildTechnologyModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "guild.technology.updated": undefined;
    }
}

type WriteProtocol = typeof Protocol.GUILD_TECHNOLOGY_UPGRADE | typeof Protocol.GUILD_TECHNOLOGY_RESET;

/** 保留确认时的预期版本，断线恢复时不得构造为新交易。 */
interface Pending {
    readonly protocol: WriteProtocol;
    readonly body: { requestId: string; profession: number; expectedVersion: number };
}

export class GuildTechnologyController extends BaseController {
    /** 当前应用的公会科技控制器。 */
    public static readonly instance = new GuildTechnologyController();

    /** 由应用提供的唯一账号通信入口。 */
    private operations: AccountOperations | null = null;
    /** 窗口打开期间才主动请求整树。 */
    private visible = false;
    /** 等待一次查询或写入回包，避免同一个窗口并发发起交易。 */
    private inFlight = false;
    /** 已发送尚未确认的写操作，网络超时或断线时等待重连补读。 */
    private pending: Pending | null = null;
    /** 已收到操作回包，正在等待同版资产整体同步。 */
    private awaitingAssets: GuildTechnologyReceipt | null = null;
    /** 应用确认的最新权威资产版本，随会话重置。 */
    private assetRevision = 0;
    /** 成员变更发生在在途操作期间时，需要在该操作完成后再读一次。 */
    private refreshQueued = false;

    /** 正在请求或恢复之前的操作时，页面保持等待状态。 */
    public get busy(): boolean {
        return this.inFlight || this.pending !== null;
    }

    /** 网络中断后允许手动恢复同一请求号。 */
    public get needsRetry(): boolean {
        return !this.inFlight && this.pending !== null && !this.awaitingAssets;
    }

    /** 装配当前应用的认证请求渠道。 */
    public configure(operations: AccountOperations): void {
        this.operations = operations;
    }

    /** 打开才读取科技树，关闭后不会发起新的读取。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.refreshVisible();
        } else {
            this.refreshQueued = false;
        }
    }

    /** 恢复鉴权或成员变更时重读当前科技状态，优先使用在途写操作的原请求号。 */
    public refreshVisible(): void {
        if (!this.visible) {
            return;
        }
        if (this.inFlight || this.awaitingAssets) {
            this.refreshQueued = true;
            return;
        }
        this.send();
    }

    /** 依当前权威进度只提交一次所选职业点亮。 */
    public upgrade(profession: number): void {
        this.write(Protocol.GUILD_TECHNOLOGY_UPGRADE, profession);
    }

    /** 重置报价可能因其他职业变化而更新，确认时必须仍是所见版本。 */
    public reset(profession: number, expectedVersion: number): void {
        this.write(Protocol.GUILD_TECHNOLOGY_RESET, profession, expectedVersion);
    }

    /** 钱包、贡献、战力和英雄面板同批到达后，交付点亮或重置结果。 */
    public observeAssets(revision: number): void {
        this.assetRevision = revision;
        const receipt = this.awaitingAssets;
        if (!receipt || receipt.assetRevision > this.assetRevision) {
            return;
        }
        try {
            GuildTechnologyModel.instance.commit(receipt.state);
        } catch (error) {
            // 状态推送可能在操作回包之后到达，校验失败同样解除本次等待并用只读请求恢复。
            this.onFailure(error);
            return;
        }
        this.finish();
        if (this.visible) {
            UIManager.instance.toast(receipt.action === "reset" ? "科技已重置，材料已返还" : "科技已点亮");
        }
    }

    /** 只在成功回包属于本模块时提交权威进度。 */
    public onNotify(name: ProtocolName, data: unknown): void {
        switch (name) {
            case Protocol.GUILD_TECHNOLOGY_INFO:
                GuildTechnologyModel.instance.commit(data as GuildTechnologyState);
                this.finish();
                break;
            case Protocol.GUILD_TECHNOLOGY_UPGRADE:
            case Protocol.GUILD_TECHNOLOGY_RESET:
                this.acceptReceipt(name, data as GuildTechnologyReceipt);
                break;
        }
    }

    /** 登记真实服务端支持的操作和读取消息。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.GUILD_TECHNOLOGY_INFO,
            Protocol.GUILD_TECHNOLOGY_UPGRADE, Protocol.GUILD_TECHNOLOGY_RESET]));
    }

    /** 角色身份切换时丢弃旧报价、旧操作和待展示回执。 */
    protected onResetSession(): void {
        this.visible = false;
        this.inFlight = false;
        this.pending = null;
        this.awaitingAssets = null;
        this.assetRevision = 0;
        this.refreshQueued = false;
        GuildTechnologyModel.instance.reset();
    }

    /** 应用销毁后释放账号通道。 */
    protected onDispose(): void {
        this.operations = null;
    }

    /** 以当前权威科技版本创建请求，过期重置确认应重新打开报价。 */
    private write(protocol: WriteProtocol, profession: number, expected?: number): void {
        const state = GuildTechnologyModel.instance.state;
        if (!this.operations || !state || this.busy) {
            return;
        }
        if (expected !== undefined && expected !== state.version) {
            UIManager.instance.toast("科技进度已变化，请重新确认重置");
            this.refreshVisible();
            return;
        }
        this.pending = { protocol, body: { requestId: RequestIdUtils.create(), profession, expectedVersion: state.version } };
        this.send();
    }

    /** 一次只请求一份整树或操作，回包经公共认证路由交付。 */
    private send(): void {
        if (!this.operations || !this.isInitialized || this.inFlight) {
            return;
        }
        this.inFlight = true;
        this.emit("guild.technology.updated", undefined);
        const pending = this.pending;
        void this.operations.deliver(pending?.protocol ?? Protocol.GUILD_TECHNOLOGY_INFO, pending?.body ?? {},
            frame => ProtocolRouter.instance.dispatch(this, frame), error => this.onFailure(error));
    }

    /** 验证操作身份和原提交版本，把回执留到对应资产快照可读。 */
    private acceptReceipt(name: WriteProtocol, receipt: GuildTechnologyReceipt): void {
        const pending = this.pending;
        const action = name === Protocol.GUILD_TECHNOLOGY_RESET ? "reset" : "upgrade";
        if (!pending || pending.protocol !== name || pending.body.requestId !== receipt.requestId
            || pending.body.profession !== receipt.profession || receipt.action !== action
            || receipt.version !== pending.body.expectedVersion + 1 || receipt.state.version < receipt.version
            || receipt.assetRevision < 1) {
            throw new Error("公会科技回执与本次请求不符");
        }
        this.inFlight = false;
        this.awaitingAssets = receipt;
        this.observeAssets(this.assetRevision);
    }

    /** 结束当前请求并刷新窗口，必要时补查在途期间的成员状态变化。 */
    private finish(): void {
        this.inFlight = false;
        this.pending = null;
        this.awaitingAssets = null;
        const refresh = this.refreshQueued;
        this.refreshQueued = false;
        this.emit("guild.technology.updated", undefined);
        if (refresh) {
            this.refreshVisible();
        }
    }

    /** 网络中断保留原操作，明确业务拒绝才结束并允许下一次确认。 */
    private onFailure(error: unknown): void {
        if (error instanceof SocketFailure && error.interrupted) {
            this.inFlight = false;
            this.emit("guild.technology.updated", undefined);
        } else {
            if (this.pending && this.visible) {
                this.refreshQueued = true;
            }
            this.finish();
        }
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "公会科技请求失败");
        }
    }
}
