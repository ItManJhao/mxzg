/**
 * 精英碎片旧5008数量交互专项：使用仓库真实物品/语言配置，验证0/1/多次分流、输入、库存变化及关页。
 * 应用合成能力替换为可观察Promise，只检查真实调用参数与不预扣资产，不伪造英雄或奖励快照。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, EditBox, Label, Node, UITransform } from "cc";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { GameLog } from "../assets/scripts/core/GameLog";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { BagInfoView } from "../assets/scripts/features/bag/ui/BagInfoView";
import { HeroPieceComposeView } from "../assets/scripts/features/bag/ui/HeroPieceComposeView";
import { BagEvent } from "../assets/scripts/features/bag/utils/BagEvent";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { ItemDetailUtils } from "../assets/scripts/features/bag/utils/ItemDetailUtils";
import { HeroPieceComposeUtils } from "../assets/scripts/features/bag/utils/HeroPieceComposeUtils";

const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
const itemId = 20204004;

/** 为实际组件创建序列化之后的节点引用，不在产品代码另造UI。 */
function child(parent: Node, name: string): Node {
    const node = new Node(name);
    node.parent = parent;
    return node;
}

/** 构造实际数量View的控件夹具；关闭走BaseView清理，已交应用的Promise不随窗口取消。 */
function quantityView(): { view: HeroPieceComposeView; closes: () => number } {
    const node = new Node("HeroPieceComposeView");
    node.addComponent(UITransform).setContentSize(640, 1280);
    const view = node.addComponent(HeroPieceComposeView);
    view.nameLabel = child(node, "NameLabel").addComponent(Label);
    view.itemIcon = child(node, "ItemIcon");
    view.itemFrame = child(node, "ItemFrame");
    view.shardStars = Array.from({ length: 5 }, (_, index) => child(node, "Star" + index));
    view.quantityInput = child(node, "Quantity").addComponent(EditBox);
    view.subtractButton = child(node, "Subtract").addComponent(Button);
    view.addButton = child(node, "Add").addComponent(Button);
    view.confirmButton = child(node, "Confirm").addComponent(Button);
    view.closeButton = child(node, "Close").addComponent(Button);
    let count = 0;
    view.close = () => { count++; view.runClose(); };
    return { view, closes: () => count };
}

/** 详情复用实际按钮回调，只替换打开数量窗和本窗关闭宿主。 */
function detailView(id: number): { view: BagInfoView; closes: () => number; selected: number[] } {
    const node = new Node("BagInfoView");
    const view = node.addComponent(BagInfoView);
    view.btnEnter = child(node, "UseButton").addComponent(Button);
    const selected: number[] = [];
    let count = 0;
    const row = GameConfig.instance.requireConfig(GConfig.Item, id);
    const detail = ItemDetailUtils.read(row, { inventory: true }, GameConfig.instance)!;
    assert(detail);
    (view as any).args = { source: "inventory", key: "stack:" + id, tab: "shard",
        onSelectPieceQuantity: (selectedId: number) => selected.push(selectedId) };
    view.show(BagItemCatalog.face(id, BagModel.instance.getItem(id)?.quantity || 1),
        () => { count++; view.onClose(); }, text => UIManager.instance.toast(text), detail);
    return { view, closes: () => count, selected };
}

/** 提交服务端完整库存夹具并发原汇总事件，不在点击处理中改Model。 */
function inventory(quantity: number): void {
    BagModel.instance.replaceAll(quantity > 0 ? [{ itemId, quantity }] : []);
    EventDispatcher.instance.emit(BagEvent.BagUpdate);
}

