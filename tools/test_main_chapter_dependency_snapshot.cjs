/**
 * 主线审计快照标识的纯检查：验证日期、可选批次标签与路径隔离，不读取能力产物或覆盖历史报告。
 * node tools/test_main_chapter_dependency_snapshot.cjs 可在后端正在编译时独立执行，不运行Maven或服务。
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { MainChapterDependencyAudit: Audit } = require('./audit_main_chapter_dependencies.cjs');

/** 验证旧日期路径保持兼容，新批次输出独立文件，非法日期与路径字符始终拒绝。 */
function main() {
    const root = path.resolve(__dirname, '..');
    assert.equal(Audit.outputPath(root, null), path.join(root, 'client/temp/main-chapter-dependencies-current'));
    assert.equal(Audit.outputPath(root, '20261117'), path.join(root, 'docs/validation/main-chapter-dependencies-20261117'));
    assert.equal(Audit.outputPath(root, '20261117-stage4'), path.join(root, 'docs/validation/main-chapter-dependencies-20261117-stage4'));
    assert.equal(Audit.outputPath(root, '20261117-stage4-2'), path.join(root, 'docs/validation/main-chapter-dependencies-20261117-stage4-2'));
    assert.notEqual(Audit.outputPath(root, '20261117'), Audit.outputPath(root, '20261117-stage4'));
    assert.doesNotThrow(() => Audit.outputPath(root, '20240229-stage4'));
    for (const invalid of ['20260229-stage4', '20261301-stage4', '20261131-stage4']) {
        assert.throws(() => Audit.outputPath(root, invalid), /有效日期/);
    }
    for (const invalid of ['20261117-', '20261117-Stage4', '20261117-stage_4', '20261117-stage--4',
        '20261117-stage4/../../old', '20261117-stage4\\old', '20261117-stage4:old',
        '20261117-stage4%20', '20261117-stage4.json', '20261117-' + 'a'.repeat(33)]) {
        assert.throws(() => Audit.outputPath(root, invalid), /snapshot必须/);
    }
    console.log('PASS 主线审计快照：日期有效性、批次隔离、长度及路径字符拒绝；未读取或写入历史报告');
}

main();
