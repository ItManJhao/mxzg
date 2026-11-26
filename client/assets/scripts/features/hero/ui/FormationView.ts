/**
 * 共用出阵页面。主线、幻境之塔和其他副本编辑各自的阵容；阵型和元素子窗只修改本页草稿。
 * 草稿战力由服务器按队员预览；保存后由所属业务控制器确认，主线继续等待统一角色快照。
 */
import { _decorator, Button, EventTouch, Label, Node, UITransform, Vec3, view as ccView } from "cc";
import { GameLog } from "../../../core/GameLog";
import { ResManager } from "../../../framework/assets/ResManager";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { SuperContent } from "../../../framework/ui/SuperContent";
import { HeroIconCellView } from "./HeroIconCellView";
import { FormationElementView } from "./FormationElementView";
import { FormationMatrixView } from "./FormationMatrixView";
import { FormationSlotView } from "./FormationSlotView";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { FormationController } from "../FormationController";
import { FormationSaveModel } from "../FormationSaveModel";
import { HeroRosterModel } from "../HeroRosterModel";
import { FormationEvent } from "../utils/FormationEvent";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { HeroRosterUtils } from "../utils/HeroRosterUtils";
import { HeroCatalog } from "../utils/HeroCatalog";
import { FormationElementUtils, type FormationElementPreview } from "../utils/FormationElementUtils";
import { FormationMatrixUtils, type FormationMatrixEntry } from "../utils/FormationMatrixUtils";
import type { FormationSaveRequest, FormationState } from "../data/FormationData";
import type { MainFormation, OwnedHero } from "../data/HeroSnapshotUtils";

const { ccclass, property } = _decorator;

/** 单次站位手势，坐标以阵位输入区为准，跨格移动前保留头像原布局。 */
interface SlotGesture {
    touchId: number;
    slot: FormationSlotView;
    start: Vec3;
    originalPosition: Vec3;
    originalSibling: number;
    previewStart: Vec3 | null;
}

/** 小于 12 个预制体设计单位的位移视为点击，避免按下时轻微抖动触发拖动。 */
const SLOT_DRAG_THRESHOLD = 12;

/** 连续增减草稿队员时合并预览请求，单位秒；不延迟确认保存。 */
const POWER_DEBOUNCE_SECONDS = 0.08;

/** 服务端编号 9 是独立助战位，切换阵型时不参与普通格的序位映射。 */
const ASSISTANCE_POSITION = 9;
/** 应用可注入关闭结果，保存成功仍留在编辑页供核对服务端同步。 */
export interface FormationRequest {
    /** 关闭结果；只有本次出战草稿被服务端确认后才返回true。 */
    complete(confirmed: boolean): void;
    /** 主线出战确认保存成功后关闭；普通布阵仍留在页面。 */
    closeAfterSave?: boolean;
    /** 其他玩法的显示标题，主线沿用预制体标题。 */
    title?: string;
    /** 其他玩法提供自己的已确认阵容和保存入口，主线使用原统一快照。 */
    formation?: {
        /** 返回当前玩法已同步的阵容和可用格位。 */
        read(): MainFormation | null;
        /** 将独立草稿交给所属玩法，收到确认后给出结果。 */
        save(draft: Omit<FormationSaveRequest, "requestId">, done: (success: boolean) => void): void;
        /** 独立玩法可提供已核验的借将，普通阵容和拥有名册不读该实例。 */
        additionalHero?(): OwnedHero | undefined;
        /** 玩法已确认的可选借将列表，由其控制器持有真实借用记录。 */
        additionalHeroes?(): readonly OwnedHero[];
        /** 各玩法提供的当前英雄状态。已上阵也可通过点击撤下损耗或不符合条件的英雄。 */
        heroState?(hero: OwnedHero): Readonly<{ canDeploy: boolean; caption: string }>;
        /** 同时上场的借将上限；省略时由玩法服务端按自身规则校验。 */
        maxAdditionalHeroes?: number;
        /** 可选的玩法专属评分入口，可校验该玩法的版本和站位。 */
        previewPower?(draft: Omit<FormationSaveRequest, "requestId">): string | null;
        /** 可选的玩法权威状态监听，窗口关闭时注销。 */
        watch?(refresh: () => void): () => void;
    };
}

