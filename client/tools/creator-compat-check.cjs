/** Exercise the same array-spread assumption found in Creator's published JS,
 * rather than relying only on esbuild/Node semantics from the preview checks.
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
    const bundle = await esbuild.build({ absWorkingDir: root,
        entryPoints: ['client/tools/config-groups-check.ts'], bundle: true, platform: 'node',
        format: 'cjs', target: 'es2015', tsconfig: 'client/tools/tsconfig.check.json', write: false, logLevel: 'silent' });
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, publishedTransform(bundle.outputFiles[0].text));
    const run = spawnSync(process.execPath, [output], { cwd: root, encoding: 'utf8', timeout: 30000 });
    assert.equal(run.status, 0, (run.stdout || '') + (run.stderr || ''));
    console.log('creator-compat-check passed: published spread semantics retain real startup paths, dedup, retry and config isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
