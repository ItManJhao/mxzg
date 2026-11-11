/**
 * 已退役旧业务链的明确失败边界，供仍绑定旧资源的 Campaign/Idle/普通升级代码编译使用。
 * 当前主线、挂机演出与英雄只读展示使用各自已恢复的 Controller，不经过本文件。
 * 本文件不发送旧请求、不执行资产提交回调；对应旧链与绑定整体退役后再删除。
 */
import type { BagItemData } from "./bag/data/BagItemData";
import type { BagChangeReason } from "./bag/data/BagEventData";
/** 拒绝旧业务链调用；不表示已恢复的主线阵容、挑战或英雄只读入口被暂停。 */
export function featureUnavailable(): never { throw new Error("该模块暂停，待登录与背包完善后按原项目重做"); }
/** 存量页面的关闭边界；重做对应模块时删除，不允许调用请求回调或提交本地资产。 */
export class PausedInventoryUpdates {
    /** 永远拒绝旧玩法写库存；保留类型仅供未重做页面编译，应用不装配这些页面。 */
    async runInventoryUpdate<T>(_id: string, _request: () => Promise<T>, _inventory: (result: T) => readonly BagItemData[], _commit: (result: T) => void, _reason?: BagChangeReason): Promise<T> { return featureUnavailable(); }
}
/** 无状态暂停入口，不持有库存或角色。 */
export const pausedInventoryUpdates = new PausedInventoryUpdates();
