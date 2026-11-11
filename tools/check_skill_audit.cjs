/** 使用真实配置核验技能验收目录的等级、未实现状态与演示战报证据，不启动Creator或访问玩家库。 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const { resolveBundleFile } = require("./bundle-paths.cjs");
const esbuild = require(path.join(root, "client/node_modules/esbuild"));
const tables = Object.fromEntries([['HeroType','herotype'],['HeroSkill','heroskill'],['Language','language']]
    .map(([name,file]) => [name,JSON.parse(fs.readFileSync(path.join(root, `client/assets/bundles/resources/config/${file}.json`),'utf8'))]));
const config = {
    requireConfig(name,id) { return tables[name].rows.find(row => row.type === id); },
    getFile(name) { return tables[name]; },
    getConfig(name,id) { return tables[name].rows.find(row => row.key === id); }
};
const moduleOut = {exports:{}};
const built = esbuild.buildSync({entryPoints:[path.join(root,'client/assets/scripts/features/battle/utils/SkillAuditUtils.ts')],
    bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
new Function('module','exports','require',built)(moduleOut,moduleOut.exports,require);
const utils = moduleOut.exports.SkillAuditUtils;
const codecModule = {exports:{}};
const codec = esbuild.transformSync(fs.readFileSync(path.join(root,'client/assets/scripts/platform/GameProtocol.generated.ts'),'utf8'),
    {loader:'ts',format:'cjs'}).code;
new Function('module','exports','require',codec)(codecModule,codecModule.exports,require);
for (const level of [1, 2]) {
    const entry = utils.skills(10105011, config).find(row => row.id === 101050113 && row.level === level);
    assert.equal(entry.status, "规则已验证");
    assert.equal(entry.fixture, null);
}
let total = 0, playable = 0;
for (const hero of tables.HeroType.rows) {
    const entries = utils.skills(hero.type,config);
    const ids = new Set([hero.skill_1,hero.skill_2,hero.skill_3,hero.skill_4,hero.skill_5].filter(Boolean));
    assert.equal(entries.length,tables.HeroSkill.rows.filter(row => ids.has(row.type)).length);
    for (const entry of entries) {
        total++;
        if (!entry.fixture) { assert.ok(['未接入','部分接入','规则已验证'].includes(entry.status)); assert.ok(entry.reason); continue; }
        playable++;
        const replay = codecModule.exports.mxzg.game.BattleReplay.decode(fs.readFileSync(path.join(root,'backend/target',entry.fixture)));
        assert.ok(replay.units.some(unit => unit.templateId === hero.type), '演示不能使用其他英雄冒充');
        const skill = tables.HeroSkill.rows.find(row => row.type === entry.id && row.level === entry.level);
        if ([1,2].includes(skill.active_type)) {
            assert.ok(replay.phases.some(phase => phase.events.some(event => event.kind === 'skill.begin'
                && event.configId === entry.id && event.skillLevel === entry.level)), `战报缺少登记技能 ${entry.id}:${entry.level}`);
        } else {
            const report = JSON.parse(fs.readFileSync(path.join(root,'backend/target',entry.fixture.replace('-replay.pb','-report.json')),'utf8'));
            assert.ok(report.initial.some(unit => unit.template === hero.type
                && unit.skills.some(skill => skill.skillId === entry.id && skill.level === entry.level)));
        }
    }
}
assert.ok(utils.skills(10205023,config).some(row => row.id === 102050233 && row.level === 3 && !row.fixture));
console.log(`PASS 技能验收目录：${tables.HeroType.rows.length}英雄，${total}技能等级条目，${playable}个已登记演示；等级不互相冒认。`);

// 克隆静态按钮/提示节点必须生成各自fileId，防止Creator编辑预制体时报parameter error。
for (const name of ['gm/GmView','battle/SkillAuditView','battle/SkillAuditCellView']) {
    const objects = JSON.parse(fs.readFileSync(resolveBundleFile(name.split("/")[0]+"/prefabs/"+name.split("/")[1]+".prefab"),'utf8'));
    const ids = objects.filter(value => value.fileId).map(value => value.fileId);
    assert.equal(new Set(ids).size, ids.length, `${name} 内部fileId重复`);
}
