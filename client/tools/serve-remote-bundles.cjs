/** 本地远程Bundle样板服务器：只提供指定构建的remote资源，用于跨端口下载验收。
 * 不提供游戏业务接口，不访问数据库；仅监听本机，正式发布由CDN替代。
 * 用法：node client/tools/serve-remote-bundles.cjs [构建目录] [端口，默认7460]。
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

// 固定在仓库构建目录内，避免测试服务器暴露源码或用户文件。
const buildRoot = path.resolve(__dirname, '../build');
const build = path.resolve(process.argv[2] || path.join(buildRoot, 'bag-atlas-review'));
assert(build.startsWith(buildRoot + path.sep), '仅允许client/build内的构建');
const remote = fs.realpathSync(path.join(build, 'remote'));
assert(remote.startsWith(buildRoot + path.sep), 'remote不能链接到构建目录之外');
const port = Number(process.argv[3] || 7460);
assert(Number.isInteger(port) && port > 1024 && port < 65536, '端口无效');
const mime = { '.json': 'application/json', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

/** 提供remote内普通文件；失败返回真实状态，不将缺失资源替换为首页或空成功。 */
function serve(request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
    }
    try {
        const url = new URL(request.url, 'http://127.0.0.1');
        const pathname = decodeURIComponent(url.pathname);
        if (!pathname.startsWith('/remote/')) {
            response.writeHead(404).end();
            return;
        }
        const target = path.resolve(remote, pathname.slice('/remote/'.length));
        if (!target.startsWith(remote + path.sep)) {
            response.writeHead(403).end();
            return;
        }
        const actual = fs.realpathSync(target);
        if (!actual.startsWith(remote + path.sep) || !fs.statSync(actual).isFile()) {
            response.writeHead(403).end();
            return;
        }
        const content = fs.readFileSync(actual);
        response.writeHead(200, { 'Content-Type': mime[path.extname(actual)] || 'application/octet-stream', 'Content-Length': content.length });
        response.end(request.method === 'HEAD' ? undefined : content);
        console.log('[远程资源样板] 200 ' + url.pathname + ' ' + content.length + ' bytes');
    } catch (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 400).end();
    }
}

const server = http.createServer(serve);
server.on('error', error => {
    console.error('[远程资源样板] 启动失败', error.message);
    process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
    console.log('[远程资源样板] 资源服务器地址：http://127.0.0.1:' + port + '/');
});
