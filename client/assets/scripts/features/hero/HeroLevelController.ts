/** 会话级普通升级协调：复用唯一名册和 Bag 串行资产入口，关闭窗口不丢写结果，换号拒绝迟到状态。 */
import { AccountModel } from "../account/AccountModel";
import { AccountService } from "../account/AccountService";
import { SessionChanged } from "../../framework/SessionChanged";
import { PausedInventoryUpdates, pausedInventoryUpdates } from "../PausedFeatures";
import { HeroRosterController } from "./HeroRosterController";
import { HeroLevelApi } from "./HeroLevelApi";
import type { HeroLevelPreview } from "./HeroLevelApi";
import { SocketFailure } from "../../platform/GameSocketClient";

export class HeroLevelController {
    private epoch = 0;
    private pending: Promise<HeroLevelPreview> | null = null;
    private attempt: { heroId: string; requestId: string; level: number } | null = null;
    private readonly off: () => void;

    /** 只持有升级操作状态；角色身份、名册及库存仍由原模块管理。 */
    /** 注入会话服务、唯一名册模块和升级接口；页面不持有或销毁名册。 */
    constructor(private readonly account: AccountModel, private readonly auth: AccountService, private readonly roster: HeroRosterController,
        private readonly api: HeroLevelApi, private readonly bag: PausedInventoryUpdates = pausedInventoryUpdates) {
        let role = account.snapshot.role?.id;
        this.off = account.subscribe(state => {
            if (state.busy || !state.role || state.role.id !== role) {
                this.epoch++;
                this.pending = null;
                this.attempt = null;
            }
            role = state.role?.id;
        });
    }

    /** 查询由当前会话授权；不将预览另存为英雄或库存缓存。 */
    async preview(heroId: string): Promise<HeroLevelPreview> {
        const epoch = this.epoch;
        if (this.pending) await this.pending.catch(() => {
        });
        if (epoch !== this.epoch) throw new SessionChanged();
        return this.auth.authenticated(token => this.api.preview(token, heroId));
    }

    /** 普通升级尚未迁移到统一协议，禁止使用旧资产回调更新名册或库存。 */
    upgrade(_heroId: string, _level: number): Promise<HeroLevelPreview> {
        return Promise.reject(new Error("英雄升级待按旧项目核对并接入新协议"));
    }

    /** 查询提交中状态，跨窗口也不能开始第二笔升级。 */
    get busy(): boolean {
        return !!this.pending;
    }

    /** 网络结果未确认时必须先重放原请求，即使查询显示满级或余额不足也允许确认。 */
    get needsConfirmation(): boolean {
        return !!this.attempt && !this.pending;
    }

    /** 仅应用销毁时解除会话观察；页面关闭不得调用。 */
    dispose(): void {
        this.off();
        this.epoch++;
        this.pending = null;
        this.attempt = null;
    }
}
