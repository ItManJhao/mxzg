/**
 * 内网打包门户的 HTTPS 入口。向同事提供 main 的测试链接、源码状态和任务摘要。
 * 管理操作只接收固定任务名，构建由独立 PowerShell 进程执行，口令与运行文件不作为网页资源提供。
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const repository = path.resolve(__dirname, '../..');
const configFile = path.resolve(process.argv[2] || path.join(repository, 'client/temp/build-console/config.json'));
const settings = readJson(configFile);
const actions = new Set(['pull', 'frontend', 'backend', 'restart', 'config', 'all']);
const staticFiles = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);
const maximumBodyBytes = 1024;
const maximumLogBytes = 64 * 1024;
const gameUrl = new URL(settings.gameUrl);
const listenPort = Number(settings.listenPort);
const portalUrl = new URL(settings.portalUrl || ('https://' + settings.listenHost + ':' + listenPort));
const stateDirectory = path.resolve(settings.stateDirectory);
const sourceBranch = 'main';
const sourceStatePath = path.join(stateDirectory, 'source-' + sourceBranch + '.json');
const jobsDirectory = path.join(stateDirectory, 'jobs');
const tokenPath = path.join(stateDirectory, 'operator-token.txt');
const runnerPath = path.join(__dirname, 'Run-BuildJob.ps1');

if (net.isIP(settings.listenHost) !== 4 || settings.listenHost === '0.0.0.0'
    || !Number.isInteger(listenPort) || listenPort < 1024 || listenPort > 65535 || listenPort === 18080
    || gameUrl.protocol !== 'https:' || gameUrl.port === '18080' || gameUrl.username || gameUrl.password
    || portalUrl.protocol !== 'https:' || portalUrl.username || portalUrl.password || portalUrl.port === '18080'
    || gameUrl.origin === portalUrl.origin || !path.isAbsolute(settings.stateDirectory)) {
    throw new Error('门户和手机测试服必须分别使用明确的 HTTPS 地址，18080 保留给开发服');
}

fs.mkdirSync(jobsDirectory, { recursive: true });
const operatorToken = readOperatorToken();
const ca = fs.readFileSync(settings.caCertificate);
const pending = new Map();
let healthCheck = { checkedAt: 0, promise: Promise.resolve(false) };

const server = https.createServer({
    pfx: fs.readFileSync(settings.keyStore),
    passphrase: fs.readFileSync(settings.keyStorePasswordFile, 'utf8').trim(),
    minVersion: 'TLSv1.2',
}, (request, response) => {
    void route(request, response).catch(error => {
        console.error('[打包门户]', error.message);
        if (!response.headersSent) {
            sendJson(response, 500, { error: '门户暂时无法完成请求，请检查服务日志。' });
        } else {
            response.end();
        }
    });
});

server.requestTimeout = 10000;
server.headersTimeout = 8000;
server.listen(listenPort, settings.listenHost, () => {
    console.log('[READY] ' + portalUrl.origin + '/');
    console.log('操作口令文件位于 ' + tokenPath);
});

/** 读取小型 JSON 状态文件。可选状态缺失时返回 null，损坏内容交由调用方报告。 */
function readJson(file, optional = false) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
        if (optional && error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/** 首次创建本机操作口令，后续重启沿用。口令文件不在静态资源白名单中。 */
function readOperatorToken() {
    if (!fs.existsSync(tokenPath)) {
        try {
            fs.writeFileSync(tokenPath, crypto.randomBytes(24).toString('base64url') + os.EOL, { flag: 'wx', mode: 0o600 });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    if (token.length < 24) {
        throw new Error('操作口令长度不足，请更新本机口令文件');
    }
    return token;
}

/** 校验管理员请求。比较口令摘要，日志和响应不会回显凭据。 */
function isOperator(request) {
    const expected = crypto.createHash('sha256').update('Bearer ' + operatorToken).digest();
    const actual = crypto.createHash('sha256').update(request.headers.authorization || '').digest();
    return crypto.timingSafeEqual(expected, actual);
}

/** 设置页面安全响应头。门户同源提供脚本和 API，游戏链接可以正常在新标签页打开。 */
function responseHeaders(response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}

/** 返回 JSON 状态或用户可读错误。 */
function sendJson(response, status, value) {
    responseHeaders(response);
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(value));
}

/** 读取任务的有限 JSON 参数，避免异常请求占用构建机资源。 */
async function readBody(request) {
    let bytes = 0;
    const buffers = [];
    for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > maximumBodyBytes) {
            throw new Error('请求过大');
        }
        buffers.push(chunk);
    }
    return JSON.parse(Buffer.concat(buffers).toString('utf8'));
}

