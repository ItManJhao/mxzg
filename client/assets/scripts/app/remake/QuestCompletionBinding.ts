/** 连接已提交的成就事件与场景顶部横幅。同一时间显示一条，换号后清理提示队列。 */
import { GameLog } from "../../core/GameLog";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import type { QuestCompletion } from "../../features/quest/data/QuestState";
import { QuestCompletionView } from "../../features/quest/ui/QuestCompletionView";

export class QuestCompletionBinding {
    /** 未展示的成就，按服务器顺序消费，离开角色时清空。 */
    private readonly queue: QuestCompletion[] = [];
    /** 当前角色本次会话已接纳的成就编号，避免重复消息重播。 */
    private readonly known = new Set<number>();
    /** 绑定只在主城内容准备好后消费队列。 */
    private ready = false;
    /** 当前横幅打开尝试，换号时清空，拒绝迟到回调。 */
    private showing: object | null = null;
    /** 应用卸载时解除全局成就事件监听。 */
    private readonly stop: () => void;

    /** @param openAchievements 当前应用导航提供的成就页打开入口。 */
    public constructor(private readonly openAchievements: () => boolean) {
        this.stop = EventDispatcher.instance.on("quest.completed", this, this.enqueue);
    }

    /** 主城就绪时恢复消费，离开游戏时关闭仍显示的横幅。 */
    public setReady(ready: boolean): void {
        this.ready = ready;
        if (ready) {
            this.showNext();
        } else {
            UIManager.instance.closeById("quest-completion");
        }
    }

    /** 移除上一角色的待播通知及当前横幅。 */
    public resetSession(): void {
        this.ready = false;
        this.showing = null;
        this.known.clear();
        this.queue.length = 0;
        UIManager.instance.closeById("quest-completion");
    }

    /** 释放订阅并清空所有待展示通知。 */
    public dispose(): void {
        this.stop();
        this.resetSession();
    }

    /** 接纳本会话从未收到过的成就，并唤醒横幅播放。 */
    private enqueue(entries: readonly QuestCompletion[]): void {
        for (const entry of entries) {
            if (!this.known.has(entry.id)) {
                this.known.add(entry.id);
                this.queue.push(entry);
            }
        }
        this.showNext();
    }

    /** 显示队首，关闭后下一帧再取下一条，防止复用正在释放的窗口。 */
    private showNext(): void {
        if (!this.ready || this.showing || !this.queue.length) {
            return;
        }
        const entry = this.queue.shift()!;
        const display = {};
        this.showing = display;
        const finished = (): void => {
            if (this.showing === display) {
                this.showing = null;
                setTimeout(() => this.showNext(), 0);
            }
        };
        void UIManager.instance.open(QuestCompletionView, { title: entry.title, openAchievements: this.openAchievements })
            .then(view => view.onViewClose(finished))
            .catch(error => {
                if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    GameLog.shared.classified("MODULE", "warn", "QuestCompletionBinding", String(error));
                }
                finished();
            });
    }
}
