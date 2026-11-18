/**
 * 精英碎片5008合成的只读数量规则：以item.mode/use_type/use_value核对配置，数量始终表示生成英雄次数。
 * 由背包Controller和数量窗共用，不保存库存或随机结果，不替代服务端候选池、容量及事务校验。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ItemDetailUtils } from "./ItemDetailUtils";

/** 已核对的精英碎片显示与消耗规则，不代表服务端已经开放全部候选池。 */
export interface HeroPieceComposeDefinition {
    /** 当前物品配置ID，普通材料及精灵不会进入本规则。 */
    readonly itemId: number;
    /** 每合成一次消耗的碎片数，来自item.use_value。 */
    readonly required: number;
    /** 旧数量确认前检查的角色最低等级，最终仍由服务端判定。 */
    readonly minimumLevel: number;
}

/** 仅含当前唯一库存的派生数量，不能回写Model或视为预先扣除。 */
export interface HeroPieceComposeState extends HeroPieceComposeDefinition {
    /** 当前服务端快照中的绝对持有量，不是合成次数。 */
    readonly owned: number;
    /** floor(owned/required)，允许为0；不按英雄剩余容量预先裁减。 */
    readonly maximum: number;
    /** 应用读取的当前角色等级，未同步时为0。 */
    readonly roleLevel: number;
    /** 唯一名册容量减实际英雄数；null表示尚未同步，不以0误禁，服务端仍最终检查。 */
    readonly remainingHeroSlots: number | null;
    /** 模块、库存与应用动作已准备好，且应用支持判定允许该配置。 */
    readonly available: boolean;
}

/** 无状态配置与旧数量输入转换，不发请求或维护配置清单。 */
export class HeroPieceComposeUtils {
    /** 所有入口为纯静态查询，无需创建实例。 */
    private constructor() { }

    /** 仅接受旧精英碎片mode8/use_type4及正整数消耗；配置未知或损坏返回null，不套普通道具使用。 */
    public static definition(itemId: number, config = GameConfig.instance): HeroPieceComposeDefinition | null {
        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            return null;
        }
        const row = config.getConfig(GConfig.Item, itemId);
        if (!row || row.mode !== 8 || row.use_type !== 4 || !ItemDetailUtils.piece(row) || !Number.isSafeInteger(row.use_value)
            || row.use_value! <= 0 || !Number.isSafeInteger(row.level_require) || row.level_require! <= 0) {
            return null;
        }
        return { itemId, required: row.use_value!, minimumLevel: row.level_require! };
    }

    /** 用绝对持有量求本次可合成次数；非法库存或消耗返回null，不以零掩盖未知数据。 */
    public static maximum(owned: number, required: number): number | null {
        if (!Number.isSafeInteger(owned) || owned < 0 || !Number.isSafeInteger(required) || required <= 0) {
            return null;
        }
        return Math.floor(owned / required);
    }

    /** 沿旧数量框规则：有效正数向下取整并限制到最大次数，其余输入回0；不改变权威库存。 */
    public static normalize(input: string | number, maximum: number): number {
        const value = typeof input === "number" ? input : Number(input.trim());
        if (!Number.isSafeInteger(maximum) || maximum < 0 || !Number.isFinite(value) || value <= 0) {
            return 0;
        }
        return Math.min(maximum, Math.floor(value));
    }
}
