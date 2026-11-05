/** 独立画面验收只读资源服务：仅绑定本机，仅提供后端测试生成的Protobuf战报，不访问数据库。 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const fixture = fs.readFileSync(path.resolve(__dirname, "../backend/target/chapter-1-1-1-replay.pb"));
http.createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/chapter-1-1-1-replay.pb") {
        response.writeHead(404);
        response.end();
        return;
    }
    const origin = request.headers.origin;
    if (origin && origin !== "http://localhost:7456" && origin !== "http://127.0.0.1:7456") {
        response.writeHead(403);
        response.end();
        return;
    }
    response.writeHead(200, {"Content-Type": "application/octet-stream", "Cache-Control": "no-store",
        ...(origin ? {"Access-Control-Allow-Origin": origin, "Vary": "Origin"} : {})});
    response.end(fixture);
}).listen(19091, "127.0.0.1", () => console.log("Read-only replay fixture: 127.0.0.1:19091"));
