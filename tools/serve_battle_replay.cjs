/**
 * Creator本机只读战报资源宿主：自动扫描后端测试生成的真实Protobuf战报，并按实际出手生成技能目录。
 * 编辑器扩展拥有启动/关闭生命周期；直接运行本文件仍可独立使用。不连接游戏数据库，不生成战报或修改资产。
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

/** 单个演示资源大小上限，单位字节，拒绝意外巨型文件拖慢编辑器主进程。 */
const MAX_REPLAY_BYTES = 2 * 1024 * 1024;
/** 仅接收目标目录中的简单小写文件名；路径、查询串和转义字符均不能选择磁盘文件。 */
const REPLAY_NAME = /^[a-z0-9][a-z0-9-]*\.pb$/;
/** Creator本机预览的两个明确来源；其他网页不能读取开发资源。 */
const ALLOWED_ORIGINS = new Set(["http://localhost:7456", "http://127.0.0.1:7456"]);

/** 读取项目自动生成的原Protobuf编解码器，不复制消息定义或按文本猜战报结构。 */
function loadReplayCodec(projectRoot) {
    const esbuild = require(path.join(projectRoot, "client/node_modules/esbuild"));
    const source = fs.readFileSync(path.join(projectRoot,
        "client/assets/scripts/platform/GameProtocol.generated.ts"), "utf8");
    const compiled = esbuild.transformSync(source, { loader: "ts", format: "cjs" }).code;
    const loaded = { exports: {} };
    new Function("module", "exports", "require", compiled)(loaded, loaded.exports, require);
    return loaded.exports.mxzg.game.BattleReplay;
}

/**
 * 解码并核对完整战报的基本边界，排除Frame等其他PB消息；完整播放与配置依赖仍由客户端校验。
 * 返回值只包含该战报真实出现的英雄/技能/等级出手，不从面板、技能名称或未触发被动推断覆盖。
 */
function replaySkills(bytes, codec) {
    const replay = codec.decode(bytes);
    const failure = codec.verify(replay);
    if (failure || replay.schemaVersion !== 1 || typeof replay.scenario !== "string"
        || replay.scenario.length < 1 || replay.scenario.length > 160
        || !["ATTACKER_WIN", "DEFENDER_WIN"].includes(replay.outcome)
        || !Number.isInteger(replay.rounds) || replay.rounds < 1 || replay.rounds > 15
        || !Array.isArray(replay.units) || replay.units.length < 2 || replay.units.length > 16
        || !Array.isArray(replay.phases) || replay.phases.length < 1) {
        throw new Error("不是受支持的完整战报资源");
    }
    const units = new Map();
    const seats = new Set();
    for (const unit of replay.units) {
        const seat = unit.faction + ":" + unit.position;
        if (!Number.isInteger(unit.unitId) || unit.unitId <= 0 || units.has(unit.unitId)
            || !Number.isInteger(unit.templateId) || unit.templateId <= 0
            || ![1, 2].includes(unit.faction) || !Number.isInteger(unit.position)
            || unit.position < 1 || unit.position > 8 || seats.has(seat)) {
            throw new Error("战报名册身份无效");
        }
        units.set(unit.unitId, unit.templateId);
        seats.add(seat);
    }
    const skills = new Map();
    for (const phase of replay.phases) {
        if (!Number.isInteger(phase.round) || phase.round < 1 || phase.round > replay.rounds
            || !Number.isInteger(phase.sourceId) || (phase.sourceId !== 0 && !units.has(phase.sourceId))) {
            throw new Error("战报阶段无效");
        }
        for (const event of phase.events) {
            if (event.kind !== "skill.begin") {
                continue;
            }
            if (!units.has(event.sourceId) || !Number.isInteger(event.configId) || event.configId <= 0
                || !Object.prototype.hasOwnProperty.call(event, "skillLevel")
                || !Number.isInteger(event.skillLevel) || event.skillLevel < 0) {
                throw new Error("技能出手缺少真实来源或等级");
            }
            const entry = { heroId: units.get(event.sourceId), skillId: event.configId, level: event.skillLevel };
            skills.set(entry.heroId + ":" + entry.skillId + ":" + entry.level, entry);
        }
    }
    return [...skills.values()].sort((a, b) => a.heroId - b.heroId || a.skillId - b.skillId || a.level - b.level);
}

