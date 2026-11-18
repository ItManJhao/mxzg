/**
 * 早期成长的持久参数和碎片命令适配。只读取已接纳的资产版本，
 * 合成实际数量与奖励始终由服务端回执提供。
 */
import type { AccountService } from "../../features/account/AccountService";
import { PersistentOperationJournal } from "../../framework/PersistentOperationJournal";
import type { GameSocketClient } from "../../platform/GameSocketClient";
import { Protocol } from "../../platform/Protocol";
import type { ProgressRewardReceipt } from "./ProgressRewardBinding";

/** 独立通关奖励以旧绝对关卡号为稳定业务键。 */
export interface ChapterRewardIntent {
    readonly schemaVersion: 1;
    readonly chapter: number;
}

/** 一次碎片合成的原操作，数量是合成次数。 */
export interface FragmentCombineIntent {
    readonly schemaVersion: 1;
    readonly requestId: string;
    readonly itemId: number;
    readonly quantity: number;
}

/** 重复或恢复只能携带原编号及完整消费参数。 */
interface FragmentCombineReceipt extends ProgressRewardReceipt {
    readonly requestId: string;
    readonly itemId: number;
    readonly quantity: number;
}

export class ProgressRewardUtils {
    /** 无实例状态，操作能力由应用传入。 */
    private constructor() {}

    /** 校验旧绝对关卡键及日志格式，损坏时拒绝恢复。 */
    public static readChapterIntent(value: unknown): ChapterRewardIntent {
        const row = value as Partial<ChapterRewardIntent> | null;
        if (!row || row.schemaVersion !== 1 || !ProgressRewardUtils.isPositiveId(row.chapter)
                || Object.keys(row).sort().join(",") !== "chapter,schemaVersion") {
            throw new Error("独立通关奖励原记录损坏");
        }
        return Object.freeze({ schemaVersion: 1, chapter: row.chapter });
    }

    /** 校验原请求 UUID、配置 ID 和合成次数，拒绝额外资产字段。 */
    public static readFragmentIntent(value: unknown): FragmentCombineIntent {
        const row = value as Partial<FragmentCombineIntent> | null;
        if (!row || row.schemaVersion !== 1 || !PersistentOperationJournal.isUuid(row.requestId)
                || !ProgressRewardUtils.isPositiveId(row.itemId) || !ProgressRewardUtils.isPositiveId(row.quantity)
                || Object.keys(row).sort().join(",") !== "itemId,quantity,requestId,schemaVersion") {
            throw new Error("原碎片合成记录损坏");
        }
        return Object.freeze({ schemaVersion: 1, requestId: row.requestId, itemId: row.itemId, quantity: row.quantity });
    }

    /** 只接纳原编号与消耗参数，防止迟到的其他合成结果混入。 */
    public static matchesFragment(intent: FragmentCombineIntent, receipt: ProgressRewardReceipt): boolean {
        const value = receipt as Partial<FragmentCombineReceipt>;
        return value.requestId === intent.requestId && value.itemId === intent.itemId && value.quantity === intent.quantity;
    }

    /** 查原回执或提交同键一次。已有回执缺快照时仅重新鉴权，避免重复扣料。 */
    public static async combine(
        service: AccountService,
        socket: GameSocketClient,
        intent: FragmentCombineIntent,
        recover: boolean,
        readRevision: () => number,
    ): Promise<ProgressRewardReceipt> {
        return service.authenticated(async token => {
            let receipt: FragmentCombineReceipt | undefined;
            if (recover) {
                const status = await socket.combineHeroFragments(token, Protocol.HERO_FRAGMENT_COMBINE_STATUS,
                    { requestId: intent.requestId });
                const result = status.body as { requestId: string; receipt?: FragmentCombineReceipt };
                if (result.requestId !== intent.requestId) {
                    throw new Error("碎片合成查询与原编号不符");
                }
                receipt = result.receipt;
            }
            if (!receipt) {
                const result = await socket.combineHeroFragments(token, Protocol.HERO_FRAGMENT_COMBINE,
                    { requestId: intent.requestId, itemId: intent.itemId, quantity: intent.quantity });
                receipt = result.body as FragmentCombineReceipt;
            }
            if (!this.matchesFragment(intent, receipt)) {
                throw new Error("碎片合成回执与原参数不符");
            }
            if (readRevision() < receipt.assetRevision) {
                await socket.refreshSnapshot(token);
            }
            if (readRevision() < receipt.assetRevision) {
                throw new Error("合成结果已返回，库存仍待同步");
            }
            return receipt;
        });
    }

    /** 正 uint32，和协议配置编号范围保持一致。 */
    private static isPositiveId(value: unknown): value is number {
        return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 0xffffffff;
    }
}
