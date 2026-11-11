/**
 * 英雄列表的页面容器、背景及窗口挂载。
 * 由 Remake 注册入口调用，只装配现有 Prefab，不创建旧详情或旧业务入口。
 */
import { Node, Prefab, Sprite, UITransform } from "cc";

import { messageOf } from "../../../core/errors";

import { GameLog } from "../../../core/GameLog";

import { ResManager } from "../../../framework/assets/ResManager";

import { loadPrefab, spawnPrefab } from "../../../framework/assets/PrefabLoader";

import { mountCcbiView } from "../../../framework/ui/PrefabLayout";

import { assignContentSize, bindVisibleRefresh, fitVisibleRoot } from "../../../framework/ui/visibleFit";

const PAGE_SHELL = "bundles/common/prefabs/PagePrefabShell";

const LIST_BACKDROP = "bundles/common/prefabs/ListBackdrop";

const HERO_BACKDROP = ["maps/ui/map-bg-role-1"];

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
        GameLog.shared.classified("MODULE", "warn", "Hero", "英雄底图没有挂上 " + messageOf(err));
    }
    if (!host.isValid) throw new Error("页面已关");
    const parent = shell && shell.isValid ? shell : host;
    const view = spawnPrefab(layer, parent);
    mountCcbiView(view);
    return view;
}

function paintBackdrop(pack: Node): void {
    const art = pack.getChildByName("ShellBackdrop");
    if (!art) {
        GameLog.shared.classified("MODULE", "warn", "Hero", "ListBackdrop 下没有 ShellBackdrop");
        return;
    }
    const sprite = art.getComponent(Sprite);
    if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    ResManager.setSprite(art, HERO_BACKDROP);
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
