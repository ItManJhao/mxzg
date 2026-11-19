/** 读取召唤配置和服务器状态，并把真实抽取结果交给通用奖励反馈。 */
import type { RewardNotice } from "../../reward/data/RewardNoticeData";
import { GameConfig } from "../../../config/GameConfig";
import { RewardUtils } from "../../reward/utils/RewardUtils";

/** 召唤池与操作次数，与角色服务的协议取值一致。 */
export type SummonPool = "NORMAL" | "FRIENDSHIP" | "ADVANCED" | "POINTS";
export type SummonCount = 1 | 10;

/** 显示完整召唤界面所需的服务器状态，老快照没有高级池字段。 */
export interface SummonDetails {
    /** 高级单抽下次免费时间，Unix 秒，零表示免费。 */
    readonly advancedFreeAtSeconds: number;
    /** 服务器已确认当前角色满足积分召唤的累计充值门槛。 */
    readonly pointsExchangeAvailable: boolean;
    /** 当前区服积分召唤的门槛。 */
    readonly pointRechargeRequired?: number;
    /** 当前角色适用的兑换积分数，缺失时使用基础配置。 */
    readonly pointsCost?: number;
    /** 已购祈愿资格有效期，Unix 秒，零表示未开通。 */
    readonly prayerEndsAtSeconds?: number;
}

/** 一次召唤的当前消耗，不提前修改背包或钱包。 */
export interface SummonQuote {
    /** 当前池的物品消耗种类。 */
    readonly itemId: number;
    /** 实际需要的券、友情点或积分。 */
    readonly items: number;
    /** 高级池用来补足的钻石。 */
    readonly diamonds: number;
    /** 单抽可使用本次免费资格。 */
    readonly free: boolean;
}

/** 召唤配置的只读投影。 */
export class FirstSummonData {
    /** 召唤窗口积分余额栏对应的背包物品，仅用于查询已同步余额。 */
    public static readonly POINT_ITEM_ID = 900302;

    /** 只提供静态契约校验。 */
    private constructor() {
    }

    /** 从同源表读取对应池和次数的消耗。 */
    public static cost(pool: SummonPool, count: SummonCount): { item_type: number; item_num: number } {
        const table = GameConfig.instance.getFileByPath("config/lotterypoint") as {
            rows: { type: number; summon_times: number; need_item: string }[];
        };
        const type = { NORMAL: 1, FRIENDSHIP: 2, ADVANCED: 3, POINTS: 4 }[pool];
        const row = table.rows.find(entry => entry.type === type && entry.summon_times === count);
        const [ticket] = JSON.parse(row?.need_item ?? "[]");
        if (!Number.isSafeInteger(ticket?.item_type) || ticket.item_type <= 0
            || !Number.isSafeInteger(ticket.item_num) || ticket.item_num <= 0) {
            throw new Error("召唤缺少消耗配置：" + pool + " × " + count);
        }
        return ticket;
    }

    /** 读取系统表原字段。召唤各窗口共用同一份已加载的表。 */
    public static system(key: string): unknown {
        const table = GameConfig.instance.getFileByPath("config/system") as {
            rows: { key: string; value: unknown }[];
        };
        return table.rows.find(row => row.key === key)?.value;
    }

    /** 高级召唤优先消耗已有券。无券走钻石价，混合消耗按每张缺券的补足价。 */
    public static quote(pool: SummonPool, count: SummonCount, free: boolean, available: number): SummonQuote {
        const cost = this.cost(pool, count);
        const itemId = cost.item_type;
        if (free) {
            return { itemId, items: 0, diamonds: 0, free };
        }
        if (pool !== "ADVANCED" || available >= cost.item_num) {
            return { itemId, items: cost.item_num, diamonds: 0, free };
        }
        const table = GameConfig.instance.getFileByPath("config/shopseniorticket") as {
            rows: { item_num: number; need_gem: number }[];
        };
        const price = table.rows.find(row => row.item_num === count)?.need_gem;
        if (typeof price !== "number" || !Number.isSafeInteger(price) || price <= 0) {
            throw new Error("缺少高级召唤的钻石价格：" + count);
        }
        const partial = this.system("adv_summon_10_fixed_prize");
        const [perTicket] = typeof partial === "string" ? JSON.parse(partial) : partial as { item_num: number }[];
        if (!Number.isSafeInteger(perTicket?.item_num) || perTicket.item_num <= 0) {
            throw new Error("缺少高级召唤的补券价格");
        }
        const diamonds = available > 0 ? (cost.item_num - available) * perTicket.item_num : price;
        return { itemId, items: available, diamonds, free };
    }

    /** 从服务端快照只取下次免费时间；旧快照缺字段时等待同步，当前格式须自洽。 */
    public static readFreeAt(value: unknown): number | null {
        if (value === undefined) {
            return null;
        }
        const data = value as { schemaVersion?: number; firstNormalCompleted?: boolean; normalFreeAtSeconds?: number } | null;
        if (data?.schemaVersion !== 1
            || typeof data.firstNormalCompleted !== "boolean" || typeof data.normalFreeAtSeconds !== "number"
            || !Number.isSafeInteger(data.normalFreeAtSeconds)
            || (data.firstNormalCompleted ? data.normalFreeAtSeconds <= 0 : data.normalFreeAtSeconds !== 0)) {
            throw new Error("普通召唤免费时间无效");
        }
        return data.normalFreeAtSeconds;
    }

    /** 新版快照才提供高级池与积分资格；验证可见数据后供页面共用。 */
    public static readDetails(value: unknown): SummonDetails | null {
        const data = value as Partial<SummonDetails> | null;
        const freeAt = data?.advancedFreeAtSeconds;
        if (freeAt === undefined) {
            return null;
        }
        if (!Number.isSafeInteger(freeAt) || freeAt < 0 || typeof data?.pointsExchangeAvailable !== "boolean"
            || [data.pointRechargeRequired, data.prayerEndsAtSeconds].some(time => time !== undefined
                && (!Number.isSafeInteger(time) || time < 0))
            || (data.pointsCost !== undefined && (!Number.isSafeInteger(data.pointsCost) || data.pointsCost <= 0))) {
            throw new Error("高级召唤或积分召唤状态无效");
        }
        return Object.freeze({
            advancedFreeAtSeconds: freeAt,
            pointsExchangeAvailable: data.pointsExchangeAvailable,
            pointRechargeRequired: data.pointRechargeRequired,
            pointsCost: data.pointsCost,
            prayerEndsAtSeconds: data.prayerEndsAtSeconds,
        });
    }

    /** 取出本次各个实际英雄，积分已随背包到账，获得演出只展示英雄。 */
    public static reward(value: unknown): RewardNotice {
        const receipt = value as { requestId: string; receiptId: string; assetRevision: number; actual: unknown;
            pool?: SummonPool; count?: SummonCount };
        const notice = RewardUtils.fromActual(receipt.receiptId, receipt.assetRevision, receipt.actual);
        if (!notice?.heroes?.length) {
            throw new Error("召唤回执缺少英雄实例");
        }
        const heroIds = new Set(notice.heroes.map(hero => hero.templateId));
        return Object.freeze({
            ...notice,
            requestId: receipt.requestId,
            items: Object.freeze(notice.items.filter(row => heroIds.has(row.itemId))),
            ...(notice.heroes.length > 1 ? { summonBatch: true as const } : {}),
            ...(receipt.pool === "POINTS" ? {} : {
                repeatSummon: { pool: receipt.pool ?? "NORMAL", count: receipt.count ?? 1 },
            }),
        });
    }
}
