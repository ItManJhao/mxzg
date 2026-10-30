import { assetManager, Button, Color, EditBox, instantiate, Node, Prefab, Sprite } from "cc";
import { BATTLE_PREFAB_PATH } from "./battlePrefabLayout";
import { prefabInPlan } from "../config/PrefabPlan";

/**
 * 保留旧 UI 的 Prefab 在 assets/prefabs，不在 resources。
 * 先检查当前计划清单；新主城 Bundle 入口由 HomeResources 单独加载。
 * assets/prefabs 是名为 prefabs 的 Asset Bundle。
 * 路径相对 assets，例如 prefabs/ui/legacy-login/LoginPanel。
 * 先 loadBundle，再用 bundle.load。编辑器还没刷出 bundle 时，用 .meta uuid 走 assetManager.loadAny。
 * 不要 resources.load。
 */

/** 相对 assets，不是 resources 路径。 */
export const LOGIN_PREFAB_PATH = "prefabs/ui/legacy-login/LoginPanel";
export const CREATE_ROLE_PREFAB_PATH = "prefabs/ui/login/CreateRolePanel";
export const CITY_CHROME_PREFAB_PATH = "prefabs/ui/city/CityChrome";
export const CITY_HUB_PREFAB_PATH = "prefabs/ui/city/CityHub";
export { BATTLE_PREFAB_PATH };

/** 与 .prefab.meta 的 uuid 一致。只给 loadAny 兜底，不拿去 resources.load。 */
const PREFAB_UUID: { [path: string]: string } = {
  "prefabs/ui/login/LoadingLayer": "ed70957c-0e46-44db-a4a2-aacd73196fd1",
  "prefabs/ui/login/UpdateLayer": "4371fa6e-a0d2-4932-ab57-bb085d572a06",
  "prefabs/ui/legacy-login/LoginPanel": "196fd024-dd83-4ee7-9783-1617ce3279a8",
  "prefabs/ui/login/CreateRolePanel": "d2eb0e48-bc58-4e09-b95f-ce45350461b1",
  "prefabs/ui/city/CityChrome": "c97efb56-db67-4c93-84d5-e29436794e86",
  "prefabs/ui/city/CityHub": "118c08f7-43eb-477d-ab62-50f3ec65294f",
  [BATTLE_PREFAB_PATH]: "733c8611-a124-4c16-bb79-6b3011dfb408",
  "prefabs/ui/legacy-login/UserLoginLayer": "9a634cfd-fdca-586f-827a-0a4b3212ca49",
  "prefabs/ui/login/ChooseServerLayer": "46c73fed-68c2-5589-8720-d11645528009",
  "prefabs/ui/login/ChooseServerCell": "da7f5fcb-b7ea-5f0d-9d9e-bf5186dbfa68",
  "prefabs/ui/login/NoticeLayer": "2140fe91-ad3d-514a-96f1-265cf2b063bc",
  "prefabs/ui/login/ErrorLayer": "3e52626e-44c3-5af9-9627-63a243e2f0ad",
  "prefabs/ui/battle/BattlePanelLayer": "ac146bb3-359f-4506-8fcf-32f8c56ef4d3",
  "prefabs/ui/battle/BattleEndLayer": "20fbcf65-e7c1-4d82-8b20-59a1c93372bc",
  "prefabs/ui/chapter/ChapterPreviewLayer": "9b27aa5f-aed6-4237-be28-f887c7269fd8",
  "prefabs/ui/chapter/ChapterRewardLayer": "c78ade68-b8b1-474a-992b-5f8a5b84ae50",
  "prefabs/ui/chapter/ChapterExtraRewardCell": "82856eb9-fd9b-4e2e-9c8d-dcd371227229",
  "prefabs/ui/chapter/ChapterRewardCell": "a32ff178-f35d-415c-a51f-6b5eaeb567b4",
  "prefabs/ui/hero/HeroSuggestLayer": "985faa05-ddbb-4f27-8d0f-9a6d5b709750",
  "prefabs/ui/hero/HeroListLayer": "95a097b8-9964-4ac3-8b3d-b4f568b1eb53",
  "prefabs/ui/hero/HeroListHeroLayer": "d3a470c0-fa13-47fa-811e-f38c7317e9d8",
  "prefabs/ui/hero/HeroInfoLayer": "fa5d3f0c-1441-479b-a182-48d374c7dc6c",
  "prefabs/ui/hero/HeroInfoUpLevelLayer": "723c0b26-52e0-47a6-ad0f-30d22af54f92",
  "prefabs/ui/hero/HeroInfoUpStarLayer": "0b07b4af-4619-4794-bd0a-a72efd375367",
  "prefabs/ui/hero/HeroSkillInfoLayer": "c403f3e0-51d9-447d-978b-81f90b52fe69",
  "prefabs/ui/hero/HeroInfoAttrLayer": "65f0e985-d8ec-4f76-92bb-57b980e4b132",
  "prefabs/ui/backpack/BackpackInfoLayer": "f151a2c1-a24a-4e5d-9d67-2096089cde82",
  "prefabs/ui/hero/HeroSelectLayer": "c75bff2b-0944-4809-9b5f-1eb8c09107f8",
  "prefabs/ui/summon/SummonLayer": "c046c79b-a2a4-4bf1-b93a-966094c105b8",
  "prefabs/ui/backpack/BackpackLayer": "6bfdfd78-65e9-403c-b7c8-7e6cd94ffebb",
  "prefabs/ui/backpack/BackpackItemCell": "c4e8a1b2-7d33-4f61-9a20-6b5e0d4c8f11",
  "prefabs/ui/backpack/BackpackTabButton": "d5f9b2c3-8e44-4072-ab31-7c6f1e5d9022",
  "prefabs/ui/hero/HeroIconCell": "e7c1a4b0-6d28-4f53-9c11-2a8b7e6d5c40",
  "prefabs/ui/common/TextChip": "1af4d7e3-905b-4286-cf44-5dbe01908f73",
  "prefabs/ui/common/InfoCard": "3c16f905-b27d-44a8-e166-7fd023b2a195",
  "prefabs/ui/common/DimSheet": "2b05e8f4-a16c-4397-d055-6ecf12a19084",
  "prefabs/ui/common/PagePrefabShell": "7a5a3d49-f6b1-48ec-85aa-b31467f6e5d9",
  "prefabs/ui/common/ListBackdrop": "5e381b27-d49f-46ca-a388-91f245d4c3b7",
  "prefabs/ui/battle/HangMissionChip": "4d270a16-c38e-45b9-f277-80e134c3b2a6",
  "prefabs/ui/chapter/ChapterStageChip": "6f492c38-e5a0-47db-b499-a20356e5d4c8",
  "prefabs/ui/chapter/ChapterMapLayer": "8a6b4e50-17c2-49fd-96bb-c42578a7f6ea",
  "prefabs/ui/mail/MailLayer": "42a4160b-5cca-41b5-beb4-520375f560e0",
  "prefabs/ui/quick-battle/QuickBattleLayer": "9a050b3e-fbe8-4ee8-827c-5eba14ceb8ae",
};

