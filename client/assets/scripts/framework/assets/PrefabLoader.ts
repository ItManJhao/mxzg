/**
 * 通用 Prefab 加载和实例化：由 UIManager 与功能资源入口调用。
 * 资源范围和 UUID 由配置目录提供；缓存不保存角色业务状态。
 */
import {assetManager, Button, Color, EditBox, instantiate, Node, Prefab, Sprite} from "cc";
import {prefabInPlan} from "../../config/PrefabPlan";

/**
 * 保留旧 UI 的 Prefab 在 assets/prefabs，不在 resources。
 * 打开页面先检查当前玩法准入；后台预加载资源不代表页面已开放。
 * assets/prefabs 是名为 prefabs 的 Asset Bundle。
 * 路径相对 assets，例如 prefabs/ui/legacy-login/LoginPanel。
 * 复用ResourceAssets资源池及Bundle依赖元数据；编辑器导入未完成时保留原UUID回退。
 */

import { createAssetScope, ResourceAssetsUtils } from "./ResourceAssets";
import { monoNow } from "../../core/GameLog";
import { ResourceScopeClosed } from "./ResourcePool";

/** 每个路径独立拥有资源池作用域，允许单项回收；加载失败、到期或应用关闭时撤回。 */
const prefabScopes = new Map<string, ReturnType<typeof createAssetScope>>();
/** 最近加载或最后一个实例销毁的单调时钟毫秒；不记录角色状态。 */
const prefabUsedAt = new Map<string, number>();
/** 活着的实例对预制体的持有数，销毁回调归零后重新开始闲置计时。 */
const prefabInstances = new Map<Prefab, number>();
/** 实例节点已持有的预制体集合，避免同一页面重复加引用；节点销毁后自动退出。 */
const nodePrefabs = new WeakMap<Node, Set<Prefab>>();
/** 无实例使用的加载器缓存初始保留120秒；LoadingPlan另有应用持有，不受此值影响。 */
export const PREFAB_IDLE_MS = 120_000;

import {PREFAB_UUID} from "../../config/PrefabCatalog";


/** 只保存正在加载的Promise，成功后移入显式应用缓存。 */
const prefabPending = new Map<string, Promise<Prefab>>();

/** 加载器Prefab缓存：每份保留一次引用，无实例使用且超时后撤回；预加载拥有者独立。 */
const prefabLoaded = new Map<string, Prefab>();
/** 清缓存递增代次，禁止清理前的迟到请求重新填充缓存。 */
let cacheEpoch = 0;

/** 应用已关闭页面和资源作用域后调用；不强制释放其他拥有者的引用。 */
export function clearPrefabCache(): void {
    cacheEpoch++;
    prefabPending.clear();
    for (const prefab of prefabLoaded.values()) prefab.decRef();
    prefabLoaded.clear();
    for (const scope of prefabScopes.values()) scope.dispose();
    prefabScopes.clear();
    prefabUsedAt.clear();
}

/** 仅输出明确缓存和在途计数，不把缓存保留描述为内存泄漏。 */
export function prefabCacheSnapshot(): { pending: number; cached: number } {
    return {pending: prefabPending.size, cached: prefabLoaded.size};
}

/** 同路径合并在途加载，成功结果由应用缓存持有；失败或过期清理后可重试。 */
export function loadPrefab(assetPath: string): Promise<Prefab> {
    if (!prefabInPlan(assetPath)) return Promise.reject(new Error("该界面不在当前重做计划内：" + assetPath));
    const loaded = prefabLoaded.get(assetPath);
    if (loaded && loaded.isValid !== false) {
        prefabUsedAt.set(assetPath, monoNow());
        return Promise.resolve(loaded);
    }
    const cached = prefabPending.get(assetPath);
    if (cached) return cached;
    const epoch = cacheEpoch;
    const scope = createAssetScope();
    prefabScopes.set(assetPath, scope);
    const pending = loadPrefabOnce(assetPath, scope).then(prefab => {
        if (epoch !== cacheEpoch) {
            prefab.addRef();
            prefab.decRef();
            throw new Error("Prefab所属应用已关闭");
        }
        prefab.addRef();
        prefabLoaded.set(assetPath, prefab);
        prefabUsedAt.set(assetPath, monoNow());
        if (prefabPending.get(assetPath) === pending) prefabPending.delete(assetPath);
        return prefab;
    }, error => {
        scope.dispose();
        if (prefabScopes.get(assetPath) === scope) prefabScopes.delete(assetPath);
        if (prefabPending.get(assetPath) === pending) prefabPending.delete(assetPath);
        throw error;
    });
    prefabPending.set(assetPath, pending);
    return pending;
}

