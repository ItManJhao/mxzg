/**
 * 技能演示自动目录专项：使用真实配置和PB验证动态发现、精确等级及当前动作预检。
 * 不访问玩家库，不登记手工完成清单；静态可播放不签署视觉或全部被动验收。
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const { resolveBundleFile } = require("./bundle-paths.cjs");
const esbuild = require(path.join(root, "client/node_modules/esbuild"));
const tables = Object.fromEntries([["HeroType", "herotype"], ["HeroSkill", "heroskill"], ["Language", "language"], ["Buff", "buff"]]
    .map(([name, file]) => [name, JSON.parse(fs.readFileSync(path.join(root, "client/assets/bundles/resources/config", file + ".json"), "utf8"))]));
const config = {
    requireConfig(name, id) {
        const row = tables[name].rows.find(value => value.type === id);
        assert.ok(row, "缺少测试配置 " + name + ":" + id);
        return row;
    },
    getConfig(name, id) {
        return id === undefined ? tables[name].rows : tables[name].rows.find(row => row.key === id);
    },
    getFileByPath(name) {
        assert.equal(name, "config/buff");
        return tables.Buff;
    },
};
const moduleOut = { exports: {} };
const built = esbuild.buildSync({
    entryPoints: [path.join(root, "client/assets/scripts/features/battle/utils/SkillAuditUtils.ts")],
    bundle: true, platform: "node", format: "cjs", write: false,
}).outputFiles[0].text;
new Function("module", "exports", "require", built)(moduleOut, moduleOut.exports, require);
const utils = moduleOut.exports.SkillAuditUtils;
const target = path.join(root, "backend/target");
const evidence = [];
let replayCount = 0;
for (const file of fs.readdirSync(target).filter(name => /^[a-z0-9-]+\.pb$/.test(name)).sort()) {
    try {
        const found = utils.inspectReplay(file, fs.readFileSync(path.join(target, file)), config);
        if (found.length) {
            evidence.push(...found);
            replayCount++;
        }
    } catch {
        // target还含消息信封、坏格式和不支持的历史夹具；它们不能冒充可播放战报。
    }
}
assert.ok(replayCount > 10, "真实目标目录必须提供足够的动态样本");
const fixture = "chapter-1-1-1-replay.pb";
const bytes = fs.readFileSync(path.join(target, fixture));
const original = utils.inspectReplay(fixture, bytes, config);
assert.ok(original.some(row => row.skillId === 101010011 && row.level === 1));
const novel = utils.inspectReplay("new-skill-without-registration.pb", bytes, config);
assert.deepEqual(novel.map(row => [row.heroId, row.skillId, row.level]), original.map(row => [row.heroId, row.skillId, row.level]));
assert.ok(novel.every(row => row.fixture === "new-skill-without-registration.pb"), "新文件不需要登记白名单");
assert.throws(() => utils.inspectReplay("../escape.pb", bytes, config), /文件名/);
assert.throws(() => utils.inspectReplay("invalid.pb", new Uint8Array([0]), config));
assert.throws(() => utils.inspectReplay(fixture, bytes, { ...config, getFileByPath: () => ({ rows: [] }) }), /缺少战斗配置/);
const level1 = utils.skills(10101001, evidence, config).find(row => row.id === 101010011 && row.level === 1);
assert.ok(level1.fixture);
assert.equal(level1.status, "有演示");
assert.equal(utils.skills(10101001, [], config).filter(row => row.fixture).length, 0, "没有战报不能沿用人工状态");
assert.ok(utils.skills(10101001, [], config).every(row => row.status !== "未接入" && row.status !== "已验收"));
const exact = utils.skills(10101001, original, config);
assert.ok(exact.filter(row => row.id === 101010011 && row.level !== 1).every(row => !row.fixture), "一级证据不能扩散到其他等级");
assert.ok(utils.skills(10205023, [], config).filter(row => ![1, 2].includes(row.activeType))
    .every(row => row.status === "需触发场景"), "被动不伪造施法演示");
const stage10 = utils.inspectReplay("chapter-config-stage-10.pb", fs.readFileSync(path.join(target, "chapter-config-stage-10.pb")), config);
const discovered = new Set(stage10.map(row => row.heroId + ":" + row.skillId + ":" + row.level));
assert.ok(discovered.size >= 8, "新增关卡的真实出手自动纳入");
let total = 0;
let playable = 0;
for (const hero of tables.HeroType.rows) {
    const rows = utils.skills(hero.type, evidence, config);
    const ids = new Set([hero.skill_1, hero.skill_2, hero.skill_3, hero.skill_4, hero.skill_5].filter(Boolean));
    assert.equal(rows.length, tables.HeroSkill.rows.filter(row => ids.has(row.type)).length);
    total += rows.length;
    playable += rows.filter(row => row.fixture).length;
    assert.ok(rows.every(row => row.status !== "已验收"));
}
for (const name of ["gm/GmView", "battle/SkillAuditView", "battle/SkillAuditCellView"]) {
    const objects = JSON.parse(fs.readFileSync(resolveBundleFile(name.split("/")[0] + "/prefabs/" + name.split("/")[1] + ".prefab"), "utf8"));
    const ids = objects.filter(value => value.fileId).map(value => value.fileId);
    assert.equal(new Set(ids).size, ids.length, name + "内部fileId重复");
}
console.log("PASS 自动技能目录：" + replayCount + "份可解析战报，" + total + "个配置等级，" + playable + "个精确等级有真实出手；不签署已验收。");