/** 短缓存测试页探针，使用当前证书链访问同一台测试服。 */
function checkGame() {
    const now = Date.now();
    if (now - healthCheck.checkedAt < 4000) {
        return healthCheck.promise;
    }
    const promise = new Promise(resolve => {
        const probe = https.request(gameUrl, { method: 'HEAD', ca, timeout: 1800 }, response => {
            response.resume();
            resolve(response.statusCode === 200);
        });
        probe.on('timeout', () => probe.destroy());
        probe.on('error', () => resolve(false));
        probe.end();
    });
    healthCheck = { checkedAt: now, promise };
    return promise;
}

/** 读取任务记录，确认上次门户进程退出时留下的任务是否仍在执行。 */
function listJobs() {
    const jobs = [];
    for (const entry of fs.readdirSync(jobsDirectory, { withFileTypes: true })) {
        if (!entry.isDirectory() || !isJobId(entry.name)) {
            continue;
        }
        const job = readJson(path.join(jobsDirectory, entry.name, 'job.json'), true);
        if (!job || job.id !== entry.name) {
            continue;
        }
        if (job.status === 'running' && !pending.has(job.id) && !processExists(job.pid)) {
            job.status = 'failed';
            job.endedAt = new Date().toISOString();
            job.error = '门户曾退出，任务完成状态需要核对日志。';
            saveJob(job);
        }
        jobs.push(job);
    }
    return jobs.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

/** 核对任务编号，避免访问任务之外的路径。 */
function isJobId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}

