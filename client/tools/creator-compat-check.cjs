/** 复现 Creator 发布编译的数组展开及父类访问器行为，检查配置、三段加载和列表。
 * 使用相同 Babel 转换运行检查，避免预览通过而发布后 Set 被当作数组拼接、super 属性丢失接收者。
 */
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const esbuild = require(process.env.MXZG_ESBUILD_MODULE || 'esbuild');
const creator = process.env.MXZG_CREATOR_PATH || 'C:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe';
const dependencies = resolve(dirname(creator), 'resources/resources/3d/engine/node_modules');
const babel = require(resolve(dependencies, '@babel/core'));
const spread = require(resolve(dependencies, '@babel/plugin-transform-spread'));
const classes = require(resolve(dependencies, '@babel/plugin-transform-classes'));
const root = resolve(__dirname, '../..');
const output = resolve(root, 'client/temp/project-checks/creator-config-groups.cjs');
/** 按已观察到的发布选项转换；不改生产源码或构建产物。 */
function publishedTransform(code) {
    return babel.transformSync(code, { configFile: false, babelrc: false,
        assumptions: { iterableIsArray: true }, plugins: [[classes, { loose: true }], [spread, { loose: true }]] }).code;
}
(async () => {
    // Negative control proves this check reproduces the failure in the real build.
    const sample = { result: null };
    vm.runInNewContext(publishedTransform("result = [...new Set(['a', 'a'])]"), sample);
    assert.equal(sample.result.length, 1);
    assert.equal(typeof sample.result[0], 'object', 'publish transform should reproduce the invalid Set argument');
    // 反例确认测试能复现发布版父类访问器错误，而非只验证修正后的代码。
    const accessor = { result: null };
    vm.runInNewContext(publishedTransform(
        "class Parent { get gap() { return this.value; } } class Child extends Parent { get gap() { return super.gap; } } const child = new Child(); child.value = 22; result = child.gap;"
    ), accessor);
    assert.equal(accessor.result, undefined, '发布转换应复现父类访问器丢失接收者');
    for (const suite of ['config-groups', 'config-package-loading', 'staged-loading', 'resource-catalog', 'super-scroll']) {
        const bundle = await esbuild.build({ absWorkingDir: root,
            entryPoints: ['client/tools/' + suite + '-check.ts'], bundle: true, platform: 'node',
            format: 'cjs', target: 'es2015', tsconfig: 'client/tools/tsconfig.check.json', write: false, logLevel: 'silent' });
        mkdirSync(dirname(output), { recursive: true });
        writeFileSync(output, publishedTransform(bundle.outputFiles[0].text));
        const run = spawnSync(process.execPath, [output], { cwd: root, encoding: 'utf8', timeout: 30000 });
        assert.equal(run.status, 0, suite + ': ' + (run.stdout || '') + (run.stderr || ''));
    }
    console.log('creator-compat-check passed: published startup/config paths and SuperContent layout, reuse, scrolling passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
