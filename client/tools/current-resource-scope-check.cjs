/**
 * 当前资源范围专项：核对已批准的Bundle/Prefab范围、各View唯一地址及所有序列化资源引用。
 * 只读取源码与清理证据，不删除资源、不生成运行时清单；以后开放模块时须同步审核范围证据。
 * 源文件体量只作记录，不能代替Creator构建体量或浏览器下载验收。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { bundleEntries, resolveAssetPath, resolveBundleFile } = require('../../tools/bundle-paths.cjs');
const root = path.resolve(__dirname, '../..');
const assets = path.join(root, 'client/assets');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/current-resource-scope-cleanup-20261111.json'), 'utf8'));
// 旧15包清理证据保持历史原样；Bundle范围合并此前获准的effects独立包增量。
const effectsMove = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/battle-effects-move-20261113.json'), 'utf8'));
// 精灵专用只读详情是本次获准新增入口；历史清理证据仍保留当时的32份Prefab范围。
const spiritDetail = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/spirit-detail-assets-20261114.json'), 'utf8'));
// GM总入口拆为发放与试战子窗；新增范围单独留证，不修改旧清理记录。
const gmSplit = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/gm-prefab-split-20261114.json'), 'utf8'));
// 普通装备只读详情另列增量，原历史范围与资源修正记录保留。
const equipmentDetail = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/equipment-detail-assets-20261114.json'), 'utf8'));
// 道具/碎片复用既有页面，只核对明确恢复的三张原图，不扩大Prefab或Bundle范围。
const itemShard = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/item-shard-assets-20261114.json'), 'utf8'));
const approvedPrefabs = [...evidence.retainedPrefabs, ...spiritDetail.addedPrefabs, ...gmSplit.addedPrefabs, ...equipmentDetail.addedPrefabs];

/** 收集当前目录普通文件；资源审查不允许通过链接访问工作区外的文件。 */
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        assert(!entry.isSymbolicLink(), '资源目录不能含符号链接：' + entry.name);
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? files(file) : [file];
    });
}

/** 读取Creator序列化文件，兼容资源导入时添加的UTF-8 BOM。 */
function read(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

/** 递归核对主资源和子资源UUID，不只检查节点索引或脚本import。 */
function inspect(value, source, knownUuids) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.__uuid__ === 'string') {
        assert(knownUuids.has(value.__uuid__), source + ' 引用缺失资源：' + value.__uuid__);
    }
    for (const child of Object.values(value)) inspect(child, source, knownUuids);
}

/** 收集meta中的主UUID及子资源UUID；同目录移动不要求重写引用。 */
function collectUuids(value, target) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.uuid === 'string') target.add(value.uuid);
    for (const child of Object.values(value)) collectUuids(child, target);
}

