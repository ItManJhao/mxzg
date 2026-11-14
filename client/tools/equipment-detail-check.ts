/**
 * 普通装备详情纯投影回归：通过真实GameConfig读取同源配置，核对旧评分、属性顺序、套装与缺失边界。
 * 不打开页面、不连接玩家服务器；界面生命周期与正式服视觉由独立专项负责。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { EquipmentDetailUtils } from "../assets/scripts/features/bag/utils/EquipmentDetailUtils";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { CONFIG_SCHEMA, ConfigName, GConfig } from "../assets/scripts/config/GConfig";
import { GameLog } from "../assets/scripts/core/GameLog";

const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 从真实同源JSON取得整表，不另维护测试用装备/属性名称清单。 */
function file(name: string): any {
    return JSON.parse(readFileSync(resolveBundleFile("config/" + name + ".json"), "utf8"));
}

/** 仅离线反例使用的可修改输入；生产页面不再传递这些整表。 */
interface EquipmentTestSource {
    /** 真实物品输入，准备时交给GameConfig校验。 */
    items: { rows: any[] };
    /** 真实语言输入，测试不建立语言Map。 */
    language: { rows: any[] };
    /** 真实装备输入，允许为反例构造缺行或坏属性文本。 */
    equipment: { rows: any[] };
    /** 真实评分输入，保留mapping与idx差异。 */
    scores: { rows: any[] };
    /** 真实套装输入，覆盖2/3/4档位。 */
    sets: { rows: any[] };
    /** 真实属性图片输入，不能由属性ID猜图。 */
    attributeIcons: { rows: any[] };
}

/** 每个反例从全表创建独立副本，不修改共享配置或其他测试的来源。 */
function source(): EquipmentTestSource {
    return {
        items: file("item"), language: file("language"), equipment: file("equipmenttype"),
        scores: file("scorecount"), sets: file("equipmentsettype"), attributeIcons: file("attrshow"),
    };
}

/** 每个规则反例在独立仓库中走同一schema校验与主键索引，不注入页面或另建生产缓存。 */
async function prepare(input: EquipmentTestSource): Promise<GameConfig> {
    const files: Partial<Record<ConfigName, unknown>> = {
        [GConfig.Item]: input.items,
        [GConfig.Language]: input.language,
        [GConfig.EquipmentType]: input.equipment,
        [GConfig.ScoreCount]: input.scores,
        [GConfig.EquipmentSetType]: input.sets,
        [GConfig.AttributeShow]: input.attributeIcons,
    };
    const names = Object.keys(files) as ConfigName[];
    const config = new GameConfig(async path => {
        const name = names.find(name => CONFIG_SCHEMA[name].path === path);
        assert(name, "测试不读取六张装备显示配置以外的源文件");
        return files[name];
    });
    await config.prepare(names);
    return config;
}

/** 把修改过的真实输入安装到隔离GameConfig，再执行同一生产投影入口。 */
async function project(itemId: number, input: EquipmentTestSource) {
    return EquipmentDetailUtils.read(itemId, await prepare(input));
}

