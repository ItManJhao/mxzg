/** Creator 构建后处理：复用背包及common清理工具，不生成或检查加载阶段清单。
 * 校验失败交给 Creator 标记构建失败，不能将未完成去重的产物当作处理成功。
 */
const assert = require('node:assert/strict');
// 直接读取扩展版本，构建日志与扩展管理器使用同一版本来源。
const { version } = require('./package.json');
const { dedupeBagBuild } = require('../../tools/dedupe-bag-build.cjs');

// 去重失败必须阻止本次构建报告成功，原图在校验失败时保持原样。
exports.throwError = true;

/** Creator 写完 Web 产物后执行；使用真实输出路径，不依赖任务名称或固定目录。 */
exports.onAfterBuild = async function onAfterBuild(options, result) {
    assert(['web-mobile', 'web-desktop'].includes(options.platform), '背包去重只支持 Web 构建');
    assert(!options.md5Cache && !options.debug, '背包去重目前要求关闭 MD5 缓存和调试模式');
    assert(typeof result?.dest === 'string' && result.dest.length > 0, 'Creator 未提供构建输出目录');
    const summary = dedupeBagBuild(result.dest, true);
    console.log('[UI图集构建去重 v' + version + '] 完成：' + JSON.stringify(summary));
    return summary;
};