const prefabPending = new Map<string, Promise<Prefab>>();

/** 清掉路径缓存。加载失败的下次本来就会再试；检查要换掉成功结果时用这个。 */
export function clearPrefabCache(): void {
  prefabPending.clear();
}

/** 同一路径共用一次加载。预热和进城挂载不要各解一遍。失败删掉，下次还能再试。 */
export function loadPrefab(assetPath: string): Promise<Prefab> {
  if (!prefabInPlan(assetPath)) return Promise.reject(new Error("该界面不在当前重做计划内：" + assetPath));
  const cached = prefabPending.get(assetPath);
  if (cached) return cached;
  const pending = loadPrefabOnce(assetPath);
  prefabPending.set(assetPath, pending);
  pending.catch(() => {
    if (prefabPending.get(assetPath) === pending) prefabPending.delete(assetPath);
  });
  return pending;
}

function loadPrefabOnce(assetPath: string): Promise<Prefab> {
  const parsed = splitAssetPath(assetPath);
  return loadBundlePrefab(parsed.bundle, parsed.inner).catch((bundleErr: unknown) => {
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
  return { bundle: assetPath.slice(0, slash), inner: assetPath.slice(slash + 1) };
}

function loadBundlePrefab(bundleName: string, inner: string): Promise<Prefab> {
  return new Promise((resolve, reject) => {
    assetManager.loadBundle(bundleName, (err, bundle) => {
      if (err || !bundle) {
        reject(err || new Error("没有 bundle " + bundleName));
        return;
      }
      bundle.load(inner, Prefab, (loadErr, asset) => {
        if (loadErr || !asset) {
          reject(loadErr || new Error("bundle 里没有 " + inner));
          return;
        }
        resolve(asset);
      });
    });
  });
}

function loadUuidPrefab(uuid: string): Promise<Prefab> {
  return new Promise((resolve, reject) => {
    assetManager.loadAny({ uuid }, (err, asset) => {
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
