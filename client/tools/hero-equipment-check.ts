/** 用真实旧装备配置验证实例/槽位边界；不启动服务器、不修改数据库。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { readHeroEquipment } from "../assets/scripts/features/hero/HeroEquipment";

/** 验证四槽配置、长整数字符串、错误装备与缺失同步不能被静默接受。 */
async function main(): Promise<void> {
    const config = new GameConfig(async path => JSON.parse(readFileSync("client/assets/resources/" + path + ".json", "utf8")));
    await config.prepare([GConfig.EquipmentType]);
    assert.deepEqual([...new Set(config.getConfig(GConfig.EquipmentType).map(row => row.place))].sort(), [1, 2, 3, 4]);
    const rows = [1, 2, 3, 4].map(slot => ({ instanceId: "922337203685477580" + slot, templateId: config.getConfig(GConfig.EquipmentType).find(row => row.place === slot)!.equipment_type, slot, soulLevel: 0 }));
    const result = readHeroEquipment(rows, config);
    assert.equal(result[0].instanceId, "9223372036854775801");
    assert(Object.isFrozen(result) && Object.isFrozen(result[0]));
    assert.deepEqual(readHeroEquipment([], config), []);
    for (const invalid of [undefined, {}, [rows[0], rows[0]], [rows[0], { ...rows[1], instanceId: rows[0].instanceId }], [{ ...rows[0], slot: 2 }], [{ ...rows[0], templateId: 999 }], [{ ...rows[0], soulLevel: -1 }], [{ ...rows[0], instanceId: 123 }]]) {
        assert.throws(() => readHeroEquipment(invalid, config));
    }
    rows[0].soulLevel = 9;
    assert.equal(result[0].soulLevel, 0);
    console.log("PASS hero equipment: four real slots, instance precision, config matching, duplicates, missing state, immutable copies");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
