/** 用真实旧装备配置验证实例/槽位边界；不启动服务器、不修改数据库。 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { strict as assert } from "node:assert";

import { HeroSnapshotUtils } from "../assets/scripts/features/hero/data/HeroSnapshotUtils";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { HeroEquipmentUtils } from "../assets/scripts/features/hero/utils/HeroEquipmentUtils";

/** 验证四槽配置、长整数字符串、错误装备与缺失同步不能被静默接受。 */
async function main(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    assert.deepEqual([...new Set(config.getConfig(GConfig.EquipmentType).map(row => row.place))].sort(), [1, 2, 3, 4]);
    const rows = [1, 2, 3, 4].map(slot => ({ instanceId: "922337203685477580" + slot, templateId: config.getConfig(GConfig.EquipmentType).find(row => row.place === slot)!.equipment_type, slot, soulLevel: 0 }));
    const result = HeroEquipmentUtils.readHeroEquipment(rows, config);
    assert.equal(result[0].instanceId, "9223372036854775801");
    assert(Object.isFrozen(result) && Object.isFrozen(result[0]));
    assert.deepEqual(HeroEquipmentUtils.readHeroEquipment([], config), []);
    for (const invalid of [undefined, {}, [rows[0], rows[0]], [rows[0], { ...rows[1], instanceId: rows[0].instanceId }], [{ ...rows[0], slot: 2 }], [{ ...rows[0], templateId: 999 }], [{ ...rows[0], soulLevel: -1 }], [{ ...rows[0], instanceId: 123 }]]) {
        assert.throws(() => HeroEquipmentUtils.readHeroEquipment(invalid, config));
    }
        const hero={id:"00000000-0000-4000-8000-000000000001",templateId:10101001,level:1,star:1,equipment:{items:rows}};
    assert.throws(()=>HeroSnapshotUtils.readOwnedHeroes([hero,{...hero,id:"00000000-0000-4000-8000-000000000002"}]));
    const decoded=GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"event",name:"state.changed",body:{role:{id:hero.id,nickname:"装备测试",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:[hero],inventory:[],revision:1}}));
    assert.equal((decoded.body as any).heroes[0].equipment.items[0].instanceId,rows[0].instanceId);
    assert.equal(HeroSnapshotUtils.readOwnedHeroes([hero])[0].equipment!.items.length,4);
        const panel={values:{hp:120,atk:99,def:20,spd:50},includedSources:["base","equipment","equipment_set"],pendingSources:["skill_panel"],complete:false};
    assert.equal(HeroSnapshotUtils.readOwnedHeroes([{...hero,panelStats:panel}])[0].panelStats!.values.atk,99);
    assert.throws(()=>HeroSnapshotUtils.readOwnedHeroes([{...hero,panelStats:{...panel,complete:true}}]));
    assert.throws(()=>HeroSnapshotUtils.readOwnedHeroes([{...hero,panelStats:{...panel,values:{...panel.values,atk:Number.MAX_SAFE_INTEGER+1}}}]));
    assert.throws(()=>HeroSnapshotUtils.readOwnedHeroes([{...hero,panelStats:{...panel,pendingSources:["base"]}}]));
        const fullRoster=Array.from({length:300},(_,i)=>({...hero,id:"00000000-0000-4000-8000-"+String(i+1).padStart(12,"0"),panelStats:panel,equipment:{items:rows.map((row,slot)=>({...row,instanceId:"10000000-0000-4000-8000-"+String(i*4+slot+1).padStart(12,"0")}))}}));
    const fullFrame=GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"event",name:"state.changed",body:{role:{id:hero.id,nickname:"容量验证",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:fullRoster,inventory:[],revision:2}});
    assert.equal((GameProtocolCodecUtils.decodeGameFrame(fullFrame).body as any).heroes.length,300);
        const soul={...rows[0],soulLevel:1,soulSkill:{skillId:1001015,level:1}};
    assert.equal(HeroEquipmentUtils.readHeroEquipment([soul],config)[0].soulSkill!.skillId,1001015);
    assert(Object.isFrozen(HeroEquipmentUtils.readHeroEquipment([soul],config)[0].soulSkill));
    assert.throws(()=>HeroEquipmentUtils.readHeroEquipment([{...soul,soulLevel:0}],config));
    assert.throws(()=>HeroEquipmentUtils.readHeroEquipment([{...soul,soulSkill:{skillId:1001015,level:-1}}],config));
    const soulFrame=GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"event",name:"state.changed",body:{role:{id:hero.id,nickname:"附魂验证",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:[{...hero,equipment:{items:[soul]}}],inventory:[],revision:3}}));
    assert.equal((soulFrame.body as any).heroes[0].equipment.items[0].soulSkill.skillId,1001015);
    const evolution={type:1,level:2,skill:{skillId:101050081,level:5}};
    const evolvedFrame=GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"event",name:"state.changed",body:{role:{id:hero.id,nickname:"进化验证",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:[{...hero,evolution}],inventory:[],revision:4}}));
    assert.deepEqual(HeroSnapshotUtils.readOwnedHeroes((evolvedFrame.body as any).heroes)[0].evolution,evolution);
    rows[0].soulLevel = 9;
    assert.equal(result[0].soulLevel, 0);
    console.log("PASS hero equipment: four real slots, instance precision, config matching, duplicates, missing state, immutable copies");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
