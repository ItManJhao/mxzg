/** 英雄名册 DTO 校验：供统一 Protobuf 快照使用；旧查询类保持停用，不作为新版数据入口。 */
import { readHeroEquipment, HeroEquipment } from "./HeroEquipment";
import { featureUnavailable } from "../PausedFeatures";

/** 服务端英雄实例 ID 保持字符串 UUID，templateId 为独立的英雄类型配置键。 */
export interface OwnedHero {
  readonly id: string;
  readonly templateId: number;
  readonly level: number;
  readonly star: number;
  /** 普通装备完整状态；undefined 未同步，items 空数组明确未穿戴。 */
  readonly equipment?: Readonly<{items:readonly HeroEquipment[]}>;
  /** 服务端当前强化阶段；缺失表示未同步。 */
  readonly stage?:number;
  /** 服务端基础成长属性，不包含未恢复的装备和天赋加成。 */
  readonly baseStats?:Readonly<{hp:number;atk:number;def:number;spd:number}>;
  /** 自身持久锁定；undefined 表示旧快照未同步，不能当作未锁定。 */
  readonly locked?: boolean;
  /** 主线阵容占用标记；缺失表示未同步，不等于未上阵。 */
  readonly deployed?: boolean;
}
export interface HeroGateway { list(token: string): Promise<readonly OwnedHero[]>; }

/** 校验单个持久英雄的基础字段并返回冻结副本，不接收客户端自建英雄。 */
export function readOwnedHero(value: unknown): OwnedHero {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("英雄资料无效");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id) ||
      !positiveInteger(row.templateId) || !positiveInteger(row.level) || !positiveInteger(row.star)) throw new Error("英雄资料无效");
  if (row.locked !== undefined && typeof row.locked !== "boolean") throw new Error("英雄锁定状态无效");
  if (row.deployed !== undefined && typeof row.deployed !== "boolean") throw new Error("英雄上阵状态无效");
  let baseStats:OwnedHero["baseStats"];
  if(row.stage!==undefined && (!Number.isSafeInteger(row.stage)||Number(row.stage)<0))throw new Error("英雄阶段无效");
  if(row.baseStats!==undefined){const b=row.baseStats as Record<string,unknown>;if(!b||typeof b!=="object"||Array.isArray(b)||![b.hp,b.atk,b.def,b.spd].every(positiveInteger))throw new Error("英雄基础属性无效");baseStats=Object.freeze({hp:b.hp as number,atk:b.atk as number,def:b.def as number,spd:b.spd as number});}
  let equipment:OwnedHero["equipment"];
  if(row.equipment!==undefined){const state=row.equipment as Record<string,unknown>;if(!state||typeof state!=="object"||Array.isArray(state))throw new Error("英雄装备状态无效");equipment=Object.freeze({items:readHeroEquipment(state.items)});}
  return Object.freeze({equipment,stage:row.stage as number|undefined,baseStats, deployed: row.deployed as boolean | undefined, locked: row.locked as boolean | undefined, id: row.id, templateId: row.templateId, level: row.level, star: row.star });
}

/** 基础等级、星级和配置 ID 必须是安全的正整数。 */
function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** 整组校验并拒绝重复实例 ID；空名册是有效状态。 */
export function readOwnedHeroes(value: unknown): readonly OwnedHero[] {
  if (!Array.isArray(value)) throw new Error("英雄列表无效");
  const heroes = value.map(readOwnedHero);
  if (new Set(heroes.map(hero => hero.id)).size !== heroes.length) throw new Error("英雄实例 ID 重复");
  const equipmentIds=new Set<string>();
  for(const hero of heroes)for(const item of hero.equipment?.items||[]){if(equipmentIds.has(item.instanceId))throw new Error("装备实例跨英雄重复");equipmentIds.add(item.instanceId);}
  return Object.freeze(heroes);
}

/** 英雄模块暂停，禁止继续调用旧业务接口。 */
export class HeroApi implements HeroGateway {
  /** 后续重做时再接入实际协议，目前明确拒绝。 */
  async list(_token:string):Promise<readonly OwnedHero[]> {return featureUnavailable();}
}

/** 服务端最终容量和购买次数，容量已经包含 VIP；不在客户端计算消耗或上限。 */
export interface HeroRosterInfo {
  /** 最终总格数，已经包含扩容及 VIP 加成。 */
  readonly capacity:number;
  /** 已成功购买扩容的次数，不是额外格数。 */
  readonly buySpaceTimes:number;
}
/** 缺字段保留未同步状态；非法容量拒绝整包，不将旧快照解释为零容量。 */
export function readHeroRosterInfo(value:unknown):HeroRosterInfo|undefined {
  if(value===undefined)return undefined;
  if(!value || typeof value!=="object" || Array.isArray(value))throw new Error("英雄容量无效");
  const row=value as Record<string,unknown>;
  if(!positiveInteger(row.capacity)||!Number.isSafeInteger(row.buySpaceTimes)||Number(row.buySpaceTimes)<0)throw new Error("英雄容量无效");
  return Object.freeze({capacity:row.capacity,buySpaceTimes:row.buySpaceTimes as number});
}
