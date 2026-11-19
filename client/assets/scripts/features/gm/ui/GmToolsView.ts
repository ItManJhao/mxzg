/**
 * 角色与时间 GM 窗口：收集角色等级、目标关卡和北京时间，将操作交给 GM 控制器。
 * 预制体管理布局，操作结果统一飘字。关闭后不再展示本次窗口的迟到结果。
 */
import { _decorator, Button, EditBox, Label } from "cc";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { MainChapterModel } from "../../battle/MainChapterModel";
import type { GmToolsArgs } from "../data/GmViewArgs";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "gm-tools",
    prefab: "bundles/module/gm/prefabs/GmToolsView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: false },
})
@ccclass("GmToolsView")
export class GmToolsView extends BaseView<GmToolsArgs> {
    /** 当前测试角色说明。 */
    @property(Label) owner: Label | null = null;
    /** 仅显示开关和全局测试时间影响范围。 */
    @property(Label) message: Label | null = null;
    /** 当前角色的目标等级。 */
    @property(EditBox) levelInput: EditBox | null = null;
    /** 需要打开挑战的关卡序号。 */
    @property(EditBox) chapterInput: EditBox | null = null;
    /** 北京时间，年、月、日、时、分、秒按指定格式输入。 */
    @property(EditBox) timeInput: EditBox | null = null;
    /** 提交角色目标等级。 */
    @property(Button) levelButton: Button | null = null;
    /** 提交主线下一挑战关卡。 */
    @property(Button) chapterButton: Button | null = null;
    /** 按输入调整当前测试服实例游戏时钟。 */
    @property(Button) setTimeButton: Button | null = null;
    /** 读取服务器当前游戏时间，通过全局飘字显示。 */
    @property(Button) readTimeButton: Button | null = null;
    /** 撤销测试时钟偏移。 */
    @property(Button) resetTimeButton: Button | null = null;
    /** 返回 GM 总菜单。 */
    @property(Button) closeButton: Button | null = null;
    /** 开关确认且无操作在途时为真，关闭窗口时清空。 */
    private readyForOperation = false;

    /** 从现有快照填入当前等级和下一关，确认 GM 开关后允许发送操作。 */
    onOpen(args: GmToolsArgs): void {
        this.args = args;
        this.owner!.string = "当前角色：" + args.nickname;
        const roleLevel = args.readRoleLevel?.();
        const chapter = MainChapterModel.instance.state;
        this.levelInput!.string = roleLevel === undefined ? "" : String(roleLevel);
        this.chapterInput!.string = chapter?.challengeLimit && chapter.maxCleared < chapter.challengeLimit
            ? String(chapter.maxCleared + 1) : "";
        this.timeInput!.string = "";
        this.message!.string = "正在检查服务端 GM 开关…";
        ViewportLayoutUtils.fitVisibleRoot(this.node);
        this.bindButton(this.closeButton!, () => this.close());
        this.bindButton(this.levelButton!, () => void this.perform("设置等级", async () => {
            const level = this.positiveInteger(this.levelInput!.string, "角色等级");
            await args.controller.setLevel(level);
            return "角色等级已设为 " + level;
        }));
        this.bindButton(this.chapterButton!, () => void this.perform("设置关卡", async () => {
            const mission = this.positiveInteger(this.chapterInput!.string, "关卡");
            await args.controller.setChapter(mission);
            return "下一挑战关卡已设为第 " + mission + " 关";
        }));
        this.bindButton(this.setTimeButton!, () => void this.perform("设置服务器时间", async () => {
            const unixSeconds = this.shanghaiUnixSeconds(this.timeInput!.string);
            const time = await args.controller.setServerTime(unixSeconds);
            return "服务器时间已更新 " + this.formatTime(time.serverTimeMs);
        }));
        this.bindButton(this.readTimeButton!, () => void this.perform("获取服务器时间", async () => {
            const time = await args.controller.getServerTime();
            return "当前服务器时间 " + this.formatTime(time.serverTimeMs)
                + (time.overridden ? "（测试时间）" : "");
        }));
        this.bindButton(this.resetTimeButton!, () => void this.perform("恢复服务器时间", async () => {
            const time = await args.controller.setServerTime(0);
            return "已恢复实际时间 " + this.formatTime(time.serverTimeMs);
        }));
        this.setReady(false);
        void this.readStatus(args);
    }

    /** 查询服务端 GM 可用状态，忽略窗口关闭后的回包。 */
    private async readStatus(args: GmToolsArgs): Promise<void> {
        try {
            const enabled = await args.controller.enabled();
            if (this.args === args) {
                this.message!.string = enabled ? "时间调整影响当前测试服实例。"
                    : "服务端 GM 已关闭。";
                this.setReady(enabled);
            }
        } catch (error) {
            if (this.args === args) {
                this.message!.string = "服务端 GM 状态暂不可用。";
                UIManager.instance.toast("GM 状态检查失败：" + ErrorUtils.messageOf(error));
            }
        }
    }

    /** 同一时间仅发出一次操作，成功或错误均通过全局飘字。 */
    private async perform(action: string, run: () => Promise<string>): Promise<void> {
        const args = this.args;
        if (!args || !this.readyForOperation) {
            return;
        }
        this.setReady(false);
        let enabled = true;
        try {
            const message = await run();
            if (this.args === args) {
                UIManager.instance.toast(message);
            }
        } catch (error) {
            enabled = (error as { code?: string } | null)?.code !== "GM_DISABLED";
            if (this.args === args) {
                UIManager.instance.toast(action + "失败：" + ErrorUtils.messageOf(error));
            }
        } finally {
            if (this.args === args) {
                this.setReady(enabled);
            }
        }
    }

    /** 拒绝空输入、小数及超出协议有符号整数范围的值。 */
    private positiveInteger(input: string, name: string): number {
        const value = Number(input.trim());
        if (!/^\d+$/.test(input.trim()) || !Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
            throw new Error("请输入有效的" + name + "整数");
        }
        return value;
    }

    /** 将北京时间文本转成 Unix 秒，拒绝自动进位的不存在日期。 */
    private shanghaiUnixSeconds(input: string): number {
        const date = input.trim().replace("T", " ");
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
            throw new Error("请按 年-月-日 时:分:秒 输入北京时间");
        }
        const milliseconds = Date.parse(date.replace(" ", "T") + "+08:00");
        if (!Number.isFinite(milliseconds) || milliseconds <= 0 || this.formatTime(milliseconds) !== date) {
            throw new Error("请输入有效的北京时间");
        }
        return milliseconds / 1000;
    }

    /** 以北京时间显示权威回包，浏览器所在时区不影响结果。 */
    private formatTime(milliseconds: number): string {
        return new Date(milliseconds + 8 * 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
    }

    /** 禁止重复点击或在开关未确认时提交，关闭按钮始终可用。 */
    private setReady(ready: boolean): void {
        this.readyForOperation = ready;
        for (const button of [this.levelButton, this.chapterButton, this.setTimeButton, this.readTimeButton, this.resetTimeButton]) {
            button!.interactable = ready;
        }
    }

    /** 底层窗口关闭时自动移除本次监听。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => node.off(Button.EventType.CLICK, action));
    }

    /** 撤销窗口的反馈权，不打断已发送的服务端操作。 */
    onClose(): void {
        this.args = undefined;
        this.readyForOperation = false;
    }
}
