/** 公会协议入口，提交玩家操作、接收公会状态，并通知当前页面。 */
import { BaseController } from "../../framework/BaseController";
import { RedDotManager } from "../../framework/ui/RedDotManager";
import { UIManager } from "../../framework/ui/UIManager";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { GameRedDotKey } from "../common/utils/GameRedDotKey";
import { GuildModel, type GuildState } from "./GuildModel";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "guild.updated": undefined;
    }
}

/** 服务端校验的公会变更意图，模板字段只随实际操作发送。 */
export type GuildChange =
    | { readonly action: "CREATE"; readonly name: string; readonly description?: string; readonly badgeId?: number }
    | { readonly action: "APPLY"; readonly guildId: string }
    | { readonly action: "APPROVE" | "REJECT"; readonly guildId: string; readonly applicantId: string }
    | { readonly action: "LEAVE"; readonly guildId: string };

export class GuildController extends BaseController {
    /** 由应用装配的公会模块入口。 */
    public static readonly instance = new GuildController();

    /** 账号层认证操作，应用卸载时释放。 */
    private operations: AccountOperations | null = null;
    /** 统一角色快照，用来限定大厅外的审批提醒查询。 */
    private account: Pick<AccountModel, "snapshot"> | null = null;
    /** 主城打开后为 true，允许已加入公会的角色在大厅外查询审批状态。 */
    private homeReady = false;
    /** 公会大厅可见时为 true，允许查看目录和当前搜索。 */
    private visible = false;
    /** 保存本次在途操作。空值表示界面可操作，申请成功时按原版给出飘字。 */
    private pending: "LIST" | GuildChange["action"] | null = null;
    /** 请求期间收到变化后，在原操作结束时补看服务器一次。 */
    private refreshQueued = false;
    /** 目录当前的查找条件，仅在显示期用于恢复目录。 */
    private query = "";
    /** 目录当前请求的页码，从 1 开始。 */
    private page = 1;

    /** 由应用注入统一发包入口和成员身份来源。 */
    public configure(operations: AccountOperations, account: Pick<AccountModel, "snapshot">): void {
        this.operations = operations;
        this.account = account;
    }

    /** 返回按钮与输入当前是否应等待回包。 */
    public get busy(): boolean {
        return this.pending !== null;
    }

    /** 底栏就绪后首次校准审批提醒，重复通知主城就绪时复用当前结果。 */
    public setHomeReady(ready: boolean): void {
        if (this.homeReady === ready) {
            return;
        }
        this.homeReady = ready;
        if (ready && !this.visible) {
            this.refreshGuild();
        }
    }

    /** 重连后重新确认审批，公会身份变更时先熄灭旧提醒。 */
    public refreshRoleState(authenticated: boolean, membershipChanged: boolean): void {
        if (membershipChanged) {
            this.updateApplicationDot(null);
        }
        if (authenticated || (membershipChanged && !this.visible)) {
            this.refreshGuild();
        }
    }

