/**
 * 个人空间显示当前账号资料及已保存的主线英雄，并打开各独立的设置和编辑窗口。
 * 用户操作交给 RoleController，资料与阵容读取各自的唯一快照。调试手势由应用按环境启用。
 */
import { _decorator, Button, Label, Node, view as ccView } from "cc";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry, type ViewClass } from "../../../framework/ui/UIRegistry";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import type { OwnedHero } from "../../hero/data/HeroSnapshotUtils";
import { HeroAttributesView } from "../../hero/ui/HeroAttributesView";
import { HeroCatalog } from "../../hero/utils/HeroCatalog";
import { HeroRosterEvent } from "../../hero/utils/HeroRosterEvent";
import type { AccountModel } from "../AccountModel";
import type { RoleProfile } from "../AccountModel";
import type { RoleController } from "../RoleController";
import { RolePortraitUtils } from "../utils/RolePortraitUtils";
import { RolePersonalChoiceView } from "./RolePersonalChoiceView";
import { RolePersonalChoiceUtils } from "../utils/RolePersonalChoiceUtils";
import { RoleRenameView } from "./RoleRenameView";
import { RoleSettingsView } from "./RoleSettingsView";

const { ccclass, property } = _decorator;
/** 当前资料页的个人空间徽章点击满十次后触发一次调试入口。 */
const GM_BADGE_TAP_COUNT = 10;

