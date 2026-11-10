/** 发布包隔离入口回归：分别编译 PREVIEW 真/假分支，模拟身份探针，不连接实际服务器。 */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
const path = require('node:path');

/** 编译真实入口并验证允许地址、拒绝边界和跨运行存储隔离。 */
async function check(preview) {
    const built = await esbuild.build({
        entryPoints: [path.resolve(__dirname, '../assets/scripts/app/remake/IsolatedSocketPreview.ts')],
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
    const context = vm.createContext({ module: { exports: {} }, URL, AbortController, setTimeout, clearTimeout });
    context.fetch = async (url, options) => {
        calls++;
        assert.equal(url, 'http://127.0.0.1:39001/api/v1/test-identity');
        assert.equal(options.redirect, 'error');
        assert.equal(options.credentials, 'omit');
        return { ok: true, json: async () => ({ kind: 'mxzg-owned-socket-it', run }) };
    };
    vm.runInContext(built.outputFiles[0].text, context);
    const connect = () => context.module.exports.isolatedSocketPreview(daily, storage);
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
    for (const page of ['https://example.com/', 'http://localhost.evil:7456/', 'http://192.168.0.2:7456/', 'http://localhost:7457/web-mobile/review/index.html']) {
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
    console.log('独立验收入口通过：PREVIEW真/假、本机Web路径、实例核验、失败拒绝及日常存储隔离。');
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
