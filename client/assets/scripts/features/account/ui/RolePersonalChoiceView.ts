/**
 * 个人空间统一装饰窗。外层页签决定查询及操作，形象保留原星级内页签。
 * 装备状态读取账号快照，资格按进入的页签由角色控制器查询。
 */
import { _decorator, Button, Label, Node, ScrollView, UITransform } from "cc";
import { ServerClock } from "../../../core/ServerClock";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BagModel } from "../../bag/BagModel";
import { BagEvent } from "../../bag/utils/BagEvent";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import type { AccountModel } from "../AccountModel";
import { type OwnedRoleTitle, type RoleController, type RoleDecorations, RoleProfileEvent } from "../RoleController";
import {
    RolePersonalChoiceUtils, type DecorationTab, type RoleImageChoice, type RolePortraitChoice,
} from "../utils/RolePersonalChoiceUtils";
import { RolePersonalChoiceCell, type RoleChoiceCellData } from "./RolePersonalChoiceCell";

const { ccclass, property } = _decorator;

/** 对应预制体横向按钮的显示顺序。 */
const TABS: readonly DecorationTab[] = ["head", "border", "image", "honor", "title"];
/** 三类独立查询；头像、框和贵重标记共用同一份资格结果。 */
type Catalog = "portraits" | "image" | "title";

/** 由个人空间指定首个页签，切换在同一实例内完成。 */
export interface RolePersonalChoiceArgs {
    /** 进窗定位的外层页签。 */
    readonly mode: DecorationTab;
    /** 当前资料和已使用装饰的权威快照。 */
    readonly account: AccountModel;
    /** 负责装饰资格、使用和激活协议。 */
    readonly role: RoleController;
}

