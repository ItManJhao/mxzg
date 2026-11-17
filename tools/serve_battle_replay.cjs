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
fixtures.set("/independent-dark-cutter-bleed-replay.pb", fs.readFileSync(path.join(__dirname, "../backend/target/independent-dark-cutter-bleed-replay.pb")));
fixtures.set("/independent-frozen-replay.pb", fs.readFileSync(path.join(__dirname, "../backend/target/independent-frozen-replay.pb")));
// 五星、六星使用原星级技能配置，各自固定战报，不提供任意文件访问。
for (const star of [5, 6]) {
    const name = "independent-nanako-star-" + star + "-replay.pb";
    fixtures.set("/" + name, fs.readFileSync(path.join(__dirname, "../backend/target", name)));
}
for (const star of [5, 6, 7]) {
    const name = "independent-charm-star-" + star + "-replay.pb";
    fixtures.set("/" + name, fs.readFileSync(path.join(__dirname, "../backend/target", name)));
}
// 新专项按固定文件名挂载，保留只生成旧夹具时的启动方式。
const charmDeathName = "independent-charm-death-replay.pb";
const charmDeathPath = path.join(__dirname, "../backend/target", charmDeathName);
if (fs.existsSync(charmDeathPath)) {
    fixtures.set("/" + charmDeathName, fs.readFileSync(charmDeathPath));
}
// 护盾专项使用真实后端输出，固定两份文件；缺文件仍可启动既有战报服务，不接受任意路径。
for (const name of ["shield-depleted-survival.pb", "shield-depleted-death.pb"]) {
    const file = path.join(__dirname, "../backend/target", name);
    if (fs.existsSync(file)) {
        fixtures.set("/" + name, fs.readFileSync(file));
    }
}
// 配置化专项只发布测试导出的规范文件名，路径固定在backend/target，URL不能选择任意磁盘文件。
const replayTarget = path.resolve(__dirname, "../backend/target");
for (const name of fs.readdirSync(replayTarget)) {
    const stage = /^chapter-config-stage-([1-9]\d*)\.pb$/.exec(name);
    if (stage && Number.isSafeInteger(Number(stage[1])) && Number(stage[1]) <= 0xffffffff) {
        fixtures.set("/" + name, fs.readFileSync(path.join(replayTarget, name)));
    }
}
// 独立WebSocket试战的导出文件可选，不接受任意路径。
for (const mission of [1, 2, 3]) {
    const name = "lineup-mixed-" + mission + "-replay.pb";
    const file = path.join(__dirname, "../backend/target", name);
    if (fs.existsSync(file)) {
        fixtures.set("/" + name, fs.readFileSync(file));
    }
}
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
