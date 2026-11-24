/**
 * 当前资源范围专项：核对已批准的Bundle/Prefab范围、各View唯一地址及所有序列化资源引用。
 * 当前范围取已有Prefab准入计划，历史清理证据额外保护原资源身份和原图增量。
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
// 通用奖励与确认已获准接入，新增范围另留证，不改写旧批保留清单。
const commonFeedback = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/reward-common-ui-scope-20261116.json'), 'utf8'));
// 原升级页已有独立批准记录，范围聚合须保留该既有增量，不能回填旧通用反馈清单。
const upgradeFeedback = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/role-upgrade-ui-scope-20261116.json'), 'utf8'));
// 里程碑复用的通用英雄获得页另留本批准入证据，不改历史清理范围或生成运行清单。
const heroFeedback = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/hero-reward-ui-scope-20261117.json'), 'utf8'));
const prefabPlan = read(path.join(root, 'tools/prefab-plan.json'));
// 已批准的历史资产继续校验原身份，当前范围由实际准入计划维护。
const approvedPrefabs = [...evidence.retainedPrefabs, ...spiritDetail.addedPrefabs, ...gmSplit.addedPrefabs,
    ...equipmentDetail.addedPrefabs, ...commonFeedback.addedPrefabs, ...upgradeFeedback.addedPrefabs,
    ...heroFeedback.addedPrefabs];

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

/**
 * 重新哈希全部特效文件和meta UUID集合；摘要含相对路径、长度及原字节哈希，不只统计数量。
 * 有明确修复链时先核当前结果，再虚拟还原原字节记录；新增获准shader仅从旧快照投影中排除。
 */
