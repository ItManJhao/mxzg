/**
 * 挂机站位显示计算：提供单位、血条和命中特效共用的缩放及阵位坐标。
 * 保留已核实坐标规则供当前模块和针对性检查复用，不持有节点、资源或业务状态。
 */
/** 日服挂机层。底左角，和项目设计分辨率同一套 640×1280。 */
export const HANG_LAYER_W = 640;
/** 按挂机独立站位计算显示缩放和镜像坐标，不生成敌人或模拟战斗。 */
export class IdleHangSkirmishPlanUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /**
     * 战场单位、血条和命中特效共用等比缩放，避免 Fit Height 窄屏裁掉最外侧站位。
     * 最远脚点约 239，等级/血条左伸约 87，按 660 宽包围范围预留边距；宽屏不放大单位。
     * 背景、顶部栏和操作面板不参与此缩放，不能只缩英雄而留下血条或特效错位。
     */
    public static hangStageScale(visibleWidth: number): number {
        const width = Number.isFinite(visibleWidth) && visibleWidth > 0 ? visibleWidth : HANG_LAYER_W;
        return Math.min(1, width / 660);
    }

    /**
     * 阵位号落到挂机地砖。画面中心是原点。
     * 1–4 前排，5–8 后排，四行拉开。我方在左朝右，敌方是镜像、朝左。
     * 位号小于 1 时站前排第一行。超过 8 的号按 8 格循环，避免叠到中线。
     */
    public static hangFormationPoint(position: number, ally: boolean): HangSpot {
        const slot = IdleHangSkirmishPlanUtils.wholeIndex(position);
        const raw = slot < 1 ? 0 : (slot - 1) % HANG_CAST_LIMIT;
        const row = raw % HANG_ROW_Y.length;
        const lane = raw < 4 ? HANG_FRONT_X : HANG_BACK_X;
        const stagger = (row - 1.5) * 16;
        const dir = ally ? -1 : 1;
        const x = Math.round(dir * lane + dir * stagger * 0.35);
        const y = HANG_ROW_Y[row];
        return { x, y, face: ally ? 1 : -1 };
    }

    /** 将有限索引向下取整，非法输入回退到零。 */
    private static wholeIndex(index: number): number {
        if (!isFinite(index)) {
            return 0;
        }
        return Math.floor(index);
    }
}
/** 一侧最多 8 人：前 4（位号 1–4）后 4（位号 5–8）。 */
export const HANG_CAST_LIMIT = 8;
/** 四行从高到低。最低一行的脚停在掉落堆图标之上。 */
const HANG_ROW_Y = [96, 28, -40, -108];
/** 前排离中线的距离。后排再往外，左右不再挤在中间。 */
const HANG_FRONT_X = 96;
const HANG_BACK_X = 230;
export interface HangSpot {
    x: number;
    y: number;
    face: -1 | 1;
}