@UIRegistry.view({
    id: "role-personal-choice",
    prefab: "bundles/module/login/prefabs/RolePersonalChoiceView",
    layer: UILayer.Dialog,
    hostId: "remake-modal",
    cache: false,
    allowMultiple: false,
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("RolePersonalChoiceView")
export class RolePersonalChoiceView extends BaseView<RolePersonalChoiceArgs> {
    /** 静态面板用于整体缩放。 */
    @property(UITransform) panel: UITransform | null = null;
    /** 固定显示装饰更换。 */
    @property(Label) titleLabel: Label | null = null;
    /** 原可横向滑动的装饰导航。 */
    @property(ScrollView) decorationTabScroll: ScrollView | null = null;
    /** 头像、头像框、形象、贵重标记、称号按照原顺序绑定。 */
    @property([Button]) decorationTabs: Button[] = [];
    /** 对应外层导航的选中图层。 */
    @property([Node]) selectedDecorationTabs: Node[] = [];
    /** 只在形象页显示的预览和星段。 */
    @property(Node) imagePreview: Node | null = null;
    /** 形象 Spine 挂点，离开页签即释放模型。 */
    @property(Node) previewHost: Node | null = null;
    /** 形象属性正文。 */
    @property(Label) previewLabel: Label | null = null;
    /** 形象开放条件正文。 */
    @property(Label) previewCondition: Label | null = null;
    /** 原四个星段与皮肤内页签。 */
    @property([Button]) imageTabs: Button[] = [];
    /** 对应形象内页签的选中图层。 */
    @property([Node]) selectedTabs: Node[] = [];
    /** 头像和头像框共用四列列表，切换重新绑定格子。 */
    @property(SuperScroll) portraitList: SuperScroll | null = null;
    /** 形象四列列表。 */
    @property(SuperScroll) imageList: SuperScroll | null = null;
    /** 贵重标记及充值进度列表。 */
    @property(SuperScroll) honorList: SuperScroll | null = null;
    /** 称号及期限列表。 */
    @property(SuperScroll) titleList: SuperScroll | null = null;
    /** 贵重标记聊天展示的点击区。 */
    @property(Button) honorToggle: Button | null = null;
    /** 贵重标记聊天展示勾选图。 */
    @property(Node) honorCheck: Node | null = null;
    /** 本次页签查询的等待或失败状态。 */
    @property(Label) stateLabel: Label | null = null;
    /** 当前装饰的更换、激活或前往按钮。 */
    @property(Button) actionButton: Button | null = null;
    /** 当前按钮动作文字。 */
    @property(Label) actionLabel: Label | null = null;
    /** 关闭并返回个人空间。 */
    @property(Button) closeButton: Button | null = null;

    /** 当前外层和形象内页签，离开重新打开时由入口初始化。 */
    private mode: DecorationTab = "head";
    /** 当前首次选中的形象所属星段。 */
    private imageTab = 0;
    /** 当前候选，null 表示首次显示时选择使用项或目录首项。 */
    private selected: number | null = null;
    /** 本次开窗的服务端资格，关闭时清空。 */
    private decorations: RoleDecorations | null = null;
    /** 本次开窗已解锁的形象，查询之前为空。 */
    private images: ReadonlySet<number> | null = null;
    /** 本次开窗取得称号及有效期，查询之前为空。 */
    private titles: readonly OwnedRoleTitle[] | null = null;
    /** 当前星段的形象候选，切换星段时替换。 */
    private choices: readonly RoleImageChoice[] = [];
    /** 收到回复前防止快速切换页签重复查询。 */
    private readonly pending = new Set<Catalog>();
    /** 查询失败的页签；再次进入该页签可以重试。 */
    private readonly failed = new Set<Catalog>();
    /** 同一显示期的控件只绑定一次，重复打开只重新定位页签。 */
    private listening = false;
    /** 提交后暂时禁用当前窗的变更操作，回包或关闭后恢复。 */
    private saving = false;
    /** 当前模型及挂载结果，迟到回调只可更新同一个模型。 */
    private actor: { modelId: number; node: Node | null; failed: boolean } | null = null;

    /** 确认静态导航和四个列表均已完成预制体绑定。 */
    public onBind(): void {
        if (!this.panel || !this.titleLabel || !this.decorationTabScroll || !this.imagePreview || !this.previewHost
            || !this.previewLabel || !this.previewCondition || !this.portraitList || !this.imageList
            || !this.honorList || !this.titleList || !this.honorToggle || !this.honorCheck
            || !this.stateLabel || !this.actionButton || !this.actionLabel || !this.closeButton
            || this.imageTabs.length !== 4 || this.selectedTabs.length !== 4
            || this.decorationTabs.length !== TABS.length || this.selectedDecorationTabs.length !== TABS.length) {
            throw new Error("装饰窗缺少预制体绑定");
        }
        for (const list of [this.portraitList, this.imageList, this.honorList, this.titleList]) {
            list.validateBindings();
        }
    }

    /** 按入口定位真实页签，统一登记本次开窗的控件和协议事件。 */
    public onOpen(args?: RolePersonalChoiceArgs): void {
        if (!args?.account.snapshot.role) {
            throw new Error("角色资料未同步");
        }
        if (this.listening) {
            this.switchTo(args.mode, true);
            return;
        }
        this.listening = true;
        this.titleLabel!.string = "装饰更换";
        this.bindButton(this.closeButton!, () => this.close());
        this.bindButton(this.actionButton!, () => this.apply());
        this.bindButton(this.honorToggle!, () => this.toggleHonor());
        this.decorationTabs.forEach((button, index) => this.bindButton(button, () => this.switchTo(TABS[index])));
        this.imageTabs.forEach((button, index) => this.bindButton(button, () => this.switchImageTab(index)));
        for (const list of [this.portraitList!, this.imageList!, this.honorList!, this.titleList!]) {
            this.bindList(list);
        }
        this.ownListener(ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.fit()));
        this.ownListener(args.account.subscribe(state => {
            if (state.busy || !state.role) {
                this.close();
            } else {
                this.render();
            }
        }));
        const events = EventDispatcher.instance;
        this.ownListener(events.on(BagEvent.BagUpdate, this, () => {
            if (this.mode === "border") {
                this.render();
            }
        }));
        this.ownListener(events.on(RoleProfileEvent.Decorations, this, data => {
            this.decorations = data;
            this.queryFinished("portraits", data !== null);
        }));
        this.ownListener(events.on(RoleProfileEvent.Images, this, data => {
            this.images = data === null ? null : new Set(data);
            this.queryFinished("image", data !== null);
        }));
        this.ownListener(events.on(RoleProfileEvent.Titles, this, data => {
            this.titles = data;
            this.queryFinished("title", data !== null);
            this.unschedule(this.renderTimed);
            if (data?.some(title => title.endTimeSeconds > 0)) {
                this.schedule(this.renderTimed, 1);
            }
        }));
        this.ownListener(events.on(RoleProfileEvent.DecorationSaved, this, () => this.finishSaving()));
        this.ownListener(events.on(RoleProfileEvent.AppearanceSaved, this, () => this.finishSaving()));
        this.switchTo(args.mode, true);
    }

    /** 释放形象模型和标题计时，清空本次资格及正在等待的查询。 */
    public onClose(): void {
        this.unschedule(this.renderTimed);
        this.releaseActor();
        this.selected = null;
        this.choices = [];
        this.decorations = null;
        this.images = null;
        this.titles = null;
        this.pending.clear();
        this.failed.clear();
        this.listening = false;
        this.saving = false;
    }

    /** 按钮使用预制体的节点，显示期结束后解除。 */
    private bindButton(button: Button, action: () => void): void {
        const node = button.node;
        node.on(Button.EventType.CLICK, action, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, action, this);
            }
        });
    }

    /** 所有格子走现有 SuperContent 渲染与选择通知。 */
    private bindList(scroll: SuperScroll): void {
        const node = scroll.list.node;
        const render = (cell: Node, data: RoleChoiceCellData) => cell.getComponent(RolePersonalChoiceCell)!.render(data);
        node.on(SuperContent.RENDER_ITEM, render, this);
        node.on(SuperContent.SELECT_ITEM, this.select, this);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(SuperContent.RENDER_ITEM, render, this);
                node.off(SuperContent.SELECT_ITEM, this.select, this);
            }
        });
    }

    /** 按可见区域整体缩放，页签和内容尺寸保持预制体布局。 */
    private fit(): void {
        const box = ViewportLayoutUtils.fitVisibleRoot(this.node);
        const panel = this.panel!;
        const scale = Math.min(1, box.width * 0.99 / panel.width, box.height * 0.94 / panel.height);
        panel.node.setScale(scale, scale, 1);
    }

    /** 切换当前外层页签，恢复该类装饰的默认选择和列表起点。 */
    private switchTo(mode: DecorationTab, initial = false): void {
        if (!initial && this.mode === mode && !this.failed.has(this.catalog())) {
            return;
        }
        if (this.mode === "image" && mode !== "image") {
            this.releaseActor();
        }
        this.mode = mode;
        this.selected = null;
        const image = mode === "image";
        this.imagePreview!.active = image;
        this.imageList!.node.active = image;
        this.portraitList!.node.active = mode === "head" || mode === "border";
        this.honorList!.node.active = mode === "honor";
        this.honorToggle!.node.active = mode === "honor";
        this.titleList!.node.active = mode === "title";
        this.selectedDecorationTabs.forEach((node, index) => node.active = TABS[index] === mode);
        if (image) {
            const current = this.args!.account.snapshot.role?.basics?.imageId ?? 0;
            this.selected = current;
            this.imageTab = RolePersonalChoiceUtils.imageTab(current);
            this.choices = RolePersonalChoiceUtils.images(this.imageTab, current);
        }
        this.requestCatalog();
        this.render();
        const list = image ? this.imageList! : mode === "honor" ? this.honorList!
            : mode === "title" ? this.titleList! : this.portraitList!;
        list.toStart();
        if (initial) {
            if (mode === "honor" || mode === "title") {
                this.decorationTabScroll!.scrollToRight(0);
            } else {
                this.decorationTabScroll!.scrollToLeft(0);
            }
        }
    }

    /** 根据当前页签确定向服务端读取的唯一资格集合。 */
    private catalog(): Catalog {
        return this.mode === "image" || this.mode === "title" ? this.mode : "portraits";
    }

    /** 初次进入相应页签读取资格，开窗期间复用同一回应。 */
    private requestCatalog(): void {
        const catalog = this.catalog();
        const loaded = catalog === "image" ? this.images : catalog === "title" ? this.titles : this.decorations;
        if (loaded !== null || this.pending.has(catalog)) {
            return;
        }
        this.failed.delete(catalog);
        this.pending.add(catalog);
        const role = this.args!.role;
        if (catalog === "image") {
            role.requestImages();
        } else if (catalog === "title") {
            role.requestTitles();
        } else {
            role.requestDecorations();
        }
    }

    /** 查询结束后刷新可见页，其他页签下保留结果等待切入。 */
    private queryFinished(catalog: Catalog, ok: boolean): void {
        this.pending.delete(catalog);
        if (ok) {
            this.failed.delete(catalog);
        } else {
            this.failed.add(catalog);
        }
        if (catalog === this.catalog()) {
            this.render();
        }
    }

    /** 结束统一变更等待，更新按钮与权威选中状态。 */
    private finishSaving(): void {
        this.saving = false;
        this.render();
    }

    /** 切换形象星段后显示该段第一项并回到列表开头。 */
    private switchImageTab(index: number): void {
        if (index !== this.imageTab) {
            this.imageTab = index;
            this.selected = null;
            this.choices = RolePersonalChoiceUtils.images(index, this.args!.account.snapshot.role?.basics?.imageId ?? 0);
            this.render();
            this.imageList!.toStart();
        }
    }

    /** 对不可选择的头像或头像框显示真实条件，其他条目可先预览。 */
    private select(data: RoleChoiceCellData): void {
        if (data.tab !== this.mode || this.saving) {
            return;
        }
        if (this.mode === "head" || this.mode === "border") {
            const entry = this.portraits().find(item => item.id === data.id);
            if (!entry?.available && !entry?.canActivate) {
                UIManager.instance.toast(entry?.hint ?? "装饰尚未解锁");
                return;
            }
        }
        this.selected = data.id;
        this.render();
    }

    /** 刷新当前页签和查询提示。 */
    private render(): void {
        const catalog = this.catalog();
        this.stateLabel!.string = this.pending.has(catalog) ? "正在同步…"
            : this.failed.has(catalog) ? "同步失败，点击页签重试" : "";
        switch (this.mode) {
            case "head":
            case "border":
                this.renderPortraits();
                break;
            case "image":
                this.renderImages();
                break;
            case "honor":
                this.renderHonors();
                break;
            case "title":
                this.renderTitles();
                break;
        }
    }

    /** 用账号快照确认当前使用项；服务器旧默认头像 ID 0 显示为目录第一项。 */
    private portraitId(): number {
        const basics = this.args!.account.snapshot.role?.basics;
        return this.mode === "head" ? basics?.headId || 1 : basics?.borderId ?? 0;
    }

    /** 根据权威解锁状态和当前库存投影头像或框。 */
    private portraits(): readonly RolePortraitChoice[] {
        const id = this.portraitId();
        return this.mode === "head" ? RolePersonalChoiceUtils.heads(id, this.decorations)
            : RolePersonalChoiceUtils.borders(id, this.decorations, ServerClock.instance.nowSeconds(),
                item => BagModel.instance.quantity(item));
    }

    /** 头像、框共用格子；使用中项置顶，框可显示原名与激活动作。 */
    private renderPortraits(): void {
        const choices = this.portraits();
        const current = this.portraitId();
        const picked = choices.find(choice => choice.id === this.selected) ?? choices[0];
        this.selected = picked?.id ?? null;
        this.portraitList!.list.setData<RoleChoiceCellData>(choices.map(choice => ({
            tab: this.mode, id: choice.id, name: choice.name, icon: choice.icon, detail: "",
            status: current === choice.id ? "使用中" : "", selected: this.selected === choice.id,
            dim: this.decorations !== null && !choice.available && !choice.canActivate,
        })));
        const selectable = !!picked && (picked.available || picked.canActivate) && picked.id !== current;
        this.showAction(picked?.canActivate ? "激活" : "更换", true, selectable);
    }

    /** 显示旧图鉴候选和当前模型，未解锁仍可浏览预览。 */
    private renderImages(): void {
        const current = this.args!.account.snapshot.role?.basics?.imageId ?? 0;
        const picked = this.choices.find(choice => choice.id === this.selected) ?? this.choices[0];
        this.selected = picked?.id ?? null;
        this.selectedTabs.forEach((tab, index) => tab.active = index === this.imageTab);
        this.imageList!.list.setData<RoleChoiceCellData>(this.choices.map(choice => ({
            tab: "image", id: choice.id, name: choice.name, icon: choice.icon, star: choice.star,
            detail: choice.star ? choice.star + "星" : "", selected: this.selected === choice.id,
            status: "", dim: this.images !== null && !this.images.has(choice.id),
        })));
        this.showAction("更换", !!picked, !!this.images && this.selected !== current);
        this.showPreview(picked);
    }

    /** 依累计充值值展示各级贵重标记与聊天开关。 */
    private renderHonors(): void {
        const rows = RolePersonalChoiceUtils.honors(this.decorations);
        const highest = rows.slice().reverse().find(row => row.unlocked);
        const picked = rows.find(row => row.id === this.selected) ?? highest ?? rows[0];
        this.selected = picked?.id ?? null;
        this.honorList!.list.setData<RoleChoiceCellData>(rows.map(row => ({
            tab: "honor", id: row.id, name: row.name, icon: row.icon, detail: row.bonus,
            condition: row.progress, status: row.unlocked ? "已激活" : this.decorations ? "未激活" : "",
            selected: row.id === this.selected, dim: this.decorations !== null && !row.unlocked,
        })));
        this.honorCheck!.active = this.decorations?.showPeerage === true;
        this.honorToggle!.interactable = this.decorations !== null && !this.saving;
        this.showAction("前往", !!picked && !picked.unlocked, this.decorations !== null);
    }

    /** 使用权威期限展示称号当前状态及来源。 */
    private renderTitles(): void {
        const choices = RolePersonalChoiceUtils.titles(this.titles, ServerClock.instance.nowSeconds());
        const picked = choices.find(choice => choice.id === this.selected) ?? choices[0];
        this.selected = picked?.id ?? null;
        this.titleList!.list.setData<RoleChoiceCellData>(choices.map(choice => ({
            tab: "title", id: choice.id, name: choice.name, icon: choice.icon, detail: choice.bonus,
            condition: choice.condition, tag: choice.tag,
            status: choice.status === "locked" ? "未激活" : choice.availability,
            selected: choice.id === this.selected, dim: choice.status === "locked" || choice.status === "expired",
        })));
        const showsSource = picked?.status === "locked" || picked?.status === "expired";
        this.showAction("前往", showsSource, showsSource);
    }

    /** 仅在称号页可见时更新限时称号剩余时间。 */
    private readonly renderTimed = (): void => {
        if (this.mode === "title") {
            this.renderTitles();
        }
    };

    /** 在同一个按钮位置显示不同页签动作。 */
    private showAction(label: string, visible: boolean, enabled: boolean): void {
        this.actionButton!.node.active = visible;
        this.actionButton!.interactable = enabled && !this.saving;
        this.actionLabel!.string = label;
    }

    /** 显示固定形象属性和开放条件，模型只在内容改变时重建。 */
    private showPreview(choice?: RoleImageChoice): void {
        this.previewLabel!.string = choice ? choice.bonus || "当前形象无属性加成" : "";
        this.previewCondition!.string = choice?.condition ?? "";
        if (!choice) {
            this.releaseActor();
            return;
        }
        if (this.actor?.modelId === choice.modelId) {
            if (this.actor.failed) {
                this.previewLabel!.string = "预览资源暂缺";
            }
            return;
        }
        this.releaseActor();
        const actor: NonNullable<typeof this.actor> = { modelId: choice.modelId, node: null, failed: false };
        this.actor = actor;
        const mounted = BattleSpineService.instance.mountBattleSpine(this.previewHost!, String(choice.modelId), () => {
            if (this.actor === actor) {
                actor.failed = true;
                this.previewLabel!.string = "预览资源暂缺";
            }
        }, { seatY: 0, scale: 0.88 });
        actor.node = mounted.node;
    }

    /** 离开形象预览后取消旧模型及其在途资源挂载。 */
    private releaseActor(): void {
        const actor = this.actor;
        this.actor = null;
        if (actor?.node?.isValid) {
            actor.node.destroy();
        }
    }

    /** 切换聊天标记偏好，展示状态取服务端确认回包。 */
    private toggleHonor(): void {
        if (!this.decorations || this.saving) {
            return;
        }
        this.saving = true;
        this.render();
        this.args!.role.setPeerageDisplay(!this.decorations.showPeerage);
    }

    /** 提交所选装饰，未接通的活动从本页明确提示。 */
    private apply(): void {
        const selected = this.selected;
        if (selected === null || this.saving) {
            return;
        }
        const role = this.args!.role;
        switch (this.mode) {
            case "head":
            case "border": {
                const picked = this.portraits().find(choice => choice.id === selected);
                if (!picked || (!picked.available && !picked.canActivate)) {
                    UIManager.instance.toast(picked?.hint ?? "装饰尚未解锁");
                    return;
                }
                this.saving = true;
                if (this.mode === "head") {
                    role.changeHead(selected);
                } else if (picked.canActivate) {
                    role.activateBorder(selected);
                } else {
                    role.changeBorder(selected);
                }
                break;
            }
            case "image":
                if (!this.images?.has(selected)) {
                    UIManager.instance.toast("该形象尚未解锁");
                    return;
                }
                this.saving = true;
                role.changeImage(selected);
                break;
            case "honor":
                UIManager.instance.toast("累计充值入口暂未开放");
                break;
            case "title":
                UIManager.instance.toast("该称号的获取玩法暂未开放");
                break;
        }
        this.render();
    }
}
