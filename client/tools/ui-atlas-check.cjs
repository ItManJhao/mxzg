/** 背包自动图集检查：原图保留原 UUID，预制体直接绑定，物品图标独立。
 * 不运行 Creator 合图；构建产物与画面需另验。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { bundleRoot, resolveBundleFile } = require('../../tools/bundle-paths.cjs');
// 按旧图集复原的明确增量，不改写原迁移时的字节基线。
const equipmentImages = JSON.parse(fs.readFileSync(path.join(root,
    'docs/validation/equipment-detail-assets-20261114.json'), 'utf8')).resources;
const directory = path.join(bundleRoot('bag'), 'atlas');
const pac = JSON.parse(fs.readFileSync(path.join(directory, 'BagAtlas.pac'), 'utf8'));
assert.equal(pac.__type__, 'cc.SpriteAtlas');
assert(!fs.existsSync(path.join(root, 'client/assets/bundles/module/bag/ui/atlas')),
    '静态界面图不应同时保留在 resources 中');
for (const [name, prefab, originalUuid, originalHash] of [
    ['backpack-info_spr-line', 'BagInfoView', 'c6234db7-ebbd-43bb-863f-6c99505dbdc3',
        '9548a42c05d44f7713a3579e52c2b6cbaf7595bd0cab747a7f2527832b7cafe8'],
    ['backpack_spr-select', 'BagItemView', '6c69245c-edfa-463d-a6a4-c897ba93ac12',
        'd73973c3da35d39521917dd1082b462ab9125507f120d08c0045ec725a7ff07d'],
]) {
    const owner = prefab === 'BagItemView' ? 'common' : 'bag';
    const imageDirectory = path.join(bundleRoot(owner), owner === 'common' ? 'item-atlas' : 'atlas');
    const meta = JSON.parse(fs.readFileSync(path.join(imageDirectory, name + '.png.meta'), 'utf8'));
    assert.equal(meta.uuid, originalUuid, '保留图片 UUID');
    assert.equal(meta.subMetas.f9941.uuid, originalUuid + '@f9941', '保留帧 UUID');
    const file = path.join(imageDirectory, name + '.png');
    const restored = equipmentImages.find(row => path.resolve(root, row.path) === file && row.pixelsCorrected);
    if (restored) {
        assert.equal(restored.beforeSha256, originalHash, '图集复原必须承接原迁移图片基线');
        assert.equal(restored.uuid, originalUuid, '图集复原不得重建UUID');
        assert.equal(restored.rgbaMatched, true, '图集复原必须逐像素核对旧图');
    }
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
        restored ? restored.afterSha256 : originalHash, '图片必须符合原迁移或已核实的旧图像素恢复记录');
    const view = fs.readFileSync(resolveBundleFile(owner + '/prefabs/' + prefab + '.prefab'), 'utf8');
    assert(view.includes(meta.subMetas.f9941.uuid), '预制体直接绑定原图帧');
}
assert(!fs.readdirSync(directory).some(name => /^backpack_\d+\.png$/.test(name)), '物品图标不得进入界面图集');
assert(!fs.existsSync(path.join(directory, '../BagAtlas.plist')), '不保留实体图集重复链');
const background = path.join(root, 'client/assets/bundles/module/bag/background/map-bg-backpack-1.jpg');
const backgroundMeta = JSON.parse(fs.readFileSync(background + '.meta', 'utf8'));
assert.equal(backgroundMeta.uuid, '93839820-644d-46de-9cf5-c2029669b85e', '背景归档保留原 UUID');
assert(fs.readFileSync(path.join(root, 'client/assets/bundles/module/bag/prefabs/BagView.prefab'), 'utf8')
    .includes(backgroundMeta.subMetas.f9941.uuid), '背包背景依然由预制体绑定加载');
console.log('自动图集原图、UUID、预制体绑定及物品边界检查通过；构建合图另验');

/** 递归读取构建文件；只检查，不删除原图或修改构建清单。 */
function filesIn(directoryPath) {
    return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directoryPath, entry.name);
        return entry.isDirectory() ? filesIn(file) : [file];
    });
}

// 可选构建目录用于重建后检查副本；默认专项不拿历史构建冒充当前结果。
if (process.argv[2] === '--build-output') {
    assert(process.argv[3], '需要指定构建输出目录');
    const build = path.resolve(root, process.argv[3]);
    assert(fs.existsSync(path.join(build, 'index.html')), '必须是完整 Web 构建目录');
    const settings = JSON.parse(fs.readFileSync(path.join(build, 'src/settings.json'), 'utf8'));
    for (const name of ['bag', 'common']) {
        assert(settings.assets.remoteBundles.includes(name), name + ' 未配置为远程包');
    }
    const common = JSON.parse(fs.readFileSync(path.join(build, 'remote/common/config.json'), 'utf8'));
    const cellIndex = common.uuids.indexOf('c46KGyfTNPYZoga14NTI8R');
    assert(cellIndex >= 0, 'common构建缺少原格子UUID');
    const redirects = common.redirect || [];
    for (let index = 0; index < redirects.length; index += 2) {
        assert.notEqual(redirects[index], cellIndex, '共用格子仍被重定向到其他包');
    }
    assert.equal(common.paths[cellIndex][0], 'prefabs/BagItemView');
    assert(!common.deps.includes('bag') && !common.deps.includes('prefabs'),
        '共用包反向依赖业务包，需要核对循环与资源优先级');
    const duplicates = filesIn(path.join(build, 'assets')).filter(file =>
        /(?:6c69245c-edfa-463d-a6a4-c897ba93ac12|c6234db7-ebbd-43bb-863f-6c99505dbdc3)(?:\.[^/\\]+)?\.png$/.test(file));
    assert.deepEqual(duplicates, [], '本地包仍包含应由远程包持有的背包原图；不得直接删除，需检查跨包归属');
    console.log('本地包未包含背包两张原图；远程包可保留有动态路径的原图，运行时另验');
}
