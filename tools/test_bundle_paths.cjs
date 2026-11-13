/** 离线Bundle定位回归：用临时目录验证嵌套分组、历史路径、重名/缺失/空扫描和边界拒绝，不改实际assets。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createBundlePaths } = require('./bundle-paths.cjs');
const temporaryRoot = path.resolve(__dirname, '../client/temp');
fs.mkdirSync(temporaryRoot, { recursive: true });

/** 每项使用独立项目，清理前复核绝对临时边界，不触及用户工作区资源。 */
function fixture(run) {
    const project = fs.mkdtempSync(path.join(temporaryRoot, 'bundle-paths-'));
    fs.mkdirSync(path.join(project, 'client/assets/bundles'), { recursive: true });
    try {
        run(project);
    } finally {
        assert(project.startsWith(temporaryRoot + path.sep + 'bundle-paths-'));
        fs.rmSync(project, { recursive: true, force: true });
    }
}

/** 写入仅供检查的目录meta，名称由meta指定，故意与文件夹名分离。 */
function addBundle(project, directory, name) {
    const target = path.join(project, 'client/assets/bundles', directory);
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(target + '.meta', JSON.stringify({ importer: 'directory', uuid: randomUUID(),
        userData: { isBundle: true, bundleName: name } }));
    return target;
}

fixture(project => {
    const hero = addBundle(project, 'storage/odd-folder', 'hero');
    const config = addBundle(project, 'pages/config-source', 'config');
    fs.mkdirSync(path.join(hero, 'ui'));
    const icon = path.join(hero, 'ui/icon.png');
    fs.writeFileSync(icon, 'original pixels');
    fs.writeFileSync(path.join(config, 'item.json'), '{"rows":[{"idx":1}]}');
    const paths = createBundlePaths(project);
    assert.deepEqual(paths.bundleEntries().map(row => row.name), ['config', 'hero']);
    assert.equal(paths.bundleRoot('hero'), hero, '包名由meta决定，不按目录名或固定分组列表猜');
    assert.equal(paths.resolveBundleFile('hero/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath('client/assets/bundles/hero/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath('assets/bundles/hero/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath('bundles/hero/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath('bundles/module/hero/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath('bundles/resources/hero.meta'), hero + '.meta');
    assert.equal(paths.resolveAssetPath(path.join(project, 'client/assets/bundles/hero/ui/icon.png')), icon);
    assert.equal(paths.resolveAssetPath('db://assets/bundles/hero/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath('client/assets/bundles/storage/odd-folder/ui/icon.png'), icon);
    assert.equal(paths.resolveAssetPath(icon), icon, '现物理路径原样保留');
    assert.equal(paths.resolveAssetPath('client/assets/bundles/hero.meta'), hero + '.meta');
    assert.equal(paths.resolveBundleFile('hero/ui/missing.png', { optional: true }), null);
    assert.equal(paths.resolveAssetPath('bundles/removed/ui/file.png', { optional: true }), null);
    assert.throws(() => paths.resolveBundleFile('hero/ui/missing.png'), /不存在/);
    assert.throws(() => paths.bundleRoot('removed'), /Bundle不存在/);
    assert.throws(() => paths.resolveBundleFile('hero/../outside', { optional: true }), /非法资源路径/);
    assert.throws(() => paths.resolveAssetPath('client/assets/../outside', { optional: true }), /非法资源路径/);
    assert.throws(() => paths.resolveAssetPath(path.join(project, 'outside.txt')), /越出assets/);
});

fixture(project => {
    addBundle(project, 'module/battle', 'battle');
    const effects = addBundle(project, 'resources/renamed-effects', 'effects');
    const frame = path.join(effects, 'skill/frame.png');
    fs.mkdirSync(path.dirname(frame));
    fs.writeFileSync(frame, 'original effect frame');
    const paths = createBundlePaths(project);
    assert.equal(paths.resolveBundleFile('effects/skill/frame.png'), frame);
    for (const recorded of [
        'bundles/battle/effects/skill/frame.png',
        'bundles/module/battle/effects/skill/frame.png',
        'client/assets/bundles/module/battle/effects/skill/frame.png',
        path.join(project, 'client/assets/bundles/module/battle/effects/skill/frame.png'),
    ]) {
        assert.equal(paths.resolveAssetPath(recorded), frame, '历史特效物理路径按meta定位独立包');
    }
    assert.equal(paths.resolveAssetPath('bundles/battle/effects.meta'), effects + '.meta');
    assert.equal(paths.resolveAssetPath('bundles/module/battle/effects'), effects);
    assert.equal(paths.resolveAssetPath('bundles/module/battle/effects/missing.png', { optional: true }), null);
    assert.throws(() => paths.resolveBundleFile('battle/effects/skill/frame.png'), /不存在/, '旧运行时键必须失败，不能掩盖客户端漏改');
    assert.throws(() => paths.resolveAssetPath('bundles/module/battle/effects/../outside.png'), /非法资源路径/);
});

fixture(project => {
    addBundle(project, 'one/first', 'duplicate');
    addBundle(project, 'two/second', 'duplicate');
    assert.throws(() => createBundlePaths(project), /Bundle名称重复/);
});

fixture(project => {
    assert.throws(() => createBundlePaths(project), /没有发现任何Bundle/);
    const directory = path.join(project, 'client/assets/bundles/group');
    fs.mkdirSync(directory);
    fs.writeFileSync(directory + '.meta', '{invalid-json');
    assert.throws(() => createBundlePaths(project), SyntaxError, '坏meta不能被当作普通空分组忽略');
});

console.log('Bundle源目录定位通过：meta发现、普通分组、历史特效拆包、旧运行时键拒绝、缺失/重复/空扫描和越界拒绝。');
