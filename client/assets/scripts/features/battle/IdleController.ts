/** 会话级挂机领取协调：跨页面保留未确认请求，复用唯一库存/钱包事务通道，换号后拒绝迟到回包。 */
import { AccountModel } from "../account/AccountModel";
import { AccountService, SessionChanged } from "../account/AccountService";
import { BagController } from "../Bag/BagController";
import { HttpFailure } from "../../platform/http/JsonClient";
import { IdleApi } from "./IdleApi";
import type { IdleResult, IdleState } from "./IdleApi";
export class IdleController {
    private epoch=0;
    private attempt:{requestId:string;revision:number}|null=null;
    private pending:Promise<IdleResult>|null=null;
    private readonly off:()=>void;
    /** 应用持有本协调器，页面关闭只停止显示，不取消已提交的领奖。 */
    constructor(account:AccountModel,private readonly auth:AccountService,private readonly api:IdleApi,private readonly bag:BagController=BagController.instance) {
        let role=account.snapshot.role?.id;
        this.off=account.subscribe(state=>{if(state.busy || !state.role || state.role.id!==role){this.epoch++;this.pending=null;this.attempt=null;}role=state.role?.id;});
    }
    /** 等待本会话在途领取后查询；旧页面查询不得跨账号返回。 */
    async current():Promise<IdleState> {
        const epoch=this.epoch;if(this.pending)await this.pending.catch(()=>{});
        if(epoch!==this.epoch)throw new SessionChanged();return this.auth.authenticated(token=>this.api.current(token));
    }
    /** 同一逻辑领取复用标识；超时重试不重新抽奖，服务端确定拒绝才允许新请求。 */
    claim(revision:number):Promise<IdleResult> {
        if(this.pending)return this.pending;
        const attempt=this.attempt || {revision,requestId:"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
            const n=Math.floor(Math.random()*16);return(c==="x"?n:(n&3)|8).toString(16);})};
        this.attempt=attempt;const epoch=this.epoch;
        const promise=this.bag.runInventoryUpdate("idle:"+attempt.requestId,
            ()=>this.auth.authenticated(token=>this.api.claim(token,attempt.requestId,attempt.revision)),
            result=>result.inventory,result=>this.auth.acceptRole(result.role),"reward")
            .then(result=>{if(epoch===this.epoch)this.attempt=null;return result;})
            .catch(error=>{if(epoch===this.epoch && error instanceof HttpFailure && error.status>=400 && error.status<500)this.attempt=null;throw error;});
        this.pending=promise;const finish=()=>{if(this.pending===promise)this.pending=null;};void promise.then(finish,finish);return promise;
    }
    /** 未确认结果时即使新查询暂不可领，也应允许重放旧请求。 */
    get needsConfirmation():boolean{return !!this.attempt && !this.pending;}
    /** 应用销毁时清理会话监听。 */
    dispose():void{this.off();this.epoch++;this.pending=null;this.attempt=null;}
}
