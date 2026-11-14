/**
 * 客户端配置包生成器：保留共享 JSON 源表，生成确定性的 ZIP 字节供 Cocos BufferAsset 加载。
 * 正常 Excel 导出调用写入模式，Creator 构建前调用检查模式；不读取构建缓存或修改发布产物。
 * 启动表来自 LoadingPlan.login，其他源表与 Bundle 排除规则由实际文件及原 meta UUID 自动推导。
 * 同时从固定 fflate 浏览器实现生成项目内 ESM 解码器，避免 Creator 误判 npm 的 JavaScript 模块格式。
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { zipSync, unzipSync } = require('../client/node_modules/fflate');
const esbuild = require('../client/node_modules/esbuild');
const { createBundlePaths } = require('./bundle-paths.cjs');

/** 默认项目根；专项可传隔离项目，避免篡改现有配置验证反例。 */
const PROJECT_ROOT = path.resolve(__dirname, '..');
/** ZIP 使用固定本地时间，避免生成时间或机器时区导致相同源表产生不同包。 */
const ZIP_TIME = new Date(2000, 0, 1, 0, 0, 0);
/** 配置包格式；变更序列化或清单语义时须明确升级。 */
const FORMAT = 1;

/** 读取 JSON，容许源文件 UTF-8 BOM；解析失败直接拒绝生成。 */
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

/** 按客户端 JSON.parse/JSON.stringify 语义规范化内容，返回 UTF-8 字节。 */
function normalizedBytes(value) {
    return Buffer.from(JSON.stringify(value), 'utf8');
}

