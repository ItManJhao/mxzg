/**
 * 战斗结算展示：由 CampaignView 挂载已有 BattleEndLayer，展示服务端战报和完整奖励列表。
 * 确认交回调用方：战斗触发领取，挂机已到账收据仅翻页或关闭；本文件不发奖或推算掉落。
 * 弹层随页面关闭销毁；无评分规则的服务端结算不显示星级评价。
 */
import { BlockInputEvents,Color,view as gameView,HorizontalTextAlignment,Label,Node,Overflow,Sprite,UITransform,VerticalTextAlignment } from "cc";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { bindVisibleRefresh,fitVisibleRoot } from "../../../framework/ui/visibleFit";


import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { loadPrefab,spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { bindTap,findDescendant,liftNode,mountCcbiView } from "../../../framework/ui/PrefabLayout";
import { createButton,createLabel,createRect,paintRect,place,setText,uiNode } from "../../../framework/ui/UiKit";

const RESULT_WIN = ResourceCatalog.battle.battle_end_lang_lbl_result_1.path;
const RESULT_LOSE = ResourceCatalog.battle.battle_end_lang_lbl_result_0.path;

export const BATTLE_END_PREFAB = ResourceCatalog.prefab_battle.BattleEndLayer.assetPath;

export interface BattleEndOptions {
    stageId?: number;
    /** 胜利才出现。点了先关结算，再由调用方开下一关。 */
    onNext?: () => void;
    roleLevel?: number;
    rewards?: { itemType: number; num: number; icon: string }[];
    confirmText?: string;
    receiptTitle?: string;
}

/**
 * 盖在战斗页上。胜负换 spr_result 的横幅，不写进最佳萌神的名字格。
 * 「5秒后关闭」藏起来，不自动关。战斗确定回挂机，下一关走 btn_report；收据使用调用方标题与回调。
 * 挂机壳在页面最上层时，结算改挂到壳里面，避免被壳挡住。
 */
export async function mountBattleEnd(
    parent: Node,
    win: boolean | null,
    onClose: () => void,
    options?: BattleEndOptions
): Promise<Node | null> {
    try {
        const prefab = await loadPrefab(BATTLE_END_PREFAB);
        if (!parent.isValid) return null;
        const hold = uiNode("BattleEndHold");
        const ui = hold.addComponent(UITransform);
        // 遮罩按实际视口覆盖；设计宽640不等于所有设备的可见宽。
        const visibleSize = gameView.getVisibleSize();
        ui.setContentSize(visibleSize.width, visibleSize.height);
        hold.addComponent(BlockInputEvents);
        place(createRect("dim", visibleSize.width, visibleSize.height, new Color(8, 16, 32, 160)), hold, 0, 0);
        const view = spawnPrefab(prefab, hold);
        mountCcbiView(view);
        const headline = options?.receiptTitle || (win === true ? "胜利" : win === false ? "失败" : "胜负未带");
        paintResultBanner(view, win);
        hideShellText(view, "lbl_hero_name");
        hideShellText(view, "UILabelTTF_1");
        hideShellText(view, "lbl_hero_nums");
        hideShellText(view, "lbl_role_exp_num");
        paintRoleLevel(view, options?.roleLevel);
        const fail = findDescendant(view, "lbl_faild");
        if (fail) {
            if (win === false) {
                fail.active = true;
            } else if (win === null) {
                fail.active = true;
                setText(fail, options?.receiptTitle ? "" : "胜负未带");
            } else {
                fail.active = false;
            }
        }
        const timer = findDescendant(view, "lbl_time");
        if (timer) timer.active = false;
        paintStars(view, win === true && options?.rewards === undefined);
        paintClearRewards(view, win === true ? options && options.stageId : undefined, options?.rewards, !!options?.receiptTitle);
        if (options?.receiptTitle) {
            hideShellText(view, "spr_wing");
            const title = findDescendant(view, "lbl_role_lv"); if (title) { title.active = true; setText(title, options.receiptTitle); }
        }
        const confirm = findDescendant(view, "btn_confirm");
        if (confirm) {
            caption(confirm, options?.confirmText || "回挂机");
            liftNode(confirm, view);
            bindTap(confirm, onClose);
        } else {
            place(createButton("回挂机", onClose, 200, 52), hold, 0, -420);
        }
        const next = findDescendant(view, "btn_report");
        if (next) {
            if (win === true && options && options.onNext) {
                next.active = true;
                caption(next, "下一关");
                liftNode(next, view);
                const go = options.onNext;
                bindTap(next, () => {
                    if (hold.isValid) hold.destroy();
                    go();
                });
            } else {
                next.active = false;
            }
        }
        const shell = parent.getChildByName("PagePrefabShell");
        const host = shell && shell.isValid && shell.active ? shell : parent;
        hold.parent = host;
        hold.setSiblingIndex(Math.max(0, host.children.length - 1));
        if (options?.rewards !== undefined) bindVisibleRefresh(hold, () => {
            if (hold.isValid && view.isValid) layoutServerResult(hold, view, win === true);
        });
        GameLog.shared.classified("MODULE", "info", "Mainline", "BattleEndLayer " + headline);
        return hold;
    } catch (err) {
        GameLog.shared.classified("MODULE", "warn", "Mainline", "BattleEndLayer " + messageOf(err));
        return null;
    }
}

/** 按视口适配现有服务端结算展示；遮罩同时更新尺寸和 Graphics 绘制，避免宽屏两侧漏遮挡。 */
function layoutServerResult(hold: Node, panel: Node, won: boolean): void {
    fitVisibleRoot(hold);
    const { width, height } = gameView.getVisibleSize();
    hold.getComponent(UITransform)?.setContentSize(width, height);
    const dim = hold.getChildByName("dim");
    dim?.getComponent(UITransform)?.setContentSize(width, height);
    if (dim) paintRect(dim, new Color(8, 16, 32, 160));
    const scale = Math.min(width * 0.9 / 640, height * 0.72 / 730);
    panel.setScale(scale, scale, 1);
    panel.setPosition(-320 * scale, -365 * scale + 35, 0);
    for (const name of ["show_hero", "CCSprite_2", "CCSprite_3", "spr_photo", "spr_photo_bg", "role_exp", "CCScale9Sprite_1"])
        hideShellText(panel, name);
    const move = (name: string, x: number, y: number) => findDescendant(panel, name)?.setPosition(x, y, 0);
    move("spr_bg", 320, 365);
    move("spr_wing", 320, 650);
    move("spr_result", 320, 640);
    move("lbl_role_lv", 320, 505);
    const level = findDescendant(panel, "lbl_role_lv");
    if (level) {
        level.getComponent(UITransform)?.setContentSize(400, 48);
        const label = level.getComponent(Label);
        if (label) { label.horizontalAlign = HorizontalTextAlignment.CENTER; label.fontSize = 28; label.lineHeight = 36; }
    }
    const rewardsTitle = findDescendant(panel, "CCSprite_1");
    if (rewardsTitle) rewardsTitle.active = won;
    move("CCSprite_1", 320, 430);
    move("show_rich", 320, 300);
    move("lbl_faild", 320, 340);
    move("btn_confirm", 320, 90);
}

/** 按当前结算展示星星，只改变既有显示节点，不推断或发放奖励。 */
function paintStars(view: Node, win: boolean): void {
    const old = view.getChildByName("EndStars");
    if (old) old.destroy();
    if (!win) return;
    const host = findDescendant(view, "show_hero") || view;
    const row = uiNode("EndStars");
    place(row, host, 0, -36);
    for (let i = 0; i < 3; i++) {
        const star = uiNode("star");
        const ui = star.addComponent(UITransform);
        ui.setContentSize(28, 28);
        const sprite = star.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        place(star, row, (i - 1) * 34, 0);
        paintFrame(star, ResourceCatalog.hero.hero_info_spr_star_1.path);
    }
}

function paintResultBanner(view: Node, win: boolean | null): void {
    const banner = findDescendant(view, "spr_result");
    if (!banner) return;
    if (win === null) {
        banner.active = false;
        return;
    }
    if (!win) {
        banner.active = true;
        paintFrame(banner, RESULT_LOSE);
        return;
    }
    banner.active = false;
    paintFrame(banner, RESULT_WIN, () => {
        if (banner.isValid) banner.active = true;
    });
}

/** 仅展示调用方明确提供的等级，缺失时隐藏等级节点。 */
function paintRoleLevel(view: Node, supplied?: number): void {
    const node = findDescendant(view, "lbl_role_lv");
    if (!node) return;
    const synced = supplied !== undefined;
    const level = supplied ?? 0;
    if (!synced || level < 1) {
        node.active = false;
        return;
    }
    node.active = true;
    setText(node, "Lv " + level);
}

function hideShellText(view: Node, name: string): void {
    const node = findDescendant(view, name);
    if (node) node.active = false;
}

/** 绘制调用方传入的真实奖励；首通全部横排，挂机由调用方分页后以三列两行展示。 */
function paintClearRewards(view: Node, stageId: number | undefined, supplied?: { itemType: number; num: number; icon: string }[], grid = false): void {
    const stacks = supplied;
    const host = findDescendant(view, "show_rich") || view;
    const old = host.getChildByName("EndRewards");
    if (old) old.destroy();
    if (!stacks || stacks.length === 0) return;
    const row = uiNode("EndRewards");
    place(row, host, 0, 0);
    const shown = stacks.length;
    for (let i = 0; i < shown; i++) {
        const stack = stacks[i];
        const icon = stack.icon || ResourceCatalog.bag.backpack_spr_default.path;
        const cell = uiNode("reward");
        const ui = cell.addComponent(UITransform);
        ui.setContentSize(64, 64);
        const sprite = cell.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        place(cell, row, grid ? (i % 3 - 1) * 120 : (i - (shown - 1) / 2) * 72, grid ? 80 - Math.floor(i / 3) * 120 : 0);
        paintFrame(cell, icon);
        const count = createLabel(String(stack.num), supplied ? 20 : 14, { color: new Color(255, 248, 220, 255), width: 64, height: supplied ? 28 : 18 });
        const countLabel = count.getComponent(Label);
        if (countLabel) {
            countLabel.overflow = Overflow.SHRINK;
            countLabel.verticalAlign = VerticalTextAlignment.CENTER;
        }
        place(count, cell, 0, supplied ? -48 : -18);
    }
}

function caption(node: Node, text: string): void {
    const parentUi = node.getComponent(UITransform);
    const boxW = parentUi && parentUi.contentSize.width > 8 ? Math.max(8, parentUi.contentSize.width - 8) : 0;
    const boxH = parentUi && parentUi.contentSize.height > 8 ? Math.max(8, parentUi.contentSize.height - 8) : 0;
    let found = false;
    const stack: Node[] = [node];
    while (stack.length > 0) {
        const cur = stack.pop() as Node;
        const label = cur.getComponent(Label);
        if (label) {
            label.string = text;
            label.overflow = Overflow.SHRINK;
            label.horizontalAlign = HorizontalTextAlignment.CENTER;
            label.verticalAlign = VerticalTextAlignment.CENTER;
            const ui = cur.getComponent(UITransform);
            if (ui && boxW > 0 && boxH > 0 && (ui.contentSize.width < 8 || ui.contentSize.height < 8)) {
                ui.setContentSize(boxW, boxH);
            }
            found = true;
        }
        const kids = cur.children;
        for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    }
    if (!found) {
        const w = boxW > 0 ? boxW : 120;
        const h = boxH > 0 ? boxH : 28;
        const font = Math.max(12, Math.min(20, Math.floor(Math.min(w, h) * 0.36)));
        const made = createLabel(text, font, { color: new Color(255, 248, 220, 255), width: w, height: h });
        const madeLabel = made.getComponent(Label);
        if (madeLabel) {
            madeLabel.overflow = Overflow.SHRINK;
            madeLabel.verticalAlign = VerticalTextAlignment.CENTER;
        }
        place(made, node, 0, 0);
    }
}

/** 结算横幅归显示节点持有，关闭销毁后忽略结果并释放资源。 */
function paintFrame(node: Node, path: string, onReady?: () => void): void {
    const sprite = node.getComponent(Sprite);
    if (!sprite) return;
    try {
        ResourceAssetsUtils.loadForNode(node, path + "/spriteFrame", "SpriteFrame", (err, asset) => {
            if (err || !asset || !node.isValid) {
                if (err) GameLog.shared.classified("MODULE", "warn", "Mainline", "结算横幅 " + path + " 没有挂上");
                return;
            }
            sprite.spriteFrame = asset;
            if (onReady) onReady();
        });
    } catch (_err) {
        return;
    }
}
