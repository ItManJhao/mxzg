/** UI构建钩子回归：检查配置包只读前置入口，并用隔离 Web 产物检查备份、幂等及失败前不删除。
 * 夹具使用当前名单的真实原图及跨包共享纹理，不能代替 Creator 实际构建和浏览器验收。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const hook = require('../extensions/mxzg-bag-build/hooks');
const builder = require('../extensions/mxzg-bag-build/builder');
const { dedupeBagBuild } = require('./dedupe-bag-build.cjs');
const { createConfigBuildFixture } = require('./config-package-build-check.test.cjs');
const buildRoot = path.resolve(__dirname, '../build');
const root = path.resolve(__dirname, '../..');
const { resolveAssetPath } = require('../../tools/bundle-paths.cjs');
const images = JSON.parse(fs.readFileSync(path.join(root, 'config/ui-atlas-dedupe.json'))).images.map(image => {
    const hex = image.uuid.replace(/-/g, '');
    return [image.source, image.uuid, hex.slice(0, 2) + Buffer.from(hex.slice(2), 'hex').toString('base64')];
});
const source = path.join(root, 'client/assets/bundles');
/** 固定入口保持在require缓存中；仅污染实现模块，模拟Creator长驻进程持有旧代码。 */
const implementationPath = require.resolve('../extensions/mxzg-bag-build/build-hooks.cjs');
const sourcePathsPath = require.resolve('../../tools/bundle-paths.cjs');

/**
 * 用复制配置验证受限宿主会委托普通Node；父进程生成器故意不可用，子进程仍须真验并拒绝坏源。
 * 只复制本专项依赖的配置及脚本，不能修改当前工程源或依赖目录。
 */