@UIRegistry.view({
    id: "remake-formation",
    prefab: "bundles/module/hero/prefabs/FormationView",
    layer: UILayer.Popup,
    cache: false,
    allowMultiple: false,
    hostId: "remake-modal",
    modal: { mask: true, closeOnOutside: true },
})
@ccclass("FormationView")
export class FormationView extends BaseView<FormationRequest> {
    /** 关闭按钮，丢弃未保存草稿。 */
    @property(Button) closeButton: Button | null = null;
    /** 确认本页阵容草稿，保存期间禁用。 */
    @property(Button) confirmButton: Button | null = null;
    /** 普通布阵显示保存，战斗确认显示出阵。 */
    @property(Label) confirmText: Label | null = null;
    /** 标题文字与样式保留在预制体。 */
    @property(Label) titleLabel: Label | null = null;
    /** 草稿、保存和断线提示。 */
    @property(Label) tipLabel: Label | null = null;
    /** 当前上阵数及可用阵位数。 */
    @property(Label) countLabel: Label | null = null;
    /** 当前草稿的服务器战力；未取得匹配回包时显示字库支持的短横线。 */
    @property(Label) powerLabel: Label | null = null;
    /** 当前草稿已经激活的同元素队伍加成，空时隐藏。 */
    @property(Label) teamBonusLabel: Label | null = null;
    /** 元素抑制入口的图标随当前草稿所激活的光环变化。 */
    @property(Button) elementBonusButton: Button | null = null;
    /** 统一列表组件；列数、尺寸、间距和Cell均由Prefab维护。 */
    @property(SuperScroll) heroScroll: SuperScroll | null = null;
    /** 元素筛选选中标记。 */
    @property(Node) filterMark: Node | null = null;
    /** 全部及五元素筛选按钮。 */
    @property([Button]) elementButtons: Button[] = [];
    /** 九个旧版站位组件，开放状态来自服务器。 */
    @property([FormationSlotView]) slots: FormationSlotView[] = [];
    /** 覆盖九槽的透明输入区域，由同一个节点接收跨格手势直到结束。 */
    @property(UITransform) slotInput: UITransform | null = null;
    /** 打开契约阵型选择子窗；只有基础阵型解锁时仍可查看其他阵型说明。 */
    @property(Button) formationButton: Button | null = null;
    /** 当前草稿阵型编号，不推算解锁。 */
    @property(Label) formationLabel: Label | null = null;
    /** 面板设计尺寸与锚点。 */
    @property(UITransform) panelBounds: UITransform | null = null;
    /** 最大屏宽占比。 */
    @property maxWidthRatio = 0.94;
    /** 最大屏高占比。 */
    @property maxHeightRatio = 0.80;
    /** 应用唯一业务模块，收发阵容协议，不持有本页草稿。 */
    private module = FormationController.instance;
    /** 当前角色权威英雄与阵容，只读。 */
    private roster = HeroRosterModel.instance;
    /** 模块保存进度，窗口关闭不销毁。 */
    private saves = FormationSaveModel.instance;
    /** 当前手指的站位手势，屏幕取消、重绘或关闭时恢复头像并清空。 */
    private slotGesture: SlotGesture | null = null;
    /** 页面关闭后不再绘制。 */
    private closed = true;
    /** 当前页面草稿，绝不回写权威Model。 */
    private state: FormationState = { heroes: [], lineup: { version: 0, slots: [] }, busy: true, message: "等待阵容同步…" };
    /** 当前草稿的预估参数和请求编号，站位版参数只交给该独立玩法。 */
    private powerDraft: {
        readonly key: string;
        readonly heroIds: readonly string[];
        readonly formation: Omit<FormationSaveRequest, "requestId"> | null;
        requestId: string | null;
    } | null = null;
    /** 本次开窗读取的阵型说明，用当前草稿阵型查找各格的加成。 */
    private matrices: readonly FormationMatrixEntry[] = [];
    /** 当前草稿派生的说明和总加成，关闭或未取得配置时清空。 */
    private elementPreview: FormationElementPreview | null = null;
    /** 当前父页持有的元素子窗，关闭后清空，复用本实例刷新草稿。 */
    private elementDialog: FormationElementView | null = null;
    /** 本次配置异常的描述，用于避免重复重绘刷同一条日志。 */
    private lastElementIssue = "";
    /** 当前筛选元素，0表示全部，关闭清理。 */
    private elem = 0;
    /** 防止关闭回调重复执行。 */
    private done = false;
    /** 本页已点击出战，当前草稿在保存期间保持不变，等待服务器阵容确认。 */
    private submittedForBattle = false;

