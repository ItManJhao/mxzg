/**
 * 主线 BattleInfo 的已核实展示规则，供播放器与回归检查共用。
 * 依据旧 BattleReportBaseLayer、BattleData 和 battletype；不读取账号、不授予 VIP 权限或结算奖励。
 */
export class BattleInfoUtils {
    /** 纯展示规则不允许实例化。 */
    private constructor() {}

    /** 旧主线 type=1 的 skip_battle=0；等级或充值条件不能越过战斗类型的可见性。 */
    public static mainChapterSkipVisible(): boolean {
        return false;
    }

    /** 旧战报默认档实际为1.5倍；另外两档未恢复权威羁绊状态，暂不开放。 */
    public static defaultTimeScale(): number {
        return 1.5;
    }

    /** 明示下一档的旧条件及当前缺口，不将未知VIP状态解释为已解锁。 */
    public static speedLockedNotice(): string {
        return "第二档需羁绊 VIP 1，第三档需羁绊 VIP 5；羁绊状态尚未接入，当前保留默认档";
    }

    /** 按640设计宽等比收窄，宽屏保持原尺寸；留出左右各12设计像素。 */
    public static contentScale(width: number): number {
        return Math.min(1, Math.max(0.1, (width - 24) / 640));
    }
}
