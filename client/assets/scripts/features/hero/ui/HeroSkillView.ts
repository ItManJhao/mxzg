/**
 * 英雄技能只读说明窗口：由 UIManager 打开，读取当前英雄实例与共享配置。
 * 不发送查询、不修改资产；英雄删除或切换角色时关闭，关窗释放事件。
 */
import { _decorator, Button, Label, view as ccView } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { RemakeConfigUtils } from "../../../config/RemakeConfigUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroSkillUtils } from "../utils/HeroSkillUtils";

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-skill",
    prefab: "bundles/module/hero/prefabs/HeroSkillView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
    prepare: RemakeConfigUtils.prepareHeroDetailConfig,
})
@ccclass("HeroSkillView")
export class HeroSkillView extends BaseView<{ heroId: string; slot: number }> {
    /** 技能名称，由同等级语言配置提供。 */
    @property(Label) title: Label | null = null;
    /** 当前等级或强化解锁条件。 */
    @property(Label) status: Label | null = null;
    /** 当前等级效果；锁定时明确展示一级预览。 */
    @property(Label) description: Label | null = null;
    /** 关闭按钮，只关闭技能窗口。 */
    @property(Button) closeButton: Button | null = null;
    /** 页面关闭后为true，忽略关闭后迟到的展示刷新；账号变化由应用统一关闭页面。 */
    private closed = true;

    /** 绑定只读更新并缩放已有面板；不发送技能查询。 */
    onOpen(args: { heroId: string; slot: number }): void {
        this.args = args;
        this.closed = false;
        const size = ccView.getVisibleSize();
        const scale = Math.min(1, size.width * .92 / 560, size.height * .85 / 520) / ViewportLayoutUtils.ancestorScale(this.node);
        this.node.setScale(scale, scale, 1);
        this.closeButton?.node.on(Button.EventType.CLICK, this.close, this);
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        this.refresh();
    }

    /** 同步后重新读取同一技能；英雄删除或换号立即关闭。 */
    private refresh(): void {
        if (this.closed) {
            return;
        }
        const model = HeroRosterModel.instance;
        const hero = model.snapshot.heroes.find(row => row.id === this.args?.heroId);
        if (!hero) {
            this.close();
            return;
        }
        const skill = HeroSkillUtils.present(hero)[this.args!.slot];
        if (!skill?.id || !skill.available) {
            this.close();
            return;
        }
        if (this.title) this.title.string = skill.name;
        if (this.status) {
            this.status.string = HeroSkillUtils.status(skill) + (skill.level === 0 ? " · 一级效果预览" : "");
        }
        if (this.description) {
            this.description.string = skill.description.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "");
        }
    }

    /** 清理订阅及按钮，避免关窗后收到旧角色更新。 */
    onClose(): void {
        this.closed = true;
        EventDispatcher.instance.offTarget(this);
        this.closeButton?.node.off(Button.EventType.CLICK, this.close, this);
        this.args = undefined;
    }
}
