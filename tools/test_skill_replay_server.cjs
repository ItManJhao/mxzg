/**
 * 只读技能演示资源专项：用原编解码器检查动态目录、精确出手归属、路径/CORS及编辑器拥有者生命周期。
 * 只在自有临时目录和随机本机端口工作，不连接玩家数据库，不启动Creator或占用日常19091。
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const vm = require("node:vm");
const { loadReplayCodec, replaySkills, scanReplayDirectory, startReplayResourceServer } = require("./serve_battle_replay.cjs");

/** 项目根目录只用于读取真实编解码器和扩展源码；临时输出限定在client/temp。 */
const root = path.resolve(__dirname, "..");
/** 本专项拥有的临时父目录，结束时验证绝对路径再删除本次唯一子目录。 */
const tempRoot = path.join(root, "client/temp");

/** 生成协议边界夹具，只测试目录识别，不将它当作真实玩法或可播放场景的验收证据。 */
function boundaryReplay(codec, changes = {}) {
    const value = {
        schemaVersion: 1, scenario: "audit:lineup:10", outcome: "ATTACKER_WIN", rounds: 1,
        units: [
            { unitId: 1, templateId: 10101001, position: 2, initialHp: 10, finalHp: 10, faction: 1 },
            { unitId: 9, templateId: 10104004, position: 2, initialHp: 10, finalHp: 0, faction: 2 },
        ],
        phases: [{ round: 1, sourceId: 1, events: [
            { kind: "skill.begin", sourceId: 1, targetId: 9, configId: 101010010, skillLevel: 0 },
            { kind: "skill.begin", sourceId: 9, targetId: 1, configId: 101040041, skillLevel: 1 },
            { kind: "skill.begin", sourceId: 9, targetId: 1, configId: 101040041, skillLevel: 1 },
            { kind: "buff.apply", sourceId: 9, targetId: 1, configId: 101040043, skillLevel: 3 },
        ] }],
        ...changes,
    };
    assert.equal(codec.verify(value), null);
    return Buffer.from(codec.encode(value).finish());
}

/** 用真实HTTP请求读取随机本机宿主，返回原响应头和字节，不自动跟随重定向。 */
async function request(port, resource, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: "127.0.0.1", port, path: resource, method: options.method || "GET",
            headers: options.origin ? { Origin: options.origin } : {} }, response => {
            const chunks = [];
            response.on("data", value => chunks.push(value));
            response.on("end", () => resolve({ status: response.statusCode, headers: response.headers,
                bytes: Buffer.concat(chunks) }));
        });
        req.on("error", reject);
        req.end();
    });
}

/** 在独立VM加载扩展，注入可控启动口，避免测试编辑器生命周期时监听真实端口。 */
function extensionFixture(start) {
    const filename = path.join(root, "client/extensions/mxzg-bag-build/main.js");
    const warnings = [];
    const context = { exports: {}, __dirname: path.dirname(filename),
        require: name => name === "node:path" ? path : { startReplayResourceServer: start },
        console: { log() {}, warn(message) { warnings.push(message); } } };
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
    return { extension: context.exports, warnings };
}

/** 检查重复load、迟到load/unload及占用失败都只处理自己拥有的宿主。 */
async function checkExtensionOwnership() {
    let starts = 0;
    let closes = 0;
    let options;
    const first = extensionFixture(async value => {
        starts++;
        options = value;
        return { close: async () => { closes++; } };
    });
    await Promise.all([first.extension.load(), first.extension.load()]);
    await first.extension.load();
    assert.equal(starts, 1, "同次启用不能重复监听");
    assert.equal(options.projectRoot, root, "扩展路径必须指向实际仓库根");
    await first.extension.unload();
    await first.extension.unload();
    assert.equal(closes, 1, "重复卸载只关一次自有宿主");
    await first.extension.load();
    await first.extension.unload();
    assert.equal(starts, 2, "完成卸载后允许再次启用");
    assert.equal(closes, 2);

    let fulfill;
    const late = extensionFixture(() => new Promise(resolve => { fulfill = resolve; }));
    const loading = late.extension.load();
    const unloading = late.extension.unload();
    fulfill({ close: async () => { closes++; } });
    await Promise.all([loading, unloading]);
    assert.equal(closes, 3, "卸载后的迟到启动必须自行关闭");

    const failed = extensionFixture(async () => { throw Object.assign(new Error("busy"), { code: "EADDRINUSE" }); });
    await failed.extension.load();
    await failed.extension.unload();
    assert.equal(closes, 3, "占用失败不得关闭任何他人宿主");
    assert.equal(failed.warnings.length, 1);
    assert.ok(failed.warnings[0].includes("不会关闭其他进程"));
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "client/extensions/mxzg-bag-build/package.json"), "utf8"));
    assert.equal(pkg.main, "./main.js");
    const actualEntry = require(path.join(root, "client/extensions/mxzg-bag-build/main.js"));
    assert.equal(typeof actualEntry.load, "function", "实际编辑器入口能解析项目资源工具路径");
    assert.equal(typeof actualEntry.unload, "function");
    const builder = require(path.join(root, "client/extensions/mxzg-bag-build/builder.js"));
    assert.deepEqual(Object.keys(builder.configs).sort(), ["web-desktop", "web-mobile"]);
    assert.ok(!fs.readFileSync(path.join(root, "client/extensions/mxzg-bag-build/builder.js"), "utf8").includes("startReplay"),
        "构建工作进程不启动资源宿主");
}

