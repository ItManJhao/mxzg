/**
 * 主城地图 View：加载地图和建筑显示，按注入的等级及配置处理开放状态，并转交入口点击。
 */
import { _decorator, Button, Color, EventTouch, Node, Sprite, UITransform } from "cc";
import { GameConfig } from "../../../config/GameConfig";
import { ConfigName, ConfigFileMap } from "../../../config/GConfig";
import { ErrorUtils } from "../../../core/ErrorUtils";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { CityMapQuery, CityMapService } from "./CityMapService";
import { CityEffectHandle, CityEffectPlayUtils } from "./CityEffectPlayUtils";
import { CITY_CFG_BTN, CITY_CFG_EFFECT, CITY_CFG_POS, CityMapLayout, MainCityBtnFile, MainCityEffectFile, MainCityPosFile, CityMapLayoutUtils } from "./CityMapLayoutUtils";
import { PrefabLoader } from "../../../framework/assets/PrefabLoader";
import { CITY_HUB_PREFAB_PATH } from "../../../config/PrefabCatalog";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
const { ccclass, property } = _decorator;
const LOCKED_COLOR = new Color(150, 150, 150, 255);
const OPEN_COLOR = new Color(255, 255, 255, 255);
const DRAG_PX = 12;
const MAP_NODES = [
    "CityParallax",
    "spr_map_bg4",
    "spr_map_bg3",
    "spr_map_bg2",
    "spr_map_bg1",
    "spr_map_bg4_1",
    "spr_map_bg3_1",
    "spr_map_bg2_1",
    "spr_map_bg1_1",
    "spr_map_bg1_2",
];
const CITY_PLATES: {
    name: string;
    layer: number;
    piece: number;
}[] = [
    { name: "spr_map_bg4_1", layer: 4, piece: 1 },
    { name: "spr_map_bg3_1", layer: 3, piece: 1 },
    { name: "spr_map_bg2_1", layer: 2, piece: 1 },
    { name: "spr_map_bg1_1", layer: 1, piece: 1 },
    { name: "spr_map_bg1_2", layer: 1, piece: 2 },
];
const plateMisses = new Set<string>();
export interface CityHubOpenArgs {
    loadConfig?: <N extends ConfigName>(name: N) => Promise<ConfigFileMap[N]>;
    onAtom: (atom: string) => void;
    onMainline: () => void;
    query: CityMapQuery;
}
/**
 * 主城地图。视差和建筑都绑在 CityHub 上。
 * 生命周期仅由RemakeHomeView持有，不独立登记到UIManager。
 * 点击交给打开参数里的 onAtom，主线按钮交给原来的主线页。
 * 锁态只问 query，这里不读协议。
 */
@ccclass("CityHubView")
export class CityHubView extends BaseView<CityHubOpenArgs> {
    /** 预制体绑定的主城视差根节点，横向滚动只改变该根与各背景层的位置。 */
    @property(Node)
    parallax: Node | null = null;
    /** 预制体绑定的地图图层和底板节点，首次打开按名称建立索引。 */
    @property([Node])
    mapNodes: Node[] = [];
    /** 预制体绑定的建筑入口节点，配置只决定其位置和锁定显示。 */
    @property([Node])
    spots: Node[] = [];
    /** 预制体绑定的特效挂点，动态播放器在这些既有挂点内工作。 */
    @property([Node])
    effects: Node[] = [];
    /** 预制体绑定的主线入口按钮，点击操作由主城宿主注入。 */
    @property(Node)
    btnMainline: Node | null = null;
    /** 当前实例已读取的位置配置，首次异步准备完成前为null。 */
    private pos: MainCityPosFile | null = null;
    /** 当前实例已读取的建筑按钮配置，首次异步准备完成前为null。 */
    private btn: MainCityBtnFile | null = null;
    /** 当前实例已读取的主城特效配置，首次异步准备完成前为null。 */
    private effect: MainCityEffectFile | null = null;
    /** 当前视口与配置生成的布局描述，配置就绪或视口变化时整体重算。 */
    private layout: CityMapLayout = CityMapLayoutUtils.buildCityMapLayout(null, null, null);
    /** 节点名称到本实例已绑定节点的索引，首次收集时清空后重建。 */
    private views = new Map<string, Node>();
    /** 建筑atom配置键到已绑定Sprite的索引，用于刷新锁定颜色，不保存开放规则副本。 */
    private spotViews = new Map<string, {
        sprite: Sprite | null;
    }>();
    /** 当前地图横向滚动位置，单位为UI像素，更新时限制在布局允许区间。 */
    private scroll = 0;
    /** 当前手势超过拖动阈值后为true，用于屏蔽同次手势产生的建筑和主线点击。 */
    private dragged = false;
    /** 本实例发生过有效拖动后为true，视口更新时保留用户滚动位置。 */
    private gestureMoved = false;
    /** 当前手势累计的横向移动绝对距离，单位为UI像素，触摸开始或取消时归零。 */
    private movedPx = 0;
    /** 本实例主城特效的停止入口；初始化后设置，清理时停止并置null。 */
    private fxHandle: CityEffectHandle | null = null;
    /** 首次打开开始初始化后为true，防止同一实例重复装配按钮与特效。 */
    private started = false;
    /** 建筑按钮已开始绑定时为true，同一实例后续刷新不重复登记点击。 */
    private clicksBound = false;
    /** 关闭或释放后为true，重复清理直接返回，异步配置完成时据此拒绝继续写页面。 */
    private cleaned = false;
    /** 返回主城地图根节点，由RemakeHomeView统一持有其显示和生命周期。 */
    get root(): Node {
        return this.node;
    }