/** 图片和meta保持字节级一致，防止清理时误重建UUID、九宫格或像素。 */
function hash(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** 使用固定UTF-8字节顺序，避免系统语言或目录枚举顺序改变整体摘要。 */
function compareUtf8(left, right) {
    return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/** 重新哈希全部特效文件和meta UUID集合；摘要含相对路径、长度及原字节哈希，不只统计数量。 */
function effectsSnapshot(directory, rootMeta) {
    const rows = files(directory).map(file => ({
        file,
        relative: path.relative(directory, file).replaceAll('\\', '/'),
        bytes: fs.statSync(file).size,
        sha256: hash(file),
    })).sort((left, right) => compareUtf8(left.relative, right.relative));
    const digest = crypto.createHash('sha256');
    const uuids = new Set();
    collectUuids(rootMeta, uuids);
    const snapshot = { files: rows.length, bytes: 0, images: 0, metas: 0, data: 0 };
    for (const row of rows) {
        digest.update(JSON.stringify([row.relative, row.bytes, row.sha256]) + '\n', 'utf8');
        snapshot.bytes += row.bytes;
        if (row.relative.endsWith('.meta')) {
            snapshot.metas++;
            collectUuids(read(row.file), uuids);
        } else if (/\.(png|jpg|jpeg|webp)$/i.test(row.relative)) {
            snapshot.images++;
        } else {
            snapshot.data++;
        }
    }
    const uuidDigest = crypto.createHash('sha256');
    for (const uuid of [...uuids].sort(compareUtf8)) {
        uuidDigest.update(JSON.stringify(uuid) + '\n', 'utf8');
    }
    return { ...snapshot, sha256: digest.digest('hex'), metaUuidCount: uuids.size, metaUuidSha256: uuidDigest.digest('hex') };
}

const actualBundles = bundleEntries().map(entry => entry.name).sort();
assert.deepEqual(effectsMove.bundleInventory.added.map(row => row.name), ['effects'], '本次仅新增effects素材包');
const approvedBundles = [...evidence.bundleInventory.after, ...effectsMove.bundleInventory.added].map(row => row.name).sort();
assert.equal(new Set(approvedBundles).size, approvedBundles.length, '范围证据中的Bundle名称重复');
assert.deepEqual(actualBundles, approvedBundles, '未实现包重生或当前包被误删');
assert.equal(actualBundles.length, effectsMove.bundleInventory.after.bundles, '拆包后的范围数量须与本次证据一致');
const resourceFiles = files(assets);
const actualPrefabs = resourceFiles.filter(file => file.endsWith('.prefab')).map(file => path.relative(root, file).replaceAll('\\', '/')).sort();
assert.deepEqual(actualPrefabs, approvedPrefabs.map(row => path.relative(root, resolveAssetPath(row.path)).replaceAll('\\', '/')).sort(),
    'Prefab必须对应已实现入口及其依赖，不预留未实现页面');
const knownUuids = new Set();
for (const file of resourceFiles.filter(file => file.endsWith('.meta'))) {
    assert(fs.existsSync(file.slice(0, -5)), '孤立meta：' + file);
    collectUuids(read(file), knownUuids);
}
for (const file of resourceFiles.filter(file => /\.(prefab|scene|anim|mtl)$/.test(file))) inspect(read(file), file, knownUuids);
for (const row of approvedPrefabs) {
    assert.equal(read(resolveAssetPath(row.path + '.meta')).uuid, row.uuid, '当前Prefab身份变化：' + row.path);
}
let views = 0;
for (const file of resourceFiles.filter(file => file.endsWith('.ts'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes('@UIRegistry.view({')) {
        const match = source.match(/@UIRegistry\.view\(\{[\s\S]*?prefab:\s*["']([^"']+)["']/);
        assert(match, '页面@UIRegistry.view没有明确Prefab地址：' + file);
        resolveAssetPath(match[1] + '.prefab');
        views++;
    }
    for (const match of source.matchAll(/["'](bundles\/(?:[\w-]+\/)+prefabs\/[\w-]+)["']/g)) {
        resolveAssetPath(match[1] + '.prefab');
    }
}
assert.equal(views, 21, '当前独立View数量改变时须同步核对入口与资源闭包');
// 原图像素恢复有单独旧图集证据；仅接受明确列出的最终图片摘要，继续核对原UUID和meta。
for (const row of [...equipmentDetail.resources, ...itemShard.resources]) {
    const file = path.resolve(root, row.path);
    assert.equal(hash(file), row.afterSha256, '详情依赖图片与RGBA复原证据不一致：' + row.path);
    assert.equal(read(file + '.meta').uuid, row.uuid, '详情依赖原UUID变化：' + row.path);
    assert.equal(row.rgbaMatched, true, '详情依赖没有完成旧图集像素核对：' + row.path);
}
for (const row of evidence.moved) {
    assert(!fs.existsSync(path.join(root, row.from)), '迁移后仍保留旧图副本');
    assert.equal(hash(resolveAssetPath(row.to)), row.imageSha256);
    assert.equal(hash(resolveAssetPath(row.to + '.meta')), row.metaSha256);
    assert.equal(read(resolveAssetPath(row.to + '.meta')).uuid, row.uuid);
}
assert(!fs.existsSync(path.join(root, effectsMove.from)), '特效拆包后仍保留旧目录副本');
assert(!fs.existsSync(path.join(root, effectsMove.rootMeta.from)), '特效拆包后仍保留旧根meta');
const effectsRoot = resolveAssetPath(effectsMove.to);
const effectsMetaFile = resolveAssetPath(effectsMove.rootMeta.to);
const effectsMeta = read(effectsMetaFile);
assert.equal(effectsMove.snapshot.format, 'effects-tree-sha256-v1', '特效摘要格式变更必须重新审核');
assert.deepEqual(effectsMove.snapshot.before, effectsMove.snapshot.after, '迁移前后特效文件或UUID集合摘要必须完全一致');
assert.deepEqual(effectsSnapshot(effectsRoot, effectsMeta), effectsMove.snapshot.after,
    '特效文件路径、字节、内容哈希或meta UUID集合与原始快照不一致');
// 此根meta在拆包时新增Bundle声明并以LF保存，Git在Windows重新检出可能变为CRLF。
// 只规范这份声明的文本换行；上方全部原特效文件仍逐字节核对，不放宽图片或原meta摘要。
const effectsMetaText = fs.readFileSync(effectsMetaFile, 'utf8').replace(/\r\n/g, '\n');
assert.equal(crypto.createHash('sha256').update(effectsMetaText).digest('hex'),
    effectsMove.rootMeta.afterSha256, 'effects根meta与批准配置不一致');
assert.equal(effectsMeta.uuid, effectsMove.uuid, 'effects根UUID必须保留');
assert.deepEqual(effectsMeta.userData, { isBundle: true, bundleName: 'effects', priority: 2, bundleConfigID: 'remote-assets' });
assert.equal(bundleEntries().filter(entry => entry.meta.userData.bundleConfigID === 'remote-assets').length,
    effectsMove.bundleInventory.after.remoteBundles, '拆包后的远程范围数量须与证据一致');
const roster = read(resolveBundleFile('hero/prefabs/HeroListView.prefab'));
assert(!roster.some(row => row._name === 'btn_permanent_skin'), '未实现皮肤商店的隐藏资源依赖不可恢复');
console.log(`当前资源范围通过：${actualBundles.length}包/${actualPrefabs.length}Prefab/${views}独立View、原UUID、全部序列化引用与${effectsMove.snapshot.after.files}份特效文件/UUID集合摘要。实际下载和构建另验。`);
