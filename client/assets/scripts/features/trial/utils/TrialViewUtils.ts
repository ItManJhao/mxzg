/**
 * 勇者试炼共用的物品格、头像、弹窗适配和按钮监听辅助。
 * 预制体持有节点与样式；这里只接收调用方提供的展示数据。
 */
import { Button, Node, UITransform } from "cc";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagItemView } from "../../bag/ui/BagItemView";
import { BagItemCatalog } from "../../bag/utils/BagItemCatalog";
import { HeroIconCellView } from "../../hero/ui/HeroIconCellView";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";

/** 奖励预览来自当前难度或关卡的配置回包。 */
export interface TrialRewardPreview {
    readonly itemId: number;
    readonly quantity: number;
}

export class TrialViewUtils {
    /** 静态方法不持有页面或角色引用。 */
    private constructor() {}

    /** 在本页登记点击，返回用于页面关闭的同一监听清理。 */
    public static listen(button: Button, click: () => void): () => void {
        const node = button.node;
        node.on(Button.EventType.CLICK, click);
        return () => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, click);
            }
        };
    }

    /** 按完整设计面板缩放，保持原版列表、头像和按钮的相对尺寸。 */
    public static fit(root: Node, panel: UITransform): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(root);
        const scale = Math.min(1, (box.width - 18) / panel.width, (box.height - 18) / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 复用物品大小、品质和数量体系；没有对应奖品的固定格保持隐藏。 */
    public static rewards(slots: readonly Node[], preview: readonly TrialRewardPreview[]): void {
        slots.forEach((node, index) => {
            const item = preview[index];
            node.active = !!item;
            if (item) {
                node.getComponent(BagItemView)!.show(item, false, BagItemCatalog.face(item.itemId, item.quantity), true);
            }
        });
    }

    /** 将来源不同的角色按同一头像规范展示，没有守军的阵位保持空格。 */
    public static hero(node: Node, unit?: Readonly<{ templateId: number; level: number; star: number; element?: number }>): void {
        const cell = node.getComponent(HeroIconCellView)!;
        const face = unit && HeroCatalog.find(unit.templateId);
        if (unit) {
            cell.show({ kind: "catalog", name: face?.name ?? `英雄 ${unit.templateId}`, showName: false,
                face: face?.icon ?? null, elem: unit.element ?? face?.elem ?? null,
                level: unit.level, stars: unit.star, locked: false, deployed: false });
        } else {
            cell.show({ kind: "empty", name: "", showName: false, face: null, elem: null,
                level: null, stars: 0, locked: false, deployed: false });
        }
        cell.button!.enabled = false;
    }
}
