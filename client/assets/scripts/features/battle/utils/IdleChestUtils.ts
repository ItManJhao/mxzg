/** 挂机宝箱只读显示计算，由主线页面消费服务器时钟快照。
 * 不计算领取奖励，不修改持久起点；百分比取整和四档边界沿用旧BattlePanelLayer。 */
export class IdleChestUtils {
    /** 纯显示工具不允许实例化。 */
    private constructor() {}

    /** 将已接纳服务器时间外推并封顶；本地时钟回拨不产生负的经过时间。 */
    public static elapsed(serverTime: number, startedAt: number, maxSeconds: number,
        receivedAt: number, now: number): number {
        const since = Math.max(0, Math.floor((now - receivedAt) / 1000));
        return Math.max(0, Math.min(maxSeconds, serverTime - startedAt + since));
    }

    /** 先向下取整百分比再判档；无有效上限时拒绝显示，避免伪造宝箱进度。 */
    public static stage(seconds: number, maxSeconds: number): number {
        const percentage = this.percentage(seconds, maxSeconds);
        return percentage <= 2 ? 1 : percentage <= 5 ? 2 : percentage <= 10 ? 3 : 4;
    }

    /** 进度条与四档宝箱共享旧版取整百分比，避免边界显示不一致。 */
    public static percentage(seconds: number, maxSeconds: number): number {
        if (!Number.isFinite(seconds) || !Number.isFinite(maxSeconds) || maxSeconds <= 0) {
            throw new Error("挂机宝箱显示时间非法");
        }
        return Math.floor(Math.max(0, Math.min(100, seconds / maxSeconds * 100)));
    }

    /** 只生成旧版飞行表现参数；随机数取[0,1)，不用于掉落、资产或权威战报。 */
    public static flights(random: () => number = Math.random): readonly IdleResourceFlightSpec[] {
        const integer = (minimum: number, maximum: number) => minimum + Math.floor(random() * (maximum - minimum + 1));
        const count = integer(8, 12);
        return Array.from({ length: count }, () => ({
            icon: integer(0, 3),
            order: integer(1000, 10000),
            scale: 0.6 + integer(1, 40) / 200,
            x: -50 + integer(1, 100),
            y: -50 + integer(1, 100),
            scaleSeconds: 0.9 + integer(1, 20) / 200,
        }));
    }

    /** 按旧版显示两位小时和分钟，不把剩余秒数误作收益次数。 */
    public static time(seconds: number): string {
        return String(Math.floor(seconds / 3600)).padStart(2, "0") + ":"
            + String(Math.floor(seconds / 60) % 60).padStart(2, "0");
    }

    /** 同源system配置为600秒，旧版严格超过该值才出现计时气泡。 */
    public static showBubble(seconds: number): boolean {
        return seconds > 600;
    }
}

/** 一个临时资源图标的视觉参数，不包含物品数量或任何奖励结果。 */
export interface IdleResourceFlightSpec {
    /** 四种旧资源图片的下标，0至3。 */
    readonly icon: number;
    /** 旧随机叠放顺序，1000至10000，仅影响图标遮挡。 */
    readonly order: number;
    /** 起始缩放，0.605至0.8，结束时为0.6。 */
    readonly scale: number;
    /** 相对死亡点的横向偏移，设计像素。 */
    readonly x: number;
    /** 相对死亡点的纵向偏移，设计像素。 */
    readonly y: number;
    /** 缩放用时，秒；飞行动作始终为1秒。 */
    readonly scaleSeconds: number;
}