function effectsSnapshot(directory, rootMeta, approvedChanges = new Map()) {
    const rows = files(directory).map(file => ({
        file,
        relative: path.relative(directory, file).replaceAll('\\', '/'),
        bytes: fs.statSync(file).size,
        sha256: hash(file),
    })).map(row => {
        const change = approvedChanges.get(row.relative);
        if (!change) {
            return row;
        }
        assert.equal(row.sha256, change.after.sha256, '已批准特效增量当前内容改变：' + row.relative);
        assert.equal(row.bytes, change.after.bytes, '已批准特效增量当前长度改变：' + row.relative);
        return change.before ? { ...row, ...change.before } : null;
    }).filter(Boolean).sort((left, right) => compareUtf8(left.relative, right.relative));
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

/** 读取有界属性路径；派生meta变化只能逐项承接，不能跳过整份meta或UUID检查。 */
function propertyAt(value, propertyPath) {
    return propertyPath.split('.').reduce((parent, key) => {
        assert(parent && Object.hasOwn(parent, key), 'meta派生字段不存在：' + propertyPath);
        return parent[key];
    }, value);
}

/** 校验逐批原RGBA修复与Creator派生meta，返回可虚拟还原13号原整树的离线增量。 */
function approvedEffectsChanges() {
    const delta = read(path.join(root, 'docs/validation/effects-approved-delta-20261117.json'));
    assert.equal(delta.format, 'effects-approved-delta-v1');
    assert.equal(delta.baselineEvidence, 'docs/validation/battle-effects-move-20261113.json');
    assert.deepEqual(delta.assetEvidence, [
        ...[4, 5, 9, '10-20'].map(stage => `docs/validation/chapter-stage${stage}-assets-20261117.json`),
        'docs/validation/chapter-first-summon-assets-20261118.json',
        'docs/validation/gold-dungeon-action-assets-20261119.json',
        'docs/validation/chapter-stage26-action-assets-20261119.json',
        'docs/validation/chapter-stage30-action-assets-20261119.json',
        'docs/validation/chapter-stage31-36-action-assets-20261119.json',
        'docs/validation/chapter-stage38-action-assets-20261119.json',
        'docs/validation/chapter-stage41-100-action-assets-20261119.json',
        'docs/validation/chapter-stage111-300-action-assets-20261120.json',
        'docs/validation/gold-dungeon-stage3-action-assets-20261123.json',
        'docs/validation/daily-dungeon-action-assets-20261123.json',
        'docs/validation/tower-action-assets-20261123.json',
    ], '特效增量须逐批对应已核对的原图证据');
    assert.deepEqual([...delta.newAssets].sort(), ['legacy-stone.effect', 'legacy-stone.effect.meta',
        'legacy-spine-pma.effect', 'legacy-spine-pma.effect.meta'].sort(),
        '本批只批准新增石化和旧PNG预乘适配效果，不可任意扩资源范围');
    const sources = new Map(delta.assetEvidence.map(file => [file, read(path.join(root, file))]));
    const changes = new Map();
    const directory = resolveAssetPath(effectsMove.to);
    for (const entry of delta.metaImports) {
        const source = sources.get(entry.source.evidencePath);
        assert(source, 'meta导入来源未登记');
        const original = source.files.filter(row => row.path === entry.source.assetPath);
        assert.equal(original.length, 1, 'meta导入必须对应唯一原RGBA修复');
        assert.equal(entry.beforeSha256, original[0].metaSha256After, 'meta导入起点未命中原修复摘要');
        assert.equal(crypto.createHash('sha256').update(entry.beforeMetaText).digest('hex'), entry.beforeSha256,
            'meta导入原文摘要无效：' + entry.file);
        assert.equal(hash(path.join(root, entry.file)), entry.afterSha256, 'meta导入后摘要改变：' + entry.file);
        const expected = JSON.parse(entry.beforeMetaText);
        for (const difference of entry.differences) {
            assert(/^subMetas\.f9941\.userData\.(?:offset[XY]|trim[XY]|width|height|vertices(?:\..+)?)$/.test(difference.propertyPath),
                'meta非派生字段不能由本次导入承接：' + difference.propertyPath);
            assert.deepEqual(propertyAt(expected, difference.propertyPath), difference.before, 'meta派生旧值不符');
            const keys = difference.propertyPath.split('.');
            const field = keys.pop();
            propertyAt(expected, keys.join('.'))[field] = difference.after;
        }
        assert.deepEqual(read(path.join(root, entry.file)), expected,
            'meta含未批准的UUID、九宫格、原尺寸或其他变化：' + entry.file);
    }
    for (const entry of delta.changes) {
        assert(!changes.has(entry.relative), '特效增量路径重复');
        const file = path.resolve(directory, entry.relative);
        assert(path.relative(directory, file).split(path.sep).join('/') === entry.relative && !entry.relative.startsWith('../'),
            '特效增量越界');
        assert.equal(hash(file), entry.after.sha256, '特效增量结果与当前文件不符：' + entry.relative);
        assert.equal(fs.statSync(file).size, entry.after.bytes);
        let previous = entry.before?.sha256;
        for (const step of entry.sources) {
            assert.equal(previous, step.beforeSha256, '特效修复历史链不连续：' + entry.relative);
            if (step.kind === 'creator-derived-meta') {
                const imported = delta.metaImports[step.importIndex];
                assert(imported && path.resolve(root, imported.file) === file, 'meta导入引用其他文件');
                assert.equal(step.beforeSha256, imported.beforeSha256);
                assert.equal(step.afterSha256, imported.afterSha256);
            } else {
                const source = sources.get(step.evidencePath);
                assert(source, '特效修复来源未登记');
                const rows = source.files.filter(row => row.path === step.assetPath);
                assert.equal(rows.length, 1, '特效修复来源必须唯一');
                const row = rows[0];
                assert.equal(path.resolve(root, step.assetPath + (step.metadata ? '.meta' : '')), file);
                assert.equal(step.beforeSha256, step.metadata ? row.metaSha256Before : row.beforeSha256);
                assert.equal(step.afterSha256, step.metadata ? row.metaSha256After : row.afterSha256);
                assert.equal(row.afterPixelsMatchSource, true, '原RGBA修复必须已核对像素');
            }
            previous = step.afterSha256;
        }
        if (entry.before) {
            assert.equal(previous, entry.after.sha256, '特效修复链未到当前内容：' + entry.relative);
        } else {
            assert(delta.newAssets.includes(entry.relative), '未批准的新特效文件：' + entry.relative);
            assert.equal(entry.sources.length, 0);
        }
        changes.set(entry.relative, entry);
    }
    assert.deepEqual([...changes].filter(([, entry]) => !entry.before).map(([relative]) => relative).sort(),
        [...delta.newAssets].sort(), '新增特效文件必须逐项覆盖');
    return changes;
}

const actualBundles = bundleEntries().map(entry => entry.name).sort();
assert.deepEqual(effectsMove.bundleInventory.added.map(row => row.name), ['effects'], '本次仅新增effects素材包');
const enabledModules = ['market', 'dungeon', 'guild', 'vip', 'arena', 'tower'];
for (const name of enabledModules) {
    const meta = read(resolveAssetPath(`bundles/module/${name}.meta`));
    assert.deepEqual(meta.userData, { isBundle: true, bundleName: name, priority: 2, bundleConfigID: 'remote-assets' });
}
const approvedBundles = [...[...evidence.bundleInventory.after, ...effectsMove.bundleInventory.added].map(row => row.name),
    ...enabledModules].sort();
assert.equal(new Set(approvedBundles).size, approvedBundles.length, '范围证据中的Bundle名称重复');
assert.deepEqual(actualBundles, approvedBundles, '未实现包重生或当前包被误删');
const resourceFiles = files(assets);
const actualPrefabs = resourceFiles.filter(file => file.endsWith('.prefab')).sort();
const plannedPrefabs = new Set(prefabPlan.groups.flatMap(group => group.names.map(name =>
    resolveAssetPath(`${group.directory}/${name}.prefab`))));
assert.deepEqual(actualPrefabs, [...plannedPrefabs].sort(),
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
const viewPrefabs = new Set();
for (const file of resourceFiles.filter(file => file.endsWith('.ts'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (source.includes('@UIRegistry.view({')) {
        const match = source.match(/@UIRegistry\.view\(\{[\s\S]*?prefab:\s*["']([^"']+)["']/);
        assert(match, '页面@UIRegistry.view没有明确Prefab地址：' + file);
        const prefab = resolveAssetPath(match[1] + '.prefab');
        assert(plannedPrefabs.has(prefab), '页面引用未准入的Prefab：' + match[1]);
        assert(!viewPrefabs.has(prefab), '一个Prefab只能绑定一个独立View入口：' + match[1]);
        viewPrefabs.add(prefab);
    }
    for (const match of source.matchAll(/["'](bundles\/(?:[\w-]+\/)+prefabs\/[\w-]+)["']/g)) {
        resolveAssetPath(match[1] + '.prefab');
    }
}
for (const row of heroFeedback.addedPrefabs) {
    assert.equal(hash(resolveAssetPath(row.path)), row.sha256, '本批新增英雄获得页与准入证据不一致：' + row.path);
}
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
const effectsChanges = approvedEffectsChanges();
assert.deepEqual(effectsSnapshot(effectsRoot, effectsMeta, effectsChanges), effectsMove.snapshot.after,
    '承接已批准逐文件修复后，原特效路径、字节、内容或meta UUID整树仍不一致');
// 此根meta在拆包时新增Bundle声明并以LF保存，Git在Windows重新检出可能变为CRLF。
// 只规范这份声明的文本换行；上方全部原特效文件仍逐字节核对，不放宽图片或原meta摘要。
const effectsMetaText = fs.readFileSync(effectsMetaFile, 'utf8').replace(/\r\n/g, '\n');
assert.equal(crypto.createHash('sha256').update(effectsMetaText).digest('hex'),
    effectsMove.rootMeta.afterSha256, 'effects根meta与批准配置不一致');
assert.equal(effectsMeta.uuid, effectsMove.uuid, 'effects根UUID必须保留');
assert.deepEqual(effectsMeta.userData, { isBundle: true, bundleName: 'effects', priority: 2, bundleConfigID: 'remote-assets' });
assert.equal(bundleEntries().filter(entry => entry.meta.userData.bundleConfigID === 'remote-assets').length,
    effectsMove.bundleInventory.after.remoteBundles + enabledModules.length, '远程资源范围包含普通市场与副本大厅');
const roster = read(resolveBundleFile('hero/prefabs/HeroListView.prefab'));
assert(!roster.some(row => row._name === 'btn_permanent_skin'), '未实现皮肤商店的隐藏资源依赖不可恢复');
console.log(`当前资源范围通过：${actualBundles.length}包/${actualPrefabs.length}Prefab/${viewPrefabs.size}独立View、原UUID、全部序列化引用及${effectsChanges.size}项有据特效增量；虚拟还原${effectsMove.snapshot.after.files}份原特效整树/UUID摘要。实际下载和构建另验。`);