/** 应用层注入唯一账号状态与既有操作，不携带凭证或另存角色快照。 */
export interface RoleProfileOpenArgs {
    /** 唯一角色资料来源，打开订阅、关闭退订。 */
    model: AccountModel;
    /** 角色的形象、称号与改名操作入口。 */
    controller: RoleController;
    /** 区服目录显示名，调用方找不到时传同一角色的区服 ID。 */
    serverName: string;
    /** 用户明确点击退出时交回账号服务。 */
    logout: () => void;
    /** 应用允许调试入口时注入，资料页检测到徽章手势后调用。 */
    onOpenGm?: (owner: RoleProfileView) => void;
}
@UIRegistry.view({
    id: "role-profile",
    prefab: "bundles/module/role/prefabs/RoleProfileView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RoleProfileView")
export class RoleProfileView extends BaseView<RoleProfileOpenArgs> {
    /** 覆盖背景里完整「个人空间」徽章的无动画按钮。 */
    @property(Button) gmBadgeButton: Button | null = null;
    /** 服务器昵称，长昵称按预制区域收缩。 */
    @property(Label) nickname: Label | null = null;
    /** 服务端分配的公开数字编号，以字符串完整展示。 */
    @property(Label) roleId: Label | null = null;
    /** 角色等级，不是英雄等级。 */
    @property(Label) level: Label | null = null;
    /** 当前所属公会名称，随角色统一快照更新。 */
    @property(Label) guildLabel: Label | null = null;
    /** 独立头像资源节点。 */
    @property(Node) face: Node | null = null;
    /** 独立头像框资源节点。 */
    @property(Node) border: Node | null = null;
    /** 关闭资料页按钮。 */
    @property(Button) closeButton: Button | null = null;
    /** 点击资料头像定位装饰窗的头像页。 */
    @property(Button) portraitButton: Button | null = null;
    /** 打开二次改名窗口。 */
    @property(Button) renameButton: Button | null = null;
    /** 打开图鉴形象选择。 */
    @property(Button) imageButton: Button | null = null;
    /** 打开个人称号目录。 */
    @property(Button) titleButton: Button | null = null;
    /** 打开系统设置子窗口。 */
    @property(Button) settingsButton: Button | null = null;
    /** 固定的主线展示位，排列由预制体的 Layout 处理。 */
    @property([Button]) showcaseButtons: Button[] = [];
    /** 与展示按钮同序的英雄头像，不替换角色顶栏头像。 */
    @property([Node]) showcaseFaces: Node[] = [];
    /** 与展示按钮同序的格内等级。 */
    @property([Label]) showcaseLevels: Label[] = [];
    /** 与英雄格同序的原星级品质框。 */
    @property([Node]) showcaseFrames: Node[] = [];
    /** 每个英雄格五枚星标，按格位顺序绑定。 */
    @property([Node]) showcaseStars: Node[] = [];
    /** 十星以上的原徽章和加星数字，按英雄格绑定。 */
    @property([Label]) showcaseHighStars: Label[] = [];
    /** 区分尚未同步阵容和保存阵容为空。 */
    @property(Label) emptyShowcase: Label | null = null;
    /** 当前已显示的主线英雄实例，点击从这一轮展示取 ID，关闭时清空。 */
    private showcased: readonly OwnedHero[] = [];

    /** 打开资料窗并订阅当前角色，应用启用时开始本次徽章点击计数。 */
    public onOpen(args?: RoleProfileOpenArgs): void {
        if (!args?.model.snapshot.role) {
            throw new Error("角色尚未初始化，不能打开资料");
        }
        this.bindButtons(args);
        this.bindGmGesture(args.onOpenGm);
        this.ownListener(args.model.subscribe(state => {
            if (state.busy || !state.role) {
                this.close();
                return;
            }
            this.render(state.role);
        }));
        this.ownListener(EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.renderShowcase));
        this.render(args.model.snapshot.role);
        this.renderShowcase();
        this.fit();
        ccView.on("canvas-resize", this.fit, this);
        this.ownListener(() => ccView.off("canvas-resize", this.fit, this));
    }

    /** 关闭时作废展示数据，BaseView 将解绑本轮监听并关闭下属窗口。 */
    public onClose(): void {
        this.showcased = [];
    }

    /** 注册个人空间的四个子窗和展示格子。 */
    private bindButtons(args: RoleProfileOpenArgs): void {
        this.bindButton(this.closeButton, () => this.close());
        const choice = { account: args.model, role: args.controller };
        this.bindButton(this.portraitButton, () => this.openWindow(RolePersonalChoiceView, { ...choice, mode: "head" }));
        this.bindButton(this.imageButton, () => this.openWindow(RolePersonalChoiceView, { ...choice, mode: "image" }));
        this.bindButton(this.titleButton, () => this.openWindow(RolePersonalChoiceView, { ...choice, mode: "title" }));
        this.bindButton(this.renameButton, () => this.openWindow(RoleRenameView, args));
        this.bindButton(this.settingsButton, () => this.openWindow(RoleSettingsView, args));
        if (!this.emptyShowcase || this.showcaseButtons.length !== 8
            || this.showcaseFaces.length !== 8 || this.showcaseLevels.length !== 8
            || this.showcaseFrames.length !== 8 || this.showcaseStars.length !== 40
            || this.showcaseHighStars.length !== 8) {
            throw new Error("角色资料的英雄展示位未绑定");
        }
        this.showcaseButtons.forEach((button, index) => this.bindButton(button, () => {
            const hero = this.showcased[index];
            if (hero?.panelStats) {
                this.openWindow(HeroAttributesView, { heroId: hero.id });
            } else if (hero) {
                UIManager.instance.toast("英雄属性尚未同步");
            }
        }));
    }

    /** 子窗归当前资料页所有，打开失败通过全局飘字反馈。 */
    private openWindow<T>(view: ViewClass<T>, args: T): void {
        const ui = UIManager.instance;
        void ui.openChild(this, view, args).catch(error => {
            if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                ui.toast("窗口打开失败，请重试");
            }
        });
    }

    /** 保存注册时的节点，组件随窗口销毁后仍可安全移除本次点击监听。 */
    private bindButton(button: Button | null, action: () => void): void {
        if (!button) {
            throw new Error("角色详情按钮未绑定");
        }
        const node = button.node;
        node.on(Button.EventType.CLICK, action);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action);
            }
        });
    }

    /** 开窗时开始对徽章计数，满十次把当前资料页作为调试菜单宿主，关窗时退订。 */
    private bindGmGesture(openGm: RoleProfileOpenArgs["onOpenGm"]): void {
        if (this.gmBadgeButton) {
            this.gmBadgeButton.interactable = !!openGm;
        }
        if (!openGm) {
            return;
        }
        let taps = 0;
        this.bindButton(this.gmBadgeButton, () => {
            taps += 1;
            if (taps === GM_BADGE_TAP_COUNT) {
                taps = 0;
                openGm(this);
            }
        });
    }

    /** 用最新角色更新昵称、编号、等级、公会与头像。 */
    private render(role: Readonly<RoleProfile>): void {
        if (!this.nickname || !this.roleId || !this.level || !this.guildLabel) {
            throw new Error("角色详情资料未绑定");
        }
        this.nickname.string = role.nickname;
        this.roleId.string = "角色 ID：" + (role.publicId ?? "未同步");
        this.level.string = String(role.level);
        this.guildLabel.string = role.guildName === undefined ? "暂未同步" : role.guildName || "未加入";
        RolePortraitUtils.paint(this.face, this.border, role.basics?.headId, role.basics?.borderId);
    }

    /** 按已保存阵容的站位显示已拥有英雄，旧版助战位排除在外。 */
    private renderShowcase(): void {
        const { mainFormation, heroes } = HeroRosterModel.instance.snapshot;
        this.showcased = (mainFormation?.slots ?? [])
            .filter(slot => slot.position < 9)
            .sort((left, right) => left.position - right.position)
            .map(slot => heroes.find(hero => hero.id === slot.heroId))
            .filter((hero): hero is OwnedHero => !!hero);
        const empty = this.emptyShowcase!;
        empty.node.active = this.showcased.length === 0;
        empty.string = mainFormation ? "主线阵容尚未上阵英雄" : "等待主线阵容同步";
        this.showcaseButtons.forEach((button, index) => {
            const hero = this.showcased[index];
            button.node.active = !!hero;
            if (!hero) {
                return;
            }
            const face = HeroCatalog.find(hero.templateId)?.icon ?? "hero/ui/hero-icon_spr-default";
            ResManager.setSprite(this.showcaseFaces[index], face, () => this.showcased[index] === hero);
            ResManager.setSprite(this.showcaseFrames[index], RolePersonalChoiceUtils.heroFrame(hero.star),
                () => this.showcased[index] === hero);
            this.showcaseLevels[index].string = String(hero.level);
            const marker = RolePersonalChoiceUtils.heroStarMarkers(hero.star);
            const high = this.showcaseHighStars[index];
            high.node.parent!.active = hero.star >= 10;
            high.string = hero.star > 10 ? String(hero.star - 10) : "";
            this.showcaseStars.slice(index * 5, (index + 1) * 5).forEach((star, starIndex) => {
                star.active = hero.star < 10 && starIndex < marker.count;
                if (star.active) {
                    ResManager.setSprite(star, marker.icon, () => this.showcased[index] === hero);
                }
            });
        });
    }

    /** 适配资料面板的整体比例，共享模态层负责屏幕遮罩。 */
    private fit(): void {
        const size = ccView.getVisibleSize();
        const scale = Math.min(1, size.width / 640, size.height / 880);
        this.node.setScale(scale, scale, 1);
    }

}
