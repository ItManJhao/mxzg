/**
 * 应用配置装配：登录前读取LoadingPlan声明的少量启动表，登录后统一安装压缩配置包。
 * 数据、版本与索引只保存在GameConfig；本工具不维护模块分组或第二份配置缓存。
 * 下载使用现有资源池的短期作用域，安装完成后撤回压缩资源持有。
 */
import { ResourceAssetsUtils } from "../framework/assets/ResourceAssetsUtils";
import { GameConfig } from "./GameConfig";
import { GConfig } from "./GConfig";
import { ConfigPackageCancelled, ConfigPackageUtils } from "./ConfigPackageUtils";
import type { GateSnapshot } from "./CityNavigationUtils";

export class RemakeConfigUtils {
    /** 固定格式生成产物的唯一运行时地址，包中目录由manifest自动生成。 */
    private static readonly PACKAGE = ResourceAssetsUtils.describe("config", "game-config", "BufferAsset");

    /** 装配工具只通过静态入口使用。 */
    private constructor() {}

    /** 应用启动时注入唯一读取器；重复装配同一函数安全，不在import时自动发起资源请求。 */
    public static initialize(): void {
        GameConfig.instance.initialize(RemakeConfigUtils.loadStartupConfig);
    }

    /**
     * 登录后校验启动同版、逐表解析建索引，再允许主城打开；取消或失败不记成功。
     * 重登复用已安装版本，下载去重复用资源池，不在工具中保留第二份配置或压缩包缓存。
     * 玩家文案只区分单包下载、包内解析和配置初始化；表数只用于计算真实任务进度。
     */
    public static async prepareGameConfig(update: (label: string, ratio: number) => void,
        active: () => boolean): Promise<void> {
        if (!active()) {
            throw new ConfigPackageCancelled("游戏配置准备已取消");
        }
        if (GameConfig.instance.getPackageVersion()) {
            update("游戏数据已准备", 1);
            return;
        }
        const scope = ResourceAssetsUtils.createAssetScope();
        try {
            update("加载游戏数据", 0);
            const asset = await scope.load(this.PACKAGE);
            if (!active()) {
                throw new ConfigPackageCancelled("游戏配置准备已取消");
            }
            update("整理游戏数据", 0.2);
            const decoded = await ConfigPackageUtils.decode(new Uint8Array(asset.buffer()),
                path => GameConfig.instance.getSourceChecksum(path), (done, total) => {
                    if (active()) {
                        update("整理游戏数据", 0.2 + 0.35 * done / total);
                    }
                }, active);
            await GameConfig.instance.installPackage(decoded.version, decoded.files, decoded.startupPaths, (done, total) => {
                if (active()) {
                    update("准备游戏数据", 0.55 + 0.45 * done / Math.max(total, 1));
                }
            }, active);
            if (!active()) {
                throw new ConfigPackageCancelled("游戏配置准备已取消");
            }
            update("游戏数据准备完成", 1);
        } finally {
            scope.dispose();
        }
    }

    /** 已就绪时读取主城门槛；登录前缺表返回null，不维护门槛副本或在页面中补加载。 */
    public static readCityGates(): GateSnapshot | null {
        if (GameConfig.instance.status(GConfig.OpenCondition).state !== "ready"
            || GameConfig.instance.status(GConfig.SystemGate).state !== "ready") {
            return null;
        }
        return {
            opencondition: GameConfig.instance.getConfig(GConfig.OpenCondition),
            systemGate: GameConfig.instance.getConfig(GConfig.SystemGate),
        };
    }

    /** 只负责启动源读取，游戏配置就绪后直接查询缓存；不接受未实现的外部资源版本。 */
    private static loadStartupConfig(path: string, version: string): Promise<unknown> {
        if (version !== "initial") {
            return Promise.reject(new Error("启动配置未提供资源版本：" + version));
        }
        return ResourceAssetsUtils.loadConfig(path);
    }
}