    /** 左下主线入口。文案仍由 MainApp 写成当前关。 */
    get mainButton(): Node | null {
        return this.btnMainline;
    }
    /** 接收主城配置和入口操作，首次异步初始化；已开始的实例只刷新建筑锁态。 */
    onOpen(args?: CityHubOpenArgs): void {
        if (args) {
            this.args = args;
        }
        if (this.started) {
            this.refreshLocks();
            return;
        }
        this.started = true;
        this.beginOpen();
        void this.initializeCity();
    }
    /** 关闭主城地图时停止特效并解除触摸监听，不释放应用持有的资源缓存。 */
    onClose(): void {
        this.cleanup();
    }
    /** 释放地图实例的动态显示和触摸监听；与关闭共用幂等清理，不重复停止特效。 */
    dispose(): void {
        this.cleanup();
    }

    /** 等级或开服天变了再刷建筑锁。没有 query 就不改预制上的颜色。 */
    refreshLocks(): void {
        const query = this.args ? this.args.query : null;
        if (!query) {
            GameLog.shared.classified("MODULE", "warn", "CityHubView", "没有等级数据，不改建筑锁");
            return;
        }
        this.spotViews.forEach((spot, atom) => {
            const locked = CityMapLayoutUtils.cityAtomLocked(atom, query.level(), query.openDay(), query.db());
            if (!spot.sprite) {
                return;
            }
            spot.sprite.grayscale = locked;
            spot.sprite.color = locked ? LOCKED_COLOR : OPEN_COLOR;
        });
    }

    /** 收集已绑定节点、读取三张主城表并完成入口和特效装配；关闭后丢弃迟到结果，初始化异常使开页等待失败。 */
    private async initializeCity(): Promise<void> {
        try {
            if (!this.args) {
                throw new Error("主城没有打开参数");
            }
            this.collect();
            this.requireBound();
            this.layout = CityMapLayoutUtils.buildCityMapLayout(this.pos, this.btn, this.effect);
            ViewportLayoutUtils.bindVisibleRefresh(this.node, () => this.applyVisible());
            this.ensurePlates();
            const loaded = await Promise.all([
                this.loadCfg(CITY_CFG_POS),
                this.loadCfg(CITY_CFG_BTN),
                this.loadCfg(CITY_CFG_EFFECT),
            ]);
            if (this.cleaned || !this.node || !this.node.isValid) {
                this.failOpen(new Error("页面已关"));
                return;
            }
            this.pos = loaded[0];
            this.btn = loaded[1];
            this.effect = loaded[2];
            this.applyVisible();
            this.bindSpots();
            if (this.spotViews.size < 1 || !this.views.has("spot-main_summon")) {
                throw new Error("CityHub 没有建筑按钮");
            }
            this.fxHandle = CityEffectPlayUtils.startCityEffects(this.views, this.layout.effects, (node, parent, x, y) => this.placeBottomLeft(node, parent, x, y));
            this.bindMainline();
            this.bindDrag();
            this.refreshLocks();
            GameLog.shared.classified("MODULE", "info", "CityHubView", "view buildings=" + this.spotViews.size + " scroll=" + this.scroll + " " + CITY_HUB_PREFAB_PATH);
            this.finishOpen();
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(ErrorUtils.messageOf(err));
            GameLog.shared.classified("MODULE", "warn", "CityHubView", "没有挂上 " + error.message);
            this.failOpen(error);
        }
    }

