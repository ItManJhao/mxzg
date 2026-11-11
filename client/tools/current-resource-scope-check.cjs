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

const actualBundles = bundleEntries().map(entry => entry.name).sort();
assert.deepEqual(actualBundles, evidence.bundleInventory.after.map(row => row.name).sort(), '未实现包重生或当前包被误删');
const resourceFiles = files(assets);
const actualPrefabs = resourceFiles.filter(file => file.endsWith('.prefab')).map(file => path.relative(root, file).replaceAll('\\', '/')).sort();
assert.deepEqual(actualPrefabs, evidence.retainedPrefabs.map(row => path.relative(root, resolveAssetPath(row.path)).replaceAll('\\', '/')).sort(),
    'Prefab必须对应已实现入口及其依赖，不预留未实现页面');
const knownUuids = new Set();
for (const file of resourceFiles.filter(file => file.endsWith('.meta'))) {
    assert(fs.existsSync(file.slice(0, -5)), '孤立meta：' + file);
    collectUuids(read(file), knownUuids);
}
for (const file of resourceFiles.filter(file => /\.(prefab|scene|anim|mtl)$/.test(file))) inspect(read(file), file, knownUuids);
for (const row of evidence.retainedPrefabs) {
    assert.equal(read(resolveAssetPath(row.path + '.meta')).uuid, row.uuid, '当前Prefab身份变化：' + row.path);
}
let views = 0;
for (const file of resourceFiles.filter(file => file.endsWith('.ts'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes('@view({')) {
        const match = source.match(/@view\(\{[\s\S]*?prefab:\s*["']([^"']+)["']/);
        assert(match, '页面@view没有明确Prefab地址：' + file);
        resolveAssetPath(match[1] + '.prefab');
        views++;
    }
    for (const match of source.matchAll(/["'](bundles\/(?:[\w-]+\/)+prefabs\/[\w-]+)["']/g)) {
        resolveAssetPath(match[1] + '.prefab');
    }
}
assert.equal(views, 17, '当前独立View数量改变时须同步核对入口与资源闭包');
for (const row of evidence.moved) {
    assert(!fs.existsSync(path.join(root, row.from)), '迁移后仍保留旧图副本');
    assert.equal(hash(resolveAssetPath(row.to)), row.imageSha256);
    assert.equal(hash(resolveAssetPath(row.to + '.meta')), row.metaSha256);
    assert.equal(read(resolveAssetPath(row.to + '.meta')).uuid, row.uuid);
}
const roster = read(resolveBundleFile('hero/prefabs/HeroListView.prefab'));
assert(!roster.some(row => row._name === 'btn_permanent_skin'), '未实现皮肤商店的隐藏资源依赖不可恢复');
console.log('当前资源范围通过：15包/32Prefab/17独立View、原UUID、全部序列化引用与迁移原图。实际下载和构建另验。');
