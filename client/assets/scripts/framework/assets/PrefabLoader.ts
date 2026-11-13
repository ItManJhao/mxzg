/**
 * 通用 Prefab 加载和实例化：由 UIManager 与功能资源入口调用。
 * 资源范围和 UUID 由配置目录提供；缓存不保存角色业务状态。
 */
import { Button, Color, instantiate, Node, Prefab, Sprite } from "cc";
import { PrefabPlanUtils } from "../../config/PrefabPlanUtils";
/**
 * 页面位于 assets/bundles/module/<包名>/prefabs，父分组不是Bundle。
 * 打开页面先检查当前玩法准入；后台预加载资源不代表页面已开放。
 * 路径相对assets，例如bundles/module/login/prefabs/AccountLoginView。
 * 复用ResourceAssets资源池及Bundle依赖元数据；失败保留原始原因，不按UUID绕过远程下载。
 */
import { ResourceAssetsUtils } from "./ResourceAssetsUtils";
import { GameLog } from "../../core/GameLog";
import { ResourceScopeClosed } from "./ResourcePool";
/** 每个路径独立拥有资源池作用域，允许单项回收；加载失败、到期或应用关闭时撤回。 */
const prefabScopes = new Map<string, ReturnType<typeof ResourceAssetsUtils.createAssetScope>>();
/** 最近加载或最后一个实例销毁的单调时钟毫秒；不记录角色状态。 */
const prefabUsedAt = new Map<string, number>();
/** 活着的实例对预制体的持有数，销毁回调归零后重新开始闲置计时。 */
const prefabInstances = new Map<Prefab, number>();
/** 实例节点已持有的预制体集合，避免同一页面重复加引用；节点销毁后自动退出。 */
const nodePrefabs = new WeakMap<Node, Set<Prefab>>();
/** 无实例使用的加载器缓存初始保留120秒；LoadingPlan另有应用持有，不受此值影响。 */
export const PREFAB_IDLE_MS = 120000;
/** 每次维护最多保留16份无实例使用的预制体缓存，不限制活动实例或应用预加载资源。 */
export const MAX_IDLE_PREFABS = 16;
/** 只保存正在加载的Promise，成功后移入显式应用缓存。 */
const prefabPending = new Map<string, Promise<Prefab>>();
/** 加载器Prefab缓存：每份保留一次引用，无实例使用且超时后撤回；预加载拥有者独立。 */
const prefabLoaded = new Map<string, Prefab>();
/** 清缓存递增代次，禁止清理前的迟到请求重新填充缓存。 */
let cacheEpoch = 0;
/** 统一预制体加载、实例持有与闲置维护入口，继续使用原有唯一资源池和缓存。 */
export class PrefabLoader {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 应用已关闭页面和资源作用域后调用；不强制释放其他拥有者的引用。 */
    public static clearPrefabCache(): void {
        cacheEpoch++;
        prefabPending.clear();
        for (const prefab of prefabLoaded.values()) {
            prefab.decRef();
        }
        prefabLoaded.clear();
        for (const scope of prefabScopes.values()) {
            scope.dispose();
        }
        prefabScopes.clear();
        prefabUsedAt.clear();
    }

    /** 仅输出明确缓存和在途计数，不把缓存保留描述为内存泄漏。 */
    public static prefabCacheSnapshot(): {
        pending: number;
        cached: number;
    } {
        return { pending: prefabPending.size, cached: prefabLoaded.size };
    }

    /** 同路径合并在途加载，成功结果由应用缓存持有；失败或过期清理后可重试。 */
    public static loadPrefab(assetPath: string): Promise<Prefab> {
        if (!PrefabPlanUtils.prefabInPlan(assetPath)) {
            return Promise.reject(new Error("该界面不在当前重做计划内：" + assetPath));
        }
        const loaded = prefabLoaded.get(assetPath);
        if (loaded && loaded.isValid !== false) {
            prefabUsedAt.set(assetPath, GameLog.monoNow());
            return Promise.resolve(loaded);
        }
        const cached = prefabPending.get(assetPath);
        if (cached) {
            return cached;
        }
        const epoch = cacheEpoch;
        const scope = ResourceAssetsUtils.createAssetScope();
        prefabScopes.set(assetPath, scope);
        const pending = PrefabLoader.loadPrefabOnce(assetPath, scope).then(prefab => {
            if (epoch !== cacheEpoch) {
                prefab.addRef();
                prefab.decRef();
                throw new Error("Prefab所属应用已关闭");
            }
            prefab.addRef();
            prefabLoaded.set(assetPath, prefab);
            prefabUsedAt.set(assetPath, GameLog.monoNow());
            if (prefabPending.get(assetPath) === pending) {
                prefabPending.delete(assetPath);
            }
            return prefab;
        }, error => {
            scope.dispose();
            if (prefabScopes.get(assetPath) === scope) {
                prefabScopes.delete(assetPath);
            }
            if (prefabPending.get(assetPath) === pending) {
                prefabPending.delete(assetPath);
            }
            throw error;
        });
        prefabPending.set(assetPath, pending);
        return pending;
    }

