/**
 * 配置包发布产物核验：从同一生成清单与原meta读取身份，检查全部本地、远程Bundle。
 * 只读检查非MD5 Web输出中的启动JSON、唯一二进制和解码器静态登记，不改产物或源资源。
 * 脚本存在性不能代表浏览器执行成功；实际登录与解压仍由独立环境运行验收。
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const { unzipSync } = require('../node_modules/fflate');
const { buildConfigPackage } = require('../../tools/generate_config_package.cjs');

/** 默认项目根；隔离工程复制同一相对结构，检查不会回写原工程。 */
const ROOT = path.resolve(__dirname, '../..');

/** 读取JSON并兼容文本工具写入的UTF8 BOM。 */
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

/** 读取指定树的普通文件；拒绝链接，防止检查范围被重定向到构建目录之外。 */
function filesIn(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        assert(!entry.isSymbolicLink(), '构建目录不允许符号链接：' + entry.name);
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? filesIn(file) : [file];
    });
}

/** 返回文件内容摘要，用于比较源配置包与发布二进制，不以文件名代替完整性。 */
function sha256(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

/** 生成Creator资源UUID的22字符形式；同一身份同时支持完整和压缩登记。 */
function compressedUuid(uuid) {
    assert(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid), '源meta UUID非法：' + uuid);
    const hex = uuid.replace(/-/g, '').toLowerCase();
    return hex.slice(0, 2) + Buffer.from(hex.slice(2), 'hex').toString('base64');
}

/** 将完整或22字符资源UUID规范为完整形式；普通pack键不作猜测。 */
function fullUuid(value) {
    if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
        return value.toLowerCase();
    }
    if (!/^[0-9a-f]{2}[A-Za-z0-9+/]{20}$/i.test(value)) {
        return null;
    }
    const hex = value.slice(0, 2) + Buffer.from(value.slice(2), 'base64').toString('hex');
    if (hex.length !== 32) {
        return null;
    }
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

/** 收集发布JSON里的字符串，用于核对身份和序列化类名，不执行发布脚本。 */
function stringsIn(value) {
    if (typeof value === 'string') {
        return [value];
    }
    return value && typeof value === 'object' ? Object.values(value).flatMap(stringsIn) : [];
}

/** 在Creator序列化外壳中定位实际JSON对象；同时支持直存及已观察到的压缩数组。 */
function includesJson(value, expected) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    if (!Array.isArray(value) && isDeepStrictEqual(value, expected)) {
        return true;
    }
    return Object.values(value).some(child => includesJson(child, expected));
}

/** 找到已登记资产的实际import文件；重定向和未知格式不假定已通过。 */
function assetImport(bundle, index, files) {
    const uuid = fullUuid(bundle.config.uuids[index]);
    assert(uuid, '配置资产UUID登记格式不支持');
    const packed = Object.entries(bundle.config.packs || {}).filter(([, indexes]) =>
        Array.isArray(indexes) && indexes.some(value => Number(value) === index));
    assert(packed.length <= 1, '配置资产登记到多个import包：' + uuid);
    const token = packed.length ? fullUuid(packed[0][0]) || packed[0][0] : uuid;
    assert(/^[A-Za-z0-9_-]+$/.test(token), 'import包名称不安全：' + token);
    const base = bundle.config.importBase || 'import';
    assert(base === 'import', '目前只支持Creator标准import目录');
    const file = path.join(bundle.directory, base, token.slice(0, 2), token + '.json');
    assert(files.includes(file), '配置资产缺少实际import文件：' + uuid);
    return { file, data: readJson(file) };
}

/** 按完整meta身份及包内路径定位预期资产，禁止仅凭同名路径把旧资产认作新资产。 */
function findAsset(bundle, uuid, loadPath, type) {
    const indexes = bundle.config.uuids.flatMap((value, index) => fullUuid(value) === uuid ? [index] : []);
    assert.equal(indexes.length, 1, 'config包缺少或重复配置身份：' + loadPath);
    const index = indexes[0];
    const registered = bundle.config.paths?.[index];
    assert(Array.isArray(registered) && registered[0] === loadPath, '配置动态路径不一致：' + loadPath);
    assert.equal(bundle.config.types?.[registered[1]], type, '配置发布类型不一致：' + loadPath);
    const redirects = bundle.config.redirect || [];
    assert(!redirects.some((value, offset) => offset % 2 === 0 && Number(value) === index),
        '配置源被重定向到其他包，需重新核对归属：' + loadPath);
    return index;
}

