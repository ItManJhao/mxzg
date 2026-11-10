/** 背包自动图集检查：原图保留原 UUID，预制体直接绑定，物品图标独立。
 * 不运行 Creator 合图；构建产物与画面需另验。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'client/assets/ui/bag/atlas');
const pac = JSON.parse(fs.readFileSync(path.join(directory, 'BagAtlas.pac'), 'utf8'));
assert.equal(pac.__type__, 'cc.SpriteAtlas');
assert(!fs.existsSync(path.join(root, 'client/assets/resources/ui/bag/atlas')),
    '静态界面图不应同时保留在 resources 中');
for (const [name, prefab, originalUuid, originalHash] of [
    ['backpack-info_spr-line', 'BagInfoView', 'c6234db7-ebbd-43bb-863f-6c99505dbdc3',
        '9548a42c05d44f7713a3579e52c2b6cbaf7595bd0cab747a7f2527832b7cafe8'],
    ['backpack_spr-select', 'BagItemView', '6c69245c-edfa-463d-a6a4-c897ba93ac12',
        'd73973c3da35d39521917dd1082b462ab9125507f120d08c0045ec725a7ff07d'],
]) {
    const meta = JSON.parse(fs.readFileSync(path.join(directory, name + '.png.meta'), 'utf8'));
    assert.equal(meta.uuid, originalUuid, '保留图片 UUID');
    assert.equal(meta.subMetas.f9941.uuid, originalUuid + '@f9941', '保留帧 UUID');
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory, name + '.png'))).digest('hex'),
        originalHash, '迁移原图保持不变；以后主动换图时同步审核此基线');
    const view = fs.readFileSync(path.join(root, 'client/assets/prefabs/ui/bag', prefab + '.prefab'), 'utf8');
    assert(view.includes(meta.subMetas.f9941.uuid), '预制体直接绑定原图帧');
}
assert(!fs.readdirSync(directory).some(name => /^backpack_\d+\.png$/.test(name)), '物品图标不得进入界面图集');
assert(!fs.existsSync(path.join(directory, '../BagAtlas.plist')), '不保留实体图集重复链');
const background = path.join(root, 'client/assets/ui/bag/background/map-bg-backpack-1.jpg');
const backgroundMeta = JSON.parse(fs.readFileSync(background + '.meta', 'utf8'));
assert.equal(backgroundMeta.uuid, '93839820-644d-46de-9cf5-c2029669b85e', '背景归档保留原 UUID');
assert(fs.readFileSync(path.join(root, 'client/assets/prefabs/ui/bag/BagView.prefab'), 'utf8')
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
    const duplicates = filesIn(path.join(build, 'assets')).filter(file =>
        /(?:6c69245c-edfa-463d-a6a4-c897ba93ac12|c6234db7-ebbd-43bb-863f-6c99505dbdc3)(?:\.[^/\\]+)?\.png$/.test(file));
    assert.deepEqual(duplicates, [], '构建中仍存在背包原图副本，去重未完成');
    console.log('构建包未包含两张原图副本；图集和预制体运行时依赖仍需浏览器确认');
}