    /** 绑定一个真实使用者；自定义异步挂载也应在等待前绑定宿主，避免准备期间依赖被回收。 */
    public static retainPrefabForNode(prefab: Prefab, owner: Node): void {
        if (!owner.isValid) {
            throw new Error("预制体拥有者已销毁");
        }
        let held = nodePrefabs.get(owner);
        if (!held) {
            held = new Set<Prefab>();
            nodePrefabs.set(owner, held);
        }
        if (held.has(prefab)) {
            return;
        }
        held.add(prefab);
        prefab.addRef();
        prefabInstances.set(prefab, (prefabInstances.get(prefab) || 0) + 1);
        owner.once(Node.EventType.NODE_DESTROYED, () => {
            const count = (prefabInstances.get(prefab) || 1) - 1;
            if (count > 0) {
                prefabInstances.set(prefab, count);
            }
            else {
                prefabInstances.delete(prefab);
                for (const [path, asset] of prefabLoaded) {
                    if (asset === prefab) {
                        prefabUsedAt.set(path, GameLog.monoNow());
                    }
                }
            }
            held!.delete(prefab);
            prefab.decRef();
        });
    }

    /** 应用定期调用：优先淘汰最久未使用的闲置项，同时处理超时；不撤回实例及预加载拥有者。 */
    public static collectPrefabCache(now = GameLog.monoNow()): number {
        const idle = Array.from(prefabLoaded.entries())
            .filter(([, prefab]) => (prefabInstances.get(prefab) || 0) === 0)
            .sort(([left], [right]) => (prefabUsedAt.get(left) || 0) - (prefabUsedAt.get(right) || 0));
        let remaining = idle.length;
        let removed = 0;
        for (const [path, prefab] of idle) {
            if (remaining <= MAX_IDLE_PREFABS && now - (prefabUsedAt.get(path) || 0) < PREFAB_IDLE_MS) {
                continue;
            }
            prefabLoaded.delete(path);
            prefabUsedAt.delete(path);
            prefab.decRef();
            prefabScopes.get(path)?.dispose();
            prefabScopes.delete(path);
            remaining--;
            removed++;
        }
        return removed;
    }

    /** 按登记的Bundle加载预制体；失败不按UUID绕过远程下载，关闭后拒绝迟到结果。 */
    private static loadPrefabOnce(assetPath: string, scope: ReturnType<typeof ResourceAssetsUtils.createAssetScope>): Promise<Prefab> {
        const parsed = ResourceAssetsUtils.address(assetPath, "Prefab");
        const descriptor = ResourceAssetsUtils.describe(parsed.bundle, parsed.loadPath, "Prefab", assetPath);
        return (scope.load(descriptor) as Promise<Prefab>).catch((error: unknown) => {
            if (error instanceof ResourceScopeClosed) {
                throw new Error("Prefab所属应用已关闭");
            }
            throw error;
        });
    }

    /** 实例化并让节点持有预制体依赖；节点销毁才撤回，不受加载器闲置淘汰影响。 */
    public static spawnPrefab(prefab: Prefab, parent: Node): Node {
        const root = instantiate(prefab);
        PrefabLoader.retainPrefabForNode(prefab, root);
        root.parent = parent;
        return root;
    }

    /** 按相对路径查找已有子节点，任一级缺失时返回null。 */
    public static findNode(root: Node, path: string): Node | null {
        let cur: Node | null = root;
        const parts = path.split("/");
        for (let i = 0; i < parts.length; i++) {
            if (!cur) {
                return null;
            }
            const name = parts[i];
            if (!name) {
                continue;
            }
            cur = cur.getChildByName(name);
        }
        return cur;
    }

    /** 取得必须存在的子节点；缺失时报告具体路径并拒绝继续。 */
    public static requireNode(root: Node, path: string): Node {
        const node = PrefabLoader.findNode(root, path);
        if (!node) {
            throw new Error("缺少节点 " + path);
        }
        return node;
    }

    /** 给已有Button节点绑定点击动作；缺少组件时明确报错。 */
    public static bindClick(node: Node, fn: () => void): void {
        const button = node.getComponent(Button);
        if (!button) {
            throw new Error(node.name + " 缺少 Button");
        }
        node.on(Button.EventType.CLICK, fn);
    }

    /** 更新已有Sprite的颜色；没有该组件时不修改节点。 */
    public static tintSprite(node: Node, color: Color): void {
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
        }
    }
}