/** 执行目录/HTTP完整边界，最终释放自有宿主和临时文件。 */
async function main() {
    const codec = loadReplayCodec(root);
    fs.mkdirSync(tempRoot, { recursive: true });
    const directory = fs.mkdtempSync(path.join(tempRoot, "skill-replay-server-check-"));
    let host = null;
    try {
        const bytes = boundaryReplay(codec);
        const skills = replaySkills(bytes, codec);
        assert.deepEqual(skills, [
            { heroId: 10101001, skillId: 101010010, level: 0 },
            { heroId: 10104004, skillId: 101040041, level: 1 },
        ], "精确按出手者模板和等级索引，去重出手且不猜被动");
        assert.equal(scanReplayDirectory(path.join(directory, "missing"), codec).size, 0);
        fs.writeFileSync(path.join(directory, "first.pb"), bytes);
        fs.writeFileSync(path.join(directory, "invalid.pb"), Buffer.from([255, 255]));
        fs.writeFileSync(path.join(directory, "wrong-version.pb"), boundaryReplay(codec, { schemaVersion: 2 }));
        fs.writeFileSync(path.join(directory, "oversized.pb"), boundaryReplay(codec, {
            attackerName: "x".repeat(2 * 1024 * 1024),
        }));
        fs.writeFileSync(path.join(directory, "UPPER.pb"), bytes);
        fs.mkdirSync(path.join(directory, "directory.pb"));
        const frame = path.join(root, "backend/target/chapter-config-stage-10-frame.pb");
        if (fs.existsSync(frame)) {
            fs.copyFileSync(frame, path.join(directory, "frame.pb"));
        }
        assert.deepEqual([...scanReplayDirectory(directory, codec).keys()], ["first.pb"], "无效/其他消息/目录不进入资源目录");
        host = await startReplayResourceServer({ projectRoot: root, directory, codec, port: 0 });
        const port = host.address.port;
        assert.equal(host.address.address, "127.0.0.1");
        const catalog = await request(port, "/skill-audit.json", { origin: "http://localhost:7456" });
        assert.equal(catalog.status, 200);
        assert.equal(catalog.headers["access-control-allow-origin"], "http://localhost:7456");
        assert.equal(catalog.headers["access-control-allow-credentials"], undefined);
        assert.equal(catalog.headers["cache-control"], "no-store");
        const parsed = JSON.parse(catalog.bytes);
        assert.equal(parsed.service, "mxzg-skill-replay", "目录必须能够识别自身，避免误读旧宿主");
        assert.equal(parsed.version, 1);
        assert.equal(parsed.schemaVersion, 1);
        assert.deepEqual(parsed.replays[0].skills, skills);
        assert.match(parsed.replays[0].sha256, /^[a-f0-9]{64}$/);
        const original = await request(port, "/first.pb", { origin: "http://127.0.0.1:7456" });
        assert.deepEqual(original.bytes, bytes, "旧显式PB地址仍返回原二进制");
        fs.writeFileSync(path.join(directory, "new-test-replay.pb"), bytes);
        const refreshed = JSON.parse((await request(port, "/skill-audit.json")).bytes);
        assert.equal(refreshed.replays.length, 2, "新测试战报无需修改宿主或页面白名单");
        fs.unlinkSync(path.join(directory, "first.pb"));
        assert.equal((await request(port, "/first.pb")).status, 404, "删除后的字节不再缓存");
        for (const resource of ["/../game.proto", "/%2e%2e/game.proto", "/new-test-replay.pb?x=1", "/UPPER.pb", "/invalid.pb"]) {
            assert.equal((await request(port, resource)).status, 404, resource);
        }
        assert.equal((await request(port, "/skill-audit.json", { origin: "https://example.com" })).status, 403);
        assert.equal((await request(port, "/skill-audit.json", { origin: "null" })).status, 403);
        assert.equal((await request(port, "/skill-audit.json")).status, 200, "无Origin的本机程序仍可读取只读资源");
        assert.equal((await request(port, "/oversized.pb")).status, 404, "超过客户端2MiB上限的PB不发布");
        assert.equal((await request(port, "/skill-audit.json", { method: "POST" })).status, 405);
        await assert.rejects(startReplayResourceServer({ projectRoot: root, directory, codec, port }),
            error => error.code === "EADDRINUSE");
        assert.equal((await request(port, "/skill-audit.json")).status, 200, "占用失败不影响原宿主");
        const closing = host.close();
        assert.equal(host.close(), closing);
        await closing;
        host = null;
        await checkExtensionOwnership();
        console.log("PASS 技能演示资源：动态真实出手目录、原PB读取、路径/CORS、占用保护及扩展生命周期");
    } finally {
        await host?.close();
        assert.ok(path.resolve(directory).startsWith(path.resolve(tempRoot) + path.sep + "skill-replay-server-check-"));
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
