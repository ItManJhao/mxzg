/** 当前UI资源检查：先核对实际入口范围和全部现用引用，再保护历史迁入的原图/meta。
 * 一次性迁移报告只作来源证据，已明确退役页面不继续充当功能门槛，也不改写历史报告。
 * 不参与运行时加载；实际合图、去重和画面另由Creator验收。
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { bundleInfo, resolveAssetPath, resolveBundleFile } = require('../../tools/bundle-paths.cjs');
require('./current-resource-scope-check.cjs');
const current = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/current-resource-scope-cleanup-20261111.json')));
const currentPrefabs = new Map(current.retainedPrefabs.map(row => [resolveAssetPath(row.path), row]));
const currentPrefabText = new Map([...currentPrefabs.keys()].map(file => [file, fs.readFileSync(file, 'utf8')]));
// 仅登记离线迁移证据，不作为运行时模块资源清单。
const manifests = ['hero-static-migration-20261111.json', 'battle-static-migration-20261111.json'];

/** 计算文件摘要，保护像素、UUID和九宫格等原始设置。 */
function hash(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

for (const name of manifests) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation', name)));
    checkMigration(manifest);
}

/** 核对一批迁移的内容与绑定，失败时立即中止，不自动修复或重写资源。 */
function checkMigration(manifest) {
    let activeReferences = 0;
    let archivedReferences = 0;
    for (const row of manifest.rows) {
        const file = resolveAssetPath(row.path);
        assert.equal(hash(file), row.imageSha256, row.name + ' 图片内容变化');
        assert.equal(hash(file + '.meta'), row.metaSha256, row.name + ' meta变化');
        assert(!fs.existsSync(path.join(root, row.oldPath)), row.name + ' 旧路径仍留副本');
        assert(!fs.existsSync(path.join(root, row.oldPath + '.meta')), row.name + ' 旧meta仍存在');
        // 直接统计当前32个Prefab中的真实使用者，旧报告不决定当前页面是否必须存在。
        // 当前资源是否悬空已由current-resource-scope按全部序列化UUID检查，不能拿历史路径替代它。
        activeReferences += [...currentPrefabText.values()].filter(text => text.includes(row.uuid)).length;
        archivedReferences += row.references.filter(prefab => !currentPrefabs.has(resolveAssetPath(prefab, { optional: true }))).length;
    }
    const atlas = JSON.parse(fs.readFileSync(resolveAssetPath(manifest.atlas + '.meta')));
    assert.equal(atlas.importer, 'auto-atlas');
    assert.equal(atlas.userData.allowRotation, false);
    console.log(manifest.atlas + '：' + manifest.rows.length + '张原图/meta、' + activeReferences
        + '处实际现用绑定通过；' + archivedReferences + '处历史页面引用仅归档，不作为当前功能准入');
}
for (const file of [
    'maps/ui/map-bg-role-1.jpg',
    'hero/ui/hero-info_spr-star-1.png',
    'hero/ui/hero-info_spr-new-9.png',
    'hero/ui/hero-info_spr-skill-level-bg.png',
    'battle/ui/battle-scene_btn-speed-1.png',
    'battle/ui/battle-scene_btn-speed-2.png',
    'battle/ui/battle-scene_btn-speed-3.png',
    'battle/ui/battle-end-lang_lbl-result-0.png',
]) {
    resolveBundleFile(file);
}
console.log('英雄/战斗动态资源路径保留。');

/** 验证背包整包迁移保持内容不变，并绑定Creator远程配置；不将静态校验当作网络验收。 */
function checkBagBundle() {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/bag-remote-migration-20261111.json')));
    for (const row of manifest.rows) {
        if (row.path.endsWith('.prefab')) {
            const retained = currentPrefabs.get(resolveAssetPath(row.path));
            assert(retained, row.path + ' 不属于当前入口依赖');
            const meta = JSON.parse(fs.readFileSync(resolveAssetPath(row.path + '.meta')));
            assert.equal(meta.uuid, retained.uuid, row.path + ' 当前身份变化');
        } else {
            assert.equal(hash(resolveAssetPath(row.path)), row.sha256, row.path + ' 原资源或meta变化');
        }
        assert(!fs.existsSync(path.join(root, row.oldPath)), row.oldPath + ' 遗留重复文件');
    }
    const meta = bundleInfo('bag').meta;
    assert.equal(meta.userData.bundleName, 'bag');
    const settings = JSON.parse(fs.readFileSync(path.join(root, 'client/settings/v2/packages/builder.json')));
    const config = settings.bundleConfig.custom[meta.userData.bundleConfigID];
    assert.equal(config.configs.web.preferredOptions.isRemote, true);
    assert.equal(config.configs.web.preferredOptions.compressionType, 'merge_dep');
    const common = bundleInfo('common').meta;
    const prefabs = bundleInfo('battle').meta;
    assert.equal(common.userData.bundleName, 'common');
    assert(common.userData.priority > prefabs.userData.priority, '共用资源包优先于本地prefabs，防止被反向收进本地包');
    assert(common.userData.priority > meta.userData.priority, '背包复用共用包，避免相同优先级复制');
    assert.equal(settings.bundleConfig.custom[common.userData.bundleConfigID].configs.web.preferredOptions.isRemote, true);
    const cellUuid = JSON.parse(fs.readFileSync(resolveBundleFile('common/prefabs/BagItemView.prefab.meta'))).uuid;
    for (const prefab of ['bag/prefabs/BagView.prefab', 'battle/prefabs/ChapterEndView.prefab', 'battle/prefabs/ChapterRewardInfoCell.prefab']) {
        assert(fs.readFileSync(resolveBundleFile(prefab), 'utf8').includes(cellUuid), prefab + ' 共用格子绑定丢失');
    }
    console.log('背包及共用格子原UUID、三处现用绑定、远程配置和包优先级通过；新构建归属仍待验。');
}

checkBagBundle();
