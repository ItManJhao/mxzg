/** Creator构建钩子实现：由固定hooks入口每次重新加载，准备bootstrap并核验最终产物。
 * 保留已有预载包和版本，不预载远程整包；旧删除名单为空时不删除可寻址原图。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** 实际实现身份；与包版本共同打印，区分旧入口缓存和当前执行代码。 */
const IMPLEMENTATION_ID = 'bootstrap-preload-v1';
/** 实际实现版本；升级时与package.json同步，禁止旧函数仅打印新包版本冒充更新。 */
const IMPLEMENTATION_VERSION = '1.6.2';

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
    // 不依赖before钩子中的对象是否共享；最终落盘文件才是引擎启动读取的结果。
    const startupPreloadRepaired = ensureBootstrapPreload(settings.assets);
    if (startupPreloadRepaired) {
        fs.writeFileSync(settingsFile, JSON.stringify(settings));
    }
    const written = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    assert(written.assets.preloadBundles.some(entry => entry.bundle === 'bootstrap'),
        '最终启动配置缺少bootstrap预载');
    // Creator构建工作进程可长期保留require缓存；每轮重读清理工具，避免迁移后沿用旧路径；实现身份由上方固定常量输出。
    const tool = require.resolve('../../tools/dedupe-bag-build.cjs');
    delete require.cache[tool];
    const { dedupeBagBuild } = require(tool);
    const summary = dedupeBagBuild(result.dest, true);
    const resultSummary = { ...summary, startupPreloadRepaired };
    logImplementation('onAfterBuild', (startupPreloadRepaired ? 'after-build repaired; ' : '') + JSON.stringify(resultSummary));
    return resultSummary;
};
