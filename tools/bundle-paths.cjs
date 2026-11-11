/**
 * 离线工具的Bundle源目录定位：只按目录meta中的isBundle与bundleName发现真实包根。
 * 调用者使用逻辑“包名/包内文件”或历史物理地址；不维护包名清单，不参与客户端加载。
 * 每个检查进程建立一次只读目录索引；迁移后重新启动检查，缺包、重名、越界均明确失败。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PROJECT_ROOT = path.resolve(__dirname, '..');

/** 读取Creator元数据，兼容UTF-8 BOM；非法JSON直接向调用者报告。 */
function readMeta(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

/** 拒绝目录穿越；相等只用于检查边界根本身，不允许从参数逃出资源树。 */
function inside(file, directory) {
    const relative = path.relative(directory, file);
    return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

/** 规范包内路径，不接受绝对路径、空段或目录穿越。 */
function partsOf(value) {
    assert.equal(typeof value, 'string', '资源路径必须是字符串');
    const parts = value.replaceAll('\\', '/').split('/');
    assert(parts.length && parts.every(part => part && part !== '.' && part !== '..' && !part.includes(':')), '非法资源路径：' + value);
    return parts;
}

/** 为独立工作区建立只读索引；测试可传临时项目根，默认使用本仓库。 */
function createBundlePaths(projectRoot = PROJECT_ROOT) {
    const workspace = path.resolve(projectRoot);
    const assets = path.join(workspace, 'client/assets');
    const sourceRoot = path.join(assets, 'bundles');
    assert(fs.existsSync(sourceRoot) && fs.statSync(sourceRoot).isDirectory(), 'Bundle源目录不存在：' + sourceRoot);
    assert.equal(fs.realpathSync(sourceRoot), sourceRoot, 'Bundle源目录不能通过链接跳转');
    const bundles = new Map();

    /** 只读取目录meta；普通分组目录不是Bundle，所有子目录继续发现，空扫描不能假通过。 */
    function discover(directory) {
        const metaFile = directory + '.meta';
        if (fs.existsSync(metaFile)) {
            assert(!fs.lstatSync(metaFile).isSymbolicLink(), 'Bundle目录meta不允许链接：' + metaFile);
            assert(inside(fs.realpathSync(metaFile), assets), 'Bundle目录meta越出assets：' + metaFile);
            const meta = readMeta(metaFile);
            if (meta.importer === 'directory' && meta.userData?.isBundle === true) {
                const name = meta.userData.bundleName;
                assert(typeof name === 'string' && /^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(name), 'Bundle名称缺失或非法：' + metaFile);
                assert(!bundles.has(name), 'Bundle名称重复：' + name + '（' + metaFile + '）');
                bundles.set(name, Object.freeze({ name, directory, metaFile, meta,
                    assetPath: path.relative(assets, directory).replaceAll('\\', '/'),
                    projectPath: path.relative(workspace, directory).replaceAll('\\', '/') }));
            }
        }
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            assert(!entry.isSymbolicLink(), 'Bundle源目录不允许链接：' + path.join(directory, entry.name));
            if (entry.isDirectory()) discover(path.join(directory, entry.name));
        }
    }
    discover(sourceRoot);
    assert(bundles.size > 0, '没有发现任何Bundle，拒绝空扫描通过：' + sourceRoot);

    /** optional只允许缺包/缺文件返回null，非法路径和重名始终报错。 */
    function missing(message, options) {
        if (options?.optional === true) return null;
        throw new Error(message);
    }

    /** 读取唯一包登记；调用者不能靠普通目录名猜包归属。 */
    function info(name, options) {
        assert(typeof name === 'string' && /^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(name), '非法Bundle名称：' + name);
        return bundles.get(name) || missing('Bundle不存在：' + name, options);
    }

    /** 存在性与真实路径一起核对，避免文件或中间目录链接逃出assets。 */
    function existing(file, options) {
        assert(inside(file, assets), '资源路径越出assets：' + file);
        if (!fs.existsSync(file)) return missing('资源源文件不存在：' + file, options);
        assert(inside(fs.realpathSync(file), assets), '资源链接越出assets：' + file);
        return file;
    }

    /** 逻辑地址“包名/包内文件（含扩展名）”转换为当前绝对文件地址。 */
    function resolveBundleFile(address, options) {
        const parts = partsOf(address);
        assert(parts.length >= 2, '逻辑资源地址必须包含包名和文件：' + address);
        const bundle = info(parts[0], options);
        if (!bundle) return null;
        const file = path.join(bundle.directory, ...parts.slice(1));
        assert(inside(file, bundle.directory), '资源越出所属Bundle：' + address);
        const result = existing(file, options);
        if (result) assert(fs.statSync(result).isFile(), '逻辑资源地址必须指向文件：' + address);
        return result;
    }

    /** 将当前或历史assets物理路径映射到现包根；历史已删模块可显式optional返回null。 */
    function resolveAssetPath(recorded, options) {
        assert.equal(typeof recorded, 'string', '历史资源路径必须是字符串');
        let value = recorded.replaceAll('\\', '/');
        let absolute;
        if (path.isAbsolute(recorded)) {
            absolute = path.resolve(recorded);
        } else if (value.startsWith('db://assets/')) {
            value = value.slice('db://assets/'.length);
            absolute = path.join(assets, ...partsOf(value));
        } else if (value.startsWith('client/assets/')) {
            absolute = path.join(workspace, ...partsOf(value));
        } else if (value.startsWith('assets/')) {
            absolute = path.join(workspace, 'client', ...partsOf(value));
        } else {
            absolute = path.join(assets, ...partsOf(value));
        }
        assert(inside(absolute, assets), '历史资源路径越出assets：' + recorded);
        if (fs.existsSync(absolute)) return existing(absolute, options);
        if (!inside(absolute, sourceRoot)) return missing('历史资源不存在：' + recorded, options);
        const relative = path.relative(sourceRoot, absolute).replaceAll('\\', '/');
        const parts = partsOf(relative);
        // 只兼容旧的bundles/<包名>层级；新层级由真实meta发现，不能猜任意中间目录。
        const first = parts[0];
        const isRootMeta = parts.length === 1 && first.endsWith('.meta');
        const name = isRootMeta ? first.slice(0, -'.meta'.length) : first;
        const bundle = info(name, options);
        if (!bundle) return null;
        if (isRootMeta) return existing(bundle.metaFile, options);
        return existing(path.join(bundle.directory, ...parts.slice(1)), options);
    }

    return Object.freeze({
        bundleEntries: () => [...bundles.values()].sort((a, b) => a.name.localeCompare(b.name, 'en')),
        bundleInfo: name => info(name),
        bundleRoot: name => info(name).directory,
        resolveBundleFile,
        resolveAssetPath,
    });
}

/** 默认索引只在第一次实际定位时建立，不让import触发任何资源下载或源码改动。 */
let defaultPaths = null;
function defaults() {
    if (!defaultPaths) defaultPaths = createBundlePaths();
    return defaultPaths;
}

module.exports = {
    createBundlePaths,
    bundleEntries: () => defaults().bundleEntries(),
    bundleInfo: name => defaults().bundleInfo(name),
    bundleRoot: name => defaults().bundleRoot(name),
    resolveBundleFile: (address, options) => defaults().resolveBundleFile(address, options),
    resolveAssetPath: (recorded, options) => defaults().resolveAssetPath(recorded, options),
};
