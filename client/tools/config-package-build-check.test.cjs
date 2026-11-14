/**
 * 配置包产物核验专项：用当前真实源配置生成独立Web夹具，覆盖跨包残留、损坏及旧构建拒绝。
 * 夹具仅验证检查器边界，不能冒充Creator构建或浏览器运行；只清理本测试创建的临时目录。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildConfigPackage } = require('../../tools/generate_config_package.cjs');
const { checkConfigPackageBuild } = require('./config-package-build-check.cjs');

/** 当前源工程；所有写操作只发生在测试自建build临时目录。 */
const ROOT = path.resolve(__dirname, '../..');
/** 临时产物根，便于同一钩子专项验证允许路径。 */
const BUILD_ROOT = path.join(ROOT, 'client/build');

/** 创建父目录后写入夹具文件，JSON调用方显式序列化。 */
function write(file, bytes) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
}

/** 按Creator格式压缩资源UUID，测试跨Bundle的压缩登记不能漏查。 */
function compressed(uuid) {
    const hex = uuid.replace(/-/g, '');
    return hex.slice(0, 2) + Buffer.from(hex.slice(2), 'hex').toString('base64');
}

/** 构造已观察到的JsonAsset压缩数组，保持源对象及注释行，供内容同版检查。 */
function serializedJson(name, value) {
    return [1, 0, 0, [['cc.JsonAsset', ['_name', 'json'], 1]], [[0, 0, 1, 3]], [[0, name, value]], 0, 0, [], [], []];
}

/**
 * 在调用方拥有的目录补齐当前配置产物；可与图集/启动夹具组合，不修改其他已存在文件。
 * packed为true时把三类资产元数据合入一份import，以验证不能只检查独立UUID文件。
 */
function createConfigBuildFixture(directory, { packed = false } = {}) {
    const source = buildConfigPackage(ROOT);
    const startupPaths = new Set(source.manifest.startup.map(entry => entry.path));
    const startup = source.entries.filter(entry => startupPaths.has(entry.path));
    const binaryUuid = JSON.parse(fs.readFileSync(source.output + '.meta', 'utf8')).uuid;
    const bundle = path.join(directory, 'remote/config');
    const jsonAssets = startup.map(entry => serializedJson(entry.path.slice('config/'.length), JSON.parse(entry.bytes)));
    const bufferAsset = { __type__: 'cc.BufferAsset', _name: 'game-config', _native: '.bin' };
    const config = {
        name: 'config', importBase: 'import', nativeBase: 'native', debug: false, versions: { import: [], native: [] },
        uuids: startup.map(entry => compressed(entry.uuid)).concat(compressed(binaryUuid)),
        paths: Object.fromEntries(startup.map((entry, index) => [index, [entry.path.slice('config/'.length), 0]])
            .concat([[startup.length, ['game-config', 1]]])),
        types: ['cc.JsonAsset', 'cc.BufferAsset'], packs: {},
    };
    if (packed) {
        config.packs.abconfigpack = config.uuids.map((_, index) => index);
        write(path.join(bundle, 'import/ab/abconfigpack.json'), JSON.stringify(jsonAssets.concat(bufferAsset)));
    } else {
        startup.forEach((entry, index) => write(path.join(bundle, 'import', entry.uuid.slice(0, 2), entry.uuid + '.json'),
            JSON.stringify(jsonAssets[index])));
        write(path.join(bundle, 'import', binaryUuid.slice(0, 2), binaryUuid + '.json'), JSON.stringify(bufferAsset));
    }
    write(path.join(bundle, 'config.json'), JSON.stringify(config));
    const binary = path.join(bundle, 'native', binaryUuid.slice(0, 2), binaryUuid + '.bin');
    write(binary, source.bytes);
    write(path.join(directory, 'src/chunks/config-fixture.js'),
        'System.register("chunks:///_virtual/ConfigZip.generated.ts", [], function () { return {}; });\n'
        + 'System.register("chunks:///_virtual/ConfigPackageUtils.ts", ["./ConfigZip.generated.ts"], function () { return {}; });');
    const settingsFile = path.join(directory, 'src/settings.json');
    const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : { assets: {} };
    settings.scripting = { scriptPackages: ['../src/chunks/config-fixture.js'] };
    write(settingsFile, JSON.stringify(settings));
    write(path.join(directory, 'index.html'), '<!doctype html>');
    return { source, startup, bundle, binary, binaryUuid, settingsFile };
}

/** 对原JSON做局部编辑，方便分别证明每条不变量会真正拒绝错误产物。 */
function editJson(file, edit) {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    edit(value);
    write(file, JSON.stringify(value));
}

