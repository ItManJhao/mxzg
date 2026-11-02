/** 会话级普通升级协调：复用唯一名册和 Bag 串行资产入口，关闭窗口不丢写结果，换号拒绝迟到状态。 */
import {AccountModel} from "../account/AccountModel";
import {AccountService, SessionChanged} from "../account/AccountService";
import {BagController} from "../Bag/BagController";
import {HeroRosterController} from "./HeroRosterController";
import {HeroLevelApi} from "./HeroLevelApi";
import type {HeroLevelPreview} from "./HeroLevelApi";
import {HttpFailure} from "../../platform/http/JsonClient";

export class HeroLevelController {
    private epoch = 0;
    private pending: Promise<HeroLevelPreview> | null = null;
    private attempt: { heroId: string; requestId: string; level: number } | null = null;
    private readonly off: () => void;

    /** 只持有升级操作状态；角色身份、名册及库存仍由原模块管理。 */
    /** 注入会话服务、唯一名册模块和升级接口；页面不持有或销毁名册。 */
    constructor(private readonly account: AccountModel, private readonly auth: AccountService, private readonly roster: HeroRosterController,
                private readonly api: HeroLevelApi, private readonly bag: BagController = BagController.instance) {
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

    /** 页面关闭仍保留操作；重复点击复用在途任务，不确定失败保留原标识以便超时重试。 */
    upgrade(heroId: string, level: number): Promise<HeroLevelPreview> {
        if (this.pending) return this.attempt?.heroId === heroId ? this.pending : Promise.reject(new Error("其他英雄升级提交中"));
        if (this.attempt && this.attempt.heroId !== heroId) return Promise.reject(new Error("请先重试上次未确认的英雄升级"));
        const attempt = this.attempt || {
            heroId, level, requestId: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                const n = Math.floor(Math.random() * 16);
                return (c === "x" ? n : (n & 3) | 8).toString(16);
            })
        };
        this.attempt = attempt;
        const epoch = this.epoch;
        this.roster.invalidateQueries();
        const promise = this.bag.runInventoryUpdate("hero-level:" + attempt.requestId,
            () => this.auth.authenticated(token => this.api.upgrade(token, attempt.heroId, attempt.requestId, attempt.level)),
            result => result.inventory,
            result => {
                this.auth.acceptRole(result.role);
                this.roster.accept(result.heroes);
            }, "consume")
            .then(result => {
                if (epoch === this.epoch) this.attempt = null;
                return result.preview;
            })
            .catch(error => {
                if (epoch === this.epoch && error instanceof HttpFailure && error.status >= 400 && error.status < 500) this.attempt = null;
                throw error;
            });
        this.pending = promise;
        const finish = () => {
            if (this.pending === promise) this.pending = null;
        };
        void promise.then(finish, finish);
        return promise;
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
