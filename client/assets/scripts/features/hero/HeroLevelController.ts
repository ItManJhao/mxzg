/**
 * 读取英雄和余额快照供详情显示普通升级与强化进阶的条件，每次点击发送一次请求。
 * 成功回包用于光效，实际成长和余额由服务端统一快照更新。
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
import type { HeroLevelReceipt, HeroStageReceipt } from "./data/HeroLevelData";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroLevelEvent } from "./utils/HeroLevelEvent";
import { HeroLevelQuoteUtils, type HeroLevelQuote, type HeroStageQuote } from "./utils/HeroLevelQuoteUtils";

export class HeroLevelController extends BaseController {
    /** 应用的普通升级和强化进阶入口，详情页共用。 */
    public static readonly instance = new HeroLevelController(HeroRosterModel.instance, BagModel.instance);

    /** 应用提供的账号请求入口，在销毁时释放。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 应用提供的角色快照，报价读取其中的金币。 */
    private account: AccountModel | null = null;
    /** 发出一次成长请求后禁用连点，收到回包或模块重置时解除。 */
    private upgrading = false;

    /**
     * @param roster 提供英雄当前等级、阶级及星级。
     * @param bag 提供英雄经验和进阶石的当前数量。
     */
    public constructor(
        private readonly roster: HeroRosterModel,
        private readonly bag: BagModel,
    ) {
        super();
    }

    /** 注入发送成长指令的账号通道和报价使用的角色资料。 */
    public configure(operations: Pick<AccountOperations, "send">, account: AccountModel): void {
        this.operations = operations;
        this.account = account;
    }

    /** 模块开启时登记普通升级和强化进阶的即时回包。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [
            Protocol.HERO_LEVEL_UPGRADE,
            Protocol.HERO_STAGE_ADVANCE,
        ]));
    }

    /** 有成长请求在途时禁用重复操作，原快照的报价仍可展示。 */
    public get busy(): boolean {
        return this.upgrading;
    }

    /** 用当前资产快照计算普通升级的条件和费用。 */
    public describe(heroId: string): HeroLevelQuote {
        const hero = this.roster.snapshot.heroes.find(row => row.id === heroId);
        const gold = this.account?.snapshot.role?.gold ?? -1;
        const heroExp = this.bag.snapshot.synced ? this.bag.quantity(HeroLevelQuoteUtils.EXPERIENCE_ITEM_ID) : -1;
        return HeroLevelQuoteUtils.describe(hero, gold, heroExp);
    }

    /** 用统一快照显示当前阶的进阶等级、星级和费用。 */
    public describeStage(heroId: string): HeroStageQuote {
        const hero = this.roster.snapshot.heroes.find(row => row.id === heroId);
        const gold = this.account?.snapshot.role?.gold ?? -1;
        const stone = this.bag.snapshot.synced ? this.bag.quantity(HeroLevelQuoteUtils.STAGE_STONE_ITEM_ID) : -1;
        return HeroLevelQuoteUtils.describeStage(hero, gold, stone);
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

    /** 先提示不满足的进阶条件，再把实例 ID 和原阶级交由服务端复核并提交。 */
    public advanceStage(heroId: string): void {
        if (this.upgrading) {
            return;
        }
        const quote = this.describeStage(heroId);
        const operations = this.operations;
        if (!operations || quote.stage === null || quote.status === "unavailable") {
            UIManager.instance.toast("进阶条件待同步");
            return;
        }
        if (quote.status !== "ready") {
            UIManager.instance.toast(quote.status === "max" ? "已达最高强化阶级" : "未达到进阶要求");
            return;
        }
        if (!quote.goldEnough || !quote.stoneEnough) {
            UIManager.instance.toast(!quote.goldEnough ? "金币不足" : "英雄进阶石不足");
            return;
        }
        const request = { heroId, expectedStage: quote.stage };
        this.upgrading = true;
        this.emit(HeroLevelEvent.Updated, {});
        operations.send(this, Protocol.HERO_STAGE_ADVANCE, request,
            error => this.onUpgradeFailed(error, true), body => {
                const receipt = body as HeroStageReceipt;
                if (receipt.heroId !== heroId || receipt.fromStage !== request.expectedStage) {
                    throw new Error("进阶回执与本次请求不符");
                }
            });
    }

    /** 成功回包解除等待并通知界面，实际等级和阶级仍交由统一快照更新。 */
    public onNotify(name: ProtocolName, body: unknown): void {
        switch (name) {
            case Protocol.HERO_LEVEL_UPGRADE: {
                const { heroId, fromLevel, toLevel } = body as HeroLevelReceipt;
                this.upgrading = false;
                this.emit(HeroLevelEvent.Updated, { heroId, fromLevel, toLevel });
                break;
            }
            case Protocol.HERO_STAGE_ADVANCE: {
                const { heroId, fromStage, toStage } = body as HeroStageReceipt;
                this.upgrading = false;
                this.emit(HeroLevelEvent.Updated, { heroId, fromStage, toStage });
                break;
            }
        }
    }

    /** 成长操作未收到有效结果时恢复按钮，提示服务端原因或等待重连快照同步。 */
    private onUpgradeFailed(error: unknown, stage = false): void {
        this.upgrading = false;
        this.emit(HeroLevelEvent.Updated, {});
        const action = stage ? "进阶" : "升级";
        const message = error instanceof SocketFailure && error.interrupted
            ? `${action}结果待同步，恢复连接后请查看英雄${stage ? "阶级" : "等级"}`
            : error instanceof Error ? error.message : `英雄${action}失败`;
        UIManager.instance.toast(message);
    }

    /** 角色数据重置时清除成长按钮的等待状态。 */
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
