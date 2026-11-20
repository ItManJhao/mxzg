/**
 * 绑定 BattlePage 的技能横幅和数字模板，在每次真实血量变化时播放独立的飘字。
 * 临时数字随动画结束移除，也由战场现有特效集合在停止播放时清理。
 */
import { BitmapFont, instantiate, Label, Node, tween, UIOpacity, UITransform } from "cc";
import { PrefabLoader } from "../../../framework/assets/PrefabLoader";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { BattleNumberKind } from "../utils/BattleNumberUtils";
import { BattleNumberPaintUtils } from "./BattleNumberPaintUtils";
import {
    BATTLE_FLOAT_ROOT_PATH,
    BATTLE_FLOAT_TEMPLATE_PATH,
    BATTLE_SKILL_NAME_BANNER_PATH,
    BATTLE_SKILL_NAME_LABEL_PATH,
} from "./BattlePrefabLayoutUtils";
import { BATTLE_FLOAT_SECONDS, BattlePresentationUtils } from "./BattlePresentationUtils";

export interface BattlePresentMount {
    /** 受击数字的共用显示层，坐标由各目标实际位置换算。 */
    floatRoot: Node;
    /** 隐藏模板，每个命中从它独立创建一个数字。 */
    floatTemplate: Node;
    /** 本战场预载的字库，缺失项使用同色系统字。 */
    numberFonts: ReadonlyMap<BattleNumberKind, BitmapFont>;
    skillBanner: Node;
    skillLabel: Node;
}

/** 战斗显示工具，绑定预制体静态挂点并播放临时数字。 */
export class BattlePresentViewUtils {
    /** 只提供静态展示入口。 */
    private constructor() {}

    /** 绑定预制体挂点，保持技能横幅与数字模板初始隐藏。 */
    public static bindBattlePresent(root: Node): BattlePresentMount {
        const floatRoot = PrefabLoader.requireNode(root, BATTLE_FLOAT_ROOT_PATH);
        const floatTemplate = PrefabLoader.requireNode(root, BATTLE_FLOAT_TEMPLATE_PATH);
        UiKitUtils.setText(floatTemplate, "");
        floatTemplate.active = false;
        const skillBanner = PrefabLoader.requireNode(root, BATTLE_SKILL_NAME_BANNER_PATH);
        const skillLabel = PrefabLoader.requireNode(root, BATTLE_SKILL_NAME_LABEL_PATH);
        UiKitUtils.setText(skillLabel, "");
        skillBanner.active = false;
        return { floatRoot, floatTemplate, numberFonts: new Map(), skillBanner, skillLabel };
    }

    /**
     * 在命中目标旁播放服务端报告值。每次独立生成，群攻和连续命中的数字可以同时存在。
     * @param height 数字起点离目标脚底的战场像素数。
     * @param hurt 报告伤害为负，报告治疗为正；零值不生成数字。
     * @param speed 当前战斗播放倍率。
     * @param effects 本战场登记的临时特效，结束后按节点移除，退出时统一取消。
     */
    public static showHealthChange(
        mount: BattlePresentMount,
        target: Node,
        height: number,
        hurt: number,
        kind: BattleNumberKind,
        ally: boolean,
        speed: number,
        effects: Set<Node>,
    ): void {
        const text = BattlePresentationUtils.floatHurtText(hurt);
        if (!text) {
            return;
        }
        const direction = ally ? -1 : 1;
        const point = mount.floatRoot.getComponent(UITransform)!.convertToNodeSpaceAR(target.worldPosition);
        const x = point.x - direction * 80;
        const y = point.y + height;
        const node = instantiate(mount.floatTemplate);
        const opacity = node.addComponent(UIOpacity);
        node.name = "BattleHealthFloat";
        node.setPosition(x, y, 0);
        node.setScale(0.6, 0.6, 1);
        BattleNumberPaintUtils.applyBattleNumberFont(node.getComponent(Label)!, kind, text, mount.numberFonts);
        node.parent = mount.floatRoot;
        node.active = true;
        effects.add(node);

        const drift = 20 + Math.floor(Math.random() * 11);
        tween(node).to(BATTLE_FLOAT_SECONDS / speed, {}, {
            onUpdate: (_target, ratio = 0) => {
                const frame = BattlePresentationUtils.bounceAt(ratio * BATTLE_FLOAT_SECONDS, direction, drift);
                node.setPosition(x + frame.x, y + frame.y, 0);
                node.setScale(frame.scale, frame.scale, 1);
                opacity.opacity = frame.opacity;
            },
        }).call(() => {
            effects.delete(node);
            node.destroy();
        }).start();
    }
}
