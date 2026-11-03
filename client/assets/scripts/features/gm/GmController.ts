/** 开发 GM 请求控制器：保存未确认请求的幂等键，不修改英雄/背包 Model；资产由统一推送更新。 */
export interface GmGrant { requestId:string;kind:string;configId:number;quantity:number; }
export class GmController {
 /** 当前角色未确认请求；断线/关窗保留，明确成功或换角色后清理。 */
 private pending:{role:string;body:GmGrant}|null=null;
 /** 防止同一页面或多个入口并发提交。 */
 private busy=false;
 /** 应用注入鉴权后的开关查询与发放能力，控制器不持有 token。 */
 constructor(private readonly statusRequest:()=>Promise<unknown>,private readonly send:(body:GmGrant)=>Promise<unknown>){}
 /** 查询服务端真实开关，非法回包拒绝展示为可用。 */
 async enabled():Promise<boolean>{const data=await this.statusRequest() as {enabled?:unknown};if(typeof data?.enabled!=="boolean")throw new Error("GM 开关回包无效");return data.enabled;}
 /** 角色切换时丢弃旧角色未确认请求；应用层调用，不在控制器监听账号。 */
 reset():void{this.pending=null;}
 /** 发放当前选择；结果不明时只能使用原参数重试，避免重新生成幂等键重复发放。 */
 async grant(role:string,kind:string,configId:number,quantity:number):Promise<void>{
  if(this.busy)throw new Error("正在发放，请等待");
  if(!role||!Number.isSafeInteger(configId)||configId<=0||!Number.isSafeInteger(quantity)||quantity<1||quantity>9999)throw new Error("请选择配置并输入 1～9999 的整数数量");
  if(this.pending?.role!==role)this.pending=null;
  if(this.pending && (this.pending.body.kind!==kind||this.pending.body.configId!==configId||this.pending.body.quantity!==quantity))throw new Error("上次发放结果未确认，请用原选择和数量重试");
  if(!this.pending)this.pending={role,body:{requestId:"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==="x"?n:(n&3)|8).toString(16);}),kind,configId,quantity}};
  const attempt=this.pending;this.busy=true;
  try {const data=await this.send(attempt.body) as GmGrant;if(!data||data.requestId!==attempt.body.requestId||data.kind!==kind||data.configId!==configId||data.quantity!==quantity)throw new Error("GM 回执不匹配");if(this.pending===attempt)this.pending=null;}
  catch(error){const code=(error as {code?:string}).code;if(code?.startsWith("GM_")&&this.pending===attempt)this.pending=null;throw error;}
  finally {this.busy=false;}
 }
}
