/**
 * 英雄名册页面，从唯一 HeroRosterModel 读取筛选列表，按旧配置显示看板人物和对白。
 * Prefab 保存人物挂点、气泡和列表；选择格子按实例编号打开详情，关闭释放页面监听。
 */
import { _decorator, Button, director, Director, Label, Node, RichText } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { BaseView } from "../../../framework/ui/BaseView";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { ResManager } from "../../../framework/assets/ResManager";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { ItemDetailUtils } from "../../bag/utils/ItemDetailUtils";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterUtils } from "../utils/HeroRosterUtils";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroInfoView } from "./HeroInfoView";
import type { HeroCellModel } from "./HeroListPresentation";

/** 旧英雄列表提示表，正文与按钮都引用统一语言映射。 */
interface HeroListTip {
    readonly atom: string;
    readonly lang: number;
    readonly go_lang: number;
}

const { ccclass, property } = _decorator;

@UIRegistry.view({
    id: "hero",
    prefab: "bundles/module/hero/prefabs/HeroListView",
    layer: UILayer.Page,
    cache: false,
    allowMultiple: false,
})
@ccclass("HeroListView")
export class HeroListView extends BaseView {
    /** 主线阵容按钮，只打开草稿页，不直接保存阵容或发起挑战。 */
    @property(Button) lineupButton: Button | null = null;
    /** 当前英雄页签，点击说明自动同步状态，不发送查询。 */
    @property(Button) btnHero: Button | null = null;
    /** 完整Prefab绑定的滚动列表，静态结构和格子资源由该组件维护。 */
    @property(SuperScroll) heroScroll: SuperScroll | null = null;
    /** 当前筛选的加载、空态或错误说明。 */
    @property(Label) emptyLabel: Label | null = null;
    /** 服务端名册容量投影，位置由Prefab的Widget固定。 */
    @property(Label) capacityLabel: Label | null = null;
    /** 全部及五元素筛选，图片直接保存在Prefab，顺序为0至5。 */
    @property([Button]) elemButtons: Button[] = [];
    /** 原看板人物的骨骼挂点，位置和比例由 Prefab 保存。 */
    @property(Node) characterHost: Node | null = null;
    /** 保留旧对白里的高亮字色。 */
    @property(RichText) dialogueText: RichText | null = null;
    /** 原对白末尾的跳转按钮，当前提供每日礼包入口反馈。 */
    @property(Button) dialogueButton: Button | null = null;
    /** 使用对白配置提供的按钮语言。 */
    @property(Label) dialogueActionLabel: Label | null = null;

    /** 唯一名册状态；生产使用模块实例，专项检查可在开页前注入独立Model。 */
    private roster = HeroRosterModel.instance;
    /** 当前元素筛选，0表示全部；新实例默认全部。 */
    private elem = 0;
    /** 关闭后阻止迟到刷新和选择，重开时恢复。 */
    private closed = true;
    /** 等待完整根激活的一份帧回调；显示或关页时解除。 */
    private shownWatch: (() => void) | null = null;
    /** 每份列表节点只挂载一次看板人物，关页隐藏，节点销毁时释放骨骼。 */
    private characterMounted = false;

    /** 只将完整外根铺到可见画布；固定布局由Prefab组件处理。 */
    public onCreate(): void {
        ViewportLayoutUtils.bindVisibleRefresh(this.node, () => ViewportLayoutUtils.fitVisibleRoot(this.node));
    }

    /** 开页前注入只读名册；配置由显示工具直接查询GameConfig，不保存页面副本。 */
    public configure(roster: HeroRosterModel): void {
        if (!this.closed) {
            throw new Error("英雄名册依赖必须在开页前注入");
        }
        this.roster = roster;
    }

