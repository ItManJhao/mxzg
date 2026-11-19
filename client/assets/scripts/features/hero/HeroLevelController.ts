/**
 * 读取英雄和余额快照供详情显示升级消耗，每次点击只发送一次普通升级。
 * 成功回包用于本次光效，实际等级和余额由服务端统一快照更新。
 */
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { BagModel } from "../bag/BagModel";
import { HeroLevelData } from "./data/HeroLevelData";
import type { HeroLevelReceipt } from "./data/HeroLevelData";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroLevelEvent } from "./utils/HeroLevelEvent";
import { HeroLevelQuoteUtils, type HeroLevelQuote } from "./utils/HeroLevelQuoteUtils";

export class HeroLevelController extends BaseController {
    /** 应用的普通升级入口，详情页共用。 */
    public static readonly instance = new HeroLevelController(HeroRosterModel.instance, BagModel.instance);

    /** 旧版普通升级消耗的英雄经验物品配置编号。 */
    private static readonly EXPERIENCE_ITEM_ID = 900101;

    /** 应用提供的账号请求入口，在销毁时释放。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 应用提供的角色快照，报价读取其中的金币。 */
    private account: AccountModel | null = null;
    /** 发出升级指令后禁用连续点击，成功、失败或模块重置时解除。 */
    private upgrading = false;

    /**
     * @param roster 提供英雄当前等级。
     * @param bag 提供英雄经验物品的当前数量。
     */
    public constructor(
        private readonly roster: HeroRosterModel,
        private readonly bag: BagModel,
    ) {
        super();
    }

    /** 注入发送升级指令的账号通道和报价使用的角色资料。 */
    public configure(operations: Pick<AccountOperations, "send">, account: AccountModel): void {
        this.operations = operations;
        this.account = account;
    }

    /** 模块开启时登记普通升级的即时回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.HERO_LEVEL_UPGRADE]));
    }

    /** 用当前资产快照计算费用；等待升级回包时禁用按钮。 */
    public describe(heroId: string): HeroLevelQuote {
        const hero = this.roster.snapshot.heroes.find(row => row.id === heroId);
        const gold = this.account?.snapshot.role?.gold ?? -1;
        const heroExp = this.bag.snapshot.synced ? this.bag.quantity(HeroLevelController.EXPERIENCE_ITEM_ID) : -1;
        const quote = HeroLevelQuoteUtils.describe(hero, gold, heroExp);
        return hero && this.upgrading ? { ...quote, status: "pending" } : quote;
    }

    /** 根据当前英雄报价发送一次升级指令，等待回包时忽略连点。 */
    public upgrade(heroId: string): void {
        if (this.upgrading) {
            return;
        }
        const operations = this.operations;
        const quote = this.describe(heroId);
        if (!operations || quote.status === "unavailable" || quote.fromLevel === null) {
            UIManager.instance.toast("升级条件待同步");
            return;
        }
        const request = {
            heroId,
            expectedLevel: quote.fromLevel,
            levels: quote.levels || 1,
        };
        this.upgrading = true;
        this.emit(HeroLevelEvent.Updated, {});
        operations.send(this, Protocol.HERO_LEVEL_UPGRADE, request, error => this.onUpgradeFailed(error), receipt => {
            if (!HeroLevelData.matches(request, receipt as HeroLevelReceipt)) {
                throw new Error("升级回执与本次请求不符");
            }
        });
    }

    /** 收到匹配的成功回包后解除等待，通知英雄详情播放本次升级光效。 */
    public onNotify(name: ProtocolName, body: unknown): void {
        if (name === Protocol.HERO_LEVEL_UPGRADE) {
            const { heroId, fromLevel, toLevel } = body as HeroLevelReceipt;
            this.upgrading = false;
            this.emit(HeroLevelEvent.Updated, { heroId, fromLevel, toLevel });
        }
    }

    /** 升级未收到有效结果时恢复按钮，提示服务端原因或等待重连同步。 */
    private onUpgradeFailed(error: unknown): void {
        this.upgrading = false;
        this.emit(HeroLevelEvent.Updated, {});
        const message = error instanceof SocketFailure && error.interrupted
            ? "升级结果待同步，恢复连接后请查看英雄等级"
            : error instanceof Error ? error.message : "英雄升级失败";
        UIManager.instance.toast(message);
    }

    /** 角色数据重置时清除升级按钮的等待状态。 */
    protected onResetSession(): void {
        this.upgrading = false;
        this.emit(HeroLevelEvent.Updated, {});
    }

    /** 应用销毁后释放账号请求入口和报价引用。 */
    protected onDispose(): void {
        this.account = null;
        this.operations = null;
    }
}
