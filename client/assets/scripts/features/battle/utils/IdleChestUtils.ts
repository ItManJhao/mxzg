/** 挂机宝箱显示与收取表现的纯计算，由主线页面消费服务器时钟快照。
 * 不发送领取请求、不计算奖励或修改持久起点；取整、四档和显示门槛沿用旧BattlePanelLayer。 */
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

    /**
     * 按旧频率加5秒计算显示等待时间，当前frequency=60时显示门槛为65秒。
     * @param seconds 从已接纳快照推算的显示秒数；不足一秒向下取整，回拨按0秒显示。
     * @param frequency 同一服务端快照中的收益周期，单位为秒。
     * @param maxSeconds 同一快照的显示上限，单位为秒，不用于重新计算领取资格。
     * @returns 0表示显示时间已到门槛，正数为还需等待的秒数；null表示封顶显示无法确认门槛。
     * 上限低于门槛时不显示“可领取”；null只代表展示不可判定，不定义新的玩法限制。
     */
    public static claimWaitSeconds(seconds: number, frequency: number, maxSeconds: number): number | null {
        if (!Number.isFinite(seconds) || !Number.isSafeInteger(frequency) || frequency <= 0
            || !Number.isSafeInteger(frequency + 5) || !Number.isSafeInteger(maxSeconds) || maxSeconds <= 0) {
            throw new Error("挂机宝箱领取显示时间非法");
        }
        const minimumSeconds = frequency + 5;
        if (maxSeconds < minimumSeconds) {
            return null;
        }
        const displayedSeconds = Math.floor(Math.max(0, Math.min(seconds, maxSeconds)));
        return Math.max(0, minimumSeconds - displayedSeconds);
    }

    /** 返回对应旧宝箱档位的真实收取动作名；只接受1至4，不将非法档位回退成其他表现。 */
    public static collectAnimation(stage: number): string {
        if (!Number.isInteger(stage) || stage < 1 || stage > 4) {
            throw new Error("挂机宝箱收取档位无效");
        }
        return "collect-" + stage;
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
