/** 英雄技能只读投影：沿旧 HeroData 按服务器星级/强化阶段选择基础技能；不执行升级或战斗逻辑。 */
import {GameConfig} from "../../config/GameConfig";
import {GConfig} from "../../config/GConfig";
import {SkillIconById} from "../../framework/assets/IconCatalog";
import type {OwnedHero} from "./HeroApi";

export interface HeroSkillFace {
 /** 四个展示位置，从 0 开始；不含普通攻击 skill_5。 */
 readonly slot:number;
 /** 配置技能 ID；不存在的技能位置为 0。 */
 readonly id:number;
 /** 当前已解锁等级；null 表示服务器尚未同步阶段，0 表示锁定。 */
 readonly level:number|null;
 /** 首次解锁的强化阶段；空位置为 null。 */
 readonly unlockStage:number|null;
 /** 同等级语言表名称；锁定技能使用一级预览名称。 */
 readonly name:string;
 /** 同等级语言表描述；不将策划说明列作为技能文本。 */
 readonly description:string;
 /** 已登记的旧版图标路径；缺图为 null，不拼接猜测路径。 */
 readonly icon:string|null;
}

/** 读取旧表确定的四个基础技能；进化替换须待服务端恢复进化状态后另行接入。 */
export function presentHeroSkills(hero:OwnedHero,config:GameConfig=GameConfig.instance):readonly HeroSkillFace[] {
 const template=config.requireConfig(GConfig.HeroType,hero.templateId);
 const stage=hero.stage===undefined?null:config.requireConfig(GConfig.HeroUpgrade,hero.stage);
 const star=hero.stage!==undefined && hero.stage<hero.star && hero.star<=5?hero.stage+1:hero.star;
 const rank=config.requireConfig(GConfig.HeroStar,star);
 const levels=[rank.skill1,rank.skill2,rank.skill3,rank.skill4];
 const enabled=stage?[stage.skill1,stage.skill2,stage.skill3,stage.skill4]:null;
 const ids=[template.skill_1,template.skill_2,template.skill_3,template.skill_4];
 return Object.freeze(ids.map((id,slot)=>{
  if(!id)return Object.freeze({slot,id:0,level:0,unlockStage:null,name:"",description:"",icon:null});
  const level=enabled?(enabled[slot]===0?0:levels[slot]):null;
  const previewLevel=Math.max(1,level??1);
  const row=config.getConfig(GConfig.HeroSkill).find(row=>row.type===id && row.level===previewLevel);
  if(!row)throw new Error("缺少英雄技能配置："+id+" / "+previewLevel);
  const unlock=config.getConfig(GConfig.HeroUpgrade).filter(row=>[row.skill1,row.skill2,row.skill3,row.skill4][slot]>0).reduce((min,row)=>Math.min(min,row.grade),Infinity);
  return Object.freeze({slot,id,level,unlockStage:Number.isFinite(unlock)?unlock:null,
   name:skillText(config,row.lan_name),
   description:skillText(config,row.lan_describe),
   icon:SkillIconById[id]?.path||null});
 }));
}

/** 技能等级与解锁说明；未同步和锁定不能混为一类。 */
export function heroSkillStatus(skill:HeroSkillFace):string {
 return skill.level===null?"待同步":skill.level>0?"Lv."+skill.level:skill.unlockStage===null?"未解锁":"强化"+skill.unlockStage+"解锁";
}

/** 名称和效果文案必须有真实语言行，缺失时明确失败，不显示 undefined。 */
function skillText(config:GameConfig,id:number):string {
 const value=config.requireConfig(GConfig.Language,id).value;
 if(typeof value!=="string" || !value.trim())throw new Error("技能语言缺失："+id);
 return value;
}
