/**
 * 背包展示工具：提供页签、空槽数量、空列表提示和期限倒计时文案。
 * 由 BagView/BagInfoView 调用；库存属于 BagModel，本文件不查询或修改库存。
 */
import type { BagTabKind } from "../data/BagTabKind";

/** 最少显示20个格子，不代表服务器容量。 */
const BAG_MIN_SLOTS = 20;
/** 格子数量按四格一行向上补齐。 */
const BAG_SLOT_BATCH = 4;

/** 背包分类的固定显示顺序；内容仍由配置和库存筛选得到。 */
export const BAG_TABS: {
    /** 配置投影使用的分类键。 */
    id: BagTabKind;
    /** 分类的显示标题。 */
    title: string;
}[] = [
    { id: "equip", title: "装备" },
    { id: "item", title: "道具" },
    { id: "shard", title: "碎片" },
    { id: "spirit", title: "精灵" },
];

/** 无状态的背包显示计算，不持有页面、会话或服务器数据。 */
export class BagUtils {
    /** 工具类不允许创建实例。 */
    private constructor() {}

    /** 将物品数量补齐为四的倍数，至少保留20个展示槽。 */
    public static slotCount(count: number): number {
        return Math.ceil(Math.max(count, BAG_MIN_SLOTS) / BAG_SLOT_BATCH) * BAG_SLOT_BATCH;
    }

    /** 返回库存已同步且为空时的提示；同步状态由调用方判断。 */
    public static emptyToast(): string {
        return "背包是空的";
    }

    /** 剩余秒数按旧规则显示；严格大于一天才用天/时/分，否则显示时/分/秒。 */
    public static countdown(seconds: number): string {
        const value = Math.max(0, Math.floor(seconds));
        if (value === 0) {
            return "已到期";
        }
        if (value > 86400) {
            return "剩余：" + Math.floor(value / 86400) + "天" +
                Math.floor(value % 86400 / 3600) + "小时" + Math.floor(value % 3600 / 60) + "分";
        }
        return "剩余：" + Math.floor(value / 3600) + "小时" +
            Math.floor(value % 3600 / 60) + "分" + value % 60 + "秒";
    }
}
