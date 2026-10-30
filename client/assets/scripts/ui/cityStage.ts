/**
 * 开机加载条还在的时候把主城和顶栏实例化好，切到 Main 之前改成常驻节点。
 * Main 的相机会把空画布清成黑。若等进了 Main 再解 CityChrome（方正字 4.5MB + 几十张小图），
 * 这段等待全是黑的，而且主城要等这一下结束才挂，所以第一帧顶栏和地图是一起出来的。
 * 只 loadPrefab 不够：编辑器预览里大图和字体往往拖到 instantiate 才真正解码。
 */
import { director, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { CITY_CHROME_PREFAB_PATH, CITY_HUB_PREFAB_PATH, loadPrefab, spawnPrefab } from "./prefabLoad";

/** Cocos Director.EVENT_AFTER_DRAW。用字面量，避免开机脚本再依赖枚举是否导出。 */
const AFTER_DRAW = "director_after_draw";

interface StagedCity {
  holder: Node;
  hub: Node | null;
  chrome: Node | null;
}

let staged: StagedCity | null = null;
let stageTask: Promise<void> | null = null;

/** 挂在开机 Canvas 最底层、保持未激活。加载层盖在上面，登录点不到这层。 */
export function stageCityShell(parent: Node): Promise<void> {
  if (stageTask) return stageTask;
  stageTask = runStage(parent);
  return stageTask;
}

async function runStage(parent: Node): Promise<void> {
  try {
    if (staged && staged.holder.isValid) return;
    const [hubPrefab, chromePrefab] = await Promise.all([
      loadPrefab(CITY_HUB_PREFAB_PATH),
      loadPrefab(CITY_CHROME_PREFAB_PATH),
    ]);
    if (!parent.isValid) return;
    const holder = new Node("CityStage");
    holder.active = false;
    try {
      const hub = spawnPrefab(hubPrefab, holder);
      const chrome = spawnPrefab(chromePrefab, holder);
      holder.parent = parent;
      holder.setSiblingIndex(0);
      // 未激活时 Label/Sprite 不跑 onEnable，方正字和解码会拖到空的 Main 里。加载层盖住并挡住点击。
      // 画完两帧再关掉，登录界面出来之前这层是隐藏的。
      try {
        holder.active = true;
        await afterPaint();
        await afterPaint();
      } catch (err) {
        GameLog.shared.warn("CityHub", "stage paint " + (err instanceof Error ? err.message : "failed"));
      }
      if (!holder.isValid) return;
      holder.active = false;
      if (holder.parent === parent) holder.setSiblingIndex(0);
      staged = { holder, hub, chrome };
      GameLog.shared.info("CityHub", "staged shell behind loading");
    } catch (err) {
      if (holder.isValid) holder.destroy();
      throw err;
    }
  } catch (err) {
    staged = null;
    GameLog.shared.warn("CityHub", "stage shell " + (err instanceof Error ? err.message : "failed"));
  }
}

/**
 * loadScene 会拆掉 Boot。常驻根必须直接挂在场景上，不能留在 Canvas 里。
 * 进 Main 的回调里再挂回新画布。
 */
export function liftStagedCity(): void {
  if (!staged || !staged.holder.isValid) return;
  const scene = director.getScene();
  if (!scene) return;
  const holder = staged.holder;
  holder.parent = scene;
  director.addPersistRootNode(holder);
}

export function takeStagedHub(): Node | null {
  return take("hub");
}

export function takeStagedChrome(): Node | null {
  return take("chrome");
}

/** 不用预制时把已经实例化的那份拆掉，避免常驻节点空挂着。 */
export function discardStagedHub(): void {
  discard("hub");
}

export function discardStagedChrome(): void {
  discard("chrome");
}

function take(kind: "hub" | "chrome"): Node | null {
  if (!staged) return null;
  const node = staged[kind];
  if (!node || !node.isValid) {
    staged[kind] = null;
    releaseHolderIfEmpty();
    return null;
  }
  staged[kind] = null;
  node.parent = null;
  node.active = true;
  releaseHolderIfEmpty();
  return node;
}

function discard(kind: "hub" | "chrome"): void {
  if (!staged) return;
  const node = staged[kind];
  staged[kind] = null;
  if (node && node.isValid) node.destroy();
  releaseHolderIfEmpty();
}

/** 等一帧绘制。事件没发出时用定时器放行，避免加载条永远停住。 */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, 100);
    try {
      director.once(AFTER_DRAW, () => {
        clearTimeout(timer);
        finish();
      });
    } catch (_err) {
      // 定时器仍会放行。
    }
  });
}

function releaseHolderIfEmpty(): void {
  if (!staged) return;
  if (staged.hub || staged.chrome) return;
  const holder = staged.holder;
  staged = null;
  if (!holder.isValid) return;
  director.removePersistRootNode(holder);
  holder.destroy();
}
