/**
 * 前端离线专项的真实配置夹具：扫描当前配置Bundle源目录，经GameConfig完成启动表与游戏包安装。
 * 测试只在此处准备共享配置，不依赖页面prepare，也不维护另一份游戏配置文件清单。
 * 不调用Creator资源加载器，不启动服务或写入配置源文件。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { LOADING_PLAN } from "../assets/scripts/app/remake/LoadingPlan";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { CONFIG_SCHEMA } from "../assets/scripts/config/GConfig";

/** 按资源包身份定位真实源目录，物理父目录不参与客户端配置键。 */
const { bundleRoot, resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

export class ConfigFixtureUtils {
    /** 所有入口均为静态方法，夹具不保存玩家或页面状态。 */
    private constructor() {
    }

    /**
     * 从真实源文件准备应用启动表，再原子安装其余游戏配置；配置分界复用唯一LoadingPlan。
     * 应用启动表已就绪时保留其原读取器，只安装其余配置，便于验证显式应用装配。
     * @param config 默认安装业务单例；纯规则专项可传独立仓库，避免改动全局查询。
     * @returns 已完成真实数据安装的仓库，后续页面打开不需要配置准备。
     */
    public static async installReal(config = GameConfig.instance): Promise<GameConfig> {
        const startup = LOADING_PLAN.login.flatMap(target => "config" in target ? [target.config] : []);
        const startupPaths = new Set<string>(startup.map(name => CONFIG_SCHEMA[name].path));
        const directory = bundleRoot("config") as string;
        const files: Record<string, unknown> = {};
        for (const file of ConfigFixtureUtils.sourceFiles(directory)) {
            const path = "config/" + relative(directory, file).replaceAll("\\", "/").replace(/\.json$/, "");
            if (!startupPaths.has(path)) {
                files[path] = JSON.parse(readFileSync(file, "utf8"));
            }
        }
        if (!startup.every(name => config.status(name).state === "ready")) {
            config.initialize(ConfigFixtureUtils.readSource);
            await config.prepare(startup);
        }
        await config.installPackage("offline-source", files, Array.from(startupPaths));
        return config;
    }

    /** 递归扫描当前Bundle的JSON源文件，跳过meta及其他资源，不维护手写表名清单。 */
    private static sourceFiles(directory: string): string[] {
        return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = join(directory, entry.name);
            return entry.isDirectory() ? ConfigFixtureUtils.sourceFiles(file) : entry.name.endsWith(".json") ? [file] : [];
        });
    }

    /** 为GameConfig启动表提供真实JSON；离线版本不改变源文件地址或复用页面资源作用域。 */
    private static async readSource(path: string): Promise<unknown> {
        return JSON.parse(readFileSync(resolveBundleFile(path + ".json"), "utf8"));
    }
}
