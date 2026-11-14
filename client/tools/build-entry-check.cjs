/**
 * 统一构建入口专项：在合成仓库执行真实PowerShell的PrepareOnly，验证复制布局和失败边界。
 * 不启动Creator、不构建游戏、不连接服务器；真实生成器与发布产物另有专项负责。
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/** 当前工具所在仓库；夹具只能在忽略的client/temp下创建并清理。 */
const ROOT = path.resolve(__dirname, '../..');
/** 临时目录唯一父路径，任何递归清理前再次核对绝对边界。 */
const TEMP = path.join(ROOT, 'client/temp');

/** 写入合成输入，同时创建必要目录，不覆盖真实工程。 */
function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

/** 只运行准备模式，返回退出码及日志供正反例断言；绝不传真实构建参数。 */
function prepare(project, extra = []) {
    return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
        path.join(project, 'client/tools/build-remake-h5.ps1'), '-PrepareOnly', ...extra], {
        cwd: project, encoding: 'utf8', timeout: 30000, windowsHide: true,
    });
}

/** 构建一个只包含路径定位所需文件的合成仓库；配置表数量不在此维护。 */
function fixture(project) {
    for (const directory of ['client/assets', 'client/settings', 'client/extensions', 'client/node_modules', 'client/tools', 'tools', 'config']) {
        fs.mkdirSync(path.join(project, directory), { recursive: true });
    }
    for (const file of ['build-remake-h5.ps1', 'remake-h5.build.json']) {
        fs.copyFileSync(path.join(ROOT, 'client/tools', file), path.join(project, 'client/tools', file));
    }
    fs.cpSync(path.join(ROOT, 'client/extensions/mxzg-bag-build'), path.join(project, 'client/extensions/mxzg-bag-build'), { recursive: true });
    write(path.join(project, 'client/package.json'), JSON.stringify({ name: 'build-entry-fixture' }));
    write(path.join(project, 'client/package-lock.json'), '{}');
    write(path.join(project, 'client/tsconfig.json'), '{}');
    write(path.join(project, 'client/node_modules/dependency-marker.txt'), 'copied without a junction');
    write(path.join(project, 'client/assets/module/prefab.meta'), '{"uuid":"original-fixture-uuid"}');
    write(path.join(project, 'client/settings/builder.json'), '{"bundleConfig":"source-preserved"}');
    write(path.join(project, 'config/client-schema.json'), '{"source":"fixture"}');
    write(path.join(project, 'tools/bundle-paths.cjs'), 'module.exports = {};');
    write(path.join(project, 'tools/generate_config_package.cjs'), `
const fs = require('node:fs');
const path = require('node:path');
exports.generateConfigPackage = ({check}) => ({version:'fixture-version',check,source:__dirname});
if (require.main === module) {
    if (fs.existsSync(path.join(__dirname,'../config/reject-input'))) process.exit(2);
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(__dirname,'../client/assets/package-marker.txt'),'generated before copy');
    console.log(JSON.stringify(exports.generateConfigPackage({check:true})));
}

`);
}

/** 单独执行真实日志验证函数；缺阶段或旧身份不能通过，避免只检查CLI退出码。 */
function checkHookEvidence(project) {
    const entrySource = fs.readFileSync(path.join(ROOT, 'client/tools/build-remake-h5.ps1'), 'utf8');
    const body = entrySource.match(/^function Get-BuildHookEvidence[\s\S]*?^\}/m);
    assert(body, '构建入口必须验证实际钩子日志');
    const identity = require('../extensions/mxzg-bag-build/build-hooks.cjs').implementationIdentity;
    const harness = path.join(project, 'hook-evidence.ps1');
    const logFile = path.join(project, 'hook.stdout.log');
    write(harness, '\uFEFF' + body[0] + `\n$ErrorActionPreference = 'Stop'\nGet-BuildHookEvidence $args[0] ([pscustomobject]@{ id='${identity.id}'; version='${identity.version}' }) | ConvertTo-Json\n`);
    const invoke = () => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', harness, logFile], {
        encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    const stages = ['onBeforeBuild', 'onBeforeCompressSettings', 'onAfterBuild'];
    const lines = stages.map(stage => `[UI check ${identity.id} v${identity.version}] ${stage}: fixture`);
    write(logFile, lines.join('\n'));
    const valid = invoke();
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    assert.deepEqual(JSON.parse(valid.stdout).stages, stages);
    write(logFile, lines.slice(0, 2).join('\n'));
    assert.notEqual(invoke().status, 0, '缺after阶段不能发布');
    write(logFile, lines.map(line => line.replace('v' + identity.version + ']', 'vprevious]')).join('\n'));
    assert.notEqual(invoke().status, 0, '旧身份日志不能替代本次真实钩子');
}