/** 计算 ZIP 与运行时共同使用的 IEEE CRC32，输出八位小写十六进制。 */
function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) {
        value ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
        }
    }
    return ((value ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

/** 清理 TypeScript 注释，保留字符串中的斜线和转义，防止示例注释被误认为启动配置。 */
function removeComments(source) {
    return source.replace(/(["'`])(?:\\[\s\S]|(?!\1)[^\\])*?\1|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
        match => match.startsWith('//') || match.startsWith('/*') ? '' : match);
}

/**
 * 从唯一三阶段入口提取 login 数组中的静态 GConfig 目标，再由 schema 解析真实路径。
 * 不执行页面模块；动态启动配置或未知表名拒绝生成，避免静默漏表。
 */
function startupPaths(projectRoot, schema) {
    const file = path.join(projectRoot, 'client/assets/scripts/app/remake/LoadingPlan.ts');
    const source = removeComments(fs.readFileSync(file, 'utf8'));
    const matches = [...source.matchAll(/\blogin\s*:\s*\[([\s\S]*?)\]\s*[,}]/g)];
    assert.equal(matches.length, 1, 'LoadingPlan.login 必须是唯一静态数组');
    const login = matches[0][1];
    const configs = [...login.matchAll(/\{\s*config\s*:\s*GConfig\.([A-Za-z_][A-Za-z0-9_]*)\s*\}/g)];
    assert.equal(configs.length, [...login.matchAll(/\bconfig\s*:/g)].length,
        'LoadingPlan.login 配置必须使用 { config: GConfig.X }');
    const result = configs.map(match => {
        const spec = schema.tables[match[1]];
        assert(spec && /^config\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(spec.path),
            '启动配置未在 schema 登记：' + match[1]);
        return spec.path;
    });
    assert(result.length > 0, 'LoadingPlan.login 未声明启动表');
    assert.equal(new Set(result).size, result.length, 'LoadingPlan.login 启动表重复');
    return result.sort();
}

/** 递归列出真实源 JSON；拒绝链接与非法包内路径，不扫描生成 ZIP 内的文件。 */
function sourceFiles(directory, prefix = '') {
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const relative = prefix + entry.name;
        assert(!entry.isSymbolicLink(), '配置源目录不能包含链接：' + relative);
        if (entry.isDirectory()) {
            files.push(...sourceFiles(path.join(directory, entry.name), relative + '/'));
        } else if (entry.name.endsWith('.json')) {
            assert(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.json$/.test(relative),
                '非法配置表路径：' + relative);
            assert(!['manifest.json', 'game-config.json'].includes(relative),
                '配置表占用了压缩包保留名称：' + relative);
            files.push(relative);
        }
    }
    return files.sort();
}

/** 返回源表 UUID；已有 meta 必须合法，生成器绝不为源表重建身份。 */
function sourceUuid(directory, file) {
    const meta = readJson(path.join(directory, file + '.meta'));
    assert.equal(meta.importer, 'json', '配置源表 importer 必须为 json：' + file);
    assert(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(meta.uuid),
        '配置源表缺少合法 UUID：' + file);
    return meta.uuid;
}

/** 只在 UUID 集合完全一致时识别本工具的单条 Asset 排除规则，保留其他用户过滤。 */
function sameExclusion(rule, ids) {
    return rule?.range === 'exclude' && rule?.type === 'asset'
        && Object.keys(rule).every(key => ['range', 'type', 'assets'].includes(key))
        && Array.isArray(rule.assets) && rule.assets.length === ids.length
        && new Set(rule.assets).size === ids.length && rule.assets.every(id => ids.includes(id));
}

/** 根据旧清单恢复上一轮托管 UUID 集合；包损坏或已删源表时不猜测用户过滤归属。 */
function previousExclusions(output, directory) {
    if (!fs.existsSync(output)) {
        return null;
    }
    try {
        const archive = unzipSync(fs.readFileSync(output));
        const manifest = JSON.parse(Buffer.from(archive['manifest.json']).toString('utf8'));
        assert.equal(manifest.format, FORMAT);
        assert(Array.isArray(manifest.files));
        return manifest.files.map(entry => sourceUuid(directory, entry.file));
    } catch {
        return null;
    }
}

/** 生成包字节和期望 Bundle meta；纯计算，不修改源 JSON 或任何现有 UUID。 */
function buildConfigPackage(projectRoot = PROJECT_ROOT) {
    const bundle = createBundlePaths(projectRoot).bundleInfo('config');
    const schema = readJson(path.join(projectRoot, 'config/client-schema.json'));
    const startup = startupPaths(projectRoot, schema);
    const startupSet = new Set(startup);
    const files = sourceFiles(bundle.directory);
    const entries = files.map(file => {
        const bytes = normalizedBytes(readJson(path.join(bundle.directory, file)));
        return { path: 'config/' + file.slice(0, -5), file, bytes, uuid: sourceUuid(bundle.directory, file) };
    });
    assert(entries.length > startup.length, '配置包必须包含非启动源表');
    const paths = new Set(entries.map(entry => entry.path));
    assert(startup.every(name => paths.has(name)), '启动配置缺少源 JSON');
    assert(new Set(entries.map(entry => entry.uuid)).size === entries.length, '配置源表 UUID 重复');
    for (const spec of Object.values(schema.tables)) {
        assert(paths.has(spec.path), 'schema 配置缺少源 JSON：' + spec.path);
    }
    // 版本覆盖全部共享表、schema 与启动归属，启动表虽不进 ZIP，变化仍令整包版本失效。
    const hash = crypto.createHash('sha256');
    hash.update(normalizedBytes({ format: FORMAT, schema, startup }));
    for (const entry of entries) {
        hash.update(normalizedBytes({ path: entry.path, bytes: entry.bytes.length }));
        hash.update(entry.bytes);
    }
    const manifest = {
        format: FORMAT,
        version: 'config-v1:' + hash.digest('hex'),
        startup: entries.filter(entry => startupSet.has(entry.path)).map(entry => ({
            path: entry.path, crc32: crc32(entry.bytes), bytes: entry.bytes.length,
        })),
        files: entries.filter(entry => !startupSet.has(entry.path)).map(entry => ({
            path: entry.path, file: entry.file, crc32: crc32(entry.bytes), bytes: entry.bytes.length,
        })),
    };
    const zipFiles = { 'manifest.json': [normalizedBytes(manifest), { mtime: ZIP_TIME }] };
    for (const entry of entries) {
        if (!startupSet.has(entry.path)) {
            zipFiles[entry.file] = [entry.bytes, { mtime: ZIP_TIME }];
        }
    }
    const output = path.join(bundle.directory, 'game-config.bin');
    const excluded = entries.filter(entry => !startupSet.has(entry.path)).map(entry => entry.uuid);
    const oldExcluded = previousExclusions(output, bundle.directory);
    const meta = structuredClone(bundle.meta);
    const filters = meta.userData.bundleFilterConfig || [];
    assert(Array.isArray(filters), 'config Bundle 过滤规则必须为数组');
    const owned = filters.filter(rule => sameExclusion(rule, excluded)
        || (oldExcluded && sameExclusion(rule, oldExcluded)));
    assert(owned.length <= 1, 'config Bundle 存在多条相同的托管排除规则，请先核对重复来源');
    const rule = { range: 'exclude', type: 'asset', assets: excluded };
    meta.userData.bundleFilterConfig = owned.length
        ? filters.map(value => value === owned[0] ? rule : value)
        : filters.concat(rule);
    return { output, metaFile: bundle.metaFile, meta, entries, manifest,
        bytes: Buffer.from(zipSync(zipFiles, { level: 9 })), excluded };
}

/** 只在内容实际变化时写文件，避免 Creator 对相同配置无谓重导入。 */
function writeChanged(file, bytes) {
    const expected = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8');
    if (fs.existsSync(file) && fs.readFileSync(file).equals(expected)) {
        return false;
    }
    fs.writeFileSync(file, expected);
    return true;
}

/** 核验既有 BufferAsset meta；首次写入只新建一次 UUID，后续始终保留。 */
function bufferMeta(output, check) {
    const file = output + '.meta';
    if (fs.existsSync(file)) {
        const meta = readJson(file);
        assert.equal(meta.importer, 'buffer', 'game-config.bin 必须由 Cocos buffer importer 导入');
        assert(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(meta.uuid), '配置包 meta UUID 非法');
        return false;
    }
    assert(!check, '配置包缺少 BufferAsset meta，请运行 node tools/generate_config_package.cjs --write');
    return writeChanged(file, JSON.stringify({
        ver: '1.0.0', importer: 'buffer', imported: true, uuid: crypto.randomUUID(),
        files: ['.json', '.bin'], subMetas: {}, userData: {},
    }, null, 2) + '\n');
}

/**
 * 只捆绑 fflate 浏览器版的配置包解码入口，生成 Creator 明确认作 ESM 的 TypeScript 资产。
 * 原包 browser.js 缺少 type:module，Creator 会误判为 CommonJS；不修改第三方文件或引入运行时全局变量。
 * 公开类型直接引用原包声明且仅存在于类型位置；生成 JS 不再依赖 npm 模块解析。
 */
function buildConfigCodec(projectRoot = PROJECT_ROOT) {
    const entry = 'import { strFromU8, strToU8, unzipSync } from "fflate/browser";\n'
        + 'const ConfigZipImplementation = { strFromU8, strToU8, unzipSync };\n'
        + 'export { ConfigZipImplementation };\n';
    const built = esbuild.buildSync({
        absWorkingDir: path.join(PROJECT_ROOT, 'client'),
        stdin: { contents: entry, sourcefile: 'config-zip-entry.ts',
            resolveDir: path.join(PROJECT_ROOT, 'client'), loader: 'ts' },
        bundle: true, write: false, format: 'esm', platform: 'neutral', target: 'es2017',
        conditions: ['browser', 'import'], treeShaking: true, legalComments: 'inline',
    }).outputFiles[0].text;
    const tail = /\nexport \{\n\s*ConfigZipImplementation\n\};\s*$/;
    assert(tail.test(built), '配置解码器生成入口不符合预期，请核对固定 esbuild 版本');
    const license = fs.readFileSync(path.join(PROJECT_ROOT, 'client/node_modules/fflate/LICENSE'), 'utf8').trim();
    const version = readJson(path.join(PROJECT_ROOT, 'client/node_modules/fflate/package.json')).version;
    assert.equal(version, '0.8.2', '配置 ZIP 解码器须使用已核验的 fflate 0.8.2');
    const text = '// @ts-nocheck\n'
        + '/** 由 tools/generate_config_package.cjs 生成，禁止手改。\n'
        + ' * fflate ' + version + ' 浏览器版的配置 ZIP 解码入口；仅导出同步解压和 UTF-8 转换，不维护配置缓存。\n'
        + ' * 原包声明仅供类型检查，Creator 运行时只加载本文件，避免 npm .js 的模块格式误判。\n'
        + ' */\n'
        + '/*!\n' + license + '\n*/\n'
        + built.replace(tail, '\n')
        + '\nconst configZipDecodeUtf8: typeof import("fflate").strFromU8 = ConfigZipImplementation.strFromU8;\n'
        + 'const configZipEncodeUtf8: typeof import("fflate").strToU8 = ConfigZipImplementation.strToU8;\n'
        + 'const configZipUnzip: typeof import("fflate").unzipSync = ConfigZipImplementation.unzipSync;\n'
        + 'export { configZipDecodeUtf8 as strFromU8, configZipEncodeUtf8 as strToU8, configZipUnzip as unzipSync };\n';
    return { file: path.join(projectRoot, 'client/assets/scripts/config/ConfigZip.generated.ts'), text };
}

/** 核验生成脚本身份；首次创建沿用本项目 TypeScript meta 版本，已有 UUID 不重造。 */
function codecMeta(file, check) {
    const metaFile = file + '.meta';
    if (fs.existsSync(metaFile)) {
        const meta = readJson(metaFile);
        assert.equal(meta.importer, 'typescript', '配置解码器必须使用 TypeScript importer');
        assert(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(meta.uuid), '配置解码器 meta UUID 非法');
        return false;
    }
    assert(!check, '配置解码器缺少 meta，请运行 node tools/generate_config_package.cjs --write');
    return writeChanged(metaFile, JSON.stringify({
        ver: '4.0.24', importer: 'typescript', imported: true, uuid: crypto.randomUUID(),
        files: [], subMetas: {}, userData: {},
    }, null, 2) + '\n');
}

/** 写入或只读核验整包、官方 Bundle 过滤与生成解码器；源表/schema/启动归属或编解码依赖漂移均会被发现。 */
function generateConfigPackage({ projectRoot = PROJECT_ROOT, check = false } = {}) {
    const built = buildConfigPackage(projectRoot);
    const codec = buildConfigCodec(projectRoot);
    const expectedMeta = JSON.stringify(built.meta, null, 2) + '\n';
    const changed = [];
    if (fs.existsSync(built.output + '.meta')) {
        // 先确认现有身份可用，避免写完新包才发现它会被 Creator 按错误 importer 读取。
        bufferMeta(built.output, true);
    }
    if (fs.existsSync(codec.file + '.meta')) {
        codecMeta(codec.file, true);
    }
    if (check) {
        assert(fs.existsSync(built.output) && fs.readFileSync(built.output).equals(built.bytes),
            '配置包过期或缺失，请运行 node tools/generate_config_package.cjs --write');
        assert.deepEqual(readJson(built.metaFile), built.meta,
            'config Bundle 排除规则过期，请运行 node tools/generate_config_package.cjs --write');
        assert(fs.existsSync(codec.file)
            && fs.readFileSync(codec.file, 'utf8').replace(/\r\n/g, '\n') === codec.text,
        '配置解码器过期或缺失，请运行 node tools/generate_config_package.cjs --write');
    } else {
        if (writeChanged(built.output, built.bytes)) {
            changed.push(built.output);
        }
        if (writeChanged(built.metaFile, expectedMeta)) {
            changed.push(built.metaFile);
        }
        fs.mkdirSync(path.dirname(codec.file), { recursive: true });
        if (writeChanged(codec.file, codec.text)) {
            changed.push(codec.file);
        }
    }
    if (bufferMeta(built.output, check)) {
        changed.push(built.output + '.meta');
    }
    if (codecMeta(codec.file, check)) {
        changed.push(codec.file + '.meta');
    }
    return { format: FORMAT, version: built.manifest.version,
        sources: built.entries.length, startup: built.manifest.startup.length,
        packed: built.manifest.files.length, sourceBytes: built.entries.reduce((sum, entry) => sum + entry.bytes.length, 0),
        packageBytes: built.bytes.length, codecBytes: Buffer.byteLength(codec.text, 'utf8'),
        excluded: built.excluded.length, changed };
}

/** 命令行默认只读，只有显式 --write 才更新包、目录过滤及解码器，未知参数拒绝执行。 */
function main() {
    const args = process.argv.slice(2);
    assert(args.length === 0 || (args.length === 1 && ['--write', '--check'].includes(args[0])),
        '用法：node tools/generate_config_package.cjs [--check|--write]');
    const check = !args.includes('--write');
    const result = generateConfigPackage({ check });
    console.log('客户端配置包' + (check ? '检查通过' : '已生成') + '：' + JSON.stringify(result));
}

module.exports = { buildConfigPackage, buildConfigCodec, generateConfigPackage, crc32, normalizedBytes, startupPaths };

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.stack || error);
        process.exitCode = 1;
    }
}