/** 在新目录运行单个场景，结束仅删除自建临时目录，不碰既有发布包。 */
function scenario(run, options) {
    const directory = fs.mkdtempSync(path.join(BUILD_ROOT, 'config-artifact-test-'));
    try {
        const fixture = createConfigBuildFixture(directory, options);
        run(directory, fixture);
    } finally {
        assert(directory.startsWith(BUILD_ROOT + path.sep + 'config-artifact-test-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

/** 检查真实源投影、唯一bin、pack元数据与全部输出Bundle中的反例。 */
function main() {
    fs.mkdirSync(BUILD_ROOT, { recursive: true });
    for (const packed of [false, true]) {
        scenario((directory, fixture) => {
            const before = fs.readFileSync(fixture.binary);
            const summary = checkConfigPackageBuild(directory);
            assert.equal(summary.version, fixture.source.manifest.version);
            assert.equal(summary.startup, fixture.startup.length);
            assert.equal(summary.excluded, fixture.source.manifest.files.length);
            assert.equal(summary.binaryFiles, 1);
            assert.equal(summary.codecRuntimeVerified, false, '静态检查不能冒充浏览器实际运行');
            assert.deepEqual(fs.readFileSync(fixture.binary), before, '检查器不修改产物');
        }, { packed });
    }
    scenario((directory, fixture) => {
        const id = fixture.source.excluded[0];
        write(path.join(directory, 'assets/other/config.json'), JSON.stringify({ uuids: [compressed(id)], paths: {}, packs: {} }));
        assert.throws(() => checkConfigPackageBuild(directory), /非启动散表仍被Bundle登记/);
    });
    scenario((directory, fixture) => {
        const id = fixture.source.excluded[0];
        write(path.join(directory, 'assets/other/import', id.slice(0, 2), id + '.json'), '{}');
        assert.throws(() => checkConfigPackageBuild(directory), /落盘副本/);
    });
    scenario((directory, fixture) => {
        write(path.join(directory, 'assets/main/import/ab/abmetadata.json'), JSON.stringify({ ref: fixture.source.excluded[0] }));
        assert.throws(() => checkConfigPackageBuild(directory), /import引用/);
    });
    scenario((directory, fixture) => {
        fs.unlinkSync(fixture.binary);
        assert.throws(() => checkConfigPackageBuild(directory), /缺少或重复/);
    });
    scenario((directory, fixture) => {
        fs.appendFileSync(fixture.binary, 'stale');
        assert.throws(() => checkConfigPackageBuild(directory), /损坏或不是当前版本/);
    });
    scenario((directory, fixture) => {
        write(path.join(directory, 'assets/main/native/ab/abcopy.bin'), fs.readFileSync(fixture.binary));
        assert.throws(() => checkConfigPackageBuild(directory), /相同配置bin副本/);
    });
    scenario((directory, fixture) => {
        const entry = fixture.startup[0];
        write(path.join(fixture.bundle, 'import', entry.uuid.slice(0, 2), entry.uuid + '.json'), JSON.stringify(serializedJson('old', { rows: [] })));
        assert.throws(() => checkConfigPackageBuild(directory), /不同版/);
    });
    scenario((directory, fixture) => {
        editJson(path.join(fixture.bundle, 'config.json'), value => { value.paths[0][0] = 'old-path'; });
        assert.throws(() => checkConfigPackageBuild(directory), /动态路径/);
    });
    scenario((directory, fixture) => {
        editJson(path.join(fixture.bundle, 'config.json'), value => { value.types[1] = 'cc.JsonAsset'; });
        assert.throws(() => checkConfigPackageBuild(directory), /发布类型/);
    });
    scenario((directory, fixture) => {
        editJson(path.join(fixture.bundle, 'config.json'), value => { value.versions.native.push(0, 'abcd'); });
        assert.throws(() => checkConfigPackageBuild(directory), /MD5/);
    });
    scenario((directory, fixture) => {
        editJson(path.join(fixture.bundle, 'config.json'), value => { value.debug = true; });
        assert.throws(() => checkConfigPackageBuild(directory), /调试/);
    });
    scenario(directory => {
        write(path.join(directory, 'src/chunks/config-fixture.js'), 'System.register("old", [], function () { return {}; });');
        assert.throws(() => checkConfigPackageBuild(directory), /未包含生成解码器/);
    });
    scenario(directory => {
        write(path.join(directory, 'src/chunks/config-fixture.js'),
            'System.register("chunks:///_virtual/ConfigZip.generated.ts", [], function () { return {}; });\n'
            + 'System.register("chunks:///_virtual/ConfigPackageUtils.ts", ["./old.js"], function () { return {}; });');
        assert.throws(() => checkConfigPackageBuild(directory), /调用者未依赖/);
    });
    scenario(directory => {
        fs.appendFileSync(path.join(directory, 'src/chunks/config-fixture.js'), 'throw new Error("Unexpected export statement in CJS module");');
        assert.throws(() => checkConfigPackageBuild(directory), /错误占位/);
    });
    console.log('配置包发布产物专项通过：真实源版本/UUID/两种import、只读、跨Bundle散表/引用/落盘、损坏/重复bin、启动混版、类型/路径及解码器静态证据边界。');
}

module.exports = { createConfigBuildFixture };

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.stack || error);
        process.exitCode = 1;
    }
}
