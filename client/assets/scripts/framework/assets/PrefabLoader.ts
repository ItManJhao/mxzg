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

import { ResourceCatalog, ResourceDescriptor } from "./ResourceCatalog";
import { createAssetScope } from "./ResourceAssets";
import { ResourceScopeClosed } from "./ResourcePool";

/** 预制体与后台目录加载共用类型化资源池；清理缓存时撤回本作用域。 */
let prefabScope: ReturnType<typeof createAssetScope> | null = null;

import {PREFAB_UUID} from "../../config/PrefabCatalog";


/** 只保存正在加载的Promise，成功后移入显式应用缓存。 */
const prefabPending = new Map<string, Promise<Prefab>>();

/** 应用常驻Prefab缓存：每份保留一次引擎引用，只有应用关闭后清理。 */
const prefabLoaded = new Map<string, Prefab>();
/** 清缓存递增代次，禁止清理前的迟到请求重新填充缓存。 */
let cacheEpoch = 0;

/** 应用已关闭页面和资源作用域后调用；不强制释放其他拥有者的引用。 */
export function clearPrefabCache(): void {
    cacheEpoch++;
    prefabPending.clear();
    for (const prefab of prefabLoaded.values()) prefab.decRef();
    prefabLoaded.clear();
    prefabScope?.dispose();
    prefabScope = null;
}

/** 仅输出明确缓存和在途计数，不把缓存保留描述为内存泄漏。 */
export function prefabCacheSnapshot(): { pending: number; cached: number } {
    return {pending: prefabPending.size, cached: prefabLoaded.size};
}

/** 同路径合并在途加载，成功结果由应用缓存持有；失败或过期清理后可重试。 */
export function loadPrefab(assetPath: string): Promise<Prefab> {
    if (!prefabInPlan(assetPath)) return Promise.reject(new Error("该界面不在当前重做计划内：" + assetPath));
    const loaded = prefabLoaded.get(assetPath);
    if (loaded && loaded.isValid !== false) return Promise.resolve(loaded);
    const cached = prefabPending.get(assetPath);
    if (cached) return cached;
    const epoch = cacheEpoch;
    const pending = loadPrefabOnce(assetPath).then(prefab => {
        if (epoch !== cacheEpoch) {
            prefab.addRef();
            prefab.decRef();
            throw new Error("Prefab所属应用已关闭");
        }
        prefab.addRef();
        prefabLoaded.set(assetPath, prefab);
        if (prefabPending.get(assetPath) === pending) prefabPending.delete(assetPath);
        return prefab;
    }, error => {
        if (prefabPending.get(assetPath) === pending) prefabPending.delete(assetPath);
        throw error;
    });
    prefabPending.set(assetPath, pending);
    return pending;
}

/** 按计划Bundle加载，编辑器导入尚未完成时保留原UUID回退。 */
function loadPrefabOnce(assetPath: string): Promise<Prefab> {
    let registered: ResourceDescriptor<"Prefab"> | null = null;
    for (const group of Object.values(ResourceCatalog)) {
        for (const row of Object.values(group) as ResourceDescriptor[]) {
            if (row.type === "Prefab" && row.assetPath === assetPath) {
                registered = row as ResourceDescriptor<"Prefab">;
            }
        }
    }
    const parsed = splitAssetPath(assetPath);
    const descriptor = registered || { bundle: parsed.bundle, path: parsed.inner, assetPath, loadPath: parsed.inner, type: "Prefab" as const, uuid: PREFAB_UUID[assetPath] || "" };
    if (!prefabScope) {
        prefabScope = createAssetScope();
    }
    return (prefabScope.load(descriptor) as Promise<Prefab>).catch((bundleErr: unknown) => {
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

export function spawnPrefab(prefab: Prefab, parent: Node): Node {
    const root = instantiate(prefab);
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
