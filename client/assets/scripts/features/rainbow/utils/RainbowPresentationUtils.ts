/**
 * 彩虹圣殿的只读展示辅助。由地图、挑战和记录窗口使用，
 * 复用服务端神位数据、共用资源映射和服务器时钟，不保存业务状态。
 */
import { Button, Node, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ServerClock } from "../../../core/ServerClock";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import type { RainbowSeat } from "../../../platform/Protocol";
import { BattleSpineService, type SpineActor } from "../../battle/ui/BattleSpineService";
import { HERO_SKIN_MODELS } from "../../hero/utils/HeroPortraitData";

export class RainbowPresentationUtils {
    /** 展示辅助不持有页面实例和资源。 */
    private constructor() {}

    /** 在当前页面登记按钮监听；返回关闭或虚拟列表回收时的退订。 */
    public static bindButton(button: Button, action: () => void): () => void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        return () => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        };
    }

    /** 保持预制体设计的面板比例，窄屏等比收进可见区。 */
    public static fitPanel(root: Node, panel: UITransform): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(root);
        const scale = Math.min(1, box.width / panel.width, box.height / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 从原语言表读取圣殿标题、规则和各动作提示。 */
    public static language(key: number): string {
        return GameConfig.instance.requireConfig(GConfig.Language, key).value ?? "";
    }

    /** 将旧表以万为单位的百分比投影为客户端文案，例如 300 显示为 3%。 */
    public static bonus(raw: number): string {
        return (raw / 100) + "%";
    }

    /** 冷却结束时间由服务器给出，单位是 Unix 毫秒。 */
    public static remaining(until: number): number | null {
        const now = ServerClock.instance.nowSeconds();
        return now === null ? null : Math.max(0, Math.ceil(until / 1000) - now);
    }

    /** 使用统一服务器时刻计算的非负秒数生成时分秒。 */
    public static countdown(seconds: number): string {
        const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
        return parts.map(value => String(value).padStart(2, "0")).join(":");
    }

    /** 原角色形象或守军的星级外观，用于同一神位定期同步时去重加载。 */
    public static skinId(seat: RainbowSeat): number {
        // 原角色形象以高位记录星级，低八位仍是英雄模板。
        const image = seat.owner?.imageId;
        const template = image ? image % 100_000_000 : seat.heroTypeId;
        const star = image ? Math.floor(image / 100_000_000) : seat.heroStar;
        const shape = HERO_SKIN_MODELS[template];
        if (!shape) {
            return template;
        }
        const [limits, models] = shape;
        const index = limits.findIndex(limit => limit >= star);
        return models[index < 0 ? models.length - 1 : index] ?? template;
    }

    /** 挂载旧模型的原待机姿态；持有者在关页或换人时销毁挂载节点。 */
    public static mountStand(host: Node, skin: number, scale: number): SpineActor {
        return BattleSpineService.instance.mountBattleSpine(host, String(skin), () => {}, { scale, seatY: 0 });
    }
}