    /** 只用预制上绑好的节点。不从根往下扫。 */
    private collect(): void {
        this.views.clear();
        const add = (node: Node | null): void => {
            if (!node) {
                return;
            }
            if (!this.views.has(node.name)) {
                this.views.set(node.name, node);
            }
        };
        add(this.parallax);
        add(this.btnMainline);
        this.addAll(this.mapNodes);
        this.addAll(this.spots);
        this.addAll(this.effects);
    }

    /** 将预制体绑定的节点按名称加入本实例索引，跳过空引用和已存在名称。 */
    private addAll(list: Node[] | null): void {
        if (!list) {
            return;
        }
        for (let i = 0; i < list.length; i++) {
            const node = list[i];
            if (!node) {
                continue;
            }
            if (!this.views.has(node.name)) {
                this.views.set(node.name, node);
            }
        }
    }

    /** 检查主城底板、视差根及主线按钮的静态绑定，缺失时中止初始化。 */
    private requireBound(): void {
        if (!this.parallax) {
            throw new Error("缺少节点 CityParallax");
        }
        for (let i = 0; i < MAP_NODES.length; i++) {
            if (!this.views.has(MAP_NODES[i])) {
                throw new Error("缺少节点 " + MAP_NODES[i]);
            }
        }
        if (!this.btnMainline) {
            throw new Error("缺少节点 BtnMainline");
        }
        if (!this.btnMainline.getComponent(Button)) {
            throw new Error("BtnMainline 缺少 Button");
        }
    }