/** 绑定一个真实使用者；自定义异步挂载也应在等待前绑定宿主，避免准备期间依赖被回收。 */
export function retainPrefabForNode(prefab: Prefab, owner: Node): void {
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
        } else {
            prefabInstances.delete(prefab);
            for (const [path, asset] of prefabLoaded) {
                if (asset === prefab) prefabUsedAt.set(path, monoNow());
            }
        }
        held!.delete(prefab);
        prefab.decRef();
    });
}

/** 应用定期调用：只撤回无人实例使用的到期缓存，保留在途请求及其他作用域持有。 */
export function collectPrefabCache(now = monoNow()): number {
    let removed = 0;
    for (const [path, prefab] of prefabLoaded) {
        if ((prefabInstances.get(prefab) || 0) > 0 || now - (prefabUsedAt.get(path) || 0) < PREFAB_IDLE_MS) {
            continue;
        }
        prefabLoaded.delete(path);
        prefabUsedAt.delete(path);
        prefab.decRef();
        prefabScopes.get(path)?.dispose();
        prefabScopes.delete(path);
        removed++;
    }
    return removed;
}

/** 按计划Bundle加载，编辑器导入尚未完成时保留原UUID回退。 */
function loadPrefabOnce(assetPath: string, scope: ReturnType<typeof createAssetScope>): Promise<Prefab> {
    const parsed = splitAssetPath(assetPath);
    const descriptor = ResourceAssetsUtils.describe(parsed.bundle, parsed.inner, "Prefab", assetPath);
    return (scope.load(descriptor) as Promise<Prefab>).catch((bundleErr: unknown) => {
        if (bundleErr instanceof ResourceScopeClosed) {
            throw new Error("Prefab所属应用已关闭");
        }
        const uuid = PREFAB_UUID[assetPath];
        if (!uuid) return Promise.reject(bundleErr);
        return loadUuidPrefab(uuid).catch((uuidErr: unknown) => {
            throw new Error(assetPath + " " + errText(bundleErr) + "；loadAny " + errText(uuidErr));
        });
    });
}

/** 实例化并让节点持有预制体依赖；节点销毁才撤回，不受加载器闲置淘汰影响。 */
export function spawnPrefab(prefab: Prefab, parent: Node): Node {
    const root = instantiate(prefab);
    retainPrefabForNode(prefab, root);
    root.parent = parent;
    return root;
}

export function findNode(root: Node, path: string): Node | null {
    let cur: Node | null = root;
    const parts = path.split("/");
    for (let i = 0; i < parts.length; i++) {
        if (!cur) return null;
        const name = parts[i];
        if (!name) continue;
        cur = cur.getChildByName(name);
    }
    return cur;
}

export function requireNode(root: Node, path: string): Node {
    const node = findNode(root, path);
    if (!node) throw new Error("缺少节点 " + path);
    return node;
}

export function bindClick(node: Node, fn: () => void): void {
    const button = node.getComponent(Button);
    if (!button) throw new Error(node.name + " 缺少 Button");
    node.on(Button.EventType.CLICK, fn);
}

export function setInteractable(node: Node, on: boolean): void {
    const button = node.getComponent(Button);
    if (button) button.interactable = on;
}

export function readEditBox(node: Node): string {
    const edit = node.getComponent(EditBox);
    if (!edit) throw new Error(node.name + " 缺少 EditBox");
    return typeof edit.string === "string" ? edit.string : "";
}

export function writeEditBox(node: Node, value: string): void {
    const edit = node.getComponent(EditBox);
    if (!edit) throw new Error(node.name + " 缺少 EditBox");
    edit.string = value;
}

export function tintSprite(node: Node, color: Color): void {
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.color = color;
}

function splitAssetPath(assetPath: string): { bundle: string; inner: string } {
    // 独立包目录采用bundles/<包名>/<资源>；普通prefabs目录本身就是包名。
    if (assetPath.startsWith("bundles/")) {
        const parts = assetPath.split("/");
        if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) {
            throw new Error("独立Bundle路径缺少资源：" + assetPath);
        }
        return { bundle: parts[1], inner: parts.slice(2).join("/") };
    }
    const slash = assetPath.indexOf("/");
    if (slash <= 0 || slash >= assetPath.length - 1) {
        throw new Error("Prefab 路径要相对 assets，例如 prefabs/ui/legacy-login/LoginPanel");
    }
    return {bundle: assetPath.slice(0, slash), inner: assetPath.slice(slash + 1)};
}

function loadUuidPrefab(uuid: string): Promise<Prefab> {
    return new Promise((resolve, reject) => {
        assetManager.loadAny({uuid}, (err, asset) => {
            if (err || !asset) {
                reject(err || new Error("loadAny 没有 " + uuid));
                return;
            }
            resolve(asset);
        });
    });
}

function errText(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    return "加载失败";
}
