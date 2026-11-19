/**
 * 精英碎片旧5008数量交互专项：使用仓库真实物品/语言配置，验证0/1/多次分流、输入、库存变化及关页。
 * 界面用可观察的提交能力核对参数和库存，并检查服务端拒绝、正常奖励和断线后的快照同步。
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
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { AccountController } from "../assets/scripts/features/account/AccountController";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { BagInfoView } from "../assets/scripts/features/bag/ui/BagInfoView";
import { HeroPieceComposeView } from "../assets/scripts/features/bag/ui/HeroPieceComposeView";
import { BagEvent } from "../assets/scripts/features/bag/utils/BagEvent";
import { BagItemCatalog } from "../assets/scripts/features/bag/utils/BagItemCatalog";
import { ItemDetailUtils } from "../assets/scripts/features/bag/utils/ItemDetailUtils";
import { HeroPieceComposeUtils } from "../assets/scripts/features/bag/utils/HeroPieceComposeUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { SocketFailure, type GameSocketClient } from "../assets/scripts/platform/GameSocketClient";

const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
const itemId = 20204004;

/** 为实际组件创建序列化之后的节点引用，不在产品代码另造UI。 */
function child(parent: Node, name: string): Node {
    const node = new Node(name);
    node.parent = parent;
    return node;
}

/** 构造数量窗控件，关闭走真实的页面清理，已发送的请求由背包控制器接收。 */
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
    }
    for (const id of [900102, 2000002, 30104004, 1001001, 908101]) {
        assert.equal(HeroPieceComposeUtils.definition(id), null, "非精英碎片不开放合成：" + id);
    }
    assert.equal(HeroPieceComposeUtils.definition(itemId)!.required, 30);
    for (const [owned, expected] of [[29, 0], [30, 1], [95, 3]]) {
        inventory(owned);
        assert.equal(HeroPieceComposeUtils.stock(itemId)!.maximum, expected);
    }
    assert.throws(() => BagModel.instance.replaceAll([{ itemId, quantity: -1 }]));
    const invalidConfig = { getConfig: () => ({ ...rows.find(row => row.idx === itemId), use_value: 0 }) };
    assert.equal(HeroPieceComposeUtils.definition(itemId, invalidConfig as unknown as GameConfig), null);
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

/** 实际输入、加减和库存刷新影响当前选择，确认后直接发包关窗。 */
function checkQuantity(calls: number[][]): void {
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
}

