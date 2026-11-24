/**
 * 英雄技能只读说明窗口：由 UIManager 打开，读取当前英雄实例与共享配置。
 * 通用获得反馈可传冻结的只读技能，不依赖后来名册；不发送查询或修改资产，关窗释放事件。
 */
import { _decorator, Button, Label, view as ccView } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroSkillUtils, HeroSkillFace } from "../utils/HeroSkillUtils";

/** 当前实例技能或真实获得回执的冻结技能，二者只能选择一种来源。 */
export interface HeroSkillArgs {
    /** 当前名册的真实持久实例；冻结获得说明不传此值。 */
    readonly heroId?: string;
    /** 四个技能槽的位置，从0开始。 */
    readonly slot: number;
    /** 已由通用获得窗按真实回执成长字段投影，不跟随当前名册变化。 */
    readonly readonlyFace?: HeroSkillFace;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero-skill",
    prefab: "bundles/module/hero/prefabs/HeroSkillView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("HeroSkillView")
export class HeroSkillView extends BaseView<HeroSkillArgs> {
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

    /** 实例说明订阅名册，冻结获得说明复制原技能；不发送查询或反推发放时成长。 */
    onOpen(args: HeroSkillArgs): void {
        if (!args || !Number.isInteger(args.slot) || args.slot < 0 || args.slot > 3
            || (!!args.heroId === !!args.readonlyFace)
            || (args.readonlyFace && (!args.readonlyFace.id || !args.readonlyFace.available
                || typeof args.readonlyFace.name !== "string" || typeof args.readonlyFace.description !== "string"))) {
            throw new Error("英雄技能说明来源无效");
        }
        this.args = { ...args, readonlyFace: args.readonlyFace ? Object.freeze({ ...args.readonlyFace }) : undefined };
        this.closed = false;
        const size = ccView.getVisibleSize();
        const scale = Math.min(1, size.width * .92 / 560, size.height * .85 / 520) / ViewportLayoutUtils.ancestorScale(this.node);
        this.node.setScale(scale, scale, 1);
        this.closeButton?.node.on(Button.EventType.CLICK, this.close, this);
        if (!args.readonlyFace) {
            EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        }
        this.refresh();
    }

    /** 冻结说明只读原参数；当前实例则同步读取同一技能，移除或换号立即关闭。 */
    private refresh(): void {
        if (this.closed) {
            return;
        }
        const hero = this.args?.readonlyFace ? null
            : HeroRosterModel.instance.snapshot.heroes.find(row => row.id === this.args?.heroId);
        const skill = this.args?.readonlyFace || (hero ? HeroSkillUtils.present(hero)[this.args!.slot] : null);
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

    /** 关窗清理订阅与参数，按钮仍存在时同时解除点击监听。 */
    onClose(): void {
        this.closed = true;
        EventDispatcher.instance.offTarget(this);
        const closeNode = this.closeButton?.node;
        if (closeNode?.isValid) {
            closeNode.off(Button.EventType.CLICK, this.close, this);
        }
        this.args = undefined;
    }
}
