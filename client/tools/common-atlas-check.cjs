/** 公共静态图迁移检查：保护图片及meta原样、原Prefab绑定和登录/动态资源边界。
 * 构建后的真实合图及跨页画面仍由独立浏览器验收，不凭配置宣称发布成功。
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/common-static-migration-20261110.json')));

/** 读取文件摘要，检测迁移期间像素和九宫格等meta设置是否改变。 */
function hash(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

assert.equal(manifest.rows.length, 7);
for (const row of manifest.rows) {
    const file = path.join(root, row.path);
    assert.equal(hash(file), row.imageSha256, row.name + ' 图片变化');
    assert.equal(hash(file + '.meta'), row.metaSha256, row.name + ' meta变化');
    assert(!fs.existsSync(path.join(root, row.oldPath)), row.name + ' 旧路径仍留副本');
    assert(!fs.existsSync(path.join(root, row.oldPath + '.meta')), row.name + ' 旧meta仍留副本');
    for (const prefab of row.references) {
        assert(fs.readFileSync(path.join(root, prefab), 'utf8').includes(row.uuid), prefab + ' 原绑定丢失');
    }
}
for (const name of ['button_btn-close-1', 'win-bg_block-bg-5', 'loading_bg-white', 'backpack_spr-default', 'button_btn-tab-23', 'button_btn-tab-24', ...Array.from({ length: 7 }, (_, index) => 'other_rare-' + index)]) {
    assert(fs.existsSync(path.join(root, 'client/assets/resources/ui/common', name + '.png')), name + ' 动态或登录路径被改动');
}
const atlas = JSON.parse(fs.readFileSync(path.join(root, manifest.atlas + '.meta')));
assert.equal(atlas.importer, 'auto-atlas');
assert.equal(atlas.userData.allowRotation, false);
console.log('common静态迁移通过：7张原图/meta、跨模块原UUID绑定、登录和动态路径保留。');

// 发布包检查复用同一引用核验；只检查，不能替代实际浏览器画面验收。
const buildArgument = process.argv.indexOf('--build-output');
if (buildArgument >= 0) {
    assert(process.argv[buildArgument + 1], '缺少构建目录');
    const { dedupeBagBuild } = require('./dedupe-bag-build.cjs');
    const report = dedupeBagBuild(process.argv[buildArgument + 1]);
    assert.equal(report.files, 0, '构建包仍有已核实的原图副本，请核对构建钩子');
    console.log('UI构建包引用核验通过，9张名单原图副本均已移除。');
}