/** 检查所有真实装备及可恢复展示缺口，不改动共享配置或页面资源。 */
async function main(): Promise<void> {
    const input = source();
    const before = JSON.stringify(input);
    const db = await prepare(input);
    const sharedLanguage = db.getConfig(GConfig.Language);
    const originalGetConfig = db.getConfig.bind(db);
    db.getConfig = ((name: ConfigName, key?: unknown) => {
        assert(name !== GConfig.Language || key !== undefined, "语言只按键读取，不再拉整表重建Map");
        return (originalGetConfig as any)(name, key);
    }) as GameConfig["getConfig"];
    const sword = EquipmentDetailUtils.read(1001001, db)!;
    assert(sword);
    assert.equal(sword.name, "银制利剑");
    assert.equal(sword.typeLine, "类型:武器");
    assert.equal(sword.rarity, 1);
    assert.equal(sword.star, 1);
    assert.equal(sword.score, 33);
    assert.equal(sword.description, "普通的银制剑，不太耐用");
    assert.equal(sword.icon, "icons/item/backpack_1001001");
    assert.deepEqual(sword.attributes, [{ id: 220, name: "攻击", value: "33", icon: "bag/ui/backpack-info_spr-attr-220" }]);
    assert.equal(sword.set, null, "无套装不生成空白套装段");
    const setSword = EquipmentDetailUtils.read(1001007, db)!;
    assert(setSword?.set);
    assert.equal(setSword.rarity, 3);
    assert.equal(setSword.star, 3);
    assert.equal(setSword.score, 276);
    assert.equal(setSword.set.name, "雷鸣套装");
    assert.equal(setSword.set.count, 0);
    assert.equal(setSword.set.total, 4);
    assert.deepEqual(setSword.set.bonuses.map(row => row.required), [2, 3, 4]);
    assert.deepEqual(setSword.set.bonuses.map(row => row.condition), ["(2件启动)", "(3件启动)", "(4件启动)"]);
    assert.deepEqual(setSword.set.bonuses.map(row => row.attributes[0].value), ["2.0%", "3.0%", "1.0%"]);
    assert.deepEqual(setSword.set.bonuses.map(row => row.attributes[0].icon), [
        "bag/ui/backpack-info_spr-attr-223", "bag/ui/backpack-info_spr-attr-220", "bag/ui/backpack-info_spr-attr-223",
    ]);
    const redSword = EquipmentDetailUtils.read(1001017, db)!;
    assert(redSword);
    assert.equal(redSword.rarity, 5);
    assert.equal(redSword.star, 6);
    assert.equal(redSword.score, 4137);
    assert.deepEqual(redSword.attributes.map(row => [row.id, row.value]), [[220, "3780"], [222, "510"]]);
    assert.equal(redSword.attributes[1].icon, "bag/ui/backpack-info_spr-attr-220", "暴击伤害图标必须读取attrshow.icon而非属性ID");
    const redHelmet = EquipmentDetailUtils.read(1002017, db)!;
    assert(redHelmet);
    assert.equal(redHelmet.score, 3247, "生命48750按666万分比向上取整，未映射的格挡属性贡献0");
    assert(redHelmet.attributes.some(row => row.id === 210 && row.value === "400"), "无评分映射不删除真实基础属性");
    assert.equal(EquipmentDetailUtils.read(908101, db), null, "装备页灵器mode18不套入普通装备详情");
    assert.equal(EquipmentDetailUtils.read(900102, db), null, "普通道具不套入普通装备详情");
    assert.equal(EquipmentDetailUtils.read(2000002, db), null, "精灵详情独立");
    assert.equal(EquipmentDetailUtils.read(999999999, db), null);
    assert.equal(input.equipment.rows.length, 68);
    for (const row of input.equipment.rows) {
        const detail = EquipmentDetailUtils.read(row.equipment_type, db);
        assert(detail, "全部68条普通装备均应有完整只读投影：" + row.equipment_type);
        assert(detail.attributes.length > 0 && detail.attributes.length <= 2);
        assert(Number.isSafeInteger(detail.score));
        assert(detail.star >= 1 && detail.star <= 6);
        assert(detail.attributes.every(attribute => !attribute.name.includes("缺失") && attribute.value.length));
        if (row.set_type) {
            assert(detail.set && detail.set.bonuses.length === 3 && detail.set.bonuses.every(bonus => bonus.attributes.length === 1));
        } else {
            assert.equal(detail.set, null);
        }
    }
    assert.equal(JSON.stringify(input), before, "计算不改配置、排序或源属性数组");

    // 同一ID来自另一份已安装配置时必须读到新文案，不能复用上次页面的语言/详情缓存。
    const revisedLanguage = input.language.rows.map(row => Number(row.key) === 1001001
        ? { ...row, value: "新版本银制利剑" } : row);
    const revised = await project(1001001, { ...input, language: { rows: revisedLanguage } });
    assert.equal(revised?.name, "新版本银制利剑");
    assert.equal(EquipmentDetailUtils.read(1001001, db)?.name, "银制利剑", "独立配置仓库之间不串缓存");

    // 同一属性分两行时旧算法分别ceil；不能先合并为30再计算一次ceil。
    const split = source();
    const splitRows = split.equipment.rows.map(row => row.equipment_type === 1002001
        ? { ...row, ability: '[{"223":15},{"223":15}]' } : row);
    const splitDetail = (await project(1002001, { ...split, equipment: { rows: splitRows } }))!;
    assert.equal(splitDetail.score, 2);
    assert.equal(splitDetail.attributes.length, 2);
    // 保留旧Lua先除再乘的IEEE浮点顺序；数学等价的乘后除在ceil边界可能得出不同评分。
    const boundaryEquipment = input.equipment.rows.map(row => row.equipment_type === 1001001
        ? { ...row, ability: '[{"220":100}]' } : row);
    const boundaryScores = input.scores.rows.map(row => row.mapping === 220 ? { ...row, ratio: 700 } : row);
    assert.equal(Math.ceil(100 * (700 / 10000)), 8);
    assert.equal(Math.ceil(100 * 700 / 10000), 7);
    assert.equal((await project(1001001, { ...input,
        equipment: { rows: boundaryEquipment }, scores: { rows: boundaryScores } }))!.score, 8);
    // 评分排序按scorecount.idx，不能依赖JSON中属性数组恰好已经有序。
    const unsorted = input.equipment.rows.map(row => row.equipment_type === 1001017
        ? { ...row, ability: '[{"222":510},{"220":3780}]' } : row);
    assert.deepEqual((await project(1001017, { ...input, equipment: { rows: unsorted } }))!.attributes.map(row => row.id), [220, 222]);

    const warnings: string[] = [];
    const warnBefore = GameLog.shared.warnOnce;
    GameLog.shared.warnOnce = (_layer, _source, _code, message) => { warnings.push(message); };
    try {
        assert.equal(await project(1001001, { ...input, equipment: { rows: [] } }), null);
        assert.equal(await project(1001001, { ...input, attributeIcons: { rows: [] } }), null);
        assert.equal(await project(1001007, { ...input, sets: { rows: [] } }), null);
        assert.equal(await project(1001001, { ...input, language: { rows: [] } }), null);
        assert.equal(await project(1001001, { ...input, scores: { rows: [] } }), null);
        const malformed = input.equipment.rows.map(row => row.equipment_type === 1001001 ? { ...row, ability: "{bad" } : row);
        assert.equal(await project(1001001, { ...input, equipment: { rows: malformed } }), null);
        const noSetType = input.equipment.rows.map(row => row.equipment_type === 1001001 ? { ...row, set_type: undefined } : row);
        assert.equal(await project(1001001, { ...input, equipment: { rows: noSetType } }), null);
        const duplicateMapping = input.scores.rows.map((row, index) => index === 1 ? { ...row, mapping: input.scores.rows[0].mapping } : row);
        assert.equal(await project(1001001, { ...input, scores: { rows: duplicateMapping } }), null, "idx不同但mapping重复仍拒绝");
        assert.equal(warnings.length, 8, "每处不可安全展示缺口均有具体来源，而非伪造零值成功");
        assert(warnings.every(message => message.includes("itemId=") && message.includes("普通装备详情不可展示")));
    } finally {
        GameLog.shared.warnOnce = warnBefore;
    }
    assert.equal(originalGetConfig(GConfig.Language), sharedLanguage, "投影直接查询原配置，未替换或复制语言索引");
    console.log("PASS Equipment detail: 68 configurations, legacy per-attribute ceil/sort/icons, empty-wear sets, raw values and missing-data refusal");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
