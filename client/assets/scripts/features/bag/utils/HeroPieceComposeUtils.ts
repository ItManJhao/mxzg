/**
 * 精英碎片5008合成的只读数量规则：以item.mode/use_type/use_value核对配置，数量始终表示生成英雄次数。
 * 供碎片详情和数量窗显示可选次数，服务端校验合成资格。
 */
import { GameConfig } from "../../../config/GameConfig";
import { BagModel } from "../BagModel";
import { GConfig } from "../../../config/GConfig";
import { ItemDetailUtils } from "./ItemDetailUtils";

/** 精英碎片显示用的单次消耗配置。 */
export interface HeroPieceComposeDefinition {
    /** 当前物品配置ID，普通材料及精灵不会进入本规则。 */
    readonly itemId: number;
    /** 每合成一次消耗的碎片数，来自item.use_value。 */
    readonly required: number;
}

/** 仅含当前唯一库存的派生数量，不能回写Model或视为预先扣除。 */
export interface HeroPieceComposeState extends HeroPieceComposeDefinition {
    /** 当前服务端快照中的绝对持有量，不是合成次数。 */
    readonly owned: number;
    /** floor(owned/required)，允许为0；不按英雄剩余容量预先裁减。 */
    readonly maximum: number;
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
            || row.use_value! <= 0) {
            return null;
        }
        return { itemId, required: row.use_value! };
    }

    /** 从当前库存计算持有量和界面可选次数。 */
    public static stock(itemId: number, bag = BagModel.instance): HeroPieceComposeState | null {
        const definition = HeroPieceComposeUtils.definition(itemId);
        if (!definition) {
            return null;
        }
        const owned = bag.quantity(itemId);
        return { ...definition, owned, maximum: Math.floor(owned / definition.required) };
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