/** 以真实账号发送、路由和背包回调验证成功、拒绝及错配；断线后用鉴权快照恢复。 */
async function checkAuthoritativeCompose(notices: string[]): Promise<void> {
    const commands: string[] = [];
    const receiptId = "20000001-1111-4111-8111-111111111111";
    const actual = { roleId: "test-role" };
    const hero = { id: "01000000-1111-4111-8111-111111111111", templateId: 10204004, level: 1, star: 4 };
    const displays: Array<{ id: string; revision: number; actual: unknown }> = [];
    const requestIds = new Set<string>();
    const role = { id: "test-role", nickname: "测试", level: 1, gold: 0, diamonds: 0 };
    const account = new AccountController(new AccountModel(), {
        developmentLogin: async () => ({ session: { accessToken: "test-token", expiresAt: "2099-01-01T00:00:00Z" }, role }),
        currentRole: async () => role,
    }, { read: () => null, write: () => {}, clear: () => {} });
    let outcome: "success" | "wrong-item" | "wrong-quantity" | "wrong-request" | "stale-session" | SocketFailure = "success";
    const socket = {
        requestFrame: async (_token: string, name: string, body: unknown) => {
            commands.push(name);
            assert.equal(name, Protocol.HERO_FRAGMENT_COMBINE);
            const request = body as { requestId: string; itemId: number; quantity: number };
            assert.deepEqual([request.itemId, request.quantity], [itemId, 1]);
            assert.match(request.requestId, /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
            assert(!requestIds.has(request.requestId), "每一次主动点击使用自己的请求编号");
            requestIds.add(request.requestId);
            if (outcome instanceof SocketFailure) {
                throw outcome;
            }
            if (outcome === "stale-session") {
                account.logout();
            }
            return {
                version: 1, name, kind: "response", ok: true,
                body: {
                    requestId: outcome === "wrong-request" ? receiptId : request.requestId,
                    itemId: outcome === "wrong-item" ? itemId + 1 : request.itemId,
                    quantity: outcome === "wrong-quantity" ? request.quantity + 1 : request.quantity,
                    receiptId, assetRevision: 4, roleId: role.id, actual,
                },
            };
        },
    };
    const bag = new BagController(BagModel.instance);
    bag.configure(new AccountOperations(account, socket as unknown as GameSocketClient), {
        restoreActual: (id, revision, value) => {
            displays.push({ id, revision, actual: value });
            return "queued";
        },
    });
    const roster = new HeroRosterController(HeroRosterModel.instance);
    bag.initialize();
    roster.initialize();
    // 业务方法同步返回；独立等待当前内存传输的微任务完成，观察收包造成的展示变化。
    const submit = async () => {
        assert.equal(bag.composeHeroPieces(itemId, 1), undefined);
        await new Promise<void>(resolve => setImmediate(resolve));
    };
    try {
        assert(await account.login("compose-check"));
        inventory(30);
        await submit();
        assert.deepEqual(commands, [Protocol.HERO_FRAGMENT_COMBINE]);
        assert.deepEqual(displays, [{ id: receiptId, revision: 4, actual }]);
        assert.equal(BagModel.instance.quantity(itemId), 30, "收到回执不在本地预扣碎片");
        assert.equal(HeroRosterModel.instance.snapshot.heroes.length, 0, "收到回执不在本地创建英雄");

        const noticeStart = notices.length;
        outcome = new SocketFailure("FRAGMENT_CAPACITY_FULL", "英雄名册剩余位置不足");
        await submit();
        assert.equal(notices.length, noticeStart + 1);
        assert.equal(notices.at(-1), "英雄名册剩余位置不足");
        assert.equal(displays.length, 1);
        assert.equal(BagModel.instance.quantity(itemId), 30);

        outcome = "stale-session";
        await submit();
        assert.equal(notices.length, noticeStart + 1, "旧会话的操作结果由账号层拦截");
        assert.equal(displays.length, 1);

        assert(await account.login("compose-check"));
        outcome = new SocketFailure("DISCONNECTED", "网络已断开");
        await submit();
        assert.equal(notices.at(-1), "合成结果待同步，恢复连接后请查看背包");
        assert.equal(BagModel.instance.quantity(itemId), 30);
        const snapshot = { initial: { revision: 4, inventory: [], heroes: [hero] } };
        bag.onNotify(Protocol.SESSION_AUTHENTICATE, snapshot);
        roster.onNotify(Protocol.SESSION_AUTHENTICATE, snapshot);
        assert.equal(BagModel.instance.quantity(itemId), 0, "重连同步服务器扣除后的库存");
        assert.equal(HeroRosterModel.instance.snapshot.heroes[0]?.id, hero.id, "名册读取服务器新增英雄");
        assert.deepEqual(commands, Array(4).fill(Protocol.HERO_FRAGMENT_COMBINE), "重连后不查询或补发合成");
        assert.equal(displays.length, 1, "丢失的回执不从快照补弹奖励");

        for (const mistake of ["wrong-item", "wrong-quantity", "wrong-request"] as const) {
            outcome = mistake;
            const before = notices.length;
            await submit();
            assert.equal(notices.length, before + 1);
            assert.match(notices.at(-1)!, /与(?:本次)?请求不符/);
            assert.equal(displays.length, 1, "物品、数量或请求编号错配时不能展示奖励");
        }
    } finally {
        account.dispose();
        bag.dispose();
        roster.dispose();
    }
}

/** 运行真实配置、组件操作及服务端权威同步检查，全程隔离玩家数据。 */
async function main(): Promise<void> {
    GameLog.shared.mirrorConsole = false;
    GameConfig.instance.initialize(async path => JSON.parse(readFileSync(resolveBundleFile(path + ".json"), "utf8")));
    await GameConfig.instance.prepare([GConfig.Item, GConfig.Language, GConfig.HeroType]);
    const originalToast = UIManager.instance.toast;
    const notices: string[] = [];
    UIManager.instance.toast = text => { notices.push(text); };
    const calls: number[][] = [];
    const operations: Pick<AccountOperations, "send"> = {
        send: (_controller, name, body) => {
            assert.equal(name, Protocol.HERO_FRAGMENT_COMBINE);
            const { itemId, quantity } = body as typeof body & { itemId: number; quantity: number };
            calls.push([itemId, quantity]);
        },
    };
    const bag = BagController.instance;
    try {
        checkDefinitions();
        checkPrefab();
        inventory(30);
        assert.equal(bag.canComposeHeroPieces, false);
        const unopened = detailView(itemId);
        unopened.view.btnEnter!.node.emit(Button.EventType.CLICK);
        assert.equal(unopened.closes(), 0, "背包未装配合成请求时不发送、不关详情");
        assert.equal(notices[notices.length - 1], "该碎片合成暂未开放");
        unopened.view.onClose();
        unopened.view.node.destroy();
        bag.configure(operations, { restoreActual: () => "empty" });
        bag.initialize();
        checkDetail(calls);
        checkQuantity(calls);
        inventory(30);
        HeroRosterModel.instance.replace({
            status: "ready", error: "",
            heroes: [{ id: "hero", templateId: 10304012, level: 1, star: 4 }],
            rosterInfo: { capacity: 1, buySpaceTimes: 0 },
        });
        const full = detailView(itemId);
        const requestsBeforeFull = calls.length;
        full.view.btnEnter!.node.emit(Button.EventType.CLICK);
        assert.equal(full.closes(), 1);
        assert.equal(calls.length, requestsBeforeFull + 1, "名册容量交服务端判定");
        assert.equal(notices[notices.length - 1], "该碎片合成暂未开放", "客户端不替服务端提示容量不足");
        full.view.node.destroy();
        bag.dispose();
        await checkAuthoritativeCompose(notices);
        assert.equal(bag.canComposeHeroPieces, false);
        console.log("hero-piece-compose-check passed: 136 configurations, quantity, single request, feedback and snapshot");
    } finally {
        bag.dispose();
        BagModel.instance.reset();
        HeroRosterModel.instance.reset();
        UIManager.instance.toast = originalToast;
    }
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
