/** 公共静态图迁移检查：保护图片及meta原样、原Prefab绑定和登录/动态资源边界。
 * 构建后的真实合图及跨页画面仍由独立浏览器验收，不凭配置宣称发布成功。
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { resolveAssetPath, resolveBundleFile } = require('../../tools/bundle-paths.cjs');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/common-static-migration-20261110.json')));
/** 历史迁移证据中的旧页面已按当前范围退役；只允许跳过本批有明确删除记录的引用。 */
const cleanup = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/current-resource-scope-cleanup-20261111.json')));
const retiredPrefabs = new Set(cleanup.removed.prefabs.map(row => row.path));
// 精灵详情批已核实公共按钮原RGBA修正；历史迁移记录不覆盖为新哈希。
const restoredImages = JSON.parse(fs.readFileSync(path.join(root,
    'docs/validation/spirit-detail-assets-20261114.json'), 'utf8')).resources;

/** 读取文件摘要，检测迁移期间像素和九宫格等meta设置是否改变。 */
function hash(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

assert.equal(manifest.rows.length, 7);
for (const row of manifest.rows) {
    const file = resolveAssetPath(row.path);
    const restored = restoredImages.find(image => path.resolve(root, image.path) === file && image.changed);
    if (restored) {
        assert.equal(restored.beforeFileSha256, row.imageSha256, '公共图像素修正必须承接原迁移基线');
        assert.equal(restored.uuid, row.uuid.split('@')[0], '公共图像素修正保持原图片UUID');
        const meta = JSON.parse(fs.readFileSync(file + '.meta', 'utf8'));
        assert.equal(meta.subMetas.f9941.uuid, row.uuid, '公共图像素修正保持原SpriteFrame UUID');
    }
    assert.equal(hash(file), restored ? restored.afterFileSha256 : row.imageSha256, row.name + ' 图片变化');
    assert.equal(hash(file + '.meta'), row.metaSha256, row.name + ' meta变化');
    assert(!fs.existsSync(path.join(root, row.oldPath)), row.name + ' 旧路径仍留副本');
    assert(!fs.existsSync(path.join(root, row.oldPath + '.meta')), row.name + ' 旧meta仍留副本');
    for (const prefab of row.references) {
        const target = resolveAssetPath(prefab, { optional: true });
        if (!target) {
            assert(retiredPrefabs.has(prefab), prefab + ' 既未保留也没有明确退役证据');
            continue;
        }
        assert(fs.readFileSync(target, 'utf8').includes(row.uuid), prefab + ' 原绑定丢失');
    }
}
for (const name of ['button_btn-close-1', 'win-bg_block-bg-5', 'backpack_spr-default', 'button_btn-tab-23', 'button_btn-tab-24', ...Array.from({ length: 7 }, (_, index) => 'other_rare-' + index)]) {
    resolveBundleFile('common/ui/' + name + '.png');
}
const atlas = JSON.parse(fs.readFileSync(resolveAssetPath(manifest.atlas + '.meta')));
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
    console.log('旧删除名单为空，不对可寻址的Bundle原图做删除；合图需检查实际产物。');
}