/**
 * 只读核验当前源对应的完整Web输出；返回真实扫描数量与内容摘要供构建日志记录。
 * 支持关闭MD5的Creator 3.8 Web产物，配置可独立import或位于packs；不执行脚本、不发起网络请求。
 */
function checkConfigPackageBuild(buildDirectory, { projectRoot = ROOT } = {}) {
    const build = path.resolve(projectRoot, buildDirectory);
    assert(fs.existsSync(path.join(build, 'index.html')), '配置核验需要完整Web构建目录');
    assert.equal(fs.realpathSync(build), build, '构建目录不能通过链接跳转');
    const allFiles = filesIn(build);
    const bundleFiles = allFiles.filter(file => ['assets', 'remote'].includes(path.relative(build, file).split(path.sep)[0]));
    const bundles = bundleFiles.filter(file => path.basename(file) === 'config.json').map(file => ({
        directory: path.dirname(file), config: readJson(file),
    })).filter(bundle => Array.isArray(bundle.config.uuids));
    assert(bundles.length > 0, '构建中没有实际Bundle，拒绝空检查');
    for (const bundle of bundles) {
        assert(bundle.config.debug !== true, '配置产物检查要求关闭调试模式');
        assert(Object.values(bundle.config.versions || {}).every(versions => Array.isArray(versions) && !versions.length),
            '配置产物检查目前要求关闭MD5缓存');
    }
    const expected = buildConfigPackage(projectRoot);
    assert(fs.existsSync(expected.output) && fs.readFileSync(expected.output).equals(expected.bytes),
        '源配置包过期，请生成并导入后重新构建');
    const startupPaths = new Set(expected.manifest.startup.map(entry => entry.path));
    const packed = expected.entries.filter(entry => !startupPaths.has(entry.path));
    const forbidden = new Map(packed.flatMap(entry => [[entry.uuid, entry.path], [compressedUuid(entry.uuid), entry.path]]));
    for (const bundle of bundles) {
        for (const id of stringsIn(bundle.config)) {
            assert(!forbidden.has(id.split('@')[0]), '非启动散表仍被Bundle登记，不能使用旧构建：' + forbidden.get(id.split('@')[0]));
        }
    }
    for (const file of bundleFiles) {
        const basename = path.basename(file).split('.')[0];
        assert(!forbidden.has(basename), '非启动散表仍有落盘副本：' + forbidden.get(basename));
        if (file.endsWith('.json') && file.includes(path.sep + 'import' + path.sep)) {
            for (const id of stringsIn(readJson(file))) {
                assert(!forbidden.has(id.split('@')[0]), '非启动散表仍被import引用：' + forbidden.get(id.split('@')[0]));
            }
        }
    }
    const owners = bundles.filter(bundle => bundle.config.name === 'config' || path.basename(bundle.directory) === 'config');
    assert.equal(owners.length, 1, '构建必须只有一个实际config包');
    const owner = owners[0];
    const startup = expected.entries.filter(entry => startupPaths.has(entry.path));
    for (const entry of startup) {
        const index = findAsset(owner, entry.uuid, entry.path.slice('config/'.length), 'cc.JsonAsset');
        const imported = assetImport(owner, index, bundleFiles);
        assert(stringsIn(imported.data).includes('cc.JsonAsset'), '启动源缺少JsonAsset序列化：' + entry.path);
        assert(includesJson(imported.data, JSON.parse(entry.bytes)), '启动源内容与配置包不同版：' + entry.path);
    }
    const binaryUuid = readJson(expected.output + '.meta').uuid;
    const binaryIndex = findAsset(owner, binaryUuid, 'game-config', 'cc.BufferAsset');
    const binaryImport = assetImport(owner, binaryIndex, bundleFiles);
    const binaryStrings = stringsIn(binaryImport.data);
    assert(binaryStrings.includes('cc.BufferAsset') && binaryStrings.includes('.bin'), '压缩配置缺少BufferAsset原生附件声明');
    const binaryFiles = bundleFiles.filter(file => path.basename(file) === binaryUuid + '.bin');
    assert.equal(binaryFiles.length, 1, '发布包缺少或重复game-config.bin，请使用新构建');
    assert(binaryFiles[0].startsWith(owner.directory + path.sep + 'native' + path.sep), '配置bin不属于config原生目录');
    const binary = fs.readFileSync(binaryFiles[0]);
    const binaryHash = sha256(binary);
    assert.equal(binaryHash, sha256(expected.bytes), '发布配置bin损坏或不是当前版本，请重新构建');
    const duplicateBinaries = bundleFiles.filter(file => file.endsWith('.bin') && fs.statSync(file).size === binary.length
        && sha256(fs.readFileSync(file)) === binaryHash);
    assert.equal(duplicateBinaries.length, 1, '其他Bundle存在相同配置bin副本');
    const manifest = JSON.parse(Buffer.from(unzipSync(binary)['manifest.json']).toString('utf8'));
    assert.equal(manifest.version, expected.manifest.version, '发布配置manifest版本不一致');
    const settings = readJson(path.join(build, 'src/settings.json'));
    const scripts = settings.scripting?.scriptPackages;
    assert(Array.isArray(scripts) && scripts.length > 0, '发布启动配置未登记脚本包');
    const scriptFiles = scripts.map(script => {
        assert(typeof script === 'string' && !/^[a-z]+:/i.test(script), '发布脚本必须是本地输出路径');
        const file = path.resolve(build, 'src', script);
        assert(file.startsWith(build + path.sep) && allFiles.includes(file), '启动脚本不存在或越出构建目录');
        return file;
    });
    // Creator把业务模块放入预载Bundle的index.js，settings脚本包通常只有Babel共享辅助代码。
    const preloadNames = (settings.assets?.preloadBundles || []).map(entry => typeof entry === 'string' ? entry : entry.bundle);
    for (const bundle of bundles) {
        if (preloadNames.includes(bundle.config.name || path.basename(bundle.directory))) {
            const entry = path.join(bundle.directory, 'index.js');
            if (allFiles.includes(entry)) {
                scriptFiles.push(entry);
            }
        }
    }
    const scriptCode = scriptFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    assert(/System\.register\(["'][^"']*ConfigZip\.generated\.ts["']/.test(scriptCode),
        '启动脚本包未包含生成解码器的模块登记');
    const consumer = scriptCode.match(/System\.register\(["'][^"']*ConfigPackageUtils\.ts["'],\s*(\[[^\]]*\])/);
    assert(consumer && consumer[1].includes('ConfigZip.generated.ts'), '发布解码调用者未依赖生成模块');
    assert(!scriptCode.includes('Unexpected export statement in CJS module')
        && !/找不到模块[^\n]{0,100}ConfigZip/.test(scriptCode), '发布脚本包含已知解压模块错误占位');
    return {
        version: manifest.version, bundles: bundles.length, startup: startup.length, excluded: packed.length,
        packedSourceCopies: 0, binaryFiles: binaryFiles.length, packageBytes: binary.length, sha256: binaryHash,
        codecStaticRegistration: true, codecStaticDependency: true, codecRuntimeVerified: false,
    };
}

module.exports = { checkConfigPackageBuild };

// 固定构建钩子与命令行共用检查；默认不选旧产物，必须显式指定待验输出。
if (require.main === module) {
    try {
        assert.equal(process.argv.length, 3, '用法：node client/tools/config-package-build-check.cjs <Web构建目录>');
        console.log('配置包发布产物检查通过：' + JSON.stringify(checkConfigPackageBuild(process.argv[2])));
    } catch (error) {
        console.error(error.stack || error);
        process.exitCode = 1;
    }
}
