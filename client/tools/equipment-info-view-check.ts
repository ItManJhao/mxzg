/**
 * 普通装备详情视图回归：读取实际Prefab和同源配置，检查静态字段、库存键分流、只读按钮和生命周期。
 * 引擎替身不模拟垂直Layout的最终高度，真实尺寸、换行和画面由Creator浏览器预览另行验证。
 * 不连接业务服务器、不写数据库，Model数据只用于本测试的独立内存夹具。
 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { BlockInputEvents, Button, Color, Label, Layout, Node, Prefab, Sprite, SpriteFrame, UITransform, Widget } from "cc";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { BagEvent } from "../assets/scripts/features/bag/utils/BagEvent";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { BagView } from "../assets/scripts/features/bag/ui/BagView";
import { BagInfoView } from "../assets/scripts/features/bag/ui/BagInfoView";
import { EquipmentInfoView } from "../assets/scripts/features/bag/ui/EquipmentInfoView";
import { EquipmentAttributeCellView } from "../assets/scripts/features/bag/ui/EquipmentAttributeCellView";

const prefabPath = "client/assets/bundles/module/bag/prefabs/EquipmentInfoView.prefab";

/** 读取同源JSON配置或Creator资源，不改写原文件。 */
function read(path: string): any {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

/** 根据正式脚本meta计算Creator压缩类ID，用真实序列化绑定定位组件。 */
function classId(path: string): string {
    const hex = read(path).uuid.replace(/-/g, "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = hex.slice(0, 5);
    for (let index = 5; index < hex.length; index += 3) {
        const value = parseInt(hex.slice(index, index + 3), 16);
        result += alphabet[value >> 6] + alphabet[value & 63];
    }
    return result;
}

const viewType = classId("client/assets/scripts/features/bag/ui/EquipmentInfoView.ts.meta");
const cellType = classId("client/assets/scripts/features/bag/ui/EquipmentAttributeCellView.ts.meta");
const classes: Record<string, any> = {
    "cc.UITransform": UITransform,
    "cc.Label": Label,
    "cc.Sprite": Sprite,
    "cc.Button": Button,
    "cc.Layout": Layout,
    "cc.Widget": Widget,
    "cc.BlockInputEvents": BlockInputEvents,
    [viewType]: EquipmentInfoView,
    [cellType]: EquipmentAttributeCellView,
};

/** 从当前Prefab恢复节点和声明字段；不运行替身Layout，不将其结果当成真实Cocos几何。 */
function instantiateEquipment(rows = read(prefabPath)): Node {
    const objects = new Map<number, any>();
    rows.forEach((row: any, id: number) => {
        if (row.__type__ !== "cc.Node") {
            return;
        }
        const node = new Node(row._name);
        node.active = row._active !== false;
        node.setPosition(row._lpos.x, row._lpos.y, row._lpos.z);
        node.setScale(row._lscale.x, row._lscale.y, row._lscale.z);
        objects.set(id, node);
    });
    rows.forEach((row: any, id: number) => {
        const ctor = classes[row.__type__];
        if (ctor) {
            objects.set(id, objects.get(row.node.__id__).addComponent(ctor));
        }
    });
    const resolve = (value: any): any => {
        if (Array.isArray(value)) {
            return value.map(resolve);
        }
        if (value && typeof value === "object") {
            if ("__id__" in value) {
                return objects.get(value.__id__);
            }
            if (value.__type__ === "cc.Color") {
                return new Color(value.r, value.g, value.b, value.a);
            }
            if ("__uuid__" in value) {
                return Object.assign(new SpriteFrame(), { _uuid: value.__uuid__ });
            }
        }
        return value;
    };
    rows.forEach((row: any, id: number) => {
        const value = objects.get(id);
        if (!value) {
            return;
        }
        if (row.__type__ === "cc.Node") {
            value.parent = resolve(row._parent) || null;
        } else if (row.__type__ === "cc.UITransform") {
            value.setContentSize(row._contentSize.width, row._contentSize.height);
            value.setAnchorPoint(row._anchorPoint.x, row._anchorPoint.y);
        } else if (row.__type__ === "cc.Label") {
            value.string = row._string;
            value.fontSize = row._fontSize;
            value.color = resolve(row._color);
        } else if (row.__type__ === "cc.Sprite") {
            value.spriteFrame = resolve(row._spriteFrame);
        } else if (row.__type__ === viewType || row.__type__ === cellType) {
            for (const [key, field] of Object.entries(row)) {
                if (key !== "node" && !key.startsWith("_")) {
                    value[key] = resolve(field);
                }
            }
        }
    });
    return objects.get(1);
}

/** 核对每个序列化字段的真实目标类型，避免名称字符串或错误组件被当成合法绑定。 */
function checkSerializedBindings(): void {
    const rows: any[] = read(prefabPath);
    const definition = rows.find(row => row.__type__ === viewType);
    assert(definition, "EquipmentInfoView必须实际挂在完整Prefab上");
    const fields: Record<string, string> = {
        panel: "cc.Node", icon: "cc.Sprite", iconFrame: "cc.Sprite", banner: "cc.Sprite",
        nameLabel: "cc.Label", typeLabel: "cc.Label", scoreLabel: "cc.Label", description: "cc.Label",
        setPanel: "cc.Node", setName: "cc.Label", closeButton: "cc.Button", sourceButton: "cc.Button", equipButton: "cc.Button",
    };
    for (const [field, type] of Object.entries(fields)) {
        assert.equal(rows[definition[field]?.__id__]?.__type__, type, field + "必须绑定真实" + type);
    }
    for (const [field, count, type] of [["stars", 6, "cc.Node"], ["attributeRows", 2, cellType], ["setRows", 3, cellType]] as const) {
        assert.equal(definition[field].length, count);
        for (const target of definition[field]) {
            assert.equal(rows[target.__id__]?.__type__, type, field + "不能含无效槽位");
        }
    }
    assert.equal(definition.rarityBanners.length, 6);
    assert(definition.rarityBanners.every((row: any) => typeof row.__uuid__ === "string"));
    assert.equal(definition.nameColors.length, 6);
    assert(definition.nameColors.every((row: any) => row.__type__ === "cc.Color"));
    for (const cell of rows.filter(row => row.__type__ === cellType)) {
        for (const field of ["nameLabel", "valueLabel", "conditionLabel"]) {
            assert.equal(rows[cell[field]?.__id__]?.__type__, "cc.Label", "属性槽文字不能是字符串或其他类型");
        }
        assert.equal(rows[cell.icon?.__id__]?.__type__, "cc.Sprite");
    }
    assert(!rows.some(row => row._name === "ModalMask"), "装备详情复用共享模态，不新增蒙版节点");
    const panel = rows[definition.panel.__id__];
    assert(panel._components.some((ref: any) => rows[ref.__id__].__type__ === "cc.BlockInputEvents"));
    assert(rows.some(row => row.__type__ === "cc.Layout" && row._resizeMode === 1), "真实Prefab负责内容收缩，视图不手算高度");
    const spec = UIRegistry.viewSpecOf(EquipmentInfoView)!;
    assert.equal(spec.cache, false);
    assert.deepEqual(spec.modal, { mask: true, closeOnOutside: true });
}

/** 创建UIManager需要的完整实际Prefab夹具，不复制第二份页面布局。 */
function equipmentPrefab(): Prefab {
    return Object.assign(new Prefab(), { _instantiate: () => instantiateEquipment() });
}

/** 等待页面打开与Promise回调结束，不以定时器模拟资源成功。 */
async function settle(): Promise<void> {
    for (let index = 0; index < 30; index++) {
        await Promise.resolve();
    }
}

/** 真实窗口读取Model、正确显示旧6星、禁止写操作，并在删除/记录替换/关闭后释放监听与图片。 */
async function checkViewLifecycle(): Promise<void> {
    const db = GameConfig.instance;
    const spec = UIRegistry.viewSpecOf(EquipmentInfoView)!;
    const host = new Node("EquipmentReviewHost");
    host.addComponent(UITransform).setContentSize(640, 1280);
    const offHost = UIManager.instance.setResidentHost(spec.hostId!, () => host);
    const prefab = equipmentPrefab();
    UIRegistry.registerView(EquipmentInfoView, { ...spec, load: async () => prefab });
    const notices: string[] = [];
    const offNotice = UIManager.instance.bindNotice(text => notices.push(text));
    const originalSetSprite = ResManager.setSprite;
    const paints: { node: Node | null; source: unknown; current: () => boolean }[] = [];
    ResManager.setSprite = (node, source, current = () => true) => { paints.push({ node, source, current }); };
    const model = BagModel.instance;
    model.reset();
    model.replaceAll([
        { itemId: 1001001, quantity: 2, instanceId: "9223372036854775807" },
        { itemId: 1001007, quantity: 1, instanceId: "set-equip" },
        { itemId: 1001017, quantity: 1, instanceId: "red-equip" },
    ]);
    const beforeListeners = EventDispatcher.instance.listenerCount(BagEvent.BagUpdate);
    try {
        const view = await UIManager.instance.open(EquipmentInfoView, { key: "stack:9223372036854775807" });
        assert.equal(view.scoreLabel!.string, "33");
        assert.equal(view.nameLabel!.string, "银制利剑");
        assert(view.typeLabel!.string.includes("武器"));
        assert(!view.setPanel!.active, "无套装应隐藏整个套装分区");
        assert.equal(view.attributeRows.filter(row => row.node.active).length, 1);
        assert.equal(view.attributeRows[0].valueLabel!.string, "33");
        assert(view.description!.string.startsWith("       "), "书本图标前保留旧7空格缩进");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), beforeListeners + 1);
        const firstPaint = paints.find(row => row.node === view.icon!.node && row.source !== null)!;
        view.runOpen({ key: "stack:set-equip" });
        assert(!firstPaint.current(), "切换装备使旧图片候选失效");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), beforeListeners + 1, "重复onOpen不能累计订阅");
        assert(view.setPanel!.active && view.setName!.string.includes("0/4"));
        assert.equal(view.setRows.filter(row => row.node.active).length, 3);
        assert(view.setRows.every(row => row.conditionLabel!.string.length > 0));
        view.runOpen({ key: "stack:red-equip" });
        assert.equal(view.attributeRows.filter(row => row.node.active).length, 2);
        assert.deepEqual(view.stars.map(star => star.active), [false, false, false, false, false, true], "旧6星只显示一颗红星");
        const redQuality = db.getConfig(GConfig.EquipmentType, 1001017)!.rare;
        assert.deepEqual(view.nameLabel!.color, view.nameColors[redQuality - 1], "名字色按真实品质读取Prefab，不按星级猜颜色");
        const snapshot = model.snapshot;
        view.sourceButton!.node.emit(Button.EventType.CLICK);
        view.equipButton!.node.emit(Button.EventType.CLICK);
        assert.deepEqual(notices, ["装备来源暂未开放", "装备穿脱暂未开放"]);
        assert.equal(model.snapshot, snapshot, "只读按钮不修改唯一库存");
        const lastPaint = paints.filter(row => row.node === view.icon!.node && row.source !== null).pop()!;
        view.closeButton!.node.emit(Button.EventType.CLICK);
        assert(!UIManager.instance.isOpen(EquipmentInfoView));
        assert(!lastPaint.current(), "关闭使迟到图片候选失效");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), beforeListeners);
        assert(paints.some(row => row.node === view.icon!.node && row.source === null), "关闭撤回动态赋图");

        const reopened = await UIManager.instance.open(EquipmentInfoView, { key: "stack:9223372036854775807" });
        assert.notEqual(reopened, view, "详情cache=false，重开重建并读取最新Model");
        model.replaceAll([{ itemId: 1001001, quantity: 9, instanceId: "9223372036854775807" }]);
        EventDispatcher.instance.emit(BagEvent.BagUpdate);
        assert(UIManager.instance.isOpen(reopened), "同一记录数量变化仍保留当前只读详情");
        assert.equal(reopened.scoreLabel!.string, "33", "持有数量不乘入单件装备评分");
        model.replaceAll([{ itemId: 1001001, quantity: 1, instanceId: "replacement-record" }]);
        EventDispatcher.instance.emit(BagEvent.BagUpdate);
        assert(!UIManager.instance.isOpen(EquipmentInfoView), "同配置不同记录不能替代选中的原库存键");

        await UIManager.instance.open(EquipmentInfoView, { key: "stack:replacement-record" });
        model.reset();
        EventDispatcher.instance.emit(BagEvent.BagUpdate);
        assert(!UIManager.instance.isOpen(EquipmentInfoView), "换号/库存重置后关窗，不保存角色比较状态");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), beforeListeners);

        model.replaceAll([{ itemId: 1001001, quantity: 1, instanceId: "missing-config" }]);
        const getConfig = db.getConfig;
        (db as any).getConfig = (name: string, key?: unknown) => name === GConfig.EquipmentType
            ? key === undefined ? [] : undefined : (getConfig as any).call(db, name, key);
        try {
            await assert.rejects(UIManager.instance.open(EquipmentInfoView, { key: "stack:missing-config" }), UIManager.isOpenCancelled);
            assert(notices.some(text => text.includes("装备详情暂不可用")), "配置缺失明确反馈并关窗，不能假造0评分");
        } finally {
            db.getConfig = getConfig;
        }
        let release!: () => void;
        UIRegistry.registerView(EquipmentInfoView, {
            ...spec,
            load: async () => {
                await new Promise<void>(resolve => { release = resolve; });
                return prefab;
            },
        });
        const pending = UIManager.instance.open(EquipmentInfoView, { key: "stack:missing-config" });
        await settle();
        UIManager.instance.closeById(spec.id);
        release();
        await assert.rejects(pending, UIManager.isOpenCancelled);
        assert(!UIManager.instance.isOpen(EquipmentInfoView), "关闭后迟到加载不能弹出旧详情");
    } finally {
        UIManager.instance.closeById(spec.id);
        UIRegistry.registerView(EquipmentInfoView, spec);
        offNotice();
        offHost();
        ResManager.setSprite = originalSetSprite;
        model.reset();
        host.destroy();
    }
}

