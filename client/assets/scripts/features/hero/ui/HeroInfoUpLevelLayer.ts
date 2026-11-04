/** 复用普通升级 Prefab 的条件/属性展示与单次操作；只持有本页预览，写结果由会话 Controller 同步。 */
import { _decorator, Button, Label } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { HeroLevelController } from "../HeroLevelController";
import type { HeroLevelPreview } from "../HeroLevelApi";
import { SocketFailure } from "../../../platform/GameSocketClient";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
const { ccclass, property } = _decorator;
interface Arguments { heroId: string; name: string; controller: HeroLevelController; }
const messages: Record<string, string> = {
READY: "每次升一级", LEVEL_LIMIT: "已达当前等级上限，突破/升星未开放", INSUFFICIENT_GOLD: "金币不足", INSUFFICIENT_HERO_EXP: "英雄经验不足",
    HERO_LEVEL_CHANGED: "等级已变化，请刷新后重试", IDEMPOTENCY_CONFLICT: "请求标识冲突，请重新打开", HERO_NOT_FOUND: "英雄不存在或不属于当前角色", HERO_CONFIG_UNAVAILABLE: "升级配置暂不可用"
};

@ccclass("HeroInfoUpLevelLayer")
export class HeroInfoUpLevelLayer extends BaseView<Arguments> {
    @property(Label) title: Label | null = null;
    @property(Label) level: Label | null = null;
    @property(Label) gold: Label | null = null;
    @property(Label) experience: Label | null = null;
    @property(Label) attack: Label | null = null;
    @property(Label) hp: Label | null = null;
    @property(Label) defense: Label | null = null;
    @property(Label) speed: Label | null = null;
    @property(Label) status: Label | null = null;
    @property(Label) upgradeTitle: Label | null = null;
    @property(Button) upgradeButton: Button | null = null;
    @property(Button) backButton: Button | null = null;
    private epoch = 0;
    private data: HeroLevelPreview | null = null;
    private submitting = false;

    /** 打开时绑定一次按钮并读取当前会话条件；所有静态坐标留在 Prefab。 */
    onOpen(args?: Arguments): void {
        super.onOpen(args); this.epoch++; this.data = null; this.submitting = false;
        if (!args) throw new Error("普通升级缺少英雄实例");
        if (this.title) this.title.string = args.name;
        this.upgradeButton?.node.on(Button.EventType.CLICK, this.submit, this);
        this.backButton?.node.on(Button.EventType.CLICK, this.close, this);
        void this.refresh();
    }
    /** 查询失败保留可重试入口，不显示旧英雄的成功状态。 */
    private async refresh(): Promise<void> {
        const epoch = ++this.epoch; this.paint("读取升级条件…");
        try {
            const data = await this.args!.controller.preview(this.args!.heroId);
            if (epoch !== this.epoch) return;
            if (data.cost) {
                const cost = GameConfig.instance.requireConfig(GConfig.HeroLevel, data.hero.level);
                if (cost.gold_need !== data.cost.gold || cost.exp_need !== data.cost.experience) throw new Error("客户端与服务端升级配置不一致");
            }
            this.data = data; this.paint();
        } catch (error) { if (epoch === this.epoch) this.paint(this.message(error)); }
    }
    /** 提交期间抑制连点；关闭后仍由 Controller 完成资产提交，仅停止本页绘制。 */
    private async submit(): Promise<void> {
        if (this.submitting) return;
        if (!this.data) { await this.refresh(); return; }
        const epoch = this.epoch; this.submitting = true; this.paint("升级中…");
        try {
            const result = await this.args!.controller.upgrade(this.args!.heroId, this.data.hero.level);
            if (epoch !== this.epoch) return;
            this.data = result; this.submitting = false; this.paint("升级成功");
        } catch (error) {
            if (epoch !== this.epoch) return;
            this.submitting = false;
            const message = this.message(error);
            await this.refresh();
            if (epoch + 1 === this.epoch) this.paint(message + "；可重试");
        }
    }
    /** 展示服务端当前/下一属性与所需/持有资产，不提前扣款或改变名册。 */
    private paint(message?: string): void {
        const d = this.data;
        if (this.status) this.status.string = message || (d ? messages[d.status] : "读取失败，点击重试");
        const retry = this.args?.controller.needsConfirmation;
        if (this.upgradeButton) this.upgradeButton.interactable = !this.submitting && !this.args?.controller.busy && (!d || d.status === "READY" || !!retry);
        if (this.upgradeTitle) this.upgradeTitle.string = this.submitting ? "提交中" : retry ? "确认上次升级" : d ? "升一级" : "重试";
        if (!d) return;
        if (this.level) this.level.string = "Lv" + d.hero.level + (d.next ? " → " + (d.hero.level + 1) : "") + " / " + d.levelLimit;
        if (this.gold) this.gold.string = "金币：" + (d.cost?.gold || "—") + " / 持有 " + d.gold;
        if (this.experience) this.experience.string = "英雄经验：" + (d.cost?.experience || "—") + " / 持有 " + d.experience;
        const rows = [[this.attack, "攻击", d.current.atk, d.next?.atk], [this.hp, "生命", d.current.hp, d.next?.hp],
        [this.defense, "防御", d.current.def, d.next?.def], [this.speed, "速度", d.current.spd, d.next?.spd]] as const;
        for (const [label, name, current, next] of rows) if (label) label.string = name + " " + current + (next !== undefined ? " → " + next : "");
    }
    /** 稳定错误码映射本功能文案，网络不确定结果仍沿用同一逻辑请求重试。 */
    private message(error: unknown): string { return error instanceof SocketFailure && messages[error.code] ? messages[error.code] : error instanceof Error ? error.message : "升级失败"; }
    /** 关闭只解绑页面并作废绘制，不能取消已经送达服务器的会话级升级。 */
    onClose(): void {
        this.epoch++; this.upgradeButton?.node.off(Button.EventType.CLICK, this.submit, this); this.backButton?.node.off(Button.EventType.CLICK, this.close, this);
    }
}