    /** 首次为已配置建筑绑定点击和锁态显示索引；拖动手势结束前忽略建筑点击。 */
    private bindSpots(): void {
        if (this.clicksBound) {
            return;
        }
        this.clicksBound = true;
        const onAtom = this.args ? this.args.onAtom : null;
        if (!onAtom) {
            throw new Error("主城没有建筑回调");
        }
        for (let i = 0; i < this.layout.buildings.length; i++) {
            const spot = this.layout.buildings[i];
            const node = this.views.get("spot-" + spot.atom);
            if (!node) {
                continue;
            }
            node.setScale(spot.scale, spot.scale, 1);
            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.color = OPEN_COLOR;
            }
            if (!node.getComponent(Button)) {
                throw new Error(node.name + " 缺少 Button");
            }
            PrefabLoader.bindClick(node, () => {
                if (this.dragged) {
                    return;
                }
                onAtom(spot.atom);
            });
            this.spotViews.set(spot.atom, { sprite });
        }
    }

    /** 绑定已有主线按钮并转交宿主操作；缺少按钮或回调时拒绝初始化。 */
    private bindMainline(): void {
        const button = this.btnMainline;
        const onMainline = this.args ? this.args.onMainline : null;
        if (!button || !onMainline) {
            throw new Error("主城没有主线按钮");
        }
        PrefabLoader.bindClick(button, () => {
            if (this.dragged) {
                return;
            }
            onMainline();
        });
    }

    /** 登记地图触摸开始、移动和取消事件，关闭时由cleanup按同一目标解除。 */
    private bindDrag(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchStart, this);
    }

    /** 重置当前手势的拖动标记和累计横向移动距离，供点击与拖动判定使用。 */
    private onTouchStart(): void {
        this.dragged = false;
        this.movedPx = 0;
    }

    /** 累计横向移动像素并在超过阈值后屏蔽点击，同时把地图滚动限制在配置边界内。 */
    private onTouchMove(event: EventTouch): void {
        const delta = event.getUIDelta();
        const dx = delta && typeof delta.x === "number" ? delta.x : 0;
        this.movedPx += Math.abs(dx);
        if (this.movedPx > DRAG_PX) {
            this.dragged = true;
            this.gestureMoved = true;
        }
        this.applyScroll(CityHubView.clamp(this.scroll + dx, this.layout.minScroll, this.layout.maxScroll));
    }

    /** 根据当前视口重算既有地图、建筑和特效的动态布局；未手动拖动时使用默认中心位置。 */
    private applyVisible(): void {
        if (!this.node || !this.node.isValid || !this.parallax) {
            return;
        }
        const box = ViewportLayoutUtils.fitCityViewport(this.node);
        this.layout = CityMapLayoutUtils.buildCityMapLayout(this.pos, this.btn, this.effect, { viewW: box.width, viewH: box.height });
        const parallaxUi = this.parallax.getComponent(UITransform);
        if (parallaxUi) {
            ViewportLayoutUtils.assignContentSize(parallaxUi, this.layout.contentW, this.layout.viewH);
            parallaxUi.setAnchorPoint(0, 0);
        }
        for (let i = 0; i < this.layout.nodes.length; i++) {
            const desc = this.layout.nodes[i];
            const node = this.views.get(desc.name);
            if (!node) {
                throw new Error("缺少节点 " + desc.name);
            }
            CityHubView.fitNode(node, desc.w, desc.h, desc.ax, desc.ay, desc.scale);
            if (desc.parallax) {
                continue;
            }
            const host = desc.parent ? this.views.get(desc.parent) : this.parallax;
            if (!host) {
                continue;
            }
            this.placeBottomLeft(node, host, desc.x, desc.y);
        }
        for (let i = 0; i < this.layout.effects.length; i++) {
            const spot = this.layout.effects[i];
            const node = this.views.get("fx-" + spot.name);
            if (!node) {
                continue;
            }
            const parent = this.views.get(spot.parent);
            if (!parent || node.parent !== parent) {
                continue;
            }
            this.placeBottomLeft(node, parent, spot.x, spot.y);
        }
        this.placeBuildings();
        if (this.btnMainline) {
            ViewportLayoutUtils.squeezeWideNode(this.btnMainline, box.width);
        }
        if (!this.gestureMoved) {
            this.scroll = this.layout.scroll;
        }
        else {
            this.scroll = CityHubView.clamp(this.scroll, this.layout.minScroll, this.layout.maxScroll);
        }
        this.applyScroll(this.scroll);
    }

    /** 根据当前布局描述把既有建筑节点放回所属图层，不创建或替换建筑。 */
    private placeBuildings(): void {
        for (let i = 0; i < this.layout.buildings.length; i++) {
            const spot = this.layout.buildings[i];
            const node = this.views.get("spot-" + spot.atom);
            const parent = this.views.get(spot.parent);
            if (!node || !parent) {
                continue;
            }
            node.setScale(spot.scale, spot.scale, 1);
            this.placeBottomLeft(node, parent, spot.x, spot.y);
        }
    }

    /** 保存地图横向滚动像素，并按各层视差比例更新既有背景节点。 */
    private applyScroll(next: number): void {
        if (!this.parallax) {
            return;
        }
        this.scroll = next;
        // 城景贴视口底边。底栏盖在上面。不要把整层上移，否则屏底露出页面黑底。
        this.placeBottomLeft(this.parallax, this.node, this.scroll, 0);
        for (let i = 0; i < this.layout.nodes.length; i++) {
            const desc = this.layout.nodes[i];
            if (!desc.parallax) {
                continue;
            }
            const node = this.views.get(desc.name);
            if (!node) {
                continue;
            }
            this.placeBottomLeft(node, this.parallax, CityMapLayoutUtils.layerCoverX(this.scroll, desc.parallax.ratio, desc.parallax.ox, desc.ax, desc.w, desc.scale, this.layout.viewW), desc.parallax.oy);
        }
    }

    /** 将配置的左下角坐标换算为父节点锚点坐标，再更新现有节点位置。 */
    private placeBottomLeft(node: Node, parent: Node, x: number, y: number): void {
        const ui = parent.getComponent(UITransform);
        const size = ViewportLayoutUtils.uiSize(ui) || { width: 0, height: 0 };
        const anchor = CityHubView.anchorOf(ui);
        node.setPosition(x - size.width * anchor.x, y - size.height * anchor.y, 0);
    }

    /** 检查全部主城底板，每张最多尝试三次；已具备有效纹理的底板直接复用。 */
    private ensurePlates(): void {
        for (let i = 0; i < CITY_PLATES.length; i++) {
            this.fillPlate(CITY_PLATES[i], 3);
        }
    }

    /** 为尚未就绪的底板补图；仅在Sprite有效时接收迟到结果，明确失败后按剩余次数重试。 */
    private fillPlate(plate: {
        name: string;
        layer: number;
        piece: number;
    }, left: number): void {
        const node = this.views.get(plate.name);
        if (!node) {
            return;
        }
        const sprite = node.getComponent(Sprite);
        if (!sprite || CityHubView.plateReady(sprite)) {
            return;
        }
        const path = CityMapLayoutUtils.mapFramePath(plate.layer, plate.piece, 1);
        void CityMapService.instance.paintCitySpriteWhenReady(path, (frame) => {
            if (!sprite.isValid || CityHubView.plateReady(sprite)) {
                return;
            }
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }).then((status) => {
            if (!sprite.isValid || CityHubView.plateReady(sprite) || status === "ok") {
                return;
            }
            if (left > 1) {
                CityMapService.instance.dropCitySpriteLoad(path);
                this.fillPlate(plate, left - 1);
                return;
            }
            if (plateMisses.has(path)) {
                return;
            }
            plateMisses.add(path);
            GameLog.shared.classified("MODULE", "warn", "CityHubView", "plate miss " + path);
        });
    }

    /** 读取已提交的类型化主城表；失败记录表名并返回null，由页面统一处理初始化结果，不绕过加载器。 */
    private async loadCfg<N extends ConfigName>(path: N): Promise<ConfigFileMap[N] | null> {
        try {
            return this.args?.loadConfig ? await this.args.loadConfig(path) : GameConfig.instance.getFile(path);
        }
        catch (err) {
            GameLog.shared.classified("MODULE", "error", "CityHubView", path + " " + (err instanceof Error ? err.message : "load failed"));
            return null;
        }
    }

    /** 幂等标记页面关闭，停止特效并解除地图触摸监听；迟到配置通过该标记拒绝继续装配。 */
    private cleanup(): void {
        if (this.cleaned) {
            return;
        }
        this.cleaned = true;
        if (this.fxHandle) {
            this.fxHandle.stop();
            this.fxHandle = null;
        }
        if (!this.node || !this.node.isValid) {
            return;
        }
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchStart, this);
    }

    /** 设置已有主城节点的尺寸、锚点与缩放，不重建页面层级。 */
    private static fitNode(node: Node, w: number, h: number, ax: number, ay: number, scale: number): void {
        const ui = node.getComponent(UITransform);
        if (ui) {
            ViewportLayoutUtils.assignContentSize(ui, w, h);
            ui.setAnchorPoint(ax, ay);
        }
        node.setScale(scale, scale, 1);
        const sprite = node.getComponent(Sprite);
        if (!sprite) {
            return;
        }
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const trimable = sprite as Sprite & {
            trim?: boolean;
        };
        if (typeof trimable.trim === "boolean") {
            trimable.trim = false;
        }
    }

    /** 检查主城底板帧及纹理是否就绪，底层资源异常时返回false。 */
    private static plateReady(sprite: Sprite): boolean {
        try {
            const frame = sprite.spriteFrame;
            if (!frame) {
                return false;
            }
            const texture = frame.texture;
            return !!texture && typeof texture.width === "number" && texture.width > 0;
        }
        catch (_err) {
            return false;
        }
    }

    /** 读取既有节点锚点，节点未提供尺寸组件时使用中心锚点。 */
    private static anchorOf(ui: UITransform | null): {
        x: number;
        y: number;
    } {
        if (!ui) {
            return { x: 0.5, y: 0.5 };
        }
        if (typeof ui.anchorX === "number" && typeof ui.anchorY === "number") {
            return { x: ui.anchorX, y: ui.anchorY };
        }
        const point = ui.anchorPoint;
        if (point && typeof point.x === "number" && typeof point.y === "number") {
            return { x: point.x, y: point.y };
        }
        return { x: 0.5, y: 0.5 };
    }

    /** 将数值限制在给定最小值与最大值之间。 */
    private static clamp(value: number, min: number, max: number): number {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }
}