    /** 开页读取大厅或目录；关闭后只有公会成员可继续刷新审批。 */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            this.query = "";
            this.page = 1;
            GuildModel.instance.replace(null);
            this.refreshGuild();
        } else if (!this.canRefreshReminder()) {
            this.refreshQueued = false;
        }
    }

    /** 提交新搜索或翻页，目录以服务端结果为准。 */
    public list(query: string, page: number): void {
        if (this.pending) {
            return;
        }
        this.query = query.trim();
        this.page = page;
        this.refreshGuild();
    }

    /** 大厅外只为已入会、能看到底栏的角色读取公会状态。 */
    private canRefreshReminder(): boolean {
        return this.homeReady && !!this.account?.snapshot.role?.guildName;
    }

    /** 复用公会列表协议，按当前页面状态读取目录或公会待审名单。 */
    private refreshGuild(): void {
        if (!this.operations || (!this.visible && !this.canRefreshReminder())) {
            return;
        }
        if (this.pending) {
            this.refreshQueued = true;
            return;
        }
        this.begin("LIST");
        const query = this.visible ? { query: this.query, page: this.page } : { query: "", page: 1 };
        void this.operations.deliver(Protocol.GUILD_LIST, query,
            frame => ProtocolRouter.instance.dispatch(this, frame), this.visible ? this.onFailed : () => this.finish());
    }

    /** 使用统一认证通道发送本次创建、申请、审批或退出。 */
    public change(command: GuildChange): void {
        if (!this.operations || this.pending) {
            return;
        }
        this.begin(command.action);
        this.operations.send(this, Protocol.GUILD_CHANGE, command, this.onFailed);
    }

    /** 提交服务端公会状态并反馈申请结果，其他角色的推送只触发刷新。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.GUILD_UPDATED:
                this.refreshGuild();
                return;
            case Protocol.GUILD_LIST: {
                const state = data as GuildState;
                GuildModel.instance.replace(state);
                this.page = state.page;
                if (state.guild) {
                    this.query = "";
                }
                this.updateApplicationDot(state);
                this.finish();
                return;
            }
            case Protocol.GUILD_CHANGE: {
                const applied = this.pending === "APPLY";
                const state = data as GuildState;
                const previous = GuildModel.instance.snapshot;
                if (!state.guild && !previous?.guild && this.visible && (this.query || this.page > 1)) {
                    // 变更回包的默认目录没有当前搜索条件，保留本页并重新读取命中的公会。
                    GuildModel.instance.replace({
                        ...state,
                        guilds: previous?.guilds ?? [],
                        page: this.page,
                        hasMore: previous?.hasMore ?? false,
                    });
                    this.refreshQueued = true;
                } else {
                    GuildModel.instance.replace(state);
                    this.page = state.page;
                    if (state.guild || previous?.guild) {
                        this.query = "";
                    }
                }
                this.updateApplicationDot(state);
                this.finish();
                if (applied && this.visible) {
                    UIManager.instance.toast("入会申请已发送");
                }
                return;
            }
        }
    }

    /** 使用当前公会的实际审批名单点亮底栏，退会后即使收到原查询回复也不恢复旧提醒。 */
    private updateApplicationDot(state: GuildState | null): void {
        const role = this.account?.snapshot.role;
        const sameGuild = !!state?.guild && role?.guildName === state.guild.name;
        RedDotManager.instance.set(GameRedDotKey.GUILD_APPLICATIONS,
            sameGuild && GuildModel.canApprove(state, role?.id) && state.applications.length > 0);
    }

    /** 按一次应用生命周期登记公会回包和变化推送。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this,
            [Protocol.GUILD_LIST, Protocol.GUILD_CHANGE, Protocol.GUILD_UPDATED]));
    }

    /** 换号后清除审批提醒、目录和在途界面进度，旧回包由连接层隔离。 */
    protected onResetSession(): void {
        this.visible = false;
        this.homeReady = false;
        this.pending = null;
        this.refreshQueued = false;
        this.query = "";
        this.page = 1;
        GuildModel.instance.replace(null);
        this.updateApplicationDot(null);
    }

    /** 场景退出时释放发包依赖。 */
    protected onDispose(): void {
        this.operations = null;
        this.account = null;
    }

    /** 记录已发送的操作，然后通知页面暂时阻止重复点击。 */
    private begin(action: NonNullable<GuildController["pending"]>): void {
        this.pending = action;
        this.emit("guild.updated", undefined);
    }

    /** 恢复可点击状态，合并请求期间的多个刷新触发。 */
    private finish(): void {
        this.pending = null;
        this.emit("guild.updated", undefined);
        if (this.refreshQueued) {
            this.refreshQueued = false;
            this.refreshGuild();
        }
    }

    /** 失败交给全局提示，本页面关闭后只释放在途状态。 */
    private readonly onFailed = (error: unknown): void => {
        this.finish();
        if (this.visible) {
            UIManager.instance.toast(error instanceof Error ? error.message : "公会请求失败，请重试");
        }
    };
}
