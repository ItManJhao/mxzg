/** 应用层统一资产提交：校验角色归属和持久版本，再把真实协议交给角色/背包 onNotify。
 * 同一通知批次完成全部 Model 更新；不查询库存、不反推玩家资产、不保存第二份资产。
 */
import type { AccountModel } from "../../features/account/AccountModel";
import type { BagController } from "../../features/Bag/BagController";
import type { RoleController } from "../../features/account/RoleController";
import { readRole } from "../../features/account/AccountApi";
import { readBagItems } from "../../features/Bag/data/BagItemData";
import { statePayload } from "../../platform/ProtocolState";
import type { ProtocolName } from "../../platform/Protocol";
import type { GameFrame } from "../../platform/GameProtocolCodec";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { batchNotifications } from "../../framework/EventDispatcher";
export class AssetStateBinding {
  /** 当前账号初始化代次；空值表示没有可接收资产的角色。 */
  private key:string|null=null;
  /** 当前角色已提交的服务端版本，切换身份时归零；不是 BagModel 本地界面 revision。 */
  private revision=-1;
  /** 账号退出监听归属应用，销毁时解除。 */
  private readonly stop:()=>void;
  /** 注入唯一模块，不直接写它们的资产状态。 */
  constructor(private readonly account:AccountModel,private readonly bag:BagController,private readonly role:RoleController) {
    this.stop=account.subscribe(state=>{if(!state.role)this.clear();});
  }
  /** 在身份已经接纳后提交完整帧；同版本重复推送和低版本乱序帧不产生界面事件。 */
  apply(frame:GameFrame):boolean {
    const current=this.account.snapshot;
    if(!current.role || current.busy)return false;
    if(frame.version!==1 || (frame.kind!=="event" && (frame.kind!=="response" || frame.ok!==true)) || frame.error!==undefined)throw new Error("资产信封无效");
    const state=statePayload(frame.name as ProtocolName,frame.body), role=readRole(state.role);
    readBagItems(state.inventory);
    if(role.id!==current.role.id || role.serverId!==current.role.serverId)throw new Error("资产不属于当前角色");
    const key=(role.serverId||"")+"/"+role.id, revision=Number(state.revision);
    if(this.key===key && revision<=this.revision)return false;
    batchNotifications(()=>{
      if(this.key!==key){this.key=key;this.revision=-1;this.bag.resetSession(key);}
      ProtocolRouter.instance.dispatch(this.role,frame);
      ProtocolRouter.instance.dispatch(this.bag,frame);
      this.revision=revision;
    });
    return true;
  }
  /** 登出或登录新身份前清理库存和版本，不发送任何补查。 */
  private clear():void {if(this.key!==null){this.key=null;this.revision=-1;this.bag.resetSession(null);}}
  /** 应用结束时释放监听，不改变仍在使用的其他模块。 */
  dispose():void {this.stop();this.clear();this.role.dispose();}
}
