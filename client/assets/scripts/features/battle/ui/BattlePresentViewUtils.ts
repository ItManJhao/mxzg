/**
 * 把进战表现写进 #163 的 Prefab 挂点。
 * 只改已有节点的字和显隐，不新建 FloatDmg / SkillNameBanner / HeadAnchor。
 * 缺字段就藏起，不写成 0，也不留编辑器占位（-12345、圣光打击、Lv.1、三色 buff）。
 * 不发协议，不加载 PVR。
 */
import { Color, Label, Node } from "cc";
import { BattleNumberUtils } from "../utils/BattleNumberUtils";
import { BattleNumberPaintUtils } from "./BattleNumberPaintUtils";
import { BATTLE_FLOAT_CRIT_PATH, BATTLE_FLOAT_SLOT_COUNT, BATTLE_SKILL_NAME_BANNER_PATH, BATTLE_SKILL_NAME_LABEL_PATH, BattlePrefabLayoutUtils } from "./BattlePrefabLayoutUtils";
import { BATTLE_CRIT_BUBBLE, BattleFloatCue, BattlePresentationUtils } from "./BattlePresentationUtils";
import { PrefabLoader } from "../../../framework/assets/PrefabLoader";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
export interface BattlePresentMount {
    floats: Node[];
    crit: Node;
    skillBanner: Node;
    skillLabel: Node;
}
/** 战斗显示绑定工具：更新既有技能横幅、飘字格与英雄头顶信息；页面负责静态结构和关闭清理。 */
export class BattlePresentViewUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 绑 Prefab 上的挂点。缺一个就抛错，调用方退回代码 UI。 */
    public static bindBattlePresent(root: Node): BattlePresentMount {
        const floats: Node[] = [];
        for (let i = 0; i < BATTLE_FLOAT_SLOT_COUNT; i++) {
            const path = BattlePrefabLayoutUtils.battleFloatDmgPath(i);
            if (!path) {
                throw new Error("飘字序号超出 Prefab " + i);
            }
            const node = PrefabLoader.requireNode(root, path);
            UiKitUtils.setText(node, "");
            node.active = false;
            floats.push(node);
        }
        const crit = PrefabLoader.requireNode(root, BATTLE_FLOAT_CRIT_PATH);
        crit.active = false;
        const skillBanner = PrefabLoader.requireNode(root, BATTLE_SKILL_NAME_BANNER_PATH);
        const skillLabel = PrefabLoader.requireNode(root, BATTLE_SKILL_NAME_LABEL_PATH);
        UiKitUtils.setText(skillLabel, "");
        skillBanner.active = false;
        return { floats, crit, skillBanner, skillLabel };
    }

    /**
     * 按顺序写入 FloatDmg_0..3。没用到的藏起。有暴击才打开 FloatCrit。
     * pages 和 floats 对齐，是受击者的页面坐标。有坐标就挪到那个人头顶，不另建节点。
     * 没有坐标时留在 Prefab 的预览位置。
     */
    public static paintBattleFloats(mount: BattlePresentMount, floats: BattleFloatCue[], pages?: ({
        x: number;
        y: number;
    } | null)[]): void {
        const shown = BattlePresentationUtils.visibleFloats(floats);
        let critPage: {
            x: number;
            y: number;
        } | null = null;
        for (let i = 0; i < mount.floats.length; i++) {
            const node = mount.floats[i];
            if (!node || !node.isValid) {
                continue;
            }
            if (i >= shown.length) {
                UiKitUtils.setText(node, "");
                node.active = false;
                continue;
            }
            const text = BattlePresentationUtils.floatHurtText(shown[i].hurt);
            if (!text) {
                UiKitUtils.setText(node, "");
                node.active = false;
                continue;
            }
            UiKitUtils.setText(node, text);
            const label = node.getComponent(Label);
            if (label) {
                const heal = shown[i].hurt > 0;
                const crit = shown[i].crit === true && !heal;
                const kind = BattleNumberUtils.battleNumberKind(heal, crit);
                if (!BattleNumberPaintUtils.applyBattleNumberFont(label, kind, text)) {
                    label.fontSize = crit ? 40 : 32;
                    label.lineHeight = crit ? 44 : 36;
                    label.isBold = true;
                    label.color = crit
                        ? new Color(255, 214, 64, 255)
                        : heal
                            ? new Color(72, 210, 96, 255)
                            : new Color(255, 72, 56, 255);
                }
            }
            node.active = true;
            const page = pages && i < pages.length ? pages[i] : null;
            if (page) {
                BattlePresentViewUtils.placeFloat(node, page.x, page.y + 78 - i * 28);
                if (shown[i].crit && !critPage) {
                    critPage = page;
                }
            }
        }
        if (!mount.crit.isValid) {
            return;
        }
        if (!BattlePresentationUtils.beatShowsCrit(floats)) {
            mount.crit.active = false;
            return;
        }
        UiKitUtils.setText(mount.crit, BATTLE_CRIT_BUBBLE);
        mount.crit.active = true;
        if (critPage) {
            BattlePresentViewUtils.placeFloat(mount.crit, critPage.x - 72, critPage.y + 96);
        }
    }

    /** 把页面坐标转换为飘字父容器局部坐标并更新已有节点。 */
    private static placeFloat(node: Node, pageX: number, pageY: number): void {
        const parent = node.parent;
        const ox = parent ? parent.position.x : 0;
        const oy = parent ? parent.position.y : 0;
        node.setPosition(pageX - ox, pageY - oy, 0);
    }
}
