/**
 * 普通道具与英雄碎片详情专项：读取实际Prefab及同源配置，检查共享格子上下文、只读按钮和库存生命周期。
 * 不连接服务器、不修改业务资产；引擎替身只验证绑定与行为，文字换行和真实几何另由Creator预览确认。
 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { BlockInputEvents, Button, Color, Label, Layout, Mask, Node, Prefab, RichText, ScrollView, Sprite, SpriteFrame, UITransform, Widget } from "cc";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { ResManager } from "../assets/scripts/framework/assets/ResManager";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { BagEvent } from "../assets/scripts/features/bag/utils/BagEvent";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { BagInfoView } from "../assets/scripts/features/bag/ui/BagInfoView";
import { BagItemView } from "../assets/scripts/features/bag/ui/BagItemView";

/** 本次只读详情及其共享物品格的真实预制体位置。 */
const infoPath = "client/assets/bundles/module/bag/prefabs/BagInfoView.prefab";
const cellPath = "client/assets/bundles/module/common/prefabs/BagItemView.prefab";

/** 读取当前工作区JSON，不将生成结果或Prefab复制成第二份静态夹具。 */
function read(path: string): any {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

/** 按脚本原meta计算Creator类ID，确保测试检查的是正式序列化引用。 */
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

/** 使用原脚本UUID识别两个被测组件，避免名称相同但绑定错误仍通过。 */
const infoType = classId("client/assets/scripts/features/bag/ui/BagInfoView.ts.meta");
const cellType = classId("client/assets/scripts/features/bag/ui/BagItemView.ts.meta");
/** 只恢复被测Prefab实际使用的引擎组件，不额外模拟业务框架。 */
const classes: Record<string, any> = {
    "cc.UITransform": UITransform,
    "cc.Label": Label,
    "cc.RichText": RichText,
    "cc.Sprite": Sprite,
    "cc.Button": Button,
    "cc.Layout": Layout,
    "cc.Widget": Widget,
    "cc.Mask": Mask,
    "cc.ScrollView": ScrollView,
    "cc.BlockInputEvents": BlockInputEvents,
    [infoType]: BagInfoView,
    [cellType]: BagItemView,
};

/** 从实际序列化恢复层级和字段；不将替身Layout的输出当成真实Cocos几何验收。 */
function instantiate(path: string): Node {
    const rows: any[] = read(path);
    const objects = new Map<number, any>();
    rows.forEach((row, id) => {
        if (row.__type__ === "cc.Node") {
            const node = new Node(row._name);
            node.active = row._active !== false;
            node.setPosition(row._lpos.x, row._lpos.y, row._lpos.z);
            node.setScale(row._lscale.x, row._lscale.y, row._lscale.z);
            objects.set(id, node);
        }
    });
    rows.forEach((row, id) => {
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
    rows.forEach((row, id) => {
        const value = objects.get(id);
        if (!value) {
            return;
        }
        if (row.__type__ === "cc.Node") {
            value.parent = resolve(row._parent) || null;
        } else if (row.__type__ === "cc.UITransform") {
            value.setContentSize(row._contentSize.width, row._contentSize.height);
            value.setAnchorPoint(row._anchorPoint.x, row._anchorPoint.y);
        } else if (row.__type__ === "cc.Label" || row.__type__ === "cc.RichText") {
            value.string = row._string;
            value.fontSize = row._fontSize;
            value.lineHeight = row._lineHeight;
            value.enableWrapText = row._enableWrapText;
            value.color = resolve(row._color);
        } else if (row.__type__ === "cc.Sprite") {
            value.spriteFrame = resolve(row._spriteFrame);
            value.type = row._type;
            value.fillType = row._fillType;
            value.fillRange = row._fillRange;
        } else if (row.__type__ === "cc.ScrollView") {
            value.content = resolve(row._content);
            value.vertical = row.vertical;
            value.horizontal = row.horizontal;
        } else if (row.__type__ === infoType || row.__type__ === cellType) {
            for (const [key, field] of Object.entries(row)) {
                if (key !== "node" && !key.startsWith("_")) {
                    value[key] = resolve(field);
                }
            }
        }
    });
    return objects.get(1);
}

/** 校验正式字段指向目标组件；字符串、错误组件和缺槽均应直接失败。 */
function validateSerialized(rows: any[], type: string, fields: Record<string, string>): void {
    const definition = rows.find(row => row.__type__ === type);
    assert(definition, "实际Prefab必须挂载被测脚本");
    for (const [field, target] of Object.entries(fields)) {
        assert.equal(rows[definition[field]?.__id__]?.__type__, target, field + "必须绑定真实" + target);
    }
    assert.equal(definition.shardStars?.length, 5, "只配置现有1至5星碎片的五个静态星位");
    for (const star of definition.shardStars) {
        assert.equal(rows[star?.__id__]?.__type__, "cc.Node", "碎片星位必须绑定节点");
    }
}

/** 检查共享格子和详情绑定及串错类型反例，滚动结构仍由Prefab维护。 */
function checkSerializedBindings(): void {
    const info = read(infoPath);
    const infoFields = {
        bg: "cc.Node", propName: "cc.Label", propType: "cc.Label", desc: "cc.RichText",
        icon: "cc.Node", rare: "cc.Node", btnClose: "cc.Button", btnEnter: "cc.Button",
        enterLabel: "cc.Label", btnSrc: "cc.Button", btnDetail: "cc.Node", btnDecompose: "cc.Node",
        detailLabel: "cc.Label", decomposeLabel: "cc.Label", shardIcon: "cc.Node", shardCorner: "cc.Node",
        descriptionViewport: "cc.Node", descriptionScroll: "cc.ScrollView", emptyActionSpacer: "cc.Node",
    };
    validateSerialized(info, infoType, infoFields);
    const definition = info.find((row: any) => row.__type__ === infoType);
    assert.equal(definition.minDescriptionHeight, 60);
    assert.equal(definition.maxDescriptionHeight, 300);
    const scroll = info[definition.descriptionScroll.__id__];
    assert(scroll.vertical && !scroll.horizontal, "长说明只允许纵向滚动");
    const viewport = info[definition.descriptionViewport.__id__];
    assert(viewport._components.some((ref: any) => info[ref.__id__].__type__ === "cc.Mask"), "说明视口必须有真实Mask");
    assert(!info.some((row: any) => row._name === "ModalMask"), "弹窗使用UIManager唯一共享蒙版");
    const spec = UIRegistry.viewSpecOf(BagInfoView)!;
    assert.equal(spec.cache, false);
    assert.deepEqual(spec.modal, { mask: true, closeOnOutside: true });

    const cell = read(cellPath);
    const cellFields = {
        frame: "cc.Node", icon: "cc.Node", count: "cc.Label", button: "cc.Button", selectMark: "cc.Node",
        shardIcon: "cc.Node", shardCorner: "cc.Node", shardProgress: "cc.Node",
        shardProgressFill: "cc.Sprite", shardProgressLabel: "cc.Label",
    };
    validateSerialized(cell, cellType, cellFields);
    const cellDefinition = cell.find((row: any) => row.__type__ === cellType);
    assert.equal(cell[cellDefinition.shardProgressFill.__id__]._type, Sprite.Type.FILLED);
    assert.equal(cell[cellDefinition.shardProgressFill.__id__]._fillType, Sprite.FillType.HORIZONTAL);

    const wrongInfo = read(infoPath);
    wrongInfo.find((row: any) => row.__type__ === infoType).detailLabel = definition.btnDetail;
    assert.throws(() => validateSerialized(wrongInfo, infoType, infoFields), /detailLabel/, "Label误绑成Node不能通过验收");
    const wrongDescription = read(infoPath);
    wrongDescription.find((row: any) => row.__type__ === infoType).desc = definition.propName;
    assert.throws(() => validateSerialized(wrongDescription, infoType, infoFields), /desc/, "正文误绑普通Label不能通过富文本验收");
    const wrongCell = read(cellPath);
    wrongCell.find((row: any) => row.__type__ === cellType).shardProgressFill = cellDefinition.shardProgressLabel;
    assert.throws(() => validateSerialized(wrongCell, cellType, cellFields), /shardProgressFill/, "进度Sprite误绑为Label不能通过验收");
    const wrongStars = read(cellPath);
    wrongStars.find((row: any) => row.__type__ === cellType).shardStars[1] = "MissingStar";
    assert.throws(() => validateSerialized(wrongStars, cellType, cellFields), /碎片星位/, "星位字符串不能替代节点引用");
}

/** 清空Promise队列，供窗口管理器和异步加载回调完成，不伪造资源成功时刻。 */
async function settle(): Promise<void> {
    for (let index = 0; index < 30; index++) {
        await Promise.resolve();
    }
}

/** 验证共享格子的数量上下文、进度钳制、异步复用与非碎片清理。 */
function checkSharedCell(): void {
    const root = instantiate(cellPath);
    const cell = root.getComponent(BagItemView)! as any;
    const display = BagItemCatalog;
    const originalSetSprite = ResManager.setSprite;
    const paints: { node: Node | null; sources: unknown; current: () => boolean }[] = [];
    ResManager.setSprite = (node, sources, current = () => true) => { paints.push({ node, sources, current }); };
    try {
        cell.show({ itemId: 950001, quantity: 7 }, false, display.face(950001, 7), true, true);
        assert(cell.shardIcon.active && cell.shardCorner.active && cell.shardProgress.active);
        assert.equal(cell.shardProgressLabel.string.replace(/\s/g, ""), "7/50");
        assert.equal(cell.shardProgressFill.fillRange, 7 / 50);
        assert.equal(cell.shardStars.filter((node: Node) => node.active).length, 5);
        assert(!cell.count.node.active, "库存碎片用进度而非重复数量覆盖星位");
        const first = paints.find(row => row.node === cell.shardIcon && row.sources !== null)!;

        cell.show({ itemId: 20101001, quantity: 12 }, false, display.face(20101001, 12), true, true);
        assert.equal(cell.shardProgressLabel.string.replace(/\s/g, ""), "12/5", "持有数保留真实值，不截成需求数量");
        assert.equal(cell.shardProgressFill.fillRange, 1, "视觉进度到达需求后封顶");
        assert.equal(cell.shardStars.filter((node: Node) => node.active).length, 1);
        assert(!first.current(), "复用为不同碎片后旧图片不再赋回");

        cell.show({ itemId: 950001, quantity: 3 }, false, display.face(950001, 3));
        assert(!cell.shardProgress.active, "结算奖励默认不读取或展示库存合成进度");
        assert(cell.shardIcon.active && cell.shardCorner.active, "奖励仍保留碎片星级和拼图角标");
        assert(cell.count.node.active && cell.count.string === "3", "奖励格显示本次获得数量");
        cell.show({ itemId: 950001, quantity: 0 }, false, display.face(950001, 0));
        assert(!cell.shardProgress.active, "产物候选的quantity=0不是库存不足进度");
        assert(!cell.count.node.active, "产物候选未提供数量时按旧setNum隐藏数字");

        for (const itemId of [30104004, 900102, 1001001, 908101]) {
            cell.show({ itemId, quantity: 2 }, false, display.face(itemId, 2), true, true);
            assert(!cell.shardIcon.active && !cell.shardCorner.active && !cell.shardProgress.active, "mode9/道具/装备/灵器不继承碎片布局");
            assert(cell.shardStars.every((star: Node) => !star.active));
            assert.equal(cell.count.string, "2");
        }
        cell.show({ itemId: 2000002, quantity: 1, key: "spirit:owned", spirit: {} }, false, display.face(2000002, 1), true, true);
        assert(!cell.count.node.active, "独立精灵继续不显示数量");
        assert(!cell.shardIcon.active && !cell.shardProgress.active);
        cell.show(null, false);
        assert(!cell.icon.active && !cell.shardIcon.active && !cell.shardCorner.active && !cell.shardProgress.active);
        assert(!cell.count.node.active && cell.shardStars.every((star: Node) => !star.active), "复用为空槽必须清空所有碎片状态");
        const last = paints.filter(row => row.sources !== null).pop()!;
        root.destroy();
        assert(!last.current(), "格子销毁后迟到图片不再生效");
    } finally {
        ResManager.setSprite = originalSetSprite;
        if (root.isValid) {
            root.destroy();
        }
    }
}

/** 用实际UI管理器检查只读详情重开、模式切换、真实库存键、重置和迟到响应。 */
async function checkInfoLifecycle(): Promise<void> {
    const spec = UIRegistry.viewSpecOf(BagInfoView)!;
    const host = new Node("ItemInfoReviewHost");
    host.addComponent(UITransform).setContentSize(640, 1280);
    const offHost = UIManager.instance.setResidentHost(spec.hostId!, () => host);
    const prefab = Object.assign(new Prefab(), { _instantiate: () => instantiate(infoPath) });
    UIRegistry.registerView(BagInfoView, { ...spec, load: async () => prefab });
    const notices: string[] = [];
    const offNotice = UIManager.instance.bindNotice(text => notices.push(text));
    const originalSetSprite = ResManager.setSprite;
    const paints: { node: Node | null; sources: unknown; current: () => boolean }[] = [];
    ResManager.setSprite = (node, sources, current = () => true) => { paints.push({ node, sources, current }); };
    const model = BagModel.instance;
    model.reset();
    const seed = [900102, 900504, 900505, 901819, 901820, 900402, 950001, 20101001, 30104004]
        .map(itemId => ({ itemId, quantity: 7, instanceId: "record-" + itemId }));
    model.replaceAll(seed);
    const listeners = EventDispatcher.instance.listenerCount(BagEvent.BagUpdate);
    const inventoryArgs = (itemId: number) => ({
        source: "inventory" as const,
        key: "stack:record-" + itemId,
        tab: itemId === 950001 || itemId > 20000000 ? "shard" as const : "item" as const,
    });
    try {
        const view = await UIManager.instance.open(BagInfoView, inventoryArgs(900102)) as any;
        assert(view.propType.string.includes("道具"), "普通详情副标题恢复物品类型，不把数量当类型");
        assert(view.btnDetail.active && !view.btnEnter.node.active && !view.btnDecompose.active, "900102只有来源按钮");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), listeners + 1);
        const firstPaint = paints.find(row => row.node === view.icon && row.sources !== null)!;
        const snapshot = model.snapshot;
        view.btnDetail.emit(Button.EventType.CLICK);
        assert(notices.some(text => /来源.*未开放/.test(text)));
        assert.equal(model.snapshot, snapshot);

        for (const [itemId, use, detail, decompose] of [
            [900504, true, false, false],
            [900505, true, true, false],
            [901819, false, false, true],
            [901820, false, true, true],
            [900402, false, false, false],
        ] as const) {
            view.runOpen(inventoryArgs(itemId));
            assert.equal(view.btnEnter.node.active, use, itemId + "使用按钮按use_type显示");
            assert.equal(view.btnDetail.active, detail, itemId + "来源按真实配置显示");
            assert.equal(view.emptyActionSpacer!.active, !detail && !use && !decompose,
                itemId + "无操作时保留旧底部占位，有操作时不重复占位");
            assert.equal(view.btnDecompose.active, decompose, itemId + "分解按真实配置显示");
            if (itemId === 900505) {
                assert(view.desc instanceof RichText, "真实详情Prefab使用RichText承接旧正文颜色和换行");
                assert(view.desc.string.includes("<color=#ef6b00>血痕之印*16</color>"), "保留第一条材料的旧橙色正文");
                assert(view.desc.string.includes("<color=#ef6b00>共鸣之印*8</color>"), "保留第二条材料的旧橙色正文");
                assert.equal(view.desc.string.split("\n").length, 3, "900505的两个br保留为真实换行");
                assert(!/<\/?font\b|<br\s*\/?\s*>/i.test(view.desc.string), "不把旧font/br标签原样传给Cocos显示");
            }
            if (use) {
                const beforeNotice = notices.length;
                view.btnEnter.node.emit(Button.EventType.CLICK);
                assert(UIManager.instance.isOpen(view), "使用未开放只飘字，不发协议或按确定误关窗");
                assert.equal(notices.length, beforeNotice + 1, "只读使用必须向玩家反馈");
                assert(notices[notices.length - 1].includes("未开放"));
            }
            if (decompose) {
                const beforeNotice = notices.length;
                view.btnDecompose.emit(Button.EventType.CLICK);
                assert.equal(notices.length, beforeNotice + 1, "只读分解必须向玩家反馈");
                assert(notices[notices.length - 1].includes("未开放"));
            }
            assert.equal(model.snapshot, snapshot, "只读操作不修改资产");
            assert(!view.shardIcon.active && !view.shardCorner.active);
        }
        assert(!firstPaint.current(), "详情切物品使上一个异步图标失效");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), listeners + 1, "重复开同窗不累积订阅");

        view.runOpen(inventoryArgs(950001));
        assert(view.shardIcon.active && view.shardCorner.active);
        assert.equal(view.shardStars.filter((star: Node) => star.active).length, 5);
        assert(view.btnEnter.node.active && !view.btnDetail.active, "随机碎片不冒充指定英雄详情");
        view.runOpen(inventoryArgs(20101001));
        assert.equal(view.shardStars.filter((star: Node) => star.active).length, 1);
        assert(view.btnDetail.active && view.btnSrc.node.active, "指定碎片可保留详情及来源外观");
        assert.equal(model.snapshot, snapshot);
        const originalOpen = UIManager.instance.open;
        const opened: unknown[] = [];
        UIManager.instance.open = (async (...args: unknown[]) => { opened.push(args); throw new Error("不应打开其他界面"); }) as any;
        try {
            view.btnDetail.emit(Button.EventType.CLICK);
        } finally {
            UIManager.instance.open = originalOpen;
        }
        assert.deepEqual(opened, [], "碎片英雄详情尚未恢复，不以持有英雄入口顶替图鉴详情");
        assert.equal(notices[notices.length - 1], "英雄图鉴暂未开放");
        view.runOpen(inventoryArgs(30104004));
        assert(!view.shardIcon.active && !view.shardCorner.active && view.shardStars.every((star: Node) => !star.active), "mode9不得拿use_value当碎片需求数");

        const face = { ...BagItemCatalog.face(950001, 0), typeLine: "产物说明（只读）" };
        view.runOpen({ source: "description", face });
        assert.equal(view.propType.string, "产物说明（只读）");
        assert(view.btnEnter.node.active && view.enterLabel.string === "确定");
        assert(!view.btnDetail.active && !view.btnDecompose.active && !view.btnSrc.node.active, "产物说明不继承库存操作按钮");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), listeners);
        const richBody = "<color=#ef6b00>只读奖励说明</color>\n第二行保留换行";
        view.runOpen({ source: "description", face: { ...face, body: "不应覆盖富文本的普通备用正文", richBody } });
        assert.equal(view.desc.string, richBody, "description上下文优先显示调用方richBody而非剥色备用正文");
        assert.equal(view.propType.string, "产物说明（只读）");
        assert(view.btnEnter.node.active && view.enterLabel.string === "确定");
        assert(!view.btnDetail.active && !view.btnDecompose.active && !view.btnSrc.node.active, "富文本说明仍只有确定，不带库存写入口");
        view.runOpen({ source: "description", face: { ...face, typeLine: "本次获得：3" } });
        assert.equal(view.propType.string, "本次获得：3", "结算说明保留回执数量上下文");
        view.btnEnter.node.emit(Button.EventType.CLICK);
        assert(!UIManager.instance.isOpen(BagInfoView), "说明上下文确定继续关闭弹窗");
        assert(paints.filter(row => row.sources !== null).every(row => !row.current()), "关窗使所有迟到贴图失效");
        for (const target of [view.icon, view.shardIcon, view.rare]) {
            assert(paints.some(row => row.node === target && row.sources === null), "关窗撤回动态图片并交还原资源池");
        }

        const reopened = await UIManager.instance.open(BagInfoView, inventoryArgs(950001)) as any;
        assert.notEqual(reopened, view, "cache=false的详情重开读取当前库存");
        model.replaceAll(seed.map(item => item.itemId === 950001 ? { ...item, quantity: 49 } : item));
        EventDispatcher.instance.emit(BagEvent.BagUpdate);
        assert(UIManager.instance.isOpen(reopened), "同记录数量更新保持详情且只增加一份订阅");
        model.replaceAll(seed.map(item => item.itemId === 950001 ? { ...item, instanceId: "replaced-shard" } : item));
        EventDispatcher.instance.emit(BagEvent.BagUpdate);
        assert(!UIManager.instance.isOpen(BagInfoView), "同配置的新记录不能替换旧库存主键");
        await UIManager.instance.open(BagInfoView, inventoryArgs(900102));
        model.reset();
        EventDispatcher.instance.emit(BagEvent.BagUpdate);
        assert(!UIManager.instance.isOpen(BagInfoView), "角色重置或换号后关闭旧详情");
        assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), listeners);

        model.replaceAll([{ itemId: 900102, quantity: 1, instanceId: "record-900102" }]);
        const db = GameConfig.instance;
        const query = db.getConfig.bind(db);
        const getConfig = db.getConfig;
        db.getConfig = ((name: typeof GConfig[keyof typeof GConfig], key?: number | string) =>
            name === GConfig.Language && String(key) === "47215" ? undefined : query(name, key as never)
        ) as typeof db.getConfig;
        try {
            await assert.rejects(UIManager.instance.open(BagInfoView, inventoryArgs(900102)), UIManager.isOpenCancelled);
            assert(notices.some(text => text.includes("物品详情暂不可用")), "必需类型配置缺失要明确反馈并关窗，不能伪造成功");
            assert.equal(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate), listeners, "拒绝开窗仍清理库存订阅");
        } finally {
            db.getConfig = getConfig;
        }

        let release!: () => void;
        UIRegistry.registerView(BagInfoView, { ...spec, load: async () => {
            await new Promise<void>(resolve => { release = resolve; });
            return prefab;
        } });
        const pending = UIManager.instance.open(BagInfoView, { source: "description", face });
        await settle();
        UIManager.instance.closeById(spec.id);
        release();
        await assert.rejects(pending, UIManager.isOpenCancelled);
        assert(!UIManager.instance.isOpen(BagInfoView), "在途窗口关闭后迟到预制体不重新弹出");
    } finally {
        UIManager.instance.closeById(spec.id);
        UIRegistry.registerView(BagInfoView, spec);
        offNotice();
        offHost();
        ResManager.setSprite = originalSetSprite;
        model.reset();
        host.destroy();
    }
}

/** 用真实配置依次执行序列化、共享格子和窗口生命周期专项。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    checkSerializedBindings();
    checkSharedCell();
    await checkInfoLifecycle();
    console.log("PASS item-info-view: real Prefab fields, readonly actions, inventory/reward shard context, mode9 isolation, stable keys and late cleanup");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