async function checkRestrictedBuildHost() {
    const tempRoot = path.join(root, 'client/temp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const directory = fs.mkdtempSync(path.join(tempRoot, 'config-hook-node-'));
    const configDirectory = path.join(root, 'client/assets/bundles/resources/config');
    const copiedConfig = path.join(directory, 'client/assets/bundles/resources/config');
    const generatorFile = require.resolve('../../tools/generate_config_package.cjs');
    const generator = require(generatorFile);
    const originalGenerate = generator.generateConfigPackage;
    const implementationFile = path.join(directory, 'client/extensions/mxzg-bag-build/build-hooks.cjs');
    try {
        fs.mkdirSync(path.dirname(copiedConfig), { recursive: true });
        fs.cpSync(configDirectory, copiedConfig, { recursive: true });
        fs.copyFileSync(configDirectory + '.meta', copiedConfig + '.meta');
        for (const relative of [
            'config/client-schema.json', 'client/assets/scripts/app/remake/LoadingPlan.ts',
            'client/assets/scripts/config/ConfigZip.generated.ts', 'client/assets/scripts/config/ConfigZip.generated.ts.meta',
        ]) {
            write(path.join(directory, relative), fs.readFileSync(path.join(root, relative)));
        }
        write(implementationFile, fs.readFileSync(implementationPath));
        write(path.join(directory, 'tools/generate_config_package.cjs'),
            'exports.generateConfigPackage=()=>require(' + JSON.stringify(generatorFile)
            + ').generateConfigPackage({projectRoot:' + JSON.stringify(directory) + ',check:true});');
        generator.generateConfigPackage = () => { throw new Error('受限宿主不能创建Worker'); };
        const restricted = require(implementationFile);
        const good = await restricted.onBeforeBuild();
        assert.equal(good.changed.length, 0, '普通Node子进程成功只读检查真实配置');
        const sourceFile = path.join(copiedConfig, 'system.json');
        write(sourceFile, JSON.stringify({ rows: [] }));
        await assert.rejects(restricted.onBeforeBuild(), /配置包过期或缺失/);
        assert.deepEqual(JSON.parse(fs.readFileSync(sourceFile, 'utf8')), { rows: [] }, '失败不能自动覆写坏源或补生成包');
    } finally {
        generator.generateConfigPackage = originalGenerate;
        delete require.cache[implementationFile];
        assert(directory.startsWith(tempRoot + path.sep + 'config-hook-node-'));
        assert.equal(fs.realpathSync(directory), directory, '只清理本专项创建的真实目录');
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

/** 模拟迁移前被Creator缓存的旧目录索引；实际钩子必须重新载入定位工具。 */
function poisonSourcePaths() {
    const stale = { resolveAssetPath: () => { throw new Error('不应调用迁移前的源目录索引'); } };
    require(sourcePathsPath);
    require.cache[sourcePathsPath].exports = stale;
    return stale;
}

/** 注入会抛错的旧实现；后续调用若没有重新读取模块，专项会直接失败。 */
function poisonImplementation() {
    require(implementationPath);
    require.cache[implementationPath].exports = {
        onBeforeBuild: () => { throw new Error('不应调用缓存中的旧配置包核验'); },
        onBeforeCompressSettings: () => { throw new Error('不应调用缓存中的旧启动实现'); },
        onAfterBuild: () => { throw new Error('不应调用缓存中的旧完成实现'); },
    };
}

/** 捕获本轮实际日志后恢复console；用于验证真实执行代码的身份，不依赖包版本文本。 */
async function captureLogs(run) {
    const original = console.log;
    const lines = [];
    console.log = (...values) => {
        lines.push(values.join(' '));
        original(...values);
    };
    try {
        return { value: await run(), lines };
    } finally {
        console.log = original;
    }
}


/** 在测试目录写文件，同时创建父目录。 */
function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

/** 构造与已核实产物结构一致的最小夹具，返回当前名单可清理副本路径。 */
function fixture(directory) {
    const bundle = path.join(directory, 'assets/prefabs');
    write(path.join(directory, 'index.html'), '<!doctype html>');
    write(path.join(bundle, 'config.json'), JSON.stringify({
        uuids: images.flatMap(([, , id]) => [id, id + '@f9941']),
        paths: {}, packs: { abpack: images.map((_, index) => index * 2 + 1) },
    }));
    write(path.join(bundle, 'import/ab/abpack.json'), JSON.stringify([1, ['cdatlas@6c48a']]));
    write(path.join(directory, 'assets/main/native/cd/cdatlas.png'), fs.readFileSync(resolveAssetPath(images[0][0])));
    // 第二包保留同一帧数据，第三包只登记重定向；共享纹理仅存在于main。
    write(path.join(directory, 'assets/main/config.json'), fs.readFileSync(path.join(bundle, 'config.json')));
    write(path.join(directory, 'assets/main/import/ab/abpack.json'), JSON.stringify([1, ['cdatlas@6c48a']]));
    write(path.join(directory, 'assets/redirected/config.json'), JSON.stringify({
        uuids: [images[2][2] + '@f9941'], paths: {}, packs: {}, redirect: [0, '0'], deps: ['main'],
    }));
    createConfigBuildFixture(directory);
    return images.map(([name, uuid]) => {
        const file = path.join(bundle, 'native', uuid.slice(0, 2), uuid + '.png');
        write(file, fs.readFileSync(resolveAssetPath(name)));
        return file;
    });
}

/** 实际调用配置包与启动钩子，检查成功和拒绝路径；仅清理由本测试创建的独立目录。 */
async function main() {
    await checkRestrictedBuildHost();
    const launch = { settings: { assets: { preloadBundles: [{ bundle: 'main', version: 'kept' }] } } };
    assert.deepEqual(Object.keys(builder.configs).sort(), ['web-desktop', 'web-mobile']);
    assert.equal(hook.throwError, true);
    const cachedEntry = require.cache[require.resolve('../extensions/mxzg-bag-build/hooks')].exports;
    poisonImplementation();
    const packageBefore = await captureLogs(() => hook.onBeforeBuild({}, {}));
    assert.equal(packageBefore.value.changed.length, 0, '配置包构建前检查只能读取');
    assert(packageBefore.lines.some(line => line.includes('config-package-artifact-v1 v1.8.0') && line.includes('onBeforeBuild')),
        '必须打印实际配置包前置实现标识和版本');
    poisonImplementation();
    const before = await captureLogs(() => hook.onBeforeCompressSettings({}, launch));
    assert(before.lines.some(line => line.includes('config-package-artifact-v1 v1.8.0') && line.includes('onBeforeCompressSettings')),
        '必须打印实际before实现标识和版本');
    poisonImplementation();
    await hook.onBeforeCompressSettings({}, launch);
    assert.equal(require.cache[require.resolve('../extensions/mxzg-bag-build/hooks')].exports, cachedEntry,
        '固定入口保持缓存，不要求每次重新登记Creator钩子');
    assert.deepEqual(launch.settings.assets.preloadBundles, [{ bundle: 'main', version: 'kept' }, { bundle: 'bootstrap' }]);
    const existing = { settings: { assets: { preloadBundles: [{ bundle: 'main', version: 'kept' }, { bundle: 'bootstrap', version: 'boot-kept' }] } } };
    await hook.onBeforeCompressSettings({}, existing);
    assert.equal(existing.settings.assets.preloadBundles[1].version, 'boot-kept', '已有bootstrap版本不得被覆盖');
    const packageVersion = JSON.parse(fs.readFileSync(path.join(root, 'client/extensions/mxzg-bag-build/package.json'), 'utf8')).version;
    assert.equal(packageVersion, '1.8.0', '实际实现版本与包版本必须同步');
    await assert.rejects(hook.onBeforeCompressSettings({}, {}), /启动配置/);
    await assert.rejects(hook.onBeforeCompressSettings({}, { settings: { assets: { preloadBundles: {} } } }), /数组/);
    if (!images.length) {
        const directory = fs.mkdtempSync(path.join(buildRoot, 'bootstrap-hook-test-'));
        try {
            write(path.join(directory, 'index.html'), '<!doctype html>');
            write(path.join(directory, 'assets/main/config.json'), JSON.stringify({ uuids: [], paths: {} }));
            const file = path.join(directory, 'src/settings.json');
            const finalSettings = { assets: { preloadBundles: [{ bundle: 'main', version: 'file-kept' }] }, custom: { keep: true } };
            write(file, JSON.stringify(finalSettings));
            createConfigBuildFixture(directory);
            poisonImplementation();
            const stalePaths = poisonSourcePaths();
            const repaired = await captureLogs(() => hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }));
            assert.notEqual(require.cache[sourcePathsPath].exports, stalePaths, '构建后检查必须重新发现当前源目录');
            assert(repaired.lines.some(line => line.includes('config-package-artifact-v1 v1.8.0') && line.includes('after-build repaired')),
                '最终文件修正必须打印实际实现与repaired标识');
            assert.equal(repaired.value.startupPreloadRepaired, true);
            const written = JSON.parse(fs.readFileSync(file, 'utf8'));
            assert.deepEqual(written.assets.preloadBundles, [{ bundle: 'main', version: 'file-kept' }, { bundle: 'bootstrap' }]);
            assert.deepEqual(written.custom, finalSettings.custom, '只修改预载包元数据');
            const once = fs.readFileSync(file, 'utf8');
            poisonImplementation();
            const after = await captureLogs(() => hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }));
            assert(after.lines.some(line => line.includes('config-package-artifact-v1 v1.8.0') && line.includes('onAfterBuild')),
                '必须打印实际after实现标识和版本');
            assert.equal(after.value.startupPreloadRepaired, false);
            assert.equal(fs.readFileSync(file, 'utf8'), once, '再次执行不重写已有启动配置');
            const summary = after.value;
            assert.equal(summary.files, 0, '具有动态路径的原图不得删除');
            assert.equal(summary.backup, null);
            const configFixture = createConfigBuildFixture(directory);
            const foreignConfig = path.join(directory, 'assets/foreign/config.json');
            write(foreignConfig, JSON.stringify({ uuids: [configFixture.source.excluded[0]], paths: {}, packs: {} }));
            const beforeInvalidPackage = fs.readFileSync(file, 'utf8');
            await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /非启动散表/);
            assert.equal(fs.readFileSync(file, 'utf8'), beforeInvalidPackage, '配置核验失败不能先改写启动文件');
            fs.unlinkSync(foreignConfig);
            write(file, JSON.stringify({ assets: { preloadBundles: {} } }));
            const invalid = fs.readFileSync(file, 'utf8');
            await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /数组/);
            assert.equal(fs.readFileSync(file, 'utf8'), invalid, '非法配置拒绝且不覆盖原文件');
            write(file, JSON.stringify(written));
            await assert.rejects(hook.onAfterBuild({ platform: 'android' }, { dest: directory }), /Web/);
            await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: source }), /构建目录/);
            console.log('启动构建钩子检查通过：旧实现缓存隔离、固定入口、实际身份、保留版本、幂等追加、落盘修复、非法拒绝、零删除和平台限制。');
        } finally {
            assert(directory.startsWith(buildRoot + path.sep + 'bootstrap-hook-test-'));
            fs.rmSync(directory, { recursive: true, force: true });
        }
        return;
    }
    fs.mkdirSync(buildRoot, { recursive: true });
    const directory = fs.mkdtempSync(path.join(buildRoot, 'bag-hook-test-'));
    try {
        assert.deepEqual(Object.keys(builder.configs).sort(), ['web-desktop', 'web-mobile']);
        assert.equal(hook.throwError, true);
        const files = fixture(directory);
        assert.equal(dedupeBagBuild(directory).files, images.length);
        assert(files.every(file => fs.existsSync(file)), '只检查不能删除');
        // 模拟Creator保留旧工具模块；构建入口必须主动读新工具，不能命中旧路径实现。
        require.cache[require.resolve('./dedupe-bag-build.cjs')].exports = {
            dedupeBagBuild: () => { throw new Error('不应调用缓存中的旧构建工具'); },
        };
        const result = await hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory });
        assert.equal(result.files, images.length);
        assert.equal(result.bytes, images.reduce((sum, image) => sum + fs.statSync(resolveAssetPath(image[0])).size, 0));
        assert.deepEqual(result.groups.map(row => row.group), ['common', 'hero', 'battle']);
        const manifest = JSON.parse(fs.readFileSync(path.join(result.backup, 'manifest.json')));
        assert.equal(manifest.build, directory);
        for (const row of manifest.rows) {
            assert(!fs.existsSync(row.file));
            const original = images.find(([, uuid]) => path.basename(row.file) === uuid + '.png');
            assert.deepEqual(fs.readFileSync(path.join(result.backup, path.basename(row.file))),
                fs.readFileSync(resolveAssetPath(original[0])));
        }
        assert.equal((await hook.onAfterBuild({ platform: 'web-desktop' }, { dest: directory })).files, 0);
        fixture(directory);
        // 最后一张战斗图片损坏时，已通过校验的其他图片都不能提前删除。
        fs.appendFileSync(files[files.length - 1], 'invalid');
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /不是原图副本/);
        assert(files.every(file => fs.existsSync(file)));
        fixture(directory);
        write(path.join(directory, 'assets/prefabs/import/ef/efuser.json'), JSON.stringify({ type: 'cc.Texture2D', data: [['settings', [images[8][2]]]] }));
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /发现原图/);
        assert(files.every(file => fs.existsSync(file)));
        fs.unlinkSync(path.join(directory, 'assets/prefabs/import/ef/efuser.json'));
        const configFile = path.join(directory, 'assets/main/config.json');
        const config = JSON.parse(fs.readFileSync(configFile));
        config.paths[16] = ['dynamic-image', 0];
        write(configFile, JSON.stringify(config));
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /动态加载/);
        assert(files.every(file => fs.existsSync(file)));
        fixture(directory);
        write(path.join(directory, 'assets/main/import/ab/abpack.json'), JSON.stringify([1, ['other@6c48a']]));
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /跨包帧引用不一致/);
        assert(files.every(file => fs.existsSync(file)));
        fixture(directory);
        write(path.join(directory, 'assets/redirected/config.json'), JSON.stringify({
            uuids: [images[2][2] + '@f9941'], paths: {}, packs: {}, redirect: [0, '0'], deps: ['missing'],
        }));
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory }), /重定向/);
        assert(files.every(file => fs.existsSync(file)));
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile', md5Cache: true }, { dest: directory }), /MD5/);
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile', debug: true }, { dest: directory }), /调试/);
        await assert.rejects(hook.onAfterBuild({ platform: 'wechatgame' }, { dest: directory }), /只支持/);
        await assert.rejects(hook.onAfterBuild({ platform: 'web-mobile' }, {}), /输出目录/);
        assert.throws(() => dedupeBagBuild(source, true), /只允许/);
        fixture(directory);
        const remoteRoot = path.join(directory, 'remote');
        fs.mkdirSync(remoteRoot);
        // 只移动本测试创建的包；远程输出必须经过与本地输出相同的引用校验。
        fs.renameSync(path.join(directory, 'assets/prefabs'), path.join(remoteRoot, 'bag'));
        assert.equal(dedupeBagBuild(directory).files, images.length, '不能漏查remote目录原图');
        assert.equal((await hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory })).files, images.length);
        console.log('背包构建钩子检查通过：备份、重复运行、只检查、原图依赖、损坏拒绝、平台及路径边界。');
    } finally {
        assert(directory.startsWith(buildRoot + path.sep + 'bag-hook-test-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