    /** 校验静态绑定，从快照建立草稿并监听本轮战力预览。 */
    public onOpen(args?: FormationRequest): void {
        this.args = args;
        this.done = false;
        this.submittedForBattle = false;
        this.closed = false;
        this.elem = 0;
        const fields = { closeButton: this.closeButton, confirmButton: this.confirmButton, confirmText: this.confirmText,
            titleLabel: this.titleLabel, tipLabel: this.tipLabel, countLabel: this.countLabel, powerLabel: this.powerLabel,
            teamBonusLabel: this.teamBonusLabel,
            elementBonusButton: this.elementBonusButton, heroScroll: this.heroScroll,
            formationButton: this.formationButton, formationLabel: this.formationLabel, filterMark: this.filterMark,
            panelBounds: this.panelBounds, slotInput: this.slotInput };
        for (const [name, value] of Object.entries(fields)) {
            if (!value) throw new Error("FormationView.prefab 缺失绑定：" + name);
        }
        if (this.elementButtons.length !== 6 || this.slots.length !== 9 ||
                new Set(this.slots.map(slot => slot.position)).size !== 9) throw new Error("阵容预制体筛选或九槽绑定无效");
        this.slots.forEach(slot => slot.validateBindings());
        this.heroScroll!.validateBindings();
        const cell = (this.heroScroll!.list.cellPrefab!.data as Node).getComponent(HeroIconCellView);
        if (!cell) throw new Error("FormationHeroCellView.prefab 缺少HeroIconCellView");
        cell.validateBindings();
        this.matrices = FormationMatrixUtils.list();
        this.fit();
        ccView.on("canvas-resize", this.fit, this);
        this.bindControls();
        const listNode = this.heroScroll!.list.node;
        listNode.on(SuperContent.SELECT_ITEM, this.onSelect, this);
        this.ownListener(() => {
            if (listNode.isValid) {
                listNode.off(SuperContent.SELECT_ITEM, this.onSelect, this);
            }
        });
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.onAssetsChanged);
        this.ownListener(EventDispatcher.instance.on(FormationEvent.PowerPreviewed, this, this.onPowerPreviewed));
        if (args?.formation?.watch) {
            this.ownListener(args.formation.watch(() => this.onAssetsChanged()));
        }
        if (args?.title) {
            this.titleLabel!.string = args.title;
        } else if (args?.closeAfterSave) {
            this.titleLabel!.string = "英雄出阵";
        }
        this.confirmText!.string = args?.closeAfterSave ? "出阵" : "保存";
        this.reload();
        if (!args?.formation) {
            EventDispatcher.instance.on(FormationEvent.SaveChanged, this, this.onSaveChanged);
            this.onSaveChanged();
        }
    }

    /** 只适配根窗口，列表尺寸归静态布局；共享遮罩由UIManager提供。 */
    private fit(): void {
        const visible = ccView.getVisibleSize(), panel = this.panelBounds!;
        const scale = Math.min(visible.width * this.maxWidthRatio / panel.width, visible.height * this.maxHeightRatio / panel.height);
        const local = scale / ViewportLayoutUtils.ancestorScale(this.node);
        this.node.setScale(local, local, 1);
        this.node.setPosition((panel.anchorX - 0.5) * panel.width * local, (panel.anchorY - 0.5) * panel.height * local, 0);
    }

    /** 注入可测试模块与Model；模板显示直接查询唯一GameConfig，不保存配置索引。 */
    public configure(module: FormationController, roster: HeroRosterModel, saves: FormationSaveModel): void {
        this.module = module;
        this.roster = roster;
        this.saves = saves;
    }

    /** 绑定出阵、阵型、元素抑制及站位输入，关页时仅从有效的原节点解绑。 */
    private bindControls(): void {
        const bind = (button: Button, run: () => void) => {
            const node = button.node;
            node.on(Button.EventType.CLICK, run);
            this.ownListener(() => {
                if (node.isValid) {
                    node.off(Button.EventType.CLICK, run);
                }
            });
        };
        bind(this.closeButton!, () => this.complete(false));
        bind(this.confirmButton!, () => this.saveDraft());
        bind(this.formationButton!, () => this.openMatrix());
        bind(this.elementBonusButton!, () => this.openElementBonus());
        this.elementButtons.forEach((button, index) => bind(button, () => {
            this.elem = index;
            this.paint();
            this.heroScroll!.toStart();
        }));
        this.slots.forEach(slot => bind(slot.button!, () => this.removeSlot(slot.position)));

        // Creator 在触摸结束点离开接收节点时改派取消事件，必须由整块区域接收手势。
        const input = this.slotInput!.node;
        input.on(Node.EventType.TOUCH_START, this.onSlotTouchStart, this);
        input.on(Node.EventType.TOUCH_MOVE, this.onSlotTouchMove, this);
        input.on(Node.EventType.TOUCH_END, this.onSlotTouchEnd, this);
        input.on(Node.EventType.TOUCH_CANCEL, this.onSlotTouchCancel, this);
        this.ownListener(() => {
            input.off(Node.EventType.TOUCH_START, this.onSlotTouchStart, this);
            input.off(Node.EventType.TOUCH_MOVE, this.onSlotTouchMove, this);
            input.off(Node.EventType.TOUCH_END, this.onSlotTouchEnd, this);
            input.off(Node.EventType.TOUCH_CANCEL, this.onSlotTouchCancel, this);
        });
    }

    /** 同版本更新保留有效草稿并清除失效借将；阵容换版时按当前保存状态重新加载。 */
    private onAssetsChanged(): void {
        if (this.closed) return;
        const current = this.currentFormation();
        const draftReplaced = !current || current.version !== this.state.lineup.version;
        if (draftReplaced) {
            UIManager.instance.closeChildren(this);
        }
        if (this.args?.formation ? this.state.busy && !!current : this.saves.snapshot.busy) {
            return;
        }
        if (draftReplaced || this.state.busy) {
            this.reload("服务器阵容已更新，已载入最新数据");
        } else if (current) {
            const option = current.options?.find(row => row.formationId === this.state.formationId);
            const heroes = this.formationHeroes();
            const canBorrow = this.args?.formation?.additionalHero || this.args?.formation?.additionalHeroes;
            const lineup = canBorrow ? {
                ...this.state.lineup,
                slots: this.state.lineup.slots.filter(slot => heroes.some(hero => hero.id === slot.heroId)),
            } : this.state.lineup;
            this.state = { ...this.state, heroes, lineup,
                unlockedIds: current.unlockedIds, openPositions: option?.openPositions ?? this.state.openPositions };
            this.paint();
        }
    }

    /** 保存期间禁用编辑；只有权威站位与本页草稿相同才执行出战。 */
    private onSaveChanged(): void {
        if (this.closed) {
            return;
        }
        const status = this.saves.snapshot;
        if (status.busy) {
            this.state = { ...this.state, busy: true, message: status.savedVersion === null
                ? "正在保存阵容…" : "等待服务器阵容…" };
            this.paint();
            return;
        }
        const current = this.roster.snapshot.mainFormation;
        const draft = this.state.lineup;
        const submitted = this.submittedForBattle;
        this.submittedForBattle = false;
        if (submitted && status.savedVersion !== null && current
                && current.formationId === this.state.formationId && current.slots.length === draft.slots.length
                && draft.slots.every(slot => current.slots.some(saved => saved.position === slot.position && saved.heroId === slot.heroId))) {
            this.complete(true);
            return;
        }
        if (!current || status.savedVersion !== null || current.version !== draft.version) {
            this.reload();
        } else if (this.state.busy) {
            this.state = { ...this.state, busy: false, message: "" };
            this.paint();
        }
    }

    /** 只提交本页草稿一次，收到匹配的服务器阵容后再出战。 */
    private saveDraft(): void {
        if (this.closed || this.state.busy) return;
        if (!this.state.lineup.slots.length) {
            UIManager.instance.toast("至少上阵一名英雄");
            return;
        }
        UIManager.instance.closeChildren(this);
        const draft = {
            expectedVersion: this.state.lineup.version,
            formationId: this.state.formationId!,
            slots: this.state.lineup.slots.map(slot => ({ ...slot })),
        };
        const formation = this.args?.formation;
        if (formation) {
            this.state = { ...this.state, busy: true, message: "正在保存阵容…" };
            this.paint();
            formation.save(draft, saved => {
                if (!this.closed) {
                    if (saved) {
                        this.complete(true);
                    } else {
                        this.reload();
                    }
                }
            });
            return;
        }
        this.submittedForBattle = !!this.args?.closeAfterSave;
        void this.module.save(draft);
    }

    /** 重绘草稿、格位加成、元素光环与战力，等待保存时禁用编辑。 */
    public render(state: FormationState): void {
        this.cancelSlotGesture();
        this.state = state;
        this.tipLabel!.string = state.message || "点击选择英雄，拖动换位";
        this.countLabel!.string = "已上阵 " + state.lineup.slots.length + " / " + (state.openPositions?.length ?? 0);
        this.refreshDraftPower(state);
        this.paintElementBonus(state);
        this.formationLabel!.string = "阵型 " + (state.formationId ?? "—") + " ▼";
        const editable = this.editable();
        this.confirmButton!.interactable = !state.busy;
        const formationButton = this.formationButton!;
        const formationId = state.formationId;
        formationButton.interactable = editable && formationId !== undefined && !!state.unlockedIds?.length;
        if (formationId !== undefined) {
            ResManager.setSprite(formationButton.node, ResManager.ui("hero", "hero-select_spr-matrix-2-" + formationId),
                () => !this.closed && this.state.formationId === formationId);
        }
        const selected = this.elementButtons[this.elem].node;
        this.filterMark!.setPosition(selected.position.x, selected.position.y, 0);
        this.elementButtons.forEach(button => { button.interactable = !state.busy; });
        // 按共用名册顺序展示，独立玩法可在名称区显示该英雄的剩余生命或出战限制。
        const heroes = state.heroes
            .filter(hero => !this.elem || HeroCatalog.find(hero.templateId)?.elem === this.elem)
            .sort(HeroRosterUtils.compareOwned);
        this.heroScroll!.list.setData(heroes, (node, hero) => {
            const face = HeroCatalog.find(hero.templateId);
            const cell = node.getComponent(HeroIconCellView)!;
            const deployed = state.lineup.slots.some(slot => slot.heroId === hero.id);
            const qualification = this.args?.formation?.heroState?.(hero);
            cell.show({ kind: "owned", instanceId: hero.id,
                name: qualification?.caption || face?.name || String(hero.templateId), showName: !!qualification?.caption,
                face: face?.icon || null, elem: face?.elem || null, level: hero.level, stars: hero.star,
                locked: qualification?.canDeploy === false, deployed,
            });
            cell.button!.interactable = editable && (deployed || qualification?.canDeploy !== false);
        });
        const matrix = this.matrices.find(entry => entry.id === formationId);
        this.slots.forEach(slot => {
            const heroId = state.lineup.slots.find(row => row.position === slot.position)?.heroId;
            const hero = state.heroes.find(row => row.id === heroId);
            const face = hero ? HeroCatalog.find(hero.templateId) : null;
            const bonus = slot.position === ASSISTANCE_POSITION ? null
                : matrix?.slots[slot.position - 1]?.bonus ?? "";
            slot.show(state.openPositions?.includes(slot.position) === true, !editable,
                hero ? { face: face?.icon ?? null, stars: hero.star, level: hero.level } : null, bonus);
        });
    }

    /** 主线按普通队员去重预估；独立玩法各自核对草稿站位、阵型和版本。 */
    private refreshDraftPower(state: FormationState): void {
        const positions = state.openPositions;
        const slots = positions ? state.lineup.slots.filter(slot =>
            slot.position !== ASSISTANCE_POSITION && positions.includes(slot.position)) : [];
        const heroIds = slots.map(slot => slot.heroId).sort();
        const source = this.args?.formation;
        const formation = source?.previewPower && state.formationId && source.read() ? {
            expectedVersion: state.lineup.version,
            formationId: state.formationId,
            slots,
        } : null;
        const borrowed = this.borrowedHeroes();
        const available = !!positions && (source?.previewPower ? !!formation : !borrowed.some(row => heroIds.includes(row.id)));
        const key = available ? JSON.stringify([this.roster.snapshot.revision, formation ?? heroIds]) : null;
        if (this.powerDraft?.key === key) {
            return;
        }
        this.unschedule(this.requestDraftPower);
        this.powerLabel!.string = "-";
        this.powerDraft = key === null ? null : { key, heroIds, formation, requestId: null };
        if (this.powerDraft) {
            this.scheduleOnce(this.requestDraftPower, POWER_DEBOUNCE_SECONDS);
        }
    }

    /** 发送最近一次仍在显示的草稿，旧选择不再触发请求。 */
    private readonly requestDraftPower = (): void => {
        const draft = this.powerDraft;
        if (!this.closed && draft) {
            const source = this.args?.formation;
            draft.requestId = draft.formation && source?.previewPower
                ? source.previewPower(draft.formation) : this.module.previewPower(draft.heroIds);
        }
    };

    /** 只接受当前草稿对应的结果，零是服务器确认的真实空队战力。 */
    private onPowerPreviewed(result: { readonly requestId: string; readonly power: number | null }): void {
        if (!this.closed && result.requestId === this.powerDraft?.requestId) {
            this.powerLabel!.string = result.power === null ? "-" : String(result.power);
        }
    }

    /** 列表派发当前英雄实例，按草稿决定上阵或撤下。 */
    private onSelect(hero: FormationState["heroes"][number]): void {
        this.toggleHero(hero.id);
    }

    /** 通知应用关闭，避免重复回调；不代表任何战斗或挑战已经启动。 */
    public complete(confirmed: boolean): void {
        if (this.done) return;
        this.done = true;
        this.close();
        this.args?.complete(confirmed);
    }

    /** 释放视口、拖动与预览请求标记；模块继续接收已发送的保存回执。 */
    public onClose(): void {
        ccView.off("canvas-resize", this.fit, this);
        this.closed = true;
        this.unschedule(this.requestDraftPower);
        this.powerDraft = null;
        this.cancelSlotGesture();
        this.matrices = [];
        this.elementPreview = null;
        this.elementDialog = null;
        this.lastElementIssue = "";
        this.submittedForBattle = false;
        EventDispatcher.instance.offTarget(this);
        if (!this.done) {
            this.done = true;
            this.args?.complete(false);
        }
    }
    /** 仅从唯一快照复制草稿；未同步允许位置时不开放编辑。 */
    private reload(message = ""): void {
        const current = this.currentFormation();
        const option = current?.options?.find(row => row.formationId === current.formationId);
        if (!current || !option) {
            this.state = {...this.state, busy: true, message: "阵型配置尚未同步，请等待连接恢复"};
        } else {
            this.state = {
                heroes: this.formationHeroes(), formationId: current.formationId,
                openPositions: option.openPositions, unlockedIds: current.unlockedIds,
                lineup: {version: current.version, slots: current.slots.map(slot => ({...slot}))}, busy: false, message
            };
        }
        this.paint();
    }

    /** 只在本页草稿合并借将，普通阵容继续使用角色的唯一拥有名册。 */
    private formationHeroes(): FormationState["heroes"] {
        const owned = this.roster.snapshot.heroes;
        const borrowed = this.borrowedHeroes().filter(row => !owned.some(hero => hero.id === row.id));
        return borrowed.length ? [...borrowed, ...owned] : owned;
    }

    /** 读取所属玩法提交的可选借将；主线返回空列表。 */
    private borrowedHeroes(): readonly OwnedHero[] {
        const source = this.args?.formation;
        const borrowed = source?.additionalHero?.();
        return source?.additionalHeroes?.() ?? (borrowed ? [borrowed] : []);
    }

    /** 从本页所属玩法读取权威阵容；塔尚未同步时保持空状态。 */
    private currentFormation(): MainFormation | null | undefined {
        return this.args?.formation ? this.args.formation.read() : this.roster.snapshot.mainFormation;
    }

    /** 仅在当前页打开且服务器阵容已就绪时编辑草稿。 */
    private editable(): boolean {
        return !this.closed && !this.state.busy;
    }

    /** 已上阵则撤下，否则填入编号最小的开放空位，并校验本玩法的借将上限。 */
    private toggleHero(id: string): void {
        const hero = this.state.heroes.find(row => row.id === id);
        if (!this.editable() || !hero) {
            return;
        }
        const slots = this.state.lineup.slots;
        const deployed = slots.find(slot => slot.heroId === id);
        if (deployed) {
            this.removeSlot(deployed.position);
            return;
        }
        const source = this.args?.formation;
        if (source?.heroState?.(hero).canDeploy === false) {
            return;
        }
        const deployedIds = new Set(slots.map(slot => slot.heroId));
        const loaned = this.borrowedHeroes();
        const limit = source?.maxAdditionalHeroes;
        if (limit !== undefined && loaned.some(row => row.id === id)
            && loaned.filter(row => deployedIds.has(row.id)).length >= limit) {
            UIManager.instance.toast(`最多同时出战 ${limit} 名助战英雄`);
            return;
        }
        if (this.state.heroes.some(row => row.templateId === hero.templateId && deployedIds.has(row.id))) {
            UIManager.instance.toast("相同英雄不能重复上阵");
            return;
        }
        const openPositions = [...(this.state.openPositions ?? [])].sort((left, right) => left - right);
        const position = openPositions.find(candidate => slots.every(slot => slot.position !== candidate));
        if (position === undefined) {
            UIManager.instance.toast("没有空闲阵位");
            return;
        }
        this.updateDraftSlots([...slots, { position, heroId: id }]);
    }

    /** 撤下当前草稿指定位置的英雄，空位与关闭位置无需刷新。 */
    private removeSlot(position: number): void {
        const slots = this.state.lineup.slots;
        if (!this.editable() || !this.state.openPositions?.includes(position)
                || !slots.some(slot => slot.position === position)) {
            return;
        }
        this.updateDraftSlots(slots.filter(slot => slot.position !== position));
    }

    /** 放到开放空位时移动，放到开放占用位时交换；无效放置不改草稿。 */
    private moveSlot(from: number, to: number): void {
        const open = this.state.openPositions;
        const slots = this.state.lineup.slots;
        if (!this.editable() || from === to || !open?.includes(from) || !open.includes(to)
                || !slots.some(slot => slot.position === from)) {
            return;
        }
        this.updateDraftSlots(slots.map(slot => {
            if (slot.position === from) {
                return { ...slot, position: to };
            }
            if (slot.position === to) {
                return { ...slot, position: from };
            }
            return slot;
        }));
    }

    /** 站位调整只刷新草稿和格子，写入继续由确认按钮提交。 */
    private updateDraftSlots(slots: FormationState["lineup"]["slots"]): void {
        this.state = {
            ...this.state,
            lineup: { ...this.state.lineup, slots },
            message: "草稿已修改，点击确认保存",
        };
        this.paint();
    }

    /** 用真实屏幕坐标命中开放阵位，跟随 Creator 的相机、缩放和视口适配。 */
    private slotAt(event: EventTouch): FormationSlotView | undefined {
        const point = event.getLocation();
        return this.slots.find(slot => slot.button!.interactable && slot.node.activeInHierarchy
            && slot.node.getComponent(UITransform)!.hitTest(point, event.windowId));
    }

    /** 将指针投到输入区本地坐标，供头像跟随和移动阈值共用。 */
    private slotPointer(event: EventTouch): Vec3 {
        const point = event.getUILocation();
        return this.slotInput!.convertToNodeSpaceAR(new Vec3(point.x, point.y, 0));
    }

    /** 只跟踪在开放且已占用阵位上按下的第一根手指。 */
    private onSlotTouchStart(event: EventTouch): void {
        const touchId = event.getID();
        if (touchId === null || !this.editable() || this.slotGesture) {
            return;
        }
        const slot = this.slotAt(event);
        if (!slot || !this.state.lineup.slots.some(row => row.position === slot.position)) {
            return;
        }
        const portrait = slot.portrait!;
        this.slotGesture = {
            touchId,
            slot,
            start: this.slotPointer(event),
            originalPosition: portrait.position.clone(),
            originalSibling: portrait.getSiblingIndex(),
            previewStart: null,
        };
    }

    /** 越过点击阈值后将原头像提到阵位上方跟随手指，拖动中不修改站位。 */
    private onSlotTouchMove(event: EventTouch): void {
        const gesture = this.slotGesture;
        if (!gesture || gesture.touchId !== event.getID()) {
            return;
        }
        const offset = this.slotPointer(event).subtract(gesture.start);
        const portrait = gesture.slot.portrait!;
        if (!gesture.previewStart) {
            if (Math.hypot(offset.x, offset.y) < SLOT_DRAG_THRESHOLD) {
                return;
            }
            portrait.setParent(this.slotInput!.node, true);
            gesture.previewStart = portrait.position.clone();
        }
        portrait.setPosition(gesture.previewStart.clone().add(offset));
    }

    /** 先恢复头像布局，再按命中的站位处理移动；在原位短按仍可撤下。 */
    private onSlotTouchEnd(event: EventTouch): void {
        const gesture = this.slotGesture;
        if (!gesture || gesture.touchId !== event.getID()) {
            return;
        }
        const target = this.slotAt(event);
        this.cancelSlotGesture();
        if (!target) {
            return;
        }
        if (gesture.previewStart) {
            this.moveSlot(gesture.slot.position, target.position);
        } else if (gesture.slot === target) {
            this.removeSlot(gesture.slot.position);
        }
    }

    /** 引擎取消或拖出输入区时直接回位，无论触点下方是否有格子。 */
    private onSlotTouchCancel(event: EventTouch): void {
        if (this.slotGesture?.touchId === event.getID()) {
            this.cancelSlotGesture();
        }
    }

    /** 还原头像在原槽位的父节点与坐标；重复调用不产生副作用。 */
    private cancelSlotGesture(): void {
        const gesture = this.slotGesture;
        this.slotGesture = null;
        if (!gesture?.previewStart || !gesture.slot.isValid || !gesture.slot.portrait?.isValid) {
            return;
        }
        const portrait = gesture.slot.portrait;
        portrait.setParent(gesture.slot.node, true);
        portrait.setPosition(gesture.originalPosition);
        portrait.setSiblingIndex(gesture.originalSibling);
    }

    /** 将同一份草稿投影用于总加成、入口图标与已打开的元素说明。 */
    private paintElementBonus(state: FormationState): void {
        let preview: FormationElementPreview | null = null;
        if (state.openPositions) {
            try {
                preview = FormationElementUtils.forDraft(state);
                this.lastElementIssue = "";
            } catch (error) {
                const issue = String(error);
                if (this.lastElementIssue !== issue) {
                    GameLog.shared.classified("MODULE", "warn", "Hero", "元素加成配置无法读取：" + issue);
                    this.lastElementIssue = issue;
                }
            }
        }
        this.elementPreview = preview;
        const button = this.elementBonusButton!;
        button.interactable = !!preview && !state.busy;
        const summary = this.teamBonusLabel!;
        summary.string = preview?.summary ?? (this.lastElementIssue ? "队伍加成暂不可用" : "");
        summary.node.active = !!summary.string;
        const icon = preview?.icon ?? "10000";
        ResManager.setSprite(button.node, ResManager.ui("hero", "hero-icon_elem-" + icon),
            () => !this.closed && (this.elementPreview?.icon ?? "10000") === icon);
        if (preview) {
            this.elementDialog?.refresh();
        } else {
            this.elementDialog?.close();
        }
    }

    /** 打开只读元素说明，并登记当前实例以接收草稿的后续重绘。 */
    private openElementBonus(): void {
        const initial = this.elementPreview;
        if (this.closed || this.state.busy || !initial) {
            return;
        }
        const ui = UIManager.instance;
        void ui.openChild(this, FormationElementView, { readPreview: () => this.elementPreview ?? initial })
            .then(opened => {
                const dialog = opened as FormationElementView;
                if (!ui.ownsChild(this, dialog) || dialog === this.elementDialog) {
                    return;
                }
                if (!this.elementPreview) {
                    dialog.close();
                    return;
                }
                this.elementDialog = dialog;
                dialog.onViewClose(() => {
                    if (this.elementDialog === dialog) {
                        this.elementDialog = null;
                    }
                });
                dialog.refresh();
            }).catch(error => {
                if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                    GameLog.shared.classified("MODULE", "warn", "Hero", "元素抑制未能打开：" + String(error));
                    ui.toast("元素抑制没有打开");
                }
            });
    }

    /** 从当前草稿打开契约阵型子窗；同版本资产刷新保留草稿，换版或关闭后的结果失效。 */
    private openMatrix(): void {
        const { formationId, unlockedIds, lineup } = this.state;
        if (!this.editable() || formationId === undefined || !unlockedIds?.length) {
            return;
        }
        void UIManager.instance.openChild(this, FormationMatrixView, {
            formationId,
            unlockedIds,
            onConfirm: nextFormationId => {
                if (lineup === this.state.lineup) {
                    this.applyFormation(nextFormationId);
                }
            },
        }).catch(error => {
            if (!this.closed && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                GameLog.shared.classified("MODULE", "warn", "Hero", "契约阵型未能打开：" + String(error));
                UIManager.instance.toast("契约阵型没有打开");
            }
        });
    }

    /** 核对当前快照的版本和可选阵型，按开放格序位迁移草稿；助战只在双方开放时保留。 */
    private applyFormation(formationId: number): void {
        const currentPositions = this.state.openPositions;
        const current = this.currentFormation();
        if (!this.editable() || !currentPositions || formationId === this.state.formationId
                || current?.version !== this.state.lineup.version || !current.unlockedIds.includes(formationId)) {
            return;
        }
        const next = current.options?.find(row => row.formationId === formationId);
        if (!next) {
            return;
        }

        const previousOrdinary = currentPositions.filter(position => position !== ASSISTANCE_POSITION)
            .sort((left, right) => left - right);
        const nextOrdinary = next.openPositions.filter(position => position !== ASSISTANCE_POSITION)
            .sort((left, right) => left - right);
        const assistance = currentPositions.includes(ASSISTANCE_POSITION) && next.openPositions.includes(ASSISTANCE_POSITION)
            ? ASSISTANCE_POSITION : undefined;
        const slots: FormationState["lineup"]["slots"] = [];
        for (const slot of this.state.lineup.slots) {
            // 旧版按开放格序位迁移，空位也占一个序位，不能只对已上阵的英雄重新排队。
            const position = slot.position === ASSISTANCE_POSITION
                ? assistance : nextOrdinary[previousOrdinary.indexOf(slot.position)];
            if (position !== undefined) {
                slots.push({ ...slot, position });
            }
        }
        this.state = {
            ...this.state, formationId: next.formationId, openPositions: next.openPositions,
            lineup: { ...this.state.lineup, slots },
            message: "已切换阵型草稿，请确认保存"
        };
        this.paint();
    }

    /** 当前草稿只由本页绘制，页面关闭不接收异步更新。 */
    private paint(): void {
        if (!this.closed) this.render(this.state);
    }

}
