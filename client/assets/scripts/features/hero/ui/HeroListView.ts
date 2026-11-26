/**
 * 英雄名册与图鉴页面。名册读取 HeroRosterModel，图鉴从配置读取各元素的预览英雄。
 * Prefab 保存看板、页签和列表；持有实例和图鉴模板分别打开培养页和只读预览页。
 */
import { _decorator, Button, director, Director, Label, Node, RichText, Sprite, SpriteFrame } from "cc";
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
import { ErrorUtils } from "../../../core/ErrorUtils";
import { ItemDetailUtils } from "../../bag/utils/ItemDetailUtils";
import { BattleSpineService } from "../../battle/ui/BattleSpineService";
import { GameRedDotKey } from "../../common/utils/GameRedDotKey";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterModel } from "../HeroRosterModel";
import { HeroRosterUtils } from "../utils/HeroRosterUtils";
import { HeroIllustrationUtils, type HeroIllustrationEntry } from "../utils/HeroIllustrationUtils";
import { FormationView } from "./FormationView";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroInfoView } from "./HeroInfoView";
import { HeroIllustrationView } from "./HeroIllustrationView";
import { HeroEvolutionCatalogView } from "./HeroEvolutionCatalogView";
import { HeroListPresentation, type HeroCellModel } from "./HeroListPresentation";

/** 旧英雄列表提示表，正文与按钮都引用统一语言映射。 */
interface HeroListTip {
    readonly atom: string;
    readonly lang: number;
    readonly go_lang: number;
}

