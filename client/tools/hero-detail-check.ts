/** 按旧 HeroData 的具体规则验证基础技能，不启动服务或访问玩家数据库。 */
import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import {GameConfig} from "../assets/scripts/config/GameConfig";
import {GConfig} from "../assets/scripts/config/GConfig";
import {presentHeroSkills,heroSkillStatus} from "../assets/scripts/features/hero/HeroSkillPresentation";
/** 从仓库真实导出表验证阶段解锁、星级等级、同等级语言和无技能位置。 */
async function main(){
 const config=new GameConfig(async path=>JSON.parse(readFileSync("client/assets/resources/"+path+".json","utf8")));
 await config.prepare([GConfig.HeroType,GConfig.HeroUpgrade,GConfig.HeroStar,GConfig.HeroSkill,GConfig.Language]);
 const hero={id:"00000000-0000-4000-8000-000000000001",templateId:10102002,level:1,star:2,stage:0};
 let skills=presentHeroSkills(hero,config);assert.deepEqual(skills.map(s=>s.id),[101020021,101020022,0,0]);
 assert.deepEqual(skills.map(s=>s.level),[1,0,0,0]);assert.equal(skills[0].name,"痛苦收割");assert(skills[0].description.includes("65%"));assert(skills[0].icon);
 assert.equal(heroSkillStatus(skills[1]),"强化1解锁");
 skills=presentHeroSkills({...hero,stage:1,level:30},config);assert.deepEqual(skills.slice(0,2).map(s=>s.level),[1,1]);
 const four=config.getConfig(GConfig.HeroType).find(row=>row.kind===1 && row.skill_4)!;
 skills=presentHeroSkills({...hero,templateId:four.type,star:5,stage:0},config);assert.deepEqual(skills.map(s=>s.level),[1,0,0,0]);assert.deepEqual(skills.map(s=>s.unlockStage),[0,1,3,5]);
 skills=presentHeroSkills({...hero,templateId:four.type,star:6,stage:5},config);assert.deepEqual(skills.map(s=>s.level),[2,2,2,2]);
 skills=presentHeroSkills({...hero,stage:undefined},config);assert.equal(skills[0].level,null);assert.equal(heroSkillStatus(skills[0]),"待同步");
 assert.throws(()=>presentHeroSkills({...hero,stage:99},config));assert.throws(()=>presentHeroSkills({...hero,templateId:999999},config));
 assert(Object.isFrozen(skills)&&Object.isFrozen(skills[0]));
 console.log("PASS hero readonly skills: old unlock stages, star levels, language, placeholders, missing sync, immutable results");
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