/** 真配置全部mode8/use_type4都能读取正消耗；普通材料/精灵/道具不能借此入口操作。 */
function checkDefinitions(): void {
    const rows = GameConfig.instance.getConfig(GConfig.Item);
    const supported = rows.filter(row => row.mode === 8 && row.use_type === 4);
    assert.equal(supported.length, 136);
    for (const row of supported) {
        const result = HeroPieceComposeUtils.definition(row.idx)!;
        assert(result);
        assert.equal(result.required, row.use_value);
        assert.equal(result.minimumLevel, row.level_require);
    }
    for (const id of [900102, 2000002, 30104004, 1001001, 908101]) {
        assert.equal(HeroPieceComposeUtils.definition(id), null, "非精英碎片不开放合成：" + id);
    }
    assert.equal(HeroPieceComposeUtils.definition(itemId)!.required, 30);
    assert.equal(HeroPieceComposeUtils.maximum(29, 30), 0);
    assert.equal(HeroPieceComposeUtils.maximum(30, 30), 1);
    assert.equal(HeroPieceComposeUtils.maximum(95, 30), 3);
    assert.equal(HeroPieceComposeUtils.maximum(-1, 30), null);
    assert.equal(HeroPieceComposeUtils.maximum(30, 0), null);
    assert.equal(HeroPieceComposeUtils.normalize("2.9", 3), 2);
    assert.equal(HeroPieceComposeUtils.normalize("999999", 3), 3);
    for (const text of ["", "bad", "Infinity", "-2", "0"]) {
        assert.equal(HeroPieceComposeUtils.normalize(text, 3), 0);
    }
}

/** 对真实Prefab检查绑定目标类型、旧数量面板尺寸及唯一共享模态，不只扫描脚本UUID。 */
function checkPrefab(): void {
    const rows = JSON.parse(readFileSync(resolveBundleFile("bag/prefabs/HeroPieceComposeView.prefab"), "utf8"));
    const view = rows.find((row: any) => row.quantityInput && row.addButton && row.subtractButton);
    assert(view);
    for (const [field, type] of Object.entries({
        nameLabel: "cc.Label", itemIcon: "cc.Node", itemFrame: "cc.Node", quantityInput: "cc.EditBox",
        subtractButton: "cc.Button", addButton: "cc.Button", confirmButton: "cc.Button", closeButton: "cc.Button",
    })) {
        assert.equal(rows[view[field].__id__].__type__, type, "真实Prefab字段类型：" + field);
    }
    assert.equal(view.shardStars.length, 5);
    const panel = rows.find((row: any) => row._name === "ComposePanel");
    const transform = rows[panel._components.find((ref: any) => rows[ref.__id__].__type__ === "cc.UITransform").__id__];
    assert.deepEqual([transform._contentSize.width, transform._contentSize.height], [460, 260]);
    assert(panel._components.some((ref: any) => rows[ref.__id__].__type__ === "cc.BlockInputEvents"));
    assert.deepEqual(UIRegistry.viewSpecOf(HeroPieceComposeView)!.modal, { mask: true, closeOnOutside: true });
    assert(!rows.some((row: any) => row._name === "ModalMask"));
}

/** 0/1/多次的原详情分流，不足不发请求，单次和数量窗都不在本地扣碎片。 */
function checkDetail(calls: number[][]): void {
    inventory(29);
    let detail = detailView(itemId);
    detail.view.btnEnter!.node.emit(Button.EventType.CLICK);
    assert.equal(detail.closes(), 1);
    assert.equal(calls.length, 0);
    detail.view.node.destroy();

    inventory(30);
    detail = detailView(itemId);
    const version = BagModel.instance.snapshot.revision;
    detail.view.btnEnter!.node.emit(Button.EventType.CLICK);
    assert.deepEqual(calls, [[itemId, 1]]);
    assert.equal(detail.closes(), 1);
    assert.equal(BagModel.instance.getItem(itemId)!.quantity, 30);
    assert.equal(BagModel.instance.snapshot.revision, version);
    detail.view.node.destroy();

    inventory(95);
    detail = detailView(itemId);
    detail.view.btnEnter!.node.emit(Button.EventType.CLICK);
    assert.deepEqual(detail.selected, [itemId]);
    assert.equal(detail.closes(), 1);
    assert.equal(calls.length, 1, "多次先选择，不直接全量发送");
    detail.view.node.destroy();
}

