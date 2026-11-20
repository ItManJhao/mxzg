/**
 * 主线依赖审计专项：防止递归环、缺Buff、过期Java证据或仅有配置字段被误报成支持。
 * node tools/test_main_chapter_dependencies.cjs 只读核对当前报告；--snapshot=YYYYMMDD核对指定保留批次。
 * 小夹具只验证失败路径，不能替代850关扫描。
 * 不启动数据库、日常服务、Creator，不运行战斗或发奖。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MainChapterDependencyAudit: Audit } = require('./audit_main_chapter_dependencies.cjs');
const { createBundlePaths } = require('./bundle-paths.cjs');

/** 构造仅供失败分支的递归图；真实完整范围在main中独立读取，不能用此图充当配置来源。 */
function recursiveFixture() {
    return {
        arts: new Map([
            [1, { idx: 1, buff_list: '[10,11]' }],
            [2, { idx: 2, buff_list: '[12]' }],
            [3, { idx: 3, buff_list: '[13]' }],
        ]),
        buffs: new Map([
            [10, { idx: 10, art_list: '[2]' }],
            [11, { idx: 11, art_list: '[3]' }],
            [12, { idx: 12, art_list: '[1]' }],
            [13, { idx: 13, art_list: '[]' }],
        ]),
    };
}

/** 验证递归保留全部分支、准确报环和缺行，并且不修改源配置。 */
function graphChecks() {
    const skill = { type: 99, level: 1, art_list: '[1]' };
    const fixture = recursiveFixture();
    const before = JSON.stringify([...fixture.buffs.values()]);
    const report = Audit.collectSkill(skill, fixture);
    assert.deepEqual(report.arts.map(row => row.idx), [1, 2, 3]);
    assert.deepEqual(report.buffs.map(row => row.idx), [10, 12, 11, 13]);
    assert.deepEqual(report.gaps, [{ code: 'ART_CYCLE', key: '1', reason: '1 -> 2 -> 1' }]);
    assert.equal(JSON.stringify([...fixture.buffs.values()]), before);
    fixture.buffs.delete(12);
    assert(Audit.collectSkill(skill, fixture).gaps.some(gap => gap.code === 'BUFF_MISSING' && gap.key === '12'));
    fixture.arts.delete(3);
    assert(Audit.collectSkill(skill, fixture).gaps.some(gap => gap.code === 'ART_MISSING' && gap.key === '3'));
    const semantic = { arts: new Map([[1, { idx: 1, buff_list: '[10]' }]]),
        buffs: new Map([[10, { idx: 10, art_list: '[]' }], [20, { idx: 20, art_list: '[]' }]]),
        buffReferences: new Map([['10', [20]], ['20', [10]]]) };
    const linked = Audit.collectSkill(skill, semantic);
    assert.deepEqual(linked.buffs.map(row => row.idx), [10, 20], '实际处理器提供的反向Buff也必须进入闭包');
    assert(linked.gaps.some(gap => gap.code === 'BUFF_CYCLE'), '语义引用成环不能无限递归');
    assert.throws(() => Audit.array('{}', 'test'), /必须为数组/);
    assert.equal(Audit.status([], []), 'supported');
    assert.equal(Audit.status([], ['unknown']), 'unverified');
    assert.equal(Audit.status(['missing'], ['unknown']), 'blocked');
}

