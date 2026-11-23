/**
 * 提交真实英雄升星，回包仅确认本次结果，英雄与库存由统一快照刷新。
 * 材料选择归页面草稿，本模块由应用持有，页面打开关闭不重建协议监听。
 */
import { BaseController } from "../../framework/BaseController";
import { UIManager } from "../../framework/ui/UIManager";
import { SocketFailure } from "../../platform/GameSocketClient";
import { Protocol, type ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import type { AccountModel } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import { HeroRosterModel } from "./HeroRosterModel";
import type { HeroStarRecipe } from "./utils/HeroStarUtils";

/** 用户提交原配方行与实际材料，替代品成本在服务端按配方计算。 */
export interface HeroStarMaterials {
    readonly row: number;
    readonly heroIds: readonly string[];
    readonly useReplacement: boolean;
}

/** 成功回执中的升星步骤，实际英雄数据需等统一快照。 */
interface HeroStarReceipt {
    readonly heroId: string;
    readonly fromStar: number;
    readonly toStar: number;
}

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        "hero.star.updated": HeroStarReceipt | undefined;
    }
}

export class HeroStarController extends BaseController {
    /** 应用唯一的升星模块，页面复用现有名册和账号。 */
    public static readonly instance = new HeroStarController();
    /** 状态释放或成功回执时刷新升星按钮，名册变化继续使用现有通知。 */
    public static readonly Updated = "hero.star.updated";
    /** 会话认证后的公共通信入口，模块销毁时清空。 */
    private operations: Pick<AccountOperations, "send"> | null = null;
    /** 只读角色等级用于提示条件，缺失时不猜测已解锁。 */
    private account: AccountModel | null = null;
    /** 升星请求在途时禁用重复提交，回包、失败或会话变化后释放。 */
    private waiting = false;

    /** 由应用装配公共账号通道，不保存额外的凭证与等级副本。 */
    public configure(operations: Pick<AccountOperations, "send">, account: AccountModel): void {
        this.operations = operations;
        this.account = account;
    }

    /** 订单仍在处理时，页面用当前值控制重复点击。 */
    public get busy(): boolean {
        return this.waiting;
    }

    /** 角色及本区世界等级满足其一，14 星再检查已同步近况中的持有数量。 */
    public eligible(recipe: HeroStarRecipe): boolean {
        const role = this.account?.snapshot.role;
        const roster = HeroRosterModel.instance.snapshot;
        if (!role || (role.level < recipe.roleLevel && (roster.godEquipment?.worldLevel ?? 0) < recipe.worldLevel)) {
            return false;
        }
        return recipe.minimumOwnedHeroes === 0
            || roster.heroes.filter(hero => hero.star >= recipe.minimumOwnedStar).length >= recipe.minimumOwnedHeroes;
    }

    /** 提交配方行中的选择，客户端不修改任何英雄或库存。 */
    public upgrade(heroId: string, expectedStar: number, rows: readonly HeroStarMaterials[]): void {
        const operations = this.operations;
        if (!operations || this.waiting) {
            return;
        }
        this.waiting = true;
        this.emit(HeroStarController.Updated, undefined);
        operations.send(this, Protocol.HERO_STAR_UPGRADE, { heroId, expectedStar, materials: rows },
            error => this.onFailure(error), body => {
                const receipt = body as HeroStarReceipt;
                if (receipt.heroId !== heroId || receipt.fromStar !== expectedStar || receipt.toStar !== expectedStar + 1) {
                    throw new Error("升星回包与本次请求不符");
                }
            });
    }

    /** 只接收明确登记的升星回执，成功提示以真实目标星级为准。 */
    public onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.HERO_STAR_UPGRADE:
                this.onSuccess(data as HeroStarReceipt);
                break;
        }
    }

    /** 与公共长连接路由绑定，账号变更不需要页面重新注册。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, [Protocol.HERO_STAR_UPGRADE]));
    }

    /** 换号会清除等待状态，旧连接回包由公共账号通道隔离。 */
    protected onResetSession(): void {
        this.waiting = false;
        this.emit(HeroStarController.Updated, undefined);
    }

    /** 应用销毁后释放已注入的账号请求入口。 */
    protected onDispose(): void {
        this.operations = null;
        this.account = null;
    }

    /** 成功只发布此次操作反馈，统一快照仍是资产唯一入口。 */
    private onSuccess(receipt: HeroStarReceipt): void {
        this.waiting = false;
        this.emit(HeroStarController.Updated, receipt);
        UIManager.instance.toast(`英雄已升至 ${receipt.toStar} 星`);
    }

    /** 发送失败释放按钮，断线后以重连拿到的英雄快照判断结果。 */
    private onFailure(error: unknown): void {
        this.waiting = false;
        this.emit(HeroStarController.Updated, undefined);
        const message = error instanceof SocketFailure && error.interrupted ? "升星结果待同步，恢复连接后请查看英雄信息"
            : error instanceof Error ? error.message : "英雄升星失败";
        UIManager.instance.toast(message);
    }
}