/** 滚动格把图鉴配置行交回列表，避免把配置编号当成背包持久实例。 */
type HeroListCell = HeroCellModel & { readonly illustration?: HeroIllustrationEntry };

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
    /** 名册页签，点击后恢复上次的名册元素筛选。 */
    @property(Button) btnHero: Button | null = null;
    /** 图鉴页签，进入时从上次浏览的图鉴元素开始。 */
    @property(Button) catalogTab: Button | null = null;
    /** 页签选中和未选中的原版背景，顺序为亮色、深色。 */
    @property([SpriteFrame]) tabFrames: SpriteFrame[] = [];
    /** 图鉴的五个元素入口，按火、水、风、光、暗排列，无全选组。 */
    @property([Button]) catalogElements: Button[] = [];
    /** 图鉴的五个亮圈，作为选中元素的视觉状态。 */
    @property([Node]) catalogSelection: Node[] = [];
    /** 名册六个元素的选中亮圈，顺序含全部。 */
    @property([Node]) rosterSelection: Node[] = [];
    /** 图鉴底部打开独立进化图鉴。 */
    @property(Button) evolutionCatalogButton: Button | null = null;
    /** 正式服图鉴同时显示的圣龙入口，页面只反馈当前开放状态。 */
    @property(Button) dragonTab: Button | null = null;
    /** 正式服图鉴同时显示的星盘入口，页面只反馈当前开放状态。 */
    @property(Button) astrolabeButton: Button | null = null;
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
    /** 名册当前元素筛选，0 表示全部；新实例默认全部。 */
    private elem = 0;
    /** 图鉴的当前元素，1 为火；从详情返回时保留选择。 */
    private catalogElem = 1;
    /** true 表示当前展示模板图鉴，false 表示持有英雄名册。 */
    private catalogOpen = false;
    /** 当前图鉴顺序快照，详情翻页沿用点击时所见的列表。 */
    private catalogRows: readonly HeroIllustrationEntry[] = [];
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

    /** 打开时绑定列表的筛选与选中事件，并恢复看板和当前页签。 */
    public onOpen(): void {
        if (!this.closed) {
            this.refresh();
            return;
        }
        this.validateBindings();
        this.closed = false;
        const listNode = this.heroScroll!.list.node;
        listNode.on(SuperContent.RENDER_ITEM, this.onRender, this);
        listNode.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            if (listNode.isValid) {
                listNode.off(SuperContent.RENDER_ITEM, this.onRender, this);
                listNode.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
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
            || this.elemButtons.some(button => !button?.node) || this.rosterSelection.length !== 6
            || this.catalogElements.length !== 5 || this.catalogSelection.length !== 5
            || this.catalogElements.some(button => !button?.node) || this.tabFrames.length !== 2
            || !this.btnHero || !this.catalogTab || !this.evolutionCatalogButton
            || !this.dragonTab || !this.astrolabeButton) {
            throw new Error("英雄列表缺少名册、图鉴或元素筛选绑定");
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

    /** 显示旧提示表首条对白，沿用原文、高亮和本次打开期的按钮监听。 */
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
        const node = button.node;
        node.on(Button.EventType.CLICK, onClick);
        this.ownListener(() => {
            if (node.isValid) {
                node.off(Button.EventType.CLICK, onClick);
            }
        });
    }

    /** 显示当前页签、元素和列表，以真实名册判断图鉴灰态。 */
    private refresh(): void {
        if (this.closed || !this.node?.isValid || !this.heroScroll) {
            return;
        }
        if (!this.node.activeInHierarchy) {
            this.watchShown();
            return;
        }
        this.btnHero!.node.getComponent(Sprite)!.spriteFrame = this.tabFrames[this.catalogOpen ? 1 : 0];
        this.catalogTab!.node.getComponent(Sprite)!.spriteFrame = this.tabFrames[this.catalogOpen ? 0 : 1];
        this.capacityLabel!.node.parent!.active = !this.catalogOpen;
        this.dragonTab!.node.active = this.catalogOpen;
        this.astrolabeButton!.node.active = this.catalogOpen;
        this.evolutionCatalogButton!.node.active = this.catalogOpen;
        this.rosterSelection.forEach((mark, index) => { mark.active = index === this.elem; });
        this.catalogSelection.forEach((mark, index) => { mark.active = index + 1 === this.catalogElem; });
        this.elemButtons[0].node.parent!.active = !this.catalogOpen;
        this.catalogElements[0].node.parent!.active = this.catalogOpen;
        if (this.catalogOpen) {
            const roster = this.roster.snapshot;
            this.catalogRows = HeroIllustrationUtils.list(this.catalogElem, roster.heroes, roster.illustrations);
            const cells = this.catalogRows.map(entry => HeroListPresentation.illustrationCell(entry));
            this.emptyLabel!.string = cells.length ? "" : "该元素暂无英雄";
            this.emptyLabel!.node.active = !cells.length;
            this.heroScroll.list.setData(cells);
        } else {
            const model = HeroRosterUtils.present(this.roster.snapshot, this.elem);
            this.capacityLabel!.string = model.capacityLine;
            this.emptyLabel!.string = model.emptyText;
            this.emptyLabel!.node.active = model.emptyText.length > 0;
            this.heroScroll.list.setData(model.cells);
        }
    }

    /** 绘制名册格，仅主线已上阵英雄使用详情汇总红点。 */
    private onRender(node: Node, hero: HeroCellModel): void {
        const cell = node.getComponent(HeroIconCellView);
        if (!cell) {
            throw new Error("HeroIconCellView Prefab缺少格子组件");
        }
        const redDot = hero.kind === "owned" && hero.deployed && hero.instanceId
            ? GameRedDotKey.heroDetail(hero.instanceId) : null;
        cell.show(hero, redDot);
    }

    /** 沿当前列表打开只读图鉴或真实持有英雄，两个页签均保留翻页顺序。 */
    private onSelect(hero: HeroListCell): void {
        if (this.closed) {
            return;
        }
        if (this.catalogOpen && hero.illustration) {
            const index = this.catalogRows.indexOf(hero.illustration);
            if (index >= 0) {
                void UIManager.instance.open(HeroIllustrationView, { entries: this.catalogRows, index })
                    .catch(() => { /* UIManager 负责报告加载异常。 */ });
            }
            return;
        }
        if (this.catalogOpen || hero.kind !== "owned" || !hero.instanceId) {
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

    /** 改变当前页签的筛选后回到列表起点，名册和图鉴分别保存元素。 */
    private pickElem(id: number): void {
        const current = this.catalogOpen ? this.catalogElem : this.elem;
        if (this.closed || id === current) {
            return;
        }
        if (this.catalogOpen) {
            this.catalogElem = id;
        } else {
            this.elem = id;
        }
        this.refresh();
        this.heroScroll!.toStart();
    }

    /** 切换真实名册和配置图鉴，重新从所选元素的第一行显示。 */
    private selectTab(catalog: boolean): void {
        if (this.closed || this.catalogOpen === catalog) {
            return;
        }
        this.catalogOpen = catalog;
        this.refresh();
        this.heroScroll!.toStart();
    }

    /** 登记本次打开的页签与功能按钮，子窗口随所属页面关闭。 */
    private bindButtons(): void {
        const bind = (button: Button | null, action: () => void) => {
            if (!button) {
                return;
            }
            const node = button.node;
            node.on(Button.EventType.CLICK, action);
            this.ownListener(() => {
                if (node.isValid) {
                    node.off(Button.EventType.CLICK, action);
                }
            });
        };
        bind(this.lineupButton, () => {
            void UIManager.instance.openChild(this, FormationView, { complete: () => {} })
                .catch(error => {
                    if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                        UIManager.instance.toast(ErrorUtils.messageOf(error));
                    }
                });
        });
        bind(this.btnHero, () => this.selectTab(false));
        bind(this.catalogTab, () => this.selectTab(true));
        bind(this.dragonTab, () => UIManager.instance.toast("圣龙暂未开放"));
        bind(this.astrolabeButton, () => UIManager.instance.toast("星盘暂未开放"));
        bind(this.evolutionCatalogButton, () => {
            void UIManager.instance.openChild(this, HeroEvolutionCatalogView)
                .catch(() => { /* UIManager 负责报告加载异常。 */ });
        });
        this.elemButtons.forEach((button, index) => bind(button, () => this.pickElem(index)));
        this.catalogElements.forEach((button, index) => bind(button, () => this.pickElem(index + 1)));
    }
}
