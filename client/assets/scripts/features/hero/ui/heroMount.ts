import { Node, Prefab, Sprite, UITransform } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { StoreHero } from "../../../core/GameStore";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { mountCcbiView } from "../../../ui/pagePrefabShell";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot } from "../../../ui/visibleFit";
import { HeroInfoView } from "./HeroInfoView";

const PAGE_SHELL = "prefabs/ui/common/PagePrefabShell";
const LIST_BACKDROP = "prefabs/ui/common/ListBackdrop";
const HERO_BACKDROP = ["ui/maps/map-bg-role-1"];

/**
 * 把英雄列表 Prefab 盖进页面宿主。岩洞底和羊皮纸跟原来的壳一样。
 * 这里只认已知预制的直接子节点，不在 HeroListView 里搜整棵树。
 */
export async function mountHeroListPage(host: Node, layer: Prefab): Promise<Node> {
  let shell: Node | null = null;
  try {
    const shellPrefab = await loadPrefab(PAGE_SHELL);
    const backdropPrefab = await loadPrefab(LIST_BACKDROP);
    if (!host.isValid) throw new Error("页面已关");
    const pack = spawnPrefab(backdropPrefab, host);
    pack.name = "ListBackdrop";
    paintBackdrop(pack);
    shell = spawnPrefab(shellPrefab, host);
    shell.name = "PagePrefabShell";
    const backdrop = host.getChildByName("ListBackdrop");
    if (backdrop && backdrop.parent !== shell) {
      backdrop.parent = shell;
      backdrop.setSiblingIndex(0);
    }
    bindVisibleRefresh(shell, () => {
      if (!shell || !shell.isValid) return;
      const box = fitVisibleRoot(shell);
      stretchBackdrop(shell, box.width, box.height);
    });
  } catch (err) {
    GameLog.shared.warn("Hero", "英雄底图没有挂上 " + messageOf(err));
  }
  if (!host.isValid) throw new Error("页面已关");
  const parent = shell && shell.isValid ? shell : host;
  const view = spawnPrefab(layer, parent);
  mountCcbiView(view);
  return view;
}

/**
 * 详情盖在页面壳上，不挂进已经缩放的列表，避免立绘跟着羊皮纸缩小。
 * 调用方已经备好 HeroInfoLayer。这里同步挂上，不等立绘资源。
 */
export function openHeroDetail(host: Node | null, infoPrefab: Prefab | null, hero: StoreHero): Node | null {
  if (!host || !host.isValid || !infoPrefab) return null;
  const old = host.getChildByName("HeroDetailSheet");
  if (old) old.destroy();
  const sheet = new Node("HeroDetailSheet");
  sheet.parent = host;
  sheet.setSiblingIndex(Math.max(0, host.children.length - 1));
  const card = spawnPrefab(infoPrefab, sheet);
  const info = card.getComponent(HeroInfoView);
  if (!info) {
    GameLog.shared.warn("Hero", "HeroInfoLayer 上没有 HeroInfoView");
    return sheet;
  }
  info.show(hero);
  return sheet;
}

function paintBackdrop(pack: Node): void {
  const art = pack.getChildByName("ShellBackdrop");
  if (!art) {
    GameLog.shared.warn("Hero", "ListBackdrop 下没有 ShellBackdrop");
    return;
  }
  const sprite = art.getComponent(Sprite);
  if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  paintSpritePaths(art, HERO_BACKDROP);
}

function stretchBackdrop(root: Node, width: number, height: number): void {
  if (!(width > 1) || !(height > 1)) return;
  const pack = root.getChildByName("ListBackdrop");
  if (!pack) return;
  assignContentSize(pack.getComponent(UITransform), width, height);
  const ui = pack.getComponent(UITransform);
  if (ui) ui.setAnchorPoint(0.5, 0.5);
  pack.setPosition(0, 0, 0);
  const names = ["ShellBackdropDim", "ShellBackdrop"];
  for (let i = 0; i < names.length; i++) {
    const node = pack.getChildByName(names[i]);
    if (!node) continue;
    assignContentSize(node.getComponent(UITransform), width, height);
    const childUi = node.getComponent(UITransform);
    if (childUi) childUi.setAnchorPoint(0.5, 0.5);
    node.setPosition(0, 0, 0);
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  }
}