/** 通过列表选择事件验证按mode分路，装备页中的灵器不能进入普通装备详情。 */
async function checkSelectionRouting(): Promise<void> {
    const db = GameConfig.instance;
    assert.equal(db.getConfig(GConfig.Item, 1001001)?.mode, 1);
    assert.equal(db.getConfig(GConfig.Item, 908101)?.mode, 18);
    assert.equal(db.getConfig(GConfig.Item, -1)?.mode, undefined);
    const root = new Node("BagRoutingReview");
    const page = root.addComponent(BagView) as any;
    // 此专项只驱动既有列表事件，不装配完整背包美术；显式还原onOpen已进入的生命周期状态。
    page.opened = true;
    page.closed = false;
    page.tab = "equip";
    const scroll = new Node("Scroll").addComponent(SuperScroll);
    const content = new Node("content");
    content.addComponent(SuperContent);
    scroll.content = content;
    page.bagScroll = scroll;
    page.bindList();
    const model = BagModel.instance;
    model.replaceAll([
        { itemId: 1001001, quantity: 1, instanceId: "equip-routing" },
        { itemId: 908101, quantity: 1, instanceId: "artifact-routing" },
    ]);
    const before = model.snapshot;
    const originalOpen = UIManager.instance.open;
    const calls: { ctor: Function; args: any }[] = [];
    UIManager.instance.open = (async (ctor: Function, args: any) => {
        calls.push({ ctor, args });
        return { runOpen: () => {} };
    }) as typeof UIManager.instance.open;
    try {
        const rows = page.visibleItems();
        content.emit(SuperContent.SELECT_ITEM, rows.find((row: any) => row.itemId === 1001001));
        await settle();
        assert.equal(calls[0].ctor, EquipmentInfoView);
        assert.deepEqual(calls[0].args, { key: "stack:equip-routing" }, "详情只接收真实记录key");
        content.emit(SuperContent.SELECT_ITEM, rows.find((row: any) => row.itemId === 908101));
        await settle();
        assert.equal(calls[1].ctor, BagInfoView, "同装备页灵器保持原通用入口，不伪造普通装备属性");
        assert.equal(model.snapshot, before, "切详情不改资产、不追加库存读取");
        page.onClose();
        content.emit(SuperContent.SELECT_ITEM, rows[0]);
        await settle();
        assert.equal(calls.length, 2, "关页后列表迟到选择不能重新开窗");
    } finally {
        UIManager.instance.open = originalOpen;
        page.runDispose();
        root.destroy();
        model.reset();
    }
}

/** 依次执行实际Prefab、窗口生命周期与列表分路检查，错误直接拒绝整套专项。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkSerializedBindings();
    await checkViewLifecycle();
    await checkSelectionRouting();
    console.log("PASS EquipmentInfoView: real Prefab bindings, mode routing, stable inventory key, readonly actions, late images/load and cleanup");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
