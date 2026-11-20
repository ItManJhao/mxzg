/**
 * 战斗飘字和头顶信息的展示规则。战报提供数值，视图按旧版轨迹取样。
 * 工具不保存播放进度，也不修改战斗或奖励状态。
 */
/** 旧版三次弹跳和随后的渐隐总时长，单位为战斗秒。 */
export const BATTLE_FLOAT_SECONDS = 1.6;
export const BATTLE_BUFF_SLOT_COUNT = 3;
/** 旧版每跳 0.3 秒的高度和横向起止偏移，单位为战场像素。 */
const JUMPS = [
    { height: 100, from: 0, to: 15 },
    { height: 60, from: 15, to: 25 },
    { height: 20, from: 25, to: 30 },
];
export interface BattleOverhead {
    /** plan.slots 下标。只含报告里真正带上的英雄，不含补位。 */
    slot: number;
    /** 没有 level 字段时是 null，不写成 0。出现的 0 仍是 0。 */
    level: number | null;
    /** 没有 buffs 字段时是 null。空数组表示列表在，但没有图标。 */
    buffIds: number[] | null;
}
/** 战斗表现计算工具，统一飘字、等级与状态数量的展示规则。 */
export class BattlePresentationUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 把服务端给出的等级转换为头顶文字；缺失等级返回 null。 */
    public static overheadLevelText(level: number | null): string | null {
        if (level === null) {
            return null;
        }
        return "Lv." + String(level);
    }

    /** 将非零血量变化转换为带符号浮字；零值或无效值返回空文本。 */
    public static floatHurtText(hurt: number): string {
        if (typeof hurt !== "number" || !isFinite(hurt) || hurt === 0) {
            return "";
        }
        if (hurt < 0) {
            return String(hurt);
        }
        return "+" + String(hurt);
    }

    /**
     * 返回相对起点的位移、大小和透明度。三次抛物线弹跳后沿水平方向滑出并淡隐。
     * @param seconds 战斗时间，未除以播放倍率。
     * @param direction 我方为 -1，敌方为 1。
     * @param drift 最后一段离开时继续移动的像素数，旧版取 20～30。
     */
    public static bounceAt(seconds: number, direction: number, drift: number): {
        x: number; y: number; scale: number; opacity: number;
    } {
        let scale = 0.5;
        if (seconds < 0.3) {
            scale = 0.6 + 0.65 * (1 - Math.cos(seconds / 0.3 * Math.PI / 2));
        } else if (seconds < 0.6) {
            scale = 1.25 - 0.75 * Math.sin((seconds - 0.3) / 0.3 * Math.PI / 2);
        }
        if (seconds >= 0.9) {
            const progress = Math.min(1, (seconds - 0.9) / 0.7);
            return {
                x: (30 + drift * progress) * direction,
                y: 0,
                scale,
                opacity: Math.round(255 * Math.cos(progress * Math.PI / 2)),
            };
        }
        const index = Math.min(JUMPS.length - 1, Math.floor(seconds / 0.3));
        const jump = JUMPS[index];
        const progress = (seconds - index * 0.3) / 0.3;
        return {
            x: (jump.from + (jump.to - jump.from) * progress) * direction,
            y: 4 * jump.height * progress * (1 - progress),
            scale,
            opacity: 255,
        };
    }

    /** 限制显示的状态图标数量；缺失状态列表返回 null。 */
    public static visibleBuffCount(buffIds: number[] | null): number | null {
        if (buffIds === null) {
            return null;
        }
        if (buffIds.length <= 0) {
            return 0;
        }
        return buffIds.length < BATTLE_BUFF_SLOT_COUNT ? buffIds.length : BATTLE_BUFF_SLOT_COUNT;
    }
}