/** 读取并校验一个本机战报。文件消失、损坏、超限或并非普通文件时返回null，下次请求仍可重新检测。 */
function readReplay(directory, fixture, codec) {
    if (!REPLAY_NAME.test(fixture)) {
        return null;
    }
    try {
        const file = path.join(directory, fixture);
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > MAX_REPLAY_BYTES) {
            return null;
        }
        const bytes = fs.readFileSync(file);
        if (bytes.length < 1 || bytes.length > MAX_REPLAY_BYTES) {
            return null;
        }
        return { bytes, skills: replaySkills(bytes, codec) };
    } catch {
        // 测试可能正覆盖文件，这次只跳过该文件，不发布半份战报。
        return null;
    }
}

/** 列举当前目录中的真实战报并计算索引。目录不存在时返回空集合，文件变化在下次目录请求时可见。 */
function scanReplayDirectory(directory, codec) {
    const resources = new Map();
    let names;
    try {
        names = fs.readdirSync(directory).filter(name => REPLAY_NAME.test(name)).sort();
    } catch (error) {
        if (error.code === "ENOENT") {
            return resources;
        }
        throw error;
    }
    for (const fixture of names) {
        const resource = readReplay(directory, fixture, codec);
        if (!resource) {
            continue;
        }
        resources.set(fixture, {
            fixture,
            sha256: createHash("sha256").update(resource.bytes).digest("hex"),
            skills: resource.skills,
        });
    }
    return resources;
}

/**
 * 仅在127.0.0.1启动只读宿主；端口占用时拒绝并保留原宿主，不探测或终止其他进程。
 * options.port可用0让专项分配独立端口；close只关闭此调用创建的server，可重复调用。
 */
async function startReplayResourceServer(options = {}) {
    const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, ".."));
    const directory = path.resolve(options.directory || path.join(projectRoot, "backend/target"));
    const codec = options.codec || loadReplayCodec(projectRoot);
    const port = options.port === undefined ? 19091 : options.port;
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error("只读资源端口无效");
    }
    const server = http.createServer((request, response) => {
        const origin = request.headers.origin;
        if (request.method !== "GET") {
            response.writeHead(405, { Allow: "GET" });
            response.end();
            return;
        }
        if (origin && !ALLOWED_ORIGINS.has(origin)) {
            response.writeHead(403);
            response.end();
            return;
        }
        const headers = {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
        };
        try {
            const url = request.url || "";
            if (url !== "/skill-audit.json" && (!url.startsWith("/") || !REPLAY_NAME.test(url.slice(1)))) {
                response.writeHead(404, headers);
                response.end();
                return;
            }
            if (url === "/skill-audit.json") {
                const resources = scanReplayDirectory(directory, codec);
                response.writeHead(200, { ...headers, "Content-Type": "application/json; charset=utf-8" });
                response.end(JSON.stringify({ service: "mxzg-skill-replay", version: 1, schemaVersion: 1,
                    replays: [...resources.values()] }));
                return;
            }
            // 单份PB校验只依赖该文件，避免浏览器下载每份战报时重新扫描整目录。
            const resource = readReplay(directory, url.slice(1), codec);
            if (!resource) {
                response.writeHead(404, headers);
                response.end();
                return;
            }
            response.writeHead(200, { ...headers, "Content-Type": "application/octet-stream" });
            response.end(resource.bytes);
        } catch {
            response.writeHead(503, headers);
            response.end();
        }
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });
    /** 同一拥有者重复卸载共用关闭Promise，不关闭同端口上的后继宿主。 */
    let closing = null;
    return {
        address: server.address(),
        /** 只释放此句柄拥有的监听；重复调用复用同一关闭结果。 */
        close() {
            if (!closing) {
                closing = new Promise((resolve, reject) => {
                    server.close(error => error ? reject(error) : resolve());
                    server.closeIdleConnections?.();
                });
            }
            return closing;
        },
    };
}

module.exports = { loadReplayCodec, replaySkills, scanReplayDirectory, startReplayResourceServer };

if (require.main === module) {
    startReplayResourceServer().then(host => {
        console.log("本机只读战报资源已启动：http://127.0.0.1:" + host.address.port + "/skill-audit.json");
        /** 独立命令退出时只释放自己创建的监听，不清理其他进程或后端文件。 */
        const stop = () => { void host.close(); };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
    }).catch(error => {
        console.error("本机只读战报资源启动失败：", error);
        process.exitCode = 1;
    });
}
