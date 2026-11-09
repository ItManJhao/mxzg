/** 主线阵容页面：复用旧阵位和美术，SuperScroll绘制名册，所有写操作交给FormationController。 */
import { _decorator, Button, Label, Node, UITransform, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { ancestorScale } from "../../../framework/ui/visibleFit";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { HeroIconCellView } from "./HeroIconCellView";
import { FormationSlotView } from "./FormationSlotView";
import { EventDispatcher } from "../../../framework/EventDispatcher";
import { FormationController } from "../FormationController";
import { FormationSaveModel } from "../FormationSaveModel";
import { HeroRosterModel } from "../HeroRosterModel";
import { FormationEvent } from "../utils/FormationEvent";
import { HeroRosterEvent } from "../utils/HeroRosterEvent";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { HeroCatalog } from "../utils/HeroCatalog";
import type { FormationState } from "../data/FormationData";

const { ccclass, property } = _decorator;
/** 应用可注入关闭结果，保存成功仍留在编辑页供核对服务端同步。 */
export interface FormationRequest {
    /** 关闭结果；只有本次出战草稿被服务端确认后才返回true。 */
    complete(confirmed: boolean): void;
    /** 主线出战确认保存成功后关闭；普通布阵仍留在页面。 */
    closeAfterSave?: boolean;
}

@ccclass("FormationView")
export class FormationView extends BaseView<FormationRequest> {
    /** 关闭按钮，丢弃未保存草稿。 */
    @property(Button) closeButton: Button | null = null;
    /** 明确保存按钮，未知结果时重试原请求。 */
    @property(Button) confirmButton: Button | null = null;
    /** 标题文字与样式保留在预制体。 */
    @property(Label) titleLabel: Label | null = null;
    /** 草稿、保存和断线提示。 */
    @property(Label) tipLabel: Label | null = null;
    /** 当前上阵数及可用阵位数。 */
    @property(Label) countLabel: Label | null = null;
    /** 统一列表组件；列数、尺寸、间距和Cell均由Prefab维护。 */
    @property(SuperScroll) heroScroll: SuperScroll | null = null;
    /** 元素筛选选中标记。 */
    @property(Node) filterMark: Node | null = null;
    /** 全部及五元素筛选按钮。 */
    @property([Button]) elementButtons: Button[] = [];
    /** 九个旧版站位组件，开放状态来自服务器。 */
    @property([FormationSlotView]) slots: FormationSlotView[] = [];
    /** 复用旧阵型按钮，循环已解锁阵型。 */
    @property(Button) formationButton: Button | null = null;
    /** 当前草稿阵型编号，不推算解锁。 */
    @property(Label) formationLabel: Label | null = null;
    /** 面板设计尺寸与锚点。 */
    @property(UITransform) panelBounds: UITransform | null = null;
    /** 背景拦截按钮，只关闭当前弹窗。 */
    @property(Button) backdropButton: Button | null = null;
    /** 背景可点击区域，跟随可见尺寸。 */
    @property(UITransform) backdropBounds: UITransform | null = null;
    /** 最大屏宽占比。 */
    @property maxWidthRatio = 0.94;
    /** 最大屏高占比。 */
    @property maxHeightRatio = 0.80;
    /** 应用唯一业务模块，只发送保存意图，不管理本页。 */
    private module = FormationController.instance;
    /** 当前角色权威英雄与阵容，只读。 */
    private roster = HeroRosterModel.instance;
    /** 模块保存进度，窗口关闭不销毁。 */
    private saves = FormationSaveModel.instance;
    /** 未保存草稿仅属于当前页面。 */
    private selected: string | null = null;
    /** 页面关闭后不再绘制。 */
    private closed = true;
    /** 只读模板显示索引。 */
    private catalog: HeroCatalog | null = null;
    /** 当前页面草稿，绝不回写权威Model。 */
    private state: FormationState = { heroes: [], lineup: { version: 0, slots: [] }, busy: true, message: "等待阵容同步…" };
    /** 当前筛选元素，0表示全部，关闭清理。 */
    private elem = 0;
    /** 防止关闭回调重复执行。 */
    private done = false;
    /** 本页出战确认时提交的草稿，匹配权威快照后才允许进入挑战；取消时清空。 */
    private submitted: { version: number; formationId: number; slots: { position: number; heroId: string }[] } | null = null;

    /** 校验静态绑定并开始适配，不创建布局节点或查询状态。 */
    public onOpen(args?: FormationRequest): void {
        this.args = args;
        this.done = false;
        this.submitted = null;
        this.closed = false;
        this.elem = 0;
        const fields = { closeButton: this.closeButton, confirmButton: this.confirmButton, titleLabel: this.titleLabel,
            tipLabel: this.tipLabel, countLabel: this.countLabel, heroScroll: this.heroScroll,
            formationButton: this.formationButton, formationLabel: this.formationLabel, filterMark: this.filterMark,
            panelBounds: this.panelBounds, backdropButton: this.backdropButton, backdropBounds: this.backdropBounds };
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
        this.fit();
        view.on("canvas-resize", this.fit, this);
        this.catalog ??= new HeroCatalog(GameConfig.instance.getFile(GConfig.HeroType), GameConfig.instance.getFile(GConfig.Item));
        this.bindControls();
        EventDispatcher.instance.on(HeroRosterEvent.Updated, this, this.onAssetsChanged);
        EventDispatcher.instance.on(FormationEvent.SaveChanged, this, this.onSaveChanged);
        this.reload();
        this.onSaveChanged();
    }

    /** 只适配根窗口和背景命中区域，列表尺寸由静态布局维护。 */
    private fit(): void {
        const visible = view.getVisibleSize(), panel = this.panelBounds!;
        const scale = Math.min(visible.width * this.maxWidthRatio / panel.width, visible.height * this.maxHeightRatio / panel.height);
        const local = scale / ancestorScale(this.node);
        this.node.setScale(local, local, 1);
        this.node.setPosition((panel.anchorX - 0.5) * panel.width * local, (panel.anchorY - 0.5) * panel.height * local, 0);
        this.backdropBounds!.node.setPosition((0.5 - panel.anchorX) * panel.width, (0.5 - panel.anchorY) * panel.height, 0);
        this.backdropBounds!.setContentSize(visible.width / scale, visible.height / scale);
    }

    /** 注入可测试依赖；生产默认使用应用持有的唯一模块与Model，不创建页面控制器。 */
    public configure(module: FormationController, roster: HeroRosterModel, saves: FormationSaveModel, catalog: HeroCatalog): void {
        this.module = module;
        this.roster = roster;
        this.saves = saves;
        this.catalog = catalog;
    }

    /** 页面自己绑定交互，关闭仅清理自身按钮监听。 */
    private bindControls(): void {
        const bind = (button: Button, run: () => void) => {
            button.node.on(Button.EventType.CLICK, run);
            this.ownListener(() => button.node.off(Button.EventType.CLICK, run));
        };
        bind(this.closeButton!, () => this.complete(false));
        bind(this.backdropButton!, () => this.complete(false));
        bind(this.confirmButton!, () => this.saveDraft());
        bind(this.formationButton!, () => this.cycleFormation());
        this.elementButtons.forEach((button, index) => bind(button, () => {
            this.elem = index;
            this.paint();
            this.heroScroll!.toStart();
        }));
        this.slots.forEach(slot => bind(slot.button!, () => this.remove(slot.position)));
    }

    /** 资产事件只读取Model；同版本名册变化保留草稿，外部保存则载入最新版本。 */
    private onAssetsChanged(): void {
        if (this.closed) return;
        const current = this.roster.snapshot.mainFormation;
        if (this.saves.snapshot.pending || this.saves.snapshot.busy) return;
        if (current && (this.state.busy || current.version !== this.state.lineup.version)) {
            this.reload("服务器阵容已更新，已载入最新数据");
        } else if (current) {
            const option = current.options?.find(row => row.formationId === this.state.formationId);
            this.state = { ...this.state, heroes: this.roster.snapshot.heroes,
                unlockedIds: current.unlockedIds, openPositions: option?.openPositions ?? this.state.openPositions };
            if (!this.state.heroes.some(hero => hero.id === this.selected)) this.selected = null;
            this.paint();
        }
    }

    /** 保存过程事件只驱动当前页；未确认请求由模块保留，重开仍显示原请求并允许重试。 */
    private onSaveChanged(): void {
        if (this.closed) return;
        const status = this.saves.snapshot;
        const current = this.roster.snapshot.mainFormation;
        const draft = this.submitted;
        if (this.args?.closeAfterSave && draft && !status.busy && !status.pending
                && status.acknowledged === null && !!status.confirmedRequestId && current && current.version >= draft.version
                && current.formationId === draft.formationId && current.slots.length === draft.slots.length
                && draft.slots.every(slot => current.slots.some(saved => saved.position === slot.position && saved.heroId === slot.heroId))) {
            this.submitted = null;
            this.complete(true);
            return;
        }
        if (status.pending) {
            const request = status.pending;
            const option = this.roster.snapshot.mainFormation?.options?.find(row => row.formationId === request.formationId);
            this.state = { ...this.state, formationId: request.formationId, openPositions: option?.openPositions,
                lineup: { version: request.expectedVersion, slots: request.slots.map(slot => ({ ...slot })) },
                busy: status.busy, message: status.message };
            this.paint();
        } else if (status.busy) {
            this.state = { ...this.state, busy: true, message: status.message };
            this.paint();
        } else if (status.message) {
            this.reload(status.message);
        }
    }

    /** 页面空阵提示不抛异常；只向模块提交草稿，结果通过事件回来。 */
    private saveDraft(): void {
        if (this.closed || this.state.busy) return;
        if (!this.saves.snapshot.pending && !this.state.lineup.slots.length) {
            this.state.message = "至少上阵一名英雄";
            this.paint();
            return;
        }
        if (this.args?.closeAfterSave) {
            this.submitted = { version: this.state.lineup.version, formationId: this.state.formationId!,
                slots: this.state.lineup.slots.map(slot => ({ ...slot })) };
        }
        void this.module.save({ expectedVersion: this.state.lineup.version,
            formationId: this.state.formationId!, slots: this.state.lineup.slots.map(slot => ({ ...slot })) });
    }

    /** 根据草稿绘制；统一列表只setData，不计算格子坐标或内容高度。 */
    public render(state: FormationState): void {
        this.state = state;
        this.tipLabel!.string = state.message;
        this.countLabel!.string = "已上阵 " + state.lineup.slots.length + " / " + (state.openPositions?.length ?? 0);
        this.formationLabel!.string = "阵型 " + (state.formationId ?? "—") + " ▼";
        this.confirmButton!.interactable = !state.busy;
        this.formationButton!.interactable = !state.busy && (state.unlockedIds?.length ?? 0) > 1;
        const selected = this.elementButtons[this.elem].node;
        this.filterMark!.setPosition(selected.position.x, selected.position.y, 0);
        this.elementButtons.forEach(button => { button.interactable = !state.busy; });
        const heroes = state.heroes.filter(hero => !this.elem || this.catalog!.find(hero.templateId)?.elem === this.elem);
        this.heroScroll!.list.setData(heroes, (node, hero) => {
            const face = this.catalog!.find(hero.templateId);
            node.getComponent(HeroIconCellView)!.show({ kind: "owned", instanceId: hero.id,
                name: face?.name || String(hero.templateId), showName: false,
                face: face?.icon || null, elem: face?.elem || null, level: hero.level, stars: hero.star, locked: false,
                deployed: state.lineup.slots.some(slot => slot.heroId === hero.id),
            }, state.busy ? null : () => this.toggle(hero.id));
        });
        this.slots.forEach(slot => {
            const heroId = state.lineup.slots.find(row => row.position === slot.position)?.heroId;
            const hero = state.heroes.find(row => row.id === heroId);
            const face = hero ? this.catalog!.find(hero.templateId) : null;
            slot.show(state.openPositions?.includes(slot.position) === true, state.busy,
                hero ? face?.name || String(hero.templateId) : null, face?.icon || null);
        });
    }

    /** 通知应用关闭，避免重复回调；不代表任何战斗或挑战已经启动。 */
    public complete(confirmed: boolean): void {
        if (this.done) return;
        this.done = true;
        this.close();
        this.args?.complete(confirmed);
    }

    /** 释放视口监听和临时绘制引用；只清理本页按钮与事件，模块继续接收回执。 */
    public onClose(): void {
        view.off("canvas-resize", this.fit, this);
        this.closed = true;
        this.submitted = null;
        EventDispatcher.instance.offTarget(this);
        this.selected = null;
        if (!this.done) {
            this.done = true;
            this.args?.complete(false);
        }
    }
    /** 仅从唯一快照复制草稿；未同步允许位置时不开放编辑。 */
    private reload(message = "点击英雄，再点击阵位；未选英雄时点击阵位可撤下"): void {
        const snapshot = this.roster.snapshot, current = snapshot.mainFormation;
        const option = current?.options?.find(row => row.formationId === current.formationId);
        if (!current || !option) {
            this.state = {...this.state, busy: true, message: "阵型配置尚未同步，请等待连接恢复"};
        } else {
            this.selected = null;
            this.state = {
                heroes: snapshot.heroes, formationId: current.formationId,
                openPositions: option.openPositions, unlockedIds: current.unlockedIds,
                lineup: {version: current.version, slots: current.slots.map(slot => ({...slot}))}, busy: false, message
            };
        }
        this.paint();
    }

    /** 保存不明时锁定草稿；只能以原参数重试，不能顺带创建新操作。 */
    private editable(): boolean {
        return !this.closed && !this.state.busy && !this.saves.snapshot.pending && this.saves.snapshot.acknowledged === null;
    }

    /** 选中同一英雄可取消，所选实例必须仍归当前角色所有。 */
    private toggle(id: string): void {
        if (!this.editable() || !this.state.heroes.some(hero => hero.id === id)) return;
        this.selected = this.selected === id ? null : id;
        this.state = {...this.state, message: this.selected ? "已选英雄，请点击目标阵位" : "已取消选择"};
        this.paint();
    }

    /** 放置会移除原位置和同模板草稿项；无选中英雄时仅撤下，服务器仍执行最终校验。 */
    private remove(position: number): void {
        if (!this.editable() || !this.state.openPositions?.includes(position)) return;
        const chosen = this.state.heroes.find(hero => hero.id === this.selected);
        const slots = this.state.lineup.slots.filter(slot => slot.position !== position &&
            (!chosen || this.state.heroes.find(hero => hero.id === slot.heroId)?.templateId !== chosen.templateId));
        if (chosen) slots.push({position, heroId: chosen.id});
        this.selected = null;
        this.state = {...this.state, lineup: {...this.state.lineup, slots}, message: "草稿已修改，点击确认保存"};
        this.paint();
    }

    /** 切换已解锁阵型，关闭位置仅从草稿移除；不提前写服务器。 */
    private cycleFormation(): void {
        if (!this.editable()) return;
        const options = this.roster.snapshot.mainFormation?.options || [];
        const next = options[(options.findIndex(row => row.formationId === this.state.formationId) + 1) % options.length];
        if (!next) return;
        this.selected = null;
        this.state = {
            ...this.state, formationId: next.formationId, openPositions: next.openPositions,
            lineup: {
                ...this.state.lineup,
                slots: this.state.lineup.slots.filter(slot => next.openPositions.includes(slot.position))
            },
            message: "已切换阵型草稿，请确认保存"
        };
        this.paint();
    }

    /** 当前草稿只由本页绘制，页面关闭不接收异步更新。 */
    private paint(): void {
        if (!this.closed) this.render(this.state);
    }

}