/** 仅检查 Windows 子进程是否存在，不向进程发出停止信号。 */
function processExists(pid) {
    if (!Number.isInteger(pid) || pid < 1) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

/** 用临时文件提交任务状态，避免网页读到写入一半的 JSON。 */
function saveJob(job) {
    const file = path.join(jobsDirectory, job.id, 'job.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(job, null, 2));
    fs.renameSync(file + '.tmp', file);
}

/** 返回可公开的任务摘要，进程编号和原始日志留在执行端。 */
function publicJob(job) {
    const { pid, ...publicState } = job;
    return publicState;
}

/** 向一个任务目录启动固定脚本。任务进程继承本机 Git 凭据，操作口令不会作为参数传给它。 */
function startJob(action) {
    const job = { id: crypto.randomUUID(), action, status: 'running', startedAt: new Date().toISOString() };
    const directory = path.join(jobsDirectory, job.id);
    fs.mkdirSync(directory);
    const log = fs.openSync(path.join(directory, 'job.log'), 'a');
    let child;
    try {
        child = spawn('powershell.exe', [
            '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', runnerPath,
            '-Action', action, '-Configuration', configFile, '-JobDirectory', directory,
        ], { cwd: repository, windowsHide: true, stdio: ['ignore', log, log] });
    } finally {
        fs.closeSync(log);
    }
    job.pid = child.pid;
    pending.set(job.id, child);
    saveJob(job);

    /** 汇总子进程最终退出码。退出失败仍保留日志供管理员查看。 */
    function complete(success, message) {
        if (!pending.delete(job.id)) {
            return;
        }
        job.status = success ? 'succeeded' : 'failed';
        job.endedAt = new Date().toISOString();
        if (!success) {
            job.error = message;
        }
        saveJob(job);
    }

    child.once('error', () => complete(false, '任务进程启动失败。'));
    child.once('close', (code, signal) => complete(code === 0, '任务未完成（' + (signal || '退出码 ' + code) + '）。请查看日志。'));
    return job;
}

/** 返回末尾一段任务日志。构建期间持续跟踪，输出统一按 UTF-8 读取。 */
function readJobLog(id) {
    const file = path.join(jobsDirectory, id, 'job.log');
    const descriptor = fs.openSync(file, 'r');
    try {
        const size = fs.fstatSync(descriptor).size;
        const length = Math.min(size, maximumLogBytes);
        const content = Buffer.alloc(length);
        const read = fs.readSync(descriptor, content, 0, length, size - length);
        return (size > length ? '较早日志已省略。\n' : '') + content.subarray(0, read).toString('utf8')
            .replace(/(https?:\/\/)[^/\s@]+@/gi, '$1[已隐藏]@');
    } finally {
        fs.closeSync(descriptor);
    }
}

/** 提供静态页、内网 main 状态、任务日志和固定操作。浏览器只能选择既定任务。 */
async function route(request, response) {
    const pathname = new URL(request.url, portalUrl.origin).pathname;
    if (request.method === 'GET' && staticFiles.has(pathname)) {
        const [file, contentType] = staticFiles.get(pathname);
        responseHeaders(response);
        response.writeHead(200, { 'Content-Type': contentType });
        response.end(fs.readFileSync(path.join(__dirname, 'web', file)));
        return;
    }

    if (request.method === 'GET' && pathname === '/favicon.ico') {
        response.writeHead(204);
        response.end();
        return;
    }

    if (request.method === 'GET' && pathname === '/api/state') {
        const source = readJson(sourceStatePath, true);
        const syncedSource = source?.branch === sourceBranch ? source : null;
        const release = readJson(path.join(stateDirectory, 'release.json'), true);
        const jobs = listJobs();
        sendJson(response, 200, {
            target: { url: gameUrl.href, online: await checkGame(), frontend: release?.frontend, backend: release?.backend },
            source: { branch: sourceBranch, commit: syncedSource?.commit, updatedAt: syncedSource?.updatedAt },
            buildHost: os.hostname(),
            jobs: jobs.slice(0, 25).map(publicJob),
            activeJob: jobs.find(job => job.status === 'running')?.id || null,
        });
        return;
    }

    if (request.method === 'GET' && pathname === '/api/operator') {
        if (isOperator(request)) {
            sendJson(response, 200, { authorized: true });
        } else {
            sendJson(response, 401, { error: '操作口令不正确。' });
        }
        return;
    }

    const logRoute = /^\/api\/jobs\/([^/]+)\/log$/.exec(pathname);
    if (request.method === 'GET' && logRoute && isJobId(logRoute[1])) {
        if (!isOperator(request)) {
            sendJson(response, 401, { error: '请先输入正确的操作口令。' });
        } else if (!fs.existsSync(path.join(jobsDirectory, logRoute[1], 'job.json'))) {
            sendJson(response, 404, { error: '找不到该任务。' });
        } else {
            sendJson(response, 200, { text: readJobLog(logRoute[1]) });
        }
        return;
    }

    if (request.method === 'POST' && pathname === '/api/jobs') {
        if (request.headers.origin !== portalUrl.origin) {
            sendJson(response, 403, { error: '请从此内网门户提交任务。' });
            return;
        }
        if (!isOperator(request)) {
            sendJson(response, 401, { error: '请先输入正确的操作口令。' });
            return;
        }
        if (!/^application\/json\b/i.test(request.headers['content-type'] || '')) {
            sendJson(response, 415, { error: '请求必须使用 JSON。' });
            return;
        }
        let body;
        try {
            body = await readBody(request);
        } catch {
            sendJson(response, 400, { error: '任务请求格式错误。' });
            return;
        }
        if (!body || Object.keys(body).length !== 1 || !actions.has(body.action)) {
            sendJson(response, 400, { error: '请选择门户列出的操作。' });
            return;
        }
        if (listJobs().some(job => job.status === 'running')) {
            sendJson(response, 409, { error: '已有任务正在执行。' });
            return;
        }
        sendJson(response, 202, { job: publicJob(startJob(body.action)) });
        return;
    }

    sendJson(response, 404, { error: '页面不存在。' });
}
