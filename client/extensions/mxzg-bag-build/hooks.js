/** Creator固定构建钩子入口：注册配置包核验、启动配置及最终产物导出，每次执行重新读取实现。
 * Creator可长期缓存本文件；具体规则放在build-hooks.cjs，避免包版本更新后仍调用旧函数。
 * 不读取角色数据，不参与运行时加载；钩子异常交给Creator标记本次构建失败。
 */

/** 构建失败必须向Creator抛出，不能将未准备的启动配置记为成功。 */
exports.throwError = true;

/** 丢弃实现模块缓存并读取当前代码；保留固定入口本身，供Creator已登记的回调复用。 */
function currentImplementation() {
    const file = require.resolve('./build-hooks.cjs');
    delete require.cache[file];
    return require(file);
}

/** 资源收集前分发只读配置包核验；源表或过滤过期时直接中止构建。 */
exports.onBeforeBuild = async function onBeforeBuild(options, result) {
    return currentImplementation().onBeforeBuild(options, result);
};

/** settings写入前分发到当前实现，确保本地bootstrap元数据先于启动场景就绪。 */
exports.onBeforeCompressSettings = async function onBeforeCompressSettings(options, result) {
    return currentImplementation().onBeforeCompressSettings(options, result);
};

/** 写完产物后分发到当前实现，核对启动配置及保留资源的边界。 */
exports.onAfterBuild = async function onAfterBuild(options, result) {
    return currentImplementation().onAfterBuild(options, result);
};