    /** 打开列表时绑定筛选与选中事件，并恢复原看板和对白。 */
    public onOpen(): void {
        if (!this.closed) {
            this.refresh();
            return;
        }
        this.validateBindings();
        this.closed = false;
        const list = this.heroScroll!.list;
        list.node.on(SuperContent.RENDER_ITEM, this.onRender, this);
        list.node.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            list.node.off(SuperContent.RENDER_ITEM, this.onRender, this);
            list.node.off(SuperContent.SELECT_ITEM, this.onSelect, this);
        });
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.refresh);
        this.bindButtons();
        this.showCharacter();
        this.showDialogue();
        this.refresh();
    }

    /** 关闭后停止看板显示和帧等待，BaseView 解除对白及列表监听。 */
    public onClose(): void {
        this.closed = true;
        this.clearShownWatch();
        if (this.characterHost?.isValid) {
            this.characterHost.active = false;
        }
    }

    /** 根重新激活时读取最新投影；开页前和关闭后不绘制。 */
    public onEnable(): void {
        this.refresh();
    }

    /** 校验直接绑定的业务控件，滚动结构统一交给SuperScroll检查。 */
    private validateBindings(): void {
        if (!this.heroScroll || !this.emptyLabel || !this.capacityLabel || this.elemButtons.length !== 6
            || this.elemButtons.some(button => !button?.node)) {
            throw new Error("HeroListView缺少滚动列表、说明、容量或六个元素按钮绑定");
        }
        this.heroScroll.validateBindings();
    }

    /** 复用召唤页的原 act 骨骼循环，模型刷新和切换元素不会重复装配。 */
    private showCharacter(): void {
        const host = this.characterHost;
        if (!host) {
            return;
        }
        host.active = true;
        if (!this.characterMounted) {
            this.characterMounted = true;
            BattleSpineService.instance.mountNamedSpine(host, "act", "act", { loop: true });
        }
    }

    /** 读取旧提示表首条对白。当前只有一条配置，保持原文和高亮颜色。 */
    private showDialogue(): void {
        const body = this.dialogueText;
        const bubble = body?.node.parent;
        const button = this.dialogueButton;
        const label = this.dialogueActionLabel;
        if (!body || !bubble || !button || !label) {
            return;
        }
        const config = GameConfig.instance;
        const { rows: [tip] } = config.getFileByPath("config/herobagjump") as { rows: readonly HeroListTip[] };
        const content = tip && config.getConfig(GConfig.Language, tip.lang)?.value;
        const action = tip && config.getConfig(GConfig.Language, tip.go_lang)?.value;
        bubble.active = !!content && !!action;
        if (!bubble.active || !content || !action) {
            GameLog.shared.warnOnce("MODULE", "HeroListView", "HERO_LIST_DIALOGUE", "英雄列表对白缺少提示或语言配置");
            return;
        }
        body.string = ItemDetailUtils.richText(content);
        label.string = action;
        const onClick = () => UIManager.instance.toast(tip.atom === "act_daily_gift" ? "每日礼包暂未开放" : "该入口暂未开放");
        button.node.on(Button.EventType.CLICK, onClick);
        this.ownListener(() => button.node.off(Button.EventType.CLICK, onClick));
    }

    /** 直接查询当前模板显示并将筛选结果交给列表，不创建模板索引或计算格子坐标。 */
    private refresh(): void {
        if (this.closed || !this.node?.isValid || !this.heroScroll) {
            return;
        }
        if (!this.node.activeInHierarchy) {
            this.watchShown();
            return;
        }
        const model = HeroRosterUtils.present(this.roster.snapshot, this.elem);
        this.capacityLabel!.string = model.capacityLine;
        this.emptyLabel!.string = model.emptyText;
        this.emptyLabel!.node.active = model.emptyText.length > 0;
        this.elemButtons.forEach((button, index) => {
            const scale = index === this.elem ? 1 : 0.8;
            button.node.setScale(scale, scale, 1);
        });
        this.heroScroll.list.setData(model.cells);
    }

    /** 列表创建或复用格子时只提交展示数据，不给格子注入页面导航。 */
    private onRender(node: Node, hero: HeroCellModel): void {
        const cell = node.getComponent(HeroIconCellView);
        if (!cell) {
            throw new Error("HeroIconCellView Prefab缺少格子组件");
        }
        cell.show(hero);
    }

    /** 选中实例后打开详情，同时保留当前筛选顺序供详情左右切换。 */
    private onSelect(hero: HeroCellModel): void {
        if (this.closed || hero.kind !== "owned" || !hero.instanceId) {
            return;
        }
        const heroIds = HeroRosterUtils.present(this.roster.snapshot, this.elem).cells
            .map(cell => cell.instanceId).filter((id): id is string => !!id);
        void UIManager.instance.open(HeroInfoView, { heroId: hero.instanceId, heroIds })
            .catch(error => UIManager.instance.toast(ErrorUtils.messageOf(error)));
    }

    /** 只保留一份等待激活的帧回调，实际显示后立即解除并绘制。 */
    private watchShown(): void {
        if (this.shownWatch) {
            return;
        }
        this.shownWatch = () => {
            if (!this.node?.isValid || this.closed) {
                this.clearShownWatch();
            } else if (this.node.activeInHierarchy) {
                this.clearShownWatch();
                this.refresh();
            }
        };
        director.on(Director.EVENT_AFTER_UPDATE, this.shownWatch);
    }

    /** 显示、关闭或销毁时停止等待，重复执行安全。 */
    private clearShownWatch(): void {
        if (this.shownWatch) {
            director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
            this.shownWatch = null;
        }
    }

    /** 改变筛选后回到列表起点；普通同步刷新继续保留滚动位置。 */
    private pickElem(id: number): void {
        if (this.closed || id === this.elem) {
            return;
        }
        this.elem = id;
        this.refresh();
        this.heroScroll!.toStart();
    }

    /** 每次打开登记业务按钮，关闭由BaseView统一解除，不改变固定几何。 */
    private bindButtons(): void {
        const bind = (button: Button | null, action: () => void) => {
            if (!button) {
                return;
            }
            button.node.on(Button.EventType.CLICK, action);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, action));
        };
        bind(this.lineupButton, () => {
            void UIManager.instance.openById("remake-formation", { complete: () => {} })
                .catch(error => UIManager.instance.toast(ErrorUtils.messageOf(error)));
        });
        bind(this.btnHero, () => UIManager.instance.toast("英雄数据随登录和重连自动同步，请等待连接恢复"));
        this.elemButtons.forEach((button, index) => bind(button, () => this.pickElem(index)));
        if (this.btnHero) {
            ResManager.setSprite(this.btnHero.node, [ResManager.ui("common", "button_btn-tab-24")]);
        }
    }
}