/** 用真实复制、扩展定位及目录保护证明统一入口可用，最后清理本工具唯一夹具目录。 */
function main() {
    assert.equal(process.platform, 'win32', '统一入口专项需要Windows PowerShell与robocopy，不以跳过冒充通过');
    fs.mkdirSync(TEMP, { recursive: true });
    const project = fs.mkdtempSync(path.join(TEMP, 'build-entry-check-'));
    const isolated = path.join(project, 'client/temp/remake-h5-project');
    const link = path.join(isolated, 'client/assets');
    try {
        fixture(project);
        const first = prepare(project, ['-ResourceServer', 'http://127.0.0.1:37460/resources']);
        assert.equal(first.status, 0, first.stdout + first.stderr);
        const preparedPath = path.join(project, 'client/temp/remake-h5-build/prepared.json');
        const prepared = JSON.parse(fs.readFileSync(preparedPath, 'utf8').replace(/^\uFEFF/, ''));
        assert.equal(path.normalize(prepared.project), path.join(isolated, 'client'));
        assert.equal(prepared.resourceServer, 'http://127.0.0.1:37460/resources/');
        const options = JSON.parse(fs.readFileSync(prepared.buildConfig, 'utf8').replace(/^\uFEFF/, ''));
        assert.equal(options.debug, false);
        assert.equal(options.md5Cache, false);
        assert.equal(options.packAutoAtlas, true);
        assert.equal(options.platform, 'web-mobile');
        assert.equal(options.mainBundleIsRemote, false);
        assert.deepEqual(options.bundleConfigs, []);
        assert.equal(options.packages['web-mobile'].orientation, 'portrait');
        assert.equal(options.server, prepared.resourceServer);
        assert.equal(fs.readFileSync(path.join(isolated, 'client/assets/package-marker.txt'), 'utf8'), 'generated before copy');
        assert.equal(fs.readFileSync(path.join(isolated, 'client/node_modules/dependency-marker.txt'), 'utf8'), 'copied without a junction');
        assert.equal(fs.readFileSync(path.join(isolated, 'client/assets/module/prefab.meta'), 'utf8'), '{"uuid":"original-fixture-uuid"}');
        assert(fs.existsSync(path.join(isolated, 'client/extensions/mxzg-bag-build/hooks.js')));
        assert(fs.existsSync(path.join(isolated, 'tools/generate_config_package.cjs')));
        assert(fs.existsSync(path.join(isolated, 'config/client-schema.json')));
        assert(!fs.existsSync(path.join(project, 'client/build/remake-h5')), '准备模式不能替换已有发布目录');
        const hook = spawnSync(process.execPath, ['-e', `require(process.argv[1]).onBeforeBuild().then(r=>{if(!r.check||r.source!==process.argv[2])process.exit(3)})`,
            path.join(isolated, 'client/extensions/mxzg-bag-build/hooks.js'), path.join(isolated, 'tools')], { encoding: 'utf8' });
        assert.equal(hook.status, 0, hook.stdout + hook.stderr);
        checkHookEvidence(project);
        write(path.join(isolated, 'client/assets/obsolete.txt'), 'must disappear on mirror');
        const second = prepare(project);
        assert.equal(second.status, 0, second.stdout + second.stderr);
        assert(!fs.existsSync(path.join(isolated, 'client/assets/obsolete.txt')));
        const beforeFailure = fs.readFileSync(preparedPath, 'utf8');
        write(path.join(project, 'config/reject-input'), 'fail source validation');
        const failedSource = prepare(project);
        assert.notEqual(failedSource.status, 0);
        assert.equal(fs.readFileSync(preparedPath, 'utf8'), beforeFailure, '源校验失败不能覆盖准备结果');
        fs.unlinkSync(path.join(project, 'config/reject-input'));
        const invalidAddress = prepare(project, ['-ResourceServer', 'file:///C:/not-http']);
        assert.notEqual(invalidAddress.status, 0);
        assert.equal(fs.readFileSync(preparedPath, 'utf8'), beforeFailure);
        // Windows junction不需要管理员权限；目录目标含联接时必须在robocopy /MIR之前拒绝。
        fs.rmSync(link, { recursive: true });
        const escaped = path.join(project, 'outside-assets');
        write(path.join(escaped, 'sentinel.txt'), 'must remain');
        fs.symlinkSync(escaped, link, 'junction');
        const rejectedLink = prepare(project);
        assert.notEqual(rejectedLink.status, 0);
        assert.equal(fs.readFileSync(path.join(escaped, 'sentinel.txt'), 'utf8'), 'must remain');
        fs.unlinkSync(link);
        console.log('统一构建入口专项通过：真实PrepareOnly、仓库布局、同版选项、远程根覆盖、原meta/依赖复制、钩子定位及日志缺失/旧身份拒绝、镜像过期清理、失败拒绝与联接保护。');
    } finally {
        assert(project.startsWith(TEMP + path.sep + 'build-entry-check-'));
        assert.equal(fs.realpathSync(project), project);
        if (fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link);
        fs.rmSync(project, { recursive: true, force: true });
    }
}

main();
