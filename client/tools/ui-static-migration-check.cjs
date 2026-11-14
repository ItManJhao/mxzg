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
// 后续修复只由本批证据显式承接；历史迁移报告及源修复报告不回写新摘要。
const repairImports = JSON.parse(fs.readFileSync(path.join(root,
    'docs/validation/item-shard-assets-20261114.json'))).priorRepairImports || [];
const checkedRepairImports = new Map();

/** 计算文件摘要，保护像素、UUID和九宫格等原始设置。 */
function hash(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** 计算证据中保留的原始meta文本摘要，连同原换行一起核对旧迁移记录。 */
function textHash(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** 沿明示属性路径读取元数据；路径不存在时拒绝，而非忽略未列出的字段。 */
function valueAt(object, propertyPath) {
    return propertyPath.split('.').reduce((value, key) => {
        assert(value && Object.hasOwn(value, key), propertyPath + ' 元数据字段不存在');
        return value[key];
    }, object);
}

/** 按已记录差异构造预期meta；不修改实际图片、meta或历史证据。 */
function replaceAt(object, propertyPath, expectedBefore, expectedAfter) {
    const segments = propertyPath.split('.');
    const field = segments.pop();
    const parent = segments.length ? valueAt(object, segments.join('.')) : object;
    assert.deepEqual(parent[field], expectedBefore, propertyPath + ' 旧值与修复证据不符');
    parent[field] = expectedAfter;
}

/**
 * 校验一次原RGBA修复及Creator导入链：旧图片摘要来自原修复报告，旧meta全文必须命中旧摘要。
 * 只接受明列的导入差异，完整meta深比较会继续拒绝UUID、九宫格及任何未记录设置变化。
 */
function checkRepairImport(entry) {
    const file = resolveAssetPath(entry.path);
    if (checkedRepairImports.has(file)) {
        return checkedRepairImports.get(file);
    }
    assert.equal(entry.repairEvidence, 'docs/validation/equipment-detail-assets-20261114.json',
        entry.path + ' 修复来源未核实');
    const evidence = JSON.parse(fs.readFileSync(path.join(root, entry.repairEvidence)));
    const resources = evidence.resources.filter(row => resolveAssetPath(row.path) === file);
    assert.equal(resources.length, 1, entry.path + ' 修复记录必须唯一');
    const repair = resources[0];
    assert.equal(repair.rgbaMatched, true, entry.path + ' 没有旧图RGBA核对证据');
    assert.equal(repair.pixelsCorrected, true, entry.path + ' 并非明确修复的图片');
    assert.notEqual(repair.beforeSha256, repair.afterSha256, entry.path + ' 缺少图片修复前后摘要');
    assert.equal(hash(file), repair.afterSha256, entry.path + ' 已核RGBA修复后图片变化');
    assert.equal(textHash(entry.beforeMetaText), repair.metaSha256, entry.path + ' 原meta文本摘要不符');
    assert.equal(hash(file + '.meta'), entry.afterMetaSha256, entry.path + ' Creator导入后meta变化');
    const original = JSON.parse(entry.beforeMetaText);
    const actual = JSON.parse(fs.readFileSync(file + '.meta'));
    assert.equal(original.uuid, repair.uuid, entry.path + ' 原meta与图片修复UUID不一致');
    assert.equal(original.uuid, entry.mainUuid, entry.path + ' 原主UUID证据不一致');
    assert.equal(actual.uuid, original.uuid, entry.path + ' 主UUID变化');
    const subUuids = Object.fromEntries(Object.entries(original.subMetas).map(([key, row]) => [key, row.uuid]));
    assert.deepEqual(subUuids, entry.subUuids, entry.path + ' 原子UUID证据不一致');
    assert.deepEqual(Object.fromEntries(Object.entries(actual.subMetas).map(([key, row]) => [key, row.uuid])),
        subUuids, entry.path + ' 子UUID变化');
    const expected = JSON.parse(entry.beforeMetaText);
    assert(entry.creatorChanges.length > 0, entry.path + ' 缺少Creator导入差异');
    for (const change of entry.creatorChanges) {
        replaceAt(expected, change.path, change.before, change.after);
    }
    assert.deepEqual(actual, expected, entry.path + ' 出现未记录的meta变化');
    const chain = { beforeImage: repair.beforeSha256, afterImage: repair.afterSha256,
        beforeMeta: repair.metaSha256, afterMeta: entry.afterMetaSha256 };
    checkedRepairImports.set(file, chain);
    return chain;
}

/** 保持历史内容门槛；仅允许精确旧摘要→已核RGBA修复→明示Creator导入后的新摘要。 */
function checkHistoricalResource(file, historicalSha256, description) {
    const actualSha256 = hash(file);
    if (actualSha256 === historicalSha256) {
        return;
    }
    const image = file.endsWith('.meta') ? file.slice(0, -5) : file;
    const imports = repairImports.filter(row => resolveAssetPath(row.path) === image);
    assert.equal(imports.length, 1, description + ' 原资源或meta变化，缺少唯一修复承接证据');
    const chain = checkRepairImport(imports[0]);
    const metadata = file.endsWith('.meta');
    assert.equal(historicalSha256, metadata ? chain.beforeMeta : chain.beforeImage,
        description + ' 历史摘要未命中修复前值');
    assert.equal(actualSha256, metadata ? chain.afterMeta : chain.afterImage,
        description + ' 当前摘要未命中修复后值');
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
            checkHistoricalResource(resolveAssetPath(row.path), row.sha256, row.path);
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