/** 用真实Java证据和850关报告验证能力/素材引用闭合，避免生成一个固定数字的假扫描。 */
function realEvidenceChecks(snapshot) {
    const root = path.resolve(__dirname, '..');
    const bundles = createBundlePaths(root);
    const evidence = Audit.json(path.join(root, 'backend/target/main-chapter-dependency-capabilities.json'));
    Audit.validateEvidence(root, evidence, bundles);
    const report = Audit.build(root, evidence, { bundles, snapshot });
    const output = Audit.outputPath(root, snapshot);
    const saved = Audit.json(output + '.json');
    assert.deepEqual(saved, report, '报告必须来自当前真实配置、能力和资源');
    assert.equal(report.stages.length, 850);
    assert.equal(new Set(report.stages.map(stage => stage.index)).size, 850);
    assert.equal(report.summary.enemies, 5000);
    assert.equal(report.summary.distinctReferencedEnemyRows, 3200);
    assert.equal(report.summary.unreferencedEnemyRows, 1800);
    assert.equal(report.summary.coordinateMismatchStages, 300);
    for (const orphan of report.unreferencedEnemyRows) {
        assert.equal(orphan.usedForRuntime, false);
        assert(report.rawEnemyCatalog[orphan.capabilityKey], '未使用源敌组也必须有独立技能/资源证据');
        assert(report.enemyCapabilitySets[report.rawEnemyCatalog[orphan.capabilityKey].capabilitySet], '能力引用须在同份报告内闭合');
    }
    for (const index of [551, 561, 850]) {
        const stage = report.stages.find(value => value.index === index);
        assert(stage.unverified.some(gap => gap.code === 'REWARD_ENEMY_COORDINATE_MISMATCH'));
        assert(stage.mappingEvidence.unusedNoteTargets.length > 0);
        assert.notEqual(stage.status, 'supported', '高关三维与note目标冲突不能误报完全可用');
    }
    assert(report.stages.some(stage => stage.status === 'blocked'), '当前未恢复全部850关，不能全部假支持');
    const unresolved = Object.values(report.resources).filter(value => value.exists === null);
    assert.equal(report.summary.unresolvedResourceDeclarations, unresolved.length, '未解析声明数须与明细一致');
    for (const resource of unresolved) {
        assert.equal(resource.kind, 'unresolved-declaration');
        assert.deepEqual(resource.sources, [], '不能给尚未解析的声明编造源文件');
    }
    for (const stage of report.stages) {
        assert(stage.enemies.length > 0);
        for (const enemy of stage.enemies) {
            for (const key of enemy.skills) {
                const skill = report.skillCatalog[key];
                assert(skill, '必须列完整技能声明闭包');
                if (skill.runtimeRejection) assert(stage.blockers.some(gap => gap.code === 'SKILL_RUNTIME_UNSUPPORTED'
                    && gap.key === key), '真实生产拒绝不能被字段存在性覆盖');
            }
        }
        assert(report.resourceSets[stage.resourceSet], '每关资源集合引用必须闭合');
        for (const key of report.resourceSets[stage.resourceSet]) assert(report.resources[key], '资源引用必须可追踪到真实存在性证据');
        assert(report.dropCatalog[stage.rewards.dropGroup], '掉落组须引用同源实际触发器和权重');
        assert.equal(stage.status, Audit.status(stage.blockers, stage.unverified));
    }
    assert.deepEqual(report.stages.slice(0, 100).filter(stage => stage.status !== 'supported')
        .map(stage => [stage.index, stage.blockers, stage.unverified]), [], '已补齐的前100关依赖须持续闭合');
    assert(report.skillCatalog['102050083:1'].arts.some(art => art.idx === 2085101), '普攻替换后须扫描实际动作');
    assert(report.skillCatalog['101050103:1'].arts.some(art => art.idx === 1103301), '复活回退治疗须扫描实际动作');
    assert.equal(report.rewardCatalog['2000002'].grantRejection, '', '最小真实精灵发放能力应由实际领域验证');
    const stale = structuredClone(evidence);
    const firstSource = Object.keys(stale.sourceHashes)[0];
    stale.sourceHashes[firstSource] = 'stale';
    assert.throws(() => Audit.validateEvidence(root, stale, bundles), /Java能力证据过期/);
    const tiny = structuredClone(evidence);
    tiny.stages = tiny.stages.slice(0, 3);
    assert.throws(() => Audit.validateEvidence(root, tiny, bundles), /850关目录不可被小夹具替代/);
    assert.equal(report.summary.supported + report.summary.blocked + report.summary.unverified, 850);
    assert.equal(fs.readFileSync(output + '.txt', 'utf8'),
        Audit.text(report), '可读报告须与机器报告同源');
}

/** 先核失败路径，再核真实闭包；所有检查完成后才报告通过。 */
function main() {
    const args = process.argv.slice(2);
    assert(args.length <= 1 && args.every(arg => arg.startsWith('--snapshot=')), '仅支持可选snapshot参数');
    const snapshot = args.length ? args[0].slice('--snapshot='.length) : null;
    assert.throws(() => Audit.outputPath(__dirname, '../../bad'), /YYYYMMDD/);
    assert.throws(() => Audit.outputPath(__dirname, '20260231'), /有效日期/);
    Audit.outputPath(__dirname, snapshot);
    graphChecks();
    realEvidenceChecks(snapshot);
    console.log('PASS 主线依赖审计：递归分支/环/缺行、真实850关、生产技能拒绝、资源闭包、过期证据与小夹具隔离');
}

main();
