/** 暂停模块的明确失败边界：保留资源与数据读取规则，不发送旧接口或返回假成功。 */
import type { BagItemData } from "./Bag/data/BagItemData";
import type { BagChangeReason } from "./Bag/data/BagEventData";
/** 英雄、战斗、挂机和阵容尚未按旧项目重做，本阶段禁止调用旧业务链。 */
export function featureUnavailable():never {throw new Error("该模块暂停，待登录与背包完善后按原项目重做");}
/** 存量页面的关闭边界；重做对应模块时删除，不允许调用请求回调或提交本地资产。 */
export class PausedInventoryUpdates {
  /** 永远拒绝旧玩法写库存；保留类型仅供未重做页面编译，应用不装配这些页面。 */
  async runInventoryUpdate<T>(_id:string,_request:()=>Promise<T>,_inventory:(result:T)=>readonly BagItemData[],_commit:(result:T)=>void,_reason?:BagChangeReason):Promise<T> {return featureUnavailable();}
}
/** 无状态暂停入口，不持有库存或角色。 */
export const pausedInventoryUpdates=new PausedInventoryUpdates();
