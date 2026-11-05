/** 独立画面验收只读资源服务：仅绑定本机，仅提供后端测试生成的Protobuf战报，不访问数据库。 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const fixtures = new Map([1, 2, 3, "3-control"].map(mission => ["/chapter-1-1-" + mission + "-replay.pb",
    fs.readFileSync(path.resolve(__dirname, "../backend/target/chapter-1-1-" + mission + "-replay.pb"))]));
fixtures.set("/independent-control-teams-replay.pb",
    fs.readFileSync(path.resolve(__dirname, "../backend/target/independent-control-teams-replay.pb")));
fixtures.set("/independent-nanako-critical-replay.pb", fs.readFileSync(path.join(__dirname, "../backend/target/independent-nanako-critical-replay.pb")));
fixtures.set("/independent-nanako-replay.pb", fs.readFileSync(path.join(__dirname, "../backend/target/independent-nanako-replay.pb")));
fixtures.set("/independent-frozen-replay.pb", fs.readFileSync(path.join(__dirname, "../backend/target/independent-frozen-replay.pb")));
http.createServer((request, response) => {
    if (request.method !== "GET" || !fixtures.has(request.url)) {
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
    response.end(fixtures.get(request.url));
}).listen(19091, "127.0.0.1", () => console.log("Read-only replay fixture: 127.0.0.1:19091"));
