/**
 * Creator编辑器主进程入口：项目启用时拥有本机技能演示资源宿主，卸载时只关闭自己的server。
 * 与builder构建工作进程入口分离；目录来自真实后端测试PB，不启动游戏服务、不读写玩家资产。
 */
const path = require("node:path");
const { startReplayResourceServer } = require("../../../tools/serve_battle_replay.cjs");

/** 当前扩展拥有的资源宿主；null表示尚未启动、启动失败或已交给卸载处理。 */
let ownedHost = null;
/** 进行中的启动，重复load共用它；兑现后释放，unload会等待并关闭迟到宿主。 */
let loading = null;
/** 本扩展加载代次，卸载递增以拒绝旧启动结果；不承担游戏身份隔离。 */
let epoch = 0;

/** 启用项目扩展时启动本机只读资源；端口被占用只打印原因，绝不抢占其他Chat的宿主。 */
exports.load = async function load() {
    if (ownedHost || loading) {
        return loading;
    }
    const current = ++epoch;
    const pending = startReplayResourceServer({ projectRoot: path.resolve(__dirname, "../../..") })
        .then(async host => {
            if (current !== epoch) {
                await host.close();
                return;
            }
            ownedHost = host;
            console.log("[技能演示资源] 已自动启动本机只读资源，目录随真实战报更新。");
        }).catch(error => {
            console.warn("[技能演示资源] 未启动：" + (error?.code === "EADDRINUSE"
                ? "127.0.0.1:19091已被占用，保留原宿主；本扩展不会关闭其他进程。"
                : (error instanceof Error ? error.message : String(error))));
        }).finally(() => {
            if (loading === pending) {
                loading = null;
            }
        });
    loading = pending;
    return pending;
};

/** 禁用或重载扩展时关闭自有资源；正在启动的旧代次随后自行关闭，不保留端口监听。 */
exports.unload = async function unload() {
    epoch++;
    const host = ownedHost;
    ownedHost = null;
    if (host) {
        await host.close();
    }
    if (loading) {
        await loading;
    }
};
