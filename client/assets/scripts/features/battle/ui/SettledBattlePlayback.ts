/** 已结算玩法的共用展示。由玩法页面拥有战场与回收时机，播放不发送协议或授予奖励。 */
import type { Node } from "cc";
import { GameLog } from "../../../core/GameLog";
import type { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import { BattleReplayUtils } from "../utils/BattleReplayUtils";
import { BattleReplayPreview } from "./BattleReplayPreview";
import { ChapterEndView } from "./ChapterEndView";

/** 页面只接收服务端确认的胜负、冻结战报和可显示物品。 */
export interface SettledBattle {
    readonly bytes: Uint8Array;
    readonly won: boolean;
    readonly notice: string;
    readonly rewards: readonly { itemId: number; quantity: number }[];
}

/** 页面关闭随时退出演出；播放错误仍能交付已确认的胜负。 */
export class SettledBattlePlayback {
    /** 当前展示的取消函数，结束演出或关闭所属页面时调用。 */
    private stop: (() => void) | null = null;
    /** 每次启动和关闭递增，用于拒绝迟到的资源、结算窗和旧播放结果。 */
    private generation = 0;
    /** 从接受战报到结果窗关闭期间为 true。 */
    public active = false;

    /**
     * @param page 当前玩法页面，用于共同关闭结算子窗。
     * @param host 正式战报挂点，由玩法预制体提供。
     * @param title 玩法显示名，用于通用战斗的标题区域。
     * @param onShown 恢复玩法页的已有状态和操作。
     */
    public constructor(
        private readonly page: BaseView,
        private readonly host: Node,
        private readonly title: string,
        private readonly onShown: () => void,
    ) {}

    /** 开始真实战报播放，完成后打开同一套结算及统计窗口。 */
    public play(battle: SettledBattle): void {
        const generation = ++this.generation;
        this.active = true;
        let settling = false;
        const stale = () => generation !== this.generation;
        const settle = async () => {
            if (stale() || settling) {
                return;
            }
            settling = true;
            const { units, names } = BattleReplayUtils.parse(battle.bytes);
            const finish = () => {
                if (!stale()) {
                    this.close();
                    this.onShown();
                }
            };
            try {
                await UIManager.instance.openChild(this.page, ChapterEndView, {
                    won: battle.won, rewards: battle.rewards, notice: battle.notice, units, names,
                    settledBattle: true, onClosed: finish,
                });
            } catch {
                finish();
            }
        };
        const failed = (error: unknown) => {
            if (!stale()) {
                GameLog.shared.classified("MODULE", "warn", "SettledBattlePlayback", `${this.title}战报播放失败：${String(error)}`);
                void settle();
            }
        };
        void BattleReplayPreview.open(this.host, battle.bytes, false, undefined, undefined, this.title,
            true, settle, false, stale, undefined, undefined, `${this.title}阵容`, failed).then(stop => {
            if (stale()) {
                stop();
            } else {
                this.stop = stop;
            }
        }, failed);
    }

    /** 关页或结束结算时终止播放和迟到窗口，不改变已到账的奖励。 */
    public close(): void {
        this.generation++;
        this.stop?.();
        this.stop = null;
        this.active = false;
    }
}
