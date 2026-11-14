/** 发布包隔离入口回归：分别编译 PREVIEW 真/假分支，模拟身份探针，不连接实际服务器。 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
const path = require('node:path');

/** 合成构建证据使用任意合法表数量，验证入口不硬编码当前的47表清单。 */
function frontendIdentity() {
    const version = 'config-v1:' + 'c'.repeat(64);
    return {
        application: 'mxzg-remake-preview',
        build: {
            application: 'mxzg-remake-h5', entryScene: 'db://assets/scenes/Remake.scene',
            configPackage: { format: 1, version, startup: 2, packed: 3, packageBytes: 100 },
            configArtifact: { version, startup: 2, excluded: 3, packageBytes: 100,
                binaryFiles: 1, packedSourceCopies: 0, codecStaticRegistration: true, codecStaticDependency: true },
        },
    };
}

/** 编译真实入口并验证允许地址、拒绝边界和跨运行存储隔离。 */
async function check(preview) {
    const built = await esbuild.build({
        entryPoints: [path.resolve(__dirname, '../assets/scripts/app/remake/IsolatedSocketPreviewUtils.ts')],
        bundle: true, write: false, platform: 'node', format: 'cjs',
        plugins: [{
            name: 'creator-environment',
            setup(build) {
                build.onResolve({ filter: /^cc\/env$/ }, () => ({ path: 'environment', namespace: 'test' }));
                build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `export const PREVIEW = ${preview};` }));
            },
        }],
    });
    const values = new Map([['session', 'daily']]);
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key),
    };
    const run = 'a'.repeat(32);
    const query = `?mxzgTestRun=${run}&mxzgTestApi=http%3A%2F%2F127.0.0.1%3A39001`;
    const daily = 'ws://127.0.0.1:18080/api/v1/game/socket';
    let calls = 0;
    const requests = [];
    let frontend = frontendIdentity();
    let frontendOk = true;
    let frontendError = false;
    const context = vm.createContext({ module: { exports: {} }, URL, AbortController, setTimeout, clearTimeout });
    const normalFetch = async (url, options) => {
        calls++;
        requests.push(url);
        assert.equal(options.redirect, 'error');
        assert.equal(options.credentials, 'omit');
        assert(options.signal instanceof AbortSignal);
        if (url.endsWith('/__mxzg_preview__')) {
            assert.equal(url, new URL(context.location.href).origin + '/__mxzg_preview__', '前端探针必须同源');
            if (frontendError) throw new Error('frontend network unavailable');
            return { ok: frontendOk, json: async () => frontend };
        }
        assert.equal(url, 'http://127.0.0.1:39001/api/v1/test-identity');
        return { ok: true, json: async () => ({ kind: 'mxzg-owned-socket-it', run }) };
    };
    context.fetch = normalFetch;
    vm.runInContext(built.outputFiles[0].text, context);
    const connect = () => context.module.exports.IsolatedSocketPreviewUtils.isolatedSocketPreview(daily, storage);
    context.location = { href: 'https://example.com/' };
    assert.equal((await connect()).socketUrl, daily);
    assert.equal(calls, 0);
    for (const page of ['http://localhost:7456/web-mobile/bag-atlas-review/index.html', 'http://127.0.0.1:7456/web-desktop/review/index.html']) {
        context.location.href = page + query;
        const result = await connect();
        assert.equal(result.socketUrl, 'ws://127.0.0.1:39001/api/v1/game/socket');
        assert.equal(result.storage.getItem('session'), null);
        result.storage.setItem('session', 'isolated');
        assert.equal(storage.getItem('session'), 'daily');
        result.storage.removeItem('session');
    }
    for (const page of ['http://localhost:18081/', 'http://127.0.0.1:18081/index.html']) {
        context.location.href = page + query;
        const before = requests.length;
        const result = await connect();
        assert.equal(result.socketUrl, 'ws://127.0.0.1:39001/api/v1/game/socket');
        assert.deepEqual(requests.slice(before), [new URL(page).origin + '/__mxzg_preview__', 'http://127.0.0.1:39001/api/v1/test-identity'],
            '先核对同源构建身份，再探测随机后端');
        result.storage.setItem('session', 'isolated');
        assert.equal(storage.getItem('session'), 'daily');
        result.storage.removeItem('session');
    }
    const badFrontends = [null, {}, { application: 'other', build: frontendIdentity().build },
        { ...frontendIdentity(), build: undefined }];
    for (const mutate of [
        value => { value.build.application = 'other'; },
        value => { value.build.entryScene = 'db://assets/other.scene'; },
        value => { delete value.build.configPackage; },
        value => { delete value.build.configArtifact; },
        value => { value.build.configPackage.version = 'unversioned'; },
        value => { value.build.configArtifact.version = 'config-v1:' + 'd'.repeat(64); },
        value => { value.build.configArtifact.binaryFiles = 2; },
        value => { value.build.configArtifact.packedSourceCopies = 1; },
        value => { value.build.configArtifact.packageBytes++; },
        value => { value.build.configArtifact.excluded++; },
        value => { value.build.configPackage.packed = 0; },
        value => { value.build.configArtifact.codecStaticDependency = false; },
    ]) {
        const invalid = frontendIdentity();
        mutate(invalid);
        badFrontends.push(invalid);
    }
    context.location.href = 'http://127.0.0.1:18081/' + query;
    for (frontend of badFrontends) {
        const before = requests.length;
        await assert.rejects(connect(), /前端身份或配置包验收记录不匹配/);
        assert.equal(requests.length, before + 1, '前端证据失败不能请求后端');
    }
    frontend = frontendIdentity();
    frontendOk = false;
    await assert.rejects(connect(), /前端不可用/);
    frontendOk = true;
    frontendError = true;
    await assert.rejects(connect(), /frontend network unavailable/);
    frontendError = false;
    for (const page of ['https://example.com/', 'http://localhost.evil:7456/', 'http://192.168.0.2:7456/', 'http://localhost:7457/web-mobile/review/index.html',
        'https://localhost:18081/', 'http://localhost:18082/', 'http://localhost.evil:18081/',
        'http://192.168.0.2:18081/', 'http://name:secret@localhost:18081/',
        'http://localhost:18081/other.html', 'http://localhost:18081/web-mobile/review/index.html']) {
        context.location.href = page + query;
        const before = calls;
        await assert.rejects(connect());
        assert.equal(calls, before);
    }
    context.location.href = 'http://localhost:7456/' + query;
    if (preview) {
        await connect();
    } else {
        await assert.rejects(connect());
    }
    const page = 'http://localhost:7456/web-mobile/review/index.html';
    for (const suffix of [query.replace('39001', '18080'), query.replace('39001', '18081'), query.replace('39001', '3306'), query.replace('39001', '65536'), '?mxzgTestRun=' + run]) {
        context.location.href = page + suffix;
        const before = calls;
        await assert.rejects(connect());
        assert.equal(calls, before);
    }
    context.location.href = 'http://127.0.0.1:18081/' + query.replace('39001', '18081');
    const beforeInvalidBackend = calls;
    await assert.rejects(connect(), /日常端口/);
    assert.equal(calls, beforeInvalidBackend, '独立前端不能把自己18081当成游戏后端');
    context.location.href = page + query;
    for (const identity of [null, { kind: 'production', run }, { kind: 'mxzg-owned-socket-it', run: 'b'.repeat(32) }]) {
        context.fetch = async () => ({ ok: true, json: async () => identity });
        await assert.rejects(connect(), /身份不匹配/);
    }
    context.fetch = async () => ({ ok: false });
    await assert.rejects(connect(), /不可用/);
    context.fetch = async () => { throw new Error('network unavailable'); };
    await assert.rejects(connect(), /network unavailable/);
    assert.equal(storage.getItem('session'), 'daily');
}

/** 两种编译模式都必须通过，避免仅用预览替身证明发布入口可用。 */
async function main() {
    await check(true);
    await check(false);
    console.log('独立验收入口通过：PREVIEW真/假、原Creator路径、固定18081同源构建探针、单包同版证据、先前端后后端、伪造/缺失/网络失败拒绝及日常存储隔离。');
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