/** 实际输入/加减事件及库存刷新决定未发送选择；账号清空关窗，已发请求独立于窗口生命周期。 */
async function checkQuantity(calls: number[][]): Promise<void> {
    inventory(95);
    let fixture = quantityView();
    let view = fixture.view;
    view.runOpen({ itemId });
    assert.equal(view.quantityInput!.string, "3");
    assert.equal(view.addButton!.interactable, false);
    view.quantityInput!.string = "2.9";
    view.quantityInput!.node.emit(EditBox.EventType.EDITING_DID_ENDED);
    assert.equal(view.quantityInput!.string, "2");
    view.quantityInput!.string = "999";
    view.quantityInput!.node.emit(EditBox.EventType.EDITING_DID_ENDED);
    assert.equal(view.quantityInput!.string, "3");
    inventory(65);
    assert.equal(view.quantityInput!.string, "2", "库存变少时限制原选择");
    view.subtractButton!.node.emit(Button.EventType.CLICK);
    view.subtractButton!.node.emit(Button.EventType.CLICK);
    assert.equal(view.quantityInput!.string, "0");
    assert.equal(view.subtractButton!.interactable, false);
    const before = calls.length;
    view.confirmButton!.node.emit(Button.EventType.CLICK);
    assert.equal(fixture.closes(), 1);
    assert.equal(calls.length, before, "0确认只关闭");
    view.node.destroy();

    inventory(95);
    fixture = quantityView(); view = fixture.view;
    view.runOpen({ itemId });
    view.subtractButton!.node.emit(Button.EventType.CLICK);
    const version = BagModel.instance.snapshot.revision;
    view.confirmButton!.node.emit(Button.EventType.CLICK);
    assert.deepEqual(calls[calls.length - 1], [itemId, 2]);
    assert.equal(fixture.closes(), 1);
    assert.equal(BagModel.instance.snapshot.revision, version);
    assert.equal(BagModel.instance.getItem(itemId)!.quantity, 95, "发起请求不预扣库存");
    view.confirmButton!.node.emit(Button.EventType.CLICK);
    assert.equal(calls.length, before + 1, "关闭后连点不重发");
    view.node.destroy();

    inventory(95);
    fixture = quantityView(); view = fixture.view;
    view.runOpen({ itemId });
    BagModel.instance.reset();
    EventDispatcher.instance.emit(BagEvent.BagUpdate);
    assert.equal(fixture.closes(), 1, "账号状态重置立即关闭未发送选择，不比较账号键");
    view.confirmButton!.node.emit(Button.EventType.CLICK);
    assert.equal(calls.length, before + 1);
    view.node.destroy();
    await Promise.resolve();
}

/** 运行真实配置、组件事件和无预扣验证；应用完整原回执恢复由独立装配专项负责。 */
async function main(): Promise<void> {
    GameLog.shared.mirrorConsole = false;
    GameConfig.instance.initialize(async path => JSON.parse(readFileSync(resolveBundleFile(path + ".json"), "utf8")));
    await GameConfig.instance.prepare([GConfig.Item, GConfig.Language, GConfig.HeroType]);
    const controller = BagController.instance;
    const originalToast = UIManager.instance.toast;
    const notices: string[] = [];
    UIManager.instance.toast = text => { notices.push(text); };
    const calls: number[][] = [];
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    let level = 1;
    controller.initialize();
    controller.configurePieceCompose((id, quantity) => { calls.push([id, quantity]); return pending; }, () => level);
    try {
        checkDefinitions();
        checkPrefab();
        checkDetail(calls);
        await checkQuantity(calls);
        inventory(30);
        controller.configurePieceCompose((id, quantity) => { calls.push([id, quantity]); return pending; },
            () => level, undefined, () => 0);
        const full = detailView(itemId);
        const requestsBeforeFull = calls.length;
        full.view.btnEnter!.node.emit(Button.EventType.CLICK);
        assert.equal(full.closes(), 0, "旧单次详情容量不足仍保留窗口");
        assert.equal(calls.length, requestsBeforeFull);
        assert.equal(notices[notices.length - 1], "英雄背包已满");
        full.view.onClose(); full.view.node.destroy();
        assert(controller.composeHeroPieces(itemId, 1), "数量窗分支不增加本地容量前检，服务器最终拒绝");
        controller.configurePieceCompose(() => pending, () => level, undefined, () => null);
        assert(controller.composeHeroPieces(itemId, 1, true), "未知容量不能当0误禁单次合成");
        inventory(30);
        level = 0;
        assert.equal(controller.composeHeroPieces(itemId, 1), null);
        assert(notices[notices.length - 1].includes("角色达到"));
        level = 1;
        controller.configurePieceCompose(() => pending, () => level, () => false);
        assert.equal(controller.composeHeroPieces(itemId, 1), null);
        assert.equal(controller.composeHeroPieces(900102, 1), null);
        finish();
        await pending;
        console.log("hero-piece-compose-check passed: 136 configurations, 0/1/many routing, input, authority and close/reset");
    } finally {
        controller.dispose();
        UIManager.instance.toast = originalToast;
    }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
