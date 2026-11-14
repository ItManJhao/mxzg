/**
 * 配置压缩包专项：验证确定性、版本、启动拆分、官方 Bundle UUID 排除及生成解码器三入口互通。
 * 正例再只读核对当前项目；不启动 Creator、不运行真实构建，产物去重仍须发布前实际验证。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('../client/node_modules/esbuild');
const { unzipSync } = require('../client/node_modules/fflate');
const { buildConfigPackage, buildConfigCodec, generateConfigPackage, crc32 } = require('./generate_config_package.cjs');

/** 仓库根；临时夹具限定在已忽略的 client/temp 内。 */
const ROOT = path.resolve(__dirname, '..');
/** 本次唯一临时根；清理前核对路径，绝不删除真实源目录。 */
const TEMP_ROOT = path.join(ROOT, 'client/temp');

/** 向隔离项目写入文本或 JSON，并准备必要父目录。 */
function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
}

/** 构造不同层级包根，三个源表使用原 meta 身份；启动表名完全来自测试 LoadingPlan。 */
function fixture(projectRoot) {
    const directory = path.join(projectRoot, 'client/assets/bundles/arbitrary/deeper/tables');
    const metaFile = directory + '.meta';
    const schemaFile = path.join(projectRoot, 'config/client-schema.json');
    const planFile = path.join(projectRoot, 'client/assets/scripts/app/remake/LoadingPlan.ts');
    const names = ['language', 'loadingtips', 'maincity/example'];
    const schema = { version: 1, tables: {
        Language: { path: 'config/language' },
        LoadingTips: { path: 'config/loadingtips' },
        Example: { path: 'config/maincity/example' },
    } };
    for (const [index, name] of names.entries()) {
        write(path.join(directory, name + '.json'), '\uFEFF{\n  "rows": [{"idx":' + (index + 1) + ',"text":"中文/保留内容"}]\n}\n');
        write(path.join(directory, name + '.json.meta'), {
            importer: 'json', uuid: '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
            userData: { keepSourceSetting: true },
        });
    }
    write(metaFile, { importer: 'directory', uuid: '00000000-0000-4000-8000-000000000099', userData: {
        isBundle: true, bundleName: 'config', priority: 8, bundleConfigID: 'kept',
        bundleFilterConfig: [{ range: 'exclude', type: 'url', patchOption: { patchType: 'contain', value: 'unrelated' } }],
    } });
    write(schemaFile, schema);
    write(planFile, 'const LOADING_PLAN = { login: [\n'
        + '// { config: GConfig.Example },\n'
        + '{ config: GConfig.Language }, { config: GConfig.LoadingTips },\n'
        + 'Resource.describe("maps", "https://example/a//b", "SpriteFrame"),\n'
        + '], enterGame: [{configPackage:true}], background: [] };');
    return { directory, metaFile, schemaFile, planFile, schema, names };
}

/** 记录所有输入字节；用于检查生成过程只更新包及目录规则，不重写源表或源 meta。 */
function sourceSnapshot(input) {
    return input.names.flatMap(name => ['.json', '.json.meta'].map(extension => {
        const file = path.join(input.directory, name + extension);
        return [file, fs.readFileSync(file)];
    }));
}

/** 读取真正 ZIP 清单，并逐项核对与源 JSON.parse/JSON.stringify 相同的规范内容和 CRC。 */
function verifyArchive(projectRoot, expectedStartup, expectedPacked) {
    const built = buildConfigPackage(projectRoot);
    const zip = unzipSync(built.bytes);
    const manifest = JSON.parse(Buffer.from(zip['manifest.json']).toString('utf8'));
    assert.equal(manifest.format, 1);
    assert.match(manifest.version, /^config-v1:[0-9a-f]{64}$/);
    assert.equal(manifest.startup.length, expectedStartup);
    assert.equal(manifest.files.length, expectedPacked);
    assert.deepEqual(Object.keys(zip).sort(), ['manifest.json', ...manifest.files.map(entry => entry.file)].sort());
    for (const entry of built.entries) {
        const listed = [...manifest.startup, ...manifest.files].find(value => value.path === entry.path);
        assert.equal(listed.crc32, crc32(entry.bytes));
        assert.equal(listed.bytes, entry.bytes.length);
        if ('file' in listed) {
            assert.deepEqual(Buffer.from(zip[listed.file]), entry.bytes);
        } else {
            assert.equal(zip[entry.file], undefined, '启动表不能重复进入压缩包');
        }
    }
    return built;
}

