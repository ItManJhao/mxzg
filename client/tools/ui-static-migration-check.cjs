/** UI静态资源迁移检查：校验原图、meta及预制体引用不变，防止归档破坏绑定。
 * 读取一次性迁移证据，不参与运行时加载；实际合图、去重和画面另由Creator验收。
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
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
    for (const row of manifest.rows) {
        const file = path.join(root, row.path);
        assert.equal(hash(file), row.imageSha256, row.name + ' 图片内容变化');
        assert.equal(hash(file + '.meta'), row.metaSha256, row.name + ' meta变化');
        assert(!fs.existsSync(path.join(root, row.oldPath)), row.name + ' 旧路径仍留副本');
        assert(!fs.existsSync(path.join(root, row.oldPath + '.meta')), row.name + ' 旧meta仍存在');
        for (const prefab of row.references) {
            assert(fs.readFileSync(path.join(root, prefab), 'utf8').includes(row.uuid), prefab + ' 原绑定丢失');
        }
    }
    const atlas = JSON.parse(fs.readFileSync(path.join(root, manifest.atlas + '.meta')));
    assert.equal(atlas.importer, 'auto-atlas');
    assert.equal(atlas.userData.allowRotation, false);
    console.log(manifest.atlas + '：' + manifest.rows.length + '张原图/meta及绑定校验通过');
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
    assert(fs.existsSync(path.join(root, 'client/assets/bundles', file)), file + ' 动态路径被迁走');
}
console.log('英雄/战斗动态资源路径保留。');

/** 验证背包整包迁移保持内容不变，并绑定Creator远程配置；不将静态校验当作网络验收。 */
function checkBagBundle() {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/bag-remote-migration-20261111.json')));
    for (const row of manifest.rows) {
        assert.equal(hash(path.join(root, row.path)), row.sha256, row.path + ' 迁移内容变化');
        assert(!fs.existsSync(path.join(root, row.oldPath)), row.oldPath + ' 遗留重复文件');
    }
    const meta = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/bundles/bag.meta')));
    assert.equal(meta.userData.bundleName, 'bag');
    const settings = JSON.parse(fs.readFileSync(path.join(root, 'client/settings/v2/packages/builder.json')));
    const config = settings.bundleConfig.custom[meta.userData.bundleConfigID];
    assert.equal(config.configs.web.preferredOptions.isRemote, true);
    assert.equal(config.configs.web.preferredOptions.compressionType, 'merge_dep');
    const common = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/bundles/common.meta')));
    const prefabs = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/bundles/battle.meta')));
    assert.equal(common.userData.bundleName, 'common');
    assert(common.userData.priority > prefabs.userData.priority, '共用资源包优先于本地prefabs，防止被反向收进本地包');
    assert(common.userData.priority > meta.userData.priority, '背包复用共用包，避免相同优先级复制');
    assert.equal(settings.bundleConfig.custom[common.userData.bundleConfigID].configs.web.preferredOptions.isRemote, true);
    const cellUuid = JSON.parse(fs.readFileSync(path.join(root, 'client/assets/bundles/common/prefabs/BagItemView.prefab.meta'))).uuid;
    for (const prefab of ['bundles/bag/prefabs/BagView', 'bundles/battle/prefabs/ChapterEndView', 'bundles/item/prefabs/ItemRewardLayer', 'bundles/battle/prefabs/ChapterRewardInfoCell']) {
        assert(fs.readFileSync(path.join(root, 'client/assets', prefab + '.prefab'), 'utf8').includes(cellUuid), prefab + ' 共用格子绑定丢失');
    }
    console.log('背包及共用格子原UUID、四处绑定、远程配置和包优先级通过；新构建归属仍待验。');
}

checkBagBundle();
