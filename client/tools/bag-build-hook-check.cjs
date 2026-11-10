/** 背包构建钩子回归：用隔离的 Web 产物检查备份、幂等及失败前不删除。
 * 夹具使用9张真实原图及跨包共享纹理，不能代替 Creator 实际构建和浏览器验收。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const hook = require('../extensions/mxzg-bag-build/hooks');
const builder = require('../extensions/mxzg-bag-build/builder');
const { dedupeBagBuild } = require('./dedupe-bag-build.cjs');
const buildRoot = path.resolve(__dirname, '../build');
const root = path.resolve(__dirname, '../..');
const images = JSON.parse(fs.readFileSync(path.join(root, 'config/ui-atlas-dedupe.json'))).images.map(image => {
    const hex = image.uuid.replace(/-/g, '');
    return [image.source, image.uuid, hex.slice(0, 2) + Buffer.from(hex.slice(2), 'hex').toString('base64')];
});
const source = path.join(root, 'client/assets/ui');


/** 在测试目录写文件，同时创建父目录。 */
function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

/** 构造与已核实产物结构一致的最小夹具，返回9张可清理副本路径。 */
function fixture(directory) {
    const bundle = path.join(directory, 'assets/prefabs');
    write(path.join(directory, 'index.html'), '<!doctype html>');
    write(path.join(bundle, 'config.json'), JSON.stringify({
        uuids: images.flatMap(([, , id]) => [id, id + '@f9941']),
        paths: {}, packs: { abpack: images.map((_, index) => index * 2 + 1) },
    }));
    write(path.join(bundle, 'import/ab/abpack.json'), JSON.stringify([1, ['cdatlas@6c48a']]));
    write(path.join(directory, 'assets/main/native/cd/cdatlas.png'), fs.readFileSync(path.join(root, images[0][0])));
    // 第二包保留同一帧数据，第三包只登记重定向；共享纹理仅存在于main。
    write(path.join(directory, 'assets/main/config.json'), fs.readFileSync(path.join(bundle, 'config.json')));
    write(path.join(directory, 'assets/main/import/ab/abpack.json'), JSON.stringify([1, ['cdatlas@6c48a']]));
    write(path.join(directory, 'assets/redirected/config.json'), JSON.stringify({
        uuids: [images[2][2] + '@f9941'], paths: {}, packs: {}, redirect: [0, '0'], deps: ['main'],
    }));
    return images.map(([name, uuid]) => {
        const file = path.join(bundle, 'native', uuid.slice(0, 2), uuid + '.png');
        write(file, fs.readFileSync(path.join(root, name)));
        return file;
    });
}

/** 实际调用钩子，检查成功和拒绝路径；仅清理由本测试创建的独立目录。 */
async function main() {
    fs.mkdirSync(buildRoot, { recursive: true });
    const directory = fs.mkdtempSync(path.join(buildRoot, 'bag-hook-test-'));
    try {
        assert.deepEqual(Object.keys(builder.configs).sort(), ['web-desktop', 'web-mobile']);
        assert.equal(hook.throwError, true);
        const files = fixture(directory);
        assert.equal(dedupeBagBuild(directory).files, 9);
        assert(files.every(file => fs.existsSync(file)), '只检查不能删除');
        const result = await hook.onAfterBuild({ platform: 'web-mobile' }, { dest: directory });
        assert.equal(result.files, 9);
        assert.equal(result.bytes, 35481);
        const manifest = JSON.parse(fs.readFileSync(path.join(result.backup, 'manifest.json')));
        assert.equal(manifest.build, directory);
        for (const row of manifest.rows) {
            assert(!fs.existsSync(row.file));
            const original = images.find(([, uuid]) => path.basename(row.file) === uuid + '.png');
            assert.deepEqual(fs.readFileSync(path.join(result.backup, path.basename(row.file))),
                fs.readFileSync(path.join(root, original[0])));
        }
        assert.equal((await hook.onAfterBuild({ platform: 'web-desktop' }, { dest: directory })).files, 0);
        fixture(directory);
        // 最后一张common图片损坏时，已通过校验的背包及其他common图片都不能提前删除。
        fs.appendFileSync(files[8], 'invalid');
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