/** 在没有 require、Worker 或浏览器全局的隔离上下文执行生成的三入口，核验真实 ZIP 与中文 UTF-8 互通。 */
function verifyCodec(projectRoot, archiveBytes) {
    const codec = buildConfigCodec(projectRoot);
    const code = esbuild.transformSync(codec.text, { loader: 'ts', format: 'cjs', target: 'es2017' }).code;
    assert(!/\brequire\s*\(/.test(code), '生成解码器不能在运行时重新导入 npm 包');
    const module = { exports: {} };
    const context = vm.createContext({ module, exports: module.exports, Uint8Array, Uint16Array,
        Uint32Array, Int32Array, TextEncoder, TextDecoder });
    vm.runInContext(code, context);
    const exports = module.exports;
    assert.deepEqual(Object.keys(exports).sort(), ['strFromU8', 'strToU8', 'unzipSync']);
    const text = '配置压缩包/中文/😀';
    assert.equal(exports.strFromU8(exports.strToU8(text)), text);
    const archive = exports.unzipSync(archiveBytes);
    const manifest = JSON.parse(exports.strFromU8(archive['manifest.json']));
    assert.equal(manifest.format, 1);
    assert.deepEqual(Object.keys(archive).sort(), Object.keys(unzipSync(archiveBytes)).sort());
    for (const entry of manifest.files) {
        assert.equal(crc32(archive[entry.file]), entry.crc32);
    }
}

/** 运行正例与负例；失败时仍只清理由本专项创建的临时项目。 */
async function main() {
    assert.equal(crc32(Buffer.from('123456789')), 'cbf43926', 'CRC32 必须符合标准测试向量');
    fs.mkdirSync(TEMP_ROOT, { recursive: true });
    const projectRoot = fs.mkdtempSync(path.join(TEMP_ROOT, 'config-package-test-'));
    try {
        const input = fixture(projectRoot);
        const sourceBefore = sourceSnapshot(input);
        assert.throws(() => generateConfigPackage({ projectRoot, check: true }), /过期或缺失/);
        assert(!fs.existsSync(path.join(input.directory, 'game-config.bin')), '只读检查不能创建配置包');
        const generated = generateConfigPackage({ projectRoot });
        assert.equal(generated.changed.length, 5);
        assert.equal(generated.excluded, 1);
        const first = verifyArchive(projectRoot, 2, 1);
        const originalBytes = fs.readFileSync(first.output);
        const firstMeta = fs.readFileSync(first.output + '.meta');
        const codec = buildConfigCodec(projectRoot);
        const codecOriginal = fs.readFileSync(codec.file);
        const codecMetaOriginal = fs.readFileSync(codec.file + '.meta');
        verifyCodec(projectRoot, originalBytes);
        const bundleMeta = JSON.parse(fs.readFileSync(input.metaFile));
        assert.equal(bundleMeta.uuid, '00000000-0000-4000-8000-000000000099');
        assert.equal(bundleMeta.userData.bundleConfigID, 'kept');
        assert.equal(bundleMeta.userData.bundleFilterConfig.length, 2);
        assert.deepEqual(bundleMeta.userData.bundleFilterConfig[1], {
            range: 'exclude', type: 'asset', assets: ['00000000-0000-4000-8000-000000000003'],
        });
        for (const [file, bytes] of sourceBefore) {
            assert.deepEqual(fs.readFileSync(file), bytes, '源 JSON 与源 meta 必须保持原字节：' + file);
        }
        assert.deepEqual(generateConfigPackage({ projectRoot }).changed, [], '重复生成不能改时间或 UUID');
        assert.deepEqual(generateConfigPackage({ projectRoot, check: true }).changed, []);
        assert.deepEqual(fs.readFileSync(first.output), originalBytes, '相同输入必须产生相同 ZIP');
        assert.deepEqual(fs.readFileSync(first.output + '.meta'), firstMeta, '配置包 UUID 不能重造');
        assert.deepEqual(fs.readFileSync(codec.file + '.meta'), codecMetaOriginal, '解码器 UUID 不能重造');
        fs.appendFileSync(codec.file, '\n// 错误修改生成结果\n');
        assert.throws(() => generateConfigPackage({ projectRoot, check: true }), /解码器过期/);
        generateConfigPackage({ projectRoot });
        assert.deepEqual(fs.readFileSync(codec.file), codecOriginal, '写入模式必须恢复唯一生成结果');
        assert.deepEqual(fs.readFileSync(codec.file + '.meta'), codecMetaOriginal);
        const reserved = path.join(input.directory, 'manifest.json');
        write(reserved, { rows: [1] });
        assert.throws(() => generateConfigPackage({ projectRoot }), /保留名称/);
        fs.unlinkSync(reserved);
        write(first.output + '.meta', { importer: 'json', uuid: 'kept-invalid' });
        assert.throws(() => generateConfigPackage({ projectRoot }), /buffer importer/);
        assert.deepEqual(fs.readFileSync(first.output), originalBytes, '非法包 meta 必须在写包前拒绝');
        fs.writeFileSync(first.output + '.meta', firstMeta);

        // 只改变空白与 BOM 不改变运行时 JSON 值，也不应产生新包或无效版本。
        const startupFile = path.join(input.directory, 'language.json');
        const startupJson = JSON.parse(fs.readFileSync(startupFile, 'utf8').replace(/^\uFEFF/, ''));
        write(startupFile, JSON.stringify(startupJson));
        assert.deepEqual(generateConfigPackage({ projectRoot, check: true }).changed, []);
        startupJson.rows[0].text = '启动表修改';
        write(startupFile, startupJson);
        assert.throws(() => generateConfigPackage({ projectRoot, check: true }), /过期/);
        assert.deepEqual(fs.readFileSync(first.output), originalBytes, '只读失败不能修复包');
        generateConfigPackage({ projectRoot });
        const afterStartupChange = buildConfigPackage(projectRoot).manifest.version;
        assert.notEqual(afterStartupChange, first.manifest.version, '包外启动表变化也必须改变整包版本');

        input.schema.note = 'schema 变更';
        write(input.schemaFile, input.schema);
        assert.throws(() => generateConfigPackage({ projectRoot, check: true }), /过期/);
        generateConfigPackage({ projectRoot });
        assert.notEqual(buildConfigPackage(projectRoot).manifest.version, afterStartupChange, 'schema 变化必须改变版本');

        // 改启动归属后，上一轮托管规则替换为新集合，用户规则仍保持同一内容。
        write(input.planFile, 'const LOADING_PLAN = {login:[{config:GConfig.Language}],enterGame:[{configPackage:true}]};');
        generateConfigPackage({ projectRoot });
        const moved = verifyArchive(projectRoot, 1, 2);
        const movedMeta = JSON.parse(fs.readFileSync(input.metaFile));
        assert.equal(movedMeta.userData.bundleFilterConfig.length, 2, '托管规则不能重复追加');
        assert.deepEqual(movedMeta.userData.bundleFilterConfig[0], bundleMeta.userData.bundleFilterConfig[0]);
        assert.deepEqual(new Set(movedMeta.userData.bundleFilterConfig[1].assets), new Set(moved.excluded));
        assert(!movedMeta.userData.bundleFilterConfig[1].assets.includes('00000000-0000-4000-8000-000000000001'));

        const clean = fs.readFileSync(moved.output);
        fs.appendFileSync(moved.output, 'tampered');
        const tampered = fs.readFileSync(moved.output);
        assert.throws(() => generateConfigPackage({ projectRoot, check: true }), /过期/);
        assert.deepEqual(fs.readFileSync(moved.output), tampered);
        fs.writeFileSync(moved.output, clean);
        movedMeta.userData.bundleFilterConfig[1].assets.pop();
        write(input.metaFile, movedMeta);
        assert.throws(() => generateConfigPackage({ projectRoot, check: true }), /排除规则过期/);
        write(input.metaFile, moved.meta);
        const invalidSource = path.join(input.directory, 'maincity/example.json');
        write(invalidSource, '{invalid');
        assert.throws(() => generateConfigPackage({ projectRoot }), /JSON|property/);
        assert.deepEqual(fs.readFileSync(moved.output), clean, '非法源表不能先覆盖有效包');
        write(invalidSource, { rows: [{ idx: 3, text: '恢复' }] });
        generateConfigPackage({ projectRoot });
        fs.unlinkSync(invalidSource);
        assert.throws(() => generateConfigPackage({ projectRoot }), /schema.*缺少源/);
    } finally {
        assert(projectRoot.startsWith(TEMP_ROOT + path.sep + 'config-package-test-'));
        fs.rmSync(projectRoot, { recursive: true, force: true });
    }
    const current = generateConfigPackage({ check: true });
    const built = verifyArchive(ROOT, current.startup, current.packed);
    verifyCodec(ROOT, built.bytes);
    const meta = JSON.parse(fs.readFileSync(built.metaFile));
    const managed = meta.userData.bundleFilterConfig.filter(rule => rule.range === 'exclude' && rule.type === 'asset'
        && Array.isArray(rule.assets) && rule.assets.length === built.excluded.length
        && rule.assets.every(uuid => built.excluded.includes(uuid)));
    assert.equal(managed.length, 1, '当前项目必须只有一条本工具拥有的排除规则');
    assert.equal(new Set(managed[0].assets).size, current.packed);
    const hook = require('../client/extensions/mxzg-bag-build/hooks');
    const hookResult = await hook.onBeforeBuild({}, {});
    assert.equal(hookResult.version, current.version, '固定构建入口必须检查当前配置包');
    console.log('配置包专项通过：标准 CRC、规范化、确定性、启动/schema 版本、ZIP 内容、原 UUID、过滤保留/更新、损坏拒绝、解码器三入口互通/漂移、检查零写入及构建前核验。');
    console.log(JSON.stringify({ ...current, buildDeduplication: '静态规则已核验；本批未运行真实 Creator 构建' }));
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
