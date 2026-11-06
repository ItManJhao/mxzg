/** 应用级提示服务：复用场景中序列化的提示节点，登录前和主城外也可显示；不创建业务页面。 */
import { Label, Node } from "cc";
import { GameLog } from "../../core/GameLog";
import { TrackedTimers } from "../../framework/TrackedTimers";

export class ApplicationNotice {
    /** 当前提示的自动隐藏任务；替换提示和应用结束时取消。 */
    private timer: ReturnType<typeof setTimeout> | null = null;
    /** 场景拥有提示面板及文字，本服务只切换显示，不销毁宿主。 */
    constructor(private readonly panel: Node | null, private readonly label: Label | null) { }

    /** 显示最近一条提示，默认四秒；无可用UI时记录明确错误，不静默丢弃。 */
    public show(text: string, durationMs = 4000): void {
        this.dispose();
        if(!text) return;
        if(!this.panel?.isValid || !this.label?.isValid) {
            GameLog.shared.classified("APP", "error", "ApplicationNotice", text);
            return;
        }
        this.label.string = text;
        this.panel.active = true;
        if(durationMs > 0) this.timer = TrackedTimers.timeout(() => this.dispose(), durationMs);
    }

    /** 隐藏提示并清除拥有的计时器；重复调用安全。 */
    public dispose(): void {
        if(this.timer !== null) TrackedTimers.clear(this.timer);
        this.timer = null;
        if(this.panel?.isValid) this.panel.active = false;
    }
}
