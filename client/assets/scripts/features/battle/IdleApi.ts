/** 普通挂机 HTTP 边界：校验可信时间、收益和收据，客户端不提交时长、随机结果或奖励数量。 */
import { JsonClient } from "../../platform/http/JsonClient";
import { readRole } from "../account/AccountApi";
import { readBagItems } from "../Bag/data/BagItemData";
export interface IdleReward { readonly itemId:number; readonly quantity:number; }
export interface IdleState {
    readonly serverTime:number; readonly startedAt:number; readonly revision:number; readonly elapsedSeconds:number;
    readonly maxSeconds:number; readonly frequency:number; readonly rewardStage:number;
    readonly rates:readonly IdleReward[]; readonly claimable:boolean; readonly configVersion:string;
}
/** 拒绝缺字段和不安全整数，避免错误余额被当作零。 */
function integer(value:unknown,min=0):number {if(typeof value!=="number" || !Number.isSafeInteger(value) || value<min)throw new Error("挂机数值无效");return value;}
/** 仅允许对象结构。 */
function object(value:unknown):Record<string,unknown> {if(!value || typeof value!=="object" || Array.isArray(value))throw new Error("挂机响应无效");return value as Record<string,unknown>;}
/** 读取聚合奖励，拒绝重复物品或空数量。 */
function rewards(value:unknown):readonly IdleReward[] {
    if(!Array.isArray(value))throw new Error("挂机奖励无效");
    const rows=value.map(v=>{const r=object(v);return Object.freeze({itemId:integer(r.itemId,1),quantity:integer(r.quantity,1)});});
    if(new Set(rows.map(r=>r.itemId)).size!==rows.length)throw new Error("挂机奖励重复");return Object.freeze(rows);
}
/** 校验时间与领取条件一致；实际领取仍以服务端重新计算为准。 */
export function readIdleState(value:unknown):IdleState {
    const r=object(value),serverTime=integer(r.serverTime),startedAt=integer(r.startedAt),elapsedSeconds=integer(r.elapsedSeconds),maxSeconds=integer(r.maxSeconds,1),frequency=integer(r.frequency,1);
    if(elapsedSeconds!==Math.max(0,Math.min(maxSeconds,serverTime-startedAt)) || r.claimable!==(elapsedSeconds>=frequency) ||
        typeof r.configVersion!=="string" || !/^idle-[a-f0-9]{16}$/.test(r.configVersion))throw new Error("挂机计时响应不一致");
    return Object.freeze({serverTime,startedAt,elapsedSeconds,maxSeconds,frequency,revision:integer(r.revision),rewardStage:integer(r.rewardStage,1),rates:rewards(r.rates),claimable:r.claimable as boolean,configVersion:r.configVersion});
}
export class IdleApi {
    /** 复用应用 HTTP 与身份边界。 */
    constructor(private readonly http:JsonClient) {}
    /** 查询不会抽取随机物品。 */
    async current(token:string):Promise<IdleState> {return readIdleState(await this.http.request("/api/v1/idle",undefined,token));}
    /** 校验原操作收据，资产和计时采用本次服务端最新快照。 */
    async claim(token:string,requestId:string,expectedRevision:number) {
        const r=object(await this.http.request("/api/v1/idle/claim",{requestId,expectedRevision},token)),receipt=object(r.receipt),state=readIdleState(r.state);
        if(receipt.requestId!==requestId || receipt.expectedRevision!==expectedRevision || state.revision<=expectedRevision ||
            typeof receipt.configVersion!=="string" || !/^idle-[a-f0-9]{16}$/.test(receipt.configVersion))throw new Error("挂机收据不匹配");
        return {state,receipt:{requestId,expectedRevision,claimedAt:integer(receipt.claimedAt),seconds:integer(receipt.seconds,1),
            rewardStage:integer(receipt.rewardStage,1),configVersion:receipt.configVersion,rewards:rewards(receipt.rewards)},
            role:readRole(r.role),inventory:readBagItems(r.inventory),roleExperience:integer(r.roleExperience)};
    }
}
export type IdleResult = Awaited<ReturnType<IdleApi["claim"]>>;
