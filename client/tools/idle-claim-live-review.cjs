/**
 * 挂机领取独立浏览器宿主，编译测试入口并连接已校验身份的测试服务。
 * 只使用现有白名单的回环18081，不运行Creator、不生成发布包；身份和停止文件限定本次run。
 */
const { createServer } = require("node:http");
const { mkdir, readFile, writeFile, unlink } = require("node:fs/promises");
const { resolve, join } = require("node:path");
const esbuild = require(require.resolve("esbuild", { paths: [resolve(__dirname, "..")] }));

/** 严格读取三个显式参数，禁止误连日常端口或把任意路径当作输出目录。 */
function options() {
    const input = process.argv.slice(2);
    const result = {};
    for (const argument of input) {
        const match = /^--(run|api|serverId)=(.+)$/.exec(argument);
        if (!match || result[match[1]]) {
            throw new Error("参数应为 --run=<32位hex> --api=http://127.0.0.1:<独立端口> --serverId=<区服>");
        }
        result[match[1]] = match[2];
    }
    if (!/^[a-f0-9]{32}$/.test(result.run || "")
        || !/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(result.api || "")
        || !/^[a-zA-Z0-9_-]{1,64}$/.test(result.serverId || "")) {
        throw new Error("独立联调参数不完整");
    }
    const port = Number(new URL(result.api).port);
    if (port > 65535 || [18080, 18081, 3306].includes(port)) {
        throw new Error("独立联调禁止使用日常服务端口");
    }
    return result;
}

/** 生成仅承载测试按钮的页面，不包含玩家入口、凭证或任何伪造资产。 */
function page() {
    return `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<title>挂机领取联调</title><style>
body{font:16px/1.7 system-ui;background:#f3f6fa;color:#21334b;padding:24px;max-width:1180px}
button{padding:10px 16px;margin:6px;border:1px solid #8399b5;border-radius:8px;font-size:16px;background:white}
pre{white-space:pre-wrap;padding:18px;background:white;border-radius:10px;font-size:14px}
</style><h1>挂机领取联调</h1><p>连接独立 H2，验证单次领取、消息丢失与统一快照。</p>
<button id="RunButton">运行领取检查</button>
<pre id="Output">尚未运行</pre><script src="/check.js"></script></html>`;
}

/** 编译测试入口并用当前测试服务托管。 */
async function main() {
    const config = options();
    const root = resolve(__dirname, "../..");
    const directory = join(root, "client/temp/idle-claim-live-" + config.run);
    await mkdir(directory, { recursive: true });
    const stopFile = join(directory, "stop.request");
    try {
        await unlink(stopFile);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
    await esbuild.build({
        absWorkingDir: root,
        entryPoints: ["client/tools/idle-claim-live-browser-check.ts"],
        bundle: true,
        platform: "browser",
        format: "iife",
        target: "es2017",
        tsconfig: "client/tools/tsconfig.check.json",
        outfile: join(directory, "check.js"),
        logLevel: "silent",
    });
    const script = await readFile(join(directory, "check.js"));
    const server = createServer((request, response) => {
        const path = new URL(request.url, "http://127.0.0.1").pathname;
        response.setHeader("Cache-Control", "no-store");
        if (request.method !== "GET" || !["/", "/check.js", "/favicon.ico"].includes(path)) {
            response.writeHead(404).end();
        } else if (path === "/favicon.ico") {
            response.writeHead(204).end();
        } else {
            response.setHeader("Content-Type", path === "/" ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8");
            response.end(path === "/" ? page() : script);
        }
    });
    await new Promise((done, reject) => {
        server.once("error", reject);
        server.listen(18081, "127.0.0.1", done);
    });
    const query = new URLSearchParams(config);
    const manifest = { kind: "mxzg-owned-idle-claim-browser", run: config.run, pid: process.pid,
        port: server.address().port, directory, url: "http://127.0.0.1:" + server.address().port + "/?" + query };
    await writeFile(join(directory, "owner.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(JSON.stringify(manifest));
    // 停止动作只读取本run的固定文件；不按端口猜测进程或触碰其他宿主。
    let checking = false;
    const timer = setInterval(async () => {
        if (checking) {
            return;
        }
        checking = true;
        try {
            if ((await readFile(stopFile, "utf8")).trim() === config.run) {
                clearInterval(timer);
                server.close();
                server.closeAllConnections();
            }
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error(error);
            }
        } finally {
            checking = false;
        }
    }, 250);
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
