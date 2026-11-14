/** Creator构建钩子实现：由固定hooks入口每次重新加载，核验配置压缩包、准备bootstrap并核验最终产物。
 * 构建前只读核验，防止生成后尚未导入的字节被旧缓存替代；旧删除名单为空时不删除可寻址原图。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/** 实际实现身份；与包版本共同打印，区分旧入口缓存和当前执行代码。 */
const IMPLEMENTATION_ID = 'config-package-artifact-v1';
/** 实际实现版本；升级时与package.json同步，禁止旧函数仅打印新包版本冒充更新。 */
const IMPLEMENTATION_VERSION = '1.8.0';

/** 隔离构建入口读取真实常量核对日志；只读身份不表示钩子已被Creator实际调用。 */
exports.implementationIdentity = Object.freeze({ id: IMPLEMENTATION_ID, version: IMPLEMENTATION_VERSION });

/** 输出实际执行的实现身份，不将package.json版本当成代码已更新的证据。 */
function logImplementation(stage, detail) {
    console.log('[UI资源构建检查 ' + IMPLEMENTATION_ID + ' v' + IMPLEMENTATION_VERSION + '] ' + stage + '：' + detail);
}

/** 将本地启动包追加到资源元数据；返回true表示实际新增，已有包和版本原样保留。 */
function ensureBootstrapPreload(assets) {
    assert(assets && typeof assets === 'object', 'Creator未提供资源启动配置');
    const bundles = assets.preloadBundles || [];
    assert(Array.isArray(bundles), '启动预载包必须为数组');
    if (bundles.some(entry => entry.bundle === 'bootstrap')) {
        return false;
    }
    assets.preloadBundles = bundles.concat({ bundle: 'bootstrap' });
    return true;
}

/**
 * 构建收集资源前在普通Node子进程只读核验；过期即拒绝，不写入未导入资源。
 * Creator的构建线程不能创建esbuild同步接口需要的Worker，因此不在该线程执行解码器再生成检查。
 */
exports.onBeforeBuild = async function onBeforeBuild() {
    const tool = path.resolve(__dirname, '../../../tools/generate_config_package.cjs');
    const code = 'const {generateConfigPackage}=require(process.argv[1]);'
        + 'process.stdout.write(JSON.stringify(generateConfigPackage({check:true})));';
    // 依赖项目既有Node命令；固定JS与文件参数分开传递，不交给shell，也不使用Creator的Electron可执行文件。
    const output = execFileSync('node', ['-e', code, tool], {
        cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8', timeout: 60000,
        maxBuffer: 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const summary = JSON.parse(output);
    assert(summary && typeof summary.version === 'string' && Array.isArray(summary.changed),
        '配置包Node检查未返回完整结果');
    logImplementation('onBeforeBuild', JSON.stringify(summary));
    return summary;
};

/** 写入settings前追加本地启动包；重复调用保持幂等，不覆盖已有包及版本。 */
exports.onBeforeCompressSettings = async function onBeforeCompressSettings(_options, result) {
    ensureBootstrapPreload(result?.settings?.assets);
    logImplementation('onBeforeCompressSettings', '本地bootstrap预载已登记');
};

/** 核验最终Web配置并补齐本地启动包；不依赖result.settings是否为共享对象，修复后复读校验。 */
exports.onAfterBuild = async function onAfterBuild(options, result) {
    assert(['web-mobile', 'web-desktop'].includes(options.platform), '背包去重只支持 Web 构建');
    assert(!options.md5Cache && !options.debug, '背包去重目前要求关闭 MD5 缓存和调试模式');
    assert(typeof result?.dest === 'string' && result.dest.length > 0, 'Creator 未提供构建输出目录');
    const buildRoot = fs.realpathSync(path.resolve(__dirname, '../../build'));
    const build = fs.realpathSync(result.dest);
    assert(build.startsWith(buildRoot + path.sep), '只允许修改client/build内的构建目录');
    assert(fs.existsSync(path.join(build, 'index.html')), '必须是完整Web构建目录');
    const settingsFile = fs.realpathSync(path.join(build, 'src/settings.json'));
    assert(settingsFile.startsWith(build + path.sep), '启动配置不能链接到构建目录之外');
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    // 只更新内存中的待写对象；后续配置核验失败时仍不改落盘启动文件。
    const startupPreloadRepaired = ensureBootstrapPreload(settings.assets);
    // 先核验全部Bundle内的真实配置产物；失败不修写启动文件或进入原图删除阶段。
    const sourcePaths = require.resolve('../../../tools/bundle-paths.cjs');
    const packageGenerator = require.resolve('../../../tools/generate_config_package.cjs');
    const verifier = require.resolve('../../tools/config-package-build-check.cjs');
    delete require.cache[sourcePaths];
    delete require.cache[packageGenerator];
    delete require.cache[verifier];
    const { checkConfigPackageBuild } = require(verifier);
    const configPackage = checkConfigPackageBuild(result.dest);
    // 不依赖before钩子中的对象是否共享；最终落盘文件才是引擎启动读取的结果。
    if (startupPreloadRepaired) {
        fs.writeFileSync(settingsFile, JSON.stringify(settings));
    }
    const written = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    assert(written.assets.preloadBundles.some(entry => entry.bundle === 'bootstrap'),
        '最终启动配置缺少bootstrap预载');
    // Creator构建工作进程可长期保留require缓存；每轮重读清理工具，避免迁移后沿用旧路径；实现身份由上方固定常量输出。
    const tool = require.resolve('../../tools/dedupe-bag-build.cjs');
    // 源目录分组可调整；与工具一起重读离线路径索引，避免Creator保留迁移前的绝对目录。
    delete require.cache[sourcePaths];
    delete require.cache[tool];
    const { dedupeBagBuild } = require(tool);
    const summary = dedupeBagBuild(result.dest, true);
    const resultSummary = { ...summary, startupPreloadRepaired, configPackage };
    logImplementation('onAfterBuild', (startupPreloadRepaired ? 'after-build repaired; ' : '') + JSON.stringify(resultSummary));
    return resultSummary;
};
